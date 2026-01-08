/**
 * useScoutWorkerPool Hook
 *
 * Manages the scout worker pool at the GlobePage level.
 * This hook connects the worker pool to the Zustand store and
 * provides progress for the AstroLoadingOverlay.
 *
 * Usage:
 * - Call in GlobePage when planetary lines are computed
 * - Progress integrates with AstroLoadingOverlay
 * - ScoutPanel reads results from the store
 */

import { useEffect, useRef, useCallback, useMemo } from 'react';
import type { PlanetaryLine, AspectLine } from '@/lib/astro-types';
import {
  getScoutWorkerPool,
  type ScoutProgress as WorkerPoolProgress,
  type ScoutResults,
} from '../services/scoutWorkerPool';
import { useScoutStore, type ScoutProgress } from '@/stores/scoutStore';
import type { ScoutCategory } from '../utils/scout-utils';

// ============================================================================
// Types
// ============================================================================

export interface UseScoutWorkerPoolOptions {
  /** Whether scout computation is enabled */
  enabled?: boolean;
  /** Callback when computation starts */
  onComputationStart?: () => void;
  /** Callback when computation completes */
  onComputationComplete?: () => void;
}

export interface UseScoutWorkerPoolResult {
  /** Whether the worker pool is computing */
  isComputing: boolean;
  /** Current progress (0-100) */
  progress: number;
  /** Current computation phase */
  phase: ScoutProgress['phase'];
  /** Detail message for progress display */
  detail: string | undefined;
  /** Whether results are ready */
  isComplete: boolean;
  /** Backend type (wasm or typescript) */
  backend: 'wasm' | 'typescript' | null;
  /** Manually trigger computation (usually auto-triggered) */
  compute: () => void;
}

// ============================================================================
// Helper: Generate lines key for comparison
// ============================================================================

