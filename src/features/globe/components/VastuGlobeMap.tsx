/**
 * VastuGlobeMap - 2D Google Maps component for Halo Homes
 *
 * Drop-in replacement for MigrationGlobe that uses Google Maps 2D
 * instead of react-globe.gl 3D.
 *
 * Maintains compatible interface with MigrationGlobe for seamless integration.
 * Note: Assumes Google Maps API is loaded via GoogleMapsWrapper context.
 */

import React, { useCallback, useRef, useState, forwardRef, useImperativeHandle, useEffect, useMemo } from 'react';
import { GoogleMap, Marker, DrawingManager, Polygon, InfoWindow } from '@react-google-maps/api';
import { MiniVastuCompass } from '@/components/VastuCompassOverlay';
import { useVastuStore } from '@/stores/vastuStore';
import type { PersonLocation, Migration } from '../types/migration.d';
import {
  calculatePolygonAreaSqFt,
  isAreaWithinLimit,
  formatAreaCompact,
  PROPERTY_SIZE_LIMIT_SQFT,
} from '@/lib/geo-utils';
import { ZoneConstraintAlert } from './ZoneConstraintAlert';

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
  styles: [
    {
      featureType: 'poi',
      elementType: 'labels',
      stylers: [{ visibility: 'off' }],
    },
  ],
};

// Interface matching MigrationGlobe's ref methods (GlobeMethods)
export interface VastuGlobeMapMethods {
  // Compatible with GlobeMethods
  pointOfView: (pov?: { lat?: number; lng?: number; altitude?: number }, transitionMs?: number) => { lat: number; lng: number; altitude: number } | void;
  // Additional methods
  panTo: (lat: number, lng: number, zoom?: number) => void;
  getCenter: () => { lat: number; lng: number } | null;
  getZoom: () => number | null;
  setMapType: (type: google.maps.MapTypeId) => void;
  fitBounds: (bounds: { north: number; south: number; east: number; west: number }, padding?: number) => void;
}

// Props interface compatible with MigrationGlobe
interface VastuGlobeMapProps {
  // Core location props (from MigrationGlobe)
  locations?: PersonLocation[];
  migrations?: Migration[];
  onPersonClick?: (person: PersonLocation) => void;

  // Coordinate/interaction callbacks
  onCoordinateSelect?: (lat: number, lng: number) => void;
  onLocationAnalyze?: (lat: number, lng: number) => void;
  onSingleClick?: (lat: number, lng: number, x: number, y: number) => void;
  onContextMenu?: (lat: number, lng: number, x: number, y: number) => void;

  // Mobile flag
  isMobile?: boolean;

  // Location markers
  analysisLocation?: { lat: number; lng: number } | null;
  cityLocation?: { lat: number; lng: number; name: string } | null;
  zipCodeBounds?: { north: number; south: number; east: number; west: number } | null;
  relocationLocation?: { lat: number; lng: number; name?: string } | null;
  partnerLocation?: { lat: number; lng: number; name: string; avatarUrl?: string } | null;

  // State flags
  hasBirthData?: boolean;
  birthDataKey?: string;

  // Zone/boundary drawing
  isDrawingZone?: boolean;
  drawingMode?: 'search' | 'property' | null;
  zoneDrawingPoints?: Array<{ lat: number; lng: number }>;
  drawnZone?: { points: Array<{ lat: number; lng: number }>; mode?: 'search' | 'property' | null } | null;
  searchZone?: { points: Array<{ lat: number; lng: number }> } | null;
  onZonePointAdd?: (lat: number, lng: number) => void;
  onZoneComplete?: (points: Array<{ lat: number; lng: number }>) => void;

  // Scout markers
  scoutMarkers?: Array<{ lat: number; lng: number; name: string; nature: 'beneficial' | 'challenging' }>;
  onScoutMarkerClick?: (lat: number, lng: number, name: string) => void;

  // Favorite locations
  favoriteLocations?: Array<{ lat: number; lng: number; name: string }>;
  onFavoriteClick?: (lat: number, lng: number, name: string) => void;

  // Fallback
  onGlobeFallbackShowScout?: () => void;

  // Ignored astro-specific props (for interface compatibility)
  astroLines?: unknown[];
  aspectLines?: unknown[];
  paranLines?: unknown[];
  zenithPoints?: unknown[];
  selectedParanLine?: unknown;
  onLineClick?: unknown;
  onLineHover?: unknown;
  isLocalSpaceMode?: boolean;
  localSpaceOrigin?: { lat: number; lng: number } | null;
  showLineLabels?: boolean;

