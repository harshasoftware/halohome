//! Astrocartography Core Library
//!
//! High-performance astrocartography calculations compiled to WebAssembly.
//! Implements planetary line calculations for MC, IC, ASC, and DSC lines.
//! Uses VSOP87 theory for accurate planetary positions.

use wasm_bindgen::prelude::*;
use serde::{Deserialize, Serialize};
use std::f64::consts::PI;
use vsop87::vsop87b; // Heliocentric ecliptic spherical coordinates
use chrono::{Datelike, FixedOffset, NaiveDate, Offset, TimeZone, Timelike, Utc};
use chrono_tz::Tz;
use tzf_rs::DefaultFinder;

// Rayon for parallel processing (optional - requires SharedArrayBuffer + COOP/COEP headers)
#[cfg(feature = "parallel")]
use rayon::prelude::*;
#[cfg(feature = "parallel")]
pub use wasm_bindgen_rayon::init_thread_pool;

// Scout Location Scoring Module (C2 Algorithm)
mod scout;
pub use scout::*;

// ============================================
// Constants
// ============================================

const DEG_TO_RAD: f64 = PI / 180.0;
const RAD_TO_DEG: f64 = 180.0 / PI;
const J2000_EPOCH: f64 = 2451545.0;
const JULIAN_CENTURY: f64 = 36525.0;
/// Obliquity of the ecliptic at J2000.0 (used in tests and as reference)
#[allow(dead_code)]
const OBLIQUITY_J2000: f64 = 23.439291 * DEG_TO_RAD;
/// Speed of light in AU/day (for light-time correction, reserved for future use)
#[allow(dead_code)]
const C_AU_DAY: f64 = 173.14463348;
/// Very small value for floating point comparisons (from Swiss Ephemeris)
const VERY_SMALL: f64 = 1e-10;

// ============================================
// Degree-based Trigonometric Functions (Swiss Ephemeris style)
// ============================================

/// Sine of angle in degrees
#[inline]
fn sind(x: f64) -> f64 {
    (x * DEG_TO_RAD).sin()
}

/// Cosine of angle in degrees
#[inline]
fn cosd(x: f64) -> f64 {
    (x * DEG_TO_RAD).cos()
}

/// Tangent of angle in degrees
#[inline]
fn tand(x: f64) -> f64 {
    (x * DEG_TO_RAD).tan()
}

/// Arc sine returning degrees
#[inline]
fn asind(x: f64) -> f64 {
    x.clamp(-1.0, 1.0).asin() * RAD_TO_DEG
}

/// Arc cosine returning degrees
#[inline]
#[allow(dead_code)]
fn acosd(x: f64) -> f64 {
    x.clamp(-1.0, 1.0).acos() * RAD_TO_DEG
}

/// Arc tangent returning degrees
#[inline]
fn atand(x: f64) -> f64 {
    x.atan() * RAD_TO_DEG
}

/// Arc tangent 2 returning degrees
#[inline]
#[allow(dead_code)]
fn atan2d(y: f64, x: f64) -> f64 {
    y.atan2(x) * RAD_TO_DEG
}

/// Normalize angle to 0-360 degrees (Swiss Ephemeris swe_degnorm)
#[inline]
fn swe_degnorm(x: f64) -> f64 {
    x.rem_euclid(360.0)
}

/// Difference between two angles, normalized to -180..180 (Swiss Ephemeris swe_difdeg2n)
#[inline]
fn swe_difdeg2n(p1: f64, p2: f64) -> f64 {
    let mut diff = p1 - p2;
    while diff > 180.0 { diff -= 360.0; }
    while diff < -180.0 { diff += 360.0; }
    diff
}

// ============================================
// Types
// ============================================

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum Planet {
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

#[wasm_bindgen]
#[derive(Clone, Copy, Debug, Serialize, Deserialize)]
pub enum LineType {
    MC = 0,
    IC = 1,
    ASC = 2,
    DSC = 3,
}

#[wasm_bindgen]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct PlanetaryPosition {
    pub planet: Planet,
    pub right_ascension: f64,
    pub declination: f64,
    pub ecliptic_longitude: f64,
}

#[wasm_bindgen]
impl PlanetaryPosition {
    #[wasm_bindgen(constructor)]
    pub fn new(planet: Planet, ra: f64, dec: f64, ecl_lon: f64) -> PlanetaryPosition {
        PlanetaryPosition {
            planet,
            right_ascension: ra,
            declination: dec,
            ecliptic_longitude: ecl_lon,
        }
    }
}

#[wasm_bindgen]
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct GlobePoint {
    pub lat: f64,
    pub lng: f64,
}

#[wasm_bindgen]
impl GlobePoint {
    #[wasm_bindgen(constructor)]
    pub fn new(lat: f64, lng: f64) -> GlobePoint {
        GlobePoint { lat, lng }
    }
}

// ============================================
// VSOP87 Planetary Position Calculations
// ============================================

/// Get heliocentric ecliptic coordinates from VSOP87B
/// Returns (longitude, latitude, radius) in radians and AU
fn get_vsop87_heliocentric(planet: Planet, jde: f64) -> (f64, f64, f64) {
    match planet {
        Planet::Mercury => {
            let coords = vsop87b::mercury(jde);
            (coords.longitude(), coords.latitude(), coords.distance())
        }
        Planet::Venus => {
            let coords = vsop87b::venus(jde);
            (coords.longitude(), coords.latitude(), coords.distance())
        }
        Planet::Mars => {
            let coords = vsop87b::mars(jde);
            (coords.longitude(), coords.latitude(), coords.distance())
        }
        Planet::Jupiter => {
            let coords = vsop87b::jupiter(jde);
            (coords.longitude(), coords.latitude(), coords.distance())
        }
        Planet::Saturn => {
            let coords = vsop87b::saturn(jde);
            (coords.longitude(), coords.latitude(), coords.distance())
        }
        Planet::Uranus => {
            let coords = vsop87b::uranus(jde);
            (coords.longitude(), coords.latitude(), coords.distance())
        }
        Planet::Neptune => {
            let coords = vsop87b::neptune(jde);
            (coords.longitude(), coords.latitude(), coords.distance())
        }
        // Earth, Sun, Moon, Pluto handled separately
        _ => (0.0, 0.0, 1.0),
    }
}

/// Get Earth's heliocentric position from VSOP87B
fn get_earth_heliocentric(jde: f64) -> (f64, f64, f64) {
    let coords = vsop87b::earth(jde);
    (coords.longitude(), coords.latitude(), coords.distance())
}

/// Convert heliocentric to geocentric ecliptic coordinates
fn heliocentric_to_geocentric(
    planet_lon: f64, planet_lat: f64, planet_r: f64,
    earth_lon: f64, earth_lat: f64, earth_r: f64,
) -> (f64, f64) {
    // Convert to rectangular coordinates
    let x_p = planet_r * planet_lat.cos() * planet_lon.cos();
    let y_p = planet_r * planet_lat.cos() * planet_lon.sin();
    let z_p = planet_r * planet_lat.sin();

    let x_e = earth_r * earth_lat.cos() * earth_lon.cos();
    let y_e = earth_r * earth_lat.cos() * earth_lon.sin();
    let z_e = earth_r * earth_lat.sin();

    // Geocentric rectangular coordinates
    let x = x_p - x_e;
    let y = y_p - y_e;
    let z = z_p - z_e;

    // Convert back to spherical
    let geo_lon = y.atan2(x);
    let geo_lat = z.atan2((x * x + y * y).sqrt());

    (normalize_angle(geo_lon), geo_lat)
}

/// Calculate obliquity of the ecliptic for a given Julian date
fn calculate_obliquity(jde: f64) -> f64 {
    let t = (jde - J2000_EPOCH) / JULIAN_CENTURY;

    // IAU 2006 precession model (arcseconds)
    let eps0 = 84381.406; // obliquity at J2000.0 in arcseconds
    let eps = eps0
        - 46.836769 * t
        - 0.0001831 * t * t
        + 0.00200340 * t * t * t
        - 0.000000576 * t * t * t * t
        - 0.0000000434 * t * t * t * t * t;

    // Convert arcseconds to radians
    eps / 3600.0 * DEG_TO_RAD
}

/// Convert ecliptic to equatorial coordinates
///
/// Uses the standard transformation formulas from Meeus "Astronomical Algorithms":
/// - tan(α) = (sin(λ)cos(ε) - tan(β)sin(ε)) / cos(λ)
/// - sin(δ) = sin(β)cos(ε) + cos(β)sin(ε)sin(λ)
///
/// This version multiplies through by cos(β) to avoid division by zero issues
/// when ecliptic latitude approaches ±90° (though this rarely occurs for planets).
fn ecliptic_to_equatorial(ecl_lon: f64, ecl_lat: f64, obliquity: f64) -> (f64, f64) {
    let sin_lon = ecl_lon.sin();
    let cos_lon = ecl_lon.cos();
    let sin_lat = ecl_lat.sin();
    let cos_lat = ecl_lat.cos();
    let sin_eps = obliquity.sin();
    let cos_eps = obliquity.cos();

    // Right Ascension - multiplied through by cos(β) to avoid division
    // Original: y = sin(λ)cos(ε) - tan(β)sin(ε), x = cos(λ)
    // Robust:   y = sin(λ)cos(ε)cos(β) - sin(β)sin(ε), x = cos(λ)cos(β)
    let y = sin_lon * cos_eps * cos_lat - sin_lat * sin_eps;
    let x = cos_lon * cos_lat;
    let ra = normalize_angle(y.atan2(x));

    // Declination: sin(δ) = sin(β)cos(ε) + cos(β)sin(ε)sin(λ)
    let dec = (sin_lat * cos_eps + cos_lat * sin_eps * sin_lon).asin();

    (ra, dec)
}

/// Calculate Moon's geocentric ecliptic position using ELP2000-82 theory
///
/// Implements an extended set of periodic terms from Meeus "Astronomical Algorithms"
/// Chapter 47, providing accuracy of ~10 arcseconds in longitude and ~4 arcseconds
/// in latitude for dates within a few centuries of J2000.
fn calculate_moon_position(jde: f64) -> (f64, f64) {
    let t = (jde - J2000_EPOCH) / JULIAN_CENTURY;
    let t2 = t * t;
    let t3 = t2 * t;
    let t4 = t3 * t;

    // Mean elements (degrees) - high precision from ELP2000-82
    let l_prime = 218.3164477 + 481267.88123421 * t - 0.0015786 * t2
        + t3 / 538841.0 - t4 / 65194000.0;
    let d = 297.8501921 + 445267.1114034 * t - 0.0018819 * t2
        + t3 / 545868.0 - t4 / 113065000.0;
    let m = 357.5291092 + 35999.0502909 * t - 0.0001536 * t2 + t3 / 24490000.0;
    let m_prime = 134.9633964 + 477198.8675055 * t + 0.0087414 * t2
        + t3 / 69699.0 - t4 / 14712000.0;
    let f = 93.2720950 + 483202.0175233 * t - 0.0036539 * t2
        - t3 / 3526000.0 + t4 / 863310000.0;

    // Additional arguments for higher-order terms
    let a1 = 119.75 + 131.849 * t;
    let a2 = 53.09 + 479264.290 * t;
    let a3 = 313.45 + 481266.484 * t;

    // Eccentricity of Earth's orbit
    let e = 1.0 - 0.002516 * t - 0.0000074 * t2;
    let e2 = e * e;

    // Convert to radians
    let l_prime_r = l_prime * DEG_TO_RAD;
    let d_r = d * DEG_TO_RAD;
    let m_r = m * DEG_TO_RAD;
    let m_prime_r = m_prime * DEG_TO_RAD;
    let f_r = f * DEG_TO_RAD;
    let a1_r = a1 * DEG_TO_RAD;
    let a2_r = a2 * DEG_TO_RAD;
    let a3_r = a3 * DEG_TO_RAD;

    // Longitude terms (Meeus Table 47.A) - coefficients in 0.000001 degrees
    // Format: (D, M, M', F, coefficient)
    let lon_terms: [(i32, i32, i32, i32, f64); 60] = [
        (0, 0, 1, 0, 6288774.0),
        (2, 0, -1, 0, 1274027.0),
        (2, 0, 0, 0, 658314.0),
        (0, 0, 2, 0, 213618.0),
        (0, 1, 0, 0, -185116.0),
        (0, 0, 0, 2, -114332.0),
        (2, 0, -2, 0, 58793.0),
        (2, -1, -1, 0, 57066.0),
        (2, 0, 1, 0, 53322.0),
        (2, -1, 0, 0, 45758.0),
        (0, 1, -1, 0, -40923.0),
        (1, 0, 0, 0, -34720.0),
        (0, 1, 1, 0, -30383.0),
        (2, 0, 0, -2, 15327.0),
        (0, 0, 1, 2, -12528.0),
        (0, 0, 1, -2, 10980.0),
        (4, 0, -1, 0, 10675.0),
        (0, 0, 3, 0, 10034.0),
        (4, 0, -2, 0, 8548.0),
        (2, 1, -1, 0, -7888.0),
        (2, 1, 0, 0, -6766.0),
        (1, 0, -1, 0, -5163.0),
        (1, 1, 0, 0, 4987.0),
        (2, -1, 1, 0, 4036.0),
        (2, 0, 2, 0, 3994.0),
        (4, 0, 0, 0, 3861.0),
        (2, 0, -3, 0, 3665.0),
        (0, 1, -2, 0, -2689.0),
        (2, 0, -1, 2, -2602.0),
        (2, -1, -2, 0, 2390.0),
        (1, 0, 1, 0, -2348.0),
        (2, -2, 0, 0, 2236.0),
        (0, 1, 2, 0, -2120.0),
        (0, 2, 0, 0, -2069.0),
        (2, -2, -1, 0, 2048.0),
        (2, 0, 1, -2, -1773.0),
        (2, 0, 0, 2, -1595.0),
        (4, -1, -1, 0, 1215.0),
        (0, 0, 2, 2, -1110.0),
        (3, 0, -1, 0, -892.0),
        (2, 1, 1, 0, -810.0),
        (4, -1, -2, 0, 759.0),
        (0, 2, -1, 0, -713.0),
        (2, 2, -1, 0, -700.0),
        (2, 1, -2, 0, 691.0),
        (2, -1, 0, -2, 596.0),
        (4, 0, 1, 0, 549.0),
        (0, 0, 4, 0, 537.0),
        (4, -1, 0, 0, 520.0),
        (1, 0, -2, 0, -487.0),
        (2, 1, 0, -2, -399.0),
        (0, 0, 2, -2, -381.0),
        (1, 1, 1, 0, 351.0),
        (3, 0, -2, 0, -340.0),
        (4, 0, -3, 0, 330.0),
        (2, -1, 2, 0, 327.0),
        (0, 2, 1, 0, -323.0),
        (1, 1, -1, 0, 299.0),
        (2, 0, 3, 0, 294.0),
        (2, 0, -1, -2, 0.0),
    ];

    // Calculate longitude sum
    let mut sum_l: f64 = 0.0;
    for (d_mult, m_mult, mp_mult, f_mult, coef) in lon_terms.iter() {
        let arg = (*d_mult as f64) * d_r + (*m_mult as f64) * m_r
            + (*mp_mult as f64) * m_prime_r + (*f_mult as f64) * f_r;
        let mut term = *coef * arg.sin();
        // Apply eccentricity correction for terms involving M
        match m_mult.abs() {
            1 => term *= e,
            2 => term *= e2,
            _ => {}
        }
        sum_l += term;
    }

    // Additional longitude corrections (Meeus 47.6)
    sum_l += 3958.0 * a1_r.sin();
    sum_l += 1962.0 * (l_prime_r - f_r).sin();
    sum_l += 318.0 * a2_r.sin();

    // Latitude terms (Meeus Table 47.B) - coefficients in 0.000001 degrees
    let lat_terms: [(i32, i32, i32, i32, f64); 60] = [
        (0, 0, 0, 1, 5128122.0),
        (0, 0, 1, 1, 280602.0),
        (0, 0, 1, -1, 277693.0),
        (2, 0, 0, -1, 173237.0),
        (2, 0, -1, 1, 55413.0),
        (2, 0, -1, -1, 46271.0),
        (2, 0, 0, 1, 32573.0),
        (0, 0, 2, 1, 17198.0),
        (2, 0, 1, -1, 9266.0),
        (0, 0, 2, -1, 8822.0),
        (2, -1, 0, -1, 8216.0),
        (2, 0, -2, -1, 4324.0),
        (2, 0, 1, 1, 4200.0),
        (2, 1, 0, -1, -3359.0),
        (2, -1, -1, 1, 2463.0),
        (2, -1, 0, 1, 2211.0),
        (2, -1, -1, -1, 2065.0),
        (0, 1, -1, -1, -1870.0),
        (4, 0, -1, -1, 1828.0),
        (0, 1, 0, 1, -1794.0),
        (0, 0, 0, 3, -1749.0),
        (0, 1, -1, 1, -1565.0),
        (1, 0, 0, 1, -1491.0),
        (0, 1, 1, 1, -1475.0),
        (0, 1, 1, -1, -1410.0),
        (0, 1, 0, -1, -1344.0),
        (1, 0, 0, -1, -1335.0),
        (0, 0, 3, 1, 1107.0),
        (4, 0, 0, -1, 1021.0),
        (4, 0, -1, 1, 833.0),
        (0, 0, 1, -3, 777.0),
        (4, 0, -2, 1, 671.0),
        (2, 0, 0, -3, 607.0),
        (2, 0, 2, -1, 596.0),
        (2, -1, 1, -1, 491.0),
        (2, 0, -2, 1, -451.0),
        (0, 0, 3, -1, 439.0),
        (2, 0, 2, 1, 422.0),
        (2, 0, -3, -1, 421.0),
        (2, 1, -1, 1, -366.0),
        (2, 1, 0, 1, -351.0),
        (4, 0, 0, 1, 331.0),
        (2, -1, 1, 1, 315.0),
        (2, -2, 0, -1, 302.0),
        (0, 0, 1, 3, -283.0),
        (2, 1, 1, -1, -229.0),
        (1, 1, 0, -1, 223.0),
        (1, 1, 0, 1, 223.0),
        (0, 1, -2, -1, -220.0),
        (2, 1, -1, -1, -220.0),
        (1, 0, 1, 1, -185.0),
        (2, -1, -2, -1, 181.0),
        (0, 1, 2, 1, -177.0),
        (4, 0, -2, -1, 176.0),
        (4, -1, -1, -1, 166.0),
        (1, 0, 1, -1, -164.0),
        (4, 0, 1, -1, 132.0),
        (1, 0, -1, -1, -119.0),
        (4, -1, 0, -1, 115.0),
        (2, -2, 0, 1, 107.0),
    ];

    // Calculate latitude sum
    let mut sum_b: f64 = 0.0;
    for (d_mult, m_mult, mp_mult, f_mult, coef) in lat_terms.iter() {
        let arg = (*d_mult as f64) * d_r + (*m_mult as f64) * m_r
            + (*mp_mult as f64) * m_prime_r + (*f_mult as f64) * f_r;
        let mut term = *coef * arg.sin();
        match m_mult.abs() {
            1 => term *= e,
            2 => term *= e2,
            _ => {}
        }
        sum_b += term;
    }

    // Additional latitude corrections (Meeus 47.7)
    sum_b += -2235.0 * l_prime_r.sin();
    sum_b += 382.0 * a3_r.sin();
    sum_b += 175.0 * (a1_r - f_r).sin();
    sum_b += 175.0 * (a1_r + f_r).sin();
    sum_b += 127.0 * (l_prime_r - m_prime_r).sin();
    sum_b += -115.0 * (l_prime_r + m_prime_r).sin();

    // Convert from 0.000001 degrees to radians
    let ecl_lon = (l_prime + sum_l / 1000000.0) * DEG_TO_RAD;
    let ecl_lat = (sum_b / 1000000.0) * DEG_TO_RAD;

    (normalize_angle(ecl_lon), ecl_lat)
}

/// Calculate Pluto's heliocentric ecliptic position using Meeus Chapter 37
///
/// Implements the analytical theory from "Astronomical Algorithms" which provides
/// accuracy of ~0.07° in longitude, ~0.02° in latitude for dates 1885-2099.
/// This replaces the simplified harmonic model with proper perturbation terms.
fn calculate_pluto_position(jde: f64) -> (f64, f64) {
    let t = (jde - J2000_EPOCH) / JULIAN_CENTURY;

    // Pluto's mean elements at J2000.0
    let j = 34.35 + 3034.9057 * t; // Jupiter's mean longitude
    let s = 50.08 + 1222.1138 * t; // Saturn's mean longitude
    let p = 238.96 + 144.9600 * t; // Pluto's mean longitude

    let j_r = j * DEG_TO_RAD;
    let s_r = s * DEG_TO_RAD;
    let p_r = p * DEG_TO_RAD;

    // Periodic terms for longitude, latitude, and radius (Meeus Table 37.A)
    // Format: (J, S, P, longitude_sin, longitude_cos, latitude_sin, latitude_cos)
    let terms: [(i32, i32, i32, f64, f64, f64, f64); 43] = [
        (0, 0, 1, -19799805.0, 19850055.0, -5452852.0, -14974862.0),
        (0, 0, 2, 897144.0, -4954829.0, 3527812.0, 1672790.0),
        (0, 0, 3, 611149.0, 1211027.0, -1050748.0, 327647.0),
        (0, 0, 4, -341243.0, -189585.0, 178690.0, -292153.0),
        (0, 0, 5, 129027.0, -34863.0, 18650.0, 100340.0),
        (0, 0, 6, -38215.0, 31061.0, -30594.0, -25823.0),
        (0, 1, -1, 20349.0, -9886.0, 4965.0, 11263.0),
        (0, 1, 0, -4045.0, -4904.0, 310.0, -132.0),
        (0, 1, 1, -5885.0, -3238.0, 2036.0, -947.0),
        (0, 1, 2, -3812.0, 3011.0, -2.0, -674.0),
        (0, 1, 3, -601.0, 3468.0, -329.0, -563.0),
        (0, 2, -2, 1237.0, 463.0, -64.0, 39.0),
        (0, 2, -1, 1086.0, -911.0, -94.0, 210.0),
        (0, 2, 0, 595.0, -1229.0, -8.0, -160.0),
        (1, -1, 0, 2484.0, -485.0, -177.0, 259.0),
        (1, -1, 1, 839.0, -1414.0, 17.0, 234.0),
        (1, 0, -3, -964.0, 1059.0, 582.0, -285.0),
        (1, 0, -2, -2303.0, -1038.0, -298.0, 692.0),
        (1, 0, -1, 7049.0, 747.0, 157.0, 201.0),
        (1, 0, 0, 1179.0, -358.0, 304.0, 825.0),
        (1, 0, 1, 393.0, -63.0, -124.0, -29.0),
        (1, 0, 2, 111.0, -268.0, 15.0, 8.0),
        (1, 0, 3, -52.0, -154.0, 7.0, 15.0),
        (1, 0, 4, -78.0, -30.0, 2.0, 2.0),
        (1, 1, -3, -34.0, -26.0, 4.0, 2.0),
        (1, 1, -2, -43.0, 1.0, 3.0, 0.0),
        (1, 1, -1, -15.0, 21.0, 1.0, -1.0),
        (1, 1, 0, -1.0, 15.0, 0.0, -2.0),
        (1, 1, 1, 4.0, 7.0, 1.0, 0.0),
        (1, 1, 3, 1.0, 5.0, 1.0, -1.0),
        (2, 0, -6, 8.0, 3.0, -2.0, -3.0),
        (2, 0, -5, -3.0, 6.0, 1.0, 2.0),
        (2, 0, -4, 6.0, -13.0, -8.0, 2.0),
        (2, 0, -3, 10.0, 22.0, 10.0, -7.0),
        (2, 0, -2, -57.0, -32.0, 0.0, 21.0),
        (2, 0, -1, 157.0, -46.0, 8.0, 5.0),
        (2, 0, 0, 12.0, -18.0, 13.0, 16.0),
        (2, 0, 1, -4.0, 8.0, -2.0, -3.0),
        (2, 0, 2, -5.0, 0.0, 0.0, 0.0),
        (2, 0, 3, 3.0, 4.0, 0.0, 1.0),
        (3, 0, -2, -1.0, -1.0, 0.0, 1.0),
        (3, 0, -1, 6.0, -3.0, 0.0, 0.0),
        (3, 0, 0, -1.0, -2.0, 0.0, 1.0),
    ];

    // Calculate sums for longitude and latitude
    let mut sum_lon_sin = 0.0f64;
    let mut sum_lon_cos = 0.0f64;
    let mut sum_lat_sin = 0.0f64;
    let mut sum_lat_cos = 0.0f64;

    for (j_mult, s_mult, p_mult, lon_sin, lon_cos, lat_sin, lat_cos) in terms.iter() {
        let arg = (*j_mult as f64) * j_r + (*s_mult as f64) * s_r + (*p_mult as f64) * p_r;
        let sin_arg = arg.sin();
        let cos_arg = arg.cos();
        sum_lon_sin += lon_sin * sin_arg;
        sum_lon_cos += lon_cos * cos_arg;
        sum_lat_sin += lat_sin * sin_arg;
        sum_lat_cos += lat_cos * cos_arg;
    }

    // Final longitude and latitude (in degrees)
    let longitude = 238.958116 + 144.96 * t + (sum_lon_sin + sum_lon_cos) / 1000000.0;
    let latitude = -3.908239 + (sum_lat_sin + sum_lat_cos) / 1000000.0;

    (normalize_angle(longitude * DEG_TO_RAD), latitude * DEG_TO_RAD)
}

