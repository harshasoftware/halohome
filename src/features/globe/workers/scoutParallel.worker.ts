/**
 * Scout Parallel Worker
 *
 * Single worker that initializes parallel WASM with rayon thread pool.
 * Rayon handles all internal parallelization - no need for multiple JS workers.
 *
 * This architecture is faster because:
 * 1. Rayon's work-stealing scheduler is more efficient than JS worker distribution
 * 2. No serialization overhead between JS workers
 * 3. Shared memory via SharedArrayBuffer (requires COOP/COEP headers)
 */

import type { PlanetaryLine, AspectLine, AspectType } from '@/lib/astro-types';
import { loadCities, expandCity } from '@/data/geonames-cities';

// Early debug log - if this doesn't appear, imports failed
console.log('[ScoutParallel] Worker script loaded, waiting for cities...');

// City type with population for filtering
interface City {
  name: string;
  country: string;
  lat: number;
  lng: number;
  population: number;
}

// Cities loaded dynamically (no longer bundled)
let ALL_CITIES: City[] = [];
let CITIES: City[] = [];
let currentMinPopulation = 15000; // Default: all cities
let citiesLoaded = false;
let citiesLoadPromise: Promise<void> | null = null;

/**
 * Load cities data dynamically (called during init)
 */
async function ensureCitiesLoaded(): Promise<void> {
  if (citiesLoaded) return;
  if (citiesLoadPromise) return citiesLoadPromise;

  citiesLoadPromise = (async () => {
    const geoCities = await loadCities();
    ALL_CITIES = geoCities.map(c => {
      const expanded = expandCity(c);
      return {
        name: expanded.name,
        country: expanded.countryCode,
        lat: expanded.lat,
        lng: expanded.lng,
        population: expanded.population,
      };
    });
    CITIES = ALL_CITIES;
    citiesLoaded = true;
    console.log(`[ScoutParallel] Cities loaded: ${ALL_CITIES.length}`);
  })();

  return citiesLoadPromise;
}

/**
 * Filter cities by minimum population
 */
function filterCitiesByPopulation(minPopulation: number): void {
  if (minPopulation === currentMinPopulation) return;

  currentMinPopulation = minPopulation;
  CITIES = ALL_CITIES.filter(c => c.population >= minPopulation);
  // Invalidate cached citiesJson when filter changes
  cachedCitiesJson = null;
  console.log(`[ScoutParallel] Filtered to ${CITIES.length} cities with population >= ${minPopulation.toLocaleString()}`);
}

// Cached cities JSON for WASM calls - avoids creating 33k objects per computation
// Invalidated when population filter changes
let cachedCitiesJson: Array<{ name: string; country: string; lat: number; lon: number }> | null = null;

/**
 * Get cities in WASM format (cached to avoid 231k allocations per full computation)
 */
function getCitiesJson(): Array<{ name: string; country: string; lat: number; lon: number }> {
  if (!cachedCitiesJson) {
    cachedCitiesJson = CITIES.map(c => ({
      name: c.name,
      country: c.country,
      lat: c.lat,
      lon: c.lng,
    }));
    console.log(`[ScoutParallel] Cached citiesJson for ${cachedCitiesJson.length} cities`);
  }
  return cachedCitiesJson;
}

// Population lookup map for fast access (cityName:country -> population)
let populationLookup: Map<string, number> | null = null;

/**
 * Get population lookup map (lazy init)
 */
function getPopulationLookup(): Map<string, number> {
  if (!populationLookup) {
    populationLookup = new Map();
    for (const city of ALL_CITIES) {
      populationLookup.set(`${city.name}:${city.country}`, city.population);
    }
  }
  return populationLookup;
}

/**
 * Look up city population by name and country
 */
function getCityPopulation(cityName: string, country: string): number {
  const lookup = getPopulationLookup();
  return lookup.get(`${cityName}:${country}`) ?? 0;
}
import type { LifeCategory, ScoringConfig } from '../utils/scout-algorithm-c2';

// ============================================================================
// Message Types
// ============================================================================

export type ScoutParallelMessage =
  | { type: 'init' }
  | {
      type: 'scoutCategory';
      id: string;
      category: LifeCategory;
      planetaryLines: PlanetaryLine[];
      aspectLines: AspectLine[];
      config?: Partial<ScoringConfig>;
      minPopulation?: number;
    }
  | {
      type: 'scoutOverall';
      id: string;
      planetaryLines: PlanetaryLine[];
      aspectLines: AspectLine[];
      config?: Partial<ScoringConfig>;
      minPopulation?: number;
    }
  | {
      type: 'scoutBatch';
      id: string;
      categories: LifeCategory[];
      planetaryLines: PlanetaryLine[];
      aspectLines: AspectLine[];
      config?: Partial<ScoringConfig>;
      minPopulation?: number;
    };

export interface WasmCityRanking {
  city_name: string;
  country: string;
  latitude: number;
  longitude: number;
  benefit_score: number;
  intensity_score: number;
  volatility_score: number;
  mixed_flag: boolean;
  top_influences: [string, string, number][];
  nature: string;
}

export interface CityRanking {
  cityName: string;
  country: string;
  latitude: number;
  longitude: number;
  population: number; // City population for filtering
  benefitScore: number;
  intensityScore: number;
  volatilityScore: number;
  mixedFlag: boolean;
  influenceCount: number;
  nature: 'beneficial' | 'challenging' | 'mixed';
  topInfluences: Array<{ planet: string; angle: string; distanceKm: number }>;
  minDistanceKm: number;
}

export interface OverallCityRanking {
  cityName: string;
  country: string;
  latitude: number;
  longitude: number;
  population: number; // City population for filtering
  totalScore: number;
  averageScore: number;
  categoryScores: Array<{
    category: LifeCategory;
    score: number;
    nature: 'beneficial' | 'challenging' | 'mixed';
  }>;
  beneficialCategories: number;
  challengingCategories: number;
  minDistanceKm: number;
}

