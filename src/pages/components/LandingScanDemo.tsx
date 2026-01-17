/**
 * LandingScanDemo - iPhone LiDAR scanning and 3D interior layout demo
 *
 * Features:
 * - Shows iPhone scanning through a room
 * - Demonstrates 3D layout generation
 * - Displays interior design suggestions and remedies
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import { Smartphone, Scan, Box, Sparkles, ArrowRight } from 'lucide-react';

type ScanStage = 'scanning' | 'processing' | 'layout' | 'remedies';

const SCAN_STAGES: { id: ScanStage; title: string; icon: React.ReactNode }[] = [
  { id: 'scanning', title: 'Scanning Room', icon: <Scan className="w-4 h-4" /> },
  { id: 'processing', title: 'Processing', icon: <Box className="w-4 h-4" /> },
  { id: 'layout', title: '3D Layout', icon: <Smartphone className="w-4 h-4" /> },
  { id: 'remedies', title: 'Remedies', icon: <Sparkles className="w-4 h-4" /> },
];

const STAGE_DESCRIPTIONS: Record<ScanStage, string> = {
  scanning: "Use your iPhone's LiDAR to scan the room. Walk around and let the app capture the space.",
  processing: "Our AI processes the scan data to create an accurate 3D model of your interior.",
  layout: "View your room in 3D with precise measurements and Vastu zone analysis.",
  remedies: "Get personalized interior design suggestions and remedies based on your room's layout.",
};

// Mock room layout data
interface RoomPoint {
  x: number;
  y: number;
  z: number;
}

interface Furniture {
  id: string;
  type: 'bed' | 'desk' | 'sofa' | 'table' | 'chair';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
}

const MOCK_FURNITURE: Furniture[] = [
  { id: '1', type: 'bed', x: 30, y: 40, width: 60, height: 50, rotation: 0 },
  { id: '2', type: 'desk', x: 70, y: 20, width: 40, height: 25, rotation: 90 },
  { id: '3', type: 'chair', x: 75, y: 25, width: 15, height: 15, rotation: 0 },
];

const REMEDIES = [
  { id: 1, text: 'Move bed to Southwest corner for better sleep', zone: 'SW' },
  { id: 2, text: 'Add plants in Northeast for prosperity', zone: 'NE' },
  { id: 3, text: 'Place desk facing East for career growth', zone: 'E' },
];

// Animated visualization for each stage
const ScanVisualization = memo(({ stage }: { stage: ScanStage }) => {
  const [scanProgress, setScanProgress] = useState(0);
  const [points, setPoints] = useState<RoomPoint[]>([]);
  const [showLayout, setShowLayout] = useState(false);
  const [showRemedies, setShowRemedies] = useState(false);

  useEffect(() => {
    if (stage === 'scanning') {
      setScanProgress(0);
      setPoints([]);
      setShowLayout(false);
      setShowRemedies(false);

      // Simulate scanning points
      const interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 2;
        });

        // Add random points as scanning progresses
        if (Math.random() > 0.7) {
          setPoints((prev) => [
            ...prev,
            {
              x: Math.random() * 100,
              y: Math.random() * 100,
              z: Math.random() * 50,
            },
          ]);
        }
      }, 50);

      return () => clearInterval(interval);
    } else if (stage === 'processing') {
      setScanProgress(0);
      const interval = setInterval(() => {
        setScanProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            return 100;
          }
          return prev + 3;
        });
      }, 30);

      return () => clearInterval(interval);
    } else if (stage === 'layout') {
      setShowLayout(true);
      setShowRemedies(false);
    } else if (stage === 'remedies') {
      setShowLayout(true);
      setShowRemedies(true);
    }
  }, [stage]);

  return (
    <div className="scan-demo-visualization">
      {/* iPhone mockup */}
      <div className="scan-phone-mockup">
        <div className="scan-phone-screen">
          {stage === 'scanning' && (
            <div className="scan-viewport">
              {/* Scanning grid */}
              <div className="scan-grid" />
              
              {/* LiDAR points */}
              <div className="scan-points">
                {points.map((point, i) => (
                  <div
                    key={i}
                    className="scan-point"
                    style={{
                      left: `${point.x}%`,
                      top: `${point.y}%`,
                      opacity: Math.min(1, point.z / 50),
                    }}
                  />
                ))}
              </div>

              {/* Scanning progress overlay */}
              <div className="scan-progress-overlay">
                <div className="scan-progress-bar" style={{ width: `${scanProgress}%` }} />
                <div className="scan-progress-text">{Math.round(scanProgress)}%</div>
              </div>

              {/* Scanning indicator */}
              <div className="scan-indicator">
                <Scan className="w-6 h-6 animate-pulse" />
                <span>Scanning...</span>
              </div>
            </div>
          )}

          {stage === 'processing' && (
            <div className="scan-viewport processing">
              <div className="processing-animation">
                <Box className="w-16 h-16 animate-spin" />
                <div className="processing-text">Processing 3D data...</div>
                <div className="processing-progress">
                  <div className="processing-bar" style={{ width: `${scanProgress}%` }} />
                </div>
              </div>
            </div>
          )}

          {(stage === 'layout' || stage === 'remedies') && (
            <div className="scan-viewport layout">
              {/* 3D room layout */}
              <div className="room-layout">
                {/* Room outline */}
                <div className="room-outline" />
                
                {/* Furniture */}
                {MOCK_FURNITURE.map((furniture) => (
                  <div
                    key={furniture.id}
                    className={`furniture-item furniture-${furniture.type}`}
                    style={{
                      left: `${furniture.x}%`,
                      top: `${furniture.y}%`,
                      width: `${furniture.width}%`,
                      height: `${furniture.height}%`,
                      transform: `rotate(${furniture.rotation}deg)`,
                    }}
                  />
                ))}

                {/* Vastu zones overlay */}
                {showRemedies && (
                  <div className="vastu-zones-overlay">
                    <div className="vastu-zone zone-ne">NE</div>
                    <div className="vastu-zone zone-sw">SW</div>
                    <div className="vastu-zone zone-e">E</div>
                  </div>
                )}
              </div>

              {/* Remedies list */}
              {showRemedies && (
                <div className="remedies-list">
                  {REMEDIES.map((remedy) => (
                    <div key={remedy.id} className="remedy-item">
                      <Sparkles className="w-4 h-4" />
                      <span>{remedy.text}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

const StageButton = memo(({
  stage,
  isActive,
  onClick
}: {
  stage: typeof SCAN_STAGES[0];
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`scan-stage-btn ${isActive ? 'active' : ''}`}
  >
    {stage.icon}
    <span>{stage.title}</span>
  </button>
));

export const LandingScanDemo = memo(() => {
  const [activeStage, setActiveStage] = useState<ScanStage>('scanning');
  const [isInView, setIsInView] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Intersection observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      ([entry]) => setIsInView(entry.isIntersecting),
      { rootMargin: '100px', threshold: 0.1 }
    );

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  // Auto-cycle stages when in view
  useEffect(() => {
    if (!isInView) return;

    const interval = setInterval(() => {
      setActiveStage((prev) => {
        const currentIndex = SCAN_STAGES.findIndex(s => s.id === prev);
        const nextIndex = (currentIndex + 1) % SCAN_STAGES.length;
        return SCAN_STAGES[nextIndex].id;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isInView]);

  return (
    <section className="scan-demo-section" ref={containerRef}>
      <div className="scan-demo-container">
        {/* Left side - Content */}
        <div className="scan-demo-content">
          <h2 className="scan-demo-title text-gradient">
            Scan: 3D Interior<br />Analysis
          </h2>

          <div className="scan-demo-divider" />

          <p className="scan-demo-intro">
            <Smartphone className="w-4 h-4 inline mr-2" />
            iPhone LiDAR scanning meets Vastu analysis.
          </p>

          <p className="scan-demo-text">
            Use your iPhone Pro's LiDAR to scan any room. We create an accurate 3D model
            and provide room-by-room harmony analysis with personalized interior design remedies.
          </p>

          {/* Stage buttons */}
          <div className="scan-stage-buttons">
            {SCAN_STAGES.map((stage) => (
              <StageButton
                key={stage.id}
                stage={stage}
                isActive={activeStage === stage.id}
                onClick={() => setActiveStage(stage.id)}
              />
            ))}
          </div>

          {/* Current stage description */}
          <div className="scan-stage-description">
            <p>{STAGE_DESCRIPTIONS[activeStage]}</p>
          </div>

          <div className="scan-cta-group">
            <a href="/guest" className="demo-cta scan-cta">
              Join Waitlist
              <span className="demo-cta-arrow">→</span>
            </a>
          </div>
        </div>

        {/* Right side - Visualization */}
        <div className={`scan-demo-visual ${isInView ? 'animate' : ''}`}>
          <div className="scan-viz-container">
            <ScanVisualization stage={activeStage} />
          </div>
        </div>
      </div>
    </section>
  );
});

export default LandingScanDemo;
