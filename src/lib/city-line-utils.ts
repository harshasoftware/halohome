/**
 * City Line Utilities
 * Functions to find cities near astrocartography lines and calculate influence scores
 * Uses geonames database for city lookup (proper city names, population filtering)
 */

import { getCityFromCoordinates } from '@/features/globe/services/googlePlacesService';

// City type for internal use
type City = {
  name: string;
  country: string;
  lat: number;
  lng: number;
  population?: number;
};

// Geonames city format from JSON
interface GeonamesCity {
  id: number;
  n: string;  // name
  a: number;  // latitude
  o: number;  // longitude
  p: number;  // population
  c: string;  // country code
  z?: string; // timezone
}

// Earth's radius in kilometers
const EARTH_RADIUS_KM = 6371;

// Maximum distance for a city to be considered "on" a line (in km)
const MAX_INFLUENCE_DISTANCE_KM = 500;

// Distance for maximum influence score (power zone along line)
const GOLD_DISTANCE_KM = 200;

// Distance from zenith point for true zenith influence
const ZENITH_DISTANCE_KM = 200;

// Sample interval for points along line (in degrees)
const LINE_SAMPLE_INTERVAL = 5;

// Minimum population for "cities along line" feature
const MIN_POPULATION = 100000;

// Cached cities data
let citiesCache: GeonamesCity[] | null = null;
let citiesLoadPromise: Promise<GeonamesCity[]> | null = null;

// Country code to full name mapping
const COUNTRY_NAMES: Record<string, string> = {
  US: 'United States', CN: 'China', IN: 'India', BR: 'Brazil', RU: 'Russia',
  JP: 'Japan', MX: 'Mexico', DE: 'Germany', FR: 'France', GB: 'United Kingdom',
  IT: 'Italy', ES: 'Spain', CA: 'Canada', AU: 'Australia', KR: 'South Korea',
  ID: 'Indonesia', TR: 'Turkey', SA: 'Saudi Arabia', AR: 'Argentina', ZA: 'South Africa',
  PK: 'Pakistan', NG: 'Nigeria', EG: 'Egypt', BD: 'Bangladesh', VN: 'Vietnam',
  PH: 'Philippines', TH: 'Thailand', MY: 'Malaysia', IR: 'Iran', CO: 'Colombia',
  PL: 'Poland', UA: 'Ukraine', NL: 'Netherlands', BE: 'Belgium', SE: 'Sweden',
  AT: 'Austria', CH: 'Switzerland', GR: 'Greece', PT: 'Portugal', CZ: 'Czech Republic',
  RO: 'Romania', HU: 'Hungary', IL: 'Israel', AE: 'United Arab Emirates', SG: 'Singapore',
  NZ: 'New Zealand', IE: 'Ireland', DK: 'Denmark', FI: 'Finland', NO: 'Norway',
  CL: 'Chile', PE: 'Peru', VE: 'Venezuela', EC: 'Ecuador', TW: 'Taiwan',
  HK: 'Hong Kong', KE: 'Kenya', ET: 'Ethiopia', TZ: 'Tanzania', MA: 'Morocco',
  DZ: 'Algeria', SD: 'Sudan', IQ: 'Iraq', AF: 'Afghanistan', MM: 'Myanmar',
  KZ: 'Kazakhstan', UZ: 'Uzbekistan', NP: 'Nepal', LK: 'Sri Lanka',
};

/**
 * Load cities from geonames JSON file (cached)
 */
async function loadCities(): Promise<GeonamesCity[]> {
  if (citiesCache) return citiesCache;

  if (citiesLoadPromise) return citiesLoadPromise;

  citiesLoadPromise = (async () => {
    console.log('[CityLineUtils] Loading geonames cities database...');
    const response = await fetch('/data/geonames-cities.json');
    if (!response.ok) {
      throw new Error(`Failed to load cities: ${response.status}`);
    }
    const cities = await response.json() as GeonamesCity[];
    console.log('[CityLineUtils] Loaded', cities.length, 'cities');
    citiesCache = cities;
    return cities;
  })();

  return citiesLoadPromise;
}

/**
 * Get country name from code
 */
function getCountryName(code: string): string {
  return COUNTRY_NAMES[code] || code;
}

export interface CityInfluence {
  city: City;
  distance: number; // km from line
  distanceFromZenith?: number; // km from zenith point (if applicable)
  influenceScore: number; // 0-100
  influenceLevel: 'zenith' | 'gold' | 'strong' | 'moderate' | 'weak';
}

