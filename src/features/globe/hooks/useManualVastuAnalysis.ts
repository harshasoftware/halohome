/**
 * Manual Vastu Analysis Hook
 *
 * Orchestrates the complete flow for manual property analysis:
 * 1. User draws boundary on map
 * 2. Calculate centroid from boundary
 * 3. Detect entrance direction (API → Street View → Road Access → Estimate)
 * 4. Run Vastu analysis with entrance direction
 *
 * Entrance Detection Priority:
 * 1. Google Geocoding API buildings[]/entrances[] (highest confidence)
 * 2. Street View validation
 * 3. Road access path from centroid (fallback)
 * 4. Boundary-based estimation (last resort)
 */

import { useState, useCallback, useRef } from 'react';
import { type LatLng } from '@/lib/building-footprints/coordinate-utils';
import {
  entranceDetectionService,
  type EntranceDetectionResult,
  type EntrancePoint,
} from '../services/entranceDetectionService';
import {
  roadAccessService,
  type RoadAccessPoint,
  type CardinalDirection,
} from '../services/roadAccessService';
import {
  performVastuAnalysis,
  type VastuDirection,
} from '@/lib/vastu-utils';
import type { VastuAnalysis } from '@/stores/vastuStore';

// ============================================================================
// Types
// ============================================================================

export interface ManualAnalysisState {
  /** The drawn boundary polygon */
  boundary: LatLng[] | null;
  /** Calculated centroid of the boundary */
  centroid: LatLng | null;
  /** Detected entrance information */
  entrance: EntranceInfo | null;
  /** Road access information */
  roadAccess: RoadAccessPoint | null;
  /** Complete Vastu analysis result */
  vastuAnalysis: VastuAnalysis | null;
  /** Loading state */
  isLoading: boolean;
  /** Current processing phase */
  phase: AnalysisPhase;
  /** Progress percentage (0-100) */
  progress: number;
  /** Error if analysis failed */
  error: Error | null;
}

export interface EntranceInfo {
  /** Entrance location */
  point: LatLng;
  /** Cardinal direction the entrance faces */
  direction: CardinalDirection;
  /** Confidence score (0-1) */
  confidence: number;
  /** Detection method used */
  source: EntrancePoint['source'];
  /** Full detection result */
  detectionResult: EntranceDetectionResult;
}

export type AnalysisPhase =
  | 'idle'
  | 'validating_boundary'
  | 'calculating_centroid'
  | 'detecting_entrance'
  | 'finding_road_access'
  | 'running_vastu_analysis'
  | 'complete'
  | 'error';

export interface UseManualVastuAnalysisReturn extends ManualAnalysisState {
  /** Set boundary and trigger analysis */
  analyzeBoundary: (boundary: LatLng[], address?: string) => Promise<VastuAnalysis | null>;
  /** Update just the entrance direction (manual override) */
  setEntranceDirection: (direction: CardinalDirection) => void;
  /** Re-run analysis with current boundary */
  reanalyze: () => Promise<VastuAnalysis | null>;
  /** Reset all state */
  reset: () => void;
  /** Get formatted entrance description */
  getEntranceDescription: () => string;
}

// ============================================================================
// Constants
// ============================================================================

const MIN_BOUNDARY_POINTS = 3;
const MAX_BOUNDARY_AREA_SQM = 200000 * 0.0929; // 200,000 sqft in sqm

// ============================================================================
// Hook Implementation
// ============================================================================

