// Event name constants for analytics
export enum AnalyticsEvent {
  SESSION_STARTED = 'session_started',
  SESSION_ENDED = 'session_ended',
  FAMILY_TREE_CREATED = 'family_tree_created',
  FAMILY_TREE_EDITED = 'family_tree_edited',
  FAMILY_TREE_SHARED = 'family_tree_shared',
  PERSON_ADDED = 'person_added',
  PERSON_EDITED = 'person_edited',
  PERSON_DELETED = 'person_deleted',
  GEDCOM_IMPORTED = 'gedcom_imported',
  PAYMENT_SUCCESS = 'payment_success',
  ERROR_OCCURRED = 'error_occurred',
  SESSION_RECORDED = 'session_recorded', // For explicit session recording events
  COMPONENT_LOAD_ERROR = 'component_load_error', // For lazy-load component failures
  // Tutorial events
  TUTORIAL_STARTED = 'tutorial_started',
  TUTORIAL_COMPLETED = 'tutorial_completed',
  TUTORIAL_SKIPPED = 'tutorial_skipped',
  TUTORIAL_STEP_VIEWED = 'tutorial_step_viewed',
  // Add more as needed
}

// Singleton event helper for PostHog
import posthog from 'posthog-js';

class AnalyticsHelper {
  private static instance: AnalyticsHelper;

  private constructor() {}

  static getInstance() {
    if (!AnalyticsHelper.instance) {
      AnalyticsHelper.instance = new AnalyticsHelper();
    }
    return AnalyticsHelper.instance;
  }

  capture(event: AnalyticsEvent, properties?: Record<string, any>) {
    if (posthog && typeof posthog.capture === 'function') {
      posthog.capture(event, properties);
    }
  }
}

export const analytics = AnalyticsHelper.getInstance(); 