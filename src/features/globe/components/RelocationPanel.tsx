/**
 * RelocationPanel Component
 * Displays the relocation chart comparison showing how the natal chart
 * changes when relocating to a different location
 */

import React from 'react';
import { MapPin, ArrowRight, Compass, Home, RefreshCw, Info, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RelocationChartResult, RelocationPlanetPosition } from '@/lib/astro-types';
import { formatHouseChange, formatAngularShift } from '@/hooks/useRelocationChart';

// Zodiac sign symbols for display
const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: '\u2648',
  Taurus: '\u2649',
  Gemini: '\u264A',
  Cancer: '\u264B',
  Leo: '\u264C',
  Virgo: '\u264D',
  Libra: '\u264E',
  Scorpio: '\u264F',
  Sagittarius: '\u2650',
  Capricorn: '\u2651',
  Aquarius: '\u2652',
  Pisces: '\u2653',
};

// Planet symbols
const PLANET_SYMBOLS: Record<string, string> = {
  Sun: '\u2609',
  Moon: '\u263D',
  Mercury: '\u263F',
  Venus: '\u2640',
  Mars: '\u2642',
  Jupiter: '\u2643',
  Saturn: '\u2644',
  Uranus: '\u2645',
  Neptune: '\u2646',
  Pluto: '\u2647',
  Chiron: '\u26B7',
  NorthNode: '\u260A',
};

interface RelocationPanelProps {
  result: RelocationChartResult | null;
  loading: boolean;
  error: Error | null;
  originName?: string;
  destinationName?: string;
  onRecalculate?: () => void;
}

