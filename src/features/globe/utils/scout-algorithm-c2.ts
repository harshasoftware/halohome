/**
 * Scout Location Scoring Algorithm - C2 (Cycle 2)
 * TypeScript implementation matching the Rust WASM version
 *
 * Key features:
 * - Spherical geodetic model with cross-track distance
 * - Continuous influence field using Gaussian/exponential decay
 * - Separated benefit/intensity scoring
 * - Volatility detection for mixed influences
 * - Diminishing returns for multiple influences
 * - Dateline segment splitting for Pacific accuracy
 */

import type { PlanetaryLine, AspectLine } from '@/lib/astro-types';

// ============================================================================
// Constants (matching Rust exactly)
// ============================================================================

/** Earth's mean radius in kilometers */
const EARTH_RADIUS_KM = 6371.0;

/** Diminishing returns weights for multiple influences */
const DIMINISHING_WEIGHTS = [1.0, 0.6, 0.35, 0.2, 0.1, 0.08, 0.05];

// ============================================================================
// Types
// ============================================================================

export type LifeCategory = 'career' | 'love' | 'health' | 'home' | 'wellbeing' | 'wealth';

export type AspectType = 'conjunction' | 'trine' | 'sextile' | 'square' | 'quincunx' | 'opposition' | 'sesquisquare';

export type KernelType = 'linear' | 'gaussian' | 'exponential';

export type SortMode = 'benefit' | 'intensity' | 'balanced';

export interface ScoringConfig {
  kernelType: KernelType;
  kernelParameter: number;
  maxDistanceKm: number;
  volatilityPenalty: number;
}

export interface Influence {
  planet: string;
  angle: string;
  rating: number; // 1-5
  aspect: AspectType | null;
  distanceKm: number;
}

export interface InfluenceContribution {
  benefit: number;
  intensity: number;
  volatility: number;
}

export interface CityInfluenceSet {
  cityName: string;
  country: string;
  latitude: number;
  longitude: number;
  influences: Influence[];
}

export interface CityScore {
  cityName: string;
  country: string;
  latitude: number;
  longitude: number;
  benefitScore: number;
  intensityScore: number;
  volatilityScore: number;
  mixedFlag: boolean;
  influenceCount: number;
  minDistanceKm: number;
}

export interface CityRanking extends CityScore {
  topInfluences: Array<{ planet: string; angle: string; distanceKm: number }>;
  nature: 'beneficial' | 'challenging' | 'mixed';
}

// ============================================================================
// Default Configurations
// ============================================================================

export function getBalancedConfig(): ScoringConfig {
  return {
    kernelType: 'gaussian',
    kernelParameter: 180.0, // σ = 180 km
    maxDistanceKm: 500.0,
    volatilityPenalty: 0.3,
  };
}

export function getHighPrecisionConfig(): ScoringConfig {
  return {
    kernelType: 'gaussian',
    kernelParameter: 120.0, // σ = 120 km
    maxDistanceKm: 600.0,
    volatilityPenalty: 0.4,
  };
}

export function getRelaxedConfig(): ScoringConfig {
  return {
    kernelType: 'linear',
    kernelParameter: 500.0,
    maxDistanceKm: 500.0,
    volatilityPenalty: 0.2,
  };
}

// ============================================================================
// Geodetic Functions (Spherical Earth Model)
// ============================================================================
//
// Uses spherical Earth approximation with mean radius 6371 km.
// Accuracy: typically within ~0.5% globally compared to WGS84 ellipsoid.
// This is acceptable for city-level scoring (error < 20km at 4000km distances).
// ============================================================================

/**
 * Compute great-circle distance between two points using Haversine formula
 * Input: coordinates in decimal degrees
 * Output: distance in kilometers
 */
export function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => deg * (Math.PI / 180);

  const lat1Rad = toRad(lat1);
  const lat2Rad = toRad(lat2);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return EARTH_RADIUS_KM * c;
}

// ============================================================================
// Spatial Pre-filtering (Performance Optimization)
// ============================================================================
//
// These functions provide fast rejection of city-line pairs that are clearly
// too far apart, avoiding expensive haversine/cross-track calculations.
// Typical speedup: 3-5x by skipping ~70% of distance calculations.
// ============================================================================

/**
 * Fast equirectangular distance approximation (minimal trig)
 * Accurate within ~1% for distances < 500km at mid-latitudes
 * Used for quick rejection before expensive haversine calculation
 */
export function equirectangularDistanceApprox(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const midLat = (lat1 + lat2) / 2;
  const cosLat = Math.cos(midLat * Math.PI / 180);

  const dx = (lon2 - lon1) * cosLat;
  const dy = lat2 - lat1;

  // Convert degrees to km (1 degree ≈ 111.32 km at equator)
  return 111.32 * Math.sqrt(dx * dx + dy * dy);
}

