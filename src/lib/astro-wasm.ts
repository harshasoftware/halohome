/**
 * Astrocartography WASM Wrapper
 * Provides a TypeScript interface to the Rust WASM module
 */

import type {
  BirthData,
  AstroCartographyResult,
  AstroCalculationOptions,
  PlanetaryLine,
  PlanetaryPosition,
  AspectLine,
  ParanLine,
  ZenithPoint,
  Planet,
  LineType,
  AspectType,
  GlobePoint,
  LocalSpaceLine,
  LocalSpaceResult,
  NatalChartResult,
  NatalPlanetPosition,
  RelocationChartResult,
  RelocationPlanetPosition,
  HouseSystem,
  ZodiacType,
} from './astro-types';

// Type for the WASM module exports
interface AstroCoreExports {
  calculate_all_lines: (
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    longitudeStep: number
  ) => WasmResult;
  calculate_all_lines_local: (
    birthLat: number,
    birthLng: number,
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    longitudeStep: number
  ) => WasmResultLocal;
  get_timezone_from_coords: (lat: number, lng: number) => string;
  get_timezone_offset_hours: (
    lat: number,
    lng: number,
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number
  ) => number;
  default: () => Promise<void>; // Init function
}

// Type for WASM result
interface WasmResult {
  julian_date: number;
  gmst: number;
  planetary_positions: WasmPosition[];
  planetary_lines: WasmLine[];
  aspect_lines: WasmAspectLine[];
  paran_lines: WasmParanLine[];
  zenith_points: WasmZenithPoint[];
  calculation_time: number;
  backend: string;
}

// Type for WASM result with timezone info (from calculate_all_lines_local)
interface WasmResultLocal extends WasmResult {
  timezone: string;
  timezone_offset_hours: number;
}

interface WasmPosition {
  planet: string;
  right_ascension: number;
  declination: number;
  ecliptic_longitude: number;
}

interface WasmLine {
  planet: string;
  line_type: string;
  points: { lat: number; lng: number }[];
  color: string;
  longitude: number | null;
}

interface WasmAspectLine {
  planet: string;
  angle: string;           // "ASC", "DSC", "MC", "IC"
  aspect_type: string;     // "trine+", "trine-", "sextile+", "sextile-", "square+", "square-"
  is_harmonious: boolean;  // true for trine/sextile, false for square
  points: { lat: number; lng: number }[];
  color: string;
}

interface WasmParanLine {
  planet1: string;
  angle1: string;
  planet2: string;
  angle2: string;
  latitude: number;
  longitude?: number;  // The longitude where the paran crossing occurs
  is_latitude_circle: boolean;
}

interface WasmZenithPoint {
  planet: string;
  latitude: number;      // = planet's declination (where planet is at zenith)
  longitude: number;     // = MC line longitude
  declination: number;   // planet's declination for reference
  max_altitude: number;  // always 90.0 at zenith
}

// Local Space types
interface WasmLocalSpaceLine {
  planet: string;
  azimuth: number;
  altitude: number;
  points: { lat: number; lng: number }[];
  direction: string;
  color: string;
}

interface WasmLocalSpaceResult {
  birth_latitude: number;
  birth_longitude: number;
  lines: WasmLocalSpaceLine[];
  julian_date: number;
  calculation_time: number;
}

// Natal Chart WASM types
interface WasmNatalChartResult {
  ascendant: number;
  midheaven: number;
  descendant: number;
  imum_coeli: number;
  house_cusps: number[];
  house_system: string;
  planets: WasmNatalPlanetPosition[];
  zodiac_type: string;
  ayanamsa: number | null;
  julian_date: number;
  local_sidereal_time: number;
  obliquity: number;
  calculation_time: number;
}

interface WasmNatalPlanetPosition {
  planet: string;
  longitude: number;
  longitude_sidereal: number | null;
  sign_index: number;
  sign_name: string;
  degree_in_sign: number;
  retrograde: boolean;
  house: number;
}

