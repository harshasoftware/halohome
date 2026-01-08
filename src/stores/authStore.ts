/**
 * Auth Store - Zustand store for authentication state
 *
 * Replaces AuthContext with fine-grained subscriptions.
 * Supabase listener sync is handled by useAuthSync hook.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { User, Session } from '@supabase/supabase-js';

interface AuthState {
  // State
  user: User | null;
  session: Session | null;
  loading: boolean;
  isPasswordRecovery: boolean;

  // Actions (sync only - Supabase calls remain in useAuthActions hook)
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  setPasswordRecovery: (isRecovery: boolean) => void;
  clearPasswordRecovery: () => void;
  reset: () => void;
}

const initialState = {
  user: null,
  session: null,
  loading: true,
  isPasswordRecovery: false,
};

export const useAuthStore = create<AuthState>()(
  devtools(
    immer((set) => ({
      ...initialState,

      setUser: (user) => set((state) => { state.user = user; }),
      setSession: (session) => set((state) => { state.session = session; }),
      setLoading: (loading) => set((state) => { state.loading = loading; }),
      setPasswordRecovery: (isRecovery) => set((state) => {
        state.isPasswordRecovery = isRecovery;
      }),
      clearPasswordRecovery: () => set((state) => {
        state.isPasswordRecovery = false;
      }),
      reset: () => set(initialState),
    })),
    { name: 'auth-store' }
  )
);

// Selectors for fine-grained subscriptions
export const useAuthUser = () => useAuthStore((state) => state.user);
export const useAuthSession = () => useAuthStore((state) => state.session);
export const useAuthLoading = () => useAuthStore((state) => state.loading);
export const useIsAuthenticated = () => useAuthStore((state) => !!state.user);
export const useIsAnonymous = () => useAuthStore((state) => state.user?.is_anonymous === true);
export const useIsRealUser = () => useAuthStore((state) => !!state.user && state.user.is_anonymous !== true);
export const useIsPasswordRecovery = () => useAuthStore((state) => state.isPasswordRecovery);
