/**
 * Reconcile Payments Edge Function
 * Links anonymous purchases made with email to user account after signup
 */

import { corsHeaders } from '../_shared/cors.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to get their info
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid user token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userEmail = user.email;
    if (!userEmail) {
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
      .update({ user_id: user.id })
      .eq('email', userEmail)
      .is('user_id', null)
      .select('id');

    if (!aiSubsError && aiSubs) {
      totalReconciled += aiSubs.length;
    }

    // 2. Reconcile AI credit purchases made with email
    const { data: creditPurchases, error: creditsError } = await supabase
      .from('ai_credit_purchases')
      .update({ user_id: user.id })
      .eq('email', userEmail)
      .is('user_id', null)
      .select('id');

    if (!creditsError && creditPurchases) {
      totalReconciled += creditPurchases.length;
    }

    // 3. Check for family tree project purchases (if table exists)
    // This is a safe operation - if table doesn't exist, it will just fail silently
    try {
      const { data: projects } = await supabase
        .from('project_purchases')
        .update({ user_id: user.id })
        .eq('email', userEmail)
        .is('user_id', null)
        .select('id');

      if (projects) {
        totalReconciled += projects.length;
      }
    } catch {
      // Table might not exist, ignore
    }

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
