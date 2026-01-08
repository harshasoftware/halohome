/**
 * useRelocationChart Hook
 * React hook for calculating relocation charts
 * Shows how a natal chart changes when relocating to a different location
 */

import { useState, useEffect, useCallback } from 'react';
import {
  BirthData,
  RelocationChartResult,
  RelocationPlanetPosition,
  HouseSystem,
} from '@/lib/astro-types';
import { calculateRelocationChartWithWasm, loadWasmModule, isWasmReady } from '@/lib/astro-wasm';

export interface RelocationTarget {
  lat: number;
  lng: number;
  name?: string;
}

export interface UseRelocationChartOptions {
  /** Whether calculation is enabled */
  enabled?: boolean;
  /** House system to use (default: placidus) */
  houseSystem?: HouseSystem;
  /** Use sidereal zodiac instead of tropical (default: false) */
  useSidereal?: boolean;
}

export interface UseRelocationChartResult {
  /** Full relocation chart result */
  result: RelocationChartResult | null;
  /** Loading state */
  loading: boolean;
  /** Error if calculation failed */
  error: Error | null;
  /** Planets that changed houses */
  changedPlanets: RelocationPlanetPosition[];
  /** Planets that stayed in same house */
  unchangedPlanets: RelocationPlanetPosition[];
  /** Whether there are significant house changes */
  hasSignificantChanges: boolean;
  /** Summary of major shifts */
  shiftSummary: {
    ascendantShift: number;
    midheavenShift: number;
    ascendantShiftDirection: 'forward' | 'backward';
    midheavenShiftDirection: 'forward' | 'backward';
    houseChangesCount: number;
  } | null;
  /** Recalculate the chart */
  recalculate: () => void;
  /** Set a new relocation target */
  setRelocationTarget: (target: RelocationTarget | null) => void;
}

export function useRelocationChart(
  birthData: BirthData | null,
  initialTarget: RelocationTarget | null = null,
  options: UseRelocationChartOptions = {}
): UseRelocationChartResult {
  const {
    enabled = true,
    houseSystem = 'placidus',
    useSidereal = false,
  } = options;

  const [target, setTarget] = useState<RelocationTarget | null>(initialTarget);
  const [result, setResult] = useState<RelocationChartResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Calculate relocation chart
  const calculate = useCallback(async () => {
    if (!birthData || !target || !enabled) {
      setResult(null);
      return;
    }

    // Need local time data and coordinates
    if (!birthData.localDate || !birthData.localTime ||
        birthData.lat === undefined || birthData.lng === undefined) {
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ensure WASM is loaded
      await loadWasmModule();

      if (!isWasmReady()) {
        throw new Error('WASM module not available for relocation chart calculation');
      }

      const relocationResult = await calculateRelocationChartWithWasm(
        birthData,
        target.lat,
        target.lng,
        houseSystem,
        useSidereal
      );

      if (relocationResult) {
        setResult(relocationResult);
        console.log(`Relocation Chart: Calculated in ${relocationResult.calculationTime.toFixed(0)}ms`);
        console.log(`Relocation Chart: ASC shift ${relocationResult.ascendantShift.toFixed(1)}°, MC shift ${relocationResult.midheavenShift.toFixed(1)}°`);
      } else {
        throw new Error('Relocation chart calculation returned null');
      }
    } catch (err) {
      console.error('Relocation chart calculation error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [birthData, target, enabled, houseSystem, useSidereal]);

  // Auto-calculate when birth data or target changes
  useEffect(() => {
    calculate();
  }, [calculate]);

  // Separate planets by house change
  const changedPlanets = result?.planets.filter(p => p.houseChanged) ?? [];
  const unchangedPlanets = result?.planets.filter(p => !p.houseChanged) ?? [];

  // Check for significant changes (ASC shift > 10° or any house changes)
  const hasSignificantChanges = result
    ? Math.abs(result.ascendantShift) > 10 || changedPlanets.length > 0
    : false;

  // Generate shift summary
  const shiftSummary = result ? {
    ascendantShift: Math.abs(result.ascendantShift),
    midheavenShift: Math.abs(result.midheavenShift),
    ascendantShiftDirection: result.ascendantShift >= 0 ? 'forward' : 'backward',
    midheavenShiftDirection: result.midheavenShift >= 0 ? 'forward' : 'backward',
    houseChangesCount: changedPlanets.length,
  } as const : null;

  // Set relocation target
  const setRelocationTarget = useCallback((newTarget: RelocationTarget | null) => {
    setTarget(newTarget);
  }, []);

  return {
    result,
    loading,
    error,
    changedPlanets,
    unchangedPlanets,
    hasSignificantChanges,
    shiftSummary,
    recalculate: calculate,
    setRelocationTarget,
  };
}

/**
 * Format house change for display
 * e.g., "Sun: 1st → 2nd house"
 */
export function formatHouseChange(planet: RelocationPlanetPosition): string {
  const ordinal = (n: number) => {
    const s = ['th', 'st', 'nd', 'rd'];
    const v = n % 100;
    return n + (s[(v - 20) % 10] || s[v] || s[0]);
  };
  return `${planet.planet}: ${ordinal(planet.originalHouse)} → ${ordinal(planet.relocatedHouse)} house`;
}

/**
 * Format angular shift for display
 * e.g., "ASC shifted 15° forward"
 */
export function formatAngularShift(
  angle: 'ASC' | 'MC',
  shift: number
): string {
  const direction = shift >= 0 ? 'forward' : 'backward';
  const degrees = Math.abs(shift).toFixed(1);
  return `${angle} shifted ${degrees}° ${direction}`;
}
