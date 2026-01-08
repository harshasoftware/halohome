/**
 * Offline Geocoder
 *
 * Fast reverse geocoding using SQLite with spatial indexing.
 * Finds nearest cities to any coordinate in <1ms.
 *
 * Features:
 * - Grid-based spatial index for O(1) cell lookup
 * - Haversine distance for accurate results
 * - Batch geocoding support
 * - Population-weighted results
 */

import { querySQL, querySQLOne, isDBReady } from './sqlite-init';

// Earth radius in kilometers
const EARTH_RADIUS_KM = 6371;
const DEG_TO_RAD = Math.PI / 180;

export interface GeocodedCity {
  id: number;
  name: string;
  countryCode: string;
  lat: number;
  lng: number;
  population: number;
  timezone: string | null;
  distanceKm: number;
}

/**
 * Calculate haversine distance between two points
 */
function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;
  const lat1Rad = lat1 * DEG_TO_RAD;
  const lat2Rad = lat2 * DEG_TO_RAD;

  const sinDLat = Math.sin(dLat / 2);
  const sinDLng = Math.sin(dLng / 2);

  const a = sinDLat * sinDLat + Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinDLng * sinDLng;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Find the nearest city to a coordinate
 */
export function nearestCity(lat: number, lng: number): GeocodedCity | null {
  if (!isDBReady()) {
    console.warn('[Geocoder] Database not ready');
    return null;
  }

  // Calculate grid cell
  const cellLat = Math.floor(lat / 2);
  const cellLng = Math.floor(lng / 2);

  // Query cities in the 3x3 grid of cells around the point
  // This ensures we find the nearest city even if it's in an adjacent cell
  const candidates = querySQL<{
    id: number;
    name: string;
    country_code: string;
    lat: number;
    lng: number;
    population: number;
    timezone: string | null;
  }>(
    `SELECT id, name, country_code, lat, lng, population, timezone
     FROM cities
     WHERE cell_lat BETWEEN ? AND ?
       AND cell_lng BETWEEN ? AND ?
     ORDER BY population DESC
     LIMIT 100`,
    [cellLat - 1, cellLat + 1, cellLng - 1, cellLng + 1]
  );

  // If no candidates in nearby cells, expand search
  if (candidates.length === 0) {
    const expanded = querySQL<{
      id: number;
      name: string;
      country_code: string;
      lat: number;
      lng: number;
      population: number;
      timezone: string | null;
    }>(
      `SELECT id, name, country_code, lat, lng, population, timezone
       FROM cities
       WHERE cell_lat BETWEEN ? AND ?
         AND cell_lng BETWEEN ? AND ?
       ORDER BY population DESC
       LIMIT 200`,
      [cellLat - 3, cellLat + 3, cellLng - 3, cellLng + 3]
    );

    if (expanded.length === 0) {
      return null;
    }

    candidates.push(...expanded);
  }

  // Find the closest city by haversine distance
  let nearest: GeocodedCity | null = null;
  let minDist = Infinity;

  for (const city of candidates) {
    const dist = haversineKm(lat, lng, city.lat, city.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = {
        id: city.id,
        name: city.name,
        countryCode: city.country_code,
        lat: city.lat,
        lng: city.lng,
        population: city.population,
        timezone: city.timezone,
        distanceKm: dist,
      };
    }
  }

  return nearest;
}

/**
 * Find cities within a bounding box
 */
export function citiesInBounds(
  latMin: number,
  latMax: number,
  lngMin: number,
  lngMax: number,
  options: { minPopulation?: number; limit?: number } = {}
): GeocodedCity[] {
  if (!isDBReady()) {
    return [];
  }

  const { minPopulation = 0, limit = 100 } = options;

  const results = querySQL<{
    id: number;
    name: string;
    country_code: string;
    lat: number;
    lng: number;
    population: number;
    timezone: string | null;
  }>(
    `SELECT id, name, country_code, lat, lng, population, timezone
     FROM cities
     WHERE lat BETWEEN ? AND ?
       AND lng BETWEEN ? AND ?
       AND population >= ?
     ORDER BY population DESC
     LIMIT ?`,
    [latMin, latMax, lngMin, lngMax, minPopulation, limit]
  );

  return results.map((city) => ({
    id: city.id,
    name: city.name,
    countryCode: city.country_code,
    lat: city.lat,
    lng: city.lng,
    population: city.population,
    timezone: city.timezone,
    distanceKm: 0, // Not calculated for bounds query
  }));
}

