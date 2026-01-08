import { useState, useCallback, useEffect } from 'react';
import { UserLocation } from '@/types/cityInfo';
import { findNearestAirport } from '../services/skyscannerService';

interface UseUserLocationResult {
  location: UserLocation | null;
  loading: boolean;
  error: string | null;
  requestLocation: () => void;
  clearLocation: () => void;
}

const LOCATION_STORAGE_KEY = 'user_location_cache';
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export function useUserLocation(): UseUserLocationResult {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load cached location on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem(LOCATION_STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as UserLocation;
        if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_DURATION) {
          setLocation(parsed);
        } else {
          localStorage.removeItem(LOCATION_STORAGE_KEY);
        }
      }
    } catch (e) {
      console.warn('Failed to load cached location:', e);
    }
  }, []);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;

          // Find nearest airport
          const nearestAirport = findNearestAirport(latitude, longitude);

          const userLocation: UserLocation = {
            lat: latitude,
            lng: longitude,
            city: nearestAirport?.city,
            country: nearestAirport?.country,
            nearestAirport: nearestAirport || undefined,
            timestamp: Date.now(),
          };

          setLocation(userLocation);
          setLoading(false);

          // Cache the location
          try {
            localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(userLocation));
          } catch (e) {
            console.warn('Failed to cache location:', e);
          }
        } catch (e) {
          console.error('Error processing location:', e);
          setError('Failed to process your location');
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            setError('Location access was denied. Please enable location in your browser settings.');
            break;
          case err.POSITION_UNAVAILABLE:
            setError('Location information is unavailable.');
            break;
          case err.TIMEOUT:
            setError('Location request timed out.');
            break;
          default:
            setError('An unknown error occurred while getting your location.');
        }
      },
      {
        enableHighAccuracy: false,
        timeout: 10000,
        maximumAge: 300000, // 5 minutes
      }
    );
  }, []);

  const clearLocation = useCallback(() => {
    setLocation(null);
    setError(null);
    localStorage.removeItem(LOCATION_STORAGE_KEY);
  }, []);

  return { location, loading, error, requestLocation, clearLocation };
}

export default useUserLocation;
