/**
 * Advanced Scout Worker
 *
 * Two-phase grid-based location scoring:
 * 1. Coarse grid (2° step) - ~8,000 land points globally
 * 2. Fine grid around hot zones (0.5° step) - refined scoring
 *
 * Uses WASM parallel scoring for performance.
 * City geocoding happens in-worker using dynamically loaded cities data
 * (fetched once during init - not bundled to reduce worker size).
 */

import { loadCities, expandCity } from '@/data/geonames-cities';
import { SpatialIndex, type SpatialCity } from '../utils/spatial-index';

// Types
interface GridPoint {
  lat: number;
  lng: number;
}

interface LineData {
  planet: string;
  angle: string;
  rating: number;
  points: [number, number][];
}

interface CityData {
  name: string;
  country: string;
  lat: number;
  lng: number;
  population: number;
}

interface ScoredZone {
  lat: number;
  lng: number;
  score: number;
  nearestCity: CityData | null;
  distanceToCity: number;
  citiesNearby: CityData[];
}

interface WorkerConfig {
  coarseStep: number;
  fineStep: number;
  refineRadiusDeg: number;
  topNCoarse: number;
  topNFinal: number;
  maxDistanceKm: number;
  kernelSigma: number;
}

interface WorkerMessage {
  type: 'scout';
  lines?: LineData[];
  config?: Partial<WorkerConfig>;
  category?: number;
}

interface WorkerResponse {
  type: 'progress' | 'result' | 'error';
  phase?: string;
  percent?: number;
  detail?: string;
  results?: ScoredZone[];
  meta?: {
    coarseGridSize: number;
    fineGridSize: number;
    totalTimeMs: number;
    wasmTimeMs: number;
  };
  error?: string;
}

// Constants - haversineKm is now imported from spatial-index but kept for local use
const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;

const DEFAULT_CONFIG: WorkerConfig = {
  coarseStep: 2,
  fineStep: 0.5,
  refineRadiusDeg: 3,
  topNCoarse: 100,
  topNFinal: 50,
  maxDistanceKm: 500,
  kernelSigma: 150,
};

// WASM module reference
let wasmModule: any = null;
let isParallel = false;

// Quadtree spatial index for O(log n) city lookups
let spatialIndex: SpatialIndex | null = null;

// Cached coarse grid (same for all requests with same step size)
let cachedCoarseGrid: Map<number, GridPoint[]> = new Map();

// Score cache for memoization (keyed by lines hash + category)
let scoreCache: Map<string, Map<string, number>> = new Map();
const MAX_CACHE_SIZE = 5; // Keep last 5 chart configurations

// ============================================================================
// Quadtree Spatial Index (built from dynamically loaded cities data)
// O(log n) lookups instead of O(n) grid scanning
// ============================================================================

let citiesLoaded = false;
let citiesLoadPromise: Promise<void> | null = null;

async function ensureCitiesLoaded(): Promise<void> {
  if (citiesLoaded) return;
  if (citiesLoadPromise) return citiesLoadPromise;

  citiesLoadPromise = (async () => {
    const geoCities = await loadCities();
    console.log(`[AdvancedScout] Cities loaded: ${geoCities.length}`);

    console.log('[AdvancedScout] Building Quadtree spatial index...');
    const startTime = performance.now();

    const cities: SpatialCity[] = geoCities.map((c) => {
      const expanded = expandCity(c);
      return {
        name: expanded.name,
        country: expanded.countryCode,
        lat: expanded.lat,
        lng: expanded.lng,
        population: expanded.population,
        timezone: expanded.timezone,
      };
    });

    spatialIndex = new SpatialIndex(cities);
    const stats = spatialIndex.getStats();
    console.log(`[AdvancedScout] Spatial index built in ${(performance.now() - startTime).toFixed(0)}ms`);
    console.log(`[AdvancedScout] Index stats: ${stats.totalCities} cities, depth=${stats.depth}, ${stats.leafNodes} leaf nodes`);

    citiesLoaded = true;
  })();

  return citiesLoadPromise;
}

function ensureSpatialIndex(): void {
  if (spatialIndex !== null) return;

  // This should not happen if ensureCitiesLoaded was called first
  console.warn('[AdvancedScout] ensureSpatialIndex called before cities loaded - this is unexpected');
}

/**
 * Find the nearest city to a coordinate - O(log n) using Quadtree
 */
