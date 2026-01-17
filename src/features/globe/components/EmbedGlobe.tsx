/**
 * EmbedGlobe - Lightweight globe component for embeds
 *
 * Uses static earth image (no MapTiler API costs) while maintaining
 * full interactivity (rotate, zoom). Designed for iframe embeds.
 */

import React, { useRef, useEffect, useMemo, useState, lazy, Suspense, memo } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faHouse } from '@fortawesome/free-solid-svg-icons';
import type { GlobeMethods } from 'react-globe.gl';
import type { PlanetaryLine, AspectLine, ZenithPoint } from '@/lib/astro-types';

// Lazy load Globe since it's a heavy component
const Globe = lazy(() => import('react-globe.gl'));

// Path data for globe rendering
interface GlobePath {
  coords: [number, number][];
  color: string;
  stroke: number;
  dash?: number[];
  type: 'planetary' | 'aspect' | 'zenith';
  planet?: string;
  lineType?: string;
}

// Zenith marker for rendering
interface ZenithMarker {
  lat: number;
  lng: number;
  color: string;
  planet: string;
}

interface EmbedGlobeProps {
  astroLines?: PlanetaryLine[];
  aspectLines?: AspectLine[];
  zenithPoints?: ZenithPoint[];
  cameraPosition?: { lat: number; lng: number; altitude: number };
  theme?: 'dark' | 'light';
  showControls?: boolean;
  autoRotate?: boolean;
  onReady?: () => void;
}

// Loading skeleton
const GlobeSkeleton = memo(() => (
  <div className="flex items-center justify-center w-full h-full bg-gray-900/50 rounded-lg">
    <div className="w-32 h-32 rounded-full bg-gray-800/50 animate-pulse" />
  </div>
));

