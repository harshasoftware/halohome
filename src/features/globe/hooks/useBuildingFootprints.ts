/**
 * React hook for building footprints service.
 *
 * Provides easy access to building footprint extraction with loading states,
 * error handling, and automatic Vastu score calculation.
 */

import { useState, useCallback, useRef } from 'react';
import {
  buildingFootprintsService,
  type BuildingFootprint,
  type FootprintSearchResult,
  type SearchOptions,
} from '../services/buildingFootprintsService';
import {
  entranceDetectionService,
  type EntranceDetectionResult,
} from '../services/entranceDetectionService';
import {
  performVastuAnalysis,
  type VastuDirection,
} from '@/lib/vastu-utils';
import type { VastuAnalysis } from '@/stores/vastuStore';

export interface ParcelWithVastu extends BuildingFootprint {
  vastuScore: number;
  vastuAnalysis: VastuAnalysis | null;
  entranceDirection: VastuDirection;
  highlights: string[];
  issues: string[];
}

export interface UseBuildingFootprintsResult {
  /** Found parcels with Vastu analysis */
  parcels: ParcelWithVastu[];
  /** Loading state */
  isLoading: boolean;
  /** Error message if any */
  error: string | null;
  /** Current progress phase */
  progressPhase: string;
  /** Progress percentage (0-100) */
  progressPercent: number;
  /** ZIP boundary polygon (if search was by ZIP code) */
  zipBoundary?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  /** Search by ZIP code */
  searchByZipCode: (zipCode: string, options?: {}) => Promise<void>;
  /** Search by coordinates */
  searchByCoordinates: (lat: number, lng: number) => Promise<void>;
  /** Search at specific location (single parcel) */
  searchAtLocation: (lat: number, lng: number) => Promise<ParcelWithVastu | null>;
  /** Clear results */
  clear: () => void;
  /** Search stats */
  stats: {
    total: number;
    excellent: number;
    good: number;
    needsWork: number;
    avgScore: number;
    processingTimeMs: number;
  };
}

const DEFAULT_OPTIONS: SearchOptions = {
  extractPlots: true,
  extractBuildings: true,
  maxResults: 30,
  minConfidence: 0.4,
  maxTiles: 20, // Limit to 20 tiles for now
};

/**
 * Hook for searching and analyzing building footprints.
 */
