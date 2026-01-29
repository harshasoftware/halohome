/**
 * AI Subscription Edge Function
 * Handles Stripe subscriptions and credit purchases for AI features
 */

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import Stripe from 'https://esm.sh/stripe@14.8.0';
import {
  checkRateLimit,
  getClientIp,
  buildIdentifier,
  getRateLimitConfig,
  getUserTier,
  rateLimitResponse,
  rateLimitHeaders,
  addRateLimitToBody,
  RATE_LIMIT_ENDPOINTS,
  type RateLimitResult,
} from '../_shared/rate-limit.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SB_PUBLISHABLE_KEY');
const STRIPE_SECRET_KEY = Deno.env.get('STRIPE_SECRET_KEY');
const STRIPE_WEBHOOK_SECRET = Deno.env.get('STRIPE_WEBHOOK_SECRET');

// Validate required environment variables and log status at startup
console.log('[ai-subscription] Starting up...');
console.log('[ai-subscription] Config status:', {
  SUPABASE_URL: !!SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: !!SUPABASE_SERVICE_ROLE_KEY,
  STRIPE_SECRET_KEY: !!STRIPE_SECRET_KEY,
  STRIPE_WEBHOOK_SECRET: !!STRIPE_WEBHOOK_SECRET,
  STRIPE_EXPLORER_PRICE_ID: !!Deno.env.get('STRIPE_EXPLORER_PRICE_ID'),
  STRIPE_PIONEER_PRICE_ID: !!Deno.env.get('STRIPE_PIONEER_PRICE_ID'),
  STRIPE_BROKER_PRICE_ID: !!Deno.env.get('STRIPE_BROKER_PRICE_ID'),
});

if (!STRIPE_SECRET_KEY) {
  console.error('[ai-subscription] STRIPE_SECRET_KEY is not configured');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// Auth verification client (per Supabase docs): validate access tokens via getClaims().
// Prefer anon/publishable key for verification; fall back to service role if needed.
const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY ?? SUPABASE_SERVICE_ROLE_KEY);
const stripe = STRIPE_SECRET_KEY
  ? new Stripe(STRIPE_SECRET_KEY, { apiVersion: '2023-10-16' })
  : null;

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader) return null;
  const [bearer, token] = authHeader.split(' ');
  if (bearer !== 'Bearer' || !token) return null;
  return token;
}

async function requireSupabaseUser(req: Request) {
  const token = getBearerToken(req);
  if (!token) {
    return { user: null as const, error: 'Missing authorization header' as const };
  }

  // NOTE (Supabase docs):
  // `verify_jwt=true` at the Edge gateway can be incompatible with JWT Signing Keys (e.g. ES256).
  // Instead, disable gateway verification and validate here using Supabase Auth.
  const { data, error } = await supabaseAuth.auth.getClaims(token);
  const claims = data?.claims as Record<string, unknown> | undefined;
  const userId = (claims?.sub as string | undefined) ?? null;
  const isAnonymous = (claims?.is_anonymous as boolean | undefined) ?? false;
  const email = (claims?.email as string | undefined) ?? null;

  if (error || !userId) {
    return { user: null as const, error: 'Invalid JWT' as const };
  }

  return { user: { id: userId, email, isAnonymous }, error: null as const };
}

// Plan configurations (Halo Home scouting tiers)
const PLANS = {
  explorer: {
    name: 'Explorer',
    questions: 10, // ZIP scouts / month
    price: 4900, // $49/month
    hasSonarPro: false,
    priceId: Deno.env.get('STRIPE_EXPLORER_PRICE_ID'),
  },
  pioneer: {
    name: 'Pioneer',
    questions: 25, // ZIP scouts / month
    price: 8900, // $89/month
    hasSonarPro: false,
    priceId: Deno.env.get('STRIPE_PIONEER_PRICE_ID'),
  },
  broker: {
    name: 'Broker',
    questions: 60, // ZIP scouts / month
    price: 17900, // $179/month
    hasSonarPro: true,
    priceId: Deno.env.get('STRIPE_BROKER_PRICE_ID'),
  },
};

