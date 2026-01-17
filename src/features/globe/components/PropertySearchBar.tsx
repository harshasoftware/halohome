/**
 * PropertySearchBar Component
 * Search bar for finding properties by address or ZIP code
 * Replaces CitySearchBar for Vastu-focused property analysis
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import usePlacesAutocomplete, {
  getGeocode,
  getLatLng,
} from '@/hooks/usePlacesAutocompleteNew';
import { Search, X, Loader2, MapPin, Home, ChevronLeft, Hash } from 'lucide-react';
import { useVastuStore } from '@/stores/vastuStore';
import { cn } from '@/lib/utils';

type SearchMode = 'address' | 'zipcode';

interface PropertySearchBarProps {
  onLocationSelect: (lat: number, lng: number, address: string, isZipCode: boolean) => void;
  onClear?: () => void;
  isMobile?: boolean;
  className?: string;
  defaultMode?: SearchMode;
}

export const PropertySearchBar: React.FC<PropertySearchBarProps> = ({
  onLocationSelect,
  onClear,
  isMobile = false,
  className = '',
  defaultMode = 'address',
}) => {
  const [isExpanded, setIsExpanded] = useState(!isMobile);
  const [selectedAddress, setSelectedAddress] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<SearchMode>(defaultMode);
  const [zipInput, setZipInput] = useState('');
  const [isSearchingZip, setIsSearchingZip] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const { addToHistory } = useVastuStore();

  const {
    ready,
    value,
    suggestions: { status, data, loading },
    setValue,
    clearSuggestions,
  } = usePlacesAutocomplete({
    requestOptions: {
      // No type restriction - allows addresses, premises, and other location types
      componentRestrictions: { country: 'us' }, // US only for now
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
    setSelectedAddress(null);
  };

  const handleZipInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only allow numbers
    const value = e.target.value.replace(/\D/g, '').slice(0, 5);
    setZipInput(value);
  };

  const handleAddressSelect = (suggestion: typeof data[0]) => {
    const { description } = suggestion;
    setValue(description, false);
    clearSuggestions();
    setSelectedAddress(description);

    getGeocode({ address: description })
      .then((results) => getLatLng(results[0]))
      .then(({ lat, lng }) => {
        onLocationSelect(lat, lng, description, false);

        // Add to search history
        addToHistory({
          address: description,
          coordinates: { lat, lng },
          isZipCode: false,
        });

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

      onLocationSelect(lat, lng, zipInput, true);

      // Add to search history
      addToHistory({
        address: `ZIP: ${zipInput}`,
        coordinates: { lat, lng },
        isZipCode: true,
      });

      // Collapse on mobile after selection
      if (isMobile) {
        setIsExpanded(false);
      }
    } catch (error) {
      console.error('ZIP code geocoding error:', error);
    } finally {
      setIsSearchingZip(false);
    }
  }, [zipInput, onLocationSelect, addToHistory, isMobile]);

  const handleClear = () => {
    setValue('');
    setZipInput('');
    setSelectedAddress(null);
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
    if (e.key === 'Enter' && searchMode === 'zipcode') {
      handleZipSearch();
    }
  };

  const toggleMode = () => {
    setSearchMode(prev => prev === 'address' ? 'zipcode' : 'address');
    setValue('');
    setZipInput('');
    setSelectedAddress(null);
    clearSuggestions();
  };

  const isAddressMode = searchMode === 'address';
  const placeholder = isAddressMode ? 'Search property address...' : 'Enter ZIP code...';
  const currentValue = isAddressMode ? value : zipInput;
  const isLoading = isAddressMode ? loading : isSearchingZip;

  // Mobile collapsed state
  if (isMobile && !isExpanded) {
    return (
      <button
        onClick={() => setIsExpanded(true)}
        className={cn(
          'flex items-center gap-2 px-4 h-11 rounded-full backdrop-blur-md shadow-lg',
          'bg-[#d4a5a5] border border-[#c49393]',
          className
        )}
      >
        <Home className="w-5 h-5 text-white" />
        <span className="text-sm font-medium text-white">Find Property</span>
      </button>
    );
  }

  return (
    <div className={cn('relative', className)} data-tour="property-search">
      {/* Search input container */}
      <div className={cn(
        'flex items-center backdrop-blur-md rounded-full shadow-lg overflow-hidden',
        'bg-white border border-slate-200'
      )}>
        {/* Mode toggle button */}
        <button
          onClick={toggleMode}
          className={cn(
            'flex items-center justify-center w-10 h-10 shrink-0 transition-colors',
            'hover:bg-slate-100',
            'text-[#d4a5a5]'
          )}
          title={isAddressMode ? 'Switch to ZIP code search' : 'Switch to address search'}
        >
          {isAddressMode ? (
            <Home className="w-4 h-4" />
          ) : (
            <Hash className="w-4 h-4" />
          )}
        </button>

        {/* Input field */}
        <input
          ref={inputRef}
          type="text"
          value={currentValue}
          onChange={isAddressMode ? handleAddressInput : handleZipInput}
          onKeyDown={handleKeyDown}
          disabled={isAddressMode ? !ready : false}
          placeholder={placeholder}
          className={cn(
            'flex-1 h-10 bg-transparent border-none outline-none pr-2',
            '[&::-webkit-search-cancel-button]:hidden [&::-webkit-search-decoration]:hidden',
            'text-slate-700 placeholder-slate-400'
          )}
          style={{
            minWidth: isMobile ? '200px' : '280px',
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
        {!isLoading && selectedAddress && (
          <div className="flex items-center justify-center w-8 h-8 mr-1">
            <MapPin className="w-4 h-4 text-emerald-500" />
          </div>
        )}

        {/* Search button (ZIP mode) */}
        {!isLoading && searchMode === 'zipcode' && zipInput.length === 5 && (
          <button
            onClick={handleZipSearch}
            className={cn(
              'flex items-center justify-center w-8 h-8 mr-1 rounded-full',
              'bg-[#d4a5a5] hover:bg-[#c49393] transition-colors'
            )}
          >
            <Search className="w-4 h-4 text-white" />
          </button>
        )}

        {/* Clear button */}
        {(currentValue || selectedAddress) && !isLoading && (
          <button
            onClick={handleClear}
            className={cn(
              'flex items-center justify-center w-8 h-8 mr-1 rounded-full transition-colors',
              'hover:bg-slate-100'
            )}
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
            className={cn(
              'flex items-center justify-center w-10 h-10 border-l transition-colors',
              'border-slate-200 hover:bg-slate-100'
            )}
            aria-label="Close search"
          >
            <ChevronLeft className="w-5 h-5 text-slate-500" />
          </button>
        )}
      </div>

      {/* Address suggestions dropdown */}
      {isAddressMode && status === 'OK' && data.length > 0 && (
        <ul className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          {data.map((suggestion) => {
            const {
              place_id,
              structured_formatting: { main_text, secondary_text },
            } = suggestion;

            return (
              <li
                key={place_id}
                onClick={() => handleAddressSelect(suggestion)}
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
              >
                <Home className="w-4 h-4 text-[#d4a5a5] shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-slate-800 truncate">
                    {main_text}
                  </div>
                  <div className="text-xs text-slate-500 truncate">
                    {secondary_text}
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ZIP code info */}
      {!isAddressMode && zipInput.length > 0 && zipInput.length < 5 && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-4 text-center">
          <p className="text-sm text-slate-500">
            Enter 5-digit ZIP code ({5 - zipInput.length} more digits)
          </p>
        </div>
      )}

      {/* No results message */}
      {isAddressMode && status === 'ZERO_RESULTS' && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl p-4 text-center">
          <p className="text-sm text-slate-500">
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

export default PropertySearchBar;
