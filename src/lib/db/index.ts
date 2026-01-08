/**
 * SQLite Database Module
 *
 * Unified interface for SQLite WASM with OPFS persistence.
 * Provides:
 * - 33k+ cities for geocoding
 * - Scout result caching
 * - Grid score storage
 * - Offline-first operation
 */

// Re-export everything
export * from './sqlite-init';
export * from './schema';
export * from './import-cities';
export * from './offline-geocoder';
export * from './scout-cache';

// Unified imports for convenience
import { initSQLite, isDBReady, getDBSize } from './sqlite-init';
import { createSchema, hasCitiesData, getDBStats } from './schema';
import { importCities, needsCityImport, type ImportProgress } from './import-cities';
import { clearExpiredCache } from './scout-cache';

export interface DatabaseStatus {
  initialized: boolean;
  citiesLoaded: boolean;
  cityCount: number;
  dbSizeBytes: number | null;
  stats: ReturnType<typeof getDBStats>;
}

/**
 * Initialize the complete database system
 *
 * Call this once at app startup (e.g., in App.tsx or a context provider)
 */
export async function initDatabase(
  onProgress?: (progress: ImportProgress) => void
): Promise<DatabaseStatus> {
  console.log('[DB] Initializing database...');

  // Step 1: Initialize SQLite WASM
  await initSQLite();

  // Step 2: Create schema
  createSchema();

  // Step 3: Import cities if needed
  if (needsCityImport()) {
    console.log('[DB] Importing city data...');
    await importCities(onProgress);
  }

  // Step 4: Clear expired cache
  clearExpiredCache();

  // Get status
  const status: DatabaseStatus = {
    initialized: isDBReady(),
    citiesLoaded: hasCitiesData(),
    cityCount: getDBStats().cityCount,
    dbSizeBytes: await getDBSize(),
    stats: getDBStats(),
  };

  console.log('[DB] Database ready:', status);

  return status;
}

/**
 * Check if database is fully ready (initialized + cities loaded)
 */
export function isDatabaseReady(): boolean {
  return isDBReady() && hasCitiesData();
}

/**
 * Get database status without initializing
 */
export async function getDatabaseStatus(): Promise<DatabaseStatus> {
  return {
    initialized: isDBReady(),
    citiesLoaded: isDBReady() ? hasCitiesData() : false,
    cityCount: isDBReady() ? getDBStats().cityCount : 0,
    dbSizeBytes: await getDBSize(),
    stats: isDBReady() ? getDBStats() : { cityCount: 0, gridScoreCount: 0, scoutResultCount: 0, hotZoneCount: 0 },
  };
}