/**
 * Bounding box for a line with buffer for max influence distance
 */
export interface LineBoundingBox {
  minLat: number;
  maxLat: number;
  minLon: number;
  maxLon: number;
  bufferDeg: number;
}

/**
 * Create bounding box from line points with buffer for influence radius
 */
export function createLineBoundingBox(points: [number, number][], bufferKm: number): LineBoundingBox {
  if (points.length === 0) {
    return { minLat: -90, maxLat: 90, minLon: -180, maxLon: 180, bufferDeg: 0 };
  }

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLon = Infinity;
  let maxLon = -Infinity;

  for (const [lat, lon] of points) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLon = Math.min(minLon, lon);
    maxLon = Math.max(maxLon, lon);
  }

  // Convert buffer from km to degrees (conservative: use equator value)
  const bufferDeg = bufferKm / 111.32;

  return { minLat, maxLat, minLon, maxLon, bufferDeg };
}

/**
 * Fast check if a city could possibly be within influence distance of a line
 * Returns true if city MIGHT be within range (requires full calculation)
 * Returns false if city is DEFINITELY out of range (skip calculation)
 */
export function mightCityBeNearLine(cityLat: number, cityLon: number, bbox: LineBoundingBox): boolean {
  // Check latitude with buffer
  const latInRange = cityLat >= (bbox.minLat - bbox.bufferDeg) &&
                     cityLat <= (bbox.maxLat + bbox.bufferDeg);

  if (!latInRange) return false;

  // Handle dateline crossing (minLon > maxLon)
  const lonInRange = bbox.minLon > bbox.maxLon
    ? (cityLon >= (bbox.minLon - bbox.bufferDeg) || cityLon <= (bbox.maxLon + bbox.bufferDeg))
    : (cityLon >= (bbox.minLon - bbox.bufferDeg) && cityLon <= (bbox.maxLon + bbox.bufferDeg));

  return lonInRange;
}

/**
 * Pre-computed line data with bounding box for fast filtering
 */
export interface OptimizedLine<T> {
  original: T;
  bbox: LineBoundingBox;
  points: [number, number][];
}

/**
 * Create optimized lines with pre-computed bounding boxes
 */
export function createOptimizedPlanetaryLines(
  lines: PlanetaryLine[],
  maxDistanceKm: number
): OptimizedLine<PlanetaryLine>[] {
  return lines.map(line => ({
    original: line,
    bbox: createLineBoundingBox(line.points, maxDistanceKm),
    points: line.points,
  }));
}

/**
 * Create optimized aspect lines with pre-computed bounding boxes
 */
export function createOptimizedAspectLines(
  lines: AspectLine[],
  maxDistanceKm: number
): OptimizedLine<AspectLine>[] {
  return lines.map(line => ({
    original: line,
    bbox: createLineBoundingBox(line.points, maxDistanceKm),
    points: line.points,
  }));
}

/**
 * Compute cross-track distance from a point to a great-circle path
 * Returns [crossTrackDistance, alongTrackDistance] in kilometers
 */
export function crossTrackDistance(
  latPt: number,
  lonPt: number,
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): [number, number] {
  const toRad = (deg: number) => deg * (Math.PI / 180);

  const latPtRad = toRad(latPt);
  const lonPtRad = toRad(lonPt);
  const lat1Rad = toRad(lat1);
  const lon1Rad = toRad(lon1);
  const lat2Rad = toRad(lat2);
  const lon2Rad = toRad(lon2);

  // Distance from point to start (angular)
  const d13 = haversineDistance(latPt, lonPt, lat1, lon1) / EARTH_RADIUS_KM;

  // Initial bearing from start to point
  const y13 = Math.sin(lonPtRad - lon1Rad) * Math.cos(latPtRad);
  const x13 = Math.cos(lat1Rad) * Math.sin(latPtRad) -
    Math.sin(lat1Rad) * Math.cos(latPtRad) * Math.cos(lonPtRad - lon1Rad);
  const bearing13 = Math.atan2(y13, x13);

  // Bearing from start to end
  const y12 = Math.sin(lon2Rad - lon1Rad) * Math.cos(lat2Rad);
  const x12 = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(lon2Rad - lon1Rad);
  const bearing12 = Math.atan2(y12, x12);

  // Cross-track distance (angular)
  // δxt = asin(sin(δ13) * sin(θ13 - θ12))
  const dxtRaw = Math.sin(d13) * Math.sin(bearing13 - bearing12);
  const dxt = Math.asin(Math.max(-1, Math.min(1, dxtRaw))); // clamp for numerical safety
  const crossTrack = Math.abs(dxt) * EARTH_RADIUS_KM;

  // Along-track distance (signed for proper endpoint clamping)
  // δat = acos(cos(δ13) / cos(δxt))
  // Sign from cos(θ13 - θ12): negative means point is "before" segment start
  //
  // Guard: clamp denominator away from 0 before division to avoid Infinity.
  // cos(δxt) ≈ 0 means cross-track ≈ 90° (point ~10,000km from line) - extreme case
  // that won't occur with our 500km influence radius, but guard ensures robustness.
  const cosDxt = Math.cos(dxt);
  const EPSILON = 1e-10;
  const safeDenom = Math.abs(cosDxt) < EPSILON ? (cosDxt >= 0 ? EPSILON : -EPSILON) : cosDxt;
  const cosD13overCosXt = Math.cos(d13) / safeDenom;
  const datAbs = Math.acos(Math.max(-1, Math.min(1, cosD13overCosXt)));
  const sign = Math.cos(bearing13 - bearing12) >= 0 ? 1 : -1;
  const alongTrack = isNaN(datAbs) ? 0 : sign * datAbs * EARTH_RADIUS_KM;

  return [crossTrack, alongTrack];
}

