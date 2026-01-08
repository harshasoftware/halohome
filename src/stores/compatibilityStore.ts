/**
 * Compatibility Store - Zustand store for duo/compatibility mode
 *
 * Manages partner chart state, compatibility calculations, and mode settings.
 * Uses persist middleware to remember partner chart across sessions.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useShallow } from 'zustand/react/shallow';
import type { BirthData, PlanetaryLine, ZenithPoint } from '@/lib/astro-types';

// Compatibility modes
export type CompatibilityMode = 'honeymoon' | 'relocation' | 'travel' | 'business';

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

// Compatible location result
export interface CompatibleLocation {
  lat: number;
  lng: number;
  cityName?: string;
  score: number;
  lines1: string[];
  lines2: string[];
  description?: string;
}

// Compatibility analysis result
export interface CompatibilityAnalysis {
  person1Name?: string;
  person2Name?: string;
  mode: CompatibilityMode;
  topLocations: CompatibleLocation[];
  totalLocationsAnalyzed: number;
  calculationTime: number;
}

interface CompatibilityState {
  // === State ===
  enabled: boolean;
  partnerChart: PartnerChartData | null;
  mode: CompatibilityMode;
  analysis: CompatibilityAnalysis | null;
  isCalculating: boolean;
  showPartnerModal: boolean;

  // === Actions ===
  enable: () => void;
  disable: () => void;
  toggle: () => void;
  setPartnerChart: (chart: PartnerChartData | null) => void;
  setMode: (mode: CompatibilityMode) => void;
  setAnalysis: (analysis: CompatibilityAnalysis | null) => void;
  setIsCalculating: (calculating: boolean) => void;
  setShowPartnerModal: (show: boolean) => void;
  openPartnerModal: () => void;
  clearAnalysis: () => void;
  reset: () => void;
}

const initialState = {
  enabled: false,
  partnerChart: null as PartnerChartData | null,
  mode: 'honeymoon' as CompatibilityMode,
  analysis: null as CompatibilityAnalysis | null,
  isCalculating: false,
  showPartnerModal: false,
};

export const useCompatibilityStore = create<CompatibilityState>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,

        enable: () => set((state) => {
          state.enabled = true;
        }),
        disable: () => set((state) => {
          state.enabled = false;
          // Keep analysis for quick re-enable
        }),
        toggle: () => set((state) => {
          state.enabled = !state.enabled;
          // Keep analysis for quick re-enable
        }),
        setPartnerChart: (chart) => set((state) => {
          state.partnerChart = chart;
          state.analysis = null;
        }),
        setMode: (mode) => set((state) => {
          state.mode = mode;
          state.analysis = null;
        }),
        setAnalysis: (analysis) => set((state) => {
          state.analysis = analysis;
        }),
        setIsCalculating: (calculating) => set((state) => {
          state.isCalculating = calculating;
        }),
        setShowPartnerModal: (show) => set((state) => {
          state.showPartnerModal = show;
        }),
        openPartnerModal: () => set((state) => {
          console.log('[compatibilityStore] openPartnerModal called');
          state.showPartnerModal = true;
        }),
        clearAnalysis: () => set((state) => {
          state.analysis = null;
        }),
        reset: () => set(initialState),
      })),
      {
        name: 'compatibility-store',
        // Only persist partner chart, not transient state
        partialize: (state) => ({
          partnerChart: state.partnerChart,
          mode: state.mode,
        }),
      }
    ),
    { name: 'compatibility-store' }
  )
);

// === Selectors ===

export const useIsCompatibilityEnabled = () =>
  useCompatibilityStore((state) => state.enabled);
export const usePartnerChart = () =>
  useCompatibilityStore((state) => state.partnerChart);
export const useHasPartner = () =>
  useCompatibilityStore((state) => state.partnerChart !== null);
export const useCompatibilityMode = () =>
  useCompatibilityStore((state) => state.mode);
export const useCompatibilityAnalysis = () =>
  useCompatibilityStore((state) => state.analysis);
export const useIsCalculatingCompatibility = () =>
  useCompatibilityStore((state) => state.isCalculating);
export const useShowPartnerModal = () =>
  useCompatibilityStore((state) => state.showPartnerModal);

// Get partner birth data in BirthData format
export const usePartnerBirthData = (): BirthData | null => {
  return useCompatibilityStore((state) => {
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
  });
};

// Get top locations from analysis
export const useTopLocations = (limit: number = 10): CompatibleLocation[] => {
  return useCompatibilityStore((state) =>
    state.analysis?.topLocations.slice(0, limit) || []
  );
};

// Get best location from analysis
export const useBestLocation = (): CompatibleLocation | null => {
  return useCompatibilityStore((state) =>
    state.analysis?.topLocations[0] || null
  );
};

// Combined state for toolbar
export const useCompatibilityStateForToolbar = () =>
  useCompatibilityStore(useShallow((state) => ({
    isEnabled: state.enabled,
    hasPartner: state.partnerChart !== null,
    partnerName: state.partnerChart?.name,
    isCalculating: state.isCalculating,
    toggle: state.toggle,
    enable: state.enable,
    disable: state.disable,
    openPartnerModal: state.openPartnerModal,
  })));

// Actions selector
export const useCompatibilityActions = () =>
  useCompatibilityStore(useShallow((state) => ({
    enable: state.enable,
    disable: state.disable,
    toggle: state.toggle,
    setPartnerChart: state.setPartnerChart,
    setMode: state.setMode,
    setAnalysis: state.setAnalysis,
    setIsCalculating: state.setIsCalculating,
    setShowPartnerModal: state.setShowPartnerModal,
    clearAnalysis: state.clearAnalysis,
  })));
