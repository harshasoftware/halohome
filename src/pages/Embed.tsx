/**
 * EmbedPage - Lightweight embeddable globe view
 *
 * Features:
 * - Minimal UI for iframe embedding
 * - Uses free static earth texture (no MapTiler costs)
 * - Full interactivity (rotate, zoom)
 * - Privacy-aware birth data display
 * - Small watermark linking to halohome.app
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { EmbedGlobe } from '@/features/globe/components/EmbedGlobe';
import { getShareData } from '@/services/shareService';
import { useAstroLines } from '@/hooks/useAstroLines';
import type { ShareLinkData } from '@/types/share';
import type { BirthData, AstroVisibilityState } from '@/lib/astro-types';
import { Loader2, AlertCircle, ExternalLink } from 'lucide-react';

// Convert share birth data to the format expected by useAstroLines
function toBirthData(shareBirthData: ShareLinkData['birthData']): BirthData {
  return {
    date: new Date(shareBirthData.date),
    latitude: shareBirthData.latitude,
    longitude: shareBirthData.longitude,
    lat: shareBirthData.latitude,
    lng: shareBirthData.longitude,
    localDate: shareBirthData.localDate || '',
    localTime: shareBirthData.localTime || '12:00',
  };
}

// Convert share visibility state to AstroVisibilityState
function toVisibilityState(
  shareVisibility: ShareLinkData['visibilityState']
): Partial<AstroVisibilityState> | undefined {
  if (!shareVisibility) return undefined;

  return {
    planets: shareVisibility.planets,
    lineTypes: shareVisibility.lineTypes,
    aspects: shareVisibility.aspects,
    parans: shareVisibility.parans,
    zenith: shareVisibility.zenith,
  };
}

// Loading state component
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center w-full h-full bg-gray-900 text-white">
    <Loader2 className="w-8 h-8 animate-spin text-blue-400 mb-4" />
    <p className="text-sm text-gray-400">Loading chart...</p>
  </div>
);

// Error state component
const ErrorState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center w-full h-full bg-gray-900 text-white p-4">
    <AlertCircle className="w-8 h-8 text-red-400 mb-4" />
    <p className="text-sm text-red-400 text-center mb-4">{message}</p>
    <a
      href="https://halohome.app"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300"
    >
      Create your own chart
      <ExternalLink className="w-4 h-4" />
    </a>
  </div>
);

// Birth info panel (shown based on privacy level)
const BirthInfoPanel = ({ shareData }: { shareData: ShareLinkData }) => {
  if (shareData.privacyLevel === 'anonymous') {
    return null;
  }

  const { birthData, title } = shareData;
  const date = new Date(birthData.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // For partial privacy, don't show time
  const showTime = shareData.privacyLevel === 'full' && birthData.localTime;

  return (
    <div className="absolute top-2 left-2 px-3 py-2 bg-black/60 backdrop-blur-sm rounded-lg text-white text-xs max-w-[200px]">
      {title && (
        <div className="font-medium text-sm mb-1 truncate">{title}</div>
      )}
      <div className="text-gray-300">
        {formattedDate}
        {showTime && ` at ${birthData.localTime}`}
      </div>
      {birthData.cityName && shareData.privacyLevel === 'full' && (
        <div className="text-gray-400 truncate">{birthData.cityName}</div>
      )}
    </div>
  );
};

export default function EmbedPage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const [searchParams] = useSearchParams();
  const theme = (searchParams.get('theme') as 'dark' | 'light') || 'dark';
  const showControls = searchParams.get('controls') !== 'false';

  const [shareData, setShareData] = useState<ShareLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch share data
  useEffect(() => {
    if (!shortCode) {
      setError('Invalid share link');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const data = await getShareData(shortCode);
        setShareData(data);
      } catch (err) {
        console.error('Error fetching share data:', err);
        setError(err instanceof Error ? err.message : 'Failed to load chart');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [shortCode]);

  // Convert share data to birth data for astro calculation
  const birthData = useMemo(() => {
    if (!shareData) return null;
    return toBirthData(shareData.birthData);
  }, [shareData]);

  // Calculate astro lines
  const {
    visiblePlanetaryLines,
    visibleAspectLines,
    visibleZenithPoints,
    loading: calculatingLines,
  } = useAstroLines(birthData, {
    enabled: !!birthData,
  });

  // Apply visibility state from share link
  const filteredPlanetaryLines = useMemo(() => {
    if (!shareData?.visibilityState?.planets) return visiblePlanetaryLines;

    const visiblePlanets = shareData.visibilityState.planets;
    return visiblePlanetaryLines.filter(
      line => visiblePlanets[line.planet] !== false
    );
  }, [visiblePlanetaryLines, shareData?.visibilityState?.planets]);

  const filteredAspectLines = useMemo(() => {
    if (shareData?.visibilityState?.aspects === false) return [];
    return visibleAspectLines;
  }, [visibleAspectLines, shareData?.visibilityState?.aspects]);

  const filteredZenithPoints = useMemo(() => {
    if (shareData?.visibilityState?.zenith === false) return [];
    return visibleZenithPoints;
  }, [visibleZenithPoints, shareData?.visibilityState?.zenith]);

  // Loading state
  if (loading) {
    return <LoadingState />;
  }

  // Error state
  if (error || !shareData) {
    return <ErrorState message={error || 'Share link not found'} />;
  }

  // Background based on theme
  const bgClass = theme === 'dark' ? 'bg-gray-900' : 'bg-gray-100';

  return (
    <div className={`relative w-screen h-screen overflow-hidden ${bgClass}`}>
      {/* Globe */}
      <EmbedGlobe
        astroLines={filteredPlanetaryLines}
        aspectLines={filteredAspectLines}
        zenithPoints={filteredZenithPoints}
        cameraPosition={shareData.cameraPosition || undefined}
        theme={theme}
        showControls={showControls}
        autoRotate={!showControls}
      />

      {/* Birth info (privacy-aware) */}
      <BirthInfoPanel shareData={shareData} />

      {/* Loading overlay while calculating lines */}
      {calculatingLines && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30">
          <Loader2 className="w-6 h-6 animate-spin text-white" />
        </div>
      )}

      {/* "View full chart" link */}
      <a
        href={`https://halohome.app/s/${shortCode}`}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 text-xs text-white/70 bg-black/40 rounded hover:text-white hover:bg-black/60 transition-colors"
      >
        View full chart
        <ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}