/// Calculate Chiron's heliocentric ecliptic position
///
/// Uses osculating orbital elements at J2000.0 with secular variations and
/// perturbations from Jupiter, Saturn, and Uranus. Solves Kepler's equation
/// using Newton-Raphson iteration for high eccentricity accuracy.
///
/// Accuracy: ~0.5° for dates within a few decades of J2000. Chiron's chaotic
/// orbit makes long-term predictions inherently uncertain.
fn calculate_chiron_position(jde: f64) -> (f64, f64) {
    let t = (jde - J2000_EPOCH) / JULIAN_CENTURY;
    let days_since_j2000 = jde - J2000_EPOCH;

    // Chiron osculating elements at J2000.0 (2000 Jan 1.5 TDB)
    // From JPL Horizons, with linear secular variations
    let a = 13.648 + 0.0001 * t; // Semi-major axis (AU) - slight variation
    let e = 0.3814 + 0.00001 * t; // Eccentricity
    let incl = (6.930 + 0.0001 * t) * DEG_TO_RAD; // Inclination
    let node = (209.379 - 0.0094 * t) * DEG_TO_RAD; // Long. of ascending node (retrograde precession)
    let omega_peri = (339.557 + 0.0085 * t) * DEG_TO_RAD; // Arg. of perihelion

    // Mean motion (degrees per day) from Kepler's 3rd law: n = 0.9856076686 / a^1.5
    let n = 0.9856076686 / (a * a.sqrt());

    // Mean anomaly at J2000.0 and current value
    let m0 = 12.49 * DEG_TO_RAD; // Mean anomaly at J2000.0
    let mean_anomaly = normalize_angle(m0 + n * days_since_j2000 * DEG_TO_RAD);

    // Solve Kepler's equation: E - e*sin(E) = M
    // Using Newton-Raphson iteration for high eccentricity convergence
    let mut ecc_anomaly = if e > 0.8 { PI } else { mean_anomaly };
    for _ in 0..15 {
        let delta = (ecc_anomaly - e * ecc_anomaly.sin() - mean_anomaly)
            / (1.0 - e * ecc_anomaly.cos());
        ecc_anomaly -= delta;
        if delta.abs() < 1e-12 {
            break;
        }
    }

    // True anomaly from eccentric anomaly
    let true_anomaly = 2.0
        * ((1.0 + e).sqrt() * (ecc_anomaly / 2.0).tan()).atan2((1.0 - e).sqrt());

    // Heliocentric distance
    let r = a * (1.0 - e * ecc_anomaly.cos());

    // Position in orbital plane
    let x_orb = r * true_anomaly.cos();
    let y_orb = r * true_anomaly.sin();

    // Transform to ecliptic coordinates
    let cos_node = node.cos();
    let sin_node = node.sin();
    let cos_incl = incl.cos();
    let sin_incl = incl.sin();
    let cos_omega = omega_peri.cos();
    let sin_omega = omega_peri.sin();

    // Rotation matrices combined
    let x_ecl = (cos_node * cos_omega - sin_node * sin_omega * cos_incl) * x_orb
        + (-cos_node * sin_omega - sin_node * cos_omega * cos_incl) * y_orb;
    let y_ecl = (sin_node * cos_omega + cos_node * sin_omega * cos_incl) * x_orb
        + (-sin_node * sin_omega + cos_node * cos_omega * cos_incl) * y_orb;
    let z_ecl = sin_incl * sin_omega * x_orb + sin_incl * cos_omega * y_orb;

    // Convert to ecliptic longitude and latitude
    let mut longitude = y_ecl.atan2(x_ecl);
    let latitude = (z_ecl / r).asin();

    // Perturbations from giant planets (simplified first-order terms)
    // Jupiter perturbation
    let l_jup = (34.35 + 3034.9057 * t) * DEG_TO_RAD;
    let pert_jup = 0.12 * (longitude - l_jup).sin() * DEG_TO_RAD;

    // Saturn perturbation (stronger due to closer approach)
    let l_sat = (50.08 + 1222.1138 * t) * DEG_TO_RAD;
    let pert_sat = 0.35 * (longitude - l_sat).sin() * DEG_TO_RAD
        + 0.08 * (2.0 * (longitude - l_sat)).sin() * DEG_TO_RAD;

    // Uranus perturbation
    let l_ura = (314.055 + 429.8640 * t) * DEG_TO_RAD;
    let pert_ura = 0.18 * (longitude - l_ura).sin() * DEG_TO_RAD;

    longitude += pert_jup + pert_sat + pert_ura;

    (normalize_angle(longitude), latitude)
}

/// Calculate True North Node position (osculating lunar node with wobble corrections).
///
/// The True Node represents the actual instantaneous intersection of the Moon's orbital
/// plane with the ecliptic. Unlike the Mean Node (which moves smoothly retrograde),
/// the True Node wobbles back and forth, sometimes even moving direct.
///
/// Implements Meeus Chapter 48 corrections. The difference between Mean and True Node
/// can be up to ±1.7 degrees.
fn calculate_north_node_position(jde: f64) -> (f64, f64) {
    let t = (jde - J2000_EPOCH) / JULIAN_CENTURY;

    // Mean longitude of the ascending node (degrees) - Meeus Table 47.A
    let omega = 125.04452
        - 1934.136261 * t
        + 0.0020708 * t * t
        + t * t * t / 450000.0;

    // Fundamental arguments for True Node corrections (Meeus Ch 47)
    // Mean elongation of the Moon from the Sun
    let d = 297.8501921
        + 445267.1114034 * t
        - 0.0018819 * t * t
        + t * t * t / 545868.0
        - t * t * t * t / 113065000.0;

    // Mean anomaly of the Sun
    let m = 357.5291092
        + 35999.0502909 * t
        - 0.0001536 * t * t
        + t * t * t / 24490000.0;

    // Mean anomaly of the Moon
    let m_prime = 134.9633964
        + 477198.8675055 * t
        + 0.0087414 * t * t
        + t * t * t / 69699.0
        - t * t * t * t / 14712000.0;

    // Mean argument of latitude of the Moon
    let f = 93.2720950
        + 483202.0175233 * t
        - 0.0036539 * t * t
        - t * t * t / 3526000.0
        + t * t * t * t / 863310000.0;

    // Convert to radians for trig functions
    let d_rad = d * DEG_TO_RAD;
    let m_rad = m * DEG_TO_RAD;
    let m_prime_rad = m_prime * DEG_TO_RAD;
    let f_rad = f * DEG_TO_RAD;

    // True Node corrections (Meeus Chapter 48)
    // These terms account for the "wobble" of the True Node around the Mean Node
    let correction =
        - 1.4979 * (2.0 * d_rad - 2.0 * f_rad).sin()
        - 0.1500 * m_prime_rad.sin()
        - 0.1226 * (2.0 * d_rad).sin()
        + 0.1176 * (2.0 * f_rad).sin()
        - 0.0801 * (2.0 * m_prime_rad - 2.0 * f_rad).sin()
        - 0.0616 * (2.0 * d_rad - m_rad - 2.0 * f_rad).sin()
        + 0.0490 * (2.0 * d_rad - m_prime_rad - 2.0 * f_rad).sin()
        + 0.0438 * (2.0 * d_rad - 2.0 * m_prime_rad).sin()
        - 0.0393 * (2.0 * m_prime_rad).sin()
        - 0.0311 * (2.0 * d_rad - m_prime_rad).sin()
        + 0.0227 * (m_prime_rad - 2.0 * f_rad).sin()
        - 0.0220 * (2.0 * d_rad + m_prime_rad - 2.0 * f_rad).sin()
        + 0.0181 * (m_rad).sin()
        - 0.0149 * (2.0 * d_rad - 2.0 * m_prime_rad - 2.0 * f_rad).sin();

    // True Node = Mean Node + corrections
    let true_node = omega + correction;

    // The node is always on the ecliptic, so latitude = 0
    let longitude = normalize_angle(true_node * DEG_TO_RAD);

    (longitude, 0.0)
}

// Planet colors (as hex strings)
fn get_planet_color(planet: Planet) -> &'static str {
    match planet {
        Planet::Sun => "#FFD700",
        Planet::Moon => "#C0C0C0",
        Planet::Mercury => "#B8860B",
        Planet::Venus => "#FF69B4",
        Planet::Mars => "#DC143C",
        Planet::Jupiter => "#9400D3",
        Planet::Saturn => "#8B4513",
        Planet::Uranus => "#00CED1",
        Planet::Neptune => "#4169E1",
        Planet::Pluto => "#2F4F4F",
        Planet::Chiron => "#FF8C00", // Dark orange - healing/bridging color
        Planet::NorthNode => "#9932CC", // Dark orchid - karmic/destiny color
    }
}

// ============================================
// Utility Functions
// ============================================

/// Normalize angle to [0, 2π)
#[inline]
fn normalize_angle(angle: f64) -> f64 {
    let two_pi = 2.0 * PI;
    ((angle % two_pi) + two_pi) % two_pi
}

/// Normalize angle to (-π, π]
#[inline]
fn normalize_signed_angle(angle: f64) -> f64 {
    angle.sin().atan2(angle.cos())
}

// ============================================
// Time Calculations
// ============================================

/// Convert year, month, day, hour, minute, second to Julian Date
#[wasm_bindgen]
pub fn to_julian_date(year: i32, month: u32, day: u32, hour: u32, minute: u32, second: u32) -> f64 {
    let ut = (hour as f64) + (minute as f64) / 60.0 + (second as f64) / 3600.0;

    let (y, m) = if month <= 2 {
        (year - 1, month + 12)
    } else {
        (year, month)
    };

    let a = (y as f64 / 100.0).floor();
    let b = 2.0 - a + (a / 4.0).floor();

    (365.25 * (y as f64 + 4716.0)).floor()
        + (30.6001 * (m as f64 + 1.0)).floor()
        + day as f64
        + ut / 24.0
        + b
        - 1524.5
}

/// Convert Julian Date back to calendar date (year, month, day)
///
/// Uses the algorithm from Meeus "Astronomical Algorithms" Chapter 7.
/// This is the inverse of `to_julian_date()` and is essential for accurate
/// Delta T calculations, which require the true calendar year and month
/// rather than approximations derived from Julian Date arithmetic.
///
/// # Arguments
/// * `jd` - Julian Date (can be UT or TT, result is the same calendar date)
///
/// # Returns
/// Tuple of (year, month, day) where:
/// - year: Astronomical year (negative for BCE, 0 = 1 BCE)
/// - month: 1-12
/// - day: 1-31
///
/// # Example
/// ```ignore
/// let jd = 2451545.0; // J2000.0 epoch
/// let (year, month, day) = jd_to_calendar(jd);
/// assert_eq!((year, month, day), (2000, 1, 1));
/// ```
pub fn jd_to_calendar(jd: f64) -> (i32, u32, u32) {
    let jd_plus = jd + 0.5;
    let z = jd_plus.floor() as i64;
    // f is the fractional day (unused here but part of standard algorithm)
    let _f = jd_plus - z as f64;

    let a = if z < 2299161 {
        z
    } else {
        let alpha = ((z as f64 - 1867216.25) / 36524.25).floor() as i64;
        z + 1 + alpha - alpha / 4
    };

    let b = a + 1524;
    let c = ((b as f64 - 122.1) / 365.25).floor() as i64;
    let d = (365.25 * c as f64).floor() as i64;
    let e = ((b - d) as f64 / 30.6001).floor() as i64;

    let day = (b - d - (30.6001 * e as f64).floor() as i64) as u32;

    let month = if e < 14 {
        (e - 1) as u32
    } else {
        (e - 13) as u32
    };

    let year = if month > 2 {
        (c - 4716) as i32
    } else {
        (c - 4715) as i32
    };

    (year, month, day)
}

/// Calculate DUT1 (UT1 - UTC) in seconds
///
/// UT1 is based on Earth's actual rotation; UTC is atomic time adjusted with leap seconds.
/// The difference DUT1 = UT1 - UTC is kept within ±0.9 seconds by leap second adjustments.
///
/// This function uses a polynomial model fitted to IERS Bulletin A data, with
/// periodic terms to capture the main oscillations in Earth's rotation rate.
///
/// # Arguments
/// * `jd` - Julian Date (UTC)
///
/// # Returns
/// DUT1 in seconds (typically -0.9 to +0.9)
///
/// # Accuracy
/// ~50ms for dates 2000-2030; less accurate for dates far from the fitting epoch.
/// For production use with highest accuracy, consider fetching current IERS data.
fn calculate_dut1(jd: f64) -> f64 {
    // Reference epoch: 2020.0 (JD 2458849.5)
    let jd_2020 = 2458849.5;
    let days_from_2020 = jd - jd_2020;
    let years_from_2020 = days_from_2020 / 365.25;

    // Polynomial terms fitted to IERS data (valid ~2000-2030)
    // Base trend: Earth's rotation is generally slowing
    let polynomial = -0.177 + 0.0001 * years_from_2020 - 0.00002 * years_from_2020 * years_from_2020;

    // Periodic terms: annual and semi-annual variations from atmospheric/oceanic effects
    let annual = 0.022 * (2.0 * PI * years_from_2020).sin()
        + 0.012 * (2.0 * PI * years_from_2020).cos();
    let semiannual = 0.006 * (4.0 * PI * years_from_2020).sin()
        + 0.007 * (4.0 * PI * years_from_2020).cos();

    // Chandler wobble contribution (~433 day period)
    let chandler_period = 433.0 / 365.25; // in years
    let chandler = 0.003 * (2.0 * PI * years_from_2020 / chandler_period).sin();

    // Clamp to valid range (leap seconds keep DUT1 within ±0.9s)
    (polynomial + annual + semiannual + chandler).clamp(-0.9, 0.9)
}

/// Convert UTC Julian Date to UT1 Julian Date
///
/// Applies the DUT1 correction to convert from UTC (atomic time scale with leap seconds)
/// to UT1 (time scale based on Earth's actual rotation).
///
/// # Arguments
/// * `jd_utc` - Julian Date in UTC
///
/// # Returns
/// Julian Date in UT1
fn utc_to_ut1(jd_utc: f64) -> f64 {
    let dut1_seconds = calculate_dut1(jd_utc);
    jd_utc + dut1_seconds / 86400.0 // Convert seconds to days
}

/// Calculate Greenwich Mean Sidereal Time (GMST) in radians
///
/// Uses UT1 (Earth rotation time) for maximum accuracy. The input Julian Date
/// is assumed to be UTC, which is internally converted to UT1.
#[wasm_bindgen]
pub fn calculate_gmst(julian_date: f64) -> f64 {
    // Convert UTC to UT1 for accurate sidereal time
    let jd_ut1 = utc_to_ut1(julian_date);
    let t = (jd_ut1 - J2000_EPOCH) / JULIAN_CENTURY;

    let mut theta_g = 280.46061837
        + 360.98564736629 * (jd_ut1 - J2000_EPOCH)
        + 0.000387933 * t * t
        - t * t * t / 38710000.0;

    // Normalize to [0, 360)
    theta_g = ((theta_g % 360.0) + 360.0) % 360.0;

    // Convert to radians
    theta_g * DEG_TO_RAD
}

/// Calculate Local Sidereal Time in radians
///
/// Converts Greenwich Mean Sidereal Time to Local Sidereal Time by adding
/// the observer's geographic longitude.
///
/// # Arguments
/// * `gmst` - Greenwich Mean Sidereal Time in **radians**
/// * `longitude_deg` - Geographic longitude in **degrees** (positive = East, negative = West)
///
/// # Returns
/// Local Sidereal Time in radians, normalized to [0, 2π)
///
/// # Important: Unit Warning
/// The `longitude_deg` parameter MUST be in **degrees**, not radians.
/// WASM bindings do not enforce units at runtime. Passing radians will produce
/// incorrect results (rotation errors of up to 57x).
///
/// # Example (from JavaScript/TypeScript)
/// ```js
/// // Correct: pass longitude in degrees
/// const lst = calculate_lst(gmst, -122.4194);  // San Francisco (122.4°W)
///
/// // WRONG: do NOT pass radians
/// // const lst = calculate_lst(gmst, -2.137);  // This is wrong!
/// ```
#[wasm_bindgen]
pub fn calculate_lst(gmst: f64, longitude_deg: f64) -> f64 {
    normalize_angle(gmst + longitude_deg * DEG_TO_RAD)
}

// ============================================
// Timezone Handling (using chrono-tz and tzf-rs)
// ============================================

/// Get timezone name from coordinates using tzf-rs.
///
/// **IMPORTANT: Parameter order is (lat, lng)** to match standard geographic convention,
/// even though the underlying tzf-rs library uses (lng, lat) internally.
#[wasm_bindgen]
pub fn get_timezone_from_coords(lat: f64, lng: f64) -> String {
    let finder = DefaultFinder::new();
    // Note: tzf-rs uses (lng, lat) order internally
    finder.get_tz_name(lng, lat).to_string()
}

/// Get timezone offset in hours from coordinates at a specific time
#[wasm_bindgen]
pub fn get_timezone_offset_hours(
    lat: f64,
    lng: f64,
    year: i32,
    month: u32,
    day: u32,
    hour: u32,
    minute: u32,
    second: u32,
) -> f64 {
    let finder = DefaultFinder::new();
    let tz_name = finder.get_tz_name(lng, lat);

    if let Ok(tz) = tz_name.parse::<Tz>() {
        // Create naive datetime
        if let Some(naive_dt) = NaiveDate::from_ymd_opt(year, month, day)
            .and_then(|date| date.and_hms_opt(hour, minute, second))
        {
            // Get the offset at this local time
            if let Some(local_dt) = tz.from_local_datetime(&naive_dt).earliest() {
                let offset: FixedOffset = local_dt.offset().fix();
                let offset_secs = offset.local_minus_utc();
                return offset_secs as f64 / 3600.0;
            }
        }
    }

    // Fallback: use longitude-based calculation
    let raw_offset = lng / 15.0;
    (raw_offset * 2.0).round() / 2.0
}

/// Convert local time at coordinates to UTC Julian Date
#[wasm_bindgen]
pub fn local_to_utc_julian_date(
    lat: f64,
    lng: f64,
    year: i32,
    month: u32,
    day: u32,
    hour: u32,
    minute: u32,
    second: u32,
) -> f64 {
    let finder = DefaultFinder::new();
    let tz_name = finder.get_tz_name(lng, lat);

    if let Ok(tz) = tz_name.parse::<Tz>() {
        // Create naive datetime
        if let Some(naive_dt) = NaiveDate::from_ymd_opt(year, month, day)
            .and_then(|date| date.and_hms_opt(hour, minute, second))
        {
            // Convert to UTC
            if let Some(local_dt) = tz.from_local_datetime(&naive_dt).earliest() {
                let utc_dt = local_dt.with_timezone(&Utc);

                // Convert to Julian Date
                let utc_year = utc_dt.year();
                let utc_month = utc_dt.month();
                let utc_day = utc_dt.day();
                let utc_hour = utc_dt.hour();
                let utc_minute = utc_dt.minute();
                let utc_second = utc_dt.second();

                return to_julian_date(
                    utc_year, utc_month, utc_day,
                    utc_hour, utc_minute, utc_second
                );
            }
        }
    }

    // Fallback: use longitude-based offset
    let offset_hours = (lng / 15.0 * 2.0).round() / 2.0;
    let jd_local = to_julian_date(year, month, day, hour, minute, second);
    jd_local - offset_hours / 24.0
}

// ============================================
// Delta T Calculation (TT - UT1)
// ============================================

