/**
 * CityPanelContent - Content for the city info panel in the right panel stack
 *
 * Renders the CityInfoPanel with location analysis.
 */

import React, { Suspense, lazy, useMemo } from 'react';
import type { LocationAnalysis } from '@/lib/location-line-utils';
import { analyzeLocation } from '@/lib/location-line-utils';
import type { PlanetaryLine, AspectLine, ZenithPoint } from '@/lib/astro-types';
import type { BirthData } from '@/hooks/useAstroLines';

// Lazy load CityInfoPanel
const CityInfoPanel = lazy(() =>
  import('../CityInfoPanel').then((m) => ({ default: m.CityInfoPanel }))
);

interface CityInfo {
  lat: number;
  lng: number;
  name: string;
}

interface CityPanelContentProps {
  city: CityInfo;
  birthData: BirthData | null;
  planetaryLines: PlanetaryLine[];
  aspectLines: AspectLine[];
  zenithPoints: ZenithPoint[];
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (lat: number, lng: number, name: string, country?: string) => void;
}

export const CityPanelContent: React.FC<CityPanelContentProps> = ({
  city,
  birthData,
  planetaryLines,
  aspectLines,
  zenithPoints,
  onClose,
  isFavorite,
  onToggleFavorite,
}) => {
  // Compute analysis for this city
  const cityAnalysis = useMemo(() => {
    if (!birthData) return null;
    return analyzeLocation(
      city.lat,
      city.lng,
      planetaryLines,
      aspectLines,
      zenithPoints
    );
  }, [city.lat, city.lng, birthData, planetaryLines, aspectLines, zenithPoints]);

  return (
    <Suspense fallback={
      <div className="flex items-center justify-center p-8 h-64">
        <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.5)' }} />
      </div>
    }>
      <CityInfoPanel
        city={city}
        onClose={onClose}
        isMobile={false}
        isBottomSheet={false}
        isFavorite={isFavorite}
        onToggleFavorite={onToggleFavorite}
        locationAnalysis={cityAnalysis}
      />
    </Suspense>
  );
};

export default CityPanelContent;
