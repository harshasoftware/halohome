/**
 * CategoryUpgradeModal Component
 *
 * Premium upgrade modal shown when users click on locked category tabs.
 * Displays subscription options (Traveler and Mystic plans) with pricing
 * and feature lists. Handles Stripe checkout flow for both authenticated
 * and anonymous users.
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { useAuthUser, useIsRealUser } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import type { CategoryUpgradeModalProps } from '../types';

/**
 * Category Upgrade Modal for gated categories
 * Shows subscription plans to unlock all category insights
 */
export const CategoryUpgradeModal: React.FC<CategoryUpgradeModalProps> = ({
  open,
  onOpenChange,
}) => {
  const user = useAuthUser();
  const isRealUser = useIsRealUser();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  const handleSubscribe = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      // If logged in with a real account (not anonymous), use authenticated flow
      // Otherwise, use anonymous flow (Stripe collects email)
      const body = isRealUser && user
        ? {
            action: 'createSubscription',
            userId: user.id,
            email: user.email,
            plan: planId,
            successUrl: `${window.location.origin}/globe?subscription=success`,
            cancelUrl: window.location.href,
          }
        : {
            action: 'subscribeAnonymous',
            plan: planId,
            successUrl: `${window.location.origin}/success`,
            cancelUrl: window.location.href,
          };

      const { data, error } = await supabase.functions.invoke('ai-subscription', { body });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      console.error('Error starting checkout:', err);
      alert('Error starting checkout. Please try again.');
    }
    setLoadingPlan(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        onClick={() => onOpenChange(false)}
      />

      {/* Modal - matches Landing page glass-card aesthetic */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl bg-[#0a0a0a] border border-white/10 shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto backdrop-blur-xl"
      >
        {/* Mobile drag handle */}
        <div className="sm:hidden w-full flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="relative px-6 pt-6 sm:pt-8 pb-5 border-b border-white/5">
          <div className="absolute top-3 sm:top-4 right-4">
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
            >
              <span className="text-zinc-400 text-lg">&times;</span>
            </button>
          </div>

          <h2 className="text-lg sm:text-xl font-semibold text-center text-white mb-1">
            Unlock Category Insights
          </h2>
          <p className="text-xs sm:text-sm text-center text-zinc-400">
            Access Career, Love, Health, Home, Wellbeing & Wealth categories
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="px-4 sm:px-6 py-5 grid grid-cols-2 gap-3">
          {/* Traveler Plan */}
          <div className="p-4 rounded-xl bg-white/5 border border-amber-500/30 flex flex-col relative">
            <div className="absolute -top-2 left-3">
              <span className="px-2 py-0.5 text-[10px] font-medium bg-amber-500 text-black rounded-full">
                Limited Offer
              </span>
            </div>
            <h3 className="text-base font-medium text-zinc-300 mb-1">Traveler</h3>
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-2xl font-bold text-white">$10</span>
              <span className="text-xs text-zinc-500">/mo</span>
            </div>
            <p className="text-[10px] text-amber-400 mb-2">
              Use code <span className="font-mono font-bold">NEWYEARPLAN</span> for discount!
            </p>
            <ul className="space-y-1.5 text-xs text-zinc-400 mb-4 flex-1">
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-zinc-500" />
                All category insights
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-zinc-500" />
                50 AI questions/mo
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-zinc-500" />
                Compatibility mode
              </li>
            </ul>
            <button
              onClick={() => handleSubscribe('starter')}
              disabled={loadingPlan === 'starter'}
              className="w-full py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-sm font-medium hover:bg-amber-500/30 transition-colors disabled:opacity-50"
            >
              {loadingPlan === 'starter' ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-amber-300/30 border-t-amber-300 rounded-full animate-spin" />
                </span>
              ) : (
                'Subscribe'
              )}
            </button>
            <p className="text-[9px] text-zinc-500 text-center mt-2">First 100 users · Ends Jan 15</p>
          </div>

          {/* Mystic Plan */}
          <div className="p-4 rounded-xl bg-white/5 border border-white/20 flex flex-col relative">
            <div className="absolute -top-2 right-3">
              <span className="px-2 py-0.5 text-[10px] font-medium bg-white text-black rounded-full">
                Popular
              </span>
            </div>
            <h3 className="text-base font-medium text-white mb-1">Mystic</h3>
            <div className="flex items-baseline gap-1 mb-3">
              <span className="text-2xl font-bold text-white">$20</span>
              <span className="text-xs text-zinc-500">/mo</span>
            </div>
            <ul className="space-y-1.5 text-xs text-zinc-400 mb-4 flex-1">
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-zinc-400" />
                Everything in Traveler
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-zinc-400" />
                Unlimited AI questions
              </li>
              <li className="flex items-center gap-1.5">
                <Check className="h-3 w-3 text-zinc-400" />
                PDF Report Exports
              </li>
            </ul>
            <button
              onClick={() => handleSubscribe('pro')}
              disabled={loadingPlan === 'pro'}
              className="w-full py-2.5 rounded-lg bg-white text-black text-sm font-medium hover:bg-zinc-200 transition-colors disabled:opacity-50"
            >
              {loadingPlan === 'pro' ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                </span>
              ) : (
                'Subscribe'
              )}
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div className="px-6 pb-5">
          <p className="text-center text-[10px] text-zinc-600">
            Cancel anytime. Secure payment via Stripe.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default CategoryUpgradeModal;
