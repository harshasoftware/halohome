/**
 * Benchmark Worker
 *
 * Runs WASM and TypeScript benchmarks in a background thread
 * to avoid blocking the main thread.
 */

import { loadCities, expandCity } from '@/data/geonames-cities';

// Types
interface LineData {
  planet: string;
  angle: string;
  rating: number;
  points: [number, number][];
}

interface BenchmarkMessage {
  type: 'run';
  lines: LineData[];
}

interface BenchmarkResult {
  wasmParallel: number | null;
  wasmSingle: number | null;
  typescript: number;
  numThreads: number;
  cityCount: number;
  lineCount: number;
}

interface BenchmarkResponse {
  type: 'result' | 'progress' | 'error';
  result?: BenchmarkResult;
  phase?: string;
  error?: string;
}

// WASM Category Enum (must match Rust)
enum WasmLifeCategory {
  Career = 0,
  Love = 1,
  Health = 2,
  Home = 3,
  Wellbeing = 4,
  Wealth = 5,
}

// Constants
const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;

// Haversine distance
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const lat1Rad = lat1 * DEG_TO_RAD;
  const lat2Rad = lat2 * DEG_TO_RAD;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const a = sinDLat * sinDLat + Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinDLng * sinDLng;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Distance to polyline
function distanceToPolyline(lat: number, lng: number, points: [number, number][]): number {
  let minDist = Infinity;
  for (const [pLat, pLng] of points) {
    const dist = haversineKm(lat, lng, pLat, pLng);
    if (dist < minDist) minDist = dist;
  }
  return minDist;
}

// Gaussian kernel
function applyKernel(distance: number, sigma: number): number {
  return Math.exp(-(distance * distance) / (2 * sigma * sigma));
}

// TypeScript benchmark implementation
function runTypeScriptBenchmark(
  cities: Array<{ name: string; lat: number; lon: number }>,
  lines: LineData[]
): number {
  const start = performance.now();
  const sigma = 150;
  const maxDistanceKm = 500;

  for (const city of cities) {
    let score = 0;
    for (const line of lines) {
      const distance = distanceToPolyline(city.lat, city.lon, line.points);
      if (distance <= maxDistanceKm) {
        const kernel = applyKernel(distance, sigma);
        const benefit = (line.rating - 3) * kernel;
        score += benefit;
      }
    }
  }

  return performance.now() - start;
}

// WASM module reference
let wasmModule: any = null;
let isParallel = false;
let numThreads = 1;

// Check if SharedArrayBuffer is available (required for parallel WASM)
function isSharedArrayBufferAvailable(): boolean {
  try {
    return typeof SharedArrayBuffer !== 'undefined' &&
           typeof crossOriginIsolated !== 'undefined' &&
           crossOriginIsolated;
  } catch {
    return false;
  }
}

async function initWasm(): Promise<void> {
  if (wasmModule) return;

  try {
    console.log('[BenchmarkWorker] Loading WASM module...');
    const wasm = await import('../../../astro-core/pkg/astro_core');
    if (typeof wasm.default === 'function') {
      await wasm.default();
    }
    wasmModule = wasm;

    // Check parallel availability - MUST have SharedArrayBuffer
    const hasSharedArrayBuffer = isSharedArrayBufferAvailable();
    console.log(`[BenchmarkWorker] SharedArrayBuffer available: ${hasSharedArrayBuffer}`);

    if (hasSharedArrayBuffer && typeof wasm.is_parallel_available === 'function' && wasm.is_parallel_available()) {
      numThreads = navigator.hardwareConcurrency || 4;

      try {
        if (typeof wasm.initThreadPool === 'function') {
          await wasm.initThreadPool(numThreads);
          console.log(`[BenchmarkWorker] WASM parallel initialized with ${numThreads} threads`);
        }
        isParallel = true;
      } catch (e) {
        // Thread pool may already be initialized
        console.log('[BenchmarkWorker] Thread pool already initialized');
        isParallel = true;
      }
    } else {
      console.log('[BenchmarkWorker] Parallel WASM not available - using single-threaded');
      isParallel = false;
    }
  } catch (e) {
    console.warn('[BenchmarkWorker] Failed to load WASM:', e);
    throw e;
  }
}