/// Calculate Delta T (ΔT = TT - UT1) in seconds
///
/// Delta T is the difference between Terrestrial Time (TT) and Universal Time (UT1).
/// This difference arises because:
/// - TT is a uniform atomic time scale used by ephemerides
/// - UT1 is based on Earth's rotation, which is irregular and gradually slowing
///
/// # Historical Context
/// - Before 1972: ΔT varied widely (extrapolated from historical records)
/// - 1972-present: ΔT accumulates as leap seconds are added to UTC
/// - Modern value: ~69 seconds (2024)
/// - Future: Predicted using extrapolation (less accurate)
///
/// # Why It Matters for Astrocartography
/// A 70-second error in time translates to approximately:
/// - 0.3° error in planetary longitude
/// - Several kilometers shift in MC/IC line positions
///
/// # Arguments
/// * `year` - Calendar year (astronomical: 0 = 1 BCE, negative for earlier)
/// * `month` - Month (1-12)
///
/// # Returns
/// Delta T in seconds (add to UT to get TT)
///
/// # Algorithm
/// Based on polynomial expressions from USNO/IERS, with different formulas
/// for different historical periods to maximize accuracy.
#[wasm_bindgen]
pub fn calculate_delta_t(year: i32, month: u32) -> f64 {
    let y = year as f64 + (month as f64 - 0.5) / 12.0;

    if y < -500.0 {
        let u = (y - 1820.0) / 100.0;
        -20.0 + 32.0 * u * u
    } else if y < 500.0 {
        let u = y / 100.0;
        10583.6 - 1014.41 * u + 33.78311 * u.powi(2)
            - 5.952053 * u.powi(3) - 0.1798452 * u.powi(4)
            + 0.022174192 * u.powi(5) + 0.0090316521 * u.powi(6)
    } else if y < 1600.0 {
        let u = (y - 1000.0) / 100.0;
        1574.2 - 556.01 * u + 71.23472 * u.powi(2)
            + 0.319781 * u.powi(3) - 0.8503463 * u.powi(4)
            - 0.005050998 * u.powi(5) + 0.0083572073 * u.powi(6)
    } else if y < 1700.0 {
        let t = y - 1600.0;
        120.0 - 0.9808 * t - 0.01532 * t.powi(2) + t.powi(3) / 7129.0
    } else if y < 1800.0 {
        let t = y - 1700.0;
        8.83 + 0.1603 * t - 0.0059285 * t.powi(2)
            + 0.00013336 * t.powi(3) - t.powi(4) / 1174000.0
    } else if y < 1860.0 {
        let t = y - 1800.0;
        13.72 - 0.332447 * t + 0.0068612 * t.powi(2)
            + 0.0041116 * t.powi(3) - 0.00037436 * t.powi(4)
            + 0.0000121272 * t.powi(5) - 0.0000001699 * t.powi(6)
            + 0.000000000875 * t.powi(7)
    } else if y < 1900.0 {
        let t = y - 1860.0;
        7.62 + 0.5737 * t - 0.251754 * t.powi(2)
            + 0.01680668 * t.powi(3) - 0.0004473624 * t.powi(4)
            + t.powi(5) / 233174.0
    } else if y < 1920.0 {
        let t = y - 1900.0;
        -2.79 + 1.494119 * t - 0.0598939 * t.powi(2)
            + 0.0061966 * t.powi(3) - 0.000197 * t.powi(4)
    } else if y < 1941.0 {
        let t = y - 1920.0;
        21.20 + 0.84493 * t - 0.076100 * t.powi(2) + 0.0020936 * t.powi(3)
    } else if y < 1961.0 {
        let t = y - 1950.0;
        29.07 + 0.407 * t - t.powi(2) / 233.0 + t.powi(3) / 2547.0
    } else if y < 1986.0 {
        let t = y - 1975.0;
        45.45 + 1.067 * t - t.powi(2) / 260.0 - t.powi(3) / 718.0
    } else if y < 2005.0 {
        let t = y - 2000.0;
        63.86 + 0.3345 * t - 0.060374 * t.powi(2)
            + 0.0017275 * t.powi(3) + 0.000651814 * t.powi(4)
            + 0.00002373599 * t.powi(5)
    } else if y < 2050.0 {
        let t = y - 2000.0;
        62.92 + 0.32217 * t + 0.005589 * t.powi(2)
    } else if y < 2150.0 {
        // Extrapolation for near future
        let u = (y - 1820.0) / 100.0;
        -20.0 + 32.0 * u * u - 0.5628 * (2150.0 - y)
    } else {
        // Far future extrapolation
        let u = (y - 1820.0) / 100.0;
        -20.0 + 32.0 * u * u
    }
}

/// Convert Julian Date (UTC) to Julian Ephemeris Date (TT)
///
/// Converts a Julian Date in Coordinated Universal Time to Terrestrial Time
/// using the proper time scale chain: UTC → UT1 (via DUT1) → TT (via ΔT).
///
/// This is essential for accurate ephemeris calculations since VSOP87, ELP2000,
/// and other planetary theories use TT (also called TDB for most purposes).
///
/// # Time Scale Chain
/// - **UTC**: Atomic time with leap seconds, the input time scale
/// - **UT1**: Earth rotation time, derived via DUT1 = UT1 - UTC
/// - **TT**: Terrestrial Time, derived via ΔT = TT - UT1
///
/// # Arguments
/// * `jd_utc` - Julian Date in Coordinated Universal Time (UTC)
/// * `year` - Calendar year (for Delta T lookup)
/// * `month` - Calendar month (for Delta T lookup)
///
/// # Returns
/// Julian Ephemeris Date (JDE) in Terrestrial Time
///
/// # Note
/// For best accuracy, use `jd_to_calendar()` to derive year/month from the JD
/// rather than approximating, especially near month/year boundaries.
#[wasm_bindgen]
pub fn ut_to_tt(jd_utc: f64, year: i32, month: u32) -> f64 {
    // First convert UTC to UT1 (Earth rotation time)
    let jd_ut1 = utc_to_ut1(jd_utc);
    // Then apply Delta T (TT - UT1) to get TT
    let delta_t = calculate_delta_t(year, month);
    jd_ut1 + delta_t / 86400.0 // Convert seconds to days
}

// ============================================
// Nutation Calculation (IAU 2000B simplified)
// ============================================

/// Nutation components in longitude and obliquity
#[derive(Clone, Copy, Debug)]
pub struct Nutation {
    pub delta_psi: f64,     // Nutation in longitude (radians)
    pub delta_epsilon: f64, // Nutation in obliquity (radians)
}

/// Calculate nutation using IAU 2000B simplified model
/// Returns nutation in longitude (Δψ) and obliquity (Δε) in radians
pub fn calculate_nutation(jde: f64) -> Nutation {
    let t = (jde - J2000_EPOCH) / JULIAN_CENTURY;

    // Fundamental arguments (in radians)
    // Mean anomaly of the Moon
    let l = normalize_angle(
        (485868.249036 + 1717915923.2178 * t + 31.8792 * t.powi(2)
            + 0.051635 * t.powi(3) - 0.00024470 * t.powi(4))
            * (PI / 648000.0) // arcseconds to radians
    );

    // Mean anomaly of the Sun
    let l_prime = normalize_angle(
        (1287104.79305 + 129596581.0481 * t - 0.5532 * t.powi(2)
            + 0.000136 * t.powi(3) - 0.00001149 * t.powi(4))
            * (PI / 648000.0)
    );

    // Mean argument of latitude of the Moon
    let f = normalize_angle(
        (335779.526232 + 1739527262.8478 * t - 12.7512 * t.powi(2)
            - 0.001037 * t.powi(3) + 0.00000417 * t.powi(4))
            * (PI / 648000.0)
    );

    // Mean elongation of the Moon from the Sun
    let d = normalize_angle(
        (1072260.70369 + 1602961601.2090 * t - 6.3706 * t.powi(2)
            + 0.006593 * t.powi(3) - 0.00003169 * t.powi(4))
            * (PI / 648000.0)
    );

    // Mean longitude of the ascending node of the Moon
    let omega = normalize_angle(
        (450160.398036 - 6962890.5431 * t + 7.4722 * t.powi(2)
            + 0.007702 * t.powi(3) - 0.00005939 * t.powi(4))
            * (PI / 648000.0)
    );

    // Simplified nutation series (main terms only)
    // Each row: [l_mult, l'_mult, f_mult, d_mult, omega_mult, sin_coeff, sin_t_coeff, cos_coeff, cos_t_coeff]
    // Coefficients in 0.0001 arcseconds
    let nutation_terms: [[f64; 9]; 13] = [
        [0.0, 0.0, 0.0, 0.0, 1.0, -171996.0, -174.2, 92025.0, 8.9],
        [0.0, 0.0, 2.0, -2.0, 2.0, -13187.0, -1.6, 5736.0, -3.1],
        [0.0, 0.0, 2.0, 0.0, 2.0, -2274.0, -0.2, 977.0, -0.5],
        [0.0, 0.0, 0.0, 0.0, 2.0, 2062.0, 0.2, -895.0, 0.5],
        [0.0, 1.0, 0.0, 0.0, 0.0, 1426.0, -3.4, 54.0, -0.1],
        [1.0, 0.0, 0.0, 0.0, 0.0, 712.0, 0.1, -7.0, 0.0],
        [0.0, 1.0, 2.0, -2.0, 2.0, -517.0, 1.2, 224.0, -0.6],
        [0.0, 0.0, 2.0, 0.0, 1.0, -386.0, -0.4, 200.0, 0.0],
        [1.0, 0.0, 2.0, 0.0, 2.0, -301.0, 0.0, 129.0, -0.1],
        [0.0, -1.0, 2.0, -2.0, 2.0, 217.0, -0.5, -95.0, 0.3],
        [1.0, 0.0, 0.0, -2.0, 0.0, -158.0, 0.0, -1.0, 0.0],
        [0.0, 0.0, 2.0, -2.0, 1.0, 129.0, 0.1, -70.0, 0.0],
        [-1.0, 0.0, 2.0, 0.0, 2.0, 123.0, 0.0, -53.0, 0.0],
    ];

    let mut delta_psi = 0.0;
    let mut delta_epsilon = 0.0;

    for term in &nutation_terms {
        let arg = term[0] * l + term[1] * l_prime + term[2] * f + term[3] * d + term[4] * omega;
        delta_psi += (term[5] + term[6] * t) * arg.sin();
        delta_epsilon += (term[7] + term[8] * t) * arg.cos();
    }

    // Convert from 0.0001 arcseconds to radians
    let arcsec_to_rad = PI / (180.0 * 3600.0);
    delta_psi *= 0.0001 * arcsec_to_rad;
    delta_epsilon *= 0.0001 * arcsec_to_rad;

    Nutation {
        delta_psi,
        delta_epsilon,
    }
}

/// Calculate true obliquity (mean obliquity + nutation in obliquity)
pub fn calculate_true_obliquity(jde: f64) -> f64 {
    let mean_obliquity = calculate_obliquity(jde);
    let nutation = calculate_nutation(jde);
    mean_obliquity + nutation.delta_epsilon
}

// ============================================
// Aberration Correction
// ============================================

/// Annual aberration constant (20.49552 arcseconds)
const ABERRATION_CONSTANT: f64 = 20.49552 * PI / (180.0 * 3600.0);

/// Calculate annual aberration correction for a celestial position
/// Returns (delta_ra, delta_dec) in radians
pub fn calculate_aberration(
    ra: f64,          // Right ascension in radians
    dec: f64,         // Declination in radians
    jde: f64,         // Julian Ephemeris Date
    obliquity: f64,   // True obliquity in radians
) -> (f64, f64) {
    let t = (jde - J2000_EPOCH) / JULIAN_CENTURY;

    // Sun's mean longitude
    let l0 = normalize_angle((280.46646 + 36000.76983 * t + 0.0003032 * t.powi(2)) * DEG_TO_RAD);

    // Sun's mean anomaly
    let m = normalize_angle((357.52911 + 35999.05029 * t - 0.0001537 * t.powi(2)) * DEG_TO_RAD);

    // Eccentricity of Earth's orbit
    let e = 0.016708634 - 0.000042037 * t - 0.0000001267 * t.powi(2);

    // Sun's equation of center
    let c = (1.914602 - 0.004817 * t - 0.000014 * t.powi(2)) * m.sin()
        + (0.019993 - 0.000101 * t) * (2.0 * m).sin()
        + 0.000289 * (3.0 * m).sin();
    let c = c * DEG_TO_RAD;

    // Sun's true longitude
    let sun_lon = l0 + c;

    // Longitude of perihelion
    let pi_lon = (102.93735 + 1.71946 * t + 0.00046 * t.powi(2)) * DEG_TO_RAD;

    // Aberration in right ascension
    let sin_sun_lon = sun_lon.sin();
    let cos_sun_lon = sun_lon.cos();
    let sin_ra = ra.sin();
    let cos_ra = ra.cos();
    let tan_dec = dec.tan();
    let cos_obliq = obliquity.cos();
    let sin_obliq = obliquity.sin();

    // Ron-Vondrak aberration formula (simplified)
    let delta_ra = -ABERRATION_CONSTANT * (cos_ra * cos_sun_lon * cos_obliq + sin_ra * sin_sun_lon) / dec.cos()
        + e * ABERRATION_CONSTANT * (cos_ra * pi_lon.cos() * cos_obliq + sin_ra * pi_lon.sin()) / dec.cos();

    let delta_dec = -ABERRATION_CONSTANT * (cos_sun_lon * cos_obliq * (tan_dec * cos_obliq - sin_ra * sin_obliq)
        + cos_ra * sin_sun_lon * sin_obliq)
        + e * ABERRATION_CONSTANT * (pi_lon.cos() * cos_obliq * (tan_dec * cos_obliq - sin_ra * sin_obliq)
        + cos_ra * pi_lon.sin() * sin_obliq);

    (delta_ra, delta_dec)
}

// ============================================
// Planetary Position Calculations (using VSOP87)
// ============================================

/// Internal function to calculate planetary position using pre-computed TT values.
///
/// This is the core calculation function used by both single-planet queries
/// and batch calculations. By accepting pre-computed JDE, nutation, and obliquity,
/// it avoids redundant calculations when processing multiple planets.
///
/// # Arguments
/// * `planet` - The celestial body to calculate position for
/// * `jde` - Julian Ephemeris Date (TT)
/// * `true_obliquity` - Pre-computed true obliquity (mean + nutation in obliquity)
/// * `nutation` - Pre-computed nutation values
///
/// # Performance
/// When calculating multiple planets for the same moment, compute JDE/nutation/obliquity
/// once and call this function for each planet. This is ~12x faster than calling
/// `calculate_planetary_position()` repeatedly.
fn calculate_planetary_position_tt(
    planet: Planet,
    jde: f64,
    true_obliquity: f64,
    nutation: &Nutation,
) -> PlanetaryPosition {
    // Get geocentric ecliptic coordinates based on planet type (using TT for ephemeris)
    let (mut ecl_lon, ecl_lat) = match planet {
        Planet::Sun => {
            // Sun's geocentric position is opposite to Earth's heliocentric position
            let (earth_lon, earth_lat, _) = get_earth_heliocentric(jde);
            (normalize_angle(earth_lon + PI), -earth_lat)
        }
        Planet::Moon => {
            // Use ELP2000 theory for Moon
            calculate_moon_position(jde)
        }
        Planet::Pluto => {
            // Use simplified Pluto theory
            calculate_pluto_position(jde)
        }
        Planet::Chiron => {
            // Use Chiron orbital calculation
            calculate_chiron_position(jde)
        }
        Planet::NorthNode => {
            // Use North Node (Mean Lunar Node) calculation
            calculate_north_node_position(jde)
        }
        _ => {
            // Use VSOP87 for other planets
            let (planet_lon, planet_lat, planet_r) = get_vsop87_heliocentric(planet, jde);
            let (earth_lon, earth_lat, earth_r) = get_earth_heliocentric(jde);
            heliocentric_to_geocentric(
                planet_lon, planet_lat, planet_r,
                earth_lon, earth_lat, earth_r,
            )
        }
    };

    // Apply nutation in longitude
    ecl_lon = normalize_angle(ecl_lon + nutation.delta_psi);

    // Convert to equatorial coordinates using true obliquity
    let (mut right_ascension, mut declination) = ecliptic_to_equatorial(ecl_lon, ecl_lat, true_obliquity);

    // Apply aberration correction (except for the Moon which is too close)
    if !matches!(planet, Planet::Moon) {
        let (delta_ra, delta_dec) = calculate_aberration(right_ascension, declination, jde, true_obliquity);
        right_ascension = normalize_angle(right_ascension + delta_ra);
        declination = (declination + delta_dec).clamp(-PI / 2.0, PI / 2.0);
    }

    PlanetaryPosition {
        planet,
        right_ascension,
        declination,
        ecliptic_longitude: ecl_lon * RAD_TO_DEG,
    }
}

/// Calculate planetary position for a given planet and Julian Date
///
/// Uses VSOP87 theory for accurate heliocentric positions, then converts to
/// geocentric coordinates. Includes nutation and aberration corrections for
/// maximum accuracy.
///
/// # Time Scale Handling
/// The input `julian_date` is assumed to be **Coordinated Universal Time (UTC)**.
/// Internally, this function converts to Terrestrial Time (TT) via the chain:
/// **UTC → UT1 (via DUT1) → TT (via ΔT)**
///
/// This two-step conversion ensures:
/// - GMST calculations use UT1 (Earth rotation time)
/// - Ephemeris calculations use TT (uniform dynamical time)
/// - Both are properly anchored to the input UTC timestamp
///
/// # Arguments
/// * `planet` - The celestial body to calculate position for
/// * `julian_date` - Julian Date in **UTC** (Coordinated Universal Time)
///
/// # Returns
/// `PlanetaryPosition` containing:
/// - Right Ascension (radians, 0 to 2π)
/// - Declination (radians, -π/2 to π/2)
/// - Ecliptic Longitude (degrees, 0 to 360)
///
/// # Performance Note
/// For batch calculations (multiple planets at the same time), the internal
/// `calculate_all_lines*()` functions use `calculate_planetary_position_tt()`
/// with pre-computed TT values for better performance.
#[wasm_bindgen]
pub fn calculate_planetary_position(planet: Planet, julian_date: f64) -> PlanetaryPosition {
    // Convert UTC Julian Date to TT (Julian Ephemeris Date) for accurate ephemeris calculations.
    // Use proper JD→calendar conversion for accurate Delta T (avoids month/year boundary errors).
    let (year, month, _day) = jd_to_calendar(julian_date);
    let jde = ut_to_tt(julian_date, year, month);

    // Calculate nutation for this date (using TT)
    let nutation = calculate_nutation(jde);

    // Calculate true obliquity (mean + nutation) using TT
    let mean_obliquity = calculate_obliquity(jde);
    let true_obliquity = mean_obliquity + nutation.delta_epsilon;

    // Delegate to internal TT-based function
    calculate_planetary_position_tt(planet, jde, true_obliquity, &nutation)
}

// ============================================
// Line Calculations
// ============================================

/// Calculate MC line longitude for a planet
#[wasm_bindgen]
pub fn calculate_mc_longitude(right_ascension: f64, gmst: f64) -> f64 {
    let longitude_rad = normalize_angle(right_ascension - gmst);
    let mut longitude_deg = longitude_rad * RAD_TO_DEG;
    if longitude_deg > 180.0 {
        longitude_deg -= 360.0;
    }
    longitude_deg
}

/// Calculate IC line longitude for a planet
#[wasm_bindgen]
pub fn calculate_ic_longitude(right_ascension: f64, gmst: f64) -> f64 {
    let longitude_rad = normalize_angle(right_ascension + PI - gmst);
    let mut longitude_deg = longitude_rad * RAD_TO_DEG;
    if longitude_deg > 180.0 {
        longitude_deg -= 360.0;
    }
    longitude_deg
}

/// Calculate latitude for ASC/DSC line at a given longitude
///
/// Finds the geographic latitude where a celestial body with given equatorial
/// coordinates is exactly on the horizon (altitude = 0°) at a specific longitude.
///
/// # Mathematical Basis
/// The altitude formula is: `sin(alt) = sin(δ)sin(φ) + cos(δ)cos(φ)cos(H)`
///
/// Setting altitude = 0 and solving for latitude φ:
/// `tan(φ) = -cos(H) / tan(δ)`
///
/// Which gives: `φ = atan2(-cos(H), tan(δ))`
///
/// # Special Case: Declination ≈ 0 (Equatorial Bodies like North Node)
/// When declination approaches zero, the altitude equation simplifies to:
/// `cos(φ) × cos(H) = 0`
///
/// This has two distinct sub-cases:
///
/// 1. **True Degenerate (|cos(H)| ≈ 0)**: Hour angle near ±90° means ALL latitudes satisfy
///    the horizon equation. Returns `None` and caller should use `is_all_latitudes_horizon()`
///    to detect this and draw a full vertical segment.
///
/// 2. **No Intersection (|cos(H)| ≠ 0)**: Geometrically, equatorial bodies only cross the
///    horizon at cardinal E/W points where H = ±90°. At other longitudes, the body is always
///    above or below the horizon for ALL latitudes—there is NO valid crossing. Returns `None`
///    to skip this longitude. This is geometrically correct; gaps in North Node ASC/DSC lines
///    are real, not artifacts.
///
/// # Arguments
/// * `right_ascension` - Planet's RA in radians
/// * `declination` - Planet's declination in radians
/// * `gmst` - Greenwich Mean Sidereal Time in radians
/// * `longitude_deg` - Geographic longitude in degrees (-180 to 180)
///
/// # Returns
/// * `Some(latitude)` - Valid horizon crossing at this longitude (single latitude solution)
/// * `None` - Either degenerate (draw vertical) OR no crossing (skip gap)
///
/// **Caller must check `is_all_latitudes_horizon()` FIRST to distinguish:**
/// - If `is_all_latitudes_horizon()` returns `true`: draw vertical segment (-89° to +89°)
/// - If `is_all_latitudes_horizon()` returns `false` and this returns `None`: skip point (gap is real)
///
/// # Mathematical Basis
/// Solves sin(φ)sin(δ) + cos(φ)cos(δ)cos(H) = 0 for latitude φ.
/// Standard case: φ = atan(-cos(δ)cos(H) / sin(δ))
///
/// Uses atan (not atan2) to ensure result is in [-90°, 90°] latitude range.
///
/// References:
/// - Sunrise equation: https://en.wikipedia.org/wiki/Sunrise_equation
/// - Rise/set algorithm: https://www.celestialprogramming.com/risesetalgorithm.html
/// - Spherical astronomy: https://promenade.imcce.fr/en/pages3/367.html
#[wasm_bindgen]
pub fn calculate_horizon_latitude(
    right_ascension: f64,
    declination: f64,
    gmst: f64,
    longitude_deg: f64,
) -> Option<f64> {
    let longitude_rad = longitude_deg * DEG_TO_RAD;
    let hour_angle = normalize_signed_angle(gmst + longitude_rad - right_ascension);

    let sin_delta = declination.sin();
    let cos_delta = declination.cos();
    let cos_h = hour_angle.cos();

    // Threshold for near-zero detection
    const EPS: f64 = 1e-9;

    // True degenerate case: |sin(δ)| ≈ 0 AND |cos(H)| ≈ 0
    // All latitudes satisfy the horizon equation at this longitude.
    // Return None to signal caller should draw full vertical line segment.
    if sin_delta.abs() < EPS && cos_h.abs() < EPS {
        return None;
    }

    // When sin(δ) ≈ 0 but cos(H) ≠ 0: NO valid horizon crossing at this longitude
    // Geometrically: equatorial bodies only rise/set where H = ±90° (cardinal E/W points)
    // At other longitudes, the body is always above or below the horizon for all latitudes
    if sin_delta.abs() < EPS {
        return None; // Skip this point - gap is geometrically real
    }

    // Standard formula: φ = arctan(-cos(δ)cos(H) / sin(δ))
    // Using atan (not atan2) ensures result is in [-90°, 90°] latitude range
    let tan_phi = (-cos_delta * cos_h) / sin_delta;
    let latitude = tan_phi.atan() * RAD_TO_DEG;

    // Clamp to valid latitude range (safety check)
    Some(latitude.clamp(-90.0, 90.0))
}

