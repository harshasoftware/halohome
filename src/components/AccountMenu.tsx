/**
 * AccountMenu Component
 * Navbar account dropdown with sign in/out and chart management
 */

import React, { useState } from 'react';
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
import { User, LogIn, LogOut, ChevronDown, Star, Heart } from 'lucide-react';

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
  const { user, signOut, signInWithGoogle, loading } = useAuth();
  const isRealUser = useIsRealUser();
  const { favorites } = useFavoriteCities();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);

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
    const { error } = await signInWithGoogle();
    if (error) {
      toast.error('Failed to sign in with Google');
    }
    setIsSigningIn(false);
  };

  // If not a real user (including anonymous users), show sign in button
  if (!isRealUser) {
    return (
      <>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size={isMobile ? 'icon' : 'default'}
              className={isMobile ? 'h-9 w-9 rounded-full' : 'gap-2'}
              disabled={loading || isSigningIn}
            >
              <LogIn className="h-4 w-4" />
              {!isMobile && <span>Sign In</span>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56 z-[200]">
            <DropdownMenuLabel>Sign in to save your charts</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleGoogleSignIn} disabled={isSigningIn}>
              <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
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
              Continue with Google
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setShowAuthModal(true)}>
              <User className="mr-2 h-4 w-4" />
              Sign in with Email
            </DropdownMenuItem>
          </DropdownMenuContent>
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
            <Heart className="mr-2 h-4 w-4" />
            Favorite Cities
            {favorites.length > 0 && (
              <span className="ml-auto text-xs text-muted-foreground">
                {favorites.length}
              </span>
            )}
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut} className="text-red-600 dark:text-red-400">
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default AccountMenu;
