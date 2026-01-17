/**
 * Zone Address Service
 *
 * Fetches and counts addresses within a drawn polygon zone.
 * Used for enforcing the 50-house limit for scout zones.
 */

import { supabase } from '@/integrations/supabase/client';
import { isPointInPolygon, getBoundingBox, calculateBoundingRadius, SCOUT_HOUSE_LIMIT } from '@/lib/geo-utils';

export interface ZoneAddress {
  placeId: string;
  address: string;
  lat: number;
  lng: number;
  types: string[];
}

export interface ZoneAddressResult {
  addresses: ZoneAddress[];
  totalCount: number;
  isComplete: boolean; // False if we hit API limits before scanning full zone
  exceedsLimit: boolean;
  limitReached: number;
}

const MAX_API_CALLS = 5; // Limit API calls to prevent excessive usage
const ADDRESSES_TYPES = ['street_address', 'premise', 'subpremise', 'establishment'];

/**
 * Fetch addresses within a polygon zone
 *
 * Uses Google Places Nearby Search to find addresses within the bounding box,
 * then filters to only include addresses that are actually inside the polygon.
 *
 * @param polygon - Array of lat/lng points defining the polygon
 * @param onProgress - Optional callback for progress updates
 * @returns Promise<ZoneAddressResult>
 */
export async function fetchAddressesInZone(
  polygon: Array<{ lat: number; lng: number }>,
  onProgress?: (count: number, phase: string) => void
): Promise<ZoneAddressResult> {
  if (polygon.length < 3) {
    return {
      addresses: [],
      totalCount: 0,
      isComplete: true,
      exceedsLimit: false,
      limitReached: SCOUT_HOUSE_LIMIT,
    };
  }

  const bounds = getBoundingBox(polygon);
  const radiusMeters = Math.min(calculateBoundingRadius(polygon), 50000); // Max 50km radius
  const addresses: ZoneAddress[] = [];
  const seenPlaceIds = new Set<string>();

  let apiCallCount = 0;
  let nextPageToken: string | undefined;

  try {
    do {
      onProgress?.(addresses.length, 'Scanning zone for addresses...');

      // Call edge function to search for addresses
      const { data: result, error } = await supabase.functions.invoke('city-info', {
        body: {
          action: 'addresses',
          lat: bounds.centerLat,
          lng: bounds.centerLng,
          radius: radiusMeters,
          pageToken: nextPageToken,
        },
      });

      if (error) {
        console.error('Error fetching addresses:', error);
        throw new Error('Failed to fetch addresses in zone');
      }

      apiCallCount++;

      if (result?.places) {
        for (const place of result.places as Array<{
          placeId: string;
          address: string;
          lat: number;
          lng: number;
          types: string[];
        }>) {
          // Check if point is inside polygon
          if (!isPointInPolygon({ lat: place.lat, lng: place.lng }, polygon)) {
            continue;
          }

          // Check if it's an address-type place
          const isAddressType = place.types?.some((t: string) => ADDRESSES_TYPES.includes(t));
          if (!isAddressType && place.types?.length > 0) {
            continue;
          }

          // Deduplicate
          if (seenPlaceIds.has(place.placeId)) {
            continue;
          }
          seenPlaceIds.add(place.placeId);

          addresses.push({
            placeId: place.placeId,
            address: place.address,
            lat: place.lat,
            lng: place.lng,
            types: place.types || [],
          });

          // Check if we've exceeded limit
          if (addresses.length > SCOUT_HOUSE_LIMIT) {
            onProgress?.(addresses.length, `Found ${addresses.length} addresses - exceeds limit`);
            return {
              addresses: addresses.slice(0, SCOUT_HOUSE_LIMIT),
              totalCount: addresses.length,
              isComplete: false,
              exceedsLimit: true,
              limitReached: SCOUT_HOUSE_LIMIT,
            };
          }
        }
      }

      nextPageToken = result?.nextPageToken;

      // Add a small delay between paginated requests to respect rate limits
      if (nextPageToken && apiCallCount < MAX_API_CALLS) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    } while (nextPageToken && apiCallCount < MAX_API_CALLS);

    onProgress?.(addresses.length, 'Scan complete');

    return {
      addresses,
      totalCount: addresses.length,
      isComplete: !nextPageToken,
      exceedsLimit: false,
      limitReached: SCOUT_HOUSE_LIMIT,
    };
  } catch (error) {
    console.error('Error fetching addresses in zone:', error);
    throw error;
  }
}

/**
 * Quick check if a zone likely contains too many addresses
 * Uses a smaller radius sample to estimate density
 *
 * @param polygon - Array of lat/lng points defining the polygon
 * @returns Promise<boolean> - true if zone likely exceeds limit
 */
export async function quickCheckZoneDensity(
  polygon: Array<{ lat: number; lng: number }>
): Promise<{ likelyExceeds: boolean; sampleCount: number }> {
  if (polygon.length < 3) {
    return { likelyExceeds: false, sampleCount: 0 };
  }

  const bounds = getBoundingBox(polygon);
  // Use a smaller radius for quick sampling
  const sampleRadius = Math.min(calculateBoundingRadius(polygon) * 0.3, 10000);

  try {
    const { data: result, error } = await supabase.functions.invoke('city-info', {
      body: {
        action: 'addresses',
        lat: bounds.centerLat,
        lng: bounds.centerLng,
        radius: sampleRadius,
      },
    });

    if (error) {
      console.warn('Quick density check failed:', error);
      return { likelyExceeds: false, sampleCount: 0 };
    }

    const sampleCount = (result?.places || []).filter((place: { lat: number; lng: number }) =>
      isPointInPolygon({ lat: place.lat, lng: place.lng }, polygon)
    ).length;

    // If sample area already has >30 addresses, full zone likely exceeds 50
    const likelyExceeds = sampleCount > 30;

    return { likelyExceeds, sampleCount };
  } catch {
    return { likelyExceeds: false, sampleCount: 0 };
  }
}

/**
 * Count addresses without returning full details
 * More efficient for validation purposes
 *
 * @param polygon - Array of lat/lng points defining the polygon
 * @returns Promise<number> - Count of addresses (capped at SCOUT_HOUSE_LIMIT + 1)
 */
export async function countAddressesInZone(
  polygon: Array<{ lat: number; lng: number }>
): Promise<number> {
  const result = await fetchAddressesInZone(polygon);
  return result.totalCount;
}
