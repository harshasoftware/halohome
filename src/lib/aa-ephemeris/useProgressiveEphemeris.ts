/**
 * useProgressiveEphemeris Hook
 *
 * Progressive enhancement pattern for ephemeris calculations:
 * 1. Immediately returns WASM calculations (fast, ~5 arcminute accuracy)
 * 2. Triggers aa-js calculations in background Web Worker
 * 3. Calls onUpgrade callback when high-precision results ready (0.01 arcsecond)
 *
 * This provides instant UI response while silently upgrading accuracy.
 *
 * Usage:
 * ```typescript
 * const { calculateProgressive } = useProgressiveEphemeris();
 *
 * const positions = await calculateProgressive(julianDate, planets, {
 *   onUpgrade: (upgraded) => {
 *     // Update lines with high-precision data
 *     setPositions(upgraded);
 *   }
 * });
 * // positions = WASM results (immediate)
 * // onUpgrade called later with aa-js results
 * ```
 */

import { useCallback, useRef, useEffect } from 'react';
import type { PlanetaryPosition, Planet } from '../astro-types';
import type { EphemerisPosition, ExtendedPlanet } from './types';
import { isAAJSSupported } from './types';
import type { EphemerisRequest, EphemerisResponse } from './types';

/**
 * Enhanced position with accuracy tier
 */
export interface ProgressivePosition extends PlanetaryPosition {
  accuracy: 'wasm' | 'aa-js' | 'aa-js-cached';
  isUpgraded: boolean;
}

/**
 * Options for progressive calculation
 */
export interface ProgressiveOptions {
  /** Called when aa-js results are ready (upgraded accuracy) */
  onUpgrade?: (positions: ProgressivePosition[]) => void;
  /** Skip aa-js upgrade (use WASM only) */
  skipUpgrade?: boolean;
}

/**
 * Generate unique request ID
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

/**
 * Convert WASM position to progressive format
 */
function wasmToProgressive(pos: PlanetaryPosition): ProgressivePosition {
  return {
    ...pos,
    accuracy: 'wasm',
    isUpgraded: false,
  };
}

/**
 * Convert aa-js position to progressive format
 */
function aajsToProgressive(pos: EphemerisPosition): ProgressivePosition {
  return {
    planet: pos.planet as Planet,
    rightAscension: pos.rightAscension,
    declination: pos.declination,
    eclipticLongitude: pos.eclipticLongitude,
    accuracy: pos.accuracy === 'aa-js-cached' ? 'aa-js-cached' : 'aa-js',
    isUpgraded: true,
  };
}

interface PendingUpgrade {
  resolve: (positions: EphemerisPosition[]) => void;
  reject: (error: Error) => void;
  onUpgrade?: (positions: ProgressivePosition[]) => void;
  wasmPositions: ProgressivePosition[];
}

/**
 * Hook for progressive ephemeris calculations
 */
