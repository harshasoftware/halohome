/**
 * Coordinate utilities for converting between tile coordinates, pixels, and lat/lng.
 * Uses Web Mercator projection (EPSG:3857) compatible with Google Maps.
 */

export interface TileCoordinate {
  zoom: number;
  tileX: number;
  tileY: number;
}

export interface PixelCoordinate {
  x: number;
  y: number;
}

export interface LatLng {
  lat: number;
  lng: number;
}

export interface BoundingBox {
  north: number;
  south: number;
  east: number;
  west: number;
}

export interface Polygon {
  coordinates: LatLng[];
  centroid: LatLng;
  area: number; // square meters
  bounds: BoundingBox;
}

// Standard tile size for Google Maps
const TILE_SIZE = 256;

/**
 * Convert latitude/longitude to tile coordinates at a given zoom level.
 */
export function latLngToTile(lat: number, lng: number, zoom: number): TileCoordinate {
  const scale = 1 << zoom;
  const worldX = ((lng + 180) / 360) * scale;
  const siny = Math.sin((lat * Math.PI) / 180);
  const clampedSiny = Math.max(-0.9999, Math.min(0.9999, siny));
  const worldY = (0.5 - Math.log((1 + clampedSiny) / (1 - clampedSiny)) / (4 * Math.PI)) * scale;

  return {
    zoom,
    tileX: Math.floor(worldX),
    tileY: Math.floor(worldY),
  };
}

/**
 * Convert tile coordinates to the northwest corner lat/lng.
 */
export function tileToLatLng(tile: TileCoordinate): LatLng {
  const scale = 1 << tile.zoom;
  const lng = (tile.tileX / scale) * 360 - 180;
  const n = Math.PI - (2 * Math.PI * tile.tileY) / scale;
  const lat = (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));

  return { lat, lng };
}

/**
 * Get the bounding box for a tile.
 */
export function getTileBounds(tile: TileCoordinate): BoundingBox {
  const nw = tileToLatLng(tile);
  const se = tileToLatLng({
    zoom: tile.zoom,
    tileX: tile.tileX + 1,
    tileY: tile.tileY + 1,
  });

  return {
    north: nw.lat,
    south: se.lat,
    east: se.lng,
    west: nw.lng,
  };
}

/**
 * Convert a pixel position within a tile to lat/lng.
 */
export function pixelToLatLng(
  pixel: PixelCoordinate,
  tile: TileCoordinate,
  tileSize: number = TILE_SIZE
): LatLng {
  const bounds = getTileBounds(tile);
  const latRange = bounds.north - bounds.south;
  const lngRange = bounds.east - bounds.west;

  return {
    lat: bounds.north - (pixel.y / tileSize) * latRange,
    lng: bounds.west + (pixel.x / tileSize) * lngRange,
  };
}

/**
 * Convert lat/lng to pixel position within a tile.
 */
export function latLngToPixel(
  latLng: LatLng,
  tile: TileCoordinate,
  tileSize: number = TILE_SIZE
): PixelCoordinate {
  const bounds = getTileBounds(tile);
  const latRange = bounds.north - bounds.south;
  const lngRange = bounds.east - bounds.west;

  return {
    x: ((latLng.lng - bounds.west) / lngRange) * tileSize,
    y: ((bounds.north - latLng.lat) / latRange) * tileSize,
  };
}

/**
 * Convert pixel coordinates from an image with known bounds to lat/lng.
 */
export function imagePixelToLatLng(
  pixel: PixelCoordinate,
  imageWidth: number,
  imageHeight: number,
  bounds: BoundingBox
): LatLng {
  const latRange = bounds.north - bounds.south;
  const lngRange = bounds.east - bounds.west;

  return {
    lat: bounds.north - (pixel.y / imageHeight) * latRange,
    lng: bounds.west + (pixel.x / imageWidth) * lngRange,
  };
}

/**
 * Get tiles that cover a bounding box at a given zoom level.
 */
