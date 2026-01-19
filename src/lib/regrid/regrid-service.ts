/**
 * Regrid API Service
 * 
 * Fetches Single Family Home (SFH) parcels from Regrid API v2
 * and overlays them on Google Maps. Uses lbcs_activity=1100 for residential filtering.
 * 
 * Implementation based on Regrid OpenAPI v2 specification.
 */

import type { BoundingBox, LatLng, Polygon } from '@/lib/building-footprints/coordinate-utils';

const REGRID_API_KEY = import.meta.env.VITE_REGRID_API_KEY;
const REGRID_BASE_URL = 'https://app.regrid.com/api/v2';

/**
 * Regrid Parcel interface based on OpenAPI v2 specification
 * Properties structure: headline (address), path (regrid ID), fields (schema data)
 */
export interface RegridParcel {
  type: 'Feature';
  id?: number; // Feature ID from OpenAPI spec
  properties: {
    headline?: string; // Human-friendly display address
    path?: string; // Parcel's unique identifier (regrid_id)
    fields?: {
      // Standard schema fields - values vary by county
      [key: string]: any;
      // Common fields (may not always be present):
      owner?: string;
      lbcs_activity?: number; // Land use code (1100 = residential)
      landval?: number;
      szip?: string;
      state2?: string;
      // ... other fields vary by county
    };
    field_labels?: { [key: string]: string }; // Human-friendly labels
    addresses?: any[];
    context?: any;
    ll_uuid?: string;
    score?: number;
  };
  geometry: {
    type: 'Polygon' | 'MultiPolygon';
    coordinates: number[][][]; // [lng, lat] pairs
  };
}

export interface RegridSearchResult {
  // According to OpenAPI spec: FeaturesResponse wraps FeatureCollection in 'parcels'
  parcels?: {
    type: 'FeatureCollection';
    features: RegridParcel[];
  };
  // Also support direct FeatureCollection format (if API returns it)
  type?: 'FeatureCollection';
  features?: RegridParcel[];
  total?: number;
}

export interface RegridSearchOptions {
  /** Maximum number of parcels to fetch (default: 10 for trial account) */
  limit?: number;
  /** Bounding box to search within (fallback if geojson not provided) */
  bounds?: BoundingBox;
  /** GeoJSON polygon for accurate ZIP boundary queries (preferred over bounds) */
  geojson?: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  /** Progress callback */
  onProgress?: (phase: string, percent: number) => void;
}

/**
 * Convert Regrid GeoJSON coordinates to our Polygon format
 */
function regridCoordinatesToPolygon(coordinates: number[][][]): Polygon['coordinates'] {
  // Regrid uses [lng, lat] format, we need [lat, lng]
  const polygon = coordinates[0]; // First ring is the outer boundary
  return polygon.map(([lng, lat]) => ({ lat, lng }));
}

/**
 * Calculate polygon centroid
 */
function calculateCentroid(coordinates: LatLng[]): LatLng {
  let sumLat = 0;
  let sumLng = 0;
  for (const coord of coordinates) {
    sumLat += coord.lat;
    sumLng += coord.lng;
  }
  return {
    lat: sumLat / coordinates.length,
    lng: sumLng / coordinates.length,
  };
}

/**
 * Calculate polygon area in square meters
 */
function calculateArea(coordinates: LatLng[]): number {
  if (coordinates.length < 3) return 0;
  
  let area = 0;
  for (let i = 0; i < coordinates.length; i++) {
    const j = (i + 1) % coordinates.length;
    area += coordinates[i].lng * coordinates[j].lat;
    area -= coordinates[j].lng * coordinates[i].lat;
  }
  area = Math.abs(area) / 2;
  
  // Convert to square meters (rough approximation)
  // 1 degree lat ≈ 111,320 meters
  // 1 degree lng ≈ 111,320 * cos(lat) meters
  const avgLat = coordinates.reduce((sum, c) => sum + c.lat, 0) / coordinates.length;
  const latMeters = 111320;
  const lngMeters = 111320 * Math.cos((avgLat * Math.PI) / 180);
  
  return area * latMeters * lngMeters;
}

/**
 * Calculate bounding box from coordinates
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
 * Convert Regrid parcel to BuildingFootprint format
 */
