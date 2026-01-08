/**
 * Astrocartography Calculator
 * Core mathematical functions for planetary line calculations
 *
 * Reference: /public/astrocartography_formulas.md
 */

import {
  Planet,
  LineType,
  AspectType,
  PlanetaryPosition,
  PlanetaryLine,
  AspectLine,
  ParanLine,
  BirthData,
  AstroCartographyResult,
  AstroCalculationOptions,
  GlobePoint,
  PLANET_COLORS,
  ASPECT_ANGLES,
  DEFAULT_ASTRO_OPTIONS,
  ALL_PLANETS,
  ALL_LINE_TYPES,
} from './astro-types';

// ============================================
// Constants
// ============================================

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const J2000_EPOCH = 2451545.0; // Julian Date of J2000.0 epoch
const JULIAN_CENTURY = 36525.0; // Days in a Julian century

// Obliquity of the ecliptic at J2000.0 (in radians)
const OBLIQUITY_J2000 = 23.439291 * DEG_TO_RAD;

// ============================================
// Angle Utilities
// ============================================

/**
 * Normalize angle to [0, 2π)
 */
function normalizeAngle(angle: number): number {
  const twoPi = 2 * Math.PI;
  return ((angle % twoPi) + twoPi) % twoPi;
}

/**
 * Normalize angle to (-π, π]
 */
function normalizeSignedAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/**
 * Clamp value to range
 */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================
// Time Calculations
// ============================================

/**
 * Convert Date to Julian Date
 * Uses the standard Gregorian calendar formula
 */
export function toJulianDate(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1; // JavaScript months are 0-indexed
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();

  // Time as fraction of day
  const ut = hour + minute / 60 + second / 3600;

  // Adjust year and month for algorithm
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  // Calculate Julian Date
  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);

  const jd = Math.floor(365.25 * (y + 4716)) +
             Math.floor(30.6001 * (m + 1)) +
             day + ut / 24 + b - 1524.5;

  return jd;
}

/**
 * Calculate Greenwich Mean Sidereal Time (GMST)
 * Returns angle in radians [0, 2π)
 *
 * Uses IAU 1982 formula
 */
export function calculateGMST(julianDate: number): number {
  const t = (julianDate - J2000_EPOCH) / JULIAN_CENTURY;

  // GMST in degrees
  let thetaG = 280.46061837 +
               360.98564736629 * (julianDate - J2000_EPOCH) +
               0.000387933 * t * t -
               t * t * t / 38710000;

  // Normalize to [0, 360)
  thetaG = ((thetaG % 360) + 360) % 360;

  // Convert to radians
  return thetaG * DEG_TO_RAD;
}

/**
 * Calculate Local Sidereal Time
 * @param gmst Greenwich Mean Sidereal Time in radians
 * @param longitude Observer longitude in degrees (east positive)
 * @returns LST in radians [0, 2π)
 */
export function calculateLST(gmst: number, longitude: number): number {
  const longitudeRad = longitude * DEG_TO_RAD;
  return normalizeAngle(gmst + longitudeRad);
}

// ============================================
// Planetary Positions (Simplified)
// ============================================

/**
 * Mean orbital elements for planets at J2000.0
 * These are simplified - for production, use VSOP87 or Swiss Ephemeris
 *
 * Format: { L0: mean longitude, Ldot: rate per century, ... }
 */
interface OrbitalElements {
  L0: number;      // Mean longitude at J2000.0 (degrees)
  Ldot: number;    // Mean longitude rate (degrees/century)
  e0: number;      // Eccentricity at J2000.0
  i0: number;      // Inclination at J2000.0 (degrees)
  omega0: number;  // Longitude of perihelion at J2000.0 (degrees)
  Omega0: number;  // Longitude of ascending node at J2000.0 (degrees)
}

