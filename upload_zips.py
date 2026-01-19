#!/usr/bin/env python3
"""
Upload TIGER/Line ZCTA5 ZIP boundaries to Supabase PostGIS

This script:
1. Converts shapefile to GeoJSON (if not already done)
2. Bulk uploads to Supabase with progress bar
3. Handles resumable uploads (skips existing ZIPs)

Setup (run these commands first):
    # Create virtual environment (recommended)
    python3 -m venv venv
    source venv/bin/activate
    
    # Install dependencies
    pip install geopandas psycopg2-binary tqdm
    
    # Run the script
    python upload_zips.py

Alternative (if virtual env doesn't work):
    python3 -m pip install --user --break-system-packages geopandas psycopg2-binary tqdm
    python3 upload_zips.py
"""

import os
import sys
import json
import subprocess
from pathlib import Path

try:
    import psycopg2
    from psycopg2.extras import execute_values
    import geopandas as gpd
    from tqdm import tqdm
except ImportError as e:
    print(f"❌ Missing required package: {e}")
    print("\nInstall dependencies:")
    print("  pip install geopandas psycopg2-binary tqdm")
    sys.exit(1)

# Configuration
# Using connection pooler (more reliable than direct connection)
SUPABASE_HOST = "aws-1-ap-southeast-1.pooler.supabase.com"
SUPABASE_PORT = 5432
SUPABASE_USER = "postgres.nabekutrmmfsziizpsxt"  # Note: includes project ref
SUPABASE_PASSWORD = "hxw9ybd.ntp*unb1UKP"
SUPABASE_DB = "postgres"

# Alternative: Direct connection (if pooler doesn't work)
# SUPABASE_HOST = "db.nabekutrmmfsziizpsxt.supabase.co"
# SUPABASE_USER = "postgres"

# File paths
SHAPEFILE_DIR = Path("./tl_2025_us_zcta520")
SHAPEFILE = SHAPEFILE_DIR / "tl_2025_us_zcta520.shp"
GEOJSON_FILE = Path("./us_zips.geojson")

def convert_shapefile_to_geojson():
    """Convert shapefile to GeoJSON using ogr2ogr"""
    if GEOJSON_FILE.exists():
        print(f"✅ GeoJSON already exists: {GEOJSON_FILE}")
        return
    
    if not SHAPEFILE.exists():
        print(f"❌ Shapefile not found: {SHAPEFILE}")
        print(f"   Expected location: {SHAPEFILE.absolute()}")
        sys.exit(1)
    
    print(f"📦 Converting shapefile to GeoJSON...")
    print(f"   Input: {SHAPEFILE}")
    print(f"   Output: {GEOJSON_FILE}")
    print("   This may take 30-60 seconds...")
    
    try:
        subprocess.run([
            "ogr2ogr",
            "-f", "GeoJSON",
            "-t_srs", "EPSG:4326",
            str(GEOJSON_FILE),
            str(SHAPEFILE)
        ], check=True)
        print(f"✅ GeoJSON conversion complete!")
    except subprocess.CalledProcessError as e:
        print(f"❌ ogr2ogr failed: {e}")
        print("   Make sure GDAL is installed: brew install gdal")
        sys.exit(1)
    except FileNotFoundError:
        print("❌ ogr2ogr not found")
        print("   Install GDAL: brew install gdal")
        sys.exit(1)

def create_table_if_needed(conn):
    """Create table and indexes if they don't exist"""
    with conn.cursor() as cur:
        cur.execute("""
            -- Create schema if not exists
            CREATE SCHEMA IF NOT EXISTS gis;
            
            -- Create table
            CREATE TABLE IF NOT EXISTS gis.zip_boundaries (
                zcta5ce20 text PRIMARY KEY,
                geom geography(Polygon, 4326),
                population_2020 bigint,
                created_at timestamptz DEFAULT now()
            );
            
            -- Create spatial index
            CREATE INDEX IF NOT EXISTS zip_boundaries_geom_idx 
                ON gis.zip_boundaries USING GIST(geom);
            
            -- Create ZIP code index
            CREATE INDEX IF NOT EXISTS zip_boundaries_zcta5ce20_idx 
                ON gis.zip_boundaries (zcta5ce20);
        """)
        conn.commit()
        print("✅ Table structure verified")

