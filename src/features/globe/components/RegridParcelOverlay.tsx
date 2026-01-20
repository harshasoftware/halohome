/**
 * Regrid Parcel Overlay Component
 * 
 * Overlays Regrid SFH parcels on Google Maps using the Data layer.
 * Provides hover effects and styling based on Vastu scores.
 */

import React, { useEffect, useRef } from 'react';
import { useGoogleMap } from '@react-google-maps/api';
import type { BuildingFootprint } from '../services/buildingFootprintsService';

function bearingToCardinal16(bearing: number): string {
  const normalized = ((bearing % 360) + 360) % 360;
  const directions = [
    'N', 'NNE', 'NE', 'ENE',
    'E', 'ESE', 'SE', 'SSE',
    'S', 'SSW', 'SW', 'WSW',
    'W', 'WNW', 'NW', 'NNW',
  ];
  const index = Math.round(normalized / 22.5) % 16;
  return directions[index];
}

function isFiniteNumber(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n);
}

function isValidLatLng(p: any): p is { lat: number; lng: number } {
  return p && isFiniteNumber(p.lat) && isFiniteNumber(p.lng);
}

function isValidRing(coords: any): coords is Array<{ lat: number; lng: number }> {
  return Array.isArray(coords) && coords.length >= 3 && coords.every(isValidLatLng);
}

const MIN_MARKER_ZOOM = 15;

const scoreIconCache = new Map<string, google.maps.Icon>();

function scoreToFillColor(score: number): string {
  // Red -> Amber -> Green (matches polygon thresholds)
  if (score < 60) return '#ef4444';
  if (score < 80) return '#f59e0b';
  return '#22c55e';
}

function scoreToTextColor(fill: string): string {
  // Simple contrast: dark text on amber, white on red/green
  return fill === '#f59e0b' ? '#111827' : '#ffffff';
}

