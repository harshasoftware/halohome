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

// Stricter rate limit config for failed verification attempts
// This helps detect enumeration attacks where attackers try random purchase IDs
const FAILED_VERIFICATION_LIMIT = {
  maxRequests: 3,
  windowSeconds: 60,
};

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

    const { purchaseId } = await req.json();
    if (!purchaseId) throw new Error("Purchase ID is required");

    // ==========================================================================
    // RATE LIMITING CHECK - Must happen BEFORE any database query
    // Uses client IP for tracking to prevent enumeration attacks
    // ==========================================================================
    const clientIp = getClientIp(req);
    const rateLimitIdentifier = buildIdentifier(null, clientIp);
    const userTier = getUserTier(null); // Uses IP-based limits
    const rateLimitConfig = getRateLimitConfig(RATE_LIMIT_ENDPOINTS.VERIFY_ASTRO_PAYMENT, userTier);

    const rateLimitResult = await checkRateLimit(
      supabaseClient,
      rateLimitIdentifier,
      RATE_LIMIT_ENDPOINTS.VERIFY_ASTRO_PAYMENT,
      rateLimitConfig
    );

    if (!rateLimitResult.allowed) {
      // Log suspicious activity - too many verification attempts from this IP
      console.warn(`[SECURITY] Rate limit exceeded for verify-astro-payment from IP: ${clientIp}. ` +
        `Current: ${rateLimitResult.current}, Limit: ${rateLimitResult.limit}`);
      return rateLimitResponse(rateLimitResult, corsHeaders);
    }

    // Also check the stricter "failed verification" rate limit
    // This tracks failed attempts separately to detect enumeration attacks
    const failedVerifyIdentifier = `${rateLimitIdentifier}:failed`;
    const failedRateLimitResult = await checkRateLimit(
      supabaseClient,
      failedVerifyIdentifier,
      `${RATE_LIMIT_ENDPOINTS.VERIFY_ASTRO_PAYMENT}-failed`,
      FAILED_VERIFICATION_LIMIT
    );

    if (!failedRateLimitResult.allowed) {
      // This IP has had too many failed verification attempts
      console.warn(`[SECURITY] Too many failed verification attempts from IP: ${clientIp}. ` +
        `Possible enumeration attack detected. Failed attempts: ${failedRateLimitResult.current}`);
      return rateLimitResponse(failedRateLimitResult, corsHeaders);
    }
    // ==========================================================================

    // Get the purchase record
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('astro_report_purchases')
      .select('id, birth_hash, tier, stripe_session_id, status')
      .eq('id', purchaseId)
      .single();

    if (purchaseError || !purchase) {
      // Log failed lookup attempt - potential enumeration attack
      console.warn(`[SECURITY] Purchase not found - ID: ${purchaseId}, IP: ${clientIp}. ` +
        `Failed attempts from this IP: ${failedRateLimitResult.current + 1}`);

      // Increment the failed verification counter for this IP
      // This is done automatically by the check above, but we want to ensure
      // the counter reflects this failed attempt for future requests
      await checkRateLimit(
        supabaseClient,
        failedVerifyIdentifier,
        `${RATE_LIMIT_ENDPOINTS.VERIFY_ASTRO_PAYMENT}-failed`,
        FAILED_VERIFICATION_LIMIT
      );

      throw new Error("Purchase not found.");
    }

    // If already paid, return success with the tier
    if (purchase.status === 'paid') {
      return new Response(JSON.stringify({
        success: true,
        message: "Payment already verified.",
        tier: purchase.tier,
        birthHash: purchase.birth_hash,
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
    }

    if (!purchase.stripe_session_id) {
      throw new Error("No Stripe session found for this purchase.");
    }

    // Verify with Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const session = await stripe.checkout.sessions.retrieve(purchase.stripe_session_id);

    if (session.payment_status === 'paid') {
      const customerEmail = session.customer_details?.email;

      // Update purchase status to paid
      await supabaseClient
        .from('astro_report_purchases')
        .update({
          status: 'paid',
          email: customerEmail || null,
          paid_at: new Date().toISOString(),
        })
        .eq('id', purchase.id);

      return new Response(JSON.stringify({
        success: true,
        message: "Payment successful!",
        tier: purchase.tier,
        birthHash: purchase.birth_hash,
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
    } else {
      // Payment not completed - log this as it could indicate issues
      console.warn(`[INFO] Payment not completed for purchase ID: ${purchase.id}, ` +
        `Stripe status: ${session.payment_status}, IP: ${clientIp}`);

      return new Response(JSON.stringify({
        success: false,
        message: "Payment not completed.",
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
        status: 400,
      });
    }
  } catch (error) {
    console.error("Error in verify-astro-payment:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
