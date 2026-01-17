/**
 * React hook for entrance detection
 *
 * Provides a simple interface for detecting building entrances
 * with loading states and error handling.
 */

import { useState, useCallback, useRef } from 'react';
import {
  entranceDetectionService,
  type EntranceDetectionResult,
  type EntranceDetectionOptions,
  type EntrancePoint,
} from '../services/entranceDetectionService';

// Re-export types for convenience
export type { EntranceDetectionResult, EntranceDetectionOptions, EntrancePoint };

export interface EntranceDetectionState {
  /** Current detection result */
  result: EntranceDetectionResult | null;
  /** Loading state */
  isLoading: boolean;
  /** Error if detection failed */
  error: Error | null;
  /** Current progress phase and percentage */
  progress: { phase: string; percent: number } | null;
}

export interface UseEntranceDetectionReturn extends EntranceDetectionState {
  /** Detect entrances by address */
  detectByAddress: (address: string, options?: EntranceDetectionOptions) => Promise<EntranceDetectionResult | null>;
  /** Detect entrances by coordinates */
  detectByCoordinates: (lat: number, lng: number, options?: EntranceDetectionOptions) => Promise<EntranceDetectionResult | null>;
  /** Detect entrances by Place ID */
  detectByPlaceId: (placeId: string, options?: EntranceDetectionOptions) => Promise<EntranceDetectionResult | null>;
  /** Get the primary entrance from current result */
  primaryEntrance: EntrancePoint | null;
  /** Reset state */
  reset: () => void;
  /** Clear the cache */
  clearCache: () => void;
}

/**
 * Hook for detecting building entrances
 *
 * @example
 * ```tsx
 * const { detectByAddress, result, isLoading, primaryEntrance } = useEntranceDetection();
 *
 * const handleSearch = async () => {
 *   await detectByAddress('123 Main St, City, State');
 *   // result is now populated
 * };
 *
 * if (primaryEntrance) {
 *   console.log(`Entrance at ${primaryEntrance.lat}, ${primaryEntrance.lng}`);
 * }
 * ```
 */
export function useEntranceDetection(): UseEntranceDetectionReturn {
  const [result, setResult] = useState<EntranceDetectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<{ phase: string; percent: number } | null>(null);

  // Track active request to prevent race conditions
  const activeRequestRef = useRef<number>(0);

  const createProgressHandler = useCallback(
    (requestId: number) => (phase: string, percent: number) => {
      // Only update if this is still the active request
      if (requestId === activeRequestRef.current) {
        setProgress({ phase, percent });
      }
    },
    []
  );

  const detectByAddress = useCallback(
    async (
      address: string,
      options: EntranceDetectionOptions = {}
    ): Promise<EntranceDetectionResult | null> => {
      const requestId = ++activeRequestRef.current;

      setIsLoading(true);
      setError(null);
      setProgress({ phase: 'Starting', percent: 0 });

      try {
        const detectionResult = await entranceDetectionService.detectByAddress(address, {
          ...options,
          onProgress: createProgressHandler(requestId),
        });

        // Only update state if this is still the active request
        if (requestId === activeRequestRef.current) {
          setResult(detectionResult);
          setProgress(null);
        }

        return detectionResult;
      } catch (err) {
        if (requestId === activeRequestRef.current) {
          const error = err instanceof Error ? err : new Error('Detection failed');
          setError(error);
          setProgress(null);
        }
        return null;
      } finally {
        if (requestId === activeRequestRef.current) {
          setIsLoading(false);
        }
      }
    },
    [createProgressHandler]
  );

  const detectByCoordinates = useCallback(
    async (
      lat: number,
      lng: number,
      options: EntranceDetectionOptions = {}
    ): Promise<EntranceDetectionResult | null> => {
      const requestId = ++activeRequestRef.current;

      setIsLoading(true);
      setError(null);
      setProgress({ phase: 'Starting', percent: 0 });

      try {
        const detectionResult = await entranceDetectionService.detectByCoordinates(lat, lng, {
          ...options,
          onProgress: createProgressHandler(requestId),
        });

        if (requestId === activeRequestRef.current) {
          setResult(detectionResult);
          setProgress(null);
        }

        return detectionResult;
      } catch (err) {
        if (requestId === activeRequestRef.current) {
          const error = err instanceof Error ? err : new Error('Detection failed');
          setError(error);
          setProgress(null);
        }
        return null;
      } finally {
        if (requestId === activeRequestRef.current) {
          setIsLoading(false);
        }
      }
    },
    [createProgressHandler]
  );

  const detectByPlaceId = useCallback(
    async (
      placeId: string,
      options: EntranceDetectionOptions = {}
    ): Promise<EntranceDetectionResult | null> => {
      const requestId = ++activeRequestRef.current;

      setIsLoading(true);
      setError(null);
      setProgress({ phase: 'Starting', percent: 0 });

      try {
        const detectionResult = await entranceDetectionService.detectByPlaceId(placeId, {
          ...options,
          onProgress: createProgressHandler(requestId),
        });

        if (requestId === activeRequestRef.current) {
          setResult(detectionResult);
          setProgress(null);
        }

        return detectionResult;
      } catch (err) {
        if (requestId === activeRequestRef.current) {
          const error = err instanceof Error ? err : new Error('Detection failed');
          setError(error);
          setProgress(null);
        }
        return null;
      } finally {
        if (requestId === activeRequestRef.current) {
          setIsLoading(false);
        }
      }
    },
    [createProgressHandler]
  );

  const reset = useCallback(() => {
    activeRequestRef.current++;
    setResult(null);
    setIsLoading(false);
    setError(null);
    setProgress(null);
  }, []);

  const clearCache = useCallback(() => {
    entranceDetectionService.clearCache();
  }, []);

  // Derive primary entrance from result
  const primaryEntrance = result
    ? entranceDetectionService.getPrimaryEntrance(result)
    : null;

  return {
    result,
    isLoading,
    error,
    progress,
    detectByAddress,
    detectByCoordinates,
    detectByPlaceId,
    primaryEntrance,
    reset,
    clearCache,
  };
}

