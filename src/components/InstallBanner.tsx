import React, { useState } from 'react';
import { X, Download, Share, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePWAInstall } from '@/hooks/usePWAInstall';
import { useLocation } from 'react-router-dom';
import { useIsMobile } from '@/hooks/use-mobile';

export const InstallBanner: React.FC = () => {
  // Banner completely disabled - install only via navbar button or drawer
  return null;

  /* Original implementation kept for reference
  const { isInstallable, isInstalled, isIOS, isBannerDismissed, isDelayComplete, promptInstall, dismissBanner } = usePWAInstall();
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const location = useLocation();
  const isMobile = useIsMobile();
  const isTabletOrMobile = useIsMobile(1024); // Include tablets (up to 1024px)

  // Don't show if already installed or dismissed
  if (isInstalled || isBannerDismissed) return null;

  // Don't show until delay has passed
  if (!isDelayComplete) return null;

  // Don't show on mobile at all - mobile users can use the Install button in nav/settings
  if (isMobile) return null;

  // Don't show on desktop - only show on tablet
  if (!isTabletOrMobile) return null;

  // Don't show on landing page (nav has Install button)
  if (location.pathname === '/') return null;

  // iOS: Show special instructions
  if (isIOS && !showIOSInstructions) {
    return (
      <div className="fixed top-0 left-0 right-0 z-[100] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
              <Download className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">Install Astrocarto</p>
              <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Add to home screen for the best experience</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="text-xs px-3"
              onClick={() => setShowIOSInstructions(true)}
            >
              Install
            </Button>
            <button
              onClick={dismissBanner}
              className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // iOS Instructions Modal
  if (isIOS && showIOSInstructions) {
    return (
      <div className="fixed inset-0 z-[100] bg-black/50 flex items-end sm:items-center justify-center p-4">
        <div className="bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl w-full max-w-md shadow-2xl animate-in slide-in-from-bottom duration-300">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">Install on iPhone/iPad</h3>
              <button
                onClick={() => {
                  setShowIOSInstructions(false);
                  dismissBanner();
                }}
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
              onClick={() => {
                setShowIOSInstructions(false);
                dismissBanner();
              }}
            >
              Got it!
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Android/Desktop: Show install prompt
  if (!isInstallable) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-3 shadow-sm">
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center flex-shrink-0">
            <Download className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-slate-800 dark:text-slate-100">Install Astrocarto</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Get the full app experience</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="text-xs px-3"
            onClick={promptInstall}
          >
            Install
          </Button>
          <button
            onClick={dismissBanner}
            className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full transition-colors"
            aria-label="Dismiss"
          >
            <X className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </button>
        </div>
      </div>
    </div>
  );
  */
};

export default InstallBanner;
