-- AI Subscriptions and Usage Tracking
-- Migration: 20241221_ai_subscriptions

-- AI Subscription Plans enum
CREATE TYPE ai_plan_type AS ENUM ('free', 'starter', 'pro', 'credits');

-- AI Subscriptions table
CREATE TABLE IF NOT EXISTS ai_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  -- For anonymous users, track by browser fingerprint/session
  anonymous_id TEXT,

  plan_type ai_plan_type NOT NULL DEFAULT 'free',

  -- For subscription plans (starter, pro)
  stripe_subscription_id TEXT,
  stripe_customer_id TEXT,
  subscription_status TEXT DEFAULT 'active', -- active, canceled, past_due
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,

  -- Usage limits
  questions_limit INTEGER NOT NULL DEFAULT 5, -- Monthly limit
  questions_used INTEGER NOT NULL DEFAULT 0,

  -- Credits system (for pay-per-question)
  credits_balance INTEGER NOT NULL DEFAULT 0, -- Remaining credits

  -- Model access
  has_sonar_pro_access BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure either user_id or anonymous_id is set
  CONSTRAINT user_or_anonymous CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL)
);

-- Index for fast lookups
CREATE INDEX idx_ai_subscriptions_user ON ai_subscriptions(user_id);
CREATE INDEX idx_ai_subscriptions_anonymous ON ai_subscriptions(anonymous_id);
CREATE INDEX idx_ai_subscriptions_stripe ON ai_subscriptions(stripe_subscription_id);

-- AI Usage Log table (for analytics and billing)
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES ai_subscriptions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  anonymous_id TEXT,

  -- Request details
  model TEXT NOT NULL, -- 'sonar' or 'sonar-pro'
  input_tokens INTEGER,
  output_tokens INTEGER,

  -- Cost tracking (in microdollars for precision)
  cost_microdollars INTEGER, -- $0.006 = 6000 microdollars

  -- Context
  question_preview TEXT, -- First 100 chars of question
  has_birth_data BOOLEAN DEFAULT false,
  has_location_context BOOLEAN DEFAULT false,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for analytics queries
CREATE INDEX idx_ai_usage_log_subscription ON ai_usage_log(subscription_id);
CREATE INDEX idx_ai_usage_log_created ON ai_usage_log(created_at);
CREATE INDEX idx_ai_usage_log_model ON ai_usage_log(model);

-- AI Credit Purchases table
CREATE TABLE IF NOT EXISTS ai_credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID REFERENCES ai_subscriptions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Stripe payment
  stripe_payment_intent_id TEXT UNIQUE,
  stripe_checkout_session_id TEXT,

  -- Purchase details
  credits_purchased INTEGER NOT NULL,
  amount_cents INTEGER NOT NULL, -- Amount paid in cents
  currency TEXT DEFAULT 'usd',

  -- Status
  status TEXT DEFAULT 'pending', -- pending, completed, failed, refunded

  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Function to reset monthly usage (called by cron)
CREATE OR REPLACE FUNCTION reset_monthly_ai_usage()
RETURNS void AS $$
BEGIN
  UPDATE ai_subscriptions
  SET
    questions_used = 0,
    updated_at = NOW()
  WHERE plan_type IN ('free', 'starter', 'pro')
    AND (current_period_end IS NULL OR current_period_end < NOW());
END;
$$ LANGUAGE plpgsql;

-- Function to check if user can ask a question
CREATE OR REPLACE FUNCTION can_ask_ai_question(p_subscription_id UUID)
RETURNS TABLE (
  allowed BOOLEAN,
  reason TEXT,
  model TEXT,
  remaining INTEGER
) AS $$
DECLARE
  v_sub ai_subscriptions%ROWTYPE;
