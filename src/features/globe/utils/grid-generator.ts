/**
 * Grid Generator for Two-Phase Scout Scoring
 *
 * Phase 1: Coarse grid (2° step) - ~16,200 points globally
 * Phase 2: Fine grid around hot zones (0.5° step) - refined scoring
 *
 * This approach finds optimal locations ANYWHERE on Earth,
 * not just predefined cities.
 */

export interface GridPoint {
  lat: number;
  lng: number;
}

export interface ScoredGridPoint extends GridPoint {
  score: number;
  categoryScores?: Record<string, number>;
}

export interface GridConfig {
  coarseStep: number;      // Degrees for coarse grid (default: 2)
  fineStep: number;        // Degrees for fine grid (default: 0.5)
  refineRadiusDeg: number; // Radius to refine around hot zones (default: 3)
  topNCoarse: number;      // Number of coarse zones to refine (default: 100)
  excludeWater: boolean;   // Skip ocean points (uses simple land mask)
}

export const DEFAULT_GRID_CONFIG: GridConfig = {
  coarseStep: 2,
  fineStep: 0.5,
  refineRadiusDeg: 3,
  topNCoarse: 100,
  excludeWater: true,
};

/**
 * Simple land mask - excludes obvious ocean areas
 * This is approximate but catches most open ocean
 */
function isLikelyLand(lat: number, lng: number): boolean {
  // Pacific Ocean (rough bounds)
  if (lng > 150 && lng < -100 + 360 && lat > -50 && lat < 50) {
    // Allow Hawaii, Pacific islands
    if (lat > 15 && lat < 30 && lng > 150 && lng < 180) return true;
    // Allow Japan, Philippines, Indonesia region
    if (lat > -10 && lat < 45 && lng > 100 && lng < 150) return true;
    return false;
  }

  // Southern Ocean
  if (lat < -60) return false;

  // Arctic Ocean (north of 80)
  if (lat > 80) return false;

  // Atlantic Ocean center
  if (lng > -50 && lng < -10 && lat > 5 && lat < 45) {
    // But allow Caribbean
    if (lat > 10 && lat < 30 && lng > -90 && lng < -60) return true;
    return false;
  }

  // Indian Ocean center
  if (lng > 60 && lng < 90 && lat > -35 && lat < 0) {
    return false;
  }

  return true;
}

/**
 * Normalize longitude to [-180, 180]
 */
function normalizeLng(lng: number): number {
  return ((lng + 180 + 360) % 360) - 180;
}

/**
 * Generate a coarse grid covering the entire globe
 */
export function generateCoarseGrid(
  step: number = DEFAULT_GRID_CONFIG.coarseStep,
  excludeWater: boolean = true
): GridPoint[] {
  const points: GridPoint[] = [];

  for (let lat = -85; lat <= 85; lat += step) {
    for (let lng = -180; lng < 180; lng += step) {
      if (excludeWater && !isLikelyLand(lat, lng)) {
        continue;
      }
      points.push({ lat, lng: normalizeLng(lng) });
    }
  }

  return points;
}

/**
 * Generate a fine grid around a center point
 */
export function generateFineGrid(
  center: GridPoint,
  radiusDeg: number = DEFAULT_GRID_CONFIG.refineRadiusDeg,
  step: number = DEFAULT_GRID_CONFIG.fineStep
): GridPoint[] {
  const points: GridPoint[] = [];

  const latMin = Math.max(-90, center.lat - radiusDeg);
  const latMax = Math.min(90, center.lat + radiusDeg);
  const lngMin = center.lng - radiusDeg;
  const lngMax = center.lng + radiusDeg;

  for (let lat = latMin; lat <= latMax; lat += step) {
    for (let lng = lngMin; lng <= lngMax; lng += step) {
      points.push({ lat, lng: normalizeLng(lng) });
    }
  }

  return points;
}

/**
 * Generate refined grids around multiple hot zones
 * Deduplicates overlapping points
 */
export function generateRefinedGrids(
  hotZones: GridPoint[],
  config: Partial<GridConfig> = {}
): GridPoint[] {
  const { refineRadiusDeg, fineStep } = { ...DEFAULT_GRID_CONFIG, ...config };

  const seen = new Set<string>();
  const points: GridPoint[] = [];

  for (const zone of hotZones) {
    const subgrid = generateFineGrid(zone, refineRadiusDeg, fineStep);

    for (const point of subgrid) {
      // Round to avoid floating point issues
      const key = `${point.lat.toFixed(2)},${point.lng.toFixed(2)}`;
      if (!seen.has(key)) {
        seen.add(key);
        points.push(point);
      }
    }
  }

  return points;
}

/**
 * Cluster nearby high-scoring points to find distinct hot zones
 * Uses simple grid-based clustering
 */
export function clusterHotZones(
  scores: ScoredGridPoint[],
  topN: number = 100,
  clusterRadiusDeg: number = 5
): ScoredGridPoint[] {
  // Sort by score descending
  const sorted = [...scores].sort((a, b) => b.score - a.score);

  const clusters: ScoredGridPoint[] = [];
  const used = new Set<number>();

  for (let i = 0; i < sorted.length && clusters.length < topN; i++) {
    if (used.has(i)) continue;

    const point = sorted[i];
    clusters.push(point);

    // Mark nearby points as used (part of this cluster)
    for (let j = i + 1; j < sorted.length; j++) {
      if (used.has(j)) continue;
      const other = sorted[j];

      const dLat = Math.abs(point.lat - other.lat);
      const dLng = Math.abs(point.lng - other.lng);

      if (dLat < clusterRadiusDeg && dLng < clusterRadiusDeg) {
        used.add(j);
      }
    }
  }

  return clusters;
}

/**
 * Get grid statistics for logging/debugging
 */
export function getGridStats(points: GridPoint[]): {
  count: number;
  latRange: [number, number];
  lngRange: [number, number];
  estimatedSizeKB: number;
} {
  if (points.length === 0) {
    return {
      count: 0,
      latRange: [0, 0],
      lngRange: [0, 0],
      estimatedSizeKB: 0,
    };
  }

  let minLat = 90, maxLat = -90;
  let minLng = 180, maxLng = -180;

  for (const p of points) {
    if (p.lat < minLat) minLat = p.lat;
    if (p.lat > maxLat) maxLat = p.lat;
    if (p.lng < minLng) minLng = p.lng;
    if (p.lng > maxLng) maxLng = p.lng;
  }

  return {
    count: points.length,
    latRange: [minLat, maxLat],
    lngRange: [minLng, maxLng],
    estimatedSizeKB: (points.length * 16) / 1024, // 2 floats * 8 bytes
  };
}

/**
 * Convert grid points to format expected by WASM scorer
 */
export function gridPointsToCities(
  points: GridPoint[]
): Array<{ name: string; country: string; lat: number; lon: number }> {
  return points.map((p, i) => ({
    name: `Grid-${i}`,
    country: 'GRID',
    lat: p.lat,
    lon: p.lng,
  }));
}
