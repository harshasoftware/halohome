/**
 * Auth Provider and Hook - Zustand-backed authentication
 *
 * This provides backwards compatibility with the existing Context-based API
 * while using Zustand for state management under the hood.
 *
 * Components can either:
 * 1. Use useAuth() hook (backwards compatible Context API)
 * 2. Use useAuthStore selectors directly (recommended for new code)
 *
 * Also includes Google One Tap integration for automatic sign-in prompts.
 */

import React from 'react';
import { useLocation } from 'react-router-dom';
import { AuthContext, AuthContextType } from './useAuth-context';
import { useAuthSync, useAuthActions } from './useAuthSync';
import { useAuthStore } from '@/stores/authStore';
import { useGoogleOneTap } from './useGoogleOneTap';

/**
 * AuthProvider - Backwards compatible wrapper
 *
 * Uses useAuthSync to sync Supabase auth state with Zustand store,
 * then provides the Context API for backwards compatibility.
 * Also enables Google One Tap for automatic sign-in prompts (only on app pages, not landing page).
 */
export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Sync Supabase auth state with Zustand store
  useAuthSync();

  // Check if we're on the landing page
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  // Enable Google One Tap for automatic sign-in prompts
  // Only shows on app pages (not landing page), and when user is not logged in
  useGoogleOneTap({
    disabled: isLandingPage,
    autoSelect: true,
    context: 'signin',
  });

  // Get state from Zustand store
  const user = useAuthStore((state) => state.user);
  const session = useAuthStore((state) => state.session);
  const loading = useAuthStore((state) => state.loading);
  const isPasswordRecovery = useAuthStore((state) => state.isPasswordRecovery);
  const clearPasswordRecovery = useAuthStore((state) => state.clearPasswordRecovery);

  // Get async actions from useAuthActions hook
  const {
    signUp,
    signInWithPassword,
    signInWithGoogle,
    resetPasswordForEmail,
    updatePassword,
    signOut,
  } = useAuthActions();

  return (
    <AuthContext.Provider value={{
      user,
      session,
      loading,
      isPasswordRecovery,
      signUp,
      signInWithPassword,
      signInWithGoogle,
      signOut,
      resetPasswordForEmail,
      updatePassword,
      clearPasswordRecovery,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// Re-export useAuth for backwards compatibility
export { useAuth } from './useAuth-context';
