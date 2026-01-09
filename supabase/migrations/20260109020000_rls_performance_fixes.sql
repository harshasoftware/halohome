-- Performance Migration: Fix RLS policy performance issues
-- Date: 2026-01-09
--
-- Fixes:
-- 1. auth_rls_initplan: Wrap auth.uid() and auth.role() in (select ...) for single evaluation
-- 2. multiple_permissive_policies: Remove redundant "Service role full access" policies
--    (service_role bypasses RLS by default, these policies are unnecessary)
-- 3. duplicate_index: Remove duplicate index on share_links.short_code

-- ============================================================================
-- PART 1: Remove redundant "Service role full access" policies
-- service_role already bypasses RLS, these policies add overhead
-- ============================================================================

DROP POLICY IF EXISTS "Service role full access ai_subscriptions" ON public.ai_subscriptions;
DROP POLICY IF EXISTS "Service role full access ai_usage" ON public.ai_usage_log;
DROP POLICY IF EXISTS "Service role full access ai_purchases" ON public.ai_credit_purchases;
DROP POLICY IF EXISTS "Service role has full access to favorite cities" ON public.favorite_cities;

-- ============================================================================
-- PART 2: Fix ai_subscriptions policies with (select auth.uid())
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own ai_subscriptions" ON public.ai_subscriptions;
CREATE POLICY "Users can view own ai_subscriptions"
  ON public.ai_subscriptions
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- PART 3: Fix ai_usage_log policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own ai_usage" ON public.ai_usage_log;
CREATE POLICY "Users can view own ai_usage"
  ON public.ai_usage_log
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- PART 4: Fix ai_credit_purchases policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own ai_purchases" ON public.ai_credit_purchases;
CREATE POLICY "Users can view own ai_purchases"
  ON public.ai_credit_purchases
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- PART 5: Fix birth_charts policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own birth charts" ON public.birth_charts;
CREATE POLICY "Users can view own birth charts"
  ON public.birth_charts
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own birth charts" ON public.birth_charts;
CREATE POLICY "Users can create own birth charts"
  ON public.birth_charts
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own birth charts" ON public.birth_charts;
CREATE POLICY "Users can update own birth charts"
  ON public.birth_charts
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own birth charts" ON public.birth_charts;
CREATE POLICY "Users can delete own birth charts"
  ON public.birth_charts
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- PART 6: Fix chat_conversations policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own conversations" ON public.chat_conversations;
CREATE POLICY "Users can view own conversations"
  ON public.chat_conversations
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can create own conversations" ON public.chat_conversations;
CREATE POLICY "Users can create own conversations"
  ON public.chat_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.chat_conversations;
CREATE POLICY "Users can update own conversations"
  ON public.chat_conversations
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own conversations" ON public.chat_conversations;
CREATE POLICY "Users can delete own conversations"
  ON public.chat_conversations
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- PART 7: Fix chat_messages policies
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
      AND chat_conversations.user_id = (select auth.uid())
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
      AND chat_conversations.user_id = (select auth.uid())
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
      AND chat_conversations.user_id = (select auth.uid())
    )
  );

-- ============================================================================
-- PART 8: Fix favorite_cities policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own favorite cities" ON public.favorite_cities;
CREATE POLICY "Users can view their own favorite cities"
  ON public.favorite_cities
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can insert their own favorite cities" ON public.favorite_cities;
CREATE POLICY "Users can insert their own favorite cities"
  ON public.favorite_cities
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own favorite cities" ON public.favorite_cities;
CREATE POLICY "Users can update their own favorite cities"
  ON public.favorite_cities
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete their own favorite cities" ON public.favorite_cities;
CREATE POLICY "Users can delete their own favorite cities"
  ON public.favorite_cities
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- PART 9: Fix user_profiles policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
CREATE POLICY "Users can view own profile"
  ON public.user_profiles
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
CREATE POLICY "Users can update own profile"
  ON public.user_profiles
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
CREATE POLICY "Users can insert own profile"
  ON public.user_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK ((select auth.uid()) = id);

-- ============================================================================
-- PART 10: Fix share_links policies
-- ============================================================================

DROP POLICY IF EXISTS "Users can update own share links" ON public.share_links;
CREATE POLICY "Users can update own share links"
  ON public.share_links
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can delete own share links" ON public.share_links;
CREATE POLICY "Users can delete own share links"
  ON public.share_links
  FOR DELETE
  TO authenticated
  USING ((select auth.uid()) = user_id);

-- ============================================================================
-- PART 11: Remove duplicate index on share_links
-- The UNIQUE constraint on short_code already creates an index (share_links_short_code_key)
-- ============================================================================

DROP INDEX IF EXISTS idx_share_links_short_code;

-- ============================================================================
-- Documentation
-- ============================================================================

COMMENT ON TABLE public.ai_subscriptions IS 'AI subscription data. Service role bypasses RLS automatically.';
COMMENT ON TABLE public.ai_usage_log IS 'AI usage logging. Service role bypasses RLS automatically.';
COMMENT ON TABLE public.ai_credit_purchases IS 'AI credit purchases. Service role bypasses RLS automatically.';
COMMENT ON TABLE public.favorite_cities IS 'User favorite cities. Service role bypasses RLS automatically.';