function findNearestCity(lat: number, lng: number): { city: CityData | null; distance: number } {
  ensureSpatialIndex();

  const result = spatialIndex!.nearestCity(lat, lng);

  if (!result) {
    return { city: null, distance: Infinity };
  }

  return {
    city: {
      name: result.city.name,
      country: result.city.country,
      lat: result.city.lat,
      lng: result.city.lng,
      population: result.city.population,
    },
    distance: result.distanceKm,
  };
}

/**
 * Find cities within a radius - uses Quadtree for efficient bounds check
 */
function findCitiesNearby(lat: number, lng: number, radiusKm: number = 200, limit: number = 5): CityData[] {
  ensureSpatialIndex();

  const results = spatialIndex!.citiesWithinRadius(lat, lng, radiusKm, {
    minPopulation: 0,
    limit: limit * 2, // Get extra for population sorting
  });

  // Sort by population (already sorted by distance, re-sort by population)
  return results
    .sort((a, b) => b.population - a.population)
    .slice(0, limit)
    .map((city) => ({
      name: city.name,
      country: city.country,
      lat: city.lat,
      lng: city.lng,
      population: city.population,
    }));
}

// ============================================================================
// Caching Helpers
// ============================================================================

/**
 * Generate a hash for lines configuration (for memoization)
 * Uses first/last points of each line to create a unique signature
 */
function hashLines(lines: LineData[], category: number): string {
  // Create a lightweight signature from line endpoints
  const sig = lines.slice(0, 10).map(l => {
    const first = l.points[0] || [0, 0];
    const last = l.points[l.points.length - 1] || [0, 0];
    return `${l.planet[0]}${l.angle[0]}${first[0].toFixed(1)}${last[0].toFixed(1)}`;
  }).join('');
  return `${category}-${sig}`;
}

/**
 * Get cached score for a grid point, or null if not cached
 */
function getCachedScore(cacheKey: string, lat: number, lng: number): number | null {
  const cache = scoreCache.get(cacheKey);
  if (!cache) return null;
  const pointKey = `${lat.toFixed(2)},${lng.toFixed(2)}`;
  return cache.get(pointKey) ?? null;
}

/**
 * Store scores in cache
 */
function setCachedScores(
  cacheKey: string,
  scores: Array<{ lat: number; lng: number; score: number }>
): void {
  // Evict oldest cache if at capacity
  if (scoreCache.size >= MAX_CACHE_SIZE && !scoreCache.has(cacheKey)) {
    const oldestKey = scoreCache.keys().next().value;
    if (oldestKey) scoreCache.delete(oldestKey);
  }

  let cache = scoreCache.get(cacheKey);
  if (!cache) {
    cache = new Map();
    scoreCache.set(cacheKey, cache);
  }

  for (const s of scores) {
    const pointKey = `${s.lat.toFixed(2)},${s.lng.toFixed(2)}`;
    cache.set(pointKey, s.score);
  }
}

// ============================================================================
// Grid Generation
// ============================================================================

function isLikelyLand(lat: number, lng: number): boolean {
  // Pacific Ocean center
  if (lng > -170 && lng < -100 && lat > -50 && lat < 50) {
    if (lat > 15 && lat < 30 && lng > -180 && lng < -150) return true; // Hawaii
    return false;
  }

  // Southern Ocean
  if (lat < -60) return false;

  // Arctic
  if (lat > 80) return false;

  // Mid-Atlantic
  if (lng > -50 && lng < -10 && lat > 5 && lat < 45) {
    if (lat > 10 && lat < 30 && lng > -90 && lng < -60) return true; // Caribbean
    return false;
  }

  // Indian Ocean center
  if (lng > 60 && lng < 90 && lat > -35 && lat < 0) {
    return false;
  }

  return true;
}

function generateCoarseGrid(step: number): GridPoint[] {
  // Check cache first (coarse grid only depends on step size)
  const cached = cachedCoarseGrid.get(step);
  if (cached) {
    console.log(`[AdvancedScout] Using cached coarse grid (${cached.length} points)`);
    return cached;
  }

  const points: GridPoint[] = [];

  for (let lat = -80; lat <= 80; lat += step) {
    for (let lng = -180; lng < 180; lng += step) {
      if (isLikelyLand(lat, lng)) {
        points.push({ lat, lng });
      }
    }
  }

  // Cache for future use
  cachedCoarseGrid.set(step, points);
  return points;
}