const ORBITAL_ELEMENTS: Record<Planet, OrbitalElements> = {
  Sun: {
    L0: 280.46646, Ldot: 36000.76983,
    e0: 0.01671123, i0: 0, omega0: 102.93768, Omega0: 0
  },
  Moon: {
    // Moon uses different calculations, simplified here
    L0: 218.3165, Ldot: 481267.8813,
    e0: 0.0549, i0: 5.145, omega0: 83.3532, Omega0: 125.0446
  },
  Mercury: {
    L0: 252.25084, Ldot: 149472.67411,
    e0: 0.20563593, i0: 7.00497, omega0: 77.45645, Omega0: 48.33076
  },
  Venus: {
    L0: 181.97973, Ldot: 58517.81539,
    e0: 0.00677672, i0: 3.39467, omega0: 131.60246, Omega0: 76.67984
  },
  Mars: {
    L0: 355.45332, Ldot: 19140.30268,
    e0: 0.09339410, i0: 1.84969, omega0: 336.04084, Omega0: 49.55809
  },
  Jupiter: {
    L0: 34.39644, Ldot: 3034.74612,
    e0: 0.04838624, i0: 1.30327, omega0: 14.75385, Omega0: 100.47390
  },
  Saturn: {
    L0: 49.95424, Ldot: 1222.49362,
    e0: 0.05386179, i0: 2.48599, omega0: 92.59887, Omega0: 113.66242
  },
  Uranus: {
    L0: 313.23218, Ldot: 428.48202,
    e0: 0.04725744, i0: 0.77263, omega0: 170.96424, Omega0: 74.01692
  },
  Neptune: {
    L0: 304.87997, Ldot: 218.45946,
    e0: 0.00859048, i0: 1.76995, omega0: 44.96476, Omega0: 131.78422
  },
  Pluto: {
    L0: 238.92881, Ldot: 145.20780,
    e0: 0.24882730, i0: 17.14175, omega0: 224.06891, Omega0: 110.30393
  },
};

/**
 * Calculate simplified planetary position
 * Returns Right Ascension and Declination in radians
 *
 * Note: This is a simplified calculation. For production accuracy,
 * implement VSOP87 or use Swiss Ephemeris.
 */
export function calculatePlanetaryPosition(
  planet: Planet,
  julianDate: number
): PlanetaryPosition {
  const t = (julianDate - J2000_EPOCH) / JULIAN_CENTURY;
  const elements = ORBITAL_ELEMENTS[planet];

  // Mean longitude
  let L = elements.L0 + elements.Ldot * t;
  L = ((L % 360) + 360) % 360;

  // For the Sun, the ecliptic longitude is simpler
  // For planets, we'd need full Kepler equation solution
  // This is simplified - actual implementation would be more complex

  const eclipticLongitude = L * DEG_TO_RAD;
  const eclipticLatitude = elements.i0 * DEG_TO_RAD * Math.sin(eclipticLongitude); // Simplified

  // Convert ecliptic to equatorial coordinates
  const sinLambda = Math.sin(eclipticLongitude);
  const cosLambda = Math.cos(eclipticLongitude);
  const sinBeta = Math.sin(eclipticLatitude);
  const cosBeta = Math.cos(eclipticLatitude);
  const sinEps = Math.sin(OBLIQUITY_J2000);
  const cosEps = Math.cos(OBLIQUITY_J2000);

  // Right Ascension
  const y = sinLambda * cosEps - Math.tan(eclipticLatitude) * sinEps;
  const x = cosLambda;
  const rightAscension = normalizeAngle(Math.atan2(y, x));

  // Declination
  const declination = Math.asin(
    sinBeta * cosEps + cosBeta * sinEps * sinLambda
  );

  return {
    planet,
    rightAscension,
    declination,
    eclipticLongitude: L,
  };
}

/**
 * Calculate all planetary positions for a given date
 */
export function calculateAllPlanetaryPositions(
  julianDate: number,
  planets: Planet[] = ALL_PLANETS
): PlanetaryPosition[] {
  return planets.map(planet => calculatePlanetaryPosition(planet, julianDate));
}

// ============================================
// Line Calculations
// ============================================

/**
 * Calculate MC (Midheaven/Upper Culmination) line for a planet
 * MC is a meridian line at a single longitude
 */
function calculateMCLine(
  position: PlanetaryPosition,
  gmst: number
): PlanetaryLine {
  // MC longitude: where planet's RA equals LST
  // λ_MC = α - θ_G
  const longitudeRad = normalizeAngle(position.rightAscension - gmst);
  let longitudeDeg = longitudeRad * RAD_TO_DEG;

  // Convert to [-180, 180] range
  if (longitudeDeg > 180) longitudeDeg -= 360;

  // MC line runs from pole to pole at this longitude
  const points: GlobePoint[] = [];
  for (let lat = -89; lat <= 89; lat += 2) {
    points.push([lat, longitudeDeg]);
  }

  return {
    planet: position.planet,
    lineType: 'MC',
    points,
    color: PLANET_COLORS[position.planet],
    longitude: longitudeDeg,
  };
}

