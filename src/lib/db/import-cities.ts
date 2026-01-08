/**
 * City Data Import
 *
 * Imports GeoNames city data into SQLite for fast geocoding queries.
 * Uses batch inserts for performance (~33k cities in <2 seconds).
 */

import { execSQL, beginTransaction, commitTransaction, rollbackTransaction, isDBReady } from './sqlite-init';
import { hasCitiesData, getCityCount } from './schema';
import { loadCities, GEONAMES_CITY_COUNT, type GeoCity } from '@/data/geonames-cities';

// Batch size for inserts
const BATCH_SIZE = 1000;

export interface ImportProgress {
  current: number;
  total: number;
  percent: number;
}

export type ProgressCallback = (progress: ImportProgress) => void;

/**
 * Import GeoNames cities into SQLite
 */
export async function importCities(onProgress?: ProgressCallback): Promise<number> {
  if (!isDBReady()) {
    throw new Error('Database not initialized');
  }

  // Check if already imported
  if (hasCitiesData()) {
    const count = getCityCount();
    console.log(`[Import] Cities already imported (${count} cities)`);
    return count;
  }

  // Load cities dynamically
  const cities = await loadCities();

  console.log(`[Import] Starting import of ${cities.length} cities...`);
  const startTime = performance.now();

  const total = cities.length;
  let imported = 0;

  try {
    // Process in batches
    for (let i = 0; i < cities.length; i += BATCH_SIZE) {
      const batch = cities.slice(i, i + BATCH_SIZE);

      beginTransaction();

      for (const city of batch) {
        execSQL(
          `INSERT OR IGNORE INTO cities (id, name, country_code, lat, lng, population, timezone)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [city.id, city.n, city.c, city.a, city.o, city.p, city.z]
        );
      }

      commitTransaction();

      imported += batch.length;

      // Report progress
      if (onProgress) {
        onProgress({
          current: imported,
          total,
          percent: Math.round((imported / total) * 100),
        });
      }

      // Yield to main thread
      await new Promise((resolve) => setTimeout(resolve, 0));
    }

    const elapsed = performance.now() - startTime;
    console.log(`[Import] Imported ${imported} cities in ${elapsed.toFixed(0)}ms`);

    return imported;
  } catch (error) {
    rollbackTransaction();
    console.error('[Import] Failed:', error);
    throw error;
  }
}

/**
 * Check if cities need to be imported
 */
export function needsCityImport(): boolean {
  if (!isDBReady()) return true;
  return !hasCitiesData();
}

/**
 * Get import status
 */
export function getImportStatus(): {
  isImported: boolean;
  cityCount: number;
  expectedCount: number;
} {
  const count = isDBReady() ? getCityCount() : 0;
  return {
    isImported: count > 0,
    cityCount: count,
    expectedCount: GEONAMES_CITY_COUNT,
  };
}
