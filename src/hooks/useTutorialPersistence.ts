/**
 * Tutorial Persistence Hook - Syncs tutorial state with Supabase + localStorage
 *
 * This hook should be called once at app root (e.g., App.tsx).
 * It handles:
 * - Loading initial tutorial state from Supabase (auth users) or localStorage (anonymous)
 * - Persisting tutorial completion/skip status
 * - Migrating localStorage data to Supabase when user logs in
 * - Syncing state across auth state changes
 */

import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { useTutorialStore } from '@/stores/tutorialStore';

const STORAGE_KEY = 'astrocarto_tutorial_status';

interface TutorialStatus {
  tutorial_completed: boolean;
  tutorial_skipped: boolean;
  tutorial_progress?: number;
  timestamp?: string;
}

/**
 * Load tutorial status from localStorage for anonymous users
 */
function getLocalStorageStatus(): TutorialStatus {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as TutorialStatus;
      return {
        tutorial_completed: parsed.tutorial_completed ?? false,
        tutorial_skipped: parsed.tutorial_skipped ?? false,
        tutorial_progress: parsed.tutorial_progress,
      };
    }
  } catch (error) {
    // Invalid JSON or localStorage not available
  }
  return { tutorial_completed: false, tutorial_skipped: false };
}

/**
 * Save tutorial status to localStorage
 */
function setLocalStorageStatus(status: TutorialStatus): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      ...status,
      timestamp: new Date().toISOString(),
    }));
  } catch (error) {
    // localStorage not available (e.g., private browsing in some browsers)
  }
}

/**
 * Clear tutorial status from localStorage
 */
function clearLocalStorageStatus(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    // localStorage not available
  }
}

/**
 * Syncs tutorial state with Supabase user_metadata and localStorage.
 * Call this once at the app root level.
 */
export function useTutorialPersistence() {
  const user = useAuthStore((state) => state.user);
  const authLoading = useAuthStore((state) => state.loading);
  const { hydrate, setIsLoading, tutorialCompleted, tutorialSkipped, currentTutorialStep } = useTutorialStore();

  // Track if we've already loaded initial state
  const hasLoadedRef = useRef(false);
  // Track previous user ID to detect auth changes
  const prevUserIdRef = useRef<string | null>(null);

  /**
   * Load tutorial status from the appropriate source
   */
  const loadTutorialStatus = useCallback(async () => {
    setIsLoading(true);

    try {
      if (user && !user.is_anonymous) {
        // Authenticated user - load from Supabase user_metadata
        const completed = user.user_metadata?.tutorial_completed ?? false;
        const skipped = user.user_metadata?.tutorial_skipped ?? false;
        const progress = user.user_metadata?.tutorial_progress;

        // Check if there's localStorage data to migrate
        const localStatus = getLocalStorageStatus();
        if (localStatus.tutorial_completed || localStatus.tutorial_skipped) {
          // User has local progress - migrate to Supabase if more advanced
          const shouldMigrate =
            (localStatus.tutorial_completed && !completed) ||
            (localStatus.tutorial_skipped && !skipped);

          if (shouldMigrate) {
            await persistToSupabase({
              tutorial_completed: localStatus.tutorial_completed || completed,
              tutorial_skipped: localStatus.tutorial_skipped || skipped,
              tutorial_progress: localStatus.tutorial_progress ?? progress,
            });
            // Clear localStorage after successful migration
            clearLocalStorageStatus();
          }
        }

        hydrate({
          tutorialCompleted: completed || localStatus.tutorial_completed,
          tutorialSkipped: skipped || localStatus.tutorial_skipped,
          currentTutorialStep: progress ?? localStatus.tutorial_progress,
        });
      } else {
        // Anonymous user or not logged in - use localStorage
        const localStatus = getLocalStorageStatus();
        hydrate({
          tutorialCompleted: localStatus.tutorial_completed,
          tutorialSkipped: localStatus.tutorial_skipped,
          currentTutorialStep: localStatus.tutorial_progress,
        });
      }
    } catch (error) {
      // On error, default to showing the tutorial
      hydrate({
        tutorialCompleted: false,
        tutorialSkipped: false,
      });
    }
  }, [user, hydrate, setIsLoading]);

  /**
   * Persist tutorial status to Supabase user_metadata
   */
  const persistToSupabase = async (status: TutorialStatus): Promise<void> => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          tutorial_completed: status.tutorial_completed,
          tutorial_skipped: status.tutorial_skipped,
          tutorial_progress: status.tutorial_progress,
        },
      });
      if (error) {
        throw error;
      }
    } catch (error) {
      // Silently fail - tutorial state is not critical
    }
  };

  // Load initial tutorial status when auth is ready
  useEffect(() => {
    if (authLoading) {
      return;
    }

    const currentUserId = user?.id ?? null;
    const userChanged = prevUserIdRef.current !== currentUserId;

    // Load status on initial mount or when user changes
    if (!hasLoadedRef.current || userChanged) {
      hasLoadedRef.current = true;
      prevUserIdRef.current = currentUserId;
      loadTutorialStatus();
    }
  }, [authLoading, user, loadTutorialStatus]);

  return {
    /**
     * Persist tutorial completion to appropriate storage
     */
    persistCompletion: useCallback(async () => {
      const status: TutorialStatus = {
        tutorial_completed: true,
        tutorial_skipped: false,
      };

      if (user && !user.is_anonymous) {
        await persistToSupabase(status);
      }
      // Always save to localStorage as backup
      setLocalStorageStatus(status);
    }, [user]),

    /**
     * Persist tutorial skip to appropriate storage
     */
    persistSkip: useCallback(async () => {
      const status: TutorialStatus = {
        tutorial_completed: false,
        tutorial_skipped: true,
      };

      if (user && !user.is_anonymous) {
        await persistToSupabase(status);
      }
      // Always save to localStorage as backup
      setLocalStorageStatus(status);
    }, [user]),

    /**
     * Persist mid-tutorial progress for resume functionality
     */
    persistProgress: useCallback(async (step: number) => {
      const status: TutorialStatus = {
        tutorial_completed: false,
        tutorial_skipped: false,
        tutorial_progress: step,
      };

      if (user && !user.is_anonymous) {
        await persistToSupabase(status);
      }
      // Always save to localStorage as backup
      setLocalStorageStatus(status);
    }, [user]),

    /**
     * Reset tutorial status (for development/testing)
     */
    resetTutorialStatus: useCallback(async () => {
      const status: TutorialStatus = {
        tutorial_completed: false,
        tutorial_skipped: false,
        tutorial_progress: 0,
      };

      if (user && !user.is_anonymous) {
        await persistToSupabase(status);
      }
      clearLocalStorageStatus();
    }, [user]),
  };
}

