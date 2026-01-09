/**
 * useAstroLines Hook
 * React hook for calculating and managing astrocartography lines
 *
 * Supports tiered calculation with progressive enhancement:
 * 1. WASM (immediate) - Fast calculations (~5 arcminute accuracy)
 * 2. aa-js (background) - High-precision upgrade (0.01 arcsecond accuracy)
 *
 * Lines are displayed immediately from WASM, then silently upgraded
 * when aa-js calculations complete in the background.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  BirthData,
  AstroCartographyResult,
  AstroCalculationOptions,
  AstroVisibilityState,
  PlanetaryLine,
  AspectLine,
  ParanLine,
  ZenithPoint,
  Planet,
  LineType,
  PlanetaryPosition,
  createDefaultVisibility,
  DEFAULT_ASTRO_OPTIONS,
} from '@/lib/astro-types';
import { calculateAstroCartography } from '@/lib/astro-calculator';
import { isWasmSupported, loadWasmModule, calculateWithWasm, isWasmReady } from '@/lib/astro-wasm';
import { localTimeToUTCSync } from '@/lib/timezone-utils';
import { useProgressiveEphemeris, type ProgressivePosition } from '@/lib/aa-ephemeris';

// Types for calculation backend
type CalculationBackend = 'wasm' | 'worker' | 'main';

// Accuracy tier for positions
type AccuracyTier = 'wasm' | 'aa-js' | 'aa-js-cached';

interface WorkerRequest {
  type: 'calculate';
  id: string;
  birthData: {
    date: string;
    latitude: number;
    longitude: number;
  };
  options: AstroCalculationOptions;
}

interface WorkerResponse {
  type: 'result' | 'progress' | 'error';
  id: string;
  result?: AstroCartographyResult;
  progress?: { percent: number; stage: string };
  error?: string;
}

export interface UseAstroLinesResult {
  // Calculated data
  result: AstroCartographyResult | null;

  // Filtered data based on visibility
  visiblePlanetaryLines: PlanetaryLine[];
  visibleAspectLines: AspectLine[];
  visibleParanLines: ParanLine[];
  visibleZenithPoints: ZenithPoint[];

  // State
  loading: boolean;
  error: Error | null;
  backend: CalculationBackend | null;
  progress: { percent: number; stage: string } | null;

  // Accuracy tracking (progressive enhancement)
  accuracy: AccuracyTier;
  isUpgraded: boolean;

  // Visibility controls
  visibility: AstroVisibilityState;
  togglePlanet: (planet: Planet) => void;
  toggleLineType: (lineType: LineType) => void;
  toggleAspects: () => void;
  toggleHarmoniousAspects: () => void;
  toggleDisharmoniousAspects: () => void;
  toggleParans: () => void;
  toggleZenithPoints: () => void;
  toggleLocalSpace: () => void;
  toggleLineLabels: () => void;
  setVisibility: React.Dispatch<React.SetStateAction<AstroVisibilityState>>;
  showAllPlanets: () => void;
  hideAllPlanets: () => void;

  // Actions
  recalculate: () => void;
}

export interface UseAstroLinesOptions extends AstroCalculationOptions {
  // Enable/disable automatic calculation
  enabled?: boolean;
  // Force a specific backend (for testing)
  forceBackend?: CalculationBackend;
}

// Global worker instance (shared across hook instances)
let globalWorker: Worker | null = null;
let workerSupported: boolean | null = null;

// Check if Web Workers are supported
function checkWorkerSupport(): boolean {
  if (workerSupported !== null) return workerSupported;

  try {
    // Check if we're in a browser environment with Worker support
    if (typeof Worker !== 'undefined') {
      workerSupported = true;
    } else {
      workerSupported = false;
    }
  } catch {
    workerSupported = false;
  }

  return workerSupported;
}

// Get or create the worker instance
function getWorker(): Worker | null {
  if (!checkWorkerSupport()) return null;

  if (!globalWorker) {
    try {
      globalWorker = new Worker(
        new URL('../workers/astro.worker.ts', import.meta.url),
        { type: 'module' }
      );
    } catch (error) {
      console.warn('Failed to create astro worker:', error);
      workerSupported = false;
      return null;
    }
  }

  return globalWorker;
}

// Generate unique request ID
function generateRequestId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Hook for calculating astrocartography lines
 *
 * @param birthData - Birth date/time and location
 * @param options - Calculation options
 * @returns Astrocartography data and controls
 */
