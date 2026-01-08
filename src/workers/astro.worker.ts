/**
 * Astrocartography Web Worker
 * Performs planetary line calculations off the main thread
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

// ============================================
// Constants (duplicated for worker isolation)
// ============================================

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const J2000_EPOCH = 2451545.0;
const JULIAN_CENTURY = 36525.0;
const OBLIQUITY_J2000 = 23.439291 * DEG_TO_RAD;

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

// Orbital elements for planets
interface OrbitalElements {
  L0: number;
  Ldot: number;
  e0: number;
  i0: number;
  omega0: number;
  Omega0: number;
}

const ORBITAL_ELEMENTS: Record<Planet, OrbitalElements> = {
  Sun: { L0: 280.46646, Ldot: 36000.76983, e0: 0.01671123, i0: 0, omega0: 102.93768, Omega0: 0 },
  Moon: { L0: 218.3165, Ldot: 481267.8813, e0: 0.0549, i0: 5.145, omega0: 83.3532, Omega0: 125.0446 },
  Mercury: { L0: 252.25084, Ldot: 149472.67411, e0: 0.20563593, i0: 7.00497, omega0: 77.45645, Omega0: 48.33076 },
  Venus: { L0: 181.97973, Ldot: 58517.81539, e0: 0.00677672, i0: 3.39467, omega0: 131.60246, Omega0: 76.67984 },
  Mars: { L0: 355.45332, Ldot: 19140.30268, e0: 0.09339410, i0: 1.84969, omega0: 336.04084, Omega0: 49.55809 },
  Jupiter: { L0: 34.39644, Ldot: 3034.74612, e0: 0.04838624, i0: 1.30327, omega0: 14.75385, Omega0: 100.47390 },
  Saturn: { L0: 49.95424, Ldot: 1222.49362, e0: 0.05386179, i0: 2.48599, omega0: 92.59887, Omega0: 113.66242 },
  Uranus: { L0: 313.23218, Ldot: 428.48202, e0: 0.04725744, i0: 0.77263, omega0: 170.96424, Omega0: 74.01692 },
  Neptune: { L0: 304.87997, Ldot: 218.45946, e0: 0.00859048, i0: 1.76995, omega0: 44.96476, Omega0: 131.78422 },
  Pluto: { L0: 238.92881, Ldot: 145.20780, e0: 0.24882730, i0: 17.14175, omega0: 224.06891, Omega0: 110.30393 },
  // Chiron - centaur with 50-year orbit between Saturn and Uranus
  Chiron: { L0: 209.35, Ldot: 259.83, e0: 0.37911, i0: 6.93, omega0: 339.56, Omega0: 209.38 },
  // NorthNode - Mean Lunar Node (retrograde motion, ~18.6 year cycle)
  NorthNode: { L0: 125.04, Ldot: -6962.025, e0: 0, i0: 5.145, omega0: 0, Omega0: 125.04 },
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
// Planetary Positions
// ============================================

function calculatePlanetaryPosition(planet: Planet, julianDate: number): PlanetaryPosition {
  const t = (julianDate - J2000_EPOCH) / JULIAN_CENTURY;
  const elements = ORBITAL_ELEMENTS[planet];

  let L = elements.L0 + elements.Ldot * t;
  L = ((L % 360) + 360) % 360;

  const eclipticLongitude = L * DEG_TO_RAD;
  const eclipticLatitude = elements.i0 * DEG_TO_RAD * Math.sin(eclipticLongitude);

  const sinLambda = Math.sin(eclipticLongitude);
  const cosLambda = Math.cos(eclipticLongitude);
  const sinEps = Math.sin(OBLIQUITY_J2000);
  const cosEps = Math.cos(OBLIQUITY_J2000);

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
