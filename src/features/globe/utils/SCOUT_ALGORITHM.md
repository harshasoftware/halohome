# Scout Location Scoring Algorithm

This document explains how cities are scored and ranked in the Scout Locations feature, which helps users find optimal places to live based on their astrocartography chart.

## Overview

The algorithm analyzes planetary lines from a user's birth chart and identifies cities within influence range of those lines. Cities are scored based on:

1. **Planetary influences** - Which planets' lines pass near the city
2. **Line types** - MC, IC, ASC, or DSC lines
3. **Life category relevance** - How the line affects specific life areas
4. **Geodetic distance** - Precise cross-track distance to planetary lines
5. **Influence gradients** - Distance-based decay of planetary influence
6. **Multiple influences** - Bonus for cities with several relevant lines

---

## City Database

### GeoNames Dataset

The algorithm uses a comprehensive GeoNames dataset containing approximately **33,000 cities** worldwide with population data:

| Field | Description |
|-------|-------------|
| `name` | City name |
| `country` | Country name |
| `lat` | Latitude coordinate |
| `lng` | Longitude coordinate |
| `population` | City population (for filtering) |

### Population Tier Filtering

Users can filter cities by minimum population to focus on larger urban centers:

| Tier | Minimum Population | Typical City Size |
|------|-------------------|-------------------|
| All Cities | 0 | Any populated place |
| 15k+ | 15,000 | Small towns |
| 50k+ | 50,000 | Medium towns |
| 100k+ | 100,000 | Small cities |
| 250k+ | 250,000 | Medium cities |
| 500k+ | 500,000 | Large cities |
| 1M+ | 1,000,000 | Major metropolitan areas |

**Note:** Population filtering is integrated into the cache key, so changing the population tier triggers a full recomputation with appropriately filtered cities.

---

## Core Concepts

### Influence Distance

A city is considered "influenced" by a planetary line if it falls within **500 km** of the line. This is calculated using geodetic distance algorithms for accurate measurements on Earth's curved surface.

```
MAX_INFLUENCE_DISTANCE = 500 km
```

### Geodetic Distance Calculations

The algorithm uses precise geodetic calculations:

#### Haversine Formula
Calculates great-circle distance between two points on Earth's surface:

```javascript
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a = sin(dLat/2)² + cos(lat1) * cos(lat2) * sin(dLon/2)²;
  const c = 2 * atan2(√a, √(1-a));
  return R * c;
}
```

#### Cross-Track Distance
Calculates the perpendicular distance from a point to a line segment on a sphere:

```javascript
function crossTrackDistance(cityLat, cityLon, lineStart, lineEnd) {
  // Uses spherical geometry to find the shortest distance
  // from a point to a great-circle path defined by two points
  const distStartToCity = angularDistance(lineStart, city);
  const bearingStartToCity = bearing(lineStart, city);
  const bearingStartToEnd = bearing(lineStart, lineEnd);

  // Cross-track distance formula
  return asin(sin(distStartToCity) * sin(bearingStartToCity - bearingStartToEnd)) * R;
}
```

### Influence Gradients

The algorithm applies distance-based decay to planetary influence using configurable kernel functions:

#### Gaussian Kernel (Default)
Smooth bell-curve decay centered on the line:
```javascript
influence = baseScore * exp(-(distance² / (2 * σ²)))
// σ (sigma) controls the spread of influence
```

#### Exponential Kernel
Sharper decay that drops off more quickly:
```javascript
influence = baseScore * exp(-distance / decayRate)
```

#### Linear Kernel
Simple linear falloff from maximum influence:
```javascript
influence = baseScore * max(0, 1 - (distance / maxDistance))
```

### Line Types

Each planet has 4 lines on an astrocartography map:

| Line | Name | Meaning |
|------|------|---------|
| **MC** | Medium Coeli (Midheaven) | Career, public image, reputation |
| **IC** | Imum Coeli | Home, family, roots, foundation |
| **ASC** | Ascendant | Identity, physical presence, how you appear |
| **DSC** | Descendant | Relationships, partnerships, others |

### Life Categories

The algorithm evaluates cities across 6 life categories:

