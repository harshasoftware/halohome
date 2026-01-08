import { useEffect, useState, useCallback } from 'react';
import { loadGtagScript, trackConversion, trackConversionAndNavigate } from '@/lib/gtag';

export function useGoogleAds() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isBlocked, setIsBlocked] = useState(false);

  useEffect(() => {
    let mounted = true;
    let cleanupFn: (() => void) | undefined;

    loadGtagScript().then(({ success, cleanup }) => {
      if (!mounted) {
        cleanup();
        return;
      }
      cleanupFn = cleanup;
      setIsLoaded(success);
      setIsBlocked(!success);
    });

    return () => {
      mounted = false;
      cleanupFn?.();
    };
  }, []);

  const reportConversion = useCallback((callback?: () => void) => {
    trackConversion(callback);
  }, []);

  const reportConversionAndNavigate = useCallback((url: string) => {
    trackConversionAndNavigate(url);
  }, []);

  return {
    isLoaded,
    isBlocked,
    reportConversion,
    reportConversionAndNavigate,
  };
}
