/**
 * Marker Clustering - Groups nearby markers into clusters for performance
 *
 * Uses a grid-based clustering approach for O(n) performance.
 * Clusters markers within the same grid cell and displays count badges.
 */

export interface ScoutMarkerInput {
  lat: number;
  lng: number;
  name: string;
  nature: 'beneficial' | 'challenging';
}

export interface ClusteredMarker {
  lat: number;
  lng: number;
  type: 'scout-cluster-beneficial' | 'scout-cluster-challenging' | 'scout-cluster-mixed' | 'scout-beneficial' | 'scout-challenging';
  count: number;
  names: string[];
  beneficialCount: number;
  challengingCount: number;
}

/**
 * Grid cell size in degrees based on desired cluster density
 * At equator: 1° ≈ 111km, so 5° ≈ 555km cluster radius
 */
const DEFAULT_CELL_SIZE = 5; // degrees

/**
 * Minimum markers needed to form a cluster (otherwise show individually)
 */
const MIN_CLUSTER_SIZE = 3;

/**
 * Maximum individual markers to show (beyond this, always cluster)
 */
const MAX_INDIVIDUAL_MARKERS = 50;

/**
 * Maximum individual markers when zoomed in very close
 * Keep low to always cluster for better performance and visual grouping
 */
const MAX_ZOOMED_IN_MARKERS = 30;

/**
 * Create a grid key for a lat/lng coordinate
 */
function getGridKey(lat: number, lng: number, cellSize: number): string {
  const latCell = Math.floor(lat / cellSize);
  const lngCell = Math.floor(lng / cellSize);
  return `${latCell}:${lngCell}`;
}

/**
 * Cluster scout markers using grid-based spatial hashing
 *
 * @param markers - Array of scout markers to cluster
 * @param cellSize - Grid cell size in degrees (default 5°)
 * @returns Array of clustered markers with counts
 */
export function clusterScoutMarkers(
  markers: ScoutMarkerInput[],
  cellSize: number = DEFAULT_CELL_SIZE
): ClusteredMarker[] {
  // If few markers, show them all individually
  if (markers.length <= MAX_INDIVIDUAL_MARKERS) {
    return markers.map(m => ({
      lat: m.lat,
      lng: m.lng,
      type: m.nature === 'beneficial' ? 'scout-beneficial' as const : 'scout-challenging' as const,
      count: 1,
      names: [m.name],
      beneficialCount: m.nature === 'beneficial' ? 1 : 0,
      challengingCount: m.nature === 'challenging' ? 1 : 0,
    }));
  }

  // Group markers by grid cell
  const cells = new Map<string, {
    markers: ScoutMarkerInput[];
    sumLat: number;
    sumLng: number;
    beneficialCount: number;
    challengingCount: number;
  }>();

  for (const marker of markers) {
    const key = getGridKey(marker.lat, marker.lng, cellSize);

    if (!cells.has(key)) {
      cells.set(key, {
        markers: [],
        sumLat: 0,
        sumLng: 0,
        beneficialCount: 0,
        challengingCount: 0,
      });
    }

    const cell = cells.get(key)!;
    cell.markers.push(marker);
    cell.sumLat += marker.lat;
    cell.sumLng += marker.lng;
    if (marker.nature === 'beneficial') {
      cell.beneficialCount++;
    } else {
      cell.challengingCount++;
    }
  }

  // Convert cells to clustered markers
  const result: ClusteredMarker[] = [];

  for (const cell of cells.values()) {
    const count = cell.markers.length;

    // Small clusters: show individual markers
    if (count < MIN_CLUSTER_SIZE) {
      for (const m of cell.markers) {
        result.push({
          lat: m.lat,
          lng: m.lng,
          type: m.nature === 'beneficial' ? 'scout-beneficial' : 'scout-challenging',
          count: 1,
          names: [m.name],
          beneficialCount: m.nature === 'beneficial' ? 1 : 0,
          challengingCount: m.nature === 'challenging' ? 1 : 0,
        });
      }
      continue;
    }

    // Cluster center is the centroid
    const centerLat = cell.sumLat / count;
    const centerLng = cell.sumLng / count;

    // Determine cluster type based on composition
    let type: ClusteredMarker['type'];
    if (cell.beneficialCount > 0 && cell.challengingCount > 0) {
      type = 'scout-cluster-mixed';
    } else if (cell.beneficialCount > 0) {
      type = 'scout-cluster-beneficial';
    } else {
      type = 'scout-cluster-challenging';
    }

    result.push({
      lat: centerLat,
      lng: centerLng,
      type,
      count,
      names: cell.markers.map(m => m.name),
      beneficialCount: cell.beneficialCount,
      challengingCount: cell.challengingCount,
    });
  }

  return result;
}

