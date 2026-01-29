/**
 * Subscription Page
 * Allows users to manage their property analysis subscription
 * Styled to match landing page aesthetic (Light Theme)
 */

import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  MapPin,
  Briefcase,
  Compass,
  Check,
  ArrowLeft,
  History,
  Loader2,
  AlertCircle,
  CheckCircle2,
  X,
  CreditCard,
  Building2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth-context';
import { useAISubscription } from '@/features/globe/ai/useAISubscription';
import { useToast } from '@/hooks/use-toast';
import './Landing.css';

import { StripeWrapper } from '@/components/payment/StripeWrapper';
import { CheckoutForm } from '@/components/payment/CheckoutForm';
import { Dialog, DialogContent } from '@/components/ui/dialog';


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
    createSubscriptionIntent,
    refreshStatus,
    clearError,
  } = useAISubscription();

  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [showCheckout, setShowCheckout] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);

  // Handle success/cancel redirects from Stripe
  useEffect(() => {
    const subscriptionStatus = searchParams.get('subscription');
    const autoPlan = searchParams.get('plan');

    if (subscriptionStatus === 'success') {
      toast({
        title: 'Subscription activated!',
        description: 'Your 7-day free trial has started. Enjoy!',
      });
      refreshStatus();
      window.history.replaceState({}, '', '/ai-subscription');
    } else if (subscriptionStatus === 'canceled') {
      toast({
        title: 'Checkout canceled',
        description: 'No changes were made to your subscription.',
        variant: 'destructive',
      });
    } else if (autoPlan && user) {
      handleSubscribe(autoPlan);
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('plan');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams, toast, refreshStatus, user]);

  // Handle subscription upgrade
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
      title: 'Subscription activated!',
      description: 'Your 7-day free trial has started!',
    });
    refreshStatus();
    window.location.href = '/ai-subscription?subscription=success';
  };

  const usagePercent = status
    ? (status.questionsUsed / status.questionsLimit) * 100
    : 0;



  return (
    <div className="min-h-screen bg-[#FDFCF8] text-slate-800 font-sans">
      {/* Header */}
      <header className="border-b border-slate-200/60 bg-white/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-4">
          <button
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Subscription
            </h1>
            <p className="text-sm text-slate-500">Manage your plan</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 space-y-16">

        {/* Error Display */}
        {error && (
          <div className="rounded-2xl p-4 flex items-center gap-3 bg-red-50 border border-red-100 shadow-sm">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-600 flex-1">{error}</p>
            <button
              onClick={clearError}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Current Plan Section */}
        <section>
          <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-[#F0A6B3]" />
            Your Plan
          </h2>

          <div className="glass-card bg-white border border-slate-200/60 shadow-sm rounded-3xl p-8">
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
              </div>
            ) : status ? (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-sm ${status.planType === 'broker' ? 'bg-emerald-50 text-emerald-600' :
                      status.planType === 'pioneer' ? 'bg-[#F0A6B3]/10 text-[#F0A6B3]' :
                        status.planType === 'explorer' ? 'bg-amber-50 text-amber-500' :
                          'bg-slate-50 text-slate-500'
                      }`}>
                      {status.planType === 'broker' ? (
                        <Briefcase className="w-8 h-8" />
                      ) : status.planType === 'pioneer' ? (
                        <MapPin className="w-8 h-8" />
                      ) : (
                        <Compass className="w-8 h-8" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-2xl font-bold text-slate-900 capitalize tracking-tight">
                          {status.planType === 'free' ? 'Free Trial' : status.planType}
                        </span>
                        {status.subscriptionStatus === 'trialing' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-blue-50 text-blue-600 border border-blue-100">
                            Trialing
                          </span>
                        )}
                        {status.subscriptionStatus === 'active' && status.planType !== 'free' && (
                          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-100">
                            Active
                          </span>
                        )}
                      </div>
                      <p className="text-slate-500 font-medium">
                        {status.questionsRemaining} of {status.questionsLimit} scans remaining
                      </p>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="flex-1 md:max-w-xs space-y-2">
                    <div className="flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      <span>Monthly Usage</span>
                      <span>{Math.round(usagePercent)}%</span>
                    </div>
                    <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-slate-900 rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(usagePercent, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>

                {status.currentPeriodEnd && status.planType !== 'free' && (
                  <div className="pt-6 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-500">
                    <History className="w-4 h-4" />
                    <span>
                      {status.subscriptionStatus === 'canceled'
                        ? `Access ends on ${new Date(status.currentPeriodEnd).toLocaleDateString()}`
                        : `Renews automatically on ${new Date(status.currentPeriodEnd).toLocaleDateString()}`
                      }
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400">Loading plan...</div>
            )}
          </div>
        </section>

        {/* Plans Grid */}
        <section>
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 mb-3 tracking-tight">
              Upgrade your toolkit
            </h2>
            <p className="text-slate-600 text-lg">
              Start your 7-day free trial. Cancel anytime.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

            {/* Explorer */}
            <div className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="mb-6">
                <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-500 mb-4">
                  <Compass className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Explorer</h3>
                <div className="mt-2 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-slate-900">$49</span>
                  <span className="text-slate-500">/mo</span>
                </div>
                <p className="text-sm text-slate-500 mt-2 font-medium">Serious homeowner / small investor</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Analyze 5 properties / month",
                  "Orientation, Geometry & Env scores",
                  "Basic PDF Report",
                  "Save up to 10 properties"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe('explorer')}
                disabled={loadingPlan !== null || status?.planType === 'explorer'}
                className="w-full py-3 px-4 rounded-xl bg-slate-100 text-slate-900 font-semibold hover:bg-slate-200 disabled:opacity-50 transition-colors"
              >
                {status?.planType === 'explorer' ? 'Current Plan' : 'Start Free Trial'}
              </button>
            </div>

            {/* Pioneer */}
            <div className="bg-slate-900 border border-slate-900 rounded-3xl p-8 flex flex-col shadow-xl relative overflow-hidden text-white transform md:-translate-y-4">
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
                <p className="text-sm text-zinc-400 mt-2 font-medium">Architects & Designers</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Analyze 25 properties / month",
                  "Detailed Solar & Daylight insights",
                  "Multi-property comparison",
                  "Detailed PDF Report",
                  "Save up to 100 projects"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-zinc-300">
                    <Check className="w-4 h-4 text-[#F0A6B3] mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe('pioneer')}
                disabled={loadingPlan !== null || status?.planType === 'pioneer'}
                className="w-full py-3 px-4 rounded-xl bg-[#F0A6B3] text-white font-semibold hover:bg-[#E096A3] disabled:opacity-50 transition-colors shadow-lg shadow-[#F0A6B3]/20"
              >
                {status?.planType === 'pioneer' ? 'Current Plan' : 'Start Free Trial'}
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
                <p className="text-sm text-slate-500 mt-2 font-medium">Developers & Consultants</p>
              </div>

              <ul className="space-y-3 mb-8 flex-1">
                {[
                  "Unlimited properties (fair use)",
                  "White-label reports (your logo)",
                  "Portfolio-wide dashboards",
                  "Export options (CSV/JSON)",
                  "Priority support & onboarding"
                ].map((feature, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm text-slate-600">
                    <Check className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleSubscribe('broker')}
                disabled={loadingPlan !== null || status?.planType === 'broker'}
                className="w-full py-3 px-4 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50 transition-colors"
              >
                {status?.planType === 'broker' ? 'Current Plan' : 'Start Free Trial'}
              </button>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-slate-500 text-sm">
              Need individual add-on scans? Available for <span className="text-slate-900 font-bold">$8 each</span> inside the app.
            </p>
          </div>
        </section>

        {/* Minimal Usage History */}
        {usageHistory.length > 0 && (
          <section className="pt-8 border-t border-slate-200">
            <h2 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-6">Recent Activity</h2>
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="divide-y divide-slate-100">
                {usageHistory.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{entry.question || 'Property Scan'}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(entry.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-slate-100 text-xs font-medium text-slate-600">
                      Completed
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Checkout Dialog */}
      <Dialog open={showCheckout} onOpenChange={setShowCheckout}>
        <DialogContent className="bg-white text-slate-900 sm:max-w-md p-6 rounded-2xl shadow-2xl">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-slate-900 mb-1">Confirm Subscription</h2>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">Plan:</span>
              <span className="font-bold capitalize text-slate-900">{selectedPlan}</span>
              <span className="text-slate-300">•</span>
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
