import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Separator } from '@/components/ui/separator';
import { Plus, LogIn, LogOut, Crown, Edit3, FolderPlus, Trash2, Share2, Download, Upload, Users, Sparkles, Settings, Moon, Sun, SlidersHorizontal, FileDown, MapPin, User, Hexagon, X, Check, CircleUserRound, MessageSquare, Compass, Heart, Loader2, CircleDot, LayoutGrid, Navigation, Telescope, Menu } from 'lucide-react';
import { MobileDrawerMenu } from './MobileDrawerMenu';
import { AccountMenu } from './AccountMenu';
import { LeftActionBar } from './LeftActionBar';
import { useAuth } from '@/hooks/useAuth-context';
import { useIsRealUser } from '@/stores/authStore';
import { ThemeToggle } from './ThemeToggle';
import { useTheme } from 'next-themes';
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Trees } from 'lucide-react';
import { ShareModal } from './ShareModal';
import { useIsMobile } from '@/hooks/use-mobile';
import { useFavoriteCities } from '@/hooks/useFavoriteCities';
import type { Node, Edge } from '@stubs/xyflow';
import type { PersonData, FamilyEdgeData } from '@/types/familyTree';
import { downloadFile, nodesEdgesToGedcom } from '@/lib/utils/export';

// Zustand stores for state management
import { useToolbarState, useUIStore, useSubscriptionModal } from '@/stores/uiStore';
import { SubscriptionModal } from './SubscriptionModal';
import { useZoneState, usePendingBirthCoords, useGlobeInteractionStore, usePanelStackActions, useScoutProgress } from '@/stores/globeInteractionStore';
import { useShallow } from 'zustand/react/shallow';

// Mobile drawer state selector - use useShallow to prevent infinite loops
const useMobileDrawerState = () => useGlobeInteractionStore(useShallow((state) => ({
  mobileDrawerOpen: state.mobileDrawerOpen,
  setMobileDrawerOpen: state.setMobileDrawerOpen,
  mobileScoutSheetOpen: state.mobileScoutSheetOpen,
  setMobileScoutSheetOpen: state.setMobileScoutSheetOpen,
  toggleMobileScoutSheet: state.toggleMobileScoutSheet,
  mobileSheetMaximized: state.mobileSheetMaximized,
})));
import { useCompatibilityStateForToolbar } from '@/stores/compatibilityStore';
import { useNatalChartResult } from '@/stores/natalChartStore';
import { useAstroModeState, useHasBirthData } from '@/stores/astroStore';

// Feature flag to hide cloud/auth features for now (set to false to re-enable)
const HIDE_CLOUD_FEATURES = true;
const APP_URL = 'https://astrocarto.app';

/**
 * ToolbarProps - Simplified interface using Zustand stores for UI state
 *
 * Most UI state now comes from stores:
 * - Zone drawing: useZoneState() from globeInteractionStore
 * - AI chat, legend: useToolbarState() from uiStore
 * - Compatibility: useCompatibilityStateForToolbar() from compatibilityStore
 * - Natal chart widget: globeInteractionStore (minimized state)
 * - Natal chart data: useNatalChartResult() from natalChartStore
 * - Local space mode: useAstroModeState() from astroStore
 * - Pending birth location: usePendingBirthCoords() from globeInteractionStore
 */
interface ToolbarProps {
  // === Project Data (still needed as props) ===
  treeName: string;
  familyTreeId: string | null;
  isProjectPermanent: boolean;
  nodes: Node<PersonData>[];
  edges: Edge<FamilyEdgeData>[];
  selectedNodeId: string | null;
  isPersonDialogOpen: boolean;

  // === Action Callbacks (still needed as props) ===
  onAddPerson: () => void;
  onUpgrade: () => void;
  onSignIn: () => void;
  onRenameRequest: () => void;
  onNewProject: () => void;
  onClearAllDataRequest: () => void;
  onDeleteNodeConfirmed: (nodeId: string) => void;
  onImportFamilyTree: (treeData: { nodes: Node<PersonData>[]; edges: Edge<FamilyEdgeData>[] }) => void;
  onClearBirthData?: () => void;
  onOpenChartPicker?: () => void;
  onFavoriteSelect?: (lat: number, lng: number, name: string) => void;
  onOpenFavoritesPanel?: () => void;

