/**
 * Saved Locations Store - Zustand store for managing saved locations
 *
 * This store provides shared state for saved locations across all components,
 * solving the issue where multiple useSavedLocations() hook instances had
 * separate local state.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { supabase } from '@/integrations/supabase/client';

export interface SavedLocation {
  id: string;
  user_id: string;
  name: string;
  birth_date: string;
  birth_time: string;
  latitude: number;
  longitude: number;
  city_name: string | null;
  timezone: string | null;
  is_default: boolean;
  is_favorite?: boolean;
  created_at: string;
  updated_at: string;
}

export interface SavedLocationInput {
  name?: string;
  birth_date: string;
  birth_time: string;
  latitude: number;
  longitude: number;
  city_name?: string | null;
  timezone?: string | null;
  is_default?: boolean;
  is_favorite?: boolean;
}

// Keep old type names as aliases for backwards compatibility
export type BirthChart = SavedLocation;
export type BirthChartInput = SavedLocationInput;

const GUEST_LOCATION_KEY = 'guest_saved_location';

interface SavedLocationsState {
  // State
  locations: SavedLocation[];
  currentLocation: SavedLocation | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  setLocations: (locations: SavedLocation[]) => void;
  setCurrentLocation: (location: SavedLocation | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  addLocation: (location: SavedLocation) => void;
  updateLocationInStore: (id: string, updates: Partial<SavedLocation>) => void;
  removeLocation: (id: string) => void;
  reset: () => void;
}

const initialState = {
  locations: [] as SavedLocation[],
  currentLocation: null as SavedLocation | null,
  loading: false,
  initialized: false,
};

export const useSavedLocationsStore = create<SavedLocationsState>()(
  devtools(
    immer((set) => ({
      ...initialState,

      setLocations: (locations) => set((state) => {
        state.locations = locations;
      }),

      setCurrentLocation: (location) => set((state) => {
        state.currentLocation = location;
      }),

      setLoading: (loading) => set((state) => {
        state.loading = loading;
      }),

      setInitialized: (initialized) => set((state) => {
        state.initialized = initialized;
      }),

      addLocation: (location) => set((state) => {
        // Add to beginning of array (most recent first)
        state.locations = [location, ...state.locations];
        state.currentLocation = location;
      }),

      updateLocationInStore: (id, updates) => set((state) => {
        state.locations = state.locations.map(loc =>
          loc.id === id ? { ...loc, ...updates, updated_at: new Date().toISOString() } : loc
        );
        if (state.currentLocation?.id === id) {
          state.currentLocation = { ...state.currentLocation, ...updates };
        }
      }),

      removeLocation: (id) => set((state) => {
        state.locations = state.locations.filter(loc => loc.id !== id);
        if (state.currentLocation?.id === id) {
          state.currentLocation = state.locations[0] || null;
        }
      }),

      reset: () => set(initialState),
    })),
    { name: 'saved-locations-store' }
  )
);

// Backwards compatibility alias
export const useBirthChartsStore = useSavedLocationsStore;

// === Async Actions (outside store for cleaner API) ===

/**
 * Load locations from Supabase or localStorage (for guests)
 */
export async function loadSavedLocations(userId: string | null): Promise<void> {
  const store = useSavedLocationsStore.getState();

  store.setLoading(true);

  try {
    if (!userId) {
      // Guest mode - load from localStorage
      const stored = localStorage.getItem(GUEST_LOCATION_KEY);
      if (stored) {
        const location = JSON.parse(stored) as SavedLocation;
        store.setLocations([location]);
        store.setCurrentLocation(location);
      } else {
        store.setLocations([]);
        store.setCurrentLocation(null);
      }
    } else {
      // Authenticated - load from Supabase with retry logic for network errors
      let data: SavedLocation[] | null = null;
      let lastError: any = null;
      
      // Retry up to 3 times with exponential backoff for network errors
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          const result = await supabase
            .from('saved_locations')
            .select('*')
            .eq('user_id', userId)
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

      store.setLocations(data || []);

      // Set current location to default or first (only if not already set)
      const currentLocation = store.currentLocation;
      if (!currentLocation || !data?.find(loc => loc.id === currentLocation.id)) {
        const defaultLocation = data?.find(loc => loc.is_default) || data?.[0];
        store.setCurrentLocation(defaultLocation || null);
      }
    }

    store.setInitialized(true);
  } catch (error) {
    console.error('Failed to load saved locations:', error);
  } finally {
    store.setLoading(false);
  }
}

