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
}

export const AnalysisPanelContent: React.FC<AnalysisPanelContentProps> = ({
  analysis,
  onClose,
}) => {
  return (
    <LocationAnalysisCard
      analysis={analysis}
      onClose={onClose}
    />
  );
};

export default AnalysisPanelContent;
