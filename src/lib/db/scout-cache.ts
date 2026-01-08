/**
 * Scout Cache Storage
 *
 * Caches scout results in SQLite for instant retrieval.
 * Supports:
 * - Full scout result caching (by chart hash + category)
 * - Grid score caching (individual points)
 * - Hot zone caching (for two-phase refinement)
 * - Automatic expiration
 */

import { execSQL, querySQL, querySQLOne, isDBReady, beginTransaction, commitTransaction } from './sqlite-init';

// Cache expiration in milliseconds (7 days)
const CACHE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

export interface CachedScoutResult {
  chartHash: string;
  category: string;
  results: any[];
  meta: any;
  createdAt: Date;
  expiresAt: Date;
}

export interface GridScoreEntry {
  lat: number;
  lng: number;
  score: number;
  category: string;
  chartHash: string;
}

/**
 * Generate a hash for birth chart data
 * Used as cache key
 */
export function generateChartHash(birthData: {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  lat: number;
  lng: number;
}): string {
  // Simple hash based on birth data
  const str = `${birthData.year}-${birthData.month}-${birthData.day}-${birthData.hour}-${birthData.minute}-${birthData.lat.toFixed(4)}-${birthData.lng.toFixed(4)}`;

  // Simple string hash
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return `chart_${Math.abs(hash).toString(36)}`;
}

// ============================================================================
// Scout Results Cache
// ============================================================================

/**
 * Save scout results to cache
 */
