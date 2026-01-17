/**
 * Road Access Service
 *
 * Determines building entrance direction by finding the path from
 * property centroid to the nearest road. This is a reliable approximation
 * because most building entrances face their access road.
 *
 * Methods:
 * 1. Google Roads API (Nearest Roads) - Primary
 * 2. Google Directions API - Fallback
 * 3. Geometric estimation from boundary - Last resort
 */

import { monitoredFetch } from '@/lib/monitoring';
import {
  type LatLng,
  haversineDistance,
} from '@/lib/building-footprints/coordinate-utils';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface RoadAccessPoint {
  /** Location on the road */
  roadPoint: LatLng;
  /** Original property centroid */
  centroid: LatLng;
  /** Distance from centroid to road in meters */
  distanceMeters: number;
  /** Cardinal direction from centroid to road */
  direction: CardinalDirection;
  /** Angle in degrees (0 = North, 90 = East) */
  bearingDegrees: number;
  /** Confidence in this result (0-1) */
  confidence: number;
  /** Method used to determine access point */
  method: 'roads_api' | 'directions_api' | 'boundary_estimate' | 'geocode_route';
  /** Road name if available */
  roadName?: string;
  /** Place ID of the road if available */
  placeId?: string;
}

export interface RoadAccessOptions {
  /** Search radius in meters (default: 100) */
  searchRadius?: number;
  /** Fallback to estimation if API fails */
  allowEstimation?: boolean;
  /** Property boundary for geometric estimation */
  boundary?: LatLng[];
  /** Progress callback */
  onProgress?: (phase: string, percent: number) => void;
}

export type CardinalDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

// ============================================================================
// Constants
// ============================================================================

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const DEFAULT_OPTIONS: Required<Omit<RoadAccessOptions, 'onProgress' | 'boundary'>> = {
  searchRadius: 100,
  allowEstimation: true,
};

// Cache for road access results
const roadAccessCache = new Map<string, { data: RoadAccessPoint; timestamp: number }>();
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// ============================================================================
// Core Functions
// ============================================================================

/**
 * Find the road access point for a property centroid.
 * Returns the direction from centroid to nearest road.
 */
export async function findRoadAccess(
  centroid: LatLng,
  options: RoadAccessOptions = {}
): Promise<RoadAccessPoint> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const cacheKey = `${centroid.lat.toFixed(6)},${centroid.lng.toFixed(6)}`;

  // Check cache
  const cached = roadAccessCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    opts.onProgress?.('Using cached data', 100);
    return cached.data;
  }

  opts.onProgress?.('Finding nearest road', 10);

  // Try Roads API first (most accurate)
  try {
    const roadsResult = await findNearestRoadViaRoadsAPI(centroid, opts.searchRadius);
    if (roadsResult) {
      opts.onProgress?.('Complete', 100);
      roadAccessCache.set(cacheKey, { data: roadsResult, timestamp: Date.now() });
      return roadsResult;
    }
  } catch (error) {
    console.warn('Roads API failed, trying fallback:', error);
  }

  opts.onProgress?.('Trying directions fallback', 40);

  // Try Directions API as fallback
  try {
    const directionsResult = await findRoadViaDirections(centroid, opts.searchRadius);
    if (directionsResult) {
      opts.onProgress?.('Complete', 100);
      roadAccessCache.set(cacheKey, { data: directionsResult, timestamp: Date.now() });
      return directionsResult;
    }
  } catch (error) {
    console.warn('Directions API failed, trying geocode route:', error);
  }

  opts.onProgress?.('Trying geocode route', 60);

  // Try reverse geocode + route
  try {
    const geocodeResult = await findRoadViaGeocodeRoute(centroid);
    if (geocodeResult) {
      opts.onProgress?.('Complete', 100);
      roadAccessCache.set(cacheKey, { data: geocodeResult, timestamp: Date.now() });
      return geocodeResult;
    }
  } catch (error) {
    console.warn('Geocode route failed:', error);
  }

  opts.onProgress?.('Using boundary estimation', 80);

  // Fall back to boundary estimation if allowed
  if (opts.allowEstimation && opts.boundary && opts.boundary.length >= 3) {
    const estimated = estimateRoadAccessFromBoundary(centroid, opts.boundary);
    opts.onProgress?.('Complete', 100);
    roadAccessCache.set(cacheKey, { data: estimated, timestamp: Date.now() });
    return estimated;
  }

  // Last resort: return south-facing default (common for many regions)
  opts.onProgress?.('Complete', 100);
  const defaultResult: RoadAccessPoint = {
    roadPoint: { lat: centroid.lat - 0.0001, lng: centroid.lng },
    centroid,
    distanceMeters: 10,
    direction: 'S',
    bearingDegrees: 180,
    confidence: 0.1,
    method: 'boundary_estimate',
  };

  roadAccessCache.set(cacheKey, { data: defaultResult, timestamp: Date.now() });
  return defaultResult;
}

/**
 * Find road access for multiple properties (batch processing).
 */
