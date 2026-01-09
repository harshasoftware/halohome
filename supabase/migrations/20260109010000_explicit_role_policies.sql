-- Security Migration: Explicitly restrict policies to authenticated role
-- Date: 2026-01-09
--
-- These policies already protect data via auth.uid() = user_id checks,
-- but adding explicit role restrictions silences Supabase security warnings
-- and makes the intent clearer.
--
-- Tables that NEED anonymous access are not modified:
-- - share_links (public sharing feature)
-- - astro_report_purchases (anonymous purchases)
-- - mobile_waitlist (landing page signups)

-- ============================================================================
-- ai_subscriptions - User's own subscription data
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own ai_subscriptions" ON public.ai_subscriptions;
CREATE POLICY "Users can view own ai_subscriptions"
  ON public.ai_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- ai_usage_log - User's own usage history
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own ai_usage" ON public.ai_usage_log;
CREATE POLICY "Users can view own ai_usage"
  ON public.ai_usage_log
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- ai_credit_purchases - User's own purchase history
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own ai_purchases" ON public.ai_credit_purchases;
CREATE POLICY "Users can view own ai_purchases"
  ON public.ai_credit_purchases
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- birth_charts - User's birth chart data
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own birth charts" ON public.birth_charts;
CREATE POLICY "Users can view own birth charts"
  ON public.birth_charts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own birth charts" ON public.birth_charts;
CREATE POLICY "Users can create own birth charts"
  ON public.birth_charts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own birth charts" ON public.birth_charts;
CREATE POLICY "Users can update own birth charts"
  ON public.birth_charts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own birth charts" ON public.birth_charts;
CREATE POLICY "Users can delete own birth charts"
  ON public.birth_charts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- chat_conversations - User's chat history
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own conversations" ON public.chat_conversations;
CREATE POLICY "Users can view own conversations"
  ON public.chat_conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own conversations" ON public.chat_conversations;
CREATE POLICY "Users can create own conversations"
  ON public.chat_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.chat_conversations;
CREATE POLICY "Users can update own conversations"
  ON public.chat_conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.chat_conversations;
CREATE POLICY "Users can delete own conversations"
  ON public.chat_conversations
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- chat_messages - Messages in user's conversations
-- ============================================================================
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.chat_messages;
CREATE POLICY "Users can view messages in own conversations"
  ON public.chat_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can create messages in own conversations" ON public.chat_messages;
CREATE POLICY "Users can create messages in own conversations"
  ON public.chat_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can delete messages in own conversations" ON public.chat_messages;
CREATE POLICY "Users can delete messages in own conversations"
  ON public.chat_messages
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE chat_conversations.id = chat_messages.conversation_id
      AND chat_conversations.user_id = auth.uid()
    )
  );

-- ============================================================================
-- favorite_cities - User's saved cities
-- ============================================================================
DROP POLICY IF EXISTS "Users can view their own favorite cities" ON public.favorite_cities;
CREATE POLICY "Users can view their own favorite cities"
  ON public.favorite_cities
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own favorite cities" ON public.favorite_cities;
CREATE POLICY "Users can insert their own favorite cities"
  ON public.favorite_cities
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own favorite cities" ON public.favorite_cities;
CREATE POLICY "Users can update their own favorite cities"
  ON public.favorite_cities
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own favorite cities" ON public.favorite_cities;
CREATE POLICY "Users can delete their own favorite cities"
  ON public.favorite_cities
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- user_profiles - User profile data
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- ============================================================================
-- share_links - Only restrict UPDATE/DELETE to authenticated
-- SELECT and INSERT intentionally allow anonymous access
-- ============================================================================
DROP POLICY IF EXISTS "Users can update own share links" ON public.share_links;
CREATE POLICY "Users can update own share links"
  ON public.share_links
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own share links" ON public.share_links;
CREATE POLICY "Users can delete own share links"
  ON public.share_links
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- ============================================================================
-- Documentation: Tables that intentionally allow anonymous access
-- ============================================================================

-- share_links: Public SELECT (sharing feature) and INSERT (anyone can create share links)
-- astro_report_purchases: Public INSERT/SELECT (anonymous purchases before checkout)
-- mobile_waitlist: Public INSERT (landing page email signups)

COMMENT ON POLICY "Share links are publicly readable" ON public.share_links IS 'Intentionally allows anonymous read access for the public sharing feature';
COMMENT ON POLICY "Anyone can create share links with valid data" ON public.share_links IS 'Intentionally allows anonymous creation - share links can be created without an account';