/**
 * Calculate IC (Imum Coeli/Lower Culmination) line for a planet
 * IC is opposite the MC (180° away)
 */
function calculateICLine(
  position: PlanetaryPosition,
  gmst: number
): PlanetaryLine {
  // IC longitude: opposite MC
  // λ_IC = α + π - θ_G
  const longitudeRad = normalizeAngle(position.rightAscension + Math.PI - gmst);
  let longitudeDeg = longitudeRad * RAD_TO_DEG;

  // Convert to [-180, 180] range
  if (longitudeDeg > 180) longitudeDeg -= 360;

  // IC line runs from pole to pole at this longitude
  const points: GlobePoint[] = [];
  for (let lat = -89; lat <= 89; lat += 2) {
    points.push([lat, longitudeDeg]);
  }

  return {
    planet: position.planet,
    lineType: 'IC',
    points,
    color: PLANET_COLORS[position.planet],
    longitude: longitudeDeg,
  };
}

/**
 * Calculate ASC (Ascendant/Rising) line for a planet
 * ASC line is where the planet is on the eastern horizon
 *
 * Mathematical Basis:
 * Solves sin(φ)sin(δ) + cos(φ)cos(δ)cos(H) = 0 for latitude φ
 * Rearranging: φ = atan2(-cos(δ)cos(H), sin(δ))
 *
 * The atan2 function handles this robustly even as sin(δ) → 0 (yielding poles if cos(H) ≠ 0).
 * Only the true degenerate case (|δ| ≈ 0° AND |cos(H)| ≈ 0) draws a full vertical segment.
 *
 * References:
 * - Sunrise equation: https://en.wikipedia.org/wiki/Sunrise_equation
 * - Rise/set algorithm: https://www.celestialprogramming.com/risesetalgorithm.html
 */
function calculateASCLine(
  position: PlanetaryPosition,
  gmst: number,
  longitudeStep: number = 1
): PlanetaryLine {
  const { rightAscension, declination, planet } = position;
  const points: GlobePoint[] = [];

  const sinDelta = Math.sin(declination);
  const cosDelta = Math.cos(declination);
  const EPS = 1e-9;

  // ADAPTIVE STEPPING: For planets with low declination (|δ| < 10°), horizon
  // curves sharpen dramatically. Use finer 0.5° step to avoid undersampling.
  const decDeg = Math.abs(declination) * RAD_TO_DEG;
  const adaptiveStep = decDeg < 10 ? 0.5 : longitudeStep;

  for (let lng = -180; lng <= 180; lng += adaptiveStep) {
    const longitudeRad = lng * DEG_TO_RAD;
    const hourAngle = normalizeSignedAngle(gmst + longitudeRad - rightAscension);
    const cosH = Math.cos(hourAngle);
    const sinH = Math.sin(hourAngle);

    // Rising condition: sin(H) < 0
    if (sinH >= 0) continue;

    // True degenerate case: |sin(δ)| ≈ 0 AND |cos(H)| ≈ 0
    // All latitudes satisfy the horizon equation - draw full vertical segment
    if (Math.abs(sinDelta) < EPS && Math.abs(cosH) < EPS) {
      for (let lat = -89; lat <= 89; lat += 2) {
        points.push([lat, lng]);
      }
      continue;
    }

    // When sin(δ) ≈ 0 but cos(H) ≠ 0: tan(φ) → ±∞, so φ → ±90°
    if (Math.abs(sinDelta) < EPS) {
      // Explicit formula from limit: as sin(δ)→0, φ→±90° based on sign of -cos(δ)cos(H)
      const latitude = 90 * Math.sign(-cosDelta * cosH);
      points.push([latitude, lng]);
      continue;
    }

    // Standard formula: φ = arctan(-cos(δ)cos(H) / sin(δ))
    // Using atan (not atan2) ensures result is in [-90°, 90°] latitude range
    const tanPhi = (-cosDelta * cosH) / sinDelta;
    const latitude = Math.atan(tanPhi) * RAD_TO_DEG;

    // Clamp to valid latitude range (safety check)
    const clampedLat = Math.max(-90, Math.min(90, latitude));
    points.push([clampedLat, lng]);
  }

  return {
    planet,
    lineType: 'ASC',
    points,
    color: PLANET_COLORS[planet],
  };
}

