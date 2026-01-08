/**
 * Scout Location Worker
 * Runs scout calculations off the main thread using either:
 * - WASM C2 algorithm (primary, fast)
 * - TypeScript C2 algorithm (fallback)
 */

import type { PlanetaryLine, AspectLine, AspectType } from '@/lib/astro-types';
import { loadCities, expandCity } from '@/data/geonames-cities';
import {
  type LifeCategory,
  type ScoringConfig,
  type SortMode,
  type CityRanking,
  type CityInfluenceSet,
  getBalancedConfig,
  buildCityInfluences,
  buildCityInfluencesOptimized,
  createOptimizedPlanetaryLines,
  createOptimizedAspectLines,
  getDefaultLineRatings,
  rankCitiesByCategory,
  calculateCityScore,
  filterInfluencesByCategory,
  isBeneficialForCategory,
  isChallengingForCategory,
} from '../utils/scout-algorithm-c2';

// Early debug log - if this doesn't appear, imports failed
console.log('[ScoutWorker] Worker script loaded, waiting for cities...');

// ============================================================================
// Message Types
// ============================================================================

export type ScoutWorkerMessage =
  | { type: 'init'; wasmEnabled: boolean }
  | {
      type: 'scoutCategory';
      id: string;
      category: LifeCategory;
      planetaryLines: PlanetaryLine[];
      aspectLines: AspectLine[];
      config?: Partial<ScoringConfig>;
    }
  | {
      type: 'scoutOverall';
      id: string;
      planetaryLines: PlanetaryLine[];
      aspectLines: AspectLine[];
      config?: Partial<ScoringConfig>;
    };

export type ScoutWorkerResult =
  | { type: 'ready'; backend: 'wasm' | 'typescript'; parallel: boolean; crossOriginIsolated: boolean }
  | {
      type: 'categoryResult';
      id: string;
      category: LifeCategory;
      rankings: CityRanking[];
      totalBeneficial: number;
      totalChallenging: number;
      backend: 'wasm' | 'typescript';
    }
  | {
      type: 'overallResult';
      id: string;
      rankings: OverallCityRanking[];
      backend: 'wasm' | 'typescript';
    }
  | { type: 'error'; id: string; error: string }
  | {
      type: 'progress';
      id: string;
      percent: number;
      phase: 'initializing' | 'computing' | 'aggregating';
      detail?: string;
    };

export interface OverallCityRanking {
  cityName: string;
  country: string;
  latitude: number;
  longitude: number;
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

// ============================================================================
// Worker State
// ============================================================================

let wasmModule: any = null;
let isWasmReady = false;
let isParallelReady = false;
const CATEGORIES: LifeCategory[] = ['career', 'love', 'health', 'home', 'wellbeing', 'wealth'];

// Cities loaded dynamically (no longer bundled)
let CITIES: Array<{ name: string; country: string; lat: number; lng: number }> = [];
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
    CITIES = geoCities.map(c => {
      const expanded = expandCity(c);
      return {
        name: expanded.name,
        country: expanded.countryCode,
        lat: expanded.lat,
        lng: expanded.lng,
      };
    });
    citiesLoaded = true;
    console.log(`[ScoutWorker] Cities loaded: ${CITIES.length}`);
  })();

  return citiesLoadPromise;
}

// ============================================================================
// Cross-Origin Isolation Detection
// ============================================================================

/**
 * Check if the browser supports SharedArrayBuffer (required for Rayon parallelism)
 * This requires COOP/COEP headers to be set on the server
 */
function isCrossOriginIsolated(): boolean {
  // Modern browsers expose this property when headers are correctly set
  if (typeof self !== 'undefined' && 'crossOriginIsolated' in self) {
    return (self as any).crossOriginIsolated === true;
  }

  // Fallback: try to create a SharedArrayBuffer
  try {
    new SharedArrayBuffer(1);
    return true;
  } catch {
    return false;
  }
}

