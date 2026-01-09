-- Migration: Anonymous User Data Migration Function
-- Description: Creates a function to migrate data from anonymous users to permanent accounts
-- when they sign up via Google One Tap (which creates a new user instead of linking)

-- Function to migrate all user data from an anonymous account to a permanent account
CREATE OR REPLACE FUNCTION public.migrate_anonymous_user_data(
  old_user_id UUID,
  new_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Migrate birth_charts
  UPDATE birth_charts
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  -- Migrate favorite_cities
  UPDATE favorite_cities
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  -- Migrate chat_history
  UPDATE chat_history
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  -- Migrate ai_subscriptions (if any)
  UPDATE ai_subscriptions
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  -- Migrate astro_report_purchases (if any)
  UPDATE astro_report_purchases
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  -- Log the migration for debugging
  RAISE NOTICE 'Migrated data from anonymous user % to permanent user %', old_user_id, new_user_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.migrate_anonymous_user_data(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.migrate_anonymous_user_data IS
  'Migrates all user data (birth_charts, favorite_cities, chat_history, subscriptions) from an anonymous user account to a permanent account when they sign up.';
