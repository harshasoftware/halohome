/**
 * Building Footprints Service
 *
 * Fetches property boundaries from Regrid API.
 * Focuses on Single Family Home (SFH) parcels (landuse_code=1100).
 *
 * Primary Method: Regrid API
 * - Fetches SFH parcels from Regrid API
 * - Overlays parcels on Google Maps
 * - Provides parcel details (address, owner, etc.)
 */

import {
  type LatLng,
  type BoundingBox,
  type Polygon,
  getZipCodeBounds,
  createPolygon,
  haversineDistance,
} from '@/lib/building-footprints/coordinate-utils';
import { searchSFHParcels, regridBuildingToFootprint, regridParcelToFootprint } from '@/lib/regrid/regrid-service';
import { getGeocode, getLatLng } from 'use-places-autocomplete';

export interface BuildingFootprint extends Polygon {
  id: string;
  source: 'regrid' | 'manual' | 'google';
  shape: 'square' | 'rectangle' | 'irregular' | 'L-shaped' | 'triangular';
  confidence: number;
  address?: string;
  /** Regrid parcel ID */
  regridId?: string;
  /** Property owner from Regrid */
  owner?: string;
  /** Type: always 'plot' for Regrid parcels */
  type: 'plot' | 'building';

  // Optional environmental signals (provided by pipeline when available)
  nearbyCemeteryCount?: number;
  crimeIndex?: number;
  soilGrade?: import('@/lib/vastu-scoring-preferences').SoilGrade;
  nearbyFactoryCount?: number;
  noiseIndex?: number;
  aqi?: number;
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
  /** ZIP boundary polygon (if search was by ZIP code) */
  zipBoundary?: GeoJSON.Polygon | GeoJSON.MultiPolygon | null;
  source: 'regrid' | 'database' | 'mixed';
  totalCount: number;
  /** Count of plots found */
  plotCount: number;
  /** Count of buildings found */
  buildingCount: number;
  processingTimeMs: number;
}

export interface SearchOptions {
  /** Extract plot boundaries from Regrid (always true for Regrid) */
  extractPlots?: boolean;
  /** Extract matched building footprints (requires Regrid Matched Buildings bundle) */
  extractBuildings?: boolean;
  /** Maximum number of parcels to fetch from Regrid (default: 10 for trial account) */
  maxResults?: number;
  /** Minimum confidence threshold (not used with Regrid, kept for compatibility) */
  minConfidence?: number;
  /** Progress callback */
  onProgress?: (phase: string, percent: number) => void;
  /** GeoJSON polygon for accurate ZIP boundary queries (preferred over bounds) */
  geojson?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  /** Limit the number of tiles to process (for tile-based searches) */
  maxTiles?: number;
}

const DEFAULT_OPTIONS: Required<Omit<SearchOptions, 'onProgress' | 'geojson'>> & { onProgress?: SearchOptions['onProgress']; geojson?: SearchOptions['geojson'] } = {
  extractPlots: true,
  extractBuildings: false,
  maxResults: 10, // Trial account limit
  minConfidence: 0.4,
  maxTiles: 20,
  onProgress: undefined,
  geojson: undefined,
};

// Cache for extracted footprints
const footprintCache = new Map<string, { data: BuildingFootprint[]; timestamp: number }>();
const CACHE_DURATION = 60 * 60 * 1000; // 1 hour

function getCacheKey(bounds: BoundingBox): string {
  return `${bounds.north.toFixed(4)}-${bounds.south.toFixed(4)}-${bounds.east.toFixed(4)}-${bounds.west.toFixed(4)}`;
}

// Tile progress tracking (persisted to localStorage)
const TILE_PROGRESS_STORAGE_KEY = 'building_footprints_tile_progress';
const TILE_PROGRESS_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

interface TileProgress {
  boundsKey: string;
  type: 'plot' | 'building';
  totalTiles: number;
  processedTiles: number;
  lastProcessedTileIndex: number;
  timestamp: number;
}

/**
 * Get tile progress from localStorage
 */
function getTileProgress(bounds: BoundingBox, type: 'plot' | 'building'): TileProgress | null {
  try {
    const stored = localStorage.getItem(TILE_PROGRESS_STORAGE_KEY);
    if (!stored) return null;

    const allProgress: TileProgress[] = JSON.parse(stored);
    const boundsKey = getCacheKey(bounds);

    // Find matching progress (same bounds and type)
    const progress = allProgress.find(
      p => p.boundsKey === boundsKey && p.type === type && Date.now() - p.timestamp < TILE_PROGRESS_EXPIRY
    );

    return progress || null;
  } catch {
    return null;
  }
}

