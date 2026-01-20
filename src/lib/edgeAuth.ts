import { supabase } from '@/integrations/supabase/client';

/**
 * Supabase Edge Functions with `verify_jwt=true` require an Authorization bearer token.
 *
 * - If user is signed in, use their access token.
 * - If user is not signed in, sign in anonymously to obtain a real JWT.
 */
let anonSignInPromise: Promise<string | null> | null = null;

export async function getEdgeAuthHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;
  if (accessToken) return { Authorization: `Bearer ${accessToken}` };

  // No session yet: ensure an anonymous session exists (gives us a real JWT).
  // This avoids turning off verify_jwt on public endpoints like pricing checkout.
  if (!anonSignInPromise) {
    anonSignInPromise = (async () => {
      const { data: signInData, error } = await supabase.auth.signInAnonymously();
      if (error) {
        // Anonymous sign-ins must be enabled in Supabase Auth settings; if disabled,
        // callers will still 401 until enabled.
        console.warn('[edgeAuth] Anonymous sign-in failed:', error.message);
        return null;
      }
      return signInData.session?.access_token ?? null;
    })();
  }

  const anonToken = await anonSignInPromise;
  return anonToken ? { Authorization: `Bearer ${anonToken}` } : {};
}