  // Vastu-specific props
  showCompass?: boolean;
  propertyBoundary?: Array<{ lat: number; lng: number }>;
  onBoundaryComplete?: (path: google.maps.LatLng[]) => void;
  markers?: Array<{ lat: number; lng: number; name: string; score?: number }>;
  onMarkerClick?: (lat: number, lng: number, name: string) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  className?: string;
}

const VastuGlobeMapComponent = forwardRef<VastuGlobeMapMethods, VastuGlobeMapProps>(({
  locations = [],
  onPersonClick,
  onCoordinateSelect,
  onLocationAnalyze,
  onSingleClick,
  onContextMenu,
  isMobile = false,
  analysisLocation,
  cityLocation,
  zipCodeBounds,
  relocationLocation,
  partnerLocation,
  hasBirthData = false,
  isDrawingZone = false,
  drawingMode = null,
  zoneDrawingPoints = [],
  drawnZone,
  searchZone,
  onZonePointAdd,
  onZoneComplete,
  scoutMarkers = [],
  onScoutMarkerClick,
  favoriteLocations = [],
  onFavoriteClick,
  // Vastu-specific
  showCompass = true,
  propertyBoundary,
  onBoundaryComplete,
  markers = [],
  onMarkerClick,
  center,
  zoom = 5,
  className = '',
}, ref) => {
  const mapRef = useRef<google.maps.Map | null>(null);
  const [mapRotation, setMapRotation] = useState(0);
  const [infoWindow, setInfoWindow] = useState<{ lat: number; lng: number; content: string } | null>(null);
  const { setPropertyBoundary, setPropertyCoordinates: setVastuCenter, propertyBoundary: storeBoundary } = useVastuStore();

  // Convert altitude to zoom (rough mapping)
  const altitudeToZoom = (altitude: number): number => {
    // altitude is in km, zoom is 0-20
    // rough mapping: altitude 10000km = zoom 3, altitude 100km = zoom 10
    if (altitude >= 10000) return 3;
    if (altitude >= 5000) return 4;
    if (altitude >= 2500) return 5;
    if (altitude >= 1000) return 7;
    if (altitude >= 500) return 9;
    if (altitude >= 100) return 12;
    if (altitude >= 50) return 14;
    if (altitude >= 10) return 16;
    return 18;
  };

  // Convert zoom to altitude
  const zoomToAltitude = (z: number): number => {
    // Inverse of altitudeToZoom
    if (z <= 3) return 10000;
    if (z <= 4) return 5000;
    if (z <= 5) return 2500;
    if (z <= 7) return 1000;
    if (z <= 9) return 500;
    if (z <= 12) return 100;
    if (z <= 14) return 50;
    if (z <= 16) return 10;
    return 5;
  };

  // Expose methods compatible with GlobeMethods
  useImperativeHandle(ref, () => ({
    pointOfView: (pov?: { lat?: number; lng?: number; altitude?: number }, transitionMs?: number) => {
      if (pov && mapRef.current) {
        if (pov.lat !== undefined && pov.lng !== undefined) {
          mapRef.current.panTo({ lat: pov.lat, lng: pov.lng });
        }
        if (pov.altitude !== undefined) {
          const targetZoom = altitudeToZoom(pov.altitude);
          mapRef.current.setZoom(targetZoom);
        }
      }
      // Return current point of view
      if (mapRef.current) {
        const c = mapRef.current.getCenter();
        const z = mapRef.current.getZoom() || 5;
        if (c) {
          return { lat: c.lat(), lng: c.lng(), altitude: zoomToAltitude(z) };
        }
      }
      return { lat: 0, lng: 0, altitude: 2500 };
    },
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
        const c = mapRef.current.getCenter();
        if (c) {
          return { lat: c.lat(), lng: c.lng() };
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
    fitBounds: (bounds: { north: number; south: number; east: number; west: number }, padding = 50) => {
      if (mapRef.current) {
        const googleBounds = new google.maps.LatLngBounds(
          { lat: bounds.south, lng: bounds.west },
          { lat: bounds.north, lng: bounds.east }
        );
        mapRef.current.fitBounds(googleBounds, padding);
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

  // Map unload callback
  const onUnmount = useCallback(() => {
    mapRef.current = null;
  }, []);

  // Handle map click
  const handleMapClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    // Zone drawing mode
    if (isDrawingZone && onZonePointAdd) {
      onZonePointAdd(lat, lng);
      return;
    }

    // Single click callback
    if (onSingleClick) {
      const projection = mapRef.current?.getProjection();
      let x = 0, y = 0;
      if (projection) {
        const point = projection.fromLatLngToPoint(e.latLng);
        if (point) {
          x = point.x;
          y = point.y;
        }
      }
      onSingleClick(lat, lng, x, y);
    }
  }, [isDrawingZone, onZonePointAdd, onSingleClick]);

  // Handle map double click
  const handleMapDblClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng) return;
    const lat = e.latLng.lat();
    const lng = e.latLng.lng();

    if (hasBirthData && onLocationAnalyze) {
      onLocationAnalyze(lat, lng);
    } else if (onCoordinateSelect) {
      onCoordinateSelect(lat, lng);
    }
  }, [hasBirthData, onLocationAnalyze, onCoordinateSelect]);

  // Handle map right click (context menu)
  const handleMapRightClick = useCallback((e: google.maps.MapMouseEvent) => {
    if (!e.latLng || !onContextMenu) return;

    const lat = e.latLng.lat();
    const lng = e.latLng.lng();
    const projection = mapRef.current?.getProjection();
    let x = 0, y = 0;
    if (projection) {
      const point = projection.fromLatLngToPoint(e.latLng);
      if (point) {
        x = point.x;
        y = point.y;
      }
    }
    onContextMenu(lat, lng, x, y);
  }, [onContextMenu]);

  // Handle polygon complete (for Vastu property boundary or search zone)
  const handlePolygonComplete = useCallback((polygon: google.maps.Polygon) => {
    const path = polygon.getPath();
    const coordinates: Array<{ lat: number; lng: number }> = [];

    for (let i = 0; i < path.getLength(); i++) {
      const point = path.getAt(i);
      coordinates.push({ lat: point.lat(), lng: point.lng() });
    }

    // Only update Vastu store with boundary if we're in property drawing mode
    if (drawingMode === 'property') {
      setPropertyBoundary(coordinates);

      // Calculate center of the polygon
      if (coordinates.length > 0) {
        const avgLat = coordinates.reduce((sum, c) => sum + c.lat, 0) / coordinates.length;
        const avgLng = coordinates.reduce((sum, c) => sum + c.lng, 0) / coordinates.length;
        setVastuCenter({ lat: avgLat, lng: avgLng });
      }

      // Callback to parent for boundary
      if (onBoundaryComplete) {
        onBoundaryComplete(path.getArray());
      }
    }

    // For zone drawing completion (both search and property modes)
    if (onZoneComplete) {
      onZoneComplete(coordinates);
    }

    // Remove the drawing (we'll render our own polygon)
    polygon.setMap(null);
  }, [drawingMode, setPropertyBoundary, setVastuCenter, onBoundaryComplete, onZoneComplete]);

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
    excellent: { fill: '#7cb97c', stroke: '#5a9a5a' },    // Soft green (beneficial/high score)
    good: { fill: '#c9b87c', stroke: '#a89860' },         // Soft gold (favorites/pending)
    moderate: { fill: '#d4a088', stroke: '#b8846c' },     // Soft coral (relocation)
    poor: { fill: '#c97c7c', stroke: '#a85a5a' },         // Soft red (challenging/low score)
    analysis: { fill: '#a094b8', stroke: '#8a7a9e' },     // Soft purple (analysis)
    city: { fill: '#94a5b8', stroke: '#7a8a9e' },         // Soft blue (city/person)
    partner: { fill: '#c9a0b8', stroke: '#a8809a' },      // Soft pink (partner)
  };

  // Get marker icon based on nature/score
  const getMarkerIcon = (nature?: 'beneficial' | 'challenging', score?: number): google.maps.Icon => {
    if (nature === 'beneficial') return createCustomMarker(markerColors.excellent.fill, markerColors.excellent.stroke);
    if (nature === 'challenging') return createCustomMarker(markerColors.poor.fill, markerColors.poor.stroke);
    if (score !== undefined) {
      if (score >= 80) return createCustomMarker(markerColors.excellent.fill, markerColors.excellent.stroke);
      if (score >= 60) return createCustomMarker(markerColors.good.fill, markerColors.good.stroke);
      if (score >= 40) return createCustomMarker(markerColors.moderate.fill, markerColors.moderate.stroke);
      return createCustomMarker(markerColors.poor.fill, markerColors.poor.stroke);
    }
    return createCustomMarker(markerColors.default.fill, markerColors.default.stroke);
  };

  // Get specific marker icons for different location types
  const getAnalysisMarker = () => createCustomMarker(markerColors.analysis.fill, markerColors.analysis.stroke);
  const getCityMarker = () => createCustomMarker(markerColors.city.fill, markerColors.city.stroke);
  const getRelocationMarker = () => createCustomMarker(markerColors.moderate.fill, markerColors.moderate.stroke);
  const getPartnerMarker = () => createCustomMarker(markerColors.partner.fill, markerColors.partner.stroke);
  const getPersonMarker = () => createCustomMarker(markerColors.city.fill, markerColors.city.stroke);
  const getFavoriteMarker = () => createCustomMarker(markerColors.good.fill, markerColors.good.stroke);

  // Effective boundary (from props or store)
  const effectiveBoundary = propertyBoundary || storeBoundary;

  // Calculate effective center
  const effectiveCenter = center || (analysisLocation ? { lat: analysisLocation.lat, lng: analysisLocation.lng } : defaultCenter);

  // Calculate live area for property zone drawing
  const liveAreaSqFt = useMemo(() => {
    if (!isDrawingZone || drawingMode !== 'property' || zoneDrawingPoints.length < 3) {
      return null;
    }
    return calculatePolygonAreaSqFt(zoneDrawingPoints);
  }, [isDrawingZone, drawingMode, zoneDrawingPoints]);

  const isOverPropertyLimit = liveAreaSqFt !== null && !isAreaWithinLimit(liveAreaSqFt, PROPERTY_SIZE_LIMIT_SQFT);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        center={effectiveCenter}
        zoom={zoom}
        onLoad={onLoad}
        onUnmount={onUnmount}
        onClick={handleMapClick}
        onDblClick={handleMapDblClick}
        onRightClick={handleMapRightClick}
        options={mapOptions}
      >
        {/* Drawing Manager for zone/property boundaries */}
        {isDrawingZone && (
          <DrawingManager
            onPolygonComplete={handlePolygonComplete}
            options={{
              drawingMode: google.maps.drawing.OverlayType.POLYGON,
              drawingControl: false, // Hide Google's default drawing UI - we use our own controls
              polygonOptions: {
                fillColor: drawingMode === 'search' ? '#3B82F6' : '#d4a5a5',
                fillOpacity: 0.3,
                strokeColor: drawingMode === 'search' ? '#2563EB' : '#b8888a', // Darker stroke for visibility
                strokeWeight: 2,
                editable: true,
                draggable: false,
              },
            }}
          />
        )}

        {/* Zone drawing points preview (while drawing - only show if using click-to-add mode) */}
        {isDrawingZone && zoneDrawingPoints.length > 0 && (
          <Polygon
            paths={zoneDrawingPoints}
            options={{
              fillColor: drawingMode === 'search' ? '#3B82F6' : '#d4a5a5',
              fillOpacity: 0.2,
              strokeColor: drawingMode === 'search' ? '#3B82F6' : '#d4a5a5',
              strokeWeight: 2,
              strokeOpacity: 0.8,
            }}
          />
        )}

        {/* Search zone (completed) - blue color */}
        {!isDrawingZone && searchZone && searchZone.points.length > 2 && (
          <Polygon
            paths={searchZone.points}
            options={{
              fillColor: '#3B82F6',
              fillOpacity: 0.2,
              strokeColor: '#3B82F6',
              strokeWeight: 2,
            }}
          />
        )}

        {/* Property boundary polygon (Vastu) - rose color, only show if not the same as search zone */}
        {!isDrawingZone && effectiveBoundary && effectiveBoundary.length > 2 && (
          <Polygon
            paths={effectiveBoundary}
            options={{
              fillColor: '#d4a5a5',
              fillOpacity: 0.3,
              strokeColor: '#d4a5a5',
              strokeWeight: 2,
              clickable: true,
            }}
          />
        )}

        {/* ZIP code boundary rectangle - shows perimeter of searched ZIP code */}
        {zipCodeBounds && (
          <Polygon
            paths={[
              { lat: zipCodeBounds.north, lng: zipCodeBounds.west },
              { lat: zipCodeBounds.north, lng: zipCodeBounds.east },
              { lat: zipCodeBounds.south, lng: zipCodeBounds.east },
              { lat: zipCodeBounds.south, lng: zipCodeBounds.west },
            ]}
            options={{
              fillColor: '#6366F1',
              fillOpacity: 0.1,
              strokeColor: '#6366F1',
              strokeWeight: 2,
              strokeOpacity: 0.8,
              clickable: false,
            }}
          />
        )}

        {/* Analysis location marker */}
        {analysisLocation && (
          <Marker
            position={{ lat: analysisLocation.lat, lng: analysisLocation.lng }}
            icon={getAnalysisMarker()}
            title="Analysis Location"
          />
        )}

        {/* City location marker */}
        {cityLocation && (
          <Marker
            position={{ lat: cityLocation.lat, lng: cityLocation.lng }}
            icon={getCityMarker()}
            title={cityLocation.name}
            onClick={() => setInfoWindow({ lat: cityLocation.lat, lng: cityLocation.lng, content: cityLocation.name })}
          />
        )}

        {/* Relocation marker */}
        {relocationLocation && (
          <Marker
            position={{ lat: relocationLocation.lat, lng: relocationLocation.lng }}
            icon={getRelocationMarker()}
            title={relocationLocation.name || 'Relocation'}
          />
        )}

        {/* Partner location marker */}
        {partnerLocation && (
          <Marker
            position={{ lat: partnerLocation.lat, lng: partnerLocation.lng }}
            icon={getPartnerMarker()}
            title={partnerLocation.name}
          />
        )}

        {/* Person locations */}
        {locations.map((person, index) => (
          <Marker
            key={`person-${person.id || index}`}
            position={{ lat: person.lat, lng: person.lng }}
            icon={getPersonMarker()}
            title={person.name}
            onClick={() => onPersonClick?.(person)}
          />
        ))}

        {/* Scout markers */}
        {scoutMarkers.map((marker, index) => (
          <Marker
            key={`scout-${index}`}
            position={{ lat: marker.lat, lng: marker.lng }}
            icon={getMarkerIcon(marker.nature)}
            title={marker.name}
            onClick={() => onScoutMarkerClick?.(marker.lat, marker.lng, marker.name)}
          />
        ))}

        {/* Favorite locations */}
        {favoriteLocations.map((fav, index) => (
          <Marker
            key={`fav-${index}`}
            position={{ lat: fav.lat, lng: fav.lng }}
            icon={getFavoriteMarker()}
            title={fav.name}
            onClick={() => onFavoriteClick?.(fav.lat, fav.lng, fav.name)}
          />
        ))}

        {/* Custom Vastu markers */}
        {markers.map((marker, index) => (
          <Marker
            key={`marker-${index}`}
            position={{ lat: marker.lat, lng: marker.lng }}
            icon={getMarkerIcon(undefined, marker.score)}
            title={`${marker.name}${marker.score !== undefined ? ` (Score: ${marker.score})` : ''}`}
            onClick={() => onMarkerClick?.(marker.lat, marker.lng, marker.name)}
          />
        ))}

        {/* Info Window */}
        {infoWindow && (
          <InfoWindow
            position={{ lat: infoWindow.lat, lng: infoWindow.lng }}
            onCloseClick={() => setInfoWindow(null)}
          >
            <div className="p-2">
              <p className="font-medium">{infoWindow.content}</p>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>

      {/* Compass overlay */}
      {showCompass && (
        <div className="absolute bottom-4 left-4 z-10">
          <MiniVastuCompass size={60} rotation={-mapRotation} />
        </div>
      )}

      {/* Zone drawing indicator with constraint feedback */}
      {isDrawingZone && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2">
          {/* Drawing instructions */}
          <div className={`${
            drawingMode === 'search'
              ? 'bg-blue-500'
              : isOverPropertyLimit
                ? 'bg-red-500'
                : 'bg-[#d4a5a5]'
          } text-white px-4 py-2 rounded-xl shadow-lg`}>
            <span className="text-sm font-medium">
              {drawingMode === 'search' ? (
                zoneDrawingPoints.length === 0
                  ? 'Draw search area - click to start'
                  : `${zoneDrawingPoints.length} points - click to continue, double-click to finish`
              ) : (
                zoneDrawingPoints.length === 0
                  ? 'Draw property boundary - click to start'
                  : `${zoneDrawingPoints.length} points - click to continue, double-click to finish`
              )}
            </span>
          </div>

          {/* Constraint feedback alert */}
          {zoneDrawingPoints.length >= 3 && (
            <ZoneConstraintAlert
              mode={drawingMode}
              currentAreaSqFt={liveAreaSqFt}
              className="w-72"
            />
          )}
        </div>
      )}
    </div>
  );
});

VastuGlobeMapComponent.displayName = 'VastuGlobeMap';

export default VastuGlobeMapComponent;
