-- Migration: Rename birth_charts to saved_locations
-- Purpose: Better naming for location/address storage (not specifically birth charts)

-- 1. Rename the table
ALTER TABLE public.birth_charts RENAME TO saved_locations;

-- 2. Rename indexes
ALTER INDEX IF EXISTS idx_birth_charts_user_id RENAME TO idx_saved_locations_user_id;
ALTER INDEX IF EXISTS idx_birth_charts_is_favorite RENAME TO idx_saved_locations_is_favorite;

-- 3. Rename triggers
ALTER TRIGGER trigger_birth_charts_updated_at ON public.saved_locations
  RENAME TO trigger_saved_locations_updated_at;
ALTER TRIGGER trigger_single_default_chart ON public.saved_locations
  RENAME TO trigger_single_default_location;

-- 4. Rename functions
ALTER FUNCTION update_birth_charts_updated_at() RENAME TO update_saved_locations_updated_at;
ALTER FUNCTION ensure_single_default_chart() RENAME TO ensure_single_default_location;

-- 5. Drop old policies and recreate with new names
DROP POLICY IF EXISTS "Users can view own birth charts" ON public.saved_locations;
DROP POLICY IF EXISTS "Users can create own birth charts" ON public.saved_locations;
DROP POLICY IF EXISTS "Users can update own birth charts" ON public.saved_locations;
DROP POLICY IF EXISTS "Users can delete own birth charts" ON public.saved_locations;

CREATE POLICY "Users can view own saved locations"
  ON public.saved_locations FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own saved locations"
  ON public.saved_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own saved locations"
  ON public.saved_locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved locations"
  ON public.saved_locations FOR DELETE
  USING (auth.uid() = user_id);

-- 6. Add comment
COMMENT ON TABLE public.saved_locations IS 'User saved locations for astrocartography (addresses, zip scouts, etc.)';