// Helper to emit progress updates
function emitProgress(
  id: string,
  percent: number,
  phase: 'initializing' | 'computing' | 'aggregating',
  detail?: string
): void {
  const result: ScoutWorkerResult = {
    type: 'progress',
    id,
    percent: Math.round(percent),
    phase,
    detail,
  };
  self.postMessage(result);
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
// WASM Loading
// ============================================================================

async function loadWasm(): Promise<boolean> {
  try {
    // Dynamic import of the WASM module (same as main thread)
    const wasm = await import('../../../astro-core/pkg/astro_core');

    // Initialize WASM
    if (typeof wasm.default === 'function') {
      await wasm.default();
    }

    wasmModule = wasm;
    console.log('[Scout Worker] WASM C2 algorithm loaded successfully');

    // Try to initialize Rayon thread pool if available and browser supports it
    if (isCrossOriginIsolated()) {
      try {
        if (typeof wasm.is_parallel_available === 'function' && wasm.is_parallel_available()) {
          // Initialize with navigator.hardwareConcurrency threads (or 4 as fallback)
          const numThreads = typeof navigator !== 'undefined'
            ? (navigator.hardwareConcurrency || 4)
            : 4;

          if (typeof wasm.init_thread_pool === 'function') {
            await wasm.init_thread_pool(numThreads);
            isParallelReady = true;
            console.log(`[Scout Worker] Rayon parallel processing enabled with ${numThreads} threads`);
          }
        }
      } catch (parallelError) {
        console.warn('[Scout Worker] Parallel processing not available:', parallelError);
        isParallelReady = false;
      }
    } else {
      console.log('[Scout Worker] SharedArrayBuffer not available - using single-threaded WASM');
    }

    return true;
  } catch (error) {
    console.warn('[Scout Worker] WASM load failed, using TypeScript fallback:', error);
    return false;
  }
}

// ============================================================================
// WASM Helper Functions
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
      points: line.points.map(([lat, lng]) => [lat, lng]),
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
      points: line.points.map(([lat, lng]) => [lat, lng]),
    });
  }

  return lines;
}