function generateFineGrid(centers: GridPoint[], radiusDeg: number, step: number): GridPoint[] {
  const seen = new Set<string>();
  const points: GridPoint[] = [];

  for (const center of centers) {
    const latMin = Math.max(-90, center.lat - radiusDeg);
    const latMax = Math.min(90, center.lat + radiusDeg);

    for (let lat = latMin; lat <= latMax; lat += step) {
      for (let lng = center.lng - radiusDeg; lng <= center.lng + radiusDeg; lng += step) {
        const normLng = ((lng + 180 + 360) % 360) - 180;
        const key = `${lat.toFixed(2)},${normLng.toFixed(2)}`;

        if (!seen.has(key)) {
          seen.add(key);
          points.push({ lat, lng: normLng });
        }
      }
    }
  }

  return points;
}

// ============================================================================
// WASM Scoring
// ============================================================================

async function initWasm(): Promise<void> {
  if (wasmModule) return;

  try {
    const wasm = await import('../../../astro-core/pkg/astro_core');
    if (typeof wasm.default === 'function') {
      await wasm.default();
    }
    wasmModule = wasm;

    // Try to init parallel
    if (typeof wasm.is_parallel_available === 'function' && wasm.is_parallel_available()) {
      try {
        const threads = navigator.hardwareConcurrency || 4;
        if (typeof wasm.initThreadPool === 'function') {
          await wasm.initThreadPool(threads);
        }
        isParallel = true;
        console.log(`[AdvancedScout] WASM parallel initialized with ${threads} threads`);
      } catch (e) {
        // Thread pool may already be initialized
        isParallel = true;
        console.log('[AdvancedScout] Using existing thread pool');
      }
    }
  } catch (e) {
    console.error('[AdvancedScout] Failed to load WASM:', e);
    throw e;
  }
}

function scoreGridPoints(
  points: GridPoint[],
  lines: LineData[],
  category: number,
  config: WorkerConfig
): Array<{ lat: number; lng: number; score: number }> {
  const cities = points.map((p, i) => ({
    name: `G${i}`,
    country: 'GRID',
    lat: p.lat,
    lon: p.lng,
  }));

  const wasmConfig = {
    kernel_type: 1,
    kernel_parameter: config.kernelSigma,
    max_distance_km: config.maxDistanceKm,
  };

  let results: any[];

  if (isParallel && typeof wasmModule.scout_cities_for_category_parallel === 'function') {
    results = wasmModule.scout_cities_for_category_parallel(
      cities,
      lines,
      category,
      2, // BalancedBenefit
      wasmConfig
    );
  } else if (typeof wasmModule.scout_cities_for_category === 'function') {
    results = wasmModule.scout_cities_for_category(
      cities,
      lines,
      category,
      2,
      wasmConfig
    );
  } else {
    throw new Error('WASM scout function not available');
  }

  return results.map((r: any, i: number) => ({
    lat: points[i].lat,
    lng: points[i].lng,
    score: r.score ?? r.composite ?? 0,
  }));
}

// ============================================================================
// Main Scout Function
// ============================================================================

