/**
 * Timezone Utilities
 * Provides timezone lookup from coordinates for accurate birth time conversion
 */

// Cache for timezone lookups to avoid repeated API calls
const timezoneCache = new Map<string, { timezone: string; offset: number }>();

/**
 * Get cache key for coordinates (rounded to reduce cache misses)
 */
function getCacheKey(lat: number, lng: number): string {
  // Round to 2 decimal places for caching
  return `${lat.toFixed(2)},${lng.toFixed(2)}`;
}

/**
 * Known timezone offsets for major regions (handles half-hour and 45-minute offsets)
 * Format: { [longitudeRange]: offset in hours }
 */
const KNOWN_TIMEZONE_REGIONS: Array<{
  minLng: number;
  maxLng: number;
  minLat?: number;
  maxLat?: number;
  offset: number;
  name: string;
}> = [
  // India (UTC+5:30) - entire country uses IST
  { minLng: 68, maxLng: 97, minLat: 6, maxLat: 36, offset: 5.5, name: 'IST' },
  // Nepal (UTC+5:45)
  { minLng: 80, maxLng: 89, minLat: 26, maxLat: 31, offset: 5.75, name: 'NPT' },
  // Iran (UTC+3:30)
  { minLng: 44, maxLng: 64, minLat: 25, maxLat: 40, offset: 3.5, name: 'IRST' },
  // Afghanistan (UTC+4:30)
  { minLng: 60, maxLng: 75, minLat: 29, maxLat: 39, offset: 4.5, name: 'AFT' },
  // Myanmar (UTC+6:30)
  { minLng: 92, maxLng: 102, minLat: 9, maxLat: 29, offset: 6.5, name: 'MMT' },
  // Sri Lanka (UTC+5:30)
  { minLng: 79, maxLng: 82, minLat: 5, maxLat: 10, offset: 5.5, name: 'IST' },
  // Newfoundland, Canada (UTC-3:30)
  { minLng: -60, maxLng: -52, minLat: 46, maxLat: 52, offset: -3.5, name: 'NST' },
  // Marquesas Islands (UTC-9:30)
  { minLng: -141, maxLng: -138, minLat: -11, maxLat: -7, offset: -9.5, name: 'MART' },
  // Chatham Islands, NZ (UTC+12:45)
  { minLng: -177, maxLng: -176, minLat: -45, maxLat: -43, offset: 12.75, name: 'CHAST' },
  // Australia - Central (UTC+9:30)
  { minLng: 129, maxLng: 141, minLat: -38, maxLat: -10, offset: 9.5, name: 'ACST' },
];

/**
 * Calculate timezone offset from longitude (fallback method)
 * This is approximate and doesn't account for DST or political boundaries
 * Returns offset in hours from UTC
 */
function calculateOffsetFromLongitude(lng: number, lat?: number): number {
  // First check known regions with non-standard offsets
  if (lat !== undefined) {
    for (const region of KNOWN_TIMEZONE_REGIONS) {
      if (lng >= region.minLng && lng <= region.maxLng) {
        if (region.minLat === undefined || region.maxLat === undefined ||
            (lat >= region.minLat && lat <= region.maxLat)) {
          console.log(`Using known timezone region: ${region.name} (UTC${region.offset >= 0 ? '+' : ''}${region.offset})`);
          return region.offset;
        }
      }
    }
  }

  // Fallback: Each 15 degrees of longitude = 1 hour offset
  // Use half-hour precision for better accuracy
  const rawOffset = lng / 15;
  // Round to nearest half hour
  const halfHourOffset = Math.round(rawOffset * 2) / 2;
  return halfHourOffset;
}

/**
 * Get timezone info from coordinates using TimeZoneDB API
 * Free tier: 1 request per second, no key required for basic usage
 */
async function fetchTimezoneFromAPI(lat: number, lng: number): Promise<{ timezone: string; offset: number } | null> {
  try {
    // Use timeapi.io - free, no API key required
    const response = await fetch(
      `https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lng}`,
      { signal: AbortSignal.timeout(5000) } // 5 second timeout
    );

    if (!response.ok) {
      console.warn('Timezone API returned error:', response.status);
      return null;
    }

    const data = await response.json();

    if (data.timeZone && typeof data.currentUtcOffset?.seconds === 'number') {
      return {
        timezone: data.timeZone,
        offset: data.currentUtcOffset.seconds / 3600, // Convert seconds to hours
      };
    }

    return null;
  } catch (error) {
    console.warn('Failed to fetch timezone from API:', error);
    return null;
  }
}

