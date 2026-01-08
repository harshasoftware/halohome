/**
 * useCompatibilityMode Hook
 * Manages partner chart state and compatibility calculations
 */

import { useState, useCallback, useMemo } from 'react';
import type { BirthChart } from '@/hooks/useBirthCharts';
import type { PlanetaryLine, ZenithPoint, BirthData } from '@/lib/astro-types';
import {
  findCompatibleLocationsWithCities,
  type CompatibilityMode,
  type CompatibilityAnalysis,
  type CompatibleLocation,
} from '@/lib/compatibility-utils';

// Partner chart data (can be saved or temporary)
export interface PartnerChartData {
  id?: string;
  name: string;
  birthDate: string;
  birthTime: string;
  latitude: number;
  longitude: number;
  cityName?: string;
  isSaved?: boolean;
}

// State for compatibility mode
export interface CompatibilityState {
  enabled: boolean;
  partnerChart: PartnerChartData | null;
  mode: CompatibilityMode;
  analysis: CompatibilityAnalysis | null;
  isCalculating: boolean;
}

// Return type for the hook
export interface UseCompatibilityModeReturn {
  // State
  isEnabled: boolean;
  partnerChart: PartnerChartData | null;
  mode: CompatibilityMode;
  analysis: CompatibilityAnalysis | null;
  isCalculating: boolean;

  // Actions
  enable: () => void;
  disable: () => void;
  toggle: () => void;
  setPartnerChart: (chart: PartnerChartData | null) => void;
  setMode: (mode: CompatibilityMode) => void;
  calculateCompatibility: (
    person1Lines: PlanetaryLine[],
    person2Lines: PlanetaryLine[],
    person1Zeniths: ZenithPoint[],
    person2Zeniths: ZenithPoint[],
    person1Name?: string,
    person2Name?: string
  ) => void;
  clearAnalysis: () => void;

  // Helpers
  getPartnerBirthData: () => BirthData | null;
  getTopLocations: (limit?: number) => CompatibleLocation[];
  getBestLocation: () => CompatibleLocation | null;
}

const PARTNER_STORAGE_KEY = 'astro_partner_chart';

export function useCompatibilityMode(): UseCompatibilityModeReturn {
  const [state, setState] = useState<CompatibilityState>(() => {
    // Try to load saved partner from localStorage
    let savedPartner: PartnerChartData | null = null;
    try {
      const stored = localStorage.getItem(PARTNER_STORAGE_KEY);
      if (stored) {
        savedPartner = JSON.parse(stored);
      }
    } catch {
      // Ignore storage errors
    }

    return {
      enabled: false,
      partnerChart: savedPartner,
      mode: 'honeymoon',
      analysis: null,
      isCalculating: false,
    };
  });

  // Enable compatibility mode
  const enable = useCallback(() => {
    setState(prev => ({ ...prev, enabled: true }));
  }, []);

  // Disable compatibility mode (keep analysis for quick re-enable)
  const disable = useCallback(() => {
    setState(prev => ({ ...prev, enabled: false }));
  }, []);

  // Toggle compatibility mode (keep analysis for quick re-enable)
  const toggle = useCallback(() => {
    setState(prev => ({
      ...prev,
      enabled: !prev.enabled,
    }));
  }, []);

  // Set partner chart
  const setPartnerChart = useCallback((chart: PartnerChartData | null) => {
    setState(prev => ({ ...prev, partnerChart: chart, analysis: null }));

    // Save to localStorage if chart exists
    if (chart) {
      try {
        localStorage.setItem(PARTNER_STORAGE_KEY, JSON.stringify(chart));
      } catch {
        // Ignore storage errors
      }
    } else {
      try {
        localStorage.removeItem(PARTNER_STORAGE_KEY);
      } catch {
        // Ignore storage errors
      }
    }
  }, []);

  // Set compatibility mode
  const setMode = useCallback((mode: CompatibilityMode) => {
    setState(prev => ({ ...prev, mode, analysis: null }));
  }, []);

  // Calculate compatibility
  const calculateCompatibility = useCallback((
    person1Lines: PlanetaryLine[],
    person2Lines: PlanetaryLine[],
    person1Zeniths: ZenithPoint[],
    person2Zeniths: ZenithPoint[],
    person1Name?: string,
    person2Name?: string
  ) => {
    setState(prev => ({ ...prev, isCalculating: true }));

    // Use async function for compatibility calculation with city names
    (async () => {
      try {
        const analysis = await findCompatibleLocationsWithCities(
          person1Lines,
          person2Lines,
          person1Zeniths,
          person2Zeniths,
          state.mode
        );

        // Add names to analysis
        analysis.person1Name = person1Name;
        analysis.person2Name = person2Name || state.partnerChart?.name;

        setState(prev => ({
          ...prev,
          analysis,
          isCalculating: false,
        }));
      } catch (error) {
        console.error('Compatibility calculation error:', error);
        setState(prev => ({ ...prev, isCalculating: false }));
      }
    })();
  }, [state.mode, state.partnerChart?.name]);

  // Clear analysis
  const clearAnalysis = useCallback(() => {
    setState(prev => ({ ...prev, analysis: null }));
  }, []);

  // Get partner birth data in BirthData format
  const getPartnerBirthData = useCallback((): BirthData | null => {
    const partner = state.partnerChart;
    if (!partner) return null;

    // Parse date and time
    const [year, month, day] = partner.birthDate.split('-').map(Number);
    const [hours, minutes] = partner.birthTime.split(':').map(Number);

    const date = new Date(Date.UTC(year, month - 1, day, hours, minutes));

    return {
      date,
      latitude: partner.latitude,
      longitude: partner.longitude,
      localDate: partner.birthDate,
      localTime: partner.birthTime,
      lat: partner.latitude,
      lng: partner.longitude,
    };
  }, [state.partnerChart]);

  // Get top locations
  const getTopLocations = useCallback((limit: number = 10): CompatibleLocation[] => {
    return state.analysis?.topLocations.slice(0, limit) || [];
  }, [state.analysis]);

  // Get best location
  const getBestLocation = useCallback((): CompatibleLocation | null => {
    return state.analysis?.topLocations[0] || null;
  }, [state.analysis]);

  return {
    // State
    isEnabled: state.enabled,
    partnerChart: state.partnerChart,
    mode: state.mode,
    analysis: state.analysis,
    isCalculating: state.isCalculating,

    // Actions
    enable,
    disable,
    toggle,
    setPartnerChart,
    setMode,
    calculateCompatibility,
    clearAnalysis,

    // Helpers
    getPartnerBirthData,
    getTopLocations,
    getBestLocation,
  };
}

export default useCompatibilityMode;