async function runAdvancedScout(
  lines: LineData[],
  category: number,
  config: WorkerConfig
): Promise<{ results: ScoredZone[]; meta: any }> {
  const startTime = performance.now();
  let wasmTime = 0;
  let cacheHits = 0;

  // Generate cache key for this chart/category combination
  const cacheKey = hashLines(lines, category);

  // Phase 1: Coarse grid
  sendProgress('coarse', 0, 'Generating coarse grid...');
  const coarseGrid = generateCoarseGrid(config.coarseStep);
  sendProgress('coarse', 10, `Scoring ${coarseGrid.length} coarse points...`);

  await initWasm();

  // Check cache for coarse scores
  let coarseScores: Array<{ lat: number; lng: number; score: number }>;
  const cachedCoarseScores: Array<{ lat: number; lng: number; score: number }> = [];
  const uncachedCoarsePoints: GridPoint[] = [];

  for (const point of coarseGrid) {
    const cached = getCachedScore(cacheKey, point.lat, point.lng);
    if (cached !== null) {
      cachedCoarseScores.push({ lat: point.lat, lng: point.lng, score: cached });
      cacheHits++;
    } else {
      uncachedCoarsePoints.push(point);
    }
  }

  if (uncachedCoarsePoints.length > 0) {
    const wasmStart1 = performance.now();
    const newScores = scoreGridPoints(uncachedCoarsePoints, lines, category, config);
    wasmTime += performance.now() - wasmStart1;
    setCachedScores(cacheKey, newScores);
    coarseScores = [...cachedCoarseScores, ...newScores];
  } else {
    coarseScores = cachedCoarseScores;
    console.log(`[AdvancedScout] 100% cache hit for coarse grid (${cacheHits} points)`);
  }

  sendProgress('coarse', 40, 'Identifying hot zones...');

  // Find top zones (cluster to avoid redundancy)
  const sorted = [...coarseScores].sort((a, b) => b.score - a.score);
  const hotZones: GridPoint[] = [];
  const used = new Set<string>();

  for (const point of sorted) {
    if (hotZones.length >= config.topNCoarse) break;

    const key = `${Math.floor(point.lat / 5)},${Math.floor(point.lng / 5)}`;
    if (!used.has(key)) {
      used.add(key);
      hotZones.push({ lat: point.lat, lng: point.lng });
    }
  }

  // Phase 2: Fine grid around hot zones
  sendProgress('fine', 50, `Refining ${hotZones.length} hot zones...`);
  const fineGrid = generateFineGrid(hotZones, config.refineRadiusDeg, config.fineStep);
  sendProgress('fine', 60, `Scoring ${fineGrid.length} refined points...`);

  // Check cache for fine scores
  let fineScores: Array<{ lat: number; lng: number; score: number }>;
  const cachedFineScores: Array<{ lat: number; lng: number; score: number }> = [];
  const uncachedFinePoints: GridPoint[] = [];

  for (const point of fineGrid) {
    const cached = getCachedScore(cacheKey, point.lat, point.lng);
    if (cached !== null) {
      cachedFineScores.push({ lat: point.lat, lng: point.lng, score: cached });
      cacheHits++;
    } else {
      uncachedFinePoints.push(point);
    }
  }

  if (uncachedFinePoints.length > 0) {
    const wasmStart2 = performance.now();
    const newFineScores = scoreGridPoints(uncachedFinePoints, lines, category, config);
    wasmTime += performance.now() - wasmStart2;
    setCachedScores(cacheKey, newFineScores);
    fineScores = [...cachedFineScores, ...newFineScores];
  } else {
    fineScores = cachedFineScores;
    console.log(`[AdvancedScout] 100% cache hit for fine grid (${cachedFineScores.length} points)`);
  }

  if (cacheHits > 0) {
    console.log(`[AdvancedScout] Cache: ${cacheHits} hits, ${uncachedCoarsePoints.length + uncachedFinePoints.length} misses`);
  }

  // Phase 3: Map to cities (using bundled GEONAMES_CITIES)
  sendProgress('mapping', 80, 'Mapping to nearest cities...');

  const rankedFine = [...fineScores].sort((a, b) => b.score - a.score);
  const results: ScoredZone[] = [];
  const seenCities = new Set<string>();

  for (const zone of rankedFine) {
    if (results.length >= config.topNFinal) break;

    const { city, distance } = findNearestCity(zone.lat, zone.lng);

    // Skip if we already have this city (prefer higher-scoring zone)
    if (city) {
      const cityKey = `${city.name},${city.country}`;
      if (seenCities.has(cityKey)) continue;
      seenCities.add(cityKey);
    }

    const citiesNearby = findCitiesNearby(zone.lat, zone.lng, 200, 5);

    results.push({
      lat: zone.lat,
      lng: zone.lng,
      score: zone.score,
      nearestCity: city,
      distanceToCity: distance,
      citiesNearby,
    });
  }

  sendProgress('complete', 100, 'Scout complete!');

  return {
    results,
    meta: {
      coarseGridSize: coarseGrid.length,
      fineGridSize: fineGrid.length,
      totalTimeMs: performance.now() - startTime,
      wasmTimeMs: wasmTime,
      cacheHits,
    },
  };
}

// ============================================================================
// Message Handlers
// ============================================================================

function sendProgress(phase: string, percent: number, detail: string): void {
  self.postMessage({
    type: 'progress',
    phase,
    percent,
    detail,
  } as WorkerResponse);
}

self.onmessage = async (event: MessageEvent<WorkerMessage>) => {
  const { type, lines, config, category } = event.data;

  try {
    // Load cities data dynamically on first use (no longer bundled - saves ~3MB)
    await ensureCitiesLoaded();

    if (type === 'scout' && lines) {
      const fullConfig = { ...DEFAULT_CONFIG, ...config };
      const { results, meta } = await runAdvancedScout(lines, category ?? 0, fullConfig);

      self.postMessage({
        type: 'result',
        results,
        meta,
      } as WorkerResponse);
    }
  } catch (error) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
    } as WorkerResponse);
  }
};
