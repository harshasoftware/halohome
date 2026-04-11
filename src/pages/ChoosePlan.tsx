/**
 * Choose Plan Page
 * Shown to new users right after login to start a 7-day free trial.
 * If the user already has a subscription, auto-redirects to /app.
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  Briefcase,
  Compass,
  Check,
  Loader2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth-context';
import { useAISubscription } from '@/features/globe/ai/useAISubscription';
import { useToast } from '@/hooks/use-toast';

import { StripeWrapper } from '@/components/payment/StripeWrapper';
import { CheckoutForm } from '@/components/payment/CheckoutForm';
import { Dialog, DialogContent } from '@/components/ui/dialog';

export default function ChoosePlan() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    status,
    isLoading,
    createSubscriptionIntent,
    refreshStatus,
  } = useAISubscription();

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // If user already has an active subscription, skip to app
  useEffect(() => {
    if (!isLoading && status && status.planType !== 'free') {
      navigate('/app', { replace: true });
    }
  }, [isLoading, status, navigate]);

  const handleSubscribe = async (planId: string) => {
    setLoadingPlan(planId);
    setSelectedPlan(planId);
    try {
      const result = await createSubscriptionIntent(planId);
      if (result && result.clientSecret) {
        setClientSecret(result.clientSecret);
        setShowCheckout(true);
      }
    } finally {
      setLoadingPlan(null);
    }
  };

  const handleCheckoutSuccess = () => {
    setShowCheckout(false);
    toast({
      title: 'Trial activated!',
      description: 'Your 7-day free trial has started. Welcome to Halo Home!',
    });
    refreshStatus();
    navigate('/app', { replace: true });
  };

  const handleSkip = () => {
    navigate('/app', { replace: true });
  };

  // Show loader while checking subscription status
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCF8]">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-4" />
          <p className="text-slate-500 text-sm">Setting up your account...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCF8] text-slate-800 font-['Plus_Jakarta_Sans']">
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="Halo Home" className="w-8 h-8 rounded-md" />
            <span className="text-xl font-bold tracking-tight text-slate-900">Halo Home</span>
          </div>
          <button
            onClick={handleSkip}
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors font-medium"
          >
            Skip for now <ArrowRight className="w-3.5 h-3.5 inline ml-1" />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-16">
        {/* Hero */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold uppercase tracking-wider mb-6 border border-emerald-100">
            <Sparkles className="w-3.5 h-3.5" />
            7-Day Free Trial
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-4">
            Choose your plan
          </h1>
          <p className="text-lg text-slate-500 max-w-lg mx-auto">
            Start with a free trial. No charge until day 8. Cancel anytime.
          </p>
        </div>

        {/* Plan Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">

          {/* Explorer */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col shadow-sm hover:shadow-md transition-shadow">
            <div className="mb-6">
              <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-4">
                <Compass className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Explorer</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">$49</span>
                <span className="text-slate-500">/mo</span>
              </div>
              <p className="text-sm text-emerald-600 mt-1 font-medium">7-day free trial included</p>
              <p className="text-sm text-slate-500 mt-1 font-medium">Homeowners & small investors</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {[
                'Analyze 5 properties / month',
                'Orientation, Geometry & Env scores',
                'Basic PDF Report',
                'Save up to 10 properties',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe('explorer')}
              disabled={loadingPlan !== null}
              className="w-full py-3 px-4 rounded-xl bg-slate-100 text-slate-900 font-semibold hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              {loadingPlan === 'explorer' ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Start Free Trial'
              )}
            </button>
          </div>

          {/* Pioneer */}
          <div className="bg-slate-900 border border-slate-900 rounded-3xl p-8 flex flex-col shadow-xl text-white transform md:-translate-y-4">
            <div className="absolute top-4 right-4">
              <span className="bg-[#F0A6B3] text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm">
                Popular
              </span>
            </div>
            <div className="mb-6">
              <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-[#F0A6B3] mb-4 backdrop-blur-sm">
                <MapPin className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold">Pioneer</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold">$89</span>
                <span className="text-zinc-400">/mo</span>
              </div>
              <p className="text-sm text-emerald-600 mt-1 font-medium">7-day free trial included</p>
              <p className="text-sm text-zinc-400 mt-2 font-medium">Architects & Designers</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {[
                'Analyze 25 properties / month',
                'Detailed Solar & Daylight insights',
                'Multi-property comparison',
                'Detailed PDF Report',
                'Save up to 100 projects',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                  <Check className="w-4 h-4 text-[#F0A6B3] mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe('pioneer')}
              disabled={loadingPlan !== null}
              className="w-full py-3 px-4 rounded-xl bg-[#F0A6B3] text-white font-semibold hover:bg-[#E096A3] disabled:opacity-50 transition-colors shadow-lg shadow-[#F0A6B3]/20"
            >
              {loadingPlan === 'pioneer' ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Start Free Trial'
              )}
            </button>
          </div>

          {/* Broker */}
          <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
            <div className="absolute top-4 right-4">
              <span className="bg-emerald-100 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider">
                Best Value
              </span>
            </div>
            <div className="mb-6">
              <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 mb-4">
                <Briefcase className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Broker</h3>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-3xl font-bold text-slate-900">$179</span>
                <span className="text-slate-500">/mo</span>
              </div>
              <p className="text-sm text-emerald-600 mt-1 font-medium">7-day free trial included</p>
              <p className="text-sm text-slate-500 mt-2 font-medium">Developers & Consultants</p>
            </div>

            <ul className="space-y-3 mb-8 flex-1">
              {[
                'Unlimited properties (fair use)',
                'White-label reports (your logo)',
                'Portfolio-wide dashboards',
                'Export options (CSV/JSON)',
                'Priority support & onboarding',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                  <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                  {feature}
                </li>
              ))}
            </ul>

            <button
              onClick={() => handleSubscribe('broker')}
              disabled={loadingPlan !== null}
              className="w-full py-3 px-4 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {loadingPlan === 'broker' ? (
                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
              ) : (
                'Start Free Trial'
              )}
            </button>
          </div>
        </div>

        {/* Footer note */}
        <div className="text-center space-y-3">
          <p className="text-slate-400 text-sm">
            All plans include a 7-day free trial. You won't be charged until the trial ends.
          </p>
          <button
            onClick={handleSkip}
            className="text-sm text-slate-500 hover:text-slate-800 underline underline-offset-4 transition-colors"
          >
            I'll decide later
          </button>
        </div>
      </main>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="bg-white text-slate-900 sm:max-w-md p-6 rounded-2xl shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Start Your Free Trial</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Plan:</span>
              <span className="font-bold capitalize text-slate-900">{selectedPlan}</span>
              <span className="text-slate-300">|</span>
              <span className="text-emerald-600 font-medium">7 Days Free</span>
            </div>
          </div>

          {loadingPlan ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : clientSecret && (
            <StripeWrapper clientSecret={clientSecret}>
              <CheckoutForm
                onSuccess={handleCheckoutSuccess}
                onCancel={() => setShowCheckout(false)}
                planName={selectedPlan || 'Subscription'}
                trialDays={7}
              />
            </StripeWrapper>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