function generateLinesKey(
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[]
): string {
  const planetaryData = planetaryLines
    .map(l => `${l.planet}:${l.lineType}:${l.points?.length || 0}`)
    .sort()
    .join('|');

  const aspectData = aspectLines
    .map(l => `${l.planet1}:${l.planet2}:${l.aspect}:${l.lineType1}:${l.lineType2}`)
    .sort()
    .join('|');

  const combined = `${planetaryData}::${aspectData}`;

  let hash = 5381;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) ^ combined.charCodeAt(i);
  }

  return `lines-${(hash >>> 0).toString(36)}`;
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useScoutWorkerPool(
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  options: UseScoutWorkerPoolOptions = {}
): UseScoutWorkerPoolResult {
  const { enabled = true, onComputationStart, onComputationComplete } = options;

  // Get store actions
  const setProgress = useScoutStore((state) => state.setProgress);
  const setLinesKey = useScoutStore((state) => state.setLinesKey);
  const setBackend = useScoutStore((state) => state.setBackend);
  const setOverallResults = useScoutStore((state) => state.setOverallResults);
  const setCategoryResult = useScoutStore((state) => state.setCategoryResult);
  const clearResults = useScoutStore((state) => state.clearResults);

  // Get store state
  const storeProgress = useScoutStore((state) => state.progress);
  const storeLinesKey = useScoutStore((state) => state.linesKey);
  const storeBackend = useScoutStore((state) => state.backend);
  const minPopulation = useScoutStore((state) => state.minPopulation);

  // Refs for callbacks
  const onComputationStartRef = useRef(onComputationStart);
  onComputationStartRef.current = onComputationStart;
  const onComputationCompleteRef = useRef(onComputationComplete);
  onComputationCompleteRef.current = onComputationComplete;

  // Track if we've started computation for these lines
  const hasStartedRef = useRef(false);
  const lastLinesKeyRef = useRef('');
  const lastMinPopulationRef = useRef(minPopulation);

  // Current lines key
  const currentLinesKey = useMemo(
    () => generateLinesKey(planetaryLines, aspectLines),
    [planetaryLines, aspectLines]
  );

  // Subscribe to worker pool updates and sync to store
  useEffect(() => {
    const pool = getScoutWorkerPool();

    // Handle progress updates
    const unsubProgress = pool.onProgress((progress: WorkerPoolProgress) => {
      const storeProgress: ScoutProgress = {
        phase: progress.phase,
        overallPercent: progress.overallPercent,
        categoriesComplete: progress.categoriesComplete,
        totalCategories: progress.totalCategories,
        currentCategory: progress.currentCategory,
        detail: progress.detail,
        error: progress.error,
      };
      setProgress(storeProgress);

      // Update backend
      const backend = pool.getBackend();
      setBackend(backend);

      // Trigger callbacks
      if (progress.phase === 'computing' && progress.overallPercent === 0) {
        onComputationStartRef.current?.();
      }
      if (progress.phase === 'complete') {
        onComputationCompleteRef.current?.();
      }
    });

    // Handle results updates
    const unsubResults = pool.onResults((results: ScoutResults) => {
      setLinesKey(results.linesKey);

      if (results.overall) {
        setOverallResults(results.overall);
      }

      for (const [category, analysis] of results.categories) {
        setCategoryResult(category as ScoutCategory, analysis);
      }
    });

    return () => {
      unsubProgress();
      unsubResults();
    };
  }, [setProgress, setLinesKey, setBackend, setOverallResults, setCategoryResult]);

  // Trigger computation when lines change or population filter changes
  useEffect(() => {
    if (!enabled || !planetaryLines.length) {
      return;
    }

    // Check if lines changed
    if (currentLinesKey !== lastLinesKeyRef.current) {
      lastLinesKeyRef.current = currentLinesKey;
      hasStartedRef.current = false;
    }

    // Check if minPopulation changed - need to recompute with new filter
    if (minPopulation !== lastMinPopulationRef.current) {
      console.log(`[useScoutWorkerPool] Population filter changed: ${lastMinPopulationRef.current} -> ${minPopulation}`);
      lastMinPopulationRef.current = minPopulation;
      hasStartedRef.current = false;
    }

    // Skip if already computed for these lines (and same population filter)
    if (storeLinesKey === currentLinesKey && storeProgress.phase === 'complete') {
      console.log('[useScoutWorkerPool] Results already available for these lines');
      return;
    }

    // Skip if already started
    if (hasStartedRef.current) {
      return;
    }

    // Start computation
    hasStartedRef.current = true;
    console.log(`[useScoutWorkerPool] Triggering scout computation (minPop: ${minPopulation})...`);

    const pool = getScoutWorkerPool();
    pool.computeAll(planetaryLines, aspectLines, minPopulation).catch((error) => {
      console.error('[useScoutWorkerPool] Computation failed:', error);
    });
  }, [enabled, planetaryLines, aspectLines, currentLinesKey, storeLinesKey, storeProgress.phase, minPopulation]);

  // Manual compute function
  const compute = useCallback(() => {
    if (!planetaryLines.length) {
      console.warn('[useScoutWorkerPool] No planetary lines to compute');
      return;
    }

    hasStartedRef.current = true;
    const pool = getScoutWorkerPool();
    pool.computeAll(planetaryLines, aspectLines, minPopulation).catch((error) => {
      console.error('[useScoutWorkerPool] Manual computation failed:', error);
    });
  }, [planetaryLines, aspectLines, minPopulation]);

  // Derived state
  const isComputing =
    storeProgress.phase === 'initializing' || storeProgress.phase === 'computing';
  const isComplete = storeProgress.phase === 'complete';

  return {
    isComputing,
    progress: storeProgress.overallPercent,
    phase: storeProgress.phase,
    detail: storeProgress.detail,
    isComplete,
    backend: storeBackend,
    compute,
  };
}

export default useScoutWorkerPool;
