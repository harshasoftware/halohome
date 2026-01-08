/**
 * GeoNames Cities Database
 *
 * Auto-generated from GeoNames cities15000 dataset.
 * Contains 33,030 cities with population >= 15,000
 *
 * Field mapping (compact for bundle size):
 * - id: GeoNames ID
 * - n: City name
 * - a: Latitude
 * - o: Longitude
 * - p: Population
 * - c: Country code (ISO 2-letter)
 * - z: Timezone
 *
 * Data is loaded dynamically from /data/geonames-cities.json to avoid
 * bundling 3MB in both main bundle and worker bundles.
 *
 * DO NOT EDIT - regenerate with: node scripts/extract-cities-json.cjs
 */

export interface GeoCity {
  id: number;
  n: string;
  a: number;
  o: number;
  p: number;
  c: string;
  z: string | null;
}

// Expanded interface for external use
export interface City {
  geonameId: number;
  name: string;
  lat: number;
  lng: number;
  population: number;
  countryCode: string;
  timezone: string | null;
}

// Convert compact format to full format
export function expandCity(c: GeoCity): City {
  return {
    geonameId: c.id,
    name: c.n,
    lat: c.a,
    lng: c.o,
    population: c.p,
    countryCode: c.c,
    timezone: c.z,
  };
}

// Cache for loaded cities data
let citiesCache: GeoCity[] | null = null;
let loadPromise: Promise<GeoCity[]> | null = null;

/**
 * Load cities data dynamically (cached after first load)
 * Works in both main thread and workers
 */
export async function loadCities(): Promise<GeoCity[]> {
  // Return cached data if available
  if (citiesCache) {
    return citiesCache;
  }

  // Return existing promise if already loading
  if (loadPromise) {
    return loadPromise;
  }

  // Start loading
  loadPromise = (async () => {
    try {
      // In workers, self.location.origin gives us the base URL
      // In main thread, window.location.origin works
      const baseUrl = typeof self !== 'undefined' && self.location
        ? self.location.origin
        : '';

      const response = await fetch(`${baseUrl}/data/geonames-cities.json`);

      if (!response.ok) {
        throw new Error(`Failed to load cities data: ${response.status} ${response.statusText}`);
      }

      citiesCache = await response.json();
      console.log(`[GeoNames] Loaded ${citiesCache!.length} cities`);
      return citiesCache!;
    } catch (error) {
      loadPromise = null; // Allow retry on failure
      throw error;
    }
  })();

  return loadPromise;
}

/**
 * Get cities synchronously (throws if not loaded yet)
 * Use loadCities() first, then getCities() for sync access
 */
export function getCities(): GeoCity[] {
  if (!citiesCache) {
    throw new Error('Cities not loaded. Call loadCities() first.');
  }
  return citiesCache;
}

/**
 * Check if cities are loaded
 */
export function areCitiesLoaded(): boolean {
  return citiesCache !== null;
}

// For backwards compatibility - will be empty until loadCities() is called
// DEPRECATED: Use loadCities() instead
export const GEONAMES_CITIES: GeoCity[] = [];

export const GEONAMES_CITY_COUNT = 33030;