export function useManualVastuAnalysis(): UseManualVastuAnalysisReturn {
  const [boundary, setBoundary] = useState<LatLng[] | null>(null);
  const [centroid, setCentroid] = useState<LatLng | null>(null);
  const [entrance, setEntrance] = useState<EntranceInfo | null>(null);
  const [roadAccess, setRoadAccess] = useState<RoadAccessPoint | null>(null);
  const [vastuAnalysis, setVastuAnalysis] = useState<VastuAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [phase, setPhase] = useState<AnalysisPhase>('idle');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<Error | null>(null);

  // Track current address for re-analysis
  const currentAddressRef = useRef<string>('');
  const activeRequestRef = useRef<number>(0);

  /**
   * Calculate centroid from boundary polygon.
   */
  const calculateCentroid = useCallback((coords: LatLng[]): LatLng => {
    const sumLat = coords.reduce((sum, p) => sum + p.lat, 0);
    const sumLng = coords.reduce((sum, p) => sum + p.lng, 0);
    return {
      lat: sumLat / coords.length,
      lng: sumLng / coords.length,
    };
  }, []);

  /**
   * Validate boundary polygon.
   */
  const validateBoundary = useCallback((coords: LatLng[]): { valid: boolean; error?: string } => {
    if (coords.length < MIN_BOUNDARY_POINTS) {
      return { valid: false, error: `Boundary must have at least ${MIN_BOUNDARY_POINTS} points` };
    }

    // Check for self-intersection (simplified check)
    // Full check would use proper polygon intersection algorithm

    return { valid: true };
  }, []);

  /**
   * Main analysis function - orchestrates the full flow.
   */
  const analyzeBoundary = useCallback(
    async (boundaryCoords: LatLng[], address?: string): Promise<VastuAnalysis | null> => {
      const requestId = ++activeRequestRef.current;
      currentAddressRef.current = address || '';

      setIsLoading(true);
      setError(null);
      setPhase('validating_boundary');
      setProgress(5);

      try {
        // Step 1: Validate boundary
        const validation = validateBoundary(boundaryCoords);
        if (!validation.valid) {
          throw new Error(validation.error);
        }

        if (requestId !== activeRequestRef.current) return null;

        setBoundary(boundaryCoords);
        setPhase('calculating_centroid');
        setProgress(10);

        // Step 2: Calculate centroid
        const centroidPoint = calculateCentroid(boundaryCoords);
        setCentroid(centroidPoint);

        if (requestId !== activeRequestRef.current) return null;

        setPhase('detecting_entrance');
        setProgress(20);

        // Step 3: Detect entrance using the full fallback chain
        const entranceResult = await entranceDetectionService.detectByCoordinates(
          centroidPoint.lat,
          centroidPoint.lng,
          {
            boundary: boundaryCoords,
            useRoadAccessFallback: true,
            onProgress: (_, percent) => {
              if (requestId === activeRequestRef.current) {
                setProgress(20 + percent * 0.3); // 20-50%
              }
            },
          }
        );

        if (requestId !== activeRequestRef.current) return null;

        const primaryEntrance = entranceResult.entrances[0];
        if (!primaryEntrance) {
          throw new Error('Could not detect entrance direction');
        }

        const entranceInfo: EntranceInfo = {
          point: { lat: primaryEntrance.lat, lng: primaryEntrance.lng },
          direction: (primaryEntrance.facingDirection as CardinalDirection) || 'S',
          confidence: primaryEntrance.confidence,
          source: primaryEntrance.source,
          detectionResult: entranceResult,
        };
        setEntrance(entranceInfo);

        // Step 4: If entrance was detected via road access, store that info
        if (primaryEntrance.source === 'road_access') {
          setPhase('finding_road_access');
          setProgress(55);

          // Get detailed road access info
          try {
            const roadAccessResult = await roadAccessService.findRoadAccess(
              centroidPoint,
              { boundary: boundaryCoords }
            );
            setRoadAccess(roadAccessResult);
          } catch {
            // Road access details are optional, continue
          }
        }

        if (requestId !== activeRequestRef.current) return null;

        setPhase('running_vastu_analysis');
        setProgress(60);

        // Step 5: Run Vastu analysis
        const analysis = performVastuAnalysis(
          address || `${centroidPoint.lat.toFixed(6)}, ${centroidPoint.lng.toFixed(6)}`,
          centroidPoint,
          boundaryCoords,
          entranceInfo.direction as VastuDirection
        );

        if (requestId !== activeRequestRef.current) return null;

        setVastuAnalysis(analysis);
        setPhase('complete');
        setProgress(100);

        return analysis;
      } catch (err) {
        if (requestId === activeRequestRef.current) {
          const error = err instanceof Error ? err : new Error('Analysis failed');
          setError(error);
          setPhase('error');
        }
        return null;
      } finally {
        if (requestId === activeRequestRef.current) {
          setIsLoading(false);
        }
      }
    },
    [calculateCentroid, validateBoundary]
  );

  /**
   * Manually override entrance direction and re-run Vastu analysis.
   */
  const setEntranceDirection = useCallback(
    (direction: CardinalDirection) => {
      if (!boundary || !centroid) return;

      // Update entrance info with manual override
      setEntrance((prev) => ({
        point: prev?.point || centroid,
        direction,
        confidence: 1.0, // Manual input = full confidence
        source: 'centroid_estimate' as const, // Mark as manual
        detectionResult: prev?.detectionResult || {
          entrances: [],
          formattedAddress: '',
          detectionMethod: 'estimated' as const,
          timestamp: Date.now(),
        },
      }));

      // Re-run Vastu analysis with new direction
      const analysis = performVastuAnalysis(
        currentAddressRef.current || `${centroid.lat.toFixed(6)}, ${centroid.lng.toFixed(6)}`,
        centroid,
        boundary,
        direction as VastuDirection
      );
      setVastuAnalysis(analysis);
    },
    [boundary, centroid]
  );

  /**
   * Re-run analysis with current boundary.
   */
  const reanalyze = useCallback(async () => {
    if (!boundary) return null;
    return analyzeBoundary(boundary, currentAddressRef.current);
  }, [boundary, analyzeBoundary]);

  /**
   * Reset all state.
   */
  const reset = useCallback(() => {
    activeRequestRef.current++;
    setBoundary(null);
    setCentroid(null);
    setEntrance(null);
    setRoadAccess(null);
    setVastuAnalysis(null);
    setIsLoading(false);
    setPhase('idle');
    setProgress(0);
    setError(null);
    currentAddressRef.current = '';
  }, []);

  /**
   * Get human-readable entrance description.
   */
  const getEntranceDescription = useCallback((): string => {
    if (!entrance) return 'No entrance detected';

    const sourceDescriptions: Record<EntrancePoint['source'], string> = {
      google_api: 'detected via Google Maps',
      google_places: 'detected via Google Places',
      road_access: 'determined from road access',
      street_facing: 'estimated from street orientation',
      centroid_estimate: 'manually set',
    };

    const confidenceLevel =
      entrance.confidence >= 0.8
        ? 'high confidence'
        : entrance.confidence >= 0.5
        ? 'medium confidence'
        : 'low confidence';

    return `${entrance.direction}-facing entrance (${sourceDescriptions[entrance.source]}, ${confidenceLevel})`;
  }, [entrance]);

  return {
    // State
    boundary,
    centroid,
    entrance,
    roadAccess,
    vastuAnalysis,
    isLoading,
    phase,
    progress,
    error,

    // Actions
    analyzeBoundary,
    setEntranceDirection,
    reanalyze,
    reset,
    getEntranceDescription,
  };
}

