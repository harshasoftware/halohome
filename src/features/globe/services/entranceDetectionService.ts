/**
 * Entrance Detection Service
 *
 * Detects building entrances using Google Geocoding API's buildings[]/entrances[] arrays.
 * Provides entrance locations for Vastu analysis and scouting features.
 *
 * Primary: Google Geocoding API (when available)
 * Fallback: Centroid estimation with direction hints
 */

import { supabase } from '@/integrations/supabase/client';
import { roadAccessService, type RoadAccessPoint } from './roadAccessService';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface EntrancePoint {
  /** Latitude of entrance */
  lat: number;
  /** Longitude of entrance */
  lng: number;
  /** Whether this is the preferred/main entrance */
  isPreferred: boolean;
  /** Entrance type if available */
  type?: 'main' | 'side' | 'service' | 'parking' | 'unknown';
  /** Confidence score 0-1 */
  confidence: number;
  /** Cardinal direction the entrance faces (N, NE, E, SE, S, SW, W, NW) */
  facingDirection?: string;
  /** Source of this entrance data */
  source: 'google_api' | 'google_places' | 'centroid_estimate' | 'street_facing' | 'road_access';
}

export interface BuildingOutline {
  /** Polygon coordinates defining the building footprint */
  coordinates: Array<{ lat: number; lng: number }>;
  /** Area in square meters */
  areaSqM?: number;
}

export interface EntranceDetectionResult {
  /** All detected entrances for this location */
  entrances: EntrancePoint[];
  /** Building outline if available */
  buildingOutline?: BuildingOutline;
  /** The address used for detection */
  formattedAddress: string;
  /** Place ID from Google */
  placeId?: string;
  /** Detection method used */
  detectionMethod: 'geocoding_api' | 'places_api' | 'road_access' | 'estimated';
  /** Timestamp of detection */
  timestamp: number;
}

export interface EntranceDetectionOptions {
  /** Include building outline in results */
  includeOutline?: boolean;
  /** Minimum confidence threshold (0-1) */
  minConfidence?: number;
  /** Progress callback */
  onProgress?: (phase: string, percent: number) => void;
  /** Skip cache and force fresh fetch */
  skipCache?: boolean;
  /** Property boundary for road access fallback */
  boundary?: Array<{ lat: number; lng: number }>;
  /** Use road access as fallback when API data unavailable */
  useRoadAccessFallback?: boolean;
}

interface GeocodingResponse {
  status: string;
  results: Array<{
    formatted_address: string;
    place_id: string;
    geometry: {
      location: { lat: number; lng: number };
      viewport?: {
        northeast: { lat: number; lng: number };
        southwest: { lat: number; lng: number };
      };
    };
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
    // New building attributes (when available)
    buildings?: Array<{
      building_outline?: {
        coordinates: Array<{ lat: number; lng: number }>;
      };
      entrances?: Array<{
        location: { lat: number; lng: number };
        preferred?: boolean;
        type?: string;
      }>;
    }>;
  }>;
}

// ============================================================================
// Constants
// ============================================================================

const CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

const DEFAULT_OPTIONS: Required<Omit<EntranceDetectionOptions, 'onProgress' | 'boundary'>> = {
  includeOutline: true,
  minConfidence: 0.3,
  skipCache: false,
  useRoadAccessFallback: true,
};

const DEBUG_ENTRANCE_DETECTION =
  String(import.meta.env.VITE_DEBUG_ENTRANCE_DETECTION ?? '').toLowerCase() === 'true';

async function geocodeViaEdge(
  payload:
    | { action: 'reverse'; lat: number; lng: number }
    | { action: 'address'; address: string }
    | { action: 'placeId'; placeId: string }
): Promise<GeocodingResponse> {
  // Ensure we have a session before calling (anonymous auth provides JWT)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    // Wait a bit for anonymous sign-in to complete, then retry once
    await new Promise(resolve => setTimeout(resolve, 500));
    const { data: { session: retrySession } } = await supabase.auth.getSession();
    if (!retrySession) {
      throw new Error('No authentication session available');
    }
  }

  const { data, error } = await supabase.functions.invoke('entrance-detection', {
    body: payload,
  });

  if (error) {
    throw error;
  }

  return data as GeocodingResponse;
}

