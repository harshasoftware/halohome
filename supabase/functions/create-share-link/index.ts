import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface BirthDataPayload {
  date: string;
  latitude: number;
  longitude: number;
  localDate?: string;
  localTime?: string;
  cityName?: string;
  timezone?: string;
}

interface VisibilityState {
  planets?: Record<string, boolean>;
  lineTypes?: Record<string, boolean>;
  aspects?: boolean;
  parans?: boolean;
  zenith?: boolean;
}

interface CreateShareRequest {
  birthData: BirthDataPayload;
  visibilityState?: VisibilityState;
  cameraPosition?: { lat: number; lng: number; altitude: number };
  privacyLevel: 'full' | 'anonymous' | 'partial';
  title?: string;
  description?: string;
  expiresInDays?: number;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get user if authenticated
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;

    if (authHeader) {
      const token = authHeader.replace("Bearer ", "");
      const { data: { user } } = await supabase.auth.getUser(token);
      userId = user?.id || null;
    }

    const body: CreateShareRequest = await req.json();
    const { birthData, visibilityState, cameraPosition, privacyLevel, title, description, expiresInDays } = body;

    // Validate required fields
    if (!birthData || !birthData.date || birthData.latitude === undefined || birthData.longitude === undefined) {
      return new Response(JSON.stringify({ error: "Birth data is required (date, latitude, longitude)" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    if (!['full', 'anonymous', 'partial'].includes(privacyLevel)) {
      return new Response(JSON.stringify({ error: "Invalid privacy level. Must be 'full', 'anonymous', or 'partial'" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Generate unique short code
    let shortCode: string = '';
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const { data: codeData } = await supabase.rpc('generate_short_code', { length: 8 });
      shortCode = codeData;

      // Check if code exists
      const { data: existing } = await supabase
        .from('share_links')
        .select('id')
        .eq('short_code', shortCode)
        .single();

      if (!existing) break;
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return new Response(JSON.stringify({ error: "Failed to generate unique code. Please try again." }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // Calculate expiration if specified
    const expiresAt = expiresInDays
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    // Insert share link
    const { data, error } = await supabase
      .from('share_links')
      .insert({
        short_code: shortCode,
        user_id: userId,
        birth_data: birthData,
        visibility_state: visibilityState || null,
        camera_position: cameraPosition || null,
        privacy_level: privacyLevel,
        title: title || null,
        description: description || null,
        expires_at: expiresAt,
      })
      .select()
      .single();

    if (error) {
      console.error("Error inserting share link:", error);
      throw error;
    }

    // Use APP_URL if set, otherwise use halohome.app
    const appUrl = Deno.env.get("APP_URL") || "https://halohome.app";

    return new Response(JSON.stringify({
      shortCode,
      shareUrl: `${appUrl}/s/${shortCode}`,
      embedUrl: `${appUrl}/embed/${shortCode}`,
      embedCode: `<iframe src="${appUrl}/embed/${shortCode}" width="600" height="400" frameborder="0" allowfullscreen></iframe>`,
      expiresAt,
      viewCount: 0,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error creating share link:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