/**
 * Adaptive clustering that adjusts cell size based on marker count
 * More markers = larger cells = fewer clusters
 */
export function adaptiveClusterScoutMarkers(
  markers: ScoutMarkerInput[]
): ClusteredMarker[] {
  const count = markers.length;

  // Adaptive cell size based on marker count
  let cellSize: number;
  if (count < 500) {
    cellSize = 3; // Fine clustering
  } else if (count < 2000) {
    cellSize = 5; // Medium clustering
  } else if (count < 10000) {
    cellSize = 8; // Coarse clustering
  } else {
    cellSize = 12; // Very coarse for massive datasets
  }

  return clusterScoutMarkers(markers, cellSize);
}

/**
 * Zoom level thresholds for altitude-based clustering
 * Lower altitude = more zoomed in = smaller clusters
 * Optimized for performance with large marker sets (500+)
 */
const ZOOM_THRESHOLDS = {
  VERY_FAR: 2.0,    // Show very coarse clusters (18°)
  FAR: 1.2,         // Show coarse clusters (12°)
  MEDIUM: 0.6,      // Show medium clusters (8°)
  CLOSE: 0.3,       // Show fine clusters (5°)
  VERY_CLOSE: 0.12, // Show very fine clusters (3°)
};

/**
 * Get cell size based on globe altitude (zoom level)
 * @param altitude - Globe camera altitude (0-3+, lower = more zoomed in)
 */
export function getCellSizeForAltitude(altitude: number): number {
  if (altitude > ZOOM_THRESHOLDS.VERY_FAR) return 18;
  if (altitude > ZOOM_THRESHOLDS.FAR) return 12;
  if (altitude > ZOOM_THRESHOLDS.MEDIUM) return 8;
  if (altitude > ZOOM_THRESHOLDS.CLOSE) return 5;
  if (altitude > ZOOM_THRESHOLDS.VERY_CLOSE) return 3;
  return 1.5; // Fine clustering even at max zoom for performance
}

/**
 * Zoom-aware clustering that adjusts based on globe altitude
 * Always uses clustering for performance - never shows all individual markers
 * @param markers - Scout markers to cluster
 * @param altitude - Current globe camera altitude
 */
export function zoomAwareClusterScoutMarkers(
  markers: ScoutMarkerInput[],
  altitude: number
): ClusteredMarker[] {
  // If very few markers (under threshold), show individually
  if (markers.length <= MAX_ZOOMED_IN_MARKERS) {
    return markers.map(m => ({
      lat: m.lat,
      lng: m.lng,
      type: m.nature === 'beneficial' ? 'scout-beneficial' as const : 'scout-challenging' as const,
      count: 1,
      names: [m.name],
      beneficialCount: m.nature === 'beneficial' ? 1 : 0,
      challengingCount: m.nature === 'challenging' ? 1 : 0,
    }));
  }

  // Always use clustering for larger marker sets (performance optimization)
  const cellSize = getCellSizeForAltitude(altitude);
  return clusterScoutMarkers(markers, cellSize);
}
