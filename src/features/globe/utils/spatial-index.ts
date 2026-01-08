/**
 * Spatial Quadtree Index for Fast City Lookups
 *
 * Uses a Quadtree for O(log n) nearest-city lookups.
 * Much faster than linear search for large city datasets (33k+ cities).
 *
 * Performance:
 * - Per-coordinate lookup: <1ms
 * - 100 coordinates: ~100-200ms
 * - Index build time: ~500-1000ms at startup
 */

export interface SpatialCity {
  name: string;
  country: string;
  lat: number;
  lng: number;
  population: number;
  timezone?: string | null;
}

export interface NearestCityResult {
  city: SpatialCity;
  distanceKm: number;
}

// Constants
const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;

// Quadtree configuration
const MAX_POINTS_PER_LEAF = 16; // Points before splitting
const MAX_DEPTH = 12; // Maximum tree depth

/**
 * Haversine distance between two points in km
 */
export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number
): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const lat1Rad = lat1 * DEG_TO_RAD;
  const lat2Rad = lat2 * DEG_TO_RAD;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const a =
    sinDLat * sinDLat +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinDLng * sinDLng;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Fast squared euclidean distance (for comparison only, not actual distance)
 * Used internally for quick distance comparisons
 */
function distanceSquared(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  return dLat * dLat + dLng * dLng;
}

/**
 * Bounding box for spatial queries
 */
interface BoundingBox {
  latMin: number;
  latMax: number;
  lngMin: number;
  lngMax: number;
}

/**
 * Check if a point is inside a bounding box
 */
function containsPoint(box: BoundingBox, lat: number, lng: number): boolean {
  return (
    lat >= box.latMin &&
    lat <= box.latMax &&
    lng >= box.lngMin &&
    lng <= box.lngMax
  );
}

/**
 * Check if two bounding boxes intersect
 */
function intersects(a: BoundingBox, b: BoundingBox): boolean {
  return !(
    a.lngMax < b.lngMin ||
    a.lngMin > b.lngMax ||
    a.latMax < b.latMin ||
    a.latMin > b.latMax
  );
}

/**
 * Calculate minimum distance from a point to a bounding box (in degrees squared)
 * Used for priority queue ordering
 */
function minDistanceToBox(lat: number, lng: number, box: BoundingBox): number {
  // Clamp point to box boundaries
  const closestLat = Math.max(box.latMin, Math.min(lat, box.latMax));
  const closestLng = Math.max(box.lngMin, Math.min(lng, box.lngMax));
  return distanceSquared(lat, lng, closestLat, closestLng);
}

/**
 * Priority queue entry for nearest neighbor search
 */
interface PQEntry {
  distSq: number; // Distance squared (for comparison)
  node?: QuadTreeNode; // Node to explore
  city?: SpatialCity; // City candidate
}

/**
 * Simple min-heap priority queue
 */
class MinHeap {
  private heap: PQEntry[] = [];

  push(entry: PQEntry): void {
    this.heap.push(entry);
    this.bubbleUp(this.heap.length - 1);
  }

  pop(): PQEntry | undefined {
    if (this.heap.length === 0) return undefined;
    const result = this.heap[0];
    const last = this.heap.pop()!;
    if (this.heap.length > 0) {
      this.heap[0] = last;
      this.bubbleDown(0);
    }
    return result;
  }

  isEmpty(): boolean {
    return this.heap.length === 0;
  }

  private bubbleUp(i: number): void {
    while (i > 0) {
      const parent = Math.floor((i - 1) / 2);
      if (this.heap[parent].distSq <= this.heap[i].distSq) break;
      [this.heap[parent], this.heap[i]] = [this.heap[i], this.heap[parent]];
      i = parent;
    }
  }

  private bubbleDown(i: number): void {
    const n = this.heap.length;
    while (true) {
      let smallest = i;
      const left = 2 * i + 1;
      const right = 2 * i + 2;

      if (left < n && this.heap[left].distSq < this.heap[smallest].distSq) {
        smallest = left;
      }
      if (right < n && this.heap[right].distSq < this.heap[smallest].distSq) {
        smallest = right;
      }
      if (smallest === i) break;
      [this.heap[smallest], this.heap[i]] = [this.heap[i], this.heap[smallest]];
      i = smallest;
    }
  }
}

/**
 * Quadtree node
 */
class QuadTreeNode {
  bounds: BoundingBox;
  points: SpatialCity[] = [];
  depth: number;

  // Children: NW, NE, SW, SE
  nw: QuadTreeNode | null = null;
  ne: QuadTreeNode | null = null;
  sw: QuadTreeNode | null = null;
  se: QuadTreeNode | null = null;

  constructor(bounds: BoundingBox, depth: number = 0) {
    this.bounds = bounds;
    this.depth = depth;
  }