export function useAstroLines(
  birthData: BirthData | null,
  options: UseAstroLinesOptions = {}
): UseAstroLinesResult {
  const { enabled = true, forceBackend, ...calcOptions } = options;

  // State
  const [result, setResult] = useState<AstroCartographyResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [backend, setBackend] = useState<CalculationBackend | null>(null);
  const [progress, setProgress] = useState<{ percent: number; stage: string } | null>(null);
  const [visibility, setVisibility] = useState<AstroVisibilityState>(createDefaultVisibility);
  const [accuracy, setAccuracy] = useState<AccuracyTier>('wasm');
  const [isUpgraded, setIsUpgraded] = useState(false);

  // Progressive ephemeris hook for aa-js upgrade
  const { calculateProgressive } = useProgressiveEphemeris();

  // Refs
  const currentRequestId = useRef<string | null>(null);
  const workerRef = useRef<Worker | null>(null);
  const birthDataRef = useRef(birthData);
  birthDataRef.current = birthData;
  const calculateRef = useRef<() => Promise<void>>();
  const resultRef = useRef<AstroCartographyResult | null>(null);

  // Memoize merged options using a stable key
  const optionsKey = JSON.stringify(calcOptions);
  const mergedOptions = useMemo(() => ({
    ...DEFAULT_ASTRO_OPTIONS,
    ...calcOptions,
  }), [optionsKey]);

  // Calculate using main thread (fallback)
  const calculateMainThread = useCallback((data: BirthData): AstroCartographyResult => {
    return calculateAstroCartography(data, mergedOptions);
  }, [mergedOptions]);

  // Calculate using Web Worker
  const calculateWithWorker = useCallback((
    worker: Worker,
    data: BirthData,
    requestId: string
  ): Promise<AstroCartographyResult> => {
    return new Promise((resolve, reject) => {
      const handleMessage = (event: MessageEvent<WorkerResponse>) => {
        const { type, id, result: workerResult, progress: workerProgress, error: workerError } = event.data;

        // Ignore messages from other requests
        if (id !== requestId) return;

        switch (type) {
          case 'progress':
            if (workerProgress) {
              setProgress(workerProgress);
            }
            break;

          case 'result':
            worker.removeEventListener('message', handleMessage);
            if (workerResult) {
              resolve(workerResult);
            } else {
              reject(new Error('No result from worker'));
            }
            break;

          case 'error':
            worker.removeEventListener('message', handleMessage);
            reject(new Error(workerError || 'Worker error'));
            break;
        }
      };

      worker.addEventListener('message', handleMessage);

      // Send calculation request
      const request: WorkerRequest = {
        type: 'calculate',
        id: requestId,
        birthData: {
          date: data.date.toISOString(),
          latitude: data.latitude,
          longitude: data.longitude,
        },
        options: mergedOptions,
      };

      worker.postMessage(request);
    });
  }, [mergedOptions]);

  // Main calculation function with fallback chain
  const calculate = useCallback(async () => {
    const currentBirthData = birthDataRef.current;
    if (!currentBirthData || !enabled) {
      setResult(null);
      return;
    }

    const requestId = generateRequestId();
    currentRequestId.current = requestId;

    setLoading(true);
    setError(null);
    setProgress(null);

    try {
      let calculationResult: AstroCartographyResult;
      let usedBackend: CalculationBackend;

      // Determine which backend to use
      if (forceBackend) {
        usedBackend = forceBackend;
      } else {
        // Try WASM first, then Worker, then main thread
        if (isWasmSupported()) {
          usedBackend = 'wasm';
        } else if (checkWorkerSupport()) {
          usedBackend = 'worker';
        } else {
          usedBackend = 'main';
        }
      }

      // Execute calculation based on backend with fallback chain
      let fallbackNeeded = true;

      // Try WASM first (fastest)
      if (usedBackend === 'wasm' && fallbackNeeded) {
        setProgress({ percent: 10, stage: 'Loading WASM module...' });
        try {
          await loadWasmModule();
          if (isWasmReady()) {
            setProgress({ percent: 30, stage: 'Computing planetary positions...' });
            const wasmResult = await calculateWithWasm(currentBirthData, mergedOptions);

            if (wasmResult) {
              setProgress({ percent: 70, stage: 'Calculating line intersections...' });
              calculationResult = wasmResult;
              fallbackNeeded = false;
              console.log('Calculation completed with WASM');
            }
          }
        } catch (wasmError) {
          console.warn('WASM calculation failed:', wasmError);
        }

        if (fallbackNeeded) {
          console.log('WASM failed, falling back to Worker');
          usedBackend = 'worker';
        }
      }

      // Try Worker as fallback
      if (usedBackend === 'worker' && fallbackNeeded) {
        const worker = getWorker();
        if (worker) {
          workerRef.current = worker;
          try {
            setProgress({ percent: 20, stage: 'Initializing worker...' });
            calculationResult = await calculateWithWorker(worker, currentBirthData, requestId);
            setProgress({ percent: 70, stage: 'Processing results...' });
            fallbackNeeded = false;
            console.log('Calculation completed with Worker');
          } catch (workerError) {
            console.warn('Worker calculation failed:', workerError);
          }
        }

        if (fallbackNeeded) {
          console.log('Worker failed, falling back to main thread');
          usedBackend = 'main';
        }
      }

      // Skip main thread fallback - it blocks the UI
      // If both WASM and Worker failed, show an error
      if (fallbackNeeded) {
        console.warn('All calculation backends failed');
        setError(new Error('Calculation failed - please try again'));
        setResult(null);
        setLoading(false);
        return;
      }

      // Check if this request is still current
      if (currentRequestId.current !== requestId) {
        return; // Stale request, ignore result
      }

      // Debug: Log aspect lines count
      console.log('[useAstroLines] Result received:');
      console.log('  - Planetary lines:', calculationResult!.planetaryLines.length);
      console.log('  - Aspect lines:', calculationResult!.aspectLines.length);
      console.log('  - Zenith points:', calculationResult!.zenithPoints?.length ?? 0);
      if (calculationResult!.aspectLines.length > 0) {
        const byPlanet: Record<string, number> = {};
        calculationResult!.aspectLines.forEach(l => {
          byPlanet[l.planet] = (byPlanet[l.planet] || 0) + 1;
        });
        console.log('  - Aspect lines by planet:', byPlanet);
      }

      // Set WASM result (fast, ~5 arcminute accuracy)
      setResult(calculationResult!);
      resultRef.current = calculationResult!;
      setBackend(usedBackend);
      setAccuracy('wasm');
      setIsUpgraded(false);
      setProgress({ percent: 100, stage: 'Complete' });

      // Trigger aa-js upgrade in background (high-precision, 0.01 arcsecond)
      // This silently upgrades accuracy without blocking the UI
      if (calculationResult!.planetaryPositions.length > 0) {
        const julianDate = calculationResult!.julianDate;
        const wasmPositions = calculationResult!.planetaryPositions;

        console.log('[useAstroLines] Triggering aa-js precision upgrade...');

        // Calculate progressive positions - WASM returned immediately,
        // aa-js upgrade happens in background Web Worker
        calculateProgressive(julianDate, wasmPositions, {
          onUpgrade: (upgradedPositions) => {
            // Check if this result is still current
            if (resultRef.current !== calculationResult) {
              console.log('[useAstroLines] Stale upgrade, ignoring');
              return;
            }

            // Update positions with high-precision aa-js data
            const upgradedPlanetaryPositions: PlanetaryPosition[] = upgradedPositions.map(pos => ({
              planet: pos.planet,
              rightAscension: pos.rightAscension,
              declination: pos.declination,
              eclipticLongitude: pos.eclipticLongitude,
            }));

            // Create upgraded result with high-precision positions
            const upgradedResult: AstroCartographyResult = {
              ...resultRef.current!,
              planetaryPositions: upgradedPlanetaryPositions,
            };

            setResult(upgradedResult);
            resultRef.current = upgradedResult;
            setAccuracy('aa-js');
            setIsUpgraded(true);

            console.log('[useAstroLines] Positions upgraded to aa-js precision (0.01 arcsecond)');
          },
        });
      }

    } catch (err) {
      // Check if this request is still current
      if (currentRequestId.current !== requestId) {
        return;
      }

      console.error('Astrocartography calculation error:', err);
      setError(err instanceof Error ? err : new Error('Calculation failed'));
      setResult(null);
    } finally {
      if (currentRequestId.current === requestId) {
        setLoading(false);
      }
    }
  }, [enabled, forceBackend, calculateWithWorker, mergedOptions, calculateProgressive]);

  // Keep the calculate ref up to date
  calculateRef.current = calculate;

  // Create a stable key from birthData to detect changes
  const birthDataKey = birthData
    ? `${birthData.date.getTime()}-${birthData.latitude}-${birthData.longitude}`
    : '';

  // Recalculate when birthData changes OR when enabled changes from false to true
  // Using ref pattern to avoid infinite loop - the ref is always up to date
  // but doesn't trigger re-renders when the callback changes
  useEffect(() => {
    if (enabled) {
      console.log('useAstroLines: recalculating (birthData or enabled changed)...', birthDataKey, enabled);
      calculateRef.current?.();
    }
  }, [birthDataKey, enabled]);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      currentRequestId.current = null;
    };
  }, []);

  // Filter lines based on visibility
  const visiblePlanetaryLines = useMemo(() => {
    if (!result) return [];
    return result.planetaryLines.filter(line =>
      visibility.planets[line.planet] && visibility.lineTypes[line.lineType]
    );
  }, [result, visibility]);

  const visibleAspectLines = useMemo(() => {
    if (!result || !visibility.showAspects) return [];
    return result.aspectLines.filter(line => {
      // Filter by planet
      if (!visibility.planets[line.planet]) return false;
      // Filter by harmonious/disharmonious
      if (line.isHarmonious && !visibility.showHarmoniousAspects) return false;
      if (!line.isHarmonious && !visibility.showDisharmoniousAspects) return false;
      return true;
    });
  }, [result, visibility]);

  const visibleParanLines = useMemo(() => {
    if (!result || !visibility.showParans) return [];
    return result.paranLines.filter(line =>
      visibility.planets[line.planet1] && visibility.planets[line.planet2]
    );
  }, [result, visibility]);

  // Filter zenith points based on planet visibility and zenith toggle
  // Zenith points are shown when their planet is visible, MC line type is enabled, and zenith points are on
  const visibleZenithPoints = useMemo(() => {
    if (!result || !visibility.showZenithPoints) {
      return [];
    }
    return (result.zenithPoints || []).filter(point =>
      visibility.planets[point.planet] && visibility.lineTypes['MC']
    );
  }, [result, visibility]);

  // Visibility toggle functions
  const togglePlanet = useCallback((planet: Planet) => {
    setVisibility(prev => ({
      ...prev,
      planets: {
        ...prev.planets,
        [planet]: !prev.planets[planet],
      },
    }));
  }, []);

  const toggleLineType = useCallback((lineType: LineType) => {
    setVisibility(prev => ({
      ...prev,
      lineTypes: {
        ...prev.lineTypes,
        [lineType]: !prev.lineTypes[lineType],
      },
    }));
  }, []);

  const toggleAspects = useCallback(() => {
    setVisibility(prev => ({
      ...prev,
      showAspects: !prev.showAspects,
    }));
  }, []);

  const toggleHarmoniousAspects = useCallback(() => {
    setVisibility(prev => ({
      ...prev,
      showHarmoniousAspects: !prev.showHarmoniousAspects,
    }));
  }, []);

  const toggleDisharmoniousAspects = useCallback(() => {
    setVisibility(prev => ({
      ...prev,
      showDisharmoniousAspects: !prev.showDisharmoniousAspects,
    }));
  }, []);

  const toggleParans = useCallback(() => {
    setVisibility(prev => ({
      ...prev,
      showParans: !prev.showParans,
    }));
  }, []);

  const toggleZenithPoints = useCallback(() => {
    setVisibility(prev => ({
      ...prev,
      showZenithPoints: !prev.showZenithPoints,
    }));
  }, []);

  const toggleLocalSpace = useCallback(() => {
    setVisibility(prev => ({
      ...prev,
      showLocalSpace: !prev.showLocalSpace,
    }));
  }, []);

  const toggleLineLabels = useCallback(() => {
    setVisibility(prev => ({
      ...prev,
      showLineLabels: !prev.showLineLabels,
    }));
  }, []);

  const showAllPlanets = useCallback(() => {
    setVisibility(prev => ({
      ...prev,
      planets: Object.fromEntries(
        Object.keys(prev.planets).map(p => [p, true])
      ) as Record<Planet, boolean>,
    }));
  }, []);

  const hideAllPlanets = useCallback(() => {
    setVisibility(prev => ({
      ...prev,
      planets: Object.fromEntries(
        Object.keys(prev.planets).map(p => [p, false])
      ) as Record<Planet, boolean>,
    }));
  }, []);

  return {
    result,
    visiblePlanetaryLines,
    visibleAspectLines,
    visibleParanLines,
    visibleZenithPoints,
    loading,
    error,
    backend,
    progress,
    accuracy,
    isUpgraded,
    visibility,
    togglePlanet,
    toggleLineType,
    toggleAspects,
    toggleHarmoniousAspects,
    toggleDisharmoniousAspects,
    toggleParans,
    toggleZenithPoints,
    toggleLocalSpace,
    toggleLineLabels,
    setVisibility,
    showAllPlanets,
    hideAllPlanets,
    recalculate: calculate,
  };
}

