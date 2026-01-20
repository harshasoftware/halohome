-- Stripe Sync Engine bridge for Halo Home AI subscriptions
-- Date: 2026-01-20
--
-- Goal:
-- - Use Stripe Sync Engine as source of truth for subscription status/period
-- - Keep existing app contract: public.ai_subscriptions remains the table the app reads
-- - Provide reconcile functions to repair drift / backfill
--
-- Notes:
-- - Stripe Sync Engine typically writes Stripe objects into the `stripe` schema.
-- - We intentionally read from `stripe.subscriptions` and parse `attrs` JSON to
--   avoid depending on optional auxiliary tables.
-- - This migration is safe to apply before Stripe Sync exists: reconcile becomes a no-op
--   until `stripe.subscriptions` is present.

-- ============================================================================
-- 1) Price → plan mapping (source of truth for plan_type/questions_limit)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.stripe_price_plan_map (
  price_id TEXT PRIMARY KEY,
  plan_type public.ai_plan_type NOT NULL,
  questions_limit INTEGER NOT NULL,
  has_sonar_pro_access BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION public.update_stripe_price_plan_map_timestamp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS stripe_price_plan_map_updated ON public.stripe_price_plan_map;
CREATE TRIGGER stripe_price_plan_map_updated
  BEFORE UPDATE ON public.stripe_price_plan_map
  FOR EACH ROW
  EXECUTE FUNCTION public.update_stripe_price_plan_map_timestamp();

-- Seed mapping with current Halo Home monthly prices (not secrets).
-- If you change prices later, update this table instead of code.
INSERT INTO public.stripe_price_plan_map (price_id, plan_type, questions_limit, has_sonar_pro_access)
VALUES
  ('price_1SraztCZ5pZyvwXIA7fWoIMm', 'explorer', 10, false),
  ('price_1SraztCZ5pZyvwXI2DyYF3Lk', 'pioneer', 25, false),
  ('price_1SraztCZ5pZyvwXIE27Qm0ZD', 'broker', 60, true)
ON CONFLICT (price_id) DO UPDATE
SET
  plan_type = EXCLUDED.plan_type,
  questions_limit = EXCLUDED.questions_limit,
  has_sonar_pro_access = EXCLUDED.has_sonar_pro_access,
  updated_at = NOW();

-- ============================================================================
-- 2) Helpers: parse subscription attrs → status + primary price id
-- ============================================================================

CREATE OR REPLACE FUNCTION public._stripe_subscription_status_from_attrs(p_attrs JSONB)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT NULLIF(TRIM(p_attrs->>'status'), '');
$$;

