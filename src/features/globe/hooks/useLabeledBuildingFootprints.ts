/**
 * React hook for labeled building footprints with entrance detection
 *
 * Combines SAM v2 building segmentation with entrance detection and labeling
 * for use in scouting and Vastu analysis features.
 */

import { useState, useCallback, useRef } from 'react';
import {
  type BuildingFootprint,
  buildingFootprintsService,
} from '../services/buildingFootprintsService';
import {
  type LabeledBuildingFootprint,
  type LabeledEntrance,
  type LabelingOptions,
  entranceLabelingService,
  createEntranceMarker,
} from '../services/entranceLabelingService';
import { type EntranceDetectionResult } from '../services/entranceDetectionService';

// Re-export types for convenience
export type { LabeledBuildingFootprint, LabeledEntrance, LabelingOptions };

export interface LabeledFootprintsState {
  /** Labeled building footprints with entrance data */
  footprints: LabeledBuildingFootprint[];
  /** Loading state */
  isLoading: boolean;
  /** Error if processing failed */
  error: Error | null;
  /** Current progress */
  progress: { phase: string; percent: number } | null;
}

export interface UseLabeledBuildingFootprintsReturn extends LabeledFootprintsState {
  /** Label entrances on existing footprints */
  labelFootprints: (
    footprints: BuildingFootprint[],
    options?: LabelingOptions
  ) => Promise<LabeledBuildingFootprint[]>;

  /** Search and label footprints at a location */
  searchAndLabel: (
    lat: number,
    lng: number,
    options?: LabelingOptions
  ) => Promise<LabeledBuildingFootprint[]>;

  /** Label a single footprint with a known entrance result */
  labelSingleFootprint: (
    footprint: BuildingFootprint,
    entranceResult: EntranceDetectionResult,
    options?: LabelingOptions
  ) => Promise<LabeledBuildingFootprint>;

  /** Get entrance markers for map display */
  getEntranceMarkers: () => Array<{
    position: { lat: number; lng: number };
    rotation: number;
    label: string;
    isPrimary: boolean;
    buildingId: string;
  }>;

  /** Get primary entrance for a building */
  getPrimaryEntrance: (buildingId: string) => LabeledEntrance | null;

  /** Reset state */
  reset: () => void;
}

/**
 * Hook for getting labeled building footprints with entrance detection
 *
 * @example
 * ```tsx
 * const {
 *   searchAndLabel,
 *   footprints,
 *   isLoading,
 *   getEntranceMarkers
 * } = useLabeledBuildingFootprints();
 *
 * // Search for buildings and detect entrances
 * const handleSearch = async () => {
 *   await searchAndLabel(37.7749, -122.4194, {
 *     validateWithStreetView: true
 *   });
 * };
 *
 * // Render entrance markers on map
 * const markers = getEntranceMarkers();
 * markers.forEach(marker => {
 *   // Add marker to globe/map
 * });
 * ```
 */