// Credit packages
const CREDIT_PACKAGES = {
  pack_10: { credits: 10, price: 299, name: '10 Questions' }, // $2.99
  pack_25: { credits: 25, price: 599, name: '25 Questions' }, // $5.99
  pack_50: { credits: 50, price: 999, name: '50 Questions' }, // $9.99
};

interface RequestBody {
  action: string;
  userId?: string;
  anonymousId?: string;
  email?: string; // For anonymous purchases
  plan?: keyof typeof PLANS;
  creditPackage?: keyof typeof CREDIT_PACKAGES;
  successUrl?: string;
  cancelUrl?: string;
}

/**
 * Create a Stripe checkout session for subscription
 */
async function createSubscriptionCheckout(
  userId: string,
  plan: keyof typeof PLANS,
  successUrl: string,
  cancelUrl: string,
  email?: string
): Promise<{ url: string | null }> {
  if (!stripe) {
    throw new Error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
  }

  const planConfig = PLANS[plan];
  if (!planConfig?.priceId) {
    throw new Error(`Invalid plan: ${plan}. Price ID not configured. Set STRIPE_${plan.toUpperCase()}_PRICE_ID env var.`);
  }

  // Get or create customer
  let customerId: string | undefined;
  const { data: sub, error: subError } = await supabase
    .from('ai_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle(); // Use maybeSingle to avoid error when no rows

  if (subError) {
    console.error('Error fetching subscription:', subError);
  }

  if (sub?.stripe_customer_id) {
    customerId = sub.stripe_customer_id;
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    customer_email: customerId ? undefined : email, // Autofill email for new customers
    // Note: customer_creation is only valid for 'payment' mode, not 'subscription'
    // Stripe automatically creates a customer in subscription mode if none exists
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    // Stripe only allows one: discounts (auto-apply) OR allow_promotion_codes (manual entry)
    allow_promotion_codes: true,
    metadata: {
      userId,
      plan,
      type: 'subscription',
    },
  });

  return { url: session.url };
}

/**
 * Create a Stripe checkout session for credit purchase
 */
async function createCreditCheckout(
  userId: string,
  creditPackage: keyof typeof CREDIT_PACKAGES,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string | null }> {
  if (!stripe) {
    throw new Error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
  }

  const packageConfig = CREDIT_PACKAGES[creditPackage];
  if (!packageConfig) {
    throw new Error(`Invalid credit package: ${creditPackage}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `AI Questions: ${packageConfig.name}`,
            description: `${packageConfig.credits} AI questions for astrocartography insights`,
          },
          unit_amount: packageConfig.price,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      creditPackage,
      credits: packageConfig.credits.toString(),
      type: 'credits',
    },
  });

  return { url: session.url };
}

/**
 * Create a Stripe checkout session for anonymous credit purchase (no account required)
 * Email is collected by Stripe and credits assigned after payment
 */
async function createAnonymousCreditCheckout(
  creditPackage: keyof typeof CREDIT_PACKAGES,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string | null }> {
  if (!stripe) {
    throw new Error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
  }

  const packageConfig = CREDIT_PACKAGES[creditPackage];
  if (!packageConfig) {
    throw new Error(`Invalid credit package: ${creditPackage}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    customer_creation: 'always', // Always create customer to capture email
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: {
            name: `AI Questions: ${packageConfig.name}`,
            description: `${packageConfig.credits} AI questions for astrocartography insights. Credits will be assigned to your email.`,
          },
          unit_amount: packageConfig.price,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      creditPackage,
      credits: packageConfig.credits.toString(),
      type: 'anonymous_credits',
    },
    // Stripe will collect email automatically
  });

  return { url: session.url };
}

/**
 * Create a Stripe checkout session for anonymous subscription
 * User enters email on Stripe Checkout
 */
async function createAnonymousSubscriptionCheckout(
  plan: keyof typeof PLANS,
  successUrl: string,
  cancelUrl: string
): Promise<{ url: string | null }> {
  if (!stripe) {
    throw new Error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
  }

  const planConfig = PLANS[plan];
  if (!planConfig?.priceId) {
    throw new Error(`Invalid plan: ${plan}. Price ID not configured.`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: planConfig.priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    allow_promotion_codes: true,
    metadata: {
      plan,
      type: 'anonymous_subscription',
    },
  });

  return { url: session.url };
}

