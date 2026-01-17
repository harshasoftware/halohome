/**
 * LandingScoutDemo - Scout parcel analysis demo for landing page
 *
 * Features:
 * - Step-by-step animated demonstration of parcel data analysis
 * - Shows how property boundaries and Vastu zones are analyzed
 * - Highlights precision of ZIP code and parcel boundary detection
 * - Web-based analysis (iOS Scan for interiors is separate)
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import { Target, Sparkles, MapPin, TrendingUp, Grid3X3, Scale } from 'lucide-react';

type DemoStep = 'boundary' | 'zones' | 'scoring' | 'ranking';

const DEMO_STEPS: { id: DemoStep; title: string; icon: React.ReactNode }[] = [
  { id: 'boundary', title: 'Boundary Detection', icon: <Target className="w-4 h-4" /> },
  { id: 'zones', title: '8 Zone Analysis', icon: <Grid3X3 className="w-4 h-4" /> },
  { id: 'scoring', title: 'Multi-Factor Analysis', icon: <Scale className="w-4 h-4" /> },
  { id: 'ranking', title: 'Harmony Scoring', icon: <TrendingUp className="w-4 h-4" /> },
];

const STEP_DESCRIPTIONS: Record<DemoStep, string> = {
  boundary: "Precise property boundary detection using ZIP code and parcel data. We map exact lot lines, not arbitrary approximations.",
  zones: "All 8 Vastu zones are analyzed based on your property's orientation. Each direction governs different aspects of life energy.",
  scoring: "Each zone gets scored for harmony, balance, and potential — giving you a complete picture of energy flow, not just generic advice.",
  ranking: "Smart weighting ensures no single zone dominates. Your harmony score truly reflects the overall balance of your property.",
};

// Animated visualization for each step
const StepVisualization = memo(({ step }: { step: DemoStep }) => {
  return (
    <div className="scout-visualization">
      {step === 'boundary' && (
        <div className="scout-viz-distance">
          <div className="scout-viz-globe">
            <div className="scout-viz-globe-surface" />
            <div className="scout-viz-arc" />
            <div className="scout-viz-city" />
            <div className="scout-viz-line" />
          </div>
          <div className="scout-viz-comparison">
            <div className="scout-viz-method bad">
              <span className="scout-viz-value">~Area</span>
              <span className="scout-viz-label">Estimate</span>
            </div>
            <div className="scout-viz-arrow">→</div>
            <div className="scout-viz-method good">
              <span className="scout-viz-value">Exact</span>
              <span className="scout-viz-label">Parcel Data</span>
            </div>
          </div>
        </div>
      )}

      {step === 'zones' && (
        <div className="scout-viz-decay">
          <div className="scout-viz-decay-chart">
            <div className="scout-viz-binary">
              <div className="scout-viz-binary-bar" />
              <span className="scout-viz-label bad">Generic advice</span>
            </div>
            <div className="scout-viz-gradient">
              <div className="scout-viz-gradient-bar" />
              <span className="scout-viz-label good">8 Zone Analysis</span>
            </div>
          </div>
          <div className="scout-viz-zones">
            <span className="scout-zone power">Northeast</span>
            <span className="scout-zone strong">Southwest</span>
            <span className="scout-zone moderate">+6 more</span>
          </div>
        </div>
      )}

      {step === 'scoring' && (
        <div className="scout-viz-scoring">
          <div className="scout-score-row">
            <span className="scout-score-label">Energy Flow</span>
            <div className="scout-score-bar benefit"><div style={{ width: '78%' }} /></div>
            <span className="scout-score-value">78</span>
          </div>
          <div className="scout-score-row">
            <span className="scout-score-label">Balance</span>
            <div className="scout-score-bar intensity"><div style={{ width: '65%' }} /></div>
            <span className="scout-score-value">65</span>
          </div>
          <div className="scout-score-row">
            <span className="scout-score-label">Potential</span>
            <div className="scout-score-bar stability"><div style={{ width: '92%' }} /></div>
            <span className="scout-score-value">92</span>
          </div>
          <div className="scout-verdict">
            <Sparkles className="w-4 h-4" />
            <span>High Harmony</span>
          </div>
        </div>
      )}

      {step === 'ranking' && (
        <div className="scout-viz-ranking">
          <div className="scout-rank-item rank-1">
            <span className="scout-rank-num">1</span>
            <div className="scout-rank-info">
              <span className="scout-rank-city">123 Oak Street</span>
              <div className="scout-rank-tags">
                <span>NE Clear</span>
                <span>SW Strong</span>
              </div>
            </div>
            <span className="scout-rank-score">94</span>
          </div>
          <div className="scout-rank-item rank-2">
            <span className="scout-rank-num">2</span>
            <div className="scout-rank-info">
              <span className="scout-rank-city">456 Maple Ave</span>
              <div className="scout-rank-tags">
                <span>E Balanced</span>
              </div>
            </div>
            <span className="scout-rank-score">87</span>
          </div>
          <div className="scout-rank-item rank-3">
            <span className="scout-rank-num">3</span>
            <div className="scout-rank-info">
              <span className="scout-rank-city">789 Pine Road</span>
              <div className="scout-rank-tags">
                <span>N Good</span>
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
  const [activeStep, setActiveStep] = useState<DemoStep>('boundary');
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
            Scout: Precision<br />Parcel Analysis
          </h2>

          <div className="scout-demo-divider" />

          <p className="scout-demo-intro">
            <Sparkles className="w-4 h-4 inline mr-2 text-emerald-400" />
            Real parcel data. Complete zone analysis.
          </p>

          <p className="scout-demo-text">
            Most harmony tools give generic advice. Scout uses real parcel boundaries
            from ZIP code lookups to analyze all 8 Vastu zones — giving you specific,
            actionable insights for your exact property.
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
              Analyze Your Property
              <span className="demo-cta-arrow">→</span>
            </a>
            <a href="/blog/methodology" className="scout-learn-link">
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
