import React, { useState, useCallback, useEffect, useRef } from 'react';
import usePlacesAutocomplete, {
    getGeocode,
    getLatLng,
} from '@/hooks/usePlacesAutocompleteNew';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Loader2, ArrowRight } from 'lucide-react';
import '../Landing.css';

interface LandingHeroSearchProps {
    onFocusChange?: (isFocused: boolean) => void;
}

const LandingHeroSearch = ({ onFocusChange }: LandingHeroSearchProps) => {
    const navigate = useNavigate();
    const [isSelecting, setIsSelecting] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [keyboardHeight, setKeyboardHeight] = useState(0);
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
            types: ['(cities)'], // Focus on cities for astrocartography
        },
        debounce: 300,
    });

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        setValue(e.target.value);
        setActiveIndex(-1);
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
                navigate(`/guest?lat=${coords.lat}&lng=${coords.lng}&place=${encodeURIComponent(description)}&action=birth`);
            })
            .catch((error) => {
                console.log('Error: ', error);
                setIsSelecting(false);
            });
    }, [setValue, clearSuggestions, navigate]);

    const handleSelect = (suggestion: { description: string }) => () => {
        selectSuggestion(suggestion.description);
    };

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
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
    }, [status, data, activeIndex, selectSuggestion, clearSuggestions]);

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
            <div className="relative flex items-center bg-white/10 backdrop-blur-md border border-white/20 rounded-full px-6 py-4 shadow-2xl transition-all duration-300 group-hover:bg-white/15 group-hover:border-white/30 group-focus-within:bg-white/20 group-focus-within:border-purple-400/50 group-focus-within:ring-2 group-focus-within:ring-purple-500/20">
                <Search className="w-5 h-5 text-purple-300 mr-4 shrink-0" />
                <input
                    type="text"
                    value={value}
                    onChange={handleInput}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    disabled={!ready || isSelecting}
                    placeholder="Where were you born?"
                    className="w-full bg-transparent border-none outline-none text-white placeholder-purple-200/50 text-lg font-medium"
                    role="combobox"
                    aria-expanded={status === 'OK'}
                    aria-autocomplete="list"
                    aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
                />
                {isSelecting ? (
                    <Loader2 className="w-5 h-5 text-purple-300 animate-spin ml-2" />
                ) : (
                    <div className="w-5 h-5 ml-2" /> // Spacer
                )}
            </div>

            {/* Suggestions Dropdown */}
            {status === 'OK' && (
                <ul
                    className="hero-search-suggestions absolute z-50 w-full mt-2 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
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
                                className={`flex items-center px-6 py-4 cursor-pointer transition-colors group/item ${isActive ? 'bg-white/15' : 'hover:bg-white/10'}`}
                            >
                                <MapPin className={`w-4 h-4 text-purple-400 mr-4 shrink-0 transition-opacity ${isActive ? 'opacity-100' : 'opacity-50 group-hover/item:opacity-100'}`} />
                                <div className="flex flex-col text-left">
                                    <span className="text-white font-medium text-base">{main_text}</span>
                                    <span className="text-zinc-400 text-sm">{secondary_text}</span>
                                </div>
                                <ArrowRight className={`w-4 h-4 text-white/30 ml-auto transition-all duration-300 ${isActive ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 group-hover/item:opacity-100 group-hover/item:translate-x-0'}`} />
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
};

export default LandingHeroSearch;