export interface ZenithPointData {
  latitude: number;
  longitude: number;
}

/**
 * Convert degrees to radians
 */
function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Calculate the Haversine distance between two points on Earth
 * @param lat1 Latitude of point 1 (degrees)
 * @param lng1 Longitude of point 1 (degrees)
 * @param lat2 Latitude of point 2 (degrees)
 * @param lng2 Longitude of point 2 (degrees)
 * @returns Distance in kilometers
 */
function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
            Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

/**
 * Calculate influence score based on distance from line
 * @param distance Distance in kilometers from line
 * @param distanceFromZenith Distance from zenith point (if provided)
 * @returns Influence score 0-100
 */
function calculateInfluenceScore(distance: number, distanceFromZenith?: number): number {
  // If within zenith point radius, give maximum score
  if (distanceFromZenith !== undefined && distanceFromZenith <= ZENITH_DISTANCE_KM) {
    return 100 - (distanceFromZenith / ZENITH_DISTANCE_KM) * 10; // 90-100 for zenith
  }

  if (distance <= GOLD_DISTANCE_KM) {
    // Within gold zone (200km from line): 70-90 score
    return 90 - (distance / GOLD_DISTANCE_KM) * 20;
  } else if (distance <= MAX_INFLUENCE_DISTANCE_KM) {
    // Beyond gold but within influence: 0-70 score
    const normalizedDist = (distance - GOLD_DISTANCE_KM) / (MAX_INFLUENCE_DISTANCE_KM - GOLD_DISTANCE_KM);
    return 70 * (1 - normalizedDist);
  }
  return 0;
}

/**
 * Determine influence level based on distance and zenith proximity
 * @param distance Distance from line in km
 * @param distanceFromZenith Distance from zenith point in km (if applicable)
 */
function getInfluenceLevel(distance: number, distanceFromZenith?: number): CityInfluence['influenceLevel'] {
  // Zenith: within 200km of the actual zenith point
  if (distanceFromZenith !== undefined && distanceFromZenith <= ZENITH_DISTANCE_KM) {
    return 'zenith';
  }
  // Gold: within 200km of the line (but not at zenith)
  if (distance <= GOLD_DISTANCE_KM) {
    return 'gold';
  }
  // Strong: 200-350km from line
  if (distance <= 350) {
    return 'strong';
  }
  // Moderate: 350-500km from line
  if (distance <= MAX_INFLUENCE_DISTANCE_KM) {
    return 'moderate';
  }
  return 'weak';
}

/**
 * Sample points along a line at regular intervals
 */
function sampleLinePoints(lineCoords: [number, number][]): [number, number][] {
  if (!lineCoords || lineCoords.length < 2) return [];

  const sampledPoints: [number, number][] = [];
  let lastSampledLat = -Infinity;

  for (const [lat, lng] of lineCoords) {
    // Sample every ~5 degrees of latitude to avoid too many API calls
    if (Math.abs(lat - lastSampledLat) >= LINE_SAMPLE_INTERVAL) {
      // Skip polar regions (less populated)
      if (lat > -75 && lat < 75) {
        sampledPoints.push([lat, lng]);
        lastSampledLat = lat;
      }
    }
  }

  return sampledPoints;
}

/**
 * Calculate minimum distance from a city to any point on the line
 * Uses sampled points for efficiency
 */
function calculateMinDistanceToLine(
  cityLat: number,
  cityLng: number,
  lineCoords: [number, number][]
): number {
  let minDistance = Infinity;

  // Check distance to each point on the line (sample for efficiency)
  for (let i = 0; i < lineCoords.length; i += 10) {
    const [lineLat, lineLng] = lineCoords[i];
    const dist = haversineDistance(cityLat, cityLng, lineLat, lineLng);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }

  return minDistance;
}

/**
 * Find cities along a line using geonames database
 * Finds major cities (population > 100k) within influence distance of the line
 * @param lineCoords Array of [lat, lng] coordinates forming the line
 * @param zenithPoint Optional zenith point for this line (only for MC lines)
 * @param maxResults Maximum number of results to return (default 15)
 * @returns Promise of array of cities with their influence data, sorted by score
 */
