/**
 * useZoneDrawing - Hook for zone drawing and analysis on the globe
 *
 * Extracts zone drawing logic from GlobePage for reusability and cleaner code.
 * Uses the globeInteractionStore for state management.
 */

import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useGlobeInteractionStore, type DrawingModeType } from '@/stores/globeInteractionStore';
import type { PlanetaryLine, AspectLine, ParanLine } from '@/lib/astro-types';
import type { ZoneAnalysis } from '../ai';
import {
  calculatePolygonAreaSqFt,
  isAreaWithinLimit,
  formatArea,
  PROPERTY_SIZE_LIMIT_SQFT,
} from '@/lib/geo-utils';

interface UseZoneDrawingOptions {
  planetaryLines: PlanetaryLine[];
  aspectLines: AspectLine[];
  paranLines: ParanLine[];
  onAnalysisComplete?: (analysis: ZoneAnalysis) => void;
}

interface UseZoneDrawingReturn {
  // State
  isDrawing: boolean;
  drawingMode: DrawingModeType;
  drawingPoints: Array<{ lat: number; lng: number }>;
  drawnZone: { points: Array<{ lat: number; lng: number }>; mode?: DrawingModeType } | null;
  searchZone: { points: Array<{ lat: number; lng: number }> } | null;
  propertyZone: { points: Array<{ lat: number; lng: number }> } | null;
  zoneAnalysis: ZoneAnalysis | null;

  // Actions
  startDrawing: () => void;
  startSearchZone: () => void;
  startPropertyZone: () => void;
  stopDrawing: () => void;
  toggleDrawing: () => void;
  addPoint: (lat: number, lng: number) => void;
  setPoints: (points: Array<{ lat: number; lng: number }>) => void;
  completeDrawing: (providedPoints?: Array<{ lat: number; lng: number }>) => void;
  clearZone: () => void;
  clearSearchZone: () => void;
  clearPropertyZone: () => void;

  // Computed
  canComplete: boolean;
  pointsCount: number;
  hasSearchZone: boolean;
  hasPropertyZone: boolean;
  currentAreaSqFt: number | null;
  isOverPropertyLimit: boolean;
}

