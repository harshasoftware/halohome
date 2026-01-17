/**
 * Google Maps Tile Capture Service
 *
 * Captures map imagery at high zoom levels where property boundaries are visible.
 * Uses the Google Maps Static API to fetch roadmap tiles showing parcel lines.
 */

import {
  TileCoordinate,
  BoundingBox,
  LatLng,
  latLngToTile,
  getTileBounds,
  getTilesForBounds,
  getOptimalZoomForBoundaries,
} from './coordinate-utils';

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Cache for tile images
const tileImageCache = new Map<string, ImageData>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  data: ImageData;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();

function getCacheKey(tile: TileCoordinate): string {
  return `tile-${tile.zoom}-${tile.tileX}-${tile.tileY}`;
}

function getCached(key: string): ImageData | null {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_DURATION) {
    return entry.data;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: ImageData): void {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Configuration for tile capture
 */
export interface TileCaptureConfig {
  /** Zoom level (default: 19 for property boundaries) */
  zoom?: number;
  /** Map type: roadmap shows property lines, satellite for reference */
  mapType?: 'roadmap' | 'satellite' | 'hybrid';
  /** Image size in pixels (default: 640, max for Static API) */
  size?: number;
  /** Scale factor (1 or 2 for high DPI) */
  scale?: 1 | 2;
  /** Custom map style to enhance property line visibility */
  style?: string[];
}

const DEFAULT_CONFIG: Required<TileCaptureConfig> = {
  zoom: 19,
  mapType: 'roadmap',
  size: 640,
  scale: 2,
  style: [
    // Enhance property line visibility
    'feature:landscape.man_made|element:geometry.stroke|color:0x000000|weight:2',
    'feature:poi|visibility:off',
    'feature:transit|visibility:off',
    // Simplify other elements
    'feature:road|element:labels|visibility:off',
    'feature:administrative|element:labels|visibility:off',
  ],
};

/**
 * Generate the Static Map URL for a tile.
 */
export function getStaticMapUrl(
  center: LatLng,
  config: TileCaptureConfig = {}
): string {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  let url = `https://maps.googleapis.com/maps/api/staticmap?`;
  url += `center=${center.lat},${center.lng}`;
  url += `&zoom=${cfg.zoom}`;
  url += `&size=${cfg.size}x${cfg.size}`;
  url += `&scale=${cfg.scale}`;
  url += `&maptype=${cfg.mapType}`;
  url += `&key=${API_KEY}`;

  // Add custom styles to enhance property line visibility
  for (const style of cfg.style) {
    url += `&style=${encodeURIComponent(style)}`;
  }

  return url;
}

/**
 * Fetch a map tile image and return it as ImageData for processing.
 */
export async function fetchTileImage(
  center: LatLng,
  config: TileCaptureConfig = {}
): Promise<ImageData> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const tile = latLngToTile(center.lat, center.lng, cfg.zoom);
  const cacheKey = getCacheKey(tile);

  // Check cache first
  const cached = getCached(cacheKey);
  if (cached) {
    return cached;
  }

  const url = getStaticMapUrl(center, config);

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      const canvas = document.createElement('canvas');
      const actualSize = cfg.size * cfg.scale;
      canvas.width = actualSize;
      canvas.height = actualSize;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }

      ctx.drawImage(img, 0, 0, actualSize, actualSize);
      const imageData = ctx.getImageData(0, 0, actualSize, actualSize);

      // Cache the result
      setCache(cacheKey, imageData);

      resolve(imageData);
    };

    img.onerror = () => {
      reject(new Error(`Failed to load tile image from ${url}`));
    };

    img.src = url;
  });
}

/**
 * Fetch multiple tiles covering a bounding box.
 */
export async function fetchTilesForArea(
  bounds: BoundingBox,
  config: TileCaptureConfig = {}
): Promise<Map<string, { imageData: ImageData; bounds: BoundingBox; center: LatLng }>> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const tiles = getTilesForBounds(bounds, cfg.zoom);

  const results = new Map<string, { imageData: ImageData; bounds: BoundingBox; center: LatLng }>();

  // Fetch tiles in batches to avoid overwhelming the API
  const BATCH_SIZE = 4;
  for (let i = 0; i < tiles.length; i += BATCH_SIZE) {
    const batch = tiles.slice(i, i + BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map(async (tile) => {
        const tileBounds = getTileBounds(tile);
        const center: LatLng = {
          lat: (tileBounds.north + tileBounds.south) / 2,
          lng: (tileBounds.east + tileBounds.west) / 2,
        };

        try {
          const imageData = await fetchTileImage(center, config);
          return {
            key: getCacheKey(tile),
            data: { imageData, bounds: tileBounds, center },
          };
        } catch (error) {
          console.warn(`Failed to fetch tile ${getCacheKey(tile)}:`, error);
          return null;
        }
      })
    );

    for (const result of batchResults) {
      if (result) {
        results.set(result.key, result.data);
      }
    }

    // Small delay between batches to be nice to the API
    if (i + BATCH_SIZE < tiles.length) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  return results;
}

/**
 * Get the bounds of what's visible in a static map image.
 * The Static API centers on the given point, so we need to calculate
 * the visible extent based on zoom level and image size.
 */
export function getImageBounds(
  center: LatLng,
  config: TileCaptureConfig = {}
): BoundingBox {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  const actualSize = cfg.size * cfg.scale;

  // Calculate meters per pixel at this zoom and latitude
  const earthCircumference = 40075016.686;
  const latRadians = (center.lat * Math.PI) / 180;
  const metersPerPixel = (earthCircumference * Math.cos(latRadians)) / (256 * Math.pow(2, cfg.zoom));

  // Calculate the visible extent in meters
  const halfWidthMeters = (actualSize / 2) * metersPerPixel;
  const halfHeightMeters = (actualSize / 2) * metersPerPixel;

  // Convert to degrees
  const latDegPerMeter = 1 / 111320;
  const lngDegPerMeter = 1 / (111320 * Math.cos(latRadians));

  return {
    north: center.lat + halfHeightMeters * latDegPerMeter,
    south: center.lat - halfHeightMeters * latDegPerMeter,
    east: center.lng + halfWidthMeters * lngDegPerMeter,
    west: center.lng - halfWidthMeters * lngDegPerMeter,
  };
}

/**
 * Configuration specifically optimized for property boundary detection.
 */
export const BOUNDARY_DETECTION_CONFIG: TileCaptureConfig = {
  zoom: 19,
  mapType: 'roadmap',
  size: 640,
  scale: 2,
  style: [
    // Make property lines more visible
    'feature:landscape.man_made|element:geometry.stroke|color:0x333333|weight:3',
    'feature:landscape.man_made|element:geometry.fill|color:0xeeeeee',
    // Hide distracting elements
    'feature:poi|visibility:off',
    'feature:transit|visibility:off',
    'feature:road|element:labels|visibility:off',
    'feature:administrative.locality|element:labels|visibility:off',
    // Simplify roads
    'feature:road|element:geometry|color:0xcccccc',
    'feature:road.highway|element:geometry|color:0xaaaaaa',
  ],
};

/**
 * Alternative configuration using satellite imagery.
 * Useful for edge detection on actual structures.
 */
export const SATELLITE_CONFIG: TileCaptureConfig = {
  zoom: 20,
  mapType: 'satellite',
  size: 640,
  scale: 2,
  style: [],
};

/**
 * Hybrid configuration - satellite with labels.
 */
export const HYBRID_CONFIG: TileCaptureConfig = {
  zoom: 19,
  mapType: 'hybrid',
  size: 640,
  scale: 2,
  style: [],
};
