/**
 * Firebase Analytics Provider
 *
 * Implements the AnalyticsProvider interface using Firebase Analytics
 * Uses dynamic imports to avoid initialization issues
 */

import {
  initializeFirebase,
  getFirebaseAnalytics,
  getFirebasePerformance,
} from '@/integrations/firebase/config';
import type {
  AnalyticsProvider,
  AnalyticsEventName,
  AnalyticsEventParams,
  PerformanceProvider,
  PerformanceTrace,
} from './types';

// ============================================
// FIREBASE ANALYTICS PROVIDER
// ============================================

class FirebaseAnalyticsProvider implements AnalyticsProvider {
  private initialized = false;

  async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      await initializeFirebase();
      this.initialized = true;
    } catch {
      // Firebase may be blocked by ad blockers - this is expected
    }
  }

  trackEvent<T extends AnalyticsEventName>(
    eventName: T,
    params: AnalyticsEventParams[T]
  ): void {
    const analytics = getFirebaseAnalytics();
    if (!analytics) return;

    // Dynamic import to avoid issues
    import('firebase/analytics').then(({ logEvent }) => {
      try {
        logEvent(analytics, eventName, params as Record<string, unknown>);
      } catch {
        // Event tracking may fail when analytics is blocked
      }
    }).catch(() => {
      // Silently fail if module not available
    });
  }

  setUserId(userId: string): void {
    const analytics = getFirebaseAnalytics();
    if (!analytics) return;

    import('firebase/analytics').then(({ setUserId }) => {
      try {
        setUserId(analytics, userId);
      } catch {
        // May fail when analytics is blocked
      }
    }).catch(() => {});
  }

  setUserProperties(properties: Record<string, string>): void {
    const analytics = getFirebaseAnalytics();
    if (!analytics) return;

    import('firebase/analytics').then(({ setUserProperties }) => {
      try {
        setUserProperties(analytics, properties);
      } catch {
        // May fail when analytics is blocked
      }
    }).catch(() => {});
  }

  isInitialized(): boolean {
    return this.initialized && getFirebaseAnalytics() !== null;
  }
}

// ============================================
// FIREBASE PERFORMANCE PROVIDER
// ============================================

class FirebasePerformanceProvider implements PerformanceProvider {
  private traceModule: typeof import('firebase/performance') | null = null;

  createTrace(traceName: string): PerformanceTrace | null {
    const performance = getFirebasePerformance();
    if (!performance) return null;

    // Return a lazy trace that will initialize when first used
    let traceInstance: ReturnType<typeof import('firebase/performance').trace> | null = null;
    let started = false;

    const ensureTrace = async () => {
      if (traceInstance) return traceInstance;
      try {
        if (!this.traceModule) {
          this.traceModule = await import('firebase/performance');
        }
        traceInstance = this.traceModule.trace(performance, traceName);
        return traceInstance;
      } catch {
        return null;
      }
    };

    return {
      start: () => {
        if (started) return;
        started = true;
        ensureTrace().then(t => t?.start()).catch(() => {});
      },
      stop: () => {
        if (!started) return;
        ensureTrace().then(t => t?.stop()).catch(() => {});
      },
      setAttribute: (name: string, value: string) => {
        ensureTrace().then(t => t?.putAttribute(name, value)).catch(() => {});
      },
      setMetric: (name: string, value: number) => {
        ensureTrace().then(t => t?.putMetric(name, value)).catch(() => {});
      },
    };
  }

  isInitialized(): boolean {
    return getFirebasePerformance() !== null;
  }
}

// ============================================
// SINGLETON INSTANCES
// ============================================

export const firebaseAnalyticsProvider = new FirebaseAnalyticsProvider();
export const firebasePerformanceProvider = new FirebasePerformanceProvider();