// Relocation Chart WASM types
interface WasmRelocationChartResult {
  original_lat: number;
  original_lng: number;
  relocated_lat: number;
  relocated_lng: number;
  original_ascendant: number;
  original_midheaven: number;
  original_descendant: number;
  original_ic: number;
  original_house_cusps: number[];
  relocated_ascendant: number;
  relocated_midheaven: number;
  relocated_descendant: number;
  relocated_ic: number;
  relocated_house_cusps: number[];
  ascendant_shift: number;
  midheaven_shift: number;
  planets: WasmRelocationPlanetPosition[];
  house_system: string;
  zodiac_type: string;
  ayanamsa: number | null;
  julian_date: number;
  calculation_time: number;
}

interface WasmRelocationPlanetPosition {
  planet: string;
  longitude: number;
  sign_name: string;
  degree_in_sign: number;
  original_house: number;
  relocated_house: number;
  house_changed: boolean;
}

// Type for the loaded WASM module
interface AstroCoreWasm {
  calculate_all_lines: (
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    longitudeStep: number
  ) => WasmResult;
  calculate_all_lines_local: (
    birthLat: number,
    birthLng: number,
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    longitudeStep: number
  ) => WasmResultLocal;
  calculate_local_space_lines: (
    birthLat: number,
    birthLng: number,
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    maxDistanceKm: number,
    stepKm: number
  ) => WasmLocalSpaceResult;
  calculate_natal_chart: (
    birthLat: number,
    birthLng: number,
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    houseSystem: string,
    useSidereal: boolean
  ) => WasmNatalChartResult;
  calculate_relocation_chart: (
    birthLat: number,
    birthLng: number,
    relocLat: number,
    relocLng: number,
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number,
    houseSystem: string,
    useSidereal: boolean
  ) => WasmRelocationChartResult;
  get_timezone_from_coords: (lat: number, lng: number) => string;
  get_timezone_offset_hours: (
    lat: number,
    lng: number,
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number,
    second: number
  ) => number;
  // Scout functions (C2 algorithm)
  scout_city: (
    cityName: string,
    country: string,
    cityLat: number,
    cityLon: number,
    linesJson: unknown,
    configJson: unknown
  ) => WasmCityScore;
  scout_cities_for_category: (
    citiesJson: unknown,
    linesJson: unknown,
    category: number,
    sortMode: number,
    configJson: unknown
  ) => WasmCityScore[];
}

// Scout WASM types - CityScore (for single city scouting)
export interface WasmCityScore {
  city_name: string;
  country: string;
  latitude: number;
  longitude: number;
  benefit_score: number;
  intensity_score: number;
  volatility_score: number;
  influence_count: number;
  min_distance_km: number;
  mixed_flag: boolean;
}

// CityRanking - returned by scout_cities_for_category
export interface WasmCityRanking {
  city_name: string;
  country: string;
  latitude: number;
  longitude: number;
  benefit_score: number;
  intensity_score: number;
  volatility_score: number;
  mixed_flag: boolean;
  top_influences: [string, string, number][]; // [planet, angle, distance_km]
  nature: string; // "beneficial" | "challenging" | "mixed"
}

// Scout enums matching Rust
export enum WasmLifeCategory {
  Career = 0,
  Love = 1,
  Health = 2,
  Home = 3,
  Wellbeing = 4,
  Wealth = 5,
}

export enum WasmSortMode {
  BenefitFirst = 0,
  IntensityFirst = 1,
  BalancedBenefit = 2,
}

export enum WasmKernelType {
  Linear = 0,
  Gaussian = 1,
  Exponential = 2,
}

// Scout scoring configuration
export interface WasmScoringConfig {
  kernel_type: WasmKernelType;
  kernel_parameter: number;
  max_distance_km: number;
}

// WASM module state
let wasmModule: AstroCoreWasm | null = null;
let wasmLoadPromise: Promise<AstroCoreWasm | null> | null = null;
let wasmSupported: boolean | null = null;
let wasmInitialized = false;
let threadPoolInitialized = false;

/**
 * Check if WASM is supported in this environment
 */
export function isWasmSupported(): boolean {
  if (wasmSupported !== null) return wasmSupported;

  try {
    // Check for WebAssembly support
    if (typeof WebAssembly === 'object' &&
        typeof WebAssembly.instantiate === 'function') {
      wasmSupported = true;
    } else {
      wasmSupported = false;
    }
  } catch {
    wasmSupported = false;
  }

  return wasmSupported;
}

/**
 * Load the WASM module
 */
