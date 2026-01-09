import React, { useRef, useEffect, useCallback, useMemo, useState, Suspense, lazy } from 'react';
import { toast } from 'sonner';
import MigrationGlobe from './components/MigrationGlobe';
import { GlobeContextMenu } from './components/GlobeContextMenu';
import { GlobeLocationTooltip } from './components/GlobeLocationTooltip';
import useGlobeData from './hooks/useGlobeData';
import PersonCard from './components/PersonCard';
import { GlobeMethods } from 'react-globe.gl';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
import { useAstroLines, personDataToBirthData } from '@/hooks/useAstroLines';
import { useAstroModeState, useAstroVisibility, useAstroStore } from '@/stores/astroStore';
import { useLocalSpaceLines } from '@/hooks/useLocalSpaceLines';
import { useFavoriteCities } from '@/hooks/useFavoriteCities';
import { AstroLegend } from './components/AstroLegend';
import { LineInfoCard } from './components/LineInfoCard';
import { LocationAnalysisCard } from './components/LocationAnalysisCard';
import { QuickBirthDataModal } from './components/QuickBirthDataModal';
import { BirthDateTimeModal } from './components/BirthDateTimeModal';
import { CitySearchBar } from './components/CitySearchBar';
import { RightPanelStack, usePanelStack } from './components/RightPanelStack';

// Mobile bottom sheet components
import {
  MobileLocationAnalysisSheet,
  MobileLineInfoSheet,
  MobileCityInfoSheet,
  MobileCompatibilitySheet,
  MobileExportSheet,
  MobileScoutSheet,
  MobileChartsSheet,
  MobileFavoritesSheet,
} from './components/mobile';

// Zustand stores
import { useGlobeInteractionStore, type GlobePath } from '@/stores/globeInteractionStore';
import { useUIStore } from '@/stores/uiStore';
import {
  useNatalChartSettings,
  useNatalChartResult,
  usePartnerNatalChartResult,
  useNatalChartSettingsActions,
  useNatalChartResultActions,
} from '@/stores/natalChartStore';
import {
  useShowPartnerModal,
  useCompatibilityActions,
} from '@/stores/compatibilityStore';

// Lazy load heavy components to improve initial load performance
const AstroChat = lazy(() => import('./ai/AstroChat').then(m => ({ default: m.AstroChat })));
const NatalChartWidget = lazy(() => import('./components/NatalChartWidget').then(m => ({ default: m.NatalChartWidget })));
const CompatibilityPanel = lazy(() => import('./components/CompatibilityPanel').then(m => ({ default: m.CompatibilityPanel })));
const LineReportPanel = lazy(() => import('./components/LineReportPanel').then(m => ({ default: m.LineReportPanel })));
const CityInfoPanel = lazy(() => import('./components/CityInfoPanel').then(m => ({ default: m.CityInfoPanel })));
const RelocationPanel = lazy(() => import('./components/RelocationPanel').then(m => ({ default: m.RelocationPanel })));
import { FavoritesPanelContent } from './components/panels/FavoritesPanelContent';
import { AstroLoadingOverlay } from './components/panels/AstroLoadingOverlay';
import { ScoutPanel, type ScoutMarker } from './components/ScoutPanel';
import { PartnerChartModal } from './components/PartnerChartModal';
import { useBirthCharts, type BirthChart } from '@/hooks/useBirthCharts';
import { useRelocationChart } from '@/hooks/useRelocationChart';
import { useCompatibilityMode, type PartnerChartData } from './hooks/useCompatibilityMode';
import { useAstroLines as usePartnerAstroLines } from '@/hooks/useAstroLines';
import { useZoneDrawing } from './hooks/useZoneDrawing';
import { useBirthDataFlow } from './hooks/useBirthDataFlow';
import { useGlobeNavigation } from './hooks/useGlobeNavigation';
import { useGlobeCallbacks } from './hooks/useGlobeCallbacks';
import { useScoutWorkerPool } from './hooks/useScoutWorkerPool';
import { prefetchTimezone } from '@/lib/timezone-utils';
import { analyzeLocation, type LocationAnalysis } from '@/lib/location-line-utils';
import { PLANET_COLORS } from '@/lib/astro-types';
import type { PlanetaryLine } from '@/lib/astro-types';
import { calculateNatalChartWithWasm, prewarmScoutResources } from '@/lib/astro-wasm';

import type { Node, Edge } from '@stubs/xyflow';
import type { PersonData } from '@/types/familyTree';
import type { PersonLocation } from './types/migration.d';
import type { ViewMode } from '@/pages/Workspace';

interface GlobePageProps {
  filters: { gender: string; status: string };
  nodes: Node<PersonData>[];
  edges: Edge[];
  onFilterChange: (filter: string, value: string) => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  // Callback when user creates new birth data via double-tap
  onBirthDataCreate?: (data: { lat: number; lng: number; date: string; time: string }) => void;
  // Callback when user clears birth data
  onClearBirthData?: () => void;
  // Callback when bottom sheet state changes (for hiding bottom nav)
  onBottomSheetChange?: (isOpen: boolean) => void;
  // Legend state lifted from parent for mobile nav control
  isLegendMinimized?: boolean;
  onToggleLegend?: () => void;
  // Export panel state lifted from parent for toolbar control
  showExportPanel?: boolean;
  onCloseExportPanel?: () => void;
  // Callback when pending birth location state changes
  onPendingBirthChange?: (hasPending: boolean, clearFn: () => void) => void;
  // Zone drawing state lifted to parent for toolbar control
  onZoneStateChange?: (state: {
    isDrawing: boolean;
    hasZone: boolean;
    pointsCount: number;
    toggleDrawing: () => void;
    completeDrawing: () => void;
    clearZone: () => void;
  }) => void;
  // AI Chat state lifted for mobile toolbar control
  isAIChatOpen?: boolean;
  onToggleAIChat?: () => void;
  // Local Space mode state lifted for toolbar control
  onModeStateChange?: (state: {
    isLocalSpace: boolean;
    localSpaceOriginName: string | undefined;
    returnToStandard: () => void;
  }) => void;
  // External city selection (from favorites menu, etc.)
  externalCitySelect?: {
    lat: number;
    lng: number;
    name: string;
    key: number; // Changes when a new selection is made
  } | null;
  // Landing page prefill - triggers birth data flow with pre-filled location
  landingPagePrefill?: {
    lat: number;
    lng: number;
    place: string;
  } | null;
  // Callback when landing page prefill is consumed
  onLandingPagePrefillConsumed?: () => void;
  // Callback to open favorites panel (for toolbar)
  onOpenFavoritesPanel?: () => void;
  // Compatibility/Duo mode state lifted for toolbar control
  onCompatibilityStateChange?: (state: {
    isEnabled: boolean;
    hasPartner: boolean;
    partnerName: string | undefined;
    isCalculating: boolean;
    toggleEnabled: () => void;
    openPartnerModal: () => void;
  }) => void;
  // Natal chart state lifted for mobile bottom nav control
  onNatalChartStateChange?: (state: {
    isOpen: boolean;
    hasData: boolean;
    toggle: () => void;
  }) => void;
}

