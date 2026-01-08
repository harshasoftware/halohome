// Google Ads tracking configuration
export const GA_ADS_ID = 'AW-17808651005';
export const GA_CONVERSION_ID = 'AW-17808651005/wWAmCLKskdIbEP3l6atC';

// Type declarations for gtag
declare global {
  interface Window {
    dataLayer: unknown[];
    gtag: (...args: unknown[]) => void;
  }
}

// Initialize gtag function
const initGtag = () => {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag('js', new Date());
  window.gtag('config', GA_ADS_ID);
};

// Check if gtag is available
export const isGtagAvailable = (): boolean => {
  return typeof window !== 'undefined' && typeof window.gtag === 'function';
};

// Load the gtag script - returns cleanup function
export const loadGtagScript = (): Promise<{ success: boolean; cleanup: () => void }> => {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') {
      resolve({ success: false, cleanup: () => {} });
      return;
    }

    // Check if script already exists
    const existingScript = document.querySelector(`script[src*="googletagmanager.com/gtag"]`) as HTMLScriptElement | null;
    if (existingScript) {
      resolve({ success: true, cleanup: () => {} });
      return;
    }

    const script = document.createElement('script');
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ADS_ID}`;
    script.async = true;

    const cleanup = () => {
      script.remove();
    };

    script.onload = () => {
      initGtag();
      resolve({ success: true, cleanup });
    };

    script.onerror = () => {
      // Silently handle blocked scripts - this is expected with ad blockers
      resolve({ success: false, cleanup });
    };

    document.head.appendChild(script);
  });
};

// Track a conversion event
export const trackConversion = (callback?: () => void): void => {
  const navigated = { current: false };

  const doCallback = () => {
    if (navigated.current) return;
    navigated.current = true;
    callback?.();
  };

  // Always set a timeout fallback
  const timeoutId = setTimeout(doCallback, 500);

  if (isGtagAvailable()) {
    try {
      window.gtag('event', 'conversion', {
        send_to: GA_CONVERSION_ID,
        value: 1.0,
        currency: 'USD',
        event_callback: () => {
          clearTimeout(timeoutId);
          doCallback();
        },
      });
    } catch {
      clearTimeout(timeoutId);
      doCallback();
    }
  } else {
    clearTimeout(timeoutId);
    doCallback();
  }
};

// Track conversion and navigate
export const trackConversionAndNavigate = (url: string): void => {
  trackConversion(() => {
    window.location.href = url;
  });
};
