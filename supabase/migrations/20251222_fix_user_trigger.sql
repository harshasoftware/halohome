-- Fix handle_new_user to handle conflicts and errors gracefully
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO user_profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
    updated_at = NOW();
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log error but don't fail the user creation
  RAISE WARNING 'Error in handle_new_user: %', SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
