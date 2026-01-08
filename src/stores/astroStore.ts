/**
 * Astro Store - Zustand store for astrocartography state
 *
 * Manages birth data, mode, visibility, and calculation results.
 * Calculation logic remains in useAstroLines hook (handles worker/WASM).
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useShallow } from 'zustand/react/shallow';
import type {
  BirthData,
  AstroMode,
  RelocationLocation,
  AstroCartographyResult,
  AstroVisibilityState,
  Planet,
  LineType,
  PlanetaryLine,
  AspectLine,
  ParanLine,
  ZenithPoint,
} from '@/lib/astro-types';
import { createDefaultVisibility, ALL_PLANETS } from '@/lib/astro-types';

interface AstroState {
  // === Birth Data ===
  birthData: BirthData | null;
  timezoneReady: boolean;

  // === Mode ===
  mode: AstroMode;
  relocationTarget: RelocationLocation | null;
  localSpaceOrigin: RelocationLocation | null;

  // === Calculation Results ===
  result: AstroCartographyResult | null;
  loading: boolean;
  error: Error | null;
  progress: { percent: number; stage: string } | null;
  backend: 'wasm' | 'worker' | 'main' | null;

  // === Visibility ===
  visibility: AstroVisibilityState;

  // === Birth Data Actions ===
  setBirthData: (data: BirthData | null) => void;
  setTimezoneReady: (ready: boolean) => void;
  clearBirthData: () => void;

  // === Mode Actions ===
  setMode: (mode: AstroMode) => void;
  relocateTo: (lat: number, lng: number, name?: string) => void;
  setRelocationTarget: (target: RelocationLocation | null) => void;
  enableLocalSpace: () => void;
  setLocalSpaceOrigin: (lat: number, lng: number, name?: string) => void;
  returnToStandard: () => void;
  clearRelocation: () => void;

  // === Calculation Actions ===
  setResult: (result: AstroCartographyResult | null) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: Error | null) => void;
  setProgress: (progress: { percent: number; stage: string } | null) => void;
  setBackend: (backend: 'wasm' | 'worker' | 'main' | null) => void;
  clearCalculation: () => void;

  // === Visibility Actions ===
  setVisibility: (visibility: AstroVisibilityState) => void;
  togglePlanet: (planet: Planet) => void;
  toggleLineType: (lineType: LineType) => void;
  toggleAspects: () => void;
  toggleHarmoniousAspects: () => void;
  toggleDisharmoniousAspects: () => void;
  toggleParans: () => void;
  toggleZenithPoints: () => void;
  toggleLocalSpace: () => void;
  toggleLineLabels: () => void;
  showAllPlanets: () => void;
  hideAllPlanets: () => void;

  // === Batch Actions ===
  reset: () => void;
}

const initialState = {
  // Birth data
  birthData: null as BirthData | null,
  timezoneReady: false,

  // Mode
  mode: 'standard' as AstroMode,
  relocationTarget: null as RelocationLocation | null,
  localSpaceOrigin: null as RelocationLocation | null,

  // Calculation results
  result: null as AstroCartographyResult | null,
  loading: false,
  error: null as Error | null,
  progress: null as { percent: number; stage: string } | null,
  backend: null as 'wasm' | 'worker' | 'main' | null,

  // Visibility
  visibility: createDefaultVisibility(),
};

export const useAstroStore = create<AstroState>()(
  devtools(
    persist(
      immer((set) => ({
        ...initialState,

        // === Birth Data Actions ===
        setBirthData: (data) => set((state) => {
          state.birthData = data;
        }),
        setTimezoneReady: (ready) => set((state) => {
          state.timezoneReady = ready;
        }),
        clearBirthData: () => set((state) => {
          state.birthData = null;
          state.timezoneReady = false;
          state.result = null;
        }),

        // === Mode Actions ===
        setMode: (mode) => set((state) => {
          state.mode = mode;
        }),
        relocateTo: (lat, lng, name) => set((state) => {
          state.relocationTarget = { lat, lng, name };
          state.mode = 'relocated';
        }),
        setRelocationTarget: (target) => set((state) => {
          state.relocationTarget = target;
        }),
        enableLocalSpace: () => set((state) => {
          state.mode = 'localSpace';
        }),
        setLocalSpaceOrigin: (lat, lng, name) => set((state) => {
          state.localSpaceOrigin = { lat, lng, name };
          if (state.mode !== 'localSpace') {
            state.mode = 'localSpace';
          }
        }),
        returnToStandard: () => set((state) => {
          state.mode = 'standard';
          state.relocationTarget = null;
          state.localSpaceOrigin = null;
          // Also clear local space visibility to ensure lines don't persist
          state.visibility.showLocalSpace = false;
        }),
        clearRelocation: () => set((state) => {
          state.relocationTarget = null;
          state.mode = 'standard';
        }),

        // === Calculation Actions ===
        setResult: (result) => set((state) => {
          state.result = result;
        }),
        setLoading: (loading) => set((state) => {
          state.loading = loading;
        }),
        setError: (error) => set((state) => {
          state.error = error;
        }),
        setProgress: (progress) => set((state) => {
          state.progress = progress;
        }),
        setBackend: (backend) => set((state) => {
          state.backend = backend;
        }),
        clearCalculation: () => set((state) => {
          state.result = null;
          state.loading = false;
          state.error = null;
          state.progress = null;
          state.backend = null;
        }),

        // === Visibility Actions ===
        setVisibility: (visibility) => set((state) => {
          state.visibility = visibility;
        }),
        togglePlanet: (planet) => set((state) => {
          state.visibility.planets[planet] = !state.visibility.planets[planet];
        }),
        toggleLineType: (lineType) => set((state) => {
          state.visibility.lineTypes[lineType] = !state.visibility.lineTypes[lineType];
        }),
        toggleAspects: () => set((state) => {
          state.visibility.showAspects = !state.visibility.showAspects;
        }),
        toggleHarmoniousAspects: () => set((state) => {
          state.visibility.showHarmoniousAspects = !state.visibility.showHarmoniousAspects;
        }),
        toggleDisharmoniousAspects: () => set((state) => {
          state.visibility.showDisharmoniousAspects = !state.visibility.showDisharmoniousAspects;
        }),
        toggleParans: () => set((state) => {
          state.visibility.showParans = !state.visibility.showParans;
        }),
        toggleZenithPoints: () => set((state) => {
          state.visibility.showZenithPoints = !state.visibility.showZenithPoints;
        }),
        toggleLocalSpace: () => set((state) => {
          state.visibility.showLocalSpace = !state.visibility.showLocalSpace;
        }),
        toggleLineLabels: () => set((state) => {
          state.visibility.showLineLabels = !state.visibility.showLineLabels;
        }),
        showAllPlanets: () => set((state) => {
          ALL_PLANETS.forEach((p) => {
            state.visibility.planets[p] = true;
          });
        }),
        hideAllPlanets: () => set((state) => {
          ALL_PLANETS.forEach((p) => {
            state.visibility.planets[p] = false;
          });
        }),

        // === Batch Actions ===
        reset: () => set(initialState),
      })),
      {
        name: 'astro-store',
        // Only persist visibility preferences, not calculation results
        partialize: (state) => ({
          visibility: state.visibility,
        }),
      }
    ),
    { name: 'astro-store' }
  )
);

// === Selectors ===

// Birth data selectors
export const useBirthData = () => useAstroStore((state) => state.birthData);
export const useHasBirthData = () => useAstroStore((state) => state.birthData !== null);
export const useTimezoneReady = () => useAstroStore((state) => state.timezoneReady);

// Mode selectors
export const useAstroMode = () => useAstroStore((state) => state.mode);
export const useIsRelocated = () =>
  useAstroStore((state) => state.mode === 'relocated' && state.relocationTarget !== null);
export const useIsLocalSpace = () => useAstroStore((state) => state.mode === 'localSpace');
export const useRelocationTarget = () => useAstroStore((state) => state.relocationTarget);
export const useLocalSpaceOrigin = () => useAstroStore((state) => state.localSpaceOrigin);

// Calculation state selectors
export const useAstroResult = () => useAstroStore((state) => state.result);
export const useAstroLoading = () => useAstroStore((state) => state.loading);
export const useAstroError = () => useAstroStore((state) => state.error);
export const useAstroProgress = () => useAstroStore((state) => state.progress);
export const useAstroBackend = () => useAstroStore((state) => state.backend);

// Visibility selectors
export const useAstroVisibility = () => useAstroStore((state) => state.visibility);
export const usePlanetVisibility = (planet: Planet) =>
  useAstroStore((state) => state.visibility.planets[planet]);
export const useLineTypeVisibility = (lineType: LineType) =>
  useAstroStore((state) => state.visibility.lineTypes[lineType]);

// === Derived/Memoized Selectors ===

// Visible planetary lines - filtered by visibility settings
export const useVisiblePlanetaryLines = (): PlanetaryLine[] =>
  useAstroStore((state) => {
    if (!state.result) return [];
    return state.result.planetaryLines.filter(
      (line) =>
        state.visibility.planets[line.planet] &&
        state.visibility.lineTypes[line.lineType]
    );
  });

// Visible aspect lines - filtered by visibility settings
export const useVisibleAspectLines = (): AspectLine[] =>
  useAstroStore((state) => {
    if (!state.result || !state.visibility.showAspects) return [];
    return state.result.aspectLines.filter((line) => {
      if (!state.visibility.planets[line.planet]) return false;
      if (line.isHarmonious && !state.visibility.showHarmoniousAspects) return false;
      if (!line.isHarmonious && !state.visibility.showDisharmoniousAspects) return false;
      return true;
    });
  });

// Visible paran lines - filtered by visibility settings
export const useVisibleParanLines = (): ParanLine[] =>
  useAstroStore((state) => {
    if (!state.result || !state.visibility.showParans) return [];
    return state.result.paranLines.filter(
      (line) =>
        state.visibility.planets[line.planet1] &&
        state.visibility.planets[line.planet2]
    );
  });

// Visible zenith points - filtered by visibility settings
export const useVisibleZenithPoints = (): ZenithPoint[] =>
  useAstroStore((state) => {
    if (!state.result || !state.visibility.showZenithPoints) return [];
    return (state.result.zenithPoints || []).filter(
      (point) =>
        state.visibility.planets[point.planet] &&
        state.visibility.lineTypes['MC']
    );
  });

// Relocated birth data (for relocation mode)
export const useRelocatedBirthData = (): BirthData | null =>
  useAstroStore((state) => {
    if (!state.birthData || !state.relocationTarget || state.mode !== 'relocated') {
      return null;
    }
    return {
      ...state.birthData,
      latitude: state.relocationTarget.lat,
      longitude: state.relocationTarget.lng,
      lat: state.relocationTarget.lat,
      lng: state.relocationTarget.lng,
    };
  });

// Local space birth data (for local space mode)
export const useLocalSpaceBirthData = (): BirthData | null =>
  useAstroStore((state) => {
    if (!state.birthData || state.mode !== 'localSpace') {
      return null;
    }
    if (state.localSpaceOrigin) {
      return {
        ...state.birthData,
        latitude: state.localSpaceOrigin.lat,
        longitude: state.localSpaceOrigin.lng,
        lat: state.localSpaceOrigin.lat,
        lng: state.localSpaceOrigin.lng,
      };
    }
    return state.birthData;
  });

// Combined mode state for toolbar
export const useAstroModeState = () =>
  useAstroStore(useShallow((state) => ({
    mode: state.mode,
    isRelocated: state.mode === 'relocated' && state.relocationTarget !== null,
    isLocalSpace: state.mode === 'localSpace',
    relocationTarget: state.relocationTarget,
    localSpaceOrigin: state.localSpaceOrigin,
    relocateTo: state.relocateTo,
    enableLocalSpace: state.enableLocalSpace,
    setLocalSpaceOrigin: state.setLocalSpaceOrigin,
    returnToStandard: state.returnToStandard,
  })));

// Visibility actions for AstroLegend
export const useVisibilityActions = () =>
  useAstroStore(useShallow((state) => ({
    visibility: state.visibility,
    togglePlanet: state.togglePlanet,
    toggleLineType: state.toggleLineType,
    toggleAspects: state.toggleAspects,
    toggleHarmoniousAspects: state.toggleHarmoniousAspects,
    toggleDisharmoniousAspects: state.toggleDisharmoniousAspects,
    toggleParans: state.toggleParans,
    toggleZenithPoints: state.toggleZenithPoints,
    showAllPlanets: state.showAllPlanets,
    hideAllPlanets: state.hideAllPlanets,
    setVisibility: state.setVisibility,
  })));

// Calculation state actions
export const useCalculationActions = () =>
  useAstroStore(useShallow((state) => ({
    setResult: state.setResult,
    setLoading: state.setLoading,
    setError: state.setError,
    setProgress: state.setProgress,
    setBackend: state.setBackend,
    clearCalculation: state.clearCalculation,
  })));

// Combined state for AstroLegend component
export const useAstroLegendState = () =>
  useAstroStore(useShallow((state) => ({
    // Visibility
    visibility: state.visibility,
    onTogglePlanet: state.togglePlanet,
    onToggleLineType: state.toggleLineType,
    onToggleAspects: state.toggleAspects,
    onToggleHarmoniousAspects: state.toggleHarmoniousAspects,
    onToggleDisharmoniousAspects: state.toggleDisharmoniousAspects,
    onToggleParans: state.toggleParans,
    onToggleZenithPoints: state.toggleZenithPoints,
    onToggleLocalSpace: state.toggleLocalSpace,
    onToggleLineLabels: state.toggleLineLabels,
    onShowAll: state.showAllPlanets,
    onHideAll: state.hideAllPlanets,
    // Loading state
    loading: state.loading,
    // Clear birth data
    onClearBirthData: state.clearBirthData,
    // Mode
    mode: state.mode,
    isRelocated: state.mode === 'relocated' && state.relocationTarget !== null,
    relocationName: state.relocationTarget?.name,
    localSpaceOriginName: state.localSpaceOrigin?.name,
    onEnableLocalSpace: state.enableLocalSpace,
    onReturnToStandard: state.returnToStandard,
  })));
