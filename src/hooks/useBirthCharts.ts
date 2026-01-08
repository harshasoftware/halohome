/**
 * Birth Charts Hook
 * Manages birth chart data for authenticated users with localStorage fallback for guests
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth-context';

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

const GUEST_CHART_KEY = 'guest_birth_chart';
const GUEST_CHARTS_KEY = 'guest_birth_charts';

export function useBirthCharts(): UseBirthChartsReturn {
  const { user } = useAuth();
  const [charts, setCharts] = useState<BirthChart[]>([]);
  const [currentChart, setCurrentChart] = useState<BirthChart | null>(null);
  const [loading, setLoading] = useState(false);

  const isGuest = !user;

  // Load guest chart from localStorage
  const loadGuestChart = useCallback(() => {
    try {
      const stored = localStorage.getItem(GUEST_CHART_KEY);
      if (stored) {
        const chart = JSON.parse(stored) as BirthChart;
        setCharts([chart]);
        setCurrentChart(chart);
      }
    } catch (error) {
      console.error('Failed to load guest chart:', error);
    }
  }, []);

  // Save guest chart to localStorage
  const saveGuestChart = useCallback((chart: BirthChart) => {
    try {
      localStorage.setItem(GUEST_CHART_KEY, JSON.stringify(chart));
      setCharts([chart]);
      setCurrentChart(chart);
    } catch (error) {
      console.error('Failed to save guest chart:', error);
    }
  }, []);

  // Load user's charts from Supabase
  const loadCharts = useCallback(async () => {
    if (isGuest) {
      loadGuestChart();
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('birth_charts')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setCharts(data || []);

      // Set current chart to default or first chart
      const defaultChart = data?.find(c => c.is_default) || data?.[0];
      if (defaultChart && !currentChart) {
        setCurrentChart(defaultChart);
      }
    } catch (error) {
      console.error('Failed to load birth charts:', error);
    } finally {
      setLoading(false);
    }
  }, [user, isGuest, loadGuestChart, currentChart]);

  // Load charts on mount and when user changes
  useEffect(() => {
    loadCharts();
  }, [user?.id]);

  // Save a new chart
  const saveChart = useCallback(async (data: BirthChartInput): Promise<BirthChart | null> => {
    if (isGuest) {
      // For guests, create a local chart
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
      saveGuestChart(guestChart);
      return guestChart;
    }

    try {
      const { data: newChart, error } = await supabase
        .from('birth_charts')
        .insert({
          user_id: user!.id,
          name: data.name || 'My Birth Chart',
          birth_date: data.birth_date,
          birth_time: data.birth_time,
          latitude: data.latitude,
          longitude: data.longitude,
          city_name: data.city_name,
          timezone: data.timezone,
          is_default: charts.length === 0, // First chart is default
        })
        .select()
        .single();

      if (error) throw error;

      setCharts(prev => [newChart, ...prev]);
      setCurrentChart(newChart);

      return newChart;
    } catch (error) {
      console.error('Failed to save birth chart:', error);
      return null;
    }
  }, [user, isGuest, charts.length, saveGuestChart]);

  // Update an existing chart
  const updateChart = useCallback(async (id: string, data: Partial<BirthChartInput>) => {
    if (isGuest) {
      // Update guest chart
      if (currentChart && currentChart.id === id) {
        const updated = { ...currentChart, ...data, updated_at: new Date().toISOString() };
        saveGuestChart(updated as BirthChart);
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

      setCharts(prev =>
        prev.map(c => c.id === id ? { ...c, ...data, updated_at: new Date().toISOString() } : c)
      );

      if (currentChart?.id === id) {
        setCurrentChart(prev => prev ? { ...prev, ...data } : null);
      }
    } catch (error) {
      console.error('Failed to update birth chart:', error);
    }
  }, [user, isGuest, currentChart, saveGuestChart]);

  // Delete a chart
  const deleteChart = useCallback(async (id: string) => {
    if (isGuest) {
      localStorage.removeItem(GUEST_CHART_KEY);
      setCharts([]);
      setCurrentChart(null);
      return;
    }

    try {
      const { error } = await supabase
        .from('birth_charts')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setCharts(prev => prev.filter(c => c.id !== id));

      if (currentChart?.id === id) {
        const remaining = charts.filter(c => c.id !== id);
        setCurrentChart(remaining[0] || null);
      }
    } catch (error) {
      console.error('Failed to delete birth chart:', error);
    }
  }, [user, isGuest, currentChart, charts]);

  // Select a chart as current
  const selectChart = useCallback((id: string) => {
    const chart = charts.find(c => c.id === id);
    if (chart) {
      setCurrentChart(chart);
    }
  }, [charts]);

  // Set a chart as default
  const setDefaultChart = useCallback(async (id: string) => {
    if (isGuest) return;

    try {
      const { error } = await supabase
        .from('birth_charts')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      // The database trigger will handle unsetting other defaults
      setCharts(prev =>
        prev.map(c => ({ ...c, is_default: c.id === id }))
      );
    } catch (error) {
      console.error('Failed to set default chart:', error);
    }
  }, [isGuest]);

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
