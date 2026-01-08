/**
 * Analytics Types - Provider-agnostic analytics interfaces
 *
 * This abstraction allows switching analytics providers without
 * changing application code.
 */

// ============================================
// EVENT TYPES
// ============================================

export type AnalyticsEventName =
  // User events
  | 'user_sign_in'
  | 'user_sign_up'
  | 'user_sign_out'
  // Birth data events
  | 'birth_data_entered'
  | 'birth_data_saved'
  | 'partner_birth_data_entered'
  // Globe events
  | 'globe_loaded'
  | 'location_clicked'
  | 'line_type_toggled'
  | 'planet_toggled'
  | 'location_favorited'
  // Duo mode events
  | 'duo_mode_enabled'
  | 'duo_mode_disabled'
  | 'compatibility_mode_changed'
  | 'compatible_location_viewed'
  // Natal chart events
  | 'natal_chart_viewed'
  | 'natal_chart_settings_changed'
  // City info events
  | 'city_info_opened'
  | 'city_info_tab_changed'
  // AI chat events
  | 'ai_chat_opened'
  | 'ai_chat_message_sent'
  | 'ai_chat_closed'
  // Local space events
  | 'local_space_opened'
  // Family tree events
  | 'family_tree_viewed'
  | 'family_member_added'
  | 'gedcom_imported'
  // Navigation events
  | 'page_view'
  | 'feature_used'
  // Error events
  | 'app_error'
  // Performance events
  | 'screen_render_time'
  | 'api_latency'
  // WebGL events
  | 'webgl_check_started'
  | 'webgl_check_success'
  | 'webgl_check_failed'
  | 'webgl_context_lost'
  | 'webgl_context_restored'
  | 'webgl_retry_attempt'
  | 'webgl_recovery_success'
  | 'webgl_recovery_failed'
  | 'webgl_error'
  | 'globe_render_error';

export interface AnalyticsEventParams {
  user_sign_in: { method: 'email' | 'google' | 'anonymous' };
  user_sign_up: { method: 'email' | 'google' };
  user_sign_out: Record<string, never>;
  birth_data_entered: { has_time: boolean };
  birth_data_saved: Record<string, never>;
  partner_birth_data_entered: Record<string, never>;
  globe_loaded: { load_time_ms: number };
  location_clicked: { latitude: string; longitude: string; city_name: string };
  line_type_toggled: { line_type: string; enabled: boolean };
  planet_toggled: { planet: string; enabled: boolean };
  location_favorited: { city_name: string; country: string };
  duo_mode_enabled: Record<string, never>;
  duo_mode_disabled: Record<string, never>;
  compatibility_mode_changed: { mode: string };
  compatible_location_viewed: { rank: number; city_name: string };
  natal_chart_viewed: Record<string, never>;
  natal_chart_settings_changed: { setting: string; value: string };
  city_info_opened: { city_name: string };
  city_info_tab_changed: { tab: string };
  ai_chat_opened: Record<string, never>;
  ai_chat_message_sent: Record<string, never>;
  ai_chat_closed: Record<string, never>;
  local_space_opened: { latitude: string; longitude: string };
  family_tree_viewed: Record<string, never>;
  family_member_added: Record<string, never>;
  gedcom_imported: { member_count: number };
  page_view: { page_name: string };
  feature_used: { feature_name: string };
  app_error: { error_type: string; error_message: string; component_name: string };
  screen_render_time: { screen_name: string; render_time_ms: number };
  api_latency: { endpoint: string; latency_ms: number; success: boolean };
  // WebGL events
  webgl_check_started: { platform: string; user_agent: string };
  webgl_check_success: {
    webgl_version: string;
    renderer: string;
    vendor: string;
    max_texture_size: number;
    platform: string;
    is_mobile: boolean;
  };
  webgl_check_failed: {
    error_type: string;
    error_message: string;
    platform: string;
    user_agent: string;
    retry_count: number;
  };
  webgl_context_lost: { platform: string; had_previous_error: boolean };
  webgl_context_restored: { platform: string; recovery_time_ms: number };
  webgl_retry_attempt: { attempt_number: number; max_retries: number; platform: string };
  webgl_recovery_success: { total_attempts: number; recovery_time_ms: number; platform: string };
  webgl_recovery_failed: { total_attempts: number; final_error: string; platform: string };
  webgl_error: {
    error_type: string;
    error_message: string;
    error_stack: string;
    component: string;
    platform: string;
  };
  globe_render_error: {
    error_type: string;
    error_message: string;
    component: string;
    platform: string;
  };
}

// ============================================
// PROVIDER INTERFACE
// ============================================

export interface AnalyticsProvider {
  /**
   * Initialize the analytics provider
   */
  initialize(): Promise<void>;

  /**
   * Track an analytics event
   */
  trackEvent<T extends AnalyticsEventName>(
    eventName: T,
    params: AnalyticsEventParams[T]
  ): void;

  /**
   * Set user ID for tracking
   */
  setUserId(userId: string): void;

  /**
   * Set user properties
   */
  setUserProperties(properties: Record<string, string>): void;

  /**
   * Check if provider is initialized
   */
  isInitialized(): boolean;
}

// ============================================
// PERFORMANCE TRACE INTERFACE
// ============================================

export interface PerformanceTrace {
  start(): void;
  stop(): void;
  setAttribute(name: string, value: string): void;
  setMetric(name: string, value: number): void;
}

export interface PerformanceProvider {
  /**
   * Create a custom trace
   */
  createTrace(traceName: string): PerformanceTrace | null;

  /**
   * Check if provider is initialized
   */
  isInitialized(): boolean;
}
