/**
 * Database Schema
 *
 * Creates tables for:
 * - Cities (33k+ from GeoNames)
 * - Grid scores (cached scoring results)
 * - Scout results (full scout session results)
 */

import { execSQL, querySQLOne, isDBReady } from './sqlite-init';

// Schema version for migrations
const SCHEMA_VERSION = 1;

/**
 * Create all database tables
 */
export function createSchema(): void {
  if (!isDBReady()) {
    throw new Error('Database not initialized');
  }

  // Version tracking table
  execSQL(`
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Cities table - stores GeoNames city data
  execSQL(`
    CREATE TABLE IF NOT EXISTS cities (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL,
      country_code TEXT NOT NULL,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      population INTEGER NOT NULL,
      timezone TEXT,
      -- Spatial index helpers (grid cell coordinates)
      cell_lat INTEGER GENERATED ALWAYS AS (CAST(lat / 2 AS INTEGER)) STORED,
      cell_lng INTEGER GENERATED ALWAYS AS (CAST(lng / 2 AS INTEGER)) STORED
    )
  `);

  // Indexes for city lookups
  execSQL(`CREATE INDEX IF NOT EXISTS idx_cities_cell ON cities(cell_lat, cell_lng)`);
  execSQL(`CREATE INDEX IF NOT EXISTS idx_cities_population ON cities(population DESC)`);
  execSQL(`CREATE INDEX IF NOT EXISTS idx_cities_country ON cities(country_code)`);
  execSQL(`CREATE INDEX IF NOT EXISTS idx_cities_coords ON cities(lat, lng)`);

  // Grid scores table - caches scoring for grid points
  execSQL(`
    CREATE TABLE IF NOT EXISTS grid_scores (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      score REAL NOT NULL,
      category TEXT NOT NULL,
      chart_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      -- Unique constraint to prevent duplicates
      UNIQUE(lat, lng, category, chart_hash)
    )
  `);

  // Indexes for grid score lookups
  execSQL(`CREATE INDEX IF NOT EXISTS idx_grid_scores_hash ON grid_scores(chart_hash, category)`);
  execSQL(`CREATE INDEX IF NOT EXISTS idx_grid_scores_score ON grid_scores(score DESC)`);

  // Scout results table - stores full scout session results
  execSQL(`
    CREATE TABLE IF NOT EXISTS scout_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      chart_hash TEXT NOT NULL,
      category TEXT NOT NULL,
      results_json TEXT NOT NULL,
      meta_json TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT,
      -- Unique per chart/category combo
      UNIQUE(chart_hash, category)
    )
  `);

  execSQL(`CREATE INDEX IF NOT EXISTS idx_scout_results_hash ON scout_results(chart_hash, category)`);

  // Hot zones table - caches identified hot zones for refinement
  execSQL(`
    CREATE TABLE IF NOT EXISTS hot_zones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      lat REAL NOT NULL,
      lng REAL NOT NULL,
      score REAL NOT NULL,
      chart_hash TEXT NOT NULL,
      category TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  execSQL(`CREATE INDEX IF NOT EXISTS idx_hot_zones_hash ON hot_zones(chart_hash, category)`);

  // Record schema version
  const currentVersion = querySQLOne<{ version: number }>(
    'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
  );

  if (!currentVersion || currentVersion.version < SCHEMA_VERSION) {
    execSQL('INSERT OR REPLACE INTO schema_version (version) VALUES (?)', [SCHEMA_VERSION]);
  }

  console.log('[Schema] Database schema created (version', SCHEMA_VERSION, ')');
}

/**
 * Check if cities table has data
 */
export function hasCitiesData(): boolean {
  const result = querySQLOne<{ count: number }>('SELECT COUNT(*) as count FROM cities');
  return result !== null && result.count > 0;
}

/**
 * Get city count
 */
export function getCityCount(): number {
  const result = querySQLOne<{ count: number }>('SELECT COUNT(*) as count FROM cities');
  return result?.count ?? 0;
}

/**
 * Clear all cached data (keeps cities)
 */
export function clearCache(): void {
  execSQL('DELETE FROM grid_scores');
  execSQL('DELETE FROM scout_results');
  execSQL('DELETE FROM hot_zones');
  console.log('[Schema] Cache cleared');
}

/**
 * Clear everything including cities (full reset)
 */
export function resetDatabase(): void {
  execSQL('DROP TABLE IF EXISTS grid_scores');
  execSQL('DROP TABLE IF EXISTS scout_results');
  execSQL('DROP TABLE IF EXISTS hot_zones');
  execSQL('DROP TABLE IF EXISTS cities');
  execSQL('DROP TABLE IF EXISTS schema_version');
  console.log('[Schema] Database reset');
  createSchema();
}

/**
 * Get database statistics
 */
export function getDBStats(): {
  cityCount: number;
  gridScoreCount: number;
  scoutResultCount: number;
  hotZoneCount: number;
} {
  return {
    cityCount: querySQLOne<{ c: number }>('SELECT COUNT(*) as c FROM cities')?.c ?? 0,
    gridScoreCount: querySQLOne<{ c: number }>('SELECT COUNT(*) as c FROM grid_scores')?.c ?? 0,
    scoutResultCount: querySQLOne<{ c: number }>('SELECT COUNT(*) as c FROM scout_results')?.c ?? 0,
    hotZoneCount: querySQLOne<{ c: number }>('SELECT COUNT(*) as c FROM hot_zones')?.c ?? 0,
  };
}