export type ScoutParallelResult =
  | {
      type: 'ready';
      backend: 'wasm-parallel' | 'wasm' | 'typescript';
      numThreads: number;
      crossOriginIsolated: boolean;
      rayonInitializing?: boolean; // true if Rayon is initializing in background
    }
  | {
      type: 'rayonReady'; // Sent when background Rayon init completes
      numThreads: number;
      initTimeMs: number;
    }
  | {
      type: 'categoryResult';
      id: string;
      category: LifeCategory;
      rankings: CityRanking[];
      totalBeneficial: number;
      totalChallenging: number;
      backend: 'wasm-parallel' | 'wasm' | 'typescript';
      timeMs: number;
    }
  | {
      type: 'overallResult';
      id: string;
      rankings: OverallCityRanking[];
      // Include category results extracted from overall computation to avoid redundant calculations
      categoryResults?: Map<LifeCategory, { rankings: CityRanking[]; totalBeneficial: number; totalChallenging: number }>;
      backend: 'wasm-parallel' | 'wasm' | 'typescript';
      timeMs: number;
    }
  | {
      type: 'batchResult';
      id: string;
      categories: Map<LifeCategory, { rankings: CityRanking[]; totalBeneficial: number; totalChallenging: number }>;
      overall: OverallCityRanking[] | null;
      backend: 'wasm-parallel' | 'wasm' | 'typescript';
      timeMs: number;
    }
  | { type: 'error'; id: string; error: string }
  | {
      type: 'progress';
      id: string;
      percent: number;
      phase: 'initializing' | 'computing' | 'aggregating';
      detail?: string;
    };

// ============================================================================
// Worker State
// ============================================================================

let wasmModule: any = null;
let isWasmReady = false;
let isParallelReady = false;
let numThreads = 0;
const CATEGORIES: LifeCategory[] = ['career', 'love', 'health', 'home', 'wellbeing', 'wealth'];

// Top K results limit - dynamic based on total results
// Minimum 200 results, then cap at 5% of total for larger datasets
const MIN_RESULTS = 200;
const TOP_PERCENT = 0.05; // 5%

/**
 * Calculate the number of results to return based on total available.
 * - Always return at least MIN_RESULTS (200) if available
 * - For larger datasets, cap at TOP_PERCENT (5%) of total
 */
function calculateTopK(totalResults: number): number {
  if (totalResults <= MIN_RESULTS) {
    return totalResults; // Return all if less than minimum
  }
  // Return max of (minimum, 5% of total)
  return Math.max(MIN_RESULTS, Math.ceil(totalResults * TOP_PERCENT));
}

// WASM enums (must match Rust)
enum WasmLifeCategory {
  Career = 0,
  Love = 1,
  Health = 2,
  Home = 3,
  Wellbeing = 4,
  Wealth = 5,
}

enum WasmSortMode {
  BenefitFirst = 0,
  IntensityFirst = 1,
  BalancedBenefit = 2,
}

const categoryToWasm: Record<LifeCategory, WasmLifeCategory> = {
  career: WasmLifeCategory.Career,
  love: WasmLifeCategory.Love,
  health: WasmLifeCategory.Health,
  home: WasmLifeCategory.Home,
  wellbeing: WasmLifeCategory.Wellbeing,
  wealth: WasmLifeCategory.Wealth,
};

// ============================================================================
// Cross-Origin Isolation Detection
// ============================================================================

function isCrossOriginIsolated(): boolean {
  if (typeof self !== 'undefined' && 'crossOriginIsolated' in self) {
    return (self as any).crossOriginIsolated === true;
  }
  try {
    new SharedArrayBuffer(1);
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// Progress Emission
// ============================================================================

function emitProgress(
  id: string,
  percent: number,
  phase: 'initializing' | 'computing' | 'aggregating',
  detail?: string
): void {
  const result: ScoutParallelResult = {
    type: 'progress',
    id,
    percent: Math.round(percent),
    phase,
    detail,
  };
  self.postMessage(result);
}

// ============================================================================
// WASM Loading with Rayon Initialization & Fallback
// ============================================================================

// Timeout constants
const WASM_INIT_TIMEOUT = 15000; // 15 seconds for WASM initialization
const COMPUTATION_TIMEOUT = 60000; // 60 seconds per category computation

// Rayon configuration - intelligent thread allocation
// Each Rayon thread spawns a Web Worker that loads the WASM module
// Strategy: Maximize parallelism while leaving headroom for UI responsiveness

/**
 * Calculate optimal thread count based on device capabilities.
 *
 * Desktop (8+ cores): Use cores - 2 (leave headroom for UI + background)
 * Desktop (4-7 cores): Use cores - 1 (leave 1 for UI)
 * Mobile: Use min(cores - 1, 4) to save battery
 *
 * Minimum: 2 threads (any less and parallel overhead isn't worth it)
 */
function getOptimalThreadCount(): number {
  const cores = typeof navigator !== 'undefined'
    ? (navigator.hardwareConcurrency || 4)
    : 4;

  // Detect mobile via user agent (workers don't have window.matchMedia)
  const isMobile = typeof navigator !== 'undefined' &&
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

  if (isMobile) {
    // Mobile: Be conservative to save battery
    // Use fewer threads, cap at 4 max
    const mobileThreads = Math.max(2, Math.min(cores - 1, 4));
    console.log(`[ScoutParallel] Mobile detected - using ${mobileThreads} threads (${cores} cores)`);
    return mobileThreads;
  }

  // Desktop: Maximize performance with headroom
  let threads: number;
  if (cores >= 8) {
    // High-end: Leave 2 cores free for UI + system
    threads = cores - 2;
  } else if (cores >= 4) {
    // Mid-range: Leave 1 core free
    threads = cores - 1;
  } else {
    // Low-end: Use all but ensure at least 2
    threads = Math.max(2, cores);
  }

  console.log(`[ScoutParallel] Desktop detected - using ${threads} threads (${cores} cores)`);
  return threads;
}

// Background Rayon initialization state
let rayonInitPromise: Promise<boolean> | null = null;
let rayonInitStartTime = 0;

// Maximum time to wait for Rayon before falling back to single-threaded
// This is the timeout when a computation is waiting for Rayon to be ready
const RAYON_WAIT_TIMEOUT = 20000; // 20 seconds - don't block computation too long

// Maximum time for initThreadPool to complete
// If it takes longer, something is wrong with nested worker loading
const RAYON_INIT_TIMEOUT = 30000; // 30 seconds

/**
 * Wait for Rayon to be ready before starting computation.
 * Returns true if Rayon is ready, false if timed out or failed.
 */
async function waitForRayon(): Promise<boolean> {
  if (isParallelReady) return true;
  if (!rayonInitPromise) return false;

  try {
    // Wait for Rayon with timeout
    const result = await Promise.race([
      rayonInitPromise,
      new Promise<false>((resolve) =>
        setTimeout(() => resolve(false), RAYON_WAIT_TIMEOUT)
      ),
    ]);
    return result;
  } catch {
    return false;
  }
}

// Fallback imports for TypeScript computation
let tsFallbackModule: typeof import('../utils/scout-algorithm-c2') | null = null;

async function loadTsFallback(): Promise<void> {
  if (!tsFallbackModule) {
    tsFallbackModule = await import('../utils/scout-algorithm-c2');
    console.log('[ScoutParallel] TypeScript fallback module loaded');
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, errorMessage: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(errorMessage)), ms)
    ),
  ]);
}