// Backwards compatibility alias
export const loadBirthCharts = loadSavedLocations;

/**
 * Save a new location
 */
export async function saveSavedLocation(
  userId: string | null,
  data: SavedLocationInput
): Promise<SavedLocation | null> {
  const store = useSavedLocationsStore.getState();

  if (!userId) {
    // Guest mode - save to localStorage
    const guestLocation: SavedLocation = {
      id: `guest-${Date.now()}`,
      user_id: 'guest',
      name: data.name || 'My Location',
      birth_date: data.birth_date,
      birth_time: data.birth_time,
      latitude: data.latitude,
      longitude: data.longitude,
      city_name: data.city_name || null,
      timezone: data.timezone || null,
      is_default: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    localStorage.setItem(GUEST_LOCATION_KEY, JSON.stringify(guestLocation));
    store.addLocation(guestLocation);
    return guestLocation;
  }

  try {
    const isFirstLocation = store.locations.length === 0;
    const { data: newLocation, error } = await supabase
      .from('saved_locations')
      .insert({
        user_id: userId,
        name: data.name || 'My Location',
        birth_date: data.birth_date,
        birth_time: data.birth_time,
        latitude: data.latitude,
        longitude: data.longitude,
        city_name: data.city_name,
        timezone: data.timezone,
        is_default: isFirstLocation,
      })
      .select()
      .single();

    if (error) throw error;

    store.addLocation(newLocation);
    return newLocation;
  } catch (error) {
    console.error('Failed to save location:', error);
    return null;
  }
}

// Backwards compatibility alias
export const saveBirthChart = saveSavedLocation;

/**
 * Update an existing location
 */
export async function updateSavedLocation(
  userId: string | null,
  id: string,
  data: Partial<SavedLocationInput>
): Promise<void> {
  const store = useSavedLocationsStore.getState();

  if (!userId) {
    // Guest mode - update localStorage
    const currentLocation = store.currentLocation;
    if (currentLocation && currentLocation.id === id) {
      const updated = { ...currentLocation, ...data, updated_at: new Date().toISOString() };
      localStorage.setItem(GUEST_LOCATION_KEY, JSON.stringify(updated));
      store.updateLocationInStore(id, data);
    }
    return;
  }

  try {
    const { error } = await supabase
      .from('saved_locations')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    store.updateLocationInStore(id, data);
  } catch (error) {
    console.error('Failed to update location:', error);
  }
}

// Backwards compatibility alias
export const updateBirthChart = updateSavedLocation;

/**
 * Delete a location
 */
export async function deleteSavedLocation(userId: string | null, id: string): Promise<void> {
  const store = useSavedLocationsStore.getState();

  if (!userId) {
    // Guest mode - remove from localStorage
    localStorage.removeItem(GUEST_LOCATION_KEY);
    store.setLocations([]);
    store.setCurrentLocation(null);
    return;
  }

  try {
    const { error } = await supabase
      .from('saved_locations')
      .delete()
      .eq('id', id);

    if (error) throw error;

    store.removeLocation(id);
  } catch (error) {
    console.error('Failed to delete location:', error);
  }
}

// Backwards compatibility alias
export const deleteBirthChart = deleteSavedLocation;

/**
 * Set a location as the default
 */
export async function setDefaultSavedLocation(userId: string | null, id: string): Promise<void> {
  if (!userId) return;

  const store = useSavedLocationsStore.getState();

  try {
    const { error } = await supabase
      .from('saved_locations')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;

    // The database trigger handles unsetting other defaults
    // Update local state
    store.setLocations(
      store.locations.map(loc => ({ ...loc, is_default: loc.id === id }))
    );
  } catch (error) {
    console.error('Failed to set default location:', error);
  }
}

// Backwards compatibility alias
export const setDefaultBirthChart = setDefaultSavedLocation;

/**
 * Select a location as the current location
 */
export function selectSavedLocation(id: string): void {
  const store = useSavedLocationsStore.getState();
  const location = store.locations.find(loc => loc.id === id);
  if (location) {
    store.setCurrentLocation(location);
  }
}

// Backwards compatibility alias
export const selectBirthChart = selectSavedLocation;
