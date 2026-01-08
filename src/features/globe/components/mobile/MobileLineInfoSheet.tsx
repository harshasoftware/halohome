/**
 * MobileLineInfoSheet - Bottom sheet for planetary line info on mobile
 *
 * Wraps the LineInfoCard component in a mobile bottom sheet container.
 */

import React, { useState } from 'react';
import { MobileBottomSheet } from './MobileBottomSheet';
import { LineInfoCard } from '../LineInfoCard';
import { useGlobeInteractionStore, type GlobePath } from '@/stores/globeInteractionStore';

interface MobileLineInfoSheetProps {
  line: GlobePath;
  onClose: () => void;
  zenithPoint: { latitude: number; longitude: number } | null;
  onCityClick: (lat: number, lng: number, cityName: string) => void;
}

// Get line label for the sheet title
function getLineLabel(line: GlobePath): string {
  if (line.type === 'paran') {
    return `${line.planet1} / ${line.planet2} Paran`;
  }
  if (line.type === 'aspect') {
    return `${line.planet} ${line.aspectType}`;
  }
  return `${line.planet} ${line.lineType || 'Line'}`;
}

export const MobileLineInfoSheet: React.FC<MobileLineInfoSheetProps> = ({
  line,
  onClose,
  zenithPoint,
  onCityClick,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const setMobileSheetMaximized = useGlobeInteractionStore((s) => s.setMobileSheetMaximized);

  const handleClose = () => {
    setMobileSheetMaximized(false);
    onClose();
  };

  const icon = (
    <div
      className="w-8 h-8 rounded-full flex items-center justify-center"
      style={{ backgroundColor: line.color || '#888' }}
    >
      <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
        <path d="M2 12h20" />
      </svg>
    </div>
  );

  return (
    <MobileBottomSheet
      onClose={handleClose}
      title={getLineLabel(line)}
      subtitle="Planetary Line"
      icon={icon}
      maxHeight="70vh"
      allowMaximize={true}
      isMaximized={isMaximized}
      onToggleMaximize={() => setIsMaximized(!isMaximized)}
      onMaximizeChange={setMobileSheetMaximized}
    >
      <LineInfoCard
        line={line}
        onClose={handleClose}
        zenithPoint={zenithPoint}
        isMobile={true}
        isBottomSheet={true}
        onCityClick={onCityClick}
      />
    </MobileBottomSheet>
  );
};

export default MobileLineInfoSheet;
