/**
 * LandingDuoDemo - Duo Compatibility demo for landing page
 *
 * Features:
 * - Two people's planetary lines merged on a 3D globe
 * - Shows overlapping zones where both people benefit
 * - Interactive toggle between Person A, Person B, and Combined view
 */

import React, { useState, useEffect, useRef, useMemo, memo, lazy, Suspense } from 'react';
import type { GlobeMethods } from 'react-globe.gl';
import { Users, User, Heart, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

// Lazy load Globe
const Globe = lazy(() => import('react-globe.gl'));

type ViewMode = 'person-a' | 'person-b' | 'combined';

interface PathData {
  coords: [number, number][];
  color: string;
  stroke: number;
  name: string;
}

interface PointData {
  lat: number;
  lng: number;
  size: number;
  color: string;
  label: string;
  ring?: boolean;
}

// Person A's planetary lines (Venus-focused for love)
const generatePersonALines = (): PathData[] => {
  const venusLine: [number, number][] = [];
  const moonLine: [number, number][] = [];

  // Venus MC line through Mediterranean/Europe
  for (let lat = -60; lat <= 60; lat += 5) {
    const curve = Math.sin((lat / 60) * Math.PI) * 10;
    venusLine.push([lat, 15 + curve]);
  }

  // Moon line through Southeast Asia
  for (let lat = -60; lat <= 60; lat += 5) {
    const curve = Math.sin((lat / 60) * Math.PI) * 8;
    moonLine.push([lat, 105 + curve]);
  }

  return [
    { coords: venusLine, color: 'rgba(255, 182, 193, 0.9)', stroke: 2.5, name: 'Venus MC' },
    { coords: moonLine, color: 'rgba(192, 192, 220, 0.7)', stroke: 2, name: 'Moon MC' },
  ];
};

// Person B's planetary lines (Sun-focused for vitality)
const generatePersonBLines = (): PathData[] => {
  const sunLine: [number, number][] = [];
  const jupiterLine: [number, number][] = [];

  // Sun MC line through Mediterranean (overlaps with Person A's Venus!)
  for (let lat = -60; lat <= 60; lat += 5) {
    const curve = Math.sin((lat / 60) * Math.PI) * 12;
    sunLine.push([lat, 20 + curve]);
  }

  // Jupiter line through Australia
  for (let lat = -60; lat <= 60; lat += 5) {
    const curve = Math.sin((lat / 60) * Math.PI) * 6;
    jupiterLine.push([lat, 145 + curve]);
  }

  return [
    { coords: sunLine, color: 'rgba(255, 215, 0, 0.9)', stroke: 2.5, name: 'Sun MC' },
    { coords: jupiterLine, color: 'rgba(222, 184, 135, 0.7)', stroke: 2, name: 'Jupiter MC' },
  ];
};

// Best spots for the duo (where lines overlap/intersect)
const DUO_HOTSPOTS: PointData[] = [
  // Mediterranean overlap zone - Venus meets Sun
  { lat: 41.9028, lng: 12.4964, size: 0.7, color: 'rgba(255, 100, 150, 1)', label: 'Rome', ring: true },
  { lat: 37.9838, lng: 23.7275, size: 0.6, color: 'rgba(255, 100, 150, 1)', label: 'Athens', ring: true },
  // Secondary spots
  { lat: 35.6762, lng: 139.6503, size: 0.4, color: 'rgba(255, 255, 255, 0.6)', label: 'Tokyo' },
  { lat: -8.4095, lng: 115.1889, size: 0.4, color: 'rgba(255, 255, 255, 0.6)', label: 'Bali' },
];

const PERSON_A_LINES = generatePersonALines();
const PERSON_B_LINES = generatePersonBLines();
const COMBINED_LINES = [...PERSON_A_LINES, ...PERSON_B_LINES];

const ViewButton = memo(({
  mode,
  currentMode,
  onClick,
  icon,
  label,
  color,
}: {
  mode: ViewMode;
  currentMode: ViewMode;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  color: string;
}) => (
  <button
    onClick={onClick}
    className={`duo-view-btn ${currentMode === mode ? 'active' : ''}`}
    style={{ '--btn-color': color } as React.CSSProperties}
  >
    {icon}
    <span>{label}</span>
  </button>
));

const GlobeSkeleton = () => (
  <div className="globe-skeleton">
    <div className="globe-skeleton-sphere" />
  </div>
);

export const LandingDuoDemo = memo(() => {
  const [viewMode, setViewMode] = useState<ViewMode>('combined');
  const [isInView, setIsInView] = useState(false);
  const [isGlobeReady, setIsGlobeReady] = useState(false);
  const globeRef = useRef<GlobeMethods>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { rootMargin: '200px', threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Configure globe
  useEffect(() => {
    if (!globeRef.current || !isGlobeReady) return;

    const controls = globeRef.current.controls();
    if (controls) {
      controls.autoRotate = true;
      controls.autoRotateSpeed = 0.4;
      controls.enableZoom = false;
      controls.enablePan = false;
      controls.minPolarAngle = Math.PI / 3;
      controls.maxPolarAngle = Math.PI / 1.5;
    }

    // Focus on Mediterranean where lines overlap
    globeRef.current.pointOfView({ lat: 35, lng: 20, altitude: 2.0 }, 0);
  }, [isGlobeReady]);

  // Auto-cycle view modes
  useEffect(() => {
    if (!isInView) return;

    const interval = setInterval(() => {
      setViewMode((prev) => {
        if (prev === 'person-a') return 'person-b';
        if (prev === 'person-b') return 'combined';
        return 'person-a';
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isInView]);

  // Get paths based on view mode
  const pathsData = useMemo(() => {
    switch (viewMode) {
      case 'person-a':
        return PERSON_A_LINES;
      case 'person-b':
        return PERSON_B_LINES;
      case 'combined':
        return COMBINED_LINES;
    }
  }, [viewMode]);

  // Points and rings only show in combined view
  const pointsData = useMemo(() =>
    viewMode === 'combined' ? DUO_HOTSPOTS : [],
  [viewMode]);

  const ringsData = useMemo(() =>
    viewMode === 'combined' ? DUO_HOTSPOTS.filter(p => p.ring) : [],
  [viewMode]);

  return (
    <section id="duo-demo" className="duo-demo-section" ref={containerRef}>
      <div className="duo-demo-container">
        {/* Left side - Globe */}
        <div className={`duo-globe-wrapper ${viewMode}`}>
          {isInView && (
            <Suspense fallback={<GlobeSkeleton />}>
              <Globe
                ref={globeRef}
                width={480}
                height={480}
                backgroundColor="rgba(0,0,0,0)"
                globeImageUrl="//unpkg.com/three-globe/example/img/earth-night.jpg"

                // Planetary lines
                pathsData={pathsData}
                pathPoints="coords"
                pathPointLat={(p: [number, number]) => p[0]}
                pathPointLng={(p: [number, number]) => p[1]}
                pathColor={(d: object) => (d as PathData).color}
                pathStroke={(d: object) => (d as PathData).stroke}
                pathDashLength={0.5}
                pathDashGap={0.1}
                pathDashAnimateTime={4000}

                // Hotspot points
                pointsData={pointsData}
                pointColor={(d: object) => (d as PointData).color}
                pointAltitude={0.01}
                pointRadius={(d: object) => (d as PointData).size}

                // Pulsing rings at best spots
                ringsData={ringsData}
                ringColor={() => 'rgba(255, 100, 150, 0.7)'}
                ringMaxRadius={4}
                ringPropagationSpeed={2}
                ringRepeatPeriod={1200}

                // Atmosphere
                atmosphereColor={
                  viewMode === 'combined'
                    ? 'rgba(255, 100, 150, 0.25)'
                    : viewMode === 'person-a'
                    ? 'rgba(255, 182, 193, 0.2)'
                    : 'rgba(255, 215, 0, 0.2)'
                }
                atmosphereAltitude={0.15}

                onGlobeReady={() => setIsGlobeReady(true)}
              />
            </Suspense>
          )}
        </div>

        {/* Right side - Content */}
        <div className="duo-demo-content">
          <h2 className="duo-demo-title text-gradient">
            Travel Together.<br />Thrive Together.
          </h2>

          <div className="duo-demo-divider" />

          <p className="duo-demo-intro">
            <Users className="w-4 h-4 inline mr-2 text-pink-400" />
            Where do BOTH of you shine?
          </p>

          <p className="duo-demo-text">
            Planning a honeymoon? Relocating with a partner? Finding where to meet a long-distance love?
            See where your planetary lines overlap for the best shared experiences.
          </p>

          {/* View mode buttons */}
          <div className="duo-view-buttons">
            <ViewButton
              mode="person-a"
              currentMode={viewMode}
              onClick={() => setViewMode('person-a')}
              icon={<User className="w-4 h-4" />}
              label="You"
              color="#FFB6C1"
            />
            <ViewButton
              mode="person-b"
              currentMode={viewMode}
              onClick={() => setViewMode('person-b')}
              icon={<User className="w-4 h-4" />}
              label="Partner"
              color="#FFD700"
            />
            <ViewButton
              mode="combined"
              currentMode={viewMode}
              onClick={() => setViewMode('combined')}
              icon={<Heart className="w-4 h-4" />}
              label="Combined"
              color="#FF6496"
            />
          </div>

          {/* Dynamic explanation */}
          <div className="duo-explanation">
            {viewMode === 'person-a' && (
              <p>
                <Sparkles className="w-4 h-4 inline mr-2 text-pink-300" />
                Your lines show where YOU thrive — but is it good for them too?
              </p>
            )}
            {viewMode === 'person-b' && (
              <p>
                <Sparkles className="w-4 h-4 inline mr-2 text-yellow-300" />
                Their best spots might be different. That's why you need to see BOTH.
              </p>
            )}
            {viewMode === 'combined' && (
              <p>
                <Sparkles className="w-4 h-4 inline mr-2 text-pink-400" />
                <strong>Rome & Athens</strong> — Perfect for both of you. Your Venus meets their Sun here.
                Book that trip.
              </p>
            )}
          </div>

          <div className="duo-cta-group">
            <a href="/guest" className="demo-cta duo-cta">
              Compare Your Charts Free
              <span className="demo-cta-arrow">→</span>
            </a>
            <Link to="/blog/duo-mode" className="duo-learn-link">
              How it works →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
});

export default LandingDuoDemo;