export function useProgressiveEphemeris() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, PendingUpgrade>>(new Map());
  const isReadyRef = useRef(false);

  // Initialize worker
  useEffect(() => {
    let worker: Worker | null = null;

    const initWorker = async () => {
      try {
        worker = new Worker(
          new URL('./ephemeris.worker.ts', import.meta.url),
          { type: 'module' }
        );

        worker.onmessage = (event: MessageEvent<EphemerisResponse | { type: 'ready' }>) => {
          const data = event.data;

          if (data.type === 'ready') {
            isReadyRef.current = true;
            return;
          }

          const response = data as EphemerisResponse;
          const pending = pendingRef.current.get(response.id);

          if (pending) {
            pendingRef.current.delete(response.id);

            if (response.type === 'error') {
              // On error, just keep WASM results (no upgrade)
              console.warn('[ProgressiveEphemeris] aa-js error:', response.error);
              pending.resolve([]);
            } else if (response.type === 'batch-result' && response.positions) {
              // Merge aa-js results with WASM positions
              const upgradedPositions = mergeWithWasm(
                pending.wasmPositions,
                response.positions
              );

              // Call upgrade callback if provided
              if (pending.onUpgrade) {
                pending.onUpgrade(upgradedPositions);
              }

              pending.resolve(response.positions);
            }
          }
        };

        worker.onerror = () => {
          // Worker failed to initialize - this is expected in some environments
          // (e.g., when aa-js module can't be resolved in worker context)
          // The app will continue using WASM calculations only
          if (import.meta.env.DEV) {
            console.debug('[ProgressiveEphemeris] Worker unavailable, using WASM only');
          }
        };

        workerRef.current = worker;
      } catch {
        // Worker initialization failed - app will use WASM calculations only
        if (import.meta.env.DEV) {
          console.debug('[ProgressiveEphemeris] Worker init failed, using WASM only');
        }
      }
    };

    initWorker();

    return () => {
      if (worker) {
        worker.terminate();
      }
    };
  }, []);

  /**
   * Calculate positions with progressive enhancement
   *
   * @param julianDate - Julian Date for calculations
   * @param wasmPositions - WASM-calculated positions (immediate)
   * @param options - Progressive options including onUpgrade callback
   * @returns WASM positions immediately, triggers aa-js upgrade in background
   */
  const calculateProgressive = useCallback(
    (
      julianDate: number,
      wasmPositions: PlanetaryPosition[],
      options: ProgressiveOptions = {}
    ): ProgressivePosition[] => {
      // Convert WASM positions to progressive format
      const progressivePositions = wasmPositions.map(wasmToProgressive);

      // If skip upgrade or worker not ready, return WASM only
      if (options.skipUpgrade || !workerRef.current || !isReadyRef.current) {
        return progressivePositions;
      }

      // Get planets that can be upgraded with aa-js
      const upgradablePlanets = wasmPositions
        .map((p) => p.planet)
        .filter((p) => isAAJSSupported(p));

      if (upgradablePlanets.length === 0) {
        // No planets to upgrade
        return progressivePositions;
      }

      // Trigger aa-js calculation in background
      const id = generateId();
      const requests = upgradablePlanets.map((planet) => ({
        julianDate,
        planet: planet as ExtendedPlanet,
      }));

      pendingRef.current.set(id, {
        resolve: () => {},
        reject: () => {},
        onUpgrade: options.onUpgrade,
        wasmPositions: progressivePositions,
      });

      workerRef.current.postMessage({
        id,
        type: 'batch',
        positions: requests,
      } as EphemerisRequest);

      // Return WASM positions immediately
      return progressivePositions;
    },
    []
  );

  /**
   * Upgrade a single position (useful for on-demand upgrades)
   */
  const upgradePosition = useCallback(
    async (
      julianDate: number,
      planet: Planet
    ): Promise<ProgressivePosition | null> => {
      if (!isAAJSSupported(planet) || !workerRef.current || !isReadyRef.current) {
        return null;
      }

      return new Promise((resolve) => {
        const id = generateId();

        pendingRef.current.set(id, {
          resolve: (positions) => {
            if (positions.length > 0) {
              resolve(aajsToProgressive(positions[0]));
            } else {
              resolve(null);
            }
          },
          reject: () => resolve(null),
          wasmPositions: [],
        });

        workerRef.current!.postMessage({
          id,
          type: 'batch',
          positions: [{ julianDate, planet: planet as ExtendedPlanet }],
        } as EphemerisRequest);
      });
    },
    []
  );

  return {
    calculateProgressive,
    upgradePosition,
    isWorkerReady: () => isReadyRef.current,
  };
}

/**
 * Merge aa-js results with WASM positions
 */
function mergeWithWasm(
  wasmPositions: ProgressivePosition[],
  aajsPositions: EphemerisPosition[]
): ProgressivePosition[] {
  const aajsMap = new Map<string, EphemerisPosition>();
  for (const pos of aajsPositions) {
    if (pos.accuracy !== 'wasm-fallback') {
      aajsMap.set(pos.planet, pos);
    }
  }

  return wasmPositions.map((wasmPos) => {
    const aajsPos = aajsMap.get(wasmPos.planet);
    if (aajsPos) {
      return aajsToProgressive(aajsPos);
    }
    return wasmPos;
  });
}

/**
 * Calculate accuracy improvement from WASM to aa-js
 * Returns difference in arcseconds
 */
export function calculateAccuracyDelta(
  wasmLongitude: number,
  aajsLongitude: number
): number {
  let diff = Math.abs(wasmLongitude - aajsLongitude);
  // Handle wraparound at 360°
  if (diff > 180) diff = 360 - diff;
  // Convert to arcseconds
  return diff * 3600;
}