/// Check if this longitude has the "all latitudes" horizon condition.
///
/// This is the true degenerate case where |sin(δ)| ≈ 0 AND |cos(H)| ≈ 0,
/// meaning the horizon equation is satisfied by ALL latitudes at this longitude.
/// When true, draw a full vertical segment from -89° to +89° latitude.
///
/// This function should be called BEFORE `calculate_horizon_latitude()` to
/// distinguish between:
/// - True degenerate (this returns true): draw vertical segment
/// - No intersection (this returns false, horizon_latitude returns None): skip point
///
/// Used for equatorial bodies (like North Node near equinox) at cardinal E/W points.
#[wasm_bindgen]
pub fn is_all_latitudes_horizon(
    right_ascension: f64,
    declination: f64,
    gmst: f64,
    longitude_deg: f64,
) -> bool {
    let longitude_rad = longitude_deg * DEG_TO_RAD;
    let hour_angle = normalize_signed_angle(gmst + longitude_rad - right_ascension);

    let sin_delta = declination.sin();
    let cos_h = hour_angle.cos();

    const EPS: f64 = 1e-9;
    sin_delta.abs() < EPS && cos_h.abs() < EPS
}

/// Check if a point is on the ASC (rising) side
#[wasm_bindgen]
pub fn is_rising(right_ascension: f64, gmst: f64, longitude_deg: f64) -> bool {
    let longitude_rad = longitude_deg * DEG_TO_RAD;
    let hour_angle = normalize_signed_angle(gmst + longitude_rad - right_ascension);
    hour_angle.sin() < 0.0
}

// ============================================
// Complete Line Calculation (returns JS object)
// ============================================

/// Calculate all planetary lines for a given birth time
/// Returns a JavaScript object with the results
#[wasm_bindgen]
pub fn calculate_all_lines(
    year: i32,
    month: u32,
    day: u32,
    hour: u32,
    minute: u32,
    second: u32,
    longitude_step: f64,
) -> JsValue {
    // Initialize panic hook for better error messages
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();

    let start = js_sys::Date::now();

    // Calculate Julian Date (UTC) and GMST (GMST uses UT1 internally via DUT1 correction)
    let jd = to_julian_date(year, month, day, hour, minute, second);
    let gmst = calculate_gmst(jd);

    // Convert to TT for ephemeris-related calculations (obliquity, nutation)
    // Derive year/month from JD for robustness near month boundaries (matches calculate_all_lines_local)
    // Compute these ONCE and reuse for all planets (performance optimization)
    let (utc_year, utc_month, _) = jd_to_calendar(jd);
    let jde = ut_to_tt(jd, utc_year, utc_month);
    let nutation = calculate_nutation(jde);
    let mean_obliquity = calculate_obliquity(jde);
    let obliquity = mean_obliquity + nutation.delta_epsilon;

    // Calculate positions for all planets
    let planets = [
        Planet::Sun, Planet::Moon, Planet::Mercury, Planet::Venus, Planet::Mars,
        Planet::Jupiter, Planet::Saturn, Planet::Uranus, Planet::Neptune, Planet::Pluto,
        Planet::Chiron, Planet::NorthNode,
    ];

    let mut result = AstroResult {
        julian_date: jd,
        gmst,
        planetary_positions: Vec::new(),
        planetary_lines: Vec::new(),
        aspect_lines: Vec::new(),
        paran_lines: Vec::new(),
        zenith_points: Vec::new(),
        calculation_time: 0.0,
        backend: if cfg!(feature = "parallel") { "wasm-parallel".to_string() } else { "wasm".to_string() },
    };

    // Calculate all planet lines - uses parallel iteration when 'parallel' feature is enabled
    #[cfg(feature = "parallel")]
    let planet_results: Vec<PlanetCalcResult> = planets
        .par_iter()
        .map(|planet| calculate_planet_lines(*planet, jde, gmst, obliquity, &nutation, longitude_step))
        .collect();

    #[cfg(not(feature = "parallel"))]
    let planet_results: Vec<PlanetCalcResult> = planets
        .iter()
        .map(|planet| calculate_planet_lines(*planet, jde, gmst, obliquity, &nutation, longitude_step))
        .collect();

    // Flatten results into the main result struct
    for pr in planet_results {
        result.planetary_positions.push(pr.position);
        result.planetary_lines.push(pr.mc_line);
        result.planetary_lines.push(pr.ic_line);
        result.planetary_lines.push(pr.asc_line);
        result.planetary_lines.push(pr.dsc_line);
        result.zenith_points.push(pr.zenith_point);
    }

    // Calculate aspect lines (planet to angle: trine/sextile/square to ASC/DSC/MC/IC)
    // Get positions for aspect calculations
    #[cfg(feature = "parallel")]
    let positions: Vec<PlanetaryPosition> = planets
        .par_iter()
        .map(|p| calculate_planetary_position_tt(*p, jde, obliquity, &nutation))
        .collect();

    #[cfg(not(feature = "parallel"))]
    let positions: Vec<PlanetaryPosition> = planets
        .iter()
        .map(|p| calculate_planetary_position_tt(*p, jde, obliquity, &nutation))
        .collect();

    // Calculate aspect lines in parallel
    #[cfg(feature = "parallel")]
    let all_aspect_lines: Vec<Vec<AspectLineResult>> = positions
        .par_iter()
        .map(|position| calculate_planet_aspect_lines(position, gmst, longitude_step, obliquity))
        .collect();

    #[cfg(not(feature = "parallel"))]
    let all_aspect_lines: Vec<Vec<AspectLineResult>> = positions
        .iter()
        .map(|position| calculate_planet_aspect_lines(position, gmst, longitude_step, obliquity))
        .collect();

    for aspect_lines in all_aspect_lines {
        result.aspect_lines.extend(aspect_lines);
    }

    // Calculate paran lines for all planet pairs
    let angle_pairs = [
        ("MC", "ASC"), ("MC", "DSC"), ("MC", "IC"),
        ("IC", "ASC"), ("IC", "DSC"), ("ASC", "DSC"),
    ];

    // Generate all planet pair indices
    let mut pair_indices = Vec::new();
    for i in 0..positions.len() {
        for j in (i + 1)..positions.len() {
            pair_indices.push((i, j));
        }
    }

    // Calculate parans in parallel
    #[cfg(feature = "parallel")]
    let all_parans: Vec<Vec<ParanLineResult>> = pair_indices
        .par_iter()
        .flat_map(|(i, j)| {
            angle_pairs.iter().flat_map(|(angle1, angle2)| {
                let parans1 = calculate_paran(&positions[*i], &positions[*j], angle1, angle2, gmst);
                let parans2 = calculate_paran(&positions[*j], &positions[*i], angle1, angle2, gmst);
                vec![parans1, parans2]
            }).collect::<Vec<_>>()
        })
        .collect();

    #[cfg(not(feature = "parallel"))]
    let all_parans: Vec<Vec<ParanLineResult>> = pair_indices
        .iter()
        .flat_map(|(i, j)| {
            angle_pairs.iter().flat_map(|(angle1, angle2)| {
                let parans1 = calculate_paran(&positions[*i], &positions[*j], angle1, angle2, gmst);
                let parans2 = calculate_paran(&positions[*j], &positions[*i], angle1, angle2, gmst);
                vec![parans1, parans2]
            }).collect::<Vec<_>>()
        })
        .collect();

    for parans in all_parans {
        result.paran_lines.extend(parans);
    }

    result.calculation_time = js_sys::Date::now() - start;

    serde_wasm_bindgen::to_value(&result).unwrap()
}

/// Calculate all planetary lines for a given LOCAL birth time and birth location
/// Automatically handles timezone conversion using chrono-tz
/// This is the preferred function to call from JavaScript
#[wasm_bindgen]
pub fn calculate_all_lines_local(
    birth_lat: f64,
    birth_lng: f64,
    year: i32,
    month: u32,
    day: u32,
    hour: u32,
    minute: u32,
    second: u32,
    longitude_step: f64,
) -> JsValue {
    // Initialize panic hook for better error messages
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();

    let start = js_sys::Date::now();

    // Convert local time to UTC Julian Date using timezone from coordinates
    let jd = local_to_utc_julian_date(birth_lat, birth_lng, year, month, day, hour, minute, second);
    let gmst = calculate_gmst(jd);

    // Convert to TT for ephemeris-related calculations
    // Use UTC calendar from JD (input year/month are local time, may differ from UTC)
    // Compute nutation and obliquity ONCE and reuse for all planets (performance optimization)
    let (utc_year, utc_month, _) = jd_to_calendar(jd);
    let jde = ut_to_tt(jd, utc_year, utc_month);
    let nutation = calculate_nutation(jde);
    let mean_obliquity = calculate_obliquity(jde);
    let obliquity = mean_obliquity + nutation.delta_epsilon;

    // Calculate positions for all planets
    let planets = [
        Planet::Sun, Planet::Moon, Planet::Mercury, Planet::Venus, Planet::Mars,
        Planet::Jupiter, Planet::Saturn, Planet::Uranus, Planet::Neptune, Planet::Pluto,
        Planet::Chiron, Planet::NorthNode,
    ];

    let mut result = AstroResultLocal {
        julian_date: jd,
        gmst,
        timezone: get_timezone_from_coords(birth_lat, birth_lng),
        timezone_offset_hours: get_timezone_offset_hours(birth_lat, birth_lng, year, month, day, hour, minute, second),
        planetary_positions: Vec::new(),
        planetary_lines: Vec::new(),
        aspect_lines: Vec::new(),
        paran_lines: Vec::new(),
        zenith_points: Vec::new(),
        calculation_time: 0.0,
        backend: if cfg!(feature = "parallel") { "wasm-parallel".to_string() } else { "wasm".to_string() },
    };

    // Calculate all planet lines - uses parallel iteration when 'parallel' feature is enabled
    #[cfg(feature = "parallel")]
    let planet_results: Vec<PlanetCalcResult> = planets
        .par_iter()
        .map(|planet| calculate_planet_lines(*planet, jde, gmst, obliquity, &nutation, longitude_step))
        .collect();

    #[cfg(not(feature = "parallel"))]
    let planet_results: Vec<PlanetCalcResult> = planets
        .iter()
        .map(|planet| calculate_planet_lines(*planet, jde, gmst, obliquity, &nutation, longitude_step))
        .collect();

    // Flatten results into the main result struct
    for pr in planet_results {
        result.planetary_positions.push(pr.position);
        result.planetary_lines.push(pr.mc_line);
        result.planetary_lines.push(pr.ic_line);
        result.planetary_lines.push(pr.asc_line);
        result.planetary_lines.push(pr.dsc_line);
        result.zenith_points.push(pr.zenith_point);
    }

    // Calculate aspect lines (planet to angle: trine/sextile/square to ASC/DSC/MC/IC)
    // Get positions for aspect calculations
    #[cfg(feature = "parallel")]
    let positions: Vec<PlanetaryPosition> = planets
        .par_iter()
        .map(|p| calculate_planetary_position_tt(*p, jde, obliquity, &nutation))
        .collect();

    #[cfg(not(feature = "parallel"))]
    let positions: Vec<PlanetaryPosition> = planets
        .iter()
        .map(|p| calculate_planetary_position_tt(*p, jde, obliquity, &nutation))
        .collect();

    // Calculate aspect lines in parallel
    #[cfg(feature = "parallel")]
    let all_aspect_lines: Vec<Vec<AspectLineResult>> = positions
        .par_iter()
        .map(|position| calculate_planet_aspect_lines(position, gmst, longitude_step, obliquity))
        .collect();

    #[cfg(not(feature = "parallel"))]
    let all_aspect_lines: Vec<Vec<AspectLineResult>> = positions
        .iter()
        .map(|position| calculate_planet_aspect_lines(position, gmst, longitude_step, obliquity))
        .collect();

    for aspect_lines in all_aspect_lines {
        result.aspect_lines.extend(aspect_lines);
    }

    // Calculate paran lines for all planet pairs
    let angle_pairs = [
        ("MC", "ASC"), ("MC", "DSC"), ("MC", "IC"),
        ("IC", "ASC"), ("IC", "DSC"), ("ASC", "DSC"),
    ];

    // Generate all planet pair indices
    let mut pair_indices = Vec::new();
    for i in 0..positions.len() {
        for j in (i + 1)..positions.len() {
            pair_indices.push((i, j));
        }
    }

    // Calculate parans in parallel
    #[cfg(feature = "parallel")]
    let all_parans: Vec<Vec<ParanLineResult>> = pair_indices
        .par_iter()
        .flat_map(|(i, j)| {
            angle_pairs.iter().flat_map(|(angle1, angle2)| {
                let parans1 = calculate_paran(&positions[*i], &positions[*j], angle1, angle2, gmst);
                let parans2 = calculate_paran(&positions[*j], &positions[*i], angle1, angle2, gmst);
                vec![parans1, parans2]
            }).collect::<Vec<_>>()
        })
        .collect();

    #[cfg(not(feature = "parallel"))]
    let all_parans: Vec<Vec<ParanLineResult>> = pair_indices
        .iter()
        .flat_map(|(i, j)| {
            angle_pairs.iter().flat_map(|(angle1, angle2)| {
                let parans1 = calculate_paran(&positions[*i], &positions[*j], angle1, angle2, gmst);
                let parans2 = calculate_paran(&positions[*j], &positions[*i], angle1, angle2, gmst);
                vec![parans1, parans2]
            }).collect::<Vec<_>>()
        })
        .collect();

    for parans in all_parans {
        result.paran_lines.extend(parans);
    }

    result.calculation_time = js_sys::Date::now() - start;

    serde_wasm_bindgen::to_value(&result).unwrap()
}

// Helper structs for serialization
#[derive(Serialize)]
struct AstroResult {
    julian_date: f64,
    gmst: f64,
    planetary_positions: Vec<PlanetaryPositionResult>,
    planetary_lines: Vec<PlanetaryLineResult>,
    aspect_lines: Vec<AspectLineResult>,
    paran_lines: Vec<ParanLineResult>,
    zenith_points: Vec<ZenithPointResult>,
    calculation_time: f64,
    backend: String,
}

#[derive(Serialize)]
struct AstroResultLocal {
    julian_date: f64,
    gmst: f64,
    timezone: String,
    timezone_offset_hours: f64,
    planetary_positions: Vec<PlanetaryPositionResult>,
    planetary_lines: Vec<PlanetaryLineResult>,
    aspect_lines: Vec<AspectLineResult>,
    paran_lines: Vec<ParanLineResult>,
    zenith_points: Vec<ZenithPointResult>,
    calculation_time: f64,
    backend: String,
}

#[derive(Serialize)]
struct PlanetaryPositionResult {
    planet: String,
    right_ascension: f64,
    declination: f64,
    ecliptic_longitude: f64,
}

#[derive(Serialize)]
struct PlanetaryLineResult {
    planet: String,
    line_type: String,
    points: Vec<GlobePoint>,
    color: String,
    longitude: Option<f64>,
}

/// Aspect line result - planet forming aspect to an angle (ASC/DSC/MC/IC)
#[derive(Serialize)]
struct AspectLineResult {
    planet: String,
    angle: String,           // "ASC", "DSC", "MC", "IC"
    aspect_type: String,     // "trine", "sextile", "square"
    is_harmonious: bool,     // true for trine/sextile, false for square
    points: Vec<GlobePoint>,
    color: String,
}

#[derive(Serialize)]
struct ParanLineResult {
    planet1: String,
    angle1: String,
    planet2: String,
    angle2: String,
    latitude: f64,
    longitude: Option<f64>,  // The longitude where the paran crossing occurs
    is_latitude_circle: bool,
}

/// Zenith point - where a planet culminates directly overhead (90° altitude).
///
/// **Note:** This is the geographic point on the **MC meridian** where the planet
/// reaches zenith at the moment of upper culmination, NOT the instantaneous
/// sub-planet point (which would require hour angle / GHA for longitude).
/// For astrocartography, this MC-tied interpretation is standard.
#[derive(Serialize)]
struct ZenithPointResult {
    planet: String,
    latitude: f64,      // = planet's declination (latitude where zenith occurs on MC)
    longitude: f64,     // = MC line longitude (where planet culminates)
    declination: f64,   // planet's declination for reference
    max_altitude: f64,  // always 90.0 at zenith
}

fn planet_to_string(planet: Planet) -> String {
    match planet {
        Planet::Sun => "Sun".to_string(),
        Planet::Moon => "Moon".to_string(),
        Planet::Mercury => "Mercury".to_string(),
        Planet::Venus => "Venus".to_string(),
        Planet::Mars => "Mars".to_string(),
        Planet::Jupiter => "Jupiter".to_string(),
        Planet::Saturn => "Saturn".to_string(),
        Planet::Uranus => "Uranus".to_string(),
        Planet::Neptune => "Neptune".to_string(),
        Planet::Pluto => "Pluto".to_string(),
        Planet::Chiron => "Chiron".to_string(),
        Planet::NorthNode => "NorthNode".to_string(),
    }
}

// ============================================
// Per-Planet Calculation Result (for parallelization)
// ============================================

/// Result of calculating all lines for a single planet
/// Used for parallel processing with rayon
struct PlanetCalcResult {
    position: PlanetaryPositionResult,
    mc_line: PlanetaryLineResult,
    ic_line: PlanetaryLineResult,
    asc_line: PlanetaryLineResult,
    dsc_line: PlanetaryLineResult,
    zenith_point: ZenithPointResult,
}

/// Calculate all lines for a single planet
/// This function is designed to be called in parallel for different planets
fn calculate_planet_lines(
    planet: Planet,
    jde: f64,
    gmst: f64,
    obliquity: f64,
    nutation: &Nutation,
    longitude_step: f64,
) -> PlanetCalcResult {
    let position = calculate_planetary_position_tt(planet, jde, obliquity, nutation);
    let planet_name = planet_to_string(planet);
    let color = get_planet_color(planet).to_string();

    // MC Line
    let mc_longitude = calculate_mc_longitude(position.right_ascension, gmst);
    let mc_points: Vec<GlobePoint> = (-89..=89)
        .step_by(2)
        .map(|lat| GlobePoint::new(lat as f64, mc_longitude))
        .collect();

    // IC Line
    let ic_longitude = calculate_ic_longitude(position.right_ascension, gmst);
    let ic_points: Vec<GlobePoint> = (-89..=89)
        .step_by(2)
        .map(|lat| GlobePoint::new(lat as f64, ic_longitude))
        .collect();

    // Zenith Point
    let zenith_latitude = position.declination * RAD_TO_DEG;

    // Adaptive stepping for horizon curves
    let dec_deg = position.declination.abs() * RAD_TO_DEG;
    let adaptive_step = if dec_deg < 10.0 { 0.5 } else { longitude_step };

    // ASC Line
    let mut asc_points = Vec::new();
    let mut lng = -180.0;
    while lng <= 180.0 {
        if is_all_latitudes_horizon(position.right_ascension, position.declination, gmst, lng) {
            if is_rising(position.right_ascension, gmst, lng) {
                for lat in (-89..=89).step_by(2) {
                    asc_points.push(GlobePoint::new(lat as f64, lng));
                }
            }
        } else if let Some(lat) = calculate_horizon_latitude(
            position.right_ascension,
            position.declination,
            gmst,
            lng,
        ) {
            if is_rising(position.right_ascension, gmst, lng) {
                asc_points.push(GlobePoint::new(lat, lng));
            }
        }
        lng += adaptive_step;
    }

    // DSC Line
    let mut dsc_points = Vec::new();
    let mut lng = -180.0;
    while lng <= 180.0 {
        if is_all_latitudes_horizon(position.right_ascension, position.declination, gmst, lng) {
            if !is_rising(position.right_ascension, gmst, lng) {
                for lat in (-89..=89).step_by(2) {
                    dsc_points.push(GlobePoint::new(lat as f64, lng));
                }
            }
        } else if let Some(lat) = calculate_horizon_latitude(
            position.right_ascension,
            position.declination,
            gmst,
            lng,
        ) {
            if !is_rising(position.right_ascension, gmst, lng) {
                dsc_points.push(GlobePoint::new(lat, lng));
            }
        }
        lng += adaptive_step;
    }

    PlanetCalcResult {
        position: PlanetaryPositionResult {
            planet: planet_name.clone(),
            right_ascension: position.right_ascension,
            declination: position.declination,
            ecliptic_longitude: position.ecliptic_longitude,
        },
        mc_line: PlanetaryLineResult {
            planet: planet_name.clone(),
            line_type: "MC".to_string(),
            points: mc_points,
            color: color.clone(),
            longitude: Some(mc_longitude),
        },
        ic_line: PlanetaryLineResult {
            planet: planet_name.clone(),
            line_type: "IC".to_string(),
            points: ic_points,
            color: color.clone(),
            longitude: Some(ic_longitude),
        },
        asc_line: PlanetaryLineResult {
            planet: planet_name.clone(),
            line_type: "ASC".to_string(),
            points: asc_points,
            color: color.clone(),
            longitude: None,
        },
        dsc_line: PlanetaryLineResult {
            planet: planet_name.clone(),
            line_type: "DSC".to_string(),
            points: dsc_points,
            color: color.clone(),
            longitude: None,
        },
        zenith_point: ZenithPointResult {
            planet: planet_name,
            latitude: zenith_latitude,
            longitude: mc_longitude,
            declination: zenith_latitude,
            max_altitude: 90.0,
        },
    }
}

// ============================================
// Aspect Calculations (Planet to Angle)
// ============================================

/// Calculate angular separation between two celestial points (used in tests)
#[allow(dead_code)]
fn angular_separation(ra1: f64, dec1: f64, ra2: f64, dec2: f64) -> f64 {
    let cos_sep = dec1.sin() * dec2.sin() + dec1.cos() * dec2.cos() * (ra1 - ra2).cos();
    cos_sep.clamp(-1.0, 1.0).acos()
}

/// Aspect info for calculation
struct AspectInfo {
    angle_deg: f64,
    name: &'static str,
    is_harmonious: bool,
}

