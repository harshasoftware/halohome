import { CityInfo, CityPhoto, PlaceOfInterest, PlaceCategory } from '@/types/cityInfo';
import { supabase } from '@/integrations/supabase/client';
import { monitoredEdgeFunction, monitoredFetch } from '@/lib/monitoring';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Overpass API endpoints (use multiple for redundancy)
const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
];

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

// Get photo URL from photo reference
export function getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${API_KEY}`;
}

// Map PlaceCategory to Overpass tourism/amenity tags
function getOverpassTags(types: PlaceCategory[]): string[] {
  const tagMap: Record<PlaceCategory, string[]> = {
    tourist_attraction: ['tourism~"attraction|viewpoint|artwork"'],
    museum: ['tourism="museum"'],
    park: ['leisure="park"', 'boundary="national_park"'],
    restaurant: ['amenity="restaurant"'],
    cafe: ['amenity="cafe"'],
    bar: ['amenity="bar"'],
    hotel: ['tourism~"hotel|hostel|motel"'],
    shopping_mall: ['shop="mall"'],
    landmark: ['tourism~"attraction|monument"', 'historic~"monument|memorial|castle"'],
    natural_feature: ['natural~"peak|beach|cliff|cave_entrance|waterfall"'],
  };

  const tags: string[] = [];
  for (const type of types) {
    if (tagMap[type]) {
      tags.push(...tagMap[type]);
    }
  }
  return tags.length > 0 ? tags : ['tourism~"attraction|museum|viewpoint"'];
}

// Fetch nearby places from Overpass API (free, open data)
async function fetchFromOverpass(
  lat: number,
  lng: number,
  types: PlaceCategory[],
  radius: number
): Promise<PlaceOfInterest[] | null> {
  const tags = getOverpassTags(types);

  // Build Overpass QL query - search for nodes and ways with tourism/amenity tags
  // Use small timeout to fail fast if server is overloaded
  const tagFilters = tags.map(t => `node[${t}](around:${radius},${lat},${lng});`).join('\n');
  const query = `
