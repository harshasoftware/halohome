# Scout Location Scoring Algorithm

This document describes the Scout feature's location scoring algorithms, which analyze planetary lines to recommend optimal locations for different life categories.

## Overview

The Scout feature scans world cities against a person's astrocartography lines to identify locations that are beneficial or challenging for specific life areas (career, love, health, home, wellbeing, wealth).

---

## Algorithm Versions

### Version History

| Version | File | Backend | Status |
|---------|------|---------|--------|
| V1 | `scout-utils.ts` | TypeScript (main thread) | Legacy, still exported |
| C2 WASM | `astro-core/scout.rs` | Rust/WASM (main thread) | **Primary** - used when WASM available |
| C2 TS | `scout-algorithm-c2.ts` | TypeScript (Web Worker) | **Fallback** - used when WASM unavailable |

### Runtime Selection

The `useScoutWasm` hook automatically selects the best backend:

1. **Try WASM first** - Fast Rust implementation (~150ms for 3000 cities)
2. **Fall back to Web Worker** - TypeScript C2 in separate thread (~800ms, non-blocking)

```
┌─────────────────────────────────────────────────────────┐
│                    useScoutWasm Hook                     │
├─────────────────────────────────────────────────────────┤
│  1. loadWasmModule()                                    │
│     ├─ Success → Use WASM C2 (main thread, fast)       │
│     └─ Failure → Initialize Web Worker fallback         │
│                  └─ Worker uses TypeScript C2           │
└─────────────────────────────────────────────────────────┘
```

---

## V1 Algorithm (Legacy)

**File:** `src/features/globe/utils/scout-utils.ts`

The original implementation uses a simplified approach optimized for quick results.

### Key Characteristics

- **Distance Calculation:** Haversine formula with linear segment projection
- **Scoring:** Simple rating-based (1-5 scale from interpretations)
- **Influence Radius:** Fixed 500km maximum
- **Execution:** Main thread (can block UI on large datasets)

### Distance to Line (V1)

```typescript
function distanceToLine(city: City, linePoints: [number, number][]): number {
  // Uses linear interpolation for segment projection
  // t = projection parameter clamped to [0, 1]
  const t = Math.max(0, Math.min(1,
    ((city.lat - lat1) * (lat2 - lat1) + (city.lng - lng1) * (lng2 - lng1)) /
    ((lat2 - lat1) ** 2 + (lng2 - lng1) ** 2 || 1)
  ));
  const nearestLat = lat1 + t * (lat2 - lat1);
  const nearestLng = lng1 + t * (lng2 - lng1);
  return haversineDistance(city.lat, city.lng, nearestLat, nearestLng);
}
```

### Scoring (V1)

```typescript
function calculateOverallScore(influences: LineInfluence[]): number {
  const totalRating = influences.reduce((sum, inf) => sum + inf.rating, 0);
  const avgRating = totalRating / influences.length;
  // Bonus for multiple influences (up to +30)
  const multiInfluenceBonus = Math.min(influences.length - 1, 3) * 10;
  return Math.round(avgRating * 20 + multiInfluenceBonus);
}
```

### Category Line Mapping (V1)

Lines are classified as beneficial or challenging based on:
1. Rating >= 4 from `LINE_INTERPRETATIONS` = beneficial
2. Rating <= 2 = challenging
3. Category-specific keyword matching against line themes

### Limitations of V1

- Linear projection introduces geodetic errors at high latitudes
- No distance decay (binary influence within 500km)
- No handling of mixed beneficial/challenging influences
- Main thread execution blocks UI during computation

---

## C2 Algorithm (Current)

**Files:**
- TypeScript: `src/features/globe/utils/scout-algorithm-c2.ts`
- Rust/WASM: `src/astro-core/src/scout.rs`
- Worker: `src/features/globe/workers/scout.worker.ts`

The C2 (Cycle 2) algorithm provides geodetically accurate scoring with continuous influence fields.

### Key Characteristics

- **Distance Calculation:** Spherical cross-track distance (mean Earth radius)
- **Influence Field:** Continuous decay using configurable kernels
- **Scoring:** Separated benefit/intensity with volatility detection
- **Execution:** WASM primary, Web Worker fallback

### Known Limitations