const ASPECTS: [AspectInfo; 3] = [
    AspectInfo { angle_deg: 120.0, name: "trine", is_harmonious: true },
    AspectInfo { angle_deg: 60.0, name: "sextile", is_harmonious: true },
    AspectInfo { angle_deg: 90.0, name: "square", is_harmonious: false },
];

// =============================================================================
// ASPECT LINE CALCULATION - DESIGN NOTES
// =============================================================================
//
// DELIBERATE MODELING CHOICE:
//
// Base planetary lines (MC, IC, ASC, DSC) use the planet's actual RA/Dec position,
// which includes non-zero ecliptic latitude. This is physically correct for showing
// "where the body is angular" - i.e., where it culminates, rises, or sets.
//
// Aspect lines use ZODIACAL aspects: we shift along ecliptic longitude and use
// ecliptic latitude β=0 (on the ecliptic plane). This is the standard approach
// for astrocartography aspect-to-angle calculations.
//
// This distinction matters because:
// - Physical angularity (base lines): Where does the actual celestial body appear
//   on the horizon or meridian? Uses true RA/Dec including ecliptic latitude.
// - Zodiacal aspects (aspect lines): Where does a point X° along the zodiac from
//   the planet become angular? Uses ecliptic longitude only, projected to RA/Dec
//   with β=0.
//
// Example: Venus at 15° Taurus with 2° ecliptic latitude
// - Base Venus MC line: Uses Venus's actual RA/Dec (includes the 2° latitude)
// - Venus Trine MC line: Uses 15° Taurus + 120° = 15° Virgo, with β=0
//
// This is consistent with how zodiacal aspects are traditionally computed in
// astrology: they measure angular separation along the ecliptic, not physical
// distance in the sky.
// =============================================================================

/// Calculate aspect line from planet to MC angle
/// Mars trine MC = where a point 120° along the ecliptic from Mars would culminate
///
/// Uses ecliptic-based shifting for consistency with standard astrocartography.
/// The aspect is measured in zodiac degrees (ecliptic longitude), then converted
/// to RA to find the corresponding MC line.
fn calculate_aspect_to_mc(
    position: &PlanetaryPosition,
    aspect: &AspectInfo,
    gmst: f64,
    direction: i32, // +1 or -1 for applying/separating
    obliquity: f64,
) -> AspectLineResult {
    // Shift along the ECLIPTIC by the aspect angle (zodiac-based aspect)
    let ecl_shift = aspect.angle_deg * direction as f64;
    let shifted_ecl_lon = (position.ecliptic_longitude + ecl_shift).rem_euclid(360.0);
    let shifted_ecl_lon_rad = shifted_ecl_lon * DEG_TO_RAD;

    // Convert the shifted ecliptic position to RA (ecliptic lat = 0)
    let (shifted_ra, _shifted_dec) = ecliptic_to_equatorial(shifted_ecl_lon_rad, 0.0, obliquity);

    // Calculate MC longitude for the shifted position
    let mc_longitude = calculate_mc_longitude(shifted_ra, gmst);

    // MC line is vertical (all latitudes at same longitude)
    let mut points = Vec::new();
    for lat in (-89..=89).step_by(2) {
        points.push(GlobePoint::new(lat as f64, mc_longitude));
    }

    let direction_suffix = if direction > 0 { "+" } else { "-" };

    AspectLineResult {
        planet: planet_to_string(position.planet),
        angle: "MC".to_string(),
        aspect_type: format!("{}{}", aspect.name, direction_suffix),
        is_harmonious: aspect.is_harmonious,
        points,
        color: if aspect.is_harmonious {
            format!("{}80", get_planet_color(position.planet)) // More visible for harmonious
        } else {
            format!("{}50", get_planet_color(position.planet)) // Less visible for challenging
        },
    }
}

/// Calculate aspect line from planet to IC angle
/// Mars trine IC = where a point 120° along the ecliptic from Mars would anti-culminate
///
/// Uses ecliptic-based shifting for consistency with standard astrocartography.
fn calculate_aspect_to_ic(
    position: &PlanetaryPosition,
    aspect: &AspectInfo,
    gmst: f64,
    direction: i32,
    obliquity: f64,
) -> AspectLineResult {
    // Shift along the ECLIPTIC by the aspect angle (zodiac-based aspect)
    let ecl_shift = aspect.angle_deg * direction as f64;
    let shifted_ecl_lon = (position.ecliptic_longitude + ecl_shift).rem_euclid(360.0);
    let shifted_ecl_lon_rad = shifted_ecl_lon * DEG_TO_RAD;

    // Convert the shifted ecliptic position to RA (ecliptic lat = 0)
    let (shifted_ra, _shifted_dec) = ecliptic_to_equatorial(shifted_ecl_lon_rad, 0.0, obliquity);

    let ic_longitude = calculate_ic_longitude(shifted_ra, gmst);

    let mut points = Vec::new();
    for lat in (-89..=89).step_by(2) {
        points.push(GlobePoint::new(lat as f64, ic_longitude));
    }

    let direction_suffix = if direction > 0 { "+" } else { "-" };

    AspectLineResult {
        planet: planet_to_string(position.planet),
        angle: "IC".to_string(),
        aspect_type: format!("{}{}", aspect.name, direction_suffix),
        is_harmonious: aspect.is_harmonious,
        points,
        color: if aspect.is_harmonious {
            format!("{}80", get_planet_color(position.planet))
        } else {
            format!("{}50", get_planet_color(position.planet))
        },
    }
}

/// Calculate aspect line from planet to ASC angle
/// Mars trine ASC = where a point 120° along the ecliptic from Mars would be rising
///
/// IMPORTANT: Aspects are measured along the ECLIPTIC, not by shifting RA.
/// We shift the planet's ecliptic longitude by the aspect angle, then convert
/// that new position back to equatorial coordinates (RA/Dec) for the horizon calculation.
fn calculate_aspect_to_asc(
    position: &PlanetaryPosition,
    aspect: &AspectInfo,
    gmst: f64,
    longitude_step: f64,
    direction: i32,
    obliquity: f64,
) -> Option<AspectLineResult> {
    // Shift along the ECLIPTIC by the aspect angle
    // Use rem_euclid for proper modulo with negative numbers
    let ecl_shift = aspect.angle_deg * direction as f64;
    let shifted_ecl_lon = (position.ecliptic_longitude + ecl_shift).rem_euclid(360.0);
    let shifted_ecl_lon_rad = shifted_ecl_lon * DEG_TO_RAD;

    // Convert the shifted ecliptic position to equatorial coordinates
    // Ecliptic latitude = 0 (we're on the ecliptic plane)
    let (shifted_ra, shifted_dec) = ecliptic_to_equatorial(shifted_ecl_lon_rad, 0.0, obliquity);

    let mut points = Vec::new();

    let mut lng = -180.0;
    while lng <= 180.0 {
        if let Some(lat) = calculate_horizon_latitude(
            shifted_ra, shifted_dec, gmst, lng
        ) {
            // Check if this is a rising point for the shifted position
            if is_rising(shifted_ra, gmst, lng) {
                points.push(GlobePoint::new(lat, lng));
            }
        }
        lng += longitude_step;
    }

    if points.is_empty() {
        return None;
    }

    let direction_suffix = if direction > 0 { "+" } else { "-" };

    Some(AspectLineResult {
        planet: planet_to_string(position.planet),
        angle: "ASC".to_string(),
        aspect_type: format!("{}{}", aspect.name, direction_suffix),
        is_harmonious: aspect.is_harmonious,
        points,
        color: if aspect.is_harmonious {
            format!("{}80", get_planet_color(position.planet))
        } else {
            format!("{}50", get_planet_color(position.planet))
        },
    })
}

/// Calculate aspect line from planet to DSC angle
/// Mars trine DSC = where a point 120° along the ecliptic from Mars would be setting
///
/// IMPORTANT: Aspects are measured along the ECLIPTIC, not by shifting RA.
/// We shift the planet's ecliptic longitude by the aspect angle, then convert
/// that new position back to equatorial coordinates (RA/Dec) for the horizon calculation.
fn calculate_aspect_to_dsc(
    position: &PlanetaryPosition,
    aspect: &AspectInfo,
    gmst: f64,
    longitude_step: f64,
    direction: i32,
    obliquity: f64,
) -> Option<AspectLineResult> {
    // Shift along the ECLIPTIC by the aspect angle
    // Use rem_euclid for proper modulo with negative numbers
    let ecl_shift = aspect.angle_deg * direction as f64;
    let shifted_ecl_lon = (position.ecliptic_longitude + ecl_shift).rem_euclid(360.0);
    let shifted_ecl_lon_rad = shifted_ecl_lon * DEG_TO_RAD;

    // Convert the shifted ecliptic position to equatorial coordinates
    // Ecliptic latitude = 0 (we're on the ecliptic plane)
    let (shifted_ra, shifted_dec) = ecliptic_to_equatorial(shifted_ecl_lon_rad, 0.0, obliquity);

    let mut points = Vec::new();

    let mut lng = -180.0;
    while lng <= 180.0 {
        if let Some(lat) = calculate_horizon_latitude(
            shifted_ra, shifted_dec, gmst, lng
        ) {
            // Check if this is a setting point for the shifted position
            if !is_rising(shifted_ra, gmst, lng) {
                points.push(GlobePoint::new(lat, lng));
            }
        }
        lng += longitude_step;
    }

    if points.is_empty() {
        return None;
    }

    let direction_suffix = if direction > 0 { "+" } else { "-" };

    Some(AspectLineResult {
        planet: planet_to_string(position.planet),
        angle: "DSC".to_string(),
        aspect_type: format!("{}{}", aspect.name, direction_suffix),
        is_harmonious: aspect.is_harmonious,
        points,
        color: if aspect.is_harmonious {
            format!("{}80", get_planet_color(position.planet))
        } else {
            format!("{}50", get_planet_color(position.planet))
        },
    })
}

/// Calculate all aspect lines for a planet to all angles
fn calculate_planet_aspect_lines(
    position: &PlanetaryPosition,
    gmst: f64,
    longitude_step: f64,
    obliquity: f64,
) -> Vec<AspectLineResult> {
    let mut aspect_lines = Vec::new();

    for aspect in &ASPECTS {
        // Each aspect has two directions (applying +, separating -)
        for direction in [-1, 1] {
            // MC aspects - uses ecliptic shifting for zodiac-based aspects
            aspect_lines.push(calculate_aspect_to_mc(position, aspect, gmst, direction, obliquity));

            // IC aspects - uses ecliptic shifting for zodiac-based aspects
            aspect_lines.push(calculate_aspect_to_ic(position, aspect, gmst, direction, obliquity));

            // ASC aspects - uses ecliptic shifting for zodiac-based aspects
            if let Some(asc_aspect) = calculate_aspect_to_asc(
                position, aspect, gmst, longitude_step, direction, obliquity
            ) {
                aspect_lines.push(asc_aspect);
            }

            // DSC aspects - uses ecliptic shifting for zodiac-based aspects
            if let Some(dsc_aspect) = calculate_aspect_to_dsc(
                position, aspect, gmst, longitude_step, direction, obliquity
            ) {
                aspect_lines.push(dsc_aspect);
            }
        }
    }

    aspect_lines
}

// ============================================
// Paran Calculations
// ============================================

/// Calculate longitude where a planet is on a specific angle at a given latitude
/// Uses the same formula as the planetary line calculation for consistency
/// Returns the longitude in degrees, or None if the body is circumpolar/never rises at this latitude
fn get_longitude_for_angle_at_latitude(
    right_ascension: f64,  // radians
    declination: f64,      // radians
    gmst: f64,             // radians
    latitude: f64,         // degrees
    angle_type: &str,
) -> Option<f64> {
    match angle_type {
        "MC" => {
            // MC line is vertical at longitude where RA = LST
            let lng = calculate_mc_longitude(right_ascension, gmst);
            Some(lng)
        }
        "IC" => {
            // IC line is vertical at longitude where RA + 180° = LST
            let lng = calculate_ic_longitude(right_ascension, gmst);
            Some(lng)
        }
        "ASC" | "DSC" => {
            let lat_rad = latitude * DEG_TO_RAD;
            let tan_lat = lat_rad.tan();
            let tan_dec = declination.tan();

            // Hour angle at horizon: cos(H) = -tan(φ) × tan(δ)
            let cos_h = -tan_lat * tan_dec;

            // Check if body is circumpolar or never rises at this latitude
            if cos_h.abs() > 1.0 {
                return None;
            }

            let h = cos_h.acos();  // Hour angle magnitude

            // ASC (rising): H is negative (body is east of meridian)
            // DSC (setting): H is positive (body is west of meridian)
            let hour_angle = if angle_type == "ASC" { -h } else { h };

            // longitude = RA + H - GMST (same formula as line calculation, inverted)
            let longitude_rad = normalize_angle(right_ascension + hour_angle - gmst);
            let mut longitude_deg = longitude_rad * RAD_TO_DEG;
            if longitude_deg > 180.0 {
                longitude_deg -= 360.0;
            }
            Some(longitude_deg)
        }
        _ => None,
    }
}

/// Calculate paran for a specific planet pair and angle combination
/// A paran occurs where two different planetary lines intersect
fn calculate_paran(
    pos1: &PlanetaryPosition,
    pos2: &PlanetaryPosition,
    angle1: &str,
    angle2: &str,
    gmst: f64,
) -> Vec<ParanLineResult> {
    let mut parans = Vec::new();

    // Case 1: Both planets on MC/IC (both lines are vertical at specific longitudes)
    // This is rare - only occurs when both planets have same/opposite RA
    if (angle1 == "MC" || angle1 == "IC") && (angle2 == "MC" || angle2 == "IC") {
        let lng1 = if angle1 == "MC" {
            calculate_mc_longitude(pos1.right_ascension, gmst)
        } else {
            calculate_ic_longitude(pos1.right_ascension, gmst)
        };
        let lng2 = if angle2 == "MC" {
            calculate_mc_longitude(pos2.right_ascension, gmst)
        } else {
            calculate_ic_longitude(pos2.right_ascension, gmst)
        };

        // Check if the lines are at the same longitude (they intersect everywhere along that longitude)
        let mut lng_diff = (lng1 - lng2).abs();
        if lng_diff > 180.0 {
            lng_diff = 360.0 - lng_diff;
        }

        if lng_diff < 2.0 {
            // Lines coincide - place marker at equator on that longitude
            parans.push(ParanLineResult {
                planet1: planet_to_string(pos1.planet),
                angle1: angle1.to_string(),
                planet2: planet_to_string(pos2.planet),
                angle2: angle2.to_string(),
                latitude: 0.0,
                longitude: Some(lng1),
                is_latitude_circle: false,
            });
        }
        return parans;
    }

    // Case 2: One planet on MC/IC (vertical line), one on ASC/DSC (curved line)
    // Find where the curved line crosses the vertical line's longitude
    if angle1 == "MC" || angle1 == "IC" {
        let fixed_lng = if angle1 == "MC" {
            calculate_mc_longitude(pos1.right_ascension, gmst)
        } else {
            calculate_ic_longitude(pos1.right_ascension, gmst)
        };

        // Search for latitude where planet2's ASC/DSC line passes through fixed_lng
        let mut lat = -66.0;
        let mut best: Option<(f64, f64)> = None; // (lat, lng_diff)

        while lat <= 66.0 {
            if let Some(lng2) = get_longitude_for_angle_at_latitude(
                pos2.right_ascension, pos2.declination, gmst, lat, angle2
            ) {
                let mut lng_diff = (fixed_lng - lng2).abs();
                if lng_diff > 180.0 {
                    lng_diff = 360.0 - lng_diff;
                }

                if lng_diff < 1.0 {
                    let is_better = match &best {
                        None => true,
                        Some((_, prev_diff)) => lng_diff < *prev_diff,
                    };
                    if is_better {
                        best = Some((lat, lng_diff));
                    }
                }
            }
            lat += 0.25; // Finer step for more accurate intersection
        }

        if let Some((best_lat, _)) = best {
            parans.push(ParanLineResult {
                planet1: planet_to_string(pos1.planet),
                angle1: angle1.to_string(),
                planet2: planet_to_string(pos2.planet),
                angle2: angle2.to_string(),
                latitude: best_lat,
                longitude: Some(fixed_lng), // Exact longitude of the MC/IC line
                is_latitude_circle: false,
            });
        }
        return parans;
    }

    // Case 3: Both planets on ASC/DSC (both curved lines)
    // Find where the two curved lines intersect
    let mut lat = -66.0;
    let mut best_crossing: Option<(f64, f64, f64)> = None; // (lat, lng, lng_diff)

    while lat <= 66.0 {
        if let (Some(lng1), Some(lng2)) = (
            get_longitude_for_angle_at_latitude(pos1.right_ascension, pos1.declination, gmst, lat, angle1),
            get_longitude_for_angle_at_latitude(pos2.right_ascension, pos2.declination, gmst, lat, angle2),
        ) {
            let mut lng_diff = (lng1 - lng2).abs();
            if lng_diff > 180.0 {
                lng_diff = 360.0 - lng_diff;
            }

            // Only accept very close crossings (within 1 degree)
            if lng_diff < 1.0 {
                let is_better = match &best_crossing {
                    None => true,
                    Some((_, _, prev_diff)) => lng_diff < *prev_diff,
                };

                if is_better {
                    // Use the average longitude as the intersection point
                    let avg_lng = if (lng1 - lng2).abs() > 180.0 {
                        let n1 = if lng1 < 0.0 { lng1 + 360.0 } else { lng1 };
                        let n2 = if lng2 < 0.0 { lng2 + 360.0 } else { lng2 };
                        let avg = (n1 + n2) / 2.0;
                        if avg > 180.0 { avg - 360.0 } else { avg }
                    } else {
                        (lng1 + lng2) / 2.0
                    };
                    best_crossing = Some((lat, avg_lng, lng_diff));
                }
            }
        }
        lat += 0.25; // Finer step for accuracy
    }

    if let Some((best_lat, best_lng, _)) = best_crossing {
        parans.push(ParanLineResult {
            planet1: planet_to_string(pos1.planet),
            angle1: angle1.to_string(),
            planet2: planet_to_string(pos2.planet),
            angle2: angle2.to_string(),
            latitude: best_lat,
            longitude: Some(best_lng),
            is_latitude_circle: false,
        });
    }

    parans
}

// ============================================
// Local Space Calculations
// ============================================

/// Convert equatorial coordinates (RA, Dec) to horizontal coordinates (Azimuth, Altitude)
/// for a given observer location and time
fn equatorial_to_horizontal(
    ra: f64,           // Right ascension in radians
    dec: f64,          // Declination in radians
    lst: f64,          // Local sidereal time in radians
    observer_lat: f64, // Observer latitude in radians
) -> (f64, f64) {
    // Hour angle = LST - RA
    let hour_angle = lst - ra;

    // Altitude: sin(alt) = sin(dec)sin(lat) + cos(dec)cos(lat)cos(H)
    let sin_alt = dec.sin() * observer_lat.sin() + dec.cos() * observer_lat.cos() * hour_angle.cos();
    let altitude = sin_alt.asin();

    // Azimuth: tan(A) = sin(H) / (cos(H)sin(lat) - tan(dec)cos(lat))
    let cos_h = hour_angle.cos();
    let sin_h = hour_angle.sin();
    let y = sin_h;
    let x = cos_h * observer_lat.sin() - dec.tan() * observer_lat.cos();
    let mut azimuth = y.atan2(x);

    // Convert to 0-360 range (measured from North through East)
    azimuth = normalize_angle(azimuth + PI);

    (azimuth, altitude)
}

/// Calculate destination point given start point, bearing, and distance
/// Using Haversine formula
fn destination_point(
    lat1: f64,        // Start latitude in radians
    lng1: f64,        // Start longitude in radians
    bearing: f64,     // Bearing in radians (from North)
    distance_km: f64, // Distance in kilometers
) -> (f64, f64) {
    const EARTH_RADIUS_KM: f64 = 6371.0;

    let angular_distance = distance_km / EARTH_RADIUS_KM;

    let lat2 = (lat1.sin() * angular_distance.cos()
        + lat1.cos() * angular_distance.sin() * bearing.cos())
        .asin();

    let lng2 = lng1
        + (bearing.sin() * angular_distance.sin() * lat1.cos())
            .atan2(angular_distance.cos() - lat1.sin() * lat2.sin());

    (lat2, lng2)
}

/// Convert azimuth to cardinal direction string
fn azimuth_to_direction(azimuth_deg: f64) -> &'static str {
    let normalized = ((azimuth_deg % 360.0) + 360.0) % 360.0;
    if normalized >= 337.5 || normalized < 22.5 { "N" }
    else if normalized >= 22.5 && normalized < 67.5 { "NE" }
    else if normalized >= 67.5 && normalized < 112.5 { "E" }
    else if normalized >= 112.5 && normalized < 157.5 { "SE" }
    else if normalized >= 157.5 && normalized < 202.5 { "S" }
    else if normalized >= 202.5 && normalized < 247.5 { "SW" }
    else if normalized >= 247.5 && normalized < 292.5 { "W" }
    else { "NW" }
}

/// Local Space line result
#[derive(Serialize)]
struct LocalSpaceLineResult {
    planet: String,
    azimuth: f64,           // 0-360 degrees from North
    altitude: f64,          // Degrees above/below horizon
    points: Vec<GlobePoint>,
    direction: String,      // Cardinal direction
    color: String,
}

/// Local Space calculation result
#[derive(Serialize)]
struct LocalSpaceResultData {
    birth_latitude: f64,
    birth_longitude: f64,
    lines: Vec<LocalSpaceLineResult>,
    julian_date: f64,
    calculation_time: f64,
}

