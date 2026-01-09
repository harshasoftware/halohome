/**
 * CitySearchBar Component
 * Floating search bar for finding and navigating to cities on the globe
 * Supports two modes:
 * - "birthplace": Initial mode to enter birth location (triggers birth data flow)
 * - "search": Regular city search for relocation (when birth data exists)
 */

import React, { useState, useRef, useEffect } from 'react';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from '@/hooks/usePlacesAutocompleteNew';
import { Search, X, Loader2, MapPin, ChevronLeft } from 'lucide-react';

type SearchMode = 'birthplace' | 'search';

interface CitySearchBarProps {
  onCitySelect: (lat: number, lng: number, cityName: string) => void;
  onClear?: () => void;
  isMobile?: boolean;
  className?: string;
  mode?: SearchMode;
}

export const CitySearchBar: React.FC<CitySearchBarProps> = ({
  onCitySelect,
  onClear,
  isMobile = false,
  className = '',
  mode = 'search',
}) => {
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    ready,
    value,
    suggestions: { status, data, loading },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      types: ['(cities)'], // Focus on cities only
    },
    debounce: 300,
  });

  // Focus input when expanded on mobile
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isExpanded]);

  const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue(e.target.value);
    setSelectedCity(null);
  };

  const handleSelect = (suggestion: typeof data[0]) => {
    const { description } = suggestion;
    setValue(description, false);
    clearSuggestions();
    setSelectedCity(description);

    getGeocode({ address: description })
      .then((results) => getLatLng(results[0]))
      .then(({ lat, lng }) => {
        onCitySelect(lat, lng, description);
        // Collapse on mobile after selection
        if (isMobile) {
          setIsExpanded(false);
        }
      })
      .catch((error) => {
        console.error('Geocoding error:', error);
      });
  };

  const handleClear = () => {
    setValue('');
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
  };

  const isBirthplaceMode = mode === 'birthplace';
  const placeholder = isBirthplaceMode ? 'Enter your birthplace...' : 'Search city...';

  // Mobile collapsed state - show different icon based on mode
  if (isMobile && !isExpanded) {
    // In birthplace mode, show a more prominent button with label
    if (isBirthplaceMode) {
      return (
        <button
          onClick={() => setIsExpanded(true)}
          className={`flex items-center gap-2 px-4 h-11 rounded-full backdrop-blur-md shadow-lg bg-blue-500 border border-blue-400 animate-pulse ${className}`}
        >
          <MapPin className="w-5 h-5 text-white" />
          <span className="text-sm font-medium text-white">Enter Birthplace</span>
        </button>
      );
    }
    // Regular search mode - just show icon
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
      <div className={`flex items-center backdrop-blur-md rounded-full shadow-lg overflow-hidden ${
        isBirthplaceMode
          ? 'bg-blue-500/95 border border-blue-400'
          : 'bg-white/95 dark:bg-zinc-800 border border-slate-200 dark:border-white/10'
      }`}>
        <div className="flex items-center justify-center w-10 h-10 shrink-0">
          {loading ? (
            <Loader2 className={`w-4 h-4 animate-spin ${isBirthplaceMode ? 'text-white/70' : 'text-slate-400'}`} />
          ) : selectedCity ? (
            <MapPin className={`w-4 h-4 ${isBirthplaceMode ? 'text-white' : 'text-emerald-500'}`} />
          ) : isBirthplaceMode ? (
            <MapPin className="w-4 h-4 text-white" />
          ) : (
            <Search className="w-4 h-4 text-slate-400" />
          )}
        </div>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          disabled={!ready}
          placeholder={placeholder}
          className={`flex-1 h-10 bg-transparent border-none outline-none pr-2 [&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden ${
            isBirthplaceMode
              ? 'text-white placeholder-white/70'
              : 'text-slate-700 dark:text-zinc-200 placeholder-slate-400'
          }`}
          style={{
            minWidth: isMobile ? '200px' : '220px',
            fontSize: '16px', // Prevents iOS zoom on focus
          }}
          autoComplete="off"
        />
        {(value || selectedCity) && (
          <button
            onClick={handleClear}
            className={`flex items-center justify-center w-8 h-8 mr-1 rounded-full transition-colors ${
              isBirthplaceMode
                ? 'hover:bg-white/20'
                : 'hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
          >
            <X className={`w-4 h-4 ${isBirthplaceMode ? 'text-white/70' : 'text-slate-400'}`} />
          </button>
        )}
        {isMobile && (
          <button
            onClick={() => {
              setIsExpanded(false);
              clearSuggestions();
            }}
            className={`flex items-center justify-center w-10 h-10 border-l transition-colors ${
              isBirthplaceMode
                ? 'border-white/30 hover:bg-white/20'
                : 'border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10'
            }`}
            aria-label="Close search"
          >
            <ChevronLeft className={`w-5 h-5 ${isBirthplaceMode ? 'text-white/70' : 'text-slate-500'}`} />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {status === 'OK' && data.length > 0 && (
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
                <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
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

      {/* No results message */}
      {status === 'ZERO_RESULTS' && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-white/10 rounded-xl shadow-xl p-4 text-center">
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            No cities found
          </p>
        </div>
      )}
    </div>
  );
};

export default CitySearchBar;