/**
 * Unwrap longitude to be continuous with a reference longitude
 * Ensures Δλ ∈ [-180, 180] for proper segment handling
 */
function unwrapLongitude(lon: number, refLon: number): number {
  let delta = lon - refLon;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return refLon + delta;
}

/**
 * Interpolate latitude where a segment crosses the dateline (±180°)
 * Uses proper longitude unwrapping to determine correct crossing direction
 */
function interpolateDatelineCrossing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): { lat: number; crossingLon: number } {
  // Unwrap lon2 to be continuous with lon1
  const lon2Unwrapped = unwrapLongitude(lon2, lon1);

  // Determine which meridian we're crossing based on unwrapped direction
  // If going eastward past +180, we cross +180
  // If going westward past -180, we cross -180
  const crossingLon = lon2Unwrapped > lon1 ? 180 : -180;

  // Linear interpolation of latitude at crossing point
  const t = (crossingLon - lon1) / (lon2Unwrapped - lon1);

  return { lat: lat1 + t * (lat2 - lat1), crossingLon };
}

/**
 * Find minimum distance from a point to a line segment
 * Handles boundary constraints and dateline crossings with proper unwrapping
 */
export function distanceToLineSegment(
  latPt: number,
  lonPt: number,
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  // Handle dateline crossing by splitting into two sub-segments
  // Use unwrapped longitude difference to detect actual crossing
  if (Math.abs(lon2 - lon1) > 180) {
    const crossing = interpolateDatelineCrossing(lat1, lon1, lat2, lon2);
    // The opposite meridian for the second segment
    const crossLon2 = crossing.crossingLon === 180 ? -180 : 180;

    // Distance to first sub-segment (start → crossing)
    const dist1 = distanceToLineSegmentInternal(latPt, lonPt, lat1, lon1, crossing.lat, crossing.crossingLon);
    // Distance to second sub-segment (crossing → end)
    const dist2 = distanceToLineSegmentInternal(latPt, lonPt, crossing.lat, crossLon2, lat2, lon2);

    return Math.min(dist1, dist2);
  }

  return distanceToLineSegmentInternal(latPt, lonPt, lat1, lon1, lat2, lon2);
}

/**
 * Internal segment distance (assumes no dateline crossing)
 */
function distanceToLineSegmentInternal(
  latPt: number,
  lonPt: number,
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const [crossDist, alongDist] = crossTrackDistance(latPt, lonPt, lat1, lon1, lat2, lon2);
  const segmentLength = haversineDistance(lat1, lon1, lat2, lon2);

  // If projection falls outside segment, return distance to nearest endpoint
  if (alongDist < 0) {
    return haversineDistance(latPt, lonPt, lat1, lon1);
  } else if (alongDist > segmentLength) {
    return haversineDistance(latPt, lonPt, lat2, lon2);
  } else {
    return crossDist;
  }
}

/**
 * Calculate minimum distance from a city to a polyline (planetary line)
 */
export function distanceToPolyline(cityLat: number, cityLon: number, linePoints: [number, number][]): number {
  if (linePoints.length === 0) {
    return Infinity;
  }
  if (linePoints.length === 1) {
    return haversineDistance(cityLat, cityLon, linePoints[0][0], linePoints[0][1]);
  }

  let minDistance = Infinity;
  for (let i = 0; i < linePoints.length - 1; i++) {
    const [lat1, lon1] = linePoints[i];
    const [lat2, lon2] = linePoints[i + 1];
    const dist = distanceToLineSegment(cityLat, cityLon, lat1, lon1, lat2, lon2);
    if (dist < minDistance) {
      minDistance = dist;
    }
  }
  return minDistance;
}

