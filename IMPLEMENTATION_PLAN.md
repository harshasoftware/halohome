# Implementation Plan: Vedic, Relocation & Local Space Features

## Overview

Three new features to add to the existing astrocartography system:
- **A: Vedic Mode** - Sidereal zodiac with Nakshatras
- **B: Relocation Charts** - House shift analysis for any location
- **C: Local Space Lines** - Azimuth-based directional lines

---

## A: Vedic Mode

### What It Does
Converts tropical (Western) positions to sidereal (Vedic) positions and shows Nakshatra placements.

### Files to Modify/Create

**1. Rust WASM (`src/astro-core/src/lib.rs`)**
```rust
// Add new exports:
- calculate_ayanamsha(jdn: f64, system: &str) -> f64
- tropical_to_sidereal(tropical_lon: f64, ayanamsha: f64) -> f64
- get_nakshatra(sidereal_lon: f64) -> NakshatraData
```

**2. New Types (`src/lib/astro-types.ts`)**
```typescript
type AyanamshaType = 'lahiri' | 'raman' | 'krishnamurti' | 'fagan-bradley';

interface NakshatraData {
  index: number;           // 0-26
  name: string;            // "Ashwini", "Bharani", etc.
  lord: string;            // Ruling planet
  pada: 1 | 2 | 3 | 4;     // Quarter (3.33° each)
  degreeInNakshatra: number;
}

interface VedicPosition extends PlanetaryPosition {
  siderealLongitude: number;
  nakshatra: NakshatraData;
  sign: string;            // Vedic sign name
}
```

**3. New Hook (`src/hooks/useVedicMode.ts`)**
```typescript
export function useVedicMode(birthData: BirthData, ayanamshaType: AyanamshaType) {
  // Returns sidereal positions + nakshatras for all planets
}
```

**4. UI Toggle**
- Add Tropical/Sidereal toggle to settings or legend
- Show Nakshatra info in planet tooltips/cards

### Calculation (Pure Math)
```
Ayanamsha (Lahiri) ≈ 23.85° + (year - 2000) × 0.0139°
Sidereal Longitude = Tropical Longitude - Ayanamsha
Nakshatra Index = floor(Sidereal Longitude / 13.333°)
Pada = floor((Sidereal Longitude % 13.333°) / 3.333°) + 1
```

---

## B: Relocation Charts

### What It Does
Shows how your natal chart "relocates" when you move - which houses planets fall into at a new location.

### Files to Modify/Create

**1. Rust WASM (`src/astro-core/src/lib.rs`)**
```rust
// Add new export:
- calculate_relocated_houses(jdn: f64, birth_lat: f64, birth_lng: f64,
                              target_lat: f64, target_lng: f64) -> RelocationData
```

**2. New Types (`src/lib/astro-types.ts`)**
```typescript
interface RelocationAnalysis {
  originalLocation: { lat: number; lng: number; name: string };
  targetLocation: { lat: number; lng: number; name: string };

  // Angle shifts
  ascendantShift: number;      // How many degrees ASC moved
  midheavenShift: number;      // How many degrees MC moved
  newAscendant: number;        // New ASC longitude
  newMidheaven: number;        // New MC longitude

  // House changes per planet
  houseChanges: {
    planet: Planet;
    originalHouse: number;     // 1-12
    relocatedHouse: number;    // 1-12
    interpretation: string;
  }[];

  // Summary
  dominantThemes: string[];
}
```

**3. New Hook (`src/hooks/useRelocationChart.ts`)**
```typescript
export function useRelocationChart(
  birthData: BirthData,
  targetLocation: { lat: number; lng: number }
) {
  // Compare houses at birth location vs target location
  // Return house shift analysis
}
```

**4. New Component (`src/features/globe/components/RelocationPanel.tsx`)**
- Click any location on globe to see relocation analysis
- Shows table: Planet | Birth House | Relocated House
- Highlights significant changes (planet moves to angular house 1/4/7/10)

### Calculation (Pure Math)
```
// Planets stay at same ecliptic longitude
// Only houses change based on new ASC/MC

New MC = Planet RA - GMST + Target Longitude
New ASC = atan2(...) based on target latitude

House Position = which 30° segment from ASC the planet falls in
```