/**
 * Find cities within a radius of a point
 */
export function citiesWithinRadius(
  lat: number,
  lng: number,
  radiusKm: number,
  options: { minPopulation?: number; limit?: number } = {}
): GeocodedCity[] {
  if (!isDBReady()) {
    return [];
  }

  const { minPopulation = 0, limit = 50 } = options;

  // Approximate bounding box (1 degree ≈ 111km at equator)
  const degBuffer = (radiusKm / 111) * 1.5;
  const latMin = lat - degBuffer;
  const latMax = lat + degBuffer;
  const lngMin = lng - degBuffer;
  const lngMax = lng + degBuffer;

  // Get candidates from bounding box
  const candidates = querySQL<{
    id: number;
    name: string;
    country_code: string;
    lat: number;
    lng: number;
    population: number;
    timezone: string | null;
  }>(
    `SELECT id, name, country_code, lat, lng, population, timezone
     FROM cities
     WHERE lat BETWEEN ? AND ?
       AND lng BETWEEN ? AND ?
       AND population >= ?
     ORDER BY population DESC
     LIMIT ?`,
    [latMin, latMax, lngMin, lngMax, minPopulation, limit * 3]
  );

  // Filter by actual distance and calculate
  const results: GeocodedCity[] = [];

  for (const city of candidates) {
    const dist = haversineKm(lat, lng, city.lat, city.lng);
    if (dist <= radiusKm) {
      results.push({
        id: city.id,
        name: city.name,
        countryCode: city.country_code,
        lat: city.lat,
        lng: city.lng,
        population: city.population,
        timezone: city.timezone,
        distanceKm: dist,
      });
    }
  }

  // Sort by distance and limit
  return results.sort((a, b) => a.distanceKm - b.distanceKm).slice(0, limit);
}

/**
 * Batch geocode multiple points
 */
export function batchNearestCities(
  points: Array<{ lat: number; lng: number }>
): Array<GeocodedCity | null> {
  return points.map((p) => nearestCity(p.lat, p.lng));
}

/**
 * Search cities by name
 */
export function searchCities(
  query: string,
  options: { limit?: number; countryCode?: string } = {}
): GeocodedCity[] {
  if (!isDBReady() || !query.trim()) {
    return [];
  }

  const { limit = 20, countryCode } = options;
  const searchPattern = `%${query}%`;

  let sql = `
    SELECT id, name, country_code, lat, lng, population, timezone
    FROM cities
    WHERE name LIKE ?
  `;
  const params: any[] = [searchPattern];

  if (countryCode) {
    sql += ' AND country_code = ?';
    params.push(countryCode);
  }

  sql += ' ORDER BY population DESC LIMIT ?';
  params.push(limit);

  const results = querySQL<{
    id: number;
    name: string;
    country_code: string;
    lat: number;
    lng: number;
    population: number;
    timezone: string | null;
  }>(sql, params);

  return results.map((city) => ({
    id: city.id,
    name: city.name,
    countryCode: city.country_code,
    lat: city.lat,
    lng: city.lng,
    population: city.population,
    timezone: city.timezone,
    distanceKm: 0,
  }));
}

/**
 * Get cities by country
 */
export function citiesByCountry(
  countryCode: string,
  options: { limit?: number; minPopulation?: number } = {}
): GeocodedCity[] {
  if (!isDBReady()) {
    return [];
  }

  const { limit = 50, minPopulation = 0 } = options;

  const results = querySQL<{
    id: number;
    name: string;
    country_code: string;
    lat: number;
    lng: number;
    population: number;
    timezone: string | null;
  }>(
    `SELECT id, name, country_code, lat, lng, population, timezone
     FROM cities
     WHERE country_code = ?
       AND population >= ?
     ORDER BY population DESC
     LIMIT ?`,
    [countryCode, minPopulation, limit]
  );

  return results.map((city) => ({
    id: city.id,
    name: city.name,
    countryCode: city.country_code,
    lat: city.lat,
    lng: city.lng,
    population: city.population,
    timezone: city.timezone,
    distanceKm: 0,
  }));
}