/**
 * Calculate DSC (Descendant/Setting) line for a planet
 * DSC line is where the planet is on the western horizon
 *
 * Mathematical Basis:
 * Solves sin(φ)sin(δ) + cos(φ)cos(δ)cos(H) = 0 for latitude φ
 * Rearranging: φ = atan2(-cos(δ)cos(H), sin(δ))
 *
 * The atan2 function handles this robustly even as sin(δ) → 0 (yielding poles if cos(H) ≠ 0).
 * Only the true degenerate case (|δ| ≈ 0° AND |cos(H)| ≈ 0) draws a full vertical segment.
 *
 * References:
 * - Sunrise equation: https://en.wikipedia.org/wiki/Sunrise_equation
 * - Rise/set algorithm: https://www.celestialprogramming.com/risesetalgorithm.html
 */
function calculateDSCLine(
  position: PlanetaryPosition,
  gmst: number,
  longitudeStep: number = 1
): PlanetaryLine {
  const { rightAscension, declination, planet } = position;
  const points: GlobePoint[] = [];

  const sinDelta = Math.sin(declination);
  const cosDelta = Math.cos(declination);
  const EPS = 1e-9;

  // ADAPTIVE STEPPING: For planets with low declination (|δ| < 10°), horizon
  // curves sharpen dramatically. Use finer 0.5° step to avoid undersampling.
  const decDeg = Math.abs(declination) * RAD_TO_DEG;
  const adaptiveStep = decDeg < 10 ? 0.5 : longitudeStep;

  for (let lng = -180; lng <= 180; lng += adaptiveStep) {
    const longitudeRad = lng * DEG_TO_RAD;
    const hourAngle = normalizeSignedAngle(gmst + longitudeRad - rightAscension);
    const cosH = Math.cos(hourAngle);
    const sinH = Math.sin(hourAngle);

    // Setting condition: sin(H) > 0
    if (sinH <= 0) continue;

    // True degenerate case: |sin(δ)| ≈ 0 AND |cos(H)| ≈ 0
    // All latitudes satisfy the horizon equation - draw full vertical segment
    if (Math.abs(sinDelta) < EPS && Math.abs(cosH) < EPS) {
      for (let lat = -89; lat <= 89; lat += 2) {
        points.push([lat, lng]);
      }
      continue;
    }

    // When sin(δ) ≈ 0 but cos(H) ≠ 0: tan(φ) → ±∞, so φ → ±90°
    if (Math.abs(sinDelta) < EPS) {
      // Explicit formula from limit: as sin(δ)→0, φ→±90° based on sign of -cos(δ)cos(H)
      const latitude = 90 * Math.sign(-cosDelta * cosH);
      points.push([latitude, lng]);
      continue;
    }

    // Standard formula: φ = arctan(-cos(δ)cos(H) / sin(δ))
    // Using atan (not atan2) ensures result is in [-90°, 90°] latitude range
    const tanPhi = (-cosDelta * cosH) / sinDelta;
    const latitude = Math.atan(tanPhi) * RAD_TO_DEG;

    // Clamp to valid latitude range (safety check)
    const clampedLat = Math.max(-90, Math.min(90, latitude));
    points.push([clampedLat, lng]);
  }

  return {
    planet,
    lineType: 'DSC',
    points,
    color: PLANET_COLORS[planet],
  };
}

/**
 * Calculate all four lines for a single planet
 */
function calculatePlanetLines(
  position: PlanetaryPosition,
  gmst: number,
  lineTypes: LineType[],
  longitudeStep: number
): PlanetaryLine[] {
  const lines: PlanetaryLine[] = [];

  if (lineTypes.includes('MC')) {
    lines.push(calculateMCLine(position, gmst));
  }
  if (lineTypes.includes('IC')) {
    lines.push(calculateICLine(position, gmst));
  }
  if (lineTypes.includes('ASC')) {
    lines.push(calculateASCLine(position, gmst, longitudeStep));
  }
  if (lineTypes.includes('DSC')) {
    lines.push(calculateDSCLine(position, gmst, longitudeStep));
  }

  return lines;
}

// ============================================
// Aspect Lines (Full Planet-to-Planet)
// ============================================