/**
 * Create a Stripe subscription with a 7-day trial for Embedded Checkout
 * Returns clientSecret for the frontend Payment Element
 */
async function createSubscriptionIntent(
  userId: string,
  plan: keyof typeof PLANS,
  email?: string
): Promise<{ clientSecret: string; subscriptionId: string }> {
  if (!stripe) {
    throw new Error('Stripe is not configured. STRIPE_SECRET_KEY is missing.');
  }

  const planConfig = PLANS[plan];
  if (!planConfig?.priceId) {
    throw new Error(`Invalid plan: ${plan}. Price ID not configured.`);
  }

  // Get or create customer
  let customerId: string | undefined;
  const { data: sub, error: subError } = await supabase
    .from('ai_subscriptions')
    .select('stripe_customer_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (sub?.stripe_customer_id) {
    customerId = sub.stripe_customer_id;
  } else {
    // Create new customer
    const customer = await stripe.customers.create({
      email: email,
      metadata: { userId },
    });
    customerId = customer.id;
  }

  // Create the subscription with trial
  // For embedded checkout (Payment Element), we need 'payment_behavior: default_incomplete'
  // and we need to expand 'latest_invoice.payment_intent' plus 'pending_setup_intent'
  // so we can get the client_secret.
  const subscription = await stripe.subscriptions.create({
    customer: customerId,
    items: [{ price: planConfig.priceId }],
    trial_period_days: 7,
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent', 'pending_setup_intent'],
    metadata: {
      userId,
      plan,
      type: 'subscription',
    }
  });

  // Depending on the status/type, we get the client secret from different places
  // Since it's a trial, the first invoice might be $0 (or not created immediately for payment),
  // but we usually need a SetupIntent to collect the card for future payments.
  // OR if there's an immediate charge (unlikely for free trial), we use PaymentIntent.

  let clientSecret = '';

  // For trials, there's often no immediate payment, so pending_setup_intent is used to set up the card.
  if (subscription.pending_setup_intent) {
    const setupIntent = subscription.pending_setup_intent as Stripe.SetupIntent;
    clientSecret = setupIntent.client_secret!;
  } else if (subscription.latest_invoice) {
    // Fallback: if configured differently, check invoice
    const invoice = subscription.latest_invoice as Stripe.Invoice;
    if (invoice.payment_intent) {
      const pi = invoice.payment_intent as Stripe.PaymentIntent;
      clientSecret = pi.client_secret!;
    }
  }

  if (!clientSecret) {
    throw new Error('Could not generate client secret for subscription.');
  }

  return {
    clientSecret,
    subscriptionId: subscription.id
  };
}

/**
 * Get subscription status by email (for anonymous purchases)
 */
async function getSubscriptionByEmail(email: string) {
  const { data, error } = await supabase
    .from('ai_subscriptions')
    .select('*')
    .eq('email', email.toLowerCase())
    .is('user_id', null)
    .single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    email: data.email,
    planType: data.plan_type,
    questionsLimit: data.questions_limit,
    questionsUsed: data.questions_used,
    questionsRemaining: Math.max(0, data.questions_limit - data.questions_used),
    creditsBalance: data.credits_balance,
    hasSonarProAccess: data.has_sonar_pro_access,
    subscriptionStatus: data.subscription_status,
    currentPeriodEnd: data.current_period_end,
  };
}

/**
 * Claim credits by email when user signs up
 */
async function claimCreditsByEmail(userId: string, email: string) {
  // Find any unclaimed credits for this email
  const { data: unclaimedSub } = await supabase
    .from('ai_subscriptions')
    .select('*')
    .eq('email', email.toLowerCase())
    .is('user_id', null)
    .single();

  if (!unclaimedSub) {
    return { claimed: false, message: 'No unclaimed credits found for this email' };
  }

  // Check if user already has a subscription
  const { data: existingSub } = await supabase
    .from('ai_subscriptions')
    .select('id, credits_balance')
    .eq('user_id', userId)
    .single();

  if (existingSub) {
    // Merge credits into existing subscription
    const newBalance = (existingSub.credits_balance || 0) + (unclaimedSub.credits_balance || 0);

    await supabase
      .from('ai_subscriptions')
      .update({ credits_balance: newBalance })
      .eq('id', existingSub.id);

    // Delete the unclaimed subscription
    await supabase
      .from('ai_subscriptions')
      .delete()
      .eq('id', unclaimedSub.id);

    return { claimed: true, credits: unclaimedSub.credits_balance, message: 'Credits merged into your account' };
  } else {
    // Transfer the subscription to this user
    await supabase
      .from('ai_subscriptions')
      .update({ user_id: userId })
      .eq('id', unclaimedSub.id);

    return { claimed: true, credits: unclaimedSub.credits_balance, message: 'Credits claimed successfully' };
  }
}

