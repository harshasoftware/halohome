/**
 * MobileCityInfoSheet - Bottom sheet for city information on mobile
 *
 * Wraps the CityInfoPanel component in a mobile bottom sheet container with backdrop.
 */

import React, { Suspense, lazy, useState } from 'react';
import { MapPin } from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';
import type { LocationAnalysis } from '@/lib/location-line-utils';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';

// Lazy load CityInfoPanel since it's a heavy component
const CityInfoPanel = lazy(() =>
  import('../CityInfoPanel').then((m) => ({ default: m.CityInfoPanel }))
);

interface CityInfo {
  lat: number;
  lng: number;
  name: string;
}

interface MobileCityInfoSheetProps {
  city: CityInfo;
  onClose: () => void;
  isFavorite: boolean;
  onToggleFavorite: (lat: number, lng: number, name: string, country?: string) => void;
  locationAnalysis: LocationAnalysis | null;
}

export const MobileCityInfoSheet: React.FC<MobileCityInfoSheetProps> = ({
  city,
  onClose,
  isFavorite,
  onToggleFavorite,
  locationAnalysis,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const setMobileSheetMaximized = useGlobeInteractionStore((s) => s.setMobileSheetMaximized);

  const handleClose = () => {
    setMobileSheetMaximized(false);
    onClose();
  };

  const icon = (
    <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
      <MapPin className="w-4 h-4 text-white" />
    </div>
  );

  return (
    <MobileBottomSheet
      onClose={handleClose}
      title={city.name}
      subtitle={`${city.lat.toFixed(4)}°, ${city.lng.toFixed(4)}°`}
      icon={icon}
      maxHeight="80vh"
      showBackdrop={true}
      onBackdropClick={handleClose}
      allowMaximize={true}
      isMaximized={isMaximized}
      onToggleMaximize={() => setIsMaximized(!isMaximized)}
      onMaximizeChange={setMobileSheetMaximized}
    >
      <Suspense fallback={
        <div className="flex items-center justify-center p-8">
          <div className="w-6 h-6 border-2 rounded-full animate-spin" style={{ borderColor: 'rgba(255,255,255,0.1)', borderTopColor: 'rgba(255,255,255,0.5)' }} />
        </div>
      }>
        <CityInfoPanel
          city={city}
          onClose={handleClose}
          isMobile={true}
          isBottomSheet={true}
          isFavorite={isFavorite}
          onToggleFavorite={onToggleFavorite}
          locationAnalysis={locationAnalysis}
        />
      </Suspense>
    </MobileBottomSheet>
  );
};

export default MobileCityInfoSheet;
