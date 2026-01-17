import React, { useState, useCallback, useEffect, useRef } from 'react';
import usePlacesAutocomplete, {
    getGeocode,
    getLatLng,
} from '@/hooks/usePlacesAutocompleteNew';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Loader2, ArrowRight, Hash } from 'lucide-react';
import '../Landing.css';

type SearchMode = 'address' | 'zipcode';

interface LandingHeroSearchProps {
    onFocusChange?: (isFocused: boolean) => void;
}

const LandingHeroSearch = ({ onFocusChange }: LandingHeroSearchProps) => {
    const navigate = useNavigate();
    const [isSelecting, setIsSelecting] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
    const [searchMode, setSearchMode] = useState<SearchMode>('address');
    const [zipInput, setZipInput] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    // Track visual viewport for keyboard detection on mobile
    useEffect(() => {
        if (!isFocused) {
            setKeyboardHeight(0);
            return;
        }

        const viewport = window.visualViewport;
        if (!viewport) return;

        const handleResize = () => {
            // Keyboard height is the difference between window height and visual viewport height
            const kbHeight = window.innerHeight - viewport.height;
            setKeyboardHeight(kbHeight > 100 ? kbHeight : 0);
        };

        viewport.addEventListener('resize', handleResize);
        viewport.addEventListener('scroll', handleResize);
        handleResize();

        return () => {
            viewport.removeEventListener('resize', handleResize);
            viewport.removeEventListener('scroll', handleResize);
        };
    }, [isFocused]);

    const handleFocus = useCallback(() => {
        setIsFocused(true);
        onFocusChange?.(true);
    }, [onFocusChange]);

    const handleBlur = useCallback((e: React.FocusEvent) => {
        // Don't blur if clicking on a suggestion
        const relatedTarget = e.relatedTarget as HTMLElement;
        if (relatedTarget?.closest('.hero-search-suggestions')) {
            return;
        }
        setIsFocused(false);
        onFocusChange?.(false);
        setActiveIndex(-1);
        setKeyboardHeight(0);
    }, [onFocusChange]);

    const {
        ready,
        value,
        suggestions: { status, data, loading },
        setValue,
        clearSuggestions,
    } = usePlacesAutocomplete({
        requestOptions: {
            // No type restriction - allows addresses and other location types
            componentRestrictions: { country: 'us' }, // US addresses
        },
        debounce: 300,
    });

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
        setActiveIndex(-1);
    };

    const handleZipInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Only allow numbers, max 5 digits
        const val = e.target.value.replace(/\D/g, '').slice(0, 5);
        setZipInput(val);
    };

    const selectSuggestion = useCallback((description: string) => {
        setValue(description, false);
        clearSuggestions();
        setIsSelecting(true);
        setActiveIndex(-1);

        getGeocode({ address: description })
            .then((results) => {
                if (!results || results.length === 0) {
                    throw new Error('No results found');
                }
                return getLatLng(results[0]);
            })
            .then((coords) => {
                if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
                    throw new Error('Invalid coordinates');
                }
                navigate(`/app?lat=${coords.lat}&lng=${coords.lng}&address=${encodeURIComponent(description)}`);
            })
            .catch((error) => {
                console.log('Error: ', error);
                setIsSelecting(false);
            });
    }, [setValue, clearSuggestions, navigate]);

    const handleZipSearch = useCallback(async () => {
        if (zipInput.length !== 5) return;

        setIsSelecting(true);

        try {
            const results = await getGeocode({ address: `${zipInput}, USA` });
            const { lat, lng } = await getLatLng(results[0]);
            navigate(`/app?lat=${lat}&lng=${lng}&address=${encodeURIComponent(zipInput)}&isZip=true`);
        } catch (error) {
            console.error('ZIP code geocoding error:', error);
            setIsSelecting(false);
        }
    }, [zipInput, navigate]);

    const handleSelect = (suggestion: { description: string }) => () => {
        selectSuggestion(suggestion.description);
    };

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        // Handle ZIP code Enter
        if (searchMode === 'zipcode') {
            if (e.key === 'Enter' && zipInput.length === 5) {
                e.preventDefault();
                handleZipSearch();
            }
            return;
        }

        // Address mode keyboard navigation
        if (status !== 'OK' || data.length === 0) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setActiveIndex((prev) => (prev < data.length - 1 ? prev + 1 : 0));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setActiveIndex((prev) => (prev > 0 ? prev - 1 : data.length - 1));
                break;
            case 'Enter':
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < data.length) {
                    selectSuggestion(data[activeIndex].description);
                } else if (data.length > 0) {
                    // Select first suggestion if none highlighted
                    selectSuggestion(data[0].description);
                }
                break;
            case 'Escape':
                e.preventDefault();
                clearSuggestions();
                setActiveIndex(-1);
                break;
        }
    }, [searchMode, zipInput, handleZipSearch, status, data, activeIndex, selectSuggestion, clearSuggestions]);

    const toggleMode = () => {
        setSearchMode(prev => prev === 'address' ? 'zipcode' : 'address');
        setValue('');
        setZipInput('');
        clearSuggestions();
        setActiveIndex(-1);
    };

    const isAddressMode = searchMode === 'address';
    const placeholder = isAddressMode ? 'Enter property address...' : 'Enter 5-digit ZIP code...';
    const currentValue = isAddressMode ? value : zipInput;

    // Calculate max height for suggestions based on available space above keyboard
    const suggestionsMaxHeight = keyboardHeight > 0
        ? `calc(100dvh - ${keyboardHeight}px - 120px)` // Leave room for search bar + some padding
        : '300px';

    return (
        <div
            ref={containerRef}
            className="relative w-full max-w-lg mx-auto mt-8 group"
            style={keyboardHeight > 0 ? {
                // When keyboard is open, ensure container stays in visible area
                maxHeight: `calc(100dvh - ${keyboardHeight}px - 32px)`,
            } : undefined}
        >
            {/* Main Input Container */}
            <div className="relative flex items-center bg-white border-2 border-zinc-300 rounded-full px-4 py-3 shadow-md transition-all duration-300 group-hover:border-zinc-400 group-hover:shadow-lg group-focus-within:border-zinc-900 group-focus-within:shadow-xl">
                {/* Mode toggle button */}
                <button
                    onClick={toggleMode}
                    className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-colors hover:bg-slate-100 ${isAddressMode ? 'text-[#d4a5a5]' : 'text-[#d4a5a5]'}`}
                    title={isAddressMode ? 'Switch to ZIP code search' : 'Switch to address search'}
                >
                    {isAddressMode ? (
                        <MapPin className="w-5 h-5" />
                    ) : (
                        <Hash className="w-5 h-5" />
                    )}
                </button>

                <input
                    type="text"
                    value={currentValue}
                    onChange={isAddressMode ? handleInput : handleZipInput}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    disabled={isAddressMode ? (!ready || isSelecting) : isSelecting}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-none outline-none text-zinc-900 placeholder-zinc-400 text-lg font-medium"
                    role="combobox"
                    aria-expanded={isAddressMode && status === 'OK'}
                    aria-autocomplete="list"
                    aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
                    inputMode={isAddressMode ? 'text' : 'numeric'}
                />

                {/* Search button for ZIP mode */}
                {!isAddressMode && zipInput.length === 5 && !isSelecting && (
                    <button
                        onClick={handleZipSearch}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-[#d4a5a5] hover:bg-[#c49393] transition-colors ml-2"
                    >
                        <Search className="w-5 h-5 text-white" />
                    </button>
                )}

                {isSelecting ? (
                    <Loader2 className="w-5 h-5 text-zinc-500 animate-spin ml-2" />
                ) : isAddressMode ? (
                    <div className="w-5 h-5 ml-2" /> // Spacer
                ) : null}
            </div>

            {/* Mode indicator */}
            <div className="text-center mt-3">
                <span className="text-xs text-slate-400">
                    {isAddressMode ? 'Address search' : 'ZIP code search'} — tap icon to switch
                </span>
            </div>

            {/* Suggestions Dropdown (Address mode only) */}
            {isAddressMode && status === 'OK' && (
                <ul
                    className="hero-search-suggestions absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{ maxHeight: suggestionsMaxHeight }}
                    tabIndex={-1}
                    role="listbox"
                >
                    {data.map((suggestion, index) => {
                        const {
                            place_id,
                            structured_formatting: { main_text, secondary_text },
                        } = suggestion;
                        const isActive = index === activeIndex;

                        return (
                            <li
                                key={place_id}
                                id={`suggestion-${index}`}
                                role="option"
                                aria-selected={isActive}
                                onClick={handleSelect(suggestion)}
                                className={`flex items-center px-6 py-4 cursor-pointer transition-colors group/item border-b border-slate-100 last:border-b-0 ${isActive ? 'bg-slate-100' : 'hover:bg-slate-50'}`}
                            >
                                <MapPin className={`w-4 h-4 text-[#d4a5a5] mr-4 shrink-0 transition-opacity ${isActive ? 'opacity-100' : 'opacity-50 group-hover/item:opacity-100'}`} />
                                <div className="flex flex-col text-left">
                                    <span className="text-slate-800 font-medium text-base">{main_text}</span>
                                    <span className="text-slate-500 text-sm">{secondary_text}</span>
                                </div>
                                <ArrowRight className={`w-4 h-4 text-slate-400 ml-auto transition-all duration-300 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0'}`} />
                            </li>
                        );
                    })}
                </ul>
            )}

            {/* ZIP code helper text */}
            {!isAddressMode && zipInput.length > 0 && zipInput.length < 5 && (
                <div className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-xl p-4 text-center">
                    <p className="text-sm text-slate-500">
                        Enter 5-digit ZIP code ({5 - zipInput.length} more digits)
                    </p>
                </div>
            )}
        </div>
    );
};

export default LandingHeroSearch;
