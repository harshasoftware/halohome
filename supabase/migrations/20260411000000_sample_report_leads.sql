-- Sample Report Leads
-- Collects email addresses before unlocking the sample report preview.

CREATE TABLE IF NOT EXISTS public.sample_report_leads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    source_path TEXT NOT NULL DEFAULT '/sample-report'
);

CREATE INDEX IF NOT EXISTS idx_sample_report_leads_created
    ON public.sample_report_leads(created_at DESC);

ALTER TABLE public.sample_report_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow sample report lead inserts with valid email" ON public.sample_report_leads;
CREATE POLICY "Allow sample report lead inserts with valid email"
    ON public.sample_report_leads
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        email IS NOT NULL
        AND email LIKE '%@%.%'
        AND length(email) <= 320
        AND source_path = '/sample-report'
    );

DROP POLICY IF EXISTS "Service role full access on sample report leads" ON public.sample_report_leads;
CREATE POLICY "Service role full access on sample report leads"
    ON public.sample_report_leads
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

COMMENT ON TABLE public.sample_report_leads IS 'Lead capture for users who unlock the sample report. Public inserts allowed with email validation.';