/**
 * Initialize Rayon thread pool in the background.
 * This is non-blocking - computations can proceed with single-threaded WASM
 * while Rayon initializes. Once ready, subsequent computations use Rayon.
 */
async function initRayonBackground(): Promise<boolean> {
  if (!wasmModule || !isWasmReady) return false;
  if (isParallelReady) return true;
  if (rayonInitPromise) return rayonInitPromise;

  const crossOriginIsolated = isCrossOriginIsolated();
  if (!crossOriginIsolated) {
    console.log('[ScoutParallel] Cannot init Rayon - not cross-origin isolated');
    return false;
  }

  rayonInitPromise = (async () => {
    try {
      if (typeof wasmModule.is_parallel_available !== 'function' || !wasmModule.is_parallel_available()) {
        console.log('[ScoutParallel] Rayon not available in this WASM build');
        return false;
      }

      if (typeof wasmModule.initThreadPool !== 'function') {
        console.log('[ScoutParallel] initThreadPool not available');
        return false;
      }

      // Calculate optimal thread count based on device capabilities
      numThreads = getOptimalThreadCount();

      rayonInitStartTime = performance.now();
      console.log(`[ScoutParallel] Starting Rayon background init with ${numThreads} threads...`);

      // Add timeout to initThreadPool - if it hangs, we need to detect that
      console.log(`[ScoutParallel] Calling initThreadPool(${numThreads})...`);

      // Track progress with an interval that we can clear on success or timeout
      let elapsed = 0;
      const progressInterval = setInterval(() => {
        elapsed += 5000;
        console.log(`[ScoutParallel] Rayon init still running... (${elapsed / 1000}s elapsed)`);
      }, 5000);

      const initResult = await Promise.race([
        wasmModule.initThreadPool(numThreads).then(() => 'success' as const),
        new Promise<'timeout'>((resolve) => {
          setTimeout(() => resolve('timeout'), RAYON_INIT_TIMEOUT);
        }),
      ]);

      // Always clear the progress interval
      clearInterval(progressInterval);

      if (initResult === 'timeout') {
        console.error(`[ScoutParallel] Rayon initThreadPool timed out after ${RAYON_INIT_TIMEOUT / 1000}s`);
        console.error('[ScoutParallel] This usually means nested worker creation failed in production');
        return false;
      }

      const initTime = performance.now() - rayonInitStartTime;
      isParallelReady = true;
      console.log(`[ScoutParallel] Rayon ready! ${numThreads} threads initialized in ${initTime.toFixed(0)}ms`);

      // Notify main thread that parallel is now available
      self.postMessage({
        type: 'rayonReady',
        numThreads,
        initTimeMs: initTime,
      });

      return true;
    } catch (error) {
      const initTime = performance.now() - rayonInitStartTime;
      console.error(`[ScoutParallel] Rayon init failed after ${initTime.toFixed(0)}ms:`, error);
      return false;
    }
  })();

  return rayonInitPromise;
}

/**
 * Load WASM module (fast, single-threaded).
 * Rayon initialization happens in background - don't block on it.
 *
 * Progressive Enhancement Strategy:
 * 1. Load WASM quickly (single-threaded) - return immediately
 * 2. Start Rayon init in background (non-blocking)
 * 3. First computations use single-threaded WASM
 * 4. Once Rayon is ready, subsequent computations use it automatically
 */
