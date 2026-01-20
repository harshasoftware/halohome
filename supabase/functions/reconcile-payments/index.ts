/**
 * Reconcile Payments Edge Function
 * Links anonymous purchases made with email to user account after signup
 */

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? Deno.env.get('SB_PUBLISHABLE_KEY');

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization') ?? req.headers.get('Authorization');
  if (!authHeader) return null;
  const [bearer, token] = authHeader.split(' ');
  if (bearer !== 'Bearer' || !token) return null;
  return token;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const token = getBearerToken(req);
    if (!token) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify token per Supabase docs using getClaims() (JWT Signing Keys compatible).
    const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_ANON_KEY ?? SUPABASE_SERVICE_ROLE_KEY);
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    const claims = claimsData?.claims as Record<string, unknown> | undefined;
    const userId = (claims?.sub as string | undefined) ?? null;
    const userEmail = (claims?.email as string | undefined) ?? null;
    const isAnonymous = (claims?.is_anonymous as boolean | undefined) ?? false;

    if (claimsError || !userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Only reconcile for real accounts (anon sessions generally have no email).
    if (isAnonymous || !userEmail) {
      return new Response(
        JSON.stringify({ reconciled: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create admin client for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    let totalReconciled = 0;

    // 1. Reconcile AI subscriptions made with email
    const { data: aiSubs, error: aiSubsError } = await supabase
      .from('ai_subscriptions')
      .update({ user_id: userId })
      .eq('email', userEmail)
      .is('user_id', null)
      .select('id');

    if (!aiSubsError && aiSubs) {
      totalReconciled += aiSubs.length;
    }

    // 2. Reconcile AI credit purchases made with email
    const { data: creditPurchases, error: creditsError } = await supabase
      .from('ai_credit_purchases')
      .update({ user_id: userId })
      .eq('email', userEmail)
      .is('user_id', null)
      .select('id');

    if (!creditsError && creditPurchases) {
      totalReconciled += creditPurchases.length;
    }

    // Note: project_purchases table was removed - family tree purchases
    // are now handled through the orders table

    return new Response(
      JSON.stringify({ reconciled: totalReconciled }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in reconcile-payments:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
