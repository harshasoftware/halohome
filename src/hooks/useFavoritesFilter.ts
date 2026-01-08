/**
 * useFavoritesFilter Hook
 * Filters favorite cities by search query with debouncing
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import type { FavoriteCity } from './useFavoriteCities';

const DEBOUNCE_MS = 150;

interface UseFavoritesFilterOptions {
  debounce?: number;
}

interface UseFavoritesFilterReturn {
  filteredFavorites: FavoriteCity[];
  debouncedQuery: string;
}

/**
 * Filters favorites by city_name and country using case-insensitive matching.
 * Includes debouncing for performance.
 *
 * @param favorites - Array of favorite cities to filter
 * @param query - Search query string
 * @param options - Optional configuration
 * @returns Object with filtered favorites and debounced query
 */
export function useFavoritesFilter(
  favorites: FavoriteCity[],
  query: string,
  options?: UseFavoritesFilterOptions
): UseFavoritesFilterReturn {
  const debounceMs = options?.debounce ?? DEBOUNCE_MS;
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce the query
  useEffect(() => {
    // Clear any pending debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      setDebouncedQuery(query);
    }, debounceMs);

    // Cleanup on unmount or when query changes
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [query, debounceMs]);

  // Filter favorites based on debounced query
  const filteredFavorites = useMemo(() => {
    const trimmedQuery = debouncedQuery.trim().toLowerCase();

    // Return all favorites if query is empty
    if (!trimmedQuery) {
      return favorites;
    }

    return favorites.filter((favorite) => {
      const cityName = favorite.city_name.toLowerCase();
      const country = favorite.country?.toLowerCase() ?? '';

      return cityName.includes(trimmedQuery) || country.includes(trimmedQuery);
    });
  }, [favorites, debouncedQuery]);

  return {
    filteredFavorites,
    debouncedQuery,
  };
}

export default useFavoritesFilter;
