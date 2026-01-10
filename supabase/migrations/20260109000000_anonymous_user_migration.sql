-- Migration: Anonymous User Data Migration Function
-- Description: Creates a function to migrate data from anonymous users to permanent accounts
-- when they sign in with an existing Google account (server-side data merge)

-- Drop existing function if it exists (required when changing return type)
DROP FUNCTION IF EXISTS public.migrate_anonymous_user_data(UUID, UUID);

-- Function to migrate all user data from an anonymous account to a permanent account
-- Handles conflicts gracefully (e.g., duplicate favorites are skipped)
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
  migrated_birth_charts INT := 0;
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

  -- Migrate birth_charts
  -- 1. If anonymous user has a default chart, unset the existing user's default (anonymous takes priority)
  UPDATE birth_charts
  SET is_default = FALSE
  WHERE user_id = new_user_id
    AND is_default = TRUE
    AND EXISTS (SELECT 1 FROM birth_charts WHERE user_id = old_user_id AND is_default = TRUE);

  -- 2. Delete duplicate charts from anonymous user (same birth_date, birth_time, lat, lng)
  DELETE FROM birth_charts b1
  WHERE b1.user_id = old_user_id
    AND EXISTS (
      SELECT 1 FROM birth_charts b2
      WHERE b2.user_id = new_user_id
        AND b2.birth_date = b1.birth_date
        AND b2.birth_time = b1.birth_time
        AND b2.latitude = b1.latitude
        AND b2.longitude = b1.longitude
    );

  -- 3. Migrate remaining charts to the new user
  UPDATE birth_charts
  SET user_id = new_user_id
  WHERE user_id = old_user_id;

  GET DIAGNOSTICS migrated_birth_charts = ROW_COUNT;

  -- Migrate favorite_cities
  -- Handle unique constraint (user_id, latitude, longitude) by skipping duplicates
  -- First delete from anonymous user's favorites if they conflict with existing user's
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
  -- If new user already has a subscription, just delete the anonymous one
  -- to avoid duplicate subscriptions
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
  RAISE NOTICE 'Migrated data from anonymous user % to permanent user %: birth_charts=%, favorites=%, conversations=%, subscriptions=%, share_links=%',
    old_user_id, new_user_id, migrated_birth_charts, migrated_favorites, migrated_conversations, migrated_subscriptions, migrated_share_links;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.migrate_anonymous_user_data(UUID, UUID) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.migrate_anonymous_user_data IS
  'Migrates all user data (birth_charts, favorite_cities, chat_conversations, ai_subscriptions, share_links) from an anonymous user account to a permanent account when they sign in with an existing Google account. Handles conflicts gracefully by skipping or deleting duplicates.';
