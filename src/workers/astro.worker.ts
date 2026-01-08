/**
 * Astrocartography Web Worker
 * Performs planetary line calculations off the main thread
 *
 * Uses aa-js for high-precision planetary positions (~0.01 arcsecond accuracy)
 * matching the VSOP87 precision used in the WASM implementation.
 */

import type {
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
} from '@/lib/astro-types';

// Import aa-js for high-precision ephemeris calculations
import {
  Sun as AAJSSun,
  Mercury as AAJSMercury,
  Venus as AAJSVenus,
  Mars as AAJSMars,
  Jupiter as AAJSJupiter,
  Saturn as AAJSSaturn,
  Uranus as AAJSUranus,
  Neptune as AAJSNeptune,
  Pluto as AAJSPluto,
  Earth as AAJSEarth,
} from 'aa-js';

// ============================================
// Constants (duplicated for worker isolation)
// ============================================

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const J2000_EPOCH = 2451545.0;
const JULIAN_CENTURY = 36525.0;

const ALL_PLANETS: Planet[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto'
];

const ALL_LINE_TYPES: LineType[] = ['MC', 'IC', 'ASC', 'DSC'];

const PLANET_COLORS: Record<Planet, string> = {
  Sun: '#FFD700',
  Moon: '#C0C0C0',
  Mercury: '#B8860B',
  Venus: '#FF69B4',
  Mars: '#DC143C',
  Jupiter: '#9400D3',
  Saturn: '#8B4513',
  Uranus: '#00CED1',
  Neptune: '#4169E1',
  Pluto: '#2F4F4F',
};

const ASPECT_ANGLES: Record<AspectType, number> = {
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};

// ============================================
// Utility Functions
// ============================================

function normalizeAngle(angle: number): number {
  const twoPi = 2 * Math.PI;
  return ((angle % twoPi) + twoPi) % twoPi;
}

function normalizeSignedAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

// ============================================
// Time Calculations
// ============================================

function toJulianDate(date: Date): number {
  const year = date.getUTCFullYear();
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const hour = date.getUTCHours();
  const minute = date.getUTCMinutes();
  const second = date.getUTCSeconds();

  const ut = hour + minute / 60 + second / 3600;

  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }

  const a = Math.floor(y / 100);
  const b = 2 - a + Math.floor(a / 4);

  return Math.floor(365.25 * (y + 4716)) +
         Math.floor(30.6001 * (m + 1)) +
         day + ut / 24 + b - 1524.5;
}

function calculateGMST(julianDate: number): number {
  const t = (julianDate - J2000_EPOCH) / JULIAN_CENTURY;

  let thetaG = 280.46061837 +
               360.98564736629 * (julianDate - J2000_EPOCH) +
               0.000387933 * t * t -
               t * t * t / 38710000;

  thetaG = ((thetaG % 360) + 360) % 360;

  return thetaG * DEG_TO_RAD;
}

// ============================================
// Planetary Positions (using aa-js for high precision)
// ============================================

/**
 * aa-js planet calculators for high-precision ephemeris
 * These provide ~0.01 arcsecond accuracy, matching VSOP87/ELP2000-82
 */
type AAJSPlanetKey = 'Sun' | 'Moon' | 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn' | 'Uranus' | 'Neptune' | 'Pluto';

const AAJS_CALCULATORS: Record<AAJSPlanetKey, {
  getEcliptic: (jd: number) => { longitude: number; latitude: number };
  getEquatorial: (jd: number) => { rightAscension: number; declination: number };
}> = {
  Sun: {
    getEcliptic: (jd) => AAJSSun.getApparentGeocentricEclipticCoordinates(jd),
    getEquatorial: (jd) => AAJSSun.getApparentGeocentricEquatorialCoordinates(jd),
  },
  Moon: {
    getEcliptic: (jd) => AAJSEarth.Moon.getGeocentricEclipticCoordinates(jd),
    getEquatorial: (jd) => AAJSEarth.Moon.getApparentGeocentricEquatorialCoordinates(jd),
  },
  Mercury: {
    getEcliptic: (jd) => AAJSMercury.getApparentGeocentricEclipticCoordinates(jd),
    getEquatorial: (jd) => AAJSMercury.getApparentGeocentricEquatorialCoordinates(jd),
  },
  Venus: {
    getEcliptic: (jd) => AAJSVenus.getApparentGeocentricEclipticCoordinates(jd),
    getEquatorial: (jd) => AAJSVenus.getApparentGeocentricEquatorialCoordinates(jd),
  },
  Mars: {
    getEcliptic: (jd) => AAJSMars.getApparentGeocentricEclipticCoordinates(jd),
    getEquatorial: (jd) => AAJSMars.getApparentGeocentricEquatorialCoordinates(jd),
  },
  Jupiter: {
    getEcliptic: (jd) => AAJSJupiter.getApparentGeocentricEclipticCoordinates(jd),
    getEquatorial: (jd) => AAJSJupiter.getApparentGeocentricEquatorialCoordinates(jd),
  },
  Saturn: {
    getEcliptic: (jd) => AAJSSaturn.getApparentGeocentricEclipticCoordinates(jd),
    getEquatorial: (jd) => AAJSSaturn.getApparentGeocentricEquatorialCoordinates(jd),
  },
  Uranus: {
    getEcliptic: (jd) => AAJSUranus.getApparentGeocentricEclipticCoordinates(jd),
    getEquatorial: (jd) => AAJSUranus.getApparentGeocentricEquatorialCoordinates(jd),
  },
  Neptune: {
    getEcliptic: (jd) => AAJSNeptune.getApparentGeocentricEclipticCoordinates(jd),
    getEquatorial: (jd) => AAJSNeptune.getApparentGeocentricEquatorialCoordinates(jd),
  },
  Pluto: {
    getEcliptic: (jd) => AAJSPluto.getApparentGeocentricEclipticCoordinates(jd),
    getEquatorial: (jd) => AAJSPluto.getApparentGeocentricEquatorialCoordinates(jd),
  },
};

