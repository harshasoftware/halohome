/**
 * UpgradePromptCard Component
 * Inline upgrade prompt shown in chat when user reaches question limit
 * Displays Traveler and Mystic plans with direct Stripe checkout
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles, Crown, Check, Loader2, Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth-context';
import { toast } from 'sonner';

interface UpgradePromptCardProps {
  questionsUsed?: number;
  questionsLimit?: number;
}

export const UpgradePromptCard: React.FC<UpgradePromptCardProps> = ({
  questionsUsed = 5,
  questionsLimit = 5,
}) => {
  const { user } = useAuth();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: 'starter' | 'pro') => {
    setLoadingPlan(planId);

    try {
      // Use authenticated or anonymous checkout based on user state
      const action = user ? 'createSubscription' : 'subscribeAnonymous';

      const { data, error } = await supabase.functions.invoke('ai-subscription', {
        body: {
          action,
          plan: planId,
          userId: user?.id,
          email: user?.email, // Pass email for Stripe autofill
          successUrl: `${window.location.origin}/ai-subscription?subscription=success`,
          cancelUrl: `${window.location.origin}/guest`,
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL returned');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      toast.error('Failed to start checkout', {
        description: errorMessage.includes('Price ID')
          ? 'Subscription plan not configured. Please contact support.'
          : 'Please try again or contact support.',
      });
    } finally {
      setLoadingPlan(null);
    }
  };

  return (
    <div className="w-full max-w-sm mx-auto space-y-3">
      {/* Header message */}
      <div className="text-center py-2">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 mb-2">
          <Zap className="w-3.5 h-3.5 text-amber-500" />
          <span className="text-xs font-medium text-amber-600 dark:text-amber-400">
            {questionsUsed}/{questionsLimit} questions used
          </span>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300 font-medium">
          Unlock unlimited cosmic insights
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Choose a plan to continue exploring
        </p>
      </div>

      {/* Traveler Plan - Most Popular */}
      <Card className="relative overflow-hidden border-2 border-amber-500/50 bg-amber-500/5 dark:bg-amber-500/10">
        <div className="absolute top-0 right-0">
          <div className="bg-amber-500 text-black text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-bl-lg">
            Most Popular
          </div>
        </div>
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Traveler</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">50 questions/mo</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-slate-800 dark:text-white">$10</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">/mo</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mb-2.5">
            {['Detailed Interpretations', 'Save Locations', 'Priority Access'].map((feature) => (
              <span key={feature} className="inline-flex items-center gap-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                <Check className="w-2.5 h-2.5 text-green-500" />
                {feature}
              </span>
            ))}
          </div>

          <Button
            onClick={() => handleSubscribe('starter')}
            disabled={loadingPlan !== null}
            className="w-full h-8 text-xs bg-amber-500 hover:bg-amber-600 text-black"
          >
            {loadingPlan === 'starter' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Sparkles className="w-3 h-3 mr-1.5" />
                Subscribe to Traveler
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Mystic Plan - Premium */}
      <Card className="border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-amber-500/20 flex items-center justify-center">
                <Crown className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-800 dark:text-white">Mystic</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">200 questions/mo</p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold text-slate-800 dark:text-white">$20</span>
              <span className="text-xs text-slate-500 dark:text-slate-400">/mo</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1 mb-2.5">
            {['Advanced Insights', 'PDF Exports', 'Priority Support'].map((feature) => (
              <span key={feature} className="inline-flex items-center gap-0.5 text-[10px] text-slate-600 dark:text-slate-300">
                <Check className="w-2.5 h-2.5 text-green-500" />
                {feature}
              </span>
            ))}
          </div>

          <Button
            onClick={() => handleSubscribe('pro')}
            disabled={loadingPlan !== null}
            variant="outline"
            className="w-full h-8 text-xs border-amber-500/50 text-amber-600 dark:text-amber-400 hover:bg-amber-500/10"
          >
            {loadingPlan === 'pro' ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <>
                <Crown className="w-3 h-3 mr-1.5" />
                Subscribe to Mystic
              </>
            )}
          </Button>
        </CardContent>
      </Card>

    </div>
  );
};

export default UpgradePromptCard;
