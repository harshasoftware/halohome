import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const RAPIDAPI_KEY = Deno.env.get("RAPIDAPI_KEY");
const RAPIDAPI_HOST = "skyscanner44.p.rapidapi.com";

// Major airports database for nearest airport lookup
const MAJOR_AIRPORTS = [
  { iataCode: 'DEL', name: 'Indira Gandhi International', city: 'New Delhi', country: 'India', lat: 28.5562, lng: 77.1000 },
  { iataCode: 'BOM', name: 'Chhatrapati Shivaji Maharaj', city: 'Mumbai', country: 'India', lat: 19.0896, lng: 72.8656 },
  { iataCode: 'MAA', name: 'Chennai International', city: 'Chennai', country: 'India', lat: 12.9941, lng: 80.1709 },
  { iataCode: 'BLR', name: 'Kempegowda International', city: 'Bangalore', country: 'India', lat: 13.1986, lng: 77.7066 },
  { iataCode: 'CCU', name: 'Netaji Subhas Chandra Bose', city: 'Kolkata', country: 'India', lat: 22.6520, lng: 88.4463 },
  { iataCode: 'HYD', name: 'Rajiv Gandhi International', city: 'Hyderabad', country: 'India', lat: 17.2403, lng: 78.4294 },
  { iataCode: 'LHR', name: 'Heathrow', city: 'London', country: 'UK', lat: 51.4700, lng: -0.4543 },
  { iataCode: 'JFK', name: 'John F. Kennedy', city: 'New York', country: 'USA', lat: 40.6413, lng: -73.7781 },
  { iataCode: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'USA', lat: 33.9425, lng: -118.4081 },
  { iataCode: 'ORD', name: "O'Hare International", city: 'Chicago', country: 'USA', lat: 41.9742, lng: -87.9073 },
  { iataCode: 'DFW', name: 'Dallas/Fort Worth', city: 'Dallas', country: 'USA', lat: 32.8998, lng: -97.0403 },
  { iataCode: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'UAE', lat: 25.2532, lng: 55.3657 },
  { iataCode: 'SIN', name: 'Changi', city: 'Singapore', country: 'Singapore', lat: 1.3644, lng: 103.9915 },
  { iataCode: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'China', lat: 22.3080, lng: 113.9185 },
  { iataCode: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', lat: 49.0097, lng: 2.5479 },
  { iataCode: 'FRA', name: 'Frankfurt', city: 'Frankfurt', country: 'Germany', lat: 50.0379, lng: 8.5622 },
  { iataCode: 'NRT', name: 'Narita', city: 'Tokyo', country: 'Japan', lat: 35.7647, lng: 140.3864 },
  { iataCode: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'Australia', lat: -33.9399, lng: 151.1753 },
  { iataCode: 'MEL', name: 'Melbourne', city: 'Melbourne', country: 'Australia', lat: -37.6690, lng: 144.8410 },
  { iataCode: 'AMS', name: 'Schiphol', city: 'Amsterdam', country: 'Netherlands', lat: 52.3105, lng: 4.7683 },
];

function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findNearestAirport(lat: number, lng: number) {
  let nearestAirport = null;
  let minDistance = Infinity;

  for (const airport of MAJOR_AIRPORTS) {
    const distance = calculateDistance(lat, lng, airport.lat, airport.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestAirport = {
        iataCode: airport.iataCode,
        name: airport.name,
        city: airport.city,
        country: airport.country,
        coordinates: { lat: airport.lat, lng: airport.lng },
      };
    }
  }

  return nearestAirport;
}

function formatTime(isoString?: string): string {
  if (!isoString) return '--:--';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '--:--';
  }
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
}

