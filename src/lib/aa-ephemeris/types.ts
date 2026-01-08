/**
 * AA-JS Ephemeris Types
 *
 * High-precision astronomical calculations using the AA+ library
 * ported to JavaScript (aa-js). Provides 0.01 arcsecond accuracy.
 */

// Supported planets in aa-js
export type AAJSPlanet =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto';

// Extended planet list (includes bodies not in aa-js, fallback to WASM)
export type ExtendedPlanet = AAJSPlanet | 'Chiron' | 'NorthNode';

// Line types for astrocartography
export type LineType = 'MC' | 'IC' | 'ASC' | 'DSC';

// Accuracy tier for tracking calculation source
export type AccuracyTier = 'aa-js' | 'aa-js-cached' | 'wasm-fallback';

/**
 * Planetary position result
 */
export interface EphemerisPosition {
  planet: ExtendedPlanet;
  julianDate: number;
  // Equatorial coordinates (radians)
  rightAscension: number;
  declination: number;
  // Ecliptic coordinates (degrees)
  eclipticLongitude: number;
  eclipticLatitude: number;
  // Distance from Earth (AU)
  distance?: number;
  // Calculation metadata
  accuracy: AccuracyTier;
  calculatedAt: number;
}

/**
 * Batch calculation request
 */
export interface EphemerisRequest {
  id: string;
  type: 'calculate' | 'batch' | 'cache-check' | 'cache-clear';
  positions?: {
    julianDate: number;
    planet: ExtendedPlanet;
  }[];
  julianDate?: number;
  planet?: ExtendedPlanet;
}

/**
 * Worker response
 */
export interface EphemerisResponse {
  id: string;
  type: 'result' | 'batch-result' | 'cache-status' | 'error';
  positions?: EphemerisPosition[];
  position?: EphemerisPosition;
  cacheStats?: CacheStats;
  error?: string;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalEntries: number;
  oldestEntry: number | null;
  newestEntry: number | null;
  sizeBytes: number;
}

/**
 * IndexedDB schema
 */
export const DB_NAME = 'aa-ephemeris-cache';
export const DB_VERSION = 1;
export const STORE_NAME = 'positions';

/**
 * Cache configuration
 */
export const CACHE_CONFIG = {
  // Maximum age of cached entries (30 days)
  maxAgeMs: 30 * 24 * 60 * 60 * 1000,
  // Batch size for cleanup operations
  cleanupBatchSize: 100,
  // Julian date tolerance for cache hits (matches within 0.0001 JD = ~8.6 seconds)
  jdTolerance: 0.0001,
};

/**
 * Planets supported by aa-js (for high-precision calculations)
 *
 * NOTE: NorthNode is intentionally excluded because:
 * - aa-js only provides Mean Node (smooth retrograde motion)
 * - Our WASM implements True Node with Meeus Ch 48 wobble corrections
 * - True Node is ±1.7° more accurate than Mean Node
 * - Professional astrocartography requires True Node
 *
 * Chiron is also excluded (no aa-js support, WASM has perturbation model)
 */
export const AAJS_SUPPORTED_PLANETS: AAJSPlanet[] = [
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
  'Pluto',
];

/**
 * Planets that use WASM instead of aa-js (more accurate for these bodies)
 */
export const WASM_ONLY_PLANETS = ['NorthNode', 'Chiron'] as const;

/**
 * Check if a planet is supported by aa-js
 * Returns false for NorthNode (WASM True Node is more accurate than aa-js Mean Node)
 * Returns false for Chiron (no aa-js support)
 */
export function isAAJSSupported(planet: string): planet is AAJSPlanet {
  return AAJS_SUPPORTED_PLANETS.includes(planet as AAJSPlanet);
}
