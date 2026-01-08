/**
 * MobileCompatibilitySheet - Bottom sheet for compatibility panel on mobile
 *
 * Wraps the CompatibilityPanel component in a mobile bottom sheet container.
 */

import React, { Suspense, lazy, useState } from 'react';
import { Users } from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';
import { SkeletonMobileCompatibilitySheet } from '@/components/ui/skeleton-chart';
import type { CompatibilityAnalysis, CompatibilityMode } from '../../hooks/useCompatibilityMode';
import type { BirthChart } from '@/hooks/useBirthCharts';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';

// Lazy load CompatibilityPanel since it's a heavy component
const CompatibilityPanel = lazy(() =>
  import('../CompatibilityPanel').then((m) => ({ default: m.CompatibilityPanel }))
);

interface MobileCompatibilitySheetProps {
  analysis: CompatibilityAnalysis | null;
  mode: CompatibilityMode;
  onModeChange: (mode: CompatibilityMode) => void;
  onLocationZoom: (lat: number, lng: number, cityName?: string) => void;
  onLocationCityInfo: (lat: number, lng: number, cityName?: string) => void;
  onClose: () => void;
  onEditPartner: () => void;
  onClearPartner: () => void;
  onSelectPartner?: (chart: BirthChart) => void;
  savedCharts?: BirthChart[];
  currentPartnerId?: string;
  isLoading: boolean;
  person1Name: string;
  person2Name?: string;
}

export const MobileCompatibilitySheet: React.FC<MobileCompatibilitySheetProps> = ({
  analysis,
  mode,
  onModeChange,
  onLocationZoom,
  onLocationCityInfo,
  onClose,
  onEditPartner,
  onClearPartner,
  onSelectPartner,
  savedCharts,
  currentPartnerId,
  isLoading,
  person1Name,
  person2Name,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const setMobileSheetMaximized = useGlobeInteractionStore((s) => s.setMobileSheetMaximized);

  const handleClose = () => {
    setMobileSheetMaximized(false);
    onClose();
  };

  const icon = (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 flex items-center justify-center">
      <Users className="w-4 h-4 text-white" />
    </div>
  );

  const subtitle = person2Name
    ? `${person1Name} & ${person2Name}`
    : 'Add a partner to compare';

  return (
    <MobileBottomSheet
      onClose={handleClose}
      title="Compatibility"
      subtitle={subtitle}
      icon={icon}
      maxHeight="70vh"
      allowMaximize={true}
      isMaximized={isMaximized}
      onToggleMaximize={() => setIsMaximized(!isMaximized)}
      onMaximizeChange={setMobileSheetMaximized}
    >
      <Suspense fallback={<SkeletonMobileCompatibilitySheet locationCount={3} />}>
        <CompatibilityPanel
          analysis={analysis}
          mode={mode}
          onModeChange={onModeChange}
          onLocationZoom={onLocationZoom}
          onLocationCityInfo={onLocationCityInfo}
          onClose={handleClose}
          onEditPartner={onEditPartner}
          onClearPartner={onClearPartner}
          onSelectPartner={onSelectPartner}
          savedCharts={savedCharts}
          currentPartnerId={currentPartnerId}
          isLoading={isLoading}
          person1Name={person1Name}
          person2Name={person2Name}
          isMobile={true}
        />
      </Suspense>
    </MobileBottomSheet>
  );
};

export default MobileCompatibilitySheet;