/**
 * Save tile progress to localStorage
 */
function saveTileProgress(bounds: BoundingBox, type: 'plot' | 'building', processedIndex: number, totalTiles: number): void {
  try {
    const stored = localStorage.getItem(TILE_PROGRESS_STORAGE_KEY);
    const allProgress: TileProgress[] = stored ? JSON.parse(stored) : [];
    const boundsKey = getCacheKey(bounds);

    // Remove old progress for this bounds/type
    const filtered = allProgress.filter(
      p => !(p.boundsKey === boundsKey && p.type === type)
    );

    // Add new progress
    filtered.push({
      boundsKey,
      type,
      totalTiles,
      processedTiles: processedIndex + 1,
      lastProcessedTileIndex: processedIndex,
      timestamp: Date.now(),
    });

    // Keep only recent progress (last 50 entries)
    const recent = filtered
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, 50);

    localStorage.setItem(TILE_PROGRESS_STORAGE_KEY, JSON.stringify(recent));
  } catch (error) {
    console.warn('[BuildingFootprints] Failed to save tile progress:', error);
  }
}

/**
 * Clear tile progress for a specific bounds/type
 */
export function clearTileProgress(bounds: BoundingBox, type: 'plot' | 'building'): void {
  try {
    const stored = localStorage.getItem(TILE_PROGRESS_STORAGE_KEY);
    if (!stored) return;

    const allProgress: TileProgress[] = JSON.parse(stored);
    const boundsKey = getCacheKey(bounds);

    const filtered = allProgress.filter(
      p => !(p.boundsKey === boundsKey && p.type === type)
    );

    localStorage.setItem(TILE_PROGRESS_STORAGE_KEY, JSON.stringify(filtered));
  } catch (error) {
    console.warn('[BuildingFootprints] Failed to clear tile progress:', error);
  }
}

/**
 * Get the last processed tile index for resuming
 */
export function getLastProcessedTileIndex(bounds: BoundingBox, type: 'plot' | 'building'): number {
  const progress = getTileProgress(bounds, type);
  return progress ? progress.lastProcessedTileIndex : -1;
}

/**
 * Initialize Regrid API (no-op, kept for compatibility).
 * Regrid doesn't require initialization.
 */
export async function initializeSAM(
  onProgress?: (progress: { status: string; progress: number }) => void
): Promise<void> {
  onProgress?.({ status: 'Regrid API ready', progress: 100 });
  // No initialization needed for Regrid
}

/**
 * Check if Regrid is ready (always true, kept for compatibility).
 */
export function isSAMInitialized(): boolean {
  return true; // Regrid is always ready
}

/**
 * Get Regrid status (kept for compatibility).
 */
export function getSAMStatus(): { isLoading: boolean; isReady: boolean; error: Error | null } {
  return {
    isLoading: false,
    isReady: true,
    error: null,
  };
}

/**
 * Search for building footprints in an area by ZIP code.
 * Uses TIGER/Line ZCTA5 boundaries from Supabase PostGIS for accurate queries.
 */
export async function searchByZipCode(
  zipCode: string,
  options: SearchOptions = {}
): Promise<FootprintSearchResult> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const startTime = Date.now();

  opts.onProgress?.('Fetching ZIP boundary', 5);

  // Try to get actual ZIP boundary from Supabase PostGIS
  let zipBoundaryGeoJSON: GeoJSON.Polygon | GeoJSON.MultiPolygon | null = null;
  let bounds: BoundingBox | null = null;

  try {
    const { getZipBoundaryGeoJSON, getZipBoundaryBounds } = await import('@/lib/zip-boundaries/zip-boundary-service');

    // Fetch actual ZIP boundary polygon
    zipBoundaryGeoJSON = await getZipBoundaryGeoJSON(zipCode);

    if (zipBoundaryGeoJSON) {
      // Get bounds for map fitting
      bounds = await getZipBoundaryBounds(zipCode);
      opts.onProgress?.('Using accurate ZIP boundary', 10);
    } else {
      // Fallback to geocoding if ZIP boundary not found in database
      opts.onProgress?.('ZIP boundary not found, using geocoded center', 10);
      const center = await geocodeZipCode(zipCode);
      if (!center) {
        throw new Error(`Could not geocode ZIP code: ${zipCode}`);
      }
      // Create bounds around the ZIP code (approximately 3km radius)
      bounds = getZipCodeBounds(center.lat, center.lng, 3);
    }
  } catch (error) {
    // Fallback to geocoding if ZIP boundary service fails
    console.warn('[BuildingFootprints] ZIP boundary service failed, using geocoded center:', error);
    opts.onProgress?.('Falling back to geocoded center', 10);
    const center = await geocodeZipCode(zipCode);
    if (!center) {
      throw new Error(`Could not geocode ZIP code: ${zipCode}`);
    }
    bounds = getZipCodeBounds(center.lat, center.lng, 3);
  }

  if (!bounds) {
    throw new Error(`Could not determine bounds for ZIP code: ${zipCode}`);
  }

  // Use searchByBounds with geojson if available
  const result = await searchByBounds(bounds, {
    ...opts,
    geojson: zipBoundaryGeoJSON || undefined,
    onProgress: (phase, percent) => {
      opts.onProgress?.(phase, 10 + percent * 0.90);
    }
  });

  // Include ZIP boundary in result for display
  return {
    ...result,
    zipBoundary: zipBoundaryGeoJSON,
  };
}

