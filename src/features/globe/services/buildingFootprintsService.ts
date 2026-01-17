/**
 * Building Footprints Service
 *
 * Extracts property/building boundaries using Meta's SAM v2 (Segment Anything Model)
 * for in-browser image segmentation. This provides accurate boundary detection from
 * Google Maps imagery without requiring paid parcel data providers like Regrid.
 *
 * Primary Method: SAM v2 via transformers.js
 * - Captures Google Maps tiles at high zoom levels
 * - Uses SAM v2 to segment plots and buildings
 * - Converts pixel polygons to lat/lng coordinates
 */

import {
  type LatLng,
  type BoundingBox,
  type Polygon,
  getZipCodeBounds,
  createPolygon,
  haversineDistance,
} from '@/lib/building-footprints/coordinate-utils';
import {
  fetchTileImage,
  getImageBounds,
  BOUNDARY_DETECTION_CONFIG,
  SATELLITE_CONFIG,
  type TileCaptureConfig,
} from '@/lib/building-footprints/tile-capture-service';
import {
  loadSAMModel,
  isSAMReady,
  segmentAutomatic,
  segmentWithPoints,
  pixelPolygonsToLatLng,
  getSAMLoadingState,
  type SegmentationPoint,
} from '@/lib/sam-segmentation';

export interface BuildingFootprint extends Polygon {
  id: string;
  source: 'sam-v2-extraction' | 'manual';
  shape: 'square' | 'rectangle' | 'irregular' | 'L-shaped' | 'triangular';
  confidence: number;
  address?: string;
  /** Type of extraction: plot boundary or building structure */
  type: 'plot' | 'building';
}

export interface PlotWithBuilding {
  /** The plot/parcel boundary */
  plot: BuildingFootprint;
  /** Buildings detected within this plot */
  buildings: BuildingFootprint[];
  /** Combined Vastu analysis considering both plot and buildings */
  combinedScore?: number;
}

export interface FootprintSearchResult {
  footprints: BuildingFootprint[];
  /** Plot boundaries with their associated buildings */
  plotsWithBuildings: PlotWithBuilding[];
  bounds: BoundingBox;
  source: 'sam-v2' | 'database' | 'mixed';
  totalCount: number;
  /** Count of plots found */
  plotCount: number;
  /** Count of buildings found */
  buildingCount: number;
  processingTimeMs: number;
}

export interface SearchOptions {
  /** Extract plot boundaries from roadmap tiles */
  extractPlots?: boolean;
  /** Extract building footprints from satellite tiles */
  extractBuildings?: boolean;
  /** Maximum number of footprints to return */
  maxResults?: number;
  /** Minimum confidence threshold */
  minConfidence?: number;
  /** Progress callback */
  onProgress?: (phase: string, percent: number) => void;
}

const DEFAULT_OPTIONS: Required<Omit<SearchOptions, 'onProgress'>> & { onProgress?: SearchOptions['onProgress'] } = {
  extractPlots: true,
  extractBuildings: true,
  maxResults: 50,
  minConfidence: 0.4,
  onProgress: undefined,
};

// Cache for extracted footprints
const footprintCache = new Map<string, { data: BuildingFootprint[]; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

function getCacheKey(bounds: BoundingBox): string {
  return `${bounds.north.toFixed(4)}-${bounds.south.toFixed(4)}-${bounds.east.toFixed(4)}-${bounds.west.toFixed(4)}`;
}

/**
 * Initialize SAM v2 model for segmentation.
 * Call this early to preload the model before user searches.
 */
export async function initializeSAM(
  onProgress?: (progress: { status: string; progress: number }) => void
): Promise<void> {
  if (isSAMReady()) return;

  await loadSAMModel(
    {
      model: 'sam-vit-base', // Use base model for balance of speed and accuracy
      quantized: true, // Smaller model size
    },
    onProgress
  );
}

/**
 * Check if SAM is ready for segmentation.
 */
export function isSAMInitialized(): boolean {
  return isSAMReady();
}

/**
 * Get SAM loading status.
 */
export function getSAMStatus(): { isLoading: boolean; isReady: boolean; error: Error | null } {
  return getSAMLoadingState();
}

/**
 * Search for building footprints in an area by ZIP code.
 */
export async function searchByZipCode(
  zipCode: string,
  options: SearchOptions = {}
): Promise<FootprintSearchResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  opts.onProgress?.('Geocoding ZIP code', 5);

  // Get center coordinates for ZIP code
  const center = await geocodeZipCode(zipCode);
  if (!center) {
    throw new Error(`Could not geocode ZIP code: ${zipCode}`);
  }

  // Create bounds around the ZIP code (approximately 3km radius)
  const bounds = getZipCodeBounds(center.lat, center.lng, 3);

  return searchByBounds(bounds, { ...opts, onProgress: (phase, percent) => {
    opts.onProgress?.(phase, 5 + percent * 0.95);
  }});
}