| Issue | Impact | Status |
|-------|--------|--------|
| Spherical model, not WGS84 ellipsoid | ~0.5% distance error globally | Acceptable for city-level scoring |

### Recent Fixes (C2.5)

Applied to both TypeScript (`scout-algorithm-c2.ts`) and Rust (`scout.rs`):

| Issue | Fix Applied |
|-------|-------------|
| Volatility bound miscalculated | Corrected: P + N ≤ 2W (partition, not independent), so max P·N when P = N = W = 2.38, giving volatilityRaw ≤ 2.38 |
| Volatility scaling wrong | Changed `* 21.0` to `* 42.0` (100/2.38 ≈ 42.0, not 100/4.76) |
| Along-track division unsafe | Added safe denominator guard before dividing: `cos(δ13)/safeDenom` where `safeDenom = abs(cos(δxt)) < ε ? ±ε : cos(δxt)` |

### Previous Fixes (C2.4)

| Issue | Fix Applied |
|-------|-------------|
| Cross-track doc imprecision | Clarified that cos(δxt)→0 makes ratio numerically unstable (not "point on line"), clamping ensures robustness |
| Volatility scaling inconsistent | Changed `* 20.0` to `* 21.0` (same as intensity: 100/4.76) for consistent provable bounds |
| Volatility asymmetric | Now flags **any** sign flip: `benefitMult < 0 && baseBenefit !== 0` (both positive→negative AND negative→positive) |
| Missing regression tests | Added 11 tests: cross-track golden values (dateline, high-lat, endpoint), bounds verification, volatility directions |

### Previous Fixes (C2.3)

| Issue | Fix Applied |
|-------|-------------|
| Pluto:MC category contradiction | Removed from Career challenging list (was in both beneficial AND challenging in Rust) |
| EPSILON branch conceptually wrong | Removed; cos(δxt)≈0 means cross-track ~90° (far from line), not on great circle. Rely on ratio clamping. |
| Provable bounds not actually provable | Cap to top K=7 influences (removed unbounded `?? 0.05` tail) |
| Volatility scale mismatch | Use weighted sums with DIMINISHING_WEIGHTS (was unweighted while benefit/intensity were weighted) |

### Previous Fixes (C2.2)

| Issue | Fix Applied |
|-------|-------------|
| Dateline longitude unwrapping | Added `unwrapLongitude()` to ensure Δλ ∈ [-180, 180] before splitting |
| Provable score bounds | Documented mathematical derivation of scaling constants |
| Error estimate | Updated from ~0.3% to ~0.5% for accuracy |

### Previous Fixes (C2.1)

| Issue | Fix Applied |
|-------|-------------|
| Dateline segments skipped | Now splits at ±180° instead of skipping |
| Cross-track formula missing `asin()` | Added `asin()` for correct angular distance |
| Along-track always positive | Added sign from `cos(Δbearing)` for proper endpoint clamping |
| Volatility in raw units (0-5) | Normalized to 0-100 scale like other scores |
| Nature from line counts | Now uses aggregated `benefitScore` to account for aspect polarity |
| Score scaling comment wrong | DIMINISHING_WEIGHTS sum = 2.38 (was incorrectly noted as 1.85) |

### Constants (Matching Rust)

```typescript
const EARTH_RADIUS_KM = 6371.0;  // WGS84 mean radius
const DEFAULT_MAX_DISTANCE_KM = 500.0;
const DIMINISHING_WEIGHTS = [1.0, 0.6, 0.35, 0.2, 0.1, 0.08, 0.05];
```

### Geodetic Functions (Spherical Model)

> **Note:** These functions use a spherical Earth approximation (R = 6371 km).
> For true WGS84 ellipsoid accuracy, use GeographicLib or similar.
> Spherical error is typically within ~0.5% globally, acceptable for city-level scoring.

#### Haversine Distance

Great-circle distance between two points on a sphere:

```typescript
function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return EARTH_RADIUS_KM * c;
}
```

#### Cross-Track Distance

Perpendicular distance from point to great-circle arc:

