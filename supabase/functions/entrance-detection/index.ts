import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

type SingleRequest =
  | { action: "reverse"; lat: number; lng: number }
  | { action: "address"; address: string }
  | { action: "placeId"; placeId: string };

type BatchRequestItem =
  | { id: string; kind: "reverse"; lat: number; lng: number }
  | { id: string; kind: "address"; address: string }
  | { id: string; kind: "placeId"; placeId: string };

type BatchRequest = {
  action: "batch";
  requests: BatchRequestItem[];
  maxConcurrent?: number;
  delayMs?: number;
};

type EntranceDetectionRequest = SingleRequest | BatchRequest;

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function buildGeocodeUrlFromSingle(payload: SingleRequest): URL {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("key", GOOGLE_API_KEY!);
  // Critical: this is where buildings[]/entrances[] come from (if enabled for project/key).
  url.searchParams.set("extra_computations", "BUILDING_AND_ENTRANCES");

  if (payload.action === "reverse") {
    url.searchParams.set("latlng", `${payload.lat},${payload.lng}`);
  } else if (payload.action === "address") {
    url.searchParams.set("address", payload.address);
  } else {
    url.searchParams.set("place_id", payload.placeId);
  }

  return url;
}

function buildGeocodeUrlFromBatchItem(item: BatchRequestItem): URL {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("key", GOOGLE_API_KEY!);
  url.searchParams.set("extra_computations", "BUILDING_AND_ENTRANCES");

  if (item.kind === "reverse") {
    url.searchParams.set("latlng", `${item.lat},${item.lng}`);
  } else if (item.kind === "address") {
    url.searchParams.set("address", item.address);
  } else {
    url.searchParams.set("place_id", item.placeId);
  }

  return url;
}

async function sleep(ms: number): Promise<void> {
  await new Promise((r) => setTimeout(r, ms));
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_API_KEY) {
      return jsonResponse({ error: "Google API key not configured" }, 500);
    }

    const payload = (await req.json()) as EntranceDetectionRequest;

    if (payload.action === "batch") {
      const maxConcurrent = Math.max(1, Math.min(payload.maxConcurrent ?? 3, 10));
      const delayMs = Math.max(0, Math.min(payload.delayMs ?? 150, 2000));

      const results: Array<{ id: string; data: unknown | null; error?: string }> = [];

      for (let i = 0; i < payload.requests.length; i += maxConcurrent) {
        const chunk = payload.requests.slice(i, i + maxConcurrent);
        const settled = await Promise.allSettled(
          chunk.map(async (item) => {
            const url = buildGeocodeUrlFromBatchItem(item);
            const res = await fetch(url.toString());
            const data = await res.json();
            return { id: item.id, data };
          }),
        );

        for (const s of settled) {
          if (s.status === "fulfilled") {
            results.push({ id: s.value.id, data: s.value.data });
          } else {
            results.push({ id: "unknown", data: null, error: s.reason?.message ?? String(s.reason) });
          }
        }

        if (delayMs > 0 && i + maxConcurrent < payload.requests.length) {
          await sleep(delayMs);
        }
      }

      return jsonResponse({ results }, 200);
    }

    // Single request
    const url = buildGeocodeUrlFromSingle(payload);
    const res = await fetch(url.toString());
    const data = await res.json();

    // Note: Google may return 200 OK with status=REQUEST_DENIED in the JSON body.
    return jsonResponse(data, 200);
  } catch (error) {
    console.error("[entrance-detection] error:", error?.message ?? error);
    return jsonResponse({ error: error?.message ?? "Unknown error" }, 500);
  }
});