/**
 * Calculate the angular separation between two points on the celestial sphere
 * using the spherical law of cosines
 */
function angularSeparation(
  ra1: number, dec1: number,
  ra2: number, dec2: number
): number {
  const cosSep = Math.sin(dec1) * Math.sin(dec2) +
                 Math.cos(dec1) * Math.cos(dec2) * Math.cos(ra1 - ra2);
  return Math.acos(clamp(cosSep, -1, 1));
}

/**
 * Calculate aspect lines between two planets
 * Shows where on Earth the angular separation equals the aspect angle
 */
function calculatePlanetToplanetAspectLine(
  position1: PlanetaryPosition,
  position2: PlanetaryPosition,
  gmst: number,
  aspectType: AspectType,
  longitudeStep: number = 2
): AspectLine | null {
  const aspectAngle = ASPECT_ANGLES[aspectType] * DEG_TO_RAD;
  const orb = 1 * DEG_TO_RAD; // 1 degree orb for display

  // Check if the planets actually form this aspect
  const actualSeparation = angularSeparation(
    position1.rightAscension, position1.declination,
    position2.rightAscension, position2.declination
  );

  // Allow aspect or its complement (for aspects that can be measured either way)
  const isInAspect = Math.abs(actualSeparation - aspectAngle) < (10 * DEG_TO_RAD) ||
                     Math.abs(actualSeparation - (2 * Math.PI - aspectAngle)) < (10 * DEG_TO_RAD);

  if (!isInAspect) {
    return null; // Planets don't form this aspect
  }

  const points: GlobePoint[] = [];

  // For each longitude, find latitudes where aspect is exact
  for (let lng = -180; lng <= 180; lng += longitudeStep) {
    const longitudeRad = lng * DEG_TO_RAD;
    const lst = normalizeAngle(gmst + longitudeRad);

    // Calculate hour angles for both planets
    const ha1 = lst - position1.rightAscension;
    const ha2 = lst - position2.rightAscension;

    // For various latitudes, check if the aspect is exact when viewed from that location
    for (let lat = -85; lat <= 85; lat += 5) {
      const latRad = lat * DEG_TO_RAD;

      // Calculate altitude of each planet at this location
      const sinAlt1 = Math.sin(latRad) * Math.sin(position1.declination) +
                      Math.cos(latRad) * Math.cos(position1.declination) * Math.cos(ha1);
      const sinAlt2 = Math.sin(latRad) * Math.sin(position2.declination) +
                      Math.cos(latRad) * Math.cos(position2.declination) * Math.cos(ha2);

      // Both planets should be above horizon for the aspect to be "active"
      if (sinAlt1 > -0.1 && sinAlt2 > -0.1) {
        // Calculate local angular separation (this is the ecliptic longitude difference projected)
        const localSep = angularSeparation(
          position1.rightAscension, position1.declination,
          position2.rightAscension, position2.declination
        );

        if (Math.abs(localSep - aspectAngle) < orb) {
          points.push([lat, lng]);
        }
      }
    }
  }

  // Create a blended color from both planets
  const color1 = PLANET_COLORS[position1.planet];
  const color2 = PLANET_COLORS[position2.planet];

  return {
    planet: position1.planet, // Primary planet
    planet2: position2.planet, // Secondary planet
    aspectType,
    angle: 'MC', // Placeholder - aspects aren't tied to a specific angle
    points,
    color: color1 + '60', // Semi-transparent
  } as AspectLine & { planet2: Planet };
}

/**
 * Calculate all aspect lines between planet pairs
 */
function calculateAllAspectLines(
  positions: PlanetaryPosition[],
  gmst: number,
  aspectTypes: AspectType[],
  longitudeStep: number
): AspectLine[] {
  const aspectLines: AspectLine[] = [];

  // For each pair of planets
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const pos1 = positions[i];
      const pos2 = positions[j];

      // For each aspect type
      for (const aspectType of aspectTypes) {
        const line = calculatePlanetToplanetAspectLine(
          pos1, pos2, gmst, aspectType, longitudeStep
        );
        if (line && line.points.length > 0) {
          aspectLines.push(line);
        }
      }
    }
  }

  return aspectLines;
}

// ============================================
// Paran Lines
// ============================================