async function loadWasm(): Promise<'wasm-parallel' | 'wasm' | 'typescript'> {
  const crossOriginIsolated = isCrossOriginIsolated();
  console.log('[ScoutParallel] Cross-origin isolated:', crossOriginIsolated);

  if (!crossOriginIsolated) {
    console.warn('[ScoutParallel] SharedArrayBuffer not available - parallel WASM requires COOP/COEP headers');
  }

  try {
    // Dynamic import of the WASM module with timeout
    const wasmImport = withTimeout(
      import('../../../astro-core/pkg/astro_core'),
      WASM_INIT_TIMEOUT,
      'WASM module import timed out'
    );

    const wasm = await wasmImport;

    // Initialize WASM with timeout
    if (typeof wasm.default === 'function') {
      await withTimeout(
        wasm.default(),
        WASM_INIT_TIMEOUT,
        'WASM initialization timed out'
      );
    }

    wasmModule = wasm;
    isWasmReady = true;
    console.log('[ScoutParallel] WASM module loaded (single-threaded ready)');

    // Start Rayon initialization in background - don't block!
    // This allows the worker to respond "ready" immediately with single-threaded WASM
    // Rayon will become available later for subsequent computations
    if (crossOriginIsolated) {
      // Fire and forget - don't await
      initRayonBackground().then(success => {
        if (success) {
          console.log('[ScoutParallel] Background Rayon init succeeded - parallel now available');
        }
      });
    }

    // Return immediately - single-threaded WASM is ready
    // Rayon may become available later (check isParallelReady before computations)
    return 'wasm';
  } catch (error) {
    console.warn('[ScoutParallel] WASM load failed, loading TypeScript fallback:', error);
    // Pre-load TypeScript fallback
    await loadTsFallback();
    return 'typescript';
  }
}

// ============================================================================
// Line Data Conversion
// ============================================================================

function getLineRating(planet: string, angle: string): number {
  const ratings: Record<string, Record<string, number>> = {
    Sun: { MC: 5, ASC: 5, DSC: 4, IC: 4 },
    Moon: { MC: 3, ASC: 4, DSC: 4, IC: 5 },
    Mercury: { MC: 4, ASC: 3, DSC: 3, IC: 3 },
    Venus: { MC: 4, ASC: 5, DSC: 5, IC: 5 },
    Mars: { MC: 4, ASC: 3, DSC: 2, IC: 2 },
    Jupiter: { MC: 5, ASC: 5, DSC: 5, IC: 5 },
    Saturn: { MC: 3, ASC: 2, DSC: 2, IC: 2 },
    Uranus: { MC: 2, ASC: 2, DSC: 2, IC: 1 },
    Neptune: { MC: 2, ASC: 3, DSC: 3, IC: 2 },
    Pluto: { MC: 3, ASC: 2, DSC: 2, IC: 1 },
    NorthNode: { MC: 4, ASC: 4, DSC: 4, IC: 4 },
    SouthNode: { MC: 2, ASC: 2, DSC: 2, IC: 2 },
    Chiron: { MC: 3, ASC: 3, DSC: 3, IC: 3 },
  };
  return ratings[planet]?.[angle] ?? 3;
}

function mapAspectType(aspectType: AspectType): string {
  const aspectMap: Record<AspectType, string> = {
    conjunction: 'Conjunction',
    trine: 'Trine',
    sextile: 'Sextile',
    square: 'Square',
    quincunx: 'Quincunx',
    opposition: 'Opposition',
    sesquisquare: 'Sesquisquare',
  };
  return aspectMap[aspectType] ?? 'Conjunction';
}

function convertLinesToWasmFormat(
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[]
): unknown[] {
  const lines: unknown[] = [];

  for (const line of planetaryLines) {
    lines.push({
      planet: line.planet,
      angle: line.lineType,
      rating: getLineRating(line.planet, line.lineType),
      aspect: null,
      points: line.points, // Already [lat, lng] tuples - no need to copy
    });
  }

  for (const line of aspectLines) {
    const baseRating = getLineRating(line.planet, line.angle);
    let adjustedRating = baseRating;
    if (line.isHarmonious) {
      adjustedRating = Math.min(5, baseRating + 1);
    } else {
      adjustedRating = Math.max(1, baseRating - 1);
    }

    lines.push({
      planet: line.planet,
      angle: line.angle,
      rating: adjustedRating,
      aspect: mapAspectType(line.aspectType),
      points: line.points, // Already [lat, lng] tuples - no need to copy
    });
  }

  return lines;
}

// ============================================================================
// Scout Functions with Fallback Chain
// ============================================================================

/**
 * Attempts computation with multiple fallback levels:
 * 1. Parallel WASM (fastest)
 * 2. Single-threaded WASM (fast)
 * 3. TypeScript (slowest but always works)
 */
async function scoutCategoryWithFallback(
  category: LifeCategory,
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  requestId?: string
): Promise<{ rankings: CityRanking[]; totalBeneficial: number; totalChallenging: number; usedFallback: 'wasm-parallel' | 'wasm' | 'typescript' }> {
  // Wait for Rayon if it's initializing (quick check, returns immediately if ready)
  if (rayonInitPromise && !isParallelReady) {
    if (requestId) emitProgress(requestId, 2, 'initializing', 'Waiting for parallel engine...');
    await waitForRayon();
  }

  // Try WASM first
  if (wasmModule && isWasmReady) {
    try {
      const result = scoutCategoryWasm(category, planetaryLines, aspectLines, requestId);
      if (result) {
        return { ...result, usedFallback: isParallelReady ? 'wasm-parallel' : 'wasm' };
      }
    } catch (error) {
      console.warn(`[ScoutParallel] WASM computation failed for ${category}, trying fallback:`, error);
    }
  }

  // Fallback to TypeScript
  console.log(`[ScoutParallel] Using TypeScript fallback for ${category}`);
  if (requestId) emitProgress(requestId, 10, 'computing', `Analyzing ${category} (fallback)...`);

  await loadTsFallback();
  const result = scoutCategoryTS(category, planetaryLines, aspectLines, requestId);
  return { ...result, usedFallback: 'typescript' };
}