| Category | Keywords Used for Matching |
|----------|---------------------------|
| **Career** | career, work, professional, business, success, recognition, authority, leadership |
| **Love** | love, romance, partner, marriage, relationship, dating, soulmate |
| **Health** | health, vitality, healing, wellness, physical, energy, strength |
| **Home** | home, family, roots, foundation, settling, property, real estate |
| **Wellbeing** | wellbeing, peace, spiritual, happiness, contentment, inner, harmony |
| **Wealth** | wealth, money, financial, abundance, prosperity, earning, investment |

---

## Scoring System

### Base Rating (1-5 Scale)

Each planet-line combination has a pre-defined rating from 1 to 5:

| Rating | Meaning | Classification |
|--------|---------|----------------|
| 5 | Excellent | Beneficial |
| 4 | Good | Beneficial |
| 3 | Neutral | - |
| 2 | Challenging | Challenging |
| 1 | Difficult | Challenging |

**Beneficial lines**: Rating >= 4
**Challenging lines**: Rating <= 2

### Distance-Weighted Scoring

The influence of a line decreases with distance using the configured kernel function:

```javascript
weightedRating = baseRating * influenceKernel(distance)
```

### Diminishing Returns

When multiple lines influence a city, a diminishing returns weight is applied to prevent excessive score inflation:

```javascript
// Each additional influence contributes less
influence1: weight = 1.0
influence2: weight = 0.8
influence3: weight = 0.6
influence4+: weight = 0.4
```

### Overall Score Calculation

The city's overall score is calculated from its influences:

```
overallScore = sum(weightedRating * diminishingWeight) + multiInfluenceBonus
```

Where:
- `weightedRating` = Base rating adjusted by distance decay
- `diminishingWeight` = Weight based on influence order
- `multiInfluenceBonus` = min(numberOfInfluences - 1, 3) * 10

### Score Range

| Score | Interpretation |
|-------|---------------|
| 80+ | Excellent location for this category |
| 60-79 | Good location with positive influences |
| 40-59 | Neutral/mixed influences |
| Below 40 | Challenging location for this category |

---

## Dynamic Result Limits (TOP_K)

To ensure meaningful results across datasets of varying sizes, the algorithm uses dynamic result limits:

### Calculation
```javascript
const MIN_RESULTS = 200;
const TOP_PERCENT = 0.05; // 5%

function calculateTopK(totalResults) {
  if (totalResults <= MIN_RESULTS) {
    return totalResults; // Return all if less than minimum
  }
  // Return max of (minimum, 5% of total)
  return Math.max(MIN_RESULTS, Math.ceil(totalResults * TOP_PERCENT));
}
```

### Behavior
- **Small datasets (<200 cities):** Returns all results
- **Medium datasets (200-4000 cities):** Returns 200 results
- **Large datasets (>4000 cities):** Returns top 5% of results

This ensures:
1. Users always see a meaningful number of recommendations
2. Large population tiers don't overwhelm with too many results
3. Results remain ranked by score quality

---

## Aspect Line Modifiers

In addition to primary planetary lines, the algorithm considers aspect lines (trine, sextile, square):

| Aspect Type | Modifier | Nature |
|-------------|----------|--------|
| Trine | 0.8x base rating | Harmonious |
| Sextile | 0.8x base rating | Harmonious |
| Square | 0.6x base rating | Challenging |

**Example:**
- Base line rating: 5
- Trine aspect rating: 5 * 0.8 = 4
- Square aspect rating: 5 * 0.6 = 3

---

## Category-Specific Line Mappings

### Beneficial Lines by Category

Lines are classified as beneficial based on their themes and ratings:

| Category | Primary Beneficial Lines |
|----------|-------------------------|
| **Career** | Sun-MC, Jupiter-MC, Saturn-MC (authority), Mars-MC (drive) |
| **Love** | Venus-DSC, Moon-DSC, Jupiter-DSC, Venus-ASC |
| **Health** | Sun-ASC, Mars-ASC (vitality), Jupiter-ASC |
| **Home** | Moon-IC, Venus-IC, Jupiter-IC, Sun-IC |
| **Wellbeing** | Venus-ASC, Jupiter-ASC, Moon-IC, Neptune (spiritual) |
| **Wealth** | Jupiter-MC, Sun-MC, Venus-MC, Pluto-MC (power) |

### Challenging Lines by Category