type BatchEdgeItem =
  | { id: string; kind: 'reverse'; lat: number; lng: number }
  | { id: string; kind: 'address'; address: string }
  | { id: string; kind: 'placeId'; placeId: string };

async function geocodeBatchViaEdge(
  items: BatchEdgeItem[],
  maxConcurrent: number
): Promise<Map<string, GeocodingResponse | null>> {
  // Ensure we have a session before calling (anonymous auth provides JWT)
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    // Wait a bit for anonymous sign-in to complete, then retry once
    await new Promise(resolve => setTimeout(resolve, 500));
    const { data: { session: retrySession } } = await supabase.auth.getSession();
    if (!retrySession) {
      throw new Error('No authentication session available');
    }
  }

  const { data, error } = await supabase.functions.invoke('entrance-detection', {
    body: {
      action: 'batch',
      requests: items,
      maxConcurrent,
      delayMs: 150,
    },
  });

  if (error) throw error;

  const map = new Map<string, GeocodingResponse | null>();
  const results = (data?.results ?? []) as Array<{ id: string; data: GeocodingResponse | null }>;
  for (const r of results) {
    if (!r?.id) continue;
    map.set(r.id, (r.data ?? null) as GeocodingResponse | null);
  }
  return map;
}

function isGoogleMapsGeocoderAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof google !== 'undefined' &&
    !!google.maps?.Geocoder
  );
}

function toLatLngLiteral(location: google.maps.LatLng | google.maps.LatLngLiteral): google.maps.LatLngLiteral {
  // google.maps.LatLng implements lat()/lng()
  if (typeof (location as google.maps.LatLng).lat === 'function') {
    const ll = location as google.maps.LatLng;
    return { lat: ll.lat(), lng: ll.lng() };
  }
  return location as google.maps.LatLngLiteral;
}

async function geocodeViaJs(
  request: google.maps.GeocoderRequest
): Promise<{ results: google.maps.GeocoderResult[]; status: google.maps.GeocoderStatus }> {
  if (!isGoogleMapsGeocoderAvailable()) {
    return { results: [], status: 'ERROR' as google.maps.GeocoderStatus };
  }

  const geocoder = new google.maps.Geocoder();
  return await new Promise((resolve) => {
    geocoder.geocode(request, (results, status) => {
      resolve({ results: results ?? [], status });
    });
  });
}

// ============================================================================
// Cache Management
// ============================================================================

interface CacheEntry {
  data: EntranceDetectionResult;
  timestamp: number;
}

const entranceCache = new Map<string, CacheEntry>();

function getCacheKey(identifier: string): string {
  return `entrance-${identifier.toLowerCase().replace(/\s+/g, '-')}`;
}

function getCached(key: string): EntranceDetectionResult | null {
  const entry = entranceCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION_MS) {
    return entry.data;
  }
  entranceCache.delete(key);
  return null;
}

function setCache(key: string, data: EntranceDetectionResult): void {
  entranceCache.set(key, { data, timestamp: Date.now() });
}

/**
 * Clear all cached entrance data
 */
export function clearEntranceCache(): void {
  entranceCache.clear();
}

/**
 * Get cache statistics
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: entranceCache.size,
    keys: Array.from(entranceCache.keys()),
  };
}

// ============================================================================
// Core Detection Functions
// ============================================================================

/**
 * Detect entrances for an address string
 */
async function detectByAddress(
  address: string,
  options: EntranceDetectionOptions = {}
): Promise<EntranceDetectionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const cacheKey = getCacheKey(address);

  // Check cache first
  if (!opts.skipCache) {
    const cached = getCached(cacheKey);
    if (cached) {
      opts.onProgress?.('Using cached data', 100);
      return cached;
    }
  }

  opts.onProgress?.('Geocoding address', 10);

  try {
    opts.onProgress?.('Processing results', 50);

    // Prefer edge function because only the REST Geocoding API can return buildings[]/entrances[].
    try {
      const api = await geocodeViaEdge({ action: 'address', address });
      if (api.status === 'OK' && api.results.length > 0) {
        const detectionResult = processGeocodingResult(api.results[0], opts);
        opts.onProgress?.('Complete', 100);
        setCache(cacheKey, detectionResult);
        return detectionResult;
      }
      // Fall through to JS geocoder as backup (no buildings[]/entrances[]).
    } catch (e) {
      // Fall through to JS geocoder backup.
    }

    const { results, status } = await geocodeViaJs({ address });
    if (status !== 'OK' || results.length === 0) {
      throw new Error(`Geocoding failed: ${status}`);
    }
    const detectionResult = processGeocoderResult(results[0], opts);

    opts.onProgress?.('Complete', 100);

    // Cache the result
    setCache(cacheKey, detectionResult);

    return detectionResult;
  } catch (error) {
    console.error('Entrance detection by address failed:', error);
    throw error;
  }
}

