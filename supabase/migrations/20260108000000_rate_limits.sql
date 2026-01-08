-- Rate Limits table for API endpoint rate limiting
-- Tracks request counts per identifier (IP or user_id) and endpoint
-- Used by edge functions to prevent abuse and control API costs

CREATE TABLE IF NOT EXISTS public.rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Identifier: IP address for anonymous, user_id for authenticated
  identifier TEXT NOT NULL,

  -- Endpoint being rate limited (e.g., 'astro-ai-chat', 'create-astro-report-payment')
  endpoint TEXT NOT NULL,

  -- Request tracking
  request_count INTEGER NOT NULL DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Metadata
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Composite unique index for efficient upsert operations
-- Each identifier+endpoint combination should have only one active record
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_limits_identifier_endpoint
  ON public.rate_limits(identifier, endpoint);

-- Index on window_start for efficient cleanup of old records
CREATE INDEX IF NOT EXISTS idx_rate_limits_window_start
  ON public.rate_limits(window_start);

-- Enable RLS
ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;

-- Only service role can access rate limits (edge functions use service role)
CREATE POLICY "Service role full access" ON public.rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Cleanup function to remove old rate limit records
-- Records older than the specified hours are deleted to prevent table bloat
-- Can be called manually or via pg_cron: SELECT cleanup_old_rate_limits(24)
CREATE OR REPLACE FUNCTION cleanup_old_rate_limits(hours_old INTEGER DEFAULT 24)
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.rate_limits
  WHERE window_start < now() - (hours_old || ' hours')::INTERVAL;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on the cleanup function for documentation
COMMENT ON FUNCTION cleanup_old_rate_limits(INTEGER) IS
  'Removes rate limit records older than specified hours. Default 24 hours. Returns count of deleted records.';

-- Rate limit check function
-- Atomically increments request counter and returns whether request is allowed
-- Handles window reset automatically when window expires
-- Returns JSON: { "allowed": boolean, "remaining": integer, "reset_at": timestamp }
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_endpoint TEXT,
  p_max_requests INTEGER,
  p_window_seconds INTEGER
)
RETURNS JSONB AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_request_count INTEGER;
  v_reset_at TIMESTAMPTZ;
  v_allowed BOOLEAN;
  v_remaining INTEGER;
  v_now TIMESTAMPTZ := now();
  v_window_interval INTERVAL := (p_window_seconds || ' seconds')::INTERVAL;
BEGIN
  -- Use INSERT ... ON CONFLICT for atomic upsert
  -- If record exists and window is still valid, increment counter
  -- If window has expired, reset counter and window_start
  INSERT INTO public.rate_limits (identifier, endpoint, request_count, window_start)
  VALUES (p_identifier, p_endpoint, 1, v_now)
  ON CONFLICT (identifier, endpoint) DO UPDATE
  SET
    request_count = CASE
      -- Window expired: reset counter to 1
      WHEN rate_limits.window_start + v_window_interval < v_now THEN 1
      -- Window still valid: increment counter
      ELSE rate_limits.request_count + 1
    END,
    window_start = CASE
      -- Window expired: reset window_start to now
      WHEN rate_limits.window_start + v_window_interval < v_now THEN v_now
      -- Window still valid: keep existing window_start
      ELSE rate_limits.window_start
    END
  RETURNING request_count, window_start INTO v_request_count, v_window_start;

  -- Calculate reset_at (when the current window expires)
  v_reset_at := v_window_start + v_window_interval;

  -- Determine if request is allowed
  v_allowed := v_request_count <= p_max_requests;

  -- Calculate remaining requests (minimum 0)
  v_remaining := GREATEST(0, p_max_requests - v_request_count);

  -- Return JSON response
  RETURN jsonb_build_object(
    'allowed', v_allowed,
    'remaining', v_remaining,
    'reset_at', v_reset_at,
    'current', v_request_count,
    'limit', p_max_requests
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comment on the check_rate_limit function for documentation
COMMENT ON FUNCTION check_rate_limit(TEXT, TEXT, INTEGER, INTEGER) IS
  'Atomically checks and increments rate limit counter. Returns JSON with allowed (bool), remaining (int), reset_at (timestamp), current (int), limit (int). Window resets automatically when expired.';