/**
 * Hook to automatically persist tutorial state changes
 * Use this in TutorialTour component to auto-persist on completion/skip
 */
export function useTutorialAutoPersist() {
  const tutorialCompleted = useTutorialStore((state) => state.tutorialCompleted);
  const tutorialSkipped = useTutorialStore((state) => state.tutorialSkipped);
  const currentStep = useTutorialStore((state) => state.currentTutorialStep);
  const isTutorialActive = useTutorialStore((state) => state.isTutorialActive);
  const user = useAuthStore((state) => state.user);

  // Track previous values to detect changes
  const prevCompletedRef = useRef(tutorialCompleted);
  const prevSkippedRef = useRef(tutorialSkipped);
  const prevStepRef = useRef(currentStep);

  useEffect(() => {
    // Detect completion
    if (tutorialCompleted && !prevCompletedRef.current) {
      const status: TutorialStatus = {
        tutorial_completed: true,
        tutorial_skipped: false,
      };

      if (user && !user.is_anonymous) {
        supabase.auth.updateUser({
          data: {
            tutorial_completed: true,
            tutorial_skipped: false,
            tutorial_progress: undefined,
          },
        }).catch(() => {
          // Silently fail
        });
      }
      setLocalStorageStatus(status);
    }

    // Detect skip
    if (tutorialSkipped && !prevSkippedRef.current) {
      const status: TutorialStatus = {
        tutorial_completed: false,
        tutorial_skipped: true,
      };

      if (user && !user.is_anonymous) {
        supabase.auth.updateUser({
          data: {
            tutorial_completed: false,
            tutorial_skipped: true,
            tutorial_progress: undefined,
          },
        }).catch(() => {
          // Silently fail
        });
      }
      setLocalStorageStatus(status);
    }

    // Persist step progress during active tutorial
    if (isTutorialActive && currentStep !== prevStepRef.current && currentStep > 0) {
      const status: TutorialStatus = {
        tutorial_completed: false,
        tutorial_skipped: false,
        tutorial_progress: currentStep,
      };

      if (user && !user.is_anonymous) {
        supabase.auth.updateUser({
          data: {
            tutorial_progress: currentStep,
          },
        }).catch(() => {
          // Silently fail
        });
      }
      setLocalStorageStatus(status);
    }

    // Update refs
    prevCompletedRef.current = tutorialCompleted;
    prevSkippedRef.current = tutorialSkipped;
    prevStepRef.current = currentStep;
  }, [tutorialCompleted, tutorialSkipped, currentStep, isTutorialActive, user]);
}