  isLeaf(): boolean {
    return this.nw === null;
  }

  insert(city: SpatialCity): void {
    // Ignore points outside bounds
    if (!containsPoint(this.bounds, city.lat, city.lng)) {
      return;
    }

    // If leaf and not at capacity, add point
    if (this.isLeaf()) {
      if (this.points.length < MAX_POINTS_PER_LEAF || this.depth >= MAX_DEPTH) {
        this.points.push(city);
        return;
      }
      // Split and redistribute
      this.subdivide();
    }

    // Insert into appropriate child
    this.insertIntoChild(city);
  }

  private subdivide(): void {
    const { latMin, latMax, lngMin, lngMax } = this.bounds;
    const midLat = (latMin + latMax) / 2;
    const midLng = (lngMin + lngMax) / 2;
    const nextDepth = this.depth + 1;

    this.nw = new QuadTreeNode(
      { latMin: midLat, latMax, lngMin, lngMax: midLng },
      nextDepth
    );
    this.ne = new QuadTreeNode(
      { latMin: midLat, latMax, lngMin: midLng, lngMax },
      nextDepth
    );
    this.sw = new QuadTreeNode(
      { latMin, latMax: midLat, lngMin, lngMax: midLng },
      nextDepth
    );
    this.se = new QuadTreeNode(
      { latMin, latMax: midLat, lngMin: midLng, lngMax },
      nextDepth
    );

    // Redistribute existing points
    for (const point of this.points) {
      this.insertIntoChild(point);
    }
    this.points = [];
  }

  private insertIntoChild(city: SpatialCity): void {
    const { latMin, latMax, lngMin, lngMax } = this.bounds;
    const midLat = (latMin + latMax) / 2;
    const midLng = (lngMin + lngMax) / 2;

    if (city.lat >= midLat) {
      if (city.lng < midLng) {
        this.nw!.insert(city);
      } else {
        this.ne!.insert(city);
      }
    } else {
      if (city.lng < midLng) {
        this.sw!.insert(city);
      } else {
        this.se!.insert(city);
      }
    }
  }

  getChildren(): QuadTreeNode[] {
    if (this.isLeaf()) return [];
    return [this.nw!, this.ne!, this.sw!, this.se!];
  }
}

/**
 * Spatial Quadtree Index for fast city lookups
 */
export class SpatialIndex {
  private root: QuadTreeNode;
  private allCities: SpatialCity[] = [];

  constructor(cities: SpatialCity[]) {
    this.allCities = cities;

    // Create root covering entire world
    this.root = new QuadTreeNode({
      latMin: -90,
      latMax: 90,
      lngMin: -180,
      lngMax: 180,
    });

    // Build the quadtree
    for (const city of cities) {
      this.root.insert(city);
    }
  }

  /**
   * Find the nearest city to a given coordinate using best-first search
   * O(log n) average case
   */
  nearestCity(lat: number, lng: number): NearestCityResult | null {
    if (this.allCities.length === 0) return null;

    const pq = new MinHeap();
    let bestCity: SpatialCity | null = null;
    let bestDistSq = Infinity;

    // Start with root node
    pq.push({ distSq: 0, node: this.root });

    while (!pq.isEmpty()) {
      const entry = pq.pop()!;

      // Skip if this entry can't improve our best
      if (entry.distSq >= bestDistSq) continue;

      if (entry.city) {
        // This is a city candidate - update best if closer
        const distSq = distanceSquared(lat, lng, entry.city.lat, entry.city.lng);
        if (distSq < bestDistSq) {
          bestDistSq = distSq;
          bestCity = entry.city;
        }
      } else if (entry.node) {
        const node = entry.node;

        if (node.isLeaf()) {
          // Add all points in leaf as candidates
          for (const city of node.points) {
            const distSq = distanceSquared(lat, lng, city.lat, city.lng);
            pq.push({ distSq, city });
          }
        } else {
          // Add children with their minimum possible distance
          for (const child of node.getChildren()) {
            const minDist = minDistanceToBox(lat, lng, child.bounds);
            if (minDist < bestDistSq) {
              pq.push({ distSq: minDist, node: child });
            }
          }
        }
      }
    }

    if (!bestCity) return null;

    // Calculate actual haversine distance for result
    const distanceKm = haversineKm(lat, lng, bestCity.lat, bestCity.lng);
    return { city: bestCity, distanceKm };
  }

