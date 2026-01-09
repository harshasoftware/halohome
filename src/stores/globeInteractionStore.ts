/**
 * Globe Interaction Store - Zustand store for globe UI interactions
 *
 * Manages selections, zone drawing, panel stack, and modals for the globe view.
 * Replaces 40+ useState calls in GlobePage.tsx.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useShallow } from 'zustand/react/shallow';
import type { PersonData } from '@/types/familyTree';
import type { LocationAnalysis } from '@/lib/location-line-utils';

// Import and re-export GlobePath from MigrationGlobe
import type { GlobePath } from '@/features/globe/components/MigrationGlobe';
export type { GlobePath };

// City location type
export interface CityLocation {
  lat: number;
  lng: number;
  name: string;
}

// Pending birthplace for the date/time modal
export interface PendingBirthplace {
  lat: number;
  lng: number;
  cityName: string;
}

// Zone drawing state
export interface DrawnZone {
  points: Array<{ lat: number; lng: number }>;
}

// Zone analysis result
export interface ZoneAnalysis {
  title?: string;
  summary?: string;
  details?: string[];
  [key: string]: unknown;
}

// Panel types for the right panel stack
export type PanelType = 'line' | 'analysis' | 'city' | 'person' | 'chat' | 'compatibility' | 'relocation' | 'favorites' | 'scout' | 'charts';

export interface PanelItem {
  id: string;
  type: PanelType;
  title: string;
  data: unknown;
}

// Highlighted scout city (for hover highlighting)
export interface HighlightedScoutCity {
  lat: number;
  lng: number;
  name: string;
}

// Scout progress state (for mobile FAB progress indicator)
export interface ScoutProgress {
  percent: number;
  phase: 'idle' | 'initializing' | 'computing' | 'complete' | 'error';
  detail?: string;
}

interface GlobeInteractionState {
  // === Selections ===
  selectedPerson: PersonData | null;
  selectedYear: number | null;
  selectedLine: GlobePath | null;
  highlightedLine: { planet: string; lineType: string } | null;
  highlightedScoutCity: HighlightedScoutCity | null;
  locationAnalysis: LocationAnalysis | null;
  selectedCityForInfo: CityLocation | null;
  cityLocation: CityLocation | null;
  pendingBirthCoords: { lat: number; lng: number } | null;

  // === Zone Drawing ===
  isDrawingZone: boolean;
  zoneDrawingPoints: Array<{ lat: number; lng: number }>;
  drawnZone: DrawnZone | null;
  zoneAnalysis: ZoneAnalysis | null;

  // === Panel Stack ===
  panelStack: PanelItem[];
  currentPanelIndex: number;

  // === Modals ===
  showQuickBirthModal: boolean;
  showBirthDateTimeModal: boolean;
  pendingBirthplace: PendingBirthplace | null;
  showPartnerModal: boolean;

  // === UI State ===
  showAstroLines: boolean;
  natalChartMinimized: boolean;
  timezoneReady: boolean;
  mobileScoutSheetOpen: boolean;
  mobileChartsSheetOpen: boolean;
  mobileFavoritesSheetOpen: boolean;
  mobileDrawerOpen: boolean;
  mobileSheetMaximized: boolean;
  scoutProgress: ScoutProgress | null;

  // === Selection Actions ===
  setSelectedPerson: (person: PersonData | null) => void;
  setSelectedYear: (year: number | null) => void;
  setSelectedLine: (line: GlobePath | null) => void;
  setHighlightedLine: (line: { planet: string; lineType: string } | null) => void;
  setHighlightedScoutCity: (city: HighlightedScoutCity | null) => void;
  setLocationAnalysis: (analysis: LocationAnalysis | null) => void;
  setSelectedCityForInfo: (city: CityLocation | null) => void;
  setCityLocation: (location: CityLocation | null) => void;
  setPendingBirthCoords: (coords: { lat: number; lng: number } | null) => void;
  clearAllSelections: () => void;

  // === Zone Drawing Actions ===
  startDrawingZone: () => void;
  stopDrawingZone: () => void;
  toggleDrawingZone: () => void;
  setIsDrawingZone: (isDrawing: boolean) => void;
  addZonePoint: (point: { lat: number; lng: number }) => void;
  setZoneDrawingPoints: (points: Array<{ lat: number; lng: number }>) => void;
  completeZoneDrawing: () => void;
  setDrawnZone: (zone: DrawnZone | null) => void;
  setZoneAnalysis: (analysis: ZoneAnalysis | null) => void;
  clearZone: () => void;

  // === Panel Stack Actions ===
  pushPanel: (panel: Omit<PanelItem, 'id'>) => void;
  popPanel: () => void;
  navigateBack: () => void;
  navigateForward: () => void;
  closeCurrentPanel: () => void;
  closeAllPanels: () => void;
  setCurrentPanelIndex: (index: number) => void;

  // === Modal Actions ===
  openQuickBirthModal: (coords: { lat: number; lng: number }) => void;
  closeQuickBirthModal: () => void;
  setShowQuickBirthModal: (show: boolean) => void;
  openBirthDateTimeModal: (birthplace: PendingBirthplace) => void;
  closeBirthDateTimeModal: () => void;
  setShowBirthDateTimeModal: (show: boolean) => void;
  setPendingBirthplace: (birthplace: PendingBirthplace | null) => void;
  setShowPartnerModal: (show: boolean) => void;
  clearPendingBirthLocation: () => void;

  // === UI Actions ===
  setShowAstroLines: (show: boolean) => void;
  toggleAstroLines: () => void;
  setNatalChartMinimized: (minimized: boolean) => void;
  toggleNatalChart: () => void;
  setTimezoneReady: (ready: boolean) => void;
  setMobileScoutSheetOpen: (open: boolean) => void;
  toggleMobileScoutSheet: () => void;
  setMobileChartsSheetOpen: (open: boolean) => void;
  setMobileFavoritesSheetOpen: (open: boolean) => void;
  setMobileDrawerOpen: (open: boolean) => void;
  toggleMobileDrawer: () => void;
  setMobileSheetMaximized: (maximized: boolean) => void;
  setScoutProgress: (progress: ScoutProgress | null) => void;

  // === Batch Actions ===
  reset: () => void;
}

const initialState = {
  // Selections
  selectedPerson: null as PersonData | null,
  selectedYear: null as number | null,
  selectedLine: null as GlobePath | null,
  highlightedLine: null as { planet: string; lineType: string } | null,
  highlightedScoutCity: null as HighlightedScoutCity | null,
  locationAnalysis: null as LocationAnalysis | null,
  selectedCityForInfo: null as CityLocation | null,
  cityLocation: null as CityLocation | null,
  pendingBirthCoords: null as { lat: number; lng: number } | null,

  // Zone drawing
  isDrawingZone: false,
  zoneDrawingPoints: [] as Array<{ lat: number; lng: number }>,
  drawnZone: null as DrawnZone | null,
  zoneAnalysis: null as ZoneAnalysis | null,

  // Panel stack
  panelStack: [] as PanelItem[],
  currentPanelIndex: -1,

  // Modals
  showQuickBirthModal: false,
  showBirthDateTimeModal: false,
  pendingBirthplace: null as PendingBirthplace | null,
  showPartnerModal: false,

  // UI state
  showAstroLines: true,
  natalChartMinimized: true,
  timezoneReady: false,
  mobileScoutSheetOpen: false,
  mobileChartsSheetOpen: false,
  mobileFavoritesSheetOpen: false,
  mobileDrawerOpen: false,
  mobileSheetMaximized: false,
  scoutProgress: null as ScoutProgress | null,
};

let panelIdCounter = 0;

export const useGlobeInteractionStore = create<GlobeInteractionState>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // === Selection Actions ===
      setSelectedPerson: (person) => set((state) => {
        state.selectedPerson = person;
      }),
      setSelectedYear: (year) => set((state) => {
        state.selectedYear = year;
      }),
      setSelectedLine: (line) => set((state) => {
        state.selectedLine = line;
      }),
      setHighlightedLine: (line) => set((state) => {
        state.highlightedLine = line;
      }),
      setHighlightedScoutCity: (city) => set((state) => {
        state.highlightedScoutCity = city;
      }),
      setLocationAnalysis: (analysis) => set((state) => {
        state.locationAnalysis = analysis;
      }),
      setSelectedCityForInfo: (city) => set((state) => {
        state.selectedCityForInfo = city;
      }),
      setCityLocation: (location) => set((state) => {
        state.cityLocation = location;
      }),
      setPendingBirthCoords: (coords) => set((state) => {
        state.pendingBirthCoords = coords;
      }),
      clearAllSelections: () => set((state) => {
        state.selectedPerson = null;
        state.selectedLine = null;
        state.locationAnalysis = null;
        state.selectedCityForInfo = null;
        state.cityLocation = null;
      }),

      // === Zone Drawing Actions ===
      startDrawingZone: () => set((state) => {
        state.isDrawingZone = true;
        state.zoneDrawingPoints = [];
        state.drawnZone = null;
        state.zoneAnalysis = null;
      }),
      stopDrawingZone: () => set((state) => {
        state.isDrawingZone = false;
      }),
      toggleDrawingZone: () => set((state) => {
        if (state.isDrawingZone) {
          state.isDrawingZone = false;
        } else {
          state.isDrawingZone = true;
          state.zoneDrawingPoints = [];
          state.drawnZone = null;
          state.zoneAnalysis = null;
        }
      }),
      setIsDrawingZone: (isDrawing) => set((state) => {
        state.isDrawingZone = isDrawing;
      }),
      addZonePoint: (point) => set((state) => {
        state.zoneDrawingPoints.push(point);
      }),
      setZoneDrawingPoints: (points) => set((state) => {
        state.zoneDrawingPoints = points;
      }),
      completeZoneDrawing: () => set((state) => {
        if (state.zoneDrawingPoints.length >= 3) {
          state.drawnZone = { points: [...state.zoneDrawingPoints] };
        }
        state.isDrawingZone = false;
      }),
      setDrawnZone: (zone) => set((state) => {
        state.drawnZone = zone;
      }),
      setZoneAnalysis: (analysis) => set((state) => {
        state.zoneAnalysis = analysis;
      }),
      clearZone: () => set((state) => {
        state.isDrawingZone = false;
        state.zoneDrawingPoints = [];
        state.drawnZone = null;
        state.zoneAnalysis = null;
      }),

      // === Panel Stack Actions ===
      pushPanel: (panel) => set((state) => {
        const newPanel: PanelItem = {
          ...panel,
          id: `panel-${++panelIdCounter}`,
        };
        state.panelStack.push(newPanel);
        state.currentPanelIndex = state.panelStack.length - 1;
      }),
      popPanel: () => set((state) => {
        if (state.panelStack.length > 0) {
          state.panelStack.pop();
          state.currentPanelIndex = Math.max(0, state.panelStack.length - 1);
        }
      }),
      navigateBack: () => set((state) => {
        if (state.currentPanelIndex > 0) {
          state.currentPanelIndex--;
        }
      }),
      navigateForward: () => set((state) => {
        if (state.currentPanelIndex < state.panelStack.length - 1) {
          state.currentPanelIndex++;
        }
      }),
      closeCurrentPanel: () => set((state) => {
        if (state.panelStack.length > 0 && state.currentPanelIndex >= 0) {
          state.panelStack.splice(state.currentPanelIndex, 1);
          state.currentPanelIndex = Math.min(
            state.currentPanelIndex,
            state.panelStack.length - 1
          );
        }
      }),
      closeAllPanels: () => set((state) => {
        state.panelStack = [];
        state.currentPanelIndex = -1;
      }),
      setCurrentPanelIndex: (index) => set((state) => {
        if (index >= 0 && index < state.panelStack.length) {
          state.currentPanelIndex = index;
        }
      }),

      // === Modal Actions ===
      openQuickBirthModal: (coords) => set((state) => {
        state.pendingBirthCoords = coords;
        state.showQuickBirthModal = true;
      }),
      closeQuickBirthModal: () => set((state) => {
        state.showQuickBirthModal = false;
        // Don't clear pendingBirthCoords immediately in case they want to try again
      }),
      setShowQuickBirthModal: (show) => set((state) => {
        state.showQuickBirthModal = show;
      }),
      openBirthDateTimeModal: (birthplace) => set((state) => {
        state.pendingBirthplace = birthplace;
        state.showBirthDateTimeModal = true;
      }),
      closeBirthDateTimeModal: () => set((state) => {
        state.showBirthDateTimeModal = false;
        state.pendingBirthplace = null;
      }),
      setShowBirthDateTimeModal: (show) => set((state) => {
        state.showBirthDateTimeModal = show;
      }),
      setPendingBirthplace: (birthplace) => set((state) => {
        state.pendingBirthplace = birthplace;
      }),
      setShowPartnerModal: (show) => set((state) => {
        state.showPartnerModal = show;
      }),
      clearPendingBirthLocation: () => set((state) => {
        state.pendingBirthCoords = null;
        state.showQuickBirthModal = false;
      }),

      // === UI Actions ===
      setShowAstroLines: (show) => set((state) => {
        state.showAstroLines = show;
      }),
      toggleAstroLines: () => set((state) => {
        state.showAstroLines = !state.showAstroLines;
      }),
      setNatalChartMinimized: (minimized) => set((state) => {
        state.natalChartMinimized = minimized;
      }),
      toggleNatalChart: () => set((state) => {
        state.natalChartMinimized = !state.natalChartMinimized;
      }),
      setTimezoneReady: (ready) => set((state) => {
        state.timezoneReady = ready;
      }),
      setMobileScoutSheetOpen: (open) => set((state) => {
        state.mobileScoutSheetOpen = open;
      }),
      toggleMobileScoutSheet: () => set((state) => {
        state.mobileScoutSheetOpen = !state.mobileScoutSheetOpen;
      }),
      setMobileChartsSheetOpen: (open) => set((state) => {
        state.mobileChartsSheetOpen = open;
      }),
      setMobileFavoritesSheetOpen: (open) => set((state) => {
        state.mobileFavoritesSheetOpen = open;
      }),
      setMobileDrawerOpen: (open) => set((state) => {
        state.mobileDrawerOpen = open;
      }),
      toggleMobileDrawer: () => set((state) => {
        state.mobileDrawerOpen = !state.mobileDrawerOpen;
      }),
      setMobileSheetMaximized: (maximized) => set((state) => {
        state.mobileSheetMaximized = maximized;
      }),
      setScoutProgress: (progress) => set((state) => {
        state.scoutProgress = progress;
      }),

      // === Batch Actions ===
      reset: () => set(initialState),
    })),
    { name: 'globe-interaction-store' }
  )
);

// === Selectors ===

// Selection selectors
export const useSelectedPerson = () =>
  useGlobeInteractionStore((state) => state.selectedPerson);
export const useSelectedYear = () =>
  useGlobeInteractionStore((state) => state.selectedYear);
export const useSelectedLine = () =>
  useGlobeInteractionStore((state) => state.selectedLine);
export const useHighlightedLine = () =>
  useGlobeInteractionStore((state) => state.highlightedLine);
export const useHighlightedScoutCity = () =>
  useGlobeInteractionStore((state) => state.highlightedScoutCity);
export const useLocationAnalysis = () =>
  useGlobeInteractionStore((state) => state.locationAnalysis);
export const useSelectedCityForInfo = () =>
  useGlobeInteractionStore((state) => state.selectedCityForInfo);
export const useCityLocation = () =>
  useGlobeInteractionStore((state) => state.cityLocation);
export const usePendingBirthCoords = () =>
  useGlobeInteractionStore((state) => state.pendingBirthCoords);

// Zone drawing selectors
export const useIsDrawingZone = () =>
  useGlobeInteractionStore((state) => state.isDrawingZone);
export const useZoneDrawingPoints = () =>
  useGlobeInteractionStore((state) => state.zoneDrawingPoints);
export const useDrawnZone = () =>
  useGlobeInteractionStore((state) => state.drawnZone);
export const useZoneAnalysis = () =>
  useGlobeInteractionStore((state) => state.zoneAnalysis);
export const useHasDrawnZone = () =>
  useGlobeInteractionStore((state) => state.drawnZone !== null);

// Panel stack selectors
export const usePanelStack = () =>
  useGlobeInteractionStore((state) => state.panelStack);
export const useCurrentPanelIndex = () =>
  useGlobeInteractionStore((state) => state.currentPanelIndex);
export const useCurrentPanel = () =>
  useGlobeInteractionStore((state) =>
    state.currentPanelIndex >= 0 ? state.panelStack[state.currentPanelIndex] : null
  );
export const useHasPanels = () =>
  useGlobeInteractionStore((state) => state.panelStack.length > 0);

// Modal selectors
export const useShowQuickBirthModal = () =>
  useGlobeInteractionStore((state) => state.showQuickBirthModal);
export const useShowBirthDateTimeModal = () =>
  useGlobeInteractionStore((state) => state.showBirthDateTimeModal);
export const usePendingBirthplace = () =>
  useGlobeInteractionStore((state) => state.pendingBirthplace);
export const useShowPartnerModal = () =>
  useGlobeInteractionStore((state) => state.showPartnerModal);

// UI state selectors
export const useShowAstroLines = () =>
  useGlobeInteractionStore((state) => state.showAstroLines);
export const useNatalChartMinimized = () =>
  useGlobeInteractionStore((state) => state.natalChartMinimized);
export const useTimezoneReady = () =>
  useGlobeInteractionStore((state) => state.timezoneReady);
export const useMobileSheetMaximized = () =>
  useGlobeInteractionStore((state) => state.mobileSheetMaximized);
export const useScoutProgress = () =>
  useGlobeInteractionStore((state) => state.scoutProgress);

// === Combined Selectors ===

// Zone state for toolbar
export const useZoneState = () =>
  useGlobeInteractionStore(useShallow((state) => ({
    isDrawing: state.isDrawingZone,
    hasZone: state.drawnZone !== null,
    pointsCount: state.zoneDrawingPoints.length,
    toggleDrawing: state.toggleDrawingZone,
    completeDrawing: state.completeZoneDrawing,
    clearZone: state.clearZone,
  })));

// Panel stack return type (matches original usePanelStack hook interface)
export interface UsePanelStackReturn {
  stack: PanelItem[];
  currentIndex: number;
  push: (panel: Omit<PanelItem, 'id'>) => void;
  pop: () => void;
  navigateBack: () => void;
  navigateForward: () => void;
  closeCurrent: () => void;
  closeAll: () => void;
  setCurrentIndex: (index: number) => void;
  isOpen: boolean;
  currentPanel: PanelItem | null;
}

// Panel stack actions (replaces usePanelStack hook in RightPanelStack)
export const usePanelStackActions = (): UsePanelStackReturn =>
  useGlobeInteractionStore(useShallow((state) => ({
    stack: state.panelStack,
    currentIndex: state.currentPanelIndex,
    push: state.pushPanel,
    pop: state.popPanel,
    navigateBack: state.navigateBack,
    navigateForward: state.navigateForward,
    closeCurrent: state.closeCurrentPanel,
    closeAll: state.closeAllPanels,
    setCurrentIndex: state.setCurrentPanelIndex,
    isOpen: state.panelStack.length > 0 && state.currentPanelIndex >= 0,
    currentPanel: state.currentPanelIndex >= 0 ? state.panelStack[state.currentPanelIndex] : null,
  })));

// Selection actions
export const useSelectionActions = () =>
  useGlobeInteractionStore(useShallow((state) => ({
    setSelectedPerson: state.setSelectedPerson,
    setSelectedYear: state.setSelectedYear,
    setSelectedLine: state.setSelectedLine,
    setLocationAnalysis: state.setLocationAnalysis,
    setSelectedCityForInfo: state.setSelectedCityForInfo,
    setCityLocation: state.setCityLocation,
    clearAllSelections: state.clearAllSelections,
  })));

// Modal actions
export const useModalActions = () =>
  useGlobeInteractionStore(useShallow((state) => ({
    openQuickBirthModal: state.openQuickBirthModal,
    closeQuickBirthModal: state.closeQuickBirthModal,
    openBirthDateTimeModal: state.openBirthDateTimeModal,
    closeBirthDateTimeModal: state.closeBirthDateTimeModal,
    setShowPartnerModal: state.setShowPartnerModal,
    clearPendingBirthLocation: state.clearPendingBirthLocation,
  })));