[out:json][timeout:10];
(
${tagFilters}
);
out center 50;
`;

  // Try each endpoint until one succeeds
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      console.log('[Places] Trying Overpass endpoint:', endpoint);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s client timeout

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        console.warn(`[Places] Overpass ${endpoint} returned ${response.status}`);
        if (response.status === 504 || response.status === 429 || response.status >= 500) {
          // Server overloaded, try next endpoint or fall back to Google
          continue;
        }
        return null;
      }

      const data = await response.json();

      if (!data.elements || data.elements.length === 0) {
        console.log('[Places] Overpass returned no results');
        return [];
      }

      // Convert Overpass results to PlaceOfInterest format
      const places: PlaceOfInterest[] = data.elements
        .filter((el: { tags?: { name?: string } }) => el.tags?.name) // Must have a name
        .map((el: {
          id: number;
          lat?: number;
          lon?: number;
          center?: { lat: number; lon: number };
          tags: {
            name: string;
            tourism?: string;
            amenity?: string;
            leisure?: string;
            historic?: string;
            natural?: string;
            description?: string;
            website?: string;
            opening_hours?: string;
            'addr:street'?: string;
            'addr:city'?: string;
          };
        }) => {
          const elLat = el.lat ?? el.center?.lat;
          const elLon = el.lon ?? el.center?.lon;

          // Determine types from OSM tags
          const osmTypes: string[] = [];
          if (el.tags.tourism) osmTypes.push(el.tags.tourism);
          if (el.tags.amenity) osmTypes.push(el.tags.amenity);
          if (el.tags.leisure) osmTypes.push(el.tags.leisure);
          if (el.tags.historic) osmTypes.push(el.tags.historic);
          if (el.tags.natural) osmTypes.push(el.tags.natural);

          return {
            placeId: `osm-${el.id}`,
            name: el.tags.name,
            types: osmTypes,
            vicinity: [el.tags['addr:street'], el.tags['addr:city']].filter(Boolean).join(', ') || undefined,
            // OSM doesn't have ratings, photos, or price levels
          } as PlaceOfInterest;
        });

      console.log(`[Places] Overpass returned ${places.length} places`);
      return places;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn(`[Places] Overpass ${endpoint} timed out`);
      } else {
        console.warn(`[Places] Overpass ${endpoint} error:`, error);
      }
      // Try next endpoint
    }
  }

  // All endpoints failed
  console.warn('[Places] All Overpass endpoints failed');
  return null;
}

// Fetch nearby places from Google Places API via edge function (paid, but reliable)
async function fetchFromGooglePlaces(
  lat: number,
  lng: number,
  types: PlaceCategory[],
  radius: number
): Promise<PlaceOfInterest[]> {
  try {
    const data = await monitoredEdgeFunction<Array<{
      placeId: string;
      name: string;
      types: string[];
      rating?: number;
      userRatingsTotal?: number;
      priceLevel?: number;
      photos?: { photoReference: string; url: string }[];
      vicinity?: string;
      openNow?: boolean;
      icon?: string;
    }>>('city-info/places', () =>
      supabase.functions.invoke('city-info', {
        body: { action: 'places', lat, lng, types, radius },
      })
    );

    if (data && Array.isArray(data) && data.length > 0) {
      return data.map(place => ({
        placeId: place.placeId,
        name: place.name,
        types: place.types,
        rating: place.rating,
        userRatingsTotal: place.userRatingsTotal,
        priceLevel: place.priceLevel,
        photos: place.photos,
        vicinity: place.vicinity,
        openNow: place.openNow,
        icon: place.icon,
      }));
    }
    return [];
  } catch (error) {
    console.warn('[Places] Google Places API failed:', error instanceof Error ? error.message : error);
    return [];
  }
}

// Fallback geocoding using Nominatim (OpenStreetMap) - free and CORS-friendly
async function getFallbackCityFromCoordinates(lat: number, lng: number): Promise<CityInfo | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'AstrocartographyApp/1.0',
      },
    });
    const data = await response.json();

    if (data.error) {
      console.warn('Nominatim geocoding failed:', data.error);
      return null;
    }

    const address = data.address || {};
    const cityName = address.city || address.town || address.village || address.municipality || address.county || '';
    const countryName = address.country || '';

    const cityInfo: CityInfo = {
      placeId: data.place_id?.toString() || `nominatim-${lat}-${lng}`,
      name: cityName || data.display_name?.split(',')[0] || 'Unknown',
      country: countryName,
      formattedAddress: data.display_name || '',
      coordinates: { lat, lng },
      photos: [], // Nominatim doesn't provide photos
    };

    return cityInfo;
  } catch (error) {
    console.error('Error with fallback geocoding:', error);
    return null;
  }
}

// Reverse geocode to find city from coordinates
// Tries Google via edge function first, falls back to Nominatim
export async function getCityFromCoordinates(lat: number, lng: number): Promise<CityInfo | null> {
  const cacheKey = `city-${lat.toFixed(4)}-${lng.toFixed(4)}`;
  const cached = getCached<CityInfo>(cacheKey);
  if (cached) return cached;

  try {
    // Try Google via edge function first (monitored)
    const data = await monitoredEdgeFunction<{
      placeId: string;
      name?: string;
      country: string;
      formattedAddress: string;
      photos?: CityPhoto[];
    }>('city-info/city', () =>
      supabase.functions.invoke('city-info', {
        body: { action: 'city', lat, lng },
      })
    );

    const cityInfo: CityInfo = {
      placeId: data.placeId,
      name: data.name || 'Unknown',
      country: data.country,
      formattedAddress: data.formattedAddress,
      coordinates: { lat, lng },
      photos: data.photos || [],
    };
    setCache(cacheKey, cityInfo);
    return cityInfo;
  } catch (error) {
    // Fallback to Nominatim if edge function fails
    console.warn('Edge function failed, using Nominatim fallback:', error instanceof Error ? error.message : error);
    const fallbackInfo = await getFallbackCityFromCoordinates(lat, lng);
    if (fallbackInfo) {
      setCache(cacheKey, fallbackInfo);
      return fallbackInfo;
    }
    return null;
  }
}


// Search for nearby places of interest
// Uses Overpass (free) as primary, Google Places API as fallback for reliability
export async function getNearbyPlaces(
  lat: number,
  lng: number,
  types: PlaceCategory[] = ['tourist_attraction', 'museum'],
  radius: number = 10000 // 10km default
): Promise<PlaceOfInterest[]> {
  const typesKey = types.sort().join(',');
  const cacheKey = `places-${lat.toFixed(4)}-${lng.toFixed(4)}-${typesKey}`;
  const cached = getCached<PlaceOfInterest[]>(cacheKey);
  if (cached) return cached;

  // Try Overpass API first (free, open data)
  console.log('[Places] Fetching nearby places via Overpass...');
  const overpassResult = await fetchFromOverpass(lat, lng, types, radius);

  if (overpassResult !== null && overpassResult.length > 0) {
    // Overpass succeeded with results
    setCache(cacheKey, overpassResult);
    return overpassResult;
  }

  // Overpass failed (504, timeout, etc.) or returned no results - fall back to Google
  if (overpassResult === null) {
    console.log('[Places] Overpass failed, falling back to Google Places API...');
  } else {
    console.log('[Places] Overpass returned no results, trying Google Places API...');
  }

  const googleResult = await fetchFromGooglePlaces(lat, lng, types, radius);
  if (googleResult.length > 0) {
    setCache(cacheKey, googleResult);
    return googleResult;
  }

  // Both failed or no results
  return [];
}

// Get place details by ID
export async function getPlaceDetails(placeId: string): Promise<PlaceOfInterest | null> {
  const cacheKey = `place-details-${placeId}`;
  const cached = getCached<PlaceOfInterest>(cacheKey);
  if (cached) return cached;

  try {
    const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,rating,user_ratings_total,price_level,photos,formatted_address,opening_hours,types,geometry,icon&key=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK' || !data.result) {
      return null;
    }

    const place = data.result;
    const placeDetails: PlaceOfInterest = {
      placeId,
      name: place.name,
      types: place.types || [],
      rating: place.rating,
      userRatingsTotal: place.user_ratings_total,
      priceLevel: place.price_level,
      photos: place.photos?.slice(0, 5).map((photo: {
        photo_reference: string;
        width: number;
        height: number;
        html_attributions: string[];
      }) => ({
        photoReference: photo.photo_reference,
        width: photo.width,
        height: photo.height,
        attributions: photo.html_attributions || [],
        url: getPhotoUrl(photo.photo_reference, 600),
      })),
      vicinity: place.formatted_address,
      openNow: place.opening_hours?.open_now,
      icon: place.icon,
    };

    setCache(cacheKey, placeDetails);
    return placeDetails;
  } catch (error) {
    console.error('Error fetching place details:', error);
    return null;
  }
}

// Calculate distance between two coordinates in km
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Clear all cached data
export function clearPlacesCache(): void {
  cache.clear();
}