export function getTilesForBounds(bounds: BoundingBox, zoom: number): TileCoordinate[] {
  const nwTile = latLngToTile(bounds.north, bounds.west, zoom);
  const seTile = latLngToTile(bounds.south, bounds.east, zoom);

  const tiles: TileCoordinate[] = [];

  for (let x = nwTile.tileX; x <= seTile.tileX; x++) {
    for (let y = nwTile.tileY; y <= seTile.tileY; y++) {
      tiles.push({ zoom, tileX: x, tileY: y });
    }
  }

  return tiles;
}

/**
 * Calculate the bounding box for a ZIP code area (approximate).
 * Uses a fixed radius around the center point.
 */
export function getZipCodeBounds(centerLat: number, centerLng: number, radiusKm: number = 5): BoundingBox {
  // Approximate degrees per kilometer at this latitude
  const latDegPerKm = 1 / 111.32;
  const lngDegPerKm = 1 / (111.32 * Math.cos((centerLat * Math.PI) / 180));

  return {
    north: centerLat + radiusKm * latDegPerKm,
    south: centerLat - radiusKm * latDegPerKm,
    east: centerLng + radiusKm * lngDegPerKm,
    west: centerLng - radiusKm * lngDegPerKm,
  };
}

/**
 * Calculate the area of a polygon in square meters using the Shoelace formula.
 * Assumes coordinates are in lat/lng (WGS84).
 */
export function calculatePolygonArea(coordinates: LatLng[]): number {
  if (coordinates.length < 3) return 0;

  // Convert to approximate meters using equirectangular projection
  const centerLat = coordinates.reduce((sum, c) => sum + c.lat, 0) / coordinates.length;
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((centerLat * Math.PI) / 180);

  const points = coordinates.map((c) => ({
    x: c.lng * metersPerDegreeLng,
    y: c.lat * metersPerDegreeLat,
  }));

  // Shoelace formula
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }

  return Math.abs(area / 2);
}

/**
 * Calculate the centroid of a polygon.
 */
export function calculateCentroid(coordinates: LatLng[]): LatLng {
  if (coordinates.length === 0) return { lat: 0, lng: 0 };

  const sumLat = coordinates.reduce((sum, c) => sum + c.lat, 0);
  const sumLng = coordinates.reduce((sum, c) => sum + c.lng, 0);

  return {
    lat: sumLat / coordinates.length,
    lng: sumLng / coordinates.length,
  };
}

/**
 * Get the bounding box of a set of coordinates.
 */
export function getBoundsFromCoordinates(coordinates: LatLng[]): BoundingBox {
  if (coordinates.length === 0) {
    return { north: 0, south: 0, east: 0, west: 0 };
  }

  return {
    north: Math.max(...coordinates.map((c) => c.lat)),
    south: Math.min(...coordinates.map((c) => c.lat)),
    east: Math.max(...coordinates.map((c) => c.lng)),
    west: Math.min(...coordinates.map((c) => c.lng)),
  };
}

/**
 * Create a Polygon object from coordinates.
 */
export function createPolygon(coordinates: LatLng[]): Polygon {
  return {
    coordinates,
    centroid: calculateCentroid(coordinates),
    area: calculatePolygonArea(coordinates),
    bounds: getBoundsFromCoordinates(coordinates),
  };
}

/**
 * Calculate meters per pixel at a given zoom level and latitude.
 */
export function getMetersPerPixel(lat: number, zoom: number): number {
  const earthCircumference = 40075016.686; // meters at equator
  const latRadians = (lat * Math.PI) / 180;
  return (earthCircumference * Math.cos(latRadians)) / (TILE_SIZE * Math.pow(2, zoom));
}

/**
 * Determine the optimal zoom level for property boundary visibility.
 * Property boundaries are typically visible at zoom 18-20 in Google Maps.
 */
export function getOptimalZoomForBoundaries(): number {
  return 19; // High zoom where property lines are most visible
}

/**
 * Calculate the Haversine distance between two points in meters.
 */
export function haversineDistance(point1: LatLng, point2: LatLng): number {
  const R = 6371000; // Earth's radius in meters
  const lat1Rad = (point1.lat * Math.PI) / 180;
  const lat2Rad = (point2.lat * Math.PI) / 180;
  const deltaLat = ((point2.lat - point1.lat) * Math.PI) / 180;
  const deltaLng = ((point2.lng - point1.lng) * Math.PI) / 180;

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}
