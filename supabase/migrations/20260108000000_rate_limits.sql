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

-- ============================================================================
-- SCHEDULED CLEANUP JOB (pg_cron)
-- ============================================================================
-- pg_cron is available on Supabase Pro plans and above.
-- This section sets up a scheduled job to clean up old rate limit records.
--
-- MANUAL CLEANUP:
--   If pg_cron is not available, run manually:
--     SELECT cleanup_old_rate_limits(24);  -- Delete records older than 24 hours
--
-- VERIFY CLEANUP:
--   SELECT COUNT(*) FROM public.rate_limits;  -- Check total records
--   SELECT window_start, COUNT(*) FROM public.rate_limits GROUP BY window_start ORDER BY window_start;
--
-- To enable pg_cron on Supabase:
-- 1. Go to Dashboard > Database > Extensions
-- 2. Search for "pg_cron" and enable it
-- 3. Run the migration below
-- ============================================================================

-- Enable pg_cron extension (only if available)
-- This extension allows scheduling PostgreSQL jobs
DO $$
BEGIN
  -- Check if pg_cron extension can be created
  CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
  RAISE NOTICE 'pg_cron extension enabled successfully';
EXCEPTION
  WHEN OTHERS THEN
    -- pg_cron might not be available (e.g., local dev, non-Pro Supabase)
    RAISE NOTICE 'pg_cron extension not available: %. Manual cleanup required.', SQLERRM;
END $$;

-- Schedule the cleanup job to run every hour
-- Removes rate limit records older than 24 hours to prevent table bloat
DO $$
DECLARE
  job_exists BOOLEAN;
BEGIN
  -- Check if pg_cron is available by checking for cron.job table
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'cron' AND table_name = 'job'
  ) THEN
    -- Check if job already exists (idempotent)
    SELECT EXISTS (
      SELECT 1 FROM cron.job WHERE jobname = 'cleanup-rate-limits'
    ) INTO job_exists;

    IF NOT job_exists THEN
      -- Schedule cleanup every hour at minute 15
      -- Runs: cleanup_old_rate_limits(24) - deletes records older than 24 hours
      PERFORM cron.schedule(
        'cleanup-rate-limits',           -- job name (unique identifier)
        '15 * * * *',                     -- cron expression: every hour at :15
        'SELECT cleanup_old_rate_limits(24)'
      );
      RAISE NOTICE 'pg_cron job "cleanup-rate-limits" scheduled successfully (runs hourly at :15)';
    ELSE
      RAISE NOTICE 'pg_cron job "cleanup-rate-limits" already exists';
    END IF;
  ELSE
    RAISE NOTICE 'pg_cron not available. Please run cleanup_old_rate_limits(24) manually or via external scheduler.';
  END IF;
END $$;

-- Helper function to check scheduled jobs (useful for debugging)
-- Usage: SELECT * FROM get_rate_limit_cron_jobs();
CREATE OR REPLACE FUNCTION get_rate_limit_cron_jobs()
RETURNS TABLE (
  jobid BIGINT,
  schedule TEXT,
  command TEXT,
  nodename TEXT,
  nodeport INTEGER,
  database TEXT,
  username TEXT,
  active BOOLEAN,
  jobname TEXT
) AS $$
BEGIN
  -- Check if pg_cron is available
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'cron' AND table_name = 'job'
  ) THEN
    RETURN QUERY
    SELECT j.jobid, j.schedule, j.command, j.nodename, j.nodeport,
           j.database, j.username, j.active, j.jobname
    FROM cron.job j
    WHERE j.jobname LIKE '%rate-limit%';
  ELSE
    -- Return empty result if pg_cron not available
    RETURN;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_rate_limit_cron_jobs() IS
  'Returns rate limit related pg_cron jobs. Empty result if pg_cron not available.';

-- Function to manually unschedule the cleanup job (if needed)
-- Usage: SELECT unschedule_rate_limit_cleanup();
CREATE OR REPLACE FUNCTION unschedule_rate_limit_cleanup()
RETURNS TEXT AS $$
BEGIN
  -- Check if pg_cron is available
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'cron' AND table_name = 'job'
  ) THEN
    -- Check if job exists
    IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'cleanup-rate-limits') THEN
      PERFORM cron.unschedule('cleanup-rate-limits');
      RETURN 'Successfully unscheduled cleanup-rate-limits job';
    ELSE
      RETURN 'Job cleanup-rate-limits does not exist';
    END IF;
  ELSE
    RETURN 'pg_cron not available';
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION unschedule_rate_limit_cleanup() IS
  'Unschedules the rate limit cleanup cron job. Returns status message.';
