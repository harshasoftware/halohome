import { supabase } from '@/integrations/supabase/client';

/**
 * Supabase Edge Functions with `verify_jwt=true` require an Authorization bearer token.
 *
 * - If user is signed in, use their access token.
 * - If user is anonymous, use the publishable key as a JWT (role=anon).
 */
export async function getEdgeAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  const anonJwt = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

  const token = accessToken || anonJwt;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

