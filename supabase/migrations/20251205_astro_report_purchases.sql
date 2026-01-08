-- Astro Report Purchases table for one-time PDF premium payments
CREATE TABLE IF NOT EXISTS astro_report_purchases (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  birth_hash TEXT NOT NULL,
  tier INTEGER NOT NULL CHECK (tier IN (5, 10)),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  price_id TEXT NOT NULL,
  stripe_session_id TEXT,
  email TEXT,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_astro_purchases_birth_hash ON astro_report_purchases(birth_hash);
CREATE INDEX IF NOT EXISTS idx_astro_purchases_status ON astro_report_purchases(status);

-- Enable RLS
ALTER TABLE astro_report_purchases ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Allow public insert" ON astro_report_purchases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public select" ON astro_report_purchases FOR SELECT USING (true);
CREATE POLICY "Allow service role all" ON astro_report_purchases FOR ALL TO service_role USING (true) WITH CHECK (true);