export function saveScoutResults(
  chartHash: string,
  category: string,
  results: any[],
  meta?: any
): void {
  if (!isDBReady()) return;

  const now = new Date();
  const expires = new Date(now.getTime() + CACHE_EXPIRATION_MS);

  execSQL(
    `INSERT OR REPLACE INTO scout_results
     (chart_hash, category, results_json, meta_json, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      chartHash,
      category,
      JSON.stringify(results),
      meta ? JSON.stringify(meta) : null,
      now.toISOString(),
      expires.toISOString(),
    ]
  );

  console.log(`[ScoutCache] Saved ${results.length} results for ${category}`);
}

/**
 * Get cached scout results
 */
export function getScoutResults(chartHash: string, category: string): CachedScoutResult | null {
  if (!isDBReady()) return null;

  const row = querySQLOne<{
    results_json: string;
    meta_json: string | null;
    created_at: string;
    expires_at: string;
  }>(
    `SELECT results_json, meta_json, created_at, expires_at
     FROM scout_results
     WHERE chart_hash = ? AND category = ?
       AND expires_at > datetime('now')`,
    [chartHash, category]
  );

  if (!row) return null;

  return {
    chartHash,
    category,
    results: JSON.parse(row.results_json),
    meta: row.meta_json ? JSON.parse(row.meta_json) : null,
    createdAt: new Date(row.created_at),
    expiresAt: new Date(row.expires_at),
  };
}

/**
 * Check if cached results exist
 */
export function hasScoutResults(chartHash: string, category: string): boolean {
  if (!isDBReady()) return false;

  const result = querySQLOne<{ count: number }>(
    `SELECT COUNT(*) as count
     FROM scout_results
     WHERE chart_hash = ? AND category = ?
       AND expires_at > datetime('now')`,
    [chartHash, category]
  );

  return result !== null && result.count > 0;
}

// ============================================================================
// Grid Scores Cache
// ============================================================================

/**
 * Save grid scores (batch)
 */
export function saveGridScores(
  chartHash: string,
  category: string,
  scores: Array<{ lat: number; lng: number; score: number }>
): void {
  if (!isDBReady() || scores.length === 0) return;

  beginTransaction();

  for (const score of scores) {
    execSQL(
      `INSERT OR REPLACE INTO grid_scores (lat, lng, score, category, chart_hash)
       VALUES (?, ?, ?, ?, ?)`,
      [score.lat, score.lng, score.score, category, chartHash]
    );
  }

  commitTransaction();

  console.log(`[ScoutCache] Saved ${scores.length} grid scores`);
}

/**
 * Get cached grid scores for a chart
 */
export function getGridScores(chartHash: string, category: string): GridScoreEntry[] {
  if (!isDBReady()) return [];

  const rows = querySQL<{
    lat: number;
    lng: number;
    score: number;
    category: string;
    chart_hash: string;
  }>(
    `SELECT lat, lng, score, category, chart_hash
     FROM grid_scores
     WHERE chart_hash = ? AND category = ?
     ORDER BY score DESC`,
    [chartHash, category]
  );

  return rows.map((row) => ({
    lat: row.lat,
    lng: row.lng,
    score: row.score,
    category: row.category,
    chartHash: row.chart_hash,
  }));
}

/**
 * Get top grid scores
 */
export function getTopGridScores(chartHash: string, category: string, limit: number = 100): GridScoreEntry[] {
  if (!isDBReady()) return [];

  const rows = querySQL<{
    lat: number;
    lng: number;
    score: number;
    category: string;
    chart_hash: string;
  }>(
    `SELECT lat, lng, score, category, chart_hash
     FROM grid_scores
     WHERE chart_hash = ? AND category = ?
     ORDER BY score DESC
     LIMIT ?`,
    [chartHash, category, limit]
  );

  return rows.map((row) => ({
    lat: row.lat,
    lng: row.lng,
    score: row.score,
    category: row.category,
    chartHash: row.chart_hash,
  }));
}

// ============================================================================
// Hot Zones Cache
// ============================================================================

/**
 * Save hot zones (identified high-scoring regions)
 */
export function saveHotZones(
  chartHash: string,
  category: string,
  zones: Array<{ lat: number; lng: number; score: number }>
): void {
  if (!isDBReady() || zones.length === 0) return;

  // Clear existing hot zones for this chart/category
  execSQL('DELETE FROM hot_zones WHERE chart_hash = ? AND category = ?', [chartHash, category]);

  beginTransaction();

  for (const zone of zones) {
    execSQL(
      `INSERT INTO hot_zones (lat, lng, score, chart_hash, category)
       VALUES (?, ?, ?, ?, ?)`,
      [zone.lat, zone.lng, zone.score, chartHash, category]
    );
  }

  commitTransaction();

  console.log(`[ScoutCache] Saved ${zones.length} hot zones`);
}

/**
 * Get cached hot zones
 */
export function getHotZones(chartHash: string, category: string): Array<{ lat: number; lng: number; score: number }> {
  if (!isDBReady()) return [];

  const rows = querySQL<{ lat: number; lng: number; score: number }>(
    `SELECT lat, lng, score
     FROM hot_zones
     WHERE chart_hash = ? AND category = ?
     ORDER BY score DESC`,
    [chartHash, category]
  );

  return rows;
}

/**
 * Check if hot zones exist
 */
export function hasHotZones(chartHash: string, category: string): boolean {
  if (!isDBReady()) return false;

  const result = querySQLOne<{ count: number }>(
    `SELECT COUNT(*) as count FROM hot_zones WHERE chart_hash = ? AND category = ?`,
    [chartHash, category]
  );

  return result !== null && result.count > 0;
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear expired cache entries
 */
export function clearExpiredCache(): void {
  if (!isDBReady()) return;

  execSQL(`DELETE FROM scout_results WHERE expires_at < datetime('now')`);
  console.log('[ScoutCache] Cleared expired entries');
}

/**
 * Clear all cache for a specific chart
 */
export function clearChartCache(chartHash: string): void {
  if (!isDBReady()) return;

  execSQL('DELETE FROM scout_results WHERE chart_hash = ?', [chartHash]);
  execSQL('DELETE FROM grid_scores WHERE chart_hash = ?', [chartHash]);
  execSQL('DELETE FROM hot_zones WHERE chart_hash = ?', [chartHash]);

  console.log(`[ScoutCache] Cleared cache for chart ${chartHash}`);
}

/**
 * Get cache statistics
 */
export function getCacheStats(): {
  scoutResultCount: number;
  gridScoreCount: number;
  hotZoneCount: number;
  uniqueCharts: number;
} {
  if (!isDBReady()) {
    return { scoutResultCount: 0, gridScoreCount: 0, hotZoneCount: 0, uniqueCharts: 0 };
  }

  return {
    scoutResultCount: querySQLOne<{ c: number }>('SELECT COUNT(*) as c FROM scout_results')?.c ?? 0,
    gridScoreCount: querySQLOne<{ c: number }>('SELECT COUNT(*) as c FROM grid_scores')?.c ?? 0,
    hotZoneCount: querySQLOne<{ c: number }>('SELECT COUNT(*) as c FROM hot_zones')?.c ?? 0,
    uniqueCharts:
      querySQLOne<{ c: number }>('SELECT COUNT(DISTINCT chart_hash) as c FROM scout_results')?.c ?? 0,
  };
}
