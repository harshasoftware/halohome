//! Scout Location Scoring Algorithm - C2 (Cycle 2)
//!
//! High-precision mathematical model for astrocartography location scoring.
//! Uses spherical geodetic model with Gaussian/exponential distance decay.
//!
//! Key improvements over C1:
//! - Spherical geometry with cross-track distance
//! - Continuous influence field (no cliff edges)
//! - Separated benefit/intensity scoring
//! - Volatility detection for mixed influences
//! - Diminishing returns for multiple influences
//! - Dateline segment splitting for Pacific accuracy
//!
//! Performance optimizations:
//! - Spatial pre-filtering with bounding boxes (3-5x speedup)
//! - Optional Rayon parallelism (requires `parallel` feature + COOP/COEP headers)

use serde::{Deserialize, Serialize};
use wasm_bindgen::prelude::*;

#[cfg(feature = "parallel")]
use rayon::prelude::*;

// ============================================================================
// Constants
// ============================================================================

/// Earth's mean radius in kilometers
const EARTH_RADIUS_KM: f64 = 6371.0;

/// Default maximum influence distance
const DEFAULT_MAX_DISTANCE_KM: f64 = 500.0;

/// Diminishing returns weights for multiple influences
/// 1st influence: 100%, 2nd: 60%, 3rd: 35%, etc.
const DIMINISHING_WEIGHTS: [f64; 7] = [1.0, 0.6, 0.35, 0.2, 0.1, 0.08, 0.05];

// ============================================================================
// Types
// ============================================================================

/// Life categories for scouting
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum LifeCategory {
    Career,
    Love,
    Health,
    Home,
    Wellbeing,
    Wealth,
}

/// Aspect types for planetary aspects
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum AspectType {
    Conjunction,
    Trine,
    Sextile,
    Square,
    Quincunx,
    Opposition,
    Sesquisquare,
}

/// Distance decay kernel type
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum KernelType {
    Linear,
    Gaussian,
    Exponential,
}

/// Sorting mode for city rankings
#[wasm_bindgen]
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum SortMode {
    BenefitFirst,
    IntensityFirst,
    BalancedBenefit,
}

/// Configuration for scoring algorithm
#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScoringConfig {
    pub kernel_type: KernelType,
    pub kernel_parameter: f64,
    pub max_distance_km: f64,
    pub volatility_penalty: f64,
}

#[wasm_bindgen]
impl ScoringConfig {
    /// Create a balanced configuration (recommended default)
    #[wasm_bindgen(constructor)]
    pub fn new() -> Self {
        Self::balanced()
    }

    /// Balanced accuracy vs. computation
    pub fn balanced() -> Self {
        ScoringConfig {
            kernel_type: KernelType::Gaussian,
            kernel_parameter: 180.0, // σ = 180 km
            max_distance_km: 500.0,
            volatility_penalty: 0.3,
        }
    }

    /// Maximum sensitivity to nearby lines
    pub fn high_precision() -> Self {
        ScoringConfig {
            kernel_type: KernelType::Gaussian,
            kernel_parameter: 120.0, // σ = 120 km, faster falloff
            max_distance_km: 600.0,
            volatility_penalty: 0.4,
        }
    }

    /// Broad influence, relaxed boundaries
    pub fn relaxed() -> Self {
        ScoringConfig {
            kernel_type: KernelType::Linear,
            kernel_parameter: 500.0,
            max_distance_km: 500.0,
            volatility_penalty: 0.2,
        }
    }
}

impl Default for ScoringConfig {
    fn default() -> Self {
        Self::balanced()
    }
}

/// A planetary line influence on a location
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Influence {
    pub planet: String,
    pub angle: String,
    pub rating: u8,
    pub aspect: Option<AspectType>,
    pub distance_km: f64,
}

/// Contribution of a single influence to scoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InfluenceContribution {
    pub benefit: f64,
    pub intensity: f64,
    pub volatility: f64,
}

/// Set of influences for a city
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CityInfluenceSet {
    pub city_name: String,
    pub country: String,
    pub latitude: f64,
    pub longitude: f64,
    pub influences: Vec<Influence>,
}

/// Final score for a city
#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CityScore {
    city_name: String,
    country: String,
    latitude: f64,
    longitude: f64,
    benefit_score: f64,
    intensity_score: f64,
    volatility_score: f64,
    mixed_flag: bool,
    influence_count: usize,
    min_distance_km: f64,
}

#[wasm_bindgen]
impl CityScore {
    #[wasm_bindgen(getter)]
    pub fn city_name(&self) -> String {
        self.city_name.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn country(&self) -> String {
        self.country.clone()
    }

    #[wasm_bindgen(getter)]
    pub fn latitude(&self) -> f64 {
        self.latitude
    }

    #[wasm_bindgen(getter)]
    pub fn longitude(&self) -> f64 {
        self.longitude
    }

    #[wasm_bindgen(getter)]
    pub fn benefit_score(&self) -> f64 {
        self.benefit_score
    }

    #[wasm_bindgen(getter)]
    pub fn intensity_score(&self) -> f64 {
        self.intensity_score
    }

    #[wasm_bindgen(getter)]
    pub fn volatility_score(&self) -> f64 {
        self.volatility_score
    }

    #[wasm_bindgen(getter)]
    pub fn mixed_flag(&self) -> bool {
        self.mixed_flag
    }

    #[wasm_bindgen(getter)]
    pub fn influence_count(&self) -> usize {
        self.influence_count
    }

    #[wasm_bindgen(getter)]
    pub fn min_distance_km(&self) -> f64 {
        self.min_distance_km
    }
}

/// Complete ranking result for a city
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CityRanking {
    pub city_name: String,
    pub country: String,
    pub latitude: f64,
    pub longitude: f64,
    pub benefit_score: f64,
    pub intensity_score: f64,
    pub volatility_score: f64,
    pub mixed_flag: bool,
    pub top_influences: Vec<(String, String, f64)>, // (planet, angle, distance_km)
    pub nature: String, // "beneficial" or "challenging"
}

/// Country group sorted by top city's score
/// No ranking score displayed - countries are just ordered for display
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RankedCountry {
    pub country: String,
    pub cities: Vec<CityRanking>,
    /// Number of beneficial cities
    pub beneficial_count: usize,
    /// Number of challenging cities
    pub challenging_count: usize,
}

// ============================================================================
// Geodetic Functions (Spherical Earth Model)
// ============================================================================
//
// Uses spherical Earth approximation with mean radius 6371 km.
// Accuracy: typically within ~0.5% globally compared to WGS84 ellipsoid.
// This is acceptable for city-level scoring (error < 20km at 4000km distances).
// ============================================================================

/// Compute great-circle distance between two points using Haversine formula
/// Input: coordinates in decimal degrees
/// Output: distance in kilometers
pub fn haversine_distance(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    let lat1_rad = lat1.to_radians();
    let lat2_rad = lat2.to_radians();
    let dlat = (lat2 - lat1).to_radians();
    let dlon = (lon2 - lon1).to_radians();

    let a = (dlat / 2.0).sin().powi(2)
        + lat1_rad.cos() * lat2_rad.cos() * (dlon / 2.0).sin().powi(2);
    let c = 2.0 * a.sqrt().atan2((1.0 - a).sqrt());

    EARTH_RADIUS_KM * c
}

// ============================================================================
// Spatial Pre-filtering (Performance Optimization)
// ============================================================================
//
// These functions provide fast rejection of city-line pairs that are clearly
// too far apart, avoiding expensive haversine/cross-track calculations.
// Typical speedup: 3-5x by skipping ~70% of distance calculations.
// ============================================================================

/// Fast equirectangular distance approximation (no trig functions)
/// Accurate within ~1% for distances < 500km at mid-latitudes
/// Used for quick rejection before expensive haversine calculation
#[inline]
pub fn equirectangular_distance_approx(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    // At the midpoint latitude, approximate the distance
    let mid_lat = (lat1 + lat2) / 2.0;
    let cos_lat = mid_lat.to_radians().cos();

    let dx = (lon2 - lon1) * cos_lat;
    let dy = lat2 - lat1;

    // Convert degrees to km (1 degree ≈ 111.32 km at equator)
    111.32 * (dx * dx + dy * dy).sqrt()
}

/// Bounding box for a planetary line with buffer for max influence distance
#[derive(Debug, Clone)]
pub struct LineBoundingBox {
    pub min_lat: f64,
    pub max_lat: f64,
    pub min_lon: f64,
    pub max_lon: f64,
    /// Buffer in degrees (~500km ≈ 4.5°)
    pub buffer_deg: f64,
}

impl LineBoundingBox {
    /// Create bounding box from line points with buffer for influence radius
    pub fn from_points(points: &[(f64, f64)], buffer_km: f64) -> Self {
        if points.is_empty() {
            return Self {
                min_lat: -90.0,
                max_lat: 90.0,
                min_lon: -180.0,
                max_lon: 180.0,
                buffer_deg: 0.0,
            };
        }

        let mut min_lat = f64::INFINITY;
        let mut max_lat = f64::NEG_INFINITY;
        let mut min_lon = f64::INFINITY;
        let mut max_lon = f64::NEG_INFINITY;

        for &(lat, lon) in points {
            min_lat = min_lat.min(lat);
            max_lat = max_lat.max(lat);
            min_lon = min_lon.min(lon);
            max_lon = max_lon.max(lon);
        }

        // Convert buffer from km to degrees (conservative: use equator value)
        // 1 degree ≈ 111.32 km
        let buffer_deg = buffer_km / 111.32;

        Self {
            min_lat,
            max_lat,
            min_lon,
            max_lon,
            buffer_deg,
        }
    }

