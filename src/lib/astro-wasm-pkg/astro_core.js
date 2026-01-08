let wasm;

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

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
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
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
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

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
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

const GlobePointFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_globepoint_free(ptr >>> 0, 1));

const PlanetaryPositionFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_planetaryposition_free(ptr >>> 0, 1));

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
     * @param {number} lat
     * @param {number} lng
     */
    constructor(lat, lng) {
        const ret = wasm.globepoint_new(lat, lng);
        this.__wbg_ptr = ret >>> 0;
        GlobePointFinalization.register(this, this.__wbg_ptr, this);
        return this;
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
}
if (Symbol.dispose) GlobePoint.prototype[Symbol.dispose] = GlobePoint.prototype.free;

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
}
if (Symbol.dispose) PlanetaryPosition.prototype[Symbol.dispose] = PlanetaryPosition.prototype.free;

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
 * Calculate Delta T (difference between TT and UT1) in seconds
 * Based on polynomial expressions from USNO/IERS
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
 * @param {number} julian_date
 * @returns {number}
 */
export function calculate_gmst(julian_date) {
    const ret = wasm.calculate_gmst(julian_date);
    return ret;
}

/**
 * Calculate latitude for ASC/DSC line at a given longitude
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
 * Uses VSOP87 theory for accurate positions
 * Includes nutation and aberration corrections for maximum accuracy
 * @param {Planet} planet
 * @param {number} julian_date
 * @returns {PlanetaryPosition}
 */
export function calculate_planetary_position(planet, julian_date) {
    const ret = wasm.calculate_planetary_position(planet, julian_date);
    return PlanetaryPosition.__wrap(ret);
}

/**
 * Get timezone name from coordinates using tzf-rs
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
 * Convert Julian Date (UT) to Julian Ephemeris Date (TT)
 * @param {number} jd_ut
 * @param {number} year
 * @param {number} month
 * @returns {number}
 */
export function ut_to_tt(jd_ut, year, month) {
    const ret = wasm.ut_to_tt(jd_ut, year, month);
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

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg___wbindgen_debug_string_adfb662ae34724b6 = function(arg0, arg1) {
        const ret = debugString(arg1);
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
        getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
    };
    imports.wbg.__wbg___wbindgen_throw_dd24417ed36fc46e = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
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
    imports.wbg.__wbg_new_1ba21ce319a06297 = function() {
        const ret = new Object();
        return ret;
    };
    imports.wbg.__wbg_new_25f239778d6112b9 = function() {
        const ret = new Array();
        return ret;
    };
    imports.wbg.__wbg_new_8a6f238a6ece86ea = function() {
        const ret = new Error();
        return ret;
    };
    imports.wbg.__wbg_now_69d776cd24f5215b = function() {
        const ret = Date.now();
        return ret;
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
    imports.wbg.__wbindgen_cast_2241b6af4c4b2941 = function(arg0, arg1) {
        // Cast intrinsic for `Ref(String) -> Externref`.
        const ret = getStringFromWasm0(arg0, arg1);
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

    return imports;
}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    __wbg_init.__wbindgen_wasm_module = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;


    wasm.__wbindgen_start();
    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (typeof module !== 'undefined') {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (typeof module_or_path !== 'undefined') {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (typeof module_or_path === 'undefined') {
        module_or_path = new URL('astro_core_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync };
export default __wbg_init;
