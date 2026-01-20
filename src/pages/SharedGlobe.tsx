/**
 * SharedGlobePage - Full-featured shared chart view
 *
 * This page displays a shared astrocartography chart with all the
 * interactive features of the main app, but in read-only mode.
 * Users can explore the chart and then create their own.
 */

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { GlobeMethods } from 'react-globe.gl';
import MigrationGlobe from '@/features/globe/components/MigrationGlobe';
import { LineInfoCard } from '@/features/globe/components/LineInfoCard';
import { getShareData } from '@/services/shareService';
import { useAstroLines } from '@/hooks/useAstroLines';
import { useIsMobile } from '@/hooks/use-mobile';
import type { ShareLinkData } from '@/types/share';
import type { BirthData } from '@/lib/astro-types';
import type { GlobePath } from '@/stores/globeInteractionStore';
import { Loader2, AlertCircle, Sparkles, Share2, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

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

// Loading state component
const LoadingState = () => (
  <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-b from-gray-900 to-gray-950 text-white">
    <Loader2 className="w-12 h-12 animate-spin text-blue-400 mb-4" />
    <p className="text-lg text-gray-300">Loading shared chart...</p>
    <p className="text-sm text-gray-500 mt-2">Calculating astrocartography lines</p>
  </div>
);

// Error state component
const ErrorState = ({ message }: { message: string }) => (
  <div className="flex flex-col items-center justify-center w-full h-full bg-gradient-to-b from-gray-900 to-gray-950 text-white p-8">
    <AlertCircle className="w-16 h-16 text-red-400 mb-6" />
    <h1 className="text-2xl font-bold mb-2">Chart Not Found</h1>
    <p className="text-gray-400 text-center mb-8 max-w-md">{message}</p>
    <Link to="/">
      <Button className="bg-blue-600 hover:bg-blue-700">
        <Sparkles className="w-4 h-4 mr-2" />
        Create Your Own Chart
      </Button>
    </Link>
  </div>
);

// Header bar for shared view
const SharedHeader = ({
  shareData,
  shortCode,
}: {
  shareData: ShareLinkData;
  shortCode: string;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyLink = useCallback(() => {
    navigator.clipboard.writeText(`https://halohome.app/s/${shortCode}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [shortCode]);

  return (
    <div className="absolute top-0 left-0 right-0 z-20 bg-gradient-to-b from-black/80 to-transparent p-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        {/* Left side - Title and info */}
        <div className="flex items-center gap-4">
          <Link to="/" className="text-white font-bold text-lg hover:text-blue-400 transition-colors">
            halohome.app
          </Link>
          <Badge variant="secondary" className="bg-white/10 text-white/70">
            <Eye className="w-3 h-3 mr-1" />
            Shared Chart
          </Badge>
          {shareData.title && (
            <span className="text-white/90 hidden sm:inline">{shareData.title}</span>
          )}
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopyLink}
            className="text-white/70 hover:text-white hover:bg-white/10"
          >
            <Share2 className="w-4 h-4 mr-2" />
            {copied ? 'Copied!' : 'Copy Link'}
          </Button>
          <Link to="/guest">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              <Sparkles className="w-4 h-4 mr-2" />
              Create Yours
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

// Birth info panel (shown based on privacy level)
const BirthInfoPanel = ({ shareData }: { shareData: ShareLinkData }) => {
  if (shareData.privacyLevel === 'anonymous') {
    return null;
  }

  const { birthData } = shareData;
  const date = new Date(birthData.date);
  const formattedDate = date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const showTime = shareData.privacyLevel === 'full' && birthData.localTime;

  return (
    <div className="absolute bottom-20 left-4 z-10 p-4 bg-black/70 backdrop-blur-md rounded-xl text-white max-w-xs">
      <h3 className="font-semibold text-sm text-gray-400 mb-1">Birth Data</h3>
      <p className="text-white">{formattedDate}</p>
      {showTime && <p className="text-gray-300">at {birthData.localTime}</p>}
      {birthData.cityName && shareData.privacyLevel === 'full' && (
        <p className="text-gray-400 mt-1">{birthData.cityName}</p>
      )}
      {shareData.viewCount > 0 && (
        <p className="text-xs text-gray-500 mt-3 flex items-center gap-1">
          <Eye className="w-3 h-3" />
          {shareData.viewCount.toLocaleString()} views
        </p>
      )}
    </div>
  );
};

export default function SharedGlobePage() {
  const { shortCode } = useParams<{ shortCode: string }>();
  const isMobile = useIsMobile();
  const globeRef = useRef<GlobeMethods>();

  const [shareData, setShareData] = useState<ShareLinkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedLine, setSelectedLine] = useState<GlobePath | null>(null);

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
    visibleParanLines,
    visibleZenithPoints,
    visibility,
    togglePlanet,
    toggleLineType,
    toggleAspects,
    toggleParans,
    toggleZenithPoints,
    loading: calculatingLines,
  } = useAstroLines(birthData, {
    enabled: !!birthData,
  });

  // Apply camera position from share data
  useEffect(() => {
    if (!shareData?.cameraPosition || !globeRef.current) return;

    const { lat, lng, altitude } = shareData.cameraPosition;
    globeRef.current.pointOfView({ lat, lng, altitude }, 1000);
  }, [shareData?.cameraPosition]);

  // Handlers
  const handleLineClick = useCallback((line: GlobePath) => {
    setSelectedLine(line);
  }, []);

  const handleLineHover = useCallback((line: GlobePath | null) => {
    // Could highlight line on hover
  }, []);

  // Loading state
  if (loading || (shareData && calculatingLines)) {
    return <LoadingState />;
  }

  // Error state
  if (error || !shareData) {
    return <ErrorState message={error || 'Share link not found'} />;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-950">
      {/* Header */}
      <SharedHeader shareData={shareData} shortCode={shortCode!} />

      {/* Main globe */}
      <MigrationGlobe
        ref={globeRef}
        locations={[]}
        migrations={[]}
        onPersonClick={() => {}}
        astroLines={visiblePlanetaryLines}
        aspectLines={visibleAspectLines}
        paranLines={visibleParanLines}
        zenithPoints={visibleZenithPoints}
        onLineClick={handleLineClick}
        onLineHover={handleLineHover}
        isMobile={isMobile}
      />

      {/* Birth info panel */}
      <BirthInfoPanel shareData={shareData} />

      {/* Line info card when line is selected */}
      {selectedLine && selectedLine.type === 'planetary' && (
        <div className="absolute top-20 right-4 z-10 w-80">
          <LineInfoCard
            selectedLine={selectedLine}
            onClose={() => setSelectedLine(null)}
          />
        </div>
      )}

      {/* Description panel */}
      {shareData.description && (
        <div className="absolute bottom-4 right-4 z-10 p-4 bg-black/70 backdrop-blur-md rounded-xl text-white max-w-sm">
          <p className="text-sm text-gray-300">{shareData.description}</p>
        </div>
      )}
    </div>
  );
}
