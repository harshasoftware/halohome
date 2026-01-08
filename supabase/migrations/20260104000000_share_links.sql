-- Share links table for astrocartography sharing/embedding
-- Enables users to share their globe view with privacy controls

CREATE TABLE IF NOT EXISTS public.share_links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Short code for URL (e.g., "abc123")
  short_code TEXT NOT NULL UNIQUE,

  -- Owner (optional - can be guest/anonymous)
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Birth data (serialized)
  birth_data JSONB NOT NULL,
  -- Expected structure: { date, latitude, longitude, localDate?, localTime?, cityName?, timezone? }

  -- Globe state
  visibility_state JSONB,
  -- Expected structure: AstroVisibilityState (planets, lineTypes, aspects, parans, zenith)

  camera_position JSONB,
  -- Expected structure: { lat, lng, altitude }

  -- Privacy settings
  privacy_level TEXT NOT NULL DEFAULT 'anonymous',
  -- 'full': Show all birth data (date, time, location)
  -- 'anonymous': Show lines only, no birth data visible
  -- 'partial': Show lines + general region, no exact time

  -- Metadata
  title TEXT,
  description TEXT,

  -- Analytics
  view_count INTEGER DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,

  CONSTRAINT valid_privacy CHECK (privacy_level IN ('full', 'anonymous', 'partial'))
);

-- Index for short code lookups (primary access pattern)
CREATE UNIQUE INDEX IF NOT EXISTS idx_share_links_short_code ON public.share_links(short_code);

-- Index for user's shares
CREATE INDEX IF NOT EXISTS idx_share_links_user_id ON public.share_links(user_id);

-- Index for cleanup of expired links
CREATE INDEX IF NOT EXISTS idx_share_links_expires_at ON public.share_links(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Anyone can read share links (they're public by design)
CREATE POLICY "Share links are publicly readable"
  ON public.share_links FOR SELECT
  USING (true);

-- Users can create share links (authenticated or anonymous)
CREATE POLICY "Anyone can create share links"
  ON public.share_links FOR INSERT
  WITH CHECK (true);

-- Users can update their own share links
CREATE POLICY "Users can update own share links"
  ON public.share_links FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own share links
CREATE POLICY "Users can delete own share links"
  ON public.share_links FOR DELETE
  USING (auth.uid() = user_id);

-- Function to increment view count
CREATE OR REPLACE FUNCTION increment_share_view(p_short_code TEXT)
RETURNS void AS $$
BEGIN
  UPDATE public.share_links
  SET view_count = view_count + 1,
      last_viewed_at = now()
  WHERE short_code = p_short_code
    AND (expires_at IS NULL OR expires_at > now());
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to generate unique short code
CREATE OR REPLACE FUNCTION generate_short_code(length INTEGER DEFAULT 8)
RETURNS TEXT AS $$
DECLARE
  chars TEXT := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  FOR i IN 1..length LOOP
    result := result || substr(chars, floor(random() * 62 + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;
