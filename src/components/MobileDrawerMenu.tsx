/**
 * MobileDrawerMenu - Slide-out drawer menu for mobile
 *
 * Contains all the tool options that were previously in the bottom nav "More" menu:
 * - Clear Birth Data
 * - Birth Chart Widget toggle
 * - Draw Zone toggle
 * - Saved Charts picker
 * - Favorite Cities
 * - Export Report
 * - Duo Mode toggle
 * - Theme toggle
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Trash2,
  CircleDot,
  Hexagon,
  CircleUserRound,
  FileDown,
  Heart,
  Check,
  Loader2,
  MapPin,
  Sun,
  Moon,
  Download,
  Share,
  Plus,
  Crown,
} from 'lucide-react';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';
import { useSubscriptionModal } from '@/stores/uiStore';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { Button } from '@/components/ui/button';

interface MobileDrawerMenuProps {
  isOpen: boolean;
  onClose: () => void;
  // Birth data
  hasBirthData: boolean;
  onClearBirthData?: () => void;
  // Pending birth location
  hasPendingBirthLocation?: boolean;
  onClearPendingBirth?: () => void;
  // Birth chart widget
  hasNatalChartData: boolean;
  isNatalChartOpen: boolean;
  onToggleNatalChart?: () => void;
  // Zone drawing
  isDrawingZone: boolean;
  hasDrawnZone: boolean;
  zoneDrawingPointsCount: number;
  onToggleZoneDrawing?: () => void;
  onCompleteZoneDrawing?: () => void;
  onClearZone?: () => void;
  // Saved charts
  onOpenChartPicker?: () => void;
  // Favorites
  onOpenFavoritesPanel?: () => void;
  favoritesCount?: number;
  // Export
  onOpenExport?: () => void;
  // Share Chart
  onOpenShareChart?: () => void;
  // Duo mode (compatibility)
  isCompatibilityEnabled: boolean;
  isCompatibilityCalculating: boolean;
  hasPartnerChart: boolean;
  onToggleCompatibility: () => void;
  onOpenPartnerModal: () => void;
  // Theme
  theme?: string;
  onToggleTheme?: () => void;
}

export const MobileDrawerMenu: React.FC<MobileDrawerMenuProps> = ({
  isOpen,
  onClose,
  hasBirthData,
  onClearBirthData,
  hasPendingBirthLocation,
  onClearPendingBirth,
  hasNatalChartData,
  isNatalChartOpen,
  onToggleNatalChart,
  isDrawingZone,
  hasDrawnZone,
  zoneDrawingPointsCount,
  onToggleZoneDrawing,
  onCompleteZoneDrawing,
  onClearZone,
  onOpenChartPicker,
  onOpenFavoritesPanel,
  favoritesCount = 0,
  onOpenExport,
  onOpenShareChart,
  isCompatibilityEnabled,
  isCompatibilityCalculating,
  hasPartnerChart,
  onToggleCompatibility,
  onOpenPartnerModal,
  theme,
  onToggleTheme,
}) => {
  // Store actions for mobile sheets
  const setMobileChartsSheetOpen = useGlobeInteractionStore((s) => s.setMobileChartsSheetOpen);
  const setMobileFavoritesSheetOpen = useGlobeInteractionStore((s) => s.setMobileFavoritesSheetOpen);

  // Subscription modal
  const { setIsOpen: setSubscriptionModalOpen } = useSubscriptionModal();

  // PWA Install state
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  // Handle install button click
  const handleInstallClick = () => {
    if (isIOS) {
      setShowIOSInstructions(true);
    } else {
      promptInstall();
      onClose();
    }
  };

  return (
    <>
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 z-[201] w-72 bg-white dark:bg-slate-950 shadow-2xl flex flex-col"
            style={{ paddingTop: 'env(safe-area-inset-top)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-slate-200 dark:border-slate-800">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Tools</h2>
              <button
                onClick={onClose}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Menu Items */}
            <div className="flex-1 overflow-y-auto py-2">
              {/* Clear Birth Data */}
              {(hasBirthData || hasPendingBirthLocation) && (onClearBirthData || onClearPendingBirth) && (
                <button
                  onClick={() => handleItemClick(() => {
                    if (hasPendingBirthLocation && onClearPendingBirth) {
                      onClearPendingBirth();
                    }
                    if (hasBirthData && onClearBirthData) {
                      onClearBirthData();
                    }
                  })}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <Trash2 className="w-5 h-5" />
                  <span className="font-medium">
                    {hasPendingBirthLocation && !hasBirthData ? 'Cancel Birth Location' : 'Clear Birth Data'}
                  </span>
                </button>
              )}

              {/* Divider if clear button was shown */}
              {(hasBirthData || hasPendingBirthLocation) && (
                <div className="h-px bg-slate-200 dark:bg-slate-800 my-2" />
              )}

              {/* Birth Chart Widget */}
              <button
                onClick={() => {
                  if (!hasNatalChartData) return;
                  if (onToggleNatalChart) {
                    handleItemClick(onToggleNatalChart);
                  }
                }}
                disabled={!hasNatalChartData}
                className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors ${
                  hasNatalChartData
                    ? isNatalChartOpen
                      ? 'bg-[#d4a5a5]/10 dark:bg-[#d4a5a5]/10 text-[#d4a5a5] dark:text-[#d4a5a5]'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                <CircleDot className="w-5 h-5" />
                <div className="flex-1">
                  <span className="font-medium">Birth Chart</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {hasNatalChartData
                      ? isNatalChartOpen
                        ? 'Visible'
                        : 'Hidden'
                      : 'Enter birth data first'}
                  </p>
                </div>
                {isNatalChartOpen && <Check className="w-4 h-4 text-[#d4a5a5]" />}
              </button>

              {/* Draw Zone */}
              <button
                onClick={() => {
                  if (!hasBirthData) return;
                  if (isDrawingZone) {
                    if (zoneDrawingPointsCount >= 3 && onCompleteZoneDrawing) {
                      handleItemClick(onCompleteZoneDrawing);
                    } else if (onToggleZoneDrawing) {
                      handleItemClick(onToggleZoneDrawing);
                    }
                  } else if (hasDrawnZone) {
                    if (onClearZone) handleItemClick(onClearZone);
                  } else {
                    if (onToggleZoneDrawing) handleItemClick(onToggleZoneDrawing);
                  }
                }}
                disabled={!hasBirthData}
                className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors ${
                  hasBirthData
                    ? isDrawingZone || hasDrawnZone
                      ? 'bg-cyan-50 dark:bg-cyan-900/20 text-cyan-700 dark:text-cyan-400'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                {isDrawingZone ? (
                  zoneDrawingPointsCount >= 3 ? <Check className="w-5 h-5" /> : <X className="w-5 h-5" />
                ) : hasDrawnZone ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Hexagon className="w-5 h-5" />
                )}
                <div className="flex-1">
                  <span className="font-medium">
                    {isDrawingZone
                      ? zoneDrawingPointsCount >= 3
                        ? `Complete Zone (${zoneDrawingPointsCount} pts)`
                        : `Cancel (${zoneDrawingPointsCount} pts)`
                      : hasDrawnZone
                        ? 'Clear Zone'
                        : 'Draw Zone'}
                  </span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {hasBirthData
                      ? isDrawingZone
                        ? 'Tap globe to add points'
                        : 'Analyze area influences'
                      : 'Enter birth data first'}
                  </p>
                </div>
              </button>

              {/* Saved Charts */}
              <button
                onClick={() => {
                  // Use mobile sheet instead of picker modal
                  handleItemClick(() => setMobileChartsSheetOpen(true));
                }}
                className="w-full flex items-center gap-4 px-4 py-3 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <CircleUserRound className="w-5 h-5" />
                <div className="flex-1">
                  <span className="font-medium">Saved Charts</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Load or manage charts</p>
                </div>
              </button>

              {/* Favorite Cities */}
              <button
                onClick={() => {
                  // Use mobile sheet instead of panel
                  handleItemClick(() => setMobileFavoritesSheetOpen(true));
                }}
                className="w-full flex items-center gap-4 px-4 py-3 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <MapPin className="w-5 h-5" />
                <div className="flex-1">
                  <span className="font-medium">Favorite Cities</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Your saved locations</p>
                </div>
                {favoritesCount > 0 && (
                  <span className="text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                    {favoritesCount}
                  </span>
                )}
              </button>

              {/* Export Report */}
              {hasBirthData && onOpenExport && (
                <button
                  onClick={() => handleItemClick(onOpenExport)}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <FileDown className="w-5 h-5" />
                  <div className="flex-1">
                    <span className="font-medium">Export Report</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Download PDF report</p>
                  </div>
                </button>
              )}

              {/* Share Chart */}
              {hasBirthData && onOpenShareChart && (
                <button
                  onClick={() => handleItemClick(onOpenShareChart)}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <Share className="w-5 h-5" />
                  <div className="flex-1">
                    <span className="font-medium">Share Chart</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">Create embeddable link</p>
                  </div>
                </button>
              )}

              {/* Duo Mode */}
              <button
                onClick={() => {
                  if (!hasBirthData) return;
                  if (!hasPartnerChart) {
                    handleItemClick(onOpenPartnerModal);
                  } else {
                    handleItemClick(onToggleCompatibility);
                  }
                }}
                disabled={!hasBirthData}
                className={`w-full flex items-center gap-4 px-4 py-3 text-left transition-colors ${
                  hasBirthData
                    ? isCompatibilityEnabled
                      ? 'bg-pink-50 dark:bg-pink-900/20 text-pink-700 dark:text-pink-400'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                    : 'text-slate-300 dark:text-slate-600 cursor-not-allowed'
                }`}
              >
                {isCompatibilityCalculating ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Heart className="w-5 h-5" />
                )}
                <div className="flex-1">
                  <span className="font-medium">Duo Mode</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {hasBirthData
                      ? isCompatibilityEnabled
                        ? 'Active'
                        : 'Compare with partner'
                      : 'Enter birth data first'}
                  </p>
                </div>
                {isCompatibilityEnabled && <Check className="w-4 h-4 text-pink-600" />}
              </button>

              {/* Upgrade / Subscribe */}
              <button
                onClick={() => handleItemClick(() => setSubscriptionModalOpen(true))}
                className="w-full flex items-center gap-4 px-4 py-3 text-left text-[#d4a5a5] dark:text-[#d4a5a5] hover:bg-[#d4a5a5]/10 dark:hover:bg-[#d4a5a5]/20 transition-colors"
              >
                <Crown className="w-5 h-5" />
                <div className="flex-1">
                  <span className="font-medium">Upgrade</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">View subscription plans</p>
                </div>
              </button>

              {/* Divider before settings */}
              <div className="h-px bg-slate-200 dark:bg-slate-800 my-2" />

              {/* Install App - only show if not installed and (installable or iOS) */}
              {!isInstalled && (isInstallable || isIOS) && (
                <button
                  onClick={handleInstallClick}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left text-[#d4a5a5] dark:text-[#d4a5a5] hover:bg-[#d4a5a5]/10 dark:hover:bg-[#d4a5a5]/20 transition-colors"
                >
                  <Download className="w-5 h-5" />
                  <div className="flex-1">
                    <span className="font-medium">Install App</span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Add to home screen for better experience
                    </p>
                  </div>
                </button>
              )}

              {/* Theme Toggle */}
              {onToggleTheme && (
                <button
                  onClick={() => handleItemClick(onToggleTheme)}
                  className="w-full flex items-center gap-4 px-4 py-3 text-left text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  {theme === 'dark' ? (
                    <Sun className="w-5 h-5" />
                  ) : (
                    <Moon className="w-5 h-5" />
                  )}
                  <div className="flex-1">
                    <span className="font-medium">
                      {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
                    </span>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Switch to {theme === 'dark' ? 'light' : 'dark'} theme
                    </p>
                  </div>
                </button>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-3 border-t border-slate-200 dark:border-slate-800">
              <a
                href="/"
                className="flex items-center justify-center gap-2 text-sm text-slate-500 dark:text-slate-400"
              >
                <img src="/logo.png" alt="Logo" className="w-5 h-5" />
                <span style={{ fontFamily: 'Cinzel, serif' }}>halohome.app</span>
              </a>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>

      {/* iOS Instructions Modal */}
      <AnimatePresence>
        {showIOSInstructions && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[300] bg-black/50 flex items-end sm:items-center justify-center p-4"
            onClick={() => setShowIOSInstructions(false)}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Install on iPhone/iPad</h3>
                  <button
                    onClick={() => setShowIOSInstructions(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">Tap the Share button</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Look for the <Share className="w-4 h-4 inline mx-1" /> icon at the bottom of Safari
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">2</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">Scroll down and tap "Add to Home Screen"</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Look for the <Plus className="w-4 h-4 inline mx-1" /> Add to Home Screen option
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 dark:text-blue-400 font-bold">3</span>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800 dark:text-slate-200">Tap "Add" to install</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        The app will appear on your home screen
                      </p>
                    </div>
                  </div>
                </div>

                <Button
                  className="w-full mt-6"
                  onClick={() => setShowIOSInstructions(false)}
                >
                  Got it!
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default MobileDrawerMenu;
