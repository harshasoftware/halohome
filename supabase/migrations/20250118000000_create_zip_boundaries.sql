-- Enable PostGIS extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Create schema for GIS data (optional, can use public schema)
CREATE SCHEMA IF NOT EXISTS gis;

-- Create ZIP boundaries table
CREATE TABLE IF NOT EXISTS gis.zip_boundaries (
  zcta5ce20 text PRIMARY KEY,  -- ZIP code (e.g., '60654')
  geom geography(Polygon, 4326), -- PostGIS geography type (WGS84)
  population_2020 bigint,
  created_at timestamptz DEFAULT now()
);

-- Create spatial index for fast ZIP lookups
CREATE INDEX IF NOT EXISTS zip_boundaries_geom_idx 
  ON gis.zip_boundaries 
  USING GIST (geom);

-- Create index on ZIP code for fast lookups
CREATE INDEX IF NOT EXISTS zip_boundaries_zcta5ce20_idx 
  ON gis.zip_boundaries (zcta5ce20);

-- Create RPC function to get ZIP boundary as GeoJSON
CREATE OR REPLACE FUNCTION get_zip_boundary(zip_code text)
RETURNS TABLE (
  zcta5ce20 text,
  geom jsonb,
  population_2020 bigint
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    zb.zcta5ce20,
    ST_AsGeoJSON(zb.geom::geometry)::jsonb as geom,
    zb.population_2020
  FROM gis.zip_boundaries zb
  WHERE zb.zcta5ce20 = zip_code
  LIMIT 1;
END;
$$;

-- Grant permissions (adjust as needed for your security model)
GRANT USAGE ON SCHEMA gis TO authenticated;
GRANT SELECT ON gis.zip_boundaries TO authenticated;
GRANT EXECUTE ON FUNCTION get_zip_boundary(text) TO authenticated;

-- Grant anonymous access if needed (for public ZIP lookups)
GRANT USAGE ON SCHEMA gis TO anon;
GRANT SELECT ON gis.zip_boundaries TO anon;
GRANT EXECUTE ON FUNCTION get_zip_boundary(text) TO anon;

-- Add comment
COMMENT ON TABLE gis.zip_boundaries IS 'TIGER/Line ZCTA5 (ZIP Code Tabulation Areas) boundaries from US Census';
COMMENT ON FUNCTION get_zip_boundary(text) IS 'Returns ZIP boundary as GeoJSON for use in Regrid API queries';
