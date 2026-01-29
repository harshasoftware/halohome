
import { RegridParcel, searchSFHParcels } from '../lib/regrid/regrid-service';

/**
 * Fetch parcels by ZIP code using the existing regrid-service
 */
export async function fetchRegridParcelsByZipcode(
  zipcode: string,
  apiKey: string, // Kept for compatibility with user code, though regrid-service uses env var
  sfhOnly: boolean = true
): Promise<RegridParcel[]> {
  // We utilize the existing searchSFHParcels function
  // Note: searchSFHParcels expects a "bounds" or "geojson". 
  // We need to implement a way to get bounds from zipcode if we want to use it directly,
  // OR we can rely on buildingFootprintsService logic which handles zipcodes.
  // However, for this specific request, let's assume we can use the buildingFootprintsService logic 
  // or simple geocoding if needed. 

  // Actually, let's reuse buildingFootprintsService's logic if possible, or 
  // since we can't easily import it without circular deps maybe, let's just 
  // implement a simple fetch via the regrid-service which seems to support what we need.

  // Wait, regrid-service.ts `searchSFHParcels` needs bounds or geojson.
  // To keep it simple and self-contained here, we might need to geocode the zip first.

  // For now, let's assume the user will provide a valid zipcode and we rely on
  // the buildingFootprintsService to handle the heavy lifting of "searchByZipCode"
  // but since we are replacing it, we should probably just call searchByZipCode 
  // from buildingFootprintsService which does exactly "get parcels for zip".

  // Let's import buildingFootprintsService to helper.
  const { searchByZipCode } = await import('../features/globe/services/buildingFootprintsService');

  const result = await searchByZipCode(zipcode, {
    extractPlots: true,
    extractBuildings: false, // We'll fetch these from Google
    maxResults: 500 // Fetch a good amount
  });

  // Convert BuildingFootprints back to RegridParcels (or close enough for our needs)
  // Actually, searchByZipCode returns BuildingFootprints. 
  // The user code expects RegridParcel[].
  // The buildingFootprintsService *converts* RegridParcels to BuildingFootprints.

  // To strictly follow "fetchRegridParcelsByZipcode" returning RegridParcel[],
  // we should call searchSFHParcels directly, but we need the ZIP bounds.
  // Let's import the zip boundary service.

  const { getZipBoundaryGeoJSON, getZipBoundaryBounds } = await import('../lib/zip-boundaries/zip-boundary-service');
  let geojson = await getZipBoundaryGeoJSON(zipcode);
  let bounds;

  if (!geojson) {
    // Fallback to geocoding
    const { buildingFootprintsService } = await import('../features/globe/services/buildingFootprintsService');
    // Re-using internal logic (which might be private) is hard.
    // Let's just use the service we saw earlier: buildingFootprintsService.searchSFHParcels is exported but logic is inside searchByBounds

    // Let's try to get bounds from a simple geocoder if we can, or just mock it for now?
    // No, we need real data.

    // Let's use searchSFHParcels from regrid-service.
    // We need to get the bounds for the ZIP.
    // We can use the existing `getZipCodeBounds` from coordinate-utils if available.
    const { getZipCodeBounds } = await import('../lib/building-footprints/coordinate-utils');
    const { getGeocode, getLatLng } = await import('use-places-autocomplete');

    const results = await getGeocode({ address: `${zipcode}, USA` });
    if (results && results[0]) {
      const { lat, lng } = await getLatLng(results[0]);
      bounds = getZipCodeBounds(lat, lng, 2); // 2km radius approximation
    }
  }

  if (geojson || bounds) {
    const { parcels } = await searchSFHParcels({
      geojson: geojson || undefined,
      bounds: bounds || undefined,
      limit: 500,
      returnMatchedBuildings: false
    });
    return parcels;
  }

  return [];
}

export interface EntrancePoint {
  id: string;
  lat: number;
  lng: number;
  isPreferred: boolean;
}

export interface GoogleBuilding {
  placeId: string;
  displayPolygon: {
    type: 'Polygon';
    coordinates: number[][][]; // GeoJSON Polygon coordinates
  };
  entrances?: Array<{
    location: { latitude: number; longitude: number };
    tags?: string[];
  }>;
}

