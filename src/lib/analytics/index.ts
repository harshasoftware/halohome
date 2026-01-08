/**
 * Analytics Service
 *
 * Decoupled analytics interface for the Astrocartography app.
 * Uses Firebase Analytics by default but can be swapped for other providers.
 */

import {
  firebaseAnalyticsProvider,
  firebasePerformanceProvider,
} from './firebase-provider';
import type {
  AnalyticsProvider,
  PerformanceProvider,
  AnalyticsEventName,
  AnalyticsEventParams,
  PerformanceTrace,
} from './types';

// ============================================
// ANALYTICS SERVICE
// ============================================

class AnalyticsService {
  private provider: AnalyticsProvider;
  private performanceProvider: PerformanceProvider;

  constructor(
    analyticsProvider: AnalyticsProvider,
    performanceProvider: PerformanceProvider
  ) {
    this.provider = analyticsProvider;
    this.performanceProvider = performanceProvider;
  }

  /**
   * Initialize the analytics service
   */
  async initialize(): Promise<void> {
    await this.provider.initialize();
  }

  /**
   * Track an analytics event
   */
  track<T extends AnalyticsEventName>(
    eventName: T,
    params: AnalyticsEventParams[T]
  ): void {
    this.provider.trackEvent(eventName, params);
  }

  /**
   * Set user ID
   */
  setUserId(userId: string): void {
    this.provider.setUserId(userId);
  }

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, string>): void {
    this.provider.setUserProperties(properties);
  }

  /**
   * Create a performance trace
   */
  createTrace(traceName: string): PerformanceTrace | null {
    return this.performanceProvider.createTrace(traceName);
  }

  /**
   * Check if analytics is ready
   */
  isReady(): boolean {
    return this.provider.isInitialized();
  }
}

// ============================================
// DEFAULT INSTANCE (Firebase)
// ============================================

export const analytics = new AnalyticsService(
  firebaseAnalyticsProvider,
  firebasePerformanceProvider
);

// ============================================
// HELPER FUNCTIONS (Convenience wrappers)
// ============================================

// User events
export const trackSignIn = (method: 'email' | 'google' | 'anonymous') =>
  analytics.track('user_sign_in', { method });

export const trackSignUp = (method: 'email' | 'google') =>
  analytics.track('user_sign_up', { method });

export const trackSignOut = () =>
  analytics.track('user_sign_out', {});

// Birth data events
export const trackBirthDataEntered = (hasTime: boolean) =>
  analytics.track('birth_data_entered', { has_time: hasTime });

export const trackBirthDataSaved = () =>
  analytics.track('birth_data_saved', {});

export const trackPartnerBirthDataEntered = () =>
  analytics.track('partner_birth_data_entered', {});

// Globe events
export const trackGlobeLoaded = (loadTimeMs: number) =>
  analytics.track('globe_loaded', { load_time_ms: loadTimeMs });

export const trackLocationClicked = (lat: number, lng: number, cityName?: string) =>
  analytics.track('location_clicked', {
    latitude: lat.toFixed(2),
    longitude: lng.toFixed(2),
    city_name: cityName || 'unknown',
  });

export const trackLineTypeToggled = (lineType: string, enabled: boolean) =>
  analytics.track('line_type_toggled', { line_type: lineType, enabled });

export const trackPlanetToggled = (planet: string, enabled: boolean) =>
  analytics.track('planet_toggled', { planet, enabled });

export const trackLocationFavorited = (cityName: string, country?: string) =>
  analytics.track('location_favorited', { city_name: cityName, country: country || 'unknown' });

// Duo mode events
export const trackDuoModeEnabled = () =>
  analytics.track('duo_mode_enabled', {});

export const trackDuoModeDisabled = () =>
  analytics.track('duo_mode_disabled', {});

export const trackCompatibilityModeChanged = (mode: string) =>
  analytics.track('compatibility_mode_changed', { mode });

export const trackCompatibleLocationViewed = (rank: number, cityName: string) =>
  analytics.track('compatible_location_viewed', { rank, city_name: cityName });

// Natal chart events
export const trackNatalChartViewed = () =>
  analytics.track('natal_chart_viewed', {});

export const trackNatalChartSettingsChanged = (setting: string, value: string) =>
  analytics.track('natal_chart_settings_changed', { setting, value });

// City info events
export const trackCityInfoOpened = (cityName: string) =>
  analytics.track('city_info_opened', { city_name: cityName });

export const trackCityInfoTabChanged = (tab: string) =>
  analytics.track('city_info_tab_changed', { tab });

// AI chat events
export const trackAiChatOpened = () =>
  analytics.track('ai_chat_opened', {});

export const trackAiChatMessageSent = () =>
  analytics.track('ai_chat_message_sent', {});

export const trackAiChatClosed = () =>
  analytics.track('ai_chat_closed', {});

// Local space events
export const trackLocalSpaceOpened = (lat: number, lng: number) =>
  analytics.track('local_space_opened', {
    latitude: lat.toFixed(2),
    longitude: lng.toFixed(2),
  });

// Family tree events
export const trackFamilyTreeViewed = () =>
  analytics.track('family_tree_viewed', {});

export const trackFamilyMemberAdded = () =>
  analytics.track('family_member_added', {});

export const trackGedcomImported = (memberCount: number) =>
  analytics.track('gedcom_imported', { member_count: memberCount });

// Navigation events
export const trackPageView = (pageName: string) =>
  analytics.track('page_view', { page_name: pageName });

export const trackFeatureUsed = (featureName: string) =>
  analytics.track('feature_used', { feature_name: featureName });

// Error events
export const trackError = (errorType: string, errorMessage: string, componentName?: string) =>
  analytics.track('app_error', {
    error_type: errorType,
    error_message: errorMessage.slice(0, 100),
    component_name: componentName || 'unknown',
  });

// Performance events
export const trackScreenRenderTime = (screenName: string, renderTimeMs: number) =>
  analytics.track('screen_render_time', { screen_name: screenName, render_time_ms: renderTimeMs });

export const trackApiLatency = (endpoint: string, latencyMs: number, success: boolean) =>
  analytics.track('api_latency', { endpoint, latency_ms: latencyMs, success });

// WebGL events - re-export from webgl-diagnostics for convenience
// Note: Full WebGL diagnostics with performance tracing available in '@/lib/webgl-diagnostics'

// ============================================
// PERFORMANCE TRACE HELPERS
// ============================================

export const traceGlobeInit = () => analytics.createTrace('globe_initialization');
export const traceAstroCalc = () => analytics.createTrace('astro_calculation');
export const traceNatalChart = () => analytics.createTrace('natal_chart_calculation');
export const traceCompatibility = () => analytics.createTrace('compatibility_calculation');
export const traceCityInfo = () => analytics.createTrace('city_info_fetch');
export const tracePlaces = () => analytics.createTrace('places_fetch');
export const traceAiChat = () => analytics.createTrace('ai_chat_response');
export const traceWasm = () => analytics.createTrace('wasm_load');
export const traceScreen = (name: string) => analytics.createTrace(`screen_${name}`);

// Re-export types
export type { AnalyticsEventName, AnalyticsEventParams, PerformanceTrace } from './types';
