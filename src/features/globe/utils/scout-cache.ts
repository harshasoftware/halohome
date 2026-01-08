/**
 * Scout Cache - IndexedDB caching for scout location results
 *
 * Caches calculated scout results to avoid expensive recalculations.
 * Uses a hash of planetary/aspect lines as the cache key.
 *
 * OPTIMIZATION: Population subset filtering
 * If results for a lower population tier (e.g., 15k) are cached, we can filter
 * them to get results for a higher tier (e.g., 100k) without recomputation.
 * Lower tier cities are a SUPERSET of higher tier cities.
 */

import type { ScoutAnalysis, OverallScoutLocation, ScoutCategory, ScoutLocation } from './scout-utils';
import type { PlanetaryLine, AspectLine } from '@/lib/astro-types';

// Population thresholds in ascending order (lowest = most cities = superset)
const POPULATION_THRESHOLDS = [15000, 50000, 100000, 250000, 500000, 1000000];

// ============================================================================
// Types
// ============================================================================

interface CachedCategoryResult {
  key: string;
  category: ScoutCategory;
  analysis: ScoutAnalysis;
  timestamp: number;
}

interface CachedOverallResult {
  key: string;
  locations: OverallScoutLocation[];
  timestamp: number;
}

// ============================================================================
// Constants
// ============================================================================

const DB_NAME = 'scout-cache';
const DB_VERSION = 1;
const CATEGORY_STORE = 'categoryResults';
const OVERALL_STORE = 'overallResults';
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days - results are deterministic for same birth data
const MAX_CACHE_ENTRIES = 150; // Scout results are valuable, keep more

// ============================================================================
// Database Management
// ============================================================================

let dbPromise: Promise<IDBDatabase> | null = null;

function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.warn('[ScoutCache] Failed to open database');
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Category results store
      if (!db.objectStoreNames.contains(CATEGORY_STORE)) {
        const categoryStore = db.createObjectStore(CATEGORY_STORE, { keyPath: 'key' });
        categoryStore.createIndex('by-timestamp', 'timestamp');
      }

      // Overall results store
      if (!db.objectStoreNames.contains(OVERALL_STORE)) {
        const overallStore = db.createObjectStore(OVERALL_STORE, { keyPath: 'key' });
        overallStore.createIndex('by-timestamp', 'timestamp');
      }
    };
  });

  return dbPromise;
}

// ============================================================================
// Cache Key Generation
// ============================================================================

/**
 * Generate a stable hash from lines data for cache key
 */
function generateCacheKey(
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  category?: ScoutCategory,
  minPopulation?: number
): string {
  // Create a simplified representation of lines for hashing
  const planetaryData = planetaryLines
    .map(l => `${l.planet}:${l.lineType}:${l.points?.length || 0}`)
    .sort()
    .join('|');

  const aspectData = aspectLines
    .map(l => `${l.planet1}:${l.planet2}:${l.aspect}:${l.lineType1}:${l.lineType2}`)
    .sort()
    .join('|');

  // Include minPopulation in the key to differentiate filtered results
  const popSuffix = minPopulation ? `::pop${minPopulation}` : '';
  const combined = `${planetaryData}::${aspectData}${category ? `::${category}` : ''}${popSuffix}`;

  // Simple hash function (djb2)
  let hash = 5381;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) + hash) ^ combined.charCodeAt(i);
  }

  return `scout-${(hash >>> 0).toString(36)}`;
}

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Get cached category result
 * Implements population subset optimization: if results for a lower tier exist,
 * filter them instead of recomputing.
 */