/**
 * Detect entrances for a coordinate point
 */
async function detectByCoordinates(
  lat: number,
  lng: number,
  options: EntranceDetectionOptions = {}
): Promise<EntranceDetectionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const cacheKey = getCacheKey(`${lat.toFixed(6)},${lng.toFixed(6)}`);

  // Check cache first
  if (!opts.skipCache) {
    const cached = getCached(cacheKey);
    if (cached) {
      opts.onProgress?.('Using cached data', 100);
      return cached;
    }
  }

  opts.onProgress?.('Reverse geocoding', 10);

  try {
    opts.onProgress?.('Processing results', 50);

    // Prefer edge function because only the REST Geocoding API can return buildings[]/entrances[].
    try {
      const api = await geocodeViaEdge({ action: 'reverse', lat, lng });
      if (api.status === 'OK' && api.results.length > 0) {
        const detectionResult = processGeocodingResult(api.results[0], opts);
        // Cache the result
        setCache(cacheKey, detectionResult);
        opts.onProgress?.('Complete', 100);
        return detectionResult;
      }
      // Fall through to JS geocoder as backup (no buildings[]/entrances[]).
    } catch (e) {
      // Fall through to JS geocoder backup.
    }

    const { results, status } = await geocodeViaJs({ location: { lat, lng } });
    if (status !== 'OK' || results.length === 0) {
      // Try road access fallback first
      if (opts.useRoadAccessFallback) {
        opts.onProgress?.('Trying road access fallback', 60);
        const roadResult = await tryRoadAccessFallback(lat, lng, opts.boundary);
        if (roadResult) {
          setCache(cacheKey, roadResult);
          opts.onProgress?.('Complete', 100);
          return roadResult;
        }
      }
      // Final fallback to centroid estimate
      opts.onProgress?.('Complete', 100);
      return createCentroidEstimate(lat, lng);
    }

    const detectionResult = processGeocoderResult(results[0], opts);

    // If detection result has low confidence, try road access
    const primaryEntrance = detectionResult.entrances[0];
    if (
      opts.useRoadAccessFallback &&
      primaryEntrance &&
      primaryEntrance.confidence < 0.5 &&
      primaryEntrance.source !== 'google_api'
    ) {
      opts.onProgress?.('Enhancing with road access', 70);
      const roadResult = await tryRoadAccessFallback(
        lat,
        lng,
        opts.boundary,
        detectionResult.formattedAddress
      );
      if (roadResult && roadResult.entrances[0]?.confidence > primaryEntrance.confidence) {
        setCache(cacheKey, roadResult);
        opts.onProgress?.('Complete', 100);
        return roadResult;
      }
    }

    opts.onProgress?.('Complete', 100);

    // Cache the result
    setCache(cacheKey, detectionResult);

    return detectionResult;
  } catch (error) {
    console.error('Entrance detection by coordinates failed:', error);
    // Try road access fallback before centroid estimate
    if (options.useRoadAccessFallback !== false) {
      try {
        const roadResult = await tryRoadAccessFallback(lat, lng, options.boundary);
        if (roadResult) {
          return roadResult;
        }
      } catch {
        // Ignore and fall through to centroid
      }
    }
    return createCentroidEstimate(lat, lng);
  }
}

/**
 * Detect entrances for a Place ID
 */
