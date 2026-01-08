/**
 * AnalysisPanelContent - Content for the location analysis panel in the right panel stack
 *
 * Renders the LocationAnalysisCard.
 */

import React from 'react';
import { LocationAnalysisCard } from '../LocationAnalysisCard';
import type { LocationAnalysis } from '@/lib/location-line-utils';

interface AnalysisPanelContentProps {
  analysis: LocationAnalysis;
  onClose: () => void;
  onRelocate: (lat: number, lng: number) => void;
}

export const AnalysisPanelContent: React.FC<AnalysisPanelContentProps> = ({
  analysis,
  onClose,
  onRelocate,
}) => {
  return (
    <LocationAnalysisCard
      analysis={analysis}
      onClose={onClose}
      onRelocate={onRelocate}
    />
  );
};

export default AnalysisPanelContent;
