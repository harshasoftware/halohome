// Vite dev server refuses to statically import JS modules from /public.
// We lazy-load the worker helpers at runtime and opt out of Vite import analysis.
let __rayonStartWorkers;
async function __getRayonStartWorkers() {
    if (!__rayonStartWorkers) {
        // Use a computed specifier so Vite doesn't try to treat /public files as ESM imports in dev.
        const workerHelpersUrl = new URL('/wasm/workerHelpers.js', globalThis.location?.href ?? 'http://localhost').toString();
        const mod = await import(/* @vite-ignore */ workerHelpersUrl);
        __rayonStartWorkers = mod.startWorkers;
    }
    return __rayonStartWorkers;
}

let wasm;

function addToExternrefTable0(obj) {
    const idx = wasm.__externref_table_alloc();
    wasm.__wbindgen_externrefs.set(idx, obj);
    return idx;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches && builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer !== wasm.memory.buffer) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.buffer !== wasm.memory.buffer) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        const idx = addToExternrefTable0(e);
        wasm.__wbindgen_exn_store(idx);
    }
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function takeFromExternrefTable0(idx) {
    const value = wasm.__wbindgen_externrefs.get(idx);
    wasm.__externref_table_dealloc(idx);
    return value;
}

let cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : undefined);
if (cachedTextDecoder) cachedTextDecoder.decode();

const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().slice(ptr, ptr + len));
}

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder() : undefined);

if (cachedTextEncoder) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    }
}

let WASM_VECTOR_LEN = 0;

const CityScoreFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_cityscore_free(ptr >>> 0, 1));

const GlobePointFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_globepoint_free(ptr >>> 0, 1));

const PlanetaryPositionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_planetaryposition_free(ptr >>> 0, 1));

const ScoringConfigFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_scoringconfig_free(ptr >>> 0, 1));

/**
 * Aspect types for planetary aspects
 * @enum {0 | 1 | 2 | 3 | 4 | 5 | 6}
 */
export const AspectType = Object.freeze({
    Conjunction: 0, "0": "Conjunction",
    Trine: 1, "1": "Trine",
    Sextile: 2, "2": "Sextile",
    Square: 3, "3": "Square",
    Quincunx: 4, "4": "Quincunx",
    Opposition: 5, "5": "Opposition",
    Sesquisquare: 6, "6": "Sesquisquare",
});

/**
 * Final score for a city
 */
