/**
 * AI Context Types for Astrocartography Chat
 * Defines the shared state between the AI agent and the map
 */

import type { PlanetaryLine, PlanetaryPosition, NatalChartResult, Planet } from '@/lib/astro-types';
import type { LocationAnalysis } from '@/lib/location-line-utils';

// Zone analysis data for AI context (when user draws a region on the map)
export interface ZoneAnalysis {
  bounds: { north: number; south: number; east: number; west: number };
  center: { lat: number; lng: number };
  points: Array<{ lat: number; lng: number }>;  // Polygon coordinates for AI context
  linesInZone: Array<{ planet: Planet; lineType: string; type: 'planetary' | 'aspect' | 'paran' }>;
  summary: string;
}

// Simplified line info for AI context
export interface AstroLineInfo {
  planet: Planet;
  lineType: 'ASC' | 'DSC' | 'MC' | 'IC';
  interpretation?: string;
}

// Location info for AI context
export interface LocationInfo {
  latitude: number;
  longitude: number;
  name?: string;
  analysis?: LocationAnalysis;
}

// Birth data for AI context
export interface BirthDataContext {
  date: string;
  time: string;
  location: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

// The complete AI context state
export interface AstroAIContext {
  // Birth data
  birthData: BirthDataContext | null;

  // Current natal chart
  natalChart: {
    ascendant: number;
    ascendantSign: string;
    midheaven: number;
    midheavenSign: string;
    planetaryPositions: Array<{
      planet: Planet;
      sign: string;
      degree: number;
      house: number;
      retrograde: boolean;
    }>;
  } | null;

  // Visible lines on the map
  visibleLines: AstroLineInfo[];

  // Currently highlighted/selected line
  selectedLine: AstroLineInfo | null;

  // Currently analyzed location
  focusedLocation: LocationInfo | null;

  // Astro mode
  mode: 'standard' | 'relocated' | 'localSpace';

  // Relocation target (if relocated)
  relocationTarget?: {
    latitude: number;
    longitude: number;
    name?: string;
  };
}

// Actions the AI agent can take
export interface AstroAIActions {
  // Highlight a specific line on the map
  highlightLine: (planet: Planet, lineType: 'ASC' | 'DSC' | 'MC' | 'IC') => void;

  // Clear line highlight
  clearHighlight: () => void;

  // Zoom to a location
  zoomToLocation: (lat: number, lng: number, altitude?: number) => void;

  // Analyze a location
  analyzeLocation: (lat: number, lng: number) => void;

  // Toggle planet visibility
  togglePlanet: (planet: Planet) => void;

  // Set relocation
  relocateTo: (lat: number, lng: number, name?: string) => void;

  // Return to standard mode
  returnToStandard: () => void;

  // Enable local space mode
  enableLocalSpace: () => void;
}

// Message types for the chat
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  // Generative UI component to render
  uiComponent?: {
    type: 'line-interpretation' | 'location-comparison' | 'travel-suggestion' | 'timing-recommendation';
    props: Record<string, unknown>;
  };
}

// Line interpretation for generative UI
export interface LineInterpretation {
  planet: Planet;
  lineType: 'ASC' | 'DSC' | 'MC' | 'IC';
  title: string;
  shortDescription: string;
  themes: string[];
  careers?: string[];
  challenges?: string[];
  opportunities?: string[];
  bestFor: string[];
  rating: number; // 1-5
}

// Location comparison for generative UI
export interface LocationComparison {
  locations: Array<{
    name: string;
    latitude: number;
    longitude: number;
    score: number;
    dominantInfluences: Array<{ planet: Planet; lineType: string; distance: number }>;
    pros: string[];
    cons: string[];
  }>;
}

// Travel suggestion for generative UI
export interface TravelSuggestion {
  destination: string;
  latitude: number;
  longitude: number;
  reason: string;
  influences: AstroLineInfo[];
  bestTimeToVisit?: string;
  travelTips?: string[];
}

// Timing recommendation for generative UI
export interface TimingRecommendation {
  event: string;
  optimalDates: Array<{
    date: string;
    reason: string;
    rating: number;
  }>;
  transitsToWatch: Array<{
    planet: Planet;
    aspect: string;
    date: string;
  }>;
}
