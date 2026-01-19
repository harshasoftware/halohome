# Import TIGER/Line ZIP Boundaries

This migration creates the table structure. You need to import the actual data using `ogr2ogr`.

## Step 1: Download TIGER/Line ZCTA5 Data

```bash
# Download 2025 ZCTA5 boundaries (33k ZIP polygons, ~500MB)
wget https://www2.census.gov/geo/tiger/TIGER2025/ZCTA5/tl_2025_us_zcta5.zip
unzip tl_2025_us_zcta5.zip
```

**Alternative**: Pre-converted GeoJSON (faster):
- GitHub: https://github.com/generalpiston/geojson-us-city-boundaries
- Data.gov: https://catalog.data.gov/dataset?q=%22Zip+Codes%22&res_format=GeoJSON

## Step 2: Install GDAL (if not installed)

```bash
# macOS
brew install gdal

# Ubuntu/Debian
sudo apt-get install gdal-bin

# Windows
# Download from https://gdal.org/download.html
```

## Step 3: Import to Supabase (Recommended: Python Method)

**Best Method**: Use the Python script for reliable upload with progress bar:

```bash
# Install dependencies
pip install geopandas psycopg2-binary tqdm

# Run the import script
python upload_zips.py
```

The script will:
1. Convert shapefile to GeoJSON (if needed)
2. Bulk upload with progress bar
3. Skip existing ZIPs (resumable)
4. Verify the import

**Alternative: Direct ogr2ogr** (if Python not available):

```bash
# Import Shapefile to Supabase PostGIS
# Note: The actual file is tl_2025_us_zcta520.shp (not zcta5)
ogr2ogr \
  -f PostgreSQL \
  PG:"host=db.your-project.supabase.co port=5432 user=postgres password=YOUR_PASSWORD dbname=postgres" \
  -nln gis.zip_boundaries \
  -nlt PROMOTE_TO_MULTI \
  -t_srs EPSG:4326 \
  -lco GEOMETRY_NAME=geom \
  -lco FID=zcta5ce20 \
  -sql "SELECT ZCTA5CE20 as zcta5ce20 FROM tl_2025_us_zcta520" \
  tl_2025_us_zcta520/tl_2025_us_zcta520.shp
```

## Step 4: Convert geometry to geography

After import, convert the geometry column to geography type:

```sql
-- Drop existing geometry column if needed
ALTER TABLE gis.zip_boundaries DROP COLUMN IF EXISTS geom;

-- Add geography column
ALTER TABLE gis.zip_boundaries 
  ADD COLUMN geom geography(Polygon, 4326);

-- Convert and populate from geometry
UPDATE gis.zip_boundaries 
SET geom = ST_GeogFromWKB(ST_AsBinary(wkb_geometry))
WHERE wkb_geometry IS NOT NULL;

-- Drop temporary geometry column
ALTER TABLE gis.zip_boundaries DROP COLUMN IF EXISTS wkb_geometry;

-- Recreate spatial index
CREATE INDEX zip_boundaries_geom_idx 
  ON gis.zip_boundaries 
  USING GIST (geom);
```

## Step 5: Verify Import

```sql
-- Count imported ZIPs (should be ~33,000)
SELECT COUNT(*) FROM gis.zip_boundaries;

-- Test query for a specific ZIP
SELECT zcta5ce20, ST_AsGeoJSON(geom) as geojson
FROM gis.zip_boundaries 
WHERE zcta5ce20 = '60654'
LIMIT 1;
```

## Performance Notes

- 33k ZIP polygons: ~150MB storage
- Query time: <50ms with spatial index
- Cost: Included in Supabase free tier (up to 500MB database)
