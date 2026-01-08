/**
 * useZoneDrawing - Hook for zone drawing and analysis on the globe
 *
 * Extracts zone drawing logic from GlobePage for reusability and cleaner code.
 * Uses the globeInteractionStore for state management.
 */

import { useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';
import type { PlanetaryLine, AspectLine, ParanLine } from '@/lib/astro-types';
import type { ZoneAnalysis } from '../ai';

interface UseZoneDrawingOptions {
  planetaryLines: PlanetaryLine[];
  aspectLines: AspectLine[];
  paranLines: ParanLine[];
  onAnalysisComplete?: (analysis: ZoneAnalysis) => void;
}

interface UseZoneDrawingReturn {
  // State
  isDrawing: boolean;
  drawingPoints: Array<{ lat: number; lng: number }>;
  drawnZone: { points: Array<{ lat: number; lng: number }> } | null;
  zoneAnalysis: ZoneAnalysis | null;

  // Actions
  startDrawing: () => void;
  stopDrawing: () => void;
  toggleDrawing: () => void;
  addPoint: (lat: number, lng: number) => void;
  completeDrawing: () => void;
  clearZone: () => void;

  // Computed
  canComplete: boolean;
  pointsCount: number;
}

export function useZoneDrawing({
  planetaryLines,
  aspectLines,
  paranLines,
  onAnalysisComplete,
}: UseZoneDrawingOptions): UseZoneDrawingReturn {
  // Get state and actions from store
  const isDrawing = useGlobeInteractionStore((s) => s.isDrawingZone);
  const drawingPoints = useGlobeInteractionStore((s) => s.zoneDrawingPoints);
  const drawnZone = useGlobeInteractionStore((s) => s.drawnZone);
  const zoneAnalysis = useGlobeInteractionStore((s) => s.zoneAnalysis);

  const startDrawingZone = useGlobeInteractionStore((s) => s.startDrawingZone);
  const stopDrawingZone = useGlobeInteractionStore((s) => s.stopDrawingZone);
  const toggleDrawingZone = useGlobeInteractionStore((s) => s.toggleDrawingZone);
  const addZonePoint = useGlobeInteractionStore((s) => s.addZonePoint);
  const setIsDrawingZone = useGlobeInteractionStore((s) => s.setIsDrawingZone);
  const setZoneDrawingPoints = useGlobeInteractionStore((s) => s.setZoneDrawingPoints);
  const setDrawnZone = useGlobeInteractionStore((s) => s.setDrawnZone);
  const setZoneAnalysis = useGlobeInteractionStore((s) => s.setZoneAnalysis);
  const storeClearZone = useGlobeInteractionStore((s) => s.clearZone);

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

  // Complete drawing and analyze the zone
  const completeDrawing = useCallback(() => {
    if (drawingPoints.length < 3) {
      toast.error('Draw at least 3 points to define a zone');
      return;
    }

    const points = [...drawingPoints];

    // Clear drawing state and set zone atomically
    setZoneDrawingPoints([]);
    setDrawnZone({ points });
    setIsDrawingZone(false);

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
    planetaryLines,
    aspectLines,
    paranLines,
    setZoneDrawingPoints,
    setDrawnZone,
    setIsDrawingZone,
    setZoneAnalysis,
    onAnalysisComplete,
  ]);

  // Clear zone handler
  const clearZone = useCallback(() => {
    storeClearZone();
  }, [storeClearZone]);

  // Computed values
  const canComplete = drawingPoints.length >= 3;
  const pointsCount = drawingPoints.length;

  return {
    // State
    isDrawing,
    drawingPoints,
    drawnZone,
    zoneAnalysis,

    // Actions
    startDrawing: startDrawingZone,
    stopDrawing: stopDrawingZone,
    toggleDrawing,
    addPoint,
    completeDrawing,
    clearZone,

    // Computed
    canComplete,
    pointsCount,
  };
}

export default useZoneDrawing;
