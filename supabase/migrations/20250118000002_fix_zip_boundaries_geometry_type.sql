-- Fix ZIP boundaries table to accept both Polygon and MultiPolygon geometries
-- Some ZIP codes (especially those with islands or disconnected areas) are MultiPolygon

-- Alter the column type to accept any geometry type (Polygon, MultiPolygon, etc.)
ALTER TABLE gis.zip_boundaries 
  ALTER COLUMN geom TYPE geography(Geometry, 4326);

-- Add comment explaining the change
COMMENT ON COLUMN gis.zip_boundaries.geom IS 'PostGIS geography type accepting Polygon or MultiPolygon geometries (WGS84)';