export function useLabeledBuildingFootprints(): UseLabeledBuildingFootprintsReturn {
  const [footprints, setFootprints] = useState<LabeledBuildingFootprint[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [progress, setProgress] = useState<{ phase: string; percent: number } | null>(null);

  // Track active request to prevent race conditions
  const activeRequestRef = useRef<number>(0);

  const createProgressHandler = useCallback(
    (requestId: number) => (phase: string, percent: number) => {
      if (requestId === activeRequestRef.current) {
        setProgress({ phase, percent });
      }
    },
    []
  );

  const labelFootprints = useCallback(
    async (
      buildingFootprints: BuildingFootprint[],
      options: LabelingOptions = {}
    ): Promise<LabeledBuildingFootprint[]> => {
      const requestId = ++activeRequestRef.current;

      setIsLoading(true);
      setError(null);
      setProgress({ phase: 'Starting', percent: 0 });

      try {
        const labeled = await entranceLabelingService.labelMultipleBuildingEntrances(
          buildingFootprints,
          {
            ...options,
            onProgress: createProgressHandler(requestId),
          }
        );

        if (requestId === activeRequestRef.current) {
          setFootprints(labeled);
          setProgress(null);
        }

        return labeled;
      } catch (err) {
        if (requestId === activeRequestRef.current) {
          const error = err instanceof Error ? err : new Error('Labeling failed');
          setError(error);
          setProgress(null);
        }
        return [];
      } finally {
        if (requestId === activeRequestRef.current) {
          setIsLoading(false);
        }
      }
    },
    [createProgressHandler]
  );

  const searchAndLabel = useCallback(
    async (
      lat: number,
      lng: number,
      options: LabelingOptions = {}
    ): Promise<LabeledBuildingFootprint[]> => {
      const requestId = ++activeRequestRef.current;

      setIsLoading(true);
      setError(null);
      setProgress({ phase: 'Searching for buildings', percent: 0 });

      try {
        // First, search for buildings using SAM v2
        const searchResult = await buildingFootprintsService.searchAtLocation(lat, lng, {
          extractBuildings: true,
          extractPlots: false,
          onProgress: (phase, percent) => {
            if (requestId === activeRequestRef.current) {
              setProgress({ phase, percent: percent * 0.4 }); // 0-40%
            }
          },
        });

        if (!searchResult) {
          if (requestId === activeRequestRef.current) {
            setFootprints([]);
            setProgress(null);
          }
          return [];
        }

        // Label the building with entrance detection
        if (requestId === activeRequestRef.current) {
          setProgress({ phase: 'Detecting entrances', percent: 40 });
        }

        const labeled = await entranceLabelingService.labelMultipleBuildingEntrances(
          [searchResult],
          {
            ...options,
            onProgress: (phase, percent) => {
              if (requestId === activeRequestRef.current) {
                setProgress({ phase, percent: 40 + percent * 0.6 }); // 40-100%
              }
            },
          }
        );

        if (requestId === activeRequestRef.current) {
          setFootprints(labeled);
          setProgress(null);
        }

        return labeled;
      } catch (err) {
        if (requestId === activeRequestRef.current) {
          const error = err instanceof Error ? err : new Error('Search and label failed');
          setError(error);
          setProgress(null);
        }
        return [];
      } finally {
        if (requestId === activeRequestRef.current) {
          setIsLoading(false);
        }
      }
    },
    []
  );

  const labelSingleFootprint = useCallback(
    async (
      footprint: BuildingFootprint,
      entranceResult: EntranceDetectionResult,
      options: LabelingOptions = {}
    ): Promise<LabeledBuildingFootprint> => {
      const requestId = ++activeRequestRef.current;

      setIsLoading(true);
      setError(null);
      setProgress({ phase: 'Labeling entrance', percent: 0 });

      try {
        const labeled = await entranceLabelingService.labelBuildingEntrances(
          footprint,
          entranceResult,
          {
            ...options,
            onProgress: createProgressHandler(requestId),
          }
        );

        if (requestId === activeRequestRef.current) {
          // Add or update in footprints list
          setFootprints((prev) => {
            const existing = prev.findIndex((f) => f.id === labeled.id);
            if (existing >= 0) {
              const updated = [...prev];
              updated[existing] = labeled;
              return updated;
            }
            return [...prev, labeled];
          });
          setProgress(null);
        }

        return labeled;
      } catch (err) {
        if (requestId === activeRequestRef.current) {
          const error = err instanceof Error ? err : new Error('Labeling failed');
          setError(error);
          setProgress(null);
        }
        // Return unlabeled footprint on error
        return {
          ...footprint,
          labeledEntrances: [],
          hasStreetViewValidation: false,
        };
      } finally {
        if (requestId === activeRequestRef.current) {
          setIsLoading(false);
        }
      }
    },
    [createProgressHandler]
  );

  const getEntranceMarkers = useCallback(() => {
    const markers: Array<{
      position: { lat: number; lng: number };
      rotation: number;
      label: string;
      isPrimary: boolean;
      buildingId: string;
    }> = [];

    for (const footprint of footprints) {
      for (const entrance of footprint.labeledEntrances) {
        const marker = createEntranceMarker(entrance);
        markers.push({
          ...marker,
          buildingId: footprint.id,
        });
      }
    }

    return markers;
  }, [footprints]);

  const getPrimaryEntrance = useCallback(
    (buildingId: string): LabeledEntrance | null => {
      const footprint = footprints.find((f) => f.id === buildingId);
      return footprint?.primaryEntrance ?? null;
    },
    [footprints]
  );

  const reset = useCallback(() => {
    activeRequestRef.current++;
    setFootprints([]);
    setIsLoading(false);
    setError(null);
    setProgress(null);
  }, []);

  return {
    footprints,
    isLoading,
    error,
    progress,
    labelFootprints,
    searchAndLabel,
    labelSingleFootprint,
    getEntranceMarkers,
    getPrimaryEntrance,
    reset,
  };
}

/**
 * Hook for getting entrance-related Vastu information
 */
export interface VastuEntranceInfo {
  /** The labeled entrance */
  entrance: LabeledEntrance;
  /** Cardinal direction the entrance faces */
  direction: string;
  /** Vastu score for this entrance direction (0-100) */
  vastuScore: number;
  /** Vastu interpretation */
  interpretation: 'auspicious' | 'neutral' | 'inauspicious';
  /** Recommendation text */
  recommendation: string;
}

/**
 * Get Vastu analysis for building entrances
 */
export function useVastuEntranceAnalysis(
  footprint: LabeledBuildingFootprint | null
): VastuEntranceInfo[] {
  if (!footprint) return [];

  // Vastu scores by direction (traditional Vastu Shastra)
  const vastuScores: Record<string, { score: number; interpretation: 'auspicious' | 'neutral' | 'inauspicious' }> = {
    'N': { score: 85, interpretation: 'auspicious' },
    'NE': { score: 95, interpretation: 'auspicious' }, // Most auspicious
    'E': { score: 90, interpretation: 'auspicious' },
    'SE': { score: 60, interpretation: 'neutral' },
    'S': { score: 40, interpretation: 'inauspicious' },
    'SW': { score: 30, interpretation: 'inauspicious' }, // Least favorable
    'W': { score: 70, interpretation: 'neutral' },
    'NW': { score: 75, interpretation: 'neutral' },
  };

  const recommendations: Record<string, string> = {
    'N': 'North-facing entrance brings prosperity and positive energy. Good for business and career.',
    'NE': 'Northeast is the most auspicious direction. Excellent for spiritual growth and overall well-being.',
    'E': 'East-facing entrance welcomes morning sun and positive energy. Great for health and vitality.',
    'SE': 'Southeast entrance is acceptable. Consider adding plants to enhance positive energy.',
    'S': 'South-facing entrance may bring challenges. Consider using blue or green colors at entrance.',
    'SW': 'Southwest entrance is not recommended. Consider remedies like placing heavy objects nearby.',
    'W': 'West-facing entrance is neutral. Good for those in creative professions.',
    'NW': 'Northwest entrance promotes travel and communication. Good for social connections.',
  };

  return footprint.labeledEntrances.map((entrance) => {
    const direction = entrance.facingDirection;
    const vastuInfo = vastuScores[direction] || { score: 50, interpretation: 'neutral' as const };

    return {
      entrance,
      direction,
      vastuScore: vastuInfo.score,
      interpretation: vastuInfo.interpretation,
      recommendation: recommendations[direction] || 'No specific recommendation available.',
    };
  });
}

export default useLabeledBuildingFootprints;
