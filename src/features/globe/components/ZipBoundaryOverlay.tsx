/**
 * ZIP Boundary Overlay using Google Maps Data layer
 * 
 * Displays TIGER/Line ZCTA5 ZIP boundaries as a Data layer for better
 * performance and consistency with Regrid parcel overlays.
 */

import { useEffect, useRef } from 'react';
import { useGoogleMap } from '@react-google-maps/api';

interface ZipBoundaryOverlayProps {
  /** ZIP boundary polygon coordinates (actual boundary from TIGER/Line) */
  zipCodeBoundary?: Array<{ lat: number; lng: number }> | null;
  /** ZIP code bounding box (fallback if boundary not available) */
  zipCodeBounds?: { north: number; south: number; east: number; west: number } | null;
  /** Current ZIP code being displayed */
  currentZipCode?: string | null;
}

/**
 * ZIP Boundary Overlay Component
 * 
 * Uses Google Maps Data layer to display ZIP boundaries.
 * Falls back to bounding box rectangle if actual boundary not available.
 */
export const ZipBoundaryOverlay: React.FC<ZipBoundaryOverlayProps> = ({
  zipCodeBoundary,
  zipCodeBounds,
  currentZipCode,
}) => {
  const map = useGoogleMap();
  const dataLayerRef = useRef<google.maps.Data | null>(null);
  const lastZipCodeRef = useRef<string | null>(null); // Track last rendered ZIP code
  const lastBoundaryRef = useRef<Array<{ lat: number; lng: number }> | null>(null); // Track last rendered boundary to prevent duplicate renders
  const lastFittedZipRef = useRef<string | null>(null); // Track last ZIP we auto-fit to

  function getPolygonBounds(points: Array<{ lat: number; lng: number }>): google.maps.LatLngBounds | null {
    if (points.length < 3) return null;
    const first = points[0];
    const last = points[points.length - 1];
    const ring = first.lat === last.lat && first.lng === last.lng ? points.slice(0, -1) : points;
    if (ring.length < 3) return null;

    const bounds = new google.maps.LatLngBounds();
    ring.forEach((p) => bounds.extend(p));
    return bounds;
  }

  useEffect(() => {
    console.log(`[ZipBoundaryOverlay] useEffect triggered:`, {
      hasMap: !!map,
      hasZipCodeBoundary: !!zipCodeBoundary,
      zipCodeBoundaryLength: zipCodeBoundary?.length,
      hasZipCodeBounds: !!zipCodeBounds,
      currentZipCode,
      lastZipCode: lastZipCodeRef.current,
    });
    
    if (!map) return;

    // CRITICAL: Check if ZIP code changed BEFORE updating the ref
    // This ensures cleanup happens when ZIP code actually changes
    const zipCodeChanged = currentZipCode !== lastZipCodeRef.current;
    const boundaryCleared = !zipCodeBoundary && lastZipCodeRef.current !== null;
    const zipCodeCleared = !currentZipCode && lastZipCodeRef.current !== null;
    
    // Always cleanup when ZIP code changes, boundary is cleared, or ZIP code is cleared
    if (dataLayerRef.current && (zipCodeChanged || boundaryCleared || zipCodeCleared)) {
      console.log(`[ZipBoundaryOverlay] Cleaning up existing data layer (ZIP changed: ${zipCodeChanged}, boundary cleared: ${boundaryCleared}, ZIP cleared: ${zipCodeCleared})`);
      console.log(`[ZipBoundaryOverlay] Previous ZIP: ${lastZipCodeRef.current}, New ZIP: ${currentZipCode}`);
      try {
        // Remove all features FIRST - this is critical for visual cleanup
        const featuresToRemove: google.maps.Data.Feature[] = [];
        dataLayerRef.current.forEach((feature) => {
          featuresToRemove.push(feature);
        });
        featuresToRemove.forEach((feature) => {
          const featureId = feature.getId();
          const featureZipCode = feature.getProperty('zipCode') || feature.getProperty('properties')?.zipCode;
          console.log(`[ZipBoundaryOverlay] Removing feature during cleanup: ${featureId}, ZIP: ${featureZipCode}`);
          dataLayerRef.current!.remove(feature);
        });
        // Clear all listeners
        google.maps.event.clearInstanceListeners(dataLayerRef.current);
        // Remove from map
        dataLayerRef.current.setMap(null);
        dataLayerRef.current = null;
        // Reset boundary ref when cleaning up
        lastBoundaryRef.current = null;
        // Reset auto-center tracking when switching/clearing ZIP
        lastFittedZipRef.current = null;
        console.log(`[ZipBoundaryOverlay] Data layer cleaned up successfully, removed ${featuresToRemove.length} feature(s)`);
      } catch (error) {
        console.error(`[ZipBoundaryOverlay] Error cleaning up data layer:`, error);
        // Force cleanup even if there's an error
        dataLayerRef.current = null;
        lastBoundaryRef.current = null;
        lastFittedZipRef.current = null;
      }
    }
    
    // Update last ZIP code ref AFTER cleanup - this ensures zipCodeChanged check works correctly
    if (zipCodeCleared) {
      lastZipCodeRef.current = null;
    } else if (zipCodeChanged) {
      // Only update if ZIP code actually changed
      lastZipCodeRef.current = currentZipCode || null;
    }

    // Only render if we have the actual polygon boundary (not rectangle fallback)
    // The polygon should always be fetched from Supabase - if it's not available,
    // we don't render anything (rather than showing an inaccurate rectangle)
    if (!zipCodeBoundary || zipCodeBoundary.length < 3) {
      console.log(`[ZipBoundaryOverlay] No polygon boundary available - waiting for fetch or ZIP not in database`);
      // Ensure data layer is cleaned up when boundary is cleared
      if (dataLayerRef.current) {
        console.log(`[ZipBoundaryOverlay] Boundary cleared, cleaning up data layer`);
        try {
          dataLayerRef.current.forEach((feature) => {
            dataLayerRef.current!.remove(feature);
          });
          google.maps.event.clearInstanceListeners(dataLayerRef.current);
          dataLayerRef.current.setMap(null);
          dataLayerRef.current = null;
          console.log(`[ZipBoundaryOverlay] Data layer cleaned up on boundary clear`);
        } catch (error) {
          console.error(`[ZipBoundaryOverlay] Error cleaning up on boundary clear:`, error);
          dataLayerRef.current = null;
        }
      }
      // Reset refs when boundary is cleared
      lastBoundaryRef.current = null;
      lastFittedZipRef.current = null;
      if (!currentZipCode) {
        lastZipCodeRef.current = null;
      }
      return;
    }

    // Prevent duplicate rendering of the same boundary for the same ZIP code
    // IMPORTANT: Only skip if we have the exact same boundary reference AND same ZIP code AND data layer exists
    // If ZIP code changed, we MUST re-render even if boundary reference is the same (shouldn't happen, but safety check)
    const isSameBoundary = lastBoundaryRef.current === zipCodeBoundary && lastZipCodeRef.current === currentZipCode && !zipCodeChanged;
    if (isSameBoundary && dataLayerRef.current) {
      console.log(`[ZipBoundaryOverlay] Same boundary already rendered for ZIP ${currentZipCode}, skipping`);
      return;
    }
    
    // If ZIP code changed, force cleanup of boundary ref to ensure fresh render
    if (zipCodeChanged) {
      console.log(`[ZipBoundaryOverlay] ZIP code changed, resetting boundary ref to ensure fresh render`);
      lastBoundaryRef.current = null;
    }

    // ALWAYS create a fresh Data layer when ZIP code changes OR if we don't have one
    // This ensures we never have stale features from previous searches
    if (zipCodeChanged || !dataLayerRef.current) {
      if (zipCodeChanged) {
        console.log(`[ZipBoundaryOverlay] ZIP code changed from ${lastZipCodeRef.current} to ${currentZipCode}, creating fresh Data layer`);
      } else {
        console.log(`[ZipBoundaryOverlay] Creating new Data layer for ZIP: ${currentZipCode}`);
      }
      
      // Ensure any existing layer is fully cleaned up before creating new one
      if (dataLayerRef.current) {
        try {
          const featuresToRemove: google.maps.Data.Feature[] = [];
          dataLayerRef.current.forEach((feature) => {
            featuresToRemove.push(feature);
          });
          featuresToRemove.forEach((feature) => {
            dataLayerRef.current!.remove(feature);
          });
          google.maps.event.clearInstanceListeners(dataLayerRef.current);
          dataLayerRef.current.setMap(null);
          console.log(`[ZipBoundaryOverlay] Cleaned up ${featuresToRemove.length} feature(s) before creating new layer`);
        } catch (error) {
          console.error(`[ZipBoundaryOverlay] Error cleaning up before new ZIP:`, error);
        }
      }
      
      // Create a completely fresh data layer
      dataLayerRef.current = new google.maps.Data({ map });
      console.log(`[ZipBoundaryOverlay] Created fresh Data layer for ZIP: ${currentZipCode}`);
    }

    // Get the data layer reference
    const dataLayer = dataLayerRef.current;
    if (!dataLayer) {
      console.error(`[ZipBoundaryOverlay] Data layer not available`);
      return;
    }

    console.log(`[ZipBoundaryOverlay] Rendering actual polygon boundary with ${zipCodeBoundary.length} points for ZIP: ${currentZipCode}`);
    console.log(`[ZipBoundaryOverlay] Boundary data sample - first point:`, zipCodeBoundary[0], `last point:`, zipCodeBoundary[zipCodeBoundary.length - 1]);
    console.log(`[ZipBoundaryOverlay] Last rendered boundary ref:`, lastBoundaryRef.current === zipCodeBoundary ? 'SAME REFERENCE' : 'DIFFERENT REFERENCE');
    console.log(`[ZipBoundaryOverlay] Last rendered ZIP:`, lastZipCodeRef.current, `Current ZIP:`, currentZipCode);
    
    // Verify we're using the correct boundary for the current ZIP code
    // This helps catch cases where stale boundary data might be used
    if (!currentZipCode) {
      console.warn(`[ZipBoundaryOverlay] No current ZIP code but have boundary data - this shouldn't happen`);
      return;
    }
    
    // CRITICAL: If ZIP code changed, we MUST NOT use the old boundary reference
    // Even if the boundary array reference is the same, if ZIP code changed, we need to re-render
    if (zipCodeChanged && lastBoundaryRef.current === zipCodeBoundary) {
      console.warn(`[ZipBoundaryOverlay] WARNING: ZIP code changed but boundary reference is the same - this indicates stale data!`);
      console.warn(`[ZipBoundaryOverlay] Clearing boundary ref to force re-render`);
      lastBoundaryRef.current = null;
    }
    
    // Update refs to track what we've rendered
    lastBoundaryRef.current = zipCodeBoundary;

    // Convert boundary to GeoJSON format for Data layer
    // Ensure polygon is closed (first and last coordinates must match)
    const coords = zipCodeBoundary.map((coord) => [coord.lng, coord.lat]);
    const firstCoord = coords[0];
    const lastCoord = coords[coords.length - 1];
    
    // Close the polygon if not already closed
    if (firstCoord[0] !== lastCoord[0] || firstCoord[1] !== lastCoord[1]) {
      coords.push([firstCoord[0], firstCoord[1]]);
      console.log(`[ZipBoundaryOverlay] Closed polygon by adding first coordinate at end`);
    }

    // Create feature ID based on current ZIP code to ensure uniqueness
    const featureId = `zip-boundary-${currentZipCode || 'unknown'}`;
    
    const geoJsonFeature: GeoJSON.Feature = {
      type: 'Feature',
      id: featureId,
      properties: {
        type: 'zip-boundary',
        zipCode: currentZipCode,
      },
      geometry: {
        type: 'Polygon',
        coordinates: [coords],
      },
    };

    // Add GeoJSON to Data layer with error handling
    try {
      // ALWAYS clear ALL existing features before adding new ones
      // This ensures we never have stale polygons from previous searches
      // CRITICAL: This is a safety net - we should have already cleaned up when ZIP code changed,
      // but this ensures no features remain from any previous render
      if (dataLayerRef.current) {
        const existingFeatures: google.maps.Data.Feature[] = [];
        dataLayerRef.current.forEach((feature) => {
          existingFeatures.push(feature);
        });
        
        if (existingFeatures.length > 0) {
          console.log(`[ZipBoundaryOverlay] Found ${existingFeatures.length} existing feature(s) before adding new boundary - removing them`);
          existingFeatures.forEach((feature) => {
            const featureId = feature.getId();
            const featureZipCode = feature.getProperty('zipCode') || feature.getProperty('properties')?.zipCode;
            console.log(`[ZipBoundaryOverlay] Removing existing feature: ${featureId}, ZIP: ${featureZipCode}, current ZIP: ${currentZipCode}`);
            try {
              dataLayerRef.current!.remove(feature);
            } catch (error) {
              console.error(`[ZipBoundaryOverlay] Error removing feature ${featureId}:`, error);
            }
          });
          
          // Verify all features were removed
          let remainingCount = 0;
          dataLayerRef.current.forEach(() => {
            remainingCount++;
          });
          if (remainingCount > 0) {
            console.warn(`[ZipBoundaryOverlay] WARNING: ${remainingCount} feature(s) still remain after removal attempt!`);
          } else {
            console.log(`[ZipBoundaryOverlay] Successfully removed all ${existingFeatures.length} existing feature(s)`);
          }
        }
      }
      
      // Log the coordinates we're about to add for debugging
      console.log(`[ZipBoundaryOverlay] Adding new boundary for ZIP ${currentZipCode} with ${coords.length} coordinates`);
      console.log(`[ZipBoundaryOverlay] First coordinate: [${coords[0][0]}, ${coords[0][1]}], Last coordinate: [${coords[coords.length - 1][0]}, ${coords[coords.length - 1][1]}]`);
      
      // Wrap in FeatureCollection (like RegridParcelOverlay does)
      const geoJsonFeatureCollection: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [geoJsonFeature],
      };
      
      const features = dataLayer.addGeoJson(geoJsonFeatureCollection);
      
      // Verify the features were added correctly and match the current ZIP code
      features.forEach((feature, index) => {
        const addedFeatureId = feature.getId();
        const addedZipCode = feature.getProperty('zipCode') || feature.getProperty('properties')?.zipCode;
        console.log(`[ZipBoundaryOverlay] Added feature ${index}: ID=${addedFeatureId}, ZIP=${addedZipCode}, expected ZIP=${currentZipCode}`);
        
        // Safety check: if the feature ZIP doesn't match current ZIP, something is wrong
        if (addedZipCode !== currentZipCode) {
          console.error(`[ZipBoundaryOverlay] MISMATCH: Feature ZIP (${addedZipCode}) doesn't match current ZIP (${currentZipCode})! Removing incorrect feature.`);
          dataLayer.remove(feature);
        }
      });
      
      // Verify we have the correct feature by checking all features in the layer
      let foundCorrectFeature = false;
      dataLayer.forEach((feature) => {
        const featureZipCode = feature.getProperty('zipCode') || feature.getProperty('properties')?.zipCode;
        if (featureZipCode === currentZipCode) {
          foundCorrectFeature = true;
        } else {
          console.warn(`[ZipBoundaryOverlay] Found feature with wrong ZIP code: ${featureZipCode}, expected: ${currentZipCode}`);
        }
      });
      
      if (!foundCorrectFeature && features.length > 0) {
        console.error(`[ZipBoundaryOverlay] ERROR: No feature with correct ZIP code found after adding! This indicates a problem.`);
      }
      
      // Style the ZIP boundary AFTER adding features
      dataLayer.setStyle(() => {
        return {
          fillColor: '#6366F1', // Indigo for actual ZIP boundary
          fillOpacity: 0.3, // Increased for better visibility
          strokeColor: '#6366F1',
          strokeWeight: 5, // Increased for better visibility
          strokeOpacity: 1.0,
          clickable: false,
          zIndex: 1, // Below parcels but above base map
        };
      });
      console.log(`[ZipBoundaryOverlay] Successfully added ${features.length} feature(s) to Data layer for ZIP: ${currentZipCode}`);

      // Auto-fit the map so the entire ZIP polygon is visible (once per ZIP code)
      // This ensures the user always sees the full boundary in the viewport.
      if (currentZipCode && lastFittedZipRef.current !== currentZipCode) {
        const bounds = getPolygonBounds(zipCodeBoundary);
        if (bounds) {
          console.log(`[ZipBoundaryOverlay] Fitting map to ZIP polygon bounds`);
          // Padding keeps the boundary away from UI overlays.
          map.fitBounds(bounds, 80);
          lastFittedZipRef.current = currentZipCode;
        } else if (zipCodeBounds) {
          const fallbackBounds = new google.maps.LatLngBounds(
            { lat: zipCodeBounds.south, lng: zipCodeBounds.west },
            { lat: zipCodeBounds.north, lng: zipCodeBounds.east }
          );
          console.log(`[ZipBoundaryOverlay] Polygon bounds unavailable, fitting map to ZIP bounds fallback`);
          map.fitBounds(fallbackBounds, 80);
          lastFittedZipRef.current = currentZipCode;
        }
      }
      
      if (features.length === 0) {
        console.warn(`[ZipBoundaryOverlay] No features were added - polygon might be invalid`);
        // Try to validate the coordinates
        const sampleCoords = coords.slice(0, 5);
        console.log(`[ZipBoundaryOverlay] Sample coordinates:`, sampleCoords);
      } else {
        // Log the bounds of the polygon for debugging
        features.forEach((feature, index) => {
          console.log(`[ZipBoundaryOverlay] Processing feature ${index}:`, {
            id: feature.getId(),
            hasGeometry: !!feature.getGeometry(),
          });
          
          const geometry = feature.getGeometry();
          if (geometry) {
            const geometryType = geometry.getType();
            console.log(`[ZipBoundaryOverlay] Geometry type:`, geometryType);
            
            try {
              const bounds = new google.maps.LatLngBounds();
              
              // Handle different geometry types
              if (geometryType === 'Polygon') {
                const polygon = geometry as google.maps.Data.Polygon;
                polygon.getArray().forEach((linearRing) => {
                  linearRing.getArray().forEach((latLng) => {
                    bounds.extend(latLng);
                  });
                });
              } else {
                // Fallback to forEachLatLng
                geometry.forEachLatLng((latLng) => {
                  bounds.extend(latLng);
                });
              }
              
              console.log(`[ZipBoundaryOverlay] Polygon bounds:`, {
                north: bounds.getNorthEast().lat(),
                south: bounds.getSouthWest().lat(),
                east: bounds.getNorthEast().lng(),
                west: bounds.getSouthWest().lng(),
              });
              
              const mapCenter = map.getCenter();
              const mapBounds = map.getBounds();
              console.log(`[ZipBoundaryOverlay] Map center:`, mapCenter?.toJSON());
              console.log(`[ZipBoundaryOverlay] Map bounds:`, mapBounds?.toJSON());
              
              // Check if polygon is in viewport
              if (mapBounds && bounds) {
                const isInViewport = mapBounds.intersects(bounds);
                console.log(`[ZipBoundaryOverlay] Polygon in viewport:`, isInViewport);
              }
            } catch (error) {
              console.error(`[ZipBoundaryOverlay] Error calculating bounds:`, error);
            }
          } else {
            console.warn(`[ZipBoundaryOverlay] Feature has no geometry!`);
          }
        });
      }
    } catch (error) {
      console.error(`[ZipBoundaryOverlay] Error adding GeoJSON to Data layer:`, error);
      console.error(`[ZipBoundaryOverlay] GeoJSON feature:`, geoJsonFeature);
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (dataLayerRef.current) {
        console.log(`[ZipBoundaryOverlay] Cleanup function called - removing data layer`);
        try {
          const featuresToRemove: google.maps.Data.Feature[] = [];
          dataLayerRef.current.forEach((feature) => {
            featuresToRemove.push(feature);
          });
          featuresToRemove.forEach((feature) => {
            dataLayerRef.current!.remove(feature);
          });
          google.maps.event.clearInstanceListeners(dataLayerRef.current);
          dataLayerRef.current.setMap(null);
          console.log(`[ZipBoundaryOverlay] Cleanup removed ${featuresToRemove.length} feature(s)`);
        } catch (error) {
          console.error(`[ZipBoundaryOverlay] Error in cleanup function:`, error);
        } finally {
          dataLayerRef.current = null;
          // Reset refs on cleanup
          lastBoundaryRef.current = null;
          lastFittedZipRef.current = null;
          // Don't reset lastZipCodeRef here - it should persist for the next render
        }
      }
    };
  }, [map, zipCodeBoundary, zipCodeBounds, currentZipCode]);

  // This component doesn't render anything - it manages the Data layer via useEffect
  return null;
};
