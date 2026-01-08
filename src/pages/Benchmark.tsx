/**
 * Scout Algorithm Benchmark Page
 *
 * Compares performance of:
 * - WASM Parallel (rayon thread pool)
 * - WASM Single-threaded
 * - TypeScript implementation
 *
 * Run with: npm run dev, then navigate to /benchmark
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadCities, expandCity } from '@/data/geonames-cities';
import {
  distanceToPolyline,
  getBalancedConfig,
  applyKernel,
  type LifeCategory,
  isBeneficialForCategory,
  isChallengingForCategory,
} from '@/features/globe/utils/scout-algorithm-c2';

// ============================================================================
// Types
// ============================================================================

interface BenchmarkResult {
  parallel: Record<string, number[]>;
  wasm: Record<string, number[]>;
  typescript: Record<string, number[]>;
}

interface Averages {
  parallel: Record<string, number | null>;
  wasm: Record<string, number | null>;
  typescript: Record<string, number>;
}

type LogType = 'info' | 'success' | 'error' | 'warning';

interface LogEntry {
  time: string;
  message: string;
  type: LogType;
}

// ============================================================================
// Constants
// ============================================================================

const CATEGORIES = ['career', 'love', 'health', 'home', 'wellbeing', 'wealth'] as const;
type Category = typeof CATEGORIES[number];

const CATEGORY_ENUM: Record<Category, number> = {
  career: 0,
  love: 1,
  health: 2,
  home: 3,
  wellbeing: 4,
  wealth: 5,
};

// ============================================================================
// Haversine Distance (for TypeScript benchmark)
// ============================================================================

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ============================================================================
// Test Data Generation
// ============================================================================

function generateTestLines(count: number) {
  const planets = ['Sun', 'Moon', 'Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];
  const angles = ['MC', 'ASC', 'DSC', 'IC'];
  const lines: Array<{
    planet: string;
    angle: string;
    rating: number;
    aspect: null;
    points: [number, number][];
  }> = [];

  for (let i = 0; i < count; i++) {
    const planet = planets[i % planets.length];
    const angle = angles[i % angles.length];
    const points: [number, number][] = [];

    for (let lat = -80; lat <= 80; lat += 5) {
      const lng = (Math.random() * 360) - 180;
      points.push([lat, lng]);
    }

    lines.push({
      planet,
      angle,
      rating: Math.floor(Math.random() * 5) + 1,
      aspect: null,
      points,
    });
  }

  return lines;
}

// ============================================================================
// Benchmark Page Component
// ============================================================================

export default function Benchmark() {
  // State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState({ percent: 0, text: '' });

  // Environment state
  const [env, setEnv] = useState({
    crossOriginIsolated: false,
    sharedArrayBuffer: false,
    threads: 0,
    parallelAvailable: false,
  });

  // Results state
  const [results, setResults] = useState<{
    averages: Averages | null;
    totals: { parallel: number; wasm: number; typescript: number } | null;
  }>({ averages: null, totals: null });

  // Config
  const [iterations, setIterations] = useState(3);
  const [cityCount, setCityCount] = useState(5000);

  // WASM module ref
  const wasmRef = useRef<any>(null);
  const isParallelRef = useRef(false);

  // Logging helper
  const log = useCallback((message: string, type: LogType = 'info') => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { time, message, type }]);
    console.log(`[${type}] ${message}`);
  }, []);

  // ============================================================================
  // Environment Check & WASM Loading
  // ============================================================================

  useEffect(() => {
    async function init() {
      log('Initializing benchmark...');

      // Check environment
      const isCOI = typeof self !== 'undefined' && (self as any).crossOriginIsolated === true;
      let hasSAB = false;
      try {
        new SharedArrayBuffer(1);
        hasSAB = true;
      } catch { }

      const threads = navigator.hardwareConcurrency || 4;

      setEnv(prev => ({
        ...prev,
        crossOriginIsolated: isCOI,
        sharedArrayBuffer: hasSAB,
        threads,
      }));

      if (!isCOI) {
        log('Cross-Origin Isolation not enabled. Parallel WASM requires COOP/COEP headers.', 'warning');
      }

      // Load WASM module
      try {
        log('Loading WASM module...');
        const wasm = await import('@/astro-core/pkg/astro_core');

        if (typeof wasm.default === 'function') {
          await wasm.default();
        }

        wasmRef.current = wasm;
        log('WASM module loaded successfully', 'success');

        // Check parallel availability
        if (typeof wasm.is_parallel_available === 'function') {
          const parallelAvailable = wasm.is_parallel_available();

          if (parallelAvailable && typeof wasm.initThreadPool === 'function' && hasSAB) {
            log(`Initializing rayon thread pool with ${threads} threads...`);
            try {
              await wasm.initThreadPool(threads);
              isParallelRef.current = true;
              setEnv(prev => ({ ...prev, parallelAvailable: true }));
              log(`Rayon parallel processing enabled with ${threads} threads`, 'success');
            } catch (error: any) {
              log(`Failed to initialize thread pool: ${error.message}`, 'error');
            }
          } else {
            log('Parallel WASM not available (missing SharedArrayBuffer or rayon)', 'warning');
          }
        }

        setIsInitialized(true);
      } catch (error: any) {
        log(`Failed to load WASM: ${error.message}`, 'error');
      }
    }

    init();
  }, [log]);

  // ============================================================================
  // Benchmark Functions
  // ============================================================================

  const benchmarkParallelWasm = useCallback((cities: any[], lines: any[], category: Category): number | null => {
    if (!wasmRef.current || !isParallelRef.current) return null;

    const config = { kernel_type: 1, kernel_parameter: 150, max_distance_km: 500 };
    const start = performance.now();

    try {
      wasmRef.current.scout_cities_for_category_parallel(
        cities,
        lines,
        CATEGORY_ENUM[category],
        2, // BalancedBenefit
        config
      );
      return performance.now() - start;
    } catch (error: any) {
      log(`Parallel WASM error: ${error.message}`, 'error');
      return null;
    }
  }, [log]);

  const benchmarkSingleWasm = useCallback((cities: any[], lines: any[], category: Category): number | null => {
    if (!wasmRef.current) return null;

    const config = { kernel_type: 1, kernel_parameter: 150, max_distance_km: 500 };
    const start = performance.now();

    try {
      wasmRef.current.scout_cities_for_category(
        cities,
        lines,
        CATEGORY_ENUM[category],
        2,
        config
      );
      return performance.now() - start;
    } catch (error: any) {
      log(`Single WASM error: ${error.message}`, 'error');
      return null;
    }
  }, [log]);

  const benchmarkTypeScript = useCallback((cities: any[], lines: any[], category: Category): number => {
    const start = performance.now();
    const config = getBalancedConfig();

    // Full TypeScript implementation matching WASM:
    // 1. Compute distance to ALL lines (no early category filtering)
    // 2. Filter by distance
    // 3. Apply category filtering AFTER distance calculation
    // This matches how WASM works for fair comparison
    const results: Array<{ city: string; score: number }> = [];

    for (const city of cities) {
      const cityLat = city.lat;
      const cityLon = city.lng || city.lon;

      // Collect ALL influences first (like WASM does)
      const influences: Array<{ planet: string; angle: string; distance: number; kernel: number; rating: number }> = [];

      for (const line of lines) {
        const planet = line.planet || 'Sun';
        const angle = line.angle || 'MC';

        // Compute distance for ALL lines (no early exit - matches WASM)
        const distance = distanceToPolyline(cityLat, cityLon, line.points);

        if (distance <= config.maxDistanceKm) {
          const kernel = applyKernel(distance, config);
          const rating = line.rating || 3;
          influences.push({ planet, angle, distance, kernel, rating });
        }
      }

      // NOW filter by category (like WASM does after collecting all influences)
      let score = 0;
      for (const inf of influences) {
        const isRelevant = isBeneficialForCategory(inf.planet, inf.angle, category as LifeCategory) ||
                          isChallengingForCategory(inf.planet, inf.angle, category as LifeCategory);
        if (isRelevant) {
          const benefit = (inf.rating - 3) * inf.kernel;
          score += benefit;
        }
      }

      results.push({ city: city.name, score });
    }

    results.sort((a, b) => b.score - a.score);
    return performance.now() - start;
  }, []);

  // ============================================================================
  // Run Benchmark
  // ============================================================================

  const runBenchmark = useCallback(async () => {
    if (!isInitialized || isRunning) return;

    setIsRunning(true);
    setResults({ averages: null, totals: null });
    log(`Starting benchmark: ${iterations} iterations, ${cityCount} cities`);

    // Prepare test data - load cities dynamically then use specified count
    setProgress({ percent: 0, text: 'Loading cities data...' });
    const geoCities = await loadCities();
    const cities = geoCities.slice(0, cityCount).map(c => {
      const expanded = expandCity(c);
      return {
        name: expanded.name,
        country: expanded.countryCode,
        lat: expanded.lat,
        lon: expanded.lng,
      };
    });
    const lines = generateTestLines(28); // 7 planets * 4 angles

    log(`Using ${cities.length} cities and ${lines.length} lines`);

    const benchResults: BenchmarkResult = {
      parallel: {},
      wasm: {},
      typescript: {},
    };

    const totalSteps = CATEGORIES.length * iterations * 3;
    let currentStep = 0;

    for (const category of CATEGORIES) {
      benchResults.parallel[category] = [];
      benchResults.wasm[category] = [];
      benchResults.typescript[category] = [];

      for (let i = 0; i < iterations; i++) {
        // Parallel WASM
        setProgress({
          percent: (++currentStep / totalSteps) * 100,
          text: `${category} - Parallel WASM (${i + 1}/${iterations})`,
        });
        await new Promise(r => setTimeout(r, 10));

        const parallelTime = benchmarkParallelWasm(cities, lines, category);
        if (parallelTime !== null) {
          benchResults.parallel[category].push(parallelTime);
        }

        // Single WASM
        setProgress({
          percent: (++currentStep / totalSteps) * 100,
          text: `${category} - Single WASM (${i + 1}/${iterations})`,
        });
        await new Promise(r => setTimeout(r, 10));

        const wasmTime = benchmarkSingleWasm(cities, lines, category);
        if (wasmTime !== null) {
          benchResults.wasm[category].push(wasmTime);
        }

        // TypeScript
        setProgress({
          percent: (++currentStep / totalSteps) * 100,
          text: `${category} - TypeScript (${i + 1}/${iterations})`,
        });
        await new Promise(r => setTimeout(r, 10));

        const tsTime = benchmarkTypeScript(cities, lines, category);
        benchResults.typescript[category].push(tsTime);
      }
    }

    // Calculate averages
    const averages: Averages = {
      parallel: {},
      wasm: {},
      typescript: {},
    };

    let totalParallel = 0;
    let totalWasm = 0;
    let totalTs = 0;

    for (const category of CATEGORIES) {
      const avgParallel = benchResults.parallel[category].length > 0
        ? benchResults.parallel[category].reduce((a, b) => a + b, 0) / benchResults.parallel[category].length
        : null;
      const avgWasm = benchResults.wasm[category].length > 0
        ? benchResults.wasm[category].reduce((a, b) => a + b, 0) / benchResults.wasm[category].length
        : null;
      const avgTs = benchResults.typescript[category].reduce((a, b) => a + b, 0) / benchResults.typescript[category].length;

      averages.parallel[category] = avgParallel;
      averages.wasm[category] = avgWasm;
      averages.typescript[category] = avgTs;

      if (avgParallel) totalParallel += avgParallel;
      if (avgWasm) totalWasm += avgWasm;
      totalTs += avgTs;
    }

    setResults({
      averages,
      totals: { parallel: totalParallel, wasm: totalWasm, typescript: totalTs },
    });

    log('Benchmark complete!', 'success');
    log(`Total times - Parallel: ${totalParallel.toFixed(1)}ms, WASM: ${totalWasm.toFixed(1)}ms, TS: ${totalTs.toFixed(1)}ms`);

    if (totalParallel > 0 && totalWasm > 0) {
      const speedup = (totalWasm / totalParallel).toFixed(2);
      log(`Parallel speedup over single-threaded: ${speedup}x`, 'success');
    }

    setProgress({ percent: 100, text: 'Complete!' });
    setIsRunning(false);
  }, [isInitialized, isRunning, iterations, cityCount, log, benchmarkParallelWasm, benchmarkSingleWasm, benchmarkTypeScript]);

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-zinc-100 p-8">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-3xl font-semibold mb-2">Scout Algorithm Benchmark</h1>
        <p className="text-zinc-500 mb-8">Compare WASM Parallel (Rayon), WASM Single-threaded, and TypeScript</p>

        {/* Environment Status */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatusCard
            title="Cross-Origin Isolated"
            value={env.crossOriginIsolated ? 'Enabled' : 'Disabled'}
            status={env.crossOriginIsolated ? 'success' : 'error'}
          />
          <StatusCard
            title="SharedArrayBuffer"
            value={env.sharedArrayBuffer ? 'Available' : 'Unavailable'}
            status={env.sharedArrayBuffer ? 'success' : 'error'}
          />
          <StatusCard
            title="Hardware Threads"
            value={env.threads.toString()}
            status="info"
          />
          <StatusCard
            title="WASM Parallel"
            value={env.parallelAvailable ? `${env.threads} threads` : 'Not available'}
            status={env.parallelAvailable ? 'success' : 'error'}
          />
        </div>

        {/* Controls */}
        <div className="flex flex-wrap gap-4 mb-8">
          <button
            onClick={runBenchmark}
            disabled={!isInitialized || isRunning}
            className="px-6 py-3 bg-amber-500 text-black font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-amber-400 transition-colors"
          >
            {isRunning ? 'Running...' : 'Run Benchmark'}
          </button>

          <select
            value={iterations}
            onChange={e => setIterations(parseInt(e.target.value))}
            className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg"
          >
            <option value={1}>1 iteration</option>
            <option value={3}>3 iterations</option>
            <option value={5}>5 iterations</option>
            <option value={10}>10 iterations</option>
          </select>

          <select
            value={cityCount}
            onChange={e => setCityCount(parseInt(e.target.value))}
            className="px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg"
          >
            <option value={1000}>1,000 cities</option>
            <option value={5000}>5,000 cities</option>
            <option value={10000}>10,000 cities</option>
            <option value={20000}>20,000 cities</option>
            <option value={33000}>All 33,000 cities</option>
          </select>
        </div>

        {/* Progress */}
        {isRunning && (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
            <p className="text-sm text-zinc-400 mb-2">{progress.text}</p>
            <div className="h-2 bg-zinc-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 transition-all duration-300"
                style={{ width: `${progress.percent}%` }}
              />
            </div>
          </div>
        )}

        {/* Results */}
        {results.totals && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <ResultCard
                title="WASM Parallel"
                value={results.totals.parallel > 0 ? `${results.totals.parallel.toFixed(1)}ms` : 'N/A'}
                color="green"
              />
              <ResultCard
                title="WASM Single"
                value={results.totals.wasm > 0 ? `${results.totals.wasm.toFixed(1)}ms` : 'N/A'}
                color="blue"
              />
              <ResultCard
                title="TypeScript"
                value={`${results.totals.typescript.toFixed(1)}ms`}
                color="purple"
              />
              <ResultCard
                title="Parallel Speedup"
                value={results.totals.parallel > 0 && results.totals.wasm > 0
                  ? `${(results.totals.wasm / results.totals.parallel).toFixed(2)}x`
                  : 'N/A'}
                color="amber"
              />
            </div>

            {/* Detailed Results */}
            {results.averages && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4">Detailed Results</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="text-left text-zinc-500 text-sm border-b border-zinc-800">
                        <th className="pb-3 pr-4">Category</th>
                        <th className="pb-3 pr-4">Parallel</th>
                        <th className="pb-3 pr-4">Single WASM</th>
                        <th className="pb-3 pr-4">TypeScript</th>
                        <th className="pb-3">Speedup</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CATEGORIES.map(category => {
                        const parallel = results.averages!.parallel[category];
                        const wasm = results.averages!.wasm[category];
                        const ts = results.averages!.typescript[category];

                        const times = [
                          { name: 'parallel', time: parallel },
                          { name: 'wasm', time: wasm },
                          { name: 'ts', time: ts },
                        ].filter(t => t.time !== null);
                        const fastest = times.length > 0
                          ? times.reduce((a, b) => ((a.time ?? Infinity) < (b.time ?? Infinity) ? a : b))
                          : null;

                        return (
                          <tr key={category} className="border-b border-zinc-800/50">
                            <td className="py-3 pr-4 capitalize">{category}</td>
                            <td className="py-3 pr-4">
                              <span className={fastest?.name === 'parallel' ? 'text-green-400 font-medium' : ''}>
                                {parallel !== null ? `${parallel.toFixed(2)}ms` : 'N/A'}
                              </span>
                              {fastest?.name === 'parallel' && (
                                <span className="ml-2 text-xs bg-green-500/20 text-green-400 px-2 py-0.5 rounded">
                                  Fastest
                                </span>
                              )}
                            </td>
                            <td className="py-3 pr-4">
                              <span className={fastest?.name === 'wasm' ? 'text-blue-400 font-medium' : ''}>
                                {wasm !== null ? `${wasm.toFixed(2)}ms` : 'N/A'}
                              </span>
                              {fastest?.name === 'wasm' && (
                                <span className="ml-2 text-xs bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded">
                                  Fastest
                                </span>
                              )}
                            </td>
                            <td className="py-3 pr-4">
                              <span className={fastest?.name === 'ts' ? 'text-purple-400 font-medium' : ''}>
                                {ts.toFixed(2)}ms
                              </span>
                              {fastest?.name === 'ts' && (
                                <span className="ml-2 text-xs bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded">
                                  Fastest
                                </span>
                              )}
                            </td>
                            <td className="py-3">
                              {parallel !== null && wasm !== null
                                ? `${(wasm / parallel).toFixed(2)}x`
                                : 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Visual Chart */}
            {results.averages && (
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-8">
                <h3 className="text-lg font-semibold mb-4">Performance Comparison</h3>
                <div className="space-y-4">
                  {CATEGORIES.map(category => {
                    const parallel = results.averages!.parallel[category] || 0;
                    const wasm = results.averages!.wasm[category] || 0;
                    const ts = results.averages!.typescript[category];
                    const maxTime = Math.max(parallel, wasm, ts);

                    return (
                      <div key={category} className="space-y-2">
                        <p className="text-sm text-zinc-400 capitalize">{category}</p>
                        <div className="flex gap-2 items-center">
                          <div className="w-24 text-xs text-zinc-500">Parallel</div>
                          <div className="flex-1 h-6 bg-zinc-800 rounded overflow-hidden">
                            <div
                              className="h-full bg-green-500 transition-all duration-500"
                              style={{ width: `${(parallel / maxTime) * 100}%` }}
                            />
                          </div>
                          <div className="w-20 text-xs text-right">{parallel > 0 ? `${parallel.toFixed(1)}ms` : 'N/A'}</div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="w-24 text-xs text-zinc-500">Single</div>
                          <div className="flex-1 h-6 bg-zinc-800 rounded overflow-hidden">
                            <div
                              className="h-full bg-blue-500 transition-all duration-500"
                              style={{ width: `${(wasm / maxTime) * 100}%` }}
                            />
                          </div>
                          <div className="w-20 text-xs text-right">{wasm > 0 ? `${wasm.toFixed(1)}ms` : 'N/A'}</div>
                        </div>
                        <div className="flex gap-2 items-center">
                          <div className="w-24 text-xs text-zinc-500">TypeScript</div>
                          <div className="flex-1 h-6 bg-zinc-800 rounded overflow-hidden">
                            <div
                              className="h-full bg-purple-500 transition-all duration-500"
                              style={{ width: `${(ts / maxTime) * 100}%` }}
                            />
                          </div>
                          <div className="w-20 text-xs text-right">{ts.toFixed(1)}ms</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* Log */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold mb-4">Log</h3>
          <div className="h-64 overflow-y-auto font-mono text-sm space-y-1">
            {logs.map((entry, i) => (
              <div
                key={i}
                className={`
                  ${entry.type === 'success' ? 'text-green-400' : ''}
                  ${entry.type === 'error' ? 'text-red-400' : ''}
                  ${entry.type === 'warning' ? 'text-amber-400' : ''}
                  ${entry.type === 'info' ? 'text-zinc-400' : ''}
                `}
              >
                <span className="text-zinc-600">[{entry.time}]</span> {entry.message}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Sub-components
// ============================================================================

function StatusCard({ title, value, status }: { title: string; value: string; status: 'success' | 'error' | 'info' }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{title}</p>
      <span
        className={`
          inline-flex items-center px-2 py-1 rounded text-sm font-medium
          ${status === 'success' ? 'bg-green-500/10 text-green-400' : ''}
          ${status === 'error' ? 'bg-red-500/10 text-red-400' : ''}
          ${status === 'info' ? 'bg-zinc-700 text-zinc-300' : ''}
        `}
      >
        {value}
      </span>
    </div>
  );
}

function ResultCard({ title, value, color }: { title: string; value: string; color: 'green' | 'blue' | 'purple' | 'amber' }) {
  const colorClasses = {
    green: 'text-green-400',
    blue: 'text-blue-400',
    purple: 'text-purple-400',
    amber: 'text-amber-400',
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wider mb-1">{title}</p>
      <p className={`text-2xl font-semibold ${colorClasses[color]}`}>{value}</p>
    </div>
  );
}