export async function getCachedCategoryResult(
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  category: ScoutCategory,
  minPopulation?: number
): Promise<ScoutAnalysis | null> {
  try {
    const db = await getDB();

    // First, try exact match
    const key = generateCacheKey(planetaryLines, aspectLines, category, minPopulation);

    const exactMatch = await new Promise<ScoutAnalysis | null>((resolve) => {
      const tx = db.transaction(CATEGORY_STORE, 'readonly');
      const store = tx.objectStore(CATEGORY_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        const cached = request.result as CachedCategoryResult | undefined;
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          console.log(`[ScoutCache] Cache hit for category ${category} (exact)`);
          resolve(cached.analysis);
        } else {
          if (cached) deleteCacheEntry(CATEGORY_STORE, key);
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });

    if (exactMatch) return exactMatch;

    // If no exact match and we have a population filter, try lower thresholds
    if (minPopulation) {
      const lowerThresholds = getLowerThresholds(minPopulation);

      for (const threshold of lowerThresholds) {
        const lowerKey = generateCacheKey(planetaryLines, aspectLines, category, threshold);

        const lowerMatch = await new Promise<ScoutAnalysis | null>((resolve) => {
          const tx = db.transaction(CATEGORY_STORE, 'readonly');
          const store = tx.objectStore(CATEGORY_STORE);
          const request = store.get(lowerKey);

          request.onsuccess = () => {
            const cached = request.result as CachedCategoryResult | undefined;
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
              resolve(cached.analysis);
            } else {
              resolve(null);
            }
          };
          request.onerror = () => resolve(null);
        });

        if (lowerMatch) {
          // Found a lower tier cache - filter by requested population
          const filtered = filterAnalysisByPopulation(lowerMatch, minPopulation);
          console.log(`[ScoutCache] Cache hit for ${category} (filtered from ${threshold} to ${minPopulation})`);

          // Cache the filtered result for future lookups
          setCachedCategoryResult(planetaryLines, aspectLines, category, filtered, minPopulation);

          return filtered;
        }
      }
    }

    return null;
  } catch (error) {
    console.warn('[ScoutCache] Error reading category cache:', error);
    return null;
  }
}

/**
 * Cache category result
 */
export async function setCachedCategoryResult(
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  category: ScoutCategory,
  analysis: ScoutAnalysis,
  minPopulation?: number
): Promise<void> {
  try {
    const db = await getDB();
    const key = generateCacheKey(planetaryLines, aspectLines, category, minPopulation);

    const tx = db.transaction(CATEGORY_STORE, 'readwrite');
    const store = tx.objectStore(CATEGORY_STORE);

    const data: CachedCategoryResult = {
      key,
      category,
      analysis,
      timestamp: Date.now(),
    };

    store.put(data);
    console.log(`[ScoutCache] Cached category ${category}`);

    // Cleanup old entries async
    cleanupOldEntries(CATEGORY_STORE);
  } catch (error) {
    console.warn('[ScoutCache] Error writing category cache:', error);
  }
}

/**
 * Filter overall locations by minimum population
 */
function filterOverallByPopulation(
  locations: OverallScoutLocation[],
  minPopulation: number
): OverallScoutLocation[] {
  return locations.filter(loc => (loc.city.population ?? 0) >= minPopulation);
}

/**
 * Filter category analysis by minimum population
 */
function filterAnalysisByPopulation(
  analysis: ScoutAnalysis,
  minPopulation: number
): ScoutAnalysis {
  const filteredCountries = analysis.countries.map(country => {
    const filteredLocations = country.locations.filter(
      loc => (loc.city.population ?? 0) >= minPopulation
    );
    return {
      ...country,
      locations: filteredLocations,
      beneficialCount: filteredLocations.filter(l => l.nature === 'beneficial').length,
      challengingCount: filteredLocations.filter(l => l.nature === 'challenging').length,
    };
  }).filter(country => country.locations.length > 0);

  return {
    ...analysis,
    countries: filteredCountries,
    totalBeneficial: filteredCountries.reduce((sum, c) => sum + c.beneficialCount, 0),
    totalChallenging: filteredCountries.reduce((sum, c) => sum + c.challengingCount, 0),
  };
}

/**
 * Get lower population thresholds that could contain a superset of the requested data
 */
function getLowerThresholds(minPopulation: number): number[] {
  return POPULATION_THRESHOLDS.filter(t => t < minPopulation);
}

/**
 * Get cached overall result
 * Implements population subset optimization: if results for a lower tier exist,
 * filter them instead of recomputing.
 */