async function detectByPlaceId(
  placeId: string,
  options: EntranceDetectionOptions = {}
): Promise<EntranceDetectionResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const cacheKey = getCacheKey(placeId);

  // Check cache first
  if (!opts.skipCache) {
    const cached = getCached(cacheKey);
    if (cached) {
      opts.onProgress?.('Using cached data', 100);
      return cached;
    }
  }

  opts.onProgress?.('Fetching place details', 10);

  try {
    opts.onProgress?.('Processing results', 50);

    // Prefer edge function because only the REST Geocoding API can return buildings[]/entrances[].
    try {
      const api = await geocodeViaEdge({ action: 'placeId', placeId });
      if (api.status === 'OK' && api.results.length > 0) {
        const detectionResult = processGeocodingResult(api.results[0], opts);
        opts.onProgress?.('Complete', 100);
        setCache(cacheKey, detectionResult);
        return detectionResult;
      }
      // Fall through to JS geocoder as backup.
    } catch (e) {
      // Fall through to JS geocoder backup.
    }

    const { results, status } = await geocodeViaJs({ placeId });
    if (status !== 'OK' || results.length === 0) {
      throw new Error(`Place lookup failed: ${status}`);
    }
    const detectionResult = processGeocoderResult(results[0], opts);

    opts.onProgress?.('Complete', 100);

    // Cache the result
    setCache(cacheKey, detectionResult);

    return detectionResult;
  } catch (error) {
    console.error('Entrance detection by place ID failed:', error);
    throw error;
  }
}

// ============================================================================
// Processing Functions
// ============================================================================

function processGeocodingResult(
  result: GeocodingResponse['results'][0],
  options: Required<Omit<EntranceDetectionOptions, 'onProgress'>>
): EntranceDetectionResult {
  const entrances: EntrancePoint[] = [];
  let buildingOutline: BuildingOutline | undefined;

  // Check for native building/entrance data from Google
  if (result.buildings && result.buildings.length > 0) {
    const building = result.buildings[0];

    // Extract entrances from API response
    if (building.entrances) {
      for (const entrance of building.entrances) {
        entrances.push({
          lat: entrance.location.lat,
          lng: entrance.location.lng,
          isPreferred: entrance.preferred ?? false,
          type: mapEntranceType(entrance.type),
          confidence: 0.95, // High confidence for API data
          facingDirection: calculateFacingDirection(
            entrance.location,
            result.geometry.location
          ),
          source: 'google_api',
        });
      }
    }

    // Extract building outline if requested
    if (options.includeOutline && building.building_outline) {
      buildingOutline = {
        coordinates: building.building_outline.coordinates,
        areaSqM: calculatePolygonArea(building.building_outline.coordinates),
      };
    }
  }

  // If no entrances from API, estimate from road-facing side
  if (entrances.length === 0) {
    const estimated = estimateEntranceFromStreet(
      result.geometry.location,
      result.address_components
    );
    entrances.push(estimated);
  }

  // Filter by confidence threshold
  const filteredEntrances = entrances.filter(
    (e) => e.confidence >= options.minConfidence
  );

  // Sort: preferred first, then by confidence
  filteredEntrances.sort((a, b) => {
    if (a.isPreferred !== b.isPreferred) {
      return a.isPreferred ? -1 : 1;
    }
    return b.confidence - a.confidence;
  });

  return {
    entrances: filteredEntrances,
    buildingOutline,
    formattedAddress: result.formatted_address,
    placeId: result.place_id,
    detectionMethod:
      entrances[0]?.source === 'google_api' ? 'geocoding_api' : 'estimated',
    timestamp: Date.now(),
  };
}

function processGeocoderResult(
  result: google.maps.GeocoderResult,
  options: Required<Omit<EntranceDetectionOptions, 'onProgress'>>
): EntranceDetectionResult {
  const entrances: EntrancePoint[] = [];
  let buildingOutline: BuildingOutline | undefined;

  // The Maps JS Geocoder does NOT expose buildings[]/entrances[]; treat as estimate.
  const center = toLatLngLiteral(result.geometry.location);

  // If no entrances from API, estimate from road-facing side
  const estimated = estimateEntranceFromStreet(
    center,
    (result.address_components ?? []) as Array<{ types: string[]; long_name: string }>
  );
  entrances.push(estimated);

  // (Optional) no building outline available from JS geocoder; keep undefined.
  if (!options.includeOutline) {
    buildingOutline = undefined;
  }

  // Filter by confidence threshold
  const filteredEntrances = entrances.filter((e) => e.confidence >= options.minConfidence);

  // Sort: preferred first, then by confidence
  filteredEntrances.sort((a, b) => {
    if (a.isPreferred !== b.isPreferred) return a.isPreferred ? -1 : 1;
    return b.confidence - a.confidence;
  });

  return {
    entrances: filteredEntrances,
    buildingOutline,
    formattedAddress: result.formatted_address ?? `${center.lat.toFixed(6)}, ${center.lng.toFixed(6)}`,
    placeId: result.place_id,
    detectionMethod: 'estimated',
    timestamp: Date.now(),
  };
}

