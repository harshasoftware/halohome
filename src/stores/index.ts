/**
 * Zustand Stores - Centralized state management
 *
 * Re-exports all stores and their selectors for convenient importing.
 */

// ============================================
// Auth Store
// ============================================
export { useAuthStore } from './authStore';
export {
  useAuthUser,
  useAuthSession,
  useAuthLoading,
  useIsAuthenticated,
  useIsPasswordRecovery,
} from './authStore';

// ============================================
// UI Store
// ============================================
export { useUIStore } from './uiStore';
export {
  usePersonDialog,
  useRelationshipModal,
  usePasswordModal,
  useToolbarState,
  useDeleteConfirmation,
  useBirthDataDialog,
  useAnyModalOpen,
} from './uiStore';

// ============================================
// Project Store
// ============================================
export { useProjectStore } from './projectStore';
export {
  useProjectId,
  useProjectName,
  useExistingProjects,
  useNodes,
  useEdges,
  useIsDataLoaded,
  useFilters,
  useEncryptionKey,
  useIsProjectPermanent,
  usePersonNodes,
  useUnionNodes,
  usePersonById,
  useReactFlowState,
  useProjectActions,
  useTreeActions,
} from './projectStore';

// ============================================
// Astro Store
// ============================================
export { useAstroStore } from './astroStore';
export {
  useBirthData,
  useHasBirthData,
  useTimezoneReady,
  useAstroMode,
  useIsRelocated,
  useIsLocalSpace,
  useRelocationTarget,
  useLocalSpaceOrigin,
  useAstroResult,
  useAstroLoading,
  useAstroError,
  useAstroProgress,
  useAstroBackend,
  useAstroVisibility,
  usePlanetVisibility,
  useLineTypeVisibility,
  useVisiblePlanetaryLines,
  useVisibleAspectLines,
  useVisibleParanLines,
  useVisibleZenithPoints,
  useRelocatedBirthData,
  useLocalSpaceBirthData,
  useAstroModeState,
  useVisibilityActions,
  useCalculationActions,
} from './astroStore';

// ============================================
// Globe Interaction Store
// ============================================
export { useGlobeInteractionStore } from './globeInteractionStore';
export {
  useSelectedPerson,
  useSelectedYear,
  useSelectedLine,
  useLocationAnalysis,
  useSelectedCityForInfo,
  useCityLocation,
  usePendingBirthCoords,
  useIsDrawingZone,
  useZoneDrawingPoints,
  useDrawnZone,
  useZoneAnalysis,
  useHasDrawnZone,
  usePanelStack,
  useCurrentPanelIndex,
  useCurrentPanel,
  useHasPanels,
  useShowQuickBirthModal,
  useShowBirthDateTimeModal,
  usePendingBirthplace,
  useShowAstroLines,
  useNatalChartMinimized,
  useZoneState,
  usePanelStackActions,
  useSelectionActions,
  useModalActions,
} from './globeInteractionStore';
export type {
  GlobePath,
  CityLocation,
  PendingBirthplace,
  DrawnZone,
  ZoneAnalysis,
  PanelType,
  PanelItem,
  UsePanelStackReturn,
} from './globeInteractionStore';

// ============================================
// Compatibility Store
// ============================================
export { useCompatibilityStore } from './compatibilityStore';
export {
  useIsCompatibilityEnabled,
  usePartnerChart,
  useHasPartner,
  useCompatibilityMode,
  useCompatibilityAnalysis,
  useIsCalculatingCompatibility,
  usePartnerBirthData,
  useTopLocations,
  useBestLocation,
  useCompatibilityStateForToolbar,
  useCompatibilityActions,
} from './compatibilityStore';
export type {
  CompatibilityMode,
  PartnerChartData,
  CompatibleLocation,
  CompatibilityAnalysis,
} from './compatibilityStore';

// ============================================
// Natal Chart Store
// ============================================
export { useNatalChartStore } from './natalChartStore';
export {
  useNatalChartSettings,
  useHouseSystem,
  useZodiacType,
  useShowHouses,
  useShowAspects,
  useNatalChartResult,
  usePartnerNatalChartResult,
  useNatalChartCalculating,
  useNatalChartError,
  useHasNatalChartResult,
  useNatalChartShowSettings,
  useNatalChartStateForNav,
  useNatalChartSettingsActions,
  useNatalChartResultActions,
  useNatalChartWidgetActions,
} from './natalChartStore';

// ============================================
// Scout Store
// ============================================
export { useScoutStore } from './scoutStore';
export {
  useScoutProgress,
  useScoutPhase,
  useIsScoutComputing,
  useIsScoutComplete,
  useScoutOverallPercent,
  useScoutDetail,
  useScoutLinesKey,
  useScoutBackend,
  useScoutOverallResults,
  useHasScoutOverallResults,
  useScoutCategoryResult,
  useScoutCategoryResults,
  useHasScoutCategoryResult,
  useScoutCategoriesComplete,
  useScoutActions,
} from './scoutStore';
export type { ScoutComputationPhase, ScoutProgress } from './scoutStore';

// ============================================
// Saved Locations Store
// ============================================
export { useSavedLocationsStore, useBirthChartsStore } from './savedLocationsStore';
export {
  loadSavedLocations,
  saveSavedLocation,
  updateSavedLocation,
  deleteSavedLocation,
  setDefaultSavedLocation,
  selectSavedLocation,
  // Backwards compatibility aliases
  loadBirthCharts,
  saveBirthChart,
  updateBirthChart,
  deleteBirthChart,
  setDefaultBirthChart,
  selectBirthChart,
} from './savedLocationsStore';
export type { SavedLocation, SavedLocationInput, BirthChart, BirthChartInput } from './savedLocationsStore';
