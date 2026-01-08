/**
 * Google One Tap Hook
 *
 * Provides automatic Google sign-in prompt using Google Identity Services.
 * Shows a non-intrusive prompt in the corner for quick sign-in.
 *
 * Requires VITE_GOOGLE_CLIENT_ID environment variable.
 */

import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore, useIsRealUser } from '@/stores/authStore';

// Google Identity Services types
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: GoogleOneTapConfig) => void;
          prompt: (callback?: (notification: PromptNotification) => void) => void;
          cancel: () => void;
          disableAutoSelect: () => void;
        };
      };
    };
  }
}

interface GoogleOneTapConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  itp_support?: boolean;
  use_fedcm_for_prompt?: boolean;
}

interface GoogleCredentialResponse {
  credential: string; // JWT ID token
  select_by: string;
}

interface PromptNotification {
  isDisplayed: () => boolean;
  isNotDisplayed: () => boolean;
  getNotDisplayedReason: () => string;
  isSkippedMoment: () => boolean;
  getSkippedReason: () => string;
  isDismissedMoment: () => boolean;
  getDismissedReason: () => string;
}

interface UseGoogleOneTapOptions {
  /** Disable the One Tap prompt entirely */
  disabled?: boolean;
  /** Auto-select if only one Google account */
  autoSelect?: boolean;
  /** Context for the prompt */
  context?: 'signin' | 'signup' | 'use';
}

const GOOGLE_GSI_SCRIPT_ID = 'google-gsi-script';
const GOOGLE_GSI_URL = 'https://accounts.google.com/gsi/client';

/**
 * Hook to enable Google One Tap sign-in
 */
export function useGoogleOneTap(options: UseGoogleOneTapOptions = {}) {
  const { disabled = false, autoSelect = true, context = 'signin' } = options;

  const loading = useAuthStore((state) => state.loading);
  const isRealUser = useIsRealUser(); // True only for non-anonymous authenticated users
  const isInitialized = useRef(false);
  const scriptLoaded = useRef(false);

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  // Handle the credential response from Google
  const handleCredentialResponse = useCallback(async (response: GoogleCredentialResponse) => {
    try {
      console.log('[GoogleOneTap] Received credential, signing in...');

      // Sign in with Supabase using the Google ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.credential,
      });

      if (error) {
        console.error('[GoogleOneTap] Sign-in failed:', error.message);
      } else {
        console.log('[GoogleOneTap] Sign-in successful:', data.user?.email);
      }
    } catch (err) {
      console.error('[GoogleOneTap] Error during sign-in:', err);
    }
  }, []);

  // Load the Google Identity Services script
  const loadScript = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      // Check if already loaded
      if (document.getElementById(GOOGLE_GSI_SCRIPT_ID)) {
        scriptLoaded.current = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = GOOGLE_GSI_SCRIPT_ID;
      script.src = GOOGLE_GSI_URL;
      script.async = true;
      script.defer = true;

      script.onload = () => {
        scriptLoaded.current = true;
        resolve();
      };

      script.onerror = () => {
        reject(new Error('Failed to load Google Identity Services'));
      };

      document.head.appendChild(script);
    });
  }, []);

  // Initialize One Tap
  const initializeOneTap = useCallback(() => {
    if (!window.google?.accounts?.id || !clientId || isInitialized.current) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: autoSelect,
        cancel_on_tap_outside: true,
        context,
        itp_support: true,
        use_fedcm_for_prompt: true, // Use FedCM for better UX
      });

      isInitialized.current = true;
      console.log('[GoogleOneTap] Initialized');
    } catch (err) {
      console.error('[GoogleOneTap] Initialization failed:', err);
    }
  }, [clientId, handleCredentialResponse, autoSelect, context]);

  // Show the One Tap prompt
  const showPrompt = useCallback(() => {
    if (!window.google?.accounts?.id || !isInitialized.current) {
      return;
    }

    window.google.accounts.id.prompt((notification) => {
      if (notification.isNotDisplayed()) {
        console.log('[GoogleOneTap] Prompt not displayed:', notification.getNotDisplayedReason());
      } else if (notification.isSkippedMoment()) {
        console.log('[GoogleOneTap] Prompt skipped:', notification.getSkippedReason());
      } else if (notification.isDismissedMoment()) {
        console.log('[GoogleOneTap] Prompt dismissed:', notification.getDismissedReason());
      }
    });
  }, []);

  // Cancel the One Tap prompt
  const cancelPrompt = useCallback(() => {
    if (window.google?.accounts?.id) {
      window.google.accounts.id.cancel();
    }
  }, []);

  useEffect(() => {
    // Don't show if disabled, already logged in with real account, or no client ID
    // Show for anonymous users to encourage sign-in
    if (disabled || isRealUser || loading || !clientId) {
      if (!clientId) {
        console.warn('[GoogleOneTap] VITE_GOOGLE_CLIENT_ID not configured');
      }
      return;
    }

    let mounted = true;

    const setup = async () => {
      try {
        await loadScript();

        if (!mounted) return;

        // Wait for script to be fully available
        const waitForGoogle = () => {
          return new Promise<void>((resolve) => {
            const check = () => {
              if (window.google?.accounts?.id) {
                resolve();
              } else {
                setTimeout(check, 100);
              }
            };
            check();
          });
        };

        await waitForGoogle();

        if (!mounted) return;

        initializeOneTap();

        // Small delay before showing prompt for better UX
        setTimeout(() => {
          if (mounted && !isRealUser) {
            showPrompt();
          }
        }, 1000);
      } catch (err) {
        console.error('[GoogleOneTap] Setup failed:', err);
      }
    };

    setup();

    return () => {
      mounted = false;
      cancelPrompt();
    };
  }, [disabled, isRealUser, loading, clientId, loadScript, initializeOneTap, showPrompt, cancelPrompt]);

  return {
    showPrompt,
    cancelPrompt,
    isAvailable: !!clientId && scriptLoaded.current,
  };
}

export default useGoogleOneTap;