    /// Fast check if a city could possibly be within influence distance
    /// Returns true if city MIGHT be within range (requires full calculation)
    /// Returns false if city is DEFINITELY out of range (skip calculation)
    #[inline]
    pub fn might_contain(&self, city_lat: f64, city_lon: f64) -> bool {
        // Add buffer to bounding box
        let lat_in_range = city_lat >= (self.min_lat - self.buffer_deg)
            && city_lat <= (self.max_lat + self.buffer_deg);

        if !lat_in_range {
            return false;
        }

        // Handle dateline crossing (min_lon > max_lon)
        let lon_in_range = if self.min_lon > self.max_lon {
            // Line crosses dateline
            city_lon >= (self.min_lon - self.buffer_deg)
                || city_lon <= (self.max_lon + self.buffer_deg)
        } else {
            city_lon >= (self.min_lon - self.buffer_deg)
                && city_lon <= (self.max_lon + self.buffer_deg)
        };

        lon_in_range
    }
}

/// Pre-computed line data with bounding box for fast filtering (internal use)
#[derive(Debug, Clone)]
pub(crate) struct OptimizedLine {
    pub(crate) planet: String,
    pub(crate) angle: String,
    pub(crate) rating: u8,
    pub(crate) aspect: Option<AspectType>,
    pub(crate) points: Vec<(f64, f64)>,
    pub(crate) bbox: LineBoundingBox,
}

impl OptimizedLine {
    /// Create from LineData (internal use only)
    pub(crate) fn from_line_data(line: &LineData, max_distance_km: f64) -> Self {
        Self {
            planet: line.planet.clone(),
            angle: line.angle.clone(),
            rating: line.rating,
            aspect: line.aspect,
            points: line.points.clone(),
            bbox: LineBoundingBox::from_points(&line.points, max_distance_km),
        }
    }
}

/// Compute cross-track distance from a point to a great-circle path
/// Returns (cross_track_distance, along_track_distance) in kilometers
pub fn cross_track_distance(
    lat_pt: f64,
    lon_pt: f64,
    lat1: f64,
    lon1: f64,
    lat2: f64,
    lon2: f64,
) -> (f64, f64) {
    let lat_pt_rad = lat_pt.to_radians();
    let lon_pt_rad = lon_pt.to_radians();
    let lat1_rad = lat1.to_radians();
    let lon1_rad = lon1.to_radians();
    let lat2_rad = lat2.to_radians();
    let lon2_rad = lon2.to_radians();

    // Distance from point to start (angular)
    let d13 = haversine_distance(lat_pt, lon_pt, lat1, lon1) / EARTH_RADIUS_KM;

    // Initial bearing from start to point
    let y13 = (lon_pt_rad - lon1_rad).sin() * lat_pt_rad.cos();
    let x13 = lat1_rad.cos() * lat_pt_rad.sin()
        - lat1_rad.sin() * lat_pt_rad.cos() * (lon_pt_rad - lon1_rad).cos();
    let bearing_13 = y13.atan2(x13);

    // Bearing from start to end
    let y12 = (lon2_rad - lon1_rad).sin() * lat2_rad.cos();
    let x12 = lat1_rad.cos() * lat2_rad.sin()
        - lat1_rad.sin() * lat2_rad.cos() * (lon2_rad - lon1_rad).cos();
    let bearing_12 = y12.atan2(x12);

    // Cross-track distance (angular)
    // δxt = asin(sin(δ13) * sin(θ13 - θ12))
    let dxt_raw = d13.sin() * (bearing_13 - bearing_12).sin();
    let dxt = dxt_raw.clamp(-1.0, 1.0).asin(); // clamp for numerical safety
    let cross_track = dxt.abs() * EARTH_RADIUS_KM;

    // Along-track distance (signed for proper endpoint clamping)
    // δat = acos(cos(δ13) / cos(δxt))
    // Sign from cos(θ13 - θ12): negative means point is "before" segment start
    //
    // Guard: clamp denominator away from 0 before division to avoid Infinity.
    // cos(δxt) ≈ 0 means cross-track ≈ 90° (point ~10,000km from line) - extreme case
    // that won't occur with our 500km influence radius, but guard ensures robustness.
    const EPSILON: f64 = 1e-10;
    let cos_dxt = dxt.cos();
    let safe_denom = if cos_dxt.abs() < EPSILON {
        if cos_dxt >= 0.0 { EPSILON } else { -EPSILON }
    } else {
        cos_dxt
    };
    let cos_d13_over_cos_xt = (d13.cos() / safe_denom).clamp(-1.0, 1.0);
    let dat_abs = cos_d13_over_cos_xt.acos();
    let sign = if (bearing_13 - bearing_12).cos() >= 0.0 { 1.0 } else { -1.0 };
    let along_track = if dat_abs.is_nan() { 0.0 } else { sign * dat_abs * EARTH_RADIUS_KM };

    (cross_track, along_track)
}

/// Find minimum distance from a point to a line segment
/// Handles boundary constraints (point must project onto segment)
/// Splits dateline-crossing segments at ±180° for accurate Pacific distances
pub fn distance_to_line_segment(
    lat_pt: f64,
    lon_pt: f64,
    lat1: f64,
    lon1: f64,
    lat2: f64,
    lon2: f64,
) -> f64 {
    // Handle dateline crossing by splitting the segment
    // Use unwrapped longitude difference to detect actual crossing
    if (lon2 - lon1).abs() > 180.0 {
        // Interpolate the crossing using proper unwrapping
        let (cross_lat, cross_lon1) = interpolate_dateline_crossing(lat1, lon1, lat2, lon2);
        // The opposite meridian for the second segment
        let cross_lon2 = if cross_lon1 == 180.0 { -180.0 } else { 180.0 };

        // Distance to first sub-segment: [start → crossing]
        let dist1 = distance_to_line_segment_internal(lat_pt, lon_pt, lat1, lon1, cross_lat, cross_lon1);
        // Distance to second sub-segment: [crossing → end]
        let dist2 = distance_to_line_segment_internal(lat_pt, lon_pt, cross_lat, cross_lon2, lat2, lon2);

        return dist1.min(dist2);
    }

    distance_to_line_segment_internal(lat_pt, lon_pt, lat1, lon1, lat2, lon2)
}

/// Unwrap longitude to be continuous with a reference longitude
/// Ensures Δλ ∈ [-180, 180] for proper segment handling
fn unwrap_longitude(lon: f64, ref_lon: f64) -> f64 {
    let mut delta = lon - ref_lon;
    while delta > 180.0 { delta -= 360.0; }
    while delta < -180.0 { delta += 360.0; }
    ref_lon + delta
}

/// Interpolate the latitude where a segment crosses the dateline (±180°)
/// Uses proper longitude unwrapping to determine correct crossing direction
fn interpolate_dateline_crossing(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> (f64, f64) {
    // Unwrap lon2 to be continuous with lon1
    let lon2_unwrapped = unwrap_longitude(lon2, lon1);

    // Determine which meridian we're crossing based on unwrapped direction
    // If going eastward past +180, we cross +180
    // If going westward past -180, we cross -180
    let crossing_lon = if lon2_unwrapped > lon1 { 180.0 } else { -180.0 };

    // Linear interpolation of latitude at the crossing longitude
    let t = (crossing_lon - lon1) / (lon2_unwrapped - lon1);
    (lat1 + t * (lat2 - lat1), crossing_lon)
}

/// Internal implementation without dateline handling
fn distance_to_line_segment_internal(
    lat_pt: f64,
    lon_pt: f64,
    lat1: f64,
    lon1: f64,
    lat2: f64,
    lon2: f64,
) -> f64 {
    let (cross_dist, along_dist) = cross_track_distance(lat_pt, lon_pt, lat1, lon1, lat2, lon2);
    let segment_length = haversine_distance(lat1, lon1, lat2, lon2);

    // If projection falls outside segment, return distance to nearest endpoint
    if along_dist < 0.0 {
        haversine_distance(lat_pt, lon_pt, lat1, lon1)
    } else if along_dist > segment_length {
        haversine_distance(lat_pt, lon_pt, lat2, lon2)
    } else {
        cross_dist
    }
}

/// Calculate minimum distance from a city to a polyline (planetary line)
pub fn distance_to_polyline(city_lat: f64, city_lon: f64, line_points: &[(f64, f64)]) -> f64 {
    if line_points.is_empty() {
        return f64::INFINITY;
    }
    if line_points.len() == 1 {
        return haversine_distance(city_lat, city_lon, line_points[0].0, line_points[0].1);
    }

    let mut min_distance = f64::INFINITY;
    for i in 0..line_points.len() - 1 {
        let (lat1, lon1) = line_points[i];
        let (lat2, lon2) = line_points[i + 1];
        let dist = distance_to_line_segment(city_lat, city_lon, lat1, lon1, lat2, lon2);
        if dist < min_distance {
            min_distance = dist;
        }
    }
    min_distance
}

// ============================================================================
// Distance Decay Kernels
// ============================================================================

/// Linear distance decay: intensity falls linearly from 1.0 at distance 0 to 0 at max_distance
pub fn linear_kernel(distance_km: f64, bandwidth_km: f64) -> f64 {
    (1.0 - distance_km / bandwidth_km).max(0.0)
}

/// Gaussian (RBF) distance decay: smooth bell curve
/// σ ≈ 150-250 km gives reasonable astrocartography falloff
pub fn gaussian_kernel(distance_km: f64, sigma_km: f64) -> f64 {
    (-0.5 * (distance_km / sigma_km).powi(2)).exp()
}

/// Exponential kernel: intermediate between linear and gaussian
pub fn exponential_kernel(distance_km: f64, lambda_km: f64) -> f64 {
    (-distance_km / lambda_km).exp()
}

/// Apply the appropriate kernel based on config
pub fn apply_kernel(distance_km: f64, config: &ScoringConfig) -> f64 {
    match config.kernel_type {
        KernelType::Linear => linear_kernel(distance_km, config.kernel_parameter),
        KernelType::Gaussian => gaussian_kernel(distance_km, config.kernel_parameter),
        KernelType::Exponential => exponential_kernel(distance_km, config.kernel_parameter),
    }
}

// ============================================================================
// Rating and Aspect Handling
// ============================================================================

/// Convert 1-5 rating to signed benefit score
/// Rating 5 → +2.0, Rating 4 → +1.0, Rating 3 → 0.0, Rating 2 → -1.0, Rating 1 → -2.0
pub fn rating_to_benefit(rating: u8) -> f64 {
    (rating as f64) - 3.0
}

/// Convert rating to intensity (absolute impact)
pub fn rating_to_intensity(rating: u8) -> f64 {
    ((rating as f64) - 3.0).abs()
}

/// Benefit multiplier for aspects
/// Positive = supportive, Negative = challenging
pub fn aspect_benefit_multiplier(aspect: AspectType) -> f64 {
    match aspect {
        AspectType::Conjunction => 1.0,
        AspectType::Trine => 0.7,
        AspectType::Sextile => 0.7,
        AspectType::Square => -0.6,
        AspectType::Quincunx => 0.3,
        AspectType::Opposition => -0.5,
        AspectType::Sesquisquare => -0.4,
    }
}

/// Intensity multiplier for aspects
pub fn aspect_intensity_multiplier(aspect: AspectType) -> f64 {
    match aspect {
        AspectType::Conjunction => 1.0,
        AspectType::Trine => 0.6,
        AspectType::Sextile => 0.6,
        AspectType::Square => 0.85,
        AspectType::Quincunx => 0.4,
        AspectType::Opposition => 0.8,
        AspectType::Sesquisquare => 0.7,
    }
}

// ============================================================================
// Influence Scoring
// ============================================================================

/// Calculate the contribution of a single influence
pub fn calculate_influence_contribution(
    influence: &Influence,
    config: &ScoringConfig,
) -> InfluenceContribution {
    // Step 1: Compute distance decay
    let kernel = apply_kernel(influence.distance_km, config);

    // Step 2: Convert rating to benefit and intensity
    let base_benefit = rating_to_benefit(influence.rating);
    let base_intensity = rating_to_intensity(influence.rating);

    // Step 3: Apply aspect multiplier if present
    let (benefit_mult, intensity_mult) = match influence.aspect {
        Some(aspect) => (
            aspect_benefit_multiplier(aspect),
            aspect_intensity_multiplier(aspect),
        ),
        None => (1.0, 1.0),
    };

    // Step 4: Combine
    let benefit = base_benefit * benefit_mult * kernel;
    let intensity = base_intensity * intensity_mult * kernel;

    // Step 5: Volatility detection (if aspect flips the sign in either direction)
    // A negative aspect multiplier flips the sign of any non-zero base_benefit:
    // - Positive→negative: beneficial line made challenging by aspect (e.g., Sun:MC with square)
    // - Negative→positive: challenging line made beneficial by aspect (e.g., Saturn:MC with square)
    // Both represent aspect-induced instability worth flagging
    let volatility = if benefit_mult < 0.0 && base_benefit != 0.0 {
        base_benefit.abs() * kernel
    } else {
        0.0
    };

    InfluenceContribution {
        benefit,
        intensity,
        volatility,
    }
}

// ============================================================================
// City-Level Scoring
// ============================================================================

/// Calculate scores for a city with all its influences
pub fn calculate_city_score(city: &CityInfluenceSet, config: &ScoringConfig) -> CityScore {
    if city.influences.is_empty() {
        return CityScore {
            city_name: city.city_name.clone(),
            country: city.country.clone(),
            latitude: city.latitude,
            longitude: city.longitude,
            benefit_score: 50.0,
            intensity_score: 0.0,
            volatility_score: 0.0,
            mixed_flag: false,
            influence_count: 0,
            min_distance_km: f64::INFINITY,
        };
    }

    // Compute contributions for all influences
    let mut contributions: Vec<(InfluenceContribution, f64)> = city
        .influences
        .iter()
        .map(|inf| (calculate_influence_contribution(inf, config), inf.distance_km))
        .collect();

    // Sort by absolute benefit descending
    contributions.sort_by(|a, b| {
        b.0.benefit
            .abs()
            .partial_cmp(&a.0.benefit.abs())
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    // ========================================================================
    // PROVABLY BOUNDED SCORING
    // ========================================================================
    // Cap to top K influences where K = DIMINISHING_WEIGHTS.len() = 7
    // This ensures weight sum W = 1.0 + 0.6 + 0.35 + 0.2 + 0.1 + 0.08 + 0.05 = 2.38
    // is truly bounded (no unbounded tail from the old `unwrap_or(&0.05)`).
    // ========================================================================
    let k = DIMINISHING_WEIGHTS.len();

    // Apply diminishing returns with bounded cap
    let benefit_score_raw: f64 = contributions
        .iter()
        .take(k)
        .enumerate()
        .map(|(i, (contrib, _))| contrib.benefit * DIMINISHING_WEIGHTS[i])
        .sum();

    let intensity_score_raw: f64 = contributions
        .iter()
        .take(k)
        .enumerate()
        .map(|(i, (contrib, _))| contrib.intensity * DIMINISHING_WEIGHTS[i])
        .sum();

    // Detect mixed/volatile conditions using weighted sums (same weights as benefit/intensity)
    let weighted_positive: f64 = contributions
        .iter()
        .take(k)
        .enumerate()
        .map(|(i, (c, _))| c.benefit.max(0.0) * DIMINISHING_WEIGHTS[i])
        .sum();
    let weighted_negative: f64 = contributions
        .iter()
        .take(k)
        .enumerate()
        .map(|(i, (c, _))| (-c.benefit).max(0.0) * DIMINISHING_WEIGHTS[i])
        .sum();
    let volatility_raw = (weighted_positive * weighted_negative).sqrt();
    let mixed_flag = weighted_positive > 0.5 && weighted_negative > 0.5;

    // ========================================================================
    // PROVABLY BOUNDED SCORE NORMALIZATION
    // ========================================================================
    //
    // Mathematical bounds derivation:
    //
    // 1. DIMINISHING_WEIGHTS = [1.0, 0.6, 0.35, 0.2, 0.1, 0.08, 0.05]
    //    Sum W = 2.38 exactly (capped at K=7 influences, no unbounded tail)
    //
    // 2. Per-influence contribution bounds:
    //    - benefit = baseBenefit * aspectMult * kernel
    //    - baseBenefit ∈ [-2, +2] (rating 1-5 mapped to -2 to +2)
    //    - aspectMult ∈ [-1, +1] (most aspects)
    //    - kernel ∈ [0, 1]
    //    - Max |benefit| per influence ≤ 2
    //
    // 3. benefit_score_raw = Σ (benefit_i * weight_i) for i ∈ [0, K)
    //    Max |benefit_score_raw| ≤ 2 * W = 2 * 2.38 = 4.76
    //
    // 4. Score mapping (provably bounded):
    //    benefit_score = 50 + benefit_score_raw * 10.5
    //    Since |benefit_score_raw| ≤ 4.76:
    //      min = 50 - 4.76 * 10.5 = 50 - 50 = 0
    //      max = 50 + 4.76 * 10.5 = 50 + 50 = 100
    //    This guarantees benefit_score ∈ [0, 100]
    //
    // 5. Intensity has same bound: intensity_score_raw ≤ 2W = 4.76
    //    intensity_score = intensity_score_raw * 21.0, clamped to [0, 100]
    //
    // 6. Volatility uses WEIGHTED sums that PARTITION the same influences:
    //    weightedP + weightedN ≤ 2W (each influence contributes to P xor N)
    //    Product P·N is maximized when P = N = W = 2.38
    //    volatility_raw = sqrt(P * N) ≤ sqrt(W * W) = W = 2.38
    //    volatility_score = 100 * (volatility_raw / 2.38) = volatility_raw * 42.0
    // ========================================================================
    let benefit_score = (50.0 + benefit_score_raw * 10.5).clamp(0.0, 100.0);
    let intensity_score = (intensity_score_raw * 21.0).clamp(0.0, 100.0);
    let volatility_score = (volatility_raw * 42.0).clamp(0.0, 100.0);

    // Find minimum distance
    let min_distance = contributions
        .iter()
        .map(|(_, d)| *d)
        .fold(f64::INFINITY, f64::min);

    CityScore {
        city_name: city.city_name.clone(),
        country: city.country.clone(),
        latitude: city.latitude,
        longitude: city.longitude,
        benefit_score,
        intensity_score,
        volatility_score,
        mixed_flag,
        influence_count: city.influences.len(),
        min_distance_km: min_distance,
    }
}

// ============================================================================
// Category-Specific Filtering
// ============================================================================

/// Check if a line is beneficial for a category
pub fn is_beneficial_for_category(planet: &str, angle: &str, category: LifeCategory) -> bool {
    match category {
        LifeCategory::Career => matches!(
            (planet, angle),
            ("Sun", "MC")
                | ("Jupiter", "MC")
                | ("Mercury", "MC")
                | ("Venus", "MC")
                | ("Mars", "MC")
                | ("Saturn", "MC")
                | ("Pluto", "MC")
                | ("Sun", "ASC")
                | ("Mars", "ASC")
                | ("Jupiter", "ASC")
                | ("Mercury", "ASC")
        ),
        LifeCategory::Love => matches!(
            (planet, angle),
            ("Venus", "DSC")
                | ("Sun", "DSC")
                | ("Jupiter", "DSC")
                | ("Moon", "DSC")
                | ("Venus", "ASC")
                | ("Sun", "ASC")
                | ("Mars", "ASC")
                | ("Jupiter", "ASC")
        ),
        LifeCategory::Health => matches!(
            (planet, angle),
            ("Sun", "ASC")
                | ("Jupiter", "ASC")
                | ("Moon", "ASC")
                | ("Mars", "ASC")
                | ("Venus", "IC")
                | ("Jupiter", "MC")
                | ("Venus", "MC")
                | ("Sun", "IC")
                | ("Moon", "IC")
        ),
        LifeCategory::Home => matches!(
            (planet, angle),
            ("Venus", "IC")
                | ("Moon", "IC")
                | ("Jupiter", "IC")
                | ("Sun", "IC")
                | ("Saturn", "IC")
                | ("Venus", "ASC")
                | ("Moon", "ASC")
                | ("Jupiter", "ASC")
                | ("Mercury", "IC")
        ),
        LifeCategory::Wellbeing => matches!(
            (planet, angle),
            ("Venus", "ASC")
                | ("Venus", "IC")
                | ("Venus", "DSC")
                | ("Jupiter", "ASC")
                | ("Jupiter", "MC")
                | ("Jupiter", "IC")
                | ("Jupiter", "DSC")
                | ("Moon", "IC")
                | ("Moon", "ASC")
                | ("Sun", "ASC")
                | ("Sun", "IC")
                | ("Neptune", "ASC")
        ),
        LifeCategory::Wealth => matches!(
            (planet, angle),
            ("Jupiter", "MC")
                | ("Jupiter", "IC")
                | ("Jupiter", "ASC")
                | ("Jupiter", "DSC")
                | ("Venus", "MC")
                | ("Venus", "ASC")
                | ("Sun", "MC")
                | ("Sun", "ASC")
                | ("Mercury", "MC")
                | ("Mercury", "ASC")
                | ("Pluto", "MC")
        ),
    }
}

/// Check if a line is challenging for a category
pub fn is_challenging_for_category(planet: &str, angle: &str, category: LifeCategory) -> bool {
    match category {
        // Note: Pluto:MC is intentionally NOT here - it's intense but beneficial for career power
        LifeCategory::Career => matches!(
            (planet, angle),
            ("Neptune", "MC") | ("Uranus", "MC") | ("Moon", "MC")
        ),
        LifeCategory::Love => matches!(
            (planet, angle),
            ("Saturn", "DSC")
                | ("Pluto", "DSC")
                | ("Mars", "DSC")
                | ("Uranus", "DSC")
                | ("Neptune", "DSC")
        ),
        LifeCategory::Health => matches!(
            (planet, angle),
            ("Saturn", "ASC")
                | ("Saturn", "MC")
                | ("Neptune", "ASC")
                | ("Pluto", "ASC")
                | ("Uranus", "ASC")
        ),
        LifeCategory::Home => matches!(
            (planet, angle),
            ("Uranus", "IC")
                | ("Neptune", "IC")
                | ("Pluto", "IC")
                | ("Saturn", "IC")
                | ("Mars", "IC")
        ),
        LifeCategory::Wellbeing => matches!(
            (planet, angle),
            ("Saturn", "ASC")
                | ("Saturn", "MC")
                | ("Neptune", "MC")
                | ("Pluto", "ASC")
                | ("Pluto", "MC")
                | ("Mars", "ASC")
        ),
        LifeCategory::Wealth => matches!(
            (planet, angle),
            ("Neptune", "MC")
                | ("Neptune", "IC")
                | ("Uranus", "MC")
                | ("Uranus", "IC")
                | ("Saturn", "ASC")
        ),
    }
}

/// Determine the nature of a line for a category
pub fn get_line_nature(planet: &str, angle: &str, category: LifeCategory) -> Option<&'static str> {
    if is_beneficial_for_category(planet, angle, category) {
        Some("beneficial")
    } else if is_challenging_for_category(planet, angle, category) {
        Some("challenging")
    } else {
        None
    }
}

/// Filter influences to only those relevant to a category
pub fn filter_influences_by_category(
    influences: &[Influence],
    category: LifeCategory,
) -> Vec<Influence> {
    influences
        .iter()
        .filter(|inf| {
            is_beneficial_for_category(&inf.planet, &inf.angle, category)
                || is_challenging_for_category(&inf.planet, &inf.angle, category)
        })
        .cloned()
        .collect()
}

// ============================================================================
// City Ranking
// ============================================================================

/// Rank cities for a given category
pub fn rank_cities_by_category(
    cities: &[CityInfluenceSet],
    category: LifeCategory,
    config: &ScoringConfig,
    sort_mode: SortMode,
) -> Vec<CityRanking> {
    let mut rankings: Vec<CityRanking> = cities
        .iter()
        .filter_map(|city| {
            let filtered_influences = filter_influences_by_category(&city.influences, category);
            if filtered_influences.is_empty() {
                return None;
            }

            let filtered_city = CityInfluenceSet {
                city_name: city.city_name.clone(),
                country: city.country.clone(),
                latitude: city.latitude,
                longitude: city.longitude,
                influences: filtered_influences.clone(),
            };

            let score = calculate_city_score(&filtered_city, config);

            // Determine overall nature from aggregated benefit (not counts)
            // This correctly accounts for aspect polarity flipping beneficial lines to challenging
            // benefit_score is centered at 50: >50 = beneficial, <50 = challenging
            let nature = if score.mixed_flag {
                "mixed"
            } else if score.benefit_score > 52.0 {
                "beneficial"
            } else if score.benefit_score < 48.0 {
                "challenging"
            } else {
                "mixed"
            };

            let top_influences: Vec<(String, String, f64)> = filtered_influences
                .iter()
                .take(3)
                .map(|inf| (inf.planet.clone(), inf.angle.clone(), inf.distance_km))
                .collect();

            Some(CityRanking {
                city_name: score.city_name,
                country: score.country,
                latitude: score.latitude,
                longitude: score.longitude,
                benefit_score: score.benefit_score,
                intensity_score: score.intensity_score,
                volatility_score: score.volatility_score,
                mixed_flag: score.mixed_flag,
                top_influences,
                nature: nature.to_string(),
            })
        })
        .collect();

    // Sort based on mode
    match sort_mode {
        SortMode::BenefitFirst => {
            rankings.sort_by(|a, b| {
                b.benefit_score
                    .partial_cmp(&a.benefit_score)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
        }
        SortMode::IntensityFirst => {
            rankings.sort_by(|a, b| {
                b.intensity_score
                    .partial_cmp(&a.intensity_score)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
        }
        SortMode::BalancedBenefit => {
            rankings.sort_by(|a, b| {
                let a_adj = a.benefit_score - a.volatility_score * config.volatility_penalty;
                let b_adj = b.benefit_score - b.volatility_score * config.volatility_penalty;
                b_adj
                    .partial_cmp(&a_adj)
                    .unwrap_or(std::cmp::Ordering::Equal)
            });
        }
    }

    rankings
}

// ============================================================================
// WASM Bindings
// ============================================================================

/// Scout a single city for all influences from planetary lines
#[wasm_bindgen]
pub fn scout_city(
    city_name: &str,
    country: &str,
    city_lat: f64,
    city_lon: f64,
    lines_json: JsValue,
    config_json: JsValue,
) -> Result<JsValue, JsValue> {
    let lines: Vec<LineData> = serde_wasm_bindgen::from_value(lines_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse lines: {}", e)))?;

    let config: ScoringConfig = serde_wasm_bindgen::from_value(config_json)
        .unwrap_or_else(|_| ScoringConfig::balanced());

    let mut influences = Vec::new();

    for line in &lines {
        let distance = distance_to_polyline(city_lat, city_lon, &line.points);
        if distance <= config.max_distance_km {
            influences.push(Influence {
                planet: line.planet.clone(),
                angle: line.angle.clone(),
                rating: line.rating,
                aspect: line.aspect,
                distance_km: distance,
            });
        }
    }

    let city_set = CityInfluenceSet {
        city_name: city_name.to_string(),
        country: country.to_string(),
        latitude: city_lat,
        longitude: city_lon,
        influences,
    };

    let score = calculate_city_score(&city_set, &config);

    serde_wasm_bindgen::to_value(&score)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Scout multiple cities and rank them for a category
#[wasm_bindgen]
pub fn scout_cities_for_category(
    cities_json: JsValue,
    lines_json: JsValue,
    category: LifeCategory,
    sort_mode: SortMode,
    config_json: JsValue,
) -> Result<JsValue, JsValue> {
    let cities: Vec<CityData> = serde_wasm_bindgen::from_value(cities_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse cities: {}", e)))?;

    let lines: Vec<LineData> = serde_wasm_bindgen::from_value(lines_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse lines: {}", e)))?;

    let config: ScoringConfig = serde_wasm_bindgen::from_value(config_json)
        .unwrap_or_else(|_| ScoringConfig::balanced());

    // Pre-compute optimized lines with bounding boxes for fast spatial filtering
    let optimized_lines: Vec<OptimizedLine> = lines
        .iter()
        .map(|l| OptimizedLine::from_line_data(l, config.max_distance_km))
        .collect();

    // Build influence sets for all cities with spatial pre-filtering
    let city_influence_sets: Vec<CityInfluenceSet> = cities
        .iter()
        .map(|city| {
            let mut influences = Vec::new();

            for line in &optimized_lines {
                // Fast bounding box rejection - skip expensive distance calc if city is far from line
                if !line.bbox.might_contain(city.lat, city.lon) {
                    continue;
                }

                // City might be within influence range - do full distance calculation
                let distance = distance_to_polyline(city.lat, city.lon, &line.points);
                if distance <= config.max_distance_km {
                    influences.push(Influence {
                        planet: line.planet.clone(),
                        angle: line.angle.clone(),
                        rating: line.rating,
                        aspect: line.aspect,
                        distance_km: distance,
                    });
                }
            }

            CityInfluenceSet {
                city_name: city.name.clone(),
                country: city.country.clone(),
                latitude: city.lat,
                longitude: city.lon,
                influences,
            }
        })
        .collect();

    let rankings = rank_cities_by_category(&city_influence_sets, category, &config, sort_mode);

    serde_wasm_bindgen::to_value(&rankings)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Group city rankings by country, sorted by top city's score
///
/// Countries are ordered by the highest scoring city in each country.
/// Cities within each country are sorted by benefit_score (highest first).
/// No ranking score is displayed - countries are just ordered for display.
pub fn group_and_rank_countries(city_rankings: Vec<CityRanking>) -> Vec<RankedCountry> {
    use std::collections::HashMap;

    if city_rankings.is_empty() {
        return Vec::new();
    }

    // Group cities by country
    let mut country_map: HashMap<String, Vec<CityRanking>> = HashMap::new();
    for city in city_rankings {
        country_map
            .entry(city.country.clone())
            .or_default()
            .push(city);
    }

    // Build country groups with cities sorted by score
    let mut ranked_countries: Vec<RankedCountry> = country_map
        .into_iter()
        .map(|(country, mut cities)| {
            // Sort cities by benefit score (highest first)
            cities.sort_by(|a, b| b.benefit_score.partial_cmp(&a.benefit_score).unwrap_or(std::cmp::Ordering::Equal));

            // Count beneficial vs challenging
            let beneficial_count = cities.iter().filter(|c| c.nature == "beneficial").count();
            let challenging_count = cities.iter().filter(|c| c.nature == "challenging").count();

            RankedCountry {
                country,
                cities,
                beneficial_count,
                challenging_count,
            }
        })
        .collect();

    // Sort countries by their top city's score
    ranked_countries.sort_by(|a, b| {
        let a_top = a.cities.first().map(|c| c.benefit_score).unwrap_or(0.0);
        let b_top = b.cities.first().map(|c| c.benefit_score).unwrap_or(0.0);
        b_top.partial_cmp(&a_top).unwrap_or(std::cmp::Ordering::Equal)
    });

    ranked_countries
}

/// WASM wrapper: Group city rankings by country and compute normalized country scores
#[wasm_bindgen]
pub fn rank_countries_from_cities(rankings_json: JsValue) -> Result<JsValue, JsValue> {
    let rankings: Vec<CityRanking> = serde_wasm_bindgen::from_value(rankings_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse rankings: {}", e)))?;

    let ranked_countries = group_and_rank_countries(rankings);

    serde_wasm_bindgen::to_value(&ranked_countries)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Scout multiple cities with progress callback
///
/// The progress_callback is called with (percent: u32, phase: &str, detail: &str)
/// Phases: "initializing", "computing", "aggregating"
#[wasm_bindgen]
pub fn scout_cities_for_category_with_progress(
    cities_json: JsValue,
    lines_json: JsValue,
    category: LifeCategory,
    sort_mode: SortMode,
    config_json: JsValue,
    progress_callback: &js_sys::Function,
) -> Result<JsValue, JsValue> {
    let cities: Vec<CityData> = serde_wasm_bindgen::from_value(cities_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse cities: {}", e)))?;

    let lines: Vec<LineData> = serde_wasm_bindgen::from_value(lines_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse lines: {}", e)))?;

    let config: ScoringConfig = serde_wasm_bindgen::from_value(config_json)
        .unwrap_or_else(|_| ScoringConfig::balanced());

    let total_cities = cities.len();
    let progress_interval = (total_cities / 20).max(1); // Report every 5%

    // Helper to call the progress callback
    let report_progress = |percent: u32, phase: &str, detail: &str| {
        let _ = progress_callback.call3(
            &JsValue::NULL,
            &JsValue::from(percent),
            &JsValue::from_str(phase),
            &JsValue::from_str(detail),
        );
    };

    report_progress(5, "initializing", "Preparing data...");

    // Pre-compute optimized lines with bounding boxes for fast spatial filtering
    // This is a one-time O(lines) cost that saves O(cities * lines) expensive calculations
    let optimized_lines: Vec<OptimizedLine> = lines
        .iter()
        .map(|l| OptimizedLine::from_line_data(l, config.max_distance_km))
        .collect();

    report_progress(8, "initializing", "Spatial index ready...");

    // Build influence sets for all cities with progress reporting
    let mut city_influence_sets: Vec<CityInfluenceSet> = Vec::with_capacity(total_cities);
    let mut bbox_skipped = 0u64;
    let mut bbox_checked = 0u64;

    for (i, city) in cities.iter().enumerate() {
        let mut influences = Vec::new();

        for line in &optimized_lines {
            bbox_checked += 1;

            // Fast bounding box rejection - skip expensive distance calc if city is far from line
            if !line.bbox.might_contain(city.lat, city.lon) {
                bbox_skipped += 1;
                continue;
            }

            // City might be within influence range - do full distance calculation
            let distance = distance_to_polyline(city.lat, city.lon, &line.points);
            if distance <= config.max_distance_km {
                influences.push(Influence {
                    planet: line.planet.clone(),
                    angle: line.angle.clone(),
                    rating: line.rating,
                    aspect: line.aspect,
                    distance_km: distance,
                });
            }
        }

        city_influence_sets.push(CityInfluenceSet {
            city_name: city.name.clone(),
            country: city.country.clone(),
            latitude: city.lat,
            longitude: city.lon,
            influences,
        });

        // Report progress every 5% of cities (10% to 80% range)
        if i > 0 && i % progress_interval == 0 {
            let percent = 10 + ((i as u32 * 70) / total_cities as u32);
            let city_percent = (i * 100) / total_cities;
            report_progress(
                percent.min(80),
                "computing",
                &format!("Analyzing cities... ({}%)", city_percent),
            );
        }
    }

    // Spatial filtering stats (bbox_skipped/bbox_checked) available for debugging
    // Typically skips 60-80% of expensive distance calculations
    let _ = (bbox_skipped, bbox_checked); // Suppress unused warnings

    report_progress(85, "aggregating", "Ranking locations...");

    let rankings = rank_cities_by_category(&city_influence_sets, category, &config, sort_mode);

    report_progress(95, "aggregating", "Finalizing...");

    serde_wasm_bindgen::to_value(&rankings)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Calculate distance from a city to a planetary line
#[wasm_bindgen]
pub fn calculate_line_distance(
    city_lat: f64,
    city_lon: f64,
    line_points_json: JsValue,
) -> Result<f64, JsValue> {
    let points: Vec<(f64, f64)> = serde_wasm_bindgen::from_value(line_points_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse points: {}", e)))?;

    Ok(distance_to_polyline(city_lat, city_lon, &points))
}

/// Apply distance kernel to get influence strength
#[wasm_bindgen]
pub fn get_influence_strength(
    distance_km: f64,
    kernel_type: KernelType,
    kernel_param: f64,
) -> f64 {
    let config = ScoringConfig {
        kernel_type,
        kernel_parameter: kernel_param,
        max_distance_km: DEFAULT_MAX_DISTANCE_KM,
        volatility_penalty: 0.3,
    };
    apply_kernel(distance_km, &config)
}

// ============================================================================
// Helper Types for WASM
// ============================================================================

#[derive(Debug, Clone, Serialize, Deserialize)]
struct CityData {
    name: String,
    country: String,
    lat: f64,
    lon: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub(crate) struct LineData {
    pub(crate) planet: String,
    pub(crate) angle: String,
    pub(crate) rating: u8,
    pub(crate) aspect: Option<AspectType>,
    pub(crate) points: Vec<(f64, f64)>,
}

// ============================================================================
// Parallel Processing (requires `parallel` feature + COOP/COEP headers)
// ============================================================================
//
// To enable parallel processing in WASM:
// 1. Build with: wasm-pack build --target web --features parallel
// 2. Set HTTP headers on your server:
//    - Cross-Origin-Opener-Policy: same-origin
//    - Cross-Origin-Embedder-Policy: require-corp
// 3. Initialize the thread pool in JavaScript before calling scout functions:
//    await wasm_bindgen_rayon.initThreadPool(navigator.hardwareConcurrency);
//
// Without these requirements, the parallel feature won't work in browsers.
// ============================================================================

/// Initialize the Rayon thread pool for parallel processing.
/// Must be called before using parallel scout functions.
/// Requires COOP/COEP headers on the hosting server.
/// Returns a Promise that resolves when initialization is complete.
#[cfg(feature = "parallel")]
#[wasm_bindgen]
pub fn init_rayon_thread_pool(num_threads: usize) -> js_sys::Promise {
    wasm_bindgen_rayon::init_thread_pool(num_threads)
}

/// Parallel version of scout_cities_for_category using Rayon.
/// Requires `parallel` feature and proper COOP/COEP headers.
/// Falls back to sequential if parallel feature is not enabled.
#[cfg(feature = "parallel")]
#[wasm_bindgen]
pub fn scout_cities_for_category_parallel(
    cities_json: JsValue,
    lines_json: JsValue,
    category: LifeCategory,
    sort_mode: SortMode,
    config_json: JsValue,
) -> Result<JsValue, JsValue> {
    let cities: Vec<CityData> = serde_wasm_bindgen::from_value(cities_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse cities: {}", e)))?;

    let lines: Vec<LineData> = serde_wasm_bindgen::from_value(lines_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse lines: {}", e)))?;

    let config: ScoringConfig = serde_wasm_bindgen::from_value(config_json)
        .unwrap_or_else(|_| ScoringConfig::balanced());

    // Pre-compute optimized lines with bounding boxes
    let optimized_lines: Vec<OptimizedLine> = lines
        .iter()
        .map(|l| OptimizedLine::from_line_data(l, config.max_distance_km))
        .collect();

    // Process cities in parallel using Rayon
    let city_influence_sets: Vec<CityInfluenceSet> = cities
        .par_iter()
        .map(|city| {
            let mut influences = Vec::new();

            for line in &optimized_lines {
                // Fast bounding box rejection
                if !line.bbox.might_contain(city.lat, city.lon) {
                    continue;
                }

                // Full haversine distance calculation for cities that pass bbox check
                let distance = distance_to_polyline(city.lat, city.lon, &line.points);
                if distance <= config.max_distance_km {
                    influences.push(Influence {
                        planet: line.planet.clone(),
                        angle: line.angle.clone(),
                        rating: line.rating,
                        aspect: line.aspect,
                        distance_km: distance,
                    });
                }
            }

            CityInfluenceSet {
                city_name: city.name.clone(),
                country: city.country.clone(),
                latitude: city.lat,
                longitude: city.lon,
                influences,
            }
        })
        .collect();

    let rankings = rank_cities_by_category(&city_influence_sets, category, &config, sort_mode);

    serde_wasm_bindgen::to_value(&rankings)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// Check if parallel processing is available
#[wasm_bindgen]
pub fn is_parallel_available() -> bool {
    #[cfg(feature = "parallel")]
    {
        true
    }
    #[cfg(not(feature = "parallel"))]
    {
        false
    }
}

// ============================================================================
// OPTIMIZED SCOUT: Grid Pruning + Fast Distance + Polyline Simplification
// ============================================================================
//
// Performance optimizations that reduce computation by ~100x:
// 1. Grid Pruning: Score coarse grid first, refine only hot zones
// 2. Fast Distance: equirectangular approximation before full trig
// 3. Polyline Simplification: Douglas-Peucker to reduce segment count
// ============================================================================

/// Grid point for hierarchical scoring
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GridPoint {
    pub lat: f64,
    pub lon: f64,
    pub score: f64,
    pub influence_count: usize,
}

/// Grid scoring result with hot zones identified
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GridResult {
    pub points: Vec<GridPoint>,
    pub hot_zones: Vec<(f64, f64, f64)>, // (lat, lon, radius_deg)
}

/// Simplified line with reduced points for fast computation
#[derive(Debug, Clone)]
pub struct SimplifiedLine {
    pub planet: String,
    pub angle: String,
    pub rating: u8,
    pub aspect: Option<AspectType>,
    pub points: Vec<(f64, f64)>,
    pub bbox: LineBoundingBox,
    /// Pre-computed representative point for ultra-fast rejection
    pub centroid: (f64, f64),
}

// ============================================================================
// Douglas-Peucker Polyline Simplification
// ============================================================================

/// Perpendicular distance from point to line segment (2D approximation)
fn perpendicular_distance(
    point: (f64, f64),
    line_start: (f64, f64),
    line_end: (f64, f64),
) -> f64 {
    let (px, py) = point;
    let (x1, y1) = line_start;
    let (x2, y2) = line_end;

    let dx = x2 - x1;
    let dy = y2 - y1;

    if dx == 0.0 && dy == 0.0 {
        // Line is a point
        return ((px - x1).powi(2) + (py - y1).powi(2)).sqrt();
    }

    // Distance formula: |cross product| / |line length|
    let numerator = (dy * px - dx * py + x2 * y1 - y2 * x1).abs();
    let denominator = (dx.powi(2) + dy.powi(2)).sqrt();

    numerator / denominator
}

/// Douglas-Peucker algorithm to simplify polyline
/// tolerance is in degrees (0.1° ≈ 11km at equator)
pub fn simplify_polyline(points: &[(f64, f64)], tolerance: f64) -> Vec<(f64, f64)> {
    if points.len() <= 2 {
        return points.to_vec();
    }

    // Find the point with maximum distance from the line between first and last
    let mut max_dist = 0.0;
    let mut max_idx = 0;

    let first = points[0];
    let last = points[points.len() - 1];

    for (i, &point) in points.iter().enumerate().skip(1).take(points.len() - 2) {
        let dist = perpendicular_distance(point, first, last);
        if dist > max_dist {
            max_dist = dist;
            max_idx = i;
        }
    }

    // If max distance exceeds tolerance, recursively simplify
    if max_dist > tolerance {
        let mut left = simplify_polyline(&points[..=max_idx], tolerance);
        let right = simplify_polyline(&points[max_idx..], tolerance);

        // Remove duplicate point at junction
        left.pop();
        left.extend(right);
        left
    } else {
        // All points within tolerance, keep only endpoints
        vec![first, last]
    }
}

/// Simplify a line and create optimized representation
impl SimplifiedLine {
    pub(crate) fn from_line_data(line: &LineData, max_distance_km: f64, simplify_tolerance: f64) -> Self {
        // Simplify polyline (100 points → ~20 points typically)
        let simplified_points = if simplify_tolerance > 0.0 {
            simplify_polyline(&line.points, simplify_tolerance)
        } else {
            line.points.clone()
        };

        // Compute centroid for ultra-fast rejection
        let centroid = if simplified_points.is_empty() {
            (0.0, 0.0)
        } else {
            let sum_lat: f64 = simplified_points.iter().map(|(lat, _)| lat).sum();
            let sum_lon: f64 = simplified_points.iter().map(|(_, lon)| lon).sum();
            let n = simplified_points.len() as f64;
            (sum_lat / n, sum_lon / n)
        };

        Self {
            planet: line.planet.clone(),
            angle: line.angle.clone(),
            rating: line.rating,
            aspect: line.aspect,
            bbox: LineBoundingBox::from_points(&simplified_points, max_distance_km),
            points: simplified_points,
            centroid,
        }
    }
}

// ============================================================================
// Fast Distance Calculation (equirectangular approximation)
// ============================================================================

/// Ultra-fast distance check using equirectangular approximation
/// Returns estimated distance in km - NO TRIG FUNCTIONS
/// Accurate within ~10% for distances < 1000km at mid-latitudes
#[inline]
pub fn fast_distance_estimate(lat1: f64, lon1: f64, lat2: f64, lon2: f64) -> f64 {
    // At the midpoint latitude, approximate the distance
    let mid_lat_rad = ((lat1 + lat2) / 2.0) * std::f64::consts::PI / 180.0;

    // Use pre-computed cos approximation for speed
    // cos(x) ≈ 1 - x²/2 for small x, but we need mid-latitudes
    // For production: use lookup table or Taylor series
    let cos_lat = mid_lat_rad.cos(); // Single trig call

    let dx = (lon2 - lon1) * cos_lat;
    let dy = lat2 - lat1;

    // Convert degrees to km (1 degree ≈ 111.32 km at equator)
    111.32 * (dx * dx + dy * dy).sqrt()
}

/// Fast minimum distance from point to simplified polyline
/// Uses equirectangular for initial estimate, only does full calc if needed
#[inline]
pub fn fast_distance_to_polyline(
    city_lat: f64,
    city_lon: f64,
    line: &SimplifiedLine,
    threshold_km: f64,
) -> Option<f64> {
    // Step 1: Ultra-fast centroid check (single distance calc)
    let centroid_dist = fast_distance_estimate(city_lat, city_lon, line.centroid.0, line.centroid.1);

    // If centroid is very far, skip entirely (line bbox diagonal + threshold)
    let bbox_diagonal = ((line.bbox.max_lat - line.bbox.min_lat).powi(2)
                       + (line.bbox.max_lon - line.bbox.min_lon).powi(2)).sqrt() * 111.32;
    if centroid_dist > bbox_diagonal + threshold_km + 200.0 {
        return None; // Definitely too far
    }

    // Step 2: Bounding box check (already fast)
    if !line.bbox.might_contain(city_lat, city_lon) {
        return None;
    }

    // Step 3: Fast equirectangular distance to each segment
    let mut min_fast_dist = f64::INFINITY;
    for i in 0..line.points.len().saturating_sub(1) {
        let (lat1, lon1) = line.points[i];
        let (lat2, lon2) = line.points[i + 1];

        // Fast distance to segment endpoints
        let d1 = fast_distance_estimate(city_lat, city_lon, lat1, lon1);
        let d2 = fast_distance_estimate(city_lat, city_lon, lat2, lon2);
        let segment_min = d1.min(d2);

        if segment_min < min_fast_dist {
            min_fast_dist = segment_min;
        }
    }

    // Step 4: If fast estimate is way beyond threshold, skip full calc
    // Add 20% margin for approximation error
    if min_fast_dist > threshold_km * 1.2 {
        return None;
    }

    // Step 5: Full accurate calculation (only ~5% of cases reach here)
    let accurate_dist = distance_to_polyline(city_lat, city_lon, &line.points);
    if accurate_dist <= threshold_km {
        Some(accurate_dist)
    } else {
        None
    }
}

// ============================================================================
// Grid Generation
// ============================================================================

/// Generate a grid of points at specified resolution
pub fn generate_grid(resolution_deg: f64) -> Vec<(f64, f64)> {
    let mut points = Vec::new();

    // Latitude: -60 to 70 (most populated areas)
    let mut lat = -60.0;
    while lat <= 70.0 {
        // Longitude: -180 to 180
        let mut lon = -180.0;
        while lon < 180.0 {
            points.push((lat, lon));
            lon += resolution_deg;
        }
        lat += resolution_deg;
    }

    points
}

/// Generate coarse grid (5° resolution) - 648 points
pub fn generate_coarse_grid() -> Vec<(f64, f64)> {
    generate_grid(5.0)
}

/// Generate regional grid around hot zones (1° resolution)
pub fn generate_regional_grid(hot_zones: &[(f64, f64, f64)]) -> Vec<(f64, f64)> {
    let mut points = Vec::new();

    for &(center_lat, center_lon, radius_deg) in hot_zones {
        let mut lat = center_lat - radius_deg;
        while lat <= center_lat + radius_deg {
            let mut lon = center_lon - radius_deg;
            while lon <= center_lon + radius_deg {
                // Normalize longitude
                let norm_lon = if lon < -180.0 { lon + 360.0 }
                              else if lon > 180.0 { lon - 360.0 }
                              else { lon };
                points.push((lat, norm_lon));
                lon += 1.0;
            }
            lat += 1.0;
        }
    }

    // Deduplicate (zones may overlap)
    points.sort_by(|a, b| {
        a.0.partial_cmp(&b.0).unwrap().then(a.1.partial_cmp(&b.1).unwrap())
    });
    points.dedup_by(|a, b| (a.0 - b.0).abs() < 0.1 && (a.1 - b.1).abs() < 0.1);

    points
}

/// Generate fine grid around top zones (0.25° resolution)
pub fn generate_fine_grid(top_zones: &[(f64, f64, f64)]) -> Vec<(f64, f64)> {
    let mut points = Vec::new();

    for &(center_lat, center_lon, radius_deg) in top_zones {
        let mut lat = center_lat - radius_deg;
        while lat <= center_lat + radius_deg {
            let mut lon = center_lon - radius_deg;
            while lon <= center_lon + radius_deg {
                let norm_lon = if lon < -180.0 { lon + 360.0 }
                              else if lon > 180.0 { lon - 360.0 }
                              else { lon };
                points.push((lat, norm_lon));
                lon += 0.25;
            }
            lat += 0.25;
        }
    }

    points.sort_by(|a, b| {
        a.0.partial_cmp(&b.0).unwrap().then(a.1.partial_cmp(&b.1).unwrap())
    });
    points.dedup_by(|a, b| (a.0 - b.0).abs() < 0.05 && (a.1 - b.1).abs() < 0.05);

    points
}

// ============================================================================
// Optimized Scout Functions
// ============================================================================

/// Score a single grid point against all lines (fast path)
fn score_grid_point(
    lat: f64,
    lon: f64,
    lines: &[SimplifiedLine],
    category: LifeCategory,
    config: &ScoringConfig,
) -> (f64, usize) {
    let mut total_benefit = 0.0;
    let mut influence_count = 0;

    for line in lines {
        // Skip lines not relevant to this category
        if !is_beneficial_for_category(&line.planet, &line.angle, category)
            && !is_challenging_for_category(&line.planet, &line.angle, category) {
            continue;
        }

        // Fast distance check with early rejection
        if let Some(distance) = fast_distance_to_polyline(lat, lon, line, config.max_distance_km) {
            let kernel = apply_kernel(distance, config);
            let benefit = rating_to_benefit(line.rating) * kernel;

            // Apply aspect modifier if present
            let final_benefit = match line.aspect {
                Some(aspect) => benefit * aspect_benefit_multiplier(aspect),
                None => benefit,
            };

            total_benefit += final_benefit;
            influence_count += 1;
        }
    }

    // Normalize to 0-100 scale
    let score = (50.0 + total_benefit * 10.5).clamp(0.0, 100.0);
    (score, influence_count)
}

/// Phase 1: Score coarse grid to identify hot zones
fn score_coarse_grid(
    lines: &[SimplifiedLine],
    category: LifeCategory,
    config: &ScoringConfig,
) -> Vec<GridPoint> {
    let grid = generate_coarse_grid();

    #[cfg(feature = "parallel")]
    {
        grid.par_iter()
            .map(|&(lat, lon)| {
                let (score, influence_count) = score_grid_point(lat, lon, lines, category, config);
                GridPoint { lat, lon, score, influence_count }
            })
            .collect()
    }

    #[cfg(not(feature = "parallel"))]
    {
        grid.iter()
            .map(|&(lat, lon)| {
                let (score, influence_count) = score_grid_point(lat, lon, lines, category, config);
                GridPoint { lat, lon, score, influence_count }
            })
            .collect()
    }
}

/// Identify hot zones from coarse grid (top 20% by score)
fn identify_hot_zones(coarse_results: &[GridPoint], threshold_percentile: f64) -> Vec<(f64, f64, f64)> {
    if coarse_results.is_empty() {
        return Vec::new();
    }

    // Find score threshold
    let mut scores: Vec<f64> = coarse_results.iter()
        .filter(|p| p.influence_count > 0)
        .map(|p| p.score)
        .collect();

    if scores.is_empty() {
        return Vec::new();
    }

    scores.sort_by(|a, b| b.partial_cmp(a).unwrap()); // Descending

    let threshold_idx = ((scores.len() as f64) * threshold_percentile).ceil() as usize;
    let threshold_score = scores.get(threshold_idx.min(scores.len() - 1)).copied().unwrap_or(50.0);

    // Collect hot zones (points above threshold)
    coarse_results.iter()
        .filter(|p| p.score >= threshold_score && p.influence_count > 0)
        .map(|p| (p.lat, p.lon, 5.0)) // 5° radius around each hot point
        .collect()
}

/// Phase 2: Score regional grid in hot zones
fn score_regional_grid(
    hot_zones: &[(f64, f64, f64)],
    lines: &[SimplifiedLine],
    category: LifeCategory,
    config: &ScoringConfig,
) -> Vec<GridPoint> {
    let grid = generate_regional_grid(hot_zones);

    #[cfg(feature = "parallel")]
    {
        grid.par_iter()
            .map(|&(lat, lon)| {
                let (score, influence_count) = score_grid_point(lat, lon, lines, category, config);
                GridPoint { lat, lon, score, influence_count }
            })
            .collect()
    }

    #[cfg(not(feature = "parallel"))]
    {
        grid.iter()
            .map(|&(lat, lon)| {
                let (score, influence_count) = score_grid_point(lat, lon, lines, category, config);
                GridPoint { lat, lon, score, influence_count }
            })
            .collect()
    }
}

/// Phase 3: Score fine grid in top zones
fn score_fine_grid(
    top_zones: &[(f64, f64, f64)],
    lines: &[SimplifiedLine],
    category: LifeCategory,
    config: &ScoringConfig,
) -> Vec<GridPoint> {
    let grid = generate_fine_grid(top_zones);

    #[cfg(feature = "parallel")]
    {
        grid.par_iter()
            .map(|&(lat, lon)| {
                let (score, influence_count) = score_grid_point(lat, lon, lines, category, config);
                GridPoint { lat, lon, score, influence_count }
            })
            .collect()
    }

    #[cfg(not(feature = "parallel"))]
    {
        grid.iter()
            .map(|&(lat, lon)| {
                let (score, influence_count) = score_grid_point(lat, lon, lines, category, config);
                GridPoint { lat, lon, score, influence_count }
            })
            .collect()
    }
}

/// WASM binding: Optimized hierarchical grid scout
/// Returns grid points with scores, much faster than city-by-city
#[wasm_bindgen]
pub fn scout_grid_optimized(
    lines_json: JsValue,
    category: LifeCategory,
    config_json: JsValue,
) -> Result<JsValue, JsValue> {
    let lines: Vec<LineData> = serde_wasm_bindgen::from_value(lines_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse lines: {}", e)))?;

    let config: ScoringConfig = serde_wasm_bindgen::from_value(config_json)
        .unwrap_or_else(|_| ScoringConfig::balanced());

    // Simplify polylines (100 points → ~20 points)
    // tolerance 0.1° ≈ 11km - good balance of accuracy vs speed
    let simplified_lines: Vec<SimplifiedLine> = lines.iter()
        .map(|l| SimplifiedLine::from_line_data(l, config.max_distance_km, 0.1))
        .collect();

    // Phase 1: Coarse grid (648 points, 5° resolution)
    let coarse_results = score_coarse_grid(&simplified_lines, category, &config);

    // Identify hot zones (top 20%)
    let hot_zones = identify_hot_zones(&coarse_results, 0.2);

    if hot_zones.is_empty() {
        // No hot zones found - return coarse results
        return serde_wasm_bindgen::to_value(&GridResult {
            points: coarse_results,
            hot_zones: Vec::new(),
        }).map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)));
    }

    // Phase 2: Regional grid (1° resolution in hot zones)
    let regional_results = score_regional_grid(&hot_zones, &simplified_lines, category, &config);

    // Identify top zones from regional (top 10%)
    let top_zones = identify_hot_zones(&regional_results, 0.1);

    if top_zones.is_empty() {
        return serde_wasm_bindgen::to_value(&GridResult {
            points: regional_results,
            hot_zones,
        }).map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)));
    }

    // Phase 3: Fine grid (0.25° resolution in top zones)
    let fine_results = score_fine_grid(&top_zones, &simplified_lines, category, &config);

    serde_wasm_bindgen::to_value(&GridResult {
        points: fine_results,
        hot_zones: top_zones,
    }).map_err(|e| JsValue::from_str(&format!("Serialization error: {}", e)))
}

/// WASM binding: Fast city scoring using simplified lines
/// Use this when you need city names, not just grid points
#[wasm_bindgen]
pub fn scout_cities_fast(
    cities_json: JsValue,
    lines_json: JsValue,
    category: LifeCategory,
    sort_mode: SortMode,
    config_json: JsValue,
) -> Result<JsValue, JsValue> {
    let cities: Vec<CityData> = serde_wasm_bindgen::from_value(cities_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse cities: {}", e)))?;

    let lines: Vec<LineData> = serde_wasm_bindgen::from_value(lines_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse lines: {}", e)))?;

    let config: ScoringConfig = serde_wasm_bindgen::from_value(config_json)
        .unwrap_or_else(|_| ScoringConfig::balanced());

    // Simplify polylines for speed
    let simplified_lines: Vec<SimplifiedLine> = lines.iter()
        .map(|l| SimplifiedLine::from_line_data(l, config.max_distance_km, 0.1))
        .collect();

    // Build influence sets with fast distance calculation
    let city_influence_sets: Vec<CityInfluenceSet> = cities.iter()
        .map(|city| {
            let mut influences = Vec::new();

            for line in &simplified_lines {
                if let Some(distance) = fast_distance_to_polyline(
                    city.lat, city.lon, line, config.max_distance_km
                ) {
                    influences.push(Influence {
                        planet: line.planet.clone(),
                        angle: line.angle.clone(),
                        rating: line.rating,
                        aspect: line.aspect,
                        distance_km: distance,
                    });
                }
            }

            CityInfluenceSet {
                city_name: city.name.clone(),
                country: city.country.clone(),
                latitude: city.lat,
                longitude: city.lon,
                influences,
            }
        })
        .collect();

    let rankings = rank_cities_by_category(&city_influence_sets, category, &config, sort_mode);

    serde_wasm_bindgen::to_value(&rankings)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

/// WASM binding: Fast parallel city scoring (desktop with parallel support)
#[cfg(feature = "parallel")]
#[wasm_bindgen]
pub fn scout_cities_fast_parallel(
    cities_json: JsValue,
    lines_json: JsValue,
    category: LifeCategory,
    sort_mode: SortMode,
    config_json: JsValue,
) -> Result<JsValue, JsValue> {
    let cities: Vec<CityData> = serde_wasm_bindgen::from_value(cities_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse cities: {}", e)))?;

    let lines: Vec<LineData> = serde_wasm_bindgen::from_value(lines_json)
        .map_err(|e| JsValue::from_str(&format!("Failed to parse lines: {}", e)))?;

    let config: ScoringConfig = serde_wasm_bindgen::from_value(config_json)
        .unwrap_or_else(|_| ScoringConfig::balanced());

    // Simplify polylines for speed
    let simplified_lines: Vec<SimplifiedLine> = lines.iter()
        .map(|l| SimplifiedLine::from_line_data(l, config.max_distance_km, 0.1))
        .collect();

    // Process cities in parallel with fast distance
    let city_influence_sets: Vec<CityInfluenceSet> = cities.par_iter()
        .map(|city| {
            let mut influences = Vec::new();

            for line in &simplified_lines {
                if let Some(distance) = fast_distance_to_polyline(
                    city.lat, city.lon, line, config.max_distance_km
                ) {
                    influences.push(Influence {
                        planet: line.planet.clone(),
                        angle: line.angle.clone(),
                        rating: line.rating,
                        aspect: line.aspect,
                        distance_km: distance,
                    });
                }
            }

            CityInfluenceSet {
                city_name: city.name.clone(),
                country: city.country.clone(),
                latitude: city.lat,
                longitude: city.lon,
                influences,
            }
        })
        .collect();

    let rankings = rank_cities_by_category(&city_influence_sets, category, &config, sort_mode);

    serde_wasm_bindgen::to_value(&rankings)
        .map_err(|e| JsValue::from_str(&format!("Failed to serialize result: {}", e)))
}

// ============================================================================
// Tests
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_haversine_distance() {
        // Tokyo to Osaka: ~400 km
        let dist = haversine_distance(35.6762, 139.6503, 34.6937, 135.5023);
        assert!(dist > 390.0 && dist < 410.0);
    }

    #[test]
    fn test_linear_kernel() {
        assert_eq!(linear_kernel(0.0, 500.0), 1.0);
        assert_eq!(linear_kernel(250.0, 500.0), 0.5);
        assert_eq!(linear_kernel(500.0, 500.0), 0.0);
        assert_eq!(linear_kernel(600.0, 500.0), 0.0);
    }

    #[test]
    fn test_gaussian_kernel() {
        let at_zero = gaussian_kernel(0.0, 180.0);
        assert!((at_zero - 1.0).abs() < 0.001);

        let at_sigma = gaussian_kernel(180.0, 180.0);
        assert!((at_sigma - 0.6065).abs() < 0.01);
    }

    #[test]
    fn test_rating_to_benefit() {
        assert_eq!(rating_to_benefit(5), 2.0);
        assert_eq!(rating_to_benefit(4), 1.0);
        assert_eq!(rating_to_benefit(3), 0.0);
        assert_eq!(rating_to_benefit(2), -1.0);
        assert_eq!(rating_to_benefit(1), -2.0);
    }

    #[test]
    fn test_category_filtering() {
        assert!(is_beneficial_for_category("Sun", "MC", LifeCategory::Career));
        assert!(is_challenging_for_category("Neptune", "MC", LifeCategory::Career));
        assert!(!is_beneficial_for_category("Neptune", "MC", LifeCategory::Career));
    }

    // ========================================================================
    // REGRESSION TESTS: Cross-track distance golden values
    // ========================================================================

    #[test]
    fn test_cross_track_simple_case() {
        // Point directly on line segment should have ~0 cross-track distance
        // Line from (0, 0) to (0, 10), point at (0, 5)
        let (cross, along) = cross_track_distance(0.0, 5.0, 0.0, 0.0, 0.0, 10.0);
        assert!(cross < 1.0, "Cross-track should be ~0 for point on line, got {}", cross);
        assert!(along > 0.0, "Along-track should be positive (point between endpoints)");
    }

    #[test]
    fn test_cross_track_perpendicular_offset() {
        // Point 100km perpendicular to a line
        // Line along equator from (0, 0) to (0, 10), point at (1, 5)
        // 1 degree latitude ≈ 111 km
        let (cross, _along) = cross_track_distance(1.0, 5.0, 0.0, 0.0, 0.0, 10.0);
        assert!(cross > 100.0 && cross < 120.0, "Expected ~111km cross-track, got {}", cross);
    }

    #[test]
    fn test_cross_track_dateline_crossing() {
        // Line crossing the dateline from (0, 170) to (0, -170)
        // Point at (0, 180) should be near the line
        let dist = distance_to_line_segment(0.0, 180.0, 0.0, 170.0, 0.0, -170.0);
        assert!(dist < 100.0, "Point at dateline should be near line, got {} km", dist);
    }

    #[test]
    fn test_cross_track_high_latitude() {
        // Test at high latitude (Norway, 70°N)
        // Line from Tromsø to Murmansk
        let (cross, _along) = cross_track_distance(
            70.0, 25.0,  // Point between them
            69.65, 18.96, // Tromsø
            68.97, 33.09  // Murmansk
        );
        assert!(cross < 200.0, "High latitude cross-track should work, got {}", cross);
    }

    #[test]
    fn test_cross_track_endpoint_fallback() {
        // Point beyond segment end should return distance to endpoint
        // Line from (0, 0) to (0, 10), point at (0, 20)
        let dist = distance_to_line_segment(0.0, 20.0, 0.0, 0.0, 0.0, 10.0);
        // Distance from (0, 20) to (0, 10) ≈ 10° * 111 km ≈ 1110 km
        let endpoint_dist = haversine_distance(0.0, 20.0, 0.0, 10.0);
        assert!((dist - endpoint_dist).abs() < 1.0, "Should return endpoint distance, got {} vs {}", dist, endpoint_dist);
    }

    // ========================================================================
    // REGRESSION TESTS: Score bounds verification
    // ========================================================================

    #[test]
    fn test_score_bounds_max_beneficial() {
        // Synthetic: 7 influences at max beneficial rating (5) with kernel=1 (distance=0)
        let config = ScoringConfig::balanced();
        let city = CityInfluenceSet {
            city_name: "Test".to_string(),
            country: "Test".to_string(),
            latitude: 0.0,
            longitude: 0.0,
            influences: (0..7).map(|_| Influence {
                planet: "Sun".to_string(),
                angle: "MC".to_string(),
                rating: 5,
                aspect: None,
                distance_km: 0.0, // kernel = 1.0
            }).collect(),
        };

        let score = calculate_city_score(&city, &config);

        assert!(score.benefit_score >= 0.0 && score.benefit_score <= 100.0,
            "benefit_score {} out of bounds", score.benefit_score);
        assert!(score.intensity_score >= 0.0 && score.intensity_score <= 100.0,
            "intensity_score {} out of bounds", score.intensity_score);
        assert!(score.volatility_score >= 0.0 && score.volatility_score <= 100.0,
            "volatility_score {} out of bounds", score.volatility_score);
    }

    #[test]
    fn test_score_bounds_max_challenging() {
        // Synthetic: 7 influences at max challenging rating (1) with kernel=1
        let config = ScoringConfig::balanced();
        let city = CityInfluenceSet {
            city_name: "Test".to_string(),
            country: "Test".to_string(),
            latitude: 0.0,
            longitude: 0.0,
            influences: (0..7).map(|_| Influence {
                planet: "Saturn".to_string(),
                angle: "MC".to_string(),
                rating: 1,
                aspect: None,
                distance_km: 0.0,
            }).collect(),
        };

        let score = calculate_city_score(&city, &config);

        assert!(score.benefit_score >= 0.0 && score.benefit_score <= 100.0,
            "benefit_score {} out of bounds", score.benefit_score);
        assert!(score.intensity_score >= 0.0 && score.intensity_score <= 100.0,
            "intensity_score {} out of bounds", score.intensity_score);
    }

    #[test]
    fn test_score_bounds_mixed_volatile() {
        // Synthetic: Mix of max beneficial and max challenging to maximize volatility
        let config = ScoringConfig::balanced();
        let influences: Vec<Influence> = vec![
            Influence { planet: "Sun".to_string(), angle: "MC".to_string(), rating: 5, aspect: None, distance_km: 0.0 },
            Influence { planet: "Saturn".to_string(), angle: "MC".to_string(), rating: 1, aspect: None, distance_km: 0.0 },
            Influence { planet: "Jupiter".to_string(), angle: "MC".to_string(), rating: 5, aspect: None, distance_km: 0.0 },
            Influence { planet: "Neptune".to_string(), angle: "MC".to_string(), rating: 1, aspect: None, distance_km: 0.0 },
            Influence { planet: "Venus".to_string(), angle: "MC".to_string(), rating: 5, aspect: None, distance_km: 0.0 },
            Influence { planet: "Pluto".to_string(), angle: "MC".to_string(), rating: 1, aspect: None, distance_km: 0.0 },
            Influence { planet: "Mars".to_string(), angle: "MC".to_string(), rating: 5, aspect: None, distance_km: 0.0 },
        ];

        let city = CityInfluenceSet {
            city_name: "Test".to_string(),
            country: "Test".to_string(),
            latitude: 0.0,
            longitude: 0.0,
            influences,
        };

        let score = calculate_city_score(&city, &config);

        assert!(score.benefit_score >= 0.0 && score.benefit_score <= 100.0,
            "benefit_score {} out of bounds", score.benefit_score);
        assert!(score.intensity_score >= 0.0 && score.intensity_score <= 100.0,
            "intensity_score {} out of bounds", score.intensity_score);
        assert!(score.volatility_score >= 0.0 && score.volatility_score <= 100.0,
            "volatility_score {} out of bounds", score.volatility_score);
        assert!(score.mixed_flag, "Should have mixed_flag set with alternating beneficial/challenging");
    }

    #[test]
    fn test_volatility_both_directions() {
        // Test that volatility is flagged for both positive→negative AND negative→positive flips
        let config = ScoringConfig::balanced();

        // Case 1: Positive base benefit (rating 5 → +2) with square aspect (mult -0.6)
        let positive_flipped = Influence {
            planet: "Sun".to_string(),
            angle: "MC".to_string(),
            rating: 5,
            aspect: Some(AspectType::Square),
            distance_km: 0.0,
        };
        let contrib1 = calculate_influence_contribution(&positive_flipped, &config);
        assert!(contrib1.volatility > 0.0, "Should flag volatility when positive is flipped to negative");

        // Case 2: Negative base benefit (rating 1 → -2) with square aspect (mult -0.6)
        let negative_flipped = Influence {
            planet: "Saturn".to_string(),
            angle: "MC".to_string(),
            rating: 1,
            aspect: Some(AspectType::Square),
            distance_km: 0.0,
        };
        let contrib2 = calculate_influence_contribution(&negative_flipped, &config);
        assert!(contrib2.volatility > 0.0, "Should flag volatility when negative is flipped to positive");
    }

    #[test]
    fn test_top_k_capping() {
        // More than 7 influences should only use top 7 for scoring
        let config = ScoringConfig::balanced();
        let influences: Vec<Influence> = (0..20).map(|_| Influence {
            planet: "Sun".to_string(),
            angle: "MC".to_string(),
            rating: 5,
            aspect: None,
            distance_km: 0.0,
        }).collect();

        let city = CityInfluenceSet {
            city_name: "Test".to_string(),
            country: "Test".to_string(),
            latitude: 0.0,
            longitude: 0.0,
            influences,
        };

        let score = calculate_city_score(&city, &config);

        // Even with 20 max influences, scores should stay bounded
        assert!(score.benefit_score >= 0.0 && score.benefit_score <= 100.0,
            "benefit_score {} should be bounded even with {} influences", score.benefit_score, city.influences.len());
        assert!(score.intensity_score >= 0.0 && score.intensity_score <= 100.0,
            "intensity_score {} should be bounded even with {} influences", score.intensity_score, city.influences.len());
    }

    #[test]
    fn test_pluto_mc_not_challenging_for_career() {
        // Regression test: Pluto:MC should be beneficial for Career, not challenging
        assert!(is_beneficial_for_category("Pluto", "MC", LifeCategory::Career),
            "Pluto:MC should be beneficial for Career");
        assert!(!is_challenging_for_category("Pluto", "MC", LifeCategory::Career),
            "Pluto:MC should NOT be challenging for Career");
    }
}
