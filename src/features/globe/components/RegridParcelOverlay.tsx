/**
 * Regrid Parcel Overlay Component
 * 
 * Overlays Regrid SFH parcels on Google Maps using the Data layer.
 * Provides hover effects and styling based on Vastu scores.
 */

import React, { useEffect, useRef } from 'react';
import { useGoogleMap } from '@react-google-maps/api';
import type { BuildingFootprint } from '../services/buildingFootprintsService';

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
    const geoJsonFeatures = parcels.map((parcel) => {
      // Extract vastuScore from parcel if available (may be stored in a different format)
      let vastuScore = 50; // Default
      if ('vastuScore' in parcel && typeof (parcel as any).vastuScore === 'number') {
        vastuScore = (parcel as any).vastuScore;
      }
      
      return {
        type: 'Feature' as const,
        id: parcel.id,
        properties: {
          regridId: parcel.regridId,
          address: parcel.address,
          owner: parcel.owner,
          vastuScore,
          type: parcel.type,
        },
        geometry: {
          type: 'Polygon' as const,
          coordinates: [
            parcel.coordinates.map((coord) => [coord.lng, coord.lat]),
          ],
        },
      };
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
      const isSelected = feature.getId() === selectedParcelId;
      const isPlot = props.type === 'plot';

      // Color based on Vastu score
      let fillColor = '#4CAF50'; // Green (good)
      if (vastuScore < 60) {
        fillColor = '#ef4444'; // Red (poor)
      } else if (vastuScore < 80) {
        fillColor = '#f59e0b'; // Amber (medium)
      }

      return {
        fillColor,
        fillOpacity: isSelected ? 0.3 : 0.25,
        strokeColor: isSelected ? '#ffffff' : fillColor,
        strokeWeight: isSelected ? 5 : 2,
        strokeOpacity: 0.8,
        zIndex: isSelected ? 1000 : 100,
        clickable: true,
      };
    });

    // Hover effects
    dataLayer.addListener('mouseover', (event: google.maps.Data.MouseEvent) => {
      const feature = event.feature;
      const props = feature.getProperty('properties') || {};
      
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
      const props = feature.getProperty('properties') || {};
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
      const isSelected = feature.getId() === selectedParcelId;

      let fillColor = '#4CAF50';
      if (vastuScore < 60) {
        fillColor = '#ef4444';
      } else if (vastuScore < 80) {
        fillColor = '#f59e0b';
      }

      return {
        fillColor,
        fillOpacity: isSelected ? 0.3 : 0.25,
        strokeColor: isSelected ? '#ffffff' : fillColor,
        strokeWeight: isSelected ? 5 : 2,
        strokeOpacity: 0.8,
        zIndex: isSelected ? 1000 : 100,
        clickable: true,
      };
    });
  }, [selectedParcelId]);

  return null; // This component doesn't render anything directly
};
