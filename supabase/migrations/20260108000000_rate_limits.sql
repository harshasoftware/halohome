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
