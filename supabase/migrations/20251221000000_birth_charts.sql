-- Migration: birth_charts table
-- Purpose: Store user-associated birth chart data for astrocartography

-- Create birth_charts table
CREATE TABLE IF NOT EXISTS public.birth_charts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL DEFAULT 'My Birth Chart',

  -- Birth data
  birth_date DATE NOT NULL,
  birth_time TIME NOT NULL,
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  city_name TEXT,
  timezone TEXT,

  -- Metadata
  is_default BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for user queries
CREATE INDEX IF NOT EXISTS idx_birth_charts_user_id ON public.birth_charts(user_id);

-- Enable RLS
ALTER TABLE public.birth_charts ENABLE ROW LEVEL SECURITY;

-- RLS policy: Users can only access their own birth charts
CREATE POLICY "Users can view own birth charts"
  ON public.birth_charts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own birth charts"
  ON public.birth_charts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own birth charts"
  ON public.birth_charts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own birth charts"
  ON public.birth_charts FOR DELETE
  USING (auth.uid() = user_id);

-- Trigger to update updated_at on modification
CREATE OR REPLACE FUNCTION update_birth_charts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_birth_charts_updated_at
  BEFORE UPDATE ON public.birth_charts
  FOR EACH ROW
  EXECUTE FUNCTION update_birth_charts_updated_at();

-- Ensure only one default chart per user
CREATE OR REPLACE FUNCTION ensure_single_default_chart()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_default = true THEN
    UPDATE public.birth_charts
    SET is_default = false
    WHERE user_id = NEW.user_id
      AND id != NEW.id
      AND is_default = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_single_default_chart
  AFTER INSERT OR UPDATE ON public.birth_charts
  FOR EACH ROW
  EXECUTE FUNCTION ensure_single_default_chart();