export function useBuildingFootprints(
  options: SearchOptions = {}
): UseBuildingFootprintsResult {
  const [parcels, setParcels] = useState<ParcelWithVastu[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressPhase, setProgressPhase] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [tileInfo, setTileInfo] = useState<{ current: number; total: number } | null>(null);
  const [processingTimeMs, setProcessingTimeMs] = useState(0);
  const [currentBounds, setCurrentBounds] = useState<{ north: number; south: number; east: number; west: number } | null>(null);
  const [zipBoundary, setZipBoundary] = useState<GeoJSON.Polygon | GeoJSON.MultiPolygon | null>(null);

  const opts = { ...DEFAULT_OPTIONS, ...options };
  const abortControllerRef = useRef<AbortController | null>(null);
  const searchSeqRef = useRef(0); // Monotonic search id to ignore stale async results

  const handleProgress = useCallback((phase: string, percent: number) => {
    setProgressPhase(phase);
    setProgressPercent(percent);
  }, []);

  const processFootprints = useCallback(
    async (footprints: BuildingFootprint[]): Promise<ParcelWithVastu[]> => {
      if (footprints.length === 0) return [];

      // Step 1: Batch detect entrances for all footprints
      handleProgress('Detecting entrances', 85);

      const entranceLocations = footprints.map((f) => ({
        lat: f.centroid.lat,
        lng: f.centroid.lng,
      }));

      let entranceResults: Map<string, EntranceDetectionResult> = new Map();
      try {
        entranceResults = await entranceDetectionService.detectBatch(
          entranceLocations,
          {
            useRoadAccessFallback: true,
            maxConcurrent: 5,
          }
        );
      } catch (err) {
        console.warn('Batch entrance detection failed:', err);
      }

      // Step 2: Run Vastu analysis for each footprint with detected entrance
      handleProgress('Analyzing Vastu for parcels', 92);

      const parcelsWithVastu: ParcelWithVastu[] = [];

      for (const footprint of footprints) {
        try {
          // Get entrance direction for this footprint
          const entranceKey = `${footprint.centroid.lat},${footprint.centroid.lng}`;
          const entranceResult = entranceResults.get(entranceKey);
          const detectedEntrance = entranceResult?.entrances[0];
          const entranceDirection = (detectedEntrance?.facingDirection || 'N') as VastuDirection;

          // Convert polygon coordinates for Vastu analysis
          const boundary = footprint.coordinates.map((c) => ({
            lat: c.lat,
            lng: c.lng,
          }));

          // Perform Vastu analysis with detected entrance direction
          const vastuAnalysis = performVastuAnalysis(
            undefined, // address
            footprint.centroid,
            boundary,
            entranceDirection
          );

          // Generate highlights and issues
          const { highlights, issues } = generateHighlightsAndIssues(
            vastuAnalysis,
            footprint.shape,
            detectedEntrance?.source
          );

          parcelsWithVastu.push({
            ...footprint,
            vastuScore: vastuAnalysis?.overallScore ?? 50,
            vastuAnalysis,
            entranceDirection,
            highlights,
            issues,
          });
        } catch (err) {
          // If Vastu analysis fails, still include the parcel with default values
          parcelsWithVastu.push({
            ...footprint,
            vastuScore: 50,
            vastuAnalysis: null,
            entranceDirection: 'N',
            highlights: [],
            issues: ['Unable to perform complete Vastu analysis'],
          });
        }
      }

      // Sort by Vastu score (highest first)
      parcelsWithVastu.sort((a, b) => b.vastuScore - a.vastuScore);

      return parcelsWithVastu;
    },
    [handleProgress]
  );

  const searchByZipCode = useCallback(
    async (zipCode: string, searchOptions?: {}) => {
      // Cancel any pending request
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();
      const seq = ++searchSeqRef.current;

      setIsLoading(true);
      setError(null);
      setParcels([]);
      // CRITICAL: clear ZIP boundary at the start of every search to prevent
      // stale boundary emissions for the next ZIP code (race/state-machine issue).
      setZipBoundary(null);
      setProgressPhase('Starting search');
      setProgressPercent(0);
      setTileInfo(null);

      try {
        // Get bounds for this ZIP code to track progress
        // We'll get bounds from the result, but need to geocode first
        const result = await buildingFootprintsService.searchByZipCode(zipCode, {
          ...opts,
          onProgress: handleProgress,
        });
        if (seq !== searchSeqRef.current) return;
        
        // Store bounds from result for tile progress tracking
        if (result.bounds) {
          setCurrentBounds(result.bounds);
        }
        
        // Store ZIP boundary if available
        if (result.zipBoundary) {
          console.log(`[useBuildingFootprints] Storing ZIP boundary from search result`);
          setZipBoundary(result.zipBoundary);
        } else {
          setZipBoundary(null);
        }

        const parcelsWithVastu = await processFootprints(result.footprints);
        if (seq !== searchSeqRef.current) return;

        setParcels(parcelsWithVastu);
        setProcessingTimeMs(result.processingTimeMs);
        handleProgress('Complete', 100);
      } catch (err) {
        if (seq !== searchSeqRef.current) return;
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message || 'Search failed');
        }
      } finally {
        if (seq === searchSeqRef.current) {
          setIsLoading(false);
        }
      }
    },
    [opts, handleProgress, processFootprints]
  );

  const searchByCoordinates = useCallback(
    async (lat: number, lng: number) => {
      abortControllerRef.current?.abort();
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      setError(null);
      setParcels([]);
      setProgressPhase('Starting search');
      setProgressPercent(0);

      try {
        const bounds = {
          north: lat + 0.01,
          south: lat - 0.01,
          east: lng + 0.01,
          west: lng - 0.01,
        };

        const result = await buildingFootprintsService.searchByBounds(bounds, {
          ...opts,
          onProgress: handleProgress,
        });

        const parcelsWithVastu = await processFootprints(result.footprints);

        setParcels(parcelsWithVastu);
        setProcessingTimeMs(result.processingTimeMs);
        handleProgress('Complete', 100);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
          setError(err.message || 'Search failed');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [opts, handleProgress, processFootprints]
  );

  const searchAtLocation = useCallback(
    async (lat: number, lng: number): Promise<ParcelWithVastu | null> => {
      try {
        const footprint = await buildingFootprintsService.searchAtLocation(lat, lng, opts);

        if (!footprint) return null;

        const [parcelWithVastu] = await processFootprints([footprint]);
        return parcelWithVastu || null;
      } catch {
        return null;
      }
    },
    [opts, processFootprints]
  );

  const clear = useCallback(() => {
    abortControllerRef.current?.abort();
    // Invalidate any in-flight async handlers
    searchSeqRef.current += 1;
    setParcels([]);
    setError(null);
    setProgressPhase('');
    setProgressPercent(0);
    setTileInfo(null);
    setCurrentBounds(null);
    setZipBoundary(null);
  }, []);


  // Calculate stats
  const stats = {
    total: parcels.length,
    excellent: parcels.filter((p) => p.vastuScore >= 80).length,
    good: parcels.filter((p) => p.vastuScore >= 60 && p.vastuScore < 80).length,
    needsWork: parcels.filter((p) => p.vastuScore < 60).length,
    avgScore:
      parcels.length > 0
        ? Math.round(parcels.reduce((sum, p) => sum + p.vastuScore, 0) / parcels.length)
        : 0,
    processingTimeMs,
  };

  return {
    parcels,
    isLoading,
    error,
    progressPhase,
    progressPercent,
    zipBoundary,
    searchByZipCode,
    searchByCoordinates,
    searchAtLocation,
    clear,
    stats,
  };
}

/**
 * Generate highlights and issues based on Vastu analysis.
 */
function generateHighlightsAndIssues(
  analysis: VastuAnalysis | null,
  shape: BuildingFootprint['shape'],
  entranceSource?: string
): { highlights: string[]; issues: string[] } {
  const highlights: string[] = [];
  const issues: string[] = [];

  if (!analysis) {
    return { highlights, issues };
  }

  // Shape-based highlights
  if (shape === 'square') {
    highlights.push('Square plot (ideal for Vastu)');
  } else if (shape === 'rectangle') {
    highlights.push('Rectangular plot (favorable shape)');
  } else if (shape === 'L-shaped') {
    issues.push('L-shaped plot may affect energy flow');
  } else if (shape === 'irregular') {
    issues.push('Irregular shape - remedies recommended');
  }

  // Entrance-based highlights/issues with source info
  if (analysis.entrance) {
    const { direction, isAuspicious } = analysis.entrance;

    // Add confidence indicator based on detection source
    const confidenceNote = entranceSource === 'google_api'
      ? ' (verified)'
      : entranceSource === 'road_access'
      ? ' (from road access)'
      : '';

    // Check for highly auspicious directions (NE, E, N)
    const highlyAuspiciousDirections = ['NE', 'E', 'N'];
    if (isAuspicious && highlyAuspiciousDirections.includes(direction)) {
      highlights.push(`${direction} entrance${confidenceNote} (highly auspicious)`);
    } else if (isAuspicious) {
      highlights.push(`${direction} entrance${confidenceNote} (auspicious)`);
    } else {
      issues.push(`${direction} entrance needs remedies`);
    }
  }

  // Add note if entrance detection was low confidence
  if (entranceSource === 'centroid_estimate') {
    issues.push('Entrance direction estimated - verify on site');
  }

  // Zone-based analysis
  if (analysis.zones) {
    const excellentZones = analysis.zones.filter((z) => z.score >= 80);
    const problemZones = analysis.zones.filter((z) => z.score < 50);

    if (excellentZones.length >= 5) {
      highlights.push('Well-balanced element distribution');
    }

    for (const zone of problemZones.slice(0, 2)) {
      issues.push(`${zone.direction} zone: ${zone.issues[0] || 'needs attention'}`);
    }
  }

  // Score-based general feedback
  if (analysis.overallScore >= 85) {
    highlights.push('Excellent overall Vastu compliance');
  } else if (analysis.overallScore >= 70) {
    highlights.push('Good Vastu alignment');
  } else if (analysis.overallScore < 50) {
    issues.push('Multiple Vastu corrections recommended');
  }

  // Element balance
  if (analysis.elementBalance) {
    const imbalanced = Object.entries(analysis.elementBalance)
      .filter(([_, value]) => value < 10 || value > 35)
      .map(([element]) => element);

    if (imbalanced.length > 2) {
      issues.push('Element imbalance detected');
    }
  }

  // Limit to top 3 each
  return {
    highlights: highlights.slice(0, 3),
    issues: issues.slice(0, 3),
  };
}

export default useBuildingFootprints;