function scoutCategoryWasm(
  category: LifeCategory,
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  requestId?: string
): { rankings: CityRanking[]; totalBeneficial: number; totalChallenging: number } | null {
  if (!wasmModule || !isWasmReady) return null;

  try {
    // Use cached citiesJson to avoid 33k object allocations per category
    const citiesJson = getCitiesJson();
    const linesJson = convertLinesToWasmFormat(planetaryLines, aspectLines);
    const configJson = {
      kernel_type: 1,
      kernel_parameter: 150,
      max_distance_km: 500,
    };

    let wasmResults: WasmCityRanking[];

    // Try optimized fast functions first, fall back to original if not available
    // Use parallel version if available (fastest - uses equirectangular approximation + polyline simplification)
    if (isParallelReady && typeof wasmModule.scout_cities_fast_parallel === 'function') {
      if (requestId) emitProgress(requestId, 10, 'computing', `Analyzing ${category} (fast parallel)...`);

      wasmResults = wasmModule.scout_cities_fast_parallel(
        citiesJson,
        linesJson,
        categoryToWasm[category],
        WasmSortMode.BalancedBenefit,
        configJson
      );
    } else if (typeof wasmModule.scout_cities_fast === 'function') {
      // Use single-threaded fast version (still uses optimizations)
      if (requestId) emitProgress(requestId, 10, 'computing', `Analyzing ${category} (fast)...`);

      wasmResults = wasmModule.scout_cities_fast(
        citiesJson,
        linesJson,
        categoryToWasm[category],
        WasmSortMode.BalancedBenefit,
        configJson
      );
    } else if (isParallelReady && typeof wasmModule.scout_cities_for_category_parallel === 'function') {
      // Fall back to original parallel version
      if (requestId) emitProgress(requestId, 10, 'computing', `Analyzing ${category} (parallel)...`);

      wasmResults = wasmModule.scout_cities_for_category_parallel(
        citiesJson,
        linesJson,
        categoryToWasm[category],
        WasmSortMode.BalancedBenefit,
        configJson
      );
    } else {
      // Fall back to original non-parallel WASM
      if (requestId) emitProgress(requestId, 10, 'computing', `Analyzing ${category}...`);

      wasmResults = wasmModule.scout_cities_for_category(
        citiesJson,
        linesJson,
        categoryToWasm[category],
        WasmSortMode.BalancedBenefit,
        configJson
      );
    }

    // Convert WASM results to CityRanking format
    // WASM results are pre-sorted by score, so we can slice after filtering
    const allRankings: CityRanking[] = wasmResults
      .filter(r => r.top_influences.length > 0)
      .map(r => ({
        cityName: r.city_name,
        country: r.country,
        latitude: r.latitude,
        longitude: r.longitude,
        population: getCityPopulation(r.city_name, r.country),
        benefitScore: Math.round((r.benefit_score + 2) * 25),
        intensityScore: r.intensity_score,
        volatilityScore: r.volatility_score,
        mixedFlag: r.mixed_flag,
        influenceCount: r.top_influences.length,
        nature: r.nature === 'challenging' ? 'challenging' as const : r.nature === 'mixed' ? 'mixed' as const : 'beneficial' as const,
        topInfluences: r.top_influences.map(([planet, angle, distanceKm]) => ({
          planet,
          angle,
          distanceKm,
        })),
        minDistanceKm: r.top_influences.length > 0
          ? r.top_influences.reduce((min, [, , d]) => d < min ? d : min, Infinity)
          : 0,
      }));

    // Separate beneficial and challenging, take top of each
    const beneficialRankings = allRankings.filter(r => r.nature === 'beneficial');
    const challengingRankings = allRankings.filter(r => r.nature === 'challenging');

    // Count totals before limiting
    const totalBeneficial = beneficialRankings.length;
    const totalChallenging = challengingRankings.length;

    // Sort and slice each group separately
    beneficialRankings.sort((a, b) => b.benefitScore - a.benefitScore);
    challengingRankings.sort((a, b) => a.benefitScore - b.benefitScore); // Lowest = most challenging

    // Dynamic TOP_K: min 200, then 5% cap for larger datasets
    const topKBeneficial = calculateTopK(totalBeneficial);
    const topKChallenging = calculateTopK(totalChallenging);

    const topBeneficial = beneficialRankings.slice(0, topKBeneficial);
    const topChallenging = challengingRankings.slice(0, topKChallenging);

    // Return both groups (beneficial first, then challenging)
    const rankings = [...topBeneficial, ...topChallenging];

    return { rankings, totalBeneficial, totalChallenging };
  } catch (error) {
    console.warn('[ScoutParallel] WASM category scout failed:', error);
    return null;
  }
}