---

## C: Local Space Lines

### What It Does
Draws lines radiating outward from birth location showing planetary directions (azimuth).

### Files to Modify/Create

**1. Rust WASM (`src/astro-core/src/lib.rs`)**
```rust
// Add new export:
- calculate_local_space_lines(jdn: f64, birth_lat: f64, birth_lng: f64)
    -> Vec<LocalSpaceLine>
```

**2. New Types (`src/lib/astro-types.ts`)**
```typescript
interface LocalSpaceLine {
  planet: Planet;
  azimuth: number;           // 0-360° from North
  altitude: number;          // Above/below horizon
  points: GlobePoint[];      // Line extending 10,000+ km
  direction: string;         // "NE", "SW", etc.
}

interface LocalSpaceResult {
  birthLocation: { lat: number; lng: number };
  lines: LocalSpaceLine[];
  timestamp: number;
}
```

**3. New Hook (`src/hooks/useLocalSpaceLines.ts`)**
```typescript
export function useLocalSpaceLines(birthData: BirthData) {
  // Calculate azimuth for each planet
  // Generate line points extending outward
}
```

**4. UI Integration**
- New toggle: "Show Local Space Lines"
- Lines radiate from birth location marker
- Different visual style (dashed? different colors?)

### Calculation (Pure Math)
```
// Convert ecliptic to horizontal coordinates
1. Ecliptic → Equatorial (RA, Dec)
2. Equatorial → Horizontal (Azimuth, Altitude) for birth location

Azimuth = atan2(sin(HA), cos(HA) * sin(lat) - tan(dec) * cos(lat))

// Generate line points using destination formula
For distance 0 to 15000 km, step 200 km:
  lat2 = asin(sin(lat1) * cos(d/R) + cos(lat1) * sin(d/R) * cos(azimuth))
  lng2 = lng1 + atan2(sin(azimuth) * sin(d/R) * cos(lat1),
                       cos(d/R) - sin(lat1) * sin(lat2))
```

---

## Implementation Order

### Phase 1: Types & Infrastructure
1. Add new TypeScript types to `astro-types.ts`
2. Create stub hooks with placeholder data

### Phase 2: Rust WASM Core
3. Add Vedic calculations to `lib.rs`
4. Add Relocation calculations to `lib.rs`
5. Add Local Space calculations to `lib.rs`
6. Rebuild WASM: `wasm-pack build`

### Phase 3: React Hooks
7. Implement `useVedicMode` hook
8. Implement `useRelocationChart` hook
9. Implement `useLocalSpaceLines` hook

### Phase 4: UI Components
10. Add Vedic toggle + Nakshatra display
11. Add Relocation panel (click location → see analysis)
12. Add Local Space line rendering to globe

### Phase 5: Integration
13. Connect to existing `useAstroLines` or create unified hook
14. Add to legend/controls
15. Test all features together

---

## File Summary

| File | Action | Feature |
|------|--------|---------|
| `src/astro-core/src/lib.rs` | Modify | A, B, C |
| `src/lib/astro-types.ts` | Modify | A, B, C |
| `src/hooks/useVedicMode.ts` | Create | A |
| `src/hooks/useRelocationChart.ts` | Create | B |
| `src/hooks/useLocalSpaceLines.ts` | Create | C |
| `src/features/globe/components/VedicToggle.tsx` | Create | A |
| `src/features/globe/components/RelocationPanel.tsx` | Create | B |
| `src/features/globe/components/LocalSpaceToggle.tsx` | Create | C |

---

## Questions Before Starting

1. **Vedic Mode**: Should Nakshatra info show in a panel or tooltip?
2. **Relocation**: Click on globe to select target, or use search?
3. **Local Space**: Same colors as MC/IC lines, or distinct style?
4. **Priority**: Which feature first? (Recommend: B → C → A)

---

## Estimated Scope

- **Rust WASM changes**: ~300 lines
- **TypeScript types**: ~50 lines
- **React hooks**: ~200 lines each (600 total)
- **UI components**: ~150 lines each (450 total)
- **Total**: ~1,400 lines of new code
