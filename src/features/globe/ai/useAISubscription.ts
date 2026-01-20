/**
 * useAISubscription Hook
 * Manages AI subscription status, credit purchases, and usage tracking
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth-context';
import { getEdgeAuthHeaders } from '@/lib/edgeAuth';

export interface SubscriptionStatus {
  id: string;
  // Backward-compatible: older deployments used starter/pro or seeker/sage.
  planType: 'free' | 'explorer' | 'pioneer' | 'broker' | 'credits' | 'starter' | 'pro' | 'seeker' | 'sage';
  questionsLimit: number;
  questionsUsed: number;
  questionsRemaining: number;
  creditsBalance: number;
  hasSonarProAccess: boolean;
  subscriptionStatus: 'active' | 'canceled' | 'past_due';
  currentPeriodEnd: string | null;
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  questions: number;
  hasSonarPro: boolean;
}

export interface CreditPackage {
  id: string;
  name: string;
  price: number;
  credits: number;
}

export interface UsageLogEntry {
  id: string;
  model: string;
  question: string;
  inputTokens: number;
  outputTokens: number;
  createdAt: string;
}

// Generate anonymous ID for non-authenticated users
function getAnonymousId(): string {
  const key = 'astro_anonymous_id';
  let id = localStorage.getItem(key);
  if (!id) {
    id = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem(key, id);
  }
  return id;
}

export function useAISubscription() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SubscriptionStatus | null>(null);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [creditPackages, setCreditPackages] = useState<CreditPackage[]>([]);
  const [usageHistory, setUsageHistory] = useState<UsageLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const anonymousId = !user ? getAnonymousId() : undefined;

  // Fetch subscription status
  const fetchStatus = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-subscription', {
        body: {
          action: 'getStatus',
          userId: user?.id,
          anonymousId,
        },
        headers: await getEdgeAuthHeaders(),
      });

      if (fnError) throw fnError;
      setStatus(data.status);
    } catch (err) {
      console.error('Error fetching subscription status:', err);
      // Don't set error for initial fetch - user might not have subscription yet
    }
  }, [user, anonymousId]);

  // Fetch available plans
  const fetchPlans = useCallback(async () => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-subscription', {
        body: { action: 'getPlans' },
        headers: await getEdgeAuthHeaders(),
      });

      if (fnError) throw fnError;
      setPlans(data.subscriptions || []);
      setCreditPackages(data.credits || []);
    } catch (err) {
      console.error('Error fetching plans:', err);
    }
  }, []);

  // Fetch usage history
  const fetchUsageHistory = useCallback(async () => {
    if (!user) return;

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-subscription', {
        body: {
          action: 'getUsage',
          userId: user.id,
        },
        headers: await getEdgeAuthHeaders(),
      });

      if (fnError) throw fnError;
      setUsageHistory(data.history || []);
    } catch (err) {
      console.error('Error fetching usage history:', err);
    }
  }, [user]);

  // Create subscription checkout
  const createSubscriptionCheckout = useCallback(async (planId: string) => {
    if (!user) {
      setError('You must be logged in to subscribe');
      return null;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-subscription', {
        body: {
          action: 'createSubscription',
          userId: user.id,
          plan: planId,
          successUrl: `${window.location.origin}/ai-subscription?subscription=success`,
          cancelUrl: `${window.location.origin}/ai-subscription?subscription=canceled`,
        },
        headers: await getEdgeAuthHeaders(),
      });

      if (fnError) throw fnError;
      return data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create checkout';
      setError(message);
      return null;
    }
  }, [user]);

  // Purchase credits
  const purchaseCredits = useCallback(async (packageId: string) => {
    if (!user) {
      setError('You must be logged in to purchase credits');
      return null;
    }

    try {
      const { data, error: fnError } = await supabase.functions.invoke('ai-subscription', {
        body: {
          action: 'purchaseCredits',
          userId: user.id,
          creditPackage: packageId,
          successUrl: `${window.location.origin}/ai-subscription?credits=success`,
          cancelUrl: `${window.location.origin}/ai-subscription?credits=canceled`,
        },
        headers: await getEdgeAuthHeaders(),
      });

      if (fnError) throw fnError;
      return data.url;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create checkout';
      setError(message);
      return null;
    }
  }, [user]);

  // Refresh status after purchase
  const refreshStatus = useCallback(() => {
    fetchStatus();
    if (user) {
      fetchUsageHistory();
    }
  }, [fetchStatus, fetchUsageHistory, user]);

  // Initial fetch
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchStatus(), fetchPlans()]);
      if (user) {
        await fetchUsageHistory();
      }
      setIsLoading(false);
    };
    loadData();
  }, [fetchStatus, fetchPlans, fetchUsageHistory, user]);

  // Get subscription info for AI chat calls
  const getSubscriptionInfo = useCallback(() => {
    return {
      subscriptionId: status?.id,
      userId: user?.id,
      anonymousId,
    };
  }, [status, user, anonymousId]);

  // Check if user can ask a question
  const canAskQuestion = useCallback((): { allowed: boolean; reason?: string } => {
    if (!status) {
      // No subscription yet - they'll get a free tier on first question
      return { allowed: true };
    }

    if (status.planType === 'credits') {
      if (status.creditsBalance <= 0) {
        return { allowed: false, reason: 'No credits remaining. Purchase more to continue.' };
      }
      return { allowed: true };
    }

    if (status.questionsRemaining <= 0) {
      return {
        allowed: false,
        reason: `Monthly limit reached (${status.questionsUsed}/${status.questionsLimit}). Upgrade or buy credits.`,
      };
    }

    return { allowed: true };
  }, [status]);

  // Get display info for remaining questions
  const getRemainingDisplay = useCallback((): string => {
    if (!status) {
      return '5 free questions';
    }

    if (status.planType === 'credits') {
      return `${status.creditsBalance} credits`;
    }

    return `${status.questionsRemaining}/${status.questionsLimit} questions`;
  }, [status]);

  return {
    status,
    plans,
    creditPackages,
    usageHistory,
    isLoading,
    error,
    createSubscriptionCheckout,
    purchaseCredits,
    refreshStatus,
    getSubscriptionInfo,
    canAskQuestion,
    getRemainingDisplay,
    clearError: () => setError(null),
  };
}

export default useAISubscription;
