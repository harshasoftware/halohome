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
import { Search, X, Loader2, MapPin, ChevronLeft, Hash } from 'lucide-react';

type InputMode = 'address' | 'zipcode';

interface ZipCodeBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

interface CitySearchBarProps {
  onCitySelect: (lat: number, lng: number, cityName: string, isZipCode?: boolean, bounds?: ZipCodeBounds) => void;
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
  const [inputMode, setInputMode] = useState<InputMode>('address');
  const [zipInput, setZipInput] = useState('');
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

  const handleAddressInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setSelectedCity(null);
  };

  const handleZipInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers, max 5 digits
    const val = e.target.value.replace(/\D/g, '').slice(0, 5);
    setZipInput(val);
  };

  const handleSelect = (suggestion: typeof data[0]) => {
    const { description } = suggestion;
    setValue(description, false);
    clearSuggestions();
    setSelectedCity(description);

    getGeocode({ address: description })
      .then((results) => getLatLng(results[0]))
      .then(({ lat, lng }) => {
        onCitySelect(lat, lng, description, false);
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
    if (zipInput.length !== 5) return;

    setIsSearchingZip(true);

    try {
      const results = await getGeocode({ address: `${zipInput}, USA` });
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

      onCitySelect(lat, lng, zipInput, true, bounds);

      // Collapse on mobile after selection
      if (isMobile) {
        setIsExpanded(false);
      }
    } catch (error) {
      console.error('ZIP code geocoding error:', error);
    } finally {
      setIsSearchingZip(false);
    }
  }, [zipInput, onCitySelect, isMobile]);

  const handleClear = () => {
    setValue('');
    setZipInput('');
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
    if (e.key === 'Enter' && inputMode === 'zipcode') {
      handleZipSearch();
    }
  };

  const toggleInputMode = () => {
    setInputMode(prev => prev === 'address' ? 'zipcode' : 'address');
    setValue('');
    setZipInput('');
    setSelectedCity(null);
    clearSuggestions();
  };

  const isAddressMode = inputMode === 'address';
  const placeholder = isAddressMode ? 'Enter address...' : 'Enter ZIP code...';
  const currentValue = isAddressMode ? value : zipInput;
  const isLoading = isAddressMode ? loading : isSearchingZip;

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
        {/* Mode toggle button */}
        <button
          onClick={toggleInputMode}
          className="flex items-center justify-center w-10 h-10 shrink-0 transition-colors hover:bg-slate-100 dark:hover:bg-white/10 text-[#d4a5a5]"
          title={isAddressMode ? 'Switch to ZIP code search' : 'Switch to address search'}
        >
          {isAddressMode ? (
            <MapPin className="w-4 h-4" />
          ) : (
            <Hash className="w-4 h-4" />
          )}
        </button>

        <input
          ref={inputRef}
          type="text"
          value={currentValue}
          onChange={isAddressMode ? handleAddressInput : handleZipInput}
          onKeyDown={handleKeyDown}
          disabled={isAddressMode ? !ready : false}
          placeholder={placeholder}
          className="flex-1 h-10 bg-transparent border-none outline-none pr-2 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden text-slate-700 dark:text-zinc-200 placeholder-slate-400"
          style={{
            minWidth: isMobile ? '200px' : '220px',
            fontSize: '16px', // Prevents iOS zoom on focus
          }}
          autoComplete="off"
          inputMode={isAddressMode ? 'text' : 'numeric'}
        />

        {/* Loading indicator */}
        {isLoading && (
          <div className="flex items-center justify-center w-8 h-8 mr-1">
            <Loader2 className="w-4 h-4 animate-spin text-[#d4a5a5]" />
          </div>
        )}

        {/* Selected indicator */}
        {!isLoading && selectedCity && (
          <div className="flex items-center justify-center w-8 h-8 mr-1">
            <MapPin className="w-4 h-4 text-emerald-500" />
          </div>
        )}

        {/* Search button (ZIP mode) */}
        {!isLoading && inputMode === 'zipcode' && zipInput.length === 5 && (
          <button
            onClick={handleZipSearch}
            className="flex items-center justify-center w-8 h-8 mr-1 rounded-full bg-[#d4a5a5] hover:bg-[#c49393] transition-colors"
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

      {/* Suggestions dropdown (Address mode only) */}
      {isAddressMode && status === 'OK' && data.length > 0 && (
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
                <MapPin className="w-4 h-4 text-[#d4a5a5] shrink-0" />
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
      {!isAddressMode && zipInput.length > 0 && zipInput.length < 5 && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Enter 5-digit ZIP code ({5 - zipInput.length} more digits)
          </p>
        </div>
      )}

      {/* No results message */}
      {isAddressMode && status === 'ZERO_RESULTS' && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            No addresses found
          </p>
        </div>
      )}

      {/* Mode indicator */}
      <div className="absolute -bottom-6 left-0 right-0 text-center">
        <span className="text-xs text-slate-400">
          {isAddressMode ? 'Address search' : 'ZIP code search'} - tap icon to switch
        </span>
      </div>
    </div>
  );
};

export default CitySearchBar;
