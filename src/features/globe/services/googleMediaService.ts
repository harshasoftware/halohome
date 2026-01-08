import { StreetViewData, AerialViewData } from '@/types/cityInfo';
import { supabase } from '@/integrations/supabase/client';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour for media

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Simple in-memory cache
const cache = new Map<string, CacheEntry<unknown>>();

function getCached<T>(key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Get Street View static image URL
 * Uses the Street View Static API to generate a panoramic image
 */
export function getStreetViewUrl(
  lat: number,
  lng: number,
  options: {
    width?: number;
    height?: number;
    heading?: number;
    pitch?: number;
    fov?: number;
  } = {}
): string {
  const {
    width = 600,
    height = 400,
    heading = 0,
    pitch = 0,
    fov = 90,
  } = options;

  return `https://maps.googleapis.com/maps/api/streetview?size=${width}x${height}&location=${lat},${lng}&heading=${heading}&pitch=${pitch}&fov=${fov}&key=${API_KEY}`;
}

/**
 * Check if Street View is available at the given location
 * Uses edge function to call Street View Metadata API
 */
export async function checkStreetViewAvailability(
  lat: number,
  lng: number
): Promise<StreetViewData | null> {
  const cacheKey = `streetview-${lat.toFixed(4)}-${lng.toFixed(4)}`;
  const cached = getCached<StreetViewData>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.functions.invoke('city-info', {
      body: { action: 'streetView', lat, lng },
    });

    if (error) {
      console.error('Edge function error:', error);
      return null;
    }

    if (data?.available) {
      const streetViewData: StreetViewData = {
        available: true,
        panoId: data.panoId,
        date: data.date,
        imageUrl: data.imageUrl,
      };
      setCache(cacheKey, streetViewData);
      return streetViewData;
    }

    // Not available at this location
    const unavailable: StreetViewData = {
      available: false,
    };
    setCache(cacheKey, unavailable);
    return unavailable;
  } catch (error) {
    console.error('Error checking Street View availability:', error);
    return null;
  }
}

/**
 * Get multiple Street View images from different angles
 * Useful for creating a virtual "tour" effect
 */
export function getStreetViewPanorama(
  lat: number,
  lng: number,
  angles: number = 4
): string[] {
  const urls: string[] = [];
  const headingStep = 360 / angles;

  for (let i = 0; i < angles; i++) {
    const heading = i * headingStep;
    urls.push(
      getStreetViewUrl(lat, lng, {
        heading,
        pitch: 0,
        fov: 90,
      })
    );
  }

  return urls;
}

/**
 * Get Aerial View video for a location
 * Uses edge function to call the Aerial View API
 * Note: This API has specific requirements and may not be available for all locations
 */
export async function getAerialView(
  lat: number,
  lng: number,
  cityName?: string
): Promise<AerialViewData | null> {
  const cacheKey = `aerial-${lat.toFixed(4)}-${lng.toFixed(4)}`;
  const cached = getCached<AerialViewData>(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase.functions.invoke('city-info', {
      body: { action: 'aerialView', lat, lng, cityName },
    });

    if (error) {
      console.log('Aerial View API error:', error);
      const unavailable: AerialViewData = { available: false };
      setCache(cacheKey, unavailable);
      return unavailable;
    }

    if (data?.available) {
      const aerialData: AerialViewData = {
        available: true,
        videoUrl: data.videoUrl,
        thumbnailUrl: data.thumbnailUrl,
        duration: data.duration,
      };
      setCache(cacheKey, aerialData);
      return aerialData;
    }

    // Video not ready or not available
    const unavailable: AerialViewData = { available: false };
    setCache(cacheKey, unavailable);
    return unavailable;
  } catch (error) {
    console.log('Aerial View API error (may not be enabled):', error);
    const unavailable: AerialViewData = { available: false };
    setCache(cacheKey, unavailable);
    return unavailable;
  }
}

/**
 * Get Google Maps embed URL for interactive Street View
 * This opens a full interactive Street View experience
 */
export function getStreetViewEmbedUrl(lat: number, lng: number): string {
  return `https://www.google.com/maps/embed/v1/streetview?key=${API_KEY}&location=${lat},${lng}&heading=0&pitch=0&fov=90`;
}

/**
 * Generate a Google Maps directions link
 * Useful for the "View in Maps" functionality
 */
export function getGoogleMapsLink(lat: number, lng: number, placeName?: string): string {
  const label = placeName ? encodeURIComponent(placeName) : '';
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}${label ? `&query_place_id=${label}` : ''}`;
}

/**
 * Get Static Map image URL
 * Useful for showing a map preview without loading the full Maps JavaScript API
 */
export function getStaticMapUrl(
  lat: number,
  lng: number,
  options: {
    width?: number;
    height?: number;
    zoom?: number;
    mapType?: 'roadmap' | 'satellite' | 'terrain' | 'hybrid';
    markers?: boolean;
  } = {}
): string {
  const {
    width = 400,
    height = 200,
    zoom = 12,
    mapType = 'roadmap',
    markers = true,
  } = options;

  let url = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=${zoom}&size=${width}x${height}&maptype=${mapType}&key=${API_KEY}`;

  if (markers) {
    url += `&markers=color:red%7C${lat},${lng}`;
  }

  return url;
}