export async function findCitiesAlongLineAsync(
  lineCoords: [number, number][],
  zenithPoint?: ZenithPointData | null,
  maxResults: number = 15
): Promise<CityInfluence[]> {
  console.log('[CityLineUtils] findCitiesAlongLineAsync called with', lineCoords?.length, 'coords');

  if (!lineCoords || lineCoords.length < 2) {
    console.log('[CityLineUtils] Not enough coords, returning empty');
    return [];
  }

  // Load cities database (cached after first load)
  let cities: GeonamesCity[];
  try {
    cities = await loadCities();
  } catch (err) {
    console.error('[CityLineUtils] Failed to load cities database:', err);
    return [];
  }

  // Filter cities by population first (reduces search space significantly)
  const majorCities = cities.filter(c => c.p >= MIN_POPULATION);
  console.log('[CityLineUtils] Checking', majorCities.length, 'cities with pop >', MIN_POPULATION);

  // Get bounding box of line for quick filtering
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  for (const [lat, lng] of lineCoords) {
    if (lat < minLat) minLat = lat;
    if (lat > maxLat) maxLat = lat;
    if (lng < minLng) minLng = lng;
    if (lng > maxLng) maxLng = lng;
  }

  // Expand bounding box by influence distance (~4.5 degrees ≈ 500km)
  const degreeBuffer = 4.5;
  minLat -= degreeBuffer;
  maxLat += degreeBuffer;
  minLng -= degreeBuffer;
  maxLng += degreeBuffer;

  // Find cities within influence distance of the line
  const citiesWithInfluence: CityInfluence[] = [];

  for (const geoCity of majorCities) {
    // Quick bounding box check first
    if (geoCity.a < minLat || geoCity.a > maxLat) continue;
    if (geoCity.o < minLng || geoCity.o > maxLng) continue;

    // Calculate minimum distance to line
    const distance = calculateMinDistanceToLine(geoCity.a, geoCity.o, lineCoords);

    // Skip if too far from line
    if (distance > MAX_INFLUENCE_DISTANCE_KM) continue;

    // Calculate distance from zenith point if provided
    let distanceFromZenith: number | undefined;
    if (zenithPoint) {
      distanceFromZenith = haversineDistance(
        geoCity.a,
        geoCity.o,
        zenithPoint.latitude,
        zenithPoint.longitude
      );
    }

    const influenceScore = calculateInfluenceScore(distance, distanceFromZenith);
    const influenceLevel = getInfluenceLevel(distance, distanceFromZenith);

    const city: City = {
      name: geoCity.n,
      country: getCountryName(geoCity.c),
      lat: geoCity.a,
      lng: geoCity.o,
      population: geoCity.p,
    };

    citiesWithInfluence.push({
      city,
      distance: Math.round(distance),
      distanceFromZenith: distanceFromZenith !== undefined ? Math.round(distanceFromZenith) : undefined,
      influenceScore: Math.round(influenceScore),
      influenceLevel,
    });
  }

  // Sort by influence score (highest first), then by population for ties
  citiesWithInfluence.sort((a, b) => {
    if (b.influenceScore !== a.influenceScore) {
      return b.influenceScore - a.influenceScore;
    }
    return (b.city.population || 0) - (a.city.population || 0);
  });

  console.log('[CityLineUtils] Found', citiesWithInfluence.length, 'cities near line, returning top', maxResults);

  // Return top results
  return citiesWithInfluence.slice(0, maxResults);
}

// Legacy sync function - kept for backward compatibility but returns empty
// Use findCitiesAlongLineAsync instead
export function findCitiesAlongLine(
  lineCoords: [number, number][],
  zenithPoint?: ZenithPointData | null,
  maxResults: number = 20
): CityInfluence[] {
  // This is now a no-op - use findCitiesAlongLineAsync instead
  console.warn('[CityLineUtils] findCitiesAlongLine (sync) called - use findCitiesAlongLineAsync instead');
  return [];
}

/**
 * Preload cities database for faster first query
 */
export async function ensureCityLineCitiesLoaded(): Promise<void> {
  console.log('[CityLineUtils] Preloading geonames cities database...');
  await loadCities();
}

/**
 * Get influence description based on level
 */
export function getInfluenceLevelDescription(level: CityInfluence['influenceLevel']): string {
  switch (level) {
    case 'zenith':
      return 'Zenith point - planet directly overhead, absolute maximum power';
    case 'gold':
      return 'Power zone - within 200km of line, strong planetary influence';
    case 'strong':
      return 'Strong influence - highly recommended location';
    case 'moderate':
      return 'Moderate influence - noticeable effects';
    case 'weak':
      return 'Mild influence - subtle planetary effects';
  }
}