function getMockFlights(origin: string, destination: string, date: string) {
  const carriers = ['IndiGo', 'Air India', 'SpiceJet', 'Vistara', 'Emirates', 'Qatar Airways', 'British Airways'];
  const flights = [];

  for (let i = 0; i < 5; i++) {
    const basePrice = 100 + Math.random() * 400;
    const durationMinutes = 120 + Math.floor(Math.random() * 480);
    const departHour = 6 + Math.floor(Math.random() * 14);
    const arrivalHour = (departHour + Math.floor(durationMinutes / 60)) % 24;

    flights.push({
      id: `mock-${i}`,
      carrier: carriers[i % carriers.length],
      departure: {
        airport: `${origin} Airport`,
        iataCode: origin,
        time: `${String(departHour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        date,
      },
      arrival: {
        airport: `${destination} Airport`,
        iataCode: destination,
        time: `${String(arrivalHour).padStart(2, '0')}:${String(Math.floor(Math.random() * 60)).padStart(2, '0')}`,
        date,
      },
      duration: formatDuration(durationMinutes),
      durationMinutes,
      stops: i < 2 ? 0 : 1,
      price: {
        amount: Math.round(basePrice),
        currency: 'USD',
        formatted: `$${Math.round(basePrice)}`,
      },
    });
  }

  return flights.sort((a, b) => a.price.amount - b.price.amount);
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, originLat, originLng, destLat, destLng, departDate } = await req.json();

    // Action: find-airports - Find nearest airports for origin and destination
    if (action === 'find-airports') {
      const originAirport = findNearestAirport(originLat, originLng);
      const destAirport = findNearestAirport(destLat, destLng);

      return new Response(JSON.stringify({
        originAirport,
        destinationAirport: destAirport,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Action: search - Search for flights
    if (action === 'search') {
      const originAirport = findNearestAirport(originLat, originLng);
      const destAirport = findNearestAirport(destLat, destLng);

      if (!originAirport || !destAirport) {
        return new Response(JSON.stringify({
          error: 'Could not find nearby airports',
          flights: [],
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // If no API key, return mock data
      if (!RAPIDAPI_KEY) {
        console.log('No RapidAPI key configured, returning mock flights');
        const mockFlights = getMockFlights(originAirport.iataCode, destAirport.iataCode, departDate);
        return new Response(JSON.stringify({
          flights: mockFlights,
          originAirport,
          destinationAirport: destAirport,
          isMockData: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Call Skyscanner API
      const url = `https://${RAPIDAPI_HOST}/search?adults=1&origin=${originAirport.iataCode}&destination=${destAirport.iataCode}&departureDate=${departDate}&currency=USD&countryCode=US&market=en-US`;

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-RapidAPI-Key': RAPIDAPI_KEY,
          'X-RapidAPI-Host': RAPIDAPI_HOST,
        },
      });

      if (!response.ok) {
        console.warn('Skyscanner API error:', response.status);
        const mockFlights = getMockFlights(originAirport.iataCode, destAirport.iataCode, departDate);
        return new Response(JSON.stringify({
          flights: mockFlights,
          originAirport,
          destinationAirport: destAirport,
          isMockData: true,
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      const data = await response.json();

      // Parse flight results
      const flights = (data.itineraries?.buckets || [])
        .flatMap((bucket: { items: unknown[] }) => bucket.items || [])
        .slice(0, 10)
        .map((item: {
          id: string;
          legs?: Array<{
            origin?: { displayCode?: string; name?: string };
            destination?: { displayCode?: string; name?: string };
            departure?: string;
            arrival?: string;
            durationInMinutes?: number;
            stopCount?: number;
            carriers?: { marketing?: Array<{ name?: string; logoUrl?: string }> };
          }>;
          price?: { raw?: number; formatted?: string };
          deeplink?: string;
        }) => {
          const leg = item.legs?.[0];
          if (!leg) return null;

          const carrier = leg.carriers?.marketing?.[0];

          return {
            id: item.id,
            carrier: carrier?.name || 'Unknown',
            carrierLogo: carrier?.logoUrl,
            departure: {
              airport: leg.origin?.name || originAirport.iataCode,
              iataCode: leg.origin?.displayCode || originAirport.iataCode,
              time: formatTime(leg.departure),
              date: departDate,
            },
            arrival: {
              airport: leg.destination?.name || destAirport.iataCode,
              iataCode: leg.destination?.displayCode || destAirport.iataCode,
              time: formatTime(leg.arrival),
              date: departDate,
            },
            duration: formatDuration(leg.durationInMinutes || 0),
            durationMinutes: leg.durationInMinutes || 0,
            stops: leg.stopCount || 0,
            price: {
              amount: item.price?.raw || 0,
              currency: 'USD',
              formatted: item.price?.formatted || '$0',
            },
            deepLink: item.deeplink,
          };
        })
        .filter(Boolean);

      return new Response(JSON.stringify({
        flights,
        originAirport,
        destinationAirport: destAirport,
        isMockData: false,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });

  } catch (error) {
    console.error("Error in search-flights:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
