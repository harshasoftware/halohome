/**
 * Scout Optimized Worker - Parallel TypeScript processing
 *
 * Handles city batches for parallel scout scoring
 */

// ============================================================================
// Constants (duplicated for worker isolation)
// ============================================================================

const EARTH_RADIUS_KM = 6371.0;
const DEG_TO_RAD = Math.PI / 180;
const WEIGHTS = [1.0, 0.6, 0.35, 0.2, 0.1, 0.08, 0.05];
const WEIGHTS_SUM = 2.38;

// ============================================================================
// Types
// ============================================================================

interface City {
  name: string;
  country: string;
  lat: number;
  lng: number;
}

interface LineSegment {
  lat1: number;
  lng1: number;
  lat2: number;
  lng2: number;
}

interface PreparedLine {
  planet: string;
  angle: string;
  rating: number;
  segments: LineSegment[];
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

interface CityScore {
  name: string;
  country: string;
  lat: number;
  lng: number;
  score: number;
  topInfluences: Array<{ planet: string; angle: string; distance: number }>;
}

interface ScoutConfig {
  maxDistanceKm: number;
  kernelSigma: number;
}

interface WorkerMessage {
  type: 'scout';
  cities: City[];
  lines: PreparedLine[];
  config: ScoutConfig;
  batchId: number;
}

interface WorkerResponse {
  type: 'result';
  results: CityScore[];
  batchId: number;
}

// ============================================================================
// Distance Calculations (inlined for performance)
// ============================================================================

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const lat1Rad = lat1 * DEG_TO_RAD;
  const lat2Rad = lat2 * DEG_TO_RAD;
  const dLat = (lat2 - lat1) * DEG_TO_RAD;
  const dLng = (lng2 - lng1) * DEG_TO_RAD;

  const sinDLat = Math.sin(dLat * 0.5);
  const sinDLng = Math.sin(dLng * 0.5);

  const a = sinDLat * sinDLat + Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinDLng * sinDLng;

  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceToSegment(
  ptLat: number, ptLng: number,
  lat1: number, lng1: number,
  lat2: number, lng2: number
): number {
  const ptLatRad = ptLat * DEG_TO_RAD;
  const ptLngRad = ptLng * DEG_TO_RAD;
  const lat1Rad = lat1 * DEG_TO_RAD;
  const lng1Rad = lng1 * DEG_TO_RAD;
  const lat2Rad = lat2 * DEG_TO_RAD;
  const lng2Rad = lng2 * DEG_TO_RAD;

  const dLat13 = ptLatRad - lat1Rad;
  const dLng13 = ptLngRad - lng1Rad;
  const sinDLat13 = Math.sin(dLat13 * 0.5);
  const sinDLng13 = Math.sin(dLng13 * 0.5);
  const a13 = sinDLat13 * sinDLat13 + Math.cos(lat1Rad) * Math.cos(ptLatRad) * sinDLng13 * sinDLng13;
  const d13 = 2 * Math.atan2(Math.sqrt(a13), Math.sqrt(1 - a13));

  const y13 = Math.sin(ptLngRad - lng1Rad) * Math.cos(ptLatRad);
  const x13 = Math.cos(lat1Rad) * Math.sin(ptLatRad) -
              Math.sin(lat1Rad) * Math.cos(ptLatRad) * Math.cos(ptLngRad - lng1Rad);
  const bearing13 = Math.atan2(y13, x13);

  const y12 = Math.sin(lng2Rad - lng1Rad) * Math.cos(lat2Rad);
  const x12 = Math.cos(lat1Rad) * Math.sin(lat2Rad) -
              Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(lng2Rad - lng1Rad);
  const bearing12 = Math.atan2(y12, x12);

  const bearingDiff = bearing13 - bearing12;
  const sinD13 = Math.sin(d13);
  const dxt = Math.asin(Math.max(-1, Math.min(1, sinD13 * Math.sin(bearingDiff))));
  const crossTrack = Math.abs(dxt) * EARTH_RADIUS_KM;

  const cosDxt = Math.cos(dxt);
  const cosD13 = Math.cos(d13);
  const dat = Math.acos(Math.max(-1, Math.min(1, cosD13 / (cosDxt || 1e-10))));
  const sign = Math.cos(bearingDiff) >= 0 ? 1 : -1;
  const alongTrack = sign * dat * EARTH_RADIUS_KM;

  const dLat12 = lat2Rad - lat1Rad;
  const dLng12 = lng2Rad - lng1Rad;
  const sinDLat12 = Math.sin(dLat12 * 0.5);
  const sinDLng12 = Math.sin(dLng12 * 0.5);
  const a12 = sinDLat12 * sinDLat12 + Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinDLng12 * sinDLng12;
  const segmentLength = EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a12), Math.sqrt(1 - a12));

  if (alongTrack < 0) {
    return haversine(ptLat, ptLng, lat1, lng1);
  } else if (alongTrack > segmentLength) {
    return haversine(ptLat, ptLng, lat2, lng2);
  }

  return crossTrack;
}

function distanceToLine(cityLat: number, cityLng: number, line: PreparedLine): number {
  let minDist = Infinity;

  for (const seg of line.segments) {
    const dist = distanceToSegment(cityLat, cityLng, seg.lat1, seg.lng1, seg.lat2, seg.lng2);
    if (dist < minDist) {
      minDist = dist;
    }
  }

  return minDist;
}

function gaussianKernel(distance: number, sigma: number): number {
  const ratio = distance / sigma;
  return Math.exp(-0.5 * ratio * ratio);
}

// ============================================================================
// Scout Processing
// ============================================================================

function scoutCities(cities: City[], lines: PreparedLine[], config: ScoutConfig): CityScore[] {
  const results: CityScore[] = [];
  const { maxDistanceKm, kernelSigma } = config;

  for (const city of cities) {
    const influences: Array<{ planet: string; angle: string; distance: number; weight: number }> = [];

    for (const line of lines) {
      if (city.lat < line.minLat || city.lat > line.maxLat ||
          city.lng < line.minLng || city.lng > line.maxLng) {
        continue;
      }

      const distance = distanceToLine(city.lat, city.lng, line);

      if (distance <= maxDistanceKm) {
        const weight = gaussianKernel(distance, kernelSigma) * (line.rating - 3);
        influences.push({ planet: line.planet, angle: line.angle, distance, weight });
      }
    }

    influences.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));

    let score = 0;
    const maxInfluences = Math.min(influences.length, WEIGHTS.length);
    for (let i = 0; i < maxInfluences; i++) {
      score += influences[i].weight * WEIGHTS[i];
    }

    const normalizedScore = 50 + score * (50 / (2 * WEIGHTS_SUM));

    results.push({
      name: city.name,
      country: city.country,
      lat: city.lat,
      lng: city.lng,
      score: Math.max(0, Math.min(100, normalizedScore)),
      topInfluences: influences.slice(0, 3).map(i => ({
        planet: i.planet,
        angle: i.angle,
        distance: i.distance,
      })),
    });
  }

  return results;
}

// ============================================================================
// Message Handler
// ============================================================================

self.onmessage = (event: MessageEvent<WorkerMessage>) => {
  const { type, cities, lines, config, batchId } = event.data;

  if (type === 'scout') {
    const results = scoutCities(cities, lines, config);

    const response: WorkerResponse = {
      type: 'result',
      results,
      batchId,
    };

    self.postMessage(response);
  }
};
