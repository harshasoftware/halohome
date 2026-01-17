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

// Property data with building and entrance information
interface Building {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  entranceX: number;
  entranceY: number;
  entranceDirection: 'north' | 'south' | 'east' | 'west';
  shape: 'rectangle' | 'square' | 'L-shaped' | 'irregular';
  // For L-shaped: additional dimensions
  lShapeWidth?: number;
  lShapeHeight?: number;
  // For irregular: polygon points relative to x,y
  polygonPoints?: Array<{ x: number; y: number }>;
}

interface Property {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  address: string;
  building: Building;
  shape: 'rectangle' | 'L-shaped' | 'irregular' | 'trapezoid';
  // For L-shaped property
  lShapeWidth?: number;
  lShapeHeight?: number;
  // For irregular/trapezoid: polygon points relative to x,y
  polygonPoints?: Array<{ x: number; y: number }>;
}

// Mock properties with varied shapes - Regrid-style layout
const MOCK_PROPERTIES: Property[] = [
  { 
    id: 1, x: 30, y: 30, width: 100, height: 80, address: '123 Oak St', shape: 'rectangle',
    building: { id: 'b1', x: 40, y: 45, width: 60, height: 50, entranceX: 70, entranceY: 45, entranceDirection: 'north', shape: 'rectangle' }
  },
  { 
    id: 2, x: 150, y: 35, width: 95, height: 75, address: '456 Maple Ave', shape: 'L-shaped',
    lShapeWidth: 60, lShapeHeight: 40,
    building: { id: 'b2', x: 160, y: 50, width: 45, height: 45, entranceX: 182, entranceY: 50, entranceDirection: 'north', shape: 'square' }
  },
  { 
    id: 3, x: 270, y: 40, width: 90, height: 70, address: '789 Pine Rd', shape: 'irregular',
    polygonPoints: [{ x: 0, y: 0 }, { x: 90, y: 10 }, { x: 85, y: 70 }, { x: 5, y: 65 }],
    building: { id: 'b3', x: 285, y: 55, width: 60, height: 40, entranceX: 315, entranceY: 55, entranceDirection: 'south', shape: 'rectangle' }
  },
  { 
    id: 4, x: 380, y: 45, width: 85, height: 65, address: '101 Main St', shape: 'trapezoid',
    polygonPoints: [{ x: 0, y: 0 }, { x: 85, y: 5 }, { x: 80, y: 65 }, { x: 5, y: 60 }],
    building: { id: 'b4', x: 395, y: 60, width: 55, height: 35, entranceX: 422, entranceY: 77, entranceDirection: 'west', shape: 'rectangle' }
  },
  { 
    id: 5, x: 35, y: 130, width: 105, height: 85, address: '321 Elm Dr', shape: 'rectangle',
    building: { id: 'b5', x: 50, y: 150, width: 50, height: 50, entranceX: 75, entranceY: 150, entranceDirection: 'north', shape: 'square' }
  },
  { 
    id: 6, x: 160, y: 140, width: 95, height: 75, address: '654 Birch Ln', shape: 'L-shaped',
    lShapeWidth: 55, lShapeHeight: 35,
    building: { id: 'b6', x: 175, y: 155, width: 60, height: 50, entranceX: 175, entranceY: 180, entranceDirection: 'east', shape: 'L-shaped',
      lShapeWidth: 30, lShapeHeight: 25 }
  },
  { 
    id: 7, x: 280, y: 135, width: 90, height: 70, address: '987 Cedar Way', shape: 'rectangle',
    building: { id: 'b7', x: 295, y: 150, width: 60, height: 40, entranceX: 325, entranceY: 150, entranceDirection: 'south', shape: 'rectangle' }
  },
  { 
    id: 8, x: 390, y: 145, width: 85, height: 65, address: '202 Park Ave', shape: 'irregular',
    polygonPoints: [{ x: 0, y: 0 }, { x: 85, y: 0 }, { x: 75, y: 65 }, { x: 10, y: 60 }],
    building: { id: 'b8', x: 405, y: 160, width: 55, height: 35, entranceX: 432, entranceY: 177, entranceDirection: 'west', shape: 'rectangle' }
  },
  { 
    id: 9, x: 40, y: 240, width: 100, height: 80, address: '147 Spruce St', shape: 'rectangle',
    building: { id: 'b9', x: 55, y: 260, width: 65, height: 50, entranceX: 87, entranceY: 260, entranceDirection: 'north', shape: 'rectangle' }
  },
  { 
    id: 10, x: 170, y: 245, width: 95, height: 75, address: '258 Willow Ave', shape: 'L-shaped',
    lShapeWidth: 50, lShapeHeight: 30,
    building: { id: 'b10', x: 185, y: 260, width: 60, height: 45, entranceX: 185, entranceY: 282, entranceDirection: 'east', shape: 'square' }
  },
  { 
    id: 11, x: 290, y: 250, width: 90, height: 70, address: '369 Pine St', shape: 'trapezoid',
    polygonPoints: [{ x: 0, y: 5 }, { x: 90, y: 0 }, { x: 85, y: 70 }, { x: 5, y: 65 }],
    building: { id: 'b11', x: 305, y: 265, width: 60, height: 40, entranceX: 335, entranceY: 265, entranceDirection: 'south', shape: 'rectangle' }
  },
  { 
    id: 12, x: 400, y: 255, width: 85, height: 65, address: '470 Oak Ave', shape: 'rectangle',
    building: { id: 'b12', x: 415, y: 270, width: 55, height: 35, entranceX: 442, entranceY: 287, entranceDirection: 'west', shape: 'L-shaped',
      lShapeWidth: 25, lShapeHeight: 20 }
  },
];

