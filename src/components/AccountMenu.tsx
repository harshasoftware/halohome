/**
 * AccountMenu Component
 * Navbar account dropdown with sign in/out and chart management
 */

import React, { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth-context';
import { useIsRealUser } from '@/stores/authStore';
import { useFavoriteCities } from '@/hooks/useFavoriteCities';
import { AuthModal } from './AuthModal';
import { toast } from 'sonner';
import { User, LogOut, ChevronDown, Star, Crown, Mail, Save, MapPin, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAISubscription } from '@/features/globe/ai/useAISubscription';

interface AccountMenuProps {
  onOpenChartPicker?: () => void;
  onFavoriteSelect?: (lat: number, lng: number, name: string) => void;
  onOpenFavoritesPanel?: () => void;
  isMobile?: boolean;
}

export const AccountMenu: React.FC<AccountMenuProps> = ({
  onOpenChartPicker,
  onFavoriteSelect,
  onOpenFavoritesPanel,
  isMobile = false,
}) => {
  const navigate = useNavigate();
  const { user, signOut, signInWithGoogle, loading } = useAuth();
  const isRealUser = useIsRealUser();
  const { favorites } = useFavoriteCities();
  const { status: subscriptionStatus } = useAISubscription();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Note: Google One Tap auto-shows via AuthProvider for non-logged-in users
  // For explicit button clicks, we use OAuth redirect (more reliable than FedCM)

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast.error('Failed to sign out');
    } else {
      toast.success('Signed out successfully');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);

    // Always use OAuth redirect for explicit sign-in button clicks
    // One Tap is better suited for automatic prompts, not button clicks
    // This avoids FedCM issues and provides a more reliable sign-in experience
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error('Failed to sign in with Google');
      setIsSigningIn(false);
    }
    // Don't reset isSigningIn on success - OAuth will redirect
  };

  // Dropdown state - supports both hover and click
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const openedByClickRef = useRef(false);

  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (!isDropdownOpen) {
      openedByClickRef.current = false;
      setIsDropdownOpen(true);
    }
  };

  const handleMouseLeave = () => {
    // Don't close on hover-leave if opened by click
    if (openedByClickRef.current) return;

    hoverTimeoutRef.current = setTimeout(() => {
      setIsDropdownOpen(false);
    }, 200);
  };

  // Handle click and click-outside/Escape
  const handleOpenChange = (open: boolean) => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);

    if (open) {
      openedByClickRef.current = true;
    } else {
      openedByClickRef.current = false;
    }
    setIsDropdownOpen(open);
  };

  // If not a real user (including anonymous users), show sign in button
  if (!isRealUser) {
    return (
      <>
        <DropdownMenu open={isDropdownOpen} onOpenChange={handleOpenChange}>
          <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} data-tour="account-menu">
            <DropdownMenuTrigger asChild>
              <button
                className={`flex items-center justify-center transition-colors border ${
                  isMobile
                    ? 'h-9 w-9 rounded-full border-slate-300 dark:border-white/20 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                    : 'gap-2 px-4 py-2 rounded-full text-sm font-medium border-slate-300 dark:border-white/20 text-slate-700 dark:text-white hover:bg-slate-100 dark:hover:bg-white/10'
                }`}
                disabled={loading || isSigningIn}
              >
                <User className="h-4 w-4" />
                {!isMobile && <span>Sign In</span>}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-72 z-[200] p-0 overflow-hidden rounded-2xl border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 shadow-xl"
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              {/* Sign In Options - CTAs first for less friction */}
              <div className="p-4 space-y-3">
                {/* Google Button - Primary */}
                <button
                  onClick={handleGoogleSignIn}
                  disabled={isSigningIn}
                  className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-xl bg-slate-100 dark:bg-white hover:bg-slate-200 dark:hover:bg-zinc-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" viewBox="0 0 24 24">
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
                  <span className="font-medium text-sm text-slate-800 dark:text-zinc-800">
                    {isSigningIn ? 'Signing in...' : 'Continue with Google'}
                  </span>
                </button>

                {/* Divider */}
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200 dark:border-white/10" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-2 bg-white dark:bg-zinc-900 text-slate-400 dark:text-zinc-500">or</span>
                  </div>
                </div>

                {/* Email Option - Secondary */}
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-600 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-sm"
                >
                  <Mail className="h-4 w-4" />
                  <span>Sign in with Email</span>
                </button>
              </div>

              {/* Benefits - below CTAs */}
              <div className="px-4 pb-3 pt-1">
                <ul className="space-y-1.5 text-xs text-slate-500 dark:text-zinc-400">
                  <li className="flex items-center gap-2">
                    <Save className="h-3 w-3 text-blue-500 dark:text-blue-400 flex-shrink-0" />
                    <span>Save unlimited birth charts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <MapPin className="h-3 w-3 text-rose-500 dark:text-rose-400 flex-shrink-0" />
                    <span>Bookmark favorite locations</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-3 w-3 text-amber-500 dark:text-amber-400 flex-shrink-0" />
                    <span>Access AI astrology insights</span>
                  </li>
                </ul>
              </div>

              {/* Footer - No credit card */}
              <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 flex items-center justify-center gap-2">
                <img
                  src="/logo.png"
                  alt="Astrocarto"
                  className="w-5 h-5 object-contain"
                />
                <span className="text-xs text-slate-500 dark:text-zinc-400">Free forever, no credit card</span>
              </div>
            </DropdownMenuContent>
          </div>
        </DropdownMenu>

        <AuthModal open={showAuthModal} onOpenChange={setShowAuthModal} />
      </>
    );
  }

  // Signed in - show account dropdown
  const userEmail = user.email || 'User';
  const userName = user.user_metadata?.full_name || user.user_metadata?.name || userEmail;
  const avatarUrl = user.user_metadata?.avatar_url;

  return (
    <div data-tour="account-menu">
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={isMobile ? 'icon' : 'default'}
          className={isMobile ? 'h-9 w-9 rounded-full p-0' : 'gap-2'}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="Profile"
              className="h-6 w-6 rounded-full"
            />
          ) : (
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
              <User className="h-3.5 w-3.5 text-slate-600 dark:text-slate-300" />
            </div>
          )}
          {!isMobile && (
            <>
              <span className="max-w-[120px] truncate text-sm">
                {userName.split(' ')[0]}
              </span>
              <ChevronDown className="h-3.5 w-3.5 opacity-50" />
            </>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-[200]">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground truncate">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {onOpenChartPicker && (
          <DropdownMenuItem onClick={onOpenChartPicker}>
            <Star className="mr-2 h-4 w-4" />
            My Charts
          </DropdownMenuItem>
        )}
        {/* Favorites - Opens panel on desktop */}
        {onOpenFavoritesPanel && (
          <DropdownMenuItem onClick={onOpenFavoritesPanel}>
            <Star className="mr-2 h-4 w-4" />
            Favorite Cities
            {favorites.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                {favorites.length}
              </span>
            )}
          </DropdownMenuItem>
        )}
        {/* Subscription Management */}
        <DropdownMenuItem onClick={() => navigate('/ai-subscription')}>
          <Crown className="mr-2 h-4 w-4 text-amber-500" />
          Manage Subscription
          {subscriptionStatus && subscriptionStatus.planType !== 'free' && (
            <span className="ml-auto text-xs text-amber-500">
              {subscriptionStatus.planType === 'starter' ? 'Traveler' : 'Mystic'}
            </span>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-red-600 dark:text-red-400">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
};

export default AccountMenu;
