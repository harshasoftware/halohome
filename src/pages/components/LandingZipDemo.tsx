/**
 * LandingZipDemo - ZIP code scanning demo for landing page
 *
 * Features:
 * - Scout: ZIP code scanning with property-by-property analysis
 * - Interactive scanning animation showing parcel detection
 * - Auto-cycling demos for Scout, Compare, and Remedies
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import { Compass, Scale, Sparkles, MapPin } from 'lucide-react';

// Property data for scanning animation
interface Property {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  address: string;
}

// Mock properties in a ZIP code area - positioned to be visible in larger viewport
const MOCK_PROPERTIES: Property[] = [
  { id: 1, x: 30, y: 30, width: 90, height: 70, address: '123 Oak St' },
  { id: 2, x: 150, y: 35, width: 85, height: 65, address: '456 Maple Ave' },
  { id: 3, x: 270, y: 40, width: 80, height: 60, address: '789 Pine Rd' },
  { id: 4, x: 380, y: 45, width: 75, height: 55, address: '101 Main St' },
  { id: 5, x: 35, y: 130, width: 95, height: 75, address: '321 Elm Dr' },
  { id: 6, x: 160, y: 140, width: 85, height: 65, address: '654 Birch Ln' },
  { id: 7, x: 280, y: 135, width: 80, height: 60, address: '987 Cedar Way' },
  { id: 8, x: 390, y: 145, width: 75, height: 55, address: '202 Park Ave' },
  { id: 9, x: 40, y: 240, width: 90, height: 70, address: '147 Spruce St' },
  { id: 10, x: 170, y: 245, width: 85, height: 65, address: '258 Willow Ave' },
  { id: 11, x: 290, y: 250, width: 80, height: 60, address: '369 Pine St' },
  { id: 12, x: 400, y: 255, width: 75, height: 55, address: '470 Oak Ave' },
];

// ZIP code scanning animation component
const ZipDemoScanningVisualization = memo(() => {
  const [currentProperty, setCurrentProperty] = useState(0);
  const [isScanning, setIsScanning] = useState(true);

  useEffect(() => {
    if (!isScanning) return;

    const interval = setInterval(() => {
      setCurrentProperty((prev) => (prev + 1) % MOCK_PROPERTIES.length);
    }, 2000); // Change property every 2 seconds

    return () => clearInterval(interval);
  }, [isScanning]);

  const property = MOCK_PROPERTIES[currentProperty];
  // Calculate viewport position to center the property
  // Viewport is 500px wide, so center at 250px
  // Viewport is 400px tall, so center at 200px
  const propertyCenterX = property.x + property.width / 2;
  const propertyCenterY = property.y + property.height / 2;
  const viewportX = propertyCenterX - 250; // Move viewport left to center property
  const viewportY = propertyCenterY - 200; // Move viewport up to center property

  return (
    <div className="scout-scan-container">
      <div 
        className="scout-scan-viewport"
        style={{
          transform: `translate(${-viewportX}px, ${-viewportY}px) scale(1.1)`,
          transition: 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Street grid background */}
        <div className="scout-scan-grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={`h-${i}`} className="scout-scan-street horizontal" style={{ top: `${i * 40}px` }} />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`v-${i}`} className="scout-scan-street vertical" style={{ left: `${i * 62.5}px` }} />
          ))}
        </div>

        {/* Properties */}
        {MOCK_PROPERTIES.map((prop) => (
          <div
            key={prop.id}
            className={`scout-scan-property ${currentProperty === prop.id - 1 ? 'highlighted' : ''}`}
            style={{
              left: `${prop.x}px`,
              top: `${prop.y}px`,
              width: `${prop.width}px`,
              height: `${prop.height}px`,
            }}
          >
            {currentProperty === prop.id - 1 && (
              <>
                <div className="scout-scan-bounding-box" />
                <div className="scout-scan-label">{prop.address}</div>
              </>
            )}
          </div>
        ))}

        {/* Scanning beam effect */}
        <div 
          className="scout-scan-beam"
          style={{
            left: `${property.x}px`,
            top: `${property.y}px`,
            width: `${property.width}px`,
            height: `${property.height}px`,
          }}
        />

        {/* Scanning line that moves across */}
        <div className="scout-scan-line" />
      </div>

      {/* ZIP code indicator */}
      <div className="scout-scan-zip-indicator">
        <MapPin className="w-4 h-4" />
        <span>Scanning ZIP: 90210</span>
      </div>
    </div>
  );
});

type DemoMode = 'love' | 'career' | 'home';

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


export const LandingZipDemo = memo(() => {
  const [activeDemo, setActiveDemo] = useState<DemoMode>('love');
  const [isInView, setIsInView] = useState(false);
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

  // Glow color based on mode
  const glowClass = `zip-demo-glow-${activeDemo}`;

  return (
    <section className="zip-demo-section" ref={containerRef}>
      <div className="zip-demo-container">
        {/* Left side - Content */}
        <div className="zip-demo-content">
          <h2 className="zip-demo-title text-gradient">
            Scout Any Location<br />In Seconds
          </h2>

          <p className="zip-demo-intro">
            Enter any ZIP code or address to analyze property harmony. We use real parcel data to deliver instant Vastu insights.
          </p>

          <div className="zip-demo-divider" />

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

        {/* Right side - Scanning Visualization */}
        <div className={`zip-demo-wrapper ${glowClass}`}>
          {isInView && (
            <div className="zip-scan-wrapper">
              <ZipDemoScanningVisualization />
            </div>
          )}
        </div>
      </div>
    </section>
  );
});

export default LandingZipDemo;