/**
 * Calculate planetary position using aa-js high-precision ephemeris
 * Provides ~0.01 arcsecond accuracy, matching WASM/VSOP87 precision
 */
function calculatePlanetaryPosition(planet: Planet, julianDate: number): PlanetaryPosition {
  // Check if planet is supported by aa-js
  const calculator = AAJS_CALCULATORS[planet as AAJSPlanetKey];

  if (calculator) {
    // Use aa-js for high-precision calculation
    const ecliptic = calculator.getEcliptic(julianDate);
    const equatorial = calculator.getEquatorial(julianDate);

    // Convert RA from hours to radians (aa-js returns hours)
    const rightAscension = (equatorial.rightAscension / 24) * 2 * Math.PI;
    // Convert Dec from degrees to radians
    const declination = equatorial.declination * DEG_TO_RAD;

    return {
      planet,
      rightAscension: normalizeAngle(rightAscension),
      declination,
      eclipticLongitude: ecliptic.longitude,
    };
  }

  // Fallback for unsupported planets (Chiron, NorthNode) - use simplified calculation
  // These are less commonly used and simplified orbital elements are acceptable
  return calculatePlanetaryPositionFallback(planet, julianDate);
}

/**
 * Fallback calculation for planets not supported by aa-js (Chiron, NorthNode)
 * Uses simplified orbital elements - lower precision but acceptable for these bodies
 */
function calculatePlanetaryPositionFallback(planet: Planet, julianDate: number): PlanetaryPosition {
  const t = (julianDate - J2000_EPOCH) / JULIAN_CENTURY;

  // Fallback orbital elements for Chiron and NorthNode
  const FALLBACK_ELEMENTS: Record<string, { L0: number; Ldot: number; i0: number }> = {
    Chiron: { L0: 209.35, Ldot: 259.83, i0: 6.93 },
    NorthNode: { L0: 125.04, Ldot: -6962.025, i0: 5.145 },
  };

  const elements = FALLBACK_ELEMENTS[planet] || { L0: 0, Ldot: 0, i0: 0 };

  let L = elements.L0 + elements.Ldot * t;
  L = ((L % 360) + 360) % 360;

  const eclipticLongitude = L * DEG_TO_RAD;
  const eclipticLatitude = elements.i0 * DEG_TO_RAD * Math.sin(eclipticLongitude);

  // Obliquity of ecliptic (use IAU 2006 model for consistency)
  const eps0 = 84381.406 / 3600.0; // J2000 obliquity in degrees
  const eps = eps0 - (46.836769 / 3600.0) * t; // First-order correction
  const obliquity = eps * DEG_TO_RAD;

  const sinLambda = Math.sin(eclipticLongitude);
  const cosLambda = Math.cos(eclipticLongitude);
  const sinEps = Math.sin(obliquity);
  const cosEps = Math.cos(obliquity);

  const y = sinLambda * cosEps - Math.tan(eclipticLatitude) * sinEps;
  const x = cosLambda;
  const rightAscension = normalizeAngle(Math.atan2(y, x));

  const declination = Math.asin(
    Math.sin(eclipticLatitude) * cosEps +
    Math.cos(eclipticLatitude) * sinEps * sinLambda
  );

  return {
    planet,
    rightAscension,
    declination,
    eclipticLongitude: L,
  };
}

// ============================================
// Line Calculations
// ============================================