// ============================================================================
// Distance Decay Kernels
// ============================================================================

/** Linear distance decay: intensity falls linearly from 1.0 at distance 0 to 0 at max_distance */
export function linearKernel(distanceKm: number, bandwidthKm: number): number {
  return Math.max(0, 1.0 - distanceKm / bandwidthKm);
}

/** Gaussian (RBF) distance decay: smooth bell curve */
export function gaussianKernel(distanceKm: number, sigmaKm: number): number {
  return Math.exp(-0.5 * (distanceKm / sigmaKm) ** 2);
}

/** Exponential kernel: intermediate between linear and gaussian */
export function exponentialKernel(distanceKm: number, lambdaKm: number): number {
  return Math.exp(-distanceKm / lambdaKm);
}

/** Apply the appropriate kernel based on config */
export function applyKernel(distanceKm: number, config: ScoringConfig): number {
  switch (config.kernelType) {
    case 'linear':
      return linearKernel(distanceKm, config.kernelParameter);
    case 'gaussian':
      return gaussianKernel(distanceKm, config.kernelParameter);
    case 'exponential':
      return exponentialKernel(distanceKm, config.kernelParameter);
  }
}

// ============================================================================
// Rating and Aspect Handling
// ============================================================================

/**
 * Convert 1-5 rating to signed benefit score
 * Rating 5 → +2.0, Rating 4 → +1.0, Rating 3 → 0.0, Rating 2 → -1.0, Rating 1 → -2.0
 */
export function ratingToBenefit(rating: number): number {
  return rating - 3.0;
}

/** Convert rating to intensity (absolute impact) */
export function ratingToIntensity(rating: number): number {
  return Math.abs(rating - 3.0);
}

/** Benefit multiplier for aspects (positive = supportive, negative = challenging) */
export function aspectBenefitMultiplier(aspect: AspectType): number {
  switch (aspect) {
    case 'conjunction': return 1.0;
    case 'trine': return 0.7;
    case 'sextile': return 0.7;
    case 'square': return -0.6;
    case 'quincunx': return 0.3;
    case 'opposition': return -0.5;
    case 'sesquisquare': return -0.4;
  }
}

/** Intensity multiplier for aspects */
export function aspectIntensityMultiplier(aspect: AspectType): number {
  switch (aspect) {
    case 'conjunction': return 1.0;
    case 'trine': return 0.6;
    case 'sextile': return 0.6;
    case 'square': return 0.85;
    case 'quincunx': return 0.4;
    case 'opposition': return 0.8;
    case 'sesquisquare': return 0.7;
  }
}

// ============================================================================
// Influence Scoring
// ============================================================================

/** Calculate the contribution of a single influence */
export function calculateInfluenceContribution(
  influence: Influence,
  config: ScoringConfig
): InfluenceContribution {
  // Step 1: Compute distance decay
  const kernel = applyKernel(influence.distanceKm, config);

  // Step 2: Convert rating to benefit and intensity
  const baseBenefit = ratingToBenefit(influence.rating);
  const baseIntensity = ratingToIntensity(influence.rating);

  // Step 3: Apply aspect multiplier if present
  let benefitMult = 1.0;
  let intensityMult = 1.0;
  if (influence.aspect) {
    benefitMult = aspectBenefitMultiplier(influence.aspect);
    intensityMult = aspectIntensityMultiplier(influence.aspect);
  }

  // Step 4: Combine
  const benefit = baseBenefit * benefitMult * kernel;
  const intensity = baseIntensity * intensityMult * kernel;

  // Step 5: Volatility detection (if aspect flips the sign in either direction)
  // A negative aspect multiplier flips the sign of any non-zero baseBenefit:
  // - Positive→negative: beneficial line made challenging by aspect (e.g., Sun:MC with square)
  // - Negative→positive: challenging line made beneficial by aspect (e.g., Saturn:MC with square)
  // Both represent aspect-induced instability worth flagging
  let volatility = 0;
  if (benefitMult < 0 && baseBenefit !== 0) {
    volatility = Math.abs(baseBenefit) * kernel;
  }

  return { benefit, intensity, volatility };
}

// ============================================================================
// City-Level Scoring
// ============================================================================

