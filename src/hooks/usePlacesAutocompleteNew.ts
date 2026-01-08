/**
 * Modern Places Autocomplete Hook
 *
 * Uses the new Google Places API (AutocompleteSuggestion) instead of the
 * deprecated AutocompleteService. This is a drop-in replacement for
 * use-places-autocomplete with the same interface.
 *
 * @see https://developers.google.com/maps/documentation/javascript/place-autocomplete-new
 */

import { useState, useCallback, useRef, useEffect } from 'react';

// Types matching use-places-autocomplete interface for compatibility
export interface Suggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
  // Additional fields from the new API
  types?: string[];
}

interface SuggestionsState {
  status: '' | 'OK' | 'ZERO_RESULTS' | 'ERROR';
  data: Suggestion[];
  loading: boolean;
}

interface RequestOptions {
  types?: string[];
  componentRestrictions?: { country: string | string[] };
  // New API uses includedRegionCodes instead
  includedRegionCodes?: string[];
  // Location bias
  locationBias?: google.maps.LatLngBoundsLiteral;
}

interface UsePlacesAutocompleteOptions {
  requestOptions?: RequestOptions;
  debounce?: number;
  defaultValue?: string;
}

interface UsePlacesAutocompleteReturn {
  ready: boolean;
  value: string;
  suggestions: SuggestionsState;
  setValue: (value: string, shouldFetchData?: boolean) => void;
  clearSuggestions: () => void;
}

// Helper to convert country restriction to region codes
function getRegionCodes(restrictions?: { country: string | string[] }): string[] | undefined {
  if (!restrictions?.country) return undefined;
  const countries = Array.isArray(restrictions.country)
    ? restrictions.country
    : [restrictions.country];
  return countries.map((c) => c.toLowerCase());
}

// Helper to convert types for new API
function convertTypes(types?: string[]): string[] | undefined {
  if (!types) return undefined;

  // Map old type strings to new API equivalents
  const typeMap: Record<string, string> = {
    '(cities)': 'locality',
    '(regions)': 'administrative_area_level_1',
    geocode: 'geocode',
    address: 'street_address',
    establishment: 'establishment',
  };

  return types.map((t) => typeMap[t] || t);
}

export function usePlacesAutocomplete(
  options: UsePlacesAutocompleteOptions = {}
): UsePlacesAutocompleteReturn {
  const { requestOptions = {}, debounce = 300, defaultValue = '' } = options;

  const [ready, setReady] = useState(false);
  const [value, setValueState] = useState(defaultValue);
  const [suggestions, setSuggestions] = useState<SuggestionsState>({
    status: '',
    data: [],
    loading: false,
  });

  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const placesLibraryRef = useRef<google.maps.PlacesLibrary | null>(null);

  // Initialize the Places library
  useEffect(() => {
    const initPlaces = async () => {
      try {
        // Check if google.maps is available
        if (typeof google === 'undefined' || !google.maps) {
          // Wait for Google Maps to load
          const checkInterval = setInterval(() => {
            if (typeof google !== 'undefined' && google.maps) {
              clearInterval(checkInterval);
              loadLibrary();
            }
          }, 100);

          // Timeout after 10 seconds
          setTimeout(() => clearInterval(checkInterval), 10000);
          return;
        }

        await loadLibrary();
      } catch (error) {
        console.error('[PlacesAutocomplete] Failed to initialize:', error);
      }
    };

    const loadLibrary = async () => {
      try {
        placesLibraryRef.current = (await google.maps.importLibrary(
          'places'
        )) as google.maps.PlacesLibrary;
        setReady(true);
        console.log('[PlacesAutocomplete] New Places API initialized');
      } catch (error) {
        console.error('[PlacesAutocomplete] Failed to load places library:', error);
      }
    };

    initPlaces();
  }, []);

  // Fetch suggestions using the new API
  const fetchSuggestions = useCallback(
    async (input: string) => {
      if (!placesLibraryRef.current || !input.trim()) {
        setSuggestions({ status: '', data: [], loading: false });
        return;
      }

      setSuggestions((prev) => ({ ...prev, loading: true }));

      try {
        const { AutocompleteSuggestion } = placesLibraryRef.current;

        // Build request options for new API
        const request: google.maps.places.AutocompleteRequest = {
          input,
        };

        // Add region codes if component restrictions exist
        const regionCodes =
          requestOptions.includedRegionCodes ||
          getRegionCodes(requestOptions.componentRestrictions);
        if (regionCodes) {
          request.includedRegionCodes = regionCodes;
        }

        // Add location bias if provided
        if (requestOptions.locationBias) {
          request.locationBias = requestOptions.locationBias;
        }

        // Add type filtering - map old types to new API
        const includedTypes = convertTypes(requestOptions.types);
        if (includedTypes && includedTypes.length > 0) {
          request.includedPrimaryTypes = includedTypes;
        }

        const { suggestions: results } =
          await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);

        if (!results || results.length === 0) {
          setSuggestions({ status: 'ZERO_RESULTS', data: [], loading: false });
          return;
        }

        // Map results to the expected format
        const mappedSuggestions: Suggestion[] = results
          .filter((s) => s.placePrediction)
          .map((suggestion) => {
            const pred = suggestion.placePrediction!;
            return {
              place_id: pred.placeId,
              description: pred.text?.text || '',
              structured_formatting: {
                main_text: pred.mainText?.text || '',
                secondary_text: pred.secondaryText?.text || '',
              },
              types: pred.types,
            };
          });

        setSuggestions({
          status: 'OK',
          data: mappedSuggestions,
          loading: false,
        });
      } catch (error) {
        console.error('[PlacesAutocomplete] Fetch error:', error);
        setSuggestions({ status: 'ERROR', data: [], loading: false });
      }
    },
    [requestOptions]
  );

  // Set value with optional fetch
  const setValue = useCallback(
    (newValue: string, shouldFetchData = true) => {
      setValueState(newValue);

      // Clear any pending debounce
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      if (!shouldFetchData) {
        return;
      }

      if (!newValue.trim()) {
        setSuggestions({ status: '', data: [], loading: false });
        return;
      }

      // Debounce the fetch
      debounceTimerRef.current = setTimeout(() => {
        fetchSuggestions(newValue);
      }, debounce);
    },
    [debounce, fetchSuggestions]
  );

  // Clear suggestions
  const clearSuggestions = useCallback(() => {
    setSuggestions({ status: '', data: [], loading: false });
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  return {
    ready,
    value,
    suggestions,
    setValue,
    clearSuggestions,
  };
}

// Re-export geocoding utilities from use-places-autocomplete for compatibility
// These still work with the new API
export { getGeocode, getLatLng } from 'use-places-autocomplete';

export default usePlacesAutocomplete;
