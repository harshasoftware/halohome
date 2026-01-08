/**
 * Scout Store - Zustand store for scout location analysis results
 *
 * This store holds pre-computed scout results that are computed at the
 * GlobePage level (not in ScoutPanel) so they persist even when the
 * panel is closed.
 */

import { create } from 'zustand';
import type { ScoutCategory, ScoutAnalysis, OverallScoutLocation } from '@/features/globe/utils/scout-utils';
import { type PopulationTier, DEFAULT_POPULATION_TIER, getMinPopulation } from '@/features/globe/utils/population-tiers';

// ============================================================================
// Types
// ============================================================================

export type ScoutComputationPhase = 'idle' | 'initializing' | 'computing' | 'complete' | 'error';

export interface ScoutProgress {
  phase: ScoutComputationPhase;
  overallPercent: number;
  categoriesComplete: number;
  totalCategories: number;
  currentCategory?: string;
  detail?: string;
  error?: string;
}

export interface ScoutState {
  // Computation state
  progress: ScoutProgress;
  linesKey: string;
  backend: 'wasm' | 'typescript' | null;

  // Population filter
  populationTier: PopulationTier;
  minPopulation: number;

  // Results
  overallResults: OverallScoutLocation[] | null;
  categoryResults: Map<ScoutCategory, ScoutAnalysis>;

  // Actions
  setProgress: (progress: ScoutProgress) => void;
  setLinesKey: (key: string) => void;
  setBackend: (backend: 'wasm' | 'typescript') => void;
  setPopulationTier: (tier: PopulationTier) => void;
  setOverallResults: (results: OverallScoutLocation[]) => void;
  setCategoryResult: (category: ScoutCategory, analysis: ScoutAnalysis) => void;
  clearResults: () => void;
  reset: () => void;
}

// ============================================================================
// Initial State
// ============================================================================

const initialProgress: ScoutProgress = {
  phase: 'idle',
  overallPercent: 0,
  categoriesComplete: 0,
  totalCategories: 7,
};

// ============================================================================
// Store
// ============================================================================

export const useScoutStore = create<ScoutState>()((set) => ({
  // Initial state
  progress: initialProgress,
  linesKey: '',
  backend: null,
  populationTier: DEFAULT_POPULATION_TIER,
  minPopulation: getMinPopulation(DEFAULT_POPULATION_TIER),
  overallResults: null,
  categoryResults: new Map(),

  // Actions
  setProgress: (progress) => set({ progress }),

  setLinesKey: (linesKey) => set({ linesKey }),

  setBackend: (backend) => set({ backend }),

  setPopulationTier: (tier) =>
    set({
      populationTier: tier,
      minPopulation: getMinPopulation(tier),
      // Clear results when tier changes - will recompute
      overallResults: null,
      categoryResults: new Map(),
      linesKey: '',
      progress: initialProgress,
    }),

  setOverallResults: (overallResults) => set({ overallResults }),

  setCategoryResult: (category, analysis) =>
    set((state) => {
      const newMap = new Map(state.categoryResults);
      newMap.set(category, analysis);
      return { categoryResults: newMap };
    }),

  clearResults: () =>
    set({
      overallResults: null,
      categoryResults: new Map(),
      linesKey: '',
      progress: initialProgress,
    }),

  reset: () =>
    set({
      progress: initialProgress,
      linesKey: '',
      backend: null,
      populationTier: DEFAULT_POPULATION_TIER,
      minPopulation: getMinPopulation(DEFAULT_POPULATION_TIER),
      overallResults: null,
      categoryResults: new Map(),
    }),
}));

// ============================================================================
// Selectors
// ============================================================================

/**
 * Get the current scout computation progress
 */
export const useScoutProgress = () => useScoutStore((state) => state.progress);

/**
 * Get the current computation phase
 */
export const useScoutPhase = () => useScoutStore((state) => state.progress.phase);

/**
 * Check if scout is currently computing
 */
export const useIsScoutComputing = () =>
  useScoutStore((state) =>
    state.progress.phase === 'initializing' || state.progress.phase === 'computing'
  );

/**
 * Check if scout computation is complete
 */
export const useIsScoutComplete = () =>
  useScoutStore((state) => state.progress.phase === 'complete');

/**
 * Get the overall percent progress (0-100)
 */
export const useScoutOverallPercent = () =>
  useScoutStore((state) => state.progress.overallPercent);

/**
 * Get the current computation detail message
 */
export const useScoutDetail = () =>
  useScoutStore((state) => state.progress.detail);

/**
 * Get the lines key that results are computed for
 */
export const useScoutLinesKey = () => useScoutStore((state) => state.linesKey);

/**
 * Get the backend used for computation (wasm or typescript)
 */
export const useScoutBackend = () => useScoutStore((state) => state.backend);

/**
 * Get the overall scout results
 */
export const useScoutOverallResults = () =>
  useScoutStore((state) => state.overallResults);

/**
 * Check if overall results are available
 */
export const useHasScoutOverallResults = () =>
  useScoutStore((state) => state.overallResults !== null);

/**
 * Get results for a specific category
 */
export const useScoutCategoryResult = (category: ScoutCategory) =>
  useScoutStore((state) => state.categoryResults.get(category) ?? null);

/**
 * Get all category results as a Map
 */
export const useScoutCategoryResults = () =>
  useScoutStore((state) => state.categoryResults);

/**
 * Check if a specific category has results
 */
export const useHasScoutCategoryResult = (category: ScoutCategory) =>
  useScoutStore((state) => state.categoryResults.has(category));

/**
 * Get the number of categories with results
 */
export const useScoutCategoriesComplete = () =>
  useScoutStore((state) => state.categoryResults.size);

/**
 * Get the current population tier
 */
export const useScoutPopulationTier = () =>
  useScoutStore((state) => state.populationTier);

/**
 * Get the minimum population for filtering
 */
export const useScoutMinPopulation = () =>
  useScoutStore((state) => state.minPopulation);

/**
 * Get all scout actions
 */
export const useScoutActions = () =>
  useScoutStore((state) => ({
    setProgress: state.setProgress,
    setLinesKey: state.setLinesKey,
    setBackend: state.setBackend,
    setPopulationTier: state.setPopulationTier,
    setOverallResults: state.setOverallResults,
    setCategoryResult: state.setCategoryResult,
    clearResults: state.clearResults,
    reset: state.reset,
  }));
