# Astro-Core WASM Library Changelog

## Changes from commit `1d3610e` to current

### Time Scale Chain (Critical Accuracy Fix)

#### Before
- Used UT (Universal Time) directly for ephemeris calculations
- Delta-T derived from approximate year/month from input parameters
- No distinction between UTC, UT1, and TT

#### After
- **Proper UTC -> UT1 -> TT chain implemented**
- `calculate_dut1()` - Polynomial + periodic model for UT1-UTC correction (accurate ~50ms for 2000-2030)
- `utc_to_ut1()` - Applies DUT1 correction to convert UTC to UT1
- `ut_to_tt()` - Chains UTC -> UT1 -> TT using both DUT1 and Delta-T
- `jd_to_calendar()` - Meeus algorithm to derive year/month from JD (fixes month boundary errors)
- All ephemeris calculations now use TT (Terrestrial Time) as required

### Planetary Ephemeris Enhancements

#### Moon (ELP2000-82 Theory)
- **Before**: Simplified model with ~10 terms
- **After**: 60 longitude terms + 60 latitude terms from Meeus Chapter 47
- Includes solar perturbations, Jupiter perturbations, and flattening corrections
- Accuracy: ~10 arcseconds (suitable for astrocartography)

#### Pluto (Meeus Chapter 37)
- **Before**: Basic Keplerian elements only
- **After**: 43 perturbation terms for longitude, latitude, and radius
- Accounts for Neptune resonance effects
- Valid range: 1885-2099

#### Chiron (Newton-Raphson + Perturbations)
- **Before**: Simple mean anomaly approximation
- **After**: Proper Kepler equation solving with Newton-Raphson iteration
- Giant planet perturbations (Jupiter, Saturn, Uranus, Neptune)
- Secular and periodic terms included

### Horizon Latitude Calculation (ASC/DSC Lines)

#### Before
- Returned `Some(0.0)` when declination ≈ 0, causing incorrect flat lines at equator
- Sorted points by latitude, scrambling polylines near dateline

#### After
- Returns `None` when declination ≈ 0 (tan(δ) near zero) to avoid mathematical instability
- Points kept in **longitude order** (renderer contract: split segments on >45° latitude jumps)
- Prevents visual artifacts at dateline crossings and curve loops

### Performance Optimizations

#### Before
- `calculate_planetary_position()` called in loops, each computing its own TT/nutation/obliquity
- 12 planets × 4 line types = 48 redundant TT conversions

#### After
- Created `calculate_planetary_position_tt()` internal function accepting pre-computed TT values
- TT/nutation/obliquity computed **once** per API call, reused for all planets
- ~12x reduction in redundant calculations for batch operations

### GMST Calculation

#### Before
- Used UT directly without DUT1 correction
- Formula assumed UT = UT1

#### After
- `calculate_gmst()` internally applies DUT1 correction via `utc_to_ut1()`
- Consistent with IAU definition (GMST should use UT1)
- Tests explicitly account for DUT1 modeling uncertainty

### Documentation & Type Safety

#### Rust (`lib.rs`)
- All public functions document that input Julian Date is **UTC**
- Zenith Point clarified as **MC culmination point** (not instantaneous sub-planet point)
- DUT1 model validity period documented (2000-2030, ±50ms accuracy)
- Timezone functions warn about `(lat, lng)` parameter order

#### TypeScript (`astro-types.ts`)
- `PlanetaryLine` interface documents **renderer contract** for ASC/DSC lines
- `ZenithPoint` interface clarifies MC meridian semantics
- Both match the Rust implementation documentation

### Test Suite Improvements

#### Added
- `test_sun_high_precision_crosscheck()` - Cross-check against high-precision reference (5 arcminute tolerance)
- `test_gmst_j2000_epoch()` - Tight tolerance (0.003 rad) for GMST at J2000
- `test_gmst_known_value()` - Tightened from 0.5° to 0.05° tolerance
- `test_horizon_latitude_small_declination()` - Verifies near-zero declination handling

#### Removed
- `test_known_birth_chart_sun_position()` - Redundant with high-precision test (had loose ±5° tolerance)
- Stale paran TODO comments about unimplemented `get_hour_angle_for_angle`
- `println!` debugging from Chennai test

#### Fixed
- `test_julian_date_j2000_epoch()` - Reworded for UTC-based API clarity
- `test_horizon_latitude_equatorial_planet()` - Updated to expect `None` for dec=0

### Summary of Changes

| Category | Items Changed |
|----------|---------------|
| Time Scale | 4 new functions (DUT1, UTC->UT1, UT1->TT chain, JD->calendar) |
| Moon Ephemeris | +120 periodic terms (ELP2000-82) |
| Pluto Ephemeris | +43 perturbation terms (Meeus Ch.37) |
| Chiron Ephemeris | Newton-Raphson solver + 4-planet perturbations |
| Horizon Latitude | Fixed dec≈0 handling, longitude-ordered points |
| Performance | 12x reduction in redundant TT calculations |
| Tests | 4 added, 1 removed, 4 fixed/tightened |
| Documentation | 6 major clarifications (Rust + TypeScript) |

### Files Modified

```
src/astro-core/src/lib.rs          +1730 lines (algorithm + tests)
src/lib/astro-types.ts             +25 lines (documentation)
src/astro-core/pkg/*               Rebuilt WASM binaries
```

### Test Results

- **34 tests passing**
- **0 failures**
- **WASM builds successfully**
