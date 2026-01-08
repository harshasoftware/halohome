/**
 * useGlobeNavigation - Hook for globe navigation and point-of-view control
 *
 * Extracts globe navigation logic from GlobePage for reusability.
 * Handles flying to locations, zooming, and camera control.
 */

import { useCallback, useRef, MutableRefObject } from 'react';
import { toast } from 'sonner';
import type { GlobeMethods } from 'react-globe.gl';

interface PointOfView {
  lat: number;
  lng: number;
  altitude?: number;
}

interface UseGlobeNavigationOptions {
  globeRef: MutableRefObject<GlobeMethods | undefined>;
  isMobile?: boolean;
  defaultAltitude?: number;
  mobileAltitude?: number;
  animationDuration?: number;
}

interface UseGlobeNavigationReturn {
  // Navigation actions
  flyTo: (lat: number, lng: number, altitude?: number, duration?: number) => void;
  flyToCity: (lat: number, lng: number, cityName: string, altitude?: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;

  // Utilities
  getScreenCoords: (lat: number, lng: number) => { x: number; y: number } | null;
  getCurrentPOV: () => PointOfView | null;
  setInitialView: (locations: Array<{ lat: number; lng: number }>) => void;
}

export function useGlobeNavigation({
  globeRef,
  isMobile = false,
  defaultAltitude = 1.5,
  mobileAltitude = 3,
  animationDuration = 1000,
}: UseGlobeNavigationOptions): UseGlobeNavigationReturn {
  const initialViewSetRef = useRef(false);

  // Get the globe instance safely
  const getGlobe = useCallback(() => globeRef.current, [globeRef]);

  // Fly to a specific location
  const flyTo = useCallback(
    (lat: number, lng: number, altitude?: number, duration?: number) => {
      const globe = getGlobe();
      if (!globe) return;

      const targetAltitude = altitude ?? (isMobile ? mobileAltitude : defaultAltitude);
      const targetDuration = duration ?? animationDuration;

      try {
        globe.pointOfView({ lat, lng, altitude: targetAltitude }, targetDuration);
      } catch (e) {
        console.warn('Failed to set globe pointOfView:', e);
      }
    },
    [getGlobe, isMobile, defaultAltitude, mobileAltitude, animationDuration]
  );

  // Fly to a city with toast notification
  const flyToCity = useCallback(
    (lat: number, lng: number, cityName: string, altitude?: number) => {
      flyTo(lat, lng, altitude ?? 0.4, 1500);
      toast.success(`Zooming to ${cityName}`);
    },
    [flyTo]
  );

  // Zoom in by reducing altitude
  const zoomIn = useCallback(() => {
    const globe = getGlobe();
    if (!globe) return;

    try {
      const pov = globe.pointOfView();
      if (pov) {
        const newAltitude = Math.max(0.1, (pov.altitude ?? 2) * 0.7);
        globe.pointOfView({ ...pov, altitude: newAltitude }, 500);
      }
    } catch (e) {
      console.warn('Failed to zoom in:', e);
    }
  }, [getGlobe]);

  // Zoom out by increasing altitude
  const zoomOut = useCallback(() => {
    const globe = getGlobe();
    if (!globe) return;

    try {
      const pov = globe.pointOfView();
      if (pov) {
        const newAltitude = Math.min(5, (pov.altitude ?? 2) * 1.4);
        globe.pointOfView({ ...pov, altitude: newAltitude }, 500);
      }
    } catch (e) {
      console.warn('Failed to zoom out:', e);
    }
  }, [getGlobe]);

  // Reset to default view
  const resetView = useCallback(() => {
    flyTo(0, 0, isMobile ? 3 : 2, 1000);
  }, [flyTo, isMobile]);

  // Get screen coordinates for a lat/lng
  const getScreenCoords = useCallback(
    (lat: number, lng: number): { x: number; y: number } | null => {
      const globe = getGlobe();
      if (!globe) return null;

      try {
        return globe.getScreenCoords(lat, lng);
      } catch (e) {
        console.warn('Failed to get screen coords:', e);
        return null;
      }
    },
    [getGlobe]
  );

  // Get current point of view
  const getCurrentPOV = useCallback((): PointOfView | null => {
    const globe = getGlobe();
    if (!globe) return null;

    try {
      const pov = globe.pointOfView();
      return pov ? { lat: pov.lat, lng: pov.lng, altitude: pov.altitude } : null;
    } catch (e) {
      console.warn('Failed to get POV:', e);
      return null;
    }
  }, [getGlobe]);

  // Set initial view based on location data
  const setInitialView = useCallback(
    (locations: Array<{ lat: number; lng: number }>) => {
      if (initialViewSetRef.current || locations.length === 0) return;

      const globe = getGlobe();
      if (!globe) return;

      initialViewSetRef.current = true;

      // Find most populated location
      const locationCounts = locations.reduce((acc, loc) => {
        const key = `${loc.lat.toFixed(2)},${loc.lng.toFixed(2)}`;
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      const mostPopulated = Object.keys(locationCounts).reduce((a, b) =>
        locationCounts[a] > locationCounts[b] ? a : b
      );

      const [lat, lng] = mostPopulated.split(',').map(Number);

      try {
        globe.pointOfView(
          { lat, lng, altitude: isMobile ? 3 : 2 },
          1000
        );
      } catch (e) {
        console.warn('Failed to set initial view:', e);
      }
    },
    [getGlobe, isMobile]
  );

  return {
    flyTo,
    flyToCity,
    zoomIn,
    zoomOut,
    resetView,
    getScreenCoords,
    getCurrentPOV,
    setInitialView,
  };
}

export default useGlobeNavigation;
