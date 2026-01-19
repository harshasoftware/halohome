/**
 * MobileScoutSheet - Bottom sheet for Scout locations on mobile
 *
 * Displays the Vastu parcel scout as a mobile-optimized bottom sheet at 60% height,
 * allowing users to see the map behind it while browsing results.
 */

import React, { useState } from 'react';
import { Telescope } from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';
import VastuParcelScout from '../VastuParcelScout';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';

interface MobileScoutSheetProps {
  prefillZipCode?: string | null;
  onClose: () => void;
}

export const MobileScoutSheet: React.FC<MobileScoutSheetProps> = ({
  prefillZipCode,
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
      <div className="h-full min-h-0">
        <VastuParcelScout prefillZipCode={prefillZipCode} />
      </div>
    </MobileBottomSheet>
  );
};

export default MobileScoutSheet;
