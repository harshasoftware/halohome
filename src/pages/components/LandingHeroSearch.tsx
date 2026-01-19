import React, { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
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
    const [inputText, setInputText] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputBarRef = useRef<HTMLDivElement>(null);
    const [overlayRect, setOverlayRect] = useState<{ left: number; top: number; width: number } | null>(null);
    const overlayRectRef = useRef<{ left: number; top: number; width: number } | null>(null);

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

    // ZIP detection should ONLY trigger when the user is typing digits-only.
    // This prevents addresses like "2010 west end avenue" from being treated as a ZIP.
    const isZipDigitsOnlyUpTo5 = (text: string) => /^\d{0,5}$/.test(text);
    const isZipExactTrim = (text: string) => /^\s*\d{5}\s*$/.test(text);

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        setActiveIndex(-1);

        // If typing a ZIP, keep numeric and suppress Places suggestions.
        if (isZipDigitsOnlyUpTo5(raw)) {
            // raw is already digits-only here
            setInputText(raw);
            clearSuggestions();
            setValue('', false);
            return;
        }

        setInputText(raw);
        setValue(raw);
    };

    const navigateToAppSearch = useCallback((args: {
        lat: number;
        lng: number;
        place: string;
        kind: 'zip' | 'property' | 'area';
        bounds?: { north: number; south: number; east: number; west: number };
    }) => {
        const params = new URLSearchParams();
        params.set('action', 'search');
        params.set('lat', String(args.lat));
        params.set('lng', String(args.lng));
        params.set('place', args.place);
        params.set('kind', args.kind);
        if (args.bounds) {
            params.set('north', String(args.bounds.north));
            params.set('south', String(args.bounds.south));
            params.set('east', String(args.bounds.east));
            params.set('west', String(args.bounds.west));
        }
        navigate(`/app?${params.toString()}`);
    }, [navigate]);

    const selectSuggestion = useCallback((description: string) => {
        setInputText(description);
        setValue(description, false);
        clearSuggestions();
        setIsSelecting(true);
        setActiveIndex(-1);

        getGeocode({ address: description })
            .then((results) => {
                if (!results || results.length === 0) {
                    throw new Error('No results found');
                }
                return results[0];
            })
            .then(async (first) => {
                const coords = await getLatLng(first);
                if (!coords || typeof coords.lat !== 'number' || typeof coords.lng !== 'number') {
                    throw new Error('Invalid coordinates');
                }

                const types = (first as any)?.types as string[] | undefined;
                const isPostalCode = Array.isArray(types) && types.includes('postal_code');

                if (isPostalCode) {
                    const extractedZipFromText = description.match(/\b\d{5}\b/)?.[0] ?? null;
                    const extractedZipFromComponents =
                        (first as any)?.address_components?.find((c: any) =>
                            Array.isArray(c?.types) && c.types.includes('postal_code')
                        )?.short_name ?? null;
                    const zip = String(extractedZipFromText || extractedZipFromComponents || '').trim();

                    let bounds: { north: number; south: number; east: number; west: number } | undefined;
                    const geometry = (first as any)?.geometry;
                    if (geometry?.viewport) {
                        const viewport = geometry.viewport;
                        bounds = {
                            north: viewport.getNorthEast().lat(),
                            south: viewport.getSouthWest().lat(),
                            east: viewport.getNorthEast().lng(),
                            west: viewport.getSouthWest().lng(),
                        };
                    }

                    if (zip.length === 5) {
                        setInputText(zip);
                        navigateToAppSearch({ lat: coords.lat, lng: coords.lng, place: zip, kind: 'zip', bounds });
                        return;
                    }
                }

                const isProperty =
                    Array.isArray(types) &&
                    types.some((t) =>
                        ['street_address', 'premise', 'subpremise', 'establishment', 'point_of_interest'].includes(t)
                    );
                const kind: 'property' | 'area' = isProperty ? 'property' : 'area';
                navigateToAppSearch({ lat: coords.lat, lng: coords.lng, place: description, kind });
            })
            .catch((error) => {
                console.log('Error: ', error);
                setIsSelecting(false);
            });
    }, [setValue, clearSuggestions, navigateToAppSearch]);

    const handleZipSearch = useCallback(async () => {
        const zip = inputText.trim();
        if (!isZipExactTrim(zip)) return;

        setIsSelecting(true);

        try {
            const results = await getGeocode({ address: `${zip}, USA` });
            const first = results[0];
            const { lat, lng } = await getLatLng(first);

            let bounds: { north: number; south: number; east: number; west: number } | undefined;
            const geometry = (first as any)?.geometry;
            if (geometry?.viewport) {
                const viewport = geometry.viewport;
                bounds = {
                    north: viewport.getNorthEast().lat(),
                    south: viewport.getSouthWest().lat(),
                    east: viewport.getNorthEast().lng(),
                    west: viewport.getSouthWest().lng(),
                };
            }

            navigateToAppSearch({ lat, lng, place: zip, kind: 'zip', bounds });
        } catch (error) {
            console.error('ZIP code geocoding error:', error);
            setIsSelecting(false);
        }
    }, [inputText, navigateToAppSearch]);

    const handleSelect = (suggestion: { description: string }) => () => {
        selectSuggestion(suggestion.description);
    };

    const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
        // ZIP enter
        if (e.key === 'Enter' && isZipExactTrim(inputText)) {
            e.preventDefault();
            handleZipSearch();
            return;
        }

        // Address mode keyboard navigation
        if (/^\d{1,5}$/.test(inputText)) return;
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
    }, [inputText, handleZipSearch, status, data, activeIndex, selectSuggestion, clearSuggestions]);

    const isZipMode = /^\d{1,5}$/.test(inputText);
    const placeholder = 'Enter address or ZIP…';
    const currentValue = inputText;

    // Calculate max height for suggestions based on available space above keyboard
    const suggestionsMaxHeight = keyboardHeight > 0
        ? `calc(100dvh - ${keyboardHeight}px - 120px)` // Leave room for search bar + some padding
        : '300px';

    // Keep a fixed-position overlay aligned to the input bar.
    useEffect(() => {
        if (!isFocused) {
            setOverlayRect(null);
            overlayRectRef.current = null;
            return;
        }

        const update = () => {
            const el = inputBarRef.current;
            if (!el) return;
            const rect = el.getBoundingClientRect();
            const next = {
                left: rect.left,
                top: rect.bottom + 8, // gap below input
                width: rect.width,
            };

            const prev = overlayRectRef.current;
            const changed =
                !prev ||
                Math.abs(prev.left - next.left) > 0.5 ||
                Math.abs(prev.top - next.top) > 0.5 ||
                Math.abs(prev.width - next.width) > 0.5;

            if (changed) {
                overlayRectRef.current = next;
                setOverlayRect(next);
            }
        };

        update();
        window.addEventListener('resize', update);
        window.addEventListener('scroll', update, true);
        window.visualViewport?.addEventListener('resize', update);
        window.visualViewport?.addEventListener('scroll', update);

        // Also track smooth layout shifts (e.g. hero transitions) that don't emit scroll/resize.
        let rafId: number | null = null;
        const tick = () => {
            update();
            rafId = window.requestAnimationFrame(tick);
        };
        rafId = window.requestAnimationFrame(tick);

        return () => {
            window.removeEventListener('resize', update);
            window.removeEventListener('scroll', update, true);
            window.visualViewport?.removeEventListener('resize', update);
            window.visualViewport?.removeEventListener('scroll', update);
            if (rafId !== null) {
                window.cancelAnimationFrame(rafId);
            }
        };
    }, [isFocused]);

    return (
        <div
            ref={containerRef}
            className={`relative w-full max-w-lg mx-auto mt-8 group ${isFocused ? 'z-[9999]' : 'z-10'}`}
            style={keyboardHeight > 0 ? {
                // When keyboard is open, ensure container stays in visible area
                maxHeight: `calc(100dvh - ${keyboardHeight}px - 32px)`,
            } : undefined}
        >
            {/* Main Input Container */}
            <div
                ref={inputBarRef}
                className="relative flex items-center bg-white border-2 border-zinc-300 rounded-full px-4 py-3 shadow-md transition-all duration-300 group-hover:border-zinc-400 group-hover:shadow-lg group-focus-within:border-zinc-900 group-focus-within:shadow-xl"
            >
                <div className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 text-[#d4a5a5]">
                    <MapPin className="w-5 h-5" />
                </div>

                <input
                    type="text"
                    value={currentValue}
                    onChange={handleInput}
                    onFocus={handleFocus}
                    onBlur={handleBlur}
                    onKeyDown={handleKeyDown}
                    disabled={(!ready && !isZipMode) || isSelecting}
                    placeholder={placeholder}
                    className="w-full bg-transparent border-none outline-none text-zinc-900 placeholder-zinc-400 text-lg font-medium"
                    role="combobox"
                    aria-expanded={!isZipMode && status === 'OK'}
                    aria-autocomplete="list"
                    aria-activedescendant={activeIndex >= 0 ? `suggestion-${activeIndex}` : undefined}
                    inputMode={isZipMode ? 'numeric' : 'text'}
                />

                {/* Search button for ZIP */}
                {!isSelecting && isZipExactTrim(inputText) && (
                    <button
                        onClick={handleZipSearch}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-[#d4a5a5] hover:bg-[#c49393] transition-colors ml-2"
                    >
                        <Search className="w-5 h-5 text-white" />
                    </button>
                )}

                {isSelecting ? (
                    <Loader2 className="w-5 h-5 text-zinc-500 animate-spin ml-2" />
                ) : !isZipMode ? (
                    <div className="w-5 h-5 ml-2" /> // Spacer
                ) : null}
            </div>

            {/* Suggestions + ZIP helper rendered in a portal so they aren't clipped/stacked under other sections */}
            {overlayRect && !isSelecting && !isZipMode && status === 'OK' && data.length > 0 &&
                createPortal(
                    <ul
                        className="hero-search-suggestions fixed z-[99999] bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden overflow-y-auto animate-in fade-in slide-in-from-top-2 duration-200"
                        style={{ left: overlayRect.left, top: overlayRect.top, width: overlayRect.width, maxHeight: suggestionsMaxHeight }}
                        tabIndex={-1}
                        role="listbox"
                        onMouseDown={(e) => e.preventDefault()} // keep input focused so blur doesn't close dropdown before click
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
                    </ul>,
                    document.body
                )}

            {overlayRect && !isSelecting && isZipMode && inputText.length > 0 && inputText.length < 5 &&
                createPortal(
                    <div
                        className="hero-search-suggestions fixed z-[99999] bg-white border border-slate-200 rounded-2xl shadow-xl p-4 text-center"
                        style={{ left: overlayRect.left, top: overlayRect.top, width: overlayRect.width }}
                        onMouseDown={(e) => e.preventDefault()}
                    >
                        <p className="text-sm text-slate-500">
                            Enter 5-digit ZIP code ({5 - inputText.length} more digits)
                        </p>
                    </div>,
                    document.body
                )}
        </div>
    );
};

export default LandingHeroSearch;