/**
 * Search for building footprints in a bounding box.
 * Uses SAM v2 for both plot and building extraction.
 */
export async function searchByBounds(
  bounds: BoundingBox,
  options: SearchOptions = {}
): Promise<FootprintSearchResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  // Check cache
  const cacheKey = getCacheKey(bounds);
  const cached = footprintCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    const plots = cached.data.filter((f) => f.type === 'plot');
    const buildings = cached.data.filter((f) => f.type === 'building');
    return {
      footprints: cached.data.slice(0, opts.maxResults),
      plotsWithBuildings: associateBuildingsWithPlots(plots, buildings),
      bounds,
      source: 'database',
      totalCount: cached.data.length,
      plotCount: plots.length,
      buildingCount: buildings.length,
      processingTimeMs: Date.now() - startTime,
    };
  }

  // Ensure SAM is loaded
  if (!isSAMReady()) {
    opts.onProgress?.('Loading SAM v2 model', 10);
    await initializeSAM((progress) => {
      opts.onProgress?.(`SAM v2: ${progress.status}`, 10 + progress.progress * 0.2);
    });
  }

  let plots: BuildingFootprint[] = [];
  let buildings: BuildingFootprint[] = [];

  // Extract plots from roadmap tiles using SAM v2
  if (opts.extractPlots) {
    opts.onProgress?.('Extracting plot boundaries with SAM v2', 35);
    const extractedPlots = await extractWithSAM(bounds, 'plot', {
      onProgress: (percent) => opts.onProgress?.('Segmenting plot boundaries', 35 + percent * 0.25),
    });
    plots = extractedPlots;
  }

  // Extract buildings from satellite tiles using SAM v2
  if (opts.extractBuildings) {
    opts.onProgress?.('Extracting building footprints with SAM v2', 65);
    const extractedBuildings = await extractWithSAM(bounds, 'building', {
      onProgress: (percent) => opts.onProgress?.('Segmenting building shapes', 65 + percent * 0.25),
    });
    buildings = extractedBuildings;
  }

  // Filter by confidence
  plots = plots.filter((f) => f.confidence >= opts.minConfidence);
  buildings = buildings.filter((f) => f.confidence >= opts.minConfidence);

  // Sort by area (largest first)
  plots.sort((a, b) => b.area - a.area);
  buildings.sort((a, b) => b.area - a.area);

  // Limit results
  plots = plots.slice(0, opts.maxResults);
  buildings = buildings.slice(0, opts.maxResults * 2); // Allow more buildings than plots

  // Combine all footprints
  const allFootprints = [...plots, ...buildings];

  // Associate buildings with their containing plots
  const plotsWithBuildings = associateBuildingsWithPlots(plots, buildings);

  opts.onProgress?.('Complete', 100);

  // Cache results
  footprintCache.set(cacheKey, { data: allFootprints, timestamp: Date.now() });

  return {
    footprints: allFootprints,
    plotsWithBuildings,
    bounds,
    source: 'sam-v2',
    totalCount: allFootprints.length,
    plotCount: plots.length,
    buildingCount: buildings.length,
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Search for a single property at a specific location.
 */
export async function searchAtLocation(
  lat: number,
  lng: number,
  options: SearchOptions = {}
): Promise<BuildingFootprint | null> {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Create small bounds around the point
  const bounds = getZipCodeBounds(lat, lng, 0.2); // 200m radius

  const result = await searchByBounds(bounds, { ...opts, maxResults: 20 });

  // Find the footprint closest to the clicked point
  const clickPoint: LatLng = { lat, lng };
  let closest: BuildingFootprint | null = null;
  let closestDistance = Infinity;

  for (const footprint of result.footprints) {
    const distance = haversineDistance(clickPoint, footprint.centroid);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = footprint;
    }
  }

  return closest;
}

/**
 * Interactive segmentation: user clicks on map to segment a specific property.
 */