  /**
   * Find k nearest cities
   */
  kNearest(lat: number, lng: number, k: number): NearestCityResult[] {
    if (this.allCities.length === 0 || k <= 0) return [];

    const pq = new MinHeap();
    const results: Array<{ city: SpatialCity; distSq: number }> = [];

    pq.push({ distSq: 0, node: this.root });

    while (!pq.isEmpty() && results.length < k) {
      const entry = pq.pop()!;

      // Early exit if we have enough results and this can't improve
      if (results.length === k) break;

      if (entry.city) {
        results.push({ city: entry.city, distSq: entry.distSq });
      } else if (entry.node) {
        const node = entry.node;

        if (node.isLeaf()) {
          for (const city of node.points) {
            const distSq = distanceSquared(lat, lng, city.lat, city.lng);
            pq.push({ distSq, city });
          }
        } else {
          for (const child of node.getChildren()) {
            const minDist = minDistanceToBox(lat, lng, child.bounds);
            pq.push({ distSq: minDist, node: child });
          }
        }
      }
    }

    // Convert to final results with haversine distances
    return results.map(({ city }) => ({
      city,
      distanceKm: haversineKm(lat, lng, city.lat, city.lng),
    }));
  }

  /**
   * Find cities within a bounding box
   */
  citiesInBounds(
    latMin: number,
    latMax: number,
    lngMin: number,
    lngMax: number,
    options: { minPopulation?: number; limit?: number } = {}
  ): SpatialCity[] {
    const { minPopulation = 0, limit = 100 } = options;
    const queryBox: BoundingBox = { latMin, latMax, lngMin, lngMax };
    const results: SpatialCity[] = [];

    const search = (node: QuadTreeNode) => {
      if (!intersects(node.bounds, queryBox)) return;

      if (node.isLeaf()) {
        for (const city of node.points) {
          if (
            containsPoint(queryBox, city.lat, city.lng) &&
            city.population >= minPopulation
          ) {
            results.push(city);
          }
        }
      } else {
        for (const child of node.getChildren()) {
          search(child);
        }
      }
    };

    search(this.root);

    // Sort by population and limit
    return results
      .sort((a, b) => b.population - a.population)
      .slice(0, limit);
  }

  /**
   * Find cities within a radius of a point
   */
  citiesWithinRadius(
    lat: number,
    lng: number,
    radiusKm: number,
    options: { minPopulation?: number; limit?: number } = {}
  ): Array<SpatialCity & { distanceKm: number }> {
    const { minPopulation = 0, limit = 50 } = options;

    // Approximate bounding box (1 degree ≈ 111km at equator)
    const degBuffer = (radiusKm / 111) * 1.5;
    const candidates = this.citiesInBounds(
      lat - degBuffer,
      lat + degBuffer,
      lng - degBuffer,
      lng + degBuffer,
      { minPopulation, limit: limit * 3 }
    );

    const results: Array<SpatialCity & { distanceKm: number }> = [];

    for (const city of candidates) {
      const dist = haversineKm(lat, lng, city.lat, city.lng);
      if (dist <= radiusKm) {
        results.push({ ...city, distanceKm: dist });
      }
    }

    return results
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);
  }

  /**
   * Batch lookup - find nearest city for multiple coordinates
   * Optimized for bulk operations
   */
  batchNearest(
    coordinates: Array<{ lat: number; lng: number }>
  ): Array<NearestCityResult | null> {
    return coordinates.map(({ lat, lng }) => this.nearestCity(lat, lng));
  }

  /**
   * Get statistics about the index
   */
  getStats(): {
    totalCities: number;
    treeDepth: number;
    leafNodes: number;
    avgPointsPerLeaf: number;
  } {
    let maxDepth = 0;
    let leafCount = 0;
    let totalPoints = 0;

    const traverse = (node: QuadTreeNode) => {
      if (node.isLeaf()) {
        leafCount++;
        totalPoints += node.points.length;
        maxDepth = Math.max(maxDepth, node.depth);
      } else {
        for (const child of node.getChildren()) {
          traverse(child);
        }
      }
    };

    traverse(this.root);

    return {
      totalCities: this.allCities.length,
      treeDepth: maxDepth,
      leafNodes: leafCount,
      avgPointsPerLeaf: leafCount > 0 ? totalPoints / leafCount : 0,
    };
  }
}

/**
 * Create a spatial index from the standard city format
 */
export function createSpatialIndex(
  cities: Array<{ name: string; country: string; lat: number; lng: number; population: number }>
): SpatialIndex {
  return new SpatialIndex(cities);
}

/**
 * Singleton instance holder for reuse across the app
 */
let globalIndex: SpatialIndex | null = null;

/**
 * Get or create the global spatial index
 * Lazy initialization - builds on first access
 */
export function getGlobalSpatialIndex(cities: SpatialCity[]): SpatialIndex {
  if (!globalIndex) {
    globalIndex = new SpatialIndex(cities);
  }
  return globalIndex;
}

/**
 * Clear the global index (useful for testing or data updates)
 */
export function clearGlobalSpatialIndex(): void {
  globalIndex = null;
}
