/**
 * MobileExportSheet - Bottom sheet for export/report panel on mobile
 *
 * Wraps the LineReportPanel component in a mobile bottom sheet container.
 */

import React, { Suspense, lazy, useState } from 'react';
import { FileText } from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';
import type { PlanetaryLine, ZenithPoint } from '@/lib/astro-types';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';

// Lazy load LineReportPanel since it's a heavy component
const LineReportPanel = lazy(() =>
  import('../LineReportPanel').then((m) => ({ default: m.LineReportPanel }))
);

interface MobileExportSheetProps {
  planetaryLines: PlanetaryLine[];
  zenithPoints: ZenithPoint[];
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  onClose: () => void;
}

export const MobileExportSheet: React.FC<MobileExportSheetProps> = ({
  planetaryLines,
  zenithPoints,
  birthDate,
  birthTime,
  birthLocation,
  onClose,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const setMobileSheetMaximized = useGlobeInteractionStore((s) => s.setMobileSheetMaximized);

  const handleClose = () => {
    setMobileSheetMaximized(false);
    onClose();
  };

  const icon = (
    <div className="w-8 h-8 rounded-full bg-emerald-500 flex items-center justify-center">
      <FileText className="w-4 h-4 text-white" />
    </div>
  );

  return (
    <MobileBottomSheet
      onClose={handleClose}
      title="Export Report"
      subtitle={birthLocation || 'Your astrocartography report'}
      icon={icon}
      maxHeight="80vh"
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
        <LineReportPanel
          planetaryLines={planetaryLines}
          zenithPoints={zenithPoints}
          birthDate={birthDate}
          birthTime={birthTime}
          birthLocation={birthLocation}
          onClose={handleClose}
          isMobile={true}
        />
      </Suspense>
    </MobileBottomSheet>
  );
};

export default MobileExportSheet;
