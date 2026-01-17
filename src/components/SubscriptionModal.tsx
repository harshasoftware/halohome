/**
 * SubscriptionModal Component
 * Modal for selecting and subscribing to property analysis plans
 * Styled to match the landing page aesthetic
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Search, MapPin, Crown, Check, Loader2, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth-context';
import { toast } from 'sonner';
import { useSubscriptionModal } from '@/stores/uiStore';
import { useAISubscription } from '@/features/globe/ai/useAISubscription';

export const SubscriptionModal: React.FC = () => {
  const { user } = useAuth();
  const { isOpen, setIsOpen } = useSubscriptionModal();
  const { status } = useAISubscription();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: 'seeker' | 'pioneer' | 'sage') => {
    setLoadingPlan(planId);

    try {
      const action = user ? 'createSubscription' : 'subscribeAnonymous';

      const { data, error } = await supabase.functions.invoke('ai-subscription', {
        body: {
          action,
          plan: planId,
          userId: user?.id,
          email: user?.email,
          successUrl: `${window.location.origin}/ai-subscription?subscription=success`,
          cancelUrl: window.location.href,
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

  const currentPlan = status?.planType || 'free';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-3xl p-0 gap-0 bg-[#0a0a0f] border-zinc-800 overflow-hidden">
        {/* Close button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute right-4 top-4 z-10 p-2 rounded-full bg-zinc-800/50 hover:bg-zinc-700/50 transition-colors"
        >
          <X className="w-4 h-4 text-zinc-400" />
        </button>

        {/* Header */}
        <div className="text-center pt-8 pb-4 px-6">
          <h2 className="text-2xl font-medium text-white" style={{ fontFamily: 'Cinzel, serif' }}>
            Start Living in Harmony.
          </h2>
          <p className="text-zinc-400 mt-2">Choose the perfect plan to find your harmonious home.</p>
        </div>

        {/* Plans Grid */}
        <div className="grid md:grid-cols-3 gap-4 p-6 pt-2">
          {/* Seeker Plan - Featured */}
          <div className="relative rounded-3xl p-6 flex flex-col bg-gradient-to-b from-amber-500/10 to-transparent border border-amber-500/30 hover:border-amber-500/50 transition-all hover:-translate-y-1">
            {/* Badge */}
            <div className="absolute top-0 right-0 p-4">
              <span className="bg-amber-500 text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                {currentPlan === 'seeker' ? 'Current' : 'Popular'}
              </span>
            </div>

            {/* Plan Name */}
            <h3 className="text-xl font-medium text-white flex items-center gap-2">
              <Search size={18} className="text-amber-400" />
              Seeker
            </h3>

            {/* Price */}
            <div className="text-4xl font-medium text-white my-4" style={{ fontFamily: 'Cinzel, serif' }}>
              $19<span className="text-lg text-zinc-500">/mo</span>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-6 flex-1">
              <li className="flex items-center gap-3 text-zinc-300">
                <Check className="w-4 h-4 text-white flex-shrink-0" />
                <span>3 locations</span>
              </li>
              <li className="flex items-center gap-3 text-zinc-300">
                <Check className="w-4 h-4 text-white flex-shrink-0" />
                <span>Harmony Score</span>
              </li>
              <li className="flex items-center gap-3 text-zinc-300">
                <Check className="w-4 h-4 text-white flex-shrink-0" />
                <span>Insights & Remedies</span>
              </li>
            </ul>

            {/* Button */}
            <button
              onClick={() => handleSubscribe('seeker')}
              disabled={loadingPlan !== null || currentPlan === 'seeker' || ['pioneer', 'sage'].includes(currentPlan)}
              className="w-full py-4 rounded-xl font-medium transition-all bg-amber-500 hover:bg-amber-600 text-black disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingPlan === 'seeker' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : currentPlan === 'seeker' ? (
                'Current Plan'
              ) : ['pioneer', 'sage'].includes(currentPlan) ? (
                'Downgrade N/A'
              ) : (
                'Get Started'
              )}
            </button>
          </div>

          {/* Pioneer Plan */}
          <div className="relative rounded-3xl p-6 flex flex-col bg-white/[0.02] border border-zinc-800 hover:border-zinc-700 transition-all hover:-translate-y-1 backdrop-blur-xl">
            {/* Badge */}
            {currentPlan === 'pioneer' && (
              <div className="absolute top-0 right-0 p-4">
                <span className="bg-green-500 text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Current
                </span>
              </div>
            )}

            {/* Plan Name */}
            <h3 className="text-xl font-medium text-zinc-300 flex items-center gap-2">
              <MapPin size={18} className="text-amber-400" />
              Pioneer
            </h3>

            {/* Price */}
            <div className="text-4xl font-medium text-white my-4" style={{ fontFamily: 'Cinzel, serif' }}>
              $49<span className="text-lg text-zinc-500">/mo</span>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-6 flex-1">
              <li className="flex items-center gap-3 text-zinc-300">
                <Check className="w-4 h-4 text-white flex-shrink-0" />
                <span>10 locations</span>
              </li>
              <li className="flex items-center gap-3 text-zinc-300">
                <Check className="w-4 h-4 text-white flex-shrink-0" />
                <span>Harmony Score</span>
              </li>
              <li className="flex items-center gap-3 text-zinc-300">
                <Check className="w-4 h-4 text-white flex-shrink-0" />
                <span>Insights & Remedies</span>
              </li>
              <li className="flex items-center gap-3 text-zinc-300">
                <Check className="w-4 h-4 text-white flex-shrink-0" />
                <span>Compare properties</span>
              </li>
            </ul>

            {/* Button */}
            <button
              onClick={() => handleSubscribe('pioneer')}
              disabled={loadingPlan !== null || currentPlan === 'pioneer' || currentPlan === 'sage'}
              className="w-full py-4 rounded-xl font-medium transition-all bg-transparent border border-zinc-700 hover:bg-white hover:text-[#0a0a0f] text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingPlan === 'pioneer' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : currentPlan === 'pioneer' ? (
                'Current Plan'
              ) : currentPlan === 'sage' ? (
                'Downgrade N/A'
              ) : (
                'Get Started'
              )}
            </button>
          </div>

          {/* Sage Plan */}
          <div className="relative rounded-3xl p-6 flex flex-col bg-white/[0.02] border border-zinc-800 hover:border-zinc-700 transition-all hover:-translate-y-1 backdrop-blur-xl">
            {/* Badge */}
            {currentPlan === 'sage' && (
              <div className="absolute top-0 right-0 p-4">
                <span className="bg-green-500 text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  Current
                </span>
              </div>
            )}

            {/* Plan Name */}
            <h3 className="text-xl font-medium text-zinc-300 flex items-center gap-2">
              <Crown size={18} className="text-amber-400" />
              Sage
            </h3>

            {/* Price */}
            <div className="text-4xl font-medium text-white my-4" style={{ fontFamily: 'Cinzel, serif' }}>
              $99<span className="text-lg text-zinc-500">/mo</span>
            </div>

            {/* Features */}
            <ul className="space-y-3 mb-6 flex-1">
              <li className="flex items-center gap-3 text-zinc-300">
                <Check className="w-4 h-4 text-white flex-shrink-0" />
                <span>Unlimited properties</span>
              </li>
              <li className="flex items-center gap-3 text-zinc-300">
                <Check className="w-4 h-4 text-white flex-shrink-0" />
                <span>Harmony Score</span>
              </li>
              <li className="flex items-center gap-3 text-zinc-300">
                <Check className="w-4 h-4 text-white flex-shrink-0" />
                <span>Insights & Remedies</span>
              </li>
              <li className="flex items-center gap-3 text-zinc-300">
                <Check className="w-4 h-4 text-white flex-shrink-0" />
                <span>Priority processing</span>
              </li>
            </ul>

            {/* Button */}
            <button
              onClick={() => handleSubscribe('sage')}
              disabled={loadingPlan !== null || currentPlan === 'sage'}
              className="w-full py-4 rounded-xl font-medium transition-all bg-transparent border border-zinc-700 hover:bg-white hover:text-[#0a0a0f] text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loadingPlan === 'sage' ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : currentPlan === 'sage' ? (
                'Current Plan'
              ) : (
                'Get Started'
              )}
            </button>
          </div>
        </div>

        {/* Add-on pricing */}
        <div className="pb-6 text-center">
          <p className="text-zinc-500 text-sm">
            Need more? Add-on scans available for <span className="text-amber-400 font-medium">$8 each</span>
          </p>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionModal;