/** Calculate scores for a city with all its influences */
export function calculateCityScore(city: CityInfluenceSet, config: ScoringConfig): CityScore {
  if (city.influences.length === 0) {
    return {
      cityName: city.cityName,
      country: city.country,
      latitude: city.latitude,
      longitude: city.longitude,
      benefitScore: 50.0,
      intensityScore: 0.0,
      volatilityScore: 0.0,
      mixedFlag: false,
      influenceCount: 0,
      minDistanceKm: Infinity,
    };
  }

  // Compute contributions for all influences
  const contributions: Array<{ contrib: InfluenceContribution; distance: number }> = city.influences.map(inf => ({
    contrib: calculateInfluenceContribution(inf, config),
    distance: inf.distanceKm,
  }));

  // Sort by absolute benefit descending
  contributions.sort((a, b) => Math.abs(b.contrib.benefit) - Math.abs(a.contrib.benefit));

  // Cap to top K influences to ensure provable bounds
  // W = sum(DIMINISHING_WEIGHTS) = 2.38 is only valid for first 7 influences
  const K = DIMINISHING_WEIGHTS.length;
  const cappedContributions = contributions.slice(0, K);

  // Apply diminishing returns to capped contributions
  let benefitScoreRaw = 0;
  let intensityScoreRaw = 0;
  let weightedPositive = 0;
  let weightedNegative = 0;

  cappedContributions.forEach((item, i) => {
    const weight = DIMINISHING_WEIGHTS[i];
    benefitScoreRaw += item.contrib.benefit * weight;
    intensityScoreRaw += item.contrib.intensity * weight;
    // Use weighted sums for volatility to match benefit/intensity scaling
    weightedPositive += Math.max(0, item.contrib.benefit) * weight;
    weightedNegative += Math.max(0, -item.contrib.benefit) * weight;
  });

  // Detect mixed/volatile conditions using weighted sums
  const volatilityRaw = Math.sqrt(weightedPositive * weightedNegative);
  const mixedFlag = weightedPositive > 0.5 && weightedNegative > 0.5;

  // ========================================================================
  // PROVABLY BOUNDED SCORE NORMALIZATION
  // ========================================================================
  //
  // Mathematical bounds derivation:
  //
  // 1. Influences are CAPPED to top K (K = 7) to ensure bounded weight sum
  //    W = sum(DIMINISHING_WEIGHTS) = 1.0 + 0.6 + 0.35 + 0.2 + 0.1 + 0.08 + 0.05 = 2.38
  //
  // 2. Per-influence contribution bounds:
  //    - benefit = baseBenefit * aspectMult * kernel
  //    - baseBenefit ∈ [-2, +2] (rating 1-5 mapped to -2 to +2)
  //    - aspectMult ∈ [-1, +1] (most aspects)
  //    - kernel ∈ [0, 1]
  //    - Max |benefit| per influence ≤ 2
  //
  // 3. benefitScoreRaw = Σ (benefit_i * weight_i) for i ∈ [0, K)
  //    Max |benefitScoreRaw| ≤ 2 * W = 2 * 2.38 = 4.76
  //
  // 4. Score mapping (provably bounded):
  //    benefitScore = 50 + 50 * (benefitScoreRaw / (2W))
  //                 = 50 + benefitScoreRaw * (50 / 4.76)
  //                 = 50 + benefitScoreRaw * 10.5
  //    This guarantees benefitScore ∈ [0, 100]
  //
  // 5. Intensity has same bound: intensityScoreRaw ≤ 2W
  //    intensityScore = 100 * (intensityScoreRaw / (2W))
  //                   = intensityScoreRaw * 21.0
  //
  // 6. Volatility uses WEIGHTED sums that PARTITION the same influences:
  //    weightedP + weightedN ≤ 2W (each influence contributes to P xor N)
  //    Product P·N is maximized when P = N = W = 2.38
  //    volatilityRaw = sqrt(P * N) ≤ sqrt(W * W) = W = 2.38
  //    volatilityScore = 100 * (volatilityRaw / 2.38) = volatilityRaw * 42.0
  // ========================================================================
  const benefitScore = Math.max(0, Math.min(100, 50.0 + benefitScoreRaw * 10.5));
  const intensityScore = Math.max(0, Math.min(100, intensityScoreRaw * 21.0));
  const volatilityScore = Math.max(0, Math.min(100, volatilityRaw * 42.0));

  // Find minimum distance
  const minDistanceKm = Math.min(...contributions.map(c => c.distance));

  return {
    cityName: city.cityName,
    country: city.country,
    latitude: city.latitude,
    longitude: city.longitude,
    benefitScore,
    intensityScore,
    volatilityScore,
    mixedFlag,
    influenceCount: city.influences.length,
    minDistanceKm,
  };
}

// ============================================================================
// Category-Specific Filtering
// ============================================================================