/**
 * Get subscription status for a user
 */
async function getSubscriptionStatus(userId?: string, anonymousId?: string) {
  let query = supabase.from('ai_subscriptions').select('*');

  if (userId) {
    query = query.eq('user_id', userId);
  } else if (anonymousId) {
    query = query.eq('anonymous_id', anonymousId);
  } else {
    return null;
  }

  const { data, error } = await query.single();

  if (error || !data) {
    return null;
  }

  return {
    id: data.id,
    planType: data.plan_type,
    questionsLimit: data.questions_limit,
    questionsUsed: data.questions_used,
    questionsRemaining: Math.max(0, data.questions_limit - data.questions_used),
    creditsBalance: data.credits_balance,
    hasSonarProAccess: data.has_sonar_pro_access,
    subscriptionStatus: data.subscription_status,
    currentPeriodEnd: data.current_period_end,
  };
}

/**
 * Get usage history for a user
 */
async function getUsageHistory(userId: string, limit = 20) {
  const { data, error } = await supabase
    .from('ai_usage_log')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching usage history:', error);
    return [];
  }

  return data.map((log) => ({
    id: log.id,
    model: log.model,
    question: log.question_preview,
    inputTokens: log.input_tokens,
    outputTokens: log.output_tokens,
    createdAt: log.created_at,
  }));
}

/**
 * Handle Stripe webhook events
 */
