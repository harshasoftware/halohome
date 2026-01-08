import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
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

    // Get the purchase record
    const { data: purchase, error: purchaseError } = await supabaseClient
      .from('astro_report_purchases')
      .select('id, birth_hash, tier, stripe_session_id, status')
      .eq('id', purchaseId)
      .single();

    if (purchaseError || !purchase) {
      throw new Error("Purchase not found.");
    }

    // If already paid, return success with the tier
    if (purchase.status === 'paid') {
      return new Response(JSON.stringify({
        success: true,
        message: "Payment already verified.",
        tier: purchase.tier,
        birthHash: purchase.birth_hash,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    } else {
      return new Response(JSON.stringify({
        success: false,
        message: "Payment not completed.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
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
