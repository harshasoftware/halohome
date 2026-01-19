# ZIP Boundaries Import Guide

## Quick Start (Recommended)

Use the Python script for reliable import with progress tracking:

```bash
# 1. Create virtual environment (recommended for macOS)
python3 -m venv venv
source venv/bin/activate

# 2. Install dependencies
pip install geopandas psycopg2-binary tqdm

# 3. Run the import
python upload_zips.py
```

**Alternative** (if virtual env doesn't work):
```bash
# Install with --break-system-packages flag (macOS Python 3.14+)
python3 -m pip install --break-system-packages geopandas psycopg2-binary tqdm
python3 upload_zips.py
```

The script will:
- ✅ Convert shapefile to GeoJSON automatically
- ✅ Show progress bar during upload
- ✅ Skip existing ZIPs (resumable if interrupted)
- ✅ Verify the import when complete

## What It Does

1. **Converts** `tl_2025_us_zcta520.shp` → `us_zips.geojson` (30-60 seconds)
2. **Uploads** 33,791 ZIP boundaries to Supabase (2-3 minutes)
3. **Verifies** import with test queries

## Requirements

- Python 3.7+
- GDAL (`brew install gdal` for ogr2ogr conversion)
- Dependencies: `geopandas`, `psycopg2-binary`, `tqdm`

## Troubleshooting

### "ogr2ogr not found"
```bash
brew install gdal
```

### "Missing required package"
```bash
pip install geopandas psycopg2-binary tqdm
```

### "Connection failed"
- Check your Supabase credentials in `upload_zips.py`
- Verify network connectivity to Supabase

### Import interrupted?
- Just run the script again - it skips existing ZIPs
- Progress is saved after each batch of 1000

## Verify Import

After import, test in Supabase SQL Editor:

```sql
-- Count total ZIPs (should be ~33,791)
SELECT COUNT(*) FROM gis.zip_boundaries;

-- Test a specific ZIP
SELECT zcta5ce20, ST_AsGeoJSON(geom)::jsonb->>'type' as geom_type
FROM gis.zip_boundaries 
WHERE zcta5ce20 = '60654'
LIMIT 1;

-- Test the RPC function
SELECT * FROM get_zip_boundary('60654');
```

## Alternative: Direct ogr2ogr

If you prefer not to use Python:

```bash
ogr2ogr \
  -f PostgreSQL \
  PG:"host=db.nabekutrmmfsziizpsxt.supabase.co port=5432 user=postgres password=hxw9ybd.ntp*unb1UKP dbname=postgres" \
  -nln gis.zip_boundaries \
  -nlt PROMOTE_TO_MULTI \
  -t_srs EPSG:4326 \
  -lco GEOMETRY_NAME=geom \
  -lco FID=zcta5ce20 \
  -sql "SELECT ZCTA5CE20 as zcta5ce20 FROM tl_2025_us_zcta520" \
  tl_2025_us_zcta520/tl_2025_us_zcta520.shp
```

Then convert geometry to geography (see migration instructions).