function scoutCategoryTS(
  category: LifeCategory,
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  requestId?: string
): { rankings: CityRanking[]; totalBeneficial: number; totalChallenging: number } {
  if (!tsFallbackModule) {
    throw new Error('TypeScript fallback module not loaded');
  }

  const {
    getBalancedConfig,
    getDefaultLineRatings,
    createOptimizedPlanetaryLines,
    createOptimizedAspectLines,
    buildCityInfluencesOptimized,
    rankCitiesByCategory,
  } = tsFallbackModule;

  const config = getBalancedConfig();
  const lineRatings = getDefaultLineRatings();

  if (requestId) emitProgress(requestId, 5, 'initializing', 'Preparing data...');

  const optimizedPlanetaryLines = createOptimizedPlanetaryLines(planetaryLines, config.maxDistanceKm);
  const optimizedAspectLines = createOptimizedAspectLines(aspectLines, config.maxDistanceKm);

  if (requestId) emitProgress(requestId, 10, 'computing', 'Analyzing locations...');

  // Build influences for all cities
  const totalCities = CITIES.length;
  const cityInfluences: any[] = [];
  const progressInterval = Math.max(1, Math.floor(totalCities / 10));

  for (let i = 0; i < CITIES.length; i++) {
    const city = CITIES[i];
    cityInfluences.push({
      cityName: city.name,
      country: city.country,
      latitude: city.lat,
      longitude: city.lng,
      influences: buildCityInfluencesOptimized(
        city.lat,
        city.lng,
        optimizedPlanetaryLines,
        optimizedAspectLines,
        config,
        lineRatings
      ),
    });

    if (requestId && i > 0 && i % progressInterval === 0) {
      const percent = 10 + Math.floor((i / totalCities) * 70);
      emitProgress(requestId, percent, 'computing', `Analyzing cities... (${Math.round((i / totalCities) * 100)}%)`);
    }
  }

  if (requestId) emitProgress(requestId, 85, 'aggregating', 'Ranking locations...');

  const rankings = rankCitiesByCategory(cityInfluences, category, config, 'balanced');

  // Convert to our format
  const allConvertedRankings: CityRanking[] = rankings.map((r: any) => ({
    cityName: r.cityName,
    country: r.country,
    latitude: r.latitude,
    longitude: r.longitude,
    population: getCityPopulation(r.cityName, r.country),
    benefitScore: r.benefitScore,
    intensityScore: r.intensityScore || 0,
    volatilityScore: r.volatilityScore || 0,
    mixedFlag: r.mixedFlag || false,
    influenceCount: r.topInfluences?.length || 0,
    nature: r.nature,
    topInfluences: (r.topInfluences || []).map((inf: any) => ({
      planet: inf.planet,
      angle: inf.angle,
      distanceKm: inf.distanceKm,
    })),
    minDistanceKm: r.minDistanceKm || 0,
  }));

  // Separate beneficial and challenging, take top of each
  const beneficialRankings = allConvertedRankings.filter(r => r.nature === 'beneficial');
  const challengingRankings = allConvertedRankings.filter(r => r.nature === 'challenging');

  // Count totals before limiting
  const totalBeneficial = beneficialRankings.length;
  const totalChallenging = challengingRankings.length;

  // Sort and slice each group separately
  beneficialRankings.sort((a, b) => b.benefitScore - a.benefitScore);
  challengingRankings.sort((a, b) => a.benefitScore - b.benefitScore); // Lowest = most challenging

  // Dynamic TOP_K: min 200, then 5% cap for larger datasets
  const topKBeneficial = calculateTopK(totalBeneficial);
  const topKChallenging = calculateTopK(totalChallenging);

  const topBeneficial = beneficialRankings.slice(0, topKBeneficial);
  const topChallenging = challengingRankings.slice(0, topKChallenging);

  // Return both groups (beneficial first, then challenging)
  const convertedRankings = [...topBeneficial, ...topChallenging];

  return { rankings: convertedRankings, totalBeneficial, totalChallenging };
}

interface ScoutOverallResult {
  overall: OverallCityRanking[];
  categoryResults: Map<LifeCategory, { rankings: CityRanking[]; totalBeneficial: number; totalChallenging: number }>;
}

