import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GOOGLE_API_KEY = Deno.env.get("GOOGLE_MAPS_API_KEY");

// Helper to get photo URL
function getPhotoUrl(photoReference: string, maxWidth: number = 400): string {
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_API_KEY}`;
}

// Get city info from coordinates
async function getCityFromCoordinates(lat: number, lng: number) {
  try {
    // Geocode to get city name and place_id
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`;
    const geocodeResponse = await fetch(geocodeUrl);
    const geocodeData = await geocodeResponse.json();

    if (geocodeData.status !== 'OK' || !geocodeData.results?.length) {
      console.warn('Geocoding failed:', geocodeData.status);
      return null;
    }

    // Find the locality (city) result
    const cityResult = geocodeData.results.find((r: { types: string[] }) =>
      r.types.includes('locality') || r.types.includes('administrative_area_level_1')
    ) || geocodeData.results[0];

    // Extract city and country from address components
    let cityName = '';
    let countryName = '';
    for (const component of cityResult.address_components || []) {
      if (component.types.includes('locality')) {
        cityName = component.long_name;
      }
      if (component.types.includes('administrative_area_level_1') && !cityName) {
        cityName = component.long_name;
      }
      if (component.types.includes('country')) {
        countryName = component.long_name;
      }
    }

    // Get place details for photos
    const placeId = cityResult.place_id;
    const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,photos,formatted_address,geometry,types&key=${GOOGLE_API_KEY}`;
    const detailsResponse = await fetch(detailsUrl);
    const detailsData = await detailsResponse.json();

    const photos = (detailsData.result?.photos || []).slice(0, 10).map((photo: {
      photo_reference: string;
      width: number;
      height: number;
      html_attributions: string[];
    }) => ({
      photoReference: photo.photo_reference,
      width: photo.width,
      height: photo.height,
      attributions: photo.html_attributions || [],
      url: getPhotoUrl(photo.photo_reference, 800),
    }));

    return {
      placeId,
      name: cityName || detailsData.result?.name || 'Unknown',
      country: countryName,
      formattedAddress: cityResult.formatted_address,
      coordinates: { lat, lng },
      photos,
    };
  } catch (error) {
    console.error('Error getting city from coordinates:', error);
    return null;
  }
}

// Get nearby places
async function getNearbyPlaces(lat: number, lng: number, types: string[] = ['tourist_attraction'], radius: number = 10000) {
  try {
    const allPlaces: unknown[] = [];

    for (const type of types) {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GOOGLE_API_KEY}`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.status === 'OK' && data.results) {
        const places = data.results.map((place: {
          place_id: string;
          name: string;
          types: string[];
          rating?: number;
          user_ratings_total?: number;
          price_level?: number;
          photos?: { photo_reference: string; width: number; height: number; html_attributions: string[] }[];
          vicinity?: string;
          opening_hours?: { open_now?: boolean };
          icon?: string;
          geometry?: { location?: { lat: number; lng: number } };
        }) => ({
          placeId: place.place_id,
          name: place.name,
          types: place.types,
          rating: place.rating,
          userRatingsTotal: place.user_ratings_total,
          priceLevel: place.price_level,
          photos: place.photos?.slice(0, 3).map((photo) => ({
            photoReference: photo.photo_reference,
            url: getPhotoUrl(photo.photo_reference, 400),
          })),
          vicinity: place.vicinity,
          openNow: place.opening_hours?.open_now,
          icon: place.icon,
        }));
        allPlaces.push(...places);
      }
    }

    // Remove duplicates by placeId
    const uniquePlaces = Array.from(
      new Map(allPlaces.map((p: any) => [p.placeId, p])).values()
    ).sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0));

    return uniquePlaces;
  } catch (error) {
    console.error('Error fetching nearby places:', error);
    return [];
  }
}