/**
 * Convert birth data from PersonData format to BirthData format
 * Now includes local date/time for WASM to handle timezone conversion via chrono-tz
 */
export function personDataToBirthData(
  birthDate: string | undefined,
  birthTime: string | undefined,
  birthLat: number | undefined,
  birthLng: number | undefined
): BirthData | null {
  // Require coordinates
  if (birthLat === undefined || birthLng === undefined) {
    return null;
  }

  // Use current date as fallback if no birth date set
  const effectiveBirthDate = birthDate || new Date().toISOString().split('T')[0];

  // Use effective birth time (default to noon if not provided)
  const effectiveBirthTime = birthTime || '12:00';

  try {
    // Use the imported localTimeToUTCSync function for the fallback date
    const date = localTimeToUTCSync(effectiveBirthDate, effectiveBirthTime, birthLat, birthLng);

    if (isNaN(date.getTime())) {
      console.warn('Invalid birth date from timezone conversion');
      return null;
    }

    console.log('Birth data conversion:', {
      localDate: effectiveBirthDate,
      localTime: effectiveBirthTime,
      lat: birthLat,
      lng: birthLng,
      utcDate: date.toISOString(),
    });

    // Include local date/time and coordinates for WASM calculate_all_lines_local
    // This allows WASM to handle timezone conversion using chrono-tz internally
    return {
      date,
      latitude: birthLat,
      longitude: birthLng,
      // Local time data for WASM timezone conversion
      localDate: effectiveBirthDate,
      localTime: effectiveBirthTime,
      lat: birthLat,
      lng: birthLng,
    };
  } catch (err) {
    console.warn('Error parsing birth data:', err);
    return null;
  }
}