| Category | Challenging Lines | Reason |
|----------|-------------------|--------|
| **Career** | Neptune-MC, Uranus-MC | Confusion, instability |
| **Love** | Saturn-DSC, Pluto-DSC, Mars-DSC, Uranus-DSC | Heavy, power struggles, conflict, instability |
| **Health** | Saturn-ASC, Neptune-ASC, Pluto-ASC | Low energy, confusion, intensity |
| **Home** | Uranus-IC, Mars-IC, Pluto-IC | Frequent moves, conflicts, power struggles |
| **Wellbeing** | Saturn-ASC, Pluto-ASC, Mars-ASC | Depression, intensity, burnout |
| **Wealth** | Neptune-MC, Uranus-MC | Financial confusion, instability |

---

## Overall Location Scoring

When calculating the "Overall" view (across all categories):

```
totalScore = sum of beneficial scores - (sum of challenging scores * 0.5)
```

**Why challenging scores are halved:**
- A location with mixed influences (some beneficial, some challenging) shouldn't be completely ruled out
- Beneficial influences can often offset or help navigate challenging ones

### Overall Location Ranking

Cities are ranked by their `totalScore` which accounts for:
1. Number of beneficial categories
2. Number of challenging categories
3. The strength of influences in each category
4. Distance-weighted influence decay

---

## Caching System

### IndexedDB Cache

Results are cached in IndexedDB to avoid expensive recalculations:

| Store | Purpose |
|-------|---------|
| `categoryResults` | Per-category analysis results |
| `overallResults` | Overall location rankings |

### Cache Key Generation

Cache keys are generated from:
1. Planetary line configuration (planet, line type, point count)
2. Aspect line configuration
3. Selected category (if applicable)
4. **Minimum population filter**

```javascript
cacheKey = hash(planetaryLines + aspectLines + category + minPopulation)
```

### Cache Invalidation

Cache is automatically invalidated when:
- Birth chart data changes (different lines)
- Population filter changes
- Cache TTL expires (24 hours)
- Manual cache clear

---

## Parallel Processing

### Web Worker Architecture

The algorithm uses Web Workers for parallel processing to avoid blocking the UI:

```
Main Thread                    Worker Pool
     │                              │
     ├──► Planetary Lines ─────────►│
     │    Aspect Lines              │
     │    Min Population            │
     │                              │
     │◄── Progress Updates ◄────────┤
     │◄── Category Results ◄────────┤
     │◄── Overall Results ◄─────────┤
```

### Processing Phases

1. **Initialization** - Load city data, filter by population
2. **Category Analysis** - Process each life category in parallel
3. **Overall Ranking** - Aggregate and rank all results
4. **Completion** - Return final results to main thread

---

## Algorithm Flow

```
1. User selects a life category (or Overall) and population filter

2. Check cache for existing results with same parameters

3. If cache miss, start worker pool:
   a. Filter cities by minimum population
   b. For each category (in parallel):
      i.   Get beneficial lines (rating >= 4, matching category keywords)
      ii.  Get challenging lines (rating <= 2, plus category-specific challenges)
      iii. For each line:
           - Find all cities within 500km using cross-track distance
           - Calculate distance-weighted influence using kernel function
           - Apply diminishing returns for multiple influences
      iv.  Sort by score, apply dynamic TOP_K limit
   c. Calculate overall rankings across all categories

4. Cache results with population-aware key

5. Return ranked list of locations
```

---

## Example Calculation

**Scenario:** Evaluating Tokyo for Career category (with 100k+ population filter)

1. **Lines passing near Tokyo (within 500km):**
   - Sun MC line (rating: 5, distance: 120km)
   - Jupiter MC line (rating: 5, distance: 340km)

2. **Distance decay (Gaussian kernel, σ=200km):**
   - Sun MC: decay = exp(-(120²)/(2×200²)) = 0.84
   - Jupiter MC: decay = exp(-(340²)/(2×200²)) = 0.32

3. **Weighted ratings:**
   - Sun MC: 5 × 0.84 = 4.2
   - Jupiter MC: 5 × 0.32 = 1.6

4. **Diminishing returns:**
   - Sun MC (1st influence): 4.2 × 1.0 = 4.2
   - Jupiter MC (2nd influence): 1.6 × 0.8 = 1.28