export async function loadWasmModule(): Promise<AstroCoreWasm | null> {
  // Return cached module if already loaded
  if (wasmModule) return wasmModule;

  // Return existing promise if already loading
  if (wasmLoadPromise) return wasmLoadPromise;

  // Check WASM support
  if (!isWasmSupported()) {
    console.warn('WebAssembly not supported in this environment');
    return null;
  }

  wasmLoadPromise = (async () => {
    try {
      // Dynamic import of the WASM module
      const wasm = await import('../astro-core/pkg/astro_core');

      // Initialize WASM if not already done
      if (!wasmInitialized) {
        // Call the default export to initialize WASM
        if (typeof wasm.default === 'function') {
          await wasm.default();
        }
        wasmInitialized = true;
      }

      wasmModule = wasm as unknown as AstroCoreWasm;

      // Initialize thread pool for parallel processing if available
      // Requires: parallel feature enabled in Rust build + SharedArrayBuffer support
      if (!threadPoolInitialized && typeof (wasm as any).init_rayon_thread_pool === 'function') {
        if (typeof SharedArrayBuffer !== 'undefined') {
          try {
            // Use navigator.hardwareConcurrency for optimal thread count
            const numThreads = navigator.hardwareConcurrency || 4;
            await (wasm as any).init_rayon_thread_pool(numThreads);
            threadPoolInitialized = true;
            console.log(`WASM thread pool initialized with ${numThreads} threads`);
          } catch (poolError) {
            console.warn('Failed to initialize WASM thread pool (parallel disabled):', poolError);
          }
        } else {
          console.log('SharedArrayBuffer not available - parallel WASM disabled');
        }
      }

      const isParallel = typeof (wasm as any).is_parallel_available === 'function'
        ? (wasm as any).is_parallel_available()
        : false;
      console.log(`WASM module loaded successfully (parallel: ${isParallel})`);
      return wasmModule;
    } catch (error) {
      console.warn('Failed to load WASM module:', error);
      wasmSupported = false;
      return null;
    }
  })();

  return wasmLoadPromise;
}

/**
 * Check if WASM module is ready
 */
export function isWasmReady(): boolean {
  return wasmModule !== null;
}

/**
 * Convert WASM result to AstroCartographyResult
 */
function convertWasmResult(
  wasmResult: WasmResult,
  birthData: BirthData
): AstroCartographyResult {
  // Convert planetary positions
  const planetaryPositions: PlanetaryPosition[] = wasmResult.planetary_positions.map(pos => ({
    planet: pos.planet as Planet,
    rightAscension: pos.right_ascension,
    declination: pos.declination,
    eclipticLongitude: pos.ecliptic_longitude,
  }));

  // Convert planetary lines
  const planetaryLines: PlanetaryLine[] = wasmResult.planetary_lines.map(line => ({
    planet: line.planet as Planet,
    lineType: line.line_type as LineType,
    points: line.points.map(p => [p.lat, p.lng] as GlobePoint),
    color: line.color,
    longitude: line.longitude ?? undefined,
  }));

  // Convert aspect lines (planet to angle: e.g., "Mars trine ASC")
  const aspectLines: AspectLine[] = (wasmResult.aspect_lines || []).map(line => {
    // Parse aspect_type which is like "trine+", "sextile-", "square+"
    const aspectTypeBase = line.aspect_type.replace(/[+-]$/, '') as AspectType;
    const direction = line.aspect_type.endsWith('+') ? '+' : '-';

    return {
      planet: line.planet as Planet,
      angle: line.angle as LineType,
      aspectType: aspectTypeBase,
      direction: direction as '+' | '-',
      isHarmonious: line.is_harmonious,
      points: line.points.map(p => [p.lat, p.lng] as GlobePoint),
      color: line.color,
    };
  });

  // Convert paran lines
  const paranLines: ParanLine[] = (wasmResult.paran_lines || []).map(line => ({
    planet1: line.planet1 as Planet,
    angle1: line.angle1 as LineType,
    planet2: line.planet2 as Planet,
    angle2: line.angle2 as LineType,
    latitude: line.latitude,
    longitude: line.longitude,  // Now calculated in WASM
    isLatitudeCircle: line.is_latitude_circle,
  }));

  // Convert zenith points (where planet is directly overhead on MC line)
  const zenithPoints: ZenithPoint[] = (wasmResult.zenith_points || []).map(point => ({
    planet: point.planet as Planet,
    latitude: point.latitude,
    longitude: point.longitude,
    declination: point.declination,
    maxAltitude: point.max_altitude,
  }));

  return {
    birthData,
    julianDate: wasmResult.julian_date,
    gmst: wasmResult.gmst,
    planetaryPositions,
    planetaryLines,
    aspectLines,
    paranLines,
    zenithPoints,
    calculationBackend: 'wasm',
    calculationTime: wasmResult.calculation_time,
  };
}

