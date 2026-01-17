/**
 * LandingGlobeDemo - Interactive 3D globe demo for landing page
 *
 * Features:
 * - Scout/Compass: ZIP code lookup and parcel data analysis (Web)
 * - Harmony zones visualization on globe
 * - Auto-cycling demos for Scout, Compare, and Remedies
 */

import React, { useState, useEffect, useRef, useMemo, memo, lazy, Suspense } from 'react';
import type { GlobeMethods } from 'react-globe.gl';
import { Compass, Scale, Sparkles, MapPin } from 'lucide-react';

// Lazy load Globe since it's a heavy component
const Globe = lazy(() => import('react-globe.gl'));

type DemoMode = 'love' | 'career' | 'home';

// Planetary line data - paths that trace ON the globe surface
interface PathData {
  coords: [number, number][]; // [lat, lng] pairs
  color: string;
  stroke: number;
  name: string;
}

// Relocation arc data - flight paths that arc ABOVE the globe
interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
  color: string;
  stroke: number;
  label: string;
}

// Destination point data
interface PointData {
  lat: number;
  lng: number;
  size: number;
  color: string;
  label: string;
  ring?: boolean;
}

// Generate a vertical planetary line (like MC/IC lines in astrocartography)
// These run roughly north-south through specific longitudes
const generatePlanetaryLine = (longitude: number, color: string, name: string): PathData => {
  const coords: [number, number][] = [];
  // Create a line from -70 to 70 latitude
  for (let lat = -70; lat <= 70; lat += 5) {
    // Add slight curve to make it look like a real astro line
    const curve = Math.sin((lat / 70) * Math.PI) * 8;
    coords.push([lat, longitude + curve]);
  }
  return { coords, color, stroke: 2, name };
};

// Demo planetary lines - representing MC lines for each planet
const DEMO_LINES: Record<DemoMode, PathData[]> = {
  love: [
    // Venus MC line running through Bali/Southeast Asia
    generatePlanetaryLine(115, 'rgba(255, 182, 193, 0.9)', 'Venus MC'),
    // Venus DC line
    generatePlanetaryLine(105, 'rgba(255, 182, 193, 0.5)', 'Venus DC'),
  ],
  career: [
    // Sun MC line running through Tokyo/East Asia
    generatePlanetaryLine(139, 'rgba(255, 215, 0, 0.9)', 'Sun MC'),
    // Sun IC line
    generatePlanetaryLine(149, 'rgba(255, 215, 0, 0.5)', 'Sun IC'),
  ],
  home: [
    // Moon MC line running through Sydney/Australia
    generatePlanetaryLine(151, 'rgba(192, 192, 220, 0.9)', 'Moon MC'),
    // Moon AC line
    generatePlanetaryLine(141, 'rgba(192, 192, 220, 0.5)', 'Moon AC'),
  ],
};

// Relocation arcs - "fly here for X" journeys
const DEMO_ARCS: Record<DemoMode, ArcData[]> = {
  love: [
    // From New York to Bali - "Relocate here for love"
    {
      startLat: 40.7128, startLng: -74.0060,
      endLat: -8.4095, endLng: 115.1889,
      color: 'rgba(255, 182, 193, 0.85)',
      stroke: 2.5,
      label: 'Relocate for Love'
    },
  ],
  career: [
    // From London to Tokyo - "Relocate here for career"
    {
      startLat: 51.5074, startLng: -0.1278,
      endLat: 35.6762, endLng: 139.6503,
      color: 'rgba(255, 215, 0, 0.85)',
      stroke: 2.5,
      label: 'Relocate for Career'
    },
  ],
  home: [
    // From Berlin to Sydney - "Relocate here for home"
    {
      startLat: 52.5200, startLng: 13.4050,
      endLat: -33.8688, endLng: 151.2093,
      color: 'rgba(192, 192, 220, 0.85)',
      stroke: 2.5,
      label: 'Relocate for Home'
    },
  ],
};