function mapEntranceType(
  apiType?: string
): 'main' | 'side' | 'service' | 'parking' | 'unknown' {
  if (!apiType) return 'unknown';
  const lower = apiType.toLowerCase();
  if (lower.includes('main') || lower.includes('primary')) return 'main';
  if (lower.includes('side') || lower.includes('secondary')) return 'side';
  if (lower.includes('service') || lower.includes('delivery')) return 'service';
  if (lower.includes('parking') || lower.includes('garage')) return 'parking';
  return 'unknown';
}

function calculateFacingDirection(
  entranceLocation: { lat: number; lng: number },
  buildingCenter: { lat: number; lng: number }
): string {
  const dLat = entranceLocation.lat - buildingCenter.lat;
  const dLng = entranceLocation.lng - buildingCenter.lng;
  const angle = Math.atan2(dLng, dLat) * (180 / Math.PI);

  // Convert angle to cardinal direction
  const normalized = ((angle % 360) + 360) % 360;
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}

function estimateEntranceFromStreet(
  location: { lat: number; lng: number },
  addressComponents: Array<{ types: string[]; long_name: string }>
): EntrancePoint {
  // Look for street name to estimate road-facing side
  const streetComponent = addressComponents.find(
    (c) => c.types.includes('route') || c.types.includes('street_address')
  );

  // Default offset toward assumed road (small offset south-facing for northern hemisphere)
  // This is a rough estimate - actual entrance detection would need Street View analysis
  const offset = 0.00005; // ~5 meters

  return {
    lat: location.lat - offset,
    lng: location.lng,
    isPreferred: true,
    type: 'main',
    confidence: 0.4, // Lower confidence for estimates
    facingDirection: 'S', // Default assumption
    source: 'street_facing',
  };
}

function createCentroidEstimate(lat: number, lng: number): EntranceDetectionResult {
  return {
    entrances: [
      {
        lat,
        lng,
        isPreferred: true,
        type: 'unknown',
        confidence: 0.2,
        source: 'centroid_estimate',
      },
    ],
    formattedAddress: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    detectionMethod: 'estimated',
    timestamp: Date.now(),
  };
}

/**
 * Create entrance result from road access data.
 * Used as fallback when Google API doesn't provide entrance data.
 */
function createRoadAccessEntrance(
  roadAccess: RoadAccessPoint,
  formattedAddress: string
): EntranceDetectionResult {
  return {
    entrances: [
      {
        lat: roadAccess.roadPoint.lat,
        lng: roadAccess.roadPoint.lng,
        isPreferred: true,
        type: 'main',
        confidence: roadAccess.confidence,
        facingDirection: roadAccess.direction,
        source: 'road_access',
      },
    ],
    formattedAddress,
    detectionMethod: 'road_access',
    timestamp: Date.now(),
  };
}

/**
 * Try to detect entrance using road access as fallback.
 * Only called when Google API data is unavailable.
 */
async function tryRoadAccessFallback(
  lat: number,
  lng: number,
  boundary?: Array<{ lat: number; lng: number }>,
  formattedAddress?: string
): Promise<EntranceDetectionResult | null> {
  try {
    const roadAccess = await roadAccessService.findRoadAccess(
      { lat, lng },
      {
        boundary,
        allowEstimation: true,
        searchRadius: 100,
      }
    );

    // Only use if confidence is reasonable (better than pure centroid estimate)
    if (roadAccess.confidence >= 0.3) {
      return createRoadAccessEntrance(
        roadAccess,
        formattedAddress || `${lat.toFixed(6)}, ${lng.toFixed(6)}`
      );
    }

    return null;
  } catch (error) {
    console.warn('Road access fallback failed:', error);
    return null;
  }
}

