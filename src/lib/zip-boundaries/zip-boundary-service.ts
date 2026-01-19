/**
 * ZIP Boundary Service
 * 
 * Fetches accurate ZIP code boundaries from Supabase PostGIS
 * using TIGER/Line ZCTA5 (ZIP Code Tabulation Areas) data.
 * 
 * This replaces the approximate bounding box calculation with
 * actual Census-defined ZIP boundaries for accurate parcel queries.
 */

import { supabase } from '@/integrations/supabase/client';

export interface ZipBoundary {
  zcta5ce20: string; // ZIP code (e.g., '60654')
  geom: GeoJSON.Polygon | GeoJSON.MultiPolygon; // PostGIS geography converted to GeoJSON
  population_2020?: number;
}

/**
 * Get ZIP code boundary polygon from Supabase PostGIS
 * 
 * @param zipCode - 5-digit ZIP code (e.g., '60654')
 * @returns ZIP boundary as GeoJSON polygon, or null if not found
 */
export async function getZipBoundary(zipCode: string): Promise<ZipBoundary | null> {
  if (!zipCode || zipCode.length !== 5) {
    throw new Error('ZIP code must be exactly 5 digits');
  }

  try {
    // Query Supabase PostGIS for ZIP boundary
    // ST_AsGeoJSON converts PostGIS geography to GeoJSON format
    console.log(`[ZipBoundary] Fetching boundary for ZIP: ${zipCode}`);
    const { data, error } = await supabase
      .rpc('get_zip_boundary', { zip_code: zipCode })
      .single();

    if (error) {
      // If RPC function doesn't exist or fails, fall back to direct query
      if (error.code === 'P0001' || error.code === '42883' || error.message.includes('function') || error.message.includes('does not exist')) {
        console.warn('[ZipBoundary] RPC function not found, using direct query:', error.message);
        return await getZipBoundaryDirect(zipCode);
      }
      console.error('[ZipBoundary] RPC error:', error);
      throw error;
    }

    if (!data) {
      console.warn(`[ZipBoundary] No data returned for ZIP code: ${zipCode}`);
      return null;
    }

    console.log(`[ZipBoundary] Received data for ZIP ${zipCode}:`, {
      hasZcta5ce20: !!data.zcta5ce20,
      hasGeom: !!data.geom,
      geomType: typeof data.geom,
      geomKeys: data.geom && typeof data.geom === 'object' ? Object.keys(data.geom) : 'N/A',
    });

    // Parse GeoJSON from PostGIS response
    // The RPC function returns geom as jsonb, which may be a string or object
    let geom: GeoJSON.Polygon | GeoJSON.MultiPolygon;
    if (typeof data.geom === 'string') {
      try {
        geom = JSON.parse(data.geom);
      } catch (e) {
        console.error('[ZipBoundary] Failed to parse GeoJSON string:', e, 'String length:', data.geom.length);
        return null;
      }
    } else if (data.geom && typeof data.geom === 'object') {
      // Check if it's already a valid GeoJSON object
      if ('type' in data.geom && ('coordinates' in data.geom || 'geometries' in data.geom)) {
        geom = data.geom as GeoJSON.Polygon | GeoJSON.MultiPolygon;
      } else {
        console.error('[ZipBoundary] Invalid GeoJSON object structure:', Object.keys(data.geom));
        return null;
      }
    } else {
      console.error('[ZipBoundary] Invalid geom format:', typeof data.geom, data.geom);
      return null;
    }

    console.log(`[ZipBoundary] Successfully parsed boundary for ZIP ${zipCode}, type: ${geom.type}`);

    return {
      zcta5ce20: data.zcta5ce20 || zipCode,
      geom,
      population_2020: data.population_2020,
    };
  } catch (error) {
    console.error('[ZipBoundary] Failed to fetch ZIP boundary:', error);
    throw error;
  }
}

/**
 * Direct query fallback if RPC function doesn't exist
 * Uses raw SQL to get GeoJSON from PostGIS
 */
async function getZipBoundaryDirect(zipCode: string): Promise<ZipBoundary | null> {
  try {
    // Use raw SQL query to get GeoJSON from PostGIS
    // Query the gis.zip_boundaries table directly
    const { data, error } = await supabase
      .rpc('exec_sql', {
        query: `
          SELECT 
            zcta5ce20,
            ST_AsGeoJSON(geom::geometry)::jsonb as geom,
            population_2020
          FROM gis.zip_boundaries
          WHERE zcta5ce20 = $1
          LIMIT 1
        `,
        params: [zipCode],
      });

    // Alternative: Use Supabase's REST API with a custom query
    // Since exec_sql might not exist, try querying the table directly
    // and use a PostGIS function via RPC
    if (error || !data) {
      // Try querying gis.zip_boundaries schema directly
      const { data: tableData, error: tableError } = await supabase
        .from('gis.zip_boundaries')
        .select('zcta5ce20, population_2020')
        .eq('zcta5ce20', zipCode)
        .single();

      if (tableError || !tableData) {
        console.warn('[ZipBoundary] Direct query failed - table may not exist or ZIP not found:', tableError?.message);
        return null;
      }

      // If we can't get GeoJSON directly, return null (RPC function is required)
      console.warn('[ZipBoundary] Direct query cannot retrieve GeoJSON - RPC function required');
      return null;
    }

    // Parse the result
    const result = Array.isArray(data) ? data[0] : data;
    if (!result) {
      return null;
    }

    const geom = typeof result.geom === 'string' ? JSON.parse(result.geom) : result.geom;

    return {
      zcta5ce20: result.zcta5ce20 || zipCode,
      geom,
      population_2020: result.population_2020,
    };
  } catch (error) {
    console.error('[ZipBoundary] Direct query failed:', error);
    return null;
  }
}

/**
 * Get ZIP boundary as GeoJSON polygon for Regrid API
 * 
 * @param zipCode - 5-digit ZIP code
 * @returns GeoJSON polygon ready for Regrid API geojson parameter
 */
export async function getZipBoundaryGeoJSON(zipCode: string): Promise<GeoJSON.Polygon | GeoJSON.MultiPolygon | null> {
  const boundary = await getZipBoundary(zipCode);
  if (!boundary) {
    return null;
  }

  // Return the geometry (already in GeoJSON format)
  return boundary.geom;
}

/**
 * Get ZIP boundary bounds (for map fitting)
 * 
 * @param zipCode - 5-digit ZIP code
 * @returns Bounding box { north, south, east, west } or null
 */
export async function getZipBoundaryBounds(zipCode: string): Promise<{
  north: number;
  south: number;
  east: number;
  west: number;
} | null> {
  const boundary = await getZipBoundary(zipCode);
  if (!boundary) {
    return null;
  }

  // Extract bounds from GeoJSON polygon
  const coordinates = boundary.geom.type === 'Polygon'
    ? boundary.geom.coordinates[0]
    : boundary.geom.coordinates.flat()[0]; // MultiPolygon: get first polygon's outer ring

  let minLat = Infinity;
  let maxLat = -Infinity;
  let minLng = Infinity;
  let maxLng = -Infinity;

  for (const [lng, lat] of coordinates) {
    minLat = Math.min(minLat, lat);
    maxLat = Math.max(maxLat, lat);
    minLng = Math.min(minLng, lng);
    maxLng = Math.max(maxLng, lng);
  }

  return {
    north: maxLat,
    south: minLat,
    east: maxLng,
    west: minLng,
  };
}
