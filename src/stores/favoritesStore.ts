/**
 * Favorites Store
 * Zustand store for managing favorite cities with shared state across all components
 */

import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type { FavoriteCity } from '@/hooks/useFavoriteCities';

interface FavoritesState {
  favorites: FavoriteCity[];
  loading: boolean;

  // Actions
  setFavorites: (favorites: FavoriteCity[]) => void;
  setLoading: (loading: boolean) => void;
  addFavorite: (favorite: FavoriteCity) => void;
  removeFavorite: (id: string) => void;
  removeMultipleFavorites: (ids: string[]) => void;
  updateFavorite: (id: string, updates: Partial<FavoriteCity>) => void;
}

export const useFavoritesStore = create<FavoritesState>()(
  immer((set) => ({
    favorites: [],
    loading: false,

    setFavorites: (favorites) => set((state) => {
      state.favorites = favorites;
    }),

    setLoading: (loading) => set((state) => {
      state.loading = loading;
    }),

    addFavorite: (favorite) => set((state) => {
      state.favorites.unshift(favorite);
    }),

    removeFavorite: (id) => set((state) => {
      state.favorites = state.favorites.filter(f => f.id !== id);
    }),

    removeMultipleFavorites: (ids) => set((state) => {
      const idsSet = new Set(ids);
      state.favorites = state.favorites.filter(f => !idsSet.has(f.id));
    }),

    updateFavorite: (id, updates) => set((state) => {
      const index = state.favorites.findIndex(f => f.id === id);
      if (index !== -1) {
        state.favorites[index] = { ...state.favorites[index], ...updates };
      }
    }),
  }))
);

// Selectors
export const useFavorites = () => useFavoritesStore((state) => state.favorites);
export const useFavoritesLoading = () => useFavoritesStore((state) => state.loading);