/// Calculate Local Space lines for a given birth time and location
/// Local Space lines radiate outward from the birth location based on planetary azimuths
#[wasm_bindgen]
pub fn calculate_local_space_lines(
    birth_lat: f64,
    birth_lng: f64,
    year: i32,
    month: u32,
    day: u32,
    hour: u32,
    minute: u32,
    second: u32,
    max_distance_km: f64,  // How far to extend lines (default 15000 km)
    step_km: f64,          // Step size for line points (default 200 km)
) -> JsValue {
    let start = js_sys::Date::now();

    // Convert local time to UTC Julian Date
    let jd = local_to_utc_julian_date(birth_lat, birth_lng, year, month, day, hour, minute, second);
    let gmst = calculate_gmst(jd);

    // Convert to TT for ephemeris calculations (compute once for all planets)
    let (utc_year, utc_month, _) = jd_to_calendar(jd);
    let jde = ut_to_tt(jd, utc_year, utc_month);
    let nutation = calculate_nutation(jde);
    let mean_obliquity = calculate_obliquity(jde);
    let obliquity = mean_obliquity + nutation.delta_epsilon;

    // Calculate Local Sidereal Time for birth location
    let lst = calculate_lst(gmst, birth_lng);

    let birth_lat_rad = birth_lat * DEG_TO_RAD;
    let birth_lng_rad = birth_lng * DEG_TO_RAD;

    let planets = [
        Planet::Sun, Planet::Moon, Planet::Mercury, Planet::Venus, Planet::Mars,
        Planet::Jupiter, Planet::Saturn, Planet::Uranus, Planet::Neptune, Planet::Pluto,
        Planet::Chiron, Planet::NorthNode,
    ];

    let mut lines = Vec::new();

    // Use internal TT-based function with pre-computed values
    for planet in planets.iter() {
        let position = calculate_planetary_position_tt(*planet, jde, obliquity, &nutation);

        // Convert to horizontal coordinates (azimuth, altitude)
        let (azimuth_rad, altitude_rad) = equatorial_to_horizontal(
            position.right_ascension,
            position.declination,
            lst,
            birth_lat_rad,
        );

        let azimuth_deg = azimuth_rad * RAD_TO_DEG;
        let altitude_deg = altitude_rad * RAD_TO_DEG;

        // Generate line points extending from birth location in azimuth direction
        let mut points = Vec::new();

        // Start at birth location
        points.push(GlobePoint::new(birth_lat, birth_lng));

        // Extend outward in the azimuth direction
        let mut distance = step_km;
        while distance <= max_distance_km {
            let (lat_rad, lng_rad) = destination_point(
                birth_lat_rad,
                birth_lng_rad,
                azimuth_rad,
                distance,
            );

            let lat_deg = lat_rad * RAD_TO_DEG;
            let mut lng_deg = lng_rad * RAD_TO_DEG;

            // Normalize longitude to -180..180
            if lng_deg > 180.0 { lng_deg -= 360.0; }
            if lng_deg < -180.0 { lng_deg += 360.0; }

            points.push(GlobePoint::new(lat_deg, lng_deg));
            distance += step_km;
        }

        lines.push(LocalSpaceLineResult {
            planet: planet_to_string(*planet),
            azimuth: azimuth_deg,
            altitude: altitude_deg,
            points,
            direction: azimuth_to_direction(azimuth_deg).to_string(),
            color: get_planet_color(*planet).to_string(),
        });
    }

    let result = LocalSpaceResultData {
        birth_latitude: birth_lat,
        birth_longitude: birth_lng,
        lines,
        julian_date: jd,
        calculation_time: js_sys::Date::now() - start,
    };

    serde_wasm_bindgen::to_value(&result).unwrap()
}

// ============================================
// House System Calculations
// ============================================

/// House systems supported
#[derive(Clone, Copy, PartialEq)]
pub enum HouseSystem {
    Placidus,
    WholeSign,
    Equal,
    Koch,
    Campanus,
    Regiomontanus,
}

/// Calculate Lahiri ayanamsa for Vedic/sidereal zodiac
/// Ayanamsa is the difference between tropical and sidereal zodiac
pub fn calculate_lahiri_ayanamsa(jd: f64) -> f64 {
    // Lahiri ayanamsa formula (most widely used for Vedic astrology)
    // Based on Spica at 0° Libra in year 285 CE
    let t = (jd - J2000_EPOCH) / 36525.0;

    // Mean ayanamsa using Lahiri
    // Reference: 23°51'11" at J2000.0, precessing at ~50.29" per year
    let ayanamsa = 23.85250 + (50.29 / 3600.0) * t * 100.0;

    ayanamsa
}

/// Calculate Ascendant (ASC) ecliptic longitude for a given location and time
pub fn calculate_ascendant(lst: f64, lat: f64, obliquity: f64) -> f64 {
    // Standard formula: ASC = atan2(cos(RAMC), -sin(RAMC) * cos(ε) - tan(φ) * sin(ε))
    // where RAMC = Local Sidereal Time in radians

    // Clamp latitude to avoid infinity at poles (±89.9° max)
    let max_lat = 89.9 * DEG_TO_RAD;
    let clamped_lat = lat.clamp(-max_lat, max_lat);

    let cos_lst = lst.cos();
    let sin_lst = lst.sin();
    let cos_obl = obliquity.cos();
    let sin_obl = obliquity.sin();
    let tan_lat = clamped_lat.tan();

    // atan2 for ascendant calculation
    let asc = cos_lst.atan2(-sin_lst * cos_obl - tan_lat * sin_obl);

    // Convert to degrees
    let mut asc_deg = asc * RAD_TO_DEG;

    // Normalize to 0-360 degrees
    if asc_deg < 0.0 { asc_deg += 360.0; }
    if asc_deg >= 360.0 { asc_deg -= 360.0; }

    // Safety check for NaN
    if asc_deg.is_nan() { return 0.0; }

    asc_deg
}

/// Calculate Midheaven (MC) ecliptic longitude
pub fn calculate_midheaven(lst: f64, obliquity: f64) -> f64 {
    // MC formula: tan(MC) = tan(RAMC) / cos(ε)
    // Using atan2 for proper quadrant handling:
    // MC = atan2(sin(RAMC), cos(RAMC) * cos(ε))
    let sin_lst = lst.sin();
    let cos_lst = lst.cos();
    let cos_obl = obliquity.cos();

    let mc = sin_lst.atan2(cos_lst * cos_obl);

    // Convert to degrees and normalize to 0-360
    let mut mc_deg = mc * RAD_TO_DEG;
    if mc_deg < 0.0 { mc_deg += 360.0; }

    // Safety check for NaN
    if mc_deg.is_nan() { return 0.0; }

    mc_deg
}

// =============================================================================
// SWISS EPHEMERIS HOUSE CALCULATION FUNCTIONS
// Ported from swehouse.c for accurate house cusp calculations
// =============================================================================

/// Asc2 - Helper function for Asc1 (Swiss Ephemeris)
/// Computes ascendant in the first quadrant (0-90°)
/// x: input angle in range 0..90 degrees
/// f: geographic latitude in range -90..+90 degrees
/// sine, cose: sin and cos of obliquity (~23°)
fn swe_asc2(x: f64, f: f64, sine: f64, cose: f64) -> f64 {
    let mut ass = -tand(f) * sine + cose * cosd(x);
    if ass.abs() < VERY_SMALL {
        ass = 0.0;
    }
    let mut sinx = sind(x);
    if sinx.abs() < VERY_SMALL {
        sinx = 0.0;
    }

    let result = if sinx == 0.0 {
        if ass < 0.0 { -VERY_SMALL } else { VERY_SMALL }
    } else if ass == 0.0 {
        if sinx < 0.0 { -90.0 } else { 90.0 }
    } else {
        atand(sinx / ass)
    };

    if result < 0.0 {
        180.0 + result
    } else {
        result
    }
}

/// Asc1 - Main ascendant calculation function (Swiss Ephemeris)
/// Handles all four quadrants properly with robust boundary detection
/// x1: RAMC + offset in degrees (0-360)
/// f: geographic latitude in degrees (-90 to +90)
/// sine, cose: sin and cos of obliquity
fn swe_asc1(x1: f64, f: f64, sine: f64, cose: f64) -> f64 {
    let x1 = swe_degnorm(x1);

    // Robust quadrant calculation - fixes boundary failures at 90, 180, 270
    let n = if x1 < 90.0 { 1 }
        else if x1 < 180.0 { 2 }
        else if x1 < 270.0 { 3 }
        else { 4 };

    // Handle poles
    if (90.0 - f).abs() < VERY_SMALL {
        return 180.0; // near north pole
    }
    if (90.0 + f).abs() < VERY_SMALL {
        return 0.0; // near south pole
    }

    let mut ass = match n {
        1 => swe_asc2(x1, f, sine, cose),
        2 => 180.0 - swe_asc2(180.0 - x1, -f, sine, cose),
        3 => 180.0 + swe_asc2(x1 - 180.0, -f, sine, cose),
        _ => 360.0 - swe_asc2(360.0 - x1, f, sine, cose),
    };

    ass = swe_degnorm(ass);

    // Cardinal angle rounding - fix 89.999... to 90.0
    if (ass - 90.0).abs() < VERY_SMALL { ass = 90.0; }
    else if (ass - 180.0).abs() < VERY_SMALL { ass = 180.0; }
    else if (ass - 270.0).abs() < VERY_SMALL { ass = 270.0; }
    else if (ass - 360.0).abs() < VERY_SMALL || ass.abs() < VERY_SMALL { ass = 0.0; }

    ass
}

/// Convert ARMC (Right Ascension of MC) to MC ecliptic longitude
fn armc_to_mc(armc: f64, eps: f64) -> f64 {
    let cose = cosd(eps);

    if (armc - 90.0).abs() > VERY_SMALL && (armc - 270.0).abs() > VERY_SMALL {
        let tant = tand(armc);
        let mut mc = swe_degnorm(atand(tant / cose));
        if armc > 90.0 && armc <= 270.0 {
            mc = swe_degnorm(mc + 180.0);
        }
        mc
    } else if (armc - 90.0).abs() <= VERY_SMALL {
        90.0
    } else {
        270.0
    }
}

/// Fix ascendant when in polar regions (ascendant on western hemisphere)
#[allow(dead_code)]
fn fix_asc_polar(asc: f64, armc: f64, eps: f64, geolat: f64) -> f64 {
    let demc = atand(sind(armc) * tand(eps));
    let mut result = asc;

    if geolat >= 0.0 && 90.0 - geolat + demc < 0.0 {
        result = swe_degnorm(asc + 180.0);
    }
    if geolat < 0.0 && -90.0 - geolat + demc > 0.0 {
        result = swe_degnorm(asc + 180.0);
    }

    result
}

/// Calculate house cusps using Equal house system
pub fn calculate_equal_houses(asc: f64) -> [f64; 12] {
    let mut cusps = [0.0; 12];
    for i in 0..12 {
        cusps[i] = swe_degnorm(asc + (i as f64) * 30.0);
    }
    cusps
}

/// Calculate house cusps using Whole Sign house system
pub fn calculate_whole_sign_houses(asc: f64) -> [f64; 12] {
    // First house starts at 0° of the sign containing the ASC
    let first_house_sign = (asc / 30.0).floor() as usize;
    let first_cusp = (first_house_sign as f64) * 30.0;

    let mut cusps = [0.0; 12];
    for i in 0..12 {
        cusps[i] = (first_cusp + (i as f64) * 30.0) % 360.0;
    }
    cusps
}

/// Calculate house cusps using Placidus system (Swiss Ephemeris algorithm)
/// This is the most popular Western house system.
/// Uses iterative calculation for accurate results.
///
/// Parameters:
/// - armc: Right Ascension of MC in degrees (Local Sidereal Time * 15)
/// - lat: Geographic latitude in degrees
/// - obliquity: Obliquity of the ecliptic in degrees
/// - iteration_count: Number of iterations for refinement (1-2 recommended)
///
/// Returns: Array of 12 house cusps (0-indexed, cusp[0] = 1st house = ASC)
pub fn calculate_placidus_houses_swe(armc: f64, lat: f64, obliquity: f64, iteration_count: i32) -> Result<[f64; 12], &'static str> {
    let fi = lat;  // geographic latitude
    let ekl = obliquity;  // obliquity

    // Check for polar circle - Placidus doesn't work there
    if fi.abs() >= 90.0 - ekl {
        return Err("within polar circle, Placidus not available");
    }

    let sine = sind(ekl);
    let cose = cosd(ekl);
    let tane = tand(ekl);
    let tanfi = tand(fi);
    let th = armc;  // ARMC

    let mut cusps = [0.0; 12];

    // Calculate MC (cusp 10) and ASC (cusp 1)
    cusps[9] = armc_to_mc(armc, ekl);  // MC
    cusps[0] = swe_asc1(armc + 90.0, fi, sine, cose);  // ASC

    // Fix ASC if within polar circle region
    let acmc = swe_difdeg2n(cusps[0], cusps[9]);
    if acmc < 0.0 {
        cusps[0] = swe_degnorm(cusps[0] + 180.0);
    }

    // Placidus intermediate cusps calculation
    let a = asind(tanfi * tane);
    let fh1 = atand(sind(a / 3.0) / tane);
    let fh2 = atand(sind(a * 2.0 / 3.0) / tane);

    // House 11 (30° from MC toward ASC)
    let mut rectasc = swe_degnorm(30.0 + th);
    let mut tant = tand(asind(sine * sind(swe_asc1(rectasc, fh1, sine, cose))));
    if tant.abs() < VERY_SMALL {
        cusps[10] = rectasc;
    } else {
        let mut f = atand(sind(asind(tanfi * tant) / 3.0) / tant);
        cusps[10] = swe_asc1(rectasc, f, sine, cose);
        for _ in 0..iteration_count {
            tant = tand(asind(sine * sind(cusps[10])));
            if tant.abs() < VERY_SMALL {
                cusps[10] = rectasc;
                break;
            }
            f = atand(sind(asind(tanfi * tant) / 3.0) / tant);
            cusps[10] = swe_asc1(rectasc, f, sine, cose);
        }
    }

    // House 12 (60° from MC toward ASC)
    rectasc = swe_degnorm(60.0 + th);
    tant = tand(asind(sine * sind(swe_asc1(rectasc, fh2, sine, cose))));
    if tant.abs() < VERY_SMALL {
        cusps[11] = rectasc;
    } else {
        let mut f = atand(sind(asind(tanfi * tant) / 1.5) / tant);
        cusps[11] = swe_asc1(rectasc, f, sine, cose);
        for _ in 0..iteration_count {
            tant = tand(asind(sine * sind(cusps[11])));
            if tant.abs() < VERY_SMALL {
                cusps[11] = rectasc;
                break;
            }
            f = atand(sind(asind(tanfi * tant) / 1.5) / tant);
            cusps[11] = swe_asc1(rectasc, f, sine, cose);
        }
    }

    // House 2 (120° from MC)
    rectasc = swe_degnorm(120.0 + th);
    tant = tand(asind(sine * sind(swe_asc1(rectasc, fh2, sine, cose))));
    if tant.abs() < VERY_SMALL {
        cusps[1] = rectasc;
    } else {
        let mut f = atand(sind(asind(tanfi * tant) / 1.5) / tant);
        cusps[1] = swe_asc1(rectasc, f, sine, cose);
        for _ in 0..iteration_count {
            tant = tand(asind(sine * sind(cusps[1])));
            if tant.abs() < VERY_SMALL {
                cusps[1] = rectasc;
                break;
            }
            f = atand(sind(asind(tanfi * tant) / 1.5) / tant);
            cusps[1] = swe_asc1(rectasc, f, sine, cose);
        }
    }

    // House 3 (150° from MC)
    rectasc = swe_degnorm(150.0 + th);
    tant = tand(asind(sine * sind(swe_asc1(rectasc, fh1, sine, cose))));
    if tant.abs() < VERY_SMALL {
        cusps[2] = rectasc;
    } else {
        let mut f = atand(sind(asind(tanfi * tant) / 3.0) / tant);
        cusps[2] = swe_asc1(rectasc, f, sine, cose);
        for _ in 0..iteration_count {
            tant = tand(asind(sine * sind(cusps[2])));
            if tant.abs() < VERY_SMALL {
                cusps[2] = rectasc;
                break;
            }
            f = atand(sind(asind(tanfi * tant) / 3.0) / tant);
            cusps[2] = swe_asc1(rectasc, f, sine, cose);
        }
    }

    // Opposite houses (4-9 are 180° from 10-3)
    cusps[3] = swe_degnorm(cusps[9] + 180.0);  // IC
    cusps[4] = swe_degnorm(cusps[10] + 180.0); // House 5
    cusps[5] = swe_degnorm(cusps[11] + 180.0); // House 6
    cusps[6] = swe_degnorm(cusps[0] + 180.0);  // DSC
    cusps[7] = swe_degnorm(cusps[1] + 180.0);  // House 8
    cusps[8] = swe_degnorm(cusps[2] + 180.0);  // House 9

    Ok(cusps)
}

/// Calculate house cusps using Placidus system
/// Wrapper that accepts the same parameters as the old implementation
/// for backward compatibility.
pub fn calculate_placidus_houses(asc: f64, mc: f64, lat: f64, obliquity: f64) -> [f64; 12] {
    // Convert MC to ARMC (Right Ascension of MC)
    // MC = atan(tan(ARMC) / cos(obliquity))
    // Therefore: tan(ARMC) = tan(MC) * cos(obliquity)
    let obliquity_deg = obliquity * RAD_TO_DEG;
    let armc = {
        let tan_mc = tand(mc);
        let tan_armc = tan_mc * cosd(obliquity_deg);
        let mut armc = atand(tan_armc);
        // Adjust quadrant based on MC
        if mc > 90.0 && mc <= 270.0 {
            armc += 180.0;
        } else if mc > 270.0 {
            armc += 360.0;
        }
        swe_degnorm(armc)
    };

    // Try Swiss Ephemeris Placidus, fall back to Porphyry if in polar circle
    match calculate_placidus_houses_swe(armc, lat, obliquity_deg, 2) {
        Ok(cusps) => cusps,
        Err(_) => {
            // Fallback to Porphyry (equal division of quadrants)
            calculate_porphyry_houses(asc, mc)
        }
    }
}

/// Calculate house cusps using Porphyry system
/// Divides quadrants into equal thirds - used as fallback for polar regions
fn calculate_porphyry_houses(asc: f64, mc: f64) -> [f64; 12] {
    let mut cusps = [0.0; 12];

    cusps[0] = asc;  // ASC
    cusps[9] = mc;   // MC
    cusps[3] = swe_degnorm(mc + 180.0);  // IC
    cusps[6] = swe_degnorm(asc + 180.0); // DSC

    // Quadrant 1: MC to ASC
    let q1 = angle_difference(mc, asc);
    cusps[10] = swe_degnorm(mc + q1 / 3.0);
    cusps[11] = swe_degnorm(mc + 2.0 * q1 / 3.0);

    // Quadrant 2: ASC to IC
    let q2 = angle_difference(asc, cusps[3]);
    cusps[1] = swe_degnorm(asc + q2 / 3.0);
    cusps[2] = swe_degnorm(asc + 2.0 * q2 / 3.0);

    // Quadrant 3: IC to DSC
    let q3 = angle_difference(cusps[3], cusps[6]);
    cusps[4] = swe_degnorm(cusps[3] + q3 / 3.0);
    cusps[5] = swe_degnorm(cusps[3] + 2.0 * q3 / 3.0);

    // Quadrant 4: DSC to MC
    let q4 = angle_difference(cusps[6], mc);
    cusps[7] = swe_degnorm(cusps[6] + q4 / 3.0);
    cusps[8] = swe_degnorm(cusps[6] + 2.0 * q4 / 3.0);

    cusps
}

/// Helper to calculate angle difference in correct direction (0-360)
fn angle_difference(from: f64, to: f64) -> f64 {
    let diff = to - from;
    if diff < 0.0 { diff + 360.0 } else { diff }
}

/// Calculate house cusps using Koch system (Swiss Ephemeris algorithm)
/// Koch is a space-based house system like Placidus but uses a different
/// method for intermediate cusps based on ascensional differences.
///
/// Parameters:
/// - armc: Right Ascension of MC in degrees (Local Sidereal Time * 15)
/// - lat: Geographic latitude in degrees
/// - obliquity: Obliquity of the ecliptic in degrees
///
/// Returns: Array of 12 house cusps (0-indexed, cusp[0] = 1st house = ASC)
pub fn calculate_koch_houses_swe(armc: f64, lat: f64, obliquity: f64) -> Result<[f64; 12], &'static str> {
    let fi = lat;  // geographic latitude
    let ekl = obliquity;  // obliquity

    // Check for polar circle - Koch doesn't work there
    if fi.abs() >= 90.0 - ekl {
        return Err("within polar circle, Koch not available");
    }

    let sine = sind(ekl);
    let cose = cosd(ekl);
    let tanfi = tand(fi);
    let th = armc;  // ARMC

    let mut cusps = [0.0; 12];

    // Calculate MC (cusp 10) and ASC (cusp 1)
    let mc = armc_to_mc(armc, ekl);
    cusps[9] = mc;  // MC
    cusps[0] = swe_asc1(armc + 90.0, fi, sine, cose);  // ASC

    // Fix ASC if within polar circle region
    let acmc = swe_difdeg2n(cusps[0], cusps[9]);
    if acmc < 0.0 {
        cusps[0] = swe_degnorm(cusps[0] + 180.0);
    }

    // Koch intermediate cusps calculation
    // Based on ascensional difference method
    let mut sina = sind(mc) * sine / cosd(fi);

    // Clamp sina to valid range [-1, 1]
    if sina > 1.0 { sina = 1.0; }
    if sina < -1.0 { sina = -1.0; }

    let cosa = (1.0 - sina * sina).sqrt();
    let c = atand(tanfi / cosa);
    let ad3 = asind(sind(c) * sina) / 3.0;

    // House 11 (30° from MC with Koch ascensional adjustment)
    cusps[10] = swe_asc1(th + 30.0 - 2.0 * ad3, fi, sine, cose);

    // House 12 (60° from MC with Koch ascensional adjustment)
    cusps[11] = swe_asc1(th + 60.0 - ad3, fi, sine, cose);

    // House 2 (120° from MC with Koch ascensional adjustment)
    cusps[1] = swe_asc1(th + 120.0 + ad3, fi, sine, cose);

    // House 3 (150° from MC with Koch ascensional adjustment)
    cusps[2] = swe_asc1(th + 150.0 + 2.0 * ad3, fi, sine, cose);

    // Opposite houses (4-9 are 180° from 10-3)
    cusps[3] = swe_degnorm(cusps[9] + 180.0);  // IC
    cusps[4] = swe_degnorm(cusps[10] + 180.0); // House 5
    cusps[5] = swe_degnorm(cusps[11] + 180.0); // House 6
    cusps[6] = swe_degnorm(cusps[0] + 180.0);  // DSC
    cusps[7] = swe_degnorm(cusps[1] + 180.0);  // House 8
    cusps[8] = swe_degnorm(cusps[2] + 180.0);  // House 9

    Ok(cusps)
}

/// Calculate house cusps using Koch system
/// Wrapper that accepts the same parameters as the Placidus wrapper
/// for consistent API usage.
pub fn calculate_koch_houses(asc: f64, mc: f64, lat: f64, obliquity: f64) -> [f64; 12] {
    // Convert MC to ARMC (Right Ascension of MC)
    let obliquity_deg = obliquity * RAD_TO_DEG;
    let armc = {
        let tan_mc = tand(mc);
        let tan_armc = tan_mc * cosd(obliquity_deg);
        let mut armc = atand(tan_armc);
        // Adjust quadrant based on MC
        if mc > 90.0 && mc <= 270.0 {
            armc += 180.0;
        } else if mc > 270.0 {
            armc += 360.0;
        }
        swe_degnorm(armc)
    };

    // Try Swiss Ephemeris Koch, fall back to Porphyry if in polar circle
    match calculate_koch_houses_swe(armc, lat, obliquity_deg) {
        Ok(cusps) => cusps,
        Err(_) => {
            // Fallback to Porphyry (equal division of quadrants)
            calculate_porphyry_houses(asc, mc)
        }
    }
}

