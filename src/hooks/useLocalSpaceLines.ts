/**
 * useLocalSpaceLines Hook
 * React hook for calculating Local Space lines
 * Local Space lines radiate from birth location based on planetary azimuths
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BirthData,
  LocalSpaceResult,
  LocalSpaceLine,
  Planet,
  PLANET_COLORS,
} from '@/lib/astro-types';
import { calculateLocalSpaceWithWasm, loadWasmModule, isWasmReady } from '@/lib/astro-wasm';

export interface UseLocalSpaceLinesOptions {
  enabled?: boolean;
  maxDistanceKm?: number;
  stepKm?: number;
}

export interface UseLocalSpaceLinesResult {
  result: LocalSpaceResult | null;
  visibleLines: LocalSpaceLine[];
  loading: boolean;
  error: Error | null;
  // Visibility controls
  visiblePlanets: Record<Planet, boolean>;
  togglePlanet: (planet: Planet) => void;
  showAllPlanets: () => void;
  hideAllPlanets: () => void;
  // Actions
  recalculate: () => void;
}

const ALL_PLANETS: Planet[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'Chiron', 'NorthNode'
];

export function useLocalSpaceLines(
  birthData: BirthData | null,
  options: UseLocalSpaceLinesOptions = {}
): UseLocalSpaceLinesResult {
  const {
    enabled = true,
    maxDistanceKm = 240, // 150 miles = ~240 km (Local Space orb of influence)
    stepKm = 20, // Smaller steps for better precision at short distances
  } = options;

  const [result, setResult] = useState<LocalSpaceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [visiblePlanets, setVisiblePlanets] = useState<Record<Planet, boolean>>(
    () => Object.fromEntries(ALL_PLANETS.map(p => [p, true])) as Record<Planet, boolean>
  );

  // Extract primitive values for dependency tracking (ensures recalculation when origin changes)
  const originLat = birthData?.lat;
  const originLng = birthData?.lng;
  const localDate = birthData?.localDate;
  const localTime = birthData?.localTime;

  // Calculate Local Space lines
  const calculate = useCallback(async () => {
    if (!birthData || !enabled) {
      setResult(null);
      return;
    }

    // Need local time data and coordinates
    if (!localDate || !localTime || originLat === undefined || originLng === undefined) {
      setResult(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Ensure WASM is loaded
      await loadWasmModule();

      if (!isWasmReady()) {
        throw new Error('WASM module not available for Local Space calculation');
      }

      console.log(`Local Space: Calculating lines for origin (${originLat}, ${originLng})`);

      const localSpaceResult = await calculateLocalSpaceWithWasm(
        birthData,
        maxDistanceKm,
        stepKm
      );

      if (localSpaceResult) {
        setResult(localSpaceResult);
        console.log(`Local Space: Calculated ${localSpaceResult.lines.length} lines from (${originLat}, ${originLng}) in ${localSpaceResult.calculationTime.toFixed(0)}ms`);
      } else {
        throw new Error('Local Space calculation returned null');
      }
    } catch (err) {
      console.error('Local Space calculation error:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      setResult(null);
    } finally {
      setLoading(false);
    }
  // Use primitive values as dependencies to ensure recalculation when origin coordinates change
  }, [birthData, enabled, maxDistanceKm, stepKm, originLat, originLng, localDate, localTime]);

  // Auto-calculate when birth data changes
  useEffect(() => {
    calculate();
  }, [calculate]);

  // Filter visible lines
  const visibleLines = useMemo(() => {
    if (!result) return [];
    return result.lines.filter(line => visiblePlanets[line.planet]);
  }, [result, visiblePlanets]);

  // Toggle planet visibility
  const togglePlanet = useCallback((planet: Planet) => {
    setVisiblePlanets(prev => ({
      ...prev,
      [planet]: !prev[planet],
    }));
  }, []);

  // Show all planets
  const showAllPlanets = useCallback(() => {
    setVisiblePlanets(
      Object.fromEntries(ALL_PLANETS.map(p => [p, true])) as Record<Planet, boolean>
    );
  }, []);

  // Hide all planets
  const hideAllPlanets = useCallback(() => {
    setVisiblePlanets(
      Object.fromEntries(ALL_PLANETS.map(p => [p, false])) as Record<Planet, boolean>
    );
  }, []);

  return {
    result,
    visibleLines,
    loading,
    error,
    visiblePlanets,
    togglePlanet,
    showAllPlanets,
    hideAllPlanets,
    recalculate: calculate,
  };
}
