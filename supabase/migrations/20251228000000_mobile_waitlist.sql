-- Mobile App Waitlist
-- Collects emails from users interested in iOS/Android app

CREATE TABLE IF NOT EXISTS mobile_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    platform_preference TEXT, -- 'ios', 'android', or 'both'
    notified_at TIMESTAMPTZ -- when we sent them the launch email
);

-- Index for quick lookups
CREATE INDEX IF NOT EXISTS idx_mobile_waitlist_email ON mobile_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_mobile_waitlist_created ON mobile_waitlist(created_at DESC);

-- Enable RLS
ALTER TABLE mobile_waitlist ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (for landing page signups)
CREATE POLICY "Allow anonymous inserts" ON mobile_waitlist
    FOR INSERT
    TO anon
    WITH CHECK (true);

-- Allow authenticated users to insert
CREATE POLICY "Allow authenticated inserts" ON mobile_waitlist
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Only service role can read/update (for admin dashboard)
CREATE POLICY "Service role full access" ON mobile_waitlist
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
