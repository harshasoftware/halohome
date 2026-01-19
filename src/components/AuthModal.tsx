import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth-context';
import { toast } from 'sonner';
import { Loader2, Mail, Lock, ArrowLeft } from 'lucide-react';
import { VisuallyHidden } from '@radix-ui/react-visually-hidden';

interface AuthModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialView?: AuthView;
}

type AuthView = 'sign_in' | 'sign_up' | 'forgot_password' | 'update_password';

export const AuthModal: React.FC<AuthModalProps> = ({ open, onOpenChange, initialView = 'sign_in' }) => {
  const [view, setView] = useState<AuthView>(initialView);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithPassword, signUp, resetPasswordForEmail, updatePassword } = useAuth();

  useEffect(() => {
    if (open) {
      setView(initialView);
    }
  }, [open, initialView]);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    let error;

    if (view === 'sign_in') {
      ({ error } = await signInWithPassword(email, password));
      if (!error) {
        toast.success('Successfully signed in!');
        onOpenChange(false);
      }
    } else if (view === 'sign_up') {
      ({ error } = await signUp(email, password));
      if (!error) {
        toast.success('Account created! You are now logged in.');
        onOpenChange(false);
      }
    } else if (view === 'update_password') {
      ({ error } = await updatePassword(password));
      if (!error) {
        toast.success('Password updated successfully!');
        onOpenChange(false);
      }
    } else {
      ({ error } = await resetPasswordForEmail(email));
      if (!error) {
        toast.success('Check your email for a password reset link!');
        onOpenChange(false);
      }
    }

    if (error) {
      toast.error(error.message);
    }

    setLoading(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setTimeout(() => {
        setView('sign_in');
        setEmail('');
        setPassword('');
      }, 200);
    }
    onOpenChange(isOpen);
  };

  const getTitle = () => {
    if (view === 'sign_up') return 'Create your account';
    if (view === 'forgot_password') return 'Reset password';
    if (view === 'update_password') return 'Update password';
    return 'Welcome back';
  };

  const getSubtitle = () => {
    if (view === 'sign_up') return 'Start scouting properties with Vastu insights';
    if (view === 'forgot_password') return "We'll send you a reset link";
    if (view === 'update_password') return 'Choose a new password';
    return 'Sign in to save your Vastu analyses';
  };

  const getButtonText = () => {
    if (view === 'sign_up') return 'Create Account';
    if (view === 'forgot_password') return 'Send Reset Link';
    if (view === 'update_password') return 'Update Password';
    return 'Sign In';
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[400px] p-0 overflow-hidden border-slate-200 dark:border-white/10 bg-white dark:bg-zinc-900 rounded-2xl">
        <VisuallyHidden>
          <DialogTitle>Authentication</DialogTitle>
        </VisuallyHidden>

        {/* Header with logo */}
        <div className="px-6 pt-6 pb-4">
          <div className="flex items-center justify-center mb-4">
            <img
              src="/logo.png"
              alt="Halo Home"
              className="w-12 h-12 object-contain"
            />
          </div>
          <h2 className="text-xl font-semibold text-center text-slate-900 dark:text-white">
            {getTitle()}
          </h2>
          <p className="text-sm text-center text-slate-500 dark:text-zinc-400 mt-1">
            {getSubtitle()}
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleAuthAction} className="px-6 pb-6">
          <div className="space-y-4">
            {view !== 'update_password' && (
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="pl-10 h-11 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                  />
                </div>
              </div>
            )}

            {view !== 'forgot_password' && (
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium text-slate-700 dark:text-zinc-300">
                  {view === 'update_password' ? 'New Password' : 'Password'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-zinc-500" />
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="pl-10 h-11 bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 rounded-xl focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 dark:focus:border-amber-400 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500"
                  />
                </div>
              </div>
            )}

            {/* Forgot password link - only on sign in */}
            {view === 'sign_in' && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setView('forgot_password')}
                  className="text-xs text-slate-500 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40 hover:scale-[1.01] active:scale-[0.99]"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin mx-auto" />
              ) : (
                getButtonText()
              )}
            </button>
          </div>

          {/* Footer links */}
          <div className="mt-6 pt-4 border-t border-slate-200 dark:border-white/10">
            {view === 'sign_in' && (
              <p className="text-sm text-center text-slate-500 dark:text-zinc-400">
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => setView('sign_up')}
                  className="font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                >
                  Sign up
                </button>
              </p>
            )}
            {view === 'sign_up' && (
              <p className="text-sm text-center text-slate-500 dark:text-zinc-400">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setView('sign_in')}
                  className="font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                >
                  Sign in
                </button>
              </p>
            )}
            {(view === 'forgot_password' || view === 'update_password') && (
              <button
                type="button"
                onClick={() => setView('sign_in')}
                className="flex items-center justify-center gap-2 w-full text-sm text-slate-500 dark:text-zinc-400 hover:text-slate-700 dark:hover:text-zinc-200 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to sign in
              </button>
            )}
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