/**
 * Calculate astrocartography using WASM
 * Now supports local time calculation with proper timezone handling via chrono-tz
 */
export async function calculateWithWasm(
  birthData: BirthData,
  options: AstroCalculationOptions
): Promise<AstroCartographyResult | null> {
  const wasm = await loadWasmModule();
  if (!wasm) return null;

  try {
    const date = birthData.date;
    const longitudeStep = options.longitudeStep || 1;

    let wasmResult: WasmResult;

    // If we have local time data (birthDate, birthTime strings) and birth coordinates,
    // use the new calculate_all_lines_local function which handles timezone conversion in Rust
    if (birthData.localDate && birthData.localTime &&
        birthData.lat !== undefined && birthData.lng !== undefined) {
      // Parse local date and time strings
      const [year, month, day] = birthData.localDate.split('-').map(Number);
      const [hour, minute] = birthData.localTime.split(':').map(Number);
      const second = 0;

      console.log(`WASM: Using calculate_all_lines_local with coordinates (${birthData.lat}, ${birthData.lng})`);
      console.log(`WASM: Local time ${year}-${month}-${day} ${hour}:${minute}:${second}`);

      const result = wasm.calculate_all_lines_local(
        birthData.lat,
        birthData.lng,
        year,
        month,
        day,
        hour,
        minute,
        second,
        longitudeStep
      );

      console.log(`WASM: Timezone detected: ${result.timezone} (UTC${result.timezone_offset_hours >= 0 ? '+' : ''}${result.timezone_offset_hours})`);
      wasmResult = result;
    } else {
      // Fallback: use UTC-based calculation (date should already be converted to UTC)
      console.log('WASM: Using calculate_all_lines with pre-converted UTC date');
      wasmResult = wasm.calculate_all_lines(
        date.getUTCFullYear(),
        date.getUTCMonth() + 1,
        date.getUTCDate(),
        date.getUTCHours(),
        date.getUTCMinutes(),
        date.getUTCSeconds(),
        longitudeStep
      );
    }

    return convertWasmResult(wasmResult, birthData);
  } catch (error) {
    console.error('WASM calculation error:', error);
    return null;
  }
}

/**
 * Get timezone name from coordinates using WASM (chrono-tz + tzf-rs)
 */
export async function getTimezoneFromCoords(lat: number, lng: number): Promise<string | null> {
  const wasm = await loadWasmModule();
  if (!wasm) return null;

  try {
    return wasm.get_timezone_from_coords(lat, lng);
  } catch (error) {
    console.error('WASM getTimezoneFromCoords error:', error);
    return null;
  }
}

/**
 * Get timezone offset in hours from coordinates at a specific local time using WASM
 */
export async function getTimezoneOffsetHours(
  lat: number,
  lng: number,
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  second: number
): Promise<number | null> {
  const wasm = await loadWasmModule();
  if (!wasm) return null;

  try {
    return wasm.get_timezone_offset_hours(lat, lng, year, month, day, hour, minute, second);
  } catch (error) {
    console.error('WASM getTimezoneOffsetHours error:', error);
    return null;
  }
}

/**
 * Calculate Local Space lines using WASM
 * Local Space lines radiate from birth location based on planetary azimuths
 */