```typescript
function crossTrackDistance(
  latPt, lonPt,  // City
  lat1, lon1,    // Line start
  lat2, lon2     // Line end
): [crossTrack: number, alongTrack: number] {
  // Angular distance from start to point
  const δ13 = haversineDistance(lat1, lon1, latPt, lonPt) / R;

  // Bearings θ13 (start→point) and θ12 (start→end)
  const θ13 = initialBearing(lat1, lon1, latPt, lonPt);
  const θ12 = initialBearing(lat1, lon1, lat2, lon2);

  // Cross-track (angular): δxt = asin(sin(δ13) * sin(θ13 - θ12))
  const dxtRaw = Math.sin(δ13) * Math.sin(θ13 - θ12);
  const δxt = Math.asin(Math.max(-1, Math.min(1, dxtRaw))); // clamp for safety
  const crossTrack = Math.abs(δxt) * R;

  // Along-track (signed): enables proper endpoint clamping
  // Safe denominator guard prevents Infinity before clamping when cos(δxt) ≈ 0
  const EPSILON = 1e-10;
  const cosDxt = Math.cos(δxt);
  const safeDenom = Math.abs(cosDxt) < EPSILON ? (cosDxt >= 0 ? EPSILON : -EPSILON) : cosDxt;
  const cosD13overCosXt = Math.cos(δ13) / safeDenom;
  const ratio = Math.max(-1, Math.min(1, cosD13overCosXt));
  const δat = Math.acos(ratio);
  const sign = Math.cos(θ13 - θ12) >= 0 ? 1 : -1;
  const alongTrack = isNaN(δat) ? 0 : sign * δat * R;

  return [crossTrack, alongTrack];
}
```