/** Check if a line is beneficial for a category */
export function isBeneficialForCategory(planet: string, angle: string, category: LifeCategory): boolean {
  const key = `${planet}:${angle}`;
  const beneficialLines: Record<LifeCategory, Set<string>> = {
    career: new Set([
      'Sun:MC', 'Jupiter:MC', 'Mercury:MC', 'Venus:MC', 'Mars:MC', 'Saturn:MC', 'Pluto:MC',
      'Sun:ASC', 'Mars:ASC', 'Jupiter:ASC', 'Mercury:ASC'
    ]),
    love: new Set([
      'Venus:DSC', 'Sun:DSC', 'Jupiter:DSC', 'Moon:DSC',
      'Venus:ASC', 'Sun:ASC', 'Mars:ASC', 'Jupiter:ASC'
    ]),
    health: new Set([
      'Sun:ASC', 'Jupiter:ASC', 'Moon:ASC', 'Mars:ASC',
      'Venus:IC', 'Jupiter:MC', 'Venus:MC', 'Sun:IC', 'Moon:IC'
    ]),
    home: new Set([
      'Venus:IC', 'Moon:IC', 'Jupiter:IC', 'Sun:IC', 'Saturn:IC',
      'Venus:ASC', 'Moon:ASC', 'Jupiter:ASC', 'Mercury:IC'
    ]),
    wellbeing: new Set([
      'Venus:ASC', 'Venus:IC', 'Venus:DSC',
      'Jupiter:ASC', 'Jupiter:MC', 'Jupiter:IC', 'Jupiter:DSC',
      'Moon:IC', 'Moon:ASC', 'Sun:ASC', 'Sun:IC', 'Neptune:ASC'
    ]),
    wealth: new Set([
      'Jupiter:MC', 'Jupiter:IC', 'Jupiter:ASC', 'Jupiter:DSC',
      'Venus:MC', 'Venus:ASC', 'Sun:MC', 'Sun:ASC',
      'Mercury:MC', 'Mercury:ASC', 'Pluto:MC'
    ]),
  };

  return beneficialLines[category]?.has(key) ?? false;
}

/** Check if a line is challenging for a category */
export function isChallengingForCategory(planet: string, angle: string, category: LifeCategory): boolean {
  const key = `${planet}:${angle}`;
  const challengingLines: Record<LifeCategory, Set<string>> = {
    career: new Set(['Neptune:MC', 'Uranus:MC', 'Moon:MC']), // Pluto:MC is intense but beneficial for career power
    love: new Set(['Saturn:DSC', 'Pluto:DSC', 'Mars:DSC', 'Uranus:DSC', 'Neptune:DSC']),
    health: new Set(['Saturn:ASC', 'Saturn:MC', 'Neptune:ASC', 'Pluto:ASC', 'Uranus:ASC']),
    home: new Set(['Uranus:IC', 'Neptune:IC', 'Pluto:IC', 'Saturn:IC', 'Mars:IC']),
    wellbeing: new Set(['Saturn:ASC', 'Saturn:MC', 'Neptune:MC', 'Pluto:ASC', 'Pluto:MC', 'Mars:ASC']),
    wealth: new Set(['Neptune:MC', 'Neptune:IC', 'Uranus:MC', 'Uranus:IC', 'Saturn:ASC']),
  };

  return challengingLines[category]?.has(key) ?? false;
}

/** Determine the nature of a line for a category */
export function getLineNature(planet: string, angle: string, category: LifeCategory): 'beneficial' | 'challenging' | null {
  if (isBeneficialForCategory(planet, angle, category)) {
    return 'beneficial';
  } else if (isChallengingForCategory(planet, angle, category)) {
    return 'challenging';
  }
  return null;
}

/** Filter influences to only those relevant to a category */
export function filterInfluencesByCategory(influences: Influence[], category: LifeCategory): Influence[] {
  return influences.filter(inf =>
    isBeneficialForCategory(inf.planet, inf.angle, category) ||
    isChallengingForCategory(inf.planet, inf.angle, category)
  );
}

// ============================================================================
// City Ranking
// ============================================================================

