/**
 * Enhanced Astro Calculator
 *
 * Integrates aa-js high-precision calculations with existing WASM
 * calculations for a complete astrocartography solution.
 *
 * - Uses aa-js for Sun, Moon, Mercury-Pluto (0.01 arcsecond accuracy)
 * - Falls back to WASM for Chiron, North Node (5 arcminute accuracy)
 * - Automatic caching for performance
 */

import type { PlanetaryPosition, Planet } from '../astro-types';
import type { EphemerisPosition, ExtendedPlanet } from './types';
import { isAAJSSupported } from './types';

/**
 * Enhanced planetary position with accuracy metadata
 */
export interface EnhancedPlanetaryPosition extends PlanetaryPosition {
  accuracy: 'aa-js' | 'aa-js-cached' | 'wasm';
  calculatedAt: number;
}

/**
 * Convert aa-js position to PlanetaryPosition format
 */
export function convertToAstroPosition(
  ephemerisPos: EphemerisPosition
): EnhancedPlanetaryPosition {
  return {
    planet: ephemerisPos.planet as Planet,
    rightAscension: ephemerisPos.rightAscension,
    declination: ephemerisPos.declination,
    eclipticLongitude: ephemerisPos.eclipticLongitude,
    accuracy: ephemerisPos.accuracy === 'wasm-fallback' ? 'wasm' : ephemerisPos.accuracy,
    calculatedAt: ephemerisPos.calculatedAt,
  };
}

/**
 * Convert WASM position to enhanced position format
 */
export function convertWasmToEnhanced(
  wasmPos: PlanetaryPosition
): EnhancedPlanetaryPosition {
  return {
    ...wasmPos,
    accuracy: 'wasm',
    calculatedAt: Date.now(),
  };
}

/**
 * Merge aa-js and WASM positions
 * Uses aa-js for supported planets, WASM for others
 */
export function mergePositions(
  aajsPositions: Map<ExtendedPlanet, EphemerisPosition>,
  wasmPositions: PlanetaryPosition[]
): EnhancedPlanetaryPosition[] {
  const result: EnhancedPlanetaryPosition[] = [];
  const usedPlanets = new Set<string>();

  // Add aa-js positions first (higher accuracy)
  for (const [planet, pos] of aajsPositions) {
    if (pos.accuracy !== 'wasm-fallback') {
      result.push(convertToAstroPosition(pos));
      usedPlanets.add(planet);
    }
  }

  // Add WASM positions for unsupported planets
  for (const wasmPos of wasmPositions) {
    if (!usedPlanets.has(wasmPos.planet)) {
      result.push(convertWasmToEnhanced(wasmPos));
    }
  }

  return result;
}

/**
 * Calculate accuracy improvement statistics
 */
export function calculateAccuracyStats(
  positions: EnhancedPlanetaryPosition[]
): {
  aajsCount: number;
  aajsCachedCount: number;
  wasmCount: number;
  avgAccuracyArcsec: number;
} {
  let aajsCount = 0;
  let aajsCachedCount = 0;
  let wasmCount = 0;

  for (const pos of positions) {
    if (pos.accuracy === 'aa-js') aajsCount++;
    else if (pos.accuracy === 'aa-js-cached') aajsCachedCount++;
    else wasmCount++;
  }

  // Estimated average accuracy in arcseconds
  // aa-js: 0.01", WASM: 300" (5 arcminutes)
  const totalCount = positions.length;
  const aajsTotal = (aajsCount + aajsCachedCount) * 0.01;
  const wasmTotal = wasmCount * 300;
  const avgAccuracyArcsec = totalCount > 0 ? (aajsTotal + wasmTotal) / totalCount : 0;

  return {
    aajsCount,
    aajsCachedCount,
    wasmCount,
    avgAccuracyArcsec,
  };
}

/**
 * Format accuracy for display
 */
export function formatAccuracy(arcsec: number): string {
  if (arcsec < 1) {
    return `${(arcsec * 1000).toFixed(0)} milliarcseconds`;
  } else if (arcsec < 60) {
    return `${arcsec.toFixed(1)} arcseconds`;
  } else {
    return `${(arcsec / 60).toFixed(1)} arcminutes`;
  }
}

/**
 * Get planets that need WASM fallback
 */
export function getWasmFallbackPlanets(planets: Planet[]): Planet[] {
  return planets.filter((p) => !isAAJSSupported(p));
}

/**
 * Get planets that can use aa-js
 */
export function getAAJSPlanets(planets: Planet[]): ExtendedPlanet[] {
  return planets.filter((p) => isAAJSSupported(p)) as ExtendedPlanet[];
}