/**
 * Search for building footprints in a bounding box.
 * Uses Regrid API to fetch SFH parcels.
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

  let plots: BuildingFootprint[] = [];
  let buildings: BuildingFootprint[] = [];

  const isFiniteNumber = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
  const isValidRing = (coords: LatLng[]) =>
    Array.isArray(coords) && coords.length >= 3 && coords.every((p) => isFiniteNumber(p.lat) && isFiniteNumber(p.lng));

  // Fetch SFH parcels from Regrid
  if (opts.extractPlots) {
    opts.onProgress?.('Fetching SFH parcels from Regrid', 20);

    try {
      const { parcels: regridParcels, buildings: regridBuildings } = await searchSFHParcels({
        bounds,
        geojson: opts.geojson, // Use actual ZIP boundary polygon if available
        limit: opts.maxResults || 10,
        returnMatchedBuildings: !!opts.extractBuildings,
        onProgress: (phase, percent) => {
          opts.onProgress?.(phase, 20 + percent * 0.7);
        },
      });

      // Convert Regrid parcels to BuildingFootprint format
      // Convert Regrid parcels to BuildingFootprint format
      plots = regridParcels
        .map((parcel) => {
          const footprint = regridParcelToFootprint(parcel);
          if (!isValidRing(footprint.coordinates)) return null;

          // Determine shape from coordinates
          const shape = determineShape(footprint.coordinates);

          return {
            ...footprint,
            source: 'regrid' as const,
            shape,
            confidence: 1.0, // Regrid data is authoritative
            address: footprint.address,
            regridId: footprint.regridId,
            owner: footprint.owner,
            type: 'plot' as const,
          } as BuildingFootprint;
        })
        .filter((x): x is BuildingFootprint => !!x);

      // Convert matched buildings (if requested and available in bundle)
      if (opts.extractBuildings && regridBuildings.length > 0) {
        buildings = regridBuildings
          .map((b) => {
            const footprint = regridBuildingToFootprint(b);
            if (!isValidRing(footprint.coordinates)) return null;
            const shape = determineShape(footprint.coordinates);

            return {
              ...footprint,
              source: 'regrid' as const,
              shape,
              confidence: 1.0,
              type: 'building' as const,
            } as BuildingFootprint;
          })
          .filter((x): x is BuildingFootprint => !!x);
      } else {
        buildings = [];
      }

      opts.onProgress?.('Processing parcel data', 90);
    } catch (error) {
      console.error('[BuildingFootprints] Failed to fetch Regrid parcels:', error);
      opts.onProgress?.('Error fetching parcels', 100);
      throw error;
    }
  }

  // If extractPlots is disabled, there are no buildings to associate either.

  // Sort by area (largest first)
  plots.sort((a, b) => b.area - a.area);

  // Limit results (already limited by Regrid API)
  const allFootprints = [...plots, ...buildings];

  // Associate buildings with their containing plots (empty for Regrid)
  const plotsWithBuildings = associateBuildingsWithPlots(plots, buildings);

  opts.onProgress?.('Complete', 100);

  // Cache results
  footprintCache.set(cacheKey, { data: allFootprints, timestamp: Date.now() });

  return {
    footprints: allFootprints,
    plotsWithBuildings,
    bounds,
    source: 'regrid',
    totalCount: allFootprints.length,
    plotCount: plots.length,
    buildingCount: buildings.length,
    processingTimeMs: Date.now() - startTime,
  };
}

/**
 * Determine shape from polygon coordinates
 */
