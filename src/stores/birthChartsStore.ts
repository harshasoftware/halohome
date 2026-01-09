/**
 * Birth Charts Store - Zustand store for managing saved birth charts
 *
 * This store provides shared state for birth charts across all components,
 * solving the issue where multiple useBirthCharts() hook instances had
 * separate local state.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { supabase } from '@/integrations/supabase/client';

export interface BirthChart {
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
  created_at: string;
  updated_at: string;
}

export interface BirthChartInput {
  name?: string;
  birth_date: string;
  birth_time: string;
  latitude: number;
  longitude: number;
  city_name?: string | null;
  timezone?: string | null;
  is_default?: boolean;
}

const GUEST_CHART_KEY = 'guest_birth_chart';

interface BirthChartsState {
  // State
  charts: BirthChart[];
  currentChart: BirthChart | null;
  loading: boolean;
  initialized: boolean;

  // Actions
  setCharts: (charts: BirthChart[]) => void;
  setCurrentChart: (chart: BirthChart | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  addChart: (chart: BirthChart) => void;
  updateChartInStore: (id: string, updates: Partial<BirthChart>) => void;
  removeChart: (id: string) => void;
  reset: () => void;
}

const initialState = {
  charts: [] as BirthChart[],
  currentChart: null as BirthChart | null,
  loading: false,
  initialized: false,
};

export const useBirthChartsStore = create<BirthChartsState>()(
  devtools(
    immer((set) => ({
      ...initialState,

      setCharts: (charts) => set((state) => {
        state.charts = charts;
      }),

      setCurrentChart: (chart) => set((state) => {
        state.currentChart = chart;
      }),

      setLoading: (loading) => set((state) => {
        state.loading = loading;
      }),

      setInitialized: (initialized) => set((state) => {
        state.initialized = initialized;
      }),

      addChart: (chart) => set((state) => {
        // Add to beginning of array (most recent first)
        state.charts = [chart, ...state.charts];
        state.currentChart = chart;
      }),

      updateChartInStore: (id, updates) => set((state) => {
        state.charts = state.charts.map(c =>
          c.id === id ? { ...c, ...updates, updated_at: new Date().toISOString() } : c
        );
        if (state.currentChart?.id === id) {
          state.currentChart = { ...state.currentChart, ...updates };
        }
      }),

      removeChart: (id) => set((state) => {
        state.charts = state.charts.filter(c => c.id !== id);
        if (state.currentChart?.id === id) {
          state.currentChart = state.charts[0] || null;
        }
      }),

      reset: () => set(initialState),
    })),
    { name: 'birth-charts-store' }
  )
);

// === Async Actions (outside store for cleaner API) ===

/**
 * Load charts from Supabase or localStorage (for guests)
 */
export async function loadBirthCharts(userId: string | null): Promise<void> {
  const store = useBirthChartsStore.getState();

  // Don't reload if already initialized and not switching users
  // Skip this check to always reload - ensures fresh data
  // if (store.initialized) return;

  store.setLoading(true);

  try {
    if (!userId) {
      // Guest mode - load from localStorage
      const stored = localStorage.getItem(GUEST_CHART_KEY);
      if (stored) {
        const chart = JSON.parse(stored) as BirthChart;
        store.setCharts([chart]);
        store.setCurrentChart(chart);
      } else {
        store.setCharts([]);
        store.setCurrentChart(null);
      }
    } else {
      // Authenticated - load from Supabase
      const { data, error } = await supabase
        .from('birth_charts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      store.setCharts(data || []);

      // Set current chart to default or first chart (only if not already set)
      const currentChart = store.currentChart;
      if (!currentChart || !data?.find(c => c.id === currentChart.id)) {
        const defaultChart = data?.find(c => c.is_default) || data?.[0];
        store.setCurrentChart(defaultChart || null);
      }
    }

    store.setInitialized(true);
  } catch (error) {
    console.error('Failed to load birth charts:', error);
  } finally {
    store.setLoading(false);
  }
}

/**
 * Save a new birth chart
 */
export async function saveBirthChart(
  userId: string | null,
  data: BirthChartInput
): Promise<BirthChart | null> {
  const store = useBirthChartsStore.getState();

  if (!userId) {
    // Guest mode - save to localStorage
    const guestChart: BirthChart = {
      id: `guest-${Date.now()}`,
      user_id: 'guest',
      name: data.name || 'My Birth Chart',
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
    localStorage.setItem(GUEST_CHART_KEY, JSON.stringify(guestChart));
    store.addChart(guestChart);
    return guestChart;
  }

  try {
    const isFirstChart = store.charts.length === 0;
    const { data: newChart, error } = await supabase
      .from('birth_charts')
      .insert({
        user_id: userId,
        name: data.name || 'My Birth Chart',
        birth_date: data.birth_date,
        birth_time: data.birth_time,
        latitude: data.latitude,
        longitude: data.longitude,
        city_name: data.city_name,
        timezone: data.timezone,
        is_default: isFirstChart, // First chart is default
      })
      .select()
      .single();

    if (error) throw error;

    store.addChart(newChart);
    return newChart;
  } catch (error) {
    console.error('Failed to save birth chart:', error);
    return null;
  }
}

/**
 * Update an existing birth chart
 */
export async function updateBirthChart(
  userId: string | null,
  id: string,
  data: Partial<BirthChartInput>
): Promise<void> {
  const store = useBirthChartsStore.getState();

  if (!userId) {
    // Guest mode - update localStorage
    const currentChart = store.currentChart;
    if (currentChart && currentChart.id === id) {
      const updated = { ...currentChart, ...data, updated_at: new Date().toISOString() };
      localStorage.setItem(GUEST_CHART_KEY, JSON.stringify(updated));
      store.updateChartInStore(id, data);
    }
    return;
  }

  try {
    const { error } = await supabase
      .from('birth_charts')
      .update({
        ...data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) throw error;

    store.updateChartInStore(id, data);
  } catch (error) {
    console.error('Failed to update birth chart:', error);
  }
}

/**
 * Delete a birth chart
 */
export async function deleteBirthChart(userId: string | null, id: string): Promise<void> {
  const store = useBirthChartsStore.getState();

  if (!userId) {
    // Guest mode - remove from localStorage
    localStorage.removeItem(GUEST_CHART_KEY);
    store.setCharts([]);
    store.setCurrentChart(null);
    return;
  }

  try {
    const { error } = await supabase
      .from('birth_charts')
      .delete()
      .eq('id', id);

    if (error) throw error;

    store.removeChart(id);
  } catch (error) {
    console.error('Failed to delete birth chart:', error);
  }
}

/**
 * Set a chart as the default
 */
export async function setDefaultBirthChart(userId: string | null, id: string): Promise<void> {
  if (!userId) return;

  const store = useBirthChartsStore.getState();

  try {
    const { error } = await supabase
      .from('birth_charts')
      .update({ is_default: true })
      .eq('id', id);

    if (error) throw error;

    // The database trigger handles unsetting other defaults
    // Update local state
    store.setCharts(
      store.charts.map(c => ({ ...c, is_default: c.id === id }))
    );
  } catch (error) {
    console.error('Failed to set default chart:', error);
  }
}

/**
 * Select a chart as the current chart
 */
export function selectBirthChart(id: string): void {
  const store = useBirthChartsStore.getState();
  const chart = store.charts.find(c => c.id === id);
  if (chart) {
    store.setCurrentChart(chart);
  }
}