async function scoutOverall(
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  requestId?: string
): Promise<ScoutOverallResult | null> {
  if (!wasmModule || !isWasmReady) return null;

  // Wait for Rayon if it's initializing - this is critical for performance
  // Single-threaded WASM for 33K cities takes 80+ seconds
  // Rayon parallel takes ~10-15 seconds
  if (rayonInitPromise && !isParallelReady) {
    const initElapsed = rayonInitStartTime > 0 ? performance.now() - rayonInitStartTime : 0;
    console.log(`[ScoutParallel] Computation waiting for Rayon (init elapsed: ${initElapsed.toFixed(0)}ms)...`);
    if (requestId) emitProgress(requestId, 2, 'initializing', 'Waiting for parallel engine...');

    const waitStart = performance.now();
    const rayonReady = await waitForRayon();
    const waitTime = performance.now() - waitStart;

    if (rayonReady) {
      console.log(`[ScoutParallel] Rayon ready after ${waitTime.toFixed(0)}ms wait - using parallel mode`);
    } else {
      // Log how long Rayon has been initializing
      const totalInitTime = rayonInitStartTime > 0 ? performance.now() - rayonInitStartTime : 0;
      console.log(`[ScoutParallel] Rayon wait timeout after ${waitTime.toFixed(0)}ms (init running for ${totalInitTime.toFixed(0)}ms) - proceeding with single-threaded`);
    }
  } else if (isParallelReady) {
    console.log(`[ScoutParallel] Rayon already ready - using parallel mode (${numThreads} threads)`);
  } else {
    console.log(`[ScoutParallel] No Rayon init in progress - using single-threaded mode`);
  }

  try {
    // Use cached citiesJson to avoid 33k object allocations per overall computation
    const citiesJson = getCitiesJson();
    const linesJson = convertLinesToWasmFormat(planetaryLines, aspectLines);
    const configJson = {
      kernel_type: 1,
      kernel_parameter: 150,
      max_distance_km: 500,
    };

    const categoryLabels: Record<LifeCategory, string> = {
      career: 'Career',
      love: 'Love',
      health: 'Health',
      home: 'Home',
      wellbeing: 'Wellbeing',
      wealth: 'Wealth',
    };

    // Run all categories
    const categoryResults: { category: LifeCategory; results: WasmCityRanking[] }[] = [];

    for (let i = 0; i < CATEGORIES.length; i++) {
      const category = CATEGORIES[i];
      const progressPercent = 10 + (i * 12);
      if (requestId) emitProgress(requestId, progressPercent, 'computing', `Analyzing ${categoryLabels[category]}...`);

      let results: WasmCityRanking[];
      // Try optimized fast functions first
      if (isParallelReady && typeof wasmModule.scout_cities_fast_parallel === 'function') {
        results = wasmModule.scout_cities_fast_parallel(
          citiesJson,
          linesJson,
          categoryToWasm[category],
          WasmSortMode.BalancedBenefit,
          configJson
        );
      } else if (typeof wasmModule.scout_cities_fast === 'function') {
        results = wasmModule.scout_cities_fast(
          citiesJson,
          linesJson,
          categoryToWasm[category],
          WasmSortMode.BalancedBenefit,
          configJson
        );
      } else if (isParallelReady && typeof wasmModule.scout_cities_for_category_parallel === 'function') {
        results = wasmModule.scout_cities_for_category_parallel(
          citiesJson,
          linesJson,
          categoryToWasm[category],
          WasmSortMode.BalancedBenefit,
          configJson
        );
      } else {
        results = wasmModule.scout_cities_for_category(
          citiesJson,
          linesJson,
          categoryToWasm[category],
          WasmSortMode.BalancedBenefit,
          configJson
        );
      }
      categoryResults.push({ category, results: results || [] });
    }

    if (requestId) emitProgress(requestId, 85, 'aggregating', 'Ranking locations...');

    // Aggregate scores per city
    const cityScoresMap = new Map<
      string,
      {
        city: { name: string; country: string; lat: number; lng: number; population: number };
        scores: Map<LifeCategory, { score: number; nature: 'beneficial' | 'challenging' }>;
        minDistance: number;
      }
    >();

    for (const { category, results } of categoryResults) {
      for (const ranking of results) {
        if (ranking.top_influences.length === 0) continue;

        const key = `${ranking.city_name}-${ranking.country}`;
        const nature: 'beneficial' | 'challenging' =
          ranking.nature === 'challenging' ? 'challenging' : 'beneficial';
        const normalizedScore = Math.round((ranking.benefit_score + 2) * 25);
        // Use reduce instead of spread to avoid array allocation
        const rankingMinDistance = ranking.top_influences.reduce(
          (min, [, , dist]) => dist < min ? dist : min,
          Infinity
        );

        if (!cityScoresMap.has(key)) {
          cityScoresMap.set(key, {
            city: {
              name: ranking.city_name,
              country: ranking.country,
              lat: ranking.latitude,
              lng: ranking.longitude,
              population: getCityPopulation(ranking.city_name, ranking.country),
            },
            scores: new Map(),
            minDistance: rankingMinDistance,
          });
        }

        const cityData = cityScoresMap.get(key)!;
        cityData.scores.set(category, { score: normalizedScore, nature });
        cityData.minDistance = Math.min(cityData.minDistance, rankingMinDistance);
      }
    }

    // Convert to OverallCityRanking array
    const overallRankings: OverallCityRanking[] = [];

    for (const [, cityData] of cityScoresMap) {
      const categoryScores: OverallCityRanking['categoryScores'] = [];
      let totalScore = 0;
      let beneficialCount = 0;
      let challengingCount = 0;

      for (const category of CATEGORIES) {
        const scoreData = cityData.scores.get(category);
        if (scoreData) {
          categoryScores.push({
            category,
            score: scoreData.score,
            nature: scoreData.nature,
          });

          if (scoreData.nature === 'beneficial') {
            totalScore += scoreData.score;
            beneficialCount++;
          } else {
            totalScore -= scoreData.score * 0.5;
            challengingCount++;
          }
        }
      }

      categoryScores.sort((a, b) => b.score - a.score);

      if (categoryScores.length > 0) {
        overallRankings.push({
          cityName: cityData.city.name,
          country: cityData.city.country,
          latitude: cityData.city.lat,
          longitude: cityData.city.lng,
          population: cityData.city.population,
          totalScore: Math.round(totalScore),
          averageScore: Math.round(totalScore / categoryScores.length),
          categoryScores,
          beneficialCategories: beneficialCount,
          challengingCategories: challengingCount,
          minDistanceKm: Math.round(cityData.minDistance),
        });
      }
    }

    // Separate cities by whether they're more beneficial or challenging overall
    const beneficialCities = overallRankings.filter(r => r.beneficialCategories > r.challengingCategories);
    const challengingCities = overallRankings.filter(r => r.challengingCategories >= r.beneficialCategories);

    // Sort and slice each group separately
    beneficialCities.sort((a, b) => b.totalScore - a.totalScore);
    challengingCities.sort((a, b) => a.totalScore - b.totalScore); // Lowest = most challenging

    // Dynamic TOP_K: min 200, then 5% cap for larger datasets
    const topKBeneficial = calculateTopK(beneficialCities.length);
    const topKChallenging = calculateTopK(challengingCities.length);

    const topBeneficial = beneficialCities.slice(0, topKBeneficial);
    const topChallenging = challengingCities.slice(0, topKChallenging);

    // Convert WASM category results to CityRanking format
    const categoryResultsMap = new Map<LifeCategory, { rankings: CityRanking[]; totalBeneficial: number; totalChallenging: number }>();

    for (const { category, results } of categoryResults) {
      const beneficial = results.filter(r => r.nature !== 'challenging');
      const challenging = results.filter(r => r.nature === 'challenging');

      // Convert WASM results to CityRanking format
      const rankings: CityRanking[] = results.map(r => ({
        cityName: r.city_name,
        country: r.country,
        latitude: r.latitude,
        longitude: r.longitude,
        population: getCityPopulation(r.city_name, r.country),
        benefitScore: r.benefit_score,
        intensityScore: r.intensity_score || 0,
        volatilityScore: r.volatility_score || 0,
        mixedFlag: r.mixed_flag,
        influenceCount: r.top_influences.length,
        nature: (r.nature === 'challenging' ? 'challenging' : 'beneficial') as 'beneficial' | 'challenging' | 'mixed',
        topInfluences: r.top_influences.map(([planet, angle, distanceKm]) => ({
          planet,
          angle,
          distanceKm,
        })),
        minDistanceKm: r.top_influences.length > 0
          ? r.top_influences.reduce((min, [, , dist]) => dist < min ? dist : min, Infinity)
          : 0,
      }));

      // Sort beneficial by score desc, challenging by score asc
      const beneficialRankings = rankings.filter(r => r.nature === 'beneficial').sort((a, b) => b.benefitScore - a.benefitScore);
      const challengingRankings = rankings.filter(r => r.nature === 'challenging').sort((a, b) => a.benefitScore - b.benefitScore);

      const topKBen = calculateTopK(beneficialRankings.length);
      const topKChal = calculateTopK(challengingRankings.length);

      categoryResultsMap.set(category, {
        rankings: [...beneficialRankings.slice(0, topKBen), ...challengingRankings.slice(0, topKChal)],
        totalBeneficial: beneficial.length,
        totalChallenging: challenging.length,
      });
    }

    // Return both overall and category results
    return {
      overall: [...topBeneficial, ...topChallenging],
      categoryResults: categoryResultsMap,
    };
  } catch (error) {
    console.warn('[ScoutParallel] Overall scout failed:', error);
    return null;
  }
}