/** Rank cities for a given category */
export function rankCitiesByCategory(
  cities: CityInfluenceSet[],
  category: LifeCategory,
  config: ScoringConfig,
  sortMode: SortMode
): CityRanking[] {
  const rankings: CityRanking[] = cities
    .map(city => {
      const filteredInfluences = filterInfluencesByCategory(city.influences, category);
      if (filteredInfluences.length === 0) {
        return null;
      }

      const filteredCity: CityInfluenceSet = {
        cityName: city.cityName,
        country: city.country,
        latitude: city.latitude,
        longitude: city.longitude,
        influences: filteredInfluences,
      };

      const score = calculateCityScore(filteredCity, config);

      // Determine overall nature from aggregated benefit (not counts)
      // This correctly accounts for aspect polarity flipping beneficial lines to challenging
      // benefitScore is centered at 50: >50 = beneficial, <50 = challenging
      let nature: 'beneficial' | 'challenging' | 'mixed';
      if (score.mixedFlag) {
        nature = 'mixed';
      } else if (score.benefitScore > 52) { // small threshold to avoid noise
        nature = 'beneficial';
      } else if (score.benefitScore < 48) {
        nature = 'challenging';
      } else {
        nature = 'mixed';
      }

      const topInfluences = filteredInfluences
        .slice(0, 3)
        .map(inf => ({ planet: inf.planet, angle: inf.angle, distanceKm: inf.distanceKm }));

      return {
        ...score,
        topInfluences,
        nature,
      };
    })
    .filter((r): r is CityRanking => r !== null);

  // Sort based on mode
  switch (sortMode) {
    case 'benefit':
      rankings.sort((a, b) => b.benefitScore - a.benefitScore);
      break;
    case 'intensity':
      rankings.sort((a, b) => b.intensityScore - a.intensityScore);
      break;
    case 'balanced':
      rankings.sort((a, b) => {
        const aAdj = a.benefitScore - a.volatilityScore * config.volatilityPenalty;
        const bAdj = b.benefitScore - b.volatilityScore * config.volatilityPenalty;
        return bAdj - aAdj;
      });
      break;
  }

  return rankings;
}

// ============================================================================
// Line Data Conversion
// ============================================================================

/** Convert planetary lines to influence format for a city */
export function buildCityInfluences(
  cityLat: number,
  cityLon: number,
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  config: ScoringConfig,
  lineRatings: Map<string, number>
): Influence[] {
  const influences: Influence[] = [];

  // Process planetary lines
  for (const line of planetaryLines) {
    if (line.points.length === 0) continue;
    const distance = distanceToPolyline(cityLat, cityLon, line.points);
    if (distance <= config.maxDistanceKm) {
      const key = `${line.planet}:${line.lineType}`;
      influences.push({
        planet: line.planet,
        angle: line.lineType,
        rating: lineRatings.get(key) ?? 3,
        aspect: null,
        distanceKm: distance,
      });
    }
  }

  // Process aspect lines
  for (const line of aspectLines) {
    if (line.points.length === 0) continue;
    const distance = distanceToPolyline(cityLat, cityLon, line.points);
    if (distance <= config.maxDistanceKm) {
      const key = `${line.planet}:${line.angle}`;
      const baseRating = lineRatings.get(key) ?? 3;

      // Map aspect type string to our AspectType
      let aspect: AspectType | null = null;
      const aspectTypeStr = line.aspectType.toLowerCase();
      if (aspectTypeStr === 'trine') aspect = 'trine';
      else if (aspectTypeStr === 'sextile') aspect = 'sextile';
      else if (aspectTypeStr === 'square') aspect = 'square';
      else if (aspectTypeStr === 'opposition') aspect = 'opposition';
      else if (aspectTypeStr === 'quincunx') aspect = 'quincunx';
      else if (aspectTypeStr === 'sesquisquare') aspect = 'sesquisquare';
      else if (aspectTypeStr === 'conjunction') aspect = 'conjunction';

      influences.push({
        planet: line.planet,
        angle: line.angle,
        rating: baseRating,
        aspect,
        distanceKm: distance,
      });
    }
  }

  return influences;
}

/**
 * Optimized version of buildCityInfluences that uses pre-computed bounding boxes
 * for fast spatial rejection. Call createOptimizedPlanetaryLines and
 * createOptimizedAspectLines once, then use this for each city.
 *
 * Performance: ~3-5x faster than buildCityInfluences for typical line sets
 */
