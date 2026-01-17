/**
 * Firebase Configuration for HaloHome
 */

import type { FirebaseApp } from 'firebase/app';
import type { Analytics } from 'firebase/analytics';
import type { FirebasePerformance } from 'firebase/performance';

const firebaseConfig = {
  apiKey: "AIzaSyBv-gdoGz5icflm-sNOVCsk7BaTZmKIkuI",
  authDomain: "halohome-484505.firebaseapp.com",
  projectId: "halohome-484505",
  storageBucket: "halohome-484505.firebasestorage.app",
  messagingSenderId: "842417808948",
  appId: "1:842417808948:web:31e0fc74aca0344921cc61",
  measurementId: "G-63CDB0B439",
};

// Firebase instances (lazy loaded)
let app: FirebaseApp | null = null;
let analytics: Analytics | null = null;
let performance: FirebasePerformance | null = null;
let initialized = false;
let initPromise: Promise<void> | null = null;

export const initializeFirebase = async (): Promise<void> => {
  // Return existing promise if already initializing
  if (initPromise) return initPromise;
  if (initialized) return Promise.resolve();

  initPromise = (async () => {
    try {
      // Check if we're in a browser environment
      if (typeof window === 'undefined') {
        console.warn('Firebase: Not in browser environment, skipping initialization');
        return;
      }

      // Dynamically import Firebase modules to avoid initialization issues
      const { initializeApp, getApps } = await import('firebase/app');
      const { getAnalytics, isSupported } = await import('firebase/analytics');
      const { getPerformance } = await import('firebase/performance');

      // Initialize app if not already done
      if (getApps().length === 0) {
        app = initializeApp(firebaseConfig);
      } else {
        app = getApps()[0];
      }

      if (!app) {
        console.warn('Firebase: App initialization failed');
        return;
      }

      // Initialize Analytics if supported
      try {
        const analyticsSupported = await isSupported();
        if (analyticsSupported) {
          analytics = getAnalytics(app);
        }
      } catch {
        // Analytics may be blocked by ad blockers - this is expected
      }

      // Initialize Performance Monitoring
      try {
        performance = getPerformance(app);
      } catch {
        // Performance monitoring may be blocked - this is expected
      }

      initialized = true;
    } catch {
      // Firebase initialization failed - may be blocked by ad blockers or network restrictions
      // Reset promise so it can be retried
      initPromise = null;
    }
  })();

  return initPromise;
};

export const getFirebaseApp = (): FirebaseApp | null => app;
export const getFirebaseAnalytics = (): Analytics | null => analytics;
export const getFirebasePerformance = (): FirebasePerformance | null => performance;
export const isFirebaseInitialized = (): boolean => initialized;
