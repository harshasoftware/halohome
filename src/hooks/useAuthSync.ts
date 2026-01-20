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
import { FunctionsHttpError } from '@supabase/supabase-js';

async function reconcilePaymentsIfAvailable(user: { is_anonymous?: boolean } | null) {
  // Only reconcile for real accounts (not anonymous sessions)
  if (!user || user.is_anonymous) return;

  // Avoid repeated retries within a single tab session if the function isn't deployed yet.
  const disabledUntil = sessionStorage.getItem('reconcilePaymentsDisabledUntil');
  if (disabledUntil && Number(disabledUntil) > Date.now()) return;

  const hasReconciled = sessionStorage.getItem('reconciledPayments');
  if (hasReconciled) return;

  const { data, error } = await supabase.functions.invoke('reconcile-payments');

  if (error) {
    // If the function is not deployed, Supabase returns 404 which the browser reports like a CORS failure.
    // Throttle further attempts for ~15 minutes to avoid noisy logs, but keep the ability to reconcile later.
    if (error instanceof FunctionsHttpError && error.context?.status === 404) {
      sessionStorage.setItem('reconcilePaymentsDisabledUntil', String(Date.now() + 15 * 60 * 1000));
      return;
    }

    // For transient errors, don't mark as reconciled (so a later sign-in/session can retry).
    console.error('[Auth] Failed to reconcile payments:', error.message);
    return;
  }

  // Mark completed (even if reconciled=0) so we don't re-run every page load.
  sessionStorage.setItem('reconciledPayments', 'true');

  if (data?.reconciled > 0) {
    // Optional: allow other pages to decide whether to show a toast / reload.
    sessionStorage.setItem('reconciledPaymentsCount', String(data.reconciled));
  }
}

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

        if (event === 'SIGNED_IN' && session?.user) {
          // Check if we need to merge anonymous user data after OAuth sign-in
          const anonymousUserId = localStorage.getItem('anonymous_user_id_for_merge');
          if (anonymousUserId && anonymousUserId !== session.user.id && !session.user.is_anonymous) {
            console.log('[Auth] Detected sign-in after anonymous session, merging data...');
            console.log('[Auth] Anonymous user ID:', anonymousUserId);
            console.log('[Auth] New user ID:', session.user.id);

            // Call the server-side function to merge anonymous user data
            supabase.rpc('migrate_anonymous_user_data', {
              old_user_id: anonymousUserId,
              new_user_id: session.user.id,
            }).then(({ error }) => {
              if (error) {
                console.error('[Auth] Failed to migrate anonymous user data:', error.message);
              } else {
                console.log('[Auth] Successfully migrated anonymous user data');
              }
              // Clean up the stored ID regardless of success/failure
              localStorage.removeItem('anonymous_user_id_for_merge');
            });
          } else if (anonymousUserId) {
            // Clean up if IDs match or user is still anonymous
            localStorage.removeItem('anonymous_user_id_for_merge');
          }

          // Reconcile purchases on sign-in (if function exists).
          reconcilePaymentsIfAvailable(session.user).catch(() => {});
        }
      }
    );

    // Get initial session, sign in anonymously if none exists
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session) {
        setSession(session);
        setUser(session.user);
        setLoading(false);
        // User may already be signed in (INITIAL_SESSION). Reconcile once per tab if available.
        reconcilePaymentsIfAvailable(session.user).catch(() => {});
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
    // Store anonymous user ID before OAuth redirect so we can merge their data
    // after they sign in with an existing Google account
    if (user?.is_anonymous) {
      localStorage.setItem('anonymous_user_id_for_merge', user.id);
      console.log('[Auth] Stored anonymous user ID for potential data merge:', user.id);
    }

    // Always use regular OAuth sign-in
    // Note: linkIdentity was removed because it causes redirect errors when the
    // Google account is already linked to another user (identity_already_exists)
    // and the error redirect happens before we can fall back to regular OAuth.
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