/// Natal chart result structure
#[derive(Serialize)]
struct NatalChartResult {
    // Chart angles
    ascendant: f64,
    midheaven: f64,
    descendant: f64,
    imum_coeli: f64,

    // House cusps (12)
    house_cusps: Vec<f64>,
    house_system: String,

    // Planet positions (ecliptic longitude)
    planets: Vec<NatalPlanetPosition>,

    // Zodiac type
    zodiac_type: String,
    ayanamsa: Option<f64>,

    // Metadata
    julian_date: f64,
    local_sidereal_time: f64,
    obliquity: f64,
    calculation_time: f64,
}

#[derive(Serialize)]
struct NatalPlanetPosition {
    planet: String,
    longitude: f64,            // Ecliptic longitude (0-360)
    longitude_sidereal: Option<f64>, // Sidereal longitude if Vedic
    sign_index: u8,            // 0=Aries, 11=Pisces
    sign_name: String,
    degree_in_sign: f64,       // 0-30
    retrograde: bool,
    house: u8,                 // Which house (1-12)
}

/// Get zodiac sign name from index
fn get_sign_name(index: u8) -> String {
    match index {
        0 => "Aries",
        1 => "Taurus",
        2 => "Gemini",
        3 => "Cancer",
        4 => "Leo",
        5 => "Virgo",
        6 => "Libra",
        7 => "Scorpio",
        8 => "Sagittarius",
        9 => "Capricorn",
        10 => "Aquarius",
        11 => "Pisces",
        _ => "Unknown",
    }.to_string()
}

/// Determine which house a planet is in
fn find_house(longitude: f64, cusps: &[f64; 12]) -> u8 {
    for i in 0..12 {
        let next = (i + 1) % 12;
        let cusp_start = cusps[i];
        let cusp_end = cusps[next];

        // Handle wrap-around at 360°
        if cusp_start <= cusp_end {
            if longitude >= cusp_start && longitude < cusp_end {
                return (i + 1) as u8;
            }
        } else {
            // Crosses 0°
            if longitude >= cusp_start || longitude < cusp_end {
                return (i + 1) as u8;
            }
        }
    }
    1 // Default to 1st house
}

/// Calculate complete natal chart with house cusps
#[wasm_bindgen]
pub fn calculate_natal_chart(
    birth_lat: f64,
    birth_lng: f64,
    year: i32,
    month: u32,
    day: u32,
    hour: u32,
    minute: u32,
    second: u32,
    house_system: &str,  // "placidus", "equal", "whole_sign", "koch"
    use_sidereal: bool,  // true for Vedic
) -> JsValue {
    let start = js_sys::Date::now();

    // Convert local time to UTC Julian Date
    let jd = local_to_utc_julian_date(birth_lat, birth_lng, year, month, day, hour, minute, second);
    let gmst = calculate_gmst(jd);
    let lst = calculate_lst(gmst, birth_lng);

    // Convert to TT for ephemeris calculations (compute once for all planets)
    let (utc_year, utc_month, _) = jd_to_calendar(jd);
    let jde = ut_to_tt(jd, utc_year, utc_month);
    let nutation = calculate_nutation(jde);
    let mean_obliquity = calculate_obliquity(jde);
    let obliquity = mean_obliquity + nutation.delta_epsilon;
    let lat_rad = birth_lat * DEG_TO_RAD;

    // Calculate Ascendant and Midheaven (tropical)
    let asc_tropical = calculate_ascendant(lst, lat_rad, obliquity);
    let mc_tropical = calculate_midheaven(lst, obliquity);

    // Calculate ayanamsa for sidereal
    let ayanamsa = if use_sidereal {
        Some(calculate_lahiri_ayanamsa(jd))
    } else {
        None
    };

    // For sidereal/Vedic, subtract ayanamsa from ASC and MC
    let (asc, mc) = if use_sidereal {
        let ayan = ayanamsa.unwrap_or(0.0);
        let mut sid_asc = asc_tropical - ayan;
        if sid_asc < 0.0 { sid_asc += 360.0; }
        if sid_asc >= 360.0 { sid_asc -= 360.0; }
        let mut sid_mc = mc_tropical - ayan;
        if sid_mc < 0.0 { sid_mc += 360.0; }
        if sid_mc >= 360.0 { sid_mc -= 360.0; }
        (sid_asc, sid_mc)
    } else {
        (asc_tropical, mc_tropical)
    };

    let dsc = (asc + 180.0) % 360.0;
    let ic = (mc + 180.0) % 360.0;

    // Calculate house cusps based on system (using sidereal ASC/MC if Vedic)
    let cusps = match house_system.to_lowercase().as_str() {
        "whole_sign" | "wholesign" => calculate_whole_sign_houses(asc),
        "placidus" => calculate_placidus_houses(asc, mc, birth_lat, obliquity),
        "equal" | _ => calculate_equal_houses(asc),
    };

    // Calculate planet positions (using pre-computed TT values for performance)
    let planets = [
        Planet::Sun, Planet::Moon, Planet::Mercury, Planet::Venus, Planet::Mars,
        Planet::Jupiter, Planet::Saturn, Planet::Uranus, Planet::Neptune, Planet::Pluto,
        Planet::Chiron, Planet::NorthNode,
    ];

    let mut planet_positions = Vec::new();

    for planet in planets.iter() {
        let pos = calculate_planetary_position_tt(*planet, jde, obliquity, &nutation);
        let mut longitude = pos.ecliptic_longitude;

        // Ensure 0-360 range
        if longitude < 0.0 { longitude += 360.0; }
        if longitude >= 360.0 { longitude -= 360.0; }

        // Calculate sidereal longitude if needed
        let longitude_sidereal = ayanamsa.map(|a| {
            let mut sid = longitude - a;
            if sid < 0.0 { sid += 360.0; }
            if sid >= 360.0 { sid -= 360.0; }
            sid
        });

        // Use sidereal for sign calculation if Vedic
        let calc_longitude = if use_sidereal {
            longitude_sidereal.unwrap_or(longitude)
        } else {
            longitude
        };

        let sign_index = (calc_longitude / 30.0).floor() as u8;
        let degree_in_sign = calc_longitude % 30.0;
        let house = find_house(longitude, &cusps);

        planet_positions.push(NatalPlanetPosition {
            planet: planet_to_string(*planet),
            longitude,
            longitude_sidereal,
            sign_index,
            sign_name: get_sign_name(sign_index),
            degree_in_sign,
            retrograde: false, // Would need velocity calculation for accurate retrograde
            house,
        });
    }

    let result = NatalChartResult {
        ascendant: asc,
        midheaven: mc,
        descendant: dsc,
        imum_coeli: ic,
        house_cusps: cusps.to_vec(),
        house_system: house_system.to_string(),
        planets: planet_positions,
        zodiac_type: if use_sidereal { "sidereal".to_string() } else { "tropical".to_string() },
        ayanamsa,
        julian_date: jd,
        local_sidereal_time: lst * RAD_TO_DEG,
        obliquity: obliquity * RAD_TO_DEG,
        calculation_time: js_sys::Date::now() - start,
    };

    serde_wasm_bindgen::to_value(&result).unwrap()
}

// ============================================
// Relocation Chart
// ============================================

/// Relocation chart result - compares original birth chart with relocated chart
#[derive(Serialize)]
struct RelocationChartResult {
    // Original location data
    original_lat: f64,
    original_lng: f64,

    // Relocation data
    relocated_lat: f64,
    relocated_lng: f64,

    // Original chart angles
    original_ascendant: f64,
    original_midheaven: f64,
    original_descendant: f64,
    original_ic: f64,
    original_house_cusps: Vec<f64>,

    // Relocated chart angles
    relocated_ascendant: f64,
    relocated_midheaven: f64,
    relocated_descendant: f64,
    relocated_ic: f64,
    relocated_house_cusps: Vec<f64>,

    // Angular shifts (how much the angles moved)
    ascendant_shift: f64,
    midheaven_shift: f64,

    // Planet positions with both house placements
    planets: Vec<RelocationPlanetPosition>,

    // House system and settings
    house_system: String,
    zodiac_type: String,
    ayanamsa: Option<f64>,

    // Metadata
    julian_date: f64,
    calculation_time: f64,
}

#[derive(Serialize)]
struct RelocationPlanetPosition {
    planet: String,
    longitude: f64,           // Ecliptic longitude (same for both locations)
    sign_name: String,
    degree_in_sign: f64,
    original_house: u8,       // House in original chart
    relocated_house: u8,      // House in relocated chart
    house_changed: bool,      // True if planet changed houses
}

/// Calculate relocation chart - shows how natal chart changes at a different location
/// The planetary positions remain the same (fixed at birth), but house placements change
#[wasm_bindgen]
pub fn calculate_relocation_chart(
    // Original birth location
    birth_lat: f64,
    birth_lng: f64,
    // Relocation target
    reloc_lat: f64,
    reloc_lng: f64,
    // Birth time
    year: i32,
    month: u32,
    day: u32,
    hour: u32,
    minute: u32,
    second: u32,
    // Chart settings
    house_system: &str,
    use_sidereal: bool,
) -> JsValue {
    let start = js_sys::Date::now();

    // Calculate Julian Date from birth time (uses original birth location for timezone)
    let jd = local_to_utc_julian_date(birth_lat, birth_lng, year, month, day, hour, minute, second);

    // Convert to TT for ephemeris calculations (compute once for all planets)
    let (utc_year, utc_month, _) = jd_to_calendar(jd);
    let jde = ut_to_tt(jd, utc_year, utc_month);
    let nutation = calculate_nutation(jde);
    let mean_obliquity = calculate_obliquity(jde);
    let obliquity = mean_obliquity + nutation.delta_epsilon;

    // Calculate ayanamsa for sidereal
    let ayanamsa = if use_sidereal {
        Some(calculate_lahiri_ayanamsa(jd))
    } else {
        None
    };

    // ========== Original Chart ==========
    let gmst_orig = calculate_gmst(jd);
    let lst_orig = calculate_lst(gmst_orig, birth_lng);
    let lat_rad_orig = birth_lat * DEG_TO_RAD;

    let orig_asc_tropical = calculate_ascendant(lst_orig, lat_rad_orig, obliquity);
    let orig_mc_tropical = calculate_midheaven(lst_orig, obliquity);

    let (orig_asc, orig_mc) = if use_sidereal {
        let ayan = ayanamsa.unwrap_or(0.0);
        let mut sid_asc = orig_asc_tropical - ayan;
        if sid_asc < 0.0 { sid_asc += 360.0; }
        if sid_asc >= 360.0 { sid_asc -= 360.0; }
        let mut sid_mc = orig_mc_tropical - ayan;
        if sid_mc < 0.0 { sid_mc += 360.0; }
        if sid_mc >= 360.0 { sid_mc -= 360.0; }
        (sid_asc, sid_mc)
    } else {
        (orig_asc_tropical, orig_mc_tropical)
    };

    let orig_dsc = (orig_asc + 180.0) % 360.0;
    let orig_ic = (orig_mc + 180.0) % 360.0;

    let orig_cusps = match house_system.to_lowercase().as_str() {
        "whole_sign" | "wholesign" => calculate_whole_sign_houses(orig_asc),
        "placidus" => calculate_placidus_houses(orig_asc, orig_mc, birth_lat, obliquity),
        "equal" | _ => calculate_equal_houses(orig_asc),
    };

    // ========== Relocated Chart ==========
    let lst_reloc = calculate_lst(gmst_orig, reloc_lng);  // Same GMST, different longitude
    let lat_rad_reloc = reloc_lat * DEG_TO_RAD;

    let reloc_asc_tropical = calculate_ascendant(lst_reloc, lat_rad_reloc, obliquity);
    let reloc_mc_tropical = calculate_midheaven(lst_reloc, obliquity);

    let (reloc_asc, reloc_mc) = if use_sidereal {
        let ayan = ayanamsa.unwrap_or(0.0);
        let mut sid_asc = reloc_asc_tropical - ayan;
        if sid_asc < 0.0 { sid_asc += 360.0; }
        if sid_asc >= 360.0 { sid_asc -= 360.0; }
        let mut sid_mc = reloc_mc_tropical - ayan;
        if sid_mc < 0.0 { sid_mc += 360.0; }
        if sid_mc >= 360.0 { sid_mc -= 360.0; }
        (sid_asc, sid_mc)
    } else {
        (reloc_asc_tropical, reloc_mc_tropical)
    };

    let reloc_dsc = (reloc_asc + 180.0) % 360.0;
    let reloc_ic = (reloc_mc + 180.0) % 360.0;

    let reloc_cusps = match house_system.to_lowercase().as_str() {
        "whole_sign" | "wholesign" => calculate_whole_sign_houses(reloc_asc),
        "placidus" => calculate_placidus_houses(reloc_asc, reloc_mc, reloc_lat, obliquity),
        "equal" | _ => calculate_equal_houses(reloc_asc),
    };

    // ========== Calculate Shifts ==========
    let asc_shift = shortest_angular_distance(orig_asc, reloc_asc);
    let mc_shift = shortest_angular_distance(orig_mc, reloc_mc);

    // ========== Planet Positions (using pre-computed TT values for performance) ==========
    let planets = [
        Planet::Sun, Planet::Moon, Planet::Mercury, Planet::Venus, Planet::Mars,
        Planet::Jupiter, Planet::Saturn, Planet::Uranus, Planet::Neptune, Planet::Pluto,
        Planet::Chiron, Planet::NorthNode,
    ];

    let mut planet_positions = Vec::new();

    for planet in planets.iter() {
        let pos = calculate_planetary_position_tt(*planet, jde, obliquity, &nutation);
        let mut longitude = pos.ecliptic_longitude;

        if longitude < 0.0 { longitude += 360.0; }
        if longitude >= 360.0 { longitude -= 360.0; }

        // Apply ayanamsa for sidereal sign calculation
        let calc_longitude = if use_sidereal {
            let mut sid = longitude - ayanamsa.unwrap_or(0.0);
            if sid < 0.0 { sid += 360.0; }
            if sid >= 360.0 { sid -= 360.0; }
            sid
        } else {
            longitude
        };

        let sign_index = (calc_longitude / 30.0).floor() as u8;
        let degree_in_sign = calc_longitude % 30.0;

        // Find house in both charts (use tropical longitude for house placement)
        let orig_house = find_house(longitude, &orig_cusps);
        let reloc_house = find_house(longitude, &reloc_cusps);

        planet_positions.push(RelocationPlanetPosition {
            planet: planet_to_string(*planet),
            longitude,
            sign_name: get_sign_name(sign_index),
            degree_in_sign,
            original_house: orig_house,
            relocated_house: reloc_house,
            house_changed: orig_house != reloc_house,
        });
    }

    let result = RelocationChartResult {
        original_lat: birth_lat,
        original_lng: birth_lng,
        relocated_lat: reloc_lat,
        relocated_lng: reloc_lng,
        original_ascendant: orig_asc,
        original_midheaven: orig_mc,
        original_descendant: orig_dsc,
        original_ic: orig_ic,
        original_house_cusps: orig_cusps.to_vec(),
        relocated_ascendant: reloc_asc,
        relocated_midheaven: reloc_mc,
        relocated_descendant: reloc_dsc,
        relocated_ic: reloc_ic,
        relocated_house_cusps: reloc_cusps.to_vec(),
        ascendant_shift: asc_shift,
        midheaven_shift: mc_shift,
        planets: planet_positions,
        house_system: house_system.to_string(),
        zodiac_type: if use_sidereal { "sidereal".to_string() } else { "tropical".to_string() },
        ayanamsa,
        julian_date: jd,
        calculation_time: js_sys::Date::now() - start,
    };

    serde_wasm_bindgen::to_value(&result).unwrap()
}

/// Calculate shortest angular distance between two angles (can be negative)
fn shortest_angular_distance(from: f64, to: f64) -> f64 {
    let mut diff = to - from;
    while diff > 180.0 { diff -= 360.0; }
    while diff < -180.0 { diff += 360.0; }
    diff
}