/**
 * Paran (Paranatellonta) lines show latitudes where two planets
 * simultaneously occupy different angles (MC, IC, ASC, DSC)
 *
 * For example: the latitude where Sun is on MC while Moon is on ASC
 */

type AnglePair = {
  angle1: LineType;
  angle2: LineType;
};

// All meaningful paran combinations (excluding same-angle parans)
const PARAN_COMBINATIONS: AnglePair[] = [
  { angle1: 'MC', angle2: 'ASC' },
  { angle1: 'MC', angle2: 'DSC' },
  { angle1: 'MC', angle2: 'IC' },
  { angle1: 'IC', angle2: 'ASC' },
  { angle1: 'IC', angle2: 'DSC' },
  { angle1: 'ASC', angle2: 'DSC' },
];

/**
 * Calculate the hour angle when a planet is on a specific angle at a given latitude
 */
function getHourAngleForAngle(
  declination: number,
  latitude: number,
  angleType: LineType
): number | null {
  const latRad = latitude * DEG_TO_RAD;
  const tanLat = Math.tan(latRad);
  const tanDec = Math.tan(declination);

  switch (angleType) {
    case 'MC':
      // Planet on MC: Hour angle = 0
      return 0;

    case 'IC':
      // Planet on IC: Hour angle = π (12 hours)
      return Math.PI;

    case 'ASC':
    case 'DSC': {
      // Planet on horizon: cos(H) = -tan(φ) * tan(δ)
      const cosH = -tanLat * tanDec;

      // Check if planet rises/sets at this latitude
      if (Math.abs(cosH) > 1) {
        return null; // Planet is circumpolar or never rises
      }

      const H = Math.acos(cosH);
      // ASC: rising (negative hour angle), DSC: setting (positive)
      return angleType === 'ASC' ? -H : H;
    }
  }
}

/**
 * Calculate the longitude where a planet has a specific hour angle
 */
function getLongitudeForHourAngle(
  rightAscension: number,
  hourAngle: number,
  gmst: number
): number {
  // LST = RA + H, and LST = GMST + longitude
  // Therefore: longitude = RA + H - GMST
  const longitudeRad = normalizeAngle(rightAscension + hourAngle - gmst);
  let longitudeDeg = longitudeRad * RAD_TO_DEG;
  if (longitudeDeg > 180) longitudeDeg -= 360;
  return longitudeDeg;
}

/**
 * Calculate paran latitude for a specific planet pair and angle combination
 * Returns the latitude(s) where planet1 is on angle1 while planet2 is on angle2
 */
function calculateParanLatitude(
  position1: PlanetaryPosition,
  position2: PlanetaryPosition,
  angle1: LineType,
  angle2: LineType,
  gmst: number
): ParanLine[] {
  const parans: ParanLine[] = [];

  // For MC-IC parans (both vertical lines), the paran is a full latitude circle
  // The condition is that both planets' RA difference equals the angle difference
  if ((angle1 === 'MC' || angle1 === 'IC') && (angle2 === 'MC' || angle2 === 'IC')) {
    // MC-MC or IC-IC doesn't make sense for different planets at same time
    // MC-IC: planets are on opposite meridians
    const raDiff = normalizeAngle(position1.rightAscension - position2.rightAscension);
    const expectedDiff = (angle1 === angle2) ? 0 : Math.PI;

    if (Math.abs(raDiff - expectedDiff) < 0.1 || Math.abs(raDiff - expectedDiff - 2 * Math.PI) < 0.1) {
      // This paran exists at all latitudes - represented as a special case
      parans.push({
        planet1: position1.planet,
        angle1,
        planet2: position2.planet,
        angle2,
        latitude: 0, // Center latitude for display
        isLatitudeCircle: true,
      });
    }
    return parans;
  }

  // For horizon-involved parans, we need to find specific latitudes
  // Search through latitudes to find where the condition is met
  for (let lat = -66; lat <= 66; lat += 0.5) {
    const h1 = getHourAngleForAngle(position1.declination, lat, angle1);
    const h2 = getHourAngleForAngle(position2.declination, lat, angle2);

    if (h1 === null || h2 === null) continue;

    // Calculate the longitudes where each condition is met
    const lng1 = getLongitudeForHourAngle(position1.rightAscension, h1, gmst);
    const lng2 = getLongitudeForHourAngle(position2.rightAscension, h2, gmst);

    // The paran occurs when both conditions happen at the same longitude
    // Check if longitudes are close (within tolerance)
    const lngDiff = Math.abs(lng1 - lng2);
    if (lngDiff < 2 || lngDiff > 358) {
      parans.push({
        planet1: position1.planet,
        angle1,
        planet2: position2.planet,
        angle2,
        latitude: lat,
        longitude: (lng1 + lng2) / 2,
        isLatitudeCircle: true,
      });
    }
  }

  // Remove duplicate latitudes (keep only distinct ones)
  const uniqueParans: ParanLine[] = [];
  const seenLatitudes = new Set<number>();

  for (const paran of parans) {
    const roundedLat = Math.round(paran.latitude * 2) / 2; // Round to 0.5 degree
    if (!seenLatitudes.has(roundedLat)) {
      seenLatitudes.add(roundedLat);
      uniqueParans.push({ ...paran, latitude: roundedLat });
    }
  }

  return uniqueParans;
}

