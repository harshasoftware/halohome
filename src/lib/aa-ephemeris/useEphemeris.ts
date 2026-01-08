/**
 * useEphemeris Hook
 *
 * React hook for high-precision ephemeris calculations using aa-js
 * in a Web Worker. Provides automatic caching and WASM fallback.
 *
 * Usage:
 * ```typescript
 * const { calculate, calculateBatch, isReady, cacheStats } = useEphemeris();
 *
 * // Single position
 * const sunPos = await calculate(julianDate, 'Sun');
 *
 * // Batch calculation (more efficient)
 * const positions = await calculateBatch([
 *   { julianDate, planet: 'Sun' },
 *   { julianDate, planet: 'Moon' },
 * ]);
 * ```
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
  EphemerisPosition,
  EphemerisRequest,
  EphemerisResponse,
  ExtendedPlanet,
  CacheStats,
} from './types';
import { isAAJSSupported } from './types';

interface PendingRequest {
  resolve: (value: EphemerisPosition | EphemerisPosition[]) => void;
  reject: (error: Error) => void;
}

interface UseEphemerisReturn {
  /** Whether the worker is ready */
  isReady: boolean;
  /** Calculate single position */
  calculate: (julianDate: number, planet: ExtendedPlanet) => Promise<EphemerisPosition>;
  /** Calculate batch of positions (more efficient) */
  calculateBatch: (
    requests: { julianDate: number; planet: ExtendedPlanet }[]
  ) => Promise<EphemerisPosition[]>;
  /** Get cache statistics */
  getCacheStats: () => Promise<CacheStats>;
  /** Clear the cache */
  clearCache: () => Promise<void>;
  /** Current cache stats (updated periodically) */
  cacheStats: CacheStats | null;
  /** Error state */
  error: string | null;
}

/**
 * Generate unique request ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Hook for ephemeris calculations
 */
export function useEphemeris(): UseEphemerisReturn {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, PendingRequest>>(new Map());
  const [isReady, setIsReady] = useState(false);
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Initialize worker
  useEffect(() => {
    let worker: Worker | null = null;

    const initWorker = async () => {
      try {
        // Create worker using Vite's worker syntax
        worker = new Worker(
          new URL('./ephemeris.worker.ts', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = (event: MessageEvent<EphemerisResponse | { type: 'ready' }>) => {
          const data = event.data;

          if (data.type === 'ready') {
            setIsReady(true);
            setError(null);
            return;
          }

          const response = data as EphemerisResponse;
          const pending = pendingRef.current.get(response.id);

          if (pending) {
            pendingRef.current.delete(response.id);

            if (response.type === 'error') {
              pending.reject(new Error(response.error));
            } else if (response.type === 'result' && response.position) {
              pending.resolve(response.position);
            } else if (response.type === 'batch-result' && response.positions) {
              pending.resolve(response.positions);
            } else if (response.type === 'cache-status' && response.cacheStats) {
              setCacheStats(response.cacheStats);
              pending.resolve([] as EphemerisPosition[]);
            }
          }
        };

        worker.onerror = (event) => {
          console.error('[Ephemeris Worker] Error:', event);
          setError(event.message);
        };

        workerRef.current = worker;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to initialize worker';
        console.error('[Ephemeris] Worker init failed:', message);
        setError(message);
      }
    };

    initWorker();

    return () => {
      if (worker) {
        worker.terminate();
      }
    };
  }, []);

  // Periodically update cache stats
  useEffect(() => {
    if (!isReady) return;

    const updateStats = () => {
      const id = generateId();
      workerRef.current?.postMessage({
        id,
        type: 'cache-check',
      } as EphemerisRequest);

      pendingRef.current.set(id, {
        resolve: () => {},
        reject: () => {},
      });
    };

    // Initial check
    updateStats();

    // Update every 5 minutes
    const interval = setInterval(updateStats, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, [isReady]);

  // Calculate single position
  const calculate = useCallback(
    (julianDate: number, planet: ExtendedPlanet): Promise<EphemerisPosition> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current || !isReady) {
          reject(new Error('Worker not ready'));
          return;
        }

        const id = generateId();
        pendingRef.current.set(id, {
          resolve: resolve as (value: EphemerisPosition | EphemerisPosition[]) => void,
          reject,
        });

        workerRef.current.postMessage({
          id,
          type: 'calculate',
          julianDate,
          planet,
        } as EphemerisRequest);
      });
    },
    [isReady]
  );

  // Calculate batch of positions
  const calculateBatch = useCallback(
    (
      requests: { julianDate: number; planet: ExtendedPlanet }[]
    ): Promise<EphemerisPosition[]> => {
      return new Promise((resolve, reject) => {
        if (!workerRef.current || !isReady) {
          reject(new Error('Worker not ready'));
          return;
        }

        const id = generateId();
        pendingRef.current.set(id, {
          resolve: resolve as (value: EphemerisPosition | EphemerisPosition[]) => void,
          reject,
        });

        workerRef.current.postMessage({
          id,
          type: 'batch',
          positions: requests,
        } as EphemerisRequest);
      });
    },
    [isReady]
  );

  // Get cache statistics
  const getCacheStats = useCallback((): Promise<CacheStats> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !isReady) {
        reject(new Error('Worker not ready'));
        return;
      }

      const id = generateId();
      pendingRef.current.set(id, {
        resolve: () => {
          if (cacheStats) resolve(cacheStats);
        },
        reject,
      });

      workerRef.current.postMessage({
        id,
        type: 'cache-check',
      } as EphemerisRequest);
    });
  }, [isReady, cacheStats]);

  // Clear cache
  const clearCache = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (!workerRef.current || !isReady) {
        reject(new Error('Worker not ready'));
        return;
      }

      const id = generateId();
      pendingRef.current.set(id, {
        resolve: () => resolve(),
        reject,
      });

      workerRef.current.postMessage({
        id,
        type: 'cache-clear',
      } as EphemerisRequest);
    });
  }, [isReady]);

  return {
    isReady,
    calculate,
    calculateBatch,
    getCacheStats,
    clearCache,
    cacheStats,
    error,
  };
}

/**
 * Standalone function to check if a planet needs WASM fallback
 */
export function needsWasmFallback(planet: ExtendedPlanet): boolean {
  return !isAAJSSupported(planet);
}

/**
 * Calculate positions for astrocartography lines
 * Returns positions for all planets at a given Julian Date
 */
export async function calculateAstroPositions(
  hook: UseEphemerisReturn,
  julianDate: number,
  planets: ExtendedPlanet[] = [
    'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
    'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  ]
): Promise<Map<ExtendedPlanet, EphemerisPosition>> {
  const results = new Map<ExtendedPlanet, EphemerisPosition>();

  if (!hook.isReady) {
    throw new Error('Ephemeris hook not ready');
  }

  const positions = await hook.calculateBatch(
    planets.map((planet) => ({ julianDate, planet }))
  );

  positions.forEach((pos) => {
    results.set(pos.planet, pos);
  });

  return results;
}