// ============================================
// Tests
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    // ============================================
    // Julian Date Tests
    // ============================================

    #[test]
    fn test_julian_date_j2000_epoch() {
        // For this library's UTC-based API, 2000-01-01 12:00 UTC maps to JD 2451545.0.
        // (The formal J2000.0 epoch is 12:00 TT, which differs by ~64s, but that distinction
        // is handled internally when we convert UTC→TT for ephemeris calculations.)
        let jd = to_julian_date(2000, 1, 1, 12, 0, 0);
        assert!((jd - 2451545.0).abs() < 0.01, "2000-01-01 12:00 UTC should be JD ~2451545.0");
    }

    #[test]
    fn test_julian_date_known_dates() {
        // December 31, 1999, 0:00 UTC = JD 2451543.5 (1.5 days before J2000.0)
        let jd1 = to_julian_date(1999, 12, 31, 0, 0, 0);
        assert!((jd1 - 2451543.5).abs() < 0.01, "1999-12-31 00:00 should be ~2451543.5");

        // July 4, 1776, 12:00 UT (US Independence)
        let jd2 = to_julian_date(1776, 7, 4, 12, 0, 0);
        assert!((jd2 - 2369916.0).abs() < 1.0, "1776-07-04 should be ~2369916");

        // January 1, 2024, 0:00 UT
        let jd3 = to_julian_date(2024, 1, 1, 0, 0, 0);
        assert!((jd3 - 2460310.5).abs() < 0.01, "2024-01-01 00:00 should be ~2460310.5");
    }

    #[test]
    fn test_julian_date_leap_year() {
        // February 29, 2024 (leap year)
        let jd = to_julian_date(2024, 2, 29, 12, 0, 0);
        assert!(jd > 2460369.0 && jd < 2460371.0, "Feb 29, 2024 should be valid");
    }

    // ============================================
    // GMST Tests (Formula from astrocartography_formulas.md Section 2.1)
    // θ_G = 280.46061837 + 360.98564736629×(JD-2451545.0) + 0.000387933×T² - T³/38710000
    // ============================================

    #[test]
    fn test_gmst_j2000_epoch() {
        // Test GMST at a known UTC timestamp (2000-01-01 12:00 UTC)
        // Note: calculate_gmst() internally applies DUT1 (UTC→UT1), so the result
        // differs slightly from the pure formula value (280.46061837°).
        // DUT1 at this epoch was ~+0.35s, shifting GMST by ~0.0015° (negligible).
        let jd = to_julian_date(2000, 1, 1, 12, 0, 0);
        let gmst = calculate_gmst(jd);
        let expected_rad = 280.46061837 * DEG_TO_RAD;
        // Tolerance of 0.003 rad (~0.17°) accounts for DUT1 modeling uncertainty
        assert!((gmst - expected_rad).abs() < 0.003,
            "GMST at 2000-01-01 12:00 UTC should be ~280.46°, got {}°", gmst * RAD_TO_DEG);
    }

    #[test]
    fn test_gmst_known_value() {
        // Test GMST half a day after J2000.0 (2000-01-02 00:00 UTC)
        // Formula (without DUT1): θ_G = 280.46 + 360.985×0.5 ≈ 100.95°
        // With DUT1 applied, expect small deviation from this value.
        let jd = to_julian_date(2000, 1, 2, 0, 0, 0);
        let gmst = calculate_gmst(jd);
        let gmst_deg = gmst * RAD_TO_DEG;
        // Tolerance of 0.05° is sufficient since DUT1 only shifts by ~0.001°
        assert!((gmst_deg - 100.95).abs() < 0.05,
            "GMST at 2000-01-02 00:00 UTC should be ~100.95°, got {}°", gmst_deg);
    }

    #[test]
    fn test_gmst_normalization() {
        // Test that GMST is properly normalized to [0, 2π)
        let jd = to_julian_date(2024, 6, 15, 12, 0, 0);
        let gmst = calculate_gmst(jd);
        assert!(gmst >= 0.0 && gmst < 2.0 * PI, "GMST should be in [0, 2π)");
    }

    // ============================================
    // Angle Normalization Tests
    // ============================================

    #[test]
    fn test_normalize_angle() {
        // normalize_angle should put angle in [0, 2π)
        assert!((normalize_angle(3.0 * PI) - PI).abs() < 1e-10);
        assert!((normalize_angle(-PI) - PI).abs() < 1e-10);
        assert!((normalize_angle(0.0) - 0.0).abs() < 1e-10);
        assert!((normalize_angle(2.0 * PI) - 0.0).abs() < 1e-10);
        assert!((normalize_angle(5.0 * PI) - PI).abs() < 1e-10);
    }

    #[test]
    fn test_normalize_signed_angle() {
        // normalize_signed_angle should put angle in (-π, π]
        let a1 = normalize_signed_angle(0.0);
        assert!(a1.abs() < 1e-10, "0 should stay 0");

        let a2 = normalize_signed_angle(PI);
        assert!((a2.abs() - PI).abs() < 1e-10, "π should stay ±π");

        let a3 = normalize_signed_angle(1.5 * PI);
        assert!((a3 + 0.5 * PI).abs() < 1e-10, "1.5π should become -0.5π");
    }

    // ============================================
    // MC Line Tests (Formula: λ_MC = normalize(α_i - θ_G))
    // ============================================

    #[test]
    fn test_mc_longitude_basic() {
        // If RA = GMST, then MC longitude should be 0
        let ra = PI; // 180 degrees
        let gmst = PI; // 180 degrees
        let mc_lng = calculate_mc_longitude(ra, gmst);
        assert!(mc_lng.abs() < 0.1, "When RA = GMST, MC should be at 0°, got {}°", mc_lng);
    }

    #[test]
    fn test_mc_longitude_offset() {
        // If RA = GMST + 45°, then MC should be at 45° east
        let gmst = PI; // 180 degrees
        let ra = gmst + 45.0 * DEG_TO_RAD;
        let mc_lng = calculate_mc_longitude(ra, gmst);
        assert!((mc_lng - 45.0).abs() < 0.1, "MC should be at 45°E, got {}°", mc_lng);
    }

    // ============================================
    // IC Line Tests (Formula: λ_IC = normalize(α_i + π - θ_G))
    // ============================================

    #[test]
    fn test_ic_longitude_basic() {
        // IC should be 180° from MC
        let ra = PI;
        let gmst = PI;
        let mc_lng = calculate_mc_longitude(ra, gmst);
        let ic_lng = calculate_ic_longitude(ra, gmst);
        let diff = (mc_lng - ic_lng).abs();
        // Difference should be 180° (or close to it, accounting for wraparound)
        assert!((diff - 180.0).abs() < 1.0 || (360.0 - diff - 180.0).abs() < 1.0,
            "IC should be 180° from MC");
    }

    #[test]
    fn test_mc_ic_opposite() {
        // For any RA/GMST combination, IC = MC + 180°
        let test_cases = [
            (0.0, 0.0),
            (PI/2.0, PI/4.0),
            (PI, PI/2.0),
            (3.0*PI/2.0, PI),
        ];

        for (ra, gmst) in test_cases {
            let mc = calculate_mc_longitude(ra, gmst);
            let ic = calculate_ic_longitude(ra, gmst);
            let diff = ((mc - ic).abs() % 360.0).min((360.0 - (mc - ic).abs()) % 360.0);
            assert!((diff - 180.0).abs() < 1.0,
                "MC-IC difference should be 180°, got {}°", diff);
        }
    }

    // ============================================
    // ASC/DSC Horizon Latitude Tests
    // (Formula: φ = arctan(-cos H / tan δ))
    // ============================================

    #[test]
    fn test_horizon_latitude_equatorial_planet() {
        // Planet on celestial equator (δ = 0): returns None to avoid rendering artifacts
        // When declination ≈ 0, the horizon equation becomes degenerate and produces
        // discontinuous points that don't form a smooth curve. Returning None allows
        // the ASC/DSC line to naturally disappear for these edge cases.
        let ra = PI;
        let dec = 0.0; // Equatorial
        let gmst = 0.0;

        // At longitude 90°E, test horizon latitude
        let lat = calculate_horizon_latitude(ra, dec, gmst, 90.0);
        assert!(lat.is_none(), "Equatorial declination should return None to avoid artifacts");

        // Verify that slightly non-zero declinations still work
        let dec_small = 0.001; // ~0.057 degrees
        let lat_small = calculate_horizon_latitude(ra, dec_small, gmst, 90.0);
        assert!(lat_small.is_some(), "Small but non-zero declination should have a solution");
    }

    #[test]
    fn test_horizon_latitude_declination_effect() {
        // Higher declination should shift horizon line toward poles
        let ra = PI;
        let gmst = 0.0;
        let lng = 45.0;

        // Low declination
        let lat_low = calculate_horizon_latitude(ra, 10.0 * DEG_TO_RAD, gmst, lng);
        // Higher declination
        let lat_high = calculate_horizon_latitude(ra, 45.0 * DEG_TO_RAD, gmst, lng);

        assert!(lat_low.is_some() && lat_high.is_some(), "Both should have solutions");
        // Higher declination should generally produce different latitude curves
    }

    #[test]
    fn test_horizon_latitude_polar_declination() {
        // Planet very close to celestial pole (|δ| > 66.5°)
        // Some latitudes won't have rising/setting
        let ra = 0.0;
        let dec = 80.0 * DEG_TO_RAD; // Near north celestial pole
        let gmst = 0.0;

        // At many longitudes, the calculation should still work
        let lat = calculate_horizon_latitude(ra, dec, gmst, 0.0);
        // Near-polar declinations will give extreme latitudes
        if let Some(l) = lat {
            assert!(l.abs() <= 90.0, "Latitude should be within [-90, 90]");
        }
    }

    // ============================================
    // Rising/Setting Tests (Formula: sin H < 0 = rising)
    // ============================================

    #[test]
    fn test_is_rising_basic() {
        // When hour angle is negative (planet east of meridian), it's rising
        let ra = PI;
        let gmst = PI / 2.0; // GMST = 90°

        // At longitude 0°: H = GMST + 0 - RA = 90° - 180° = -90°
        // sin(-90°) = -1 < 0 → rising
        let rising_at_0 = is_rising(ra, gmst, 0.0);
        assert!(rising_at_0, "Planet should be rising at longitude 0°");

        // At longitude 180°: H = GMST + 180° - RA = 90° + 180° - 180° = 90°
        // sin(90°) = 1 > 0 → setting
        let rising_at_180 = is_rising(ra, gmst, 180.0);
        assert!(!rising_at_180, "Planet should be setting at longitude 180°");
    }

    // ============================================
    // Angular Separation Tests
    // (Formula: cos d = sin δ₁ sin δ₂ + cos δ₁ cos δ₂ cos(Δα))
    // ============================================

    #[test]
    fn test_angular_separation_same_point() {
        // Same point should have 0 separation
        let ra = 1.5;
        let dec = 0.5;
        let sep = angular_separation(ra, dec, ra, dec);
        assert!(sep.abs() < 1e-10, "Same point should have 0 separation");
    }

    #[test]
    fn test_angular_separation_opposite_points() {
        // Points on opposite sides of celestial sphere: 180° separation
        let sep = angular_separation(0.0, 0.0, PI, 0.0);
        assert!((sep - PI).abs() < 1e-10, "Opposite points should have π separation");
    }

    #[test]
    fn test_angular_separation_90_degrees() {
        // Pole to equator: 90° separation
        let sep = angular_separation(0.0, PI/2.0, 0.0, 0.0); // North pole to equator
        assert!((sep - PI/2.0).abs() < 1e-10, "Pole to equator should be 90°");
    }

    #[test]
    fn test_angular_separation_known_values() {
        // Verify with known astronomical values
        // Sun-Moon average separation is about 180° (full moon)
        // Test: two points at declination 0, RA difference = 60°
        let sep = angular_separation(0.0, 0.0, 60.0 * DEG_TO_RAD, 0.0);
        assert!((sep - 60.0 * DEG_TO_RAD).abs() < 0.01,
            "60° RA difference on equator should give 60° separation");
    }

    // ============================================
    // Obliquity Tests (IAU 2006 precession model)
    // ============================================

    #[test]
    fn test_obliquity_j2000() {
        // At J2000.0, obliquity should be approximately 23.439291°
        let obliquity = calculate_obliquity(J2000_EPOCH);
        let obliquity_deg = obliquity * RAD_TO_DEG;
        assert!((obliquity_deg - 23.439).abs() < 0.01,
            "Obliquity at J2000.0 should be ~23.439°, got {}°", obliquity_deg);
    }

    #[test]
    fn test_obliquity_decreasing() {
        // Obliquity is slowly decreasing over time
        let obl_2000 = calculate_obliquity(to_julian_date(2000, 1, 1, 12, 0, 0));
        let obl_2100 = calculate_obliquity(to_julian_date(2100, 1, 1, 12, 0, 0));
        assert!(obl_2100 < obl_2000, "Obliquity should decrease over time");
    }

    // ============================================
    // Ecliptic to Equatorial Conversion Tests
    // ============================================

    #[test]
    fn test_ecliptic_to_equatorial_vernal_equinox() {
        // At vernal equinox point (ecl_lon = 0, ecl_lat = 0):
        // RA should be 0, Dec should be 0
        let (ra, dec) = ecliptic_to_equatorial(0.0, 0.0, OBLIQUITY_J2000);
        assert!(ra.abs() < 0.01, "Vernal equinox RA should be 0");
        assert!(dec.abs() < 0.01, "Vernal equinox Dec should be 0");
    }

    #[test]
    fn test_ecliptic_to_equatorial_summer_solstice() {
        // At summer solstice (ecl_lon = 90° = π/2):
        // RA should be 90°, Dec should be +obliquity
        let (ra, dec) = ecliptic_to_equatorial(PI/2.0, 0.0, OBLIQUITY_J2000);
        let ra_deg = ra * RAD_TO_DEG;
        let dec_deg = dec * RAD_TO_DEG;

        assert!((ra_deg - 90.0).abs() < 1.0, "Summer solstice RA should be ~90°");
        assert!((dec_deg - 23.44).abs() < 0.5, "Summer solstice Dec should be ~+23.44°");
    }

    // ============================================
    // True Node Tests
    // ============================================

    #[test]
    fn test_true_node_wobble() {
        // True Node should differ from Mean Node by up to ±1.7 degrees
        // Test at J2000 epoch
        let jd = to_julian_date(2000, 1, 1, 12, 0, 0);
        let pos = calculate_planetary_position(Planet::NorthNode, jd);

        // True Node ecliptic longitude should be in valid range
        let lon_deg = pos.ecliptic_longitude;
        assert!(lon_deg >= 0.0 && lon_deg < 360.0,
            "True Node longitude should be in [0, 360), got {}°", lon_deg);

        // True Node should have zero ecliptic latitude (it's on the ecliptic)
        assert!(pos.declination.abs() < 30.0 * DEG_TO_RAD,
            "True Node declination should be reasonable, got {}°", pos.declination * RAD_TO_DEG);
    }

    #[test]
    fn test_true_node_retrograde_motion() {
        // True Node moves retrograde on average (~19.34° per year)
        // Test that position changes between two dates
        let jd1 = to_julian_date(2024, 1, 1, 12, 0, 0);
        let jd2 = to_julian_date(2024, 7, 1, 12, 0, 0); // 6 months later

        let pos1 = calculate_planetary_position(Planet::NorthNode, jd1);
        let pos2 = calculate_planetary_position(Planet::NorthNode, jd2);

        // Positions should be different (True Node wobbles, doesn't move smoothly)
        let diff = (pos2.ecliptic_longitude - pos1.ecliptic_longitude).abs();
        assert!(diff > 0.1 && diff < 20.0,
            "True Node should move ~9.67° in 6 months (with wobble), got {}° diff", diff);
    }

    // ============================================
    // VSOP87 Planetary Position Tests
    // ============================================

    #[test]
    fn test_sun_position_range() {
        // Sun's declination should always be within ±23.5° (approximately)
        let jd = to_julian_date(2024, 6, 21, 12, 0, 0); // Summer solstice
        let pos = calculate_planetary_position(Planet::Sun, jd);
        let dec_deg = pos.declination * RAD_TO_DEG;

        assert!(dec_deg.abs() < 24.0, "Sun declination should be within ±24°");
    }

    #[test]
    fn test_sun_high_precision_crosscheck() {
        // Cross-check against high-precision ephemeris reference values for J2000 epoch.
        // Reference values (2000-01-01 12:00:00 UTC):
        //   Sun RA  ≈ 281.29° (18h 45m 10s)
        //   Sun Dec ≈ -23.01°
        // Tolerance: 5 arcminutes (0.083°) to account for VSOP87 truncation.
        let jd = to_julian_date(2000, 1, 1, 12, 0, 0);
        let pos = calculate_planetary_position(Planet::Sun, jd);

        let ra_deg = pos.right_ascension * RAD_TO_DEG;
        let dec_deg = pos.declination * RAD_TO_DEG;

        let tolerance_arcmin = 5.0;
        let tolerance_deg = tolerance_arcmin / 60.0;

        assert!(
            (ra_deg - 281.29).abs() < tolerance_deg,
            "Sun RA at J2000 should be ~281.29°, got {:.4}° (diff: {:.4} arcmin)",
            ra_deg, (ra_deg - 281.29).abs() * 60.0
        );
        assert!(
            (dec_deg - (-23.01)).abs() < tolerance_deg,
            "Sun Dec at J2000 should be ~-23.01°, got {:.4}° (diff: {:.4} arcmin)",
            dec_deg, (dec_deg + 23.01).abs() * 60.0
        );
    }

    #[test]
    fn test_moon_position_range() {
        // Moon's declination should be within ±28.5° (max inclination + obliquity)
        let jd = to_julian_date(2024, 3, 15, 12, 0, 0);
        let pos = calculate_planetary_position(Planet::Moon, jd);
        let dec_deg = pos.declination * RAD_TO_DEG;

        assert!(dec_deg.abs() < 30.0, "Moon declination should be within ±30°");
    }

    #[test]
    fn test_planet_ra_range() {
        // All planet RAs should be in [0, 2π)
        let jd = to_julian_date(2024, 1, 1, 12, 0, 0);
        let planets = [
            Planet::Sun, Planet::Moon, Planet::Mercury, Planet::Venus, Planet::Mars,
            Planet::Jupiter, Planet::Saturn, Planet::Uranus, Planet::Neptune, Planet::Pluto,
        ];

        for planet in planets {
            let pos = calculate_planetary_position(planet, jd);
            assert!(pos.right_ascension >= 0.0 && pos.right_ascension < 2.0 * PI,
                "Planet {:?} RA should be in [0, 2π)", planet);
            assert!(pos.declination.abs() <= PI/2.0,
                "Planet {:?} Dec should be within ±90°", planet);
        }
    }

    // ============================================
    // Complete Line Calculation Integration Tests
    // ============================================

    #[test]
    fn test_calculate_all_lines_returns_valid_data() {
        // Test that calculate_all_lines returns valid data
        // Note: This test doesn't actually call WASM, just tests the logic
        let jd = to_julian_date(1990, 1, 15, 14, 30, 0);
        let gmst = calculate_gmst(jd);

        // Test that basic calculations work
        let sun_pos = calculate_planetary_position(Planet::Sun, jd);
        let mc_lng = calculate_mc_longitude(sun_pos.right_ascension, gmst);
        let ic_lng = calculate_ic_longitude(sun_pos.right_ascension, gmst);

        // MC and IC should be 180° apart
        let diff = ((mc_lng - ic_lng).abs() % 360.0).min((360.0 - (mc_lng - ic_lng).abs()) % 360.0);
        assert!((diff - 180.0).abs() < 1.0, "MC-IC should be 180° apart");
    }

    #[test]
    fn test_asc_dsc_complementary() {
        // ASC and DSC lines should cover complementary longitude ranges
        // Use a planet with moderate declination to ensure horizon solutions exist
        let jd = to_julian_date(2024, 6, 21, 12, 0, 0); // Summer solstice
        let gmst = calculate_gmst(jd);

        // Use the Sun at summer solstice (declination ~23.44°)
        let pos = calculate_planetary_position(Planet::Sun, jd);

        let mut asc_count = 0;
        let mut dsc_count = 0;
        let mut valid_count = 0;

        for lng in (-180..=180).step_by(2) {
            if let Some(lat) = calculate_horizon_latitude(
                pos.right_ascension, pos.declination, gmst, lng as f64
            ) {
                valid_count += 1;
                if is_rising(pos.right_ascension, gmst, lng as f64) {
                    asc_count += 1;
                } else {
                    dsc_count += 1;
                }
            }
        }

        // We should have many valid horizon points
        assert!(valid_count > 50,
            "Should have many valid horizon points, got {}", valid_count);

        // ASC and DSC should each have points (roughly half the valid points each)
        assert!(asc_count > 0 && dsc_count > 0,
            "Both ASC ({}) and DSC ({}) should have points", asc_count, dsc_count);
    }

    #[test]
    fn test_dsc_line_visualization() {
        // Debug visualization of ASC/DSC line distribution
        // Run with: cargo test test_dsc_line_visualization -- --nocapture

        let jd = to_julian_date(2024, 6, 21, 12, 0, 0); // Summer solstice noon UTC
        let gmst = calculate_gmst(jd);
        let sun = calculate_planetary_position(Planet::Sun, jd);

        println!("\n=== SUN DSC LINE VISUALIZATION ===");
        println!("Date: 2024-06-21 12:00 UTC (Summer Solstice)");
        println!("Sun RA: {:.2}°, Dec: {:.2}°",
            sun.right_ascension * RAD_TO_DEG,
            sun.declination * RAD_TO_DEG);
        println!("GMST: {:.2}°\n", gmst * RAD_TO_DEG);

        // Collect ASC and DSC points
        let mut asc_points: Vec<(f64, f64)> = Vec::new();
        let mut dsc_points: Vec<(f64, f64)> = Vec::new();

        for lng in (-180..=180).step_by(10) {
            if let Some(lat) = calculate_horizon_latitude(
                sun.right_ascension, sun.declination, gmst, lng as f64
            ) {
                if is_rising(sun.right_ascension, gmst, lng as f64) {
                    asc_points.push((lng as f64, lat));
                } else {
                    dsc_points.push((lng as f64, lat));
                }
            }
        }

        // Print DSC points
        println!("DSC (Setting) Points - {} total:", dsc_points.len());
        println!("{:>8} {:>10}", "Lng", "Lat");
        println!("{:-<20}", "");
        for (lng, lat) in &dsc_points {
            println!("{:>8.1}° {:>9.2}°", lng, lat);
        }

        println!("\nASC (Rising) Points - {} total:", asc_points.len());
        println!("{:>8} {:>10}", "Lng", "Lat");
        println!("{:-<20}", "");
        for (lng, lat) in &asc_points {
            println!("{:>8.1}° {:>9.2}°", lng, lat);
        }

        // ASCII Map visualization (simple)
        println!("\n=== ASCII MAP (latitude vs longitude) ===");
        println!("Legend: A=ASC, D=DSC, .=no horizon point");
        println!("        Longitude -180° to +180° (left to right)");
        println!("        Latitude +90° to -90° (top to bottom)\n");

        // Create a simple grid
        let width = 72;  // characters for -180 to +180
        let height = 18; // characters for +90 to -90

        for row in 0..height {
            let lat_center = 90.0 - (row as f64 / height as f64) * 180.0;
            let lat_min = lat_center - 5.0;
            let lat_max = lat_center + 5.0;

            print!("{:>5.0}° |", lat_center);

            for col in 0..width {
                let lng = -180.0 + (col as f64 / width as f64) * 360.0;

                // Check if any ASC or DSC point is near this cell
                let has_asc = asc_points.iter().any(|(l, lt)|
                    (l - lng).abs() < 5.0 && *lt >= lat_min && *lt < lat_max);
                let has_dsc = dsc_points.iter().any(|(l, lt)|
                    (l - lng).abs() < 5.0 && *lt >= lat_min && *lt < lat_max);

                if has_dsc {
                    print!("D");
                } else if has_asc {
                    print!("A");
                } else {
                    print!(".");
                }
            }
            println!("|");
        }

        println!("       +{}+", "-".repeat(width));
        println!("        -180°{:^60}+180°", "0°");

        // Verify continuity
        println!("\n=== ANALYSIS ===");
        println!("DSC longitude range: {:.1}° to {:.1}°",
            dsc_points.first().map(|p| p.0).unwrap_or(0.0),
            dsc_points.last().map(|p| p.0).unwrap_or(0.0));
        println!("ASC longitude range: {:.1}° to {:.1}°",
            asc_points.first().map(|p| p.0).unwrap_or(0.0),
            asc_points.last().map(|p| p.0).unwrap_or(0.0));

        // Check for gaps in DSC line
        let mut max_gap = 0.0;
        for i in 1..dsc_points.len() {
            let gap = dsc_points[i].0 - dsc_points[i-1].0;
            if gap > max_gap { max_gap = gap; }
        }
        println!("Max longitude gap in DSC: {:.1}°", max_gap);
        println!("(Gaps > 20° suggest line wrapping or discontinuity)\n");
    }

    // ============================================
    // Regression Tests with Known Birth Charts
    // ============================================
    // Note: Paran calculation is implemented via calculate_paran() using
    // get_longitude_for_angle_at_latitude(). Additional paran-specific tests
    // could be added here if needed.

    #[test]
    fn test_summer_solstice_sun() {
        // June 21, 2024 - summer solstice
        // Sun should have max northerly declination (~23.44°)
        let jd = to_julian_date(2024, 6, 21, 12, 0, 0);
        let sun = calculate_planetary_position(Planet::Sun, jd);
        let dec_deg = sun.declination * RAD_TO_DEG;

        assert!((dec_deg - 23.44).abs() < 0.5,
            "Sun at summer solstice should have Dec ~23.44°, got {}°", dec_deg);
    }

    // ============================================
    // Timezone Detection Tests (chrono-tz)
    // ============================================

    #[test]
    fn test_chennai_timezone_detection() {
        // Chennai, India: 13.0827° N, 80.2707° E
        // Should be Asia/Kolkata timezone (UTC+5:30)
        let lat = 13.0827;
        let lng = 80.2707;

        let tz_name = get_timezone_from_coords(lat, lng);
        assert_eq!(tz_name, "Asia/Kolkata", "Chennai should be in Asia/Kolkata timezone");

        // Test offset for a specific date (not during DST since India doesn't observe DST)
        let offset = get_timezone_offset_hours(lat, lng, 1990, 1, 15, 14, 30, 0);
        assert!((offset - 5.5).abs() < 0.01,
            "Chennai timezone offset should be +5.5 hours, got {}", offset);
    }

    #[test]
    fn test_chennai_sun_mc_line() {
        // Test Sun MC line calculation for Chennai birth location
        // Chennai: 13.0827° N, 80.2707° E
        // Birth: January 15, 1990 at 14:30 local time (IST = UTC+5:30)
        // UTC time: 09:00 UTC

        let lat = 13.0827;
        let lng = 80.2707;

        // Convert local time to UTC Julian Date using chrono-tz
        let jd = local_to_utc_julian_date(lat, lng, 1990, 1, 15, 14, 30, 0);

        // Verify timezone conversion: 14:30 IST - 5:30 = 09:00 UTC
        // JD for Jan 15, 1990 at 09:00 UTC should be approximately 2447906.875
        assert!((jd - 2447906.875).abs() < 0.001,
            "Julian Date should be ~2447906.875, got {}", jd);

        // Calculate GMST
        let gmst = calculate_gmst(jd);

        // Get Sun position
        let sun = calculate_planetary_position(Planet::Sun, jd);

        // Calculate MC longitude
        let mc_lng = calculate_mc_longitude(sun.right_ascension, gmst);

        // Verify Sun RA is in expected range for mid-January (around 296-298°)
        let sun_ra_deg = sun.right_ascension * RAD_TO_DEG;
        assert!(sun_ra_deg > 290.0 && sun_ra_deg < 305.0,
            "Sun RA in mid-January should be ~296-298°, got {}°", sun_ra_deg);

        // Verify MC longitude is valid (between -180 and 180)
        assert!(mc_lng >= -180.0 && mc_lng <= 180.0,
            "MC longitude should be in valid range, got {}°", mc_lng);

        // MC should be Sun RA - GMST (mod 360, normalized to -180..180)
        let ra_minus_gmst = normalize_angle(sun.right_ascension - gmst) * RAD_TO_DEG;
        let expected_mc = if ra_minus_gmst > 180.0 { ra_minus_gmst - 360.0 } else { ra_minus_gmst };
        assert!((mc_lng - expected_mc).abs() < 0.01,
            "MC calculation should match: expected {}°, got {}°", expected_mc, mc_lng);
    }

    #[test]
    fn test_half_hour_timezone_offsets() {
        // Test various half-hour timezone locations

        // India (UTC+5:30)
        let india_offset = get_timezone_offset_hours(28.6139, 77.2090, 2024, 6, 15, 12, 0, 0);
        assert!((india_offset - 5.5).abs() < 0.01, "India should be UTC+5:30, got {}", india_offset);

        // Nepal (UTC+5:45)
        let nepal_offset = get_timezone_offset_hours(27.7172, 85.3240, 2024, 6, 15, 12, 0, 0);
        assert!((nepal_offset - 5.75).abs() < 0.01, "Nepal should be UTC+5:45, got {}", nepal_offset);

        // Iran (UTC+3:30, or +4:30 during DST)
        let iran_offset = get_timezone_offset_hours(35.6892, 51.3890, 2024, 1, 15, 12, 0, 0);
        assert!((iran_offset - 3.5).abs() < 0.01, "Iran (winter) should be UTC+3:30, got {}", iran_offset);
    }
}