export class CityScore {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        CityScoreFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_cityscore_free(ptr, 0);
    }
    /**
     * @returns {boolean}
     */
    get mixed_flag() {
        const ret = wasm.cityscore_mixed_flag(this.__wbg_ptr);
        return ret !== 0;
    }
    /**
     * @returns {number}
     */
    get benefit_score() {
        const ret = wasm.cityscore_benefit_score(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get influence_count() {
        const ret = wasm.cityscore_influence_count(this.__wbg_ptr);
        return ret >>> 0;
    }
    /**
     * @returns {number}
     */
    get intensity_score() {
        const ret = wasm.cityscore_intensity_score(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get min_distance_km() {
        const ret = wasm.cityscore_min_distance_km(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get volatility_score() {
        const ret = wasm.cityscore_volatility_score(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string}
     */
    get country() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.cityscore_country(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get latitude() {
        const ret = wasm.cityscore_latitude(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {string}
     */
    get city_name() {
        let deferred1_0;
        let deferred1_1;
        try {
            const ret = wasm.cityscore_city_name(this.__wbg_ptr);
            deferred1_0 = ret[0];
            deferred1_1 = ret[1];
            return getStringFromWasm0(ret[0], ret[1]);
        } finally {
            wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
        }
    }
    /**
     * @returns {number}
     */
    get longitude() {
        const ret = wasm.cityscore_longitude(this.__wbg_ptr);
        return ret;
    }
}
if (Symbol.dispose) CityScore.prototype[Symbol.dispose] = CityScore.prototype.free;

export class GlobePoint {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        GlobePointFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_globepoint_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get lat() {
        const ret = wasm.__wbg_get_globepoint_lat(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set lat(arg0) {
        wasm.__wbg_set_globepoint_lat(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get lng() {
        const ret = wasm.__wbg_get_globepoint_lng(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set lng(arg0) {
        wasm.__wbg_set_globepoint_lng(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} lat
     * @param {number} lng
     */
    constructor(lat, lng) {
        const ret = wasm.globepoint_new(lat, lng);
        this.__wbg_ptr = ret >>> 0;
        GlobePointFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) GlobePoint.prototype[Symbol.dispose] = GlobePoint.prototype.free;

/**
 * Distance decay kernel type
 * @enum {0 | 1 | 2}
 */
export const KernelType = Object.freeze({
    Linear: 0, "0": "Linear",
    Gaussian: 1, "1": "Gaussian",
    Exponential: 2, "2": "Exponential",
});

/**
 * Life categories for scouting
 * @enum {0 | 1 | 2 | 3 | 4 | 5}
 */
export const LifeCategory = Object.freeze({
    Career: 0, "0": "Career",
    Love: 1, "1": "Love",
    Health: 2, "2": "Health",
    Home: 3, "3": "Home",
    Wellbeing: 4, "4": "Wellbeing",
    Wealth: 5, "5": "Wealth",
});

/**
 * @enum {0 | 1 | 2 | 3}
 */
export const LineType = Object.freeze({
    MC: 0, "0": "MC",
    IC: 1, "1": "IC",
    ASC: 2, "2": "ASC",
    DSC: 3, "3": "DSC",
});

/**
 * @enum {0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11}
 */
export const Planet = Object.freeze({
    Sun: 0, "0": "Sun",
    Moon: 1, "1": "Moon",
    Mercury: 2, "2": "Mercury",
    Venus: 3, "3": "Venus",
    Mars: 4, "4": "Mars",
    Jupiter: 5, "5": "Jupiter",
    Saturn: 6, "6": "Saturn",
    Uranus: 7, "7": "Uranus",
    Neptune: 8, "8": "Neptune",
    Pluto: 9, "9": "Pluto",
    Chiron: 10, "10": "Chiron",
    NorthNode: 11, "11": "NorthNode",
});

export class PlanetaryPosition {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(PlanetaryPosition.prototype);
        obj.__wbg_ptr = ptr;
        PlanetaryPositionFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PlanetaryPositionFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_planetaryposition_free(ptr, 0);
    }
    /**
     * @returns {Planet}
     */
    get planet() {
        const ret = wasm.__wbg_get_planetaryposition_planet(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {Planet} arg0
     */
    set planet(arg0) {
        wasm.__wbg_set_planetaryposition_planet(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get right_ascension() {
        const ret = wasm.__wbg_get_globepoint_lat(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set right_ascension(arg0) {
        wasm.__wbg_set_globepoint_lat(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get declination() {
        const ret = wasm.__wbg_get_globepoint_lng(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set declination(arg0) {
        wasm.__wbg_set_globepoint_lng(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get ecliptic_longitude() {
        const ret = wasm.__wbg_get_planetaryposition_ecliptic_longitude(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set ecliptic_longitude(arg0) {
        wasm.__wbg_set_planetaryposition_ecliptic_longitude(this.__wbg_ptr, arg0);
    }
    /**
     * @param {Planet} planet
     * @param {number} ra
     * @param {number} dec
     * @param {number} ecl_lon
     */
    constructor(planet, ra, dec, ecl_lon) {
        const ret = wasm.planetaryposition_new(planet, ra, dec, ecl_lon);
        this.__wbg_ptr = ret >>> 0;
        PlanetaryPositionFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) PlanetaryPosition.prototype[Symbol.dispose] = PlanetaryPosition.prototype.free;

/**
 * Configuration for scoring algorithm
 */
export class ScoringConfig {
    static __wrap(ptr) {
        ptr = ptr >>> 0;
        const obj = Object.create(ScoringConfig.prototype);
        obj.__wbg_ptr = ptr;
        ScoringConfigFinalization.register(obj, obj.__wbg_ptr, obj);
        return obj;
    }
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        ScoringConfigFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_scoringconfig_free(ptr, 0);
    }
    /**
     * @returns {KernelType}
     */
    get kernel_type() {
        const ret = wasm.__wbg_get_scoringconfig_kernel_type(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {KernelType} arg0
     */
    set kernel_type(arg0) {
        wasm.__wbg_set_scoringconfig_kernel_type(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get kernel_parameter() {
        const ret = wasm.__wbg_get_scoringconfig_kernel_parameter(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set kernel_parameter(arg0) {
        wasm.__wbg_set_scoringconfig_kernel_parameter(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get max_distance_km() {
        const ret = wasm.__wbg_get_scoringconfig_max_distance_km(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set max_distance_km(arg0) {
        wasm.__wbg_set_scoringconfig_max_distance_km(this.__wbg_ptr, arg0);
    }
    /**
     * @returns {number}
     */
    get volatility_penalty() {
        const ret = wasm.__wbg_get_scoringconfig_volatility_penalty(this.__wbg_ptr);
        return ret;
    }
    /**
     * @param {number} arg0
     */
    set volatility_penalty(arg0) {
        wasm.__wbg_set_scoringconfig_volatility_penalty(this.__wbg_ptr, arg0);
    }
    /**
     * Maximum sensitivity to nearby lines
     * @returns {ScoringConfig}
     */
    static high_precision() {
        const ret = wasm.scoringconfig_high_precision();
        return ScoringConfig.__wrap(ret);
    }
    /**
     * Create a balanced configuration (recommended default)
     */
    constructor() {
        const ret = wasm.scoringconfig_balanced();
        this.__wbg_ptr = ret >>> 0;
        ScoringConfigFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * Broad influence, relaxed boundaries
     * @returns {ScoringConfig}
     */
    static relaxed() {
        const ret = wasm.scoringconfig_relaxed();
        return ScoringConfig.__wrap(ret);
    }
    /**
     * Balanced accuracy vs. computation
     * @returns {ScoringConfig}
     */
    static balanced() {
        const ret = wasm.scoringconfig_balanced();
        return ScoringConfig.__wrap(ret);
    }
}
if (Symbol.dispose) ScoringConfig.prototype[Symbol.dispose] = ScoringConfig.prototype.free;

/**
 * Sorting mode for city rankings
 * @enum {0 | 1 | 2}
 */
export const SortMode = Object.freeze({
    BenefitFirst: 0, "0": "BenefitFirst",
    IntensityFirst: 1, "1": "IntensityFirst",
    BalancedBenefit: 2, "2": "BalancedBenefit",
});

/**
 * Calculate all planetary lines for a given birth time
 * Returns a JavaScript object with the results
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @param {number} second
 * @param {number} longitude_step
 * @returns {any}
 */
export function calculate_all_lines(year, month, day, hour, minute, second, longitude_step) {
    const ret = wasm.calculate_all_lines(year, month, day, hour, minute, second, longitude_step);
    return ret;
}

/**
 * Calculate all planetary lines for a given LOCAL birth time and birth location
 * Automatically handles timezone conversion using chrono-tz
 * This is the preferred function to call from JavaScript
 * @param {number} birth_lat
 * @param {number} birth_lng
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @param {number} second
 * @param {number} longitude_step
 * @returns {any}
 */
export function calculate_all_lines_local(birth_lat, birth_lng, year, month, day, hour, minute, second, longitude_step) {
    const ret = wasm.calculate_all_lines_local(birth_lat, birth_lng, year, month, day, hour, minute, second, longitude_step);
    return ret;
}

/**
 * Calculate Delta T (ΔT = TT - UT1) in seconds
 *
 * Delta T is the difference between Terrestrial Time (TT) and Universal Time (UT1).
 * This difference arises because:
 * - TT is a uniform atomic time scale used by ephemerides
 * - UT1 is based on Earth's rotation, which is irregular and gradually slowing
 *
 * # Historical Context
 * - Before 1972: ΔT varied widely (extrapolated from historical records)
 * - 1972-present: ΔT accumulates as leap seconds are added to UTC
 * - Modern value: ~69 seconds (2024)
 * - Future: Predicted using extrapolation (less accurate)
 *
 * # Why It Matters for Astrocartography
 * A 70-second error in time translates to approximately:
 * - 0.3° error in planetary longitude
 * - Several kilometers shift in MC/IC line positions
 *
 * # Arguments
 * * `year` - Calendar year (astronomical: 0 = 1 BCE, negative for earlier)
 * * `month` - Month (1-12)
 *
 * # Returns
 * Delta T in seconds (add to UT to get TT)
 *
 * # Algorithm
 * Based on polynomial expressions from USNO/IERS, with different formulas
 * for different historical periods to maximize accuracy.
 * @param {number} year
 * @param {number} month
 * @returns {number}
 */
export function calculate_delta_t(year, month) {
    const ret = wasm.calculate_delta_t(year, month);
    return ret;
}

/**
 * Calculate Greenwich Mean Sidereal Time (GMST) in radians
 *
 * Uses UT1 (Earth rotation time) for maximum accuracy. The input Julian Date
 * is assumed to be UTC, which is internally converted to UT1.
 * @param {number} julian_date
 * @returns {number}
 */
export function calculate_gmst(julian_date) {
    const ret = wasm.calculate_gmst(julian_date);
    return ret;
}

/**
 * Calculate latitude for ASC/DSC line at a given longitude
 *
 * Finds the geographic latitude where a celestial body with given equatorial
 * coordinates is exactly on the horizon (altitude = 0°) at a specific longitude.
 *
 * # Mathematical Basis
 * The altitude formula is: `sin(alt) = sin(δ)sin(φ) + cos(δ)cos(φ)cos(H)`
 *
 * Setting altitude = 0 and solving for latitude φ:
 * `tan(φ) = -cos(H) / tan(δ)`
 *
 * Which gives: `φ = atan2(-cos(H), tan(δ))`
 *
 * # Special Case: Declination ≈ 0 (Equatorial Bodies like North Node)
 * When declination approaches zero, the altitude equation simplifies to:
 * `cos(φ) × cos(H) = 0`
 *
 * This has two distinct sub-cases:
 *
 * 1. **True Degenerate (|cos(H)| ≈ 0)**: Hour angle near ±90° means ALL latitudes satisfy
 *    the horizon equation. Returns `None` and caller should use `is_all_latitudes_horizon()`
 *    to detect this and draw a full vertical segment.
 *
 * 2. **No Intersection (|cos(H)| ≠ 0)**: Geometrically, equatorial bodies only cross the
 *    horizon at cardinal E/W points where H = ±90°. At other longitudes, the body is always
 *    above or below the horizon for ALL latitudes—there is NO valid crossing. Returns `None`
 *    to skip this longitude. This is geometrically correct; gaps in North Node ASC/DSC lines
 *    are real, not artifacts.
 *
 * # Arguments
 * * `right_ascension` - Planet's RA in radians
 * * `declination` - Planet's declination in radians
 * * `gmst` - Greenwich Mean Sidereal Time in radians
 * * `longitude_deg` - Geographic longitude in degrees (-180 to 180)
 *
 * # Returns
 * * `Some(latitude)` - Valid horizon crossing at this longitude (single latitude solution)
 * * `None` - Either degenerate (draw vertical) OR no crossing (skip gap)
 *
 * **Caller must check `is_all_latitudes_horizon()` FIRST to distinguish:**
 * - If `is_all_latitudes_horizon()` returns `true`: draw vertical segment (-89° to +89°)
 * - If `is_all_latitudes_horizon()` returns `false` and this returns `None`: skip point (gap is real)
 *
 * # Mathematical Basis
 * Solves sin(φ)sin(δ) + cos(φ)cos(δ)cos(H) = 0 for latitude φ.
 * Standard case: φ = atan(-cos(δ)cos(H) / sin(δ))
 *
 * Uses atan (not atan2) to ensure result is in [-90°, 90°] latitude range.
 *
 * References:
 * - Sunrise equation: https://en.wikipedia.org/wiki/Sunrise_equation
 * - Rise/set algorithm: https://www.celestialprogramming.com/risesetalgorithm.html
 * - Spherical astronomy: https://promenade.imcce.fr/en/pages3/367.html
 * @param {number} right_ascension
 * @param {number} declination
 * @param {number} gmst
 * @param {number} longitude_deg
 * @returns {number | undefined}
 */
export function calculate_horizon_latitude(right_ascension, declination, gmst, longitude_deg) {
    const ret = wasm.calculate_horizon_latitude(right_ascension, declination, gmst, longitude_deg);
    return ret[0] === 0 ? undefined : ret[1];
}

/**
 * Calculate IC line longitude for a planet
 * @param {number} right_ascension
 * @param {number} gmst
 * @returns {number}
 */
export function calculate_ic_longitude(right_ascension, gmst) {
    const ret = wasm.calculate_ic_longitude(right_ascension, gmst);
    return ret;
}

/**
 * Calculate distance from a city to a planetary line
 * @param {number} city_lat
 * @param {number} city_lon
 * @param {any} line_points_json
 * @returns {number}
 */
export function calculate_line_distance(city_lat, city_lon, line_points_json) {
    const ret = wasm.calculate_line_distance(city_lat, city_lon, line_points_json);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return ret[0];
}

/**
 * Calculate Local Space lines for a given birth time and location
 * Local Space lines radiate outward from the birth location based on planetary azimuths
 * @param {number} birth_lat
 * @param {number} birth_lng
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @param {number} second
 * @param {number} max_distance_km
 * @param {number} step_km
 * @returns {any}
 */
export function calculate_local_space_lines(birth_lat, birth_lng, year, month, day, hour, minute, second, max_distance_km, step_km) {
    const ret = wasm.calculate_local_space_lines(birth_lat, birth_lng, year, month, day, hour, minute, second, max_distance_km, step_km);
    return ret;
}

/**
 * Calculate Local Sidereal Time in radians
 *
 * Converts Greenwich Mean Sidereal Time to Local Sidereal Time by adding
 * the observer's geographic longitude.
 *
 * # Arguments
 * * `gmst` - Greenwich Mean Sidereal Time in **radians**
 * * `longitude_deg` - Geographic longitude in **degrees** (positive = East, negative = West)
 *
 * # Returns
 * Local Sidereal Time in radians, normalized to [0, 2π)
 *
 * # Important: Unit Warning
 * The `longitude_deg` parameter MUST be in **degrees**, not radians.
 * WASM bindings do not enforce units at runtime. Passing radians will produce
 * incorrect results (rotation errors of up to 57x).
 *
 * # Example (from JavaScript/TypeScript)
 * ```js
 * // Correct: pass longitude in degrees
 * const lst = calculate_lst(gmst, -122.4194);  // San Francisco (122.4°W)
 *
 * // WRONG: do NOT pass radians
 * // const lst = calculate_lst(gmst, -2.137);  // This is wrong!
 * ```
 * @param {number} gmst
 * @param {number} longitude_deg
 * @returns {number}
 */
export function calculate_lst(gmst, longitude_deg) {
    const ret = wasm.calculate_lst(gmst, longitude_deg);
    return ret;
}

/**
 * Calculate MC line longitude for a planet
 * @param {number} right_ascension
 * @param {number} gmst
 * @returns {number}
 */
export function calculate_mc_longitude(right_ascension, gmst) {
    const ret = wasm.calculate_mc_longitude(right_ascension, gmst);
    return ret;
}

/**
 * Calculate complete natal chart with house cusps
 * @param {number} birth_lat
 * @param {number} birth_lng
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @param {number} second
 * @param {string} house_system
 * @param {boolean} use_sidereal
 * @returns {any}
 */
export function calculate_natal_chart(birth_lat, birth_lng, year, month, day, hour, minute, second, house_system, use_sidereal) {
    const ptr0 = passStringToWasm0(house_system, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.calculate_natal_chart(birth_lat, birth_lng, year, month, day, hour, minute, second, ptr0, len0, use_sidereal);
    return ret;
}

/**
 * Calculate planetary position for a given planet and Julian Date
 *
 * Uses VSOP87 theory for accurate heliocentric positions, then converts to
 * geocentric coordinates. Includes nutation and aberration corrections for
 * maximum accuracy.
 *
 * # Time Scale Handling
 * The input `julian_date` is assumed to be **Coordinated Universal Time (UTC)**.
 * Internally, this function converts to Terrestrial Time (TT) via the chain:
 * **UTC → UT1 (via DUT1) → TT (via ΔT)**
 *
 * This two-step conversion ensures:
 * - GMST calculations use UT1 (Earth rotation time)
 * - Ephemeris calculations use TT (uniform dynamical time)
 * - Both are properly anchored to the input UTC timestamp
 *
 * # Arguments
 * * `planet` - The celestial body to calculate position for
 * * `julian_date` - Julian Date in **UTC** (Coordinated Universal Time)
 *
 * # Returns
 * `PlanetaryPosition` containing:
 * - Right Ascension (radians, 0 to 2π)
 * - Declination (radians, -π/2 to π/2)
 * - Ecliptic Longitude (degrees, 0 to 360)
 *
 * # Performance Note
 * For batch calculations (multiple planets at the same time), the internal
 * `calculate_all_lines*()` functions use `calculate_planetary_position_tt()`
 * with pre-computed TT values for better performance.
 * @param {Planet} planet
 * @param {number} julian_date
 * @returns {PlanetaryPosition}
 */
export function calculate_planetary_position(planet, julian_date) {
    const ret = wasm.calculate_planetary_position(planet, julian_date);
    return PlanetaryPosition.__wrap(ret);
}

/**
 * Calculate relocation chart - shows how natal chart changes at a different location
 * The planetary positions remain the same (fixed at birth), but house placements change
 * @param {number} birth_lat
 * @param {number} birth_lng
 * @param {number} reloc_lat
 * @param {number} reloc_lng
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @param {number} second
 * @param {string} house_system
 * @param {boolean} use_sidereal
 * @returns {any}
 */
export function calculate_relocation_chart(birth_lat, birth_lng, reloc_lat, reloc_lng, year, month, day, hour, minute, second, house_system, use_sidereal) {
    const ptr0 = passStringToWasm0(house_system, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ret = wasm.calculate_relocation_chart(birth_lat, birth_lng, reloc_lat, reloc_lng, year, month, day, hour, minute, second, ptr0, len0, use_sidereal);
    return ret;
}

/**
 * Apply distance kernel to get influence strength
 * @param {number} distance_km
 * @param {KernelType} kernel_type
 * @param {number} kernel_param
 * @returns {number}
 */
export function get_influence_strength(distance_km, kernel_type, kernel_param) {
    const ret = wasm.get_influence_strength(distance_km, kernel_type, kernel_param);
    return ret;
}

/**
 * Get timezone name from coordinates using tzf-rs.
 *
 * **IMPORTANT: Parameter order is (lat, lng)** to match standard geographic convention,
 * even though the underlying tzf-rs library uses (lng, lat) internally.
 * @param {number} lat
 * @param {number} lng
 * @returns {string}
 */
export function get_timezone_from_coords(lat, lng) {
    let deferred1_0;
    let deferred1_1;
    try {
        const ret = wasm.get_timezone_from_coords(lat, lng);
        deferred1_0 = ret[0];
        deferred1_1 = ret[1];
        return getStringFromWasm0(ret[0], ret[1]);
    } finally {
        wasm.__wbindgen_free(deferred1_0, deferred1_1, 1);
    }
}

/**
 * Get timezone offset in hours from coordinates at a specific time
 * @param {number} lat
 * @param {number} lng
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @param {number} second
 * @returns {number}
 */
export function get_timezone_offset_hours(lat, lng, year, month, day, hour, minute, second) {
    const ret = wasm.get_timezone_offset_hours(lat, lng, year, month, day, hour, minute, second);
    return ret;
}

/**
 * Check if this longitude has the "all latitudes" horizon condition.
 *
 * This is the true degenerate case where |sin(δ)| ≈ 0 AND |cos(H)| ≈ 0,
 * meaning the horizon equation is satisfied by ALL latitudes at this longitude.
 * When true, draw a full vertical segment from -89° to +89° latitude.
 *
 * This function should be called BEFORE `calculate_horizon_latitude()` to
 * distinguish between:
 * - True degenerate (this returns true): draw vertical segment
 * - No intersection (this returns false, horizon_latitude returns None): skip point
 *
 * Used for equatorial bodies (like North Node near equinox) at cardinal E/W points.
 * @param {number} right_ascension
 * @param {number} declination
 * @param {number} gmst
 * @param {number} longitude_deg
 * @returns {boolean}
 */
export function is_all_latitudes_horizon(right_ascension, declination, gmst, longitude_deg) {
    const ret = wasm.is_all_latitudes_horizon(right_ascension, declination, gmst, longitude_deg);
    return ret !== 0;
}

/**
 * Check if parallel processing is available
 * @returns {boolean}
 */
export function is_parallel_available() {
    const ret = wasm.is_parallel_available();
    return ret !== 0;
}

/**
 * Check if a point is on the ASC (rising) side
 * @param {number} right_ascension
 * @param {number} gmst
 * @param {number} longitude_deg
 * @returns {boolean}
 */
export function is_rising(right_ascension, gmst, longitude_deg) {
    const ret = wasm.is_rising(right_ascension, gmst, longitude_deg);
    return ret !== 0;
}

/**
 * Convert local time at coordinates to UTC Julian Date
 * @param {number} lat
 * @param {number} lng
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @param {number} second
 * @returns {number}
 */
export function local_to_utc_julian_date(lat, lng, year, month, day, hour, minute, second) {
    const ret = wasm.local_to_utc_julian_date(lat, lng, year, month, day, hour, minute, second);
    return ret;
}

/**
 * WASM wrapper: Group city rankings by country and compute normalized country scores
 * @param {any} rankings_json
 * @returns {any}
 */
export function rank_countries_from_cities(rankings_json) {
    const ret = wasm.rank_countries_from_cities(rankings_json);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * WASM binding: Fast city scoring using simplified lines
 * Use this when you need city names, not just grid points
 * @param {any} cities_json
 * @param {any} lines_json
 * @param {LifeCategory} category
 * @param {SortMode} sort_mode
 * @param {any} config_json
 * @returns {any}
 */
export function scout_cities_fast(cities_json, lines_json, category, sort_mode, config_json) {
    const ret = wasm.scout_cities_fast(cities_json, lines_json, category, sort_mode, config_json);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Scout multiple cities and rank them for a category
 * @param {any} cities_json
 * @param {any} lines_json
 * @param {LifeCategory} category
 * @param {SortMode} sort_mode
 * @param {any} config_json
 * @returns {any}
 */
export function scout_cities_for_category(cities_json, lines_json, category, sort_mode, config_json) {
    const ret = wasm.scout_cities_for_category(cities_json, lines_json, category, sort_mode, config_json);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Scout multiple cities with progress callback
 *
 * The progress_callback is called with (percent: u32, phase: &str, detail: &str)
 * Phases: "initializing", "computing", "aggregating"
 * @param {any} cities_json
 * @param {any} lines_json
 * @param {LifeCategory} category
 * @param {SortMode} sort_mode
 * @param {any} config_json
 * @param {Function} progress_callback
 * @returns {any}
 */
export function scout_cities_for_category_with_progress(cities_json, lines_json, category, sort_mode, config_json, progress_callback) {
    const ret = wasm.scout_cities_for_category_with_progress(cities_json, lines_json, category, sort_mode, config_json, progress_callback);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Scout a single city for all influences from planetary lines
 * @param {string} city_name
 * @param {string} country
 * @param {number} city_lat
 * @param {number} city_lon
 * @param {any} lines_json
 * @param {any} config_json
 * @returns {any}
 */
export function scout_city(city_name, country, city_lat, city_lon, lines_json, config_json) {
    const ptr0 = passStringToWasm0(city_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    const ptr1 = passStringToWasm0(country, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len1 = WASM_VECTOR_LEN;
    const ret = wasm.scout_city(ptr0, len0, ptr1, len1, city_lat, city_lon, lines_json, config_json);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * WASM binding: Optimized hierarchical grid scout
 * Returns grid points with scores, much faster than city-by-city
 * @param {any} lines_json
 * @param {LifeCategory} category
 * @param {any} config_json
 * @returns {any}
 */
export function scout_grid_optimized(lines_json, category, config_json) {
    const ret = wasm.scout_grid_optimized(lines_json, category, config_json);
    if (ret[2]) {
        throw takeFromExternrefTable0(ret[1]);
    }
    return takeFromExternrefTable0(ret[0]);
}

/**
 * Convert year, month, day, hour, minute, second to Julian Date
 * @param {number} year
 * @param {number} month
 * @param {number} day
 * @param {number} hour
 * @param {number} minute
 * @param {number} second
 * @returns {number}
 */
export function to_julian_date(year, month, day, hour, minute, second) {
    const ret = wasm.to_julian_date(year, month, day, hour, minute, second);
    return ret;
}

/**
 * Convert Julian Date (UTC) to Julian Ephemeris Date (TT)
 *
 * Converts a Julian Date in Coordinated Universal Time to Terrestrial Time
 * using the proper time scale chain: UTC → UT1 (via DUT1) → TT (via ΔT).
 *
 * This is essential for accurate ephemeris calculations since VSOP87, ELP2000,
 * and other planetary theories use TT (also called TDB for most purposes).
 *
 * # Time Scale Chain
 * - **UTC**: Atomic time with leap seconds, the input time scale
 * - **UT1**: Earth rotation time, derived via DUT1 = UT1 - UTC
 * - **TT**: Terrestrial Time, derived via ΔT = TT - UT1
 *
 * # Arguments
 * * `jd_utc` - Julian Date in Coordinated Universal Time (UTC)
 * * `year` - Calendar year (for Delta T lookup)
 * * `month` - Calendar month (for Delta T lookup)
 *
 * # Returns
 * Julian Ephemeris Date (JDE) in Terrestrial Time
 *
 * # Note
 * For best accuracy, use `jd_to_calendar()` to derive year/month from the JD
 * rather than approximating, especially near month/year boundaries.
 * @param {number} jd_utc
 * @param {number} year
 * @param {number} month
 * @returns {number}
 */
export function ut_to_tt(jd_utc, year, month) {
    const ret = wasm.ut_to_tt(jd_utc, year, month);
    return ret;
}

const EXPECTED_RESPONSE_TYPES = new Set(['basic', 'cors', 'default']);

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && EXPECTED_RESPONSE_TYPES.has(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }
}

function __wbg_get_imports(memory) {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_Error_52673b7de5a0ca89 = function(arg0, arg1) {
        const ret = Error(getStringFromWasm0(arg0, arg1));
        return ret;
    };
    imports.wbg.__wbg_Number_2d1dcfcf4ec51736 = function(arg0) {
        const ret = Number(arg0);
        return ret;
    };
    imports.wbg.__wbg_String_8f0eb39a4a4c2f66 = function(arg0, arg1) {
        const ret = String(arg1);
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg___wbindgen_boolean_get_dea25b33882b895b = function(arg0) {
        const v = arg0;
        const ret = typeof(v) === 'boolean' ? v : undefined;
        return isLikeNone(ret) ? 0xFFFFFF : ret ? 1 : 0;
    };
    imports.wbg.__wbg___wbindgen_debug_string_adfb662ae34724b6 = function(arg0, arg1) {
        const ret = debugString(arg1);
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg___wbindgen_in_0d3e1e8f0c669317 = function(arg0, arg1) {
        const ret = arg0 in arg1;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_function_8d400b8b1af978cd = function(arg0) {
        const ret = typeof(arg0) === 'function';
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_object_ce774f3490692386 = function(arg0) {
        const val = arg0;
        const ret = typeof(val) === 'object' && val !== null;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_string_704ef9c8fc131030 = function(arg0) {
        const ret = typeof(arg0) === 'string';
        return ret;
    };
    imports.wbg.__wbg___wbindgen_is_undefined_f6b95eab589e0269 = function(arg0) {
        const ret = arg0 === undefined;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_jsval_loose_eq_766057600fdd1b0d = function(arg0, arg1) {
        const ret = arg0 == arg1;
        return ret;
    };
    imports.wbg.__wbg___wbindgen_number_get_9619185a74197f95 = function(arg0, arg1) {
        const obj = arg1;
        const ret = typeof(obj) === 'number' ? obj : undefined;
        getDataViewMemory0().setFloat64(arg0 + 8 * 1, isLikeNone(ret) ? 0 : ret, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, !isLikeNone(ret), true);
    };
    imports.wbg.__wbg___wbindgen_string_get_a2a31e16edf96e42 = function(arg0, arg1) {
        const obj = arg1;
        const ret = typeof(obj) === 'string' ? obj : undefined;
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg___wbindgen_throw_dd24417ed36fc46e = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbg_call_78f94eb02ec7f9b2 = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        const ret = arg0.call(arg1, arg2, arg3, arg4);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_call_abb4ff46ce38be40 = function() { return handleError(function (arg0, arg1) {
        const ret = arg0.call(arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_done_62ea16af4ce34b24 = function(arg0) {
        const ret = arg0.done;
        return ret;
    };
    imports.wbg.__wbg_entries_83c79938054e065f = function(arg0) {
        const ret = Object.entries(arg0);
        return ret;
    };
    imports.wbg.__wbg_error_7534b8e9a36f1ab4 = function(arg0, arg1) {
        let deferred0_0;
        let deferred0_1;
        try {
            deferred0_0 = arg0;
            deferred0_1 = arg1;
            console.error(getStringFromWasm0(arg0, arg1));
        } finally {
            wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
        }
    };
    imports.wbg.__wbg_get_6b7bd52aca3f9671 = function(arg0, arg1) {
        const ret = arg0[arg1 >>> 0];
        return ret;
    };
    imports.wbg.__wbg_get_af9dab7e9603ea93 = function() { return handleError(function (arg0, arg1) {
        const ret = Reflect.get(arg0, arg1);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_get_with_ref_key_1dc361bd10053bfe = function(arg0, arg1) {
        const ret = arg0[arg1];
        return ret;
    };
    imports.wbg.__wbg_instanceof_ArrayBuffer_f3320d2419cd0355 = function(arg0) {
        let result;
        try {
            result = arg0 instanceof ArrayBuffer;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_Uint8Array_da54ccc9d3e09434 = function(arg0) {
        let result;
        try {
            result = arg0 instanceof Uint8Array;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_isArray_51fd9e6422c0a395 = function(arg0) {
        const ret = Array.isArray(arg0);
        return ret;
    };
    imports.wbg.__wbg_isSafeInteger_ae7d3f054d55fa16 = function(arg0) {
        const ret = Number.isSafeInteger(arg0);
        return ret;
    };
    imports.wbg.__wbg_iterator_27b7c8b35ab3e86b = function() {
        const ret = Symbol.iterator;
        return ret;
    };
    imports.wbg.__wbg_length_22ac23eaec9d8053 = function(arg0) {
        const ret = arg0.length;
        return ret;
    };
    imports.wbg.__wbg_length_d45040a40c570362 = function(arg0) {
        const ret = arg0.length;
        return ret;
    };
    imports.wbg.__wbg_new_1ba21ce319a06297 = function() {
        const ret = new Object();
        return ret;
    };
    imports.wbg.__wbg_new_25f239778d6112b9 = function() {
        const ret = new Array();
        return ret;
    };
    imports.wbg.__wbg_new_6421f6084cc5bc5a = function(arg0) {
        const ret = new Uint8Array(arg0);
        return ret;
    };
    imports.wbg.__wbg_new_8a6f238a6ece86ea = function() {
        const ret = new Error();
        return ret;
    };
    imports.wbg.__wbg_next_138a17bbf04e926c = function(arg0) {
        const ret = arg0.next;
        return ret;
    };
    imports.wbg.__wbg_next_3cfe5c0fe2a4cc53 = function() { return handleError(function (arg0) {
        const ret = arg0.next();
        return ret;
    }, arguments) };
    imports.wbg.__wbg_now_69d776cd24f5215b = function() {
        const ret = Date.now();
        return ret;
    };
    imports.wbg.__wbg_prototypesetcall_dfe9b766cdc1f1fd = function(arg0, arg1, arg2) {
        Uint8Array.prototype.set.call(getArrayU8FromWasm0(arg0, arg1), arg2);
    };
    imports.wbg.__wbg_set_3f1d0b984ed272ed = function(arg0, arg1, arg2) {
        arg0[arg1] = arg2;
    };
    imports.wbg.__wbg_set_7df433eea03a5c14 = function(arg0, arg1, arg2) {
        arg0[arg1 >>> 0] = arg2;
    };
    imports.wbg.__wbg_stack_0ed75d68575b0f3c = function(arg0, arg1) {
        const ret = arg1.stack;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg_value_57b7b035e117f7ee = function(arg0) {
        const ret = arg0.value;
        return ret;
    };
    imports.wbg.__wbindgen_cast_2241b6af4c4b2941 = function(arg0, arg1) {
        // Cast intrinsic for `Ref(String) -> Externref`.
        const ret = getStringFromWasm0(arg0, arg1);
        return ret;
    };
    imports.wbg.__wbindgen_cast_4625c577ab2ec9ee = function(arg0) {
        // Cast intrinsic for `U64 -> Externref`.
        const ret = BigInt.asUintN(64, arg0);
        return ret;
    };
    imports.wbg.__wbindgen_cast_d6cd19b81560fd6e = function(arg0) {
        // Cast intrinsic for `F64 -> Externref`.
        const ret = arg0;
        return ret;
    };
    imports.wbg.__wbindgen_init_externref_table = function() {
        const table = wasm.__wbindgen_externrefs;
        const offset = table.grow(4);
        table.set(0, undefined);
        table.set(offset + 0, undefined);
        table.set(offset + 1, null);
        table.set(offset + 2, true);
        table.set(offset + 3, false);
    };
    imports.wbg.memory = memory || new WebAssembly.Memory({initial:250,maximum:16384,shared:true});

    return imports;
}

function __wbg_finalize_init(instance, module, thread_stack_size) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;

    if (typeof thread_stack_size !== 'undefined' && (typeof thread_stack_size !== 'number' || thread_stack_size === 0 || thread_stack_size % 65536 !== 0)) { throw 'invalid stack size' }
    wasm.__wbindgen_start(thread_stack_size);
    return wasm;
}

function initSync(module, memory) {
    if (wasm !== undefined) return wasm;

    let thread_stack_size
    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module, memory, thread_stack_size} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports(memory);
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module, thread_stack_size);
}

async function __wbg_init(module_or_path, memory) {
    if (wasm !== undefined) return wasm;

    let thread_stack_size
    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path, memory, thread_stack_size} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('astro_core_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports(memory);

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module, thread_stack_size);
}

export { initSync };
export default __wbg_init;