async function runBenchmark(lines: LineData[]): Promise<BenchmarkResult> {
  console.log('[BenchmarkWorker] Starting benchmark...');

  // Load cities dynamically (no longer bundled - saves ~3MB)
  const geoCities = await loadCities();
  const cities = geoCities.map((c) => {
    const expanded = expandCity(c);
    return {
      name: expanded.name,
      country: expanded.countryCode,
      lat: expanded.lat,
      lon: expanded.lng,
    };
  });

  console.log(`[BenchmarkWorker] Using ${cities.length} cities, ${lines.length} lines`);

  let wasmParallelTime: number | null = null;
  let wasmSingleTime: number | null = null;
  let typescriptTime: number = 0;

  // Initialize WASM
  await initWasm();

  const wasmConfig = { kernel_type: 1, kernel_parameter: 150, max_distance_km: 500 };

  // Run WASM Parallel benchmark (use optimized fast version if available)
  if (wasmModule && isParallel) {
    try {
      self.postMessage({ type: 'progress', phase: 'WASM Parallel (Fast)' } as BenchmarkResponse);
      console.log('[BenchmarkWorker] Running WASM Parallel (Fast)...');
      const start = performance.now();
      // Prefer optimized fast parallel, fall back to original
      if (typeof wasmModule.scout_cities_fast_parallel === 'function') {
        wasmModule.scout_cities_fast_parallel(
          cities,
          lines,
          WasmLifeCategory.Career,
          2, // BalancedBenefit
          wasmConfig
        );
      } else {
        wasmModule.scout_cities_for_category_parallel(
          cities,
          lines,
          WasmLifeCategory.Career,
          2, // BalancedBenefit
          wasmConfig
        );
      }
      wasmParallelTime = performance.now() - start;
      console.log(`[BenchmarkWorker] WASM Parallel (Fast): ${wasmParallelTime.toFixed(1)}ms`);
    } catch (e) {
      console.warn('[BenchmarkWorker] WASM Parallel failed:', e);
    }
  }

  // Run WASM Single benchmark (use optimized fast version if available)
  if (wasmModule) {
    try {
      self.postMessage({ type: 'progress', phase: 'WASM Single (Fast)' } as BenchmarkResponse);
      console.log('[BenchmarkWorker] Running WASM Single (Fast)...');
      const start = performance.now();
      // Prefer optimized fast single-threaded, fall back to original
      if (typeof wasmModule.scout_cities_fast === 'function') {
        wasmModule.scout_cities_fast(
          cities,
          lines,
          WasmLifeCategory.Career,
          2,
          wasmConfig
        );
      } else {
        wasmModule.scout_cities_for_category(
          cities,
          lines,
          WasmLifeCategory.Career,
          2,
          wasmConfig
        );
      }
      wasmSingleTime = performance.now() - start;
      console.log(`[BenchmarkWorker] WASM Single (Fast): ${wasmSingleTime.toFixed(1)}ms`);
    } catch (e) {
      console.warn('[BenchmarkWorker] WASM Single failed:', e);
    }
  }

  // Run TypeScript benchmark
  self.postMessage({ type: 'progress', phase: 'TypeScript' } as BenchmarkResponse);
  console.log('[BenchmarkWorker] Running TypeScript...');
  typescriptTime = runTypeScriptBenchmark(cities, lines);
  console.log(`[BenchmarkWorker] TypeScript: ${typescriptTime.toFixed(1)}ms`);

  return {
    wasmParallel: wasmParallelTime,
    wasmSingle: wasmSingleTime,
    typescript: typescriptTime,
    numThreads,
    cityCount: cities.length,
    lineCount: lines.length,
  };
}

// Message handler
self.onmessage = async (event: MessageEvent<BenchmarkMessage>) => {
  const { type, lines } = event.data;

  if (type === 'run') {
    try {
      const result = await runBenchmark(lines);
      self.postMessage({ type: 'result', result } as BenchmarkResponse);
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error instanceof Error ? error.message : String(error),
      } as BenchmarkResponse);
    }
  }
};

console.log('[BenchmarkWorker] Worker initialized');