interface WasmCityRanking {
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

// ============================================================================
// Scout Functions (WASM C2)
// ============================================================================

function scoutCategoryWasm(
  category: LifeCategory,
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  requestId?: string
): { rankings: CityRanking[]; totalBeneficial: number; totalChallenging: number } | null {
  if (!wasmModule || !isWasmReady) return null;

  try {
    const citiesJson = CITIES.map(c => ({
      name: c.name,
      country: c.country,
      lat: c.lat,
      lon: c.lng,
    }));
    const linesJson = convertLinesToWasmFormat(planetaryLines, aspectLines);
    const configJson = {
      kernel_type: 1, // Gaussian
      kernel_parameter: 150,
      max_distance_km: 500,
    };

    let wasmResults: WasmCityRanking[];

    // Try parallel version first if available (fastest)
    if (isParallelReady && typeof wasmModule.scout_cities_for_category_parallel === 'function') {
      if (requestId) emitProgress(requestId, 10, 'initializing', 'Using parallel processing...');

      wasmResults = wasmModule.scout_cities_for_category_parallel(
        citiesJson,
        linesJson,
        categoryToWasm[category],
        WasmSortMode.BalancedBenefit,
        configJson
      );

      if (requestId) emitProgress(requestId, 80, 'aggregating', 'Processing results...');
    }
    // Use progress callback version if requestId provided and function available
    else if (requestId && typeof wasmModule.scout_cities_for_category_with_progress === 'function') {
      // Create progress callback that forwards to main thread
      const progressCallback = (percent: number, phase: string, detail: string) => {
        emitProgress(requestId, percent, phase as 'initializing' | 'computing' | 'aggregating', detail);
      };

      wasmResults = wasmModule.scout_cities_for_category_with_progress(
        citiesJson,
        linesJson,
        categoryToWasm[category],
        WasmSortMode.BalancedBenefit,
        configJson,
        progressCallback
      );
    } else {
      // Fallback to non-progress version
      if (requestId) emitProgress(requestId, 10, 'initializing', 'Preparing data...');
      if (requestId) emitProgress(requestId, 30, 'computing', 'Analyzing locations...');

      wasmResults = wasmModule.scout_cities_for_category(
        citiesJson,
        linesJson,
        categoryToWasm[category],
        WasmSortMode.BalancedBenefit,
        configJson
      );

      if (requestId) emitProgress(requestId, 80, 'aggregating', 'Processing results...');
    }

    // Convert WASM results to CityRanking format
    const rankings: CityRanking[] = wasmResults
      .filter(r => r.top_influences.length > 0)
      .map(r => ({
        cityName: r.city_name,
        country: r.country,
        latitude: r.latitude,
        longitude: r.longitude,
        benefitScore: Math.round((r.benefit_score + 2) * 25), // Normalize -2..+2 to 0..100
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
          ? Math.min(...r.top_influences.map(([, , d]) => d))
          : 0,
      }));

    const totalBeneficial = rankings.filter(r => r.nature === 'beneficial').length;
    const totalChallenging = rankings.filter(r => r.nature === 'challenging').length;

    return { rankings, totalBeneficial, totalChallenging };
  } catch (error) {
    console.warn('[Scout Worker] WASM category scout failed:', error);
    return null;
  }
}

function scoutOverallWasm(
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  requestId?: string
): OverallCityRanking[] | null {
  if (!wasmModule || !isWasmReady) return null;

  try {
    if (requestId) emitProgress(requestId, 5, 'initializing', 'Preparing data...');

    const citiesJson = CITIES.map(c => ({
      name: c.name,
      country: c.country,
      lat: c.lat,
      lon: c.lng,
    }));
    const linesJson = convertLinesToWasmFormat(planetaryLines, aspectLines);
    const configJson = {
      kernel_type: 1, // Gaussian
      kernel_parameter: 150,
      max_distance_km: 500,
    };

    if (requestId) emitProgress(requestId, 10, 'computing', 'Starting analysis...');

    // Run all categories with progress updates
    const categoryResults: { category: LifeCategory; results: WasmCityRanking[] }[] = [];
    const categoryLabels: Record<LifeCategory, string> = {
      career: 'Career',
      love: 'Love',
      health: 'Health',
      home: 'Home',
      wellbeing: 'Wellbeing',
      wealth: 'Wealth',
    };

    for (let i = 0; i < CATEGORIES.length; i++) {
      const category = CATEGORIES[i];
      // Progress: 10% to 70% across 6 categories (10% per category)
      const progressPercent = 10 + (i * 10);
      if (requestId) emitProgress(requestId, progressPercent, 'computing', `Analyzing ${categoryLabels[category]}...`);

      const results: WasmCityRanking[] = wasmModule.scout_cities_for_category(
        citiesJson,
        linesJson,
        categoryToWasm[category],
        WasmSortMode.BalancedBenefit,
        configJson
      );
      categoryResults.push({ category, results: results || [] });
    }

    if (requestId) emitProgress(requestId, 75, 'aggregating', 'Ranking locations...');

    // Aggregate scores per city
    const cityScoresMap = new Map<
      string,
      {
        city: { name: string; country: string; lat: number; lng: number };
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
        const rankingMinDistance = Math.min(
          ...ranking.top_influences.map(([, , dist]) => dist)
        );

        if (!cityScoresMap.has(key)) {
          cityScoresMap.set(key, {
            city: {
              name: ranking.city_name,
              country: ranking.country,
              lat: ranking.latitude,
              lng: ranking.longitude,
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
          totalScore: Math.round(totalScore),
          averageScore: Math.round(totalScore / categoryScores.length),
          categoryScores,
          beneficialCategories: beneficialCount,
          challengingCategories: challengingCount,
          minDistanceKm: Math.round(cityData.minDistance),
        });
      }
    }

    if (requestId) emitProgress(requestId, 95, 'aggregating', 'Finalizing results...');

    overallRankings.sort((a, b) => b.totalScore - a.totalScore);
    return overallRankings;
  } catch (error) {
    console.warn('[Scout Worker] WASM overall scout failed:', error);
    return null;
  }
}

// ============================================================================
// Scout Functions (TypeScript C2 - Fallback)
// ============================================================================

function scoutCategoryTS(
  category: LifeCategory,
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  config: ScoringConfig,
  requestId?: string
): { rankings: CityRanking[]; totalBeneficial: number; totalChallenging: number } {
  const lineRatings = getDefaultLineRatings();

  if (requestId) emitProgress(requestId, 5, 'initializing', 'Preparing data...');

  // Pre-compute optimized lines with bounding boxes for fast spatial filtering
  // This is a one-time O(lines) cost that saves O(cities * lines) expensive calculations
  const optimizedPlanetaryLines = createOptimizedPlanetaryLines(planetaryLines, config.maxDistanceKm);
  const optimizedAspectLines = createOptimizedAspectLines(aspectLines, config.maxDistanceKm);

  if (requestId) emitProgress(requestId, 10, 'initializing', 'Spatial index ready...');

  // Build influences for all cities with progress and spatial pre-filtering
  const totalCities = CITIES.length;
  const cityInfluences: CityInfluenceSet[] = [];
  const progressInterval = Math.max(1, Math.floor(totalCities / 20)); // Report every 5%

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

    // Emit progress every 5% of cities (10% to 80% range)
    if (requestId && i > 0 && i % progressInterval === 0) {
      const percent = 10 + Math.floor((i / totalCities) * 70);
      emitProgress(requestId, percent, 'computing', `Analyzing cities... (${Math.round((i / totalCities) * 100)}%)`);
    }
  }

  if (requestId) emitProgress(requestId, 85, 'aggregating', 'Ranking locations...');

  // Rank cities for the category
  const rankings = rankCitiesByCategory(cityInfluences, category, config, 'balanced');

  if (requestId) emitProgress(requestId, 95, 'aggregating', 'Finalizing...');

  // Count beneficial/challenging
  const totalBeneficial = rankings.filter(r => r.nature === 'beneficial').length;
  const totalChallenging = rankings.filter(r => r.nature === 'challenging').length;

  return { rankings, totalBeneficial, totalChallenging };
}

function scoutOverallTS(
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  config: ScoringConfig,
  requestId?: string
): OverallCityRanking[] {
  const lineRatings = getDefaultLineRatings();

  if (requestId) emitProgress(requestId, 5, 'initializing', 'Preparing data...');

  // Pre-compute optimized lines with bounding boxes for fast spatial filtering
  const optimizedPlanetaryLines = createOptimizedPlanetaryLines(planetaryLines, config.maxDistanceKm);
  const optimizedAspectLines = createOptimizedAspectLines(aspectLines, config.maxDistanceKm);

  if (requestId) emitProgress(requestId, 8, 'initializing', 'Spatial index ready...');

  // Build base influences for all cities (not category-filtered) with spatial pre-filtering
  const totalCities = CITIES.length;
  const cityInfluences: CityInfluenceSet[] = [];
  const progressInterval = Math.max(1, Math.floor(totalCities / 20)); // Report every 5%

  // Report progress during city influence building (10% to 50%)
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

    // Emit progress every 5% of cities
    if (requestId && i > 0 && i % progressInterval === 0) {
      const percent = 10 + Math.floor((i / totalCities) * 40); // 10% to 50%
      emitProgress(requestId, percent, 'computing', `Analyzing cities... (${Math.round((i / totalCities) * 100)}%)`);
    }
  }

