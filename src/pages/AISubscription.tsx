/**
 * AI Subscription Page
 * Allows users to manage their AI subscription, view usage, and purchase credits
 */

import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import {
  Sparkles,
  Zap,
  Crown,
  Check,
  ArrowLeft,
  CreditCard,
  History,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth-context';
import { useAISubscription } from '@/features/globe/ai/useAISubscription';
import { useToast } from '@/hooks/use-toast';

export default function AISubscription() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    status,
    plans,
    creditPackages,
    usageHistory,
    isLoading,
    error,
    createSubscriptionCheckout,
    purchaseCredits,
    refreshStatus,
    clearError,
  } = useAISubscription();

  // Handle success/cancel redirects from Stripe
  useEffect(() => {
    const subscriptionStatus = searchParams.get('subscription');
    const creditsStatus = searchParams.get('credits');

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

    if (creditsStatus === 'success') {
      toast({
        title: 'Credits purchased!',
        description: 'Your credits have been added to your account.',
      });
      refreshStatus();
    } else if (creditsStatus === 'canceled') {
      toast({
        title: 'Purchase canceled',
        description: 'No credits were purchased.',
        variant: 'destructive',
      });
    }
  }, [searchParams, toast, refreshStatus]);

  // Handle subscription upgrade
  const handleSubscribe = async (planId: string) => {
    const url = await createSubscriptionCheckout(planId);
    if (url) {
      window.location.href = url;
    }
  };

  // Handle credit purchase
  const handlePurchaseCredits = async (packageId: string) => {
    const url = await purchaseCredits(packageId);
    if (url) {
      window.location.href = url;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-amber-500" />
            </div>
            <CardTitle>Sign in Required</CardTitle>
            <CardDescription>
              Please sign in to manage your AI subscription
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate('/')} className="w-full">
              Go to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  const usagePercent = status
    ? status.planType === 'credits'
      ? 100
      : (status.questionsUsed / status.questionsLimit) * 100
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Header */}
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">AI Subscription</h1>
            <p className="text-sm text-slate-500">Manage your Astro Guide AI access</p>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-8">
        {/* Error display */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-red-500" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            <Button variant="ghost" size="sm" onClick={clearError} className="ml-auto">
              Dismiss
            </Button>
          </div>
        )}

        {/* Current Plan */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Current Plan</h2>
          <Card>
            <CardContent className="p-6">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                </div>
              ) : status ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        status.planType === 'pro' ? 'bg-amber-100 dark:bg-amber-900/30' :
                        status.planType === 'starter' ? 'bg-blue-100 dark:bg-blue-900/30' :
                        'bg-slate-100 dark:bg-slate-800'
                      }`}>
                        {status.planType === 'pro' ? (
                          <Crown className="w-5 h-5 text-amber-600" />
                        ) : (
                          <Zap className="w-5 h-5 text-blue-600" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold capitalize">
                            {status.planType === 'free' ? 'Free Plan' :
                             status.planType === 'credits' ? 'Pay Per Use' :
                             `${status.planType.charAt(0).toUpperCase() + status.planType.slice(1)} Plan`}
                          </span>
                          {status.hasSonarProAccess && (
                            <Badge variant="secondary" className="bg-amber-100 text-amber-700">
                              Pro
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">
                          {status.planType === 'credits'
                            ? `${status.creditsBalance} credits remaining`
                            : `${status.questionsRemaining} of ${status.questionsLimit} questions remaining`}
                        </p>
                      </div>
                    </div>
                    {status.subscriptionStatus === 'active' && status.planType !== 'free' && (
                      <Badge variant="outline" className="text-green-600 border-green-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>

                  {status.planType !== 'credits' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-slate-500">Monthly usage</span>
                        <span className="font-medium">{status.questionsUsed} / {status.questionsLimit}</span>
                      </div>
                      <Progress value={usagePercent} className="h-2" />
                    </div>
                  )}

                  {status.currentPeriodEnd && status.planType !== 'free' && (
                    <p className="text-xs text-slate-400">
                      {status.subscriptionStatus === 'canceled'
                        ? `Access until ${new Date(status.currentPeriodEnd).toLocaleDateString()}`
                        : `Renews on ${new Date(status.currentPeriodEnd).toLocaleDateString()}`}
                    </p>
                  )}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-slate-500">You're on the free plan with 5 questions per month.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </section>

        {/* Subscription Plans */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Upgrade Your Plan</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {/* Starter Plan */}
            <Card className={`relative ${status?.planType === 'starter' ? 'ring-2 ring-blue-500' : 'ring-2 ring-amber-500/50'}`}>
              {status?.planType === 'starter' ? (
                <Badge className="absolute -top-2 left-4 bg-blue-500">Current Plan</Badge>
              ) : (
                <Badge className="absolute -top-2 left-4 bg-amber-500 text-black">Limited Offer</Badge>
              )}
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-amber-500" />
                  <CardTitle className="text-lg">Starter</CardTitle>
                </div>
                <CardDescription>For regular explorers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">$10</span>
                  <span className="text-slate-500">/month</span>
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-400 -mt-2">
                  Use code <span className="font-mono font-bold">NEWYEARPLAN</span> for discount!
                </p>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    50 AI questions per month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Sonar model (fast & accurate)
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Chat history saved
                  </li>
                </ul>
                <p className="text-xs text-slate-500 text-center">First 100 users · Ends Jan 15</p>
              </CardContent>
              <CardFooter>
                <Button
                  className={`w-full ${status?.planType !== 'starter' && status?.planType !== 'pro' ? 'bg-amber-500 hover:bg-amber-600' : ''}`}
                  variant={status?.planType === 'starter' ? 'outline' : 'default'}
                  disabled={status?.planType === 'starter' || status?.planType === 'pro'}
                  onClick={() => handleSubscribe('starter')}
                >
                  {status?.planType === 'starter' ? 'Current Plan' :
                   status?.planType === 'pro' ? 'Downgrade not available' :
                   'Subscribe'}
                </Button>
              </CardFooter>
            </Card>

            {/* Pro Plan */}
            <Card className={`relative ${status?.planType === 'pro' ? 'ring-2 ring-amber-500' : 'border-amber-200 dark:border-amber-800'}`}>
              {status?.planType === 'pro' ? (
                <Badge className="absolute -top-2 left-4 bg-amber-500">Current Plan</Badge>
              ) : (
                <Badge className="absolute -top-2 left-4 bg-gradient-to-r from-amber-500 to-orange-500">
                  Recommended
                </Badge>
              )}
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Crown className="w-5 h-5 text-amber-500" />
                  <CardTitle className="text-lg">Pro</CardTitle>
                </div>
                <CardDescription>For serious astrocartographers</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold">$20</span>
                  <span className="text-slate-500">/month</span>
                </div>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    200 AI questions per month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="flex items-center gap-1">
                      Pro model
                      <Badge variant="secondary" className="text-[10px] py-0">Advanced</Badge>
                    </span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Priority support
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-green-500" />
                    Early access to new features
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button
                  className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600"
                  disabled={status?.planType === 'pro'}
                  onClick={() => handleSubscribe('pro')}
                >
                  {status?.planType === 'pro' ? 'Current Plan' : 'Upgrade to Pro'}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </section>

        <Separator />

        {/* Credit Packs */}
        <section>
          <h2 className="text-lg font-semibold mb-2">Buy Question Credits</h2>
          <p className="text-sm text-slate-500 mb-4">
            Need more questions? Purchase credits that never expire.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            {[
              { id: 'pack_10', credits: 10, price: 2.99 },
              { id: 'pack_25', credits: 25, price: 5.99, popular: true },
              { id: 'pack_50', credits: 50, price: 9.99 },
            ].map((pack) => (
              <Card key={pack.id} className={`relative ${pack.popular ? 'border-blue-300 dark:border-blue-700' : ''}`}>
                {pack.popular && (
                  <Badge className="absolute -top-2 left-4 bg-blue-500">Best Value</Badge>
                )}
                <CardContent className="p-4 text-center">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                    <CreditCard className="w-5 h-5 text-slate-600" />
                  </div>
                  <p className="text-2xl font-bold">{pack.credits}</p>
                  <p className="text-sm text-slate-500 mb-3">questions</p>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handlePurchaseCredits(pack.id)}
                  >
                    ${pack.price.toFixed(2)}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Usage History */}
        {usageHistory.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <History className="w-5 h-5" />
              Recent Usage
            </h2>
            <Card>
              <CardContent className="p-0">
                <div className="divide-y divide-slate-200 dark:divide-slate-800">
                  {usageHistory.slice(0, 10).map((entry) => (
                    <div key={entry.id} className="px-4 py-3 flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm truncate">{entry.question || 'AI Question'}</p>
                        <p className="text-xs text-slate-400">
                          {new Date(entry.createdAt).toLocaleDateString()} at{' '}
                          {new Date(entry.createdAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs ml-2">
                        {entry.model}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        )}
      </main>
    </div>
  );
}
