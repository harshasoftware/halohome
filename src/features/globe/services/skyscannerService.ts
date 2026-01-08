import { FlightInfo, Airport } from '@/types/cityInfo';
import { supabase } from '@/integrations/supabase/client';
import { monitoredEdgeFunction } from '@/lib/monitoring';

const CACHE_DURATION = 15 * 60 * 1000; // 15 minutes

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const flightCache = new Map<string, CacheEntry<FlightInfo[]>>();
const airportCache = new Map<string, CacheEntry<Airport>>();

function getCached<T>(cache: Map<string, CacheEntry<T>>, key: string): T | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache<T>(cache: Map<string, CacheEntry<T>>, key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() });
}

// Major airports database for fallback (client-side)
const MAJOR_AIRPORTS: Airport[] = [
  { iataCode: 'DEL', name: 'Indira Gandhi International', city: 'New Delhi', country: 'India', coordinates: { lat: 28.5562, lng: 77.1000 } },
  { iataCode: 'BOM', name: 'Chhatrapati Shivaji Maharaj', city: 'Mumbai', country: 'India', coordinates: { lat: 19.0896, lng: 72.8656 } },
  { iataCode: 'MAA', name: 'Chennai International', city: 'Chennai', country: 'India', coordinates: { lat: 12.9941, lng: 80.1709 } },
  { iataCode: 'BLR', name: 'Kempegowda International', city: 'Bangalore', country: 'India', coordinates: { lat: 13.1986, lng: 77.7066 } },
  { iataCode: 'CCU', name: 'Netaji Subhas Chandra Bose', city: 'Kolkata', country: 'India', coordinates: { lat: 22.6520, lng: 88.4463 } },
  { iataCode: 'HYD', name: 'Rajiv Gandhi International', city: 'Hyderabad', country: 'India', coordinates: { lat: 17.2403, lng: 78.4294 } },
  { iataCode: 'LHR', name: 'Heathrow', city: 'London', country: 'UK', coordinates: { lat: 51.4700, lng: -0.4543 } },
  { iataCode: 'JFK', name: 'John F. Kennedy', city: 'New York', country: 'USA', coordinates: { lat: 40.6413, lng: -73.7781 } },
  { iataCode: 'LAX', name: 'Los Angeles International', city: 'Los Angeles', country: 'USA', coordinates: { lat: 33.9425, lng: -118.4081 } },
  { iataCode: 'DXB', name: 'Dubai International', city: 'Dubai', country: 'UAE', coordinates: { lat: 25.2532, lng: 55.3657 } },
  { iataCode: 'SIN', name: 'Changi', city: 'Singapore', country: 'Singapore', coordinates: { lat: 1.3644, lng: 103.9915 } },
  { iataCode: 'HKG', name: 'Hong Kong International', city: 'Hong Kong', country: 'China', coordinates: { lat: 22.3080, lng: 113.9185 } },
  { iataCode: 'CDG', name: 'Charles de Gaulle', city: 'Paris', country: 'France', coordinates: { lat: 49.0097, lng: 2.5479 } },
  { iataCode: 'FRA', name: 'Frankfurt', city: 'Frankfurt', country: 'Germany', coordinates: { lat: 50.0379, lng: 8.5622 } },
  { iataCode: 'NRT', name: 'Narita', city: 'Tokyo', country: 'Japan', coordinates: { lat: 35.7647, lng: 140.3864 } },
  { iataCode: 'SYD', name: 'Sydney Kingsford Smith', city: 'Sydney', country: 'Australia', coordinates: { lat: -33.9399, lng: 151.1753 } },
];

// Find nearest airport to coordinates (client-side for quick display)
export function findNearestAirport(lat: number, lng: number): Airport | null {
  const cacheKey = `${lat.toFixed(2)}-${lng.toFixed(2)}`;
  const cached = getCached(airportCache, cacheKey);
  if (cached) return cached;

  let nearestAirport: Airport | null = null;
  let minDistance = Infinity;

  for (const airport of MAJOR_AIRPORTS) {
    const distance = calculateDistance(lat, lng, airport.coordinates.lat, airport.coordinates.lng);
    if (distance < minDistance) {
      minDistance = distance;
      nearestAirport = airport;
    }
  }

  if (nearestAirport) {
    setCache(airportCache, cacheKey, nearestAirport);
  }

  return nearestAirport;
}

// Search for flights using Supabase Edge Function
export async function searchFlights(
  originLat: number,
  originLng: number,
  destLat: number,
  destLng: number,
  departDate: string // Format: YYYY-MM-DD
): Promise<{
  flights: FlightInfo[];
  originAirport: Airport | null;
  destinationAirport: Airport | null;
}> {
  const cacheKey = `${originLat.toFixed(2)}-${originLng.toFixed(2)}-${destLat.toFixed(2)}-${destLng.toFixed(2)}-${departDate}`;
  const cached = getCached(flightCache, cacheKey);
  if (cached) {
    return {
      flights: cached,
      originAirport: findNearestAirport(originLat, originLng),
      destinationAirport: findNearestAirport(destLat, destLng),
    };
  }

  try {
    // Use monitored edge function
    const data = await monitoredEdgeFunction<{
      flights?: FlightInfo[];
      originAirport?: Airport;
      destinationAirport?: Airport;
    }>('search-flights', () =>
      supabase.functions.invoke('search-flights', {
        body: {
          action: 'search',
          originLat,
          originLng,
          destLat,
          destLng,
          departDate,
        },
      })
    );

    const flights = data?.flights || [];
    setCache(flightCache, cacheKey, flights);

    return {
      flights,
      originAirport: data?.originAirport || findNearestAirport(originLat, originLng),
      destinationAirport: data?.destinationAirport || findNearestAirport(destLat, destLng),
    };
  } catch (error) {
    console.warn('Flight search failed:', error instanceof Error ? error.message : error);
    return {
      flights: [],
      originAirport: findNearestAirport(originLat, originLng),
      destinationAirport: findNearestAirport(destLat, destLng),
    };
  }
}

// Helper functions
function calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// Clear cache
export function clearFlightCache(): void {
  flightCache.clear();
  airportCache.clear();
}