export interface EnrichableParcel {
  id?: string; // or any unique identifier
  address?: string;
  properties?: {
    headline?: string;
    ll_uuid?: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface PropertyBundle<T = RegridParcel> {
  parcel: T;
  building: GoogleBuilding | null;
  entrances: EntrancePoint[];
}

/**
 * Fetch building footprints from Google Places API (SearchDestinations)
 */
export async function fetchBuildingFootprints(
  query: { addressQuery: string },
  apiKey: string
): Promise<GoogleBuilding | null> {
  // Use new proxy for Maps API (Geocoding)
  const baseUrl = '/google-maps-api/maps/api/geocode/json';

  // Construct URL with parameters
  // extra_computations=BUILDING_AND_ENTRANCES is the key for building footprints
  const params = new URLSearchParams({
    address: query.addressQuery,
    key: apiKey,
    extra_computations: 'BUILDING_AND_ENTRANCES'
  });

  const url = `${baseUrl}?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      const errorBody = await response.text();
      console.warn(`Google Geocoding API error: ${response.status} ${response.statusText}`, errorBody.substring(0, 500));
      return null;
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      console.warn('Geocoding API status:', data.status, data.error_message);
      return null;
    }

    // Use the first result
    const result = data.results[0];

    // Debugging: exact shape of the response with extra_computations
    console.log('Geocoding result keys:', Object.keys(result));
    // Check for probable keys where building info might be stored
    // Note: The specific field for building outlines in v3 with extra_computations is often 'building_layout' or nested in geometry
    // We log it to be sure until verified
    if (result.building_layout) console.log('Found building_layout');

    // TODO: The exact field for "building outlines" from extra_computations can vary or be experimental.
    // For now, we look for 'building_layout' or similar. 
    // If not found, we might need to rely on the v4 attributes or just geometry.viewport (which is a box, not a footprint).

    // Let's check commonly reported fields for this beta feature:
    // data.results[0].geometry.building_layout ??

    // For this debugging step, if we don't find a clear polygon, we return null but Log the JSON.
    // This allows us to inspect the browser console in the next step.
    console.log('Full Geocoding Result:', result);

    // Mock return for now if we can't find clear polygon - relying on console log for next fix equivalent
    // BUT if we see 'geometry.bounds' we can at least return that as a rect for now?
    // No, we want real footprints.

    // START EXPERIMENTAL PARSING based on typical Geocoding response
    // If we can't find a polygon, we return null.
    // We will inspect the log in the browser console.
    return null;

  } catch (error) {
    console.warn('Error fetching building footprint:', error);
    return null;
  }
}

/**
 * Enrich single parcel with building data
 */
export async function enrichParcelWithBuildingData<T extends EnrichableParcel>(
  parcel: T,
  googleApiKey: string
): Promise<PropertyBundle<T>> {
  const bundle: PropertyBundle<T> = {
    parcel,
    building: null,
    entrances: [],
  };

  try {
    // Prefer headline (address) for RegridParcel, or just address property
    const address = parcel.properties?.headline || parcel.address;

    if (address) {
      const building = await fetchBuildingFootprints(
        { addressQuery: address },
        googleApiKey
      );

      bundle.building = building;

      if (building?.entrances) {
        bundle.entrances = building.entrances.map((entrance, idx) => ({
          id: `entrance_${idx}`,
          lat: entrance.location.latitude,
          lng: entrance.location.longitude,
          isPreferred: entrance.tags?.includes('PREFERRED') || false,
        }));
      }
    }

    return bundle;
  } catch (error) {
    console.error('Error enriching parcel with building data:', error);
    return bundle;
  }
}

/**
 * Enrich multiple parcels with building data in parallel
 * Loops through addresses and fetches Google building data
 */
export async function enrichMultipleParcelsWithBuildingData<T extends EnrichableParcel>(
  parcels: T[],
  googleApiKey: string,
  options?: {
    concurrency?: number; // Limit parallel requests (default: 3)
    onProgress?: (current: number, total: number) => void;
  }
): Promise<Map<string, PropertyBundle<T>>> {
  const { concurrency = 3, onProgress } = options || {};
  const results = new Map<string, PropertyBundle<T>>();

  let completed = 0;

  // Helper: process single parcel
  const enrichParcel = async (parcel: T): Promise<void> => {
    try {
      const bundle = await enrichParcelWithBuildingData(parcel, googleApiKey);

      // Use id or ll_uuid as key
      const key = parcel.id || parcel.properties?.ll_uuid;
      if (key) {
        results.set(key, bundle);
      }
    } catch (error) {
      // Log but continue
      const address = parcel.properties?.headline || parcel.address;
      console.warn(`Failed to enrich parcel ${address}:`, error);

      const key = parcel.id || parcel.properties?.ll_uuid;
      if (key) {
        results.set(key, {
          parcel,
          building: null,
          entrances: []
        });
      }
    }

    completed++;
    onProgress?.(completed, parcels.length);
  };

  // Process in batches of `concurrency` to avoid rate limiting
  for (let i = 0; i < parcels.length; i += concurrency) {
    const batch = parcels.slice(i, i + concurrency);
    await Promise.all(batch.map(enrichParcel));
  }

  return results;
}

/**
 * Convert Regrid Parcel Array to GeoJSON FeatureCollection
 */
export function parcelArrayToGeoJSON(parcels: RegridParcel[]): GoogleMapsDataGeoJson {
  return {
    type: 'FeatureCollection',
    features: parcels.map(parcel => ({
      type: 'Feature',
      id: parcel.properties.ll_uuid,
      geometry: parcel.geometry,
      properties: {
        ...parcel.properties,
        llUuid: parcel.properties.ll_uuid // Ensure camelCase for convenience
      }
    }))
  };
}

/**
 * Convert Google Building to GeoJSON Feature
 */
export function buildingToGeoJSON(building: GoogleBuilding): GoogleMapsDataGeoJson {
  return {
    type: 'FeatureCollection',
    features: [{
      type: 'Feature',
      geometry: building.displayPolygon,
      properties: {
        placeId: building.placeId
      }
    }]
  };
}

// Type definition for what Google Maps Data layer expects (simplified)
interface GoogleMapsDataGeoJson {
  type: 'FeatureCollection';
  features: any[];
}