const GlobePage: React.FC<GlobePageProps> = ({
  filters,
  nodes,
  edges,
  onFilterChange,
  viewMode,
  onViewModeChange,
  onBirthDataCreate,
  onClearBirthData,
  onBottomSheetChange,
  isLegendMinimized: externalLegendMinimized,
  onToggleLegend,
  showExportPanel: externalShowExportPanel,
  onCloseExportPanel,
  onPendingBirthChange,
  onZoneStateChange,
  isAIChatOpen: externalAIChatOpen,
  onToggleAIChat: externalToggleAIChat,
  onModeStateChange,
  externalCitySelect,
  landingPagePrefill,
  onLandingPagePrefillConsumed,
  onOpenFavoritesPanel: externalOpenFavoritesPanel,
  onCompatibilityStateChange,
  onNatalChartStateChange,
}) => {
  // --- Hooks ---
  const globeEl = useRef<GlobeMethods | undefined>();
  const isMobile = useIsMobile(768);
  const [hasMounted, setHasMounted] = useState(false);
  const [scoutMarkers, setScoutMarkers] = useState<ScoutMarker[]>([]);

  // Globe navigation - extracted hook for camera control
  const navigation = useGlobeNavigation({
    globeRef: globeEl,
    isMobile,
  });

  // === Zustand Store State ===
  // Globe interaction store - selections, zones, modals
  const selectedPerson = useGlobeInteractionStore((s) => s.selectedPerson);
  const setSelectedPerson = useGlobeInteractionStore((s) => s.setSelectedPerson);
  const selectedYear = useGlobeInteractionStore((s) => s.selectedYear);
  const selectedLine = useGlobeInteractionStore((s) => s.selectedLine);
  const setSelectedLine = useGlobeInteractionStore((s) => s.setSelectedLine);
  const locationAnalysis = useGlobeInteractionStore((s) => s.locationAnalysis);
  const setLocationAnalysis = useGlobeInteractionStore((s) => s.setLocationAnalysis);
  const selectedCityForInfo = useGlobeInteractionStore((s) => s.selectedCityForInfo);
  const setSelectedCityForInfo = useGlobeInteractionStore((s) => s.setSelectedCityForInfo);
  const cityLocation = useGlobeInteractionStore((s) => s.cityLocation);
  const setCityLocation = useGlobeInteractionStore((s) => s.setCityLocation);

  // Zone drawing state - uses extracted hook
  // Note: zoneDrawing hook is initialized after visiblePlanetaryLines is available

  // Birth data flow - uses extracted hook
  const birthDataFlow = useBirthDataFlow({
    onBirthDataCreate,
    onPendingBirthChange,
  });

  // Handle landing page prefill - triggers unified birth data flow
  // Track processed prefill to avoid re-processing on re-renders
  const processedPrefillRef = useRef<string | null>(null);
  useEffect(() => {
    if (landingPagePrefill && hasMounted) {
      // Create a unique key for this prefill to avoid re-processing
      const prefillKey = `${landingPagePrefill.lat},${landingPagePrefill.lng},${landingPagePrefill.place}`;

      if (processedPrefillRef.current !== prefillKey) {
        processedPrefillRef.current = prefillKey;
        // Trigger the unified birth data flow with the prefilled location
        birthDataFlow.handleCitySearchSelect(
          landingPagePrefill.lat,
          landingPagePrefill.lng,
          landingPagePrefill.place
        );
        // Notify parent that prefill has been consumed
        onLandingPagePrefillConsumed?.();
      }
    }
  }, [landingPagePrefill, hasMounted, birthDataFlow.handleCitySearchSelect, onLandingPagePrefillConsumed]);

  // Partner modal state - use compatibilityStore (single source of truth)
  const showPartnerModal = useShowPartnerModal();
  const { setShowPartnerModal } = useCompatibilityActions();

  // UI state from store
  const showAstroLines = useGlobeInteractionStore((s) => s.showAstroLines);
  const timezoneReady = useGlobeInteractionStore((s) => s.timezoneReady);
  const setTimezoneReady = useGlobeInteractionStore((s) => s.setTimezoneReady);

  // Natal chart store - settings and results from natalChartStore
  const natalChartSettings = useNatalChartSettings();
  const natalChartResult = useNatalChartResult();
  const partnerNatalChartResult = usePartnerNatalChartResult();
  const { setSettings: setNatalChartSettings } = useNatalChartSettingsActions();
  const { setResult: setNatalChartResult, setPartnerResult: setPartnerNatalChartResult } = useNatalChartResultActions();

  // Natal chart widget state - use globeInteractionStore for minimized state
  const natalChartMinimized = useGlobeInteractionStore((s) => s.natalChartMinimized);
  const setNatalChartMinimized = useGlobeInteractionStore((s) => s.setNatalChartMinimized);

  // Mobile scout sheet state - from globeInteractionStore
  const mobileScoutSheetOpen = useGlobeInteractionStore((s) => s.mobileScoutSheetOpen);
  const setMobileScoutSheetOpen = useGlobeInteractionStore((s) => s.setMobileScoutSheetOpen);
  const setScoutProgressStore = useGlobeInteractionStore((s) => s.setScoutProgress);

  // UI store - legend and export panel
  const uiIsLegendMinimized = useUIStore((s) => s.isLegendMinimized);
  const uiToggleLegend = useUIStore((s) => s.toggleLegend);
  const uiShowExportPanel = useUIStore((s) => s.showExportPanel);
  const uiSetShowExportPanel = useUIStore((s) => s.setShowExportPanel);
  const uiIsAIChatOpen = useUIStore((s) => s.isAIChatOpen);
  const uiSetIsAIChatOpen = useUIStore((s) => s.setIsAIChatOpen);
  const setIsAuthModalOpen = useUIStore((s) => s.setIsAuthModalOpen);

  // Use external state if provided, otherwise use store
  const legendMinimized = externalLegendMinimized !== undefined ? externalLegendMinimized : uiIsLegendMinimized;
  const baseToggleLegend = onToggleLegend || uiToggleLegend;
  const showExportPanel = externalShowExportPanel !== undefined ? externalShowExportPanel : uiShowExportPanel;
  const handleCloseExportPanel = onCloseExportPanel || (() => uiSetShowExportPanel(false));
  const showAstroChat = externalAIChatOpen !== undefined ? externalAIChatOpen : uiIsAIChatOpen;
  const handleToggleAstroChat = externalToggleAIChat || (() => uiSetIsAIChatOpen(!uiIsAIChatOpen));

  // Unified right panel stack (desktop only)
  const panelStack = usePanelStack();

  // Birth charts - for partner selection and mobile chart management
  const {
    charts: savedCharts,
    currentChart,
    loading: chartsLoading,
    selectChart,
    deleteChart,
    updateChart,
    setDefaultChart,
    saveChart,
  } = useBirthCharts();

  // Context menu state (right-click on desktop, long-press on mobile)
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    x: number;
    y: number;
    lat: number;
    lng: number;
    cityName?: string;
  }>({ isOpen: false, x: 0, y: 0, lat: 0, lng: 0 });

  // Single-click tooltip state
  const [clickTooltip, setClickTooltip] = useState<{
    isVisible: boolean;
    x: number;
    y: number;
    lat: number;
    lng: number;
    cityName?: string;
  }>({ isVisible: false, x: 0, y: 0, lat: 0, lng: 0 });

  // Ask AI location context - when user wants to ask AI about a specific location
  const [askAILocation, setAskAILocation] = useState<{
    lat: number;
    lng: number;
    name: string;
  } | null>(null);

  // Mobile sheet states for charts and favorites (hamburger menu) - from store
  const mobileChartsSheetOpen = useGlobeInteractionStore((s) => s.mobileChartsSheetOpen);
  const setMobileChartsSheetOpen = useGlobeInteractionStore((s) => s.setMobileChartsSheetOpen);
  const mobileFavoritesSheetOpen = useGlobeInteractionStore((s) => s.mobileFavoritesSheetOpen);
  const setMobileFavoritesSheetOpen = useGlobeInteractionStore((s) => s.setMobileFavoritesSheetOpen);

  // --- Context Menu & Tooltip Handlers ---
  // Handler for single-click/tap - shows tooltip with location info
  const handleGlobeSingleClick = useCallback((lat: number, lng: number, x: number, y: number) => {
    // Close context menu if open
    setContextMenu(prev => ({ ...prev, isOpen: false }));
    // Show tooltip at click location
    setClickTooltip({
      isVisible: true,
      x,
      y,
      lat,
      lng,
      cityName: undefined, // Will be reverse geocoded if needed
    });
  }, []);

  // Handler for context menu open (right-click on desktop, long-press on mobile)
  const handleGlobeContextMenu = useCallback((lat: number, lng: number, x: number, y: number) => {
    // Close tooltip if open
    setClickTooltip(prev => ({ ...prev, isVisible: false }));
    // Show context menu
    setContextMenu({
      isOpen: true,
      x,
      y,
      lat,
      lng,
      cityName: undefined, // Will be reverse geocoded if needed
    });
  }, []);

  // Close context menu
  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(prev => ({ ...prev, isOpen: false }));
  }, []);

  // Dismiss tooltip
  const handleDismissTooltip = useCallback(() => {
    setClickTooltip(prev => ({ ...prev, isVisible: false }));
  }, []);

  // Compatibility/Duo mode state
  const compatibility = useCompatibilityMode();

  // Make legend/filters and natal chart mutually exclusive
  const handleToggleLegend = useCallback(() => {
    const willOpen = legendMinimized;
    if (willOpen) {
      setNatalChartMinimized(true);
    }
    baseToggleLegend();
  }, [legendMinimized, baseToggleLegend, setNatalChartMinimized]);

  const handleToggleNatalChart = useCallback(() => {
    const willOpen = natalChartMinimized;
    if (willOpen && !legendMinimized) {
      baseToggleLegend();
    }
    setNatalChartMinimized(!natalChartMinimized);
  }, [natalChartMinimized, legendMinimized, baseToggleLegend, setNatalChartMinimized]);

  useEffect(() => {
    setHasMounted(true);
    // Prewarm WASM, cities data, and scout worker in parallel for faster scout operations
    prewarmScoutResources().then(({ wasm, cities, worker }) => {
      console.log(`[GlobePage] Resources prewarmed - WASM: ${wasm}, Cities: ${cities}, Worker: ${worker}`);
    });
  }, []);

  // Auto-open Scout sheet on mobile when planetary lines are calculated (session start)
  // We track if we've already auto-opened to avoid reopening on every astroResult update
  const hasAutoOpenedScout = useRef(false);

  // --- Extract birth data from the first person node ---
  // Get the first person's data for dependency tracking
  const firstPersonData = useMemo(() => {
    const personNodes = nodes.filter(n => n.type === 'person');
    return personNodes.length > 0 ? personNodes[0].data as PersonData : null;
  }, [nodes]);

  // Extract birth location coordinates for dependency
  const birthLocationKey = useMemo(() => {
    if (!firstPersonData) return '';
    const birthLoc = firstPersonData.locations?.find(loc => loc.type === 'birth');
    const key = `${firstPersonData.birthDate || ''}-${firstPersonData.birthTime || ''}-${birthLoc?.lat ?? ''}-${birthLoc?.lng ?? ''}`;
    console.log('birthLocationKey changed:', key);
    return key;
  }, [firstPersonData]);

  // Prefetch timezone when birth location changes
  useEffect(() => {
    if (!firstPersonData) {
      setTimezoneReady(false);
      return;
    }

    const birthLocation = firstPersonData.locations?.find(loc => loc.type === 'birth');
    if (birthLocation?.lat !== undefined && birthLocation?.lng !== undefined) {
      console.log('Prefetching timezone for:', birthLocation.lat, birthLocation.lng);
      setTimezoneReady(false);
      prefetchTimezone(birthLocation.lat, birthLocation.lng)
        .then(() => {
          console.log('Timezone prefetched successfully');
          setTimezoneReady(true);
        })
        .catch((err) => {
          console.warn('Failed to prefetch timezone:', err);
          setTimezoneReady(true); // Still allow calculation with fallback
        });
    } else {
      setTimezoneReady(true);
    }
  }, [firstPersonData, birthLocationKey]);

  const birthData = useMemo(() => {
    // Wait for timezone to be fetched before calculating
    if (!firstPersonData || !timezoneReady) return null;

    // Find birth location from locations array
    const birthLocation = firstPersonData.locations?.find(loc => loc.type === 'birth');

    console.log('Recalculating birthData (timezone ready):', {
      birthDate: firstPersonData.birthDate,
      birthTime: firstPersonData.birthTime,
      lat: birthLocation?.lat,
      lng: birthLocation?.lng,
    });

    const result = personDataToBirthData(
      firstPersonData.birthDate,
      firstPersonData.birthTime,
      birthLocation?.lat,
      birthLocation?.lng
    );

    // Add cityName from the location's place property for sharing
    if (result && birthLocation?.place) {
      (result as typeof result & { cityName?: string }).cityName = birthLocation.place;
    }

    return result;
  }, [firstPersonData, birthLocationKey, timezoneReady]);

  // Sync birthData to astroStore so ShareModal and other components can access it
  const setBirthData = useAstroStore((s) => s.setBirthData);
  useEffect(() => {
    setBirthData(birthData);
  }, [birthData, setBirthData]);

  // Check if we have actual valid birth data (not just an empty person node)
  const hasValidBirthData = useMemo(() => {
    if (!firstPersonData) return false;
    const birthLocation = firstPersonData.locations?.find(loc => loc.type === 'birth');
    return !!(
      firstPersonData.birthDate &&
      firstPersonData.birthTime &&
      birthLocation?.lat !== undefined &&
      birthLocation?.lng !== undefined
    );
  }, [firstPersonData]);

  // --- Astro Mode (standard, relocated, localSpace) ---
  // Use the Zustand store for mode state to ensure sync with Toolbar
  const {
    mode: astroMode,
    relocationTarget,
    isRelocated,
    isLocalSpace,
    localSpaceOrigin,
    relocateTo,
    returnToStandard,
    enableLocalSpace,
    setLocalSpaceOrigin,
  } = useAstroModeState();

  // Get visibility from the persisted store (used for local space lines filtering)
  // This ensures consistent visibility even when useAstroLines is disabled in local space mode
  const storeVisibility = useAstroVisibility();
  // Get store's toggle function to sync visibility between hook and store
  const storeTogglePlanet = useAstroStore((state) => state.togglePlanet);

  // Compute relocated birth data (same time, different location)
  const relocatedBirthData = useMemo(() => {
    if (!birthData || !relocationTarget || astroMode !== 'relocated') {
      return null;
    }
    return {
      ...birthData,
      latitude: relocationTarget.lat,
      longitude: relocationTarget.lng,
      lat: relocationTarget.lat,
      lng: relocationTarget.lng,
    };
  }, [birthData, relocationTarget, astroMode]);

  // Compute local space birth data (uses custom origin if set, otherwise birth location)
  const localSpaceBirthData = useMemo(() => {
    if (!birthData || astroMode !== 'localSpace') {
      return null;
    }
    if (localSpaceOrigin) {
      return {
        ...birthData,
        latitude: localSpaceOrigin.lat,
        longitude: localSpaceOrigin.lng,
        lat: localSpaceOrigin.lat,
        lng: localSpaceOrigin.lng,
      };
    }
    return birthData;
  }, [birthData, localSpaceOrigin, astroMode]);

  // Relocation chart calculation - uses relocation target when in relocated mode
  // For city panel preview, we use selectedCityForInfo but only show in the panel, not in NatalChartWidget
  const relocationChartTarget = useMemo(() => {
    // When in relocated mode, use the relocation target
    if (isRelocated && relocationTarget) {
      return {
        lat: relocationTarget.lat,
        lng: relocationTarget.lng,
        name: relocationTarget.name,
      };
    }
    // When a city is selected (for panel preview), also calculate
    if (selectedCityForInfo) {
      return {
        lat: selectedCityForInfo.lat,
        lng: selectedCityForInfo.lng,
        name: selectedCityForInfo.name,
      };
    }
    return null;
  }, [isRelocated, relocationTarget, selectedCityForInfo]);

  // Calculate relocation chart when we have a target
  const {
    result: relocationResult,
    loading: relocationLoading,
    error: relocationError,
    recalculate: recalculateRelocation,
  } = useRelocationChart(birthData, relocationChartTarget, {
    enabled: !!relocationChartTarget && !!birthData,
    houseSystem: natalChartSettings.houseSystem,
    useSidereal: natalChartSettings.zodiacType === 'sidereal',
  });

  // Only pass relocation to NatalChartWidget when in relocated mode (not just city preview)
  const natalWidgetRelocationResult = isRelocated ? relocationResult : null;
  const natalWidgetRelocationName = isRelocated ? relocationTarget?.name : undefined;

  // Report compatibility state changes to parent (for toolbar control)
  useEffect(() => {
    if (onCompatibilityStateChange) {
      onCompatibilityStateChange({
        isEnabled: compatibility.isEnabled,
        hasPartner: !!compatibility.partnerChart,
        partnerName: compatibility.partnerChart?.name,
        isCalculating: compatibility.isCalculating,
        toggleEnabled: () => {
          if (!compatibility.partnerChart) {
            // If no partner set, open modal first
            setShowPartnerModal(true);
          } else {
            compatibility.toggle();
          }
        },
        openPartnerModal: () => setShowPartnerModal(true),
      });
    }
  }, [
    compatibility.isEnabled,
    compatibility.partnerChart,
    compatibility.isCalculating,
    compatibility.toggle,
    onCompatibilityStateChange,
  ]);

  // Favorite cities management
  const { favorites, loading: favoritesLoading, isFavorite, toggleFavorite, removeFavorite, updateFavoriteNotes, removeMultipleFavorites, isGuest: isFavoritesGuest } = useFavoriteCities();

  // --- Context Menu Action Handlers ---
  // (Defined here because they depend on birthData, relocateTo, enableLocalSpace, etc.)

  // Context menu action: Relocate Here
  const handleContextRelocate = useCallback((lat: number, lng: number) => {
    if (!birthData) {
      toast.info('Set birth data first to use relocation');
      return;
    }
    const name = `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
    relocateTo(lat, lng, name);
    toast.success('Relocated! Lines recalculated for this location.');
  }, [birthData, relocateTo]);

  // Context menu action: Set as Local Origin
  const handleContextSetLocalOrigin = useCallback((lat: number, lng: number, name: string) => {
    if (!birthData) {
      toast.info('Set birth data first to use Local Space');
      return;
    }
    enableLocalSpace();
    setLocalSpaceOrigin(lat, lng, name);
    toast.success(`Local Space lines from ${name}`);
  }, [birthData, enableLocalSpace, setLocalSpaceOrigin]);

  // Context menu action: Add to Favorites
  const handleContextAddToFavorites = useCallback(async (lat: number, lng: number, name: string) => {
    const wasFavorite = isFavorite(lat, lng);
    const result = await toggleFavorite({ latitude: lat, longitude: lng, city_name: name });
    if (!result.success && result.requiresAuth) {
      toast.info('Sign in to save favorite locations', {
        action: {
          label: 'Sign In',
          onClick: () => setIsAuthModalOpen(true),
        },
      });
      return;
    }
    toast.success(wasFavorite ? `Removed ${name} from favorites` : `Added ${name} to favorites`);
  }, [isFavorite, toggleFavorite, setIsAuthModalOpen]);

  // Context menu action: Enter Birth Data
  const handleContextEnterBirthData = useCallback((lat: number, lng: number) => {
    // Trigger the birth data flow at this location
    birthDataFlow.handleGlobeDoubleTap(lat, lng);
  }, [birthDataFlow]);

  // Context menu action: Ask AI about location
  const handleContextAskAI = useCallback((lat: number, lng: number, name: string) => {
    // Set the location context for AI
    setAskAILocation({ lat, lng, name });
    // Open the AI chat
    uiSetIsAIChatOpen(true);
  }, [uiSetIsAIChatOpen]);

  // Determine which birth data to use for line calculation
  const effectiveBirthData = useMemo(() => {
    if (isRelocated && relocatedBirthData) {
      return relocatedBirthData;
    }
    return birthData;
  }, [isRelocated, relocatedBirthData, birthData]);

  // Notify parent when bottom sheets open/close (for hiding bottom nav)
  // Also hide when legend is expanded on mobile
  useEffect(() => {
    const isLegendExpanded = isMobile && showAstroLines && birthData && !legendMinimized;
    const isBottomSheetOpen = !!(selectedLine || locationAnalysis || isLegendExpanded);
    onBottomSheetChange?.(isBottomSheetOpen);
  }, [selectedLine, locationAnalysis, legendMinimized, isMobile, showAstroLines, birthData, onBottomSheetChange]);

  // --- Calculate astrocartography lines (standard or relocated mode) ---
  const {
    result: astroResult,
    visiblePlanetaryLines,
    visibleAspectLines,
    visibleParanLines,
    visibleZenithPoints,
    loading: astroLoading,
    error: astroError,
    progress: astroProgress,
    visibility,
    togglePlanet,
    toggleLineType,
    toggleAspects,
    toggleHarmoniousAspects,
    toggleDisharmoniousAspects,
    toggleParans,
    toggleZenithPoints,
    toggleLocalSpace,
    showAllPlanets,
    hideAllPlanets,
  } = useAstroLines(effectiveBirthData, { enabled: showAstroLines && !isLocalSpace });

  // Auto-open Scout panel when planetary lines are first calculated (desktop only)
  // On mobile, user can tap the Scout FAB to open - no auto-open to avoid blocking globe interaction
  useEffect(() => {
    if (
      !hasAutoOpenedScout.current &&
      !isMobile &&
      astroResult?.planetaryLines &&
      astroResult.planetaryLines.length > 0
    ) {
      // Desktop: push scout panel to the panel stack
      const hasScoutPanel = panelStack.stack.some(p => p.type === 'scout');
      if (!hasScoutPanel) {
        panelStack.push({
          type: 'scout',
          title: 'Scout Locations',
          data: null,
        });
      }
      hasAutoOpenedScout.current = true;
    }
  }, [isMobile, astroResult?.planetaryLines, panelStack]);

  // --- Scout Worker Pool ---
  // Pre-compute scout locations for all categories in parallel using web worker pool.
  // This runs at the page level so computations persist even when ScoutPanel is closed.
  // Results are stored in Zustand store and consumed by ScoutPanel.
  const {
    isComputing: isScoutComputing,
    progress: scoutProgress,
    phase: scoutPhase,
    detail: scoutDetail,
  } = useScoutWorkerPool(
    astroResult?.planetaryLines ?? [],
    astroResult?.aspectLines ?? [],
    { enabled: showAstroLines && !isLocalSpace && (astroResult?.planetaryLines?.length ?? 0) > 0 }
  );

  // Sync scout progress to store for mobile FAB progress indicator
  useEffect(() => {
    if (isScoutComputing) {
      setScoutProgressStore({
        percent: scoutProgress,
        phase: scoutPhase,
        detail: scoutDetail,
      });
    } else {
      setScoutProgressStore(null);
    }
  }, [isScoutComputing, scoutProgress, scoutPhase, scoutDetail, setScoutProgressStore]);

  // Combined toggle function that syncs both hook visibility and store visibility
  // This ensures local space mode (which uses store visibility) stays in sync
  const handleTogglePlanet = useCallback((planet: import('@/lib/astro-types').Planet) => {
    togglePlanet(planet);     // Update hook's local visibility
    storeTogglePlanet(planet); // Update store's visibility (for local space mode)
  }, [togglePlanet, storeTogglePlanet]);

  // --- Calculate partner's astrocartography lines (for compatibility mode) ---
  // Memoize partner birth data to prevent recalculating on every render
  const partnerBirthData = useMemo(() => {
    const partner = compatibility.partnerChart;
    if (!partner) return null;

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
  }, [compatibility.partnerChart]);

  const {
    result: partnerAstroResult,
    visiblePlanetaryLines: partnerPlanetaryLines,
    visibleAspectLines: partnerAspectLines,
    visibleParanLines: partnerParanLines,
    visibleZenithPoints: partnerZenithPoints,
    loading: partnerAstroLoading,
  } = usePartnerAstroLines(partnerBirthData, { enabled: showAstroLines && !isLocalSpace && compatibility.isEnabled && !!partnerBirthData });

  // Zone drawing - uses extracted hook
  const zoneDrawing = useZoneDrawing({
    planetaryLines: visiblePlanetaryLines,
    aspectLines: visibleAspectLines,
    paranLines: visibleParanLines,
  });

  // Globe callbacks - extracted hook for click handlers
  // Pass full result data for analysis (not visibility-filtered) so analysis considers all lines
  const globeCallbacks = useGlobeCallbacks({
    navigation,
    nodes,
    isMobile,
    planetaryLines: astroResult?.planetaryLines ?? [],
    aspectLines: astroResult?.aspectLines ?? [],
    zenithPoints: astroResult?.zenithPoints ?? [],
    hasBirthData: !!birthData,
    isLocalSpace,
    setLocalSpaceOrigin,
    panelStack,
    setSelectedPerson,
    setSelectedLine,
    setLocationAnalysis,
    setSelectedCityForInfo,
    setCityLocation,
    handleCloseExportPanel,
  });

  // Calculate compatibility when both charts are ready
  // Use ref for calculateCompatibility to avoid dependency array issues
  const calculateCompatibilityRef = useRef(compatibility.calculateCompatibility);
  calculateCompatibilityRef.current = compatibility.calculateCompatibility;

  useEffect(() => {
    if (
      compatibility.isEnabled &&
      partnerBirthData &&
      visiblePlanetaryLines.length > 0 &&
      partnerPlanetaryLines.length > 0 &&
      !compatibility.isCalculating &&
      !compatibility.analysis
    ) {
      // Use setTimeout to allow UI to update (close modal) before heavy calculation
      const timeoutId = setTimeout(() => {
        calculateCompatibilityRef.current(
          visiblePlanetaryLines,
          partnerPlanetaryLines,
          visibleZenithPoints,
          partnerZenithPoints,
          firstPersonData?.name || 'You',
          compatibility.partnerChart?.name
        );
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [
    compatibility.isEnabled,
    partnerBirthData,
    visiblePlanetaryLines,
    partnerPlanetaryLines,
    visibleZenithPoints,
    partnerZenithPoints,
    compatibility.isCalculating,
    compatibility.analysis,
    firstPersonData?.name,
    compatibility.partnerChart?.name,
    // Removed 'compatibility' - it's a new object every render causing infinite loops
  ]);

  // Convert a hex color to greyscale
  const toGreyscale = useCallback((hexColor: string): string => {
    // Extract RGB from hex (handle both #RGB and #RRGGBB formats)
    let hex = hexColor.replace('#', '');
    if (hex.length === 3) {
      hex = hex.split('').map(c => c + c).join('');
    }
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    // Luminance-based greyscale (perceptual)
    const grey = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
    const greyHex = grey.toString(16).padStart(2, '0');
    return `#${greyHex}${greyHex}${greyHex}`;
  }, []);

  // Compute partner location for globe marker (duo mode)
  const partnerLocation = useMemo(() => {
    if (!compatibility.isEnabled || !compatibility.partnerChart) {
      return null;
    }
    return {
      lat: compatibility.partnerChart.latitude,
      lng: compatibility.partnerChart.longitude,
      name: compatibility.partnerChart.name,
      avatarUrl: undefined, // Partner charts don't have avatars yet
    };
  }, [compatibility.isEnabled, compatibility.partnerChart]);

  // Combine astro lines with partner lines when compatibility mode is enabled
  const combinedAstroLines = useMemo(() => {
    if (!compatibility.isEnabled || !partnerPlanetaryLines.length) {
      return visiblePlanetaryLines;
    }
    // Partner lines are rendered in greyscale with reduced opacity
    const partnerLinesWithStyle = partnerPlanetaryLines.map(line => ({
      ...line,
      // Convert to greyscale and add alpha for 70% opacity
      color: toGreyscale(line.color) + 'B3', // B3 hex = ~70% opacity
      isPartnerLine: true,
    }));
    return [...visiblePlanetaryLines, ...partnerLinesWithStyle];
  }, [visiblePlanetaryLines, partnerPlanetaryLines, compatibility.isEnabled, toGreyscale]);

  // Compute location analysis for selected city (for unified city info panel)
  const selectedCityAnalysis = useMemo(() => {
    if (!selectedCityForInfo || !birthData) return null;
    return analyzeLocation(
      selectedCityForInfo.lat,
      selectedCityForInfo.lng,
      visiblePlanetaryLines,
      visibleAspectLines,
      visibleZenithPoints
    );
  }, [selectedCityForInfo, birthData, visiblePlanetaryLines, visibleAspectLines, visibleZenithPoints]);

  // Get planetary positions and calculate ascendant for natal chart
  const natalChartData = useMemo(() => {
    if (!astroResult?.planetaryPositions) {
      return { planetaryPositions: [], ascendant: 0, midheaven: undefined };
    }

    // Find the Sun's MC line to approximate the ascendant
    // ASC = LST (Local Sidereal Time) in degrees, which is related to MC
    // For simplicity, we'll use the first ASC line longitude if available
    const sunAscLine = astroResult.planetaryLines.find(
      line => line.planet === 'Sun' && line.lineType === 'ASC'
    );

    // The ASC line passes through points where the ecliptic crosses the horizon
    // We can use the GMST to approximate the ASC
    // ASC ≈ GMST (in degrees) + birth longitude - actually this is more complex
    // For now, let's use a simple approximation based on the Sun's position
    const sunPos = astroResult.planetaryPositions.find(p => p.planet === 'Sun');
    const ascendant = sunPos ? (sunPos.eclipticLongitude + 90) % 360 : 0;

    // MC is roughly 90° from ASC
    const midheaven = (ascendant + 270) % 360;

    return {
      planetaryPositions: astroResult.planetaryPositions,
      ascendant,
      midheaven,
    };
  }, [astroResult]);

  // Report natal chart state changes to parent (for mobile bottom nav control)
  useEffect(() => {
    if (onNatalChartStateChange) {
      onNatalChartStateChange({
        isOpen: !natalChartMinimized,
        hasData: !!(birthData && natalChartData.planetaryPositions.length > 0),
        toggle: handleToggleNatalChart,
      });
    }
  }, [
    natalChartMinimized,
    birthData,
    natalChartData.planetaryPositions.length,
    handleToggleNatalChart,
    onNatalChartStateChange,
  ]);

  // Get planetary positions for partner's natal chart (duo mode)
  const partnerNatalChartData = useMemo(() => {
    if (!compatibility.isEnabled || !partnerAstroResult?.planetaryPositions) {
      return { planetaryPositions: [], ascendant: 0, midheaven: undefined };
    }

    // Same calculation as main natal chart
    const sunPos = partnerAstroResult.planetaryPositions.find(p => p.planet === 'Sun');
    const ascendant = sunPos ? (sunPos.eclipticLongitude + 90) % 360 : 0;
    const midheaven = (ascendant + 270) % 360;

    return {
      planetaryPositions: partnerAstroResult.planetaryPositions,
      ascendant,
      midheaven,
    };
  }, [compatibility.isEnabled, partnerAstroResult]);

  // --- Calculate enhanced natal chart with WASM (for house cusps and Vedic) ---
  useEffect(() => {
    if (!birthData) {
      setNatalChartResult(null);
      return;
    }

    const calculateNatalChart = async () => {
      try {
        const result = await calculateNatalChartWithWasm(
          birthData,
          natalChartSettings.houseSystem,
          natalChartSettings.zodiacType === 'sidereal'
        );
        if (result) {
          setNatalChartResult(result);
        }
      } catch (error) {
        console.error('Failed to calculate natal chart:', error);
      }
    };

    calculateNatalChart();
  }, [birthData, natalChartSettings.houseSystem, natalChartSettings.zodiacType]);

  // --- Calculate partner's enhanced natal chart with WASM (duo mode) ---
  useEffect(() => {
    if (!compatibility.isEnabled || !partnerBirthData) {
      setPartnerNatalChartResult(null);
      return;
    }

    const calculatePartnerNatalChart = async () => {
      try {
        const result = await calculateNatalChartWithWasm(
          partnerBirthData,
          natalChartSettings.houseSystem,
          natalChartSettings.zodiacType === 'sidereal'
        );
        if (result) {
          setPartnerNatalChartResult(result);
        }
      } catch (error) {
        console.error('Failed to calculate partner natal chart:', error);
      }
    };

    calculatePartnerNatalChart();
  }, [compatibility.isEnabled, partnerBirthData, natalChartSettings.houseSystem, natalChartSettings.zodiacType]);

  // --- Calculate Local Space lines (in local space mode OR when toggle is enabled) ---
  // Use localSpaceBirthData which can have a custom origin from clicked cities
  // Use storeVisibility for consistent toggle state even when useAstroLines is disabled
  const shouldShowLocalSpace = isLocalSpace || storeVisibility.showLocalSpace;
  const {
    visibleLines: localSpaceLines,
    loading: localSpaceLoading,
    error: localSpaceError,
  } = useLocalSpaceLines(localSpaceBirthData || birthData, { enabled: shouldShowLocalSpace });

  // Convert local space lines to PlanetaryLine format for rendering
  const localSpaceLinesAsPlanetary = useMemo((): PlanetaryLine[] => {
    if (!localSpaceLines || localSpaceLines.length === 0) return [];
    return localSpaceLines.map(line => ({
      planet: line.planet,
      lineType: 'MC' as const, // Use MC as the line type for rendering (straight lines)
      points: line.points,
      color: PLANET_COLORS[line.planet] || '#888888',
      isLocalSpace: true, // Flag to identify local space lines
      azimuth: line.azimuth, // Azimuth angle for interpretation
      direction: line.direction, // Cardinal direction
    }));
  }, [localSpaceLines]);

  // Filter local space lines by planet visibility
  // Use storeVisibility for consistent filtering even when useAstroLines is disabled in local space mode
  const visibleLocalSpaceLines = useMemo(() => {
    if (!localSpaceLinesAsPlanetary || localSpaceLinesAsPlanetary.length === 0) return [];
    // In local space mode, use store visibility; otherwise use hook visibility
    const planetsVisibility = isLocalSpace ? storeVisibility.planets : visibility.planets;
    return localSpaceLinesAsPlanetary.filter(line => planetsVisibility[line.planet]);
  }, [localSpaceLinesAsPlanetary, visibility.planets, storeVisibility.planets, isLocalSpace]);

  // Combine astro lines with local space lines when toggle is enabled (but not in full local space mode)
  const effectiveAstroLines = useMemo(() => {
    if (isLocalSpace) {
      // In full local space mode, show only local space lines (filtered by planet visibility)
      return visibleLocalSpaceLines;
    }
    // Use storeVisibility for showLocalSpace toggle
    if (storeVisibility.showLocalSpace && visibleLocalSpaceLines.length > 0) {
      // Toggle enabled: show both regular lines and local space lines (with dashed style indication)
      // Local space lines are appended after regular lines
      return [...combinedAstroLines, ...visibleLocalSpaceLines];
    }
    // Default: show only regular astro lines
    return combinedAstroLines;
  }, [isLocalSpace, storeVisibility.showLocalSpace, combinedAstroLines, visibleLocalSpaceLines]);

  // Log when visiblePlanetaryLines updates
  useEffect(() => {
    if (visiblePlanetaryLines.length > 0) {
      console.log('visiblePlanetaryLines updated, count:', visiblePlanetaryLines.length);
      if (visiblePlanetaryLines[0].points.length > 0) {
        console.log('First visible line first point:', visiblePlanetaryLines[0].points[0]);
      }
    }
  }, [visiblePlanetaryLines]);

  // --- Data from worker ---
  const { data, loading } = useGlobeData(nodes, edges, { filters, selectedYear });
  const filteredLocations = data.locations;
  const filteredMigrations = data.migrations;

  // --- Callbacks ---
  const updateCardPosition = useCallback(() => {
    if (selectedPerson && selectedPerson.locations && selectedPerson.locations.length > 0) {
      const lastLocation = selectedPerson.locations[selectedPerson.locations.length - 1];
      if (lastLocation.lat && lastLocation.lng) {
        const screenCoords = navigation.getScreenCoords(lastLocation.lat, lastLocation.lng);
        const pov = navigation.getCurrentPOV();
        if (screenCoords && pov) {
          const scale = Math.max(0.5, 1 / ((pov.altitude ?? 2) * 1.5));
          // setCardState({ ...screenCoords, scale });
          void scale; // unused for now
        }
      }
    }
  }, [selectedPerson, navigation]);

  // Use handlers from globeCallbacks hook
  const handlePersonClick = globeCallbacks.handlePersonClick;
  const handleCloseCard = globeCallbacks.handleCloseCard;
  const handleLineClick = globeCallbacks.handleLineClick;

  // Find the zenith point for the selected line (only for MC lines)
  const selectedLineZenithPoint = useMemo(() => {
    if (!selectedLine || selectedLine.lineType !== 'MC' || !selectedLine.planet) {
      return null;
    }
    // Find the zenith point for this planet's MC line
    const zenith = visibleZenithPoints.find(z => z.planet === selectedLine.planet);
    if (zenith) {
      return { latitude: zenith.latitude, longitude: zenith.longitude };
    }
    return null;
  }, [selectedLine, visibleZenithPoints]);

  const handleCloseLineInfo = globeCallbacks.handleCloseLineInfo;
  const handleCityClick = globeCallbacks.handleCityClick;

  // Handle external city selection (from favorites menu, etc.)
  const lastExternalCityKeyRef = useRef<number | null>(null);
  useEffect(() => {
    if (externalCitySelect && externalCitySelect.key !== lastExternalCityKeyRef.current) {
      lastExternalCityKeyRef.current = externalCitySelect.key;
      handleCityClick(externalCitySelect.lat, externalCitySelect.lng, externalCitySelect.name);
    }
  }, [externalCitySelect, handleCityClick]);

  const handleCloseCityInfo = globeCallbacks.handleCloseCityInfo;

  // Handle viewing local space from city info panel (works from any mode)
  const handleViewLocalSpaceFromCity = useCallback((lat: number, lng: number, name: string) => {
    if (!birthData) {
      toast.info('Set birth data to view Local Space lines');
      return;
    }
    setLocalSpaceOrigin(lat, lng, name);
    toast.success(`Local Space lines from ${name}`);
  }, [birthData, setLocalSpaceOrigin]);

  // Handle enabling local space mode from legend (uses relocated location if in relocated mode)
  const handleEnableLocalSpace = useCallback(() => {
    if (isRelocated && relocationTarget) {
      // Use the relocated location as the local space origin
      setLocalSpaceOrigin(relocationTarget.lat, relocationTarget.lng, relocationTarget.name);
      toast.success(`Local Space lines from ${relocationTarget.name || 'relocated location'}`);
    } else {
      // Standard mode: use birth location
      enableLocalSpace();
      toast.success('Switched to Local Space mode');
    }
  }, [isRelocated, relocationTarget, setLocalSpaceOrigin, enableLocalSpace]);

  // Handle returning to standard mode - store now handles clearing visibility too
  const handleReturnToStandard = useCallback(() => {
    // Reset the mode (clears relocation target, local space origin, and showLocalSpace visibility)
    returnToStandard();
    toast.success('Returned to standard astrocartography');
  }, [returnToStandard]);

  // Report mode state changes to parent (for toolbar control)
  useEffect(() => {
    if (onModeStateChange) {
      onModeStateChange({
        isLocalSpace,
        localSpaceOriginName: localSpaceOrigin?.name,
        returnToStandard: handleReturnToStandard,
      });
    }
  }, [isLocalSpace, localSpaceOrigin?.name, handleReturnToStandard, onModeStateChange]);

  // Handle toggling favorite city
  const handleToggleFavorite = useCallback(async (lat: number, lng: number, name: string, country?: string) => {
    const wasFavorite = isFavorite(lat, lng);
    const result = await toggleFavorite({ latitude: lat, longitude: lng, city_name: name, country });
    if (!result.success && result.requiresAuth) {
      toast.info('Sign in to save favorite locations', {
        action: {
          label: 'Sign In',
          onClick: () => setIsAuthModalOpen(true),
        },
      });
      return;
    }
    toast.success(wasFavorite ? `Removed ${name} from favorites` : `Added ${name} to favorites`);
  }, [isFavorite, toggleFavorite, setIsAuthModalOpen]);

  const handleLocationAnalyze = globeCallbacks.handleLocationAnalyze;
  const handleCloseLocationAnalysis = globeCallbacks.handleCloseLocationAnalysis;

  // Context menu action: Analyze Location
  const handleContextAnalyze = useCallback((lat: number, lng: number) => {
    handleLocationAnalyze(lat, lng);
  }, [handleLocationAnalyze]);

  // Handle relocation from location analysis card
  const handleRelocate = useCallback((lat: number, lng: number) => {
    // Get a name for the location if possible
    const name = locationAnalysis ? `${lat.toFixed(2)}°, ${lng.toFixed(2)}°` : undefined;
    relocateTo(lat, lng, name);
    setLocationAnalysis(null); // Close the analysis card after relocating
    toast.success('Relocated! Lines recalculated for this location.');
  }, [relocateTo, locationAnalysis]);

  // Handle reset relocation from location analysis card
  const handleResetRelocation = useCallback(() => {
    returnToStandard();
    toast.success('Returned to standard chart view.');
  }, [returnToStandard]);

  // Handle local space from location analysis card
  const handleLocalSpace = useCallback((lat: number, lng: number) => {
    const name = `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
    enableLocalSpace();
    setLocalSpaceOrigin(lat, lng, name);
    setLocationAnalysis(null); // Close the analysis card
    toast.success(`Local Space lines from ${name}`);
  }, [enableLocalSpace, setLocalSpaceOrigin]);

  // Handle reset local space from location analysis card
  const handleResetLocalSpace = useCallback(() => {
    returnToStandard();
    toast.success('Returned to standard view.');
  }, [returnToStandard]);

  // Handle viewing relocation chart - pushes relocation panel to stack
  const handleViewRelocationChart = useCallback(() => {
    if (!selectedCityForInfo || !birthData) {
      toast.error('Birth data required for relocation chart');
      return;
    }
    panelStack.push({
      type: 'relocation',
      title: `Relocation: ${selectedCityForInfo.name}`,
      data: { lat: selectedCityForInfo.lat, lng: selectedCityForInfo.lng, name: selectedCityForInfo.name },
    });
  }, [panelStack, selectedCityForInfo, birthData]);

  // Birth data handlers - from useBirthDataFlow hook
  const handleCoordinateSelect = useCallback((lat: number, lng: number) => {
    birthDataFlow.handleGlobeDoubleTap(lat, lng);
  }, [birthDataFlow]);

  const handleQuickBirthDataConfirm = useCallback((data: { lat: number; lng: number; date: string; time: string }) => {
    birthDataFlow.handleQuickBirthConfirm(data);
  }, [birthDataFlow]);

  const handleBirthDateTimeConfirm = useCallback((data: { lat: number; lng: number; date: string; time: string; cityName?: string }) => {
    birthDataFlow.handleBirthDateTimeConfirm(data);
  }, [birthDataFlow]);

  // Handle AI chat actions
  const handleAIChatHighlightLine = useCallback((planet: string, lineType: string) => {
    // Find the matching line and select it
    const matchingLine = visiblePlanetaryLines.find(
      l => l.planet === planet && l.lineType === lineType
    );
    if (matchingLine) {
      // Create a GlobePath-compatible object
      const globePath: GlobePath = {
        coords: matchingLine.points, // GlobePoint[] is [number, number][]
        color: matchingLine.color,
        type: 'planetary',
        planet: matchingLine.planet,
        lineType: matchingLine.lineType,
      };
      setSelectedLine(globePath);
      // Zoom to the line's center
      if (matchingLine.points.length > 0) {
        const midPoint = matchingLine.points[Math.floor(matchingLine.points.length / 2)];
        // GlobePoint is [lat, lng] tuple
        navigation.flyTo(midPoint[0], midPoint[1], 1.5, 1500);
      }
    }
  }, [visiblePlanetaryLines, setSelectedLine, navigation]);

  const handleAIChatZoomToLocation = useCallback((lat: number, lng: number, altitude?: number) => {
    navigation.flyTo(lat, lng, altitude || 0.4, 1500);
  }, [navigation]);

  const handleAIChatAnalyzeLocation = useCallback((lat: number, lng: number) => {
    handleLocationAnalyze(lat, lng);
  }, [handleLocationAnalyze]);

  // Zone drawing handlers - from useZoneDrawing hook
  const handleZonePointAdd = useCallback((lat: number, lng: number) => {
    zoneDrawing.addPoint(lat, lng);
  }, [zoneDrawing]);

  const handleZoneComplete = useCallback(() => {
    zoneDrawing.completeDrawing();
  }, [zoneDrawing]);

  const handleToggleZoneDrawing = useCallback(() => {
    zoneDrawing.toggleDrawing();
  }, [zoneDrawing]);

  const handleClearZone = useCallback(() => {
    zoneDrawing.clearZone();
  }, [zoneDrawing]);

  // Handle city search selection - either set birthplace or fly to city
  const handleCitySelect = useCallback((lat: number, lng: number, cityName: string) => {
    // If no birth data, this is birthplace selection - open date/time modal
    if (!birthData) {
      birthDataFlow.handleCitySearchSelect(lat, lng, cityName);
      // Still fly to the city for visual feedback
      navigation.flyTo(lat, lng, 1.5, 1000);
      return;
    }

    // Otherwise, use handleCityClick which properly opens the CityInfoPanel
    // (handles panel stack for desktop, bottom sheet for mobile, and computes analysis)
    handleCityClick(lat, lng, cityName);
  }, [birthData, birthDataFlow, navigation, handleCityClick]);

  const handleClearCityLocation = useCallback(() => {
    setCityLocation(null);
  }, []);

  // Notify parent of zone state changes for toolbar control
  useEffect(() => {
    if (onZoneStateChange) {
      onZoneStateChange({
        isDrawing: zoneDrawing.isDrawing,
        hasZone: !!zoneDrawing.drawnZone,
        pointsCount: zoneDrawing.pointsCount,
        toggleDrawing: handleToggleZoneDrawing,
        completeDrawing: handleZoneComplete,
        clearZone: handleClearZone,
      });
    }
  }, [zoneDrawing.isDrawing, zoneDrawing.drawnZone, zoneDrawing.pointsCount, onZoneStateChange, handleToggleZoneDrawing, handleZoneComplete, handleClearZone]);

  // Handle partner chart submission from modal
  const handlePartnerChartSubmit = useCallback(async (partnerData: PartnerChartData) => {
    let wasSaved = false;

    // Auto-save new partner data as a birth chart
    if (!partnerData.isSaved) {
      const savedNewChart = await saveChart({
        name: partnerData.name,
        birth_date: partnerData.birthDate,
        birth_time: partnerData.birthTime,
        latitude: partnerData.latitude,
        longitude: partnerData.longitude,
        city_name: partnerData.cityName || null,
      });

      if (savedNewChart) {
        // Update partner data with the saved chart's ID
        partnerData = {
          ...partnerData,
          id: savedNewChart.id,
          isSaved: true,
        };
        wasSaved = true;
      }
    }

    compatibility.setPartnerChart(partnerData);
    compatibility.enable();
    setShowPartnerModal(false);

    // Immediately push compatibility panel to stack (desktop) so user sees loading state
    if (!isMobile) {
      const hasCompatibilityPanel = panelStack.stack.some(p => p.type === 'compatibility');
      if (!hasCompatibilityPanel) {
        panelStack.push({
          type: 'compatibility',
          title: 'Compatible Spots',
          data: null,
        });
      }
    }

    // Show appropriate toast message
    if (wasSaved) {
      toast.success(`${partnerData.name} added as partner & saved to My Charts`);
    } else {
      toast.success(`Duo Mode enabled with ${partnerData.name}`);
    }
  }, [compatibility, saveChart, isMobile, panelStack]);

  // Handle selecting a partner from saved charts (used in CompatibilityPanel dropdown)
  const handleSelectPartnerFromChart = useCallback((chart: BirthChart) => {
    const partnerData: PartnerChartData = {
      id: chart.id,
      name: chart.name,
      birthDate: chart.birth_date,
      birthTime: chart.birth_time,
      latitude: chart.latitude,
      longitude: chart.longitude,
      cityName: chart.city_name || undefined,
      isSaved: true,
    };
    compatibility.setPartnerChart(partnerData);
    compatibility.clearAnalysis(); // Clear analysis to trigger recalculation with new partner
    toast.success(`Switched partner to ${chart.name}`);
  }, [compatibility]);

  // Handle zooming to a compatibility location (without opening city info)
  const handleCompatibilityLocationZoom = useCallback((lat: number, lng: number, cityName?: string) => {
    const name = cityName || `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;
    // Set city location for pin marker
    setCityLocation({ lat, lng, name });
    // Zoom to the location
    navigation.flyTo(lat, lng, 0.4, 1500);
    toast.success(`Zooming to ${name}`);
  }, [navigation]);

  // Handle opening city info for a compatibility location
  const handleCompatibilityLocationCityInfo = useCallback((lat: number, lng: number, cityName?: string) => {
    const name = cityName || `${lat.toFixed(2)}°, ${lng.toFixed(2)}°`;

    // Open city info panel
    if (!isMobile) {
      panelStack.push({
        type: 'city',
        title: name,
        data: { lat, lng, name },
      });
    } else {
      // Mobile uses bottom sheet
      setSelectedCityForInfo({ lat, lng, name });
    }
  }, [isMobile, panelStack]);

  // Handle closing compatibility panel
  const handleCloseCompatibility = useCallback(() => {
    compatibility.disable();
  }, [compatibility]);

  // Handle editing partner chart (opens modal with existing data)
  const handleEditPartner = useCallback(() => {
    setShowPartnerModal(true);
  }, []);

  // Handle clearing partner chart
  const handleClearPartner = useCallback(() => {
    compatibility.setPartnerChart(null);
    compatibility.disable();
    toast.success('Partner chart removed');
  }, [compatibility]);

  // Handle clearing birth data - close all panes first
  const handleClearBirthDataWithPanes = useCallback(() => {
    // Close all open panels (scout, line info, etc.)
    panelStack.closeAll();
    // Close all open panes
    setSelectedLine(null);
    setLocationAnalysis(null);
    setCityLocation(null);
    handleCloseExportPanel();
    // Clear scout markers from globe
    setScoutMarkers([]);
    // Clear pending birth location state and call parent's clear function
    birthDataFlow.clearBirthDataWithCleanup();
  }, [panelStack, handleCloseExportPanel, birthDataFlow]);

  // --- Render functions for RightPanelStack ---
  const renderLinePanel = useCallback((data: unknown) => {
    const line = data as GlobePath;
    // Find zenith point for MC lines
    const zenithPoint = line.lineType === 'MC' && line.planet
      ? visibleZenithPoints.find(z => z.planet === line.planet)
      : null;
    return (
      <LineInfoCard
        line={line}
        onClose={panelStack.closeCurrent}
        zenithPoint={zenithPoint ? { latitude: zenithPoint.latitude, longitude: zenithPoint.longitude } : null}
        onCityClick={handleCityClick}
      />
    );
  }, [visibleZenithPoints, panelStack, handleCityClick]);

  const renderAnalysisPanel = useCallback((data: unknown) => {
    const analysis = data as LocationAnalysis;
    const handleCloseAnalysisPanel = () => {
      panelStack.closeCurrent();
      handleCloseLocationAnalysis(); // Clear the marker
    };
    return (
      <LocationAnalysisCard
        analysis={analysis}
        onClose={handleCloseAnalysisPanel}
        onRelocate={handleRelocate}
        onResetRelocation={handleResetRelocation}
        isRelocated={isRelocated}
        onLocalSpace={handleLocalSpace}
        onResetLocalSpace={handleResetLocalSpace}
        isLocalSpace={isLocalSpace}
      />
    );
  }, [panelStack, handleRelocate, handleResetRelocation, isRelocated, handleLocalSpace, handleResetLocalSpace, isLocalSpace, handleCloseLocationAnalysis]);

  const renderCityPanel = useCallback((data: unknown) => {
    const city = data as { lat: number; lng: number; name: string };
    // Compute analysis for this city using ALL lines (not visibility-filtered)
    // This ensures analysis considers all planetary influences regardless of display toggles
    const cityAnalysis = birthData && astroResult ? analyzeLocation(
      city.lat,
      city.lng,
      astroResult.planetaryLines,
      astroResult.aspectLines,
      astroResult.zenithPoints ?? []
    ) : null;
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center p-8 h-64">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.5)' }} />
        </div>
      }>
        <CityInfoPanel
          city={city}
          onClose={panelStack.closeCurrent}
          isMobile={false}
          isBottomSheet={false}
          onViewLocalSpace={handleViewLocalSpaceFromCity}
          isFavorite={isFavorite(city.lat, city.lng)}
          onToggleFavorite={handleToggleFavorite}
          locationAnalysis={cityAnalysis}
          hasBirthData={!!birthData}
          onRelocate={handleRelocate}
          onViewRelocationChart={handleViewRelocationChart}
        />
      </Suspense>
    );
  }, [panelStack, birthData, astroResult, handleViewLocalSpaceFromCity, isFavorite, handleToggleFavorite, handleRelocate, handleViewRelocationChart]);

  const renderPersonPanel = useCallback((data: unknown) => {
    const person = data as PersonData;
    return (
      <div className="h-full overflow-y-auto p-4">
        <PersonCard person={person} onClose={panelStack.closeCurrent} />
      </div>
    );
  }, [panelStack]);

  const renderCompatibilityPanel = useCallback(() => {
    // Filter saved charts to exclude current user's chart for partner selection
    const partnerChartOptions = savedCharts.filter(c => c.id !== currentChart?.id);

    return (
      <Suspense fallback={
        <div className="flex items-center justify-center p-8 h-64">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.5)' }} />
        </div>
      }>
        <CompatibilityPanel
          analysis={compatibility.analysis}
          mode={compatibility.mode}
          onModeChange={(mode) => {
            compatibility.setMode(mode);
            compatibility.clearAnalysis();
          }}
          onLocationZoom={handleCompatibilityLocationZoom}
          onLocationCityInfo={handleCompatibilityLocationCityInfo}
          onClose={handleCloseCompatibility}
          onEditPartner={handleEditPartner}
          onClearPartner={handleClearPartner}
          onSelectPartner={handleSelectPartnerFromChart}
          savedCharts={partnerChartOptions}
          currentPartnerId={compatibility.partnerChart?.id}
          isLoading={compatibility.isCalculating || partnerAstroLoading}
          person1Name={firstPersonData?.name || 'You'}
          person2Name={compatibility.partnerChart?.name}
          isMobile={false}
        />
      </Suspense>
    );
  }, [
    compatibility.analysis,
    compatibility.mode,
    compatibility.setMode,
    compatibility.clearAnalysis,
    compatibility.isCalculating,
    compatibility.partnerChart?.name,
    compatibility.partnerChart?.id,
    handleCompatibilityLocationZoom,
    handleCompatibilityLocationCityInfo,
    handleCloseCompatibility,
    handleEditPartner,
    handleClearPartner,
    handleSelectPartnerFromChart,
    savedCharts,
    currentChart?.id,
    partnerAstroLoading,
    firstPersonData?.name,
  ]);

  // Relocation panel renderer
  const renderRelocationPanel = useCallback(() => {
    // Get birth location name if available
    const birthLocationName = firstPersonData?.locations?.find(l => l.type === 'birth')?.place || 'Birth Location';

    return (
      <Suspense fallback={
        <div className="flex items-center justify-center p-8 h-64">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.5)' }} />
        </div>
      }>
        <RelocationPanel
          result={relocationResult}
          loading={relocationLoading}
          error={relocationError}
          originName={birthLocationName}
          destinationName={selectedCityForInfo?.name || 'Selected Location'}
          onRecalculate={recalculateRelocation}
        />
      </Suspense>
    );
  }, [
    relocationResult,
    relocationLoading,
    relocationError,
    selectedCityForInfo?.name,
    firstPersonData?.locations,
    recalculateRelocation,
  ]);

  // Favorites panel renderer
  const renderFavoritesPanel = useCallback(() => {
    const handleSelectFavorite = (lat: number, lng: number, name: string) => {
      // Navigate to the city on the globe
      if (globeEl.current) {
        globeEl.current.pointOfView({ lat, lng, altitude: 1.5 }, 1000);
      }
      // Open city info panel
      panelStack.push({
        type: 'city',
        title: name,
        data: { lat, lng, name },
      });
    };

    const handleRemoveFavorite = (id: string, name: string) => {
      removeFavorite(id);
      toast.success(`Removed ${name} from favorites`);
    };

    return (
      <FavoritesPanelContent
        favorites={favorites}
        loading={favoritesLoading}
        onSelectFavorite={handleSelectFavorite}
        onRemoveFavorite={handleRemoveFavorite}
        onUpdateNotes={updateFavoriteNotes}
        onRemoveMultipleFavorites={removeMultipleFavorites}
        onClose={panelStack.closeCurrent}
      />
    );
  }, [favorites, favoritesLoading, removeFavorite, updateFavoriteNotes, removeMultipleFavorites, panelStack]);

  // Render function for ScoutPanel
  const renderScoutPanel = useCallback(() => {
    return (
      <ScoutPanel
        planetaryLines={astroResult?.planetaryLines ?? []}
        aspectLines={astroResult?.aspectLines ?? []}
        onCityClick={handleCityClick}
        onShowCountryMarkers={setScoutMarkers}
        onClose={() => {
          setScoutMarkers([]); // Clear markers when panel closes
          panelStack.closeCurrent();
        }}
      />
    );
  }, [astroResult?.planetaryLines, astroResult?.aspectLines, panelStack, handleCityClick]);

  // Handler to open favorites panel
  const handleOpenFavoritesPanel = useCallback(() => {
    // Check if favorites panel is already open
    const hasFavoritesPanel = panelStack.stack.some(p => p.type === 'favorites');
    if (!hasFavoritesPanel) {
      panelStack.push({
        type: 'favorites',
        title: 'Favorites',
        data: null,
      });
    }
  }, [panelStack]);

  // --- Effects ---

  // Clear scout markers when scout panel is no longer in the stack
  useEffect(() => {
    const hasScoutPanel = panelStack.stack.some(p => p.type === 'scout');
    if (!hasScoutPanel && scoutMarkers.length > 0) {
      setScoutMarkers([]);
    }
  }, [panelStack.stack, scoutMarkers.length]);

  // Push compatibility panel to stack when enabled (desktop only)
  useEffect(() => {
    if (isMobile) return; // Mobile uses bottom sheet

    if (compatibility.isEnabled && birthData) {
      // Check if compatibility panel is already in the stack
      const hasCompatibilityPanel = panelStack.stack.some(p => p.type === 'compatibility');
      if (!hasCompatibilityPanel) {
        panelStack.push({
          type: 'compatibility',
          title: 'Compatible Spots',
          data: null,
        });
      }
    } else {
      // When compatibility is disabled, close compatibility panels from stack
      const compatibilityPanelIndex = panelStack.stack.findIndex(p => p.type === 'compatibility');
      if (compatibilityPanelIndex !== -1) {
        // Navigate to this panel and close it
        panelStack.closeAll();
      }
    }
  }, [compatibility.isEnabled, birthData, isMobile, panelStack.stack.length]);

  useEffect(() => {
    const globe = globeEl.current;
    if (loading || !globe) return;

    // react-globe.gl controls() returns an unknown type; we only use addEventListener/removeEventListener
    // Add try-catch for WebGL context failures on mobile
    let controls: { addEventListener: (event: string, handler: () => void) => void; removeEventListener: (event: string, handler: () => void) => void } | null = null;
    try {
      controls = globe.controls?.() as unknown as typeof controls;
      if (controls) {
        controls.addEventListener('change', updateCardPosition);
      }
    } catch (e) {
      console.warn('Failed to access globe controls (WebGL may not be available):', e);
    }

    // Set initial view only once - uses navigation hook
    navigation.setInitialView(data.locations);

    return () => {
      if (controls) {
        try {
          controls.removeEventListener('change', updateCardPosition);
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    };
  }, [loading, filteredLocations, selectedPerson, updateCardPosition, isMobile, data.locations]);

  // --- Render ---
  if (!hasMounted) return null;

  return (
    <div
      className="h-full w-full flex flex-col relative bg-white dark:bg-[#050505]"
      style={isMobile ? { paddingBottom: 'calc(64px + env(safe-area-inset-bottom, 0px))' } : undefined}
    >
      {/* Astro Legend - Desktop: top-left overlay, Mobile: bottom sheet */}
      {showAstroLines && birthData && (
        isMobile ? (
          /* Mobile legend positioned to sit above bottom nav */
          <AstroLegend
            visibility={visibility}
            onTogglePlanet={handleTogglePlanet}
            onToggleLineType={toggleLineType}
            onToggleAspects={toggleAspects}
            onToggleHarmoniousAspects={toggleHarmoniousAspects}
            onToggleDisharmoniousAspects={toggleDisharmoniousAspects}
            onToggleParans={toggleParans}
            onToggleZenithPoints={toggleZenithPoints}
            onToggleLocalSpace={toggleLocalSpace}
            onShowAll={showAllPlanets}
            onHideAll={hideAllPlanets}
            isMinimized={legendMinimized}
            onToggleMinimized={handleToggleLegend}
            loading={astroLoading || localSpaceLoading}
            onClearBirthData={handleClearBirthDataWithPanes}
            mode={astroMode}
            isRelocated={isRelocated}
            relocationName={relocationTarget?.name}
            localSpaceOriginName={localSpaceOrigin?.name}
            onEnableLocalSpace={handleEnableLocalSpace}
            onReturnToStandard={handleReturnToStandard}
          />
        ) : (
          /* Desktop: Position below search bar (which is at top-4 with h-10 height) */
          <div className="absolute top-[68px] left-4 z-10 pointer-events-auto">
            <AstroLegend
              visibility={visibility}
              onTogglePlanet={handleTogglePlanet}
              onToggleLineType={toggleLineType}
              onToggleAspects={toggleAspects}
              onToggleHarmoniousAspects={toggleHarmoniousAspects}
              onToggleDisharmoniousAspects={toggleDisharmoniousAspects}
              onToggleParans={toggleParans}
              onToggleZenithPoints={toggleZenithPoints}
              onToggleLocalSpace={toggleLocalSpace}
              onShowAll={showAllPlanets}
              onHideAll={hideAllPlanets}
              isMinimized={legendMinimized}
              onToggleMinimized={handleToggleLegend}
              loading={astroLoading || localSpaceLoading}
              onClearBirthData={handleClearBirthDataWithPanes}
              mode={astroMode}
              isRelocated={isRelocated}
              relocationName={relocationTarget?.name}
              localSpaceOriginName={localSpaceOrigin?.name}
              onEnableLocalSpace={handleEnableLocalSpace}
              onReturnToStandard={handleReturnToStandard}
            />
          </div>
        )
      )}

      {/* Export Report Modal (centered) - shows when export button is clicked on desktop/tablet */}
      <Dialog open={showExportPanel && !isMobile} onOpenChange={(open) => !open && handleCloseExportPanel()}>
        <DialogContent className="max-w-[520px] p-0 gap-0 border-0 bg-transparent shadow-none [&>button]:hidden">
          <Suspense fallback={null}>
            <LineReportPanel
              planetaryLines={visiblePlanetaryLines}
              zenithPoints={visibleZenithPoints}
              birthDate={firstPersonData?.birthDate || 'Unknown'}
              birthTime={firstPersonData?.birthTime || 'Unknown'}
              birthLocation={firstPersonData?.locations?.find(l => l.type === 'birth')?.place || 'Unknown'}
              onClose={handleCloseExportPanel}
            />
          </Suspense>
        </DialogContent>
      </Dialog>


      {/* Astrocartography Loading Overlay (includes scout progress) */}
      {(astroLoading || isScoutComputing) && birthData && (
        <AstroLoadingOverlay
          progress={astroProgress}
          scoutProgress={isScoutComputing ? {
            percent: scoutProgress,
            detail: scoutDetail,
            phase: scoutPhase,
          } : null}
        />
      )}

      {/* astrocarto.app Banner (bottom right, desktop only, hidden when panel is open) */}
      {!isMobile && !panelStack.isOpen && (
        <a
          href="/"
          className="fixed bottom-4 right-4 z-40 flex items-center gap-2 px-4 py-2 rounded-lg shadow-lg bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <img src="/logo.png" alt="astrocarto.app Logo" className="w-7 h-7 mr-2" />
          <span className="font-semibold text-slate-700 dark:text-slate-200 text-base select-none tracking-tight" style={{ fontFamily: 'Inter, sans-serif' }}>Astrocarto.app</span>
        </a>
      )}

      {/* Natal Chart Widget (bottom left, desktop only) */}
      {!isMobile && birthData && natalChartData.planetaryPositions.length > 0 && (
        <div className="fixed bottom-4 left-4 z-10 pointer-events-auto">
          <Suspense fallback={null}>
            <NatalChartWidget
              planetaryPositions={natalChartData.planetaryPositions}
              natalChartResult={natalChartResult ?? undefined}
              ascendant={natalChartData.ascendant}
              midheaven={natalChartData.midheaven}
              birthDate={firstPersonData?.birthDate}
              birthTime={firstPersonData?.birthTime}
              birthLocation={firstPersonData?.locations?.find(l => l.type === 'birth')?.place}
              isMinimized={natalChartMinimized}
              onToggleMinimized={handleToggleNatalChart}
              settings={natalChartSettings}
              onSettingsChange={setNatalChartSettings}
              // Duo mode props
              isDuoMode={compatibility.isEnabled && !!compatibility.partnerChart}
              personName={firstPersonData?.name || 'You'}
              partnerPlanetaryPositions={partnerNatalChartData.planetaryPositions}
              partnerNatalChartResult={partnerNatalChartResult ?? undefined}
              partnerAscendant={partnerNatalChartData.ascendant}
              partnerMidheaven={partnerNatalChartData.midheaven}
              partnerName={compatibility.partnerChart?.name || 'Partner'}
              // Relocation chart props - only show when in relocated mode
              relocationResult={natalWidgetRelocationResult}
              relocationLocationName={natalWidgetRelocationName}
            />
          </Suspense>
        </div>
      )}

      {/* Natal Chart Widget (mobile bottom sheet) */}
      {isMobile && birthData && natalChartData.planetaryPositions.length > 0 && !natalChartMinimized && (
        <Suspense fallback={null}>
          <NatalChartWidget
            planetaryPositions={natalChartData.planetaryPositions}
            natalChartResult={natalChartResult ?? undefined}
            ascendant={natalChartData.ascendant}
            midheaven={natalChartData.midheaven}
            birthDate={firstPersonData?.birthDate}
            birthTime={firstPersonData?.birthTime}
            birthLocation={firstPersonData?.locations?.find(l => l.type === 'birth')?.place}
            isMinimized={natalChartMinimized}
            onToggleMinimized={handleToggleNatalChart}
            settings={natalChartSettings}
            onSettingsChange={setNatalChartSettings}
            // Duo mode props
            isDuoMode={compatibility.isEnabled && !!compatibility.partnerChart}
            personName={firstPersonData?.name || 'You'}
            partnerPlanetaryPositions={partnerNatalChartData.planetaryPositions}
            partnerNatalChartResult={partnerNatalChartResult ?? undefined}
            partnerAscendant={partnerNatalChartData.ascendant}
            partnerMidheaven={partnerNatalChartData.midheaven}
            partnerName={compatibility.partnerChart?.name || 'Partner'}
            // Relocation chart props - only show when in relocated mode
            relocationResult={natalWidgetRelocationResult}
            relocationLocationName={natalWidgetRelocationName}
          />
        </Suspense>
      )}

      {/* AI Chat Panel - lazy loaded with Suspense to prevent CopilotKit initialization issues */}
      {birthData && (
        <Suspense fallback={null}>
          <AstroChat
            birthData={{
              date: firstPersonData?.birthDate || '',
              time: firstPersonData?.birthTime || '',
              location: firstPersonData?.locations?.find(l => l.type === 'birth')?.place || '',
              latitude: birthData.latitude,
              longitude: birthData.longitude,
            }}
            planetaryPositions={natalChartData.planetaryPositions}
            visibleLines={visiblePlanetaryLines}
            aspectLines={visibleAspectLines}
            paranLines={visibleParanLines}
            selectedLine={selectedLine ? {
              planet: selectedLine.planet! as import('@/lib/astro-types').Planet,
              lineType: selectedLine.lineType! as import('@/lib/astro-types').LineType,
              points: selectedLine.coords, // GlobePath uses coords, not points
              color: selectedLine.color,
            } : null}
            locationAnalysis={locationAnalysis}
            zoneAnalysis={zoneDrawing.zoneAnalysis}
            mode={astroMode}
            relocationTarget={relocationTarget ? {
              latitude: relocationTarget.lat,
              longitude: relocationTarget.lng,
              name: relocationTarget.name,
            } : undefined}
            natalChartResult={natalChartResult}
            natalChartSettings={natalChartSettings}
            // Duo mode / Partner data
            isDuoMode={compatibility.isEnabled && !!compatibility.partnerChart}
            personName={firstPersonData?.name || 'You'}
            partnerName={compatibility.partnerChart?.name || 'Partner'}
            partnerBirthData={partnerBirthData ? {
              date: compatibility.partnerChart?.birthDate || '',
              time: compatibility.partnerChart?.birthTime || '',
              location: compatibility.partnerChart?.cityName || '',
              latitude: partnerBirthData.latitude,
              longitude: partnerBirthData.longitude,
            } : undefined}
            partnerPlanetaryPositions={partnerNatalChartData.planetaryPositions}
            partnerVisibleLines={partnerPlanetaryLines}
            partnerAspectLines={partnerAspectLines}
            partnerParanLines={partnerParanLines}
            partnerNatalChartResult={partnerNatalChartResult}
            relocationChartResult={relocationResult}
            onHighlightLine={handleAIChatHighlightLine}
            onClearHighlight={() => setSelectedLine(null)}
            onZoomToLocation={handleAIChatZoomToLocation}
            onAnalyzeLocation={handleAIChatAnalyzeLocation}
            onTogglePlanet={handleTogglePlanet}
            onRelocateTo={relocateTo}
            onReturnToStandard={returnToStandard}
            isOpen={showAstroChat}
            onToggle={handleToggleAstroChat}
            askLocationContext={askAILocation}
            onClearAskLocationContext={() => setAskAILocation(null)}
          />
        </Suspense>
      )}

      {/* TimelineScrubber (desktop only) */}
      {/* Removed TimelineScrubber for all devices */}
      <div className="flex-1 flex flex-col min-h-0 relative">
        <div className="flex-1 flex items-center justify-center relative">
          {/* City Search Bar - floating top-left */}
          {/* Shows as "Enter your birthplace" when no valid birth data, otherwise as regular search */}
          {/* Hidden on mobile when AI chat is open */}
          {/* Hidden when valid birth data exists but lines are still calculating (prevents flicker) */}
          {!(isMobile && showAstroChat) &&
           (!hasValidBirthData || (astroResult?.planetaryLines && astroResult.planetaryLines.length > 0)) && (
            <div className={`absolute z-40 ${isMobile ? 'top-3 left-3' : 'top-4 left-4'}`}>
              <CitySearchBar
                onCitySelect={handleCitySelect}
                onClear={handleClearCityLocation}
                isMobile={isMobile}
                mode={hasValidBirthData ? 'search' : 'birthplace'}
              />
            </div>
          )}

          {isMobile ? (
            <div className="absolute inset-0 w-full h-full flex items-center justify-center" style={{ transform: 'translateY(-5%)' }}>
              <MigrationGlobe
                ref={globeEl}
                locations={filteredLocations}
                migrations={filteredMigrations}
                onPersonClick={handlePersonClick}
                astroLines={showAstroLines ? effectiveAstroLines : []}
                aspectLines={showAstroLines && !isLocalSpace ? visibleAspectLines : []}
                paranLines={showAstroLines && !isLocalSpace ? visibleParanLines : []}
                zenithPoints={showAstroLines && !isLocalSpace ? visibleZenithPoints : []}
                onCoordinateSelect={handleCoordinateSelect}
                onLocationAnalyze={isLocalSpace ? undefined : handleLocationAnalyze}
                birthDataKey={birthLocationKey}
                onLineClick={handleLineClick}
                isMobile={true}
                analysisLocation={locationAnalysis ? { lat: locationAnalysis.latitude, lng: locationAnalysis.longitude } : null}
                cityLocation={cityLocation}
                relocationLocation={isRelocated && relocationTarget ? { lat: relocationTarget.lat, lng: relocationTarget.lng, name: relocationTarget.name } : null}
                hasBirthData={!!birthData}
                pendingBirthLocation={birthDataFlow.pendingBirthCoords}
                partnerLocation={partnerLocation}
                selectedParanLine={selectedLine?.type === 'paran' ? selectedLine : null}
                isDrawingZone={zoneDrawing.isDrawing}
                zoneDrawingPoints={zoneDrawing.drawingPoints}
                drawnZone={zoneDrawing.drawnZone}
                onZonePointAdd={handleZonePointAdd}
                onZoneComplete={handleZoneComplete}
                isLocalSpaceMode={isLocalSpace}
                localSpaceOrigin={localSpaceOrigin}
                showLineLabels={storeVisibility.showLineLabels}
                onSingleClick={handleGlobeSingleClick}
                onContextMenu={handleGlobeContextMenu}
                scoutMarkers={scoutMarkers}
                onScoutMarkerClick={handleCityClick}
                onGlobeFallbackShowScout={() => setMobileScoutSheetOpen(true)}
              />
            </div>
          ) : (
            <ResizablePanelGroup direction="horizontal" className="flex-1 overflow-hidden">
              <ResizablePanel defaultSize={panelStack.isOpen ? 75 : 100} minSize={50}>
                <div style={{ position: 'relative', width: '100%', height: '100%' }}>
                  <MigrationGlobe
                    ref={globeEl}
                    locations={filteredLocations}
                    migrations={filteredMigrations}
                    onPersonClick={handlePersonClick}
                    astroLines={showAstroLines ? effectiveAstroLines : []}
                    aspectLines={showAstroLines && !isLocalSpace ? visibleAspectLines : []}
                    paranLines={showAstroLines && !isLocalSpace ? visibleParanLines : []}
                    zenithPoints={showAstroLines && !isLocalSpace ? visibleZenithPoints : []}
                    onCoordinateSelect={handleCoordinateSelect}
                    onLocationAnalyze={isLocalSpace ? undefined : handleLocationAnalyze}
                    birthDataKey={birthLocationKey}
                    onLineClick={handleLineClick}
                    hasBirthData={!!birthData}
                    analysisLocation={locationAnalysis ? { lat: locationAnalysis.latitude, lng: locationAnalysis.longitude } : null}
                    cityLocation={cityLocation}
                    relocationLocation={isRelocated && relocationTarget ? { lat: relocationTarget.lat, lng: relocationTarget.lng, name: relocationTarget.name } : null}
                    pendingBirthLocation={birthDataFlow.pendingBirthCoords}
                    partnerLocation={partnerLocation}
                    selectedParanLine={selectedLine?.type === 'paran' ? selectedLine : null}
                    isDrawingZone={zoneDrawing.isDrawing}
                    zoneDrawingPoints={zoneDrawing.drawingPoints}
                    drawnZone={zoneDrawing.drawnZone}
                    onZonePointAdd={handleZonePointAdd}
                    onZoneComplete={handleZoneComplete}
                    isLocalSpaceMode={isLocalSpace}
                    localSpaceOrigin={localSpaceOrigin}
                    showLineLabels={storeVisibility.showLineLabels}
                    onSingleClick={handleGlobeSingleClick}
                    onContextMenu={handleGlobeContextMenu}
                    scoutMarkers={scoutMarkers}
                    onScoutMarkerClick={handleCityClick}
                  />
                </div>
              </ResizablePanel>
              {panelStack.isOpen && (
                <>
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={15} maxSize={45} className="overflow-hidden">
                    <RightPanelStack
                      stack={panelStack.stack}
                      currentIndex={panelStack.currentIndex}
                      onNavigateBack={panelStack.navigateBack}
                      onNavigateForward={panelStack.navigateForward}
                      onClose={panelStack.closeCurrent}
                      onCloseAll={panelStack.closeAll}
                      renderLine={renderLinePanel}
                      renderAnalysis={renderAnalysisPanel}
                      renderCity={renderCityPanel}
                      renderPerson={renderPersonPanel}
                      renderCompatibility={renderCompatibilityPanel}
                      renderRelocation={renderRelocationPanel}
                      renderFavorites={renderFavoritesPanel}
                      renderScout={renderScoutPanel}
                      footer={
                        <a
                          href="/"
                          className="flex items-center justify-center gap-2 px-4 py-3 bg-white/80 dark:bg-slate-900/80 hover:bg-white dark:hover:bg-slate-800 transition-colors"
                        >
                          <img src="/logo.png" alt="Astrocartography.world Logo" className="w-6 h-6" />
                          <span className="font-semibold text-slate-700 dark:text-slate-200 text-sm select-none tracking-tight" style={{ fontFamily: 'Cinzel, serif' }}>Astrocartography.world</span>
                        </a>
                      }
                    />
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
          )}
        </div>

        {isMobile && selectedPerson && ( // Use useIsMobile directly
          <Dialog open={!!selectedPerson} onOpenChange={() => handleCloseCard()}>
            <DialogContent showCloseButton={false} className="flex items-center justify-center p-0 max-w-md w-full rounded-2xl max-h-[90vh] overflow-y-auto">
                <PersonCard person={selectedPerson} onClose={handleCloseCard} className="w-full" />
            </DialogContent>
          </Dialog>
        )}

        {/* Mobile bottom sheet for Location Analysis */}
        {isMobile && locationAnalysis && (
          <MobileLocationAnalysisSheet
            analysis={locationAnalysis}
            onClose={handleCloseLocationAnalysis}
            onRelocate={handleRelocate}
            onResetRelocation={handleResetRelocation}
            isRelocated={isRelocated}
            onLocalSpace={handleLocalSpace}
            onResetLocalSpace={handleResetLocalSpace}
            isLocalSpace={isLocalSpace}
          />
        )}

        {/* Mobile bottom sheet for Export Report Panel */}
        {isMobile && showExportPanel && (
          <MobileExportSheet
            planetaryLines={visiblePlanetaryLines}
            zenithPoints={visibleZenithPoints}
            birthDate={firstPersonData?.birthDate || 'Unknown'}
            birthTime={firstPersonData?.birthTime || 'Unknown'}
            birthLocation={firstPersonData?.locations?.find(l => l.type === 'birth')?.place || 'Unknown'}
            onClose={handleCloseExportPanel}
          />
        )}

        {/* Mobile bottom sheet for Line Info Card */}
        {isMobile && selectedLine && (
          <MobileLineInfoSheet
            line={selectedLine}
            onClose={handleCloseLineInfo}
            zenithPoint={selectedLineZenithPoint}
            onCityClick={handleCityClick}
          />
        )}

        {/* Mobile City Info Bottom Sheet */}
        {isMobile && selectedCityForInfo && (
          <MobileCityInfoSheet
            city={selectedCityForInfo}
            onClose={handleCloseCityInfo}
            onViewLocalSpace={handleViewLocalSpaceFromCity}
            isFavorite={isFavorite(selectedCityForInfo.lat, selectedCityForInfo.lng)}
            onToggleFavorite={handleToggleFavorite}
            locationAnalysis={selectedCityAnalysis}
            hasBirthData={!!birthData}
            onRelocate={handleRelocate}
          />
        )}

      </div>

      {/* Quick Birth Data Modal - shows when double-tapping with no birth data */}
      <QuickBirthDataModal
        open={birthDataFlow.showQuickBirthModal}
        onOpenChange={(open) => {
          if (!open) birthDataFlow.handleCancelQuickBirth();
        }}
        coordinates={birthDataFlow.pendingBirthCoords}
        onConfirm={handleQuickBirthDataConfirm}
        isMobile={isMobile}
        initialCity={birthDataFlow.initialCityForQuickModal}
      />

      {/* Birth Date/Time Modal - shows when selecting birthplace via search bar */}
      <BirthDateTimeModal
        open={birthDataFlow.showBirthDateTimeModal}
        onOpenChange={(open) => {
          if (!open) birthDataFlow.handleCancelBirthDateTime();
        }}
        birthplace={birthDataFlow.pendingBirthplace}
        onConfirm={handleBirthDateTimeConfirm}
        isMobile={isMobile}
      />

      {/* Partner Chart Modal - for adding/editing partner in compatibility mode */}
      <PartnerChartModal
        open={showPartnerModal}
        onOpenChange={setShowPartnerModal}
        onConfirm={handlePartnerChartSubmit}
        savedCharts={savedCharts.filter(c => c.id !== currentChart?.id)}
        existingPartner={compatibility.partnerChart}
        isMobile={isMobile}
      />

      {/* Compatibility Panel - Mobile: bottom sheet when compatibility is enabled */}
      {isMobile && compatibility.isEnabled && birthData && (
        <MobileCompatibilitySheet
          analysis={compatibility.analysis}
          mode={compatibility.mode}
          onModeChange={(mode) => {
            compatibility.setMode(mode);
            compatibility.clearAnalysis();
          }}
          onLocationZoom={handleCompatibilityLocationZoom}
          onLocationCityInfo={handleCompatibilityLocationCityInfo}
          onClose={handleCloseCompatibility}
          onEditPartner={handleEditPartner}
          onClearPartner={handleClearPartner}
          onSelectPartner={handleSelectPartnerFromChart}
          savedCharts={savedCharts.filter(c => c.id !== currentChart?.id)}
          currentPartnerId={compatibility.partnerChart?.id}
          isLoading={compatibility.isCalculating || partnerAstroLoading}
          person1Name={firstPersonData?.name || 'You'}
          person2Name={compatibility.partnerChart?.name}
        />
      )}

      {/* Mobile Scout Sheet - bottom sheet for Scout locations */}
      {isMobile && mobileScoutSheetOpen && birthData && (
        <MobileScoutSheet
          planetaryLines={astroResult?.planetaryLines ?? []}
          aspectLines={astroResult?.aspectLines ?? []}
          onCityClick={handleCityClick}
          onShowCountryMarkers={setScoutMarkers}
          onClose={() => {
            setScoutMarkers([]); // Clear markers when sheet closes
            setMobileScoutSheetOpen(false);
          }}
        />
      )}

      {/* Mobile Charts Sheet - bottom sheet for saved birth charts */}
      {isMobile && mobileChartsSheetOpen && (
        <MobileChartsSheet
          charts={savedCharts}
          currentChart={currentChart}
          loading={chartsLoading}
          onSelectChart={(id) => {
            selectChart(id);
            setMobileChartsSheetOpen(false);
          }}
          onDeleteChart={deleteChart}
          onUpdateChart={updateChart}
          onSetDefault={setDefaultChart}
          onCreateNew={() => {
            setMobileChartsSheetOpen(false);
            // User can double-tap on globe or use search bar to create a new chart
            toast.info('Double-tap on the globe or use the search bar to set your birth location');
          }}
          onClose={() => setMobileChartsSheetOpen(false)}
        />
      )}

      {/* Mobile Favorites Sheet - bottom sheet for favorite cities */}
      {isMobile && mobileFavoritesSheetOpen && (
        <MobileFavoritesSheet
          favorites={favorites}
          loading={favoritesLoading}
          onSelectFavorite={(lat, lng, name) => {
            navigation.focusOnLocation(lat, lng);
            setMobileFavoritesSheetOpen(false);
          }}
          onRemoveFavorite={(id, name) => {
            removeFavorite(id);
          }}
          onUpdateNotes={updateFavoriteNotes}
          onRemoveMultipleFavorites={removeMultipleFavorites}
          onClose={() => setMobileFavoritesSheetOpen(false)}
        />
      )}

      {/* Globe Location Tooltip - shows on single-click/tap */}
      <GlobeLocationTooltip
        x={clickTooltip.x}
        y={clickTooltip.y}
        lat={clickTooltip.lat}
        lng={clickTooltip.lng}
        cityName={clickTooltip.cityName}
        isVisible={clickTooltip.isVisible}
        onDismiss={handleDismissTooltip}
        hasBirthData={!!birthData}
      />

      {/* Globe Context Menu - shows on right-click (desktop) / long-press (mobile) */}
      <GlobeContextMenu
        x={contextMenu.x}
        y={contextMenu.y}
        lat={contextMenu.lat}
        lng={contextMenu.lng}
        cityName={contextMenu.cityName}
        isOpen={contextMenu.isOpen}
        onClose={handleCloseContextMenu}
        hasBirthData={!!birthData}
        onAnalyzeLocation={handleContextAnalyze}
        onRelocateHere={handleContextRelocate}
        onSetLocalOrigin={handleContextSetLocalOrigin}
        onAddToFavorites={handleContextAddToFavorites}
        onEnterBirthData={handleContextEnterBirthData}
        onAskAI={handleContextAskAI}
        isFavorited={isFavorite(contextMenu.lat, contextMenu.lng)}
      />
    </div>
  );
};

export default GlobePage;
