import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ShareLinkRow {
  id: string;
  short_code: string;
  user_id: string | null;
  birth_data: {
    date: string;
    latitude: number;
    longitude: number;
    localDate?: string;
    localTime?: string;
    cityName?: string;
    timezone?: string;
  };
  visibility_state: Record<string, unknown> | null;
  camera_position: { lat: number; lng: number; altitude: number } | null;
  privacy_level: 'full' | 'anonymous' | 'partial';
  title: string | null;
  description: string | null;
  view_count: number;
  last_viewed_at: string | null;
  created_at: string;
  expires_at: string | null;
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

    const { shortCode, incrementView = true } = await req.json();

    if (!shortCode) {
      return new Response(JSON.stringify({ error: "Short code is required" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Fetch share link
    const { data, error } = await supabase
      .from('share_links')
      .select('*')
      .eq('short_code', shortCode)
      .single();

    if (error || !data) {
      return new Response(JSON.stringify({ error: "Share link not found" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    const shareLink = data as ShareLinkRow;

    // Check expiration
    if (shareLink.expires_at && new Date(shareLink.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "Share link has expired" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 410,
      });
    }

    // Increment view count (fire-and-forget)
    if (incrementView) {
      supabase.rpc('increment_share_view', { p_short_code: shortCode }).catch((err) => {
        console.error("Error incrementing view count:", err);
      });
    }

    // Apply privacy filtering to birth data
    let responseBirthData = { ...shareLink.birth_data };

    if (shareLink.privacy_level === 'anonymous') {
      // Only send coordinates for line calculation, no identifiable info
      responseBirthData = {
        date: shareLink.birth_data.date,
        latitude: shareLink.birth_data.latitude,
        longitude: shareLink.birth_data.longitude,
        // Omit: localDate, localTime, cityName, timezone
      };
    } else if (shareLink.privacy_level === 'partial') {
      // Round coordinates to 1 decimal (about 11km accuracy), remove exact time
      responseBirthData = {
        date: shareLink.birth_data.date,
        latitude: Math.round(shareLink.birth_data.latitude * 10) / 10,
        longitude: Math.round(shareLink.birth_data.longitude * 10) / 10,
        localDate: shareLink.birth_data.localDate,
        // Omit: localTime (exact time hidden)
        cityName: shareLink.birth_data.cityName,
        timezone: shareLink.birth_data.timezone,
      };
    }
    // 'full' privacy level returns all data as-is

    return new Response(JSON.stringify({
      shortCode: shareLink.short_code,
      birthData: responseBirthData,
      visibilityState: shareLink.visibility_state,
      cameraPosition: shareLink.camera_position,
      privacyLevel: shareLink.privacy_level,
      title: shareLink.title,
      description: shareLink.description,
      viewCount: shareLink.view_count,
      createdAt: shareLink.created_at,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error fetching share data:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
