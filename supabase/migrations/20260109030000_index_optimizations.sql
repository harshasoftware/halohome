-- Index Optimization Migration
-- Date: 2026-01-09
--
-- Fixes:
-- 1. Add missing indexes on foreign key columns (prevents seq scans on FK validation)
-- 2. Remove redundant index (email column already has UNIQUE constraint)
-- 3. Document why we're keeping "unused" indexes
--
-- Note: "Unused" indexes may simply not have been exercised yet in production.
-- We're keeping indexes needed for: RLS policies, vector search, analytics, and webhooks.

-- ============================================================================
-- PART 1: Add missing indexes on foreign key columns
-- Without these indexes, CASCADE deletes and JOINs on FK columns require seq scans
-- ============================================================================

-- ai_credit_purchases.subscription_id - FK to ai_subscriptions
-- Used when: deleting subscriptions (cascade check), joining purchases to subscriptions
CREATE INDEX IF NOT EXISTS idx_ai_credit_purchases_subscription_id
  ON public.ai_credit_purchases(subscription_id);

-- ai_credit_purchases.user_id - FK to auth.users
-- Used when: RLS policy checks, user deletion cascade, user purchase history queries
CREATE INDEX IF NOT EXISTS idx_ai_credit_purchases_user_id
  ON public.ai_credit_purchases(user_id);

-- ai_usage_log.user_id - FK to auth.users
-- Used when: RLS policy checks, user deletion cascade, user usage analytics
CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_id
  ON public.ai_usage_log(user_id);

-- ============================================================================
-- PART 2: Remove redundant index
-- The UNIQUE constraint already creates an implicit unique index
-- ============================================================================

-- mobile_waitlist has: email TEXT NOT NULL UNIQUE
-- This UNIQUE constraint creates an implicit index: mobile_waitlist_email_key
-- The explicit idx_mobile_waitlist_email is redundant
DROP INDEX IF EXISTS idx_mobile_waitlist_email;

-- ============================================================================
-- PART 3: Document why we're keeping "unused" indexes
-- These indexes exist for legitimate purposes but may not show usage stats if:
-- - Features are new or not yet active in production
-- - Query patterns are infrequent (webhooks, cleanup jobs)
-- - Stats were reset after index creation
-- ============================================================================

-- idx_chat_messages_embedding (IVFFlat vector index)
-- Purpose: Semantic similarity search via search_chat_history() function
-- Uses: <=> operator for vector distance calculations
COMMENT ON INDEX idx_chat_messages_embedding IS
  'IVFFlat index for vector similarity search. Used by search_chat_history() function.';

-- idx_chat_messages_created_at
-- Purpose: Time-ordered message retrieval, pagination, analytics
COMMENT ON INDEX idx_chat_messages_created_at IS
  'Supports ORDER BY created_at queries for message history and pagination.';

-- idx_chat_conversations_topics (GIN index)
-- Purpose: Filter conversations by topic tags
COMMENT ON INDEX idx_chat_conversations_topics IS
  'GIN index for topic-based conversation filtering. Supports @> and && operators.';

-- idx_ai_subscriptions_stripe
-- Purpose: Stripe webhook lookups by subscription_id or customer_id
-- Critical for: Payment processing, subscription updates from Stripe
COMMENT ON INDEX idx_ai_subscriptions_stripe IS
  'Essential for Stripe webhook processing. Lookups by stripe_subscription_id.';

-- idx_ai_usage_log_created
-- Purpose: Analytics queries by time period
COMMENT ON INDEX idx_ai_usage_log_created IS
  'Supports time-based analytics queries and reporting dashboards.';

-- idx_ai_usage_log_model
-- Purpose: Analytics queries filtered by AI model type
COMMENT ON INDEX idx_ai_usage_log_model IS
  'Supports analytics grouping by model (sonar vs sonar-pro).';

-- idx_share_links_user_id
-- Purpose: RLS policy for UPDATE/DELETE operations
-- Note: The policy "Users can update/delete own share links" uses user_id
COMMENT ON INDEX idx_share_links_user_id IS
  'Required by RLS policies for UPDATE/DELETE operations on user share links.';

-- idx_share_links_expires_at (partial index)
-- Purpose: Efficient cleanup of expired share links
COMMENT ON INDEX idx_share_links_expires_at IS
  'Partial index for expired link cleanup jobs. Only indexes rows with expires_at set.';

-- idx_astro_purchases_birth_hash
-- Purpose: Check if user already purchased report for given birth data
COMMENT ON INDEX idx_astro_purchases_birth_hash IS
  'Lookup purchases by birth_hash to check existing purchases before checkout.';

-- idx_favorite_cities_location
-- Purpose: Geographic proximity queries (find cities near a point)
COMMENT ON INDEX idx_favorite_cities_location IS
  'Composite index for potential geographic proximity queries.';

-- idx_mobile_waitlist_created
-- Purpose: Chronological listing for admin dashboard
COMMENT ON INDEX idx_mobile_waitlist_created IS
  'Supports ORDER BY created_at for admin waitlist management.';

-- ============================================================================
-- PART 4: Note on Auth DB Connections setting
-- ============================================================================

-- The "auth_db_connections_absolute" lint suggests using percentage-based
-- connection allocation instead of absolute numbers. This is configured in
-- the Supabase Dashboard under:
--   Project Settings → Database → Connection Pooling
-- Not a schema migration - requires dashboard configuration.