/**
 * Get color for influence level (for UI)
 */
export function getInfluenceLevelColor(level: CityInfluence['influenceLevel']): string {
  switch (level) {
    case 'zenith':
      return '#E11D48'; // Rose/red for zenith (special)
    case 'gold':
      return '#FFD700'; // Gold
    case 'strong':
      return '#22C55E'; // Green
    case 'moderate':
      return '#3B82F6'; // Blue
    case 'weak':
      return '#94A3B8'; // Gray
  }
}

/**
 * Find the nearest city to a specific point using Google Places API
 * @param lat Latitude of the point
 * @param lng Longitude of the point
 * @returns Promise of the nearest city with distance, or null if none found
 */
export async function findNearestCityToPointAsync(
  lat: number,
  lng: number
): Promise<{ city: City; distance: number } | null> {
  try {
    const cityInfo = await getCityFromCoordinates(lat, lng);
    if (cityInfo && cityInfo.name && cityInfo.name !== 'Unknown') {
      return {
        city: {
          name: cityInfo.name,
          country: cityInfo.country,
          lat: cityInfo.coordinates.lat,
          lng: cityInfo.coordinates.lng,
        },
        distance: Math.round(
          haversineDistance(lat, lng, cityInfo.coordinates.lat, cityInfo.coordinates.lng)
        ),
      };
    }
  } catch (err) {
    console.error('[CityLineUtils] Failed to find nearest city:', err);
  }
  return null;
}

// Legacy sync function - returns null, use findNearestCityToPointAsync instead
export function findNearestCityToPoint(
  lat: number,
  lng: number
): { city: City; distance: number } | null {
  console.warn('[CityLineUtils] findNearestCityToPoint (sync) called - use findNearestCityToPointAsync instead');
  return null;
}

/**
 * Find the top N nearest cities to a specific point using Google Places API
 * Samples points in a grid around the location to find multiple cities
 * @param lat Latitude of the point
 * @param lng Longitude of the point
 * @param count Number of cities to return (default 3)
 * @returns Promise of array of cities with distances, sorted by distance
 */
export async function findNearestCitiesToPointAsync(
  lat: number,
  lng: number,
  count: number = 3
): Promise<Array<{ city: City; distance: number }>> {
  console.log('[CityLineUtils] Finding', count, 'nearest cities to', lat, lng);

  // Sample points in a grid around the location (roughly 100-200km apart)
  const offsets = [
    [0, 0],      // Center point
    [1, 0],      // East
    [-1, 0],     // West
    [0, 1],      // North
    [0, -1],     // South
    [1, 1],      // NE
    [-1, 1],     // NW
    [1, -1],     // SE
    [-1, -1],    // SW
  ];

  const degreeOffset = 1.5; // ~150km at equator

  const cityPromises = offsets.map(async ([dLng, dLat]) => {
    const sampleLat = lat + dLat * degreeOffset;
    const sampleLng = lng + dLng * degreeOffset;

    try {
      const cityInfo = await getCityFromCoordinates(sampleLat, sampleLng);
      if (cityInfo && cityInfo.name && cityInfo.name !== 'Unknown') {
        return {
          city: {
            name: cityInfo.name,
            country: cityInfo.country,
            lat: cityInfo.coordinates.lat,
            lng: cityInfo.coordinates.lng,
          },
          // Calculate distance from original point to the city
          distance: Math.round(
            haversineDistance(lat, lng, cityInfo.coordinates.lat, cityInfo.coordinates.lng)
          ),
        };
      }
    } catch (err) {
      console.warn('[CityLineUtils] Failed to get city at', sampleLat, sampleLng);
    }
    return null;
  });

  const results = await Promise.all(cityPromises);

  // Filter nulls and deduplicate by city name
  const seenCities = new Set<string>();
  const uniqueCities: Array<{ city: City; distance: number }> = [];

  for (const result of results) {
    if (!result) continue;
    const cityKey = `${result.city.name}-${result.city.country}`;
    if (seenCities.has(cityKey)) continue;
    seenCities.add(cityKey);
    uniqueCities.push(result);
  }

  // Sort by distance and return top N
  uniqueCities.sort((a, b) => a.distance - b.distance);

  console.log('[CityLineUtils] Found', uniqueCities.length, 'unique cities, returning top', count);

  return uniqueCities.slice(0, count);
}
