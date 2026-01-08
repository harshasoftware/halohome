import { useState, useEffect, useCallback } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const BANNER_DELAY_MS = 3000; // 3 second delay before showing banner

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isBannerDismissed, setIsBannerDismissed] = useState(false);
  const [isDelayComplete, setIsDelayComplete] = useState(false);

  // Banner delay timer
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsDelayComplete(true);
    }, BANNER_DELAY_MS);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Check if already installed (standalone mode)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches
      || (window.navigator as any).standalone === true;
    setIsInstalled(isStandalone);

    // Check if iOS (including iPadOS which reports as macOS Safari)
    const ua = window.navigator.userAgent;
    const platform = (window.navigator as any).platform || '';
    const maxTouchPoints = window.navigator.maxTouchPoints || 0;

    // Check for iPhone/iPod (standard detection)
    const isIPhone = /iPhone|iPod/.test(ua) && !(window as any).MSStream;
    // Check for iPad (standard detection or iPadOS detection via macOS + touch)
    const isIPad = /iPad/.test(ua) ||
      (platform === 'MacIntel' && maxTouchPoints > 1) ||
      (/Macintosh/.test(ua) && maxTouchPoints > 1);

    setIsIOS(isIPhone || isIPad);

    // Check if user dismissed the banner recently (within 7 days)
    const checkDismissed = () => {
      const dismissedAt = localStorage.getItem('pwa-install-dismissed');
      if (dismissedAt) {
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        if (Date.now() - parseInt(dismissedAt) < sevenDays) {
          setIsBannerDismissed(true);
          return true;
        }
      }
      return false;
    };
    checkDismissed();

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    // Listen for storage changes (when banner is dismissed in another component)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'pwa-install-dismissed') {
        checkDismissed();
      }
    };

    // Also listen for custom event for same-tab updates
    const handleBannerDismissed = () => {
      setIsBannerDismissed(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('pwa-banner-dismissed', handleBannerDismissed);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('pwa-banner-dismissed', handleBannerDismissed);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;

      if (outcome === 'accepted') {
        setIsInstalled(true);
        setIsInstallable(false);
      }

      setDeferredPrompt(null);
      return outcome === 'accepted';
    } catch (error) {
      console.error('Error prompting install:', error);
      return false;
    }
  }, [deferredPrompt]);

  const dismissBanner = useCallback(() => {
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    setIsInstallable(false);
    setIsBannerDismissed(true);
    // Dispatch custom event to notify other components in the same tab
    window.dispatchEvent(new Event('pwa-banner-dismissed'));
  }, []);

  return {
    isInstallable: isInstallable && !isBannerDismissed,
    isInstalled,
    isIOS,
    isBannerDismissed,
    isDelayComplete,
    promptInstall,
    dismissBanner,
  };
}
