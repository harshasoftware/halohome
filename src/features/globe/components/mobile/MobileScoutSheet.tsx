/**
 * MobileScoutSheet - Bottom sheet for Scout locations on mobile
 *
 * Displays the Scout panel as a mobile-optimized bottom sheet at 60% height,
 * allowing users to see the globe behind it while browsing scout results.
 */

import React, { useState } from 'react';
import { Telescope } from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';
import { ScoutPanel, type ScoutMarker } from '../ScoutPanel';
import type { PlanetaryLine, AspectLine } from '@/lib/astro-types';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';

interface MobileScoutSheetProps {
  planetaryLines: PlanetaryLine[];
  aspectLines: AspectLine[];
  onCityClick?: (lat: number, lng: number, cityName: string) => void;
  onShowCountryMarkers?: (markers: ScoutMarker[]) => void;
  onClose: () => void;
}

export const MobileScoutSheet: React.FC<MobileScoutSheetProps> = ({
  planetaryLines,
  aspectLines,
  onCityClick,
  onShowCountryMarkers,
  onClose,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const setMobileSheetMaximized = useGlobeInteractionStore((s) => s.setMobileSheetMaximized);

  const icon = (
    <div className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center">
      <Telescope className="w-4 h-4 text-white" />
    </div>
  );

  return (
    <MobileBottomSheet
      onClose={() => {
        setMobileSheetMaximized(false);
        onClose();
      }}
      title="Scout Locations"
      subtitle="Find your best places"
      icon={icon}
      height="60vh"
      showBackdrop={true}
      onBackdropClick={() => {
        setMobileSheetMaximized(false);
        onClose();
      }}
      allowMaximize={true}
      isMaximized={isMaximized}
      onToggleMaximize={() => setIsMaximized(!isMaximized)}
      onMaximizeChange={setMobileSheetMaximized}
    >
      <ScoutPanel
        planetaryLines={planetaryLines}
        aspectLines={aspectLines}
        onCityClick={onCityClick}
        onShowCountryMarkers={onShowCountryMarkers}
        onClose={onClose}
      />
    </MobileBottomSheet>
  );
};

export default MobileScoutSheet;
