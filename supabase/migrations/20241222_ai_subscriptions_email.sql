-- Add email column for anonymous purchases (pay first, account later)
-- Migration: 20241222_ai_subscriptions_email

-- Add email column to ai_subscriptions
ALTER TABLE ai_subscriptions
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add index for email lookups
CREATE INDEX IF NOT EXISTS idx_ai_subscriptions_email ON ai_subscriptions(email);

-- Update the constraint to allow email-only records
ALTER TABLE ai_subscriptions
DROP CONSTRAINT IF EXISTS user_or_anonymous;

ALTER TABLE ai_subscriptions
ADD CONSTRAINT user_or_anonymous_or_email
CHECK (user_id IS NOT NULL OR anonymous_id IS NOT NULL OR email IS NOT NULL);

-- Add email column to ai_credit_purchases for tracking anonymous purchases
ALTER TABLE ai_credit_purchases
ADD COLUMN IF NOT EXISTS email TEXT;

-- Index for email lookups in purchases
CREATE INDEX IF NOT EXISTS idx_ai_credit_purchases_email ON ai_credit_purchases(email);

-- Function to claim credits when user signs up with an email
CREATE OR REPLACE FUNCTION claim_ai_credits_by_email(
  p_user_id UUID,
  p_email TEXT
)
RETURNS TABLE (
  claimed BOOLEAN,
  credits_claimed INTEGER,
  message TEXT
) AS $$
DECLARE
  v_unclaimed ai_subscriptions%ROWTYPE;
  v_existing ai_subscriptions%ROWTYPE;
  v_credits INTEGER := 0;
BEGIN
  -- Find unclaimed credits for this email
  SELECT * INTO v_unclaimed
  FROM ai_subscriptions
  WHERE email = LOWER(p_email)
    AND user_id IS NULL
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN QUERY SELECT false, 0, 'No unclaimed credits found for this email'::TEXT;
    RETURN;
  END IF;

  v_credits := COALESCE(v_unclaimed.credits_balance, 0);

  -- Check if user already has a subscription
  SELECT * INTO v_existing
  FROM ai_subscriptions
  WHERE user_id = p_user_id
  LIMIT 1;

  IF FOUND THEN
    -- Merge credits into existing subscription
    UPDATE ai_subscriptions
    SET credits_balance = COALESCE(credits_balance, 0) + v_credits,
        updated_at = NOW()
    WHERE id = v_existing.id;

    -- Update purchase records
    UPDATE ai_credit_purchases
    SET user_id = p_user_id
    WHERE subscription_id = v_unclaimed.id;

    -- Delete the unclaimed subscription
    DELETE FROM ai_subscriptions WHERE id = v_unclaimed.id;

    RETURN QUERY SELECT true, v_credits, 'Credits merged into your existing account'::TEXT;
  ELSE
    -- Transfer the subscription to this user
    UPDATE ai_subscriptions
    SET user_id = p_user_id,
        updated_at = NOW()
    WHERE id = v_unclaimed.id;

    -- Update purchase records
    UPDATE ai_credit_purchases
    SET user_id = p_user_id
    WHERE subscription_id = v_unclaimed.id;

    RETURN QUERY SELECT true, v_credits, 'Credits claimed successfully'::TEXT;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
