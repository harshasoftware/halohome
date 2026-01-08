/**
 * CopilotKit Context Registration Hook
 *
 * Singleton-like pattern for registering CopilotKit readable contexts.
 * Consolidates all context into a single registration to prevent initialization race conditions.
 */

import { useCopilotReadable, useCopilotAction } from '@copilotkit/react-core';
import { useMemo, useEffect, useState, useRef } from 'react';
import type { Planet, PlanetaryLine, PlanetaryPosition, NatalChartResult, NatalChartSettings, AspectLine, ParanLine } from '@/lib/astro-types';
import type { LocationAnalysis } from '@/lib/location-line-utils';
import type { ZoneAnalysis } from './types';

// Zodiac signs for display
const ZODIAC_SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
];

export interface CopilotContextData {
  // Birth data
  birthData: {
    date: string;
    time: string;
    location: string;
    latitude: number;
    longitude: number;
  } | null;

  // Planetary data
  planetaryPositions: PlanetaryPosition[];
  visibleLines: PlanetaryLine[];
  aspectLines: AspectLine[];
  paranLines: ParanLine[];

  // Selected line
  selectedLine: PlanetaryLine | null;

  // Location analysis
  locationAnalysis: LocationAnalysis | null;

  // Zone analysis
  zoneAnalysis: ZoneAnalysis | null;

  // Mode
  mode: 'standard' | 'relocated' | 'localSpace';
  relocationTarget?: { latitude: number; longitude: number; name?: string };

  // Natal chart
  natalChartResult: NatalChartResult | null;
  natalChartSettings?: NatalChartSettings;

  // Duo mode
  isDuoMode: boolean;
  personName: string;
  partnerName: string;
  partnerBirthData: {
    date: string;
    time: string;
    location: string;
    latitude: number;
    longitude: number;
  } | null;
  partnerPlanetaryPositions: PlanetaryPosition[];
  partnerVisibleLines: PlanetaryLine[];
  partnerAspectLines: AspectLine[];
  partnerParanLines: ParanLine[];
  partnerNatalChartResult: NatalChartResult | null;
}

export interface CopilotActions {
  onHighlightLine?: (planet: Planet, lineType: 'ASC' | 'DSC' | 'MC' | 'IC') => void;
  onClearHighlight?: () => void;
  onZoomToLocation?: (lat: number, lng: number, altitude?: number) => void;
  onAnalyzeLocation?: (lat: number, lng: number) => void;
  onTogglePlanet?: (planet: Planet) => void;
  onRelocateTo?: (lat: number, lng: number, name?: string) => void;
}

// Track initialization globally to prevent race conditions
let isInitialized = false;

/**
 * Singleton hook for registering all CopilotKit contexts
 * Uses deferred registration to prevent initialization errors
 */