/**
 * Hook for batch entrance detection
 *
 * Useful for scouting multiple properties at once
 */
export interface UseBatchEntranceDetectionReturn {
  /** Map of location key to detection result */
  results: Map<string, EntranceDetectionResult>;
  /** Loading state */
  isLoading: boolean;
  /** Errors by location key */
  errors: Map<string, Error>;
  /** Overall progress */
  progress: { phase: string; percent: number } | null;
  /** Detect entrances for multiple locations */
  detectBatch: (
    locations: Array<{ address?: string; lat?: number; lng?: number; placeId?: string }>,
    options?: EntranceDetectionOptions & { maxConcurrent?: number }
  ) => Promise<Map<string, EntranceDetectionResult>>;
  /** Reset state */
  reset: () => void;
}

export function useBatchEntranceDetection(): UseBatchEntranceDetectionReturn {
  const [results, setResults] = useState<Map<string, EntranceDetectionResult>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Map<string, Error>>(new Map());
  const [progress, setProgress] = useState<{ phase: string; percent: number } | null>(null);

  const activeRequestRef = useRef<number>(0);

  const detectBatch = useCallback(
    async (
      locations: Array<{ address?: string; lat?: number; lng?: number; placeId?: string }>,
      options: EntranceDetectionOptions & { maxConcurrent?: number } = {}
    ): Promise<Map<string, EntranceDetectionResult>> => {
      const requestId = ++activeRequestRef.current;

      setIsLoading(true);
      setErrors(new Map());
      setProgress({ phase: 'Starting batch detection', percent: 0 });

      try {
        const batchResults = await entranceDetectionService.detectBatch(locations, {
          ...options,
          onProgress: (phase, percent) => {
            if (requestId === activeRequestRef.current) {
              setProgress({ phase, percent });
            }
          },
        });

        if (requestId === activeRequestRef.current) {
          setResults(batchResults);
          setProgress(null);
        }

        return batchResults;
      } catch (err) {
        if (requestId === activeRequestRef.current) {
          console.error('Batch detection failed:', err);
          setProgress(null);
        }
        return new Map();
      } finally {
        if (requestId === activeRequestRef.current) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  const reset = useCallback(() => {
    activeRequestRef.current++;
    setResults(new Map());
    setIsLoading(false);
    setErrors(new Map());
    setProgress(null);
  }, []);

  return {
    results,
    isLoading,
    errors,
    progress,
    detectBatch,
    reset,
  };
}

export default useEntranceDetection;