/**
 * Convert Regrid parcel to BuildingFootprint format
 * Maps OpenAPI v2 response structure to our internal format
 */
export function regridParcelToFootprint(parcel: RegridParcel): {
  id: string;
  coordinates: LatLng[];
  centroid: LatLng;
  area: number;
  bounds: BoundingBox;
  address?: string;
  regridId: string;
  owner?: string;
} {
  const coordinates = regridCoordinatesToPolygon(parcel.geometry.coordinates);
  const centroid = calculateCentroid(coordinates);
  const area = calculateArea(coordinates);
  const bounds = calculateBounds(coordinates);
  
  // Extract data according to OpenAPI spec:
  // - path = unique identifier (regrid_id)
  // - headline = display address
  // - fields.owner = owner name (if available)
  const regridId = parcel.properties.path || parcel.id?.toString() || '';
  const address = parcel.properties.headline || '';
  const owner = parcel.properties.fields?.owner;
  
  return {
    id: `regrid-${regridId}`,
    coordinates,
    centroid,
    area,
    bounds,
    address,
    regridId,
    owner,
  };
}

/**
 * Search for SFH parcels using Regrid API
 * 
 * Prefers geojson (actual ZIP boundary) over bounds (approximate bounding box)
 * for accurate parcel queries within ZIP code boundaries.
 */
export async function searchSFHParcels(
  options: RegridSearchOptions
): Promise<RegridParcel[]> {
  if (!REGRID_API_KEY) {
    throw new Error('VITE_REGRID_API_KEY is not set in environment variables');
  }

  const { bounds, geojson, limit = 10, onProgress } = options;
  
  onProgress?.('Fetching parcels from Regrid', 10);

  // Use provided GeoJSON polygon (preferred) or create from bounds (fallback)
  let searchGeojson: GeoJSON.Polygon | GeoJSON.MultiPolygon;
  
  if (geojson) {
    // Use actual ZIP boundary polygon (accurate)
    searchGeojson = geojson;
  } else if (bounds) {
    // Fallback to bounding box (approximate)
    searchGeojson = {
      type: 'Polygon' as const,
      coordinates: [[
        [bounds.west, bounds.south],
        [bounds.east, bounds.south],
        [bounds.east, bounds.north],
        [bounds.west, bounds.north],
        [bounds.west, bounds.south],
      ]],
    };
  } else {
    throw new Error('Either bounds or geojson must be provided');
  }

  // Build Regrid API URL - use POST for large GeoJSON polygons
  // GET with GeoJSON in query params causes "414 URI Too Long" errors
  const params = new URLSearchParams({
    token: REGRID_API_KEY,
    limit: limit.toString(),
    'fields[lbcs_activity][eq]': '1100', // Single Family Home (residential) - using lbcs_activity not landuse_code
  });

  // Use POST to send GeoJSON in request body (avoids URI length limits)
  const url = `${REGRID_BASE_URL}/parcels/query?${params.toString()}`;

  onProgress?.('Requesting parcels from Regrid API', 30);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        geojson: searchGeojson,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Regrid API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    const data: RegridSearchResult = await response.json();
    
    onProgress?.('Processing parcel data', 80);

    // According to OpenAPI spec: FeaturesResponse has parcels.features structure
    const parcels = data.parcels?.features || data.features || [];
    
    onProgress?.('Complete', 100);

    return parcels;
  } catch (error) {
    console.error('[Regrid] Failed to fetch parcels:', error);
    throw error;
  }
}

/**
 * Get parcel details by Regrid ID
 */
export async function getParcelById(regridId: string): Promise<RegridParcel | null> {
  if (!REGRID_API_KEY) {
    throw new Error('VITE_REGRID_API_KEY is not set in environment variables');
  }

  const url = `${REGRID_BASE_URL}/parcels/${regridId}.json?token=${REGRID_API_KEY}`;

  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Regrid API error: ${response.status} ${response.statusText}`);
    }

    const data: { parcel: RegridParcel } = await response.json();
    return data.parcel;
  } catch (error) {
    console.error(`[Regrid] Failed to fetch parcel ${regridId}:`, error);
    throw error;
  }
}
