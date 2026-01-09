/**
 * Marker Cache - Flyweight pattern for globe HTML markers
 *
 * Caches DOM elements for markers to avoid recreating them on every render.
 * Uses a LRU-style eviction when cache exceeds max size.
 */

interface CacheEntry {
  element: HTMLDivElement;
  lastUsed: number;
}

const MAX_CACHE_SIZE = 200;

class MarkerCache {
  private cache = new Map<string, CacheEntry>();

  /**
   * Get or create a cached marker element
   */
  getOrCreate(key: string, createElement: () => HTMLDivElement): HTMLDivElement {
    const existing = this.cache.get(key);
    if (existing) {
      existing.lastUsed = Date.now();
      return existing.element;
    }

    // Evict old entries if cache is full
    if (this.cache.size >= MAX_CACHE_SIZE) {
      this.evictOldest();
    }

    const element = createElement();
    this.cache.set(key, {
      element,
      lastUsed: Date.now(),
    });

    return element;
  }

  /**
   * Invalidate a specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cached elements
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get current cache size
   */
  get size(): number {
    return this.cache.size;
  }

  private evictOldest(): void {
    // Find and remove the 20% oldest entries
    const entries = Array.from(this.cache.entries())
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }
}

// Singleton instance for globe markers
export const globeMarkerCache = new MarkerCache();

/**
 * Generate cache key for person location markers
 */
export function getPersonMarkerKey(id: string, count: number, gender: string, avatarUrl?: string): string {
  // Include avatarUrl in cache key so marker updates when avatar becomes available
  const avatarHash = avatarUrl ? avatarUrl.slice(-20) : 'no-avatar';
  return `person-${id}-${count}-${gender}-${avatarHash}`;
}

/**
 * Generate cache key for analysis markers
 */
export function getAnalysisMarkerKey(lat: number, lng: number): string {
  // v2: Updated to cyan outline style with pulse animation
  return `analysis-v2-${lat.toFixed(4)}-${lng.toFixed(4)}`;
}

/**
 * Generate cache key for city markers
 */
export function getCityMarkerKey(lat: number, lng: number): string {
  return `city-${lat.toFixed(4)}-${lng.toFixed(4)}`;
}

/**
 * Generate cache key for paran markers
 */
export function getParanMarkerKey(lat: number, lng: number, planet1: string, planet2: string): string {
  return `paran-${lat.toFixed(2)}-${lng.toFixed(2)}-${planet1}-${planet2}`;
}

/**
 * Generate cache key for pending birth markers
 */
export function getPendingBirthMarkerKey(lat: number, lng: number): string {
  return `pending-birth-${lat.toFixed(4)}-${lng.toFixed(4)}`;
}

/**
 * Generate cache key for partner markers
 */
export function getPartnerMarkerKey(lat: number, lng: number): string {
  return `partner-${lat.toFixed(4)}-${lng.toFixed(4)}`;
}

/**
 * Generate cache key for relocation markers
 */
export function getRelocationMarkerKey(lat: number, lng: number): string {
  return `relocation-${lat.toFixed(4)}-${lng.toFixed(4)}`;
}

/**
 * Generate cache key for line label markers
 */
export function getLineLabelMarkerKey(planet: string, lineType: string): string {
  return `line-label-${planet}-${lineType}`;
}

/**
 * Generate cache key for scout location markers
 */
export function getScoutMarkerKey(lat: number, lng: number, nature: 'beneficial' | 'challenging'): string {
  return `scout-${nature}-${lat.toFixed(4)}-${lng.toFixed(4)}`;
}

/**
 * Generate cache key for scout cluster markers (beneficial)
 */
export function getScoutClusterBeneficialKey(lat: number, lng: number, count: number): string {
  return `scout-cluster-beneficial-${lat.toFixed(2)}-${lng.toFixed(2)}-${count}`;
}

/**
 * Generate cache key for scout cluster markers (challenging)
 */
export function getScoutClusterChallengingKey(lat: number, lng: number, count: number): string {
  return `scout-cluster-challenging-${lat.toFixed(2)}-${lng.toFixed(2)}-${count}`;
}

/**
 * Generate cache key for scout cluster markers (mixed)
 */
export function getScoutClusterMixedKey(lat: number, lng: number, beneficialCount: number, challengingCount: number): string {
  return `scout-cluster-mixed-${lat.toFixed(2)}-${lng.toFixed(2)}-${beneficialCount}-${challengingCount}`;
}

/**
 * Generate cache key for favorite location markers (star icons)
 */
export function getFavoriteMarkerKey(lat: number, lng: number): string {
  return `favorite-${lat.toFixed(4)}-${lng.toFixed(4)}`;
}

export default globeMarkerCache;
