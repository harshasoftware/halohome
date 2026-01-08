// ============================================================================
// Polyfill: requestIdleCallback for Safari/older mobile browsers
// ============================================================================
if (typeof window !== 'undefined' && !('requestIdleCallback' in window)) {
  (window as Window & typeof globalThis).requestIdleCallback = (cb: IdleRequestCallback): number => {
    const start = Date.now();
    return window.setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start)),
      });
    }, 1) as unknown as number;
  };
  (window as Window & typeof globalThis).cancelIdleCallback = (id: number): void => {
    clearTimeout(id);
  };
}

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import GoogleMapsWrapper from './contexts/GoogleMapsWrapper.tsx';
import { PostHogProvider } from 'posthog-js/react';
import { BrowserRouter } from 'react-router-dom';
import ErrorBoundary from './components/ErrorBoundary';
import { preconnect, prefetchResource } from '@/lib/patterns';

// ============================================================================
// Resource Hints - Preconnect to required origins for faster loads
// ============================================================================
preconnect('https://eypsystctqwvphvcrmxb.supabase.co'); // Supabase
preconnect('https://maps.googleapis.com'); // Google Maps
preconnect('https://fonts.googleapis.com'); // Google Fonts

// Prefetch likely next pages (landing page visitors often go to guest)
if (window.location.pathname === '/') {
  prefetchResource('/guest', 'document');
}

// ============================================================================
// Deferred Analytics Initialization (Using Dynamic Import Pattern)
// ============================================================================
// This ensures CopilotKit and other modules are fully loaded first
setTimeout(() => {
  import('./lib/analytics').then(({ analytics }) => {
    analytics.initialize().catch((error) => {
      console.warn('Firebase Analytics initialization failed:', error);
    });
  }).catch(() => {
    // Silently fail if analytics module can't be loaded
  });
}, 0);

// Register service worker for PWA with aggressive update checking
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js', {
        // Always check for updates
        updateViaCache: 'none'
      });

      console.log('[App] SW registered:', registration.scope);

      // Check for updates immediately and periodically
      registration.update();

      // Check for updates every 60 seconds while app is open
      setInterval(() => {
        registration.update();
      }, 60000);

      // Handle SW updates - force activate new version immediately
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('[App] New SW version found, installing...');

        newWorker?.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[App] New SW installed, activating...');
            // Tell the new SW to skip waiting and take over
            newWorker.postMessage('SKIP_WAITING');
          }
        });
      });

      // Listen for SW messages (e.g., update notifications)
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data?.type === 'SW_UPDATED') {
          console.log('[App] SW updated to version:', event.data.version);
          // Reload to get new assets - but only if we're not in the middle of something
          if (document.visibilityState === 'visible') {
            // Small delay to let the SW finish activating
            setTimeout(() => {
              window.location.reload();
            }, 100);
          }
        }
      });

      // When a new SW takes control, reload to ensure fresh assets
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[App] New SW controller, reloading for fresh assets...');
        window.location.reload();
      });

    } catch (error) {
      console.log('[App] SW registration failed:', error);
    }
  });

  // Clear SW caches on page unload if there's an error (helps with stuck states)
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('WebGL') || event.reason?.message?.includes('getShader')) {
      console.log('[App] WebGL error detected, clearing SW caches...');
      navigator.serviceWorker.controller?.postMessage('CLEAR_ALL_CACHES');
    }
  });
}

// Hide initial loader after React mounts
const hideInitialLoader = () => {
  const loader = document.getElementById('initial-loader');
  if (loader) {
    loader.classList.add('fade-out');
    // Remove from DOM after transition
    setTimeout(() => loader.remove(), 300);
  }
};

const root = createRoot(document.getElementById('root')!);

// Hide loader after first render
requestAnimationFrame(() => {
  requestAnimationFrame(hideInitialLoader);
});

root.render(
  <React.StrictMode>
    <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
      <PostHogProvider
        apiKey={import.meta.env.VITE_PUBLIC_POSTHOG_KEY}
        options={{
          api_host: import.meta.env.VITE_PUBLIC_POSTHOG_HOST,
          defaults: '2025-05-24',
          capture_exceptions: true,
          debug: import.meta.env.MODE === 'development',
          disable_session_recording: true, // Session recording is disabled globally
        }}
      >
        <GoogleMapsWrapper>
          <ErrorBoundary componentName="App">
            <App />
          </ErrorBoundary>
        </GoogleMapsWrapper>
      </PostHogProvider>
    </BrowserRouter>
  </React.StrictMode>
);