export async function calculateLocalSpaceWithWasm(
  birthData: BirthData,
  maxDistanceKm: number = 15000,
  stepKm: number = 200
): Promise<LocalSpaceResult | null> {
  const wasm = await loadWasmModule();
  if (!wasm) return null;

  // Require local time data and coordinates
  if (!birthData.localDate || !birthData.localTime ||
      birthData.lat === undefined || birthData.lng === undefined) {
    console.warn('Local Space calculation requires localDate, localTime, lat, and lng');
    return null;
  }

  try {
    const [year, month, day] = birthData.localDate.split('-').map(Number);
    const [hour, minute] = birthData.localTime.split(':').map(Number);
    const second = 0;

    console.log(`WASM: Calculating Local Space lines for (${birthData.lat}, ${birthData.lng})`);

    const result = wasm.calculate_local_space_lines(
      birthData.lat,
      birthData.lng,
      year,
      month,
      day,
      hour,
      minute,
      second,
      maxDistanceKm,
      stepKm
    );

    // Convert to TypeScript types
    const lines: LocalSpaceLine[] = result.lines.map(line => ({
      planet: line.planet as Planet,
      azimuth: line.azimuth,
      altitude: line.altitude,
      points: line.points.map(p => [p.lat, p.lng] as GlobePoint),
      direction: line.direction,
      color: line.color,
    }));

    return {
      birthLocation: {
        lat: result.birth_latitude,
        lng: result.birth_longitude,
      },
      lines,
      julianDate: result.julian_date,
      calculationTime: result.calculation_time,
    };
  } catch (error) {
    console.error('WASM Local Space calculation error:', error);
    return null;
  }
}

/**
 * Calculate natal chart with house cusps using WASM
 * Supports multiple house systems and tropical/sidereal zodiac
 */
export async function calculateNatalChartWithWasm(
  birthData: BirthData,
  houseSystem: HouseSystem = 'placidus',
  useSidereal: boolean = false
): Promise<NatalChartResult | null> {
  const wasm = await loadWasmModule();
  if (!wasm) return null;

  // Require local time data and coordinates
  if (!birthData.localDate || !birthData.localTime ||
      birthData.lat === undefined || birthData.lng === undefined) {
    console.warn('Natal chart calculation requires localDate, localTime, lat, and lng');
    return null;
  }

  try {
    const [year, month, day] = birthData.localDate.split('-').map(Number);
    const [hour, minute] = birthData.localTime.split(':').map(Number);
    const second = 0;

    console.log(`WASM: Calculating natal chart for (${birthData.lat}, ${birthData.lng})`);
    console.log(`WASM: House system: ${houseSystem}, Sidereal: ${useSidereal}`);

    const result = wasm.calculate_natal_chart(
      birthData.lat,
      birthData.lng,
      year,
      month,
      day,
      hour,
      minute,
      second,
      houseSystem,
      useSidereal
    );

    // Convert to TypeScript types
    const planets: NatalPlanetPosition[] = result.planets.map(p => ({
      planet: p.planet as Planet,
      longitude: p.longitude,
      longitudeSidereal: p.longitude_sidereal ?? undefined,
      signIndex: p.sign_index,
      signName: p.sign_name,
      degreeInSign: p.degree_in_sign,
      retrograde: p.retrograde,
      house: p.house,
    }));

    // Debug: Log ASC value to verify WASM calculation
    const ascSign = Math.floor(result.ascendant / 30);
    const signs = ['Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo', 'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'];
    console.log(`[WASM] ASC: ${result.ascendant.toFixed(2)}° = ${signs[ascSign]} (${result.ascendant % 30}°)`);
    console.log(`[WASM] House cusps:`, result.house_cusps?.map((c: number, i: number) => `H${i+1}: ${c.toFixed(1)}°`));

    return {
      ascendant: result.ascendant,
      midheaven: result.midheaven,
      descendant: result.descendant,
      imumCoeli: result.imum_coeli,
      houseCusps: result.house_cusps,
      houseSystem: result.house_system as HouseSystem,
      planets,
      zodiacType: result.zodiac_type as ZodiacType,
      ayanamsa: result.ayanamsa ?? undefined,
      julianDate: result.julian_date,
      localSiderealTime: result.local_sidereal_time,
      obliquity: result.obliquity,
      calculationTime: result.calculation_time,
    };
  } catch (error) {
    console.error('WASM natal chart calculation error:', error);
    return null;
  }
}

/**
 * Calculate relocation chart using WASM
 * Compares natal chart at birth location vs relocated location
 * Shows how ASC, MC, and house placements shift
 */
