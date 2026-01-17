/**
 * Vastu Store - Zustand store for Vastu analysis state
 *
 * Manages property boundaries, direction analysis, Vastu scores, and remedies.
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import { useShallow } from 'zustand/react/shallow';

// Coordinates type
export interface Coordinates {
  lat: number;
  lng: number;
}

// Vastu Direction type
export type VastuDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW' | 'CENTER';

// Vastu Element type (Pancha Bhuta)
export type VastuElement = 'Earth' | 'Water' | 'Fire' | 'Air' | 'Space';

// Vastu Planet type
export type VastuPlanet = 'Sun' | 'Moon' | 'Mars' | 'Mercury' | 'Jupiter' | 'Venus' | 'Saturn' | 'Rahu' | 'Ketu';

// Vastu Zone Analysis
export interface VastuZone {
  direction: VastuDirection;
  element: VastuElement;
  deity: string;
  planet: VastuPlanet; // Ruling planet for this direction
  idealUses: string[];
  currentUse?: string;
  score: number; // 0-100
  issues: string[];
  recommendations: string[];
}

// Vastu Remedy
export interface VastuRemedy {
  id: string;
  direction: VastuDirection;
  issue: string;
  remedy: string;
  priority: 'high' | 'medium' | 'low';
  category: 'placement' | 'color' | 'element' | 'structural' | 'symbolic';
}

// Property Shape Analysis
export interface PropertyShapeAnalysis {
  shape: 'square' | 'rectangle' | 'irregular' | 'L-shaped' | 'T-shaped' | 'triangular';
  isAuspicious: boolean;
  extensionDirection?: VastuDirection;
  cutDirection?: VastuDirection;
  issues: string[];
  recommendations: string[];
}

// Entrance Analysis
export interface EntranceAnalysis {
  direction: VastuDirection;
  pada: number; // 1-8 for each direction (32 padas total)
  isAuspicious: boolean;
  deity: string;
  effects: string[];
  recommendations: string[];
}

// Complete Vastu Analysis
export interface VastuAnalysis {
  propertyAddress: string;
  propertyCoordinates: Coordinates;
  orientation: number; // degrees from true north
  overallScore: number; // 0-100
  zones: VastuZone[];
  propertyShape: PropertyShapeAnalysis;
  entrance: EntranceAnalysis | null;
  elementBalance: Record<VastuElement, number>; // percentage of each element
  remedies: VastuRemedy[];
  summary: string;
  analyzedAt: Date;
}

// Search History Entry
export interface SearchHistoryEntry {
  id: string;
  address: string;
  coordinates: Coordinates;
  timestamp: Date;
  vastuScore?: number;
  isZipCode?: boolean;
}

interface VastuState {
  // Property data
  propertyAddress: string;
  propertyCoordinates: Coordinates | null;
  propertyBoundary: Coordinates[];
  propertyOrientation: number;
  entranceDirection: VastuDirection | null;

  // Analysis results
  vastuAnalysis: VastuAnalysis | null;
  isAnalyzing: boolean;
  analysisError: string | null;

  // Search history
  searchHistory: SearchHistoryEntry[];

  // Drawing state
  isDrawingBoundary: boolean;

  // Actions
  setPropertyAddress: (address: string) => void;
  setPropertyCoordinates: (coords: Coordinates | null) => void;
  setPropertyBoundary: (boundary: Coordinates[]) => void;
  addBoundaryPoint: (point: Coordinates) => void;
  clearBoundary: () => void;
  setPropertyOrientation: (degrees: number) => void;
  setEntranceDirection: (direction: VastuDirection | null) => void;

  // Analysis actions
  setVastuAnalysis: (analysis: VastuAnalysis | null) => void;
  setIsAnalyzing: (analyzing: boolean) => void;
  setAnalysisError: (error: string | null) => void;
  clearAnalysis: () => void;

  // Drawing actions
  startDrawingBoundary: () => void;
  stopDrawingBoundary: () => void;
  toggleDrawingBoundary: () => void;

  // History actions
  addToHistory: (entry: Omit<SearchHistoryEntry, 'id' | 'timestamp'> & { timestamp?: Date }) => void;
  removeFromHistory: (id: string) => void;
  clearHistory: () => void;
  loadFromHistory: (entry: SearchHistoryEntry) => void;

  // Reset
  reset: () => void;
}

// Vastu zone definitions with ruling planets
export const VASTU_ZONES: Record<VastuDirection, { element: VastuElement; deity: string; planet: VastuPlanet; idealUses: string[] }> = {
  N: { element: 'Water', deity: 'Kubera', planet: 'Mercury', idealUses: ['treasury', 'water-storage', 'entrance', 'living-room'] },
  NE: { element: 'Water', deity: 'Ishanya (Shiva)', planet: 'Jupiter', idealUses: ['prayer-room', 'meditation', 'water-source', 'open-space'] },
  E: { element: 'Air', deity: 'Indra', planet: 'Sun', idealUses: ['entrance', 'living-room', 'study', 'bathroom'] },
  SE: { element: 'Fire', deity: 'Agni', planet: 'Venus', idealUses: ['kitchen', 'electrical-room', 'generator'] },
  S: { element: 'Fire', deity: 'Yama', planet: 'Mars', idealUses: ['bedroom', 'storage', 'heavy-items'] },
  SW: { element: 'Earth', deity: 'Nairuti', planet: 'Rahu', idealUses: ['master-bedroom', 'storage', 'heavy-furniture'] },
  W: { element: 'Space', deity: 'Varuna', planet: 'Saturn', idealUses: ['dining', 'children-room', 'study', 'storage'] },
  NW: { element: 'Air', deity: 'Vayu', planet: 'Moon', idealUses: ['guest-room', 'garage', 'storage', 'bathroom'] },
  CENTER: { element: 'Space', deity: 'Brahma', planet: 'Sun', idealUses: ['open-courtyard', 'living-room', 'empty-space'] },
};

const initialState = {
  propertyAddress: '',
  propertyCoordinates: null as Coordinates | null,
  propertyBoundary: [] as Coordinates[],
  propertyOrientation: 0,
  entranceDirection: null as VastuDirection | null,
  vastuAnalysis: null as VastuAnalysis | null,
  isAnalyzing: false,
  analysisError: null as string | null,
  searchHistory: [] as SearchHistoryEntry[],
  isDrawingBoundary: false,
};

export const useVastuStore = create<VastuState>()(
  devtools(
    immer((set, get) => ({
      ...initialState,

      // Property actions
      setPropertyAddress: (address) => set((state) => {
        state.propertyAddress = address;
      }),
      setPropertyCoordinates: (coords) => set((state) => {
        state.propertyCoordinates = coords;
      }),
      setPropertyBoundary: (boundary) => set((state) => {
        state.propertyBoundary = boundary;
      }),
      addBoundaryPoint: (point) => set((state) => {
        state.propertyBoundary.push(point);
      }),
      clearBoundary: () => set((state) => {
        state.propertyBoundary = [];
        state.isDrawingBoundary = false;
      }),
      setPropertyOrientation: (degrees) => set((state) => {
        state.propertyOrientation = degrees;
      }),
      setEntranceDirection: (direction) => set((state) => {
        state.entranceDirection = direction;
      }),

      // Analysis actions
      setVastuAnalysis: (analysis) => set((state) => {
        state.vastuAnalysis = analysis;
      }),
      setIsAnalyzing: (analyzing) => set((state) => {
        state.isAnalyzing = analyzing;
      }),
      setAnalysisError: (error) => set((state) => {
        state.analysisError = error;
      }),
      clearAnalysis: () => set((state) => {
        state.vastuAnalysis = null;
        state.analysisError = null;
      }),

      // Drawing actions
      startDrawingBoundary: () => set((state) => {
        state.isDrawingBoundary = true;
        state.propertyBoundary = [];
      }),
      stopDrawingBoundary: () => set((state) => {
        state.isDrawingBoundary = false;
      }),
      toggleDrawingBoundary: () => set((state) => {
        if (state.isDrawingBoundary) {
          state.isDrawingBoundary = false;
        } else {
          state.isDrawingBoundary = true;
          state.propertyBoundary = [];
        }
      }),

      // History actions
      addToHistory: (entry) => set((state) => {
        const newEntry: SearchHistoryEntry = {
          ...entry,
          id: `history-${Date.now()}`,
          timestamp: entry.timestamp || new Date(),
        };
        // Add to front, limit to 20 entries
        state.searchHistory = [newEntry, ...state.searchHistory.slice(0, 19)];
      }),
      removeFromHistory: (id) => set((state) => {
        state.searchHistory = state.searchHistory.filter(e => e.id !== id);
      }),
      clearHistory: () => set((state) => {
        state.searchHistory = [];
      }),
      loadFromHistory: (entry) => set((state) => {
        state.propertyAddress = entry.address;
        state.propertyCoordinates = entry.coordinates;
      }),

      // Reset
      reset: () => set(initialState),
    })),
    { name: 'vastu-store' }
  )
);

// === Selectors ===
export const usePropertyAddress = () => useVastuStore((state) => state.propertyAddress);
export const usePropertyCoordinates = () => useVastuStore((state) => state.propertyCoordinates);
export const usePropertyBoundary = () => useVastuStore((state) => state.propertyBoundary);
export const useVastuAnalysis = () => useVastuStore((state) => state.vastuAnalysis);
export const useIsAnalyzing = () => useVastuStore((state) => state.isAnalyzing);
export const useSearchHistory = () => useVastuStore((state) => state.searchHistory);
export const useIsDrawingBoundary = () => useVastuStore((state) => state.isDrawingBoundary);

// Combined selectors
export const useVastuState = () =>
  useVastuStore(useShallow((state) => ({
    address: state.propertyAddress,
    coordinates: state.propertyCoordinates,
    boundary: state.propertyBoundary,
    analysis: state.vastuAnalysis,
    isAnalyzing: state.isAnalyzing,
    error: state.analysisError,
  })));

export const useVastuActions = () =>
  useVastuStore(useShallow((state) => ({
    setAddress: state.setPropertyAddress,
    setCoordinates: state.setPropertyCoordinates,
    setBoundary: state.setPropertyBoundary,
    addBoundaryPoint: state.addBoundaryPoint,
    clearBoundary: state.clearBoundary,
    setAnalysis: state.setVastuAnalysis,
    setIsAnalyzing: state.setIsAnalyzing,
    clearAnalysis: state.clearAnalysis,
    toggleDrawing: state.toggleDrawingBoundary,
  })));

export const useHistoryActions = () =>
  useVastuStore(useShallow((state) => ({
    history: state.searchHistory,
    addToHistory: state.addToHistory,
    removeFromHistory: state.removeFromHistory,
    clearHistory: state.clearHistory,
    loadFromHistory: state.loadFromHistory,
  })));