export async function segmentAtPoint(
  lat: number,
  lng: number,
  type: 'plot' | 'building' = 'building'
): Promise<BuildingFootprint | null> {
  const center: LatLng = { lat, lng };
  const config = type === 'plot' ? PLOT_CONFIG : BUILDING_CONFIG;

  if (!isSAMReady()) {
    await initializeSAM();
  }

  try {
    // Capture tile image centered on the click point
    const imageData = await fetchTileImage(center, config.tile);
    const imageBounds = getImageBounds(center, config.tile);

    const actualSize = (config.tile.size || 640) * (config.tile.scale || 2);

    // Convert lat/lng to pixel coordinates
    const clickX = Math.round(
      ((lng - imageBounds.west) / (imageBounds.east - imageBounds.west)) * actualSize
    );
    const clickY = Math.round(
      ((imageBounds.north - lat) / (imageBounds.north - imageBounds.south)) * actualSize
    );

    // Use SAM v2 with point prompt
    const points: SegmentationPoint[] = [{ x: clickX, y: clickY, label: 1 }];
    const results = await segmentWithPoints(imageData, points);

    if (results.length === 0 || results[0].polygons.length === 0) {
      return null;
    }

    // Get the best result
    const bestResult = results.reduce((best, current) =>
      current.score > best.score ? current : best
    );

    // Convert pixel polygon to lat/lng
    const latLngPolygons = pixelPolygonsToLatLng(
      bestResult.polygons,
      imageBounds,
      actualSize,
      actualSize
    );

    if (latLngPolygons.length === 0 || latLngPolygons[0].length < 4) {
      return null;
    }

    const polygon = createPolygon(latLngPolygons[0]);
    const shape = classifyShape(polygon.coordinates);

    return {
      id: `sam-point-${Date.now()}`,
      source: 'sam-v2-extraction',
      shape,
      confidence: bestResult.score,
      type,
      ...polygon,
    };
  } catch (error) {
    console.error('SAM point segmentation failed:', error);
    return null;
  }
}

/**
 * Configuration for plot boundary extraction (from roadmap tiles).
 */
const PLOT_CONFIG = {
  tile: BOUNDARY_DETECTION_CONFIG,
  sam: {
    threshold: 0.5,
    minArea: 1000,
    maxArea: 100000,
  },
  quality: {
    minConfidence: 0.3,
    minAreaSqMeters: 100,  // ~1000 sq ft minimum for plots
    maxAreaSqMeters: 50000, // ~500k sq ft maximum
  },
};

/**
 * Configuration for building extraction (from satellite tiles).
 */
const BUILDING_CONFIG = {
  tile: SATELLITE_CONFIG,
  sam: {
    threshold: 0.6,
    minArea: 200,
    maxArea: 50000,
  },
  quality: {
    minConfidence: 0.25,
    minAreaSqMeters: 20,   // ~200 sq ft minimum for buildings
    maxAreaSqMeters: 10000, // ~100k sq ft maximum
  },
};

/**
 * Extract footprints from Google Maps tiles using SAM v2.
 * @param type - 'plot' for property boundaries, 'building' for structure footprints
 */