export function useCopilotContext(data: CopilotContextData, actions: CopilotActions) {
  // Track if we're ready to register (defer to avoid initialization race)
  const [isReady, setIsReady] = useState(false);
  const initRef = useRef(false);

  // Defer registration until after first render
  useEffect(() => {
    // Small delay to ensure CopilotKit provider is fully mounted
    const timer = setTimeout(() => {
      if (!initRef.current) {
        initRef.current = true;
        isInitialized = true;
        setIsReady(true);
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Memoize the combined context value
  const contextValue = useMemo(() => {
    if (!isReady) return null;

    const {
      birthData,
      planetaryPositions,
      visibleLines,
      aspectLines,
      paranLines,
      selectedLine,
      locationAnalysis,
      zoneAnalysis,
      mode,
      relocationTarget,
      natalChartResult,
      natalChartSettings,
      isDuoMode,
      personName,
      partnerName,
      partnerBirthData,
      partnerPlanetaryPositions,
      partnerVisibleLines,
      partnerAspectLines,
      partnerParanLines,
      partnerNatalChartResult,
    } = data;

    return {
      // User's birth data
      birthData: birthData ? {
        date: birthData.date,
        time: birthData.time,
        location: birthData.location,
        latitude: birthData.latitude,
        longitude: birthData.longitude,
      } : null,

      // Planetary positions with zodiac
      planetaryPositions: planetaryPositions.map(p => ({
        planet: p.planet,
        sign: ZODIAC_SIGNS[Math.floor((p.eclipticLongitude % 360) / 30)],
        degree: p.eclipticLongitude % 30,
        eclipticLongitude: p.eclipticLongitude,
      })),

      // Visible lines (limited)
      visibleLines: visibleLines.slice(0, 20).map(l => ({
        planet: l.planet,
        lineType: l.lineType,
      })),

      // Selected line
      selectedLine: selectedLine ? {
        planet: selectedLine.planet,
        lineType: selectedLine.lineType,
      } : null,

      // Location analysis
      locationAnalysis: locationAnalysis ? {
        latitude: locationAnalysis.latitude,
        longitude: locationAnalysis.longitude,
        nearbyLines: locationAnalysis.lines.slice(0, 5).map(l => ({
          planet: l.planet,
          lineType: l.lineType || 'ASPECT',
          distance: l.distance,
        })),
      } : null,

      // Mode
      mode: { mode, relocationTarget },

      // Natal chart
      natalChart: natalChartResult ? {
        ascendant: {
          degree: natalChartResult.ascendant,
          sign: ZODIAC_SIGNS[Math.floor(natalChartResult.ascendant / 30)],
        },
        midheaven: {
          degree: natalChartResult.midheaven,
          sign: ZODIAC_SIGNS[Math.floor(natalChartResult.midheaven / 30)],
        },
        houseSystem: natalChartSettings?.houseSystem,
        zodiacType: natalChartSettings?.zodiacType,
      } : null,

      // Aspect lines
      aspectLines: aspectLines.slice(0, 15).map(a => ({
        planet: a.planet,
        angle: a.angle,
        aspectType: a.aspectType,
        isHarmonious: a.isHarmonious,
        direction: a.direction,
      })),

      // Paran lines
      paranLines: paranLines.slice(0, 15).map(p => ({
        planet1: p.planet1,
        angle1: p.angle1,
        planet2: p.planet2,
        angle2: p.angle2,
        latitude: p.latitude,
      })),

      // Zone analysis
      zoneAnalysis: zoneAnalysis ? {
        bounds: zoneAnalysis.bounds,
        center: zoneAnalysis.center,
        linesInZone: zoneAnalysis.linesInZone,
        summary: zoneAnalysis.summary,
      } : null,

      // Duo mode / Partner context (consolidated)
      duoMode: isDuoMode ? {
        enabled: true,
        personName,
        partnerName,
        birthData: partnerBirthData ? {
          date: partnerBirthData.date,
          time: partnerBirthData.time,
          location: partnerBirthData.location,
          latitude: partnerBirthData.latitude,
          longitude: partnerBirthData.longitude,
        } : null,
        planetaryPositions: partnerPlanetaryPositions.length > 0
          ? partnerPlanetaryPositions.map(p => ({
              planet: p.planet,
              sign: ZODIAC_SIGNS[Math.floor((p.eclipticLongitude % 360) / 30)],
              degree: p.eclipticLongitude % 30,
              eclipticLongitude: p.eclipticLongitude,
            }))
          : null,
        visibleLines: partnerVisibleLines.length > 0
          ? partnerVisibleLines.slice(0, 20).map(l => ({
              planet: l.planet,
              lineType: l.lineType,
            }))
          : null,
        natalChart: partnerNatalChartResult ? {
          ascendant: {
            degree: partnerNatalChartResult.ascendant,
            sign: ZODIAC_SIGNS[Math.floor(partnerNatalChartResult.ascendant / 30)],
          },
          midheaven: {
            degree: partnerNatalChartResult.midheaven,
            sign: ZODIAC_SIGNS[Math.floor(partnerNatalChartResult.midheaven / 30)],
          },
        } : null,
        aspectLines: partnerAspectLines.length > 0
          ? partnerAspectLines.slice(0, 15).map(a => ({
              planet: a.planet,
              angle: a.angle,
              aspectType: a.aspectType,
              isHarmonious: a.isHarmonious,
              direction: a.direction,
            }))
          : null,
        paranLines: partnerParanLines.length > 0
          ? partnerParanLines.slice(0, 15).map(p => ({
              planet1: p.planet1,
              angle1: p.angle1,
              planet2: p.planet2,
              angle2: p.angle2,
              latitude: p.latitude,
            }))
          : null,
      } : { enabled: false },
    };
  }, [isReady, data]);

  // Register single consolidated context (only when ready)
  useCopilotReadable({
    description: "Complete astrocartography context including user's birth data, planetary positions, visible lines, natal chart, aspect lines, paran lines, zone analysis, and duo mode partner data. This is the AI's window into the user's astrological chart on the globe.",
    value: contextValue,
  });

  // Register actions (only when ready)
  useCopilotAction({
    name: 'highlightLine',
    description: 'Highlight a specific planetary line on the map to show the user',
    parameters: [
      {
        name: 'planet',
        type: 'string',
        description: 'The planet whose line to highlight (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto)',
        required: true,
      },
      {
        name: 'lineType',
        type: 'string',
        description: 'The type of line to highlight (ASC, DSC, MC, IC)',
        required: true,
      },
    ],
    handler: async ({ planet, lineType }) => {
      if (isReady && actions.onHighlightLine) {
        actions.onHighlightLine(planet as Planet, lineType as 'ASC' | 'DSC' | 'MC' | 'IC');
      }
      return `Highlighted ${planet} ${lineType} line on the map`;
    },
  });

  useCopilotAction({
    name: 'zoomToLocation',
    description: 'Zoom the map to a specific location by coordinates or city name',
    parameters: [
      {
        name: 'latitude',
        type: 'number',
        description: 'The latitude to zoom to',
        required: true,
      },
      {
        name: 'longitude',
        type: 'number',
        description: 'The longitude to zoom to',
        required: true,
      },
      {
        name: 'locationName',
        type: 'string',
        description: 'Name of the location (optional)',
        required: false,
      },
    ],
    handler: async ({ latitude, longitude, locationName }) => {
      if (isReady && actions.onZoomToLocation) {
        actions.onZoomToLocation(latitude, longitude, 0.4);
      }
      return `Zoomed to ${locationName || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`}`;
    },
  });

  useCopilotAction({
    name: 'analyzeLocation',
    description: 'Analyze the planetary influences at a specific location',
    parameters: [
      {
        name: 'latitude',
        type: 'number',
        description: 'The latitude to analyze',
        required: true,
      },
      {
        name: 'longitude',
        type: 'number',
        description: 'The longitude to analyze',
        required: true,
      },
    ],
    handler: async ({ latitude, longitude }) => {
      if (isReady) {
        if (actions.onZoomToLocation) {
          actions.onZoomToLocation(latitude, longitude, 0.4);
        }
        if (actions.onAnalyzeLocation) {
          setTimeout(() => actions.onAnalyzeLocation!(latitude, longitude), 500);
        }
      }
      return `Analyzing planetary influences at ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`;
    },
  });

  useCopilotAction({
    name: 'togglePlanetVisibility',
    description: "Show or hide a specific planet's lines on the map",
    parameters: [
      {
        name: 'planet',
        type: 'string',
        description: 'The planet to toggle (Sun, Moon, Mercury, Venus, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto)',
        required: true,
      },
    ],
    handler: async ({ planet }) => {
      if (isReady && actions.onTogglePlanet) {
        actions.onTogglePlanet(planet as Planet);
      }
      return `Toggled visibility of ${planet} lines`;
    },
  });

  useCopilotAction({
    name: 'relocateChart',
    description: 'Relocate the birth chart to a new location to see how planetary influences change',
    parameters: [
      {
        name: 'latitude',
        type: 'number',
        description: 'The latitude to relocate to',
        required: true,
      },
      {
        name: 'longitude',
        type: 'number',
        description: 'The longitude to relocate to',
        required: true,
      },
      {
        name: 'locationName',
        type: 'string',
        description: 'Name of the location (optional)',
        required: false,
      },
    ],
    handler: async ({ latitude, longitude, locationName }) => {
      if (isReady && actions.onRelocateTo) {
        actions.onRelocateTo(latitude, longitude, locationName);
      }
      return `Relocated chart to ${locationName || `${latitude.toFixed(2)}, ${longitude.toFixed(2)}`}`;
    },
  });

  return { isReady };
}