export async function findRoadAccessBatch(
  properties: Array<{ centroid: LatLng; boundary?: LatLng[]; id?: string }>,
  options: RoadAccessOptions & { maxConcurrent?: number } = {}
): Promise<Map<string, RoadAccessPoint>> {
  const { maxConcurrent = 5, ...accessOptions } = options;
  const results = new Map<string, RoadAccessPoint>();
  const total = properties.length;

  // Process in batches to respect rate limits
  for (let i = 0; i < properties.length; i += maxConcurrent) {
    const batch = properties.slice(i, i + maxConcurrent);

    const batchResults = await Promise.allSettled(
      batch.map(async (prop) => {
        const key = prop.id || `${prop.centroid.lat},${prop.centroid.lng}`;
        const result = await findRoadAccess(prop.centroid, {
          ...accessOptions,
          boundary: prop.boundary,
        });
        return { key, result };
      })
    );

    for (const settled of batchResults) {
      if (settled.status === 'fulfilled') {
        results.set(settled.value.key, settled.value.result);
      }
    }

    options.onProgress?.(
      `Processing ${Math.min(i + maxConcurrent, total)}/${total}`,
      Math.round(((i + maxConcurrent) / total) * 100)
    );

    // Rate limiting delay between batches
    if (i + maxConcurrent < properties.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

// ============================================================================
// API Methods
// ============================================================================

/**
 * Find nearest road using Google Roads API (Nearest Roads endpoint).
 */
async function findNearestRoadViaRoadsAPI(
  centroid: LatLng,
  searchRadius: number
): Promise<RoadAccessPoint | null> {
  // Generate sample points around centroid to find roads
  const samplePoints = generateSamplePoints(centroid, searchRadius, 8);
  const pointsParam = samplePoints.map((p) => `${p.lat},${p.lng}`).join('|');

  const result = await monitoredFetch('roads-api-nearest', async () => {
    const url = new URL('https://roads.googleapis.com/v1/nearestRoads');
    url.searchParams.set('points', pointsParam);
    url.searchParams.set('key', API_KEY);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Roads API request failed: ${response.status}`);
    }
    return response.json();
  });

  if (!result.snappedPoints || result.snappedPoints.length === 0) {
    return null;
  }

  // Find the closest snapped point to centroid
  let closestPoint = result.snappedPoints[0];
  let closestDistance = Infinity;

  for (const snapped of result.snappedPoints) {
    const point = {
      lat: snapped.location.latitude,
      lng: snapped.location.longitude,
    };
    const distance = haversineDistance(centroid, point);
    if (distance < closestDistance) {
      closestDistance = distance;
      closestPoint = snapped;
    }
  }

  const roadPoint = {
    lat: closestPoint.location.latitude,
    lng: closestPoint.location.longitude,
  };

  const bearing = calculateBearing(centroid, roadPoint);
  const direction = bearingToCardinal(bearing);

  return {
    roadPoint,
    centroid,
    distanceMeters: closestDistance,
    direction,
    bearingDegrees: bearing,
    confidence: 0.95,
    method: 'roads_api',
    placeId: closestPoint.placeId,
  };
}

/**
 * Find road using Google Directions API.
 * Routes from centroid to a point slightly away, the first step shows road access.
 */
async function findRoadViaDirections(
  centroid: LatLng,
  searchRadius: number
): Promise<RoadAccessPoint | null> {
  // Create a destination point slightly away from centroid
  const destination = {
    lat: centroid.lat + 0.001, // ~100m north
    lng: centroid.lng,
  };

  const result = await monitoredFetch('directions-api-road', async () => {
    const url = new URL('https://maps.googleapis.com/maps/api/directions/json');
    url.searchParams.set('origin', `${centroid.lat},${centroid.lng}`);
    url.searchParams.set('destination', `${destination.lat},${destination.lng}`);
    url.searchParams.set('mode', 'driving');
    url.searchParams.set('key', API_KEY);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Directions API request failed: ${response.status}`);
    }
    return response.json();
  });

  if (result.status !== 'OK' || !result.routes?.[0]?.legs?.[0]?.steps?.[0]) {
    return null;
  }

  const firstStep = result.routes[0].legs[0].steps[0];
  const startLocation = firstStep.start_location;

  // The start location of first step is where you access the road
  const roadPoint = {
    lat: startLocation.lat,
    lng: startLocation.lng,
  };

  const distance = haversineDistance(centroid, roadPoint);
  const bearing = calculateBearing(centroid, roadPoint);
  const direction = bearingToCardinal(bearing);

  return {
    roadPoint,
    centroid,
    distanceMeters: distance,
    direction,
    bearingDegrees: bearing,
    confidence: 0.85,
    method: 'directions_api',
  };
}

/**
 * Find road by reverse geocoding then routing to the street address.
 */
async function findRoadViaGeocodeRoute(
  centroid: LatLng
): Promise<RoadAccessPoint | null> {
  // First, reverse geocode to get the street address
  const geocodeResult = await monitoredFetch('geocode-reverse-road', async () => {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${centroid.lat},${centroid.lng}`);
    url.searchParams.set('result_type', 'street_address|route');
    url.searchParams.set('key', API_KEY);

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Geocode request failed: ${response.status}`);
    }
    return response.json();
  });

  if (geocodeResult.status !== 'OK' || !geocodeResult.results?.[0]) {
    return null;
  }

  const result = geocodeResult.results[0];
  const roadLocation = result.geometry.location;

  // The geocoded location for a street address is typically on the road
  const roadPoint = {
    lat: roadLocation.lat,
    lng: roadLocation.lng,
  };

  const distance = haversineDistance(centroid, roadPoint);

  // If the geocoded point is very close to centroid, it's likely accurate
  if (distance > 200) {
    // Too far, might not be the right access point
    return null;
  }

  const bearing = calculateBearing(centroid, roadPoint);
  const direction = bearingToCardinal(bearing);

  // Extract road name from address components
  const routeComponent = result.address_components?.find(
    (c: { types: string[] }) => c.types.includes('route')
  );

  return {
    roadPoint,
    centroid,
    distanceMeters: distance,
    direction,
    bearingDegrees: bearing,
    confidence: 0.75,
    method: 'geocode_route',
    roadName: routeComponent?.long_name,
    placeId: result.place_id,
  };
}

