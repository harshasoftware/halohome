/**
 * LandingScoutDemo - Scout precision demo for landing page
 *
 * Features:
 * - Step-by-step animated demonstration of precision
 * - Comparison with traditional astrocartography methods
 * - Highlights key accuracy advantages
 * - Links to detailed blog explanation
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import { Target, Sparkles, MapPin, TrendingUp, Waves, Scale } from 'lucide-react';

type DemoStep = 'distance' | 'decay' | 'scoring' | 'ranking';

const DEMO_STEPS: { id: DemoStep; title: string; icon: React.ReactNode }[] = [
  { id: 'distance', title: 'Geodetic Distance', icon: <Target className="w-4 h-4" /> },
  { id: 'decay', title: 'Influence Gradients', icon: <Waves className="w-4 h-4" /> },
  { id: 'scoring', title: 'Multi-Factor Analysis', icon: <Scale className="w-4 h-4" /> },
  { id: 'ranking', title: 'Intelligent Ranking', icon: <TrendingUp className="w-4 h-4" /> },
];

const STEP_DESCRIPTIONS: Record<DemoStep, string> = {
  distance: "True spherical geometry calculates your exact distance to each planetary line — not flat-map approximations that introduce 50km+ errors at high latitudes.",
  decay: "Planetary influence doesn't stop at arbitrary borders. We model smooth falloff for realistic influence zones, not binary on/off cutoffs.",
  scoring: "Each location gets scored for benefit, intensity, and stability — giving you a complete picture, not just 'good' or 'bad'.",
  ranking: "Diminishing returns weighting prevents one strong line from dominating. Your top spots truly balance all planetary factors.",
};

// Animated visualization for each step
const StepVisualization = memo(({ step }: { step: DemoStep }) => {
  return (
    <div className="scout-visualization">
      {step === 'distance' && (
        <div className="scout-viz-distance">
          <div className="scout-viz-globe">
            <div className="scout-viz-globe-surface" />
            <div className="scout-viz-arc" />
            <div className="scout-viz-city" />
            <div className="scout-viz-line" />
          </div>
          <div className="scout-viz-comparison">
            <div className="scout-viz-method bad">
              <span className="scout-viz-value">324km</span>
              <span className="scout-viz-label">Flat-map</span>
            </div>
            <div className="scout-viz-arrow">→</div>
            <div className="scout-viz-method good">
              <span className="scout-viz-value">298km</span>
              <span className="scout-viz-label">Spherical</span>
            </div>
          </div>
        </div>
      )}

      {step === 'decay' && (
        <div className="scout-viz-decay">
          <div className="scout-viz-decay-chart">
            <div className="scout-viz-binary">
              <div className="scout-viz-binary-bar" />
              <span className="scout-viz-label bad">Binary cutoff</span>
            </div>
            <div className="scout-viz-gradient">
              <div className="scout-viz-gradient-bar" />
              <span className="scout-viz-label good">Smooth decay</span>
            </div>
          </div>
          <div className="scout-viz-zones">
            <span className="scout-zone power">Power Zone</span>
            <span className="scout-zone strong">Strong</span>
            <span className="scout-zone moderate">Moderate</span>
          </div>
        </div>
      )}

      {step === 'scoring' && (
        <div className="scout-viz-scoring">
          <div className="scout-score-row">
            <span className="scout-score-label">Benefit</span>
            <div className="scout-score-bar benefit"><div style={{ width: '78%' }} /></div>
            <span className="scout-score-value">78</span>
          </div>
          <div className="scout-score-row">
            <span className="scout-score-label">Intensity</span>
            <div className="scout-score-bar intensity"><div style={{ width: '65%' }} /></div>
            <span className="scout-score-value">65</span>
          </div>
          <div className="scout-score-row">
            <span className="scout-score-label">Stability</span>
            <div className="scout-score-bar stability"><div style={{ width: '92%' }} /></div>
            <span className="scout-score-value">92</span>
          </div>
          <div className="scout-verdict">
            <Sparkles className="w-4 h-4" />
            <span>Highly Beneficial</span>
          </div>
        </div>
      )}

      {step === 'ranking' && (
        <div className="scout-viz-ranking">
          <div className="scout-rank-item rank-1">
            <span className="scout-rank-num">1</span>
            <div className="scout-rank-info">
              <span className="scout-rank-city">Lisbon, Portugal</span>
              <div className="scout-rank-tags">
                <span>Venus MC</span>
                <span>Jupiter DSC</span>
              </div>
            </div>
            <span className="scout-rank-score">94</span>
          </div>
          <div className="scout-rank-item rank-2">
            <span className="scout-rank-num">2</span>
            <div className="scout-rank-info">
              <span className="scout-rank-city">Barcelona, Spain</span>
              <div className="scout-rank-tags">
                <span>Sun ASC</span>
              </div>
            </div>
            <span className="scout-rank-score">87</span>
          </div>
          <div className="scout-rank-item rank-3">
            <span className="scout-rank-num">3</span>
            <div className="scout-rank-info">
              <span className="scout-rank-city">Athens, Greece</span>
              <div className="scout-rank-tags">
                <span>Moon IC</span>
              </div>
            </div>
            <span className="scout-rank-score">82</span>
          </div>
        </div>
      )}
    </div>
  );
});

const StepButton = memo(({
  step,
  isActive,
  onClick
}: {
  step: typeof DEMO_STEPS[0];
  isActive: boolean;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={`scout-step-btn ${isActive ? 'active' : ''}`}
  >
    {step.icon}
    <span>{step.title}</span>
  </button>
));

export const LandingScoutDemo = memo(() => {
  const [activeStep, setActiveStep] = useState<DemoStep>('distance');
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

  // Auto-cycle steps when in view
  useEffect(() => {
    if (!isInView) return;

    const interval = setInterval(() => {
      setActiveStep((prev) => {
        const currentIndex = DEMO_STEPS.findIndex(s => s.id === prev);
        const nextIndex = (currentIndex + 1) % DEMO_STEPS.length;
        return DEMO_STEPS[nextIndex].id;
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [isInView]);

  return (
    <section className="scout-demo-section" ref={containerRef}>
      <div className="scout-demo-container">
        {/* Left side - Content */}
        <div className="scout-demo-content">
          <h2 className="scout-demo-title text-gradient">
            The Most Accurate<br />Astrocartography Engine
          </h2>

          <div className="scout-demo-divider" />

          <p className="scout-demo-intro">
            <Sparkles className="w-4 h-4 inline mr-2 text-emerald-400" />
            Built different. Calculates different.
          </p>

          <p className="scout-demo-text">
            Most astrocartography tools use flat-map approximations and arbitrary cutoffs.
            Scout uses true spherical geometry and continuous influence modeling
            to find where you'll actually thrive.
          </p>

          {/* Step buttons */}
          <div className="scout-step-buttons">
            {DEMO_STEPS.map((step) => (
              <StepButton
                key={step.id}
                step={step}
                isActive={activeStep === step.id}
                onClick={() => setActiveStep(step.id)}
              />
            ))}
          </div>

          {/* Current step description */}
          <div className="scout-step-description">
            <p>{STEP_DESCRIPTIONS[activeStep]}</p>
          </div>

          <div className="scout-cta-group">
            <a href="/guest" className="demo-cta scout-cta">
              Find Your Best Locations
              <span className="demo-cta-arrow">→</span>
            </a>
            <a href="/blog/scout-algorithm" className="scout-learn-link">
              How it works →
            </a>
          </div>
        </div>

        {/* Right side - Visualization */}
        <div className={`scout-demo-visual ${isInView ? 'animate' : ''}`}>
          <div className="scout-viz-container">
            <StepVisualization step={activeStep} />
          </div>
        </div>
      </div>
    </section>
  );
});

export default LandingScoutDemo;
