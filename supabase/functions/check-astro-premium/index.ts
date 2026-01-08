import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
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

    const { birthHash } = await req.json();

    if (!birthHash) {
      throw new Error("Birth hash is required");
    }

    // Get the highest tier paid purchase for this birth hash
    const { data: purchases, error } = await supabaseClient
      .from('astro_report_purchases')
      .select('tier, paid_at')
      .eq('birth_hash', birthHash)
      .eq('status', 'paid')
      .order('tier', { ascending: false })
      .limit(1);

    if (error) {
      console.error("Error checking premium status:", error);
      throw error;
    }

    if (purchases && purchases.length > 0) {
      return new Response(JSON.stringify({
        hasPremium: true,
        tier: purchases[0].tier,
        paidAt: purchases[0].paid_at,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({
      hasPremium: false,
      tier: 3, // Free tier
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in check-astro-premium:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