  if (requestId) emitProgress(requestId, 55, 'computing', 'Scoring locations...');

  // Score each city across all categories
  const overallRankings: OverallCityRanking[] = [];

  for (let idx = 0; idx < cityInfluences.length; idx++) {
    const city = cityInfluences[idx];

    // Emit progress every 10% during scoring (55% to 90%)
    if (requestId && idx > 0 && idx % Math.floor(totalCities / 10) === 0) {
      const percent = 55 + Math.floor((idx / totalCities) * 35); // 55% to 90%
      emitProgress(requestId, percent, 'aggregating', `Ranking locations... (${Math.round((idx / totalCities) * 100)}%)`);
    }
    const categoryScores: OverallCityRanking['categoryScores'] = [];
    let totalScore = 0;
    let beneficialCategories = 0;
    let challengingCategories = 0;
    let minDistanceKm = Infinity;

    for (const category of CATEGORIES) {
      const filteredInfluences = filterInfluencesByCategory(city.influences, category);
      if (filteredInfluences.length === 0) continue;

      const filteredCity: CityInfluenceSet = {
        cityName: city.cityName,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
        influences: filteredInfluences,
      };

      const score = calculateCityScore(filteredCity, config);

      // Determine nature
      const beneficialCount = filteredInfluences.filter(i =>
        isBeneficialForCategory(i.planet, i.angle, category)
      ).length;
      const challengingCount = filteredInfluences.filter(i =>
        isChallengingForCategory(i.planet, i.angle, category)
      ).length;

      let nature: 'beneficial' | 'challenging' | 'mixed';
      if (beneficialCount > challengingCount) {
        nature = 'beneficial';
        beneficialCategories++;
      } else if (challengingCount > beneficialCount) {
        nature = 'challenging';
        challengingCategories++;
      } else {
        nature = 'mixed';
      }

      categoryScores.push({
        category,
        score: score.benefitScore,
        nature,
      });

      // Weight by nature for total score
      if (nature === 'beneficial') {
        totalScore += score.benefitScore;
      } else if (nature === 'challenging') {
        totalScore -= (score.benefitScore - 50) * 0.5; // Penalty for challenging
      }

      if (score.minDistanceKm < minDistanceKm) {
        minDistanceKm = score.minDistanceKm;
      }
    }

    // Only include cities with at least one category score
    if (categoryScores.length > 0) {
      categoryScores.sort((a, b) => b.score - a.score);

      overallRankings.push({
        cityName: city.cityName,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
        totalScore,
        averageScore: totalScore / categoryScores.length,
        categoryScores,
        beneficialCategories,
        challengingCategories,
        minDistanceKm,
      });
    }
  }

