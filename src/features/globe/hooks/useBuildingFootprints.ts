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
import { roadAccessService } from '../services/roadAccessService';
import {
  performVastuAnalysis,
  type VastuDirection,
} from '@/lib/vastu-utils';
import type { VastuAnalysis } from '@/stores/vastuStore';
import { enrichMultipleParcelsWithBuildingData, type EnrichableParcel } from '@/services/hybridPropertyService';

const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

type LatLng = { lat: number; lng: number };

function calculateBearing(from: LatLng, to: LatLng): number {
  const lat1 = (from.lat * Math.PI) / 180;
  const lat2 = (to.lat * Math.PI) / 180;
  const dLng = ((to.lng - from.lng) * Math.PI) / 180;

  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);

  const bearing = (Math.atan2(y, x) * 180) / Math.PI;
  return (bearing + 360) % 360;
}

function bearingToCardinal(bearing: number): VastuDirection {
  const normalized = ((bearing % 360) + 360) % 360;
  const directions: VastuDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}

function intersectSegment(a: LatLng, b: LatLng, c: LatLng, d: LatLng): { point: LatLng; t: number } | null {
  // Treat lng as x and lat as y for a small-area planar approximation.
  const ax = a.lng, ay = a.lat;
  const bx = b.lng, by = b.lat;
  const cx = c.lng, cy = c.lat;
  const dx = d.lng, dy = d.lat;

  const rpx = bx - ax;
  const rpy = by - ay;
  const spx = dx - cx;
  const spy = dy - cy;

  const denom = rpx * spy - rpy * spx;
  if (Math.abs(denom) < 1e-12) return null; // parallel

  const qpx = cx - ax;
  const qpy = cy - ay;

  const t = (qpx * spy - qpy * spx) / denom;
  const u = (qpx * rpy - qpy * rpx) / denom;

  if (t < 0 || t > 1) return null;
  if (u < 0 || u > 1) return null;

  return {
    point: { lat: ay + t * rpy, lng: ax + t * rpx },
    t,
  };
}

function distanceSq(a: LatLng, b: LatLng): number {
  const dx = a.lng - b.lng;
  const dy = a.lat - b.lat;
  return dx * dx + dy * dy;
}

function findEntrancePointOnPerimeter(centroid: LatLng, roadPoint: LatLng, perimeter: LatLng[]): LatLng | null {
  if (!perimeter || perimeter.length < 3) return null;

  // Ensure closed ring for edge iteration
  const ring = perimeter[0].lat === perimeter[perimeter.length - 1].lat && perimeter[0].lng === perimeter[perimeter.length - 1].lng
    ? perimeter
    : [...perimeter, perimeter[0]];

  let best: { point: LatLng; t: number } | null = null;
  for (let i = 0; i < ring.length - 1; i++) {
    const hit = intersectSegment(centroid, roadPoint, ring[i], ring[i + 1]);
    if (!hit) continue;
    if (!best || hit.t < best.t) best = hit;
  }

  if (best) return best.point;

  // Fallback: nearest perimeter vertex to the road point
  let nearest = ring[0];
  let bestD = distanceSq(nearest, roadPoint);
  for (const p of ring) {
    const d2 = distanceSq(p, roadPoint);
    if (d2 < bestD) {
      bestD = d2;
      nearest = p;
    }
  }
  return nearest;
}