export const EmbedGlobe = memo(({
  astroLines = [],
  aspectLines = [],
  zenithPoints = [],
  cameraPosition,
  theme = 'dark',
  showControls = true,
  autoRotate = false,
  onReady,
}: EmbedGlobeProps) => {
  const globeRef = useRef<GlobeMethods>();
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const [isGlobeReady, setIsGlobeReady] = useState(false);

  // Responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        setDimensions({
          width: clientWidth || 400,
          height: clientHeight || 400,
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  // Configure globe controls when ready
  useEffect(() => {
    if (!globeRef.current || !isGlobeReady) return;

    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = autoRotate;
      controls.autoRotateSpeed = 0.3;
      controls.enableZoom = showControls;
      controls.enablePan = showControls;
      controls.enableRotate = showControls;
      // Limit rotation to prevent disorienting views
      controls.minPolarAngle = Math.PI / 4;
      controls.maxPolarAngle = Math.PI / 1.3;
      controls.minDistance = 150;
      controls.maxDistance = 500;
    }

    // Set initial camera position
    if (cameraPosition) {
      globeRef.current.pointOfView(cameraPosition, 0);
    } else {
      globeRef.current.pointOfView({ lat: 20, lng: 0, altitude: 2.5 }, 0);
    }

    onReady?.();
  }, [isGlobeReady, cameraPosition, showControls, autoRotate, onReady]);

  // Helper function to split paths at large latitude jumps (for ASC/DSC lines)
  const splitPathAtDiscontinuities = (
    points: [number, number][],
    latThreshold: number = 60
  ): [number, number][][] => {
    if (points.length < 2) return [points];

    const segments: [number, number][][] = [];
    let currentSegment: [number, number][] = [points[0]];

    for (let i = 1; i < points.length; i++) {
      const prevLat = points[i - 1][0];
      const currLat = points[i][0];
      const latDiff = Math.abs(currLat - prevLat);

      if (latDiff > latThreshold) {
        if (currentSegment.length >= 2) {
          segments.push(currentSegment);
        }
        currentSegment = [points[i]];
      } else {
        currentSegment.push(points[i]);
      }
    }

    if (currentSegment.length >= 2) {
      segments.push(currentSegment);
    }

    return segments;
  };

  // Convert astro lines to globe path data
  const pathsData = useMemo(() => {
    const paths: GlobePath[] = [];

    // Add planetary lines
    for (const line of astroLines) {
      if (!line.points || line.points.length < 2) continue;

      const validPoints = line.points.filter(
        point => point &&
          typeof point[0] === 'number' && !isNaN(point[0]) &&
          typeof point[1] === 'number' && !isNaN(point[1])
      );

      if (validPoints.length < 2) continue;

      const coords = validPoints.map((point): [number, number] => [point[0], point[1]]);

      // Determine stroke style based on line type
      let dash: number[] | undefined;
      let stroke = 1.5;

      switch (line.lineType) {
        case 'MC':
          stroke = 2.5;
          break;
        case 'IC':
          stroke = 2;
          dash = [4, 2];
          break;
        case 'ASC':
          stroke = 2.5;
          break;
        case 'DSC':
          stroke = 2;
          dash = [2, 2];
          break;
      }

      // For ASC/DSC lines, split at large latitude jumps
      const isHorizonLine = line.lineType === 'ASC' || line.lineType === 'DSC';
      const segments = isHorizonLine ? splitPathAtDiscontinuities(coords) : [coords];

      for (const segmentCoords of segments) {
        paths.push({
          coords: segmentCoords,
          color: line.color,
          stroke,
          dash,
          type: 'planetary',
          planet: line.planet,
          lineType: line.lineType,
        });
      }
    }

    // Add aspect lines
    for (const line of aspectLines) {
      if (!line.points || line.points.length < 2) continue;

      const validPoints = line.points.filter(
        point => point &&
          typeof point[0] === 'number' && !isNaN(point[0]) &&
          typeof point[1] === 'number' && !isNaN(point[1])
      );

      if (validPoints.length < 2) continue;

      const coords = validPoints.map((point): [number, number] => [point[0], point[1]]);

      paths.push({
        coords,
        color: line.color,
        stroke: 1.5,
        dash: [3, 3],
        type: 'aspect',
        planet: line.planet,
        lineType: line.angle,
      });
    }

    return paths;
  }, [astroLines, aspectLines]);

  // Convert zenith points to marker data
  const zenithMarkersData = useMemo((): ZenithMarker[] => {
    return zenithPoints.map(point => ({
      lat: point.latitude,
      lng: point.longitude,
      color: point.color,
      planet: point.planet,
    }));
  }, [zenithPoints]);

  // Background and atmosphere color based on theme
  const bgColor = theme === 'dark' ? 'rgba(0,0,0,0)' : 'rgba(255,255,255,0)';
  const atmosphereColor = theme === 'dark' ? 'rgba(100,149,237,0.2)' : 'rgba(135,206,250,0.3)';

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full"
      style={{ minHeight: 300 }}
    >
      <Suspense fallback={<GlobeSkeleton />}>
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          backgroundColor={bgColor}
          // Use static night earth image (FREE - no MapTiler API costs)
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"

          // Planetary lines on the globe surface
          pathsData={pathsData}
          pathPoints="coords"
          pathPointLat={(p: [number, number]) => p[0]}
          pathPointLng={(p: [number, number]) => p[1]}
          pathColor={(d: object) => (d as GlobePath).color}
          pathStroke={(d: object) => (d as GlobePath).stroke}
          pathDashLength={(d: object) => (d as GlobePath).dash?.[0] ?? 1}
          pathDashGap={(d: object) => (d as GlobePath).dash?.[1] ?? 0}
          pathDashAnimateTime={0}

          // Zenith points as markers
          pointsData={zenithMarkersData}
          pointColor={(d: object) => (d as ZenithMarker).color}
          pointAltitude={0.01}
          pointRadius={0.3}

          // Atmosphere
          atmosphereColor={atmosphereColor}
          atmosphereAltitude={0.15}

          // Callbacks
          onGlobeReady={() => setIsGlobeReady(true)}
        />
      </Suspense>

      {/* Watermark - links to halohome.app */}
      <a
        href="https://halohome.app"
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-2 right-2 px-2 py-1 text-xs text-white/70 bg-black/40 rounded hover:text-white hover:bg-black/60 transition-colors flex items-center gap-1"
      >
        <FontAwesomeIcon icon={faHouse} className="w-3 h-3" />
        halohome.app
      </a>
    </div>
  );
});

EmbedGlobe.displayName = 'EmbedGlobe';

export default EmbedGlobe;
