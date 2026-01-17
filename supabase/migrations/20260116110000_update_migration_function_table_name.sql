-- Migration: Update anonymous user migration function for table rename
-- Purpose: Update function to use saved_locations instead of birth_charts

-- Drop and recreate the function with updated table references
DROP FUNCTION IF EXISTS public.migrate_anonymous_user_data(UUID, UUID);

CREATE OR REPLACE FUNCTION public.migrate_anonymous_user_data(
  old_user_id UUID,
  new_user_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  migrated_saved_locations INT := 0;
  migrated_favorites INT := 0;
  migrated_conversations INT := 0;
  migrated_subscriptions INT := 0;
  migrated_share_links INT := 0;
BEGIN
  -- Skip if IDs are the same
  IF old_user_id = new_user_id THEN
    RAISE NOTICE 'Skipping migration: old_user_id and new_user_id are the same';
    RETURN;
  END IF;

  -- Migrate saved_locations
  -- 1. If anonymous user has a default location, unset the existing user's default (anonymous takes priority)
  UPDATE saved_locations
  SET is_default = FALSE
  WHERE user_id = new_user_id
    AND is_default = TRUE
    AND EXISTS (SELECT 1 FROM saved_locations WHERE user_id = old_user_id AND is_default = TRUE);

  -- 2. Delete duplicate locations from anonymous user (same birth_date, birth_time, lat, lng)
  DELETE FROM saved_locations l1
  WHERE l1.user_id = old_user_id
    AND EXISTS (
      SELECT 1 FROM saved_locations l2
      WHERE l2.user_id = new_user_id
        AND l2.birth_date = l1.birth_date
        AND l2.birth_time = l1.birth_time
        AND l2.latitude = l1.latitude
        AND l2.longitude = l1.longitude
    );

  -- 3. Migrate remaining locations to the new user
  UPDATE saved_locations
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  GET DIAGNOSTICS migrated_saved_locations = ROW_COUNT;

  -- Migrate favorite_cities
  -- Handle unique constraint (user_id, latitude, longitude) by skipping duplicates
  DELETE FROM favorite_cities f1
  WHERE f1.user_id = old_user_id
    AND EXISTS (
      SELECT 1 FROM favorite_cities f2
      WHERE f2.user_id = new_user_id
        AND f2.latitude = f1.latitude
        AND f2.longitude = f1.longitude
    );

  UPDATE favorite_cities
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  GET DIAGNOSTICS migrated_favorites = ROW_COUNT;

  -- Migrate chat_conversations (chat_messages will cascade via conversation_id)
  UPDATE chat_conversations
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  GET DIAGNOSTICS migrated_conversations = ROW_COUNT;

  -- Migrate ai_subscriptions (if any)
  DELETE FROM ai_subscriptions
  WHERE user_id = old_user_id
    AND EXISTS (SELECT 1 FROM ai_subscriptions WHERE user_id = new_user_id);

  UPDATE ai_subscriptions
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  GET DIAGNOSTICS migrated_subscriptions = ROW_COUNT;

  -- Migrate share_links (if any)
  UPDATE share_links
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  GET DIAGNOSTICS migrated_share_links = ROW_COUNT;

  -- Log the migration for debugging
  RAISE NOTICE 'Migrated data from anonymous user % to permanent user %: saved_locations=%, favorites=%, conversations=%, subscriptions=%, share_links=%',
    old_user_id, new_user_id, migrated_saved_locations, migrated_favorites, migrated_conversations, migrated_subscriptions, migrated_share_links;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.migrate_anonymous_user_data(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.migrate_anonymous_user_data IS
  'Migrates all user data (saved_locations, favorite_cities, chat_conversations, ai_subscriptions, share_links) from an anonymous user account to a permanent account when they sign in with an existing Google account. Handles conflicts gracefully by skipping or deleting duplicates.';