export function useZoneDrawing({
  planetaryLines,
  aspectLines,
  paranLines,
  onAnalysisComplete,
}: UseZoneDrawingOptions): UseZoneDrawingReturn {
  // Get state and actions from store
  const isDrawing = useGlobeInteractionStore((s) => s.isDrawingZone);
  const drawingMode = useGlobeInteractionStore((s) => s.drawingMode);
  const drawingPoints = useGlobeInteractionStore((s) => s.zoneDrawingPoints);
  const drawnZone = useGlobeInteractionStore((s) => s.drawnZone);
  const searchZone = useGlobeInteractionStore((s) => s.searchZone);
  const propertyZone = useGlobeInteractionStore((s) => s.propertyZone);
  const zoneAnalysis = useGlobeInteractionStore((s) => s.zoneAnalysis);

  const startDrawingZone = useGlobeInteractionStore((s) => s.startDrawingZone);
  const startDrawingSearchZone = useGlobeInteractionStore((s) => s.startDrawingSearchZone);
  const startDrawingPropertyZone = useGlobeInteractionStore((s) => s.startDrawingPropertyZone);
  const stopDrawingZone = useGlobeInteractionStore((s) => s.stopDrawingZone);
  const toggleDrawingZone = useGlobeInteractionStore((s) => s.toggleDrawingZone);
  const addZonePoint = useGlobeInteractionStore((s) => s.addZonePoint);
  const setIsDrawingZone = useGlobeInteractionStore((s) => s.setIsDrawingZone);
  const setZoneDrawingPoints = useGlobeInteractionStore((s) => s.setZoneDrawingPoints);
  const setDrawnZone = useGlobeInteractionStore((s) => s.setDrawnZone);
  const setZoneAnalysis = useGlobeInteractionStore((s) => s.setZoneAnalysis);
  const storeClearZone = useGlobeInteractionStore((s) => s.clearZone);
  const storeClearSearchZone = useGlobeInteractionStore((s) => s.clearSearchZone);
  const storeClearPropertyZone = useGlobeInteractionStore((s) => s.clearPropertyZone);
  const storeCompleteSearchZone = useGlobeInteractionStore((s) => s.completeSearchZone);
  const storeCompletePropertyZone = useGlobeInteractionStore((s) => s.completePropertyZone);

  // Add point handler
  const addPoint = useCallback(
    (lat: number, lng: number) => {
      addZonePoint({ lat, lng });
    },
    [addZonePoint]
  );

  // Toggle drawing handler
  const toggleDrawing = useCallback(() => {
    if (isDrawing) {
      // If we're canceling drawing, clear everything
      storeClearZone();
    } else {
      // Starting to draw
      toggleDrawingZone();
    }
  }, [isDrawing, storeClearZone, toggleDrawingZone]);

  // Set points directly (used when DrawingManager provides coordinates)
  const setPoints = useCallback((points: Array<{ lat: number; lng: number }>) => {
    setZoneDrawingPoints(points);
  }, [setZoneDrawingPoints]);

  // Complete drawing and analyze the zone
  // Accepts optional coordinates for when DrawingManager provides them directly
  const completeDrawing = useCallback((providedPoints?: Array<{ lat: number; lng: number }>) => {
    // Use provided points or fall back to store's drawing points
    const pointsToUse = providedPoints || drawingPoints;

    if (pointsToUse.length < 3) {
      toast.error('Draw at least 3 points to define a zone');
      return;
    }

    const points = [...pointsToUse];

    // Validate property zone size limit (200,000 sqft max)
    if (drawingMode === 'property') {
      const areaSqFt = calculatePolygonAreaSqFt(points);
      if (!isAreaWithinLimit(areaSqFt, PROPERTY_SIZE_LIMIT_SQFT)) {
        toast.error(
          `Property exceeds 200,000 sqft limit. Current size: ${formatArea(areaSqFt)}. Please draw a smaller boundary.`
        );
        return;
      }
      toast.success(`Property boundary set: ${formatArea(areaSqFt)}`);
    }

    // If points were provided externally (from DrawingManager), set them in store first
    if (providedPoints) {
      setZoneDrawingPoints(providedPoints);
    }

    // Complete based on drawing mode
    if (drawingMode === 'search') {
      // For search mode with provided points, we need to set them then complete
      if (providedPoints) {
        setZoneDrawingPoints(providedPoints);
      }
      storeCompleteSearchZone();
    } else if (drawingMode === 'property') {
      if (providedPoints) {
        setZoneDrawingPoints(providedPoints);
      }
      storeCompletePropertyZone();
    } else {
      // Fallback for generic drawing
      setZoneDrawingPoints([]);
      setDrawnZone({ points, mode: null });
      setIsDrawingZone(false);
    }

    // Calculate bounding box
    const lats = points.map((p) => p.lat);
    const lngs = points.map((p) => p.lng);
    const bounds = {
      north: Math.max(...lats),
      south: Math.min(...lats),
      east: Math.max(...lngs),
      west: Math.min(...lngs),
    };
    const center = {
      lat: (bounds.north + bounds.south) / 2,
      lng: (bounds.east + bounds.west) / 2,
    };

    // Helper to check if a point is inside the polygon (ray casting algorithm)
    const isPointInZone = (lat: number, lng: number): boolean => {
      let inside = false;
      for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
        const xi = points[i].lng,
          yi = points[i].lat;
        const xj = points[j].lng,
          yj = points[j].lat;
        if (yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) {
          inside = !inside;
        }
      }
      return inside;
    };

    // Find lines that pass through the zone
    const linesInZone: ZoneAnalysis['linesInZone'] = [];

    // Check planetary lines
    planetaryLines.forEach((line) => {
      const hasPointInZone = line.points.some((p) => isPointInZone(p[0], p[1]));
      if (hasPointInZone) {
        linesInZone.push({
          planet: line.planet,
          lineType: line.lineType,
          type: 'planetary',
        });
      }
    });

    // Check aspect lines
    aspectLines.forEach((line) => {
      const hasPointInZone = line.points.some((p) => isPointInZone(p[0], p[1]));
      if (hasPointInZone) {
        linesInZone.push({
          planet: line.planet,
          lineType: `${line.aspectType} to ${line.angle}`,
          type: 'aspect',
        });
      }
    });

    // Check paran lines
    paranLines.forEach((line) => {
      if (line.latitude >= bounds.south && line.latitude <= bounds.north) {
        if (line.longitude !== undefined) {
          if (isPointInZone(line.latitude, line.longitude)) {
            linesInZone.push({
              planet: line.planet1,
              lineType: `${line.angle1}/${line.planet2} ${line.angle2} Paran`,
              type: 'paran',
            });
          }
        } else {
          linesInZone.push({
            planet: line.planet1,
            lineType: `${line.angle1}/${line.planet2} ${line.angle2} Paran`,
            type: 'paran',
          });
        }
      }
    });

    // Generate summary
    const planetaryCnt = linesInZone.filter((l) => l.type === 'planetary').length;
    const aspectCnt = linesInZone.filter((l) => l.type === 'aspect').length;
    const paranCnt = linesInZone.filter((l) => l.type === 'paran').length;
    const summary = `Zone contains ${planetaryCnt} planetary line${planetaryCnt !== 1 ? 's' : ''}, ${aspectCnt} aspect line${aspectCnt !== 1 ? 's' : ''}, and ${paranCnt} paran${paranCnt !== 1 ? 's' : ''}.`;

    const analysis: ZoneAnalysis = {
      bounds,
      center,
      points,
      linesInZone,
      summary,
    };

    setZoneAnalysis(analysis);
    onAnalysisComplete?.(analysis);

    toast.success(`Zone analyzed: ${linesInZone.length} lines found`);
  }, [
    drawingPoints,
    drawingMode,
    planetaryLines,
    aspectLines,
    paranLines,
    storeCompleteSearchZone,
    storeCompletePropertyZone,
    setZoneDrawingPoints,
    setDrawnZone,
    setIsDrawingZone,
    setZoneAnalysis,
    onAnalysisComplete,
  ]);

  // Clear zone handlers
  const clearZone = useCallback(() => {
    storeClearZone();
  }, [storeClearZone]);

  const clearSearchZone = useCallback(() => {
    storeClearSearchZone();
  }, [storeClearSearchZone]);

  const clearPropertyZone = useCallback(() => {
    storeClearPropertyZone();
  }, [storeClearPropertyZone]);

  // Computed values
  const canComplete = drawingPoints.length >= 3;
  const pointsCount = drawingPoints.length;
  const hasSearchZone = searchZone !== null && searchZone.points.length >= 3;
  const hasPropertyZone = propertyZone !== null && propertyZone.points.length >= 3;

  // Compute current area for real-time display during drawing
  const currentAreaSqFt = useMemo(() => {
    if (drawingPoints.length < 3) return null;
    return calculatePolygonAreaSqFt(drawingPoints);
  }, [drawingPoints]);

  const isOverPropertyLimit = useMemo(() => {
    if (currentAreaSqFt === null) return false;
    return !isAreaWithinLimit(currentAreaSqFt, PROPERTY_SIZE_LIMIT_SQFT);
  }, [currentAreaSqFt]);

  return {
    // State
    isDrawing,
    drawingMode,
    drawingPoints,
    drawnZone,
    searchZone,
    propertyZone,
    zoneAnalysis,

    // Actions
    startDrawing: startDrawingZone,
    startSearchZone: startDrawingSearchZone,
    startPropertyZone: startDrawingPropertyZone,
    stopDrawing: stopDrawingZone,
    toggleDrawing,
    addPoint,
    setPoints,
    completeDrawing,
    clearZone,
    clearSearchZone,
    clearPropertyZone,

    // Computed
    canComplete,
    pointsCount,
    hasSearchZone,
    hasPropertyZone,
    currentAreaSqFt,
    isOverPropertyLimit,
  };
}

export default useZoneDrawing;