export async function getCachedOverallResult(
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  minPopulation?: number
): Promise<OverallScoutLocation[] | null> {
  try {
    const db = await getDB();

    // First, try exact match
    const key = generateCacheKey(planetaryLines, aspectLines, undefined, minPopulation);

    const exactMatch = await new Promise<OverallScoutLocation[] | null>((resolve) => {
      const tx = db.transaction(OVERALL_STORE, 'readonly');
      const store = tx.objectStore(OVERALL_STORE);
      const request = store.get(key);

      request.onsuccess = () => {
        const cached = request.result as CachedOverallResult | undefined;
        if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
          console.log('[ScoutCache] Cache hit for overall results (exact)');
          resolve(cached.locations);
        } else {
          if (cached) deleteCacheEntry(OVERALL_STORE, key);
          resolve(null);
        }
      };
      request.onerror = () => resolve(null);
    });

    if (exactMatch) return exactMatch;

    // If no exact match and we have a population filter, try lower thresholds
    if (minPopulation) {
      const lowerThresholds = getLowerThresholds(minPopulation);

      for (const threshold of lowerThresholds) {
        const lowerKey = generateCacheKey(planetaryLines, aspectLines, undefined, threshold);

        const lowerMatch = await new Promise<OverallScoutLocation[] | null>((resolve) => {
          const tx = db.transaction(OVERALL_STORE, 'readonly');
          const store = tx.objectStore(OVERALL_STORE);
          const request = store.get(lowerKey);

          request.onsuccess = () => {
            const cached = request.result as CachedOverallResult | undefined;
            if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
              resolve(cached.locations);
            } else {
              resolve(null);
            }
          };
          request.onerror = () => resolve(null);
        });

        if (lowerMatch) {
          // Found a lower tier cache - filter by requested population
          const filtered = filterOverallByPopulation(lowerMatch, minPopulation);
          console.log(`[ScoutCache] Cache hit for overall (filtered from ${threshold} to ${minPopulation}, ${lowerMatch.length} → ${filtered.length} cities)`);

          // Cache the filtered result for future lookups
          setCachedOverallResult(planetaryLines, aspectLines, filtered, minPopulation);

          return filtered;
        }
      }
    }

    return null;
  } catch (error) {
    console.warn('[ScoutCache] Error reading overall cache:', error);
    return null;
  }
}

/**
 * Cache overall result
 */
export async function setCachedOverallResult(
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  locations: OverallScoutLocation[],
  minPopulation?: number
): Promise<void> {
  try {
    const db = await getDB();
    const key = generateCacheKey(planetaryLines, aspectLines, undefined, minPopulation);

    const tx = db.transaction(OVERALL_STORE, 'readwrite');
    const store = tx.objectStore(OVERALL_STORE);

    const data: CachedOverallResult = {
      key,
      locations,
      timestamp: Date.now(),
    };

    store.put(data);
    console.log('[ScoutCache] Cached overall results');

    // Cleanup old entries async
    cleanupOldEntries(OVERALL_STORE);
  } catch (error) {
    console.warn('[ScoutCache] Error writing overall cache:', error);
  }
}

/**
 * Clear all cached results
 */
export async function clearScoutCache(): Promise<void> {
  try {
    const db = await getDB();

    const tx1 = db.transaction(CATEGORY_STORE, 'readwrite');
    tx1.objectStore(CATEGORY_STORE).clear();

    const tx2 = db.transaction(OVERALL_STORE, 'readwrite');
    tx2.objectStore(OVERALL_STORE).clear();

    console.log('[ScoutCache] Cache cleared');
  } catch (error) {
    console.warn('[ScoutCache] Error clearing cache:', error);
  }
}

/**
 * Delete a single cache entry
 */
async function deleteCacheEntry(storeName: string, key: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(storeName, 'readwrite');
    tx.objectStore(storeName).delete(key);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Cleanup old entries to prevent unbounded growth
 */
async function cleanupOldEntries(storeName: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);

    const countRequest = store.count();
    countRequest.onsuccess = () => {
      const count = countRequest.result;

      if (count > MAX_CACHE_ENTRIES) {
        // Delete oldest entries
        const toDelete = count - MAX_CACHE_ENTRIES;
        const index = store.index('by-timestamp');
        const cursorRequest = index.openCursor();
        let deleted = 0;

        cursorRequest.onsuccess = () => {
          const cursor = cursorRequest.result;
          if (cursor && deleted < toDelete) {
            cursor.delete();
            deleted++;
            cursor.continue();
          }
        };
      }
    };
  } catch {
    // Ignore cleanup errors
  }
}
