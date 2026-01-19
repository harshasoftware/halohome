/**
 * Favorite Cities Hook
 * Manages favorite cities for authenticated users with localStorage fallback for guests
 * Uses Zustand store for shared state across all components
 */

import { useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth-context';
import { useFavoritesStore } from '@/stores/favoritesStore';

export interface FavoriteCity {
  id: string;
  user_id: string;
  latitude: number;
  longitude: number;
  city_name: string;
  country: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface FavoriteCityInput {
  latitude: number;
  longitude: number;
  city_name: string;
  country?: string | null;
  notes?: string | null;
}

export type FavoriteResult =
  | { success: true; favorite: FavoriteCity }
  | { success: false; requiresAuth: true }
  | { success: false; requiresAuth: false; error?: string };

export interface UseFavoriteCitiesReturn {
  favorites: FavoriteCity[];
  loading: boolean;

  // Actions
  loadFavorites: () => Promise<void>;
  addFavorite: (data: FavoriteCityInput) => Promise<FavoriteResult>;
  removeFavorite: (id: string) => Promise<void>;
  removeMultipleFavorites: (ids: string[]) => Promise<void>;
  updateFavoriteNotes: (id: string, notes: string) => Promise<void>;

  // Helpers
  isFavorite: (lat: number, lng: number) => boolean;
  getFavoriteByLocation: (lat: number, lng: number) => FavoriteCity | undefined;
  toggleFavorite: (data: FavoriteCityInput) => Promise<FavoriteResult>;

  // Guest mode
  isGuest: boolean;
}

const GUEST_FAVORITES_KEY = 'guest_favorite_cities';

// Helper to round coordinates for comparison (roughly 100m precision)
const roundCoord = (coord: number): number => Math.round(coord * 10000) / 10000;

export function useFavoriteCities(): UseFavoriteCitiesReturn {
  const { user } = useAuth();

  // Use Zustand store for shared state across all components
  const favorites = useFavoritesStore((state) => state.favorites);
  const loading = useFavoritesStore((state) => state.loading);
  const setFavorites = useFavoritesStore((state) => state.setFavorites);
  const setLoading = useFavoritesStore((state) => state.setLoading);
  const storAddFavorite = useFavoritesStore((state) => state.addFavorite);
  const storeRemoveFavorite = useFavoritesStore((state) => state.removeFavorite);
  const storeRemoveMultipleFavorites = useFavoritesStore((state) => state.removeMultipleFavorites);
  const storeUpdateFavorite = useFavoritesStore((state) => state.updateFavorite);

  const isGuest = !user;

  // Load guest favorites from localStorage
  const loadGuestFavorites = useCallback(() => {
    try {
      const stored = localStorage.getItem(GUEST_FAVORITES_KEY);
      if (stored) {
        const parsedFavorites = JSON.parse(stored) as FavoriteCity[];
        setFavorites(parsedFavorites);
      }
    } catch (error) {
      console.error('Failed to load guest favorites:', error);
    }
  }, []);

  // Save guest favorites to localStorage
  const saveGuestFavorites = useCallback((newFavorites: FavoriteCity[]) => {
    try {
      localStorage.setItem(GUEST_FAVORITES_KEY, JSON.stringify(newFavorites));
      setFavorites(newFavorites);
    } catch (error) {
      console.error('Failed to save guest favorites:', error);
    }
  }, []);

  // Load user's favorites from Supabase
  const loadFavorites = useCallback(async () => {
    if (isGuest) {
      loadGuestFavorites();
      return;
    }

    setLoading(true);
    try {
      let data: FavoriteCity[] | null = null;
      let lastError: any = null;
      
      // Retry up to 3 times with exponential backoff for network errors
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await supabase
            .from('favorite_cities')
            .select('*')
            .eq('user_id', user!.id)
            .order('created_at', { ascending: false });

          if (result.error) {
            // Don't retry on auth/permission errors (4xx), only on network errors (5xx or connection errors)
            const isNetworkError = result.error.message.includes('Failed to fetch') || 
                                  result.error.message.includes('ERR_CONNECTION') ||
                                  result.error.message.includes('network');
            
            if (!isNetworkError || attempt === 2) {
              throw result.error;
            }
            
            lastError = result.error;
            // Wait before retry: 1s, 2s, 4s
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
            continue;
          }

          data = result.data;
          break; // Success, exit retry loop
        } catch (error: any) {
          lastError = error;
          
          // Check if it's a network error that should be retried
          const isNetworkError = error.message?.includes('Failed to fetch') || 
                                error.message?.includes('ERR_CONNECTION') ||
                                error.message?.includes('network');
          
          if (!isNetworkError || attempt === 2) {
            throw error;
          }
          
          // Wait before retry: 1s, 2s, 4s
          await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
        }
      }

      if (data === null && lastError) {
        throw lastError;
      }

      setFavorites(data || []);
    } catch (error) {
      console.error('Failed to load favorite cities:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isGuest, loadGuestFavorites]);

  // Load favorites on mount and when user changes
  useEffect(() => {
    loadFavorites();
  }, [user?.id]);

  // Check if a location is favorited
  const isFavorite = useCallback((lat: number, lng: number): boolean => {
    const roundedLat = roundCoord(lat);
    const roundedLng = roundCoord(lng);
    return favorites.some(
      f => roundCoord(f.latitude) === roundedLat && roundCoord(f.longitude) === roundedLng
    );
  }, [favorites]);

  // Get favorite by location
  const getFavoriteByLocation = useCallback((lat: number, lng: number): FavoriteCity | undefined => {
    const roundedLat = roundCoord(lat);
    const roundedLng = roundCoord(lng);
    return favorites.find(
      f => roundCoord(f.latitude) === roundedLat && roundCoord(f.longitude) === roundedLng
    );
  }, [favorites]);

  // Add a new favorite
  const addFavorite = useCallback(async (data: FavoriteCityInput): Promise<FavoriteResult> => {
    // Check if already favorited
    if (isFavorite(data.latitude, data.longitude)) {
      const existing = getFavoriteByLocation(data.latitude, data.longitude);
      if (existing) {
        return { success: true, favorite: existing };
      }
    }

    // Guest users must sign in to save favorites
    if (isGuest) {
      return { success: false, requiresAuth: true };
    }

    try {
      const { data: newFavorite, error } = await supabase
        .from('favorite_cities')
        .insert({
          user_id: user!.id,
          latitude: data.latitude,
          longitude: data.longitude,
          city_name: data.city_name,
          country: data.country,
          notes: data.notes,
        })
        .select()
        .single();

      if (error) throw error;

      storAddFavorite(newFavorite);
      return { success: true, favorite: newFavorite };
    } catch (error) {
      console.error('Failed to add favorite city:', error);
      return { success: false, requiresAuth: false, error: 'Failed to save favorite' };
    }
  }, [user, isGuest, isFavorite, getFavoriteByLocation, storAddFavorite]);

  // Remove a favorite
  const removeFavorite = useCallback(async (id: string) => {
    // Optimistically update store first
    storeRemoveFavorite(id);

    if (isGuest) {
      const updated = favorites.filter(f => f.id !== id);
      saveGuestFavorites(updated);
      return;
    }

    try {
      const { error } = await supabase
        .from('favorite_cities')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to remove favorite city:', error);
      // Reload on error to restore correct state
      loadFavorites();
    }
  }, [isGuest, favorites, saveGuestFavorites, storeRemoveFavorite, loadFavorites]);

  // Remove multiple favorites at once
  const removeMultipleFavorites = useCallback(async (ids: string[]) => {
    if (ids.length === 0) return;

    // Optimistically update store first
    storeRemoveMultipleFavorites(ids);

    if (isGuest) {
      // For guests, filter out all matching IDs and save to localStorage
      const idsSet = new Set(ids);
      const updated = favorites.filter(f => !idsSet.has(f.id));
      saveGuestFavorites(updated);
      return;
    }

    try {
      // For authenticated users, use Supabase's .in() filter for batch delete
      const { error } = await supabase
        .from('favorite_cities')
        .delete()
        .in('id', ids);

      if (error) throw error;
    } catch (error) {
      console.error('Failed to remove multiple favorite cities:', error);
      // Revert optimistic update on error by reloading favorites
      loadFavorites();
    }
  }, [isGuest, favorites, saveGuestFavorites, storeRemoveMultipleFavorites, loadFavorites]);

  // Update favorite notes
  const updateFavoriteNotes = useCallback(async (id: string, notes: string) => {
    const updated_at = new Date().toISOString();

    // Optimistically update store first
    storeUpdateFavorite(id, { notes, updated_at });

    if (isGuest) {
      const updated = favorites.map(f =>
        f.id === id ? { ...f, notes, updated_at } : f
      );
      saveGuestFavorites(updated);
      return;
    }

    const { error } = await supabase
      .from('favorite_cities')
      .update({ notes, updated_at })
      .eq('id', id);

    if (error) {
      // Reload on error to restore correct state
      loadFavorites();
      // Re-throw to allow calling code to handle the error
      throw new Error(`Failed to save notes: ${error.message}`);
    }
  }, [isGuest, favorites, saveGuestFavorites, storeUpdateFavorite, loadFavorites]);

  // Toggle favorite (add or remove)
  const toggleFavorite = useCallback(async (data: FavoriteCityInput): Promise<FavoriteResult> => {
    const existing = getFavoriteByLocation(data.latitude, data.longitude);
    if (existing) {
      await removeFavorite(existing.id);
      return { success: true, favorite: existing };
    } else {
      return await addFavorite(data);
    }
  }, [getFavoriteByLocation, removeFavorite, addFavorite]);

  return {
    favorites,
    loading,
    loadFavorites,
    addFavorite,
    removeFavorite,
    removeMultipleFavorites,
    updateFavoriteNotes,
    isFavorite,
    getFavoriteByLocation,
    toggleFavorite,
    isGuest,
  };
}
