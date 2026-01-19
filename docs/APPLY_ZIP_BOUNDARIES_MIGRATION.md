# How to Apply ZIP Boundaries Migration

## Option 1: Supabase Dashboard (Recommended - Easiest)

1. Go to your Supabase project dashboard: https://supabase.com/dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `supabase/migrations/20250118000000_create_zip_boundaries.sql`
4. Paste and run the SQL in the editor
5. Verify the table was created:
   ```sql
   SELECT COUNT(*) FROM gis.zip_boundaries;
   ```

## Option 2: Supabase CLI (If Project is Linked)

If your project is linked to Supabase CLI:

```bash
# Make sure you're logged in
supabase login

# Link your project (if not already linked)
supabase link --project-ref your-project-ref

# Push migrations to remote
supabase db push
```

## Option 3: Direct SQL Execution

You can also run the SQL directly via the Supabase dashboard SQL editor:

```sql
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
```

## After Running Migration

1. **Verify the table exists:**
   ```sql
   SELECT COUNT(*) FROM gis.zip_boundaries;
   -- Should return 0 (empty until you import TIGER data)
   ```

2. **Test the RPC function:**
   ```sql
   SELECT * FROM get_zip_boundary('60654');
   -- Will return empty until you import TIGER data
   ```

3. **Import TIGER/Line data** (see `supabase/migrations/20250118000001_import_zip_boundaries_instructions.md`)

## Troubleshooting

### "Extension postgis does not exist"
- Make sure PostGIS extension is enabled in your Supabase project
- Go to Database → Extensions → Enable "postgis"

### "Permission denied"
- Check that your database user has permissions to create schemas and tables
- You may need to run as a superuser or adjust permissions

### "Function already exists"
- The migration is idempotent (uses `IF NOT EXISTS`), but the function uses `CREATE OR REPLACE`
- This is safe to run multiple times
