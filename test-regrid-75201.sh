#!/bin/bash

# Test Regrid API call for ZIP code 75201 (Downtown Dallas, TX)
# This is in Dallas County (geoid 48113) - confirmed trial county

API_KEY="${VITE_REGRID_API_KEY:-$1}"

if [ -z "$API_KEY" ]; then
  echo "Error: VITE_REGRID_API_KEY not set. Usage: ./test-regrid-75201.sh [API_KEY]"
  exit 1
fi

# Downtown Dallas coordinates (75201)
# Center: 32.7767, -96.7970
CENTER_LAT=32.7767
CENTER_LNG=-96.7970

# Calculate bounds (3km radius) - same as getZipCodeBounds function
LAT_DEG_PER_KM=0.009
LNG_DEG_PER_KM=0.009
NORTH=$(echo "$CENTER_LAT + 3 * $LAT_DEG_PER_KM" | bc)
SOUTH=$(echo "$CENTER_LAT - 3 * $LAT_DEG_PER_KM" | bc)
EAST=$(echo "$CENTER_LNG + 3 * $LNG_DEG_PER_KM" | bc)
WEST=$(echo "$CENTER_LNG - 3 * $LNG_DEG_PER_KM" | bc)

GEOJSON="{\"type\":\"Polygon\",\"coordinates\":[[[$WEST,$SOUTH],[$EAST,$SOUTH],[$EAST,$NORTH],[$WEST,$NORTH],[$WEST,$SOUTH]]]}"

echo "Testing Regrid API for ZIP 75201 (Downtown Dallas, TX)..."
echo "Center: $CENTER_LAT, $CENTER_LNG"
echo "Bounds: N=$NORTH, S=$SOUTH, E=$EAST, W=$WEST"
echo "GeoJSON: $GEOJSON"
echo ""

curl -G "https://app.regrid.com/api/v2/parcels/query" \
  --data-urlencode "token=$API_KEY" \
  --data-urlencode "limit=10" \
  --data-urlencode "fields[lbcs_activity][eq]=1100" \
  --data-urlencode "geojson=$GEOJSON" \
  -w "\n\nHTTP Status: %{http_code}\n" \
  | jq '.' 2>/dev/null || cat
