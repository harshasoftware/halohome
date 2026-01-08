/**
 * AA-JS Ephemeris System
 *
 * High-precision astronomical calculations using aa-js (JavaScript port of AA+)
 * running in Web Workers with IndexedDB caching.
 *
 * Features:
 * - 0.01 arcsecond accuracy (1000x better than Meeus)
 * - Off-main-thread calculations (no UI blocking)
 * - Automatic caching with 30-day expiry
 * - WASM fallback for unsupported bodies (Chiron, North Node)
 *
 * Usage:
 * ```typescript
 * import { useEphemeris } from '@/lib/aa-ephemeris';
 *
 * const { calculate, calculateBatch, isReady } = useEphemeris();
 *
 * // Single calculation
 * const sunPos = await calculate(julianDate, 'Sun');
 *
 * // Batch calculation (more efficient)
 * const positions = await calculateBatch([
 *   { julianDate, planet: 'Sun' },
 *   { julianDate, planet: 'Moon' },
 *   { julianDate, planet: 'Mercury' },
 * ]);
 * ```
 */

// Types
export type {
  AAJSPlanet,
  ExtendedPlanet,
  LineType,
  AccuracyTier,
  EphemerisPosition,
  EphemerisRequest,
  EphemerisResponse,
  CacheStats,
} from './types';

export {
  AAJS_SUPPORTED_PLANETS,
  isAAJSSupported,
  DB_NAME,
  DB_VERSION,
  STORE_NAME,
  CACHE_CONFIG,
} from './types';

// React hooks
export {
  useEphemeris,
  needsWasmFallback,
  calculateAstroPositions,
} from './useEphemeris';

export {
  useProgressiveEphemeris,
  calculateAccuracyDelta,
} from './useProgressiveEphemeris';
export type { ProgressivePosition, ProgressiveOptions } from './useProgressiveEphemeris';

// Enhanced astro integration
export {
  convertToAstroPosition,
  convertWasmToEnhanced,
  mergePositions,
  calculateAccuracyStats,
  formatAccuracy,
  getWasmFallbackPlanets,
  getAAJSPlanets,
} from './enhancedAstro';
export type { EnhancedPlanetaryPosition } from './enhancedAstro';