async function handleWebhook(req: Request): Promise<Response> {
  if (!stripe) {
    return new Response('Stripe is not configured', { status: 500 });
  }

  const signature = req.headers.get('stripe-signature');
  if (!signature || !STRIPE_WEBHOOK_SECRET) {
    return new Response('Missing signature or webhook secret', { status: 400 });
  }

  const body = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('Webhook signature verification failed:', err);
    return new Response('Invalid signature', { status: 400 });
  }

  console.log('Processing webhook event:', event.type);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const metadata = session.metadata || {};

      // Get customer email from Stripe
      const customerEmail = session.customer_details?.email?.toLowerCase();

      if (metadata.type === 'subscription') {
        // Handle subscription creation (authenticated user)
        const plan = metadata.plan as keyof typeof PLANS;
        const planConfig = PLANS[plan];

        await supabase
          .from('ai_subscriptions')
          .upsert({
            user_id: metadata.userId,
            plan_type: plan,
            stripe_customer_id: session.customer as string,
            stripe_subscription_id: session.subscription as string,
            subscription_status: 'active',
            questions_limit: planConfig.questions,
            questions_used: 0,
            has_sonar_pro_access: planConfig.hasSonarPro,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          }, { onConflict: 'user_id' });

      } else if (metadata.type === 'anonymous_subscription') {
        // Handle anonymous subscription (pay first, account later)
        const plan = metadata.plan as keyof typeof PLANS;
        const planConfig = PLANS[plan];

        if (!customerEmail) {
          console.error('No customer email for anonymous subscription');
          break;
        }

        // Check if this email already has a subscription
        const { data: existing } = await supabase
          .from('ai_subscriptions')
          .select('id')
          .eq('email', customerEmail)
          .single();

        if (existing) {
          // Update existing email-based subscription
          await supabase
            .from('ai_subscriptions')
            .update({
              plan_type: plan,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              subscription_status: 'active',
              questions_limit: planConfig.questions,
              questions_used: 0,
              has_sonar_pro_access: planConfig.hasSonarPro,
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            })
            .eq('id', existing.id);
        } else {
          // Create new email-based subscription
          await supabase
            .from('ai_subscriptions')
            .insert({
              email: customerEmail,
              plan_type: plan,
              stripe_customer_id: session.customer as string,
              stripe_subscription_id: session.subscription as string,
              subscription_status: 'active',
              questions_limit: planConfig.questions,
              questions_used: 0,
              has_sonar_pro_access: planConfig.hasSonarPro,
              current_period_start: new Date().toISOString(),
              current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            });
        }

        console.log(`Anonymous subscription created for email: ${customerEmail}`);

      } else if (metadata.type === 'credits') {
        // Handle credit purchase (authenticated user)
        const credits = parseInt(metadata.credits || '0', 10);

        // Add credits to existing subscription or create credits plan
        const { data: existing } = await supabase
          .from('ai_subscriptions')
          .select('id, credits_balance')
          .eq('user_id', metadata.userId)
          .single();

        if (existing) {
          await supabase
            .from('ai_subscriptions')
            .update({
              credits_balance: (existing.credits_balance || 0) + credits,
              plan_type: 'credits',
            })
            .eq('id', existing.id);

          // Record the purchase
          await supabase.from('ai_credit_purchases').insert({
            subscription_id: existing.id,
            user_id: metadata.userId,
            stripe_checkout_session_id: session.id,
            credits_purchased: credits,
            amount_cents: session.amount_total || 0,
            status: 'completed',
            completed_at: new Date().toISOString(),
          });
        } else {
          // Create new subscription with credits
          const { data: newSub } = await supabase
            .from('ai_subscriptions')
            .insert({
              user_id: metadata.userId,
              plan_type: 'credits',
              credits_balance: credits,
              questions_limit: 0,
              has_sonar_pro_access: false,
            })
            .select('id')
            .single();

          if (newSub) {
            await supabase.from('ai_credit_purchases').insert({
              subscription_id: newSub.id,
              user_id: metadata.userId,
              stripe_checkout_session_id: session.id,
              credits_purchased: credits,
              amount_cents: session.amount_total || 0,
              status: 'completed',
              completed_at: new Date().toISOString(),
            });
          }
        }
      } else if (metadata.type === 'anonymous_credits') {
        // Handle anonymous credit purchase (pay first, account later)
        const credits = parseInt(metadata.credits || '0', 10);

        if (!customerEmail) {
          console.error('No customer email for anonymous credit purchase');
          break;
        }

        // Check if this email already has credits
        const { data: existing } = await supabase
          .from('ai_subscriptions')
          .select('id, credits_balance')
          .eq('email', customerEmail)
          .single();

        if (existing) {
          // Add credits to existing email-based subscription
          await supabase
            .from('ai_subscriptions')
            .update({
              credits_balance: (existing.credits_balance || 0) + credits,
              plan_type: 'credits',
            })
            .eq('id', existing.id);

          // Record the purchase
          await supabase.from('ai_credit_purchases').insert({
            subscription_id: existing.id,
            email: customerEmail,
            stripe_checkout_session_id: session.id,
            credits_purchased: credits,
            amount_cents: session.amount_total || 0,
            status: 'completed',
            completed_at: new Date().toISOString(),
          });
        } else {
          // Create new email-based subscription with credits
          const { data: newSub } = await supabase
            .from('ai_subscriptions')
            .insert({
              email: customerEmail,
              plan_type: 'credits',
              credits_balance: credits,
              questions_limit: 0,
              has_sonar_pro_access: false,
            })
            .select('id')
            .single();

          if (newSub) {
            await supabase.from('ai_credit_purchases').insert({
              subscription_id: newSub.id,
              email: customerEmail,
              stripe_checkout_session_id: session.id,
              credits_purchased: credits,
              amount_cents: session.amount_total || 0,
              status: 'completed',
              completed_at: new Date().toISOString(),
            });
          }
        }

        console.log(`Anonymous credits (${credits}) purchased for email: ${customerEmail}`);
      }
      break;
    }

    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;

      await supabase
        .from('ai_subscriptions')
        .update({
          subscription_status: subscription.status === 'active' ? 'active' :
            subscription.status === 'canceled' ? 'canceled' : 'past_due',
          current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        })
        .eq('stripe_subscription_id', subscription.id);
      break;
    }

    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        // Reset monthly usage on successful renewal
        await supabase
          .from('ai_subscriptions')
          .update({
            questions_used: 0,
            subscription_status: 'active',
          })
          .eq('stripe_subscription_id', invoice.subscription);
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        await supabase
          .from('ai_subscriptions')
          .update({ subscription_status: 'past_due' })
          .eq('stripe_subscription_id', invoice.subscription);
      }
      break;
    }
  }

  return new Response('OK', { status: 200 });
}