export async function calculateRelocationChartWithWasm(
  birthData: BirthData,
  relocLat: number,
  relocLng: number,
  houseSystem: HouseSystem = 'placidus',
  useSidereal: boolean = false
): Promise<RelocationChartResult | null> {
  const wasm = await loadWasmModule();
  if (!wasm) return null;

  // Require local time data and coordinates
  if (!birthData.localDate || !birthData.localTime ||
      birthData.lat === undefined || birthData.lng === undefined) {
    console.warn('Relocation chart calculation requires localDate, localTime, lat, and lng');
    return null;
  }

  try {
    const [year, month, day] = birthData.localDate.split('-').map(Number);
    const [hour, minute] = birthData.localTime.split(':').map(Number);
    const second = 0;

    console.log(`WASM: Calculating relocation chart`);
    console.log(`WASM: Birth location: (${birthData.lat}, ${birthData.lng})`);
    console.log(`WASM: Relocation: (${relocLat}, ${relocLng})`);
    console.log(`WASM: House system: ${houseSystem}, Sidereal: ${useSidereal}`);

    const result = wasm.calculate_relocation_chart(
      birthData.lat,
      birthData.lng,
      relocLat,
      relocLng,
      year,
      month,
      day,
      hour,
      minute,
      second,
      houseSystem,
      useSidereal
    );

    // Convert to TypeScript types (snake_case -> camelCase)
    const planets: RelocationPlanetPosition[] = result.planets.map(p => ({
      planet: p.planet,
      longitude: p.longitude,
      signName: p.sign_name,
      degreeInSign: p.degree_in_sign,
      originalHouse: p.original_house,
      relocatedHouse: p.relocated_house,
      houseChanged: p.house_changed,
    }));

    // Debug logging
    console.log(`[WASM Relocation] ASC shift: ${result.ascendant_shift.toFixed(2)}°`);
    console.log(`[WASM Relocation] MC shift: ${result.midheaven_shift.toFixed(2)}°`);
    const changedPlanets = planets.filter(p => p.houseChanged);
    if (changedPlanets.length > 0) {
      console.log(`[WASM Relocation] House changes:`, changedPlanets.map(p =>
        `${p.planet}: H${p.originalHouse} → H${p.relocatedHouse}`
      ));
    }

    return {
      originalLat: result.original_lat,
      originalLng: result.original_lng,
      relocatedLat: result.relocated_lat,
      relocatedLng: result.relocated_lng,
      originalAscendant: result.original_ascendant,
      originalMidheaven: result.original_midheaven,
      originalDescendant: result.original_descendant,
      originalIc: result.original_ic,
      originalHouseCusps: result.original_house_cusps,
      relocatedAscendant: result.relocated_ascendant,
      relocatedMidheaven: result.relocated_midheaven,
      relocatedDescendant: result.relocated_descendant,
      relocatedIc: result.relocated_ic,
      relocatedHouseCusps: result.relocated_house_cusps,
      ascendantShift: result.ascendant_shift,
      midheavenShift: result.midheaven_shift,
      planets,
      houseSystem: result.house_system as HouseSystem,
      zodiacType: result.zodiac_type as ZodiacType,
      ayanamsa: result.ayanamsa ?? undefined,
      julianDate: result.julian_date,
      calculationTime: result.calculation_time,
    };
  } catch (error) {
    console.error('WASM relocation chart calculation error:', error);
    return null;
  }
}

// ============================================
// Scout Location Functions (C2 Algorithm)
// ============================================

/**
 * Get line rating based on planet and angle
 * Rating 5 = most beneficial, 1 = most challenging
 * Based on traditional astrocartography interpretations
 */
function getLineRating(planet: string, angle: string): number {
  // Define ratings for each planet+angle combination
  const ratings: Record<string, Record<string, number>> = {
    Sun: { MC: 5, ASC: 5, DSC: 4, IC: 4 },
    Moon: { MC: 3, ASC: 4, DSC: 4, IC: 5 },
    Mercury: { MC: 4, ASC: 3, DSC: 3, IC: 3 },
    Venus: { MC: 4, ASC: 5, DSC: 5, IC: 5 },
    Mars: { MC: 4, ASC: 3, DSC: 2, IC: 2 },
    Jupiter: { MC: 5, ASC: 5, DSC: 5, IC: 5 },
    Saturn: { MC: 3, ASC: 2, DSC: 2, IC: 2 },
    Uranus: { MC: 2, ASC: 2, DSC: 2, IC: 1 },
    Neptune: { MC: 2, ASC: 3, DSC: 3, IC: 2 },
    Pluto: { MC: 3, ASC: 2, DSC: 2, IC: 1 },
    NorthNode: { MC: 4, ASC: 4, DSC: 4, IC: 4 },
    SouthNode: { MC: 2, ASC: 2, DSC: 2, IC: 2 },
    Chiron: { MC: 3, ASC: 3, DSC: 3, IC: 3 },
  };

  return ratings[planet]?.[angle] ?? 3; // Default to neutral (3)
}

