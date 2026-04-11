/**
 * SubscriptionModal Component
 * Modal for selecting and subscribing to property analysis plans
 * Matches the GuestAuthOverlay design (beige, two-panel with comparison table)
 */

import React, { useState, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog';
import { Check, X, ChevronLeft, ChevronRight, Sparkles, Zap, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth-context';
import { toast } from 'sonner';
import { useSubscriptionModal } from '@/stores/uiStore';
import { useAISubscription } from '@/features/globe/ai/useAISubscription';
import { getEdgeAuthHeaders } from '@/lib/edgeAuth';
import useEmblaCarousel from 'embla-carousel-react';

export const SubscriptionModal: React.FC = () => {
  const { user } = useAuth();
  const { isOpen, setIsOpen } = useSubscriptionModal();
  const { status } = useAISubscription();
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<'explorer' | 'pioneer' | 'broker'>('pioneer');
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: 'start', containScroll: 'trimSnaps' });

  const currentPlan = status?.planType || 'free';

  const handleSubscribe = async (planId: 'explorer' | 'pioneer' | 'broker') => {
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
        headers: await getEdgeAuthHeaders(),
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

  const scrollPrev = useCallback(() => {
    if (emblaApi) emblaApi.scrollPrev();
  }, [emblaApi]);

  const scrollNext = useCallback(() => {
    if (emblaApi) emblaApi.scrollNext();
  }, [emblaApi]);

  // Comparison Data
  const featureLabels = [
    "Property Search",
    "Vastu Analytics",
    "Building Footprints",
    "Solar & Energy",
    "Saved Projects",
    "Export Reports",
  ];

  const plans = [
    {
      id: 'free' as const,
      name: "Free",
      price: "$0",
      period: "7 days",
      highlight: false,
      values: [
        "Limited",
        "Basic",
        <X className="w-4 h-4 text-zinc-400" key="free-fp" />,
        <X className="w-4 h-4 text-zinc-400" key="free-solar" />,
        "1 Project",
        <X className="w-4 h-4 text-zinc-400" key="free-export" />,
      ],
    },
    {
      id: 'explorer' as const,
      name: "Explorer",
      price: "$49",
      period: "/mo",
      highlight: false,
      values: [
        "5 / mo",
        "Standard",
        <Check className="w-4 h-4 text-[#EA580C]" key="exp-fp" />,
        <Check className="w-4 h-4 text-[#EA580C]" key="exp-solar" />,
        "10 Projects",
        <Check className="w-4 h-4 text-[#EA580C]" key="exp-export" />,
      ],
    },
    {
      id: 'pioneer' as const,
      name: "Pioneer",
      price: "$89",
      period: "/mo",
      highlight: true,
      values: [
        "25 / mo",
        "Advanced",
        <Check className="w-4 h-4 text-[#18181B]" key="pio-fp" />,
        <Check className="w-4 h-4 text-[#18181B]" key="pio-solar" />,
        "Unlimited",
        <Check className="w-4 h-4 text-[#18181B]" key="pio-export" />,
      ],
    },
    {
      id: 'broker' as const,
      name: "Broker",
      price: "$179",
      period: "/mo",
      highlight: false,
      values: [
        "Unlimited",
        "Pro Suite",
        <Check className="w-4 h-4 text-[#18181B]" key="bro-fp" />,
        <Check className="w-4 h-4 text-[#18181B]" key="bro-solar" />,
        "Unlimited",
        <Check className="w-4 h-4 text-[#18181B]" key="bro-export" />,
      ],
    },
  ];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-5xl p-0 gap-0 bg-[#DBCBB0] border-[#C5B49A] overflow-hidden rounded-3xl [&>button]:hidden">

        {/* Close Button */}
        <button
          onClick={() => setIsOpen(false)}
          className="absolute top-2 right-2 z-50 p-2 rounded-full bg-black/5 hover:bg-black/10 text-zinc-900 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex flex-col md:flex-row gap-8 items-stretch p-6 md:p-8">

          {/* Left Panel: Copy & CTA */}
          <div className="flex-[0_0_35%] flex flex-col justify-center min-w-[280px]">
            <div className="mb-6">
              <div className="inline-flex items-center gap-2 mb-6 select-none bg-white px-3.5 py-2 rounded-full shadow-sm border border-[#C5B49A]/30">
                <img src="/logo.png" alt="Halo Home" className="w-5 h-5 rounded object-contain shrink-0" />
                <span className="font-sans font-bold text-[13px] text-[#18181B] tracking-tight whitespace-nowrap">Halo Home</span>
              </div>
              <h2 className="text-4xl font-bold text-[#18181B] mb-4 leading-[1.1]" style={{ fontFamily: "'Playfair Display', serif" }}>
                Unlock Full Insights
              </h2>
              <h3 className="text-xl text-[#18181B] font-medium mb-2">
                Start your <span className="text-[#EA580C] font-bold">7-day free trial</span>
              </h3>
              <p className="text-[#52525B] text-sm leading-relaxed max-w-sm">
                Compare plans and choose the perfect toolkit for your Vastu & Property needs.
              </p>
            </div>

            <div className="mt-auto hidden md:block">
              <div className="flex items-center gap-4 text-xs font-medium text-[#52525B] mb-4">
                <span className="flex items-center gap-1"><Zap className="w-3 h-3 text-[#EA580C]" /> Instant Access</span>
                <span className="flex items-center gap-1"><Check className="w-3 h-3 text-[#EA580C]" /> Cancel Anytime</span>
              </div>
              <Button
                onClick={() => handleSubscribe(selectedPlan)}
                disabled={loadingPlan !== null || currentPlan === selectedPlan || (currentPlan !== 'free' && currentPlan !== 'credits')}
                className="w-full h-12 text-base font-medium bg-[#18181B] hover:bg-[#27272A] text-white shadow-lg shadow-black/5 rounded-xl transition-all disabled:opacity-50"
              >
                {loadingPlan ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : currentPlan !== 'free' && currentPlan !== 'credits' ? (
                  'Current Plan Active'
                ) : (
                  'Get Started'
                )}
              </Button>
            </div>
          </div>

          {/* Right Panel: Scrollable Comparison Table */}
          <div className="flex-1 bg-[#FDFAF6] rounded-2xl border border-[#C5B49A]/30 shadow-sm flex flex-col overflow-hidden relative">

            {/* Table Header: Nav & Headings */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100 bg-white/50 backdrop-blur-sm z-10 h-16">
              <span className="text-xs font-bold text-[#A1A1AA] uppercase tracking-wider w-32 shrink-0">Features</span>

              <div className="flex-1 flex justify-end gap-2 pr-8">
                <button onClick={scrollPrev} className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-[#EA580C] hover:border-[#EA580C] transition-all shadow-sm">
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button onClick={scrollNext} className="w-8 h-8 rounded-full bg-white border border-zinc-200 flex items-center justify-center text-zinc-600 hover:text-[#EA580C] hover:border-[#EA580C] transition-all shadow-sm">
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-1 overflow-hidden relative">
              {/* Fixed Feature Names Column */}
              <div className="w-32 shrink-0 border-r border-zinc-100 bg-zinc-50/50 flex flex-col pt-14 pb-4">
                {featureLabels.map((label, i) => (
                  <div key={i} className="h-10 flex items-center px-4 text-xs font-semibold text-[#52525B]">
                    {label}
                  </div>
                ))}
              </div>

              {/* Scrollable Plan Columns */}
              <div className="flex-1 overflow-hidden" ref={emblaRef}>
                <div className="flex h-full">
                  {plans.map((plan, i) => {
                    const isSelected = plan.id === selectedPlan;
                    const isCurrent = plan.id === currentPlan;
                    return (
                      <div
                        key={i}
                        className={`flex-[0_0_33.33%] min-w-[100px] flex flex-col border-r border-zinc-50 h-full cursor-pointer transition-colors ${plan.highlight ? 'bg-white' : ''} ${isSelected && !plan.highlight ? 'bg-white/60' : ''}`}
                        onClick={() => {
                          if (plan.id !== 'free') setSelectedPlan(plan.id as 'explorer' | 'pioneer' | 'broker');
                        }}
                      >
                        {/* Plan Header */}
                        <div className={`h-14 flex flex-col items-center justify-center border-b border-zinc-100 ${plan.highlight ? 'bg-[#EA580C]/5' : ''}`}>
                          <div className="flex items-center gap-1.5">
                            <span className={`text-sm font-bold ${plan.highlight ? 'text-[#EA580C]' : 'text-[#18181B]'}`}>
                              {plan.name}
                            </span>
                            {plan.highlight && <Sparkles className="w-3 h-3 text-[#EA580C] fill-current" />}
                            {isCurrent && (
                              <span className="ml-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-100 text-emerald-700">
                                Current
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-[#A1A1AA] font-medium">{plan.price} {plan.period}</span>
                        </div>

                        {/* Values */}
                        <div className="flex-1 flex flex-col pt-0">
                          {plan.values.map((val, idx) => (
                            <div key={idx} className="h-10 flex items-center justify-center border-b border-zinc-50 text-xs font-medium text-[#18181B]">
                              {val}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Mobile CTA */}
            <div className="p-3 md:hidden border-t border-zinc-100 bg-white/50">
              <Button
                onClick={() => handleSubscribe(selectedPlan)}
                disabled={loadingPlan !== null || currentPlan === selectedPlan || (currentPlan !== 'free' && currentPlan !== 'credits')}
                className="w-full h-10 text-sm font-medium bg-[#18181B] hover:bg-[#27272A] text-white shadow-lg shadow-black/5 rounded-xl transition-all disabled:opacity-50"
              >
                {loadingPlan ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  'Get Started'
                )}
              </Button>
            </div>

          </div>
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default SubscriptionModal;