/**
 * Calculate all paran lines for all planet pairs
 */
function calculateAllParanLines(
  positions: PlanetaryPosition[],
  gmst: number
): ParanLine[] {
  const paranLines: ParanLine[] = [];

  // For each pair of planets
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const pos1 = positions[i];
      const pos2 = positions[j];

      // For each angle combination
      for (const combo of PARAN_COMBINATIONS) {
        // Calculate both directions (planet1-angle1 + planet2-angle2 AND vice versa)
        const parans1 = calculateParanLatitude(pos1, pos2, combo.angle1, combo.angle2, gmst);
        const parans2 = calculateParanLatitude(pos2, pos1, combo.angle1, combo.angle2, gmst);

        paranLines.push(...parans1, ...parans2);
      }
    }
  }

  return paranLines;
}

// ============================================
// Main Calculation Function
// ============================================

/**
 * Calculate all astrocartography lines for birth data
 */
export function calculateAstroCartography(
  birthData: BirthData,
  options: AstroCalculationOptions = {}
): AstroCartographyResult {
  const startTime = performance.now();
  const opts = { ...DEFAULT_ASTRO_OPTIONS, ...options };

  // Calculate Julian Date and GMST
  const julianDate = toJulianDate(birthData.date);
  const gmst = calculateGMST(julianDate);

  // Calculate planetary positions
  const planetaryPositions = calculateAllPlanetaryPositions(julianDate, opts.planets);

  // Calculate planetary lines
  const planetaryLines: PlanetaryLine[] = [];
  for (const position of planetaryPositions) {
    const lines = calculatePlanetLines(
      position,
      gmst,
      opts.lineTypes,
      opts.longitudeStep
    );
    planetaryLines.push(...lines);
  }

  // Calculate aspect lines (if requested)
  let aspectLines: AspectLine[] = [];
  if (opts.includeAspects) {
    aspectLines = calculateAllAspectLines(
      planetaryPositions,
      gmst,
      opts.aspectTypes,
      opts.longitudeStep * 2 // Coarser step for aspects (performance)
    );
  }

  // Calculate paran lines (if requested)
  let paranLines: ParanLine[] = [];
  if (opts.includeParans) {
    paranLines = calculateAllParanLines(planetaryPositions, gmst);
  }

  const calculationTime = performance.now() - startTime;

  return {
    birthData,
    julianDate,
    gmst,
    planetaryPositions,
    planetaryLines,
    aspectLines,
    paranLines,
    calculationBackend: 'main',
    calculationTime,
  };
}

/**
 * Quick test function to verify calculations
 */
export function testCalculations(): void {
  const testDate = new Date('2000-01-01T12:00:00Z');
  const testBirthData: BirthData = {
    date: testDate,
    latitude: 40.7128,
    longitude: -74.0060,
  };

  console.log('Testing astrocartography calculations...');
  console.log('Test date:', testDate.toISOString());

  const jd = toJulianDate(testDate);
  console.log('Julian Date:', jd, '(expected ~2451545.0)');

  const gmst = calculateGMST(jd);
  console.log('GMST (radians):', gmst);
  console.log('GMST (degrees):', gmst * RAD_TO_DEG);

  const result = calculateAstroCartography(testBirthData);
  console.log('Calculated', result.planetaryLines.length, 'planetary lines');
  console.log('Calculation time:', result.calculationTime.toFixed(2), 'ms');
}