export interface ParcelWithVastu extends BuildingFootprint {
  vastuScore: number;
  vastuAnalysis: VastuAnalysis | null;
  entranceDirection: VastuDirection;
  /** Entrance point on building perimeter when available (lat/lng). */
  entrancePoint?: { lat: number; lng: number } | null;
  /** Bearing in degrees from centroid -> entrance point (0=N, 90=E). */
  entranceBearingDegrees?: number | null;
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
    async (result: FootprintSearchResult): Promise<ParcelWithVastu[]> => {
      const plotsWithBuildings = result.plotsWithBuildings ?? [];
      if (plotsWithBuildings.length === 0) return [];

      // Step 0: Enrich with Google Building Footprints (if API key available)
      if (GOOGLE_API_KEY) {
        handleProgress('Fetching Google building data', 20);

        // Map plots to EnrichableParcel interface
        const parcelsToEnrich = plotsWithBuildings.map(p => ({
          id: p.plot.id,
          address: p.plot.address,
          properties: { headline: p.plot.address, ll_uuid: p.plot.id }
        }));

        const enrichedResults = await enrichMultipleParcelsWithBuildingData(
          parcelsToEnrich,
          GOOGLE_API_KEY,
          {
            concurrency: 5,
            onProgress: (curr, total) => {
              // Map 20-80% progress range
              const p = 20 + (curr / total) * 60;
              handleProgress(`Enriching parcels: ${curr}/${total}`, p);
            }
          }
        );

        // Update footprints with Google data
        for (const pwb of plotsWithBuildings) {
          const enrichment = enrichedResults.get(pwb.plot.id);
          if (enrichment?.building) {
            const gBuilding = enrichment.building;

            // Convert GeoJSON polygon to LatLng[]
            // Google Polygon: [[[lng, lat], ...]]
            let coords: { lat: number; lng: number }[] = [];
            if (gBuilding.displayPolygon.coordinates?.[0]) {
              coords = gBuilding.displayPolygon.coordinates[0].map(pt => ({
                lat: pt[1],
                lng: pt[0]
              }));
            }

            if (coords.length > 2) {
              // Calculate simple centroid
              const avgLat = coords.reduce((sum, p) => sum + p.lat, 0) / coords.length;
              const avgLng = coords.reduce((sum, p) => sum + p.lng, 0) / coords.length;
              const centroid = { lat: avgLat, lng: avgLng };

              // Create BuildingFootprint from Google data
              const newBuilding: BuildingFootprint = {
                id: `gb_${pwb.plot.id}`,
                coordinates: coords,
                centroid,
                area: 0, // Recalculate if needed, or approx
                bounds: {
                  north: Math.max(...coords.map(c => c.lat)),
                  south: Math.min(...coords.map(c => c.lat)),
                  east: Math.max(...coords.map(c => c.lng)),
                  west: Math.min(...coords.map(c => c.lng)),
                },
                source: 'google' as const, // Cast to literal
                shape: 'irregular', // improved analysis later
                confidence: 1.0,
                type: 'building' as const,
              };

              // Replace existing buildings with high quality Google footprint
              pwb.buildings = [newBuilding];
            }
          }
        }
      }

      // Step 1: Determine entrance direction using Google road/directions approach,
      // snapping the direction to the BUILDING footprint when available.
      handleProgress('Detecting entrances', 85);

      const entranceTargets = plotsWithBuildings.map((pwb) => {
        const plot = pwb.plot;
        const mainBuilding =
          pwb.buildings && pwb.buildings.length > 0
            ? [...pwb.buildings].sort((a, b) => b.area - a.area)[0]
            : null;

        const target = mainBuilding ?? plot;
        return {
          id: plot.id,
          target,
          plot,
          mainBuilding,
          centroid: target.centroid,
          boundary: target.coordinates,
        };
      });

      let entranceDirections = new Map<
        string,
        {
          direction: VastuDirection;
          source: string;
          entrancePoint: { lat: number; lng: number } | null;
          entranceBearingDegrees: number | null;
        }
      >();
      try {
        const roadResults = await roadAccessService.findRoadAccessBatch(
          entranceTargets.map((t) => ({
            id: t.id,
            centroid: t.centroid,
            boundary: t.boundary,
          })),
          { maxConcurrent: 5, allowEstimation: true, searchRadius: 120 }
        );

        for (const t of entranceTargets) {
          const ra = roadResults.get(t.id);
          const roadPoint = ra?.roadPoint;
          const entrancePoint =
            roadPoint ? findEntrancePointOnPerimeter(t.centroid, roadPoint, t.boundary) : null;

          // IMPORTANT: Use centroid -> entrance-on-perimeter bearing (not centroid -> road bearing).
          const bearing = entrancePoint ? calculateBearing(t.centroid, entrancePoint) : (ra?.bearingDegrees ?? 0);
          const dir = bearingToCardinal(bearing);
          entranceDirections.set(t.id, {
            direction: dir,
            source: ra?.method ?? 'road_access',
            entrancePoint: entrancePoint ?? null,
            entranceBearingDegrees: entrancePoint ? bearing : null,
          });
        }
      } catch (err) {
        console.warn('[useBuildingFootprints] Road-access entrance batch failed:', err);
      }

      // Step 2: Run Vastu analysis for each plot using the building footprint when available.
      handleProgress('Analyzing Vastu for parcels', 92);

      const parcelsWithVastu: ParcelWithVastu[] = [];

      for (const t of entranceTargets) {
        const plot = t.plot;
        const analysisBoundary = t.boundary.map((c) => ({ lat: c.lat, lng: c.lng }));
        const entranceDirection = (entranceDirections.get(plot.id)?.direction ?? 'N') as VastuDirection;
        const entranceSource = entranceDirections.get(plot.id)?.source;
        const entrancePoint = entranceDirections.get(plot.id)?.entrancePoint ?? null;
        const entranceBearingDegrees = entranceDirections.get(plot.id)?.entranceBearingDegrees ?? null;

        try {
          const vastuAnalysis = performVastuAnalysis(
            plot.address, // address if available
            t.centroid,
            analysisBoundary,
            entranceDirection
          );

          const { highlights, issues } = generateHighlightsAndIssues(
            vastuAnalysis,
            plot.shape,
            entranceSource
          );

          // 1) Plot polygon (property boundary) - always show parcel outline
          parcelsWithVastu.push({
            ...plot,
            // keep plot geometry intact for "property border"
            vastuScore: vastuAnalysis?.overallScore ?? 50,
            vastuAnalysis,
            entranceDirection,
            // do NOT attach entrancePoint to plot (we want dots/line on building footprint)
            entrancePoint: null,
            // Still include the bearing so UIs can show 16-wind directions for plots.
            // When a building is available, this bearing is derived from the building perimeter.
            entranceBearingDegrees,
            highlights,
            issues,
          });

          // 2) Building polygon (matched footprint) - show building outline + centroid/entrance dots/line
          if (t.mainBuilding) {
            parcelsWithVastu.push({
              ...t.mainBuilding,
              // ensure it carries the same analysis score + entrance metadata
              vastuScore: vastuAnalysis?.overallScore ?? 50,
              vastuAnalysis,
              entranceDirection,
              entrancePoint: entrancePoint ?? null,
              entranceBearingDegrees,
              highlights,
              issues,
              // Link building to its plot for selection/highlight behavior in overlays
              ...({ parentPlotId: plot.id } as any),
            });
          }
        } catch (err) {
          parcelsWithVastu.push({
            ...plot,
            vastuScore: 50,
            vastuAnalysis: null,
            entranceDirection: 'N',
            entrancePoint: null,
            entranceBearingDegrees: null,
            highlights: [],
            issues: ['Unable to perform complete Vastu analysis'],
          });

          if (t.mainBuilding) {
            parcelsWithVastu.push({
              ...t.mainBuilding,
              vastuScore: 50,
              vastuAnalysis: null,
              entranceDirection,
              entrancePoint: entrancePoint ?? null,
              entranceBearingDegrees,
              highlights: [],
              issues: ['Unable to perform complete Vastu analysis'],
              ...({ parentPlotId: plot.id } as any),
            });
          }
        }
      }

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

        const parcelsWithVastu = await processFootprints(result);
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
