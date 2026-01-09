/**
 * AI Subscription Page
 * Allows users to manage their AI subscription and view usage
 * Styled to match landing page aesthetic
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sparkles,
  Zap,
  Crown,
  Check,
  ArrowLeft,
  History,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth-context';
import { useAISubscription } from '@/features/globe/ai/useAISubscription';
import { useToast } from '@/hooks/use-toast';
import './Landing.css';

export default function AISubscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    status,
    usageHistory,
    isLoading,
    error,
    createSubscriptionCheckout,
    refreshStatus,
    clearError,
  } = useAISubscription();

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);

  // Handle success/cancel redirects from Stripe
  useEffect(() => {
    const subscriptionStatus = searchParams.get('subscription');

    if (subscriptionStatus === 'success') {
      toast({
        title: 'Subscription activated!',
        description: 'Your AI subscription is now active. Enjoy unlimited insights!',
      });
      refreshStatus();
    } else if (subscriptionStatus === 'canceled') {
      toast({
        title: 'Checkout canceled',
        description: 'No changes were made to your subscription.',
        variant: 'destructive',
      });
    }
  }, [searchParams, toast, refreshStatus]);

  // Handle subscription upgrade
  const handleSubscribe = async (planId: string) => {
    setLoadingPlan(planId);
    try {
      const url = await createSubscriptionCheckout(planId);
      if (url) {
        window.location.href = url;
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  const usagePercent = status
    ? (status.questionsUsed / status.questionsLimit) * 100
    : 0;

  // Not logged in state
  if (!user) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-4">
        <div className="glass-card rounded-3xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
            <Sparkles className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-2xl text-white mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
            Sign in Required
          </h2>
          <p className="text-zinc-400 mb-6">
            Please sign in to manage your AI subscription
          </p>
          <button
            onClick={() => navigate('/')}
            className="plan-btn w-full"
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Header */}
      <header className="border-b border-white/10 bg-black/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white hover:border-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl text-white" style={{ fontFamily: 'Cinzel, serif' }}>
              AI Subscription
            </h1>
            <p className="text-sm text-zinc-500">Manage your Astro Guide AI access</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-12">
        {/* Error display */}
        {error && (
          <div className="rounded-2xl p-4 flex items-center gap-3 bg-red-500/10 border border-red-500/30">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <p className="text-sm text-red-300 flex-1">{error}</p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-300 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Current Plan */}
        <section>
          <h2 className="text-lg text-white mb-6" style={{ fontFamily: 'Cinzel, serif' }}>
            Current Plan
          </h2>
          <div className="glass-card rounded-3xl p-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-zinc-500" />
              </div>
            ) : status ? (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
                      status.planType === 'pro' ? 'bg-amber-500/20 border border-amber-500/30' :
                      status.planType === 'starter' ? 'bg-amber-500/10 border border-amber-500/20' :
                      'bg-white/5 border border-white/10'
                    }`}>
                      {status.planType === 'pro' ? (
                        <Crown className="w-7 h-7 text-amber-500" />
                      ) : (
                        <Zap className="w-7 h-7 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-xl text-white" style={{ fontFamily: 'Cinzel, serif' }}>
                          {status.planType === 'free' ? 'Explorer' :
                           status.planType === 'starter' ? 'Traveler' : 'Mystic'}
                        </span>
                        {status.hasSonarProAccess && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500 text-black">
                            Pro
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-400">
                        {status.questionsRemaining} of {status.questionsLimit} questions remaining
                      </p>
                    </div>
                  </div>
                  {status.subscriptionStatus === 'active' && status.planType !== 'free' && (
                    <span className="flex items-center gap-1.5 px-3 py-1 rounded-full text-sm bg-green-500/10 border border-green-500/30 text-green-400">
                      <CheckCircle2 className="w-4 h-4" />
                      Active
                    </span>
                  )}
                </div>

                {/* Usage Progress */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Monthly usage</span>
                    <span className="text-zinc-300">{status.questionsUsed} / {status.questionsLimit}</span>
                  </div>
                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(usagePercent, 100)}%` }}
                    />
                  </div>
                </div>

                {status.currentPeriodEnd && status.planType !== 'free' && (
                  <p className="text-sm text-zinc-500">
                    {status.subscriptionStatus === 'canceled'
                      ? `Access until ${new Date(status.currentPeriodEnd).toLocaleDateString()}`
                      : `Renews on ${new Date(status.currentPeriodEnd).toLocaleDateString()}`}
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-zinc-400">You're on the free plan with 5 questions per month.</p>
              </div>
            )}
          </div>
        </section>

        {/* Subscription Plans */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl text-white mb-2" style={{ fontFamily: 'Cinzel, serif' }}>
              Unlock the Stars
            </h2>
            <p className="text-zinc-400">Choose the perfect plan for your journey.</p>
          </div>

          <div className="pricing-grid">
            {/* Explorer - Free */}
            <div className="pricing-card glass-card">
              <h3 className="text-xl font-medium text-zinc-300">Explorer</h3>
              <div className="price-amount">$0</div>
              <ul className="feature-list">
                <li className="feature-item"><Check className="check-icon" /> 3D Globe with Lines</li>
                <li className="feature-item"><Check className="check-icon" /> Overall Rankings</li>
                <li className="feature-item"><Check className="check-icon" /> City Scores</li>
                <li className="feature-item"><Check className="check-icon" /> 5 AI Questions/mo</li>
              </ul>
              <button
                className="plan-btn"
                disabled={status?.planType === 'free'}
              >
                {status?.planType === 'free' ? 'Current Plan' : 'Free Plan'}
              </button>
            </div>

            {/* Traveler - Featured */}
            <div className="pricing-card glass-card relative border-amber-500/30" style={{ background: 'rgba(245, 158, 11, 0.05)' }}>
              <div className="absolute top-0 right-0 p-4">
                <span className="bg-amber-500 text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {status?.planType === 'starter' ? 'Current' : 'Limited Offer'}
                </span>
              </div>
              <h3 className="text-xl font-medium text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                Traveler
              </h3>
              <div className="price-amount">$10<span className="price-period">/mo</span></div>
              <p className="text-sm text-amber-400 -mt-4 mb-4">
                Use code <span className="font-mono font-bold">NEWYEARPLAN</span> at checkout!
              </p>
              <ul className="feature-list">
                <li className="feature-item"><Check className="check-icon" /> Everything in Explorer</li>
                <li className="feature-item"><Check className="check-icon" /> Category Analysis</li>
                <li className="feature-item"><Check className="check-icon" /> Detailed Interpretations</li>
                <li className="feature-item"><Check className="check-icon" /> 50 AI Questions/mo</li>
              </ul>
              <button
                onClick={() => handleSubscribe('starter')}
                disabled={loadingPlan !== null || status?.planType === 'starter' || status?.planType === 'pro'}
                className="plan-btn primary !bg-amber-500 hover:!bg-amber-600 !border-amber-500 flex items-center justify-center gap-2"
              >
                {loadingPlan === 'starter' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : status?.planType === 'starter' ? (
                  'Current Plan'
                ) : status?.planType === 'pro' ? (
                  'Downgrade N/A'
                ) : (
                  'Subscribe Now'
                )}
              </button>
              {status?.planType !== 'starter' && status?.planType !== 'pro' && (
                <p className="text-xs text-zinc-500 text-center mt-3">First 100 users · Ends Jan 15</p>
              )}
            </div>

            {/* Mystic - Premium */}
            <div className="pricing-card glass-card relative">
              {status?.planType === 'pro' && (
                <div className="absolute top-0 right-0 p-4">
                  <span className="bg-green-500 text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Current
                  </span>
                </div>
              )}
              <h3 className="text-xl font-medium text-zinc-300 flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                Mystic
              </h3>
              <div className="price-amount">$20<span className="price-period">/mo</span></div>
              <ul className="feature-list">
                <li className="feature-item"><Check className="check-icon" /> Everything in Traveler</li>
                <li className="feature-item"><Check className="check-icon" /> 200 AI Questions/mo</li>
                <li className="feature-item"><Check className="check-icon" /> PDF Report Exports</li>
                <li className="feature-item"><Check className="check-icon" /> Priority Support</li>
                <li className="feature-item"><Check className="check-icon" /> Early Access Features</li>
              </ul>
              <button
                onClick={() => handleSubscribe('pro')}
                disabled={loadingPlan !== null || status?.planType === 'pro'}
                className="plan-btn flex items-center justify-center gap-2"
              >
                {loadingPlan === 'pro' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : status?.planType === 'pro' ? (
                  'Current Plan'
                ) : (
                  'Go Limitless'
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Usage History */}
        {usageHistory.length > 0 && (
          <section>
            <h2 className="text-lg text-white mb-6 flex items-center gap-2" style={{ fontFamily: 'Cinzel, serif' }}>
              <History className="w-5 h-5 text-zinc-400" />
              Recent Usage
            </h2>
            <div className="glass-card rounded-3xl overflow-hidden">
              <div className="divide-y divide-white/5">
                {usageHistory.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-300 truncate">{entry.question || 'AI Question'}</p>
                      <p className="text-xs text-zinc-500">
                        {new Date(entry.createdAt).toLocaleDateString()} at{' '}
                        {new Date(entry.createdAt).toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