function calculateMCLine(position: PlanetaryPosition, gmst: number): PlanetaryLine {
  const longitudeRad = normalizeAngle(position.rightAscension - gmst);
  let longitudeDeg = longitudeRad * RAD_TO_DEG;
  if (longitudeDeg > 180) longitudeDeg -= 360;

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

function calculateICLine(position: PlanetaryPosition, gmst: number): PlanetaryLine {
  const longitudeRad = normalizeAngle(position.rightAscension + Math.PI - gmst);
  let longitudeDeg = longitudeRad * RAD_TO_DEG;
  if (longitudeDeg > 180) longitudeDeg -= 360;

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

function calculateASCLine(position: PlanetaryPosition, gmst: number, longitudeStep: number = 1): PlanetaryLine {
  const { rightAscension, declination, planet } = position;
  const points: GlobePoint[] = [];

  const sinDelta = Math.sin(declination);
  const cosDelta = Math.cos(declination);
  const EPS = 1e-9;

  // ADAPTIVE STEPPING: Use finer step for low-declination planets
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
    if (Math.abs(sinDelta) < EPS && Math.abs(cosH) < EPS) {
      for (let lat = -89; lat <= 89; lat += 2) {
        points.push([lat, lng]);
      }
      continue;
    }

    // When sin(δ) ≈ 0 but cos(H) ≠ 0: NO valid horizon crossing at this longitude
    // Equatorial bodies only rise/set at cardinal E/W points (H = ±90°)
    if (Math.abs(sinDelta) < EPS) {
      continue; // Skip this point - gap is geometrically real
    }

    // Standard formula: φ = arctan(-cos(δ)cos(H) / sin(δ))
    const tanPhi = (-cosDelta * cosH) / sinDelta;
    const latitude = Math.atan(tanPhi) * RAD_TO_DEG;
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

function calculateDSCLine(position: PlanetaryPosition, gmst: number, longitudeStep: number = 1): PlanetaryLine {
  const { rightAscension, declination, planet } = position;
  const points: GlobePoint[] = [];

  const sinDelta = Math.sin(declination);
  const cosDelta = Math.cos(declination);
  const EPS = 1e-9;

  // ADAPTIVE STEPPING: Use finer step for low-declination planets
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
    if (Math.abs(sinDelta) < EPS && Math.abs(cosH) < EPS) {
      for (let lat = -89; lat <= 89; lat += 2) {
        points.push([lat, lng]);
      }
      continue;
    }

    // When sin(δ) ≈ 0 but cos(H) ≠ 0: NO valid horizon crossing at this longitude
    // Equatorial bodies only rise/set at cardinal E/W points (H = ±90°)
    if (Math.abs(sinDelta) < EPS) {
      continue; // Skip this point - gap is geometrically real
    }

    // Standard formula: φ = arctan(-cos(δ)cos(H) / sin(δ))
    const tanPhi = (-cosDelta * cosH) / sinDelta;
    const latitude = Math.atan(tanPhi) * RAD_TO_DEG;
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
// Main Calculation Function
// ============================================

function calculateAstroCartography(
  birthData: BirthData,
  options: AstroCalculationOptions
): AstroCartographyResult {
  const startTime = performance.now();

  const planets = options.planets || ALL_PLANETS;
  const lineTypes = options.lineTypes || ALL_LINE_TYPES;
  const longitudeStep = options.longitudeStep || 1;

  // Calculate Julian Date and GMST
  const julianDate = toJulianDate(birthData.date);
  const gmst = calculateGMST(julianDate);

  // Calculate planetary positions
  const planetaryPositions: PlanetaryPosition[] = planets.map(
    planet => calculatePlanetaryPosition(planet, julianDate)
  );

  // Calculate planetary lines
  const planetaryLines: PlanetaryLine[] = [];
  for (const position of planetaryPositions) {
    const lines = calculatePlanetLines(position, gmst, lineTypes, longitudeStep);
    planetaryLines.push(...lines);
  }

  const calculationTime = performance.now() - startTime;

  return {
    birthData,
    julianDate,
    gmst,
    planetaryPositions,
    planetaryLines,
    aspectLines: [],
    paranLines: [],
    calculationBackend: 'worker',
    calculationTime,
  };
}

// ============================================
// Worker Message Handler
// ============================================

interface WorkerRequest {
  type: 'calculate';
  id: string;
  birthData: {
    date: string; // ISO string
    latitude: number;
    longitude: number;
  };
  options: AstroCalculationOptions;
}

interface WorkerResponse {
  type: 'result' | 'progress' | 'error';
  id: string;
  result?: AstroCartographyResult;
  progress?: { percent: number; stage: string };
  error?: string;
}

self.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const { type, id, birthData, options } = event.data;

  if (type !== 'calculate') {
    self.postMessage({
      type: 'error',
      id,
      error: `Unknown message type: ${type}`,
    } as WorkerResponse);
    return;
  }

  try {
    // Send progress update
    self.postMessage({
      type: 'progress',
      id,
      progress: { percent: 0, stage: 'Starting calculation...' },
    } as WorkerResponse);

    // Convert date string back to Date object
    const birthDataWithDate: BirthData = {
      date: new Date(birthData.date),
      latitude: birthData.latitude,
      longitude: birthData.longitude,
    };

    // Send progress update
    self.postMessage({
      type: 'progress',
      id,
      progress: { percent: 50, stage: 'Calculating planetary positions...' },
    } as WorkerResponse);

    // Perform calculation
    const result = calculateAstroCartography(birthDataWithDate, options);

    // Send result
    self.postMessage({
      type: 'result',
      id,
      result,
    } as WorkerResponse);

  } catch (error) {
    self.postMessage({
      type: 'error',
      id,
      error: error instanceof Error ? error.message : 'Unknown error',
    } as WorkerResponse);
  }
};

// Export for TypeScript
export {};
