/**
 * Saved Locations Hook (formerly Birth Charts Hook)
 * Manages saved location data for authenticated users with localStorage fallback for guests
 *
 * This hook uses a Zustand store for shared state across all components,
 * ensuring that location updates are immediately visible everywhere.
 */

import { useEffect, useCallback } from 'react';
import { useAuth } from './useAuth-context';
import {
  useSavedLocationsStore,
  loadSavedLocations,
  saveSavedLocation,
  updateSavedLocation,
  deleteSavedLocation,
  setDefaultSavedLocation,
  selectSavedLocation,
  type SavedLocation,
  type SavedLocationInput,
} from '@/stores/savedLocationsStore';

// Re-export types for consumers (with both old and new names)
export type { SavedLocation, SavedLocationInput };
export type BirthChart = SavedLocation;
export type BirthChartInput = SavedLocationInput;

export interface UseSavedLocationsReturn {
  // Locations
  locations: SavedLocation[];
  currentLocation: SavedLocation | null;
  loading: boolean;

  // Actions
  loadLocations: () => Promise<void>;
  saveLocation: (data: SavedLocationInput) => Promise<SavedLocation | null>;
  updateLocation: (id: string, data: Partial<SavedLocationInput>) => Promise<void>;
  deleteLocation: (id: string) => Promise<void>;
  selectLocation: (id: string) => void;
  setDefaultLocation: (id: string) => Promise<void>;

  // Guest mode
  isGuest: boolean;
}

// Backwards compatibility type alias
export type UseBirthChartsReturn = UseSavedLocationsReturn & {
  charts: SavedLocation[];
  currentChart: SavedLocation | null;
  loadCharts: () => Promise<void>;
  saveChart: (data: SavedLocationInput) => Promise<SavedLocation | null>;
  updateChart: (id: string, data: Partial<SavedLocationInput>) => Promise<void>;
  deleteChart: (id: string) => Promise<void>;
  selectChart: (id: string) => void;
  setDefaultChart: (id: string) => Promise<void>;
};

export function useSavedLocations(): UseSavedLocationsReturn {
  const { user } = useAuth();
  const userId = user?.id || null;
  const isGuest = !user;

  // Get state from Zustand store
  const locations = useSavedLocationsStore((state) => state.locations);
  const currentLocation = useSavedLocationsStore((state) => state.currentLocation);
  const loading = useSavedLocationsStore((state) => state.loading);

  // Load locations on mount and when user changes
  useEffect(() => {
    loadSavedLocations(userId);
  }, [userId]);

  // Wrapped actions that pass userId
  const loadLocations = useCallback(async () => {
    await loadSavedLocations(userId);
  }, [userId]);

  const saveLocation = useCallback(async (data: SavedLocationInput): Promise<SavedLocation | null> => {
    return saveSavedLocation(userId, data);
  }, [userId]);

  const updateLocation = useCallback(async (id: string, data: Partial<SavedLocationInput>): Promise<void> => {
    await updateSavedLocation(userId, id, data);
  }, [userId]);

  const deleteLocation = useCallback(async (id: string): Promise<void> => {
    await deleteSavedLocation(userId, id);
  }, [userId]);

  const setDefaultLocation = useCallback(async (id: string): Promise<void> => {
    await setDefaultSavedLocation(userId, id);
  }, [userId]);

  const selectLocation = useCallback((id: string): void => {
    selectSavedLocation(id);
  }, []);

  return {
    locations,
    currentLocation,
    loading,
    loadLocations,
    saveLocation,
    updateLocation,
    deleteLocation,
    selectLocation,
    setDefaultLocation,
    isGuest,
  };
}

// Backwards compatibility alias
export function useBirthCharts(): UseBirthChartsReturn {
  const result = useSavedLocations();

  return {
    ...result,
    // Alias properties
    charts: result.locations,
    currentChart: result.currentLocation,
    // Alias methods
    loadCharts: result.loadLocations,
    saveChart: result.saveLocation,
    updateChart: result.updateLocation,
    deleteChart: result.deleteLocation,
    selectChart: result.selectLocation,
    setDefaultChart: result.setDefaultLocation,
  };
}