export const RelocationPanel: React.FC<RelocationPanelProps> = ({
  result,
  loading,
  error,
  originName = 'Birth Location',
  destinationName = 'New Location',
  onRecalculate,
}) => {
  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-4">
        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Calculating relocation chart...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-4">
        <div className="text-red-500 text-center">
          <p className="font-medium">Error calculating chart</p>
          <p className="text-sm mt-2">{error.message}</p>
        </div>
        {onRecalculate && (
          <Button variant="outline" size="sm" onClick={onRecalculate}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        )}
      </div>
    );
  }

  if (!result) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 gap-4 text-center">
        <MapPin className="w-12 h-12 text-slate-400" />
        <p className="text-slate-500 dark:text-slate-400">
          Click on a location on the globe to see how your chart changes there
        </p>
      </div>
    );
  }

  const changedPlanets = result.planets.filter(p => p.houseChanged);
  const ascSign = getSignFromLongitude(result.relocatedAscendant);
  const mcSign = getSignFromLongitude(result.relocatedMidheaven);
  const originalAscSign = getSignFromLongitude(result.originalAscendant);
  const originalMcSign = getSignFromLongitude(result.originalMidheaven);

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 space-y-6">
        {/* Header with locations */}
        <div className="flex items-center justify-between gap-2 p-3 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 rounded-lg">
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[100px]">
              {originName}
            </span>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-purple-500" />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[100px]">
              {destinationName}
            </span>
          </div>
        </div>

        {/* Angular Shifts */}
        <div className="space-y-3">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Angular Shifts
          </h3>

          {/* ASC Shift */}
          <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Ascendant</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                Math.abs(result.ascendantShift) > 15
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                  : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400'
              }`}>
                {result.ascendantShift >= 0 ? '+' : ''}{result.ascendantShift.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">
                {ZODIAC_SYMBOLS[originalAscSign.name]} {originalAscSign.name} {originalAscSign.degree.toFixed(0)}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="text-indigo-600 dark:text-indigo-400 font-medium">
                {ZODIAC_SYMBOLS[ascSign.name]} {ascSign.name} {ascSign.degree.toFixed(0)}
              </span>
            </div>
          </div>

          {/* MC Shift */}
          <div className="p-3 bg-slate-100 dark:bg-white/5 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Midheaven</span>
              <span className={`text-xs px-2 py-0.5 rounded ${
                Math.abs(result.midheavenShift) > 15
                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                  : 'bg-slate-200 text-slate-600 dark:bg-white/10 dark:text-slate-400'
              }`}>
                {result.midheavenShift >= 0 ? '+' : ''}{result.midheavenShift.toFixed(1)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-500">
                {ZODIAC_SYMBOLS[originalMcSign.name]} {originalMcSign.name} {originalMcSign.degree.toFixed(0)}
              </span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="text-purple-600 dark:text-purple-400 font-medium">
                {ZODIAC_SYMBOLS[mcSign.name]} {mcSign.name} {mcSign.degree.toFixed(0)}
              </span>
            </div>
          </div>
        </div>

        {/* House Changes */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              House Changes
            </h3>
            <span className="text-xs text-slate-400">
              {changedPlanets.length} of {result.planets.length}
            </span>
          </div>

          {changedPlanets.length > 0 ? (
            <div className="space-y-2">
              {changedPlanets.map((planet) => (
                <div
                  key={planet.planet}
                  className="flex items-center justify-between p-2 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-200/50 dark:border-amber-500/20 rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg" title={planet.planet}>
                      {PLANET_SYMBOLS[planet.planet] || planet.planet}
                    </span>
                    <span className="text-sm font-medium">
                      {planet.planet}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">
                      {ordinal(planet.originalHouse)}
                    </span>
                    <ArrowRight className="w-3 h-3 text-amber-500" />
                    <span className="font-medium text-amber-600 dark:text-amber-400">
                      {ordinal(planet.relocatedHouse)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 bg-green-50 dark:bg-green-500/10 border border-green-200/50 dark:border-green-500/20 rounded-lg text-center">
              <p className="text-sm text-green-700 dark:text-green-400">
                No planets change houses at this location
              </p>
            </div>
          )}
        </div>

        {/* All Planets Summary */}
        <details className="group">
          <summary className="flex items-center gap-2 cursor-pointer text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300">
            <Info className="w-3 h-3" />
            All Planet Positions
          </summary>
          <div className="mt-3 space-y-1.5">
            {result.planets.map((planet) => (
              <div
                key={planet.planet}
                className={`flex items-center justify-between p-2 rounded text-sm ${
                  planet.houseChanged
                    ? 'bg-amber-50 dark:bg-amber-500/10'
                    : 'bg-slate-50 dark:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <span>{PLANET_SYMBOLS[planet.planet] || ''}</span>
                  <span className="font-medium">{planet.planet}</span>
                  <span className="text-slate-400 text-xs">
                    {ZODIAC_SYMBOLS[planet.signName]} {planet.degreeInSign.toFixed(0)}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={planet.houseChanged ? 'text-slate-400' : 'text-slate-600 dark:text-slate-300'}>
                    H{planet.originalHouse}
                  </span>
                  {planet.houseChanged && (
                    <>
                      <ArrowRight className="w-3 h-3 text-amber-500" />
                      <span className="text-amber-600 dark:text-amber-400 font-medium">
                        H{planet.relocatedHouse}
                      </span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </details>

        {/* Calculation info */}
        <div className="text-xs text-center text-slate-400 pt-4 border-t border-slate-200 dark:border-white/10">
          <p>{result.houseSystem} houses | {result.zodiacType} zodiac</p>
          <p>Calculated in {result.calculationTime.toFixed(0)}ms</p>
        </div>
      </div>
    </div>
  );
};

// Helper to get ordinal suffix (1st, 2nd, 3rd, etc.)
function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Helper to get sign name and degree from longitude
function getSignFromLongitude(longitude: number): { name: string; degree: number } {
  const signs = [
    'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
    'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces'
  ];
  const normalized = ((longitude % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const degree = normalized % 30;
  return { name: signs[signIndex], degree };
}

export default RelocationPanel;