  if (requestId) emitProgress(requestId, 95, 'aggregating', 'Finalizing results...');

  // Sort by total score descending
  overallRankings.sort((a, b) => b.totalScore - a.totalScore);

  return overallRankings;
}

// ============================================================================
// Message Handler
// ============================================================================

self.onmessage = async (event: MessageEvent<ScoutWorkerMessage>) => {
  const message = event.data;

  switch (message.type) {
    case 'init': {
      // Load cities data dynamically (no longer bundled - saves ~3MB per worker)
      await ensureCitiesLoaded();
      // Always try to load WASM (it's faster when available)
      isWasmReady = await loadWasm();
      const crossOriginIsolated = isCrossOriginIsolated();
      const result: ScoutWorkerResult = {
        type: 'ready',
        backend: isWasmReady ? 'wasm' : 'typescript',
        parallel: isParallelReady,
        crossOriginIsolated,
      };
      self.postMessage(result);
      break;
    }

    case 'scoutCategory': {
      try {
        // Emit initial progress
        emitProgress(message.id, 0, 'initializing', 'Starting analysis...');

        // Try WASM first, fall back to TypeScript
        let scoutResult = scoutCategoryWasm(
          message.category,
          message.planetaryLines,
          message.aspectLines,
          message.id
        );

        let backend: 'wasm' | 'typescript' = 'wasm';

        if (!scoutResult) {
          // Fallback to TypeScript
          backend = 'typescript';
          const config: ScoringConfig = {
            ...getBalancedConfig(),
            ...message.config,
          };
          scoutResult = scoutCategoryTS(
            message.category,
            message.planetaryLines,
            message.aspectLines,
            config,
            message.id
          );
        }

        // Emit final progress
        emitProgress(message.id, 100, 'aggregating', 'Complete!');

        const result: ScoutWorkerResult = {
          type: 'categoryResult',
          id: message.id,
          category: message.category,
          rankings: scoutResult.rankings,
          totalBeneficial: scoutResult.totalBeneficial,
          totalChallenging: scoutResult.totalChallenging,
          backend,
        };
        self.postMessage(result);
      } catch (error) {
        const errorResult: ScoutWorkerResult = {
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
        // Emit initial progress
        emitProgress(message.id, 0, 'initializing', 'Starting analysis...');

        // Try WASM first, fall back to TypeScript
        let rankings = scoutOverallWasm(
          message.planetaryLines,
          message.aspectLines,
          message.id
        );

        let backend: 'wasm' | 'typescript' = 'wasm';

        if (!rankings) {
          // Fallback to TypeScript
          backend = 'typescript';
          const config: ScoringConfig = {
            ...getBalancedConfig(),
            ...message.config,
          };
          rankings = scoutOverallTS(
            message.planetaryLines,
            message.aspectLines,
            config,
            message.id
          );
        }

        // Emit final progress
        emitProgress(message.id, 100, 'aggregating', 'Complete!');

        const result: ScoutWorkerResult = {
          type: 'overallResult',
          id: message.id,
          rankings,
          backend,
        };
        self.postMessage(result);
      } catch (error) {
        const errorResult: ScoutWorkerResult = {
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

// Signal that worker is loaded
console.log('[Scout Worker] Initialized');
