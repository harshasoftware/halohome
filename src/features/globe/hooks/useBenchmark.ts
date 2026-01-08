/**
 * useBenchmark Hook
 *
 * Runs scout computation in all 3 modes via a background worker:
 * - WASM Parallel (rayon thread pool)
 * - WASM Single-threaded
 * - TypeScript
 *
 * All heavy computation runs in a Web Worker to avoid blocking the main thread.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { PlanetaryLine, AspectLine } from '@/lib/astro-types';

// ============================================================================
// Types
// ============================================================================

export interface BenchmarkResult {
  wasmParallel: number | null;
  wasmSingle: number | null;
  typescript: number;
  numThreads: number;
  cityCount: number;
  lineCount: number;
}

export interface UseBenchmarkResult {
  isRunning: boolean;
  results: BenchmarkResult | null;
  currentPhase: string | null;
  runBenchmark: (planetaryLines: PlanetaryLine[], aspectLines: AspectLine[]) => Promise<BenchmarkResult>;
}

interface LineData {
  planet: string;
  angle: string;
  rating: number;
  points: [number, number][];
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

function convertLinesToBenchmarkFormat(
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[]
): LineData[] {
  const lines: LineData[] = [];

  for (const line of planetaryLines) {
    lines.push({
      planet: line.planet,
      angle: line.lineType,
      rating: getLineRating(line.planet, line.lineType),
      points: line.points.map(([lat, lng]) => [lat, lng] as [number, number]),
    });
  }

  for (const line of aspectLines) {
    lines.push({
      planet: line.planet,
      angle: line.angle,
      rating: getLineRating(line.planet, line.angle),
      points: line.points.map(([lat, lng]) => [lat, lng] as [number, number]),
    });
  }

  return lines;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useBenchmark(): UseBenchmarkResult {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<BenchmarkResult | null>(null);
  const [currentPhase, setCurrentPhase] = useState<string | null>(null);
  const workerRef = useRef<Worker | null>(null);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // No-op in production
  const noOpBenchmark = useCallback(
    async (_planetaryLines: PlanetaryLine[], _aspectLines: AspectLine[]): Promise<BenchmarkResult> => ({
      wasmParallel: null,
      wasmSingle: null,
      typescript: 0,
      numThreads: 0,
      cityCount: 0,
      lineCount: 0,
    }),
    []
  );

  const runBenchmarkDev = useCallback(
    async (planetaryLines: PlanetaryLine[], aspectLines: AspectLine[]): Promise<BenchmarkResult> => {
      setIsRunning(true);
      setCurrentPhase('Initializing...');
      console.log('[Benchmark] Starting benchmark in background worker...');

      const lines = convertLinesToBenchmarkFormat(planetaryLines, aspectLines);

      return new Promise((resolve, reject) => {
        // Create worker
        const worker = new Worker(
          new URL('../workers/benchmark.worker.ts', import.meta.url),
          { type: 'module' }
        );
        workerRef.current = worker;

        worker.onmessage = (event) => {
          const { type, result, phase, error } = event.data;

          if (type === 'progress') {
            setCurrentPhase(phase);
            console.log(`[Benchmark] Phase: ${phase}`);
          } else if (type === 'result') {
            console.log('[Benchmark] Complete:', result);
            setResults(result);
            setIsRunning(false);
            setCurrentPhase(null);
            worker.terminate();
            workerRef.current = null;
            resolve(result);
          } else if (type === 'error') {
            console.error('[Benchmark] Error:', error);
            setIsRunning(false);
            setCurrentPhase(null);
            worker.terminate();
            workerRef.current = null;
            reject(new Error(error));
          }
        };

        worker.onerror = (error) => {
          console.error('[Benchmark] Worker error:', error);
          setIsRunning(false);
          setCurrentPhase(null);
          worker.terminate();
          workerRef.current = null;
          reject(error);
        };

        // Start benchmark
        worker.postMessage({ type: 'run', lines });
      });
    },
    []
  );

  // In production, return no-op function
  // In development, return the worker-based benchmark function
  const runBenchmark = import.meta.env.DEV ? runBenchmarkDev : noOpBenchmark;

  return {
    isRunning: import.meta.env.DEV ? isRunning : false,
    results: import.meta.env.DEV ? results : null,
    currentPhase: import.meta.env.DEV ? currentPhase : null,
    runBenchmark,
  };
}

export default useBenchmark;
