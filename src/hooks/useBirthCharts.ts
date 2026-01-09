/**
 * Birth Charts Hook
 * Manages birth chart data for authenticated users with localStorage fallback for guests
 *
 * This hook now uses a Zustand store for shared state across all components,
 * ensuring that chart updates are immediately visible everywhere.
 */

import { useEffect, useCallback } from 'react';
import { useAuth } from './useAuth-context';
import {
  useBirthChartsStore,
  loadBirthCharts,
  saveBirthChart,
  updateBirthChart,
  deleteBirthChart,
  setDefaultBirthChart,
  selectBirthChart,
  type BirthChart,
  type BirthChartInput,
} from '@/stores/birthChartsStore';

// Re-export types for consumers
export type { BirthChart, BirthChartInput };

export interface UseBirthChartsReturn {
  // Charts
  charts: BirthChart[];
  currentChart: BirthChart | null;
  loading: boolean;

  // Actions
  loadCharts: () => Promise<void>;
  saveChart: (data: BirthChartInput) => Promise<BirthChart | null>;
  updateChart: (id: string, data: Partial<BirthChartInput>) => Promise<void>;
  deleteChart: (id: string) => Promise<void>;
  selectChart: (id: string) => void;
  setDefaultChart: (id: string) => Promise<void>;

  // Guest mode
  isGuest: boolean;
}

export function useBirthCharts(): UseBirthChartsReturn {
  const { user } = useAuth();
  const userId = user?.id || null;
  const isGuest = !user;

  // Get state from Zustand store
  const charts = useBirthChartsStore((state) => state.charts);
  const currentChart = useBirthChartsStore((state) => state.currentChart);
  const loading = useBirthChartsStore((state) => state.loading);
  const initialized = useBirthChartsStore((state) => state.initialized);

  // Load charts on mount and when user changes
  useEffect(() => {
    // Always reload when user changes to ensure fresh data
    loadBirthCharts(userId);
  }, [userId]);

  // Wrapped actions that pass userId
  const loadCharts = useCallback(async () => {
    await loadBirthCharts(userId);
  }, [userId]);

  const saveChart = useCallback(async (data: BirthChartInput): Promise<BirthChart | null> => {
    return saveBirthChart(userId, data);
  }, [userId]);

  const updateChart = useCallback(async (id: string, data: Partial<BirthChartInput>): Promise<void> => {
    await updateBirthChart(userId, id, data);
  }, [userId]);

  const deleteChart = useCallback(async (id: string): Promise<void> => {
    await deleteBirthChart(userId, id);
  }, [userId]);

  const setDefaultChart = useCallback(async (id: string): Promise<void> => {
    await setDefaultBirthChart(userId, id);
  }, [userId]);

  const selectChart = useCallback((id: string): void => {
    selectBirthChart(id);
  }, []);

  return {
    charts,
    currentChart,
    loading,
    loadCharts,
    saveChart,
    updateChart,
    deleteChart,
    selectChart,
    setDefaultChart,
    isGuest,
  };
}
