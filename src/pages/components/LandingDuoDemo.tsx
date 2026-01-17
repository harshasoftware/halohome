/**
 * LandingDuoDemo - Property Comparison demo for landing page
 *
 * Features:
 * - Compare harmony scores of two properties side by side
 * - Interactive toggle between Property A, Property B, and Combined view
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import { Users, User, Heart, Sparkles, Home } from 'lucide-react';
import { Link } from 'react-router-dom';

type ViewMode = 'person-a' | 'person-b' | 'combined';

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

// Simple placeholder visualization
const DuoVisualization = memo(({ viewMode }: { viewMode: ViewMode }) => (
  <div className="duo-visualization">
    <div className={`duo-house duo-house-a ${viewMode === 'person-a' || viewMode === 'combined' ? 'active' : ''}`}>
      <Home className="w-12 h-12" />
      <span className="duo-score">82</span>
    </div>
    <div className={`duo-vs ${viewMode === 'combined' ? 'active' : ''}`}>VS</div>
    <div className={`duo-house duo-house-b ${viewMode === 'person-b' || viewMode === 'combined' ? 'active' : ''}`}>
      <Home className="w-12 h-12" />
      <span className="duo-score">74</span>
    </div>
  </div>
));

export const LandingDuoDemo = memo(() => {
  const [viewMode, setViewMode] = useState<ViewMode>('combined');
  const [isInView, setIsInView] = useState(false);
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

  return (
    <section id="duo-demo" className="duo-demo-section" ref={containerRef}>
      <div className="duo-demo-container">
        {/* Left side - Visualization */}
        <div className={`duo-visual-wrapper ${viewMode}`}>
          <DuoVisualization viewMode={viewMode} />
        </div>

        {/* Right side - Content */}
        <div className="duo-demo-content">
          <h2 className="duo-demo-title text-gradient">
            Compare Properties.<br />Choose Wisely.
          </h2>

          <div className="duo-demo-divider" />

          <p className="duo-demo-intro">
            <Users className="w-4 h-4 inline mr-2 text-pink-400" />
            Which property has better energy?
          </p>

          <p className="duo-demo-text">
            Deciding between two homes? Compare their harmony scores side by side.
            See which property has better Vastu alignment and make an informed decision.
          </p>

          {/* View mode buttons */}
          <div className="duo-view-buttons">
            <ViewButton
              mode="person-a"
              currentMode={viewMode}
              onClick={() => setViewMode('person-a')}
              icon={<User className="w-4 h-4" />}
              label="Property A"
              color="#FFB6C1"
            />
            <ViewButton
              mode="person-b"
              currentMode={viewMode}
              onClick={() => setViewMode('person-b')}
              icon={<User className="w-4 h-4" />}
              label="Property B"
              color="#FFD700"
            />
            <ViewButton
              mode="combined"
              currentMode={viewMode}
              onClick={() => setViewMode('combined')}
              icon={<Heart className="w-4 h-4" />}
              label="Compare"
              color="#FF6496"
            />
          </div>

          {/* Dynamic explanation */}
          <div className="duo-explanation">
            {viewMode === 'person-a' && (
              <p>
                <Sparkles className="w-4 h-4 inline mr-2 text-pink-300" />
                Property A has strong Northeast energy — great for growth and prosperity.
              </p>
            )}
            {viewMode === 'person-b' && (
              <p>
                <Sparkles className="w-4 h-4 inline mr-2 text-yellow-300" />
                Property B has balanced Southwest — excellent for stability and relationships.
              </p>
            )}
            {viewMode === 'combined' && (
              <p>
                <Sparkles className="w-4 h-4 inline mr-2 text-pink-400" />
                <strong>Property A wins</strong> with a harmony score of 82 vs 74. Better overall energy balance.
              </p>
            )}
          </div>

          <div className="duo-cta-group">
            <a href="/guest" className="demo-cta duo-cta">
              Compare Properties Free
              <span className="demo-cta-arrow">→</span>
            </a>
            <Link to="/blog/methodology" className="duo-learn-link">
              How it works →
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
});

export default LandingDuoDemo;