BEGIN
  SELECT * INTO v_sub FROM ai_subscriptions WHERE id = p_subscription_id;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 'Subscription not found'::TEXT, 'sonar'::TEXT, 0;
    RETURN;
  END IF;

  -- Check subscription status
  IF v_sub.subscription_status = 'past_due' THEN
    RETURN QUERY SELECT false, 'Payment past due'::TEXT, 'sonar'::TEXT, 0;
    RETURN;
  END IF;

  IF v_sub.subscription_status = 'canceled' THEN
    RETURN QUERY SELECT false, 'Subscription canceled'::TEXT, 'sonar'::TEXT, 0;
    RETURN;
  END IF;

  -- For credit-based plans
  IF v_sub.plan_type = 'credits' THEN
    IF v_sub.credits_balance > 0 THEN
      RETURN QUERY SELECT
        true,
        'OK'::TEXT,
        CASE WHEN v_sub.has_sonar_pro_access THEN 'sonar-pro'::TEXT ELSE 'sonar'::TEXT END,
        v_sub.credits_balance;
      RETURN;
    ELSE
      RETURN QUERY SELECT false, 'No credits remaining'::TEXT, 'sonar'::TEXT, 0;
      RETURN;
    END IF;
  END IF;

  -- For subscription plans (free, starter, pro)
  IF v_sub.questions_used >= v_sub.questions_limit THEN
    RETURN QUERY SELECT false, 'Monthly limit reached'::TEXT, 'sonar'::TEXT, 0;
    RETURN;
  END IF;

  RETURN QUERY SELECT
    true,
    'OK'::TEXT,
    CASE WHEN v_sub.has_sonar_pro_access THEN 'sonar-pro'::TEXT ELSE 'sonar'::TEXT END,
    v_sub.questions_limit - v_sub.questions_used;
END;
$$ LANGUAGE plpgsql;

-- Function to consume a question credit
CREATE OR REPLACE FUNCTION consume_ai_question(
  p_subscription_id UUID,
  p_model TEXT DEFAULT 'sonar',
  p_input_tokens INTEGER DEFAULT 0,
  p_output_tokens INTEGER DEFAULT 0
)
RETURNS BOOLEAN AS $$
DECLARE
  v_sub ai_subscriptions%ROWTYPE;
  v_cost INTEGER; -- microdollars
BEGIN
  SELECT * INTO v_sub FROM ai_subscriptions WHERE id = p_subscription_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN false;
  END IF;

  -- Calculate cost in microdollars
  IF p_model = 'sonar-pro' THEN
    -- $3/1M input + $15/1M output + $6/1K requests
    v_cost := (p_input_tokens * 3 / 1000) + (p_output_tokens * 15 / 1000) + 6000;
  ELSE
    -- $1/1M input + $1/1M output + $5/1K requests
    v_cost := (p_input_tokens * 1 / 1000) + (p_output_tokens * 1 / 1000) + 5000;
  END IF;

  -- Log usage
  INSERT INTO ai_usage_log (
    subscription_id, user_id, anonymous_id, model,
    input_tokens, output_tokens, cost_microdollars
  ) VALUES (
    p_subscription_id, v_sub.user_id, v_sub.anonymous_id, p_model,
    p_input_tokens, p_output_tokens, v_cost
  );

  -- Update subscription
  IF v_sub.plan_type = 'credits' THEN
    UPDATE ai_subscriptions
    SET
      credits_balance = credits_balance - 1,
      updated_at = NOW()
    WHERE id = p_subscription_id;
  ELSE
    UPDATE ai_subscriptions
    SET
      questions_used = questions_used + 1,
      updated_at = NOW()
    WHERE id = p_subscription_id;
  END IF;

  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_ai_subscription_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ai_subscriptions_updated
  BEFORE UPDATE ON ai_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_ai_subscription_timestamp();

-- RLS Policies
ALTER TABLE ai_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_credit_purchases ENABLE ROW LEVEL SECURITY;

-- Users can view their own subscriptions
CREATE POLICY "Users can view own ai_subscriptions"
  ON ai_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own usage
CREATE POLICY "Users can view own ai_usage"
  ON ai_usage_log FOR SELECT
  USING (auth.uid() = user_id);

-- Users can view their own purchases
CREATE POLICY "Users can view own ai_purchases"
  ON ai_credit_purchases FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (for edge functions)
CREATE POLICY "Service role full access ai_subscriptions"
  ON ai_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access ai_usage"
  ON ai_usage_log FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access ai_purchases"
  ON ai_credit_purchases FOR ALL
  USING (auth.role() = 'service_role');
