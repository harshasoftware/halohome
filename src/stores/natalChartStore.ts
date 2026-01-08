/**
 * Natal Chart Store - Zustand store for natal chart settings and results
 *
 * Manages natal chart display settings, calculation results, and widget state.
 * Uses persist middleware to remember settings across sessions.
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useShallow } from 'zustand/react/shallow';
import type {
  NatalChartSettings,
  NatalChartResult,
  HouseSystem,
  ZodiacType,
} from '@/lib/astro-types';
import { DEFAULT_NATAL_SETTINGS } from '@/lib/astro-types';

interface NatalChartState {
  // === Settings ===
  settings: NatalChartSettings;

  // === Results ===
  result: NatalChartResult | null;
  partnerResult: NatalChartResult | null;
  isCalculating: boolean;
  error: Error | null;

  // === Widget State ===
  isMinimized: boolean;
  showSettings: boolean;

  // === Settings Actions ===
  setSettings: (settings: NatalChartSettings) => void;
  setHouseSystem: (system: HouseSystem) => void;
  setZodiacType: (type: ZodiacType) => void;
  setShowHouses: (show: boolean) => void;
  setShowAspects: (show: boolean) => void;
  resetSettings: () => void;

  // === Result Actions ===
  setResult: (result: NatalChartResult | null) => void;
  setPartnerResult: (result: NatalChartResult | null) => void;
  setIsCalculating: (calculating: boolean) => void;
  setError: (error: Error | null) => void;
  clearResults: () => void;

  // === Widget Actions ===
  setIsMinimized: (minimized: boolean) => void;
  toggleMinimized: () => void;
  setShowSettings: (show: boolean) => void;
  toggleSettings: () => void;

  // === Batch Actions ===
  reset: () => void;
}

const initialState = {
  // Settings
  settings: DEFAULT_NATAL_SETTINGS,

  // Results
  result: null as NatalChartResult | null,
  partnerResult: null as NatalChartResult | null,
  isCalculating: false,
  error: null as Error | null,

  // Widget state
  isMinimized: true,
  showSettings: false,
};

export const useNatalChartStore = create<NatalChartState>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,

        // === Settings Actions ===
        setSettings: (settings) => set((state) => {
          state.settings = settings;
        }),
        setHouseSystem: (system) => set((state) => {
          state.settings.houseSystem = system;
        }),
        setZodiacType: (type) => set((state) => {
          state.settings.zodiacType = type;
        }),
        setShowHouses: (show) => set((state) => {
          state.settings.showHouses = show;
        }),
        setShowAspects: (show) => set((state) => {
          state.settings.showAspects = show;
        }),
        resetSettings: () => set((state) => {
          state.settings = DEFAULT_NATAL_SETTINGS;
        }),

        // === Result Actions ===
        setResult: (result) => set((state) => {
          state.result = result;
        }),
        setPartnerResult: (result) => set((state) => {
          state.partnerResult = result;
        }),
        setIsCalculating: (calculating) => set((state) => {
          state.isCalculating = calculating;
        }),
        setError: (error) => set((state) => {
          state.error = error;
        }),
        clearResults: () => set((state) => {
          state.result = null;
          state.partnerResult = null;
          state.error = null;
        }),

        // === Widget Actions ===
        setIsMinimized: (minimized) => set((state) => {
          state.isMinimized = minimized;
        }),
        toggleMinimized: () => set((state) => {
          state.isMinimized = !state.isMinimized;
        }),
        setShowSettings: (show) => set((state) => {
          state.showSettings = show;
        }),
        toggleSettings: () => set((state) => {
          state.showSettings = !state.showSettings;
        }),

        // === Batch Actions ===
        reset: () => set(initialState),
      })),
      {
        name: 'natal-chart-store',
        // Only persist settings, not results or widget state
        partialize: (state) => ({
          settings: state.settings,
        }),
      }
    ),
    { name: 'natal-chart-store' }
  )
);

// === Selectors ===

// Settings selectors
export const useNatalChartSettings = () =>
  useNatalChartStore((state) => state.settings);
export const useHouseSystem = () =>
  useNatalChartStore((state) => state.settings.houseSystem);
export const useZodiacType = () =>
  useNatalChartStore((state) => state.settings.zodiacType);
export const useShowHouses = () =>
  useNatalChartStore((state) => state.settings.showHouses);
export const useShowAspects = () =>
  useNatalChartStore((state) => state.settings.showAspects);

// Result selectors
export const useNatalChartResult = () =>
  useNatalChartStore((state) => state.result);
export const usePartnerNatalChartResult = () =>
  useNatalChartStore((state) => state.partnerResult);
export const useNatalChartCalculating = () =>
  useNatalChartStore((state) => state.isCalculating);
export const useNatalChartError = () =>
  useNatalChartStore((state) => state.error);
export const useHasNatalChartResult = () =>
  useNatalChartStore((state) => state.result !== null);

// Widget state selectors
export const useNatalChartMinimized = () =>
  useNatalChartStore((state) => state.isMinimized);
export const useNatalChartShowSettings = () =>
  useNatalChartStore((state) => state.showSettings);

// Combined state for mobile nav
export const useNatalChartStateForNav = () =>
  useNatalChartStore(useShallow((state) => ({
    isOpen: !state.isMinimized,
    hasData: state.result !== null,
    toggle: state.toggleMinimized,
  })));

// Settings actions selector
export const useNatalChartSettingsActions = () =>
  useNatalChartStore(useShallow((state) => ({
    setSettings: state.setSettings,
    setHouseSystem: state.setHouseSystem,
    setZodiacType: state.setZodiacType,
    setShowHouses: state.setShowHouses,
    setShowAspects: state.setShowAspects,
    resetSettings: state.resetSettings,
  })));

// Result actions selector
export const useNatalChartResultActions = () =>
  useNatalChartStore(useShallow((state) => ({
    setResult: state.setResult,
    setPartnerResult: state.setPartnerResult,
    setIsCalculating: state.setIsCalculating,
    setError: state.setError,
    clearResults: state.clearResults,
  })));

// Widget actions selector
export const useNatalChartWidgetActions = () =>
  useNatalChartStore(useShallow((state) => ({
    setIsMinimized: state.setIsMinimized,
    toggleMinimized: state.toggleMinimized,
    setShowSettings: state.setShowSettings,
    toggleSettings: state.toggleSettings,
  })));