> **Note:** The `asin()` in cross-track and signed along-track are critical for accuracy near the 500km cutoff and proper segment endpoint handling. The safe denominator guard prevents Infinity from reaching the clamp when cos(δxt)→0 (extreme ~90° cross-track, ~10,000km from the path). While this extreme configuration is highly unlikely in our 500-600km influence band, it's geometrically possible depending on point-to-great-circle configuration, so the guard ensures robustness.
>
> **Reference:** The cross-track and along-track formulas are standard spherical navigation formulas (see [Movable Type Scripts](https://www.movable-type.co.uk/scripts/latlong.html) or aviation formularies).

#### Distance to Polyline

Minimum distance from city to entire planetary line:

```typescript
function distanceToPolyline(cityLat, cityLon, linePoints): number {
  // Iterates segments, finds minimum cross-track distance
  // Handles segment boundary constraints
  // Splits dateline-crossing segments at ±180° for accurate Pacific city distances
}
```

#### Dateline Handling

Segments crossing the antimeridian (±180°) are split into two sub-segments. Proper longitude unwrapping ensures correct crossing direction:

```typescript
// Unwrap longitude to be continuous with reference
function unwrapLongitude(lon: number, refLon: number): number {
  let delta = lon - refLon;
  while (delta > 180) delta -= 360;
  while (delta < -180) delta += 360;
  return refLon + delta;
}

// Interpolate crossing with proper unwrapping
function interpolateDatelineCrossing(lat1, lon1, lat2, lon2): { lat: number; crossingLon: number } {
  const lon2Unwrapped = unwrapLongitude(lon2, lon1);
  // Eastward past +180 → cross +180; westward past -180 → cross -180
  const crossingLon = lon2Unwrapped > lon1 ? 180 : -180;
  const t = (crossingLon - lon1) / (lon2Unwrapped - lon1);
  return { lat: lat1 + t * (lat2 - lat1), crossingLon };
}

function distanceToLineSegment(latPt, lonPt, lat1, lon1, lat2, lon2): number {
  // Detect dateline crossing (longitude jump > 180°)
  if (Math.abs(lon2 - lon1) > 180) {
    const crossing = interpolateDatelineCrossing(lat1, lon1, lat2, lon2);
    const crossLon2 = crossing.crossingLon === 180 ? -180 : 180;
    // Split into two segments
    const dist1 = distanceToSegment(latPt, lonPt, lat1, lon1, crossing.lat, crossing.crossingLon);
    const dist2 = distanceToSegment(latPt, lonPt, crossing.lat, crossLon2, lat2, lon2);
    return Math.min(dist1, dist2);
  }
  return distanceToSegmentInternal(...);
}
```

> **Why unwrap?** Without unwrapping, segments that cross the antimeridian in different directions (e.g., 170°→-170° vs -170°→170°) could be split at the wrong meridian.

### Distance Decay Kernels

The C2 algorithm uses continuous decay functions instead of binary thresholds:

| Kernel | Formula | Use Case |
|--------|---------|----------|
| Linear | `max(0, 1 - d/bandwidth)` | Simple, fast |
| Gaussian | `exp(-0.5 * (d/σ)²)` | Smooth, default |
| Exponential | `exp(-d/λ)` | Medium falloff |

```typescript
function gaussianKernel(distanceKm: number, sigmaKm: number): number {
  return Math.exp(-0.5 * (distanceKm / sigmaKm) ** 2);
}
```

### Rating System

#### Rating to Benefit

Converts 1-5 rating to signed benefit score:

```typescript
function ratingToBenefit(rating: number): number {
  return rating - 3.0;
  // Rating 5 → +2.0 (strongly beneficial)
  // Rating 4 → +1.0 (beneficial)
  // Rating 3 →  0.0 (neutral)
  // Rating 2 → -1.0 (challenging)
  // Rating 1 → -2.0 (strongly challenging)
}
```

#### Aspect Multipliers

Aspects modify the base line influence:

| Aspect | Benefit Mult | Intensity Mult |
|--------|--------------|----------------|
| Conjunction | 1.0 | 1.0 |
| Trine | 0.7 | 0.6 |
| Sextile | 0.7 | 0.6 |
| Square | -0.6 | 0.85 |
| Opposition | -0.5 | 0.8 |
| Quincunx | 0.3 | 0.4 |
| Sesquisquare | -0.4 | 0.7 |

### Influence Contribution

Each planetary influence contributes:

```typescript
function calculateInfluenceContribution(influence, config): {
  benefit: number;    // Signed score
  intensity: number;  // Absolute impact
  volatility: number; // Mixed-influence penalty
} {
  const kernel = applyKernel(influence.distanceKm, config);
  const baseBenefit = ratingToBenefit(influence.rating);
  const baseIntensity = ratingToIntensity(influence.rating);

  // Apply aspect multipliers if present
  let benefit = baseBenefit * benefitMult * kernel;
  let intensity = baseIntensity * intensityMult * kernel;

  // Detect volatility (aspect flips sign in either direction)
  // - Positive→negative: beneficial line made challenging (e.g., Sun:MC with square)
  // - Negative→positive: challenging line made beneficial (e.g., Saturn:MC with square)
  // Proxy: benefitMult < 0 implies sign flip when baseBenefit !== 0
  // (since negative multipliers always flip sign: pos*neg=neg, neg*neg=pos)
  let volatility = 0;
  if (benefitMult < 0 && baseBenefit !== 0) {
    volatility = Math.abs(baseBenefit) * kernel;
  }

  return { benefit, intensity, volatility };
}
```

### City Scoring

Cities are scored by aggregating all nearby influences with diminishing returns:

```typescript
function calculateCityScore(city: CityInfluenceSet, config): CityScore {
  // 1. Calculate contributions for all influences
  const contributions = city.influences.map(inf => ({
    contrib: calculateInfluenceContribution(inf, config),
    distance: inf.distanceKm,
  }));

  // 2. Sort by absolute benefit descending
  contributions.sort((a, b) => Math.abs(b.contrib.benefit) - Math.abs(a.contrib.benefit));

  // 3. Cap to top K influences for provable bounds (K = DIMINISHING_WEIGHTS.length = 7)
  const K = DIMINISHING_WEIGHTS.length;
  const cappedContributions = contributions.slice(0, K);

  // 4. Apply diminishing returns with bounded weights
  let benefitScoreRaw = 0;
  let intensityScoreRaw = 0;
  let weightedPositive = 0;
  let weightedNegative = 0;

  cappedContributions.forEach((item, i) => {
    const weight = DIMINISHING_WEIGHTS[i];
    benefitScoreRaw += item.contrib.benefit * weight;
    intensityScoreRaw += item.contrib.intensity * weight;
    weightedPositive += Math.max(0, item.contrib.benefit) * weight;
    weightedNegative += Math.max(0, -item.contrib.benefit) * weight;
  });

  // 5. Detect mixed/volatile conditions (using weighted sums for consistency)
  const volatilityRaw = Math.sqrt(weightedPositive * weightedNegative);
  const mixedFlag = weightedPositive > 0.5 && weightedNegative > 0.5;

  // 6. Provably bounded normalization to 0-100 scale
  // Mathematical derivation:
  // - W = sum(DIMINISHING_WEIGHTS) = 2.38 exactly (capped at K=7, no unbounded tail)
  // - Max |benefit| per influence ≤ 2:
  //     * rating ∈ [-2, +2], |aspectMult| ≤ 1 (see aspect table), kernel ∈ [0, 1]
  //     * |baseBenefit * aspectMult * kernel| ≤ 2 * 1 * 1 = 2
  // - Max |benefitScoreRaw| ≤ 2 * W = 4.76
  // - benefitScore = 50 + raw * 10.5 → ∈ [0, 100] ✓
  // - intensityScore = raw * 21.0 → ∈ [0, 100] ✓ (100/4.76 ≈ 21.0)
  // - volatility = sqrt(weightedP * weightedN) where P + N ≤ 2W (partition)
  //   Since P and N partition the same influences, max P·N when P = N = W = 2.38
  //   volatilityRaw ≤ sqrt(W * W) = W = 2.38
  // - volatilityScore = raw * 42.0 → ∈ [0, 100] ✓ (100/2.38 ≈ 42.0)
  const benefitScore = (50.0 + benefitScoreRaw * 10.5).clamp(0, 100);
  const intensityScore = (intensityScoreRaw * 21.0).clamp(0, 100);
  const volatilityScore = (volatilityRaw * 42.0).clamp(0, 100);

  return { benefitScore, intensityScore, volatilityScore, mixedFlag, ... };
}
```

### Scoring Configuration

```typescript
interface ScoringConfig {
  kernelType: 'linear' | 'gaussian' | 'exponential';
  kernelParameter: number;  // bandwidth/sigma/lambda
  maxDistanceKm: number;
  volatilityPenalty: number;
}

// Default balanced config
function getBalancedConfig(): ScoringConfig {
  return {
    kernelType: 'gaussian',
    kernelParameter: 180.0,  // σ = 180 km
    maxDistanceKm: 500.0,
    volatilityPenalty: 0.3,
  };
}
```

### Category Line Mapping (C2)

Explicit beneficial/challenging line sets per category:

```typescript
const beneficialLines: Record<LifeCategory, Set<string>> = {
  career: new Set([
    'Sun:MC', 'Jupiter:MC', 'Mercury:MC', 'Venus:MC', 'Mars:MC',
    'Saturn:MC', 'Pluto:MC', 'Sun:ASC', 'Mars:ASC', 'Jupiter:ASC', 'Mercury:ASC'
  ]),
  love: new Set([
    'Venus:DSC', 'Sun:DSC', 'Jupiter:DSC', 'Moon:DSC',
    'Venus:ASC', 'Sun:ASC', 'Mars:ASC', 'Jupiter:ASC'
  ]),
  // ... etc
};

const challengingLines: Record<LifeCategory, Set<string>> = {
  // Note: Pluto:MC is NOT here - it's intense but beneficial for career power
  career: new Set(['Neptune:MC', 'Uranus:MC', 'Moon:MC']),
  love: new Set(['Saturn:DSC', 'Pluto:DSC', 'Mars:DSC', 'Uranus:DSC', 'Neptune:DSC']),
  // ... etc
};
```

### Ranking Modes

```typescript
type SortMode = 'benefit' | 'intensity' | 'balanced';

// Balanced mode (default):
// Now works correctly since volatilityScore is also 0-100
rankings.sort((a, b) => {
  const aAdj = a.benefitScore - a.volatilityScore * config.volatilityPenalty;
  const bAdj = b.benefitScore - b.volatilityScore * config.volatilityPenalty;
  return bAdj - aAdj;
});
```

### Nature Classification

The `nature` field indicates overall benefit/challenge for a city. It's derived from the **aggregated benefit score**, not from counting beneficial vs challenging line keys:

```typescript
// Uses aggregated score to account for aspect polarity
// (e.g., a "beneficial" Sun:MC with a square aspect becomes challenging)
let nature: 'beneficial' | 'challenging' | 'mixed';
if (score.mixedFlag) {
  nature = 'mixed';
} else if (score.benefitScore > 52) {  // Small threshold to avoid noise
  nature = 'beneficial';
} else if (score.benefitScore < 48) {
  nature = 'challenging';
} else {
  nature = 'mixed';
}
```

> **Why not count lines?** A city dominated by "beneficial" planet:angle keys but with mostly square/opposition aspects could have negative `benefitScoreRaw`. Using the aggregated score ensures the label matches actual scoring.

---

## Web Worker Architecture (Fallback)

**File:** `src/features/globe/workers/scout.worker.ts`

When WASM is unavailable, the TypeScript C2 algorithm runs in a dedicated Web Worker to prevent main thread blocking.

### Message Protocol

```typescript
// Main → Worker
type ScoutWorkerMessage =
  | { type: 'init'; wasmEnabled: boolean }
  | { type: 'scoutCategory'; id: string; category: LifeCategory; ... }
  | { type: 'scoutOverall'; id: string; ... };

// Worker → Main
type ScoutWorkerResult =
  | { type: 'ready'; backend: 'wasm' | 'typescript' }
  | { type: 'categoryResult'; id: string; rankings: CityRanking[]; ... }
  | { type: 'overallResult'; id: string; rankings: OverallCityRanking[]; ... }
  | { type: 'error'; id: string; error: string };
```

### Hook Integration

**File:** `src/features/globe/hooks/useScoutWasm.ts`

```typescript
function useScoutWasm(options?: UseScoutWasmOptions): UseScoutWasmResult {
  // Returns:
  // - isWasmReady: boolean
  // - isLoading: boolean
  // - backend: 'wasm' | 'typescript'
  // - scoutForCategory(category, planetaryLines, aspectLines): Promise<ScoutAnalysis>
  // - scoutOverall(planetaryLines, aspectLines): Promise<OverallScoutLocation[]>
}
```

---

## WASM Implementation (Rust)

**File:** `src/astro-core/src/scout.rs`

The Rust implementation mirrors the TypeScript C2 algorithm for maximum performance.

### Exposed Functions

```rust
#[wasm_bindgen]
pub fn scout_cities_for_category(
    cities_json: &str,
    planetary_lines_json: &str,
    aspect_lines_json: &str,
    category: LifeCategory,
    sort_mode: SortMode,
    config_json: Option<String>,
) -> Result<String, JsValue>
```

### Performance

| Backend | ~3000 cities | ~50 lines |
|---------|--------------|-----------|
| TypeScript (main thread) | ~800ms (blocking) |
| TypeScript (worker) | ~800ms (non-blocking) |
| WASM (worker) | ~150ms (non-blocking) |

---

## Output Formats

### ScoutLocation (Category-specific)

```typescript
interface ScoutLocation {
  city: City;
  category: ScoutCategory;
  nature: 'beneficial' | 'challenging';
  overallScore: number;  // 0-100
  influences: LineInfluence[];
  distance: number;  // km to nearest line
}
```

### OverallScoutLocation (All categories)

```typescript
interface OverallScoutLocation {
  city: City;
  totalScore: number;
  averageScore: number;
  categoryScores: Array<{
    category: ScoutCategory;
    score: number;
    nature: 'beneficial' | 'challenging';
    topInfluence: LineInfluence | null;
  }>;
  beneficialCategories: number;
  challengingCategories: number;
  distance: number;
}
```

---

## Migration Guide

### From V1 to C2

The C2 algorithm produces different results due to:

1. **More accurate distances** - Cross-track vs linear projection
2. **Continuous decay** - Gaussian kernel vs binary threshold
3. **Separated scores** - Benefit + intensity + volatility vs single score
4. **Diminishing returns** - 7-level weights vs linear bonus

**Score Interpretation Changes:**

| V1 Score | C2 Benefit Score | Meaning |
|----------|------------------|---------|
| 80-100 | 70-100 | Strongly beneficial |
| 60-80 | 55-70 | Moderately beneficial |
| 40-60 | 45-55 | Neutral/mixed |
| 20-40 | 30-45 | Moderately challenging |
| 0-20 | 0-30 | Strongly challenging |

---

## Configuration Reference

### ScoringConfig Presets

| Preset | Kernel | σ/bandwidth | Max Dist | Volatility Penalty |
|--------|--------|-------------|----------|-------------------|
| Balanced (default) | Gaussian | 180 km | 500 km | 0.3 |
| High Precision | Gaussian | 120 km | 600 km | 0.4 |
| Relaxed | Linear | 500 km | 500 km | 0.2 |

### Line Ratings (Default)

| Planet | MC | IC | ASC | DSC |
|--------|----|----|-----|-----|
| Sun | 5 | 4 | 5 | 4 |
| Moon | 3 | 5 | 4 | 4 |
| Mercury | 4 | 3 | 4 | 3 |
| Venus | 4 | 5 | 5 | 5 |
| Mars | 4 | 2 | 4 | 2 |
| Jupiter | 5 | 5 | 5 | 5 |
| Saturn | 3 | 2 | 2 | 2 |
| Uranus | 2 | 2 | 3 | 2 |
| Neptune | 2 | 3 | 3 | 2 |
| Pluto | 3 | 2 | 2 | 2 |
| Chiron | 4 | 4 | 3 | 3 |
| NorthNode | 4 | 4 | 4 | 4 |

---

## Changelog

### C2.5 (Current)

Mathematical correctness fixes for volatility bounds. Applied to both TypeScript and Rust/WASM:

1. **Volatility bound corrected** - P and N partition the same influences (P + N ≤ 2W), so max P·N occurs when P = N = W = 2.38, giving volatilityRaw ≤ 2.38 (not 4.76)
2. **Volatility scaling fixed** - Changed `* 21.0` to `* 42.0` (100/2.38 ≈ 42.0)
3. **Along-track division safety** - Added safe denominator guard before dividing `cos(δ13)/cos(δxt)` to prevent Infinity when cos(δxt) is near zero
4. **Documentation clarified** - Explicit `|aspectMult| ≤ 1` in bounds derivation, formula reference added

### C2.4

Precision, consistency, and test coverage improvements:

1. **Cross-track doc precision** - Clarified that cos(δxt)→0 makes cos(δ13)/cos(δxt) numerically unstable (extreme ~90° cross-track), not "point on line"
2. **Volatility scaling** - Changed `* 20.0` to `* 21.0` for same provable bound as intensity (100/4.76 ≈ 21.0)
3. **Volatility symmetry** - Now flags both sign-flip directions: positive→negative AND negative→positive (any aspect-induced flip)
4. **Regression tests** - Added 11 tests covering cross-track golden values and score bounds verification

### C2.3

Correctness fixes based on geodesy review:

1. **Pluto:MC contradiction** - Removed from Career challenging set (was in both beneficial AND challenging in Rust)
2. **EPSILON branch removed** - The cos(δxt)≈0 special case was conceptually wrong (means ~90° from line, not on it). Now relies on ratio clamping.
3. **Provable bounds truly provable** - Cap to top K=7 influences. Removed unbounded `?? 0.05` tail weight.
4. **Weighted volatility** - Use same DIMINISHING_WEIGHTS for volatility as for benefit/intensity (was unweighted)

### C2.2

Numerical stability and documentation improvements:

1. **Dateline unwrapping** - Added `unwrapLongitude()` to correctly determine crossing meridian direction
2. **Provable bounds** - Documented mathematical derivation of scaling constants (10.5, 21.0, 20.0)
3. **Error estimate** - Updated spherical model error from ~0.3% to ~0.5% for accuracy

### C2.1

Mathematical accuracy fixes based on geodesy review:

1. **Cross-track formula** - Added missing `asin()` for correct angular cross-track distance
2. **Along-track sign** - Now signed using `cos(Δbearing)` for proper endpoint clamping
3. **Volatility normalization** - Scaled to 0-100 (was 0-5 raw), making balanced ranking effective
4. **Nature classification** - Uses aggregated `benefitScore` sign instead of line key counts
5. **Scaling constants** - Fixed multipliers based on correct DIMINISHING_WEIGHTS sum (2.38)
6. **Dateline handling** - Splits segments at ±180° instead of skipping

### C2.0

Initial C2 algorithm release:

- Spherical cross-track distance (replaced linear projection)
- Gaussian/exponential distance decay kernels
- Separated benefit/intensity/volatility scoring
- Diminishing returns for multiple influences
- Web Worker fallback when WASM unavailable

### V1 (Legacy)

Original implementation with linear segment projection and binary influence thresholds.
