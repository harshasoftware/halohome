/**
 * useAnalytics Hook
 *
 * React hook for tracking analytics events and performance traces.
 * Provides a clean, type-safe interface for components.
 */

import { useCallback, useEffect, useRef } from 'react';
import {
  analytics,
  trackPageView,
  trackFeatureUsed,
  trackError,
  trackScreenRenderTime,
} from '@/lib/analytics';
import type { AnalyticsEventName, AnalyticsEventParams } from '@/lib/analytics';

/**
 * Main analytics hook
 */
export function useAnalytics() {
  // Track a generic event
  const track = useCallback(<T extends AnalyticsEventName>(
    eventName: T,
    params: AnalyticsEventParams[T]
  ) => {
    analytics.track(eventName, params);
  }, []);

  // Track feature usage
  const trackFeature = useCallback((featureName: string) => {
    trackFeatureUsed(featureName);
  }, []);

  // Track an error
  const logError = useCallback((
    errorType: string,
    errorMessage: string,
    componentName?: string
  ) => {
    trackError(errorType, errorMessage, componentName);
  }, []);

  return {
    track,
    trackFeature,
    logError,
    analytics,
  };
}

/**
 * Track page view on mount
 */
export function usePageView(pageName: string) {
  useEffect(() => {
    trackPageView(pageName);
  }, [pageName]);
}

/**
 * Track screen render time
 */
export function useScreenRenderTime(screenName: string) {
  const startTime = useRef(performance.now());

  useEffect(() => {
    const renderTime = performance.now() - startTime.current;
    trackScreenRenderTime(screenName, Math.round(renderTime));
  }, [screenName]);
}

/**
 * Create a performance trace that auto-starts
 */
export function usePerformanceTrace(traceName: string) {
  const trace = useRef(analytics.createTrace(traceName));

  useEffect(() => {
    trace.current?.start();

    return () => {
      trace.current?.stop();
    };
  }, [traceName]);

  return {
    setAttribute: (name: string, value: string) => {
      trace.current?.setAttribute(name, value);
    },
    setMetric: (name: string, value: number) => {
      trace.current?.setMetric(name, value);
    },
  };
}

/**
 * Track component mount/unmount for feature usage
 */
export function useTrackFeature(featureName: string) {
  useEffect(() => {
    trackFeatureUsed(featureName);
  }, [featureName]);
}

export default useAnalytics;
