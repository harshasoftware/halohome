/**
 * Auth Sync Hook - Syncs Supabase auth state with Zustand store
 *
 * This hook should be called once at app root (e.g., App.tsx).
 * It sets up the Supabase auth listener and updates the authStore.
 */

import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import type { AuthError } from '@supabase/supabase-js';

/**
 * Syncs Supabase auth state with Zustand store.
 * Call this once at the app root level.
 */
export function useAuthSync() {
  const { setUser, setSession, setLoading, setPasswordRecovery } = useAuthStore();

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        if (event === 'PASSWORD_RECOVERY') {
          setPasswordRecovery(true);
        }

        if (event === 'SIGNED_IN') {
          // Fire and forget reconcile
          supabase.functions.invoke('reconcile-payments').catch(err => {
            console.error("Failed to reconcile payments on sign-in:", err.message);
          });
        }
      }
    );

    // Get initial session, sign in anonymously if none exists
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setLoading(false);
      } else {
        // No session - sign in anonymously to get a JWT for edge function calls
        // Retry up to 3 times with exponential backoff
        const attemptAnonymousSignIn = async (retries = 3, delay = 1000): Promise<void> => {
          console.log(`[Auth] No session, signing in anonymously... (attempt ${4 - retries}/3)`);
          const { error } = await supabase.auth.signInAnonymously();

          if (error) {
            console.error('[Auth] Anonymous sign-in failed:', error.message);

            if (retries > 1 && error.message.includes('disabled')) {
              // Retry if provider might not be enabled yet
              console.log(`[Auth] Retrying in ${delay}ms...`);
              await new Promise(resolve => setTimeout(resolve, delay));
              return attemptAnonymousSignIn(retries - 1, delay * 2);
            }

            // Give up after retries exhausted
            setLoading(false);
          } else {
            console.log('[Auth] Anonymous sign-in successful');
            // Session will be set by onAuthStateChange listener
          }
        };

        await attemptAnonymousSignIn();
      }
    });

    return () => subscription.unsubscribe();
  }, [setUser, setSession, setLoading, setPasswordRecovery]);
}

/**
 * Auth action hooks - provides async Supabase auth operations.
 * Keeps Supabase calls separate from store state management.
 */
export function useAuthActions() {
  const user = useAuthStore((state) => state.user);
  const clearPasswordRecovery = useAuthStore((state) => state.clearPasswordRecovery);

  const signUp = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    // If current user is anonymous, convert to permanent account to preserve their data
    if (user?.is_anonymous) {
      console.log('[Auth] Converting anonymous user to permanent account to preserve data...');
      const { error } = await supabase.auth.updateUser({
        email,
        password,
      });
      return { error };
    }

    // Otherwise, create a new account
    const { error } = await supabase.auth.signUp({ email, password });
    return { error };
  };

  const signInWithPassword = async (email: string, password: string): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInWithGoogle = async (): Promise<{ error: AuthError | null }> => {
    // If current user is anonymous, link Google identity to preserve their data
    if (user?.is_anonymous) {
      console.log('[Auth] Linking Google identity to anonymous user to preserve data...');
      const { error } = await supabase.auth.linkIdentity({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/guest` },
      });
      return { error };
    }

    // Otherwise, do a regular OAuth sign-in
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/guest` },
    });
    return { error };
  };

  const resetPasswordForEmail = async (email: string): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    return { error };
  };

  const updatePassword = async (password: string): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) {
      clearPasswordRecovery();
    }
    return { error };
  };

  const signOut = async (): Promise<{ error: AuthError | null }> => {
    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user,
    signUp,
    signInWithPassword,
    signInWithGoogle,
    resetPasswordForEmail,
    updatePassword,
    signOut,
  };
}