/**
 * Hook for batch manual analysis (scouting multiple properties).
 */
export interface BatchAnalysisResult {
  id: string;
  boundary: LatLng[];
  centroid: LatLng;
  entrance: EntranceInfo | null;
  vastuAnalysis: VastuAnalysis | null;
  error?: Error;
}

export interface UseBatchManualAnalysisReturn {
  results: BatchAnalysisResult[];
  isLoading: boolean;
  progress: { current: number; total: number; phase: string };
  error: Error | null;
  analyzeMultiple: (
    properties: Array<{ id: string; boundary: LatLng[]; address?: string }>
  ) => Promise<BatchAnalysisResult[]>;
  reset: () => void;
}

export function useBatchManualAnalysis(): UseBatchManualAnalysisReturn {
  const [results, setResults] = useState<BatchAnalysisResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, phase: '' });
  const [error, setError] = useState<Error | null>(null);

  const activeRequestRef = useRef<number>(0);

  const analyzeMultiple = useCallback(
    async (
      properties: Array<{ id: string; boundary: LatLng[]; address?: string }>
    ): Promise<BatchAnalysisResult[]> => {
      const requestId = ++activeRequestRef.current;
      const batchResults: BatchAnalysisResult[] = [];
      const total = properties.length;

      setIsLoading(true);
      setError(null);
      setResults([]);

      try {
        // First, detect entrances for all properties in batch
        setProgress({ current: 0, total, phase: 'Detecting entrances' });

        const entranceResults = await entranceDetectionService.detectBatch(
          properties.map((p) => {
            const centroid = {
              lat: p.boundary.reduce((sum, pt) => sum + pt.lat, 0) / p.boundary.length,
              lng: p.boundary.reduce((sum, pt) => sum + pt.lng, 0) / p.boundary.length,
            };
            return { lat: centroid.lat, lng: centroid.lng };
          }),
          {
            useRoadAccessFallback: true,
            maxConcurrent: 5,
            onProgress: (phase, percent) => {
              if (requestId === activeRequestRef.current) {
                setProgress({
                  current: Math.round((percent / 100) * total * 0.5),
                  total,
                  phase: 'Detecting entrances',
                });
              }
            },
          }
        );

        if (requestId !== activeRequestRef.current) return [];

        // Now run Vastu analysis for each property
        setProgress({ current: Math.round(total * 0.5), total, phase: 'Running Vastu analysis' });

        for (let i = 0; i < properties.length; i++) {
          const prop = properties[i];
          const centroid = {
            lat: prop.boundary.reduce((sum, pt) => sum + pt.lat, 0) / prop.boundary.length,
            lng: prop.boundary.reduce((sum, pt) => sum + pt.lng, 0) / prop.boundary.length,
          };

          const entranceKey = `${centroid.lat},${centroid.lng}`;
          const entranceResult = entranceResults.get(entranceKey);
          const primaryEntrance = entranceResult?.entrances[0];

          let entranceInfo: EntranceInfo | null = null;
          if (primaryEntrance) {
            entranceInfo = {
              point: { lat: primaryEntrance.lat, lng: primaryEntrance.lng },
              direction: (primaryEntrance.facingDirection as CardinalDirection) || 'S',
              confidence: primaryEntrance.confidence,
              source: primaryEntrance.source,
              detectionResult: entranceResult!,
            };
          }

          let vastuAnalysis: VastuAnalysis | null = null;
          try {
            vastuAnalysis = performVastuAnalysis(
              prop.address || `Property ${prop.id}`,
              centroid,
              prop.boundary,
              (entranceInfo?.direction || 'S') as VastuDirection
            );
          } catch (err) {
            console.error(`Vastu analysis failed for ${prop.id}:`, err);
          }

          batchResults.push({
            id: prop.id,
            boundary: prop.boundary,
            centroid,
            entrance: entranceInfo,
            vastuAnalysis,
          });

          if (requestId === activeRequestRef.current) {
            setProgress({
              current: Math.round(total * 0.5) + i + 1,
              total: total * 1.5,
              phase: 'Running Vastu analysis',
            });
            setResults([...batchResults]);
          }
        }

        if (requestId === activeRequestRef.current) {
          setProgress({ current: total, total, phase: 'Complete' });
        }

        return batchResults;
      } catch (err) {
        if (requestId === activeRequestRef.current) {
          const error = err instanceof Error ? err : new Error('Batch analysis failed');
          setError(error);
        }
        return batchResults;
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
    setResults([]);
    setIsLoading(false);
    setProgress({ current: 0, total: 0, phase: '' });
    setError(null);
  }, []);

  return {
    results,
    isLoading,
    progress,
    error,
    analyzeMultiple,
    reset,
  };
}

export default useManualVastuAnalysis;
