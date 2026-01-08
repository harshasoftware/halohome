/* tslint:disable */
/* eslint-disable */

export class GlobePoint {
  free(): void;
  [Symbol.dispose](): void;
  constructor(lat: number, lng: number);
  lat: number;
  lng: number;
}

export enum LineType {
  MC = 0,
  IC = 1,
  ASC = 2,
  DSC = 3,
}

export enum Planet {
  Sun = 0,
  Moon = 1,
  Mercury = 2,
  Venus = 3,
  Mars = 4,
  Jupiter = 5,
  Saturn = 6,
  Uranus = 7,
  Neptune = 8,
  Pluto = 9,
  Chiron = 10,
  NorthNode = 11,
}

export class PlanetaryPosition {
  free(): void;
  [Symbol.dispose](): void;
  constructor(planet: Planet, ra: number, dec: number, ecl_lon: number);
  planet: Planet;
  right_ascension: number;
  declination: number;
  ecliptic_longitude: number;
}

/**
 * Calculate all planetary lines for a given birth time
 * Returns a JavaScript object with the results
 */
export function calculate_all_lines(year: number, month: number, day: number, hour: number, minute: number, second: number, longitude_step: number): any;

/**
 * Calculate all planetary lines for a given LOCAL birth time and birth location
 * Automatically handles timezone conversion using chrono-tz
 * This is the preferred function to call from JavaScript
 */
export function calculate_all_lines_local(birth_lat: number, birth_lng: number, year: number, month: number, day: number, hour: number, minute: number, second: number, longitude_step: number): any;

/**
 * Calculate Delta T (difference between TT and UT1) in seconds
 * Based on polynomial expressions from USNO/IERS
 */
export function calculate_delta_t(year: number, month: number): number;

/**
 * Calculate Greenwich Mean Sidereal Time (GMST) in radians
 */
export function calculate_gmst(julian_date: number): number;

/**
 * Calculate latitude for ASC/DSC line at a given longitude
 */
export function calculate_horizon_latitude(right_ascension: number, declination: number, gmst: number, longitude_deg: number): number | undefined;

/**
 * Calculate IC line longitude for a planet
 */
export function calculate_ic_longitude(right_ascension: number, gmst: number): number;

/**
 * Calculate Local Space lines for a given birth time and location
 * Local Space lines radiate outward from the birth location based on planetary azimuths
 */
export function calculate_local_space_lines(birth_lat: number, birth_lng: number, year: number, month: number, day: number, hour: number, minute: number, second: number, max_distance_km: number, step_km: number): any;

/**
 * Calculate Local Sidereal Time in radians
 */
export function calculate_lst(gmst: number, longitude_deg: number): number;

/**
 * Calculate MC line longitude for a planet
 */
export function calculate_mc_longitude(right_ascension: number, gmst: number): number;

/**
 * Calculate complete natal chart with house cusps
 */
export function calculate_natal_chart(birth_lat: number, birth_lng: number, year: number, month: number, day: number, hour: number, minute: number, second: number, house_system: string, use_sidereal: boolean): any;

/**
 * Calculate planetary position for a given planet and Julian Date
 * Uses VSOP87 theory for accurate positions
 * Includes nutation and aberration corrections for maximum accuracy
 */
export function calculate_planetary_position(planet: Planet, julian_date: number): PlanetaryPosition;

/**
 * Get timezone name from coordinates using tzf-rs
 */
export function get_timezone_from_coords(lat: number, lng: number): string;

/**
 * Get timezone offset in hours from coordinates at a specific time
 */
export function get_timezone_offset_hours(lat: number, lng: number, year: number, month: number, day: number, hour: number, minute: number, second: number): number;

/**
 * Check if a point is on the ASC (rising) side
 */
export function is_rising(right_ascension: number, gmst: number, longitude_deg: number): boolean;

/**
 * Convert local time at coordinates to UTC Julian Date
 */
export function local_to_utc_julian_date(lat: number, lng: number, year: number, month: number, day: number, hour: number, minute: number, second: number): number;

/**
 * Convert year, month, day, hour, minute, second to Julian Date
 */
export function to_julian_date(year: number, month: number, day: number, hour: number, minute: number, second: number): number;

/**
 * Convert Julian Date (UT) to Julian Ephemeris Date (TT)
 */
export function ut_to_tt(jd_ut: number, year: number, month: number): number;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_get_globepoint_lat: (a: number) => number;
  readonly __wbg_get_globepoint_lng: (a: number) => number;
  readonly __wbg_get_planetaryposition_ecliptic_longitude: (a: number) => number;
  readonly __wbg_get_planetaryposition_planet: (a: number) => number;
  readonly __wbg_globepoint_free: (a: number, b: number) => void;
  readonly __wbg_planetaryposition_free: (a: number, b: number) => void;
  readonly __wbg_set_globepoint_lat: (a: number, b: number) => void;
  readonly __wbg_set_globepoint_lng: (a: number, b: number) => void;
  readonly __wbg_set_planetaryposition_ecliptic_longitude: (a: number, b: number) => void;
  readonly __wbg_set_planetaryposition_planet: (a: number, b: number) => void;
  readonly calculate_all_lines: (a: number, b: number, c: number, d: number, e: number, f: number, g: number) => any;
  readonly calculate_all_lines_local: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number) => any;
  readonly calculate_delta_t: (a: number, b: number) => number;
  readonly calculate_gmst: (a: number) => number;
  readonly calculate_horizon_latitude: (a: number, b: number, c: number, d: number) => [number, number];
  readonly calculate_ic_longitude: (a: number, b: number) => number;
  readonly calculate_local_space_lines: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number) => any;
  readonly calculate_mc_longitude: (a: number, b: number) => number;
  readonly calculate_natal_chart: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number, i: number, j: number, k: number) => any;
  readonly calculate_planetary_position: (a: number, b: number) => number;
  readonly get_timezone_from_coords: (a: number, b: number) => [number, number];
  readonly get_timezone_offset_hours: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
  readonly globepoint_new: (a: number, b: number) => number;
  readonly is_rising: (a: number, b: number, c: number) => number;
  readonly local_to_utc_julian_date: (a: number, b: number, c: number, d: number, e: number, f: number, g: number, h: number) => number;
  readonly planetaryposition_new: (a: number, b: number, c: number, d: number) => number;
  readonly to_julian_date: (a: number, b: number, c: number, d: number, e: number, f: number) => number;
  readonly ut_to_tt: (a: number, b: number, c: number) => number;
  readonly calculate_lst: (a: number, b: number) => number;
  readonly __wbg_set_planetaryposition_declination: (a: number, b: number) => void;
  readonly __wbg_set_planetaryposition_right_ascension: (a: number, b: number) => void;
  readonly __wbg_get_planetaryposition_declination: (a: number) => number;
  readonly __wbg_get_planetaryposition_right_ascension: (a: number) => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_externrefs: WebAssembly.Table;
  readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
*
* @returns {InitOutput}
*/
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