function calculatePolygonArea(
  coordinates: Array<{ lat: number; lng: number }>
): number {
  if (coordinates.length < 3) return 0;

  // Shoelace formula with spherical approximation
  const EARTH_RADIUS = 6371000; // meters
  let area = 0;
  const n = coordinates.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const lat1 = coordinates[i].lat * (Math.PI / 180);
    const lat2 = coordinates[j].lat * (Math.PI / 180);
    const lng1 = coordinates[i].lng * (Math.PI / 180);
    const lng2 = coordinates[j].lng * (Math.PI / 180);

    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = Math.abs((area * EARTH_RADIUS * EARTH_RADIUS) / 2);
  return area;
}

// ============================================================================
// Batch Detection
// ============================================================================

/**
 * Detect entrances for multiple locations
 */
async function detectBatch(
  locations: Array<{ address?: string; lat?: number; lng?: number; placeId?: string }>,
  options: EntranceDetectionOptions & { maxConcurrent?: number } = {}
): Promise<Map<string, EntranceDetectionResult>> {
  const { maxConcurrent = 3, ...detectionOptions } = options;
  const results = new Map<string, EntranceDetectionResult>();
  const total = locations.length;
  let completed = 0;

  // Prefer batching through edge function (keeps buildings[]/entrances[] available and reduces overhead).
  // We'll still fill in any failures via JS geocoder / road access fallback so the UI always has something.
  try {
    const edgeItems: BatchEdgeItem[] = locations.map((loc) => {
      if (loc.placeId) return { id: loc.placeId, kind: 'placeId', placeId: loc.placeId };
      if (loc.address) return { id: loc.address, kind: 'address', address: loc.address };
      if (loc.lat !== undefined && loc.lng !== undefined) {
        return { id: `${loc.lat},${loc.lng}`, kind: 'reverse', lat: loc.lat, lng: loc.lng };
      }
      return { id: 'invalid', kind: 'address', address: '' };
    }).filter((x) => x.id !== 'invalid' && (x.kind !== 'address' || x.address));

    if (edgeItems.length > 0) {
      const edgeMap = await geocodeBatchViaEdge(edgeItems, maxConcurrent);

      let okWithBuildings = 0;
      let okButNoBuildings = 0;
      let edgeNonOk = 0;
      let edgeMissing = 0;
      let jsFallback = 0;
      let roadFallback = 0;
      let centroidFallback = 0;

      for (const loc of locations) {
        let key: string;
        let detectionResult: EntranceDetectionResult | null = null;

        if (loc.placeId) {
          key = loc.placeId;
          const api = edgeMap.get(key);
          if (!api) edgeMissing++;
          if (api?.status === 'OK' && api.results.length > 0) {
            const r0 = api.results[0];
            if (r0.buildings?.length && r0.buildings[0]?.entrances?.length) okWithBuildings++;
            else okButNoBuildings++;
            detectionResult = processGeocodingResult(api.results[0], { ...DEFAULT_OPTIONS, ...detectionOptions });
          } else if (api) {
            edgeNonOk++;
          }
        } else if (loc.address) {
          key = loc.address;
          const api = edgeMap.get(key);
          if (!api) edgeMissing++;
          if (api?.status === 'OK' && api.results.length > 0) {
            const r0 = api.results[0];
            if (r0.buildings?.length && r0.buildings[0]?.entrances?.length) okWithBuildings++;
            else okButNoBuildings++;
            detectionResult = processGeocodingResult(api.results[0], { ...DEFAULT_OPTIONS, ...detectionOptions });
          } else if (api) {
            edgeNonOk++;
          }
        } else if (loc.lat !== undefined && loc.lng !== undefined) {
          key = `${loc.lat},${loc.lng}`;
          const api = edgeMap.get(key);
          if (!api) edgeMissing++;
          if (api?.status === 'OK' && api.results.length > 0) {
            const r0 = api.results[0];
            if (r0.buildings?.length && r0.buildings[0]?.entrances?.length) okWithBuildings++;
            else okButNoBuildings++;
            detectionResult = processGeocodingResult(api.results[0], { ...DEFAULT_OPTIONS, ...detectionOptions });
          } else {
            if (api) edgeNonOk++;
            // JS fallback path (no buildings[]/entrances[]); will still provide an entrance estimate.
            const js = await geocodeViaJs({ location: { lat: loc.lat, lng: loc.lng } });
            if (js.status === 'OK' && js.results.length > 0) {
              jsFallback++;
              detectionResult = processGeocoderResult(js.results[0], { ...DEFAULT_OPTIONS, ...detectionOptions });
            } else if ((detectionOptions as EntranceDetectionOptions).useRoadAccessFallback !== false) {
              detectionResult = await tryRoadAccessFallback(
                loc.lat,
                loc.lng,
                (detectionOptions as EntranceDetectionOptions).boundary
              );
              if (detectionResult) roadFallback++;
            }
            if (!detectionResult) {
              centroidFallback++;
              detectionResult = createCentroidEstimate(loc.lat, loc.lng);
            }
          }
        } else {
          throw new Error('Location must have address, coordinates, or placeId');
        }

        if (detectionResult) {
          results.set(key, detectionResult);
        }

        completed++;
        options.onProgress?.('Processing locations', Math.round((completed / total) * 100));
      }

      if (DEBUG_ENTRANCE_DETECTION) {
        console.log('[EntranceDetection][Batch]', {
          total: locations.length,
          edge: {
            okWithBuildings,
            okButNoBuildings,
            nonOk: edgeNonOk,
            missing: edgeMissing,
          },
          fallback: {
            jsGeocoder: jsFallback,
            roadAccess: roadFallback,
            centroid: centroidFallback,
          },
        });
      }

      return results;
    }
  } catch (e) {
    // If batch fails for any reason, fall back to the existing per-item code path below.
  }

  // Process in batches to respect rate limits
  for (let i = 0; i < locations.length; i += maxConcurrent) {
    const batch = locations.slice(i, i + maxConcurrent);

    const batchResults = await Promise.allSettled(
      batch.map(async (loc) => {
        let result: EntranceDetectionResult;
        let key: string;

        if (loc.placeId) {
          key = loc.placeId;
          result = await detectByPlaceId(loc.placeId, detectionOptions);
        } else if (loc.address) {
          key = loc.address;
          result = await detectByAddress(loc.address, detectionOptions);
        } else if (loc.lat !== undefined && loc.lng !== undefined) {
          key = `${loc.lat},${loc.lng}`;
          result = await detectByCoordinates(loc.lat, loc.lng, detectionOptions);
        } else {
          throw new Error('Location must have address, coordinates, or placeId');
        }

        return { key, result };
      })
    );

    for (const settled of batchResults) {
      if (settled.status === 'fulfilled') {
        results.set(settled.value.key, settled.value.result);
      }
      completed++;
      options.onProgress?.('Processing locations', Math.round((completed / total) * 100));
    }

    // Small delay between batches to respect rate limits
    if (i + maxConcurrent < locations.length) {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  return results;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the primary (preferred) entrance from a detection result
 */
function getPrimaryEntrance(result: EntranceDetectionResult): EntrancePoint | null {
  return result.entrances.find((e) => e.isPreferred) || result.entrances[0] || null;
}

/**
 * Calculate distance from entrance to a point
 */
function getEntranceDistance(
  entrance: EntrancePoint,
  targetLat: number,
  targetLng: number
): number {
  // Haversine formula
  const R = 6371000; // Earth's radius in meters
  const dLat = ((targetLat - entrance.lat) * Math.PI) / 180;
  const dLng = ((targetLng - entrance.lng) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((entrance.lat * Math.PI) / 180) *
      Math.cos((targetLat * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in meters
}

/**
 * Check if entrance data is from a reliable source
 */
function isHighConfidenceResult(result: EntranceDetectionResult): boolean {
  return (
    result.detectionMethod === 'geocoding_api' &&
    result.entrances.some((e) => e.confidence >= 0.8)
  );
}

// ============================================================================
// Service Export
// ============================================================================

export const entranceDetectionService = {
  // Core detection
  detectByAddress,
  detectByCoordinates,
  detectByPlaceId,
  detectBatch,

  // Utilities
  getPrimaryEntrance,
  getEntranceDistance,
  isHighConfidenceResult,

  // Cache management
  clearCache: clearEntranceCache,
  getCacheStats,
};

export default entranceDetectionService;
