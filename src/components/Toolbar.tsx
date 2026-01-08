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
import { useAuth } from '@/hooks/useAuth-context';
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
import { useToolbarState, useUIStore } from '@/stores/uiStore';
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
    hasBirthData: hasBirthDataProp,
  } = props;

  // === UI State from Stores ===
  const { isLegendMinimized, isAIChatOpen, isBottomSheetOpen, toggleLegend, toggleAIChat } = useToolbarState();
  const setShowExportPanel = useUIStore((state) => state.setShowExportPanel);

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

  // === Panel Stack from Store (for favorites panel) ===
  const panelStack = usePanelStackActions();
  const handleOpenFavoritesPanelFromStore = useCallback(() => {
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

  // === Scout Panel Handler ===
  const handleOpenScoutPanel = useCallback(() => {
    // Check if scout panel is already open
    const hasScoutPanel = panelStack.stack.some(p => p.type === 'scout');
    if (!hasScoutPanel) {
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
          className="bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-4"
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
            className="w-10 h-10 rounded-full flex items-center justify-center text-slate-600 dark:text-slate-400 active:bg-slate-100 dark:active:bg-slate-800 transition-colors"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <a href="/" className="flex items-center gap-2 select-none" style={{ textDecoration: 'none' }}>
            <img src="/logo.png" alt="Astrocarto Logo" className="w-7 h-7" />
            <span className="font-semibold text-slate-800 dark:text-slate-200 text-base tracking-tight" style={{ fontFamily: 'Cinzel, serif' }}>astrocarto.app</span>
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
            <div className="bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 px-2">
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
                        : 'text-slate-600 dark:text-slate-400 active:text-amber-600 dark:active:text-amber-400'
                      : 'text-slate-300 dark:text-slate-600'
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
                          className="text-indigo-200 dark:text-indigo-900"
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
                        ? 'bg-indigo-400'
                        : mobileScoutSheetOpen
                          ? 'bg-indigo-500 active:bg-indigo-600'
                          : hasBirthData
                            ? 'bg-indigo-600 active:bg-indigo-700'
                            : 'bg-slate-400 active:bg-slate-500'
                    }`}>
                      <Telescope className={`w-7 h-7 text-white ${scoutProgress?.phase === 'computing' ? 'animate-pulse' : ''}`} />
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium tabular-nums ${
                    scoutProgress?.phase === 'computing'
                      ? 'text-amber-600 dark:text-amber-400'
                      : mobileScoutSheetOpen
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : hasBirthData
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-slate-500 dark:text-slate-400'
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
                        : 'text-slate-600 dark:text-slate-400 active:text-blue-600 dark:active:text-blue-400'
                      : 'text-slate-300 dark:text-slate-600'
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
  return (
    <div className="sticky top-0 z-30 h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/50 dark:border-slate-800 flex items-center justify-between px-4 md:px-6 shadow-sm">
      <div className="flex items-center gap-2" ref={leftSectionRef}>
        <h1 className="text-lg md:text-xl font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[120px] md:max-w-xs" title={treeName}>
          {treeName}
        </h1>
        <Button variant="ghost" size="icon" onClick={onRenameRequest} title="Rename Project">
          <Edit3 className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        </Button>
        <Separator orientation="vertical" className="h-6 ml-2" />
      </div>

      <div className="flex items-center gap-2">
        {/* Relocation Indicator - show when relocated from location pin analysis panel */}
        {isRelocated && onReturnToStandard && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800">
            <Navigation className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Relocated{relocationName ? `: ${relocationName}` : ''}
            </span>
            <Button
              onClick={onReturnToStandard}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-blue-600 hover:text-blue-700 hover:bg-blue-100 dark:text-blue-400 dark:hover:bg-blue-900/30"
            >
              <X className="w-3 h-3 mr-1" />
              Reset
            </Button>
          </div>
        )}

        {/* Local Space Mode Indicator - show when in local space mode */}
        {isLocalSpaceMode && onReturnToStandard && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-950/30 rounded-lg border border-purple-200 dark:border-purple-800">
            <Compass className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Local Space{localSpaceOriginName ? `: ${localSpaceOriginName}` : ''}
            </span>
            <Button
              onClick={onReturnToStandard}
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:text-purple-400 dark:hover:bg-purple-900/30"
            >
              <X className="w-3 h-3 mr-1" />
              Exit
            </Button>
          </div>
        )}

        {/* Clear Birth Data Button - only show when birth data or pending location exists */}
        {(hasBirthData || hasPendingBirthLocation) && !isLocalSpaceMode && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={() => {
                  if (hasPendingBirthLocation && onClearPendingBirth) {
                    onClearPendingBirth();
                  }
                  if (hasBirthData && onClearBirthData) {
                    onClearBirthData();
                  }
                }}
                variant="outline"
                size="sm"
                className="text-red-600 hover:text-red-700 border-red-200 hover:bg-red-50 dark:text-red-400 dark:border-red-800 dark:hover:bg-red-950/30"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {hasPendingBirthLocation && !hasBirthData ? 'Cancel' : 'Clear Birth Data'}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{hasPendingBirthLocation && !hasBirthData ? 'Cancel setting birth location' : 'Clear birth data and start over'}</p>
            </TooltipContent>
          </Tooltip>
        )}

        {/* Navigation Menu for More dropdown - only show when birth data exists */}
        {hasBirthData && (
          <NavigationMenu
            value={isMoreMenuOpen ? 'more' : ''}
            onValueChange={(value) => setIsMoreMenuOpen(value === 'more')}
          >
            <NavigationMenuList className="gap-1">
              {/* More Dropdown */}
              <NavigationMenuItem value="more">
                <NavigationMenuTrigger
                  onClick={() => setIsMoreMenuOpen(!isMoreMenuOpen)}
                  className="h-9 px-3 text-sm font-medium bg-transparent hover:bg-slate-100 dark:hover:bg-slate-800 data-[state=open]:bg-slate-100 dark:data-[state=open]:bg-slate-800"
                >
                  <LayoutGrid className="w-4 h-4 mr-2" />
                  More
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-56 p-2 space-y-1">
                    {/* Duo Mode Option */}
                    <button
                      onClick={() => {
                        console.log('[Toolbar Desktop] Duo button clicked', { hasPartnerChart, isCompatibilityEnabled });
                        if (!hasPartnerChart) {
                          console.log('[Toolbar Desktop] Opening partner modal');
                          onOpenPartnerModal();
                        } else {
                          console.log('[Toolbar Desktop] Toggling compatibility mode');
                          onToggleCompatibility();
                        }
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                        isCompatibilityEnabled
                          ? 'bg-pink-100 text-pink-700 dark:bg-pink-950/50 dark:text-pink-300'
                          : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {isCompatibilityCalculating ? (
                        <Loader2 className="w-4 h-4 animate-spin text-pink-500" />
                      ) : (
                        <Heart className={`w-4 h-4 ${isCompatibilityEnabled ? 'text-pink-500' : 'text-slate-500 dark:text-slate-400'}`} />
                      )}
                      <div className="flex-1 text-left">
                        <div className="font-medium">Duo Mode</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                          {isCompatibilityEnabled && partnerName
                            ? `Active with ${partnerName}`
                            : 'Compare with partner'}
                        </div>
                      </div>
                      {isCompatibilityEnabled && (
                        <div className="w-2 h-2 rounded-full bg-pink-500" />
                      )}
                    </button>

                    {/* Draw Zone Option */}
                    {onToggleZoneDrawing && (
                      <button
                        onClick={() => {
                          if (isDrawingZone) {
                            if (zoneDrawingPointsCount >= 3 && onCompleteZoneDrawing) {
                              onCompleteZoneDrawing();
                            } else {
                              onToggleZoneDrawing();
                            }
                          } else if (hasDrawnZone) {
                            if (onClearZone) {
                              onClearZone();
                            }
                          } else {
                            onToggleZoneDrawing();
                          }
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                          isDrawingZone || hasDrawnZone
                            ? 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950/50 dark:text-cyan-300'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        {isDrawingZone ? (
                          zoneDrawingPointsCount >= 3 ? <Check className="w-4 h-4 text-cyan-500" /> : <X className="w-4 h-4 text-slate-500" />
                        ) : hasDrawnZone ? (
                          <X className="w-4 h-4 text-cyan-500" />
                        ) : (
                          <Hexagon className={`w-4 h-4 text-slate-500 dark:text-slate-400`} />
                        )}
                        <div className="flex-1 text-left">
                          <div className="font-medium">
                            {isDrawingZone
                              ? zoneDrawingPointsCount >= 3
                                ? `Complete Zone (${zoneDrawingPointsCount} pts)`
                                : `Cancel Drawing (${zoneDrawingPointsCount} pts)`
                              : hasDrawnZone
                                ? 'Clear Zone'
                                : 'Draw Zone'}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {isDrawingZone ? 'Click globe to add points' : hasDrawnZone ? 'Remove current zone' : 'Analyze area influences'}
                          </div>
                        </div>
                      </button>
                    )}

                    {/* AI Guide Option */}
                    {onToggleAIChat && (
                      <button
                        onClick={onToggleAIChat}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors ${
                          isAIChatOpen
                            ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                      >
                        <Sparkles className={`w-4 h-4 ${isAIChatOpen ? 'text-amber-500' : 'text-slate-500 dark:text-slate-400'}`} />
                        <div className="flex-1 text-left">
                          <div className="font-medium">AI Guide</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            {isAIChatOpen ? 'Close assistant' : 'Astrology assistant'}
                          </div>
                        </div>
                        {isAIChatOpen && (
                          <div className="w-2 h-2 rounded-full bg-amber-500" />
                        )}
                      </button>
                    )}

                    {/* Export Report Option */}
                    {onOpenExport && (
                      <button
                        onClick={onOpenExport}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                      >
                        <FileDown className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Export Report</div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">Download PDF report</div>
                        </div>
                      </button>
                    )}

                    {/* Share Chart Option */}
                    <button
                      onClick={() => setShowAstroShareModal(true)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      <Share2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">Share Chart</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Create embeddable link</div>
                      </div>
                    </button>

                    {/* Scout Locations Option */}
                    <button
                      onClick={handleOpenScoutPanel}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300"
                    >
                      <Telescope className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">Scout Locations</div>
                        <div className="text-xs text-slate-500 dark:text-slate-400">Find best places by category</div>
                      </div>
                    </button>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>
            </NavigationMenuList>
          </NavigationMenu>
        )}

        {/* Original share button with cloud features - hidden for now */}
        {!HIDE_CLOUD_FEATURES && (
          <HoverCard>
            <HoverCardTrigger asChild>
              <Button onClick={isProjectPermanent ? handleShare : onUpgrade} variant="outline" size="icon" disabled={isGeneratingLink}>
                <Share2 className="w-4 h-4" />
              </Button>
            </HoverCardTrigger>
            <HoverCardContent className="w-80 z-[1000]">
              <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Share2 className="w-5 h-5 text-blue-600" />
                    <CardTitle>Share Your Project</CardTitle>
                  </div>
                  <CardDescription>
                    {isProjectPermanent
                      ? "Generate a unique, view-only link to share your family tree with others. They won't be able to make any changes."
                      : "Upgrade to a permanent project to unlock sharing capabilities."}
                  </CardDescription>
                </CardHeader>
                {!isProjectPermanent && (
                  <CardContent>
                     <Button
                      onClick={onUpgrade}
                      className="w-full bg-green-600 hover:bg-green-700"
                    >
                     Upgrade to Share
                    </Button>
                  </CardContent>
                )}
              </Card>
            </HoverCardContent>
          </HoverCard>
        )}
        
        {/* Save to Cloud button - hidden for now */}
        {!HIDE_CLOUD_FEATURES && !isProjectPermanent && (
            <HoverCard>
              <HoverCardTrigger asChild>
                <Button
                  onMouseEnter={fetchPrice}
                  onClick={onUpgrade}
                  variant="outline"
                  className="hidden md:flex items-center gap-2 border-yellow-300 text-yellow-700 hover:bg-yellow-50 dark:text-yellow-400 dark:border-yellow-600 dark:hover:bg-yellow-900/20"
                >
                  <Crown className="w-4 h-4" />
                  Save to Cloud
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-80 z-[999]">
                <Card className="border-2 border-blue-500 bg-blue-50 dark:bg-blue-950/30">
                  <CardHeader className="pb-4">
                    <div className="flex items-center gap-2">
                      <Trees className="w-5 h-5 text-green-600" />
                      <CardTitle className="text-lg">Permanent Project</CardTitle>
                    </div>
                    <CardDescription>One-time payment for unlimited edits and cloud storage.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-3xl font-bold text-green-600 dark:text-green-500">
                      {isFetchingPrice ? '...' : price}
                    </div>
                    <div className="text-sm text-slate-600 dark:text-slate-400">One-time payment</div>

                    <ul className="space-y-2">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Save one complete family tree permanently</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Unlimited cloud backup for this project</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-green-500" />
                        <span className="text-sm">Peace of mind for your hard work</span>
                      </li>
                    </ul>

                  <Button
                    onClick={onUpgrade}
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={isFetchingPrice || !price}
                  >
                    {isFetchingPrice ? 'Processing...' : `Pay ${price} for Cloud Storage`}
                  </Button>
                  </CardContent>
                </Card>
              </HoverCardContent>
            </HoverCard>
        )}
        
        {/* Delete buttons - hidden for now */}
        {!HIDE_CLOUD_FEATURES && (selectedNodeId && !isPersonDialogOpen ? (
          // Delete Single Node Dialog
          <AlertDialog open={showDeleteNodeConfirm} onOpenChange={setShowDeleteNodeConfirm}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50 dark:text-red-500 dark:border-red-700 dark:hover:bg-red-900/20 hidden md:inline-flex"
                title="Delete Selected Node"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Node?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this node? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => {
                    if (selectedNodeId) {
                      onDeleteNodeConfirmed(selectedNodeId);
                    }
                    setShowDeleteNodeConfirm(false);
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Delete Node
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          // Clear All Project Data Dialog
          <AlertDialog open={showClearConfirm} onOpenChange={setShowClearConfirm}>
            <AlertDialogTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50 dark:text-red-500 dark:border-red-700 dark:hover:bg-red-900/20 hidden md:inline-flex"
                title="Clear All Data"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Clear Entire Project?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all data for the
                  project named <strong className="text-red-500">{treeName}</strong>. Please type the project name to confirm.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <Input
              type="text"
              value={confirmProjectName}
              onChange={(e) => setConfirmProjectName(e.target.value)}
              placeholder="Type project name to confirm"
              className="my-2"
            />
            {confirmationError && <p className="text-sm text-red-500 my-1">{confirmationError}</p>}
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => { setConfirmProjectName(""); setConfirmationError(null); setShowClearConfirm(false); }}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (confirmProjectName === treeName) {
                    onClearAllDataRequest();
                    setConfirmProjectName("");
                    setConfirmationError(null);
                    setShowClearConfirm(false); // Close dialog on success
                  } else {
                    setConfirmationError("Project name does not match. Please try again.");
                    setConfirmProjectName(""); // Reset input
                  }
                }}
                disabled={confirmProjectName !== treeName}
                className={confirmProjectName !== treeName ? "bg-red-300 cursor-not-allowed" : "bg-red-600 hover:bg-red-700"}
              >
                Delete Project Data
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        ))}

        {/* Project Management button - hidden for now */}
        {!HIDE_CLOUD_FEATURES && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                onClick={onNewProject}
                variant="outline"
                size="icon"
                title="Project Management"
                className="inline-flex"
              >
                <FolderPlus className="w-4 h-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Project Management</p>
            </TooltipContent>
          </Tooltip>
        )}
        <ThemeToggle />
        {/* Account Menu */}
        <AccountMenu onOpenChartPicker={onOpenChartPicker} onFavoriteSelect={onFavoriteSelect} onOpenFavoritesPanel={handleOpenFavoritesPanelFromStore} />
      </div>

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
    </div>
  );
};
