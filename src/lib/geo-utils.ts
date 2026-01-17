/**
 * Geospatial Utility Functions
 *
 * Provides accurate area calculations for geographic polygons on Earth's surface.
 * Uses spherical geometry to account for Earth's curvature.
 */

export interface Coordinates {
  lat: number;
  lng: number;
}

// Constants
const EARTH_RADIUS_METERS = 6371000;
const SQ_METERS_TO_SQ_FEET = 10.7639;
const SQ_FEET_PER_ACRE = 43560;

// Zone limits
export const PROPERTY_SIZE_LIMIT_SQFT = 200000;
export const SCOUT_HOUSE_LIMIT = 50;

/**
 * Convert degrees to radians
 */
export function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Convert radians to degrees
 */
export function toDegrees(radians: number): number {
  return radians * (180 / Math.PI);
}

/**
 * Calculate the area of a polygon on Earth's surface using spherical projection
 * Returns area in square meters
 *
 * Uses the surveyor's formula adapted for spherical coordinates.
 * This is accurate for small to medium sized polygons (up to ~10km across).
 *
 * @param coordinates - Array of lat/lng points defining the polygon
 * @returns Area in square meters
 */
export function calculateSphericalPolygonArea(coordinates: Coordinates[]): number {
  if (coordinates.length < 3) return 0;

  const n = coordinates.length;
  let area = 0;

  // Use spherical projection formula
  // area = R^2 * |Σ (λ[i+1] - λ[i]) * (2 + sin(φ[i]) + sin(φ[i+1]))| / 2
  // where λ = longitude in radians, φ = latitude in radians
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;

    const lat1 = toRadians(coordinates[i].lat);
    const lng1 = toRadians(coordinates[i].lng);
    const lat2 = toRadians(coordinates[j].lat);
    const lng2 = toRadians(coordinates[j].lng);

    area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
  }

  area = Math.abs(area * EARTH_RADIUS_METERS * EARTH_RADIUS_METERS / 2);
  return area;
}

/**
 * Calculate polygon area in square feet
 *
 * @param coordinates - Array of lat/lng points defining the polygon
 * @returns Area in square feet
 */
export function calculatePolygonAreaSqFt(coordinates: Coordinates[]): number {
  const areaMeters = calculateSphericalPolygonArea(coordinates);
  return areaMeters * SQ_METERS_TO_SQ_FEET;
}

/**
 * Calculate polygon area in acres
 *
 * @param coordinates - Array of lat/lng points defining the polygon
 * @returns Area in acres
 */
export function calculatePolygonAreaAcres(coordinates: Coordinates[]): number {
  const areaSqFt = calculatePolygonAreaSqFt(coordinates);
  return areaSqFt / SQ_FEET_PER_ACRE;
}

/**
 * Format area for display with appropriate units
 *
 * @param sqFt - Area in square feet
 * @returns Formatted string (e.g., "4.59 acres (200,000 sqft)")
 */
export function formatArea(sqFt: number): string {
  if (sqFt >= SQ_FEET_PER_ACRE) {
    const acres = sqFt / SQ_FEET_PER_ACRE;
    return `${acres.toFixed(2)} acres (${Math.round(sqFt).toLocaleString()} sqft)`;
  }
  return `${Math.round(sqFt).toLocaleString()} sqft`;
}

/**
 * Format area compactly for inline display
 *
 * @param sqFt - Area in square feet
 * @returns Compact formatted string (e.g., "4.59 ac" or "50,000 sqft")
 */
export function formatAreaCompact(sqFt: number): string {
  if (sqFt >= SQ_FEET_PER_ACRE) {
    const acres = sqFt / SQ_FEET_PER_ACRE;
    return `${acres.toFixed(2)} ac`;
  }
  return `${Math.round(sqFt).toLocaleString()} sqft`;
}

/**
 * Check if area is within the specified limit
 *
 * @param sqFt - Area in square feet
 * @param limitSqFt - Maximum allowed area (default: 200,000 sqft)
 * @returns true if within limit
 */
export function isAreaWithinLimit(sqFt: number, limitSqFt: number = PROPERTY_SIZE_LIMIT_SQFT): boolean {
  return sqFt <= limitSqFt;
}

/**
 * Get the percentage of limit used
 *
 * @param sqFt - Area in square feet
 * @param limitSqFt - Maximum allowed area (default: 200,000 sqft)
 * @returns Percentage (0-100+)
 */
export function getAreaLimitPercentage(sqFt: number, limitSqFt: number = PROPERTY_SIZE_LIMIT_SQFT): number {
  return (sqFt / limitSqFt) * 100;
}

/**
 * Calculate the bounding box of a polygon
 *
 * @param coordinates - Array of lat/lng points
 * @returns Bounding box with north, south, east, west bounds and center
 */
export function getBoundingBox(coordinates: Coordinates[]): {
  north: number;
  south: number;
  east: number;
  west: number;
  centerLat: number;
  centerLng: number;
} {
  if (coordinates.length === 0) {
    return { north: 0, south: 0, east: 0, west: 0, centerLat: 0, centerLng: 0 };
  }

  const lats = coordinates.map((p) => p.lat);
  const lngs = coordinates.map((p) => p.lng);

  const north = Math.max(...lats);
  const south = Math.min(...lats);
  const east = Math.max(...lngs);
  const west = Math.min(...lngs);

  return {
    north,
    south,
    east,
    west,
    centerLat: (north + south) / 2,
    centerLng: (east + west) / 2,
  };
}

/**
 * Check if a point is inside a polygon using ray casting algorithm
 *
 * @param point - The point to check
 * @param polygon - Array of lat/lng points defining the polygon
 * @returns true if point is inside the polygon
 */
export function isPointInPolygon(
  point: { lat: number; lng: number },
  polygon: Array<{ lat: number; lng: number }>
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng,
      yi = polygon[i].lat;
    const xj = polygon[j].lng,
      yj = polygon[j].lat;
    if (yi > point.lat !== yj > point.lat && point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Calculate approximate radius in meters for a polygon's bounding circle
 * Useful for API calls that need a radius parameter
 *
 * @param coordinates - Array of lat/lng points
 * @returns Radius in meters
 */
export function calculateBoundingRadius(coordinates: Coordinates[]): number {
  const bounds = getBoundingBox(coordinates);
  const latDiff = bounds.north - bounds.south;
  const lngDiff = bounds.east - bounds.west;

  // Approximate conversion: 1 degree latitude = ~111km
  // Longitude varies with latitude, using average
  const avgLat = bounds.centerLat;
  const kmPerDegreeLng = 111 * Math.cos(toRadians(avgLat));

  const heightKm = latDiff * 111;
  const widthKm = lngDiff * kmPerDegreeLng;

  // Diagonal / 2 gives the bounding circle radius
  const radiusKm = Math.sqrt(heightKm * heightKm + widthKm * widthKm) / 2;

  return radiusKm * 1000; // Convert to meters
}
