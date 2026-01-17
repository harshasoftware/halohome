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

// Mock property data for boundary detection demo
interface DemoProperty {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  shape: 'rectangle' | 'L-shaped' | 'irregular';
  lShapeWidth?: number;
  lShapeHeight?: number;
  polygonPoints?: Array<{ x: number; y: number }>;
  address: string;
}

const DEMO_PROPERTIES: DemoProperty[] = [
  { 
    id: 1, x: 40, y: 30, width: 80, height: 70, address: '123 Oak St', shape: 'rectangle'
  },
  { 
    id: 2, x: 140, y: 35, width: 75, height: 65, address: '456 Maple', shape: 'L-shaped',
    lShapeWidth: 50, lShapeHeight: 35
  },
  { 
    id: 3, x: 230, y: 40, width: 70, height: 60, address: '789 Pine', shape: 'irregular',
    polygonPoints: [{ x: 0, y: 0 }, { x: 70, y: 8 }, { x: 65, y: 60 }, { x: 5, y: 55 }]
  },
  { 
    id: 4, x: 50, y: 120, width: 85, height: 75, address: '101 Main', shape: 'rectangle'
  },
  { 
    id: 5, x: 150, y: 125, width: 80, height: 70, address: '321 Elm', shape: 'L-shaped',
    lShapeWidth: 55, lShapeHeight: 40
  },
];

// Animated visualization for each step
const StepVisualization = memo(({ step }: { step: DemoStep }) => {
  const [detectionProgress, setDetectionProgress] = useState(0);
  const [showExact, setShowExact] = useState(false);

  useEffect(() => {
    if (step !== 'boundary') {
      setDetectionProgress(0);
      setShowExact(false);
      return;
    }

    // Reset and start animation
    setDetectionProgress(0);
    setShowExact(false);

    let interval: NodeJS.Timeout | null = null;

    // Start animation after a brief delay
    const startTimeout = setTimeout(() => {
      // Animate boundary detection
      interval = setInterval(() => {
        setDetectionProgress((prev) => {
          if (prev >= 100) {
            setShowExact(true);
            if (interval) clearInterval(interval);
            return 100;
          }
          return prev + 2;
        });
      }, 30);
    }, 200);

    return () => {
      clearTimeout(startTimeout);
      if (interval) clearInterval(interval);
    };
  }, [step]);

  const getPropertyClipPath = (prop: DemoProperty) => {
    if (prop.shape === 'irregular' && prop.polygonPoints) {
      return `polygon(${prop.polygonPoints.map(p => `${p.x}px ${p.y}px`).join(', ')})`;
    }
    if (prop.shape === 'L-shaped' && prop.lShapeWidth && prop.lShapeHeight) {
      return `polygon(0 0, ${prop.width}px 0, ${prop.width}px ${prop.lShapeHeight}px, ${prop.lShapeWidth}px ${prop.lShapeHeight}px, ${prop.lShapeWidth}px ${prop.height}px, 0 ${prop.height}px)`;
    }
    return 'none';
  };

  return (
    <div className="scout-visualization">
      {step === 'boundary' && (
        <div className="scout-boundary-demo">
          {/* Map grid background */}
          <div className="scout-map-grid">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={`h-${i}`} className="scout-grid-line horizontal" style={{ top: `${i * 30}px` }} />
            ))}
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={`v-${i}`} className="scout-grid-line vertical" style={{ left: `${i * 40}px` }} />
            ))}
          </div>

          {/* Properties */}
          <div className="scout-properties-container">
            {DEMO_PROPERTIES.map((prop) => {
              const isDetected = detectionProgress >= (prop.id * 20);
              const showBoundary = isDetected || (detectionProgress > 0 && prop.id === 1);
              
              return (
                <div
                  key={prop.id}
                  className={`scout-demo-property ${isDetected ? 'detected' : ''}`}
                  style={{
                    left: `${prop.x}px`,
                    top: `${prop.y}px`,
                    width: `${prop.width}px`,
                    height: `${prop.height}px`,
                    clipPath: getPropertyClipPath(prop),
                    WebkitClipPath: getPropertyClipPath(prop),
                  }}
                >
                  {/* Approximate boundary (shown first) */}
                  {!showExact && showBoundary && (
                    <div className="scout-boundary-approx" />
                  )}
                  
                  {/* Exact boundary (shown after detection) */}
                  {showExact && isDetected && (
                    <div className="scout-boundary-exact" />
                  )}

                  {/* Detection scan line */}
                  {showBoundary && !isDetected && detectionProgress > 0 && (
                    <div 
                      className="scout-scan-line"
                      style={{ 
                        height: `${(detectionProgress - (prop.id - 1) * 20) * 5}%`,
                        opacity: Math.min(1, (detectionProgress - (prop.id - 1) * 20) / 10)
                      }}
                    />
                  )}

                  {/* Property label */}
                  {isDetected && (
                    <div className="scout-property-label">{prop.address}</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Comparison indicator */}
          <div className="scout-boundary-comparison">
            <div className={`scout-comparison-item ${!showExact ? 'active' : ''}`}>
              <div className="scout-comparison-box approx" />
              <span className="scout-comparison-label">Approximate</span>
            </div>
            <div className="scout-comparison-arrow">→</div>
            <div className={`scout-comparison-item ${showExact ? 'active' : ''}`}>
              <div className="scout-comparison-box exact" />
              <span className="scout-comparison-label">Exact Parcel</span>
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