// Points of interest - destination cities + origin cities
const DEMO_POINTS: Record<DemoMode, PointData[]> = {
  love: [
    // Destination - on the Venus line
    { lat: -8.4095, lng: 115.1889, size: 0.6, color: 'rgba(255, 182, 193, 1)', label: 'Bali', ring: true },
    // Origin
    { lat: 40.7128, lng: -74.0060, size: 0.3, color: 'rgba(255, 255, 255, 0.7)', label: 'New York' },
  ],
  career: [
    // Destination - on the Sun line
    { lat: 35.6762, lng: 139.6503, size: 0.6, color: 'rgba(255, 215, 0, 1)', label: 'Tokyo', ring: true },
    // Origin
    { lat: 51.5074, lng: -0.1278, size: 0.3, color: 'rgba(255, 255, 255, 0.7)', label: 'London' },
  ],
  home: [
    // Destination - on the Moon line
    { lat: -33.8688, lng: 151.2093, size: 0.6, color: 'rgba(192, 192, 220, 1)', label: 'Sydney', ring: true },
    // Origin
    { lat: 52.5200, lng: 13.4050, size: 0.3, color: 'rgba(255, 255, 255, 0.7)', label: 'Berlin' },
  ],
};

// Demo content text - benefit-driven copy
const DEMO_CONTENT: Record<DemoMode, { title: string; subtitle: string; description: string }> = {
  love: {
    title: 'Scout Any ZIP',
    subtitle: 'Enter any ZIP code or address',
    description: 'Just enter a ZIP code to discover the harmony potential of any area. We analyze parcel data and orientation to give you instant Vastu insights.',
  },
  career: {
    title: 'Compare Properties',
    subtitle: 'Side-by-side parcel analysis',
    description: 'Looking at multiple properties? Compare their harmony scores using real parcel boundaries to find the one with the best energy flow.',
  },
  home: {
    title: 'Get Remedies',
    subtitle: 'Actionable improvements',
    description: 'Every property lookup includes practical Vastu remedies to enhance harmony — even in spaces that weren\'t built with Vastu in mind.',
  },
};

const DemoButton = memo(({
  mode,
  isActive,
  onClick
}: {
  mode: DemoMode;
  isActive: boolean;
  onClick: () => void;
}) => {
  const icons = {
    love: <Compass className="w-4 h-4" />,
    career: <Scale className="w-4 h-4" />,
    home: <Sparkles className="w-4 h-4" />,
  };

  const labels = {
    love: 'Scout',
    career: 'Compare',
    home: 'Remedies',
  };

  return (
    <button
      onClick={onClick}
      className={`demo-mode-btn ${isActive ? 'active' : ''} demo-mode-${mode}`}
    >
      {icons[mode]}
      <span>{labels[mode]}</span>
    </button>
  );
});

// Globe loading skeleton
const GlobeSkeleton = () => (
  <div className="globe-skeleton">
    <div className="globe-skeleton-sphere" />
  </div>
);