// Regrid-style boundary detection visualization
const ZipDemoScanningVisualization = memo(() => {
  const [currentProperty, setCurrentProperty] = useState(0);
  const [detectionStage, setDetectionStage] = useState<'property' | 'building' | 'entrance'>('property');
  const [isAnimating, setIsAnimating] = useState(true);

  useEffect(() => {
    if (!isAnimating) return;

    // Cycle through detection stages
    const stageInterval = setInterval(() => {
      setDetectionStage((prev) => {
        if (prev === 'property') return 'building';
        if (prev === 'building') return 'entrance';
        return 'property';
      });
    }, 1500);

    // Change property every 4.5 seconds (3 stages × 1.5s)
    const propertyInterval = setInterval(() => {
      setCurrentProperty((prev) => (prev + 1) % MOCK_PROPERTIES.length);
      setDetectionStage('property'); // Reset to property stage
    }, 4500);

    return () => {
      clearInterval(stageInterval);
      clearInterval(propertyInterval);
    };
  }, [isAnimating]);

  const property = MOCK_PROPERTIES[currentProperty];
  const propertyCenterX = property.x + property.width / 2;
  const propertyCenterY = property.y + property.height / 2;
  const viewportX = propertyCenterX - 250;
  const viewportY = propertyCenterY - 200;

  return (
    <div className="regrid-demo-container">
      <div 
        className="regrid-demo-viewport"
        style={{
          transform: `translate(${-viewportX}px, ${-viewportY}px) scale(1.1)`,
          transition: 'transform 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Street grid background - Regrid style */}
        <div className="regrid-street-grid">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={`h-${i}`} className="regrid-street horizontal" style={{ top: `${i * 40}px` }} />
          ))}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={`v-${i}`} className="regrid-street vertical" style={{ left: `${i * 62.5}px` }} />
          ))}
        </div>

        {/* Properties - Regrid parcel boundaries with varied shapes */}
        {MOCK_PROPERTIES.map((prop) => {
          const isActive = currentProperty === prop.id - 1;
          const showPropertyBoundary = isActive && (detectionStage === 'property' || detectionStage === 'building' || detectionStage === 'entrance');
          const showBuilding = isActive && (detectionStage === 'building' || detectionStage === 'entrance');
          const showEntrance = isActive && detectionStage === 'entrance';

          // Generate polygon path for irregular/trapezoid properties
          const getPropertyClipPath = () => {
            if (prop.shape === 'irregular' && prop.polygonPoints) {
              return `polygon(${prop.polygonPoints.map(p => `${p.x}px ${p.y}px`).join(', ')})`;
            }
            if (prop.shape === 'trapezoid' && prop.polygonPoints) {
              return `polygon(${prop.polygonPoints.map(p => `${p.x}px ${p.y}px`).join(', ')})`;
            }
            if (prop.shape === 'L-shaped' && prop.lShapeWidth && prop.lShapeHeight) {
              return `polygon(0 0, ${prop.width}px 0, ${prop.width}px ${prop.lShapeHeight}px, ${prop.lShapeWidth}px ${prop.lShapeHeight}px, ${prop.lShapeWidth}px ${prop.height}px, 0 ${prop.height}px)`;
            }
            return 'none';
          };

          // Generate building clip path
          const getBuildingClipPath = () => {
            if (prop.building.shape === 'L-shaped' && prop.building.lShapeWidth && prop.building.lShapeHeight) {
              return `polygon(0 0, ${prop.building.width}px 0, ${prop.building.width}px ${prop.building.lShapeHeight}px, ${prop.building.lShapeWidth}px ${prop.building.lShapeHeight}px, ${prop.building.lShapeWidth}px ${prop.building.height}px, 0 ${prop.building.height}px)`;
            }
            if (prop.building.shape === 'irregular' && prop.building.polygonPoints) {
              return `polygon(${prop.building.polygonPoints.map(p => `${p.x}px ${p.y}px`).join(', ')})`;
            }
            return 'none';
          };

          return (
            <div
              key={prop.id}
              className={`regrid-property regrid-property-${prop.shape}`}
              style={{
                left: `${prop.x}px`,
                top: `${prop.y}px`,
                width: `${prop.width}px`,
                height: `${prop.height}px`,
                clipPath: getPropertyClipPath(),
                WebkitClipPath: getPropertyClipPath(),
              }}
            >
              {/* Property boundary */}
              {showPropertyBoundary && (
                <div className={`regrid-property-boundary ${detectionStage === 'property' ? 'detecting' : 'detected'}`} />
              )}

              {/* Building boundary inside property */}
              {showBuilding && (
                <div 
                  className={`regrid-building regrid-building-${prop.building.shape} ${detectionStage === 'building' ? 'detecting' : 'detected'}`}
                  style={{
                    left: `${prop.building.x - prop.x}px`,
                    top: `${prop.building.y - prop.y}px`,
                    width: `${prop.building.width}px`,
                    height: `${prop.building.height}px`,
                    clipPath: getBuildingClipPath(),
                    WebkitClipPath: getBuildingClipPath(),
                  }}
                />
              )}

              {/* Entrance detection */}
              {showEntrance && (
                <div 
                  className="regrid-entrance"
                  style={{
                    left: `${prop.building.entranceX - prop.x}px`,
                    top: `${prop.building.entranceY - prop.y}px`,
                  }}
                >
                  <div className="regrid-entrance-marker" />
                  <div className={`regrid-entrance-arrow regrid-entrance-${prop.building.entranceDirection}`} />
                </div>
              )}

              {/* Property label */}
              {isActive && (
                <div className="regrid-property-label">{prop.address}</div>
              )}
            </div>
          );
        })}

        {/* Detection overlay animation */}
        {detectionStage === 'property' && (() => {
          const getPropertyClipPath = () => {
            if (property.shape === 'irregular' && property.polygonPoints) {
              return `polygon(${property.polygonPoints.map(p => `${p.x}px ${p.y}px`).join(', ')})`;
            }
            if (property.shape === 'trapezoid' && property.polygonPoints) {
              return `polygon(${property.polygonPoints.map(p => `${p.x}px ${p.y}px`).join(', ')})`;
            }
            if (property.shape === 'L-shaped' && property.lShapeWidth && property.lShapeHeight) {
              return `polygon(0 0, ${property.width}px 0, ${property.width}px ${property.lShapeHeight}px, ${property.lShapeWidth}px ${property.lShapeHeight}px, ${property.lShapeWidth}px ${property.height}px, 0 ${property.height}px)`;
            }
            return 'none';
          };
          return (
            <div 
              className="regrid-detection-overlay property"
              style={{
                left: `${property.x}px`,
                top: `${property.y}px`,
                width: `${property.width}px`,
                height: `${property.height}px`,
                clipPath: getPropertyClipPath(),
                WebkitClipPath: getPropertyClipPath(),
              }}
            />
          );
        })()}
        {detectionStage === 'building' && (() => {
          const getBuildingClipPath = () => {
            if (property.building.shape === 'L-shaped' && property.building.lShapeWidth && property.building.lShapeHeight) {
              return `polygon(0 0, ${property.building.width}px 0, ${property.building.width}px ${property.building.lShapeHeight}px, ${property.building.lShapeWidth}px ${property.building.lShapeHeight}px, ${property.building.lShapeWidth}px ${property.building.height}px, 0 ${property.building.height}px)`;
            }
            if (property.building.shape === 'irregular' && property.building.polygonPoints) {
              return `polygon(${property.building.polygonPoints.map(p => `${p.x}px ${p.y}px`).join(', ')})`;
            }
            return 'none';
          };
          return (
            <div 
              className="regrid-detection-overlay building"
              style={{
                left: `${property.building.x}px`,
                top: `${property.building.y}px`,
                width: `${property.building.width}px`,
                height: `${property.building.height}px`,
                clipPath: getBuildingClipPath(),
                WebkitClipPath: getBuildingClipPath(),
              }}
            />
          );
        })()}
      </div>

      {/* Detection status indicator */}
      <div className="regrid-status-indicator">
        <MapPin className="w-4 h-4" />
        <span>
          {detectionStage === 'property' && 'Detecting Property Boundary...'}
          {detectionStage === 'building' && 'Detecting Building Boundary...'}
          {detectionStage === 'entrance' && 'Detecting Entrance...'}
        </span>
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