CREATE OR REPLACE FUNCTION public._stripe_subscription_primary_price_id_from_attrs(p_attrs JSONB)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  -- Stripe subscription object contains items.data[].price.id
  SELECT NULLIF(TRIM(
    (p_attrs #>> '{items,data,0,price,id}')
  ), '');
$$;

-- ============================================================================
-- 3) Reconcile a single subscription row (Stripe → ai_subscriptions)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reconcile_ai_subscription_from_stripe(p_stripe_subscription_id TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_has_stripe_subscriptions BOOLEAN;
  v_has_period_start BOOLEAN;
  v_has_period_end BOOLEAN;
  v_has_customer BOOLEAN;
  v_has_attrs BOOLEAN;
  v_has_status_column BOOLEAN;

  v_sql TEXT;

  v_customer_id TEXT;
  v_period_start TIMESTAMPTZ;
  v_period_end TIMESTAMPTZ;
  v_attrs JSONB;
  v_status TEXT;
  v_price_id TEXT;

  v_mapped_plan public.ai_plan_type;
  v_questions_limit INTEGER;
  v_has_sonar_pro BOOLEAN;
  v_subscription_status TEXT;
BEGIN
  IF p_stripe_subscription_id IS NULL OR LENGTH(TRIM(p_stripe_subscription_id)) = 0 THEN
    RETURN;
  END IF;

  -- Check whether Stripe Sync tables exist yet.
  SELECT EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'stripe'
      AND c.relname = 'subscriptions'
      AND c.relkind IN ('r', 'p', 'v', 'm', 'f')
  ) INTO v_has_stripe_subscriptions;

  IF NOT v_has_stripe_subscriptions THEN
    -- Stripe Sync not enabled yet; nothing to reconcile.
    RETURN;
  END IF;

  -- Column presence varies across integrations/versions; build a compatible query.
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stripe' AND table_name = 'subscriptions' AND column_name = 'current_period_start'
  ) INTO v_has_period_start;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stripe' AND table_name = 'subscriptions' AND column_name = 'current_period_end'
  ) INTO v_has_period_end;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stripe' AND table_name = 'subscriptions' AND column_name = 'customer'
  ) INTO v_has_customer;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stripe' AND table_name = 'subscriptions' AND column_name = 'attrs'
  ) INTO v_has_attrs;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'stripe' AND table_name = 'subscriptions' AND column_name = 'status'
  ) INTO v_has_status_column;

  IF NOT v_has_attrs THEN
    -- We rely on attrs for plan mapping at minimum.
    RETURN;
  END IF;

  v_sql :=
    'SELECT ' ||
      CASE WHEN v_has_customer THEN 's.customer::text' ELSE 'NULL::text' END || ' AS customer_id, ' ||
      CASE WHEN v_has_period_start THEN 's.current_period_start::timestamptz' ELSE 'NULL::timestamptz' END || ' AS period_start, ' ||
      CASE WHEN v_has_period_end THEN 's.current_period_end::timestamptz' ELSE 'NULL::timestamptz' END || ' AS period_end, ' ||
      's.attrs::jsonb AS attrs, ' ||
      CASE WHEN v_has_status_column THEN 's.status::text' ELSE 'NULL::text' END || ' AS status ' ||
    'FROM stripe.subscriptions s WHERE s.id = $1';

  EXECUTE v_sql
    INTO v_customer_id, v_period_start, v_period_end, v_attrs, v_status
    USING p_stripe_subscription_id;

  IF v_attrs IS NULL THEN
    RETURN;
  END IF;

  -- Prefer explicit status column; fall back to attrs->>'status'
  v_status := COALESCE(NULLIF(TRIM(v_status), ''), public._stripe_subscription_status_from_attrs(v_attrs));

  -- Map status into our simpler app status values.
  v_subscription_status := CASE
    WHEN v_status IN ('active', 'trialing') THEN 'active'
    WHEN v_status IN ('past_due', 'incomplete', 'incomplete_expired', 'unpaid') THEN 'past_due'
    WHEN v_status IN ('canceled') THEN 'canceled'
    ELSE COALESCE(v_status, 'active')
  END;

  v_price_id := public._stripe_subscription_primary_price_id_from_attrs(v_attrs);

  SELECT m.plan_type, m.questions_limit, m.has_sonar_pro_access
  INTO v_mapped_plan, v_questions_limit, v_has_sonar_pro
  FROM public.stripe_price_plan_map m
  WHERE m.price_id = v_price_id;

  UPDATE public.ai_subscriptions a
  SET
    stripe_customer_id = COALESCE(a.stripe_customer_id, v_customer_id),
    subscription_status = v_subscription_status,
    current_period_start = COALESCE(v_period_start, a.current_period_start),
    current_period_end = COALESCE(v_period_end, a.current_period_end),
    plan_type = COALESCE(v_mapped_plan, a.plan_type),
    questions_limit = COALESCE(v_questions_limit, a.questions_limit),
    has_sonar_pro_access = COALESCE(v_has_sonar_pro, a.has_sonar_pro_access),
    updated_at = NOW()
  WHERE a.stripe_subscription_id = p_stripe_subscription_id;

END;
$$;

REVOKE EXECUTE ON FUNCTION public.reconcile_ai_subscription_from_stripe(TEXT) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reconcile_ai_subscription_from_stripe(TEXT) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reconcile_ai_subscription_from_stripe(TEXT) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_ai_subscription_from_stripe(TEXT) TO service_role;

-- ============================================================================
-- 4) Reconcile everything (useful for backfills / “repair drift”)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.reconcile_ai_subscriptions_from_stripe()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_count INTEGER := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT DISTINCT stripe_subscription_id
    FROM public.ai_subscriptions
    WHERE stripe_subscription_id IS NOT NULL
      AND LENGTH(TRIM(stripe_subscription_id)) > 0
  LOOP
    PERFORM public.reconcile_ai_subscription_from_stripe(r.stripe_subscription_id);
    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reconcile_ai_subscriptions_from_stripe() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.reconcile_ai_subscriptions_from_stripe() FROM anon;
REVOKE EXECUTE ON FUNCTION public.reconcile_ai_subscriptions_from_stripe() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_ai_subscriptions_from_stripe() TO service_role;

-- ============================================================================
-- 5) Optional: auto-reconcile on Stripe Sync writes (trigger if possible)
-- ============================================================================

CREATE OR REPLACE FUNCTION public._on_stripe_subscription_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.reconcile_ai_subscription_from_stripe(NEW.id::text);
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_catalog.pg_class c
    JOIN pg_catalog.pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'stripe'
      AND c.relname = 'subscriptions'
      AND c.relkind IN ('r', 'p')
  ) THEN
    -- Create trigger only if the table exists at migration time.
    EXECUTE 'DROP TRIGGER IF EXISTS trg_reconcile_ai_subscriptions_from_stripe ON stripe.subscriptions';
    EXECUTE 'CREATE TRIGGER trg_reconcile_ai_subscriptions_from_stripe
      AFTER INSERT OR UPDATE ON stripe.subscriptions
      FOR EACH ROW
      EXECUTE FUNCTION public._on_stripe_subscription_change()';
  END IF;
END;
$$;