async function extractWithSAM(
  bounds: BoundingBox,
  type: 'plot' | 'building',
  callbacks: { onProgress?: (percent: number) => void } = {}
): Promise<BuildingFootprint[]> {
  const center: LatLng = {
    lat: (bounds.north + bounds.south) / 2,
    lng: (bounds.east + bounds.west) / 2,
  };

  const config = type === 'plot' ? PLOT_CONFIG : BUILDING_CONFIG;

  try {
    callbacks.onProgress?.(10);

    // Capture map tile at high zoom
    const imageData = await fetchTileImage(center, config.tile);
    const imageBounds = getImageBounds(center, config.tile);

    callbacks.onProgress?.(30);

    // Use SAM v2 automatic segmentation
    const segmentationResults = await segmentAutomatic(imageData, config.sam.threshold);

    callbacks.onProgress?.(70);

    const footprints: BuildingFootprint[] = [];
    const actualSize = (config.tile.size || 640) * (config.tile.scale || 2);

    for (const result of segmentationResults) {
      // Skip low-confidence results
      if (result.score < config.quality.minConfidence) continue;

      // Convert pixel polygons to lat/lng
      const latLngPolygons = pixelPolygonsToLatLng(
        result.polygons,
        imageBounds,
        actualSize,
        actualSize
      );

      for (const coords of latLngPolygons) {
        if (coords.length < 4) continue;

        const polygon = createPolygon(coords);

        // Filter by area
        if (polygon.area < config.quality.minAreaSqMeters ||
            polygon.area > config.quality.maxAreaSqMeters) {
          continue;
        }

        const shape = classifyShape(coords);

        footprints.push({
          id: `sam-${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          source: 'sam-v2-extraction',
          shape,
          confidence: result.score,
          type,
          ...polygon,
        });
      }
    }

    callbacks.onProgress?.(100);

    return footprints;
  } catch (error) {
    console.error(`Failed to extract ${type} footprints with SAM v2:`, error);
    return [];
  }
}

/**
 * Classify the shape of a polygon based on its vertices and angles.
 */
function classifyShape(coords: LatLng[]): BuildingFootprint['shape'] {
  const n = coords.length;

  if (n < 4) return 'irregular';

  // Calculate angles at each vertex
  const angles: number[] = [];
  for (let i = 0; i < n; i++) {
    const prev = coords[(i - 1 + n) % n];
    const curr = coords[i];
    const next = coords[(i + 1) % n];

    const angle = calculateAngle(prev, curr, next);
    angles.push(angle);
  }

  // Count approximately right angles (80-100 degrees)
  const rightAngles = angles.filter((a) => a >= 80 && a <= 100).length;

  // Check for L-shape (has one interior angle around 270 degrees)
  const interiorAngles = angles.filter((a) => a >= 250 && a <= 290).length;
  if (interiorAngles >= 1 && n === 6) {
    return 'L-shaped';
  }

  // Triangle
  if (n === 3) {
    return 'triangular';
  }

  // Square or rectangle (4 sides, ~4 right angles)
  if (n === 4 && rightAngles >= 3) {
    // Calculate side lengths
    const sides = [];
    for (let i = 0; i < 4; i++) {
      const d = haversineDistance(coords[i], coords[(i + 1) % 4]);
      sides.push(d);
    }

    // Check if approximately square (all sides within 20% of each other)
    const avgSide = sides.reduce((a, b) => a + b, 0) / 4;
    const isSquare = sides.every((s) => Math.abs(s - avgSide) / avgSide < 0.2);

    return isSquare ? 'square' : 'rectangle';
  }

  return 'irregular';
}

/**
 * Calculate angle at vertex B given three points A, B, C.
 */
function calculateAngle(a: LatLng, b: LatLng, c: LatLng): number {
  const ab = { x: a.lng - b.lng, y: a.lat - b.lat };
  const cb = { x: c.lng - b.lng, y: c.lat - b.lat };

  const dot = ab.x * cb.x + ab.y * cb.y;
  const cross = ab.x * cb.y - ab.y * cb.x;

  const angle = Math.atan2(cross, dot) * (180 / Math.PI);
  return Math.abs(angle);
}

/**
 * Associate buildings with their containing plots using point-in-polygon test.
 */
function associateBuildingsWithPlots(
  plots: BuildingFootprint[],
  buildings: BuildingFootprint[]
): PlotWithBuilding[] {
  const result: PlotWithBuilding[] = [];

  for (const plot of plots) {
    const containedBuildings: BuildingFootprint[] = [];

    for (const building of buildings) {
      // Check if building centroid is inside plot polygon
      if (isPointInPolygon(building.centroid, plot.coordinates)) {
        containedBuildings.push(building);
      }
    }

    result.push({
      plot,
      buildings: containedBuildings,
    });
  }

  // Also include buildings that don't belong to any detected plot
  const assignedBuildingIds = new Set(
    result.flatMap((pwb) => pwb.buildings.map((b) => b.id))
  );
  const orphanBuildings = buildings.filter((b) => !assignedBuildingIds.has(b.id));

  // Create synthetic plots for orphan buildings
  for (const building of orphanBuildings) {
    result.push({
      plot: {
        ...building,
        id: `synthetic-plot-${building.id}`,
        type: 'plot',
        confidence: building.confidence * 0.8, // Lower confidence for synthetic plots
      },
      buildings: [building],
    });
  }

  return result;
}

/**
 * Point-in-polygon test using ray casting algorithm.
 */
function isPointInPolygon(point: LatLng, polygon: LatLng[]): boolean {
  if (polygon.length < 3) return false;

  let inside = false;
  const x = point.lng;
  const y = point.lat;

  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].lng;
    const yi = polygon[i].lat;
    const xj = polygon[j].lng;
    const yj = polygon[j].lat;

    if (((yi > y) !== (yj > y)) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Geocode a ZIP code to lat/lng.
 * Uses Google Geocoding API via existing infrastructure.
 */
async function geocodeZipCode(zipCode: string): Promise<LatLng | null> {
  const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  try {
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(zipCode)}&key=${API_KEY}`
    );

    if (!response.ok) {
      throw new Error('Geocoding request failed');
    }

    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }

    return null;
  } catch (error) {
    console.error('ZIP code geocoding failed:', error);
    return null;
  }
}

/**
 * Export service for use in components.
 */
export const buildingFootprintsService = {
  searchByZipCode,
  searchByBounds,
  searchAtLocation,
  segmentAtPoint,
  initializeSAM,
  isSAMInitialized,
  getSAMStatus,
};

export default buildingFootprintsService;
