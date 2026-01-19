#!/bin/bash

# Import TIGER/Line ZCTA5 ZIP boundaries to Supabase PostGIS
# 
# Usage: ./import-zip-boundaries.sh
# 
# Make sure you have:
# 1. Downloaded and extracted tl_2025_us_zcta520.zip
# 2. The shapefile is in ./tl_2025_us_zcta520/ directory
# 3. Updated the connection string below with your Supabase credentials

set -e

# Supabase connection details (update these)
SUPABASE_HOST="db.nabekutrmmfsziizpsxt.supabase.co"
SUPABASE_PASSWORD="hxw9ybd.ntp*unb1UKP"
SUPABASE_DB="postgres"
SUPABASE_USER="postgres"
SUPABASE_PORT="5432"

# Shapefile path
SHAPEFILE_DIR="./tl_2025_us_zcta520"
SHAPEFILE="${SHAPEFILE_DIR}/tl_2025_us_zcta520.shp"

# Check if shapefile exists
if [ ! -f "$SHAPEFILE" ]; then
  echo "Error: Shapefile not found at $SHAPEFILE"
  echo "Please download and extract tl_2025_us_zcta520.zip first"
  exit 1
fi

echo "Importing ZIP boundaries from $SHAPEFILE to Supabase..."
echo "This may take several minutes (33,791 ZIP codes)..."
echo ""

# Import shapefile to Supabase PostGIS
ogr2ogr \
  -f PostgreSQL \
  "PG:host=${SUPABASE_HOST} port=${SUPABASE_PORT} user=${SUPABASE_USER} password=${SUPABASE_PASSWORD} dbname=${SUPABASE_DB}" \
  -nln gis.zip_boundaries \
  -nlt PROMOTE_TO_MULTI \
  -t_srs EPSG:4326 \
  -lco GEOMETRY_NAME=geom \
  -lco FID=zcta5ce20 \
  -sql "SELECT ZCTA5CE20 as zcta5ce20 FROM tl_2025_us_zcta520" \
  "$SHAPEFILE"

echo ""
echo "Import complete! Converting geometry to geography type..."

# Now convert the geometry column to geography type
# This requires a direct SQL connection
psql "host=${SUPABASE_HOST} port=${SUPABASE_PORT} user=${SUPABASE_USER} password=${SUPABASE_PASSWORD} dbname=${SUPABASE_DB}" <<EOF
-- Drop existing geometry column if it exists (from ogr2ogr import)
DO \$\$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'gis' 
    AND table_name = 'zip_boundaries' 
    AND column_name = 'wkb_geometry'
  ) THEN
    -- Add geography column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'gis' 
      AND table_name = 'zip_boundaries' 
      AND column_name = 'geom'
    ) THEN
      ALTER TABLE gis.zip_boundaries ADD COLUMN geom geography(Polygon, 4326);
    END IF;
    
    -- Convert and populate from geometry
    UPDATE gis.zip_boundaries 
    SET geom = ST_GeogFromWKB(ST_AsBinary(wkb_geometry))
    WHERE wkb_geometry IS NOT NULL AND geom IS NULL;
    
    -- Drop temporary geometry column
    ALTER TABLE gis.zip_boundaries DROP COLUMN wkb_geometry;
    
    -- Recreate spatial index
    DROP INDEX IF EXISTS gis.zip_boundaries_geom_idx;
    CREATE INDEX zip_boundaries_geom_idx 
      ON gis.zip_boundaries 
      USING GIST (geom);
  END IF;
END
\$\$;

-- Verify import
SELECT COUNT(*) as total_zip_codes FROM gis.zip_boundaries;
SELECT zcta5ce20, ST_AsGeoJSON(geom)::jsonb->>'type' as geom_type
FROM gis.zip_boundaries 
LIMIT 5;
EOF

echo ""
echo "✅ ZIP boundaries import complete!"
echo "Run this to verify: SELECT COUNT(*) FROM gis.zip_boundaries;"
echo "(Should return ~33,791)"