/**
 * Map TypeScript AspectType to WASM AspectType enum value
 */
function mapAspectType(aspectType: AspectType): string {
  // The Rust AspectType enum values
  const aspectMap: Record<AspectType, string> = {
    conjunction: 'Conjunction',
    trine: 'Trine',
    sextile: 'Sextile',
    square: 'Square',
    quincunx: 'Quincunx',
    opposition: 'Opposition',
    sesquisquare: 'Sesquisquare',
  };
  return aspectMap[aspectType] ?? 'Conjunction';
}

/**
 * Convert planetary lines to format expected by WASM scout functions
 *
 * WASM expects Vec<LineData> where LineData has:
 * - planet: String
 * - angle: String (MC, ASC, DSC, IC)
 * - rating: u8 (1-5)
 * - aspect: Option<AspectType>
 * - points: Vec<(f64, f64)> as tuples [lat, lon]
 */
function convertLinesToWasmFormat(
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[]
): unknown[] {
  const lines: unknown[] = [];

  // Convert planetary lines (primary lines like Sun MC, Moon ASC, etc.)
  for (const line of planetaryLines) {
    lines.push({
      planet: line.planet,
      angle: line.lineType, // lineType is MC, ASC, DSC, or IC
      rating: getLineRating(line.planet, line.lineType),
      aspect: null, // Primary lines have no aspect modifier
      points: line.points.map(([lat, lng]) => [lat, lng]), // Convert to tuples
    });
  }

  // Convert aspect lines (e.g., Sun trine MC)
  for (const line of aspectLines) {
    // For aspect lines, adjust rating based on aspect type
    const baseRating = getLineRating(line.planet, line.angle);
    let adjustedRating = baseRating;

    // Adjust rating based on aspect harmony
    if (line.isHarmonious) {
      // Trine/sextile slightly boost beneficial ratings
      adjustedRating = Math.min(5, baseRating + 1);
    } else {
      // Square reduces rating
      adjustedRating = Math.max(1, baseRating - 1);
    }

    lines.push({
      planet: line.planet,
      angle: line.angle, // angle is MC, ASC, DSC, or IC
      rating: adjustedRating,
      aspect: mapAspectType(line.aspectType),
      points: line.points.map(([lat, lng]) => [lat, lng]), // Convert to tuples
    });
  }

  return lines;
}

/**
 * Get default scoring config for scout functions
 */
export function getDefaultScoringConfig(): WasmScoringConfig {
  return {
    kernel_type: WasmKernelType.Gaussian,
    kernel_parameter: 150, // sigma in km for Gaussian
    max_distance_km: 500,
  };
}

/**
 * Scout a single city for planetary line influences using WASM C2 algorithm
 */
export async function scoutCityWithWasm(
  cityName: string,
  country: string,
  lat: number,
  lng: number,
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  config?: Partial<WasmScoringConfig>
): Promise<WasmCityScore | null> {
  const wasm = await loadWasmModule();
  if (!wasm) return null;

  try {
    const linesJson = convertLinesToWasmFormat(planetaryLines, aspectLines);
    const configJson = { ...getDefaultScoringConfig(), ...config };

    const result = wasm.scout_city(
      cityName,
      country,
      lat,
      lng,
      linesJson,
      configJson
    );

    return result;
  } catch (error) {
    console.error('WASM scout_city error:', error);
    return null;
  }
}

/**
 * Scout multiple cities for a specific life category using WASM C2 algorithm
 * Returns CityRanking[] with top_influences and nature fields
 */