/**
 * Convert birth data from PersonData format to BirthData format (async version)
 * Fetches accurate timezone from API before conversion
 */
export async function personDataToBirthDataAsync(
  birthDate: string | undefined,
  birthTime: string | undefined,
  birthLat: number | undefined,
  birthLng: number | undefined
): Promise<BirthData | null> {
  // Require coordinates
  if (birthLat === undefined || birthLng === undefined) {
    return null;
  }

  // Use current date as fallback if no birth date set
  const effectiveBirthDate = birthDate || new Date().toISOString().split('T')[0];

  // Use effective birth time (default to noon if not provided)
  const effectiveBirthTime = birthTime || '12:00';

  try {
    const { localTimeToUTC } = await import('@/lib/timezone-utils');
    const date = await localTimeToUTC(effectiveBirthDate, effectiveBirthTime, birthLat, birthLng);

    if (isNaN(date.getTime())) {
      console.warn('Invalid birth date from timezone conversion');
      return null;
    }

    console.log('Birth data conversion (async):', {
      localDate: effectiveBirthDate,
      localTime: effectiveBirthTime,
      lat: birthLat,
      lng: birthLng,
      utcDate: date.toISOString(),
    });

    return {
      date,
      latitude: birthLat,
      longitude: birthLng,
    };
  } catch (err) {
    console.warn('Error parsing birth data:', err);
    return null;
  }
}

export default useAstroLines;