// ============================================================================
// Message Handler
// ============================================================================

self.onmessage = async (event: MessageEvent<ScoutParallelMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'init': {
      // Load cities data dynamically (no longer bundled - saves ~3MB per worker)
      await ensureCitiesLoaded();
      const backend = await loadWasm();
      const crossOriginIsolated = isCrossOriginIsolated();

      // Check if Rayon is initializing in background
      const rayonInitializing = crossOriginIsolated && rayonInitPromise !== null && !isParallelReady;

      const result: ScoutParallelResult = {
        type: 'ready',
        backend: isParallelReady ? 'wasm-parallel' : backend,
        numThreads: isParallelReady ? numThreads : 1,
        crossOriginIsolated,
        rayonInitializing,
      };
      self.postMessage(result);
      break;
    }

    case 'scoutCategory': {
      try {
        const startTime = performance.now();
        emitProgress(message.id, 0, 'initializing', 'Starting analysis...');

        // Apply population filter if specified
        if (message.minPopulation !== undefined) {
          filterCitiesByPopulation(message.minPopulation);
        }

        const scoutResult = await scoutCategoryWithFallback(
          message.category,
          message.planetaryLines,
          message.aspectLines,
          message.id
        );

        emitProgress(message.id, 100, 'aggregating', 'Complete!');

        const result: ScoutParallelResult = {
          type: 'categoryResult',
          id: message.id,
          category: message.category,
          rankings: scoutResult.rankings,
          totalBeneficial: scoutResult.totalBeneficial,
          totalChallenging: scoutResult.totalChallenging,
          backend: scoutResult.usedFallback,
          timeMs: performance.now() - startTime,
        };
        self.postMessage(result);
      } catch (error) {
        const errorResult: ScoutParallelResult = {
          type: 'error',
          id: message.id,
          error: error instanceof Error ? error.message : String(error),
        };
        self.postMessage(errorResult);
      }
      break;
    }

    case 'scoutOverall': {
      try {
        const startTime = performance.now();
        emitProgress(message.id, 0, 'initializing', 'Starting analysis...');

        // Apply population filter if specified
        if (message.minPopulation !== undefined) {
          filterCitiesByPopulation(message.minPopulation);
        }

        const scoutResult = await scoutOverall(
          message.planetaryLines,
          message.aspectLines,
          message.id
        );

        if (!scoutResult) {
          throw new Error('Scout computation failed');
        }

        emitProgress(message.id, 100, 'aggregating', 'Complete!');

        const result: ScoutParallelResult = {
          type: 'overallResult',
          id: message.id,
          rankings: scoutResult.overall,
          categoryResults: scoutResult.categoryResults,
          backend: isParallelReady ? 'wasm-parallel' : 'wasm',
          timeMs: performance.now() - startTime,
        };
        self.postMessage(result);
      } catch (error) {
        const errorResult: ScoutParallelResult = {
          type: 'error',
          id: message.id,
          error: error instanceof Error ? error.message : String(error),
        };
        self.postMessage(errorResult);
      }
      break;
    }

    case 'scoutBatch': {
      try {
        const startTime = performance.now();
        emitProgress(message.id, 0, 'initializing', 'Starting batch analysis...');

        // Apply population filter if specified
        if (message.minPopulation !== undefined) {
          filterCitiesByPopulation(message.minPopulation);
        }

        const categoryResults = new Map<LifeCategory, { rankings: CityRanking[]; totalBeneficial: number; totalChallenging: number }>();
        let usedBackend: 'wasm-parallel' | 'wasm' | 'typescript' = 'wasm-parallel';

        // Process requested categories
        const totalItems = message.categories.length + 1; // +1 for overall
        let completed = 0;

        for (const category of message.categories) {
          const progressPercent = Math.round((completed / totalItems) * 90);
          emitProgress(message.id, progressPercent, 'computing', `Analyzing ${category}...`);

          const result = await scoutCategoryWithFallback(
            category,
            message.planetaryLines,
            message.aspectLines
          );

          categoryResults.set(category, {
            rankings: result.rankings,
            totalBeneficial: result.totalBeneficial,
            totalChallenging: result.totalChallenging,
          });

          // Track the "lowest" backend used (typescript < wasm < wasm-parallel)
          if (result.usedFallback === 'typescript') {
            usedBackend = 'typescript';
          } else if (result.usedFallback === 'wasm' && usedBackend === 'wasm-parallel') {
            usedBackend = 'wasm';
          }
          completed++;
        }

        // Compute overall
        emitProgress(message.id, 90, 'aggregating', 'Computing overall rankings...');
        const overallResult = await scoutOverall(
          message.planetaryLines,
          message.aspectLines
        );

        emitProgress(message.id, 100, 'aggregating', 'Complete!');

        const result: ScoutParallelResult = {
          type: 'batchResult',
          id: message.id,
          categories: categoryResults,
          overall: overallResult?.overall ?? null,
          backend: usedBackend,
          timeMs: performance.now() - startTime,
        };
        self.postMessage(result);
      } catch (error) {
        const errorResult: ScoutParallelResult = {
          type: 'error',
          id: message.id,
          error: error instanceof Error ? error.message : String(error),
        };
        self.postMessage(errorResult);
      }
      break;
    }
  }
};

console.log('[ScoutParallel] Worker initialized');
