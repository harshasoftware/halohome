/**
 * LinePanelContent - Content for the line info panel in the right panel stack
 *
 * Renders the LineInfoCard with zenith point lookup.
 */

import React, { useMemo } from 'react';
import { LineInfoCard } from '../LineInfoCard';
import type { GlobePath } from '@/stores/globeInteractionStore';
import type { ZenithPoint } from '@/lib/astro-types';

interface LinePanelContentProps {
  line: GlobePath;
  zenithPoints: ZenithPoint[];
  onClose: () => void;
  onCityClick: (lat: number, lng: number, cityName: string) => void;
}

export const LinePanelContent: React.FC<LinePanelContentProps> = ({
  line,
  zenithPoints,
  onClose,
  onCityClick,
}) => {
  // Find zenith point for MC lines
  const zenithPoint = useMemo(() => {
    if (line.lineType !== 'MC' || !line.planet) return null;
    const zenith = zenithPoints.find((z) => z.planet === line.planet);
    return zenith ? { latitude: zenith.latitude, longitude: zenith.longitude } : null;
  }, [line.lineType, line.planet, zenithPoints]);

  return (
    <LineInfoCard
      line={line}
      onClose={onClose}
      zenithPoint={zenithPoint}
      onCityClick={onCityClick}
    />
  );
};

export default LinePanelContent;