// Actions that create checkout sessions (stricter rate limits)
const CHECKOUT_ACTIONS = [
  'createSubscription',
  'createSubscriptionIntent',
  'purchaseCredits',
  'purchaseCreditsAnonymous',
  'subscribeAnonymous',
  'claimCredits',
];


Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Handle Stripe Webhooks
  if (req.headers.get('stripe-signature')) {
    return handleWebhook(req);
  }

  try {
    const { user, error: authError } = await requireSupabaseUser(req);
    const userId = user?.id;
    const isAnonymous = user?.isAnonymous;
    const clientIp = getClientIp(req);

    // Rate Limiting
    const identifier = buildIdentifier(userId, clientIp);
    const rateLimitConfig = getRateLimitConfig(getUserTier(user));
    const rateLimitResult = await checkRateLimit(identifier, rateLimitConfig);

    if (!rateLimitResult.success) {
      return rateLimitResponse(rateLimitResult);
    }

    // Parse Request Body
    let body: RequestBody;
    try {
      body = await req.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON body' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { action, plan, creditPackage, successUrl, cancelUrl } = body;

    // Additional Rate Limit Check for Checkout Actions
    if (CHECKOUT_ACTIONS.includes(action)) {
      // logic for checkouts handled broadly by above or specific handling
    }

    switch (action) {

      case 'createSubscriptionIntent': {
        if (!userId || !plan) {
          return new Response(
            JSON.stringify(addRateLimitToBody({ error: 'Missing required parameters' }, rateLimitResult)),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) } }
          );
        }
        const result = await createSubscriptionIntent(
          userId,
          plan as keyof typeof PLANS,
          body.email
        );
        return new Response(
          JSON.stringify(addRateLimitToBody(result, rateLimitResult)),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) } }
        );
      }

      case 'createSubscription': {
        if (!userId || !plan || !successUrl || !cancelUrl) {
          return new Response(
            JSON.stringify(addRateLimitToBody({ error: 'Missing required parameters' }, rateLimitResult)),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) } }
          );
        }
        const { url: checkoutUrl } = await createSubscriptionCheckout(
          userId,
          plan as keyof typeof PLANS,
          successUrl,
          cancelUrl,
          body.email // Pass email for Stripe autofill
        );
        return new Response(
          JSON.stringify(addRateLimitToBody({ url: checkoutUrl }, rateLimitResult)),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) } }
        );
      }

      case 'purchaseCredits': {
        if (!userId || !creditPackage || !successUrl || !cancelUrl) {
          return new Response(
            JSON.stringify(addRateLimitToBody({ error: 'Missing required parameters' }, rateLimitResult)),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) } }
          );
        }
        const { url: checkoutUrl } = await createCreditCheckout(
          userId,
          creditPackage as keyof typeof CREDIT_PACKAGES,
          successUrl,
          cancelUrl
        );
        return new Response(
          JSON.stringify(addRateLimitToBody({ url: checkoutUrl }, rateLimitResult)),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) } }
        );
      }

      // Anonymous purchase actions (no account required - pay first)
      case 'purchaseCreditsAnonymous': {
        if (!creditPackage || !successUrl || !cancelUrl) {
          return new Response(
            JSON.stringify(addRateLimitToBody({ error: 'Missing required parameters' }, rateLimitResult)),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) } }
          );
        }
        const { url: anonCreditUrl } = await createAnonymousCreditCheckout(
          creditPackage as keyof typeof CREDIT_PACKAGES,
          successUrl,
          cancelUrl
        );
        return new Response(
          JSON.stringify(addRateLimitToBody({ url: anonCreditUrl }, rateLimitResult)),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) } }
        );
      }

      case 'subscribeAnonymous': {
        if (!plan || !successUrl || !cancelUrl) {
          return new Response(
            JSON.stringify(addRateLimitToBody({ error: 'Missing required parameters' }, rateLimitResult)),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) } }
          );
        }
        const { url: anonSubUrl } = await createAnonymousSubscriptionCheckout(
          plan as keyof typeof PLANS,
          successUrl,
          cancelUrl
        );
        return new Response(
          JSON.stringify(addRateLimitToBody({ url: anonSubUrl }, rateLimitResult)),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) } }
        );
      }

      case 'getStatusByEmail': {
        const { email } = body;
        if (!email) {
          return new Response(
            JSON.stringify(addRateLimitToBody({ error: 'email required' }, rateLimitResult)),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) } }
          );
        }
        const emailStatus = await getSubscriptionByEmail(email);
        return new Response(
          JSON.stringify(addRateLimitToBody({ status: emailStatus }, rateLimitResult)),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) } }
        );
      }

      case 'claimCredits': {
        const { email } = body;
        if (!userId || !email) {
          return new Response(
            JSON.stringify(addRateLimitToBody({ error: 'userId and email required' }, rateLimitResult)),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) } }
          );
        }
        const claimResult = await claimCreditsByEmail(userId, email);
        return new Response(
          JSON.stringify(addRateLimitToBody(claimResult, rateLimitResult)),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) } }
        );
      }

      case 'getPlans': {
        return new Response(
          JSON.stringify(addRateLimitToBody({
            subscriptions: Object.entries(PLANS).map(([key, plan]) => ({
              id: key,
              name: plan.name,
              price: plan.price,
              questions: plan.questions,
              hasSonarPro: plan.hasSonarPro,
            })),
            credits: Object.entries(CREDIT_PACKAGES).map(([key, pkg]) => ({
              id: key,
              name: pkg.name,
              price: pkg.price,
              credits: pkg.credits,
            })),
          }, rateLimitResult)),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) } }
        );
      }

      case 'debug': {
        // Return configuration status (no secrets exposed)
        const configStatus = {
          supabase: !!SUPABASE_URL && !!SUPABASE_SERVICE_ROLE_KEY,
          stripe: !!stripe,
          stripeWebhook: !!STRIPE_WEBHOOK_SECRET,
          explorerPriceId: !!PLANS.explorer.priceId,
          pioneerPriceId: !!PLANS.pioneer.priceId,
          brokerPriceId: !!PLANS.broker.priceId,
        };

        // Test database connection
        let dbStatus = 'unknown';
        try {
          const { error } = await supabase.from('ai_subscriptions').select('count').limit(1);
          dbStatus = error ? `error: ${error.message}` : 'connected';
        } catch (e) {
          dbStatus = `error: ${e.message}`;
        }

        return new Response(
          JSON.stringify(addRateLimitToBody({
            config: configStatus,
            database: dbStatus,
            timestamp: new Date().toISOString(),
          }, rateLimitResult)),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) } }
        );
      }

      default:
        return new Response(
          JSON.stringify(addRateLimitToBody({ error: 'Unknown action' }, rateLimitResult)),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json', ...rateLimitHeaders(rateLimitResult) } }
        );
    }
  } catch (error) {
    // Detailed error logging
    console.error('[ai-subscription] Error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      ...(error.raw && { raw: error.raw }), // Stripe errors have raw property
      ...(error.code && { code: error.code }), // Stripe error codes
      ...(error.type && { stripeType: error.type }), // Stripe error types
    });

    // Determine appropriate status code
    let status = 500;
    let errorMessage = error.message || 'Internal server error';

    // Stripe-specific error handling
    if (error.type === 'StripeInvalidRequestError') {
      status = 400;
    } else if (error.type === 'StripeAuthenticationError') {
      status = 401;
      errorMessage = 'Stripe authentication failed. Check STRIPE_SECRET_KEY.';
    } else if (error.type === 'StripeRateLimitError') {
      status = 429;
    } else if (error.message?.includes('not configured')) {
      status = 503;
    }

    return new Response(
      JSON.stringify({
        error: errorMessage,
        type: error.name || 'UnknownError',
        ...(error.code && { code: error.code }),
      }),
      { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