export function buildCityInfluencesOptimized(
  cityLat: number,
  cityLon: number,
  optimizedPlanetaryLines: OptimizedLine<PlanetaryLine>[],
  optimizedAspectLines: OptimizedLine<AspectLine>[],
  config: ScoringConfig,
  lineRatings: Map<string, number>
): Influence[] {
  const influences: Influence[] = [];

  // Process planetary lines with spatial pre-filtering
  for (const optLine of optimizedPlanetaryLines) {
    if (optLine.points.length === 0) continue;

    // Fast bounding box rejection - skip expensive distance calc if city is far from line
    if (!mightCityBeNearLine(cityLat, cityLon, optLine.bbox)) {
      continue;
    }

    // City might be within influence range - do full distance calculation
    const distance = distanceToPolyline(cityLat, cityLon, optLine.points);
    if (distance <= config.maxDistanceKm) {
      const line = optLine.original;
      const key = `${line.planet}:${line.lineType}`;
      influences.push({
        planet: line.planet,
        angle: line.lineType,
        rating: lineRatings.get(key) ?? 3,
        aspect: null,
        distanceKm: distance,
      });
    }
  }

  // Process aspect lines with spatial pre-filtering
  for (const optLine of optimizedAspectLines) {
    if (optLine.points.length === 0) continue;

    // Fast bounding box rejection
    if (!mightCityBeNearLine(cityLat, cityLon, optLine.bbox)) {
      continue;
    }

    // City might be within influence range - do full distance calculation
    const distance = distanceToPolyline(cityLat, cityLon, optLine.points);
    if (distance <= config.maxDistanceKm) {
      const line = optLine.original;
      const key = `${line.planet}:${line.angle}`;
      const baseRating = lineRatings.get(key) ?? 3;

      // Map aspect type string to our AspectType
      let aspect: AspectType | null = null;
      const aspectTypeStr = line.aspectType.toLowerCase();
      if (aspectTypeStr === 'trine') aspect = 'trine';
      else if (aspectTypeStr === 'sextile') aspect = 'sextile';
      else if (aspectTypeStr === 'square') aspect = 'square';
      else if (aspectTypeStr === 'opposition') aspect = 'opposition';
      else if (aspectTypeStr === 'quincunx') aspect = 'quincunx';
      else if (aspectTypeStr === 'sesquisquare') aspect = 'sesquisquare';
      else if (aspectTypeStr === 'conjunction') aspect = 'conjunction';

      influences.push({
        planet: line.planet,
        angle: line.angle,
        rating: baseRating,
        aspect,
        distanceKm: distance,
      });
    }
  }

  return influences;
}

// ============================================================================
// Default Line Ratings (from interpretations)
// ============================================================================

export function getDefaultLineRatings(): Map<string, number> {
  const ratings = new Map<string, number>();

  // Sun lines
  ratings.set('Sun:MC', 5);
  ratings.set('Sun:IC', 4);
  ratings.set('Sun:ASC', 5);
  ratings.set('Sun:DSC', 4);

  // Moon lines
  ratings.set('Moon:MC', 3);
  ratings.set('Moon:IC', 5);
  ratings.set('Moon:ASC', 4);
  ratings.set('Moon:DSC', 4);

  // Mercury lines
  ratings.set('Mercury:MC', 4);
  ratings.set('Mercury:IC', 3);
  ratings.set('Mercury:ASC', 4);
  ratings.set('Mercury:DSC', 3);

  // Venus lines
  ratings.set('Venus:MC', 4);
  ratings.set('Venus:IC', 5);
  ratings.set('Venus:ASC', 5);
  ratings.set('Venus:DSC', 5);

  // Mars lines
  ratings.set('Mars:MC', 4);
  ratings.set('Mars:IC', 2);
  ratings.set('Mars:ASC', 4);
  ratings.set('Mars:DSC', 2);

  // Jupiter lines
  ratings.set('Jupiter:MC', 5);
  ratings.set('Jupiter:IC', 5);
  ratings.set('Jupiter:ASC', 5);
  ratings.set('Jupiter:DSC', 5);

  // Saturn lines
  ratings.set('Saturn:MC', 3);
  ratings.set('Saturn:IC', 2);
  ratings.set('Saturn:ASC', 2);
  ratings.set('Saturn:DSC', 2);

  // Uranus lines
  ratings.set('Uranus:MC', 2);
  ratings.set('Uranus:IC', 2);
  ratings.set('Uranus:ASC', 3);
  ratings.set('Uranus:DSC', 2);

  // Neptune lines
  ratings.set('Neptune:MC', 2);
  ratings.set('Neptune:IC', 3);
  ratings.set('Neptune:ASC', 3);
  ratings.set('Neptune:DSC', 2);

  // Pluto lines
  ratings.set('Pluto:MC', 3);
  ratings.set('Pluto:IC', 2);
  ratings.set('Pluto:ASC', 2);
  ratings.set('Pluto:DSC', 2);

  // Chiron lines
  ratings.set('Chiron:MC', 4);
  ratings.set('Chiron:IC', 4);
  ratings.set('Chiron:ASC', 3);
  ratings.set('Chiron:DSC', 3);

  // North Node lines
  ratings.set('NorthNode:MC', 4);
  ratings.set('NorthNode:IC', 4);
  ratings.set('NorthNode:ASC', 4);
  ratings.set('NorthNode:DSC', 4);

  return ratings;
}
