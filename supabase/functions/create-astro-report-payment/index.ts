import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import {
  checkRateLimit,
  getClientIp,
  buildIdentifier,
  getRateLimitConfig,
  getUserTier,
  rateLimitResponse,
  rateLimitHeaders,
  RATE_LIMIT_ENDPOINTS,
} from '../_shared/rate-limit.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Stripe price IDs for astro report tiers (from environment variables)
const ASTRO_REPORT_PRICES = {
  5: Deno.env.get("STRIPE_REPORT_TOP5_PRICE_ID"),  // Top 5 City List - $10
  10: Deno.env.get("STRIPE_REPORT_TOP10_PRICE_ID"), // Top 10 City List - $20
} as const;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();

    const { tier, birthHash, successUrl, cancelUrl } = body;

    // ==========================================================================
    // RATE LIMITING CHECK - Must happen BEFORE any expensive operations
    // Uses client IP for tracking since this endpoint doesn't require auth
    // ==========================================================================
    const clientIp = getClientIp(req);
    const rateLimitIdentifier = buildIdentifier(null, clientIp);
    const userTier = getUserTier(null); // Anonymous endpoint - uses IP-based limits
    const rateLimitConfig = getRateLimitConfig(RATE_LIMIT_ENDPOINTS.CREATE_ASTRO_REPORT_PAYMENT, userTier);

    const rateLimitResult = await checkRateLimit(
      supabaseClient,
      rateLimitIdentifier,
      RATE_LIMIT_ENDPOINTS.CREATE_ASTRO_REPORT_PAYMENT,
      rateLimitConfig
    );

    if (!rateLimitResult.allowed) {
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }
    // ==========================================================================

    // Validate tier
    if (tier !== 5 && tier !== 10) {
      throw new Error("Invalid tier. Must be 5 or 10.");
    }

    if (!birthHash) {
      throw new Error("Birth hash is required.");
    }

    const priceId = ASTRO_REPORT_PRICES[tier as 5 | 10];
    if (!priceId) {
      throw new Error(`Price ID not configured for tier ${tier}. Please set STRIPE_REPORT_TOP${tier}_PRICE_ID.`);
    }

    // Create a record to track this purchase
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('astro_report_purchases')
      .insert({
        birth_hash: birthHash,
        tier: tier,
        status: 'pending',
        price_id: priceId,
      })
      .select()
      .single();

    if (purchaseError) {
      console.error("Error creating purchase record:", purchaseError);
      throw purchaseError;
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Determine the base URL for redirects
    const baseUrl = successUrl?.split('?')[0]?.replace('/astro-payment-success', '') ||
                    'https://themodernfamily.app';

    const session = await stripe.checkout.sessions.create({
      customer_creation: 'always',
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      allow_promotion_codes: true,
      // Require email collection
      customer_email: undefined, // Don't pre-fill, let user enter
      billing_address_collection: 'auto',
      phone_number_collection: { enabled: false },
      success_url: `${baseUrl}/astro-payment-success?purchase_id=${purchase.id}`,
      cancel_url: cancelUrl || `${baseUrl}/`,
      client_reference_id: purchase.id,
      metadata: {
        purchase_id: purchase.id,
        tier: tier.toString(),
        birth_hash: birthHash,
        type: 'astro_report',
      },
    });

    // Update purchase with stripe session id
    await supabaseClient
      .from('astro_report_purchases')
      .update({ stripe_session_id: session.id })
      .eq('id', purchase.id);

    return new Response(JSON.stringify({
      url: session.url,
      purchaseId: purchase.id,
      rateLimit: {
        remaining: rateLimitResult.remaining,
        limit: rateLimitResult.limit,
        resetAt: rateLimitResult.resetAt.toISOString(),
      },
    }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
        ...rateLimitHeaders(rateLimitResult),
      },
      status: 200,
    });
  } catch (error) {
    console.error("Error in create-astro-report-payment:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
