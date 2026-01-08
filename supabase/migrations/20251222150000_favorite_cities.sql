-- Migration: Favorite Cities
-- Allows users to save their favorite cities from the globe view

-- Create favorite_cities table
CREATE TABLE IF NOT EXISTS public.favorite_cities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- City location data
  latitude DECIMAL(9,6) NOT NULL,
  longitude DECIMAL(9,6) NOT NULL,
  city_name TEXT NOT NULL,
  country TEXT,

  -- Optional notes or tags
  notes TEXT,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Prevent duplicate cities for same user (based on coordinates rounded to ~100m precision)
  CONSTRAINT unique_user_city UNIQUE (user_id, latitude, longitude)
);

-- Create index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_favorite_cities_user_id ON public.favorite_cities(user_id);

-- Create index for location-based queries
CREATE INDEX IF NOT EXISTS idx_favorite_cities_location ON public.favorite_cities(latitude, longitude);

-- Enable Row Level Security
ALTER TABLE public.favorite_cities ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only access their own favorites
CREATE POLICY "Users can view their own favorite cities"
  ON public.favorite_cities
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own favorite cities"
  ON public.favorite_cities
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own favorite cities"
  ON public.favorite_cities
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own favorite cities"
  ON public.favorite_cities
  FOR DELETE
  USING (auth.uid() = user_id);

-- Service role has full access (for edge functions)
CREATE POLICY "Service role has full access to favorite cities"
  ON public.favorite_cities
  FOR ALL
  USING (auth.role() = 'service_role');

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_favorite_cities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_favorite_cities_updated_at
  BEFORE UPDATE ON public.favorite_cities
  FOR EACH ROW
  EXECUTE FUNCTION update_favorite_cities_updated_at();