export async function scoutCitiesForCategoryWithWasm(
  cities: Array<{ name: string; country: string; lat: number; lng: number }>,
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  category: WasmLifeCategory,
  sortMode: WasmSortMode = WasmSortMode.BalancedBenefit,
  config?: Partial<WasmScoringConfig>
): Promise<WasmCityRanking[] | null> {
  const wasm = await loadWasmModule();
  if (!wasm) return null;

  try {
    const citiesJson = cities.map(c => ({
      name: c.name,
      country: c.country,
      lat: c.lat,
      lon: c.lng,  // WASM expects 'lon', not 'lng'
    }));
    const linesJson = convertLinesToWasmFormat(planetaryLines, aspectLines);
    const configJson = { ...getDefaultScoringConfig(), ...config };

    const result = wasm.scout_cities_for_category(
      citiesJson,
      linesJson,
      category,
      sortMode,
      configJson
    );

    return result;
  } catch (error) {
    console.error('WASM scout_cities_for_category error:', error);
    return null;
  }
}

// ============================================================================
// Prewarm Utilities - Load WASM and data in parallel for faster startup
// ============================================================================

let prewarmPromise: Promise<{ wasm: boolean; cities: boolean; worker: boolean }> | null = null;

/**
 * Prewarm all resources needed for scout/globe functionality.
 * Loads WASM module, cities data, AND initializes the scout worker in parallel.
 *
 * Call this early (e.g., when user navigates to globe page or enters birth data)
 * to minimize wait time when they actually trigger a scout operation.
 *
 * The scout worker prewarm kicks off:
 * - Worker creation and message channel setup
 * - Cities data fetch inside worker (3MB JSON)
 * - WASM module loading inside worker
 * - Rayon thread pool initialization (background, non-blocking)
 *
 * Safe to call multiple times - results are cached.
 */
export async function prewarmScoutResources(): Promise<{ wasm: boolean; cities: boolean; worker: boolean }> {
  // Return cached result if already prewarmed
  if (prewarmPromise) return prewarmPromise;

  prewarmPromise = (async () => {
    const startTime = performance.now();
    console.log('[Prewarm] Starting parallel resource loading (WASM, cities, worker)...');

    // Load WASM, cities data, and initialize scout worker in parallel
    const [wasmResult, citiesResult, workerResult] = await Promise.allSettled([
      loadWasmModule(),
      // Dynamic import to avoid bundling cities loader in astro-wasm
      import('@/data/geonames-cities').then(m => m.loadCities()),
      // Prewarm the scout worker (loads its own WASM + cities + Rayon thread pool)
      import('@/features/globe/services/scoutWorkerPool').then(m => {
        m.prewarmScoutWorker();
        return true;
      }),
    ]);

    const wasmSuccess = wasmResult.status === 'fulfilled' && wasmResult.value !== null;
    const citiesSuccess = citiesResult.status === 'fulfilled';
    const workerSuccess = workerResult.status === 'fulfilled';

    const elapsed = performance.now() - startTime;
    console.log(`[Prewarm] Complete in ${elapsed.toFixed(0)}ms - WASM: ${wasmSuccess}, Cities: ${citiesSuccess}, Worker: ${workerSuccess}`);

    // Log failures for debugging
    if (wasmResult.status === 'rejected') {
      console.warn('[Prewarm] WASM load failed:', wasmResult.reason);
    }
    if (citiesResult.status === 'rejected') {
      console.warn('[Prewarm] Cities load failed:', citiesResult.reason);
    }
    if (workerResult.status === 'rejected') {
      console.warn('[Prewarm] Worker prewarm failed:', workerResult.reason);
    }

    return { wasm: wasmSuccess, cities: citiesSuccess, worker: workerSuccess };
  })();

  return prewarmPromise;
}

/**
 * Check if resources have been prewarmed
 */
export function isPrewarmed(): boolean {
  return prewarmPromise !== null;
}

export default {
  isWasmSupported,
  loadWasmModule,
  isWasmReady,
  calculateWithWasm,
  calculateLocalSpaceWithWasm,
  calculateNatalChartWithWasm,
  calculateRelocationChartWithWasm,
  getTimezoneFromCoords,
  getTimezoneOffsetHours,
  scoutCityWithWasm,
  scoutCitiesForCategoryWithWasm,
  getDefaultScoringConfig,
  prewarmScoutResources,
  isPrewarmed,
  WasmLifeCategory,
  WasmSortMode,
  WasmKernelType,
};