  // === Charts quick access ===
  charts?: { id: string; name: string }[];
  currentChartId?: string | null;
  onSelectChart?: (id: string) => void;

  // === Optional overrides (can be used if not using stores) ===
  hasBirthData?: boolean;
}

export const Toolbar: React.FC<ToolbarProps> = (props) => {
  // === Destructure remaining props ===
  const {
    treeName,
    familyTreeId,
    isProjectPermanent,
    nodes,
    edges,
    selectedNodeId,
    isPersonDialogOpen,
    onAddPerson,
    onUpgrade,
    onSignIn,
    onRenameRequest,
    onNewProject,
    onClearAllDataRequest,
    onDeleteNodeConfirmed,
    onImportFamilyTree,
    onClearBirthData,
    onOpenChartPicker,
    onFavoriteSelect,
    onOpenFavoritesPanel,
    charts,
    currentChartId,
    onSelectChart,
    hasBirthData: hasBirthDataProp,
  } = props;

  // === UI State from Stores ===
  const { isLegendMinimized, isAIChatOpen, isBottomSheetOpen, toggleLegend, toggleAIChat } = useToolbarState();
  const setShowExportPanel = useUIStore((state) => state.setShowExportPanel);
  const { setIsOpen: setSubscriptionModalOpen } = useSubscriptionModal();

  // === Zone Drawing from Store ===
  const zoneState = useZoneState();
  const {
    isDrawing: isDrawingZone,
    hasZone: hasDrawnZone,
    pointsCount: zoneDrawingPointsCount,
    toggleDrawing: onToggleZoneDrawing,
    completeDrawing: onCompleteZoneDrawing,
    clearZone: onClearZone,
  } = zoneState;

  // === Pending Birth Location from Store ===
  const pendingBirthCoords = usePendingBirthCoords();
  const hasPendingBirthLocation = pendingBirthCoords !== null;
  const clearPendingBirthLocation = useGlobeInteractionStore((state) => state.clearPendingBirthLocation);

  // === Astro Mode from Store ===
  const astroModeState = useAstroModeState();
  const { isLocalSpace: isLocalSpaceMode, localSpaceOrigin, isRelocated, relocationTarget, returnToStandard: onReturnToStandard } = astroModeState;
  const localSpaceOriginName = localSpaceOrigin?.name;
  const relocationName = relocationTarget?.name;

  // === Compatibility from Store ===
  const compatibilityState = useCompatibilityStateForToolbar();
  const {
    isEnabled: isCompatibilityEnabled,
    hasPartner: hasPartnerChart,
    partnerName,
    isCalculating: isCompatibilityCalculating,
    toggle: onToggleCompatibility,
    openPartnerModal: onOpenPartnerModal,
  } = compatibilityState;

  // === Natal Chart from Store ===
  // Widget state from globeInteractionStore (synced with GlobePage)
  const natalChartMinimized = useGlobeInteractionStore((s) => s.natalChartMinimized);
  const toggleNatalChart = useGlobeInteractionStore((s) => s.toggleNatalChart);
  // Data from natalChartStore
  const natalChartResult = useNatalChartResult();
  const isNatalChartOpen = !natalChartMinimized;
  const hasNatalChartData = natalChartResult !== null;
  const onToggleNatalChart = toggleNatalChart;

  // === Birth Data - prefer store, fallback to prop ===
  const hasBirthDataFromStore = useHasBirthData();
  const hasBirthData = hasBirthDataProp !== undefined ? hasBirthDataProp : hasBirthDataFromStore;

  // === Panel Stack from Store (for favorites and charts panels) ===
  const panelStack = usePanelStackActions();
  const handleOpenFavoritesPanelFromStore = useCallback(() => {
    // Check if favorites panel is already open
    const existingIndex = panelStack.stack.findIndex(p => p.type === 'favorites');
    if (existingIndex >= 0) {
      // Bring to front by setting current index
      panelStack.setCurrentIndex(existingIndex);
    } else {
      panelStack.push({
        type: 'favorites',
        title: 'Favorites',
        data: null,
      });
    }
  }, [panelStack]);

  // Handler to open charts panel (desktop) - opens in right panel stack
  const handleOpenChartsPanelFromStore = useCallback((options?: { showCreateForm?: boolean }) => {
    // Check if charts panel is already open
    const existingIndex = panelStack.stack.findIndex(p => p.type === 'charts');
    if (existingIndex >= 0) {
      // Bring to front by setting current index
      panelStack.setCurrentIndex(existingIndex);
    } else {
      panelStack.push({
        type: 'charts',
        title: 'My Charts',
        data: options?.showCreateForm ? { showCreateForm: true } : null,
      });
    }
  }, [panelStack]);

  // Handler to open charts panel with create form visible
  const handleAddChartFromStore = useCallback(() => {
    handleOpenChartsPanelFromStore({ showCreateForm: true });
  }, [handleOpenChartsPanelFromStore]);

  // === Scout Panel Handler ===
  const handleOpenScoutPanel = useCallback(() => {
    // Check if scout panel is already open
    const existingIndex = panelStack.stack.findIndex(p => p.type === 'scout');
    if (existingIndex >= 0) {
      // Bring to front by setting current index
      panelStack.setCurrentIndex(existingIndex);
    } else {
      panelStack.push({
        type: 'scout',
        title: 'Scout Locations',
        data: null,
      });
    }
  }, [panelStack]);

  // === Derived Values ===
  const hideBottomNav = isBottomSheetOpen;
  const onOpenExport = () => setShowExportPanel(true);
  const onToggleLegend = toggleLegend;
  const onToggleAIChat = toggleAIChat;
  const onClearPendingBirth = clearPendingBirthLocation;
  const { user, signOut } = useAuth();
  const isRealUser = useIsRealUser();
  const { theme, setTheme } = useTheme();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showAstroShareModal, setShowAstroShareModal] = useState(false);
  const [shareUrl, setShareUrl] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);
  const [confirmProjectName, setConfirmProjectName] = useState("");
  const [confirmationError, setConfirmationError] = useState<string | null>(null);
  const [showDeleteNodeConfirm, setShowDeleteNodeConfirm] = useState(false);
  const [price, setPrice] = useState<string | null>(null);
  const [isFetchingPrice, setIsFetchingPrice] = useState(false);
  const isMobile = useIsMobile();
  // Install banner is completely disabled - install only via navbar button or drawer
  const isBannerShowing = false;
  const { favorites } = useFavoriteCities();
  const [showLogoImageOnly, setShowLogoImageOnly] = useState(false);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);

  // Mobile drawer state
  const {
    mobileDrawerOpen,
    setMobileDrawerOpen,
    mobileScoutSheetOpen,
    setMobileScoutSheetOpen,
    toggleMobileScoutSheet,
    mobileSheetMaximized,
  } = useMobileDrawerState();
  const scoutProgress = useScoutProgress();
  const leftSectionRef = useRef<HTMLDivElement>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isMobile) return;
    const handleResize = () => {
      if (leftSectionRef.current) {
        const width = leftSectionRef.current.offsetWidth;
        setShowLogoImageOnly(width < 120);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isMobile]);

  const fetchPrice = async () => {
    if (price) return;
    setIsFetchingPrice(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-price');
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      
      const { amount, currency } = data;
      const getLocaleForCurrency = (currency: string) => {
        const currencyLocaleMap: { [key: string]: string } = {
          USD: 'en-US',
          GBP: 'en-GB',
          EUR: 'de-DE',
          INR: 'en-IN',
        };
        return currencyLocaleMap[currency.toUpperCase()] || 'en-US';
      }
      const formattedPrice = new Intl.NumberFormat(getLocaleForCurrency(currency), {
        style: 'currency',
        currency: currency,
      }).format(amount / 100);
      setPrice(formattedPrice);
    } catch (error: unknown) {
      console.error('Error fetching price:', error);
      if (error instanceof Error) {
        toast.error(error.message || 'Failed to fetch price');
      } else {
        toast.error('Failed to fetch price');
      }
      setPrice('$9.99'); // Fallback
    } finally {
      setIsFetchingPrice(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  const handleShare = async () => {
    if (!familyTreeId) {
      toast.error("No project selected to share.");
      return;
    }
    setIsGeneratingLink(true);

    const headers: { [key: string]: string } = {};
    if (!user) {
      const guestToken = localStorage.getItem(`guest_access_token_${familyTreeId}`);
      if (guestToken) {
        headers['X-Guest-Access-Token'] = guestToken;
      }
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-share-link', {
        body: { family_tree_id: familyTreeId },
        headers,
      });

      if (error) throw new Error(error.message);
      if (data.error) throw new Error(data.error);
      
      setShareUrl(data.shareUrl);
      setShowShareModal(true);
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message || "Failed to generate share link.");
      } else {
        toast.error("Failed to generate share link.");
      }
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleExportFam = () => {
    const famData = JSON.stringify({ nodes, edges }, null, 2);
    downloadFile('family-tree.fam', famData, 'application/json');
  };

  const handleExportGedcom = () => {
    const gedcom = nodesEdgesToGedcom(nodes, edges);
    downloadFile('family-tree.ged', gedcom, 'text/plain');
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split('.').pop()?.toLowerCase();
    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result as string;
      if (ext === 'fam' || ext === 'json') {
        try {
          const data = JSON.parse(content);
          if (data.nodes && data.edges) {
            onImportFamilyTree({ nodes: data.nodes, edges: data.edges });
          } else {
            toast.error('Invalid .fam file format.');
          }
        } catch (err) {
          toast.error('Failed to parse .fam file.');
        }
      } else if (ext === 'ged' || ext === 'gedcom' || ext === 'txt') {
        // Minimal GEDCOM import: just pass to onImportFamilyTree if a parser exists
        // Here, you would use your existing GEDCOM parser (not implemented inline)
        toast.error('GEDCOM import not implemented inline. Use the main import dialog.');
      } else {
        toast.error('Unsupported file type.');
      }
    };
    reader.readAsText(file);
  };

  // Mobile bottom nav bar
  if (isMobile) {
    // Hide entire toolbar when a bottom sheet is maximized
    if (mobileSheetMaximized) {
      return null;
    }

    return (
      <>
        {/* Minimal top bar for mobile - logo and share button */}
        <div
          className="bg-white dark:bg-zinc-800 border-b border-slate-200 dark:border-white/10 flex items-center justify-between px-4"
          style={{
            position: 'fixed',
            top: isBannerShowing ? '56px' : '0px',
            left: 0,
            right: 0,
            width: '100vw',
            minHeight: '56px',
            paddingTop: 'env(safe-area-inset-top, 0.5rem)',
            paddingBottom: '0.5rem',
            zIndex: 101,
          }}
        >
          {/* Left side: Hamburger menu to open drawer */}
          <button
            onClick={() => setMobileDrawerOpen(true)}
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-zinc-400 active:bg-slate-100 dark:active:bg-white/10 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <a href="/" className="flex items-center gap-2 select-none" style={{ textDecoration: 'none' }}>
            <img src="/logo.png" alt="Astrocarto Logo" className="w-7 h-7" />
            <span className="font-semibold text-slate-800 dark:text-zinc-200 text-base tracking-tight" style={{ fontFamily: 'Cinzel, serif' }}>astrocarto.app</span>
          </a>
          {/* Account Menu - simplified on mobile (charts/favorites in drawer) */}
          <AccountMenu isMobile />
        </div>

        {/* Fixed bottom navigation - hidden when bottom sheets are open */}
        {!hideBottomNav && (
          <div
            className="fixed bottom-0 left-0 right-0 z-50"
            style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
          >
            {/* Main Bottom Navigation - 3 tabs: AI | Scout (fab) | Filter */}
            <div className="bg-white/95 dark:bg-zinc-800 backdrop-blur-md border-t border-slate-200 dark:border-white/10 px-2">
              <div className="flex items-center justify-around h-16">
                {/* AI Chat Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    if (!hasBirthData) {
                      toast.info('Enter birth data first to use AI assistant');
                      return;
                    }
                    if (onToggleAIChat) onToggleAIChat();
                  }}
                  className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
                    hasBirthData
                      ? isAIChatOpen
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-slate-600 dark:text-zinc-400 active:text-amber-600 dark:active:text-amber-400'
                      : 'text-slate-300 dark:text-zinc-600'
                  }`}
                >
                  <MessageSquare className="w-5 h-5" />
                  <span className="text-[10px] font-medium">AI</span>
                </button>

                {/* Main action: Scout (fab) - opens Scout sheet on mobile */}
                {/* Shows circular progress when scouting, disabled during computation */}
                <button
                  type="button"
                  onClick={() => {
                    // Disabled while scouting
                    if (scoutProgress && scoutProgress.phase === 'computing') {
                      return;
                    }
                    if (!hasBirthData) {
                      toast.info('Use the search bar to enter your birthplace', { duration: 4000 });
                      return;
                    }
                    // Toggle the mobile scout sheet
                    toggleMobileScoutSheet();
                  }}
                  className="flex flex-col items-center justify-center gap-1 px-3 py-2 -mt-4"
                  disabled={scoutProgress?.phase === 'computing'}
                >
                  <div className="relative">
                    {/* Circular progress ring when scouting */}
                    {scoutProgress && scoutProgress.phase === 'computing' && (
                      <svg
                        className="absolute -inset-1 w-16 h-16"
                        viewBox="0 0 64 64"
                      >
                        {/* Background circle */}
                        <circle
                          cx="32"
                          cy="32"
                          r="29"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          className="text-amber-200 dark:text-amber-900"
                        />
                        {/* Progress circle */}
                        <circle
                          cx="32"
                          cy="32"
                          r="29"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                          className="text-amber-500"
                          strokeDasharray={`${2 * Math.PI * 29}`}
                          strokeDashoffset={`${2 * Math.PI * 29 * (1 - scoutProgress.percent / 100)}`}
                          transform="rotate(-90 32 32)"
                          style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
                        />
                      </svg>
                    )}
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-colors ${
                      scoutProgress?.phase === 'computing'
                        ? 'bg-amber-400'
                        : mobileScoutSheetOpen
                          ? 'bg-amber-500 active:bg-amber-600'
                          : hasBirthData
                            ? 'bg-amber-600 active:bg-amber-700'
                            : 'bg-slate-400 active:bg-slate-500'
                    }`}>
                      <Telescope className={`w-7 h-7 text-white ${scoutProgress?.phase === 'computing' ? 'animate-pulse' : ''}`} />
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium tabular-nums ${
                    scoutProgress?.phase === 'computing'
                      ? 'text-amber-600 dark:text-amber-400'
                      : mobileScoutSheetOpen
                        ? 'text-amber-600 dark:text-amber-400'
                        : hasBirthData
                          ? 'text-amber-600 dark:text-amber-400'
                          : 'text-slate-500 dark:text-zinc-400'
                  }`}>
                    {scoutProgress?.phase === 'computing' ? `${Math.round(scoutProgress.percent)}%` : 'Scout'}
                  </span>
                </button>

                {/* Filters/Legend Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    if (hasBirthData && onToggleLegend) {
                      onToggleLegend();
                    } else if (!hasBirthData) {
                      toast.info('Enter your birthplace in the search bar first');
                    }
                  }}
                  className={`flex flex-col items-center justify-center gap-1 px-4 py-2 transition-colors ${
                    hasBirthData
                      ? !isLegendMinimized
                        ? 'text-blue-600 dark:text-blue-400'
                        : 'text-slate-600 dark:text-zinc-400 active:text-blue-600 dark:active:text-blue-400'
                      : 'text-slate-300 dark:text-zinc-600'
                  }`}
                >
                  <SlidersHorizontal className="w-5 h-5" />
                  <span className="text-[10px] font-medium">Filter</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Drawer Menu */}
        <MobileDrawerMenu
          isOpen={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          hasBirthData={hasBirthData}
          onClearBirthData={onClearBirthData}
          hasPendingBirthLocation={hasPendingBirthLocation}
          onClearPendingBirth={onClearPendingBirth}
          hasNatalChartData={hasNatalChartData}
          isNatalChartOpen={isNatalChartOpen}
          onToggleNatalChart={onToggleNatalChart}
          isDrawingZone={isDrawingZone}
          hasDrawnZone={hasDrawnZone}
          zoneDrawingPointsCount={zoneDrawingPointsCount}
          onToggleZoneDrawing={onToggleZoneDrawing}
          onCompleteZoneDrawing={onCompleteZoneDrawing}
          onClearZone={onClearZone}
          onOpenChartPicker={onOpenChartPicker}
          onOpenFavoritesPanel={handleOpenFavoritesPanelFromStore}
          favoritesCount={favorites?.length ?? 0}
          onOpenExport={onOpenExport}
          onOpenShareChart={() => setShowAstroShareModal(true)}
          isCompatibilityEnabled={isCompatibilityEnabled}
          isCompatibilityCalculating={isCompatibilityCalculating}
          hasPartnerChart={hasPartnerChart}
          onToggleCompatibility={onToggleCompatibility}
          onOpenPartnerModal={onOpenPartnerModal}
          theme={theme}
          onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        />

        {/* Share Modal */}
        <AlertDialog open={showShareModal} onOpenChange={setShowShareModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Share View-Only Link</AlertDialogTitle>
              <AlertDialogDescription>
                Anyone with this link can view the family tree, but they cannot make any edits.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Input
              readOnly
              value={shareUrl}
              className="my-2"
            />
            <AlertDialogFooter>
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(shareUrl);
                  toast.success("Link copied to clipboard!");
                }}
              >
                Copy Link
              </Button>
              <AlertDialogCancel>Close</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Astro Chart Share Modal */}
        <ShareModal
          open={showAstroShareModal}
          onOpenChange={setShowAstroShareModal}
        />
      </>
    );
  }

  // Desktop toolbar
  // Hide left action bar when birth chart or filters panel is open
  const showLeftActionBar = isLegendMinimized && !isNatalChartOpen;

  return (
    <>
      {/* Left Action Bar - vertical sidebar (hidden when birth chart or filters open) */}
      {showLeftActionBar && (
      <LeftActionBar
        hasBirthData={hasBirthData}
        hasPendingBirthLocation={hasPendingBirthLocation}
        onClearBirthData={onClearBirthData}
        onClearPendingBirth={onClearPendingBirth}
        charts={charts}
        currentChartId={currentChartId}
        onSelectChart={onSelectChart}
        onOpenChartPicker={handleOpenChartsPanelFromStore}
        onAddChart={handleAddChartFromStore}
        favorites={favorites}
        onOpenFavoritesPanel={handleOpenFavoritesPanelFromStore}
        onFavoriteSelect={onFavoriteSelect}
        isAIChatOpen={isAIChatOpen}
        onToggleAIChat={onToggleAIChat}
        isCompatibilityEnabled={isCompatibilityEnabled}
        isCompatibilityCalculating={isCompatibilityCalculating}
        hasPartnerChart={hasPartnerChart}
        partnerName={partnerName}
        onToggleCompatibility={onToggleCompatibility}
        onOpenPartnerModal={onOpenPartnerModal}
        isDrawingZone={isDrawingZone}
        hasDrawnZone={hasDrawnZone}
        zoneDrawingPointsCount={zoneDrawingPointsCount}
        onToggleZoneDrawing={onToggleZoneDrawing}
        onCompleteZoneDrawing={onCompleteZoneDrawing}
        onClearZone={onClearZone}
        onOpenExport={onOpenExport}
        onOpenShareChart={() => setShowAstroShareModal(true)}
        onOpenScoutPanel={handleOpenScoutPanel}
        onToggleFilters={onToggleLegend}
        isLocalSpaceMode={isLocalSpaceMode}
        localSpaceOriginName={localSpaceOriginName}
        isRelocated={isRelocated}
        relocationName={relocationName}
        onReturnToStandard={onReturnToStandard}
      />
      )}

      {/* Top toolbar - simplified */}
      <div className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-[#0a0a0f] backdrop-blur-md border-b border-slate-200/50 dark:border-white/10 flex items-center justify-between px-4 md:px-6 shadow-sm">
        {/* Left: Logo and chart name */}
        <div className="flex items-center gap-3">
          <a href="/" className="flex items-center gap-2 select-none" style={{ textDecoration: 'none' }}>
            <img src="/logo.png" alt="Astrocarto Logo" className="w-7 h-7" />
            {/* Show brand name when no birth data */}
            {!hasBirthData && (
              <span className="text-lg font-semibold text-slate-800 dark:text-zinc-200 tracking-wide uppercase">
                Astrocarto
              </span>
            )}
          </a>

          {/* Chart name - shows when birth data exists */}
          {hasBirthData && (
            <div className="flex items-center gap-1">
              <h1
                className="text-lg md:text-xl font-semibold text-slate-800 dark:text-zinc-200 truncate max-w-[160px] md:max-w-xs"
                title={treeName}
              >
                {treeName}
              </h1>
              <Button
                variant="ghost"
                size="icon"
                onClick={onRenameRequest}
                title="Rename Chart"
                className="h-8 w-8"
              >
                <Edit3 className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
              </Button>
            </div>
          )}
        </div>

        {/* Right: Scout Progress, Upgrade, Theme, Account */}
        <div className="flex items-center gap-2">
          {/* Scout Progress Indicator - shows when computing, click to open scout panel */}
          {scoutProgress?.phase === 'computing' && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleOpenScoutPanel}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-100 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors cursor-pointer"
                >
                  <div className="relative w-5 h-5">
                    <svg className="w-5 h-5 -rotate-90" viewBox="0 0 20 20">
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        className="text-amber-200 dark:text-amber-900"
                      />
                      <circle
                        cx="10"
                        cy="10"
                        r="8"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        className="text-amber-500"
                        strokeDasharray={`${2 * Math.PI * 8}`}
                        strokeDashoffset={`${2 * Math.PI * 8 * (1 - scoutProgress.percent / 100)}`}
                        style={{ transition: 'stroke-dashoffset 0.3s ease-out' }}
                      />
                    </svg>
                    <Telescope className="absolute inset-0 w-3 h-3 m-auto text-amber-600 dark:text-amber-400" />
                  </div>
                  <span className="text-xs font-medium text-amber-700 dark:text-amber-300 tabular-nums">
                    {Math.round(scoutProgress.percent)}%
                  </span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Click to open Scout panel</p>
              </TooltipContent>
            </Tooltip>
          )}

          {/* Upgrade Button - only show when logged in */}
          {isRealUser && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={() => setSubscriptionModalOpen(true)}
                  className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Crown className="w-4 h-4" />
                  Upgrade
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>View subscription plans</p>
              </TooltipContent>
            </Tooltip>
          )}

          <ThemeToggle />

          {/* Account Menu */}
          <AccountMenu onOpenChartPicker={handleOpenChartsPanelFromStore} onFavoriteSelect={onFavoriteSelect} onOpenFavoritesPanel={handleOpenFavoritesPanelFromStore} />
        </div>
      </div>

      {/* Subscription Modal */}
      <SubscriptionModal />

      {/* Astro Chart Share Modal */}
      <ShareModal
        open={showAstroShareModal}
        onOpenChange={setShowAstroShareModal}
      />
    </>
  );
};
