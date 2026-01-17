-- Migration: Add is_favorite column to birth_charts
-- Purpose: Allow users to mark locations as favorites for quick filtering

-- Add is_favorite column
ALTER TABLE public.birth_charts
ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

-- Create index for faster favorite filtering
CREATE INDEX IF NOT EXISTS idx_birth_charts_is_favorite
ON public.birth_charts(user_id, is_favorite)
WHERE is_favorite = true;

-- Add comment for documentation
COMMENT ON COLUMN public.birth_charts.is_favorite IS 'User-marked favorite locations for quick filtering';