def upload_zip_boundaries():
    """Read GeoJSON and bulk upload to Supabase"""
    print(f"\n📖 Reading GeoJSON: {GEOJSON_FILE}")
    
    try:
        gdf = gpd.read_file(GEOJSON_FILE)
        print(f"✅ Loaded {len(gdf):,} ZIP boundaries")
    except Exception as e:
        print(f"❌ Failed to read GeoJSON: {e}")
        sys.exit(1)
    
    # Check for required column
    if 'ZCTA5CE20' not in gdf.columns:
        print("❌ GeoJSON missing 'ZCTA5CE20' column")
        print(f"   Available columns: {list(gdf.columns)}")
        sys.exit(1)
    
    # Connect to Supabase
    print(f"\n🔌 Connecting to Supabase...")
    print(f"   Host: {SUPABASE_HOST}")
    print(f"   User: {SUPABASE_USER}")
    
    try:
        conn = psycopg2.connect(
            host=SUPABASE_HOST,
            port=SUPABASE_PORT,
            user=SUPABASE_USER,
            password=SUPABASE_PASSWORD,
            dbname=SUPABASE_DB,
            connect_timeout=10
        )
        print("✅ Connected to Supabase")
    except Exception as e:
        print(f"❌ Connection failed: {e}")
        print("\n💡 Troubleshooting:")
        print("   1. Get the correct connection string from:")
        print("      Supabase Dashboard → Settings → Database → Connection string")
        print("   2. Verify the database password is correct")
        print("   3. Check if your IP is allowed (Settings → Database → Connection Pooling)")
        print("   4. Try using the 'Connection Pooling' connection string (recommended)")
        print("\n   Update SUPABASE_HOST and SUPABASE_USER in upload_zips.py with your connection details")
        sys.exit(1)
    
    # Create table structure
    create_table_if_needed(conn)
    
    # Check existing ZIPs to resume
    with conn.cursor() as cur:
        cur.execute("SELECT COUNT(*) FROM gis.zip_boundaries")
        existing_count = cur.fetchone()[0]
        if existing_count > 0:
            print(f"📊 Found {existing_count:,} existing ZIP boundaries")
            cur.execute("SELECT zcta5ce20 FROM gis.zip_boundaries")
            existing_zips = set(row[0] for row in cur.fetchall())
        else:
            existing_zips = set()
    
    # Prepare batch data
    print(f"\n📦 Preparing data for upload...")
    batch = []
    skipped = 0
    
    for idx, row in tqdm(gdf.iterrows(), total=len(gdf), desc="Preparing"):
        zip_code = str(row['ZCTA5CE20']).strip()
        
        # Skip if already exists
        if zip_code in existing_zips:
            skipped += 1
            continue
        
        # Convert geometry to GeoJSON
        try:
            geom_json = json.dumps(row.geometry.__geo_interface__)
            batch.append((zip_code, geom_json))
        except Exception as e:
            print(f"\n⚠️  Skipping ZIP {zip_code}: {e}")
            continue
    
    if skipped > 0:
        print(f"⏭️  Skipping {skipped:,} existing ZIP codes")
    
    if not batch:
        print("✅ All ZIP codes already imported!")
        conn.close()
        return
    
    print(f"\n📤 Uploading {len(batch):,} ZIP boundaries...")
    print("   (This may take 2-3 minutes)")
    
    # Bulk insert in batches of 1000
    BATCH_SIZE = 1000
    uploaded = 0
    
    try:
        with conn.cursor() as cur:
            for i in tqdm(range(0, len(batch), BATCH_SIZE), desc="Uploading"):
                batch_chunk = batch[i:i + BATCH_SIZE]
                
                # Bulk insert with GeoJSON conversion
                for zip_code, geom_json in batch_chunk:
                    # Insert with proper geography conversion
                    # Convert GeoJSON -> geometry -> geography
                    # Using ST_GeogFromWKB is more efficient than ST_GeogFromText
                    cur.execute(
                        """
                        INSERT INTO gis.zip_boundaries (zcta5ce20, geom)
                        VALUES (
                            %s, 
                            ST_GeogFromWKB(
                                ST_AsBinary(
                                    ST_SetSRID(ST_GeomFromGeoJSON(%s::text), 4326)
                                )
                            )
                        )
                        ON CONFLICT (zcta5ce20) DO NOTHING
                        """,
                        (zip_code, geom_json)
                    )
                
                conn.commit()
                uploaded += len(batch_chunk)
        
        print(f"\n✅ Successfully uploaded {uploaded:,} ZIP boundaries!")
        
        # Verify final count
        with conn.cursor() as cur:
            cur.execute("SELECT COUNT(*) FROM gis.zip_boundaries")
            total = cur.fetchone()[0]
            print(f"📊 Total ZIP boundaries in database: {total:,}")
            
            # Test query
            cur.execute("""
                SELECT zcta5ce20, ST_AsGeoJSON(geom::geometry)::jsonb->>'type' as geom_type
                FROM gis.zip_boundaries 
                WHERE zcta5ce20 = '60654'
                LIMIT 1
            """)
            test = cur.fetchone()
            if test:
                print(f"✅ Test query successful: ZIP 60654 found (type: {test[1]})")
            else:
                print("⚠️  Test query: ZIP 60654 not found (may be normal)")
    
    except Exception as e:
        print(f"\n❌ Upload failed: {e}")
        conn.rollback()
        raise
    finally:
        conn.close()

def main():
    print("=" * 60)
    print("TIGER/Line ZCTA5 ZIP Boundaries Import")
    print("=" * 60)
    
    # Step 1: Convert shapefile to GeoJSON
    convert_shapefile_to_geojson()
    
    # Step 2: Upload to Supabase
    upload_zip_boundaries()
    
    print("\n" + "=" * 60)
    print("✅ Import complete!")
    print("=" * 60)
    print("\nNext steps:")
    print("1. Test the RPC function:")
    print("   SELECT * FROM get_zip_boundary('60654');")
    print("2. Verify in your app by searching for a ZIP code")

if __name__ == "__main__":
    main()
