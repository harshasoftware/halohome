import { supabase } from '@/integrations/supabase/client';

/**
 * Supabase Edge Functions with `verify_jwt=true` require an Authorization bearer token.
 *
 * - If user is signed in, use their access token.
 * - If user is not signed in, sign in anonymously to obtain a real JWT.
 */
let anonSignInPromise: Promise<string | null> | null = null;

function setFunctionsAuth(token: string) {
  // Ensure the Functions client also carries the JWT by default.
  // This reduces the chance that an invoke() happens before per-call headers are attached.
  try {
    supabase.functions.setAuth(token);
  } catch {
    // ignore (older clients / unexpected runtime)
  }
}

async function getCurrentAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function getEdgeAuthHeaders(): Promise<Record<string, string>> {
  const existingToken = await getCurrentAccessToken();
  if (existingToken) {
    setFunctionsAuth(existingToken);
    return { Authorization: `Bearer ${existingToken}` };
  }

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
  if (anonToken) {
    setFunctionsAuth(anonToken);
    return { Authorization: `Bearer ${anonToken}` };
  }

  // If sign-in failed, fall back to whatever we may have now.
  const fallback = await getCurrentAccessToken();
  if (fallback) {
    setFunctionsAuth(fallback);
    return { Authorization: `Bearer ${fallback}` };
  }

  return {};
}

