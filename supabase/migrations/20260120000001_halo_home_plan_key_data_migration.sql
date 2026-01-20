-- Halo Home plan keys: data + function updates
-- Date: 2026-01-20
--
-- This migration MUST run after:
--   20260120000000_halo_home_plan_keys.sql
-- because it references newly-added enum values.

-- 1) Migrate legacy keys to new keys (no-op if rows don't exist)
-- NOTE: We leave 'starter'/'pro' untouched (may be used by older deployments).
UPDATE public.ai_subscriptions
SET plan_type = 'explorer'
WHERE plan_type = 'seeker';

UPDATE public.ai_subscriptions
SET plan_type = 'broker'
WHERE plan_type = 'sage';

-- 2) Update monthly reset function to include all subscription plans (exclude credits)
CREATE OR REPLACE FUNCTION public.reset_monthly_ai_usage()
RETURNS void
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.ai_subscriptions
  SET
    questions_used = 0,
    updated_at = NOW()
  WHERE plan_type IN ('free', 'starter', 'pro', 'seeker', 'pioneer', 'sage', 'explorer', 'broker')
    AND (current_period_end IS NULL OR current_period_end < NOW());
END;
$$;