export const LandingGlobeDemo = memo(() => {
  const [activeDemo, setActiveDemo] = useState<DemoMode>('love');
  const [isInView, setIsInView] = useState(false);
  const [isGlobeReady, setIsGlobeReady] = useState(false);
  const globeRef = useRef<GlobeMethods>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-cycle demos every 6 seconds
  useEffect(() => {
    if (!isInView) return;

    const interval = setInterval(() => {
      setActiveDemo((prev) => {
        if (prev === 'love') return 'career';
        if (prev === 'career') return 'home';
        return 'love';
      });
    }, 6000);

    return () => clearInterval(interval);
  }, [isInView]);

  // Intersection observer to only render when in view
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInView(entry.isIntersecting);
      },
      { rootMargin: '200px', threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Configure globe controls when ready
  useEffect(() => {
    if (!globeRef.current || !isGlobeReady) return;

    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.3;
      controls.enableZoom = false;
      controls.enablePan = false;
      // Limit rotation to prevent disorienting views
      controls.minPolarAngle = Math.PI / 3;
      controls.maxPolarAngle = Math.PI / 1.5;
    }

    // Set initial view angle - show the destination region
    globeRef.current.pointOfView({ lat: 10, lng: 80, altitude: 2.2 }, 0);
  }, [isGlobeReady]);

  // Rotate to show relevant region when demo changes
  useEffect(() => {
    if (!globeRef.current || !isGlobeReady) return;

    const viewPoints: Record<DemoMode, { lat: number; lng: number }> = {
      love: { lat: 0, lng: 100 },    // View towards Bali/Southeast Asia
      career: { lat: 25, lng: 120 }, // View towards Tokyo/East Asia
      home: { lat: -20, lng: 140 },  // View towards Sydney/Australia
    };

    const target = viewPoints[activeDemo];
    globeRef.current.pointOfView({ ...target, altitude: 2.2 }, 1000);
  }, [activeDemo, isGlobeReady]);

  // Current data for active demo
  const pathsData = useMemo(() => DEMO_LINES[activeDemo], [activeDemo]);
  const arcsData = useMemo(() => DEMO_ARCS[activeDemo], [activeDemo]);
  const pointsData = useMemo(() => DEMO_POINTS[activeDemo], [activeDemo]);
  const ringsData = useMemo(() => pointsData.filter(p => p.ring), [pointsData]);

  // Glow color based on mode
  const glowClass = `globe-glow-${activeDemo}`;

  return (
    <section className="globe-demo-section" ref={containerRef}>
      <div className="globe-demo-container">
        {/* Left side - Content */}
        <div className="globe-demo-content">
          <h2 className="globe-demo-title text-gradient">
            Scout Any Location<br />In Seconds
          </h2>

          <p className="globe-demo-intro">
            Enter any ZIP code or address to analyze property harmony. We use real parcel data to deliver instant Vastu insights.
          </p>

          <div className="globe-demo-divider" />

          {/* Demo mode buttons */}
          <div className="demo-mode-buttons">
            {(['love', 'career', 'home'] as DemoMode[]).map((mode) => (
              <DemoButton
                key={mode}
                mode={mode}
                isActive={activeDemo === mode}
                onClick={() => setActiveDemo(mode)}
              />
            ))}
          </div>

          {/* Dynamic description */}
          <div className="demo-description">
            <h3 className={`demo-description-title demo-title-${activeDemo}`}>
              {DEMO_CONTENT[activeDemo].title}
            </h3>
            <p className="demo-subtitle">
              <MapPin className="w-4 h-4 inline mr-2" />
              {DEMO_CONTENT[activeDemo].subtitle}
            </p>
            <p className="demo-description-text">
              {DEMO_CONTENT[activeDemo].description}
            </p>
          </div>

          <a href="/guest" className="demo-cta">
            Scout Your First ZIP Free
            <span className="demo-cta-arrow">→</span>
          </a>
        </div>

        {/* Right side - Globe */}
        <div className={`globe-demo-wrapper ${glowClass}`}>
          {isInView && (
            <Suspense fallback={<GlobeSkeleton />}>
              <Globe
                ref={globeRef}
                width={500}
                height={500}
                backgroundColor="rgba(0,0,0,0)"
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"

                // Planetary lines ON the globe surface
                pathsData={pathsData}
                pathPoints="coords"
                pathPointLat={(p: [number, number]) => p[0]}
                pathPointLng={(p: [number, number]) => p[1]}
                pathColor={(d: object) => (d as PathData).color}
                pathStroke={(d: object) => (d as PathData).stroke}
                pathDashLength={0.5}
                pathDashGap={0.1}
                pathDashAnimateTime={5000}

                // Relocation arcs ABOVE the globe (flight paths)
                arcsData={arcsData}
                arcColor={(d: object) => (d as ArcData).color}
                arcStroke={(d: object) => (d as ArcData).stroke}
                arcAltitude={0.35}
                arcAltitudeAutoScale={0.3}
                arcDashLength={0.5}
                arcDashGap={0.2}
                arcDashAnimateTime={2000}

                // Destination points
                pointsData={pointsData}
                pointColor={(d: object) => (d as PointData).color}
                pointAltitude={0.01}
                pointRadius={(d: object) => (d as PointData).size}

                // Pulsing rings around destinations
                ringsData={ringsData}
                ringColor={() =>
                  activeDemo === 'love' ? 'rgba(255, 182, 193, 0.6)' :
                  activeDemo === 'career' ? 'rgba(255, 215, 0, 0.6)' :
                  'rgba(192, 192, 220, 0.6)'
                }
                ringMaxRadius={3}
                ringPropagationSpeed={2}
                ringRepeatPeriod={1500}

                // Atmosphere
                atmosphereColor={
                  activeDemo === 'love' ? 'rgba(255, 182, 193, 0.2)' :
                  activeDemo === 'career' ? 'rgba(255, 215, 0, 0.2)' :
                  'rgba(192, 192, 220, 0.2)'
                }
                atmosphereAltitude={0.15}

                // Callbacks
                onGlobeReady={() => setIsGlobeReady(true)}
              />
            </Suspense>
          )}
        </div>
      </div>
    </section>
  );
});

export default LandingGlobeDemo;
