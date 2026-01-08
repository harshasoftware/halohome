/**
 * Favorite Cities Hook
 * Manages favorite cities for authenticated users with localStorage fallback for guests
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth-context';

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

export interface UseFavoriteCitiesReturn {
  favorites: FavoriteCity[];
  loading: boolean;

  // Actions
  loadFavorites: () => Promise<void>;
  addFavorite: (data: FavoriteCityInput) => Promise<FavoriteCity | null>;
  removeFavorite: (id: string) => Promise<void>;
  updateFavoriteNotes: (id: string, notes: string) => Promise<void>;

  // Helpers
  isFavorite: (lat: number, lng: number) => boolean;
  getFavoriteByLocation: (lat: number, lng: number) => FavoriteCity | undefined;
  toggleFavorite: (data: FavoriteCityInput) => Promise<void>;

  // Guest mode
  isGuest: boolean;
}

const GUEST_FAVORITES_KEY = 'guest_favorite_cities';

// Helper to round coordinates for comparison (roughly 100m precision)
const roundCoord = (coord: number): number => Math.round(coord * 10000) / 10000;

export function useFavoriteCities(): UseFavoriteCitiesReturn {
  const { user } = useAuth();
  const [favorites, setFavorites] = useState<FavoriteCity[]>([]);
  const [loading, setLoading] = useState(false);

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
      const { data, error } = await supabase
        .from('favorite_cities')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

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
  const addFavorite = useCallback(async (data: FavoriteCityInput): Promise<FavoriteCity | null> => {
    // Check if already favorited
    if (isFavorite(data.latitude, data.longitude)) {
      return getFavoriteByLocation(data.latitude, data.longitude) || null;
    }

    if (isGuest) {
      const guestFavorite: FavoriteCity = {
        id: `guest-fav-${Date.now()}`,
        user_id: 'guest',
        latitude: data.latitude,
        longitude: data.longitude,
        city_name: data.city_name,
        country: data.country || null,
        notes: data.notes || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      saveGuestFavorites([guestFavorite, ...favorites]);
      return guestFavorite;
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

      setFavorites(prev => [newFavorite, ...prev]);
      return newFavorite;
    } catch (error) {
      console.error('Failed to add favorite city:', error);
      return null;
    }
  }, [user, isGuest, favorites, isFavorite, getFavoriteByLocation, saveGuestFavorites]);

  // Remove a favorite
  const removeFavorite = useCallback(async (id: string) => {
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

      setFavorites(prev => prev.filter(f => f.id !== id));
    } catch (error) {
      console.error('Failed to remove favorite city:', error);
    }
  }, [isGuest, favorites, saveGuestFavorites]);

  // Update favorite notes
  const updateFavoriteNotes = useCallback(async (id: string, notes: string) => {
    if (isGuest) {
      const updated = favorites.map(f =>
        f.id === id ? { ...f, notes, updated_at: new Date().toISOString() } : f
      );
      saveGuestFavorites(updated);
      return;
    }

    try {
      const { error } = await supabase
        .from('favorite_cities')
        .update({ notes, updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;

      setFavorites(prev =>
        prev.map(f => f.id === id ? { ...f, notes, updated_at: new Date().toISOString() } : f)
      );
    } catch (error) {
      console.error('Failed to update favorite notes:', error);
    }
  }, [isGuest, favorites, saveGuestFavorites]);

  // Toggle favorite (add or remove)
  const toggleFavorite = useCallback(async (data: FavoriteCityInput) => {
    const existing = getFavoriteByLocation(data.latitude, data.longitude);
    if (existing) {
      await removeFavorite(existing.id);
    } else {
      await addFavorite(data);
    }
  }, [getFavoriteByLocation, removeFavorite, addFavorite]);

  return {
    favorites,
    loading,
    loadFavorites,
    addFavorite,
    removeFavorite,
    updateFavoriteNotes,
    isFavorite,
    getFavoriteByLocation,
    toggleFavorite,
    isGuest,
  };
}