function determineShape(coordinates: LatLng[]): BuildingFootprint['shape'] {
  if (coordinates.length < 3) return 'irregular';

  // Simple heuristic: check if it's roughly square/rectangular
  const bounds = calculateBounds(coordinates);
  const width = haversineDistance(
    { lat: bounds.south, lng: bounds.west },
    { lat: bounds.south, lng: bounds.east }
  );
  const height = haversineDistance(
    { lat: bounds.south, lng: bounds.west },
    { lat: bounds.north, lng: bounds.west }
  );

  const aspectRatio = Math.max(width, height) / Math.min(width, height);

  if (aspectRatio < 1.2) {
    return 'square';
  } else if (aspectRatio < 2.0) {
    return 'rectangle';
  } else {
    return 'irregular';
  }
}

/**
 * Calculate bounds from coordinates
 */
function calculateBounds(coordinates: LatLng[]): BoundingBox {
  let north = -90;
  let south = 90;
  let east = -180;
  let west = 180;

  for (const coord of coordinates) {
    north = Math.max(north, coord.lat);
    south = Math.min(south, coord.lat);
    east = Math.max(east, coord.lng);
    west = Math.min(west, coord.lng);
  }

  return { north, south, east, west };
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
/**
 * Interactive search: user clicks on map to find the closest parcel.
 * Uses Regrid API to find the nearest SFH parcel.
 */
export async function segmentAtPoint(
  lat: number,
  lng: number,
  type: 'plot' | 'building' = 'plot',
  options: { useWorker?: boolean } = {}
): Promise<BuildingFootprint | null> {
  const center: LatLng = { lat, lng };

  try {
    // Create small bounds around the click point (200m radius)
    const bounds = getZipCodeBounds(lat, lng, 0.2);

    // Fetch parcels from Regrid
    const { parcels: regridParcels } = await searchSFHParcels({
      bounds,
      limit: 10, // Get up to 10 parcels, then find closest
      onProgress: () => { }, // Silent for point clicks
    });

    if (regridParcels.length === 0) {
      return null;
    }

    // Find the parcel closest to the click point
    const clickPoint: LatLng = { lat, lng };
    let closest: any | null = null;
    let closestDistance = Infinity;

    for (const parcel of regridParcels) {
      const footprint = regridParcelToFootprint(parcel);
      const distance = haversineDistance(clickPoint, footprint.centroid);
      if (distance < closestDistance) {
        closestDistance = distance;
        closest = parcel;
      }
    }

    if (!closest) {
      return null;
    }

    // Convert to BuildingFootprint
    const footprint = regridParcelToFootprint(closest);
    const shape = determineShape(footprint.coordinates);

    return {
      ...footprint,
      source: 'regrid' as const,
      shape,
      confidence: 1.0,
      address: footprint.address,
      regridId: footprint.regridId,
      owner: footprint.owner,
      type: 'plot' as const,
    };
  } catch (error) {
    console.error('[BuildingFootprints] Failed to fetch Regrid parcel:', error);
    return null;
  }
}

/**
 * Removed: extractWithSAM - replaced with Regrid API
 * This function previously used SAM v2 for tile-based segmentation.
 * Now using Regrid API for parcel data.
 * 
 * All SAM-related tile processing code has been removed.
 * 
 * Note: classifyShape and calculateAngle functions were removed as they were
 * duplicates and unused (determineShape is used instead).
 */

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
 * Uses getGeocode from use-places-autocomplete (same as other components).
 * Appends ", USA" to improve geocoding accuracy for US ZIP codes.
 */
async function geocodeZipCode(zipCode: string): Promise<LatLng | null> {
  try {
    // Use the same geocoding method as other components (CitySearchBar, PropertySearchBar)
    // Format: "78702, USA" - same as other components use
    const address = `${zipCode}, USA`;
    const results = await getGeocode({ address });

    if (!results || results.length === 0) {
      console.warn(`No results found for ZIP code: ${zipCode}`);
      return null;
    }

    // Get lat/lng from first result (same as other components)
    const { lat, lng } = await getLatLng(results[0]);
    return { lat, lng };
  } catch (error) {
    console.error(`ZIP code geocoding failed for ${zipCode}:`, error);
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
  clearTileProgress, // Kept for compatibility, but no-op with Regrid
  getLastProcessedTileIndex, // Kept for compatibility, but no-op with Regrid
};

export default buildingFootprintsService;
