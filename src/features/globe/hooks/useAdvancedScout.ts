/**
 * useAdvancedScout Hook
 *
 * Orchestrates the two-phase grid-based scout scoring:
 * 1. Coarse grid (2°) - identifies hot zones globally
 * 2. Fine grid (0.5°) - refines scoring around hot zones
 * 3. Maps results to nearest cities from expanded database
 *
 * Features:
 * - Uses WASM parallel scoring for performance
 * - Finds optimal locations ANYWHERE on Earth, not just predefined cities
 * - Returns cities near optimal zones (not just the closest city)
 * - Progress reporting for UI feedback
 * - SQLite WASM caching for instant retrieval of previous results
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { PlanetaryLine, AspectLine } from '@/lib/astro-types';
import {
  generateChartHash,
  getScoutResults,
  saveScoutResults,
  saveHotZones,
} from '@/lib/db';

// ============================================================================
// Types
// ============================================================================

export interface AdvancedScoutConfig {
  coarseStep?: number;        // Degrees for coarse grid (default: 2)
  fineStep?: number;          // Degrees for fine grid (default: 0.5)
  refineRadiusDeg?: number;   // Radius to refine around hot zones (default: 3)
  topNCoarse?: number;        // Number of hot zones to refine (default: 100)
  topNFinal?: number;         // Final number of results (default: 50)
  maxDistanceKm?: number;     // Max distance for line influence (default: 500)
  kernelSigma?: number;       // Gaussian kernel sigma (default: 150)
}

export interface ScoredCity {
  name: string;
  country: string;
  lat: number;
  lng: number;
  population: number;
}

export interface AdvancedScoutResult {
  lat: number;
  lng: number;
  score: number;
  nearestCity: ScoredCity | null;
  distanceToCity: number;
  citiesNearby: ScoredCity[];
}

export interface AdvancedScoutProgress {
  phase: 'idle' | 'coarse' | 'fine' | 'mapping' | 'complete' | 'error';
  percent: number;
  detail: string;
}

export interface AdvancedScoutMeta {
  coarseGridSize: number;
  fineGridSize: number;
  totalTimeMs: number;
  wasmTimeMs: number;
}

export interface BirthData {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  lat: number;
  lng: number;
}

export interface UseAdvancedScoutOptions {
  enabled?: boolean;
  category?: 'career' | 'love' | 'health' | 'home' | 'wellbeing' | 'wealth';
  config?: AdvancedScoutConfig;
  birthData?: BirthData;
  useCache?: boolean;
}

export interface UseAdvancedScoutReturn {
  results: AdvancedScoutResult[];
  progress: AdvancedScoutProgress;
  meta: AdvancedScoutMeta | null;
  isComputing: boolean;
  error: string | null;
  cacheHit: boolean;
  chartHash: string | null;
  runScout: () => void;
  reset: () => void;
}

// ============================================================================
// Category Mapping
// ============================================================================

const CATEGORY_TO_WASM: Record<string, number> = {
  career: 0,
  love: 1,
  health: 2,
  home: 3,
  wellbeing: 4,
  wealth: 5,
};

// ============================================================================
// Line Conversion
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

function convertLines(
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[]
): Array<{ planet: string; angle: string; rating: number; points: [number, number][] }> {
  const lines: Array<{ planet: string; angle: string; rating: number; points: [number, number][] }> = [];

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

export function useAdvancedScout(
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  options: UseAdvancedScoutOptions = {}
): UseAdvancedScoutReturn {
  const { enabled = true, category = 'career', config = {}, birthData, useCache = true } = options;

  // State
  const [results, setResults] = useState<AdvancedScoutResult[]>([]);
  const [progress, setProgress] = useState<AdvancedScoutProgress>({
    phase: 'idle',
    percent: 0,
    detail: '',
  });
  const [meta, setMeta] = useState<AdvancedScoutMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cacheHit, setCacheHit] = useState(false);
  const [chartHash, setChartHash] = useState<string | null>(null);

  // Refs
  const workerRef = useRef<Worker | null>(null);
  const isComputingRef = useRef(false);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, []);

  // Run scout
  const runScout = useCallback(() => {
    if (!enabled || planetaryLines.length === 0 || isComputingRef.current) {
      return;
    }

    // Generate chart hash for caching
    const hash = birthData ? generateChartHash(birthData) : null;
    setChartHash(hash);
    setCacheHit(false);

    // Check cache first
    if (useCache && hash) {
      try {
        const cached = getScoutResults(hash, category);
        if (cached) {
          console.log('[AdvancedScout] Cache hit for', category, '- returning cached results');
          setResults(cached.results as AdvancedScoutResult[]);
          setMeta(cached.meta as AdvancedScoutMeta);
          setProgress({ phase: 'complete', percent: 100, detail: 'Loaded from cache' });
          setCacheHit(true);
          return;
        }
      } catch (e) {
        console.warn('[AdvancedScout] Cache check failed:', e);
      }
    }

    isComputingRef.current = true;
    setError(null);
    setProgress({ phase: 'coarse', percent: 0, detail: 'Initializing...' });

    // Create worker
    if (workerRef.current) {
      workerRef.current.terminate();
    }

    workerRef.current = new Worker(
      new URL('../workers/advancedScout.worker.ts', import.meta.url),
      { type: 'module' }
    );

    const worker = workerRef.current;

    // Handle messages
    worker.onmessage = (event) => {
      const msg = event.data;

      if (msg.type === 'progress') {
        setProgress({
          phase: msg.phase,
          percent: msg.percent,
          detail: msg.detail,
        });
      } else if (msg.type === 'result') {
        const resultData = msg.results || [];
        const metaData = msg.meta || null;

        setResults(resultData);
        setMeta(metaData);
        setProgress({ phase: 'complete', percent: 100, detail: 'Complete!' });
        isComputingRef.current = false;

        // Save to cache
        if (useCache && hash && resultData.length > 0) {
          try {
            saveScoutResults(hash, category, resultData, metaData);
            console.log('[AdvancedScout] Results cached for', category);

            // Also save hot zones for potential future refinement
            const hotZones = resultData.slice(0, 50).map((r: AdvancedScoutResult) => ({
              lat: r.lat,
              lng: r.lng,
              score: r.score,
            }));
            saveHotZones(hash, category, hotZones);
          } catch (e) {
            console.warn('[AdvancedScout] Cache save failed:', e);
          }
        }

        if (metaData) {
          console.log('[AdvancedScout] Complete:', {
            coarsePoints: metaData.coarseGridSize,
            finePoints: metaData.fineGridSize,
            totalMs: metaData.totalTimeMs.toFixed(0),
            wasmMs: metaData.wasmTimeMs.toFixed(0),
            results: resultData?.length,
            cached: useCache && hash ? 'will cache' : 'no cache',
          });
        }
      } else if (msg.type === 'error') {
        setError(msg.error);
        setProgress({ phase: 'error', percent: 0, detail: msg.error });
        isComputingRef.current = false;
      }
    };

    worker.onerror = (err) => {
      setError(err.message);
      setProgress({ phase: 'error', percent: 0, detail: err.message });
      isComputingRef.current = false;
    };

    // Run scout immediately (no city init needed - SQLite geocoder on main thread)
    const lines = convertLines(planetaryLines, aspectLines);

    worker.postMessage({
      type: 'scout',
      lines,
      category: CATEGORY_TO_WASM[category] ?? 0,
      config: {
        coarseStep: config.coarseStep ?? 2,
        fineStep: config.fineStep ?? 0.5,
        refineRadiusDeg: config.refineRadiusDeg ?? 3,
        topNCoarse: config.topNCoarse ?? 100,
        topNFinal: config.topNFinal ?? 50,
        maxDistanceKm: config.maxDistanceKm ?? 500,
        kernelSigma: config.kernelSigma ?? 150,
      },
    });
  }, [enabled, planetaryLines, aspectLines, category, config, birthData, useCache]);

  // Reset
  const reset = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
    isComputingRef.current = false;
    setResults([]);
    setProgress({ phase: 'idle', percent: 0, detail: '' });
    setMeta(null);
    setError(null);
    setCacheHit(false);
    setChartHash(null);
  }, []);

  return {
    results,
    progress,
    meta,
    isComputing:
      isComputingRef.current ||
      progress.phase === 'coarse' ||
      progress.phase === 'fine' ||
      progress.phase === 'mapping',
    error,
    cacheHit,
    chartHash,
    runScout,
    reset,
  };
}

export default useAdvancedScout;
