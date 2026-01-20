/**
 * Subscription Page
 * Allows users to manage their property analysis subscription
 * Styled to match landing page aesthetic
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin,
  Zap,
  Briefcase,
  Compass,
  Check,
  ArrowLeft,
  History,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  Home,
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
        description: 'Your subscription is now active. Start scanning properties!',
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
            <Home className="w-8 h-8 text-amber-500" />
          </div>
          <h2 className="text-2xl text-white mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
            Sign in Required
          </h2>
          <p className="text-zinc-400 mb-6">
            Please sign in to manage your subscription
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
            <h1 className="text-xl text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
              Subscription
            </h1>
            <p className="text-sm text-zinc-500">Manage your property analysis access</p>
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
          <h2 className="text-lg text-white mb-6" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
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
                      status.planType === 'broker' ? 'bg-amber-500/20 border border-amber-500/30' :
                      status.planType === 'pioneer' ? 'bg-amber-500/15 border border-amber-500/25' :
                      status.planType === 'explorer' ? 'bg-amber-500/10 border border-amber-500/20' :
                      'bg-white/5 border border-white/10'
                    }`}>
                      {status.planType === 'broker' ? (
                        <Briefcase className="w-7 h-7 text-amber-500" />
                      ) : status.planType === 'pioneer' ? (
                        <MapPin className="w-7 h-7 text-amber-400" />
                      ) : (
                        <Compass className="w-7 h-7 text-amber-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="text-xl text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
                          {status.planType === 'free' ? 'Free' :
                           status.planType === 'explorer' ? 'Explorer' :
                           status.planType === 'pioneer' ? 'Pioneer' : 'Broker'}
                        </span>
                        {status.planType === 'broker' && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500 text-black">
                            Pro
                          </span>
                        )}
                      </div>
                      <p className="text-zinc-400">
                        {status.questionsRemaining} of {status.questionsLimit} ZIP scans remaining
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
                <p className="text-zinc-400">You're on the free plan with 1 ZIP scan per month.</p>
              </div>
            )}
          </div>
        </section>

        {/* Subscription Plans */}
        <section>
          <div className="text-center mb-8">
            <h2 className="text-2xl text-white mb-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
              Start Living in Harmony.
            </h2>
            <p className="text-zinc-400">Choose the perfect plan to find your harmonious home.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Free */}
            <div className="pricing-card glass-card">
              <h3 className="text-xl font-medium text-zinc-300">Free</h3>
              <div className="price-amount">$0</div>
              <ul className="feature-list">
                <li className="feature-item"><Check className="check-icon" /> 1 property only</li>
                <li className="feature-item"><Check className="check-icon" /> Harmony Score</li>
                <li className="feature-item"><Check className="check-icon" /> Basic insights</li>
              </ul>
              <button
                className="plan-btn"
                disabled={status?.planType === 'free'}
              >
                {status?.planType === 'free' ? 'Current Plan' : 'Free Plan'}
              </button>
            </div>

            {/* Explorer */}
            <div className="pricing-card glass-card relative border-amber-500/30" style={{ background: 'rgba(245, 158, 11, 0.05)' }}>
              <div className="absolute top-0 right-0 p-4">
                <span className="bg-amber-500 text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  {status?.planType === 'explorer' ? 'Current' : 'Popular'}
                </span>
              </div>
              <h3 className="text-xl font-medium text-white flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-400" />
                Explorer
              </h3>
              <div className="price-amount">$49<span className="price-period">/mo</span></div>
              <ul className="feature-list">
                <li className="feature-item"><Check className="check-icon" /> Unlimited single-home searches</li>
                <li className="feature-item"><Check className="check-icon" /> 10 ZIP scouts / month</li>
                <li className="feature-item"><Check className="check-icon" /> Harmony Score</li>
                <li className="feature-item"><Check className="check-icon" /> Insights & Remedies</li>
              </ul>
              <button
                onClick={() => handleSubscribe('explorer')}
                disabled={loadingPlan !== null || status?.planType === 'explorer' || ['pioneer', 'broker'].includes(status?.planType || '')}
                className="plan-btn primary !bg-amber-500 hover:!bg-amber-600 !border-amber-500 flex items-center justify-center gap-2"
              >
                {loadingPlan === 'explorer' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : status?.planType === 'explorer' ? (
                  'Current Plan'
                ) : ['pioneer', 'broker'].includes(status?.planType || '') ? (
                  'Downgrade N/A'
                ) : (
                  'Get Started'
                )}
              </button>
            </div>

            {/* Pioneer */}
            <div className="pricing-card glass-card relative">
              {status?.planType === 'pioneer' && (
                <div className="absolute top-0 right-0 p-4">
                  <span className="bg-green-500 text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Current
                  </span>
                </div>
              )}
              <h3 className="text-xl font-medium text-zinc-300 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-amber-400" />
                Pioneer
              </h3>
              <div className="price-amount">$89<span className="price-period">/mo</span></div>
              <ul className="feature-list">
                <li className="feature-item"><Check className="check-icon" /> Unlimited single-home searches</li>
                <li className="feature-item"><Check className="check-icon" /> 25 ZIP scouts / month</li>
                <li className="feature-item"><Check className="check-icon" /> Harmony Score</li>
                <li className="feature-item"><Check className="check-icon" /> Insights & Remedies</li>
                <li className="feature-item"><Check className="check-icon" /> Compare properties</li>
              </ul>
              <button
                onClick={() => handleSubscribe('pioneer')}
                disabled={loadingPlan !== null || status?.planType === 'pioneer' || status?.planType === 'broker'}
                className="plan-btn flex items-center justify-center gap-2"
              >
                {loadingPlan === 'pioneer' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : status?.planType === 'pioneer' ? (
                  'Current Plan'
                ) : status?.planType === 'broker' ? (
                  'Downgrade N/A'
                ) : (
                  'Get Started'
                )}
              </button>
            </div>

            {/* Broker */}
            <div className="pricing-card glass-card relative">
              {status?.planType === 'broker' && (
                <div className="absolute top-0 right-0 p-4">
                  <span className="bg-green-500 text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    Current
                  </span>
                </div>
              )}
              <h3 className="text-xl font-medium text-zinc-300 flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-amber-400" />
                Broker
              </h3>
              <div className="price-amount">$179<span className="price-period">/mo</span></div>
              <ul className="feature-list">
                <li className="feature-item"><Check className="check-icon" /> Unlimited single-home searches</li>
                <li className="feature-item"><Check className="check-icon" /> 60 ZIP scouts / month</li>
                <li className="feature-item"><Check className="check-icon" /> Harmony Score</li>
                <li className="feature-item"><Check className="check-icon" /> Insights & Remedies</li>
                <li className="feature-item"><Check className="check-icon" /> Priority processing</li>
              </ul>
              <button
                onClick={() => handleSubscribe('broker')}
                disabled={loadingPlan !== null || status?.planType === 'broker'}
                className="plan-btn flex items-center justify-center gap-2"
              >
                {loadingPlan === 'broker' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : status?.planType === 'broker' ? (
                  'Current Plan'
                ) : (
                  'Get Started'
                )}
              </button>
            </div>
          </div>

          {/* Add-on pricing */}
          <div className="mt-8 text-center">
            <p className="text-zinc-500 text-sm">
              Need more? Add-on scans available for <span className="text-amber-400 font-medium">$8 each</span>
            </p>
          </div>
        </section>

        {/* Usage History */}
        {usageHistory.length > 0 && (
          <section>
            <h2 className="text-lg text-white mb-6 flex items-center gap-2" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>
              <History className="w-5 h-5 text-zinc-400" />
              Recent Scans
            </h2>
            <div className="glass-card rounded-3xl overflow-hidden">
              <div className="divide-y divide-white/5">
                {usageHistory.slice(0, 10).map((entry) => (
                  <div key={entry.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-zinc-300 truncate">{entry.question || 'ZIP Scan'}</p>
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