/**
 * Get timezone offset for a given location
 * Returns offset in hours from UTC
 */
export async function getTimezoneOffset(lat: number, lng: number): Promise<number> {
  const cacheKey = getCacheKey(lat, lng);

  // Check cache first
  const cached = timezoneCache.get(cacheKey);
  if (cached) {
    return cached.offset;
  }

  // Try API lookup
  const apiResult = await fetchTimezoneFromAPI(lat, lng);
  if (apiResult) {
    timezoneCache.set(cacheKey, apiResult);
    return apiResult.offset;
  }

  // Fallback to longitude-based calculation (with known timezone regions)
  const fallbackOffset = calculateOffsetFromLongitude(lng, lat);
  timezoneCache.set(cacheKey, { timezone: 'UTC' + (fallbackOffset >= 0 ? '+' : '') + fallbackOffset, offset: fallbackOffset });
  console.log(`Using timezone offset: UTC${fallbackOffset >= 0 ? '+' : ''}${fallbackOffset}`);
  return fallbackOffset;
}

/**
 * Get timezone name for a given location (async)
 */
export async function getTimezoneName(lat: number, lng: number): Promise<string> {
  const cacheKey = getCacheKey(lat, lng);

  // Check cache first
  const cached = timezoneCache.get(cacheKey);
  if (cached) {
    return cached.timezone;
  }

  // Try API lookup
  const apiResult = await fetchTimezoneFromAPI(lat, lng);
  if (apiResult) {
    timezoneCache.set(cacheKey, apiResult);
    return apiResult.timezone;
  }

  // Fallback (with known timezone regions)
  const fallbackOffset = calculateOffsetFromLongitude(lng, lat);
  const fallbackTimezone = 'UTC' + (fallbackOffset >= 0 ? '+' : '') + fallbackOffset;
  timezoneCache.set(cacheKey, { timezone: fallbackTimezone, offset: fallbackOffset });
  return fallbackTimezone;
}

/**
 * Convert local time at a location to UTC Date
 *
 * @param dateStr - Date string in YYYY-MM-DD format
 * @param timeStr - Time string in HH:MM format (local time at birth location)
 * @param lat - Latitude of birth location
 * @param lng - Longitude of birth location
 * @returns Date object in UTC
 */
export async function localTimeToUTC(
  dateStr: string,
  timeStr: string,
  lat: number,
  lng: number
): Promise<Date> {
  // Get timezone offset for the location
  const offsetHours = await getTimezoneOffset(lat, lng);

  // Parse the local date and time
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  // Create a Date object treating the input as UTC
  // Then adjust by subtracting the offset to get the actual UTC time
  const localMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const utcMs = localMs - (offsetHours * 60 * 60 * 1000);

  return new Date(utcMs);
}

/**
 * Synchronous version using cached timezone or longitude fallback
 * Use this when you can't await (e.g., in useMemo)
 */
export function localTimeToUTCSync(
  dateStr: string,
  timeStr: string,
  lat: number,
  lng: number
): Date {
  const cacheKey = getCacheKey(lat, lng);

  // Check cache first, then fallback with known timezone regions
  const cached = timezoneCache.get(cacheKey);
  const offsetHours = cached ? cached.offset : calculateOffsetFromLongitude(lng, lat);

  // Parse the local date and time
  const [year, month, day] = dateStr.split('-').map(Number);
  const [hour, minute] = timeStr.split(':').map(Number);

  // Create UTC Date adjusted for timezone offset
  const localMs = Date.UTC(year, month - 1, day, hour, minute, 0);
  const utcMs = localMs - (offsetHours * 60 * 60 * 1000);

  return new Date(utcMs);
}

/**
 * Prefetch timezone for a location (call this early to populate cache)
 */
export async function prefetchTimezone(lat: number, lng: number): Promise<void> {
  await getTimezoneOffset(lat, lng);
}

export default {
  getTimezoneOffset,
  getTimezoneName,
  localTimeToUTC,
  localTimeToUTCSync,
  prefetchTimezone,
};