// ============================================================================
// Geometric Estimation
// ============================================================================

/**
 * Estimate road access direction from property boundary.
 * Assumes the longest edge facing outward is likely the road-facing side.
 */
function estimateRoadAccessFromBoundary(
  centroid: LatLng,
  boundary: LatLng[]
): RoadAccessPoint {
  // Find the longest edge (often faces the road)
  let longestEdgeIndex = 0;
  let longestEdgeLength = 0;

  for (let i = 0; i < boundary.length; i++) {
    const p1 = boundary[i];
    const p2 = boundary[(i + 1) % boundary.length];
    const length = haversineDistance(p1, p2);

    if (length > longestEdgeLength) {
      longestEdgeLength = length;
      longestEdgeIndex = i;
    }
  }

  // Midpoint of longest edge
  const p1 = boundary[longestEdgeIndex];
  const p2 = boundary[(longestEdgeIndex + 1) % boundary.length];
  const edgeMidpoint = {
    lat: (p1.lat + p2.lat) / 2,
    lng: (p1.lng + p2.lng) / 2,
  };

  // Direction from centroid to edge midpoint = likely entrance direction
  const bearing = calculateBearing(centroid, edgeMidpoint);
  const direction = bearingToCardinal(bearing);
  const distance = haversineDistance(centroid, edgeMidpoint);

  return {
    roadPoint: edgeMidpoint,
    centroid,
    distanceMeters: distance,
    direction,
    bearingDegrees: bearing,
    confidence: 0.4,
    method: 'boundary_estimate',
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Generate sample points in a circle around a center point.
 */
function generateSamplePoints(
  center: LatLng,
  radiusMeters: number,
  count: number
): LatLng[] {
  const points: LatLng[] = [center]; // Include center

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * 2 * Math.PI;
    const latOffset = (radiusMeters / 111320) * Math.cos(angle);
    const lngOffset =
      (radiusMeters / (111320 * Math.cos((center.lat * Math.PI) / 180))) *
      Math.sin(angle);

    points.push({
      lat: center.lat + latOffset,
      lng: center.lng + lngOffset,
    });
  }

  return points;
}

/**
 * Calculate bearing from point A to point B.
 * Returns degrees where 0 = North, 90 = East.
 */
function calculateBearing(from: LatLng, to: LatLng): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

/**
 * Convert bearing in degrees to cardinal direction.
 */
function bearingToCardinal(bearing: number): CardinalDirection {
  const normalized = ((bearing % 360) + 360) % 360;
  const directions: CardinalDirection[] = [
    'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW',
  ];
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}

/**
 * Get the opposite cardinal direction.
 */
export function getOppositeDirection(direction: CardinalDirection): CardinalDirection {
  const opposites: Record<CardinalDirection, CardinalDirection> = {
    'N': 'S',
    'NE': 'SW',
    'E': 'W',
    'SE': 'NW',
    'S': 'N',
    'SW': 'NE',
    'W': 'E',
    'NW': 'SE',
  };
  return opposites[direction];
}

/**
 * Clear road access cache.
 */
export function clearRoadAccessCache(): void {
  roadAccessCache.clear();
}

/**
 * Get cache statistics.
 */
export function getRoadAccessCacheStats(): { size: number; keys: string[] } {
  return {
    size: roadAccessCache.size,
    keys: Array.from(roadAccessCache.keys()),
  };
}

// ============================================================================
// Service Export
// ============================================================================

export const roadAccessService = {
  findRoadAccess,
  findRoadAccessBatch,
  estimateRoadAccessFromBoundary,
  getOppositeDirection,
  clearCache: clearRoadAccessCache,
  getCacheStats: getRoadAccessCacheStats,
};

export default roadAccessService;