// Get weather using OpenWeatherMap (free tier) since Google Weather API has restrictions
async function getWeather(lat: number, lng: number) {
  // Using OpenWeatherMap as a fallback since Google Weather API is complex
  // You can replace with actual Google Weather API if enabled
  try {
    // Return mock weather for now - user should configure OpenWeatherMap API key
    const OPENWEATHER_API_KEY = Deno.env.get("OPENWEATHER_API_KEY");

    if (OPENWEATHER_API_KEY) {
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${OPENWEATHER_API_KEY}&units=metric`;
      const response = await fetch(url);
      const data = await response.json();

      if (data.cod === 200) {
        return {
          temperature: data.main.temp,
          feelsLike: data.main.feels_like,
          humidity: data.main.humidity,
          description: data.weather?.[0]?.description,
          icon: getWeatherEmoji(data.weather?.[0]?.main),
          windSpeed: data.wind?.speed * 3.6, // Convert m/s to km/h
          visibility: data.visibility,
        };
      }
    }

    // Return null if no API key or error
    return null;
  } catch (error) {
    console.error('Error fetching weather:', error);
    return null;
  }
}

function getWeatherEmoji(condition: string): string {
  const map: Record<string, string> = {
    'Clear': '☀️',
    'Clouds': '☁️',
    'Rain': '🌧️',
    'Drizzle': '🌦️',
    'Thunderstorm': '⛈️',
    'Snow': '❄️',
    'Mist': '🌫️',
    'Fog': '🌫️',
    'Haze': '🌫️',
  };
  return map[condition] || '🌤️';
}

// Get air quality
async function getAirQuality(lat: number, lng: number) {
  try {
    // Try Google Air Quality API
    const url = `https://airquality.googleapis.com/v1/currentConditions:lookup?key=${GOOGLE_API_KEY}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        location: { latitude: lat, longitude: lng },
      }),
    });

    if (!response.ok) {
      console.log('Air Quality API not available');
      return null;
    }

    const data = await response.json();
    const index = data.indexes?.[0];

    if (index) {
      return {
        aqi: index.aqi,
        category: index.category,
        dominantPollutant: index.dominantPollutant,
        color: getAqiColor(index.aqi),
        healthRecommendation: data.healthRecommendations?.generalPopulation,
      };
    }

    return null;
  } catch (error) {
    console.log('Air Quality API error:', error);
    return null;
  }
}

function getAqiColor(aqi: number): string {
  if (aqi <= 50) return '#22c55e'; // Good - green
  if (aqi <= 100) return '#eab308'; // Moderate - yellow
  if (aqi <= 150) return '#f97316'; // Unhealthy for sensitive - orange
  if (aqi <= 200) return '#ef4444'; // Unhealthy - red
  if (aqi <= 300) return '#a855f7'; // Very unhealthy - purple
  return '#7f1d1d'; // Hazardous - maroon
}

// Check Street View availability
async function checkStreetView(lat: number, lng: number) {
  try {
    const metadataUrl = `https://maps.googleapis.com/maps/api/streetview/metadata?location=${lat},${lng}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(metadataUrl);
    const data = await response.json();

    if (data.status === 'OK') {
      return {
        available: true,
        panoId: data.pano_id,
        date: data.date,
        // Return the static image URL (this works from browser)
        imageUrl: `https://maps.googleapis.com/maps/api/streetview?size=600x400&location=${lat},${lng}&key=${GOOGLE_API_KEY}`,
      };
    }

    return { available: false };
  } catch (error) {
    console.error('Error checking Street View:', error);
    return { available: false };
  }
}

// Check Aerial View availability
async function checkAerialView(lat: number, lng: number, cityName?: string) {
  try {
    const lookupUrl = `https://aerialview.googleapis.com/v1/videos:lookupVideo?key=${GOOGLE_API_KEY}`;
    const response = await fetch(lookupUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: cityName || `${lat},${lng}`,
      }),
    });

    if (!response.ok) {
      return { available: false };
    }

    const data = await response.json();

    if (data.state === 'ACTIVE' && data.uris?.MP4_HIGH) {
      return {
        available: true,
        videoUrl: data.uris.MP4_HIGH,
        thumbnailUrl: data.uris.IMAGE,
        duration: data.metadata?.duration,
      };
    }

    return { available: false };
  } catch (error) {
    console.log('Aerial View API not available:', error);
    return { available: false };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, lat, lng, cityName, types, radius } = await req.json();

    if (!GOOGLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'Google API key not configured' }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    let result: unknown = null;

    switch (action) {
      case 'city':
        result = await getCityFromCoordinates(lat, lng);
        break;
      case 'places':
        result = await getNearbyPlaces(lat, lng, types || ['tourist_attraction', 'museum'], radius || 10000);
        break;
      case 'weather':
        result = await getWeather(lat, lng);
        break;
      case 'airQuality':
        result = await getAirQuality(lat, lng);
        break;
      case 'streetView':
        result = await checkStreetView(lat, lng);
        break;
      case 'aerialView':
        result = await checkAerialView(lat, lng, cityName);
        break;
      case 'all':
        // Fetch all data in parallel
        const [city, places, weather, airQuality, streetView, aerialView] = await Promise.all([
          getCityFromCoordinates(lat, lng),
          getNearbyPlaces(lat, lng, types || ['tourist_attraction', 'museum'], radius || 10000),
          getWeather(lat, lng),
          getAirQuality(lat, lng),
          checkStreetView(lat, lng),
          checkAerialView(lat, lng, cityName),
        ]);
        result = { city, places, weather, airQuality, streetView, aerialView };
        break;
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("Error in city-info:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
