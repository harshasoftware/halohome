import React, { useCallback, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Check, Loader2, Mail } from 'lucide-react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faApple } from '@fortawesome/free-brands-svg-icons';
import { supabase } from '@/integrations/supabase/client';

type WaitlistStatus = 'idle' | 'loading' | 'success' | 'error';

interface ScanWaitlistModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ScanWaitlistModal({ open, onOpenChange }: ScanWaitlistModalProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<WaitlistStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');

  const reset = useCallback(() => {
    setEmail('');
    setStatus('idle');
    setErrorMsg('');
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const normalized = email.toLowerCase().trim();
      if (!normalized || !normalized.includes('@')) {
        setErrorMsg('Please enter a valid email');
        setStatus('error');
        return;
      }

      setStatus('loading');
      setErrorMsg('');

      try {
        const { error } = await supabase.from('mobile_waitlist').insert({ email: normalized });

        if (error) {
          // Unique constraint violation - email already exists
          // Supabase Postgres unique_violation code
          if ((error as any).code === '23505') {
            setStatus('success');
            return;
          }
          throw error;
        }

        setStatus('success');
      } catch (err) {
        console.error('[ScanWaitlistModal] Waitlist signup error:', err);
        setErrorMsg('Something went wrong. Please try again.');
        setStatus('error');
      }
    },
    [email]
  );

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) reset();
      }}
    >
      <DialogContent className="sm:max-w-lg p-8 bg-white text-slate-900 border-slate-200 dark:bg-[#0a0a0a] dark:text-white dark:border-white/10">
        <DialogHeader>
          <DialogTitle className="text-xl">Scan: Interior 3D Analysis</DialogTitle>
          <DialogDescription className="text-slate-600 dark:text-zinc-400">
            Join the waitlist for Scan — our iOS app that uses LiDAR to create 3D interior models and analyze room harmony.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-4 space-y-5">
          {/* Platform badge (mirrors landing page) */}
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-black/5 border border-slate-200 dark:bg-white/5 dark:border-white/10">
              <FontAwesomeIcon icon={faApple} className="w-5 h-5 text-slate-700 dark:text-zinc-300" />
              <span className="text-sm text-slate-700 dark:text-zinc-300">iPhone Pro with LiDAR</span>
            </div>
          </div>

          {status === 'success' ? (
            <div className="flex items-center justify-center gap-2 text-emerald-400 py-6">
              <Check className="w-5 h-5" />
              <span>You&apos;re on the list! We&apos;ll notify you at launch.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-zinc-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (status === 'error') setStatus('idle');
                  }}
                  placeholder="Enter your email"
                  autoComplete="off"
                  spellCheck={false}
                  autoCorrect="off"
                  autoCapitalize="none"
                  name="scan-waitlist-email"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-white border border-[#F0A6B3]/30 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-[#F0A6B3]/60 transition-all dark:bg-white/5 dark:text-white dark:placeholder-zinc-500"
                />
              </div>
              <button
                type="submit"
                disabled={status === 'loading'}
                className="px-6 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 dark:bg-zinc-900 dark:hover:bg-zinc-800"
              >
                {status === 'loading' ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Notify Me'}
              </button>
            </form>
          )}

          {status === 'error' && <p className="text-sm text-red-400">{errorMsg}</p>}
        </div>
      </DialogContent>
    </Dialog>
  );
}

