/**
 * SignUpPromptCard Component
 *
 * Auth gating prompt card shown to non-authenticated users.
 * Prompts users to sign up to unlock their top locations and premium content.
 * Supports Google One Tap sign-in and email authentication.
 */

import React, { useState, useCallback } from 'react';
import { Lock, Mail } from 'lucide-react';
import { AuthModal } from '@/components/AuthModal';
import { useAuthActions } from '@/hooks/useAuthSync';
import { useGoogleOneTap } from '@/hooks/useGoogleOneTap';
import { CATEGORY_INFO, type ScoutCategory } from '../../../utils/scout-utils';
import type { SignUpPromptCardProps } from '../types';

/**
 * Sign up prompt card for gated content
 * Shows authentication options to unlock location data
 */
export const SignUpPromptCard: React.FC<SignUpPromptCardProps> = ({
  remainingCount,
  category,
  isTopLocations = false,
}) => {
  const { signInWithGoogle } = useAuthActions();
  const { showPrompt: showOneTap, isAvailable: oneTapAvailable } = useGoogleOneTap({ disabled: true }); // disabled=true prevents auto-show
  const [showAuthModal, setShowAuthModal] = useState(false);
  const categoryLabel = category === 'overall' ? 'all categories' : CATEGORY_INFO[category as ScoutCategory]?.label?.toLowerCase() || category;

  // Handle Google sign-in: try One Tap first, fall back to OAuth redirect
  const handleGoogleSignIn = useCallback(() => {
    if (oneTapAvailable) {
      // Show Google One Tap popup
      showOneTap();
    } else {
      // Fall back to OAuth redirect
      signInWithGoogle();
    }
  }, [oneTapAvailable, showOneTap, signInWithGoogle]);

  return (
    <>
      <div className="relative p-5 rounded-xl bg-white/5 dark:bg-[#0a0a0a] border border-white/10 backdrop-blur-sm">
        {/* Lock Icon */}
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
            <Lock className="h-4 w-4 text-zinc-300" />
          </div>
        </div>

        <div className="text-center pt-3">
          <p className="text-sm font-medium text-slate-800 dark:text-white mb-1">
            {isTopLocations ? (
              <>Unlock Your Top {remainingCount} Locations</>
            ) : (
              <>+{remainingCount} more locations</>
            )}
          </p>
          <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">
            {isTopLocations ? (
              <>Sign up free to reveal your best places for {categoryLabel}</>
            ) : (
              <>Sign up free to see all your best places for {categoryLabel}</>
            )}
          </p>

          {/* Auth buttons */}
          <div className="space-y-2">
            {/* Google Sign In - Uses One Tap when available */}
            <button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-white dark:bg-white text-black border border-slate-200 dark:border-white/20 hover:bg-slate-50 dark:hover:bg-zinc-200 transition-colors"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-sm font-medium text-slate-700 dark:text-black">
                Continue with Google
              </span>
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
              <span className="text-xs text-slate-400 dark:text-zinc-500">or</span>
              <div className="flex-1 h-px bg-slate-200 dark:bg-white/10" />
            </div>

            {/* Email Sign In/Up */}
            <button
              onClick={() => setShowAuthModal(true)}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
            >
              <Mail className="w-4 h-4 text-slate-600 dark:text-zinc-400" />
              <span className="text-sm font-medium text-slate-700 dark:text-white">
                Continue with Email
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal
        open={showAuthModal}
        onOpenChange={setShowAuthModal}
        initialView="sign_up"
      />
    </>
  );
};

export default SignUpPromptCard;
