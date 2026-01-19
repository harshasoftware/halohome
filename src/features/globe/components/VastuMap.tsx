/**
 * VastuMap - 2D Google Maps component for Halo Homes
 *
 * Replaces the 3D globe with a 2D map optimized for property analysis.
 * Features: address search, property boundary drawing, compass overlay,
 * entrance direction marker with Vastu analysis.
 *
 * Note: Assumes Google Maps API is already loaded via GoogleMapsWrapper context.
 */

import React, { useCallback, useRef, useState, useMemo, forwardRef, useImperativeHandle, useEffect } from 'react';
import { GoogleMap, Marker, DrawingManager, Polygon, OverlayView } from '@react-google-maps/api';
import { RegridParcelOverlay } from './RegridParcelOverlay';
import { ZipBoundaryOverlay } from './ZipBoundaryOverlay';
import type { ZipSearchStatus } from '@/stores/globeInteractionStore';
import type { BuildingFootprint } from '../services/buildingFootprintsService';
import { MiniVastuCompass } from '@/components/VastuCompassOverlay';
import { useVastuStore, type VastuDirection } from '@/stores/vastuStore';
import { EntranceDirectionMarker, type CardinalDirection, directionToRotation } from './EntranceDirectionMarker';
import { performVastuAnalysis } from '@/lib/vastu-utils';
import { entranceDetectionService } from '../services/entranceDetectionService';
import { buildingFootprintsService } from '../services/buildingFootprintsService';
import { Loader2, ScanLine, Scan, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Map container style
const containerStyle = {
  width: '100%',
  height: '100%',
};

// Default center (US)
const defaultCenter = {
  lat: 39.8283,
  lng: -98.5795,
};

const MAP_ID = String(import.meta.env.VITE_GOOGLE_MAPS_MAP_ID ?? '').trim() || undefined;

// Map options - minimal UI
const mapOptions: google.maps.MapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  scaleControl: false,
  streetViewControl: false,
  rotateControl: false,
  fullscreenControl: false,
  mapTypeId: 'roadmap',
  ...(MAP_ID ? { mapId: MAP_ID } : {}),
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

export interface VastuMapMethods {
  panTo: (lat: number, lng: number, zoom?: number) => void;
  getCenter: () => { lat: number; lng: number } | null;
  getZoom: () => number | null;
  setMapType: (type: google.maps.MapTypeId) => void;
}

interface VastuMapProps {
  onMapClick?: (lat: number, lng: number) => void;
  onMapRightClick?: (lat: number, lng: number, x: number, y: number) => void;
  onBoundaryComplete?: (path: google.maps.LatLng[]) => void;
  onMarkerClick?: (lat: number, lng: number, name: string) => void;
  /** Callback when entrance direction changes via the direction marker */
  onEntranceDirectionChange?: (direction: CardinalDirection) => void;
  isDrawingMode?: boolean;
  showCompass?: boolean;
  /** Show the entrance direction marker when boundary exists */
  showEntranceMarker?: boolean;
  markers?: Array<{ lat: number; lng: number; name: string; score?: number }>;
  propertyBoundary?: Array<{ lat: number; lng: number }>;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
  /** Property address for Vastu analysis */
  propertyAddress?: string;
  /** Trigger auto-segmentation at this location (set when user searches for a property address) */
  autoSegmentLocation?: { lat: number; lng: number } | null;
  /** Callback when auto-segmentation completes */
  onAutoSegmentComplete?: (success: boolean, error?: string) => void;
  /** ZIP code bounding box to display (fallback if zipCodeBoundary not available) */
  zipCodeBounds?: { north: number; south: number; east: number; west: number } | null;
  /** Actual ZIP boundary polygon from TIGER/Line ZCTA5 (preferred over zipCodeBounds) */
  zipCodeBoundary?: Array<{ lat: number; lng: number }> | null;
  /** Current ZIP code being searched */
  currentZipCode?: string | null;
  /** ZIP search status (for UI feedback) */
  zipSearchStatus?: ZipSearchStatus;
  /** Callback when scout button is clicked */
  onScoutClick?: (bounds: { north: number; south: number; east: number; west: number }) => void;
  /** Whether scout analysis is in progress */
  isScoutLoading?: boolean;
  /** Selected scout parcel boundary (visual-only; does not trigger analysis). */
  scoutSelectedBoundary?: Array<{ lat: number; lng: number }> | null;
  /** Selected scout parcel marker (visual-only; does not trigger analysis). */
  scoutSelectedMarker?: { lat: number; lng: number; name: string; score?: number } | null;
  /** Parcels to display on the map */
  parcels?: Array<{
    id: string;
    coordinates: Array<{ lat: number; lng: number }>;
    vastuScore?: number;
    type?: 'plot' | 'building';
  }>;
  /** Selected parcel ID to highlight */
  selectedParcelId?: string | null;
}

const VastuMap = forwardRef<VastuMapMethods, VastuMapProps>(({
  onMapClick,
  onMapRightClick,
  onBoundaryComplete,
  onMarkerClick,
  onEntranceDirectionChange,
  isDrawingMode = false,
  showCompass = true,
  showEntranceMarker = true,
  markers = [],
  propertyBoundary,
  center,
  zoom = 5,
  className = '',
  propertyAddress = '',
  autoSegmentLocation,
  onAutoSegmentComplete,
  zipCodeBounds,
  zipCodeBoundary, // Actual ZIP boundary polygon (preferred over bounds)
  currentZipCode,
  zipSearchStatus = 'idle',
  onScoutClick,
  isScoutLoading = false,
  scoutSelectedBoundary = null,
  scoutSelectedMarker = null,
  parcels = [],
  selectedParcelId = null,
}, ref) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapRotation, setMapRotation] = useState(0);
  const [isDetectingEntrance, setIsDetectingEntrance] = useState(false);
  const [detectionSource, setDetectionSource] = useState<string | null>(null);
  const [detectionConfidence, setDetectionConfidence] = useState<number>(0);
  const detectionRequestRef = useRef<number>(0);

  // Auto-segmentation state
  const [isSegmenting, setIsSegmenting] = useState(false);
  const [segmentationProgress, setSegmentationProgress] = useState('');
  const lastSegmentLocationRef = useRef<string | null>(null);
  
  // Store target zoom level when processing starts to lock it
  const targetZoomRef = useRef<number | null>(null);

  // Block zoom during scouting or segmentation to prevent lines from disappearing
  const isProcessing = isScoutLoading || isSegmenting;
  
  // Store target zoom when processing starts
  useEffect(() => {
    if (isProcessing && mapRef.current && targetZoomRef.current === null) {
      targetZoomRef.current = mapRef.current.getZoom() || zoom;
    } else if (!isProcessing) {
      targetZoomRef.current = null;
    }
  }, [isProcessing, zoom]);
  
  const mapOptionsWithZoomControl = useMemo(() => ({
    ...mapOptions,
    // Disable zoom gestures when processing
    gestureHandling: isProcessing ? 'none' : 'auto',
    // Disable zoom controls
    zoomControl: false,
    // Prevent zoom via keyboard
    keyboardShortcuts: !isProcessing,
    // Disable scroll wheel zoom during processing
    scrollwheel: !isProcessing,
    // Disable double click zoom during processing
    disableDoubleClickZoom: isProcessing,
  }), [isProcessing]);

  const {
    setPropertyBoundary,
    setPropertyCoordinates: setVastuCenter,
    setVastuAnalysis,
    setEntranceDirection,
    entranceDirection,
  } = useVastuStore();

  // Calculate centroid from property boundary
  const centroid = useMemo(() => {
    if (!propertyBoundary || propertyBoundary.length < 3) return null;
    const avgLat = propertyBoundary.reduce((sum, c) => sum + c.lat, 0) / propertyBoundary.length;
    const avgLng = propertyBoundary.reduce((sum, c) => sum + c.lng, 0) / propertyBoundary.length;
    return { lat: avgLat, lng: avgLng };
  }, [propertyBoundary]);

  // Handle entrance direction change from the marker (manual override)
  const handleEntranceDirectionChange = useCallback((direction: CardinalDirection) => {
    // Update store with new entrance direction
    setEntranceDirection(direction as VastuDirection);
    setDetectionSource('manual');
    setDetectionConfidence(1.0);

    // Run Vastu analysis with the new direction
    if (centroid && propertyBoundary && propertyBoundary.length >= 3) {
      const analysis = performVastuAnalysis(
        propertyAddress || `${centroid.lat.toFixed(6)}, ${centroid.lng.toFixed(6)}`,
        centroid,
        propertyBoundary,
        direction as VastuDirection
      );
      setVastuAnalysis(analysis);
    }

    // Notify parent
    onEntranceDirectionChange?.(direction);
  }, [centroid, propertyBoundary, propertyAddress, setEntranceDirection, setVastuAnalysis, onEntranceDirectionChange]);

  // Auto-detect entrance when boundary is drawn
  useEffect(() => {
    if (!centroid || !propertyBoundary || propertyBoundary.length < 3) return;

    const requestId = ++detectionRequestRef.current;

    const detectEntrance = async () => {
      setIsDetectingEntrance(true);

      try {
        // Use entrance detection service with the boundary
        const result = await entranceDetectionService.detectByCoordinates(
          centroid.lat,
          centroid.lng,
          {
            boundary: propertyBoundary,
            useRoadAccessFallback: true,
          }
        );

        // Check if this request is still valid
        if (requestId !== detectionRequestRef.current) return;

        const primaryEntrance = result.entrances[0];
        if (primaryEntrance) {
          const detectedDirection = (primaryEntrance.facingDirection || 'S') as CardinalDirection;

          // Update state with detected entrance
          setEntranceDirection(detectedDirection as VastuDirection);
          setDetectionSource(primaryEntrance.source);
          setDetectionConfidence(primaryEntrance.confidence);

          // Run Vastu analysis with detected direction
          const analysis = performVastuAnalysis(
            propertyAddress || result.formattedAddress || `${centroid.lat.toFixed(6)}, ${centroid.lng.toFixed(6)}`,
            centroid,
            propertyBoundary,
            detectedDirection as VastuDirection
          );
          setVastuAnalysis(analysis);

          // Notify parent
          onEntranceDirectionChange?.(detectedDirection);
        } else {
          // Fallback to South if no entrance detected
          const fallbackDirection: CardinalDirection = 'S';
          setEntranceDirection(fallbackDirection as VastuDirection);
          setDetectionSource('estimated');
          setDetectionConfidence(0.3);

          const analysis = performVastuAnalysis(
            propertyAddress || `${centroid.lat.toFixed(6)}, ${centroid.lng.toFixed(6)}`,
            centroid,
            propertyBoundary,
            fallbackDirection as VastuDirection
          );
          setVastuAnalysis(analysis);
        }
      } catch (error) {
        console.warn('Entrance detection failed, using default:', error);

        if (requestId !== detectionRequestRef.current) return;

        // Fallback to South on error
        const fallbackDirection: CardinalDirection = 'S';
        setEntranceDirection(fallbackDirection as VastuDirection);
        setDetectionSource('estimated');
        setDetectionConfidence(0.3);

        const analysis = performVastuAnalysis(
          propertyAddress || `${centroid.lat.toFixed(6)}, ${centroid.lng.toFixed(6)}`,
          centroid,
          propertyBoundary,
          fallbackDirection as VastuDirection
        );
        setVastuAnalysis(analysis);
      } finally {
        if (requestId === detectionRequestRef.current) {
          setIsDetectingEntrance(false);
        }
      }
    };

    detectEntrance();
  }, [centroid, propertyBoundary, propertyAddress, setEntranceDirection, setVastuAnalysis, onEntranceDirectionChange]);

  // Auto-segment property boundary when a property address is searched
  useEffect(() => {
    if (!autoSegmentLocation) return;

    // Create a location key to prevent re-triggering for the same location
    const locationKey = `${autoSegmentLocation.lat.toFixed(6)},${autoSegmentLocation.lng.toFixed(6)}`;
    if (lastSegmentLocationRef.current === locationKey) return;
    lastSegmentLocationRef.current = locationKey;

    const performSegmentation = async () => {
      setIsSegmenting(true);
      setSegmentationProgress('Initializing SAM model...');

      try {
        // Initialize SAM if not already loaded
        if (!buildingFootprintsService.isSAMInitialized()) {
          setSegmentationProgress('Loading AI model...');
          await buildingFootprintsService.initializeSAM((progress) => {
            setSegmentationProgress(`${progress.status} (${Math.round(progress.progress * 100)}%)`);
          });
        }

        setSegmentationProgress('Analyzing property boundary...');

        // Segment at the property location
        const footprint = await buildingFootprintsService.segmentAtPoint(
          autoSegmentLocation.lat,
          autoSegmentLocation.lng,
          'plot' // Try to detect plot boundary first
        );

        if (footprint && footprint.coordinates.length >= 3) {
          // Convert footprint coordinates to the format used by the store
          const boundaryCoords = footprint.coordinates.map(coord => ({
            lat: coord.lat,
            lng: coord.lng,
          }));

          // Update store with detected boundary
          setPropertyBoundary(boundaryCoords);
          setVastuCenter(footprint.centroid);

          setSegmentationProgress('Property detected!');
          onAutoSegmentComplete?.(true);

          // Clear progress after a short delay
          setTimeout(() => {
            setSegmentationProgress('');
          }, 1500);
        } else {
          // Try building footprint as fallback
          setSegmentationProgress('Trying building detection...');

          const buildingFootprint = await buildingFootprintsService.segmentAtPoint(
            autoSegmentLocation.lat,
            autoSegmentLocation.lng,
            'building'
          );

          if (buildingFootprint && buildingFootprint.coordinates.length >= 3) {
            const boundaryCoords = buildingFootprint.coordinates.map(coord => ({
              lat: coord.lat,
              lng: coord.lng,
            }));

            setPropertyBoundary(boundaryCoords);
            setVastuCenter(buildingFootprint.centroid);

            setSegmentationProgress('Building detected!');
            onAutoSegmentComplete?.(true);

            setTimeout(() => {
              setSegmentationProgress('');
            }, 1500);
          } else {
            // No boundary detected - user can draw manually
            setSegmentationProgress('Draw boundary manually');
            onAutoSegmentComplete?.(false, 'Could not detect property boundary');

            setTimeout(() => {
              setSegmentationProgress('');
            }, 2500);
          }
        }
      } catch (error) {
        console.warn('Auto-segmentation failed:', error);
        setSegmentationProgress('Draw boundary manually');
        onAutoSegmentComplete?.(false, error instanceof Error ? error.message : 'Segmentation failed');

        setTimeout(() => {
          setSegmentationProgress('');
        }, 2500);
      } finally {
        setIsSegmenting(false);
      }
    };

    performSegmentation();
  }, [autoSegmentLocation, setPropertyBoundary, setVastuCenter, onAutoSegmentComplete]);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    panTo: (lat: number, lng: number, targetZoom?: number) => {
      if (mapRef.current) {
        mapRef.current.panTo({ lat, lng });
        if (targetZoom) {
          mapRef.current.setZoom(targetZoom);
        }
      }
    },
    getCenter: () => {
      if (mapRef.current) {
        const center = mapRef.current.getCenter();
        if (center) {
          return { lat: center.lat(), lng: center.lng() };
        }
      }
      return null;
    },
    getZoom: () => {
      if (mapRef.current) {
        return mapRef.current.getZoom() || null;
      }
      return null;
    },
    setMapType: (type: google.maps.MapTypeId) => {
      if (mapRef.current) {
        mapRef.current.setMapTypeId(type);
      }
    },
  }));

  // Map load callback
  const onLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;

    // Track heading changes for compass rotation
    map.addListener('heading_changed', () => {
      const heading = map.getHeading() || 0;
      setMapRotation(heading);
    });
  }, []);

  // Aggressively prevent zoom changes during processing
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;
    let zoomListener: google.maps.MapsEventListener | null = null;

    if (isProcessing && targetZoomRef.current !== null) {
      const targetZoom = targetZoomRef.current;
      
      // Update map options directly to disable zoom
      map.setOptions({
        gestureHandling: 'none',
        scrollwheel: false,
        disableDoubleClickZoom: true,
        keyboardShortcuts: false,
      });
      
      // Listen for zoom changes and immediately revert
      zoomListener = map.addListener('zoom_changed', () => {
        const currentZoom = map.getZoom();
        if (currentZoom !== null && Math.abs(currentZoom - targetZoom) > 0.1) {
          // Immediately revert to target zoom
          map.setZoom(targetZoom);
        }
      });
    } else {
      // Restore normal zoom behavior when not processing
      map.setOptions({
        gestureHandling: 'auto',
        scrollwheel: true,
        disableDoubleClickZoom: false,
        keyboardShortcuts: true,
      });
    }

    return () => {
      if (zoomListener) {
        google.maps.event.removeListener(zoomListener);
      }
    };
  }, [isProcessing]);

  // Map unload callback
  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Handle map click
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng && onMapClick) {
      onMapClick(e.latLng.lat(), e.latLng.lng());
    }
  }, [onMapClick]);

  // Handle map right click
  const handleMapRightClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (e.latLng && onMapRightClick) {
      // Get pixel position for context menu
      const projection = mapRef.current?.getProjection();
      if (projection) {
        const point = projection.fromLatLngToPoint(e.latLng);
        if (point) {
          onMapRightClick(e.latLng.lat(), e.latLng.lng(), point.x, point.y);
        }
      } else {
        onMapRightClick(e.latLng.lat(), e.latLng.lng(), 0, 0);
      }
    }
  }, [onMapRightClick]);

  // Handle polygon complete
  const handlePolygonComplete = useCallback((polygon: google.maps.Polygon) => {
    const path = polygon.getPath();
    const coordinates: Array<{ lat: number; lng: number }> = [];

    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coordinates.push({ lat: point.lat(), lng: point.lng() });
    }

    // Update Vastu store with boundary
    setPropertyBoundary(coordinates);

    // Calculate center of the polygon
    if (coordinates.length > 0) {
      const avgLat = coordinates.reduce((sum, c) => sum + c.lat, 0) / coordinates.length;
      const avgLng = coordinates.reduce((sum, c) => sum + c.lng, 0) / coordinates.length;
      setVastuCenter({ lat: avgLat, lng: avgLng });
    }

    // Callback to parent
    if (onBoundaryComplete) {
      onBoundaryComplete(path.getArray());
    }

    // Remove the drawing (we'll render our own polygon)
    polygon.setMap(null);
  }, [setPropertyBoundary, setVastuCenter, onBoundaryComplete]);

  // Custom SVG marker with house icon - Halo Home design language
  const createCustomMarker = (fillColor: string, strokeColor: string): google.maps.Icon => {
    // Modern teardrop pin with house icon
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="44" viewBox="0 0 32 44">
        <defs>
          <filter id="shadow" x="-20%" y="-10%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity="0.3"/>
          </filter>
          <linearGradient id="pinGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" style="stop-color:${fillColor};stop-opacity:1"/>
            <stop offset="100%" style="stop-color:${strokeColor};stop-opacity:1"/>
          </linearGradient>
        </defs>
        <path d="M16 0C7.163 0 0 7.163 0 16c0 8.837 16 28 16 28s16-19.163 16-28C32 7.163 24.837 0 16 0z"
              fill="url(#pinGrad)" stroke="${strokeColor}" stroke-width="1.5" filter="url(#shadow)"/>
        <circle cx="16" cy="14" r="10" fill="white" fill-opacity="0.95"/>
        <path d="M16 8l-6 5v6a1 1 0 001 1h3v-4h4v4h3a1 1 0 001-1v-6l-6-5z"
              fill="${fillColor}" stroke="${strokeColor}" stroke-width="0.5"/>
      </svg>
    `;
    const encoded = encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22');
    return {
      url: `data:image/svg+xml,${encoded}`,
      scaledSize: new google.maps.Size(32, 44),
      anchor: new google.maps.Point(16, 44),
    };
  };

  // Halo Home color palette for markers
  const markerColors = {
    default: { fill: '#d4a5a5', stroke: '#b8888a' },      // Dusty rose (primary)
    excellent: { fill: '#7cb97c', stroke: '#5a9a5a' },    // Soft green
    good: { fill: '#c9b87c', stroke: '#a89860' },         // Soft gold
    moderate: { fill: '#d4a088', stroke: '#b8846c' },     // Soft coral
    poor: { fill: '#c97c7c', stroke: '#a85a5a' },         // Soft red
  };

  // Get marker icon based on score
  const getMarkerIcon = (score?: number): google.maps.Icon => {
    if (score === undefined) return createCustomMarker(markerColors.default.fill, markerColors.default.stroke);
    if (score >= 80) return createCustomMarker(markerColors.excellent.fill, markerColors.excellent.stroke);
    if (score >= 60) return createCustomMarker(markerColors.good.fill, markerColors.good.stroke);
    if (score >= 40) return createCustomMarker(markerColors.moderate.fill, markerColors.moderate.stroke);
    return createCustomMarker(markerColors.poor.fill, markerColors.poor.stroke);
  };

  // Memoize DrawingManager options to prevent re-initialization on every render
  // drawingControl: false hides Google's default controls since we have our own "Draw" button
  const drawingManagerOptions = useMemo(() => ({
    drawingMode: google.maps.drawing.OverlayType.POLYGON,
    drawingControl: false, // Hide Google's drawing control UI - we use our own button
    polygonOptions: {
      fillColor: '#d4a5a5',
      fillOpacity: 0.3,
      strokeColor: '#b8888a', // Slightly darker stroke for better visibility
      strokeWeight: 2,
      editable: true,
      draggable: false,
    },
  }), []);

  // Note: Google Maps API is loaded by GoogleMapsWrapper context
  return (
    <div className={`relative w-full h-full ${className}`}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={center || defaultCenter}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        onRightClick={handleMapRightClick}
        options={mapOptionsWithZoomControl}
        onZoomChanged={() => {
          // Prevent zoom changes during processing - aggressively revert any zoom changes
          if (isProcessing && mapRef.current && targetZoomRef.current !== null) {
            const currentZoom = mapRef.current.getZoom();
            const targetZoom = targetZoomRef.current;
            if (currentZoom !== null && Math.abs(currentZoom - targetZoom) > 0.1) {
              // Revert to target zoom if it has changed significantly
              mapRef.current.setZoom(targetZoom);
            }
          }
        }}
      >
        {/* Drawing Manager for property boundaries */}
        {isDrawingMode && (
          <DrawingManager
            onPolygonComplete={handlePolygonComplete}
            options={drawingManagerOptions}
          />
        )}

        {/* Property boundary polygon */}
        {propertyBoundary && propertyBoundary.length > 2 && (
          <Polygon
            paths={propertyBoundary}
            options={{
              fillColor: '#d4a5a5',
              fillOpacity: 0.3,
              strokeColor: '#b8888a',
              strokeWeight: 2,
              clickable: true,
            }}
          />
        )}

        {/* Selected scout parcel (visual highlight only) */}
        {scoutSelectedBoundary && scoutSelectedBoundary.length > 2 && (
          <Polygon
            paths={scoutSelectedBoundary}
            options={{
              fillColor: '#d4a5a5',
              fillOpacity: 0.12,
              strokeColor: '#ffffff',
              strokeWeight: 4,
              strokeOpacity: 1,
              clickable: false,
              zIndex: 50,
            }}
          />
        )}

        {/* ZIP Code boundary - displayed as Data layer for better performance */}
        <ZipBoundaryOverlay
          zipCodeBoundary={zipCodeBoundary}
          zipCodeBounds={zipCodeBounds}
          currentZipCode={currentZipCode}
        />

        {/* Scout button overlay on ZIP code bounds */}
        {zipCodeBounds && onScoutClick && (
          <OverlayView
            position={{
              lat: zipCodeBounds.north,
              lng: (zipCodeBounds.east + zipCodeBounds.west) / 2,
            }}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="flex flex-col items-center -translate-x-1/2 translate-y-2">
              <Button
                onClick={() => onScoutClick(zipCodeBounds)}
                disabled={isScoutLoading}
                className="bg-[#d4a5a5] hover:bg-[#c49595] text-white shadow-lg px-6 py-2 rounded-full font-medium flex items-center gap-2"
              >
                {isScoutLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Scanning...</span>
                  </>
                ) : (
                  <>
                    <Scan className="h-5 w-5" />
                    <span>Scout All Homes</span>
                    <Sparkles className="h-4 w-4" />
                  </>
                )}
              </Button>
              {currentZipCode && (
                <div className="mt-2 flex items-center gap-2 px-3 py-1 bg-white/95 backdrop-blur-sm rounded-full text-xs text-slate-600 shadow border border-slate-200">
                  <span className="font-medium">{currentZipCode}</span>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full border text-[10px]',
                      zipSearchStatus === 'searching' && 'bg-blue-50 text-blue-700 border-blue-200',
                      zipSearchStatus === 'ready' && 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      zipSearchStatus === 'error' && 'bg-red-50 text-red-700 border-red-200',
                      zipSearchStatus === 'idle' && 'bg-slate-50 text-slate-600 border-slate-200'
                    )}
                  >
                    {zipSearchStatus === 'searching'
                      ? 'Searching…'
                      : zipSearchStatus === 'ready'
                        ? 'Ready'
                        : zipSearchStatus === 'error'
                          ? 'Error'
                          : 'Idle'}
                  </span>
                </div>
              )}
            </div>
          </OverlayView>
        )}

        {/* Regrid Parcel Overlay - Display parcels as Data layer with hover effects */}
        {parcels.length > 0 && (
          <RegridParcelOverlay
            parcels={parcels.map((p) => {
              const footprint: BuildingFootprint = {
                id: p.id,
                coordinates: p.coordinates,
                centroid: {
                  lat: p.coordinates.reduce((sum, c) => sum + c.lat, 0) / p.coordinates.length,
                  lng: p.coordinates.reduce((sum, c) => sum + c.lng, 0) / p.coordinates.length,
                },
                area: 0,
                bounds: {
                  north: Math.max(...p.coordinates.map(c => c.lat)),
                  south: Math.min(...p.coordinates.map(c => c.lat)),
                  east: Math.max(...p.coordinates.map(c => c.lng)),
                  west: Math.min(...p.coordinates.map(c => c.lng)),
                },
                source: 'regrid',
                shape: 'irregular',
                confidence: 1.0,
                type: p.type || 'plot',
                address: (p as any).address,
                regridId: (p as any).regridId,
                owner: (p as any).owner,
              };
              
              // Store vastuScore for the overlay to access
              (footprint as any).vastuScore = p.vastuScore ?? 50;
              
              return footprint;
            })}
            selectedParcelId={selectedParcelId}
          />
        )}

        {/* Loading indicator while detecting entrance */}
        {isDetectingEntrance && centroid && (
          <OverlayView
            position={centroid}
            mapPaneName={OverlayView.OVERLAY_MOUSE_TARGET}
          >
            <div className="flex flex-col items-center -translate-x-1/2 -translate-y-1/2">
              <div className="bg-white rounded-full p-3 shadow-lg">
                <Loader2 className="h-8 w-8 text-amber-500 animate-spin" />
              </div>
              <div className="mt-2 px-3 py-1 bg-slate-800 text-white text-xs rounded-full whitespace-nowrap">
                Detecting entrance...
              </div>
            </div>
          </OverlayView>
        )}

        {/* Entrance Direction Marker - shows at centroid when boundary exists and detection is complete */}
        {showEntranceMarker && centroid && propertyBoundary && propertyBoundary.length > 2 && !isDrawingMode && !isDetectingEntrance && (
          <EntranceDirectionMarker
            position={centroid}
            direction={entranceDirection as CardinalDirection | undefined}
            onDirectionChange={handleEntranceDirectionChange}
            detectionSource={detectionSource}
            detectionConfidence={detectionConfidence}
          />
        )}

        {/* Markers */}
        {scoutSelectedMarker && (
          <Marker
            key="selected-scout-marker"
            position={{ lat: scoutSelectedMarker.lat, lng: scoutSelectedMarker.lng }}
            icon={getMarkerIcon(scoutSelectedMarker.score)}
            title={scoutSelectedMarker.name}
          />
        )}
        {markers.map((marker, index) => (
          <Marker
            key={`marker-${index}`}
            position={{ lat: marker.lat, lng: marker.lng }}
            icon={getMarkerIcon(marker.score)}
            title={`${marker.name}${marker.score !== undefined ? ` (Score: ${marker.score})` : ''}`}
            onClick={() => onMarkerClick?.(marker.lat, marker.lng, marker.name)}
          />
        ))}
      </GoogleMap>

      {/* Compass overlay */}
      {showCompass && (
        <div className="absolute bottom-4 left-4 z-10">
          <MiniVastuCompass size={60} rotation={-mapRotation} />
        </div>
      )}

      {/* Segmentation progress indicator */}
      {(isSegmenting || segmentationProgress) && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20">
          <div className="flex items-center gap-3 bg-white/95 backdrop-blur-sm rounded-full px-4 py-2 shadow-lg border border-slate-200">
            {isSegmenting && (
              <ScanLine className="h-5 w-5 text-amber-500 animate-pulse" />
            )}
            <span className="text-sm font-medium text-slate-700">
              {segmentationProgress || 'Analyzing...'}
            </span>
            {isSegmenting && (
              <div className="h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        </div>
      )}
    </div>
  );
});

VastuMap.displayName = 'VastuMap';

export default VastuMap;
