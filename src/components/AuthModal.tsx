import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/hooks/useAuth-context';
import { toast } from 'sonner';
import { Loader2, KeyRound } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
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
        // This relies on "Confirm email" being disabled in Supabase project settings.
        // The onAuthStateChange listener in useAuth will handle setting the user and session.
        toast.success('Account created! You are now logged in.');
        onOpenChange(false);
      }
    } else if (view === 'update_password') {
      ({ error } = await updatePassword(password));
      if (!error) {
        toast.success('Password updated successfully!');
        onOpenChange(false);
      }
    } else { // forgot_password
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
          // Reset state on close
          setTimeout(() => {
              setView('sign_in');
              setEmail('');
              setPassword('');
          }, 200);
      }
      onOpenChange(isOpen);
  }
  
  const getTitle = () => {
    if (view === 'sign_up') return 'Create an account';
    if (view === 'forgot_password') return 'Reset your password';
    if (view === 'update_password') return 'Update Your Password';
    return 'Sign In to Your Account';
  }

  const getDescription = () => {
    if (view === 'sign_up') return "Enter your email and password to get started.";
    if (view === 'forgot_password') return "We'll send a password reset link to your email.";
    if (view === 'update_password') return 'Enter a new password for your account.';
    return "Welcome back! Please enter your details.";
  }

  const getButtonText = () => {
    if (view === 'sign_up') return 'Sign Up';
    if (view === 'forgot_password') return 'Send Reset Link';
    if (view === 'update_password') return 'Update Password';
    return 'Sign In';
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <VisuallyHidden>
          <DialogTitle>Authentication</DialogTitle>
        </VisuallyHidden>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5" />
            {getTitle()}
          </DialogTitle>
          <DialogDescription>{getDescription()}</DialogDescription>
        </DialogHeader>
        <Card>
          <form onSubmit={handleAuthAction}>
            <CardContent className="space-y-4 pt-6">
              {view !== 'update_password' && (
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
              )}
              {view !== 'forgot_password' && (
                <div className="space-y-2">
                  <Label htmlFor="password">{view === 'update_password' ? 'New Password' : 'Password'}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-4">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <Loader2 className="animate-spin" /> : getButtonText()}
              </Button>
              <div className="text-center text-sm text-slate-500">
                {view === 'sign_in' && (
                  <div className="space-y-2">
                    <button type="button" onClick={() => setView('forgot_password')} className="underline hover:text-slate-800">Forgot password?</button>
                    <p>Don't have an account? <button type="button" onClick={() => setView('sign_up')} className="font-semibold underline hover:text-slate-800">Sign up</button></p>
                  </div>
                )}
                {view === 'sign_up' && (
                  <p>Already have an account? <button type="button" onClick={() => setView('sign_in')} className="font-semibold underline hover:text-slate-800">Sign in</button></p>
                )}
                {view === 'forgot_password' && (
                  <p>Remembered your password? <button type="button" onClick={() => setView('sign_in')} className="font-semibold underline hover:text-slate-800">Sign in</button></p>
                )}
              </div>
            </CardFooter>
          </form>
        </Card>
      </DialogContent>
    </Dialog>
  );
};
