/**
 * Globe Types - Shared type definitions for globe components
 */

/**
 * Path data structure for react-globe.gl
 */
export interface GlobePath {
  coords: [number, number][];
  color: string;
  stroke?: number;
  dash?: number[];
  type?: 'planetary' | 'aspect' | 'paran' | 'localSpace';
  planet?: string;
  lineType?: string;
  aspectType?: string;
  isHarmonious?: boolean;
  // Paran-specific fields
  planet1?: string;
  planet2?: string;
  angle1?: string;
  angle2?: string;
  latitude?: number;
  // Local Space line fields
  isLocalSpace?: boolean;
  azimuth?: number;
  direction?: string;
}

/**
 * Zenith point marker data structure
 */
export interface ZenithMarker {
  lat: number;
  lng: number;
  color: string;
  planet: string;
}

/**
 * Paran crossing point marker data structure
 */
export interface ParanCrossingMarker {
  lat: number;
  lng: number;
  planet1: string;
  planet2: string;
  angle1: string;
  angle2: string;
  color1: string;
  color2: string;
}

/**
 * Line label marker data structure
 * Used to display labels at midpoints of planetary lines
 */
export interface LineLabelMarker {
  lat: number;
  lng: number;
  planet: string;
  lineType: string;
  color: string;
}

/**
 * Planet colors for zenith rings and paran lines
 */
export const PLANET_COLORS_MAP: Record<string, string> = {
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
  Chiron: '#FF8C00',
  NorthNode: '#00FF7F',
};

/**
 * Generate latitude circle coordinates for a paran line
 * Creates a full circle at the given latitude from -180 to 180 longitude
 */
export function generateLatitudeCircleCoords(latitude: number, steps: number = 72): [number, number][] {
  const coords: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const lng = -180 + (360 * i / steps);
    coords.push([latitude, lng]);
  }
  return coords;
}

/**
 * Generate circle coordinates around a center point at a given distance
 * Uses spherical geometry to calculate points on a circle of radius distanceKm
 * around the center point (centerLat, centerLng)
 *
 * @param centerLat - Latitude of center point in degrees
 * @param centerLng - Longitude of center point in degrees
 * @param distanceKm - Radius of the circle in kilometers
 * @param steps - Number of points to generate around the circle
 * @returns Array of [lat, lng] coordinate pairs
 */
export function generateCircleAroundPoint(
  centerLat: number,
  centerLng: number,
  distanceKm: number,
  steps: number = 72
): [number, number][] {
  const coords: [number, number][] = [];
  const EARTH_RADIUS_KM = 6371;

  // Convert distance to angular distance in radians
  const angularDistance = distanceKm / EARTH_RADIUS_KM;

  // Convert center point to radians
  const lat1 = (centerLat * Math.PI) / 180;
  const lng1 = (centerLng * Math.PI) / 180;

  for (let i = 0; i <= steps; i++) {
    // Bearing angle (0 to 360 degrees)
    const bearing = (2 * Math.PI * i) / steps;

    // Calculate destination point using spherical trigonometry
    const lat2 = Math.asin(
      Math.sin(lat1) * Math.cos(angularDistance) +
      Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(bearing)
    );

    const lng2 = lng1 + Math.atan2(
      Math.sin(bearing) * Math.sin(angularDistance) * Math.cos(lat1),
      Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
    );

    // Convert back to degrees
    const latDeg = (lat2 * 180) / Math.PI;
    let lngDeg = (lng2 * 180) / Math.PI;

    // Normalize longitude to -180 to 180
    while (lngDeg > 180) lngDeg -= 360;
    while (lngDeg < -180) lngDeg += 360;

    coords.push([latDeg, lngDeg]);
  }

  return coords;
}
