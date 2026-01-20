/**
 * CitySearchBar Component
 * Floating search bar for finding and navigating to locations on the globe
 *
 * Supports two input modes:
 * - "address": Search by address
 * - "zipcode": Search by ZIP code
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from '@/hooks/usePlacesAutocompleteNew';
import { Search, X, Loader2, MapPin, ChevronLeft } from 'lucide-react';

interface ZipCodeBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

export type UnifiedSearchSelectionKind = 'property' | 'area' | 'zip';

interface CitySearchBarProps {
  onCitySelect: (
    lat: number,
    lng: number,
    cityName: string,
    isZipCode?: boolean,
    bounds?: ZipCodeBounds,
    selectionKind?: UnifiedSearchSelectionKind
  ) => void;
  onClear?: () => void;
  isMobile?: boolean;
  className?: string;
}

export const CitySearchBar: React.FC<CitySearchBarProps> = ({
  onCitySelect,
  onClear,
  isMobile = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [inputText, setInputText] = useState('');
  const [isSearchingZip, setIsSearchingZip] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    ready,
    value,
    suggestions: { status, data, loading },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      // No type restriction - allows addresses and other location types
      componentRestrictions: { country: 'us' },
    },
    debounce: 300,
  });

  // Focus input when expanded on mobile
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  // ZIP detection should ONLY trigger when the user is typing digits-only.
  // This prevents addresses like "2010 west end avenue" from being treated as a ZIP.
  const isZipDigitsOnlyUpTo5 = (text: string) => /^\d{0,5}$/.test(text);
  const isZipExactTrim = (text: string) => /^\s*\d{5}\s*$/.test(text);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;

    // If user is typing a ZIP, keep it numeric and avoid Places suggestions.
    if (isZipDigitsOnlyUpTo5(raw)) {
      // raw is already digits-only here
      setInputText(raw);
      setSelectedCity(null);
      clearSuggestions();
      // Keep Places value empty to avoid irrelevant results for numeric input
      setValue('', false);
      return;
    }

    // Otherwise treat as address/area input (Places autocomplete)
    setInputText(raw);
    setValue(raw);
    setSelectedCity(null);
  };

  const handleSelect = (suggestion: typeof data[0]) => {
    const { description } = suggestion;
    // Keep the displayed text in sync with the user's selection.
    setInputText(description);
    setValue(description, false);
    clearSuggestions();
    setSelectedCity(description);

    getGeocode({ address: description })
      .then(async (results) => {
        const first = results[0];
        const { lat, lng } = await getLatLng(first);

        // Infer whether this is a single property vs a broader area.
        const types = (first as any)?.types as string[] | undefined;

        // If Google returns a postal_code result, treat it as ZIP flow (polygon + scout).
        const isPostalCode = Array.isArray(types) && types.includes('postal_code');
        if (isPostalCode) {
          // Extract a 5-digit ZIP from the description or address components
          const extractedZipFromText = description.match(/\b\d{5}\b/)?.[0] ?? null;
          const extractedZipFromComponents =
            (first as any)?.address_components?.find((c: any) =>
              Array.isArray(c?.types) && c.types.includes('postal_code')
            )?.short_name ?? null;

          const zip = String(extractedZipFromText || extractedZipFromComponents || '').trim();
          if (zip.length === 5) {
            // Extract viewport bounds for ZIP code area (same as typed ZIP flow)
            let bounds: ZipCodeBounds | undefined;
            const geometry = first?.geometry;
            if (geometry?.viewport) {
              const viewport = geometry.viewport;
              bounds = {
                north: viewport.getNorthEast().lat(),
                south: viewport.getSouthWest().lat(),
                east: viewport.getNorthEast().lng(),
                west: viewport.getSouthWest().lng(),
              };
            }

            // Normalize UI state to show just the ZIP
            setInputText(zip);
            setSelectedCity(zip);

            onCitySelect(lat, lng, zip, true, bounds, 'zip');
            if (isMobile) setIsExpanded(false);
            return;
          }
        }

        const isProperty =
          Array.isArray(types) &&
          types.some((t) =>
            [
              'street_address',
              'premise',
              'subpremise',
              'establishment',
              'point_of_interest',
            ].includes(t)
          );

        const selectionKind: UnifiedSearchSelectionKind = isProperty ? 'property' : 'area';

        onCitySelect(lat, lng, description, false, undefined, selectionKind);
        // Collapse on mobile after selection
        if (isMobile) {
          setIsExpanded(false);
        }
      })
      .catch((error) => {
        console.error('Geocoding error:', error);
      });
  };

  const handleZipSearch = useCallback(async () => {
    const zip = inputText.trim();
    if (!isZipExactTrim(zip)) return;

    setIsSearchingZip(true);

    try {
      const results = await getGeocode({ address: `${zip}, USA` });
      const { lat, lng } = await getLatLng(results[0]);

      // Extract viewport bounds for ZIP code area
      let bounds: ZipCodeBounds | undefined;
      const geometry = results[0]?.geometry;
      if (geometry?.viewport) {
        const viewport = geometry.viewport;
        bounds = {
          north: viewport.getNorthEast().lat(),
          south: viewport.getSouthWest().lat(),
          east: viewport.getNorthEast().lng(),
          west: viewport.getSouthWest().lng(),
        };
      }

      // ZIP selection
      onCitySelect(lat, lng, zip, true, bounds, 'zip');

      // Collapse on mobile after selection
      if (isMobile) {
        setIsExpanded(false);
      }
    } catch (error) {
      console.error('ZIP code geocoding error:', error);
    } finally {
      setIsSearchingZip(false);
    }
  }, [inputText, onCitySelect, isMobile]);

  const handleClear = () => {
    setInputText('');
    setValue('', false);
    setSelectedCity(null);
    clearSuggestions();
    onClear?.();
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      clearSuggestions();
      if (isMobile) {
        setIsExpanded(false);
      }
    }
    if (e.key === 'Enter' && isZipExactTrim(inputText)) {
      handleZipSearch();
    }
  };

  const isZipMode = /^\d{1,5}$/.test(inputText);
  const placeholder = 'Enter address or ZIP…';
  const currentValue = inputText;
  const isLoading = (isZipMode ? isSearchingZip : loading) || isSearchingZip;

  // Mobile collapsed state - show search icon
  if (isMobile && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={`flex items-center justify-center w-10 h-10 rounded-full backdrop-blur-md shadow-lg border bg-white/90 dark:bg-zinc-800 border-slate-200 dark:border-white/10 ${className}`}
      >
        <Search className="w-5 h-5 text-slate-600 dark:text-zinc-300" />
      </button>
    );
  }

  return (
    <div className={`relative ${className}`} data-tour="search-bar">
      {/* Search input container */}
      <div className="flex items-center backdrop-blur-md rounded-full shadow-lg overflow-hidden bg-white/95 dark:bg-zinc-800 border border-slate-200 dark:border-white/10">
        <div className="flex items-center justify-center w-10 h-10 shrink-0 text-amber-600 dark:text-amber-400">
          <MapPin className="w-4 h-4" />
        </div>

        <input
          ref={inputRef}
          type="text"
          value={currentValue}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={!ready && !isZipMode}
          placeholder={placeholder}
          className="flex-1 h-10 bg-transparent border-none outline-none pr-2 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden text-slate-700 dark:text-zinc-200 placeholder-slate-400"
          style={{
            minWidth: isMobile ? '200px' : '220px',
            fontSize: '16px', // Prevents iOS zoom on focus
          }}
          autoComplete="off"
          inputMode={isZipMode ? 'numeric' : 'text'}
        />

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center w-8 h-8 mr-1">
            <Loader2 className="w-4 h-4 animate-spin text-amber-600 dark:text-amber-400" />
          </div>
        )}

        {/* Selected indicator */}
        {!isLoading && selectedCity && (
          <div className="flex items-center justify-center w-8 h-8 mr-1">
            <MapPin className="w-4 h-4 text-emerald-500" />
          </div>
        )}

        {/* Search button (ZIP mode) */}
        {!isLoading && isZipExactTrim(inputText) && (
          <button
            onClick={handleZipSearch}
            className="flex items-center justify-center w-8 h-8 mr-1 rounded-full bg-amber-500 hover:bg-amber-600 transition-colors"
          >
            <Search className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Clear button */}
        {(currentValue || selectedCity) && !isLoading && (
          <button
            onClick={handleClear}
            className="flex items-center justify-center w-8 h-8 mr-1 rounded-full transition-colors hover:bg-slate-100 dark:hover:bg-white/10"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        )}

        {/* Mobile close button */}
        {isMobile && (
          <button
            onClick={() => {
              setIsExpanded(false);
              clearSuggestions();
            }}
            className="flex items-center justify-center w-10 h-10 border-l transition-colors border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10"
            aria-label="Close search"
          >
            <ChevronLeft className="w-5 h-5 text-slate-500" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown (only when not typing a ZIP) */}
      {!isZipMode && status === 'OK' && data.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl overflow-hidden">
          {data.map((suggestion) => {
            const {
              place_id,
              structured_formatting: { main_text, secondary_text },
            } = suggestion;

            return (
              <li
                key={place_id}
                onClick={() => handleSelect(suggestion)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-white/10 transition-colors border-b border-slate-100 dark:border-white/5 last:border-b-0"
              >
                <MapPin className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-800 dark:text-zinc-200 truncate">
                    {main_text}
                  </div>
                  <div className="text-xs text-slate-500 dark:text-zinc-400 truncate">
                    {secondary_text}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ZIP code helper text */}
      {isZipMode && inputText.length > 0 && inputText.length < 5 && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Enter 5-digit ZIP code ({5 - inputText.length} more digits)
          </p>
        </div>
      )}

      {/* No results message */}
      {!isZipMode && status === 'ZERO_RESULTS' && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            No addresses found
          </p>
        </div>
      )}
    </div>
  );
};

export default CitySearchBar;