5. **Score calculation:**
   - Combined weighted score: (4.2 + 1.28) × 20 = 109.6
   - Multi-influence bonus: min(2 - 1, 3) × 10 = 10
   - **Final score: ~120**

6. **Classification:** Beneficial (both lines are rating 5)

7. **Result:** Tokyo is ranked as an excellent career location.

---

## Technical Implementation

### Performance Tiers

The scout algorithm uses a three-tier fallback system for optimal performance:

| Tier | Backend | Speed | Requirements |
|------|---------|-------|--------------|
| **1** | Rust WASM Parallel | Fastest | COOP/COEP headers, SharedArrayBuffer |
| **2** | Rust WASM | Fast | Basic WASM support |
| **3** | TypeScript | Baseline | Always available |

#### Tier 1: Rust WASM Parallel (Fastest)

Uses Rayon thread pool for internal parallelization:

```javascript
// WASM parallel functions
scout_cities_fast_parallel()      // Optimized + parallel (fastest)
scout_cities_for_category_parallel()  // Standard + parallel

// Initialization
initThreadPool(navigator.hardwareConcurrency)
is_parallel_available()  // Check availability
```

**Requirements:**
- Cross-Origin headers: `Cross-Origin-Opener-Policy: same-origin`
- Cross-Origin headers: `Cross-Origin-Embedder-Policy: credentialless`
- `SharedArrayBuffer` support in browser

#### Tier 2: Rust WASM Single-threaded

Falls back when parallel isn't available:

```javascript
scout_cities_fast()           // Optimized single-threaded
scout_cities_for_category()   // Standard single-threaded
```

#### Tier 3: TypeScript Fallback

Pure JavaScript implementation - always works:

```javascript
// Uses scout-algorithm-c2.ts
buildCityInfluencesOptimized()
rankCitiesByCategory()
```

### Core Algorithm Files

| File | Purpose |
|------|---------|
| `astro-core/src/scout.rs` | Rust WASM implementation with parallel support |
| `scout-algorithm-c2.ts` | TypeScript fallback algorithms |
| `scout-utils.ts` | Type definitions, category mappings |
| `scout-cache.ts` | IndexedDB caching with population-aware keys |
| `scoutParallel.worker.ts` | Web Worker with three-tier fallback chain |
| `scoutWorkerPool.ts` | Worker pool management, progress tracking |

### Key Functions

```typescript
// Geodetic distance calculations
haversineDistance(lat1, lon1, lat2, lon2): number
crossTrackDistance(point, lineStart, lineEnd): number

// Influence calculation
calculateInfluence(distance, kernel, params): number
applyDiminishingReturns(influences): WeightedInfluence[]

// Result filtering
calculateTopK(totalResults): number  // Dynamic TOP_K
filterCitiesByPopulation(cities, minPop): City[]
```

### Rust WASM Functions (astro-core)

```rust
// Fast optimized versions (use equirectangular approximation + polyline simplification)
scout_cities_fast_parallel()     // Parallel via Rayon
scout_cities_fast()              // Single-threaded

// Standard versions (full Haversine calculations)
scout_cities_for_category_parallel()  // Parallel via Rayon
scout_cities_for_category()           // Single-threaded

// Parallel initialization
initThreadPool(num_threads)      // Initialize Rayon thread pool
is_parallel_available()          // Check if parallel feature compiled
```

### Build Configuration

To enable parallel WASM processing, build with the `parallel` feature:

```bash
# Non-parallel (smaller WASM, works everywhere)
npm run wasm:build

# Parallel (faster, requires COOP/COEP headers)
npm run wasm:build:parallel
```

---

## Limitations

1. **Fixed influence radius** - 500km may not suit all interpretations
2. **Simplified aspect handling** - Only considers harmonious vs challenging
3. **No orb consideration** - Uses distance decay instead of hard cutoffs
4. **No house system variations** - Uses a standard calculation method
5. **Population data accuracy** - Depends on GeoNames data quality

---

## Future Improvements

- [ ] User-adjustable influence radius
- [ ] Custom kernel function selection
- [ ] Custom city additions
- [ ] Integration with relocation chart calculations
- [ ] Time-based transits overlay
- [ ] Regional/country-based filtering
- [ ] Export results to PDF/CSV