function getScoreIcon(score: number, zoom: number): google.maps.Icon {
  const z = Number.isFinite(zoom) ? zoom : 16;
  const bucket = z <= 16 ? 16 : z <= 18 ? 18 : z <= 20 ? 20 : 22;
  const fill = scoreToFillColor(score);
  const textColor = scoreToTextColor(fill);
  const key = `${Math.round(score)}-${bucket}-${fill}`;
  const cached = scoreIconCache.get(key);
  if (cached) return cached;

  // Scale label with zoom so it doesn't dominate at z15.
  const size = bucket === 16 ? 22 : bucket === 18 ? 26 : bucket === 20 ? 30 : 34;
  const fontSize = bucket === 16 ? 10 : bucket === 18 ? 11 : bucket === 20 ? 12 : 13;
  const text = Math.round(score).toString();

  const stroke = '#111827';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 1.5}" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
      <text x="50%" y="52%" text-anchor="middle" dominant-baseline="middle"
            font-family="ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial"
            font-size="${fontSize}" font-weight="700" fill="${textColor}">
        ${text}
      </text>
    </svg>
  `;
  const encoded = encodeURIComponent(svg).replace(/'/g, '%27').replace(/"/g, '%22');
  const icon: google.maps.Icon = {
    url: `data:image/svg+xml,${encoded}`,
    scaledSize: new google.maps.Size(size, size),
    anchor: new google.maps.Point(size / 2, size / 2),
  };
  scoreIconCache.set(key, icon);
  return icon;
}

function getPointScale(kind: string | undefined, zoom: number): number {
  // Keep points visually small when zoomed out.
  const z = Number.isFinite(zoom) ? zoom : 12;
  const base =
    kind === 'entrance'
      ? 6
      : kind === 'plot_centroid'
        ? 4.5
        : 4.5;

  if (z <= 10) return base * 0.45;
  if (z <= 12) return base * 0.55;
  if (z <= 14) return base * 0.7;
  if (z <= 16) return base * 0.85;
  return base;
}

function getPointFillColor(kind: string | undefined): string {
  if (kind === 'entrance') return '#22c55e';
  if (kind === 'plot_centroid') return '#64748b';
  return '#0ea5e9'; // building centroid
}

interface RegridParcelOverlayProps {
  /** Parcels to display */
  parcels: BuildingFootprint[];
  /** Selected parcel ID to highlight */
  selectedParcelId?: string | null;
  /** Callback when a parcel is clicked */
  onParcelClick?: (parcel: BuildingFootprint) => void;
  /** Callback when a parcel is hovered */
  onParcelHover?: (parcel: BuildingFootprint | null) => void;
}

/**
 * Regrid Parcel Overlay using Google Maps Data layer
 */
export const RegridParcelOverlay: React.FC<RegridParcelOverlayProps> = ({
  parcels,
  selectedParcelId,
  onParcelClick,
  onParcelHover,
}) => {
  const map = useGoogleMap();
  const dataLayerRef = useRef<google.maps.Data | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);

  useEffect(() => {
    if (!map) return;

    // Clean up existing data layer if it exists
    if (dataLayerRef.current) {
      dataLayerRef.current.forEach((feature) => {
        dataLayerRef.current!.remove(feature);
      });
      google.maps.event.clearInstanceListeners(dataLayerRef.current);
      dataLayerRef.current.setMap(null);
      dataLayerRef.current = null;
    }

    // If no parcels, just cleanup and return
    if (parcels.length === 0) {
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
      return;
    }

    // Create Data layer for parcels
    const dataLayer = new google.maps.Data({ map });
    dataLayerRef.current = dataLayer;

    // Create InfoWindow for hover details
    const infoWindow = new google.maps.InfoWindow();
    infoWindowRef.current = infoWindow;

    // Convert parcels to GeoJSON format
    const geoJsonFeatures = parcels.flatMap((parcel) => {
      if (!isValidRing(parcel.coordinates)) return [];
      if (!isValidLatLng(parcel.centroid)) return [];

      // Extract vastuScore from parcel if available (may be stored in a different format)
      let vastuScore = 50; // Default
      if ('vastuScore' in parcel && typeof (parcel as any).vastuScore === 'number') {
        vastuScore = (parcel as any).vastuScore;
      }
      
      const features: any[] = [];

      features.push({
        type: 'Feature' as const,
        id: parcel.id,
        properties: {
          regridId: parcel.regridId,
          address: parcel.address,
          owner: parcel.owner,
          vastuScore,
          type: parcel.type,
          kind: 'polygon',
          parentId: (parcel as any).parentPlotId ?? undefined,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            parcel.coordinates.map((coord) => [coord.lng, coord.lat]),
          ],
        },
      });

      // Plot centroid dot (parcel centroid)
      if (parcel.type === 'plot' && parcel.centroid) {
        features.push({
          type: 'Feature' as const,
          id: `${parcel.id}-plot-centroid`,
          properties: {
            parentId: parcel.id,
            kind: 'plot_centroid',
            vastuScore,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [parcel.centroid.lng, parcel.centroid.lat],
          },
        });
      }

      // Building centroid dot
      if (parcel.type === 'building' && parcel.centroid) {
        features.push({
          type: 'Feature' as const,
          id: `${parcel.id}-centroid`,
          properties: {
            parentId: parcel.id,
            kind: 'centroid',
            vastuScore,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [parcel.centroid.lng, parcel.centroid.lat],
          },
        });

        // Score label marker (only show for building)
        features.push({
          type: 'Feature' as const,
          id: `${parcel.id}-score`,
          properties: {
            parentId: parcel.id,
            kind: 'score',
            vastuScore,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [parcel.centroid.lng, parcel.centroid.lat],
          },
        });
      }

      // Entrance dot (computed from building centroid -> perimeter)
      const entrancePoint = (parcel as any).entrancePoint as { lat: number; lng: number } | null | undefined;
      if (entrancePoint && isValidLatLng(entrancePoint)) {
        features.push({
          type: 'Feature' as const,
          id: `${parcel.id}-entrance`,
          properties: {
            parentId: parcel.id,
            kind: 'entrance',
            vastuScore,
          },
          geometry: {
            type: 'Point' as const,
            coordinates: [entrancePoint.lng, entrancePoint.lat],
          },
        });

        // Dotted guidance line from centroid -> entrance (native Data layer LineString)
        if (parcel.centroid) {
          const bearingDegrees = (parcel as any).entranceBearingDegrees as number | null | undefined;
          features.push({
            type: 'Feature' as const,
            id: `${parcel.id}-entrance-line`,
            properties: {
              parentId: parcel.id,
              kind: 'entrance_line',
              vastuScore,
              bearingDegrees,
            },
            geometry: {
              type: 'LineString' as const,
              coordinates: [
                [parcel.centroid.lng, parcel.centroid.lat],
                [entrancePoint.lng, entrancePoint.lat],
              ],
            },
          });
        }
      }

      return features;
    });

    // Add GeoJSON to Data layer
    dataLayer.addGeoJson({
      type: 'FeatureCollection',
      features: geoJsonFeatures,
    });

    // Style parcels based on Vastu score (green for good, amber for medium, red for poor)
    dataLayer.setStyle((feature) => {
      const props = feature.getProperty('properties') || {};
      const vastuScore = props.vastuScore ?? 50;
      const kind = props.kind as string | undefined;
      const geomType = feature.getGeometry()?.getType?.() ?? '';
      const parentId = props.parentId as string | undefined;
      const isSelected = feature.getId() === selectedParcelId || parentId === selectedParcelId;
      const isPlot = props.type === 'plot';
      const isBuilding = props.type === 'building';

      // Point styling (centroid/entrance dots)
      if (geomType === 'Point' || kind === 'centroid' || kind === 'entrance' || kind === 'plot_centroid') {
        const zoom = map.getZoom() ?? 12;
        if (zoom < MIN_MARKER_ZOOM) {
          return { visible: false };
        }
        return {
          visible: true,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: getPointScale(kind, zoom),
            fillColor: getPointFillColor(kind),
            fillOpacity: 1,
            strokeColor: '#111827',
            strokeOpacity: 1,
            strokeWeight: 2,
          },
          clickable: false,
          zIndex: kind === 'entrance' ? 3000 : 2500,
        };
      }

      // Score marker styling (SVG label at building centroid)
      if (geomType === 'Point' && kind === 'score') {
        const zoom = map.getZoom() ?? 12;
        if (zoom < MIN_MARKER_ZOOM) return { visible: false };
        const score = typeof props.vastuScore === 'number' ? props.vastuScore : 50;
        return {
          visible: true,
          icon: getScoreIcon(score, zoom),
          clickable: false,
          zIndex: 3100,
        };
      }

      // Dotted line styling (centroid -> entrance)
      if (geomType === 'LineString' || kind === 'entrance_line') {
        const isActive = isSelected;
        const zoom = map.getZoom() ?? 12;
        if (zoom < MIN_MARKER_ZOOM) {
          return { visible: false };
        }
        const dotSymbol: google.maps.Symbol = {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isActive ? 2.2 : 1.9,
          strokeOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#111827',
          fillOpacity: 1,
          fillColor: '#22c55e',
        };

        return {
          visible: true,
          strokeOpacity: 0, // hide base stroke; use symbols as dots
          strokeWeight: 0,
          icons: [
            {
              icon: dotSymbol,
              offset: '0',
              repeat: '10px',
            },
          ],
          clickable: true, // need hover events for tooltip
          zIndex: 2600,
        };
      }

      // Color based on Vastu score
      let fillColor = '#4CAF50'; // Green (good)
      if (vastuScore < 60) {
        fillColor = '#ef4444'; // Red (poor)
      } else if (vastuScore < 80) {
        fillColor = '#f59e0b'; // Amber (medium)
      }

      return {
        fillColor,
        fillOpacity: isBuilding ? 0.12 : (isSelected ? 0.12 : 0.06),
        strokeColor: isSelected ? '#ffffff' : fillColor,
        strokeWeight: isBuilding ? 3 : (isSelected ? 4 : 2),
        strokeOpacity: 0.8,
        zIndex: isBuilding ? 300 : 200,
        clickable: isPlot, // keep interactions on plot only
      };
    });

    // Hover effects
    dataLayer.addListener('mouseover', (event: google.maps.Data.MouseEvent) => {
      const feature = event.feature;
      const geomType = feature.getGeometry()?.getType?.() ?? '';
      const props = feature.getProperty('properties') || {};
      const kind = props.kind as string | undefined;
      if (geomType === 'Point') return;
      if (props.type === 'building') return;

      // Hovering the entrance line should show bearing tooltip (native InfoWindow)
      if (geomType === 'LineString' || kind === 'entrance_line') {
        if (event.latLng) {
          const bearing = typeof props.bearingDegrees === 'number' ? props.bearingDegrees : null;
          const bearingText = bearing !== null ? `${bearing.toFixed(1)}°` : '—';
          const dir16 = bearing !== null ? bearingToCardinal16(bearing) : '—';
          const content = `
            <div style="padding: 8px; min-width: 180px;">
              <strong>Entrance bearing</strong><br/>
              ${bearingText} (${dir16})<br/>
              <span style="color:#6b7280;font-size:12px;">centroid → entrance</span>
            </div>
          `;
          infoWindow.setContent(content);
          infoWindow.setPosition(event.latLng);
          infoWindow.open(map);
        }
        return;
      }
      
      // Highlight on hover
      feature.setProperty('fillColor', '#FF5722');
      
      // Show InfoWindow with parcel details
      if (event.latLng) {
        const content = `
          <div style="padding: 8px; min-width: 200px;">
            <strong>${props.address || 'Address not available'}</strong><br/>
            ${props.owner ? `Owner: ${props.owner}<br/>` : ''}
            Type: Single Family Home<br/>
            ${props.vastuScore ? `Vastu Score: ${props.vastuScore}/100` : ''}
          </div>
        `;
        
        infoWindow.setContent(content);
        infoWindow.setPosition(event.latLng);
        infoWindow.open(map);
      }

      // Notify parent of hover
      const parcel = parcels.find((p) => p.id === feature.getId());
      onParcelHover?.(parcel || null);
    });

    dataLayer.addListener('mouseout', (event: google.maps.Data.MouseEvent) => {
      const feature = event.feature;
      const geomType = feature.getGeometry()?.getType?.() ?? '';
      const props = feature.getProperty('properties') || {};
      const kind = props.kind as string | undefined;
      if (geomType === 'Point') return;
      if (props.type === 'building') return;

      if (geomType === 'LineString' || kind === 'entrance_line') {
        infoWindow.close();
        return;
      }
      const vastuScore = props.vastuScore ?? 50;
      
      // Restore original color
      let fillColor = '#4CAF50';
      if (vastuScore < 60) {
        fillColor = '#ef4444';
      } else if (vastuScore < 80) {
        fillColor = '#f59e0b';
      }
      
      feature.setProperty('fillColor', fillColor);
      infoWindow.close();
      onParcelHover?.(null);
    });

    // Click handler
    dataLayer.addListener('click', (event: google.maps.Data.MouseEvent) => {
      const feature = event.feature;
      const geomType = feature.getGeometry()?.getType?.() ?? '';
      const props = feature.getProperty('properties') || {};
      const kind = props.kind as string | undefined;
      if (geomType === 'Point') return;
      if (geomType === 'LineString' || kind === 'entrance_line') return;
      if (props.type === 'building') return;
      const parcel = parcels.find((p) => p.id === feature.getId());
      if (parcel) {
        onParcelClick?.(parcel);
      }
    });

    // Cleanup
    return () => {
      dataLayer.setMap(null);
      infoWindow.close();
    };
  }, [map, parcels, selectedParcelId, onParcelClick, onParcelHover]);

  // Update styling when selectedParcelId changes
  useEffect(() => {
    if (!dataLayerRef.current) return;

    dataLayerRef.current.setStyle((feature) => {
      const props = feature.getProperty('properties') || {};
      const vastuScore = props.vastuScore ?? 50;
      const kind = props.kind as string | undefined;
      const geomType = feature.getGeometry()?.getType?.() ?? '';
      const parentId = props.parentId as string | undefined;
      const isSelected = feature.getId() === selectedParcelId || parentId === selectedParcelId;
      const isPlot = props.type === 'plot';
      const isBuilding = props.type === 'building';

      if (geomType === 'Point' && kind === 'score') {
        const zoom = map.getZoom() ?? 12;
        if (zoom < MIN_MARKER_ZOOM) return { visible: false };
        const score = typeof props.vastuScore === 'number' ? props.vastuScore : 50;
        return {
          visible: true,
          icon: getScoreIcon(score, zoom),
          clickable: false,
          zIndex: 3100,
        };
      }

      if (geomType === 'Point' || kind === 'centroid' || kind === 'entrance' || kind === 'plot_centroid') {
        const zoom = map.getZoom() ?? 12;
        if (zoom < MIN_MARKER_ZOOM) {
          return { visible: false };
        }
        return {
          visible: true,
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: getPointScale(kind, zoom),
            fillColor: getPointFillColor(kind),
            fillOpacity: 1,
            strokeColor: '#111827',
            strokeOpacity: 1,
            strokeWeight: 2,
          },
          clickable: false,
          zIndex: kind === 'entrance' ? 3000 : 2500,
        };
      }

      if (geomType === 'LineString' || kind === 'entrance_line') {
        const zoom = map.getZoom() ?? 12;
        if (zoom < MIN_MARKER_ZOOM) {
          return { visible: false };
        }
        const dotSymbol: google.maps.Symbol = {
          path: google.maps.SymbolPath.CIRCLE,
          scale: isSelected ? 2.2 : 1.9,
          strokeOpacity: 1,
          strokeWeight: 2,
          strokeColor: '#111827',
          fillOpacity: 1,
          fillColor: '#22c55e',
        };
        return {
          visible: true,
          strokeOpacity: 0,
          strokeWeight: 0,
          icons: [{ icon: dotSymbol, offset: '0', repeat: '10px' }],
          clickable: true,
          zIndex: 2600,
        };
      }

      let fillColor = '#4CAF50';
      if (vastuScore < 60) {
        fillColor = '#ef4444';
      } else if (vastuScore < 80) {
        fillColor = '#f59e0b';
      }

      return {
        fillColor,
        fillOpacity: isBuilding ? 0.12 : (isSelected ? 0.12 : 0.06),
        strokeColor: isSelected ? '#ffffff' : fillColor,
        strokeWeight: isBuilding ? 3 : (isSelected ? 4 : 2),
        strokeOpacity: 0.8,
        zIndex: isBuilding ? 300 : 200,
        clickable: isPlot,
      };
    });
  }, [selectedParcelId]);

  return null; // This component doesn't render anything directly
};
