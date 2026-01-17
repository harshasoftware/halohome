/**
 * MethodologyBlog - Technical methodology and precision explanation
 *
 * Visual overview of the scientific foundation behind HaloHome:
 * - Ephemeris data source (NASA JPL DE431)
 * - Calculation accuracy (True Node, ΔT, spherical geodesy)
 * - Dual zodiac systems (Tropical & Sidereal)
 * - 8 house systems
 * - Cardinal angles (MC, IC, ASC, DSC)
 * - Orb of influence visualization
 * - Celestial bodies tracked
 */

import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Telescope, Target, Globe, Compass, Sun, Moon,
  ChevronRight, Sparkles, ArrowUpRight, CircleDot,
  Orbit, Timer, Navigation, TrendingUp, Star
} from 'lucide-react';
import Footer from '@/components/Footer';
import BlogNavbar from '@/components/BlogNavbar';
import { ScrollReveal } from '@/components/landing/ScrollReveal';
import { SpotlightCard } from '@/components/landing/SpotlightCard';
import { MysticalParticles } from '@/components/landing/MysticalParticles';
import './MethodologyBlog.css';
import './ScoutAlgorithmBlog.css';
import './Landing.css';

// ============================================================================
// Orb of Influence Interactive Chart
// ============================================================================
interface OrbChartProps {
  className?: string;
}

const OrbInfluenceChart: React.FC<OrbChartProps> = ({ className }) => {
  const [hoveredDistance, setHoveredDistance] = useState<number | null>(null);
  const [activePoint, setActivePoint] = useState<number | null>(null);

  // Gaussian decay function: intensity = e^(-(d/σ)²)
  const getIntensity = (distance: number): number => {
    const sigma = 300; // km - controls width of influence
    return Math.exp(-Math.pow(distance / sigma, 2)) * 100;
  };

  // Generate curve points
  const points: { x: number; y: number; distance: number }[] = [];
  for (let d = 0; d <= 800; d += 10) {
    const intensity = getIntensity(d);
    const x = 50 + (d / 800) * 500; // Map 0-800km to 50-550px
    const y = 250 - (intensity / 100) * 200; // Map 0-100% to 250-50px
    points.push({ x, y, distance: d });
  }

  // Create SVG path
  const pathD = points.map((p, i) =>
    `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
  ).join(' ');

  // Key distance markers
  const markers = [
    { distance: 0, label: 'On Line', color: '#a855f7' },
    { distance: 100, label: '100km', color: '#8b5cf6' },
    { distance: 300, label: '300km', color: '#6366f1' },
    { distance: 500, label: '500km', color: '#3b82f6' },
  ];

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const distance = Math.max(0, Math.min(800, ((x - 50) / 500) * 800));
    setHoveredDistance(Math.round(distance));
  }, []);

  return (
    <div className={`orb-chart-container ${className || ''}`}>
      <svg
        viewBox="0 0 600 300"
        className="orb-chart-svg"
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredDistance(null)}
      >
        {/* Gradient definition */}
        <defs>
          <linearGradient id="orbGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" stopOpacity="0.6" />
            <stop offset="50%" stopColor="#6366f1" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
          </linearGradient>
          <linearGradient id="lineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        <g className="orb-grid">
          {[25, 50, 75, 100].map((pct) => (
            <line
              key={pct}
              x1="50"
              y1={250 - (pct / 100) * 200}
              x2="550"
              y2={250 - (pct / 100) * 200}
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="4 4"
            />
          ))}
          {[0, 200, 400, 600, 800].map((km) => (
            <line
              key={km}
              x1={50 + (km / 800) * 500}
              y1="50"
              x2={50 + (km / 800) * 500}
              y2="250"
              stroke="rgba(255,255,255,0.05)"
              strokeDasharray="4 4"
            />
          ))}
        </g>

        {/* Filled area under curve */}
        <path
          d={`${pathD} L 550 250 L 50 250 Z`}
          fill="url(#orbGradient)"
          className="orb-area"
        />

        {/* Main curve */}
        <path
          d={pathD}
          fill="none"
          stroke="url(#lineGradient)"
          strokeWidth="3"
          className="orb-curve"
        />

        {/* Marker points */}
        {markers.map((m) => {
          const intensity = getIntensity(m.distance);
          const x = 50 + (m.distance / 800) * 500;
          const y = 250 - (intensity / 100) * 200;
          const isActive = activePoint === m.distance;

          return (
            <g key={m.distance}>
              <circle
                cx={x}
                cy={y}
                r={isActive ? 10 : 7}
                fill={m.color}
                className="orb-marker"
                onMouseEnter={() => setActivePoint(m.distance)}
                onMouseLeave={() => setActivePoint(null)}
                style={{ cursor: 'pointer' }}
              />
              {isActive && (
                <text
                  x={x}
                  y={y - 20}
                  textAnchor="middle"
                  fill="white"
                  fontSize="12"
                  fontWeight="500"
                >
                  {Math.round(intensity)}% intensity
                </text>
              )}
            </g>
          );
        })}

        {/* Hover indicator */}
        {hoveredDistance !== null && (
          <g>
            <line
              x1={50 + (hoveredDistance / 800) * 500}
              y1="50"
              x2={50 + (hoveredDistance / 800) * 500}
              y2="250"
              stroke="rgba(255,255,255,0.3)"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <circle
              cx={50 + (hoveredDistance / 800) * 500}
              cy={250 - (getIntensity(hoveredDistance) / 100) * 200}
              r="5"
              fill="white"
            />
          </g>
        )}

        {/* Axis labels */}
        <text x="300" y="285" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="12">
          Distance from Planetary Line (km)
        </text>
        <text x="20" y="150" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="12" transform="rotate(-90, 20, 150)">
          Influence Intensity
        </text>

        {/* Distance labels */}
        {[0, 200, 400, 600, 800].map((km) => (
          <text
            key={km}
            x={50 + (km / 800) * 500}
            y="268"
            textAnchor="middle"
            fill="rgba(255,255,255,0.4)"
            fontSize="10"
          >
            {km}
          </text>
        ))}
      </svg>

      {/* Live value display */}
      {hoveredDistance !== null && (
        <div className="orb-tooltip">
          <span className="orb-tooltip-distance">{hoveredDistance} km</span>
          <span className="orb-tooltip-intensity">
            {Math.round(getIntensity(hoveredDistance))}% influence
          </span>
        </div>
      )}

      {/* Legend */}
      <div className="orb-legend">
        {markers.map((m) => (
          <div key={m.distance} className="orb-legend-item">
            <span className="orb-legend-dot" style={{ background: m.color }} />
            <span>{m.label}: {Math.round(getIntensity(m.distance))}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ============================================================================
// Data Constants
// ============================================================================
const CELESTIAL_BODIES = [
  { name: 'Sun', symbol: '☉', type: 'Luminary', color: '#fbbf24' },
  { name: 'Moon', symbol: '☽', type: 'Luminary', color: '#e2e8f0' },
  { name: 'Mercury', symbol: '☿', type: 'Personal', color: '#94a3b8' },
  { name: 'Venus', symbol: '♀', type: 'Personal', color: '#f472b6' },
  { name: 'Mars', symbol: '♂', type: 'Personal', color: '#ef4444' },
  { name: 'Jupiter', symbol: '♃', type: 'Social', color: '#f97316' },
  { name: 'Saturn', symbol: '♄', type: 'Social', color: '#78716c' },
  { name: 'Uranus', symbol: '♅', type: 'Transpersonal', color: '#22d3ee' },
  { name: 'Neptune', symbol: '♆', type: 'Transpersonal', color: '#6366f1' },
  { name: 'Pluto', symbol: '♇', type: 'Transpersonal', color: '#a855f7' },
  { name: 'Chiron', symbol: '⚷', type: 'Extended', color: '#84cc16' },
  { name: 'North Node', symbol: '☊', type: 'Extended', color: '#64748b' },
];

const HOUSE_SYSTEMS = [
  { name: 'Placidus', desc: 'Time-based, most popular in modern Western astrology' },
  { name: 'Whole Sign', desc: 'Ancient system where each sign equals one house' },
  { name: 'Koch', desc: 'Time-based, uses birthplace latitude differently' },
  { name: 'Equal', desc: 'Each house spans exactly 30° from Ascendant' },
  { name: 'Campanus', desc: 'Space-based division of the prime vertical' },
  { name: 'Regiomontanus', desc: 'Space-based division of the celestial equator' },
  { name: 'Porphyry', desc: 'Trisects the arcs between angles' },
  { name: 'Morinus', desc: 'Divides the equator independently' },
];

const CARDINAL_ANGLES = [
  {
    name: 'MC',
    fullName: 'Midheaven',
    desc: 'Career, public image, life direction',
    icon: <TrendingUp className="w-6 h-6" />,
    color: '#fbbf24',
  },
  {
    name: 'IC',
    fullName: 'Imum Coeli',
    desc: 'Roots, home, inner foundation',
    icon: <Navigation className="w-6 h-6" style={{ transform: 'rotate(180deg)' }} />,
    color: '#6366f1',
  },
  {
    name: 'ASC',
    fullName: 'Ascendant',
    desc: 'Self-expression, vitality, new beginnings',
    icon: <Sun className="w-6 h-6" />,
    color: '#f97316',
  },
  {
    name: 'DSC',
    fullName: 'Descendant',
    desc: 'Relationships, partnerships, others',
    icon: <Moon className="w-6 h-6" />,
    color: '#a855f7',
  },
];

// ============================================================================
// Main Component
// ============================================================================
const MethodologyBlog: React.FC = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="blog-page methodology-page min-h-screen bg-[#050505] text-white overflow-hidden relative">
      <div className="bg-noise" />
      <MysticalParticles />

      {/* Navigation */}
      <BlogNavbar />

      {/* Hero */}
      <header className="blog-hero methodology-hero relative z-10 pt-40 pb-20 text-center px-4">
        <ScrollReveal>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-sm font-medium mb-6">
            <Telescope className="w-4 h-4" />
            <span>Technical Deep-Dive</span>
          </div>
          <h1 className="blog-title text-5xl md:text-7xl font-serif mb-6 leading-tight">
            The Science Behind<br />Your Stars
          </h1>
          <p className="blog-subtitle text-xl text-zinc-400 max-w-2xl mx-auto leading-relaxed mb-8">
            Professional-grade astrocartography powered by NASA-grade ephemeris data
            and ancient wisdom — precision you can trust.
          </p>
          <div className="blog-meta flex items-center justify-center gap-3 text-zinc-500 text-sm">
            <span>8 min read</span>
            <span className="blog-meta-dot">•</span>
            <span>Last updated: December 2024</span>
          </div>
        </ScrollReveal>
      </header>

      {/* Content */}
      <article className="blog-content methodology-content max-w-5xl mx-auto px-4 pb-24 relative z-10 space-y-24">
        {/* Ephemeris Stats Section */}
        <section className="blog-section">
          <ScrollReveal>
            <h2 className="methodology-section-title">
              <Telescope className="w-6 h-6" />
              Ephemeris Foundation
            </h2>
            <p className="methodology-intro">
              Our calculations are powered by the same high-precision ephemeris data
              used by professional astronomers and space agencies worldwide.
            </p>

            <div className="ephemeris-grid">
              <SpotlightCard className="ephemeris-card">
                <div className="ephemeris-icon-wrap">
                  <Globe className="w-6 h-6 text-blue-400" />
                </div>
                <div className="ephemeris-content">
                  <div className="ephemeris-value">NASA JPL DE431</div>
                  <div className="ephemeris-label">Ephemeris Source</div>
                  <p className="ephemeris-desc">
                    Development Ephemeris 431 — the gold standard for planetary positions,
                    used by NASA for spacecraft navigation.
                  </p>
                </div>
              </SpotlightCard>

              <SpotlightCard className="ephemeris-card">
                <div className="ephemeris-icon-wrap">
                  <Target className="w-6 h-6 text-purple-400" />
                </div>
                <div className="ephemeris-content">
                  <div className="ephemeris-value">0.01 Arc-Seconds</div>
                  <div className="ephemeris-label">Angular Precision</div>
                  <p className="ephemeris-desc">
                    Sub-arcminute accuracy means your planetary lines are positioned
                    within a few hundred meters of their true location.
                  </p>
                </div>
              </SpotlightCard>

              <SpotlightCard className="ephemeris-card">
                <div className="ephemeris-icon-wrap">
                  <Timer className="w-6 h-6 text-emerald-400" />
                </div>
                <div className="ephemeris-content">
                  <div className="ephemeris-value">30,000 Years</div>
                  <div className="ephemeris-label">Temporal Coverage</div>
                  <p className="ephemeris-desc">
                    Full planetary data from 13,000 BCE to 17,000 CE — covering every
                    historical birth date with the same precision.
                  </p>
                </div>
              </SpotlightCard>
            </div>
          </ScrollReveal>
        </section>

        {/* Calculation Accuracy */}
        <section className="blog-section">
          <ScrollReveal>
            <h2 className="methodology-section-title">
              <Target className="w-6 h-6" />
              Calculation Precision
            </h2>
            <p className="methodology-intro">
              We go beyond standard astrology software with corrections that matter
              for location-based accuracy.
            </p>

            <div className="accuracy-grid">
              <SpotlightCard className="accuracy-card">
                <div className="accuracy-header">
                  <CircleDot className="w-5 h-5" />
                  <h3>True Node</h3>
                </div>
                <p>
                  ±1.7° more accurate than Mean Node calculations. We apply Meeus Ch 48
                  wobble corrections for the Moon's actual orbital crossing.
                </p>
                <div className="accuracy-badge">High Precision</div>
              </SpotlightCard>

              <SpotlightCard className="accuracy-card">
                <div className="accuracy-header">
                  <Timer className="w-5 h-5" />
                  <h3>ΔT Corrections</h3>
                </div>
                <p>
                  Earth's rotation isn't constant. We apply dynamical time corrections
                  (~70 seconds for 2024) to ensure precise planetary positions.
                </p>
                <div className="accuracy-badge">UTC → TT Conversion</div>
              </SpotlightCard>

              <SpotlightCard className="accuracy-card">
                <div className="accuracy-header">
                  <Globe className="w-5 h-5" />
                  <h3>Spherical Geodesy</h3>
                </div>
                <p>
                  We calculate distances on Earth's curved surface using great circle
                  math — the same formulas trusted by aviation navigation.
                </p>
                <div className="accuracy-badge">Not Flat-Map</div>
              </SpotlightCard>

              <SpotlightCard className="accuracy-card">
                <div className="accuracy-header">
                  <Navigation className="w-5 h-5" />
                  <h3>Topocentric Coords</h3>
                </div>
                <p>
                  Observer-relative positioning accounts for your actual location on
                  Earth, not just the planet's center — critical for the Moon.
                </p>
                <div className="accuracy-badge">Parallax Corrected</div>
              </SpotlightCard>
            </div>
          </ScrollReveal>
        </section>

        {/* Dual Zodiac Systems */}
        <section className="blog-section">
          <ScrollReveal>
            <h2 className="methodology-section-title">
              <Compass className="w-6 h-6" />
              Dual Zodiac Support
            </h2>
            <p className="methodology-intro">
              We support both major astrological traditions equally, with real-time
              switching and no compromise on accuracy.
            </p>

            <div className="zodiac-comparison">
              <SpotlightCard className="zodiac-card tropical">
                <div className="zodiac-badge">Western</div>
                <h3>Tropical Zodiac</h3>
                <p>
                  Season-based system aligned with Earth's equinoxes. 0° Aries begins
                  at the Spring Equinox, making it tied to our relationship with the Sun.
                </p>
                <ul className="zodiac-features">
                  <li>Standard in Western astrology</li>
                  <li>Based on seasonal cycles</li>
                  <li>Fixed to equinoxes</li>
                </ul>
              </SpotlightCard>

              <div className="zodiac-divider">
                <span>OR</span>
              </div>

              <SpotlightCard className="zodiac-card sidereal">
                <div className="zodiac-badge">Vedic</div>
                <h3>Sidereal Zodiac</h3>
                <p>
                  Star-based system accounting for precession. Uses Lahiri ayanamsa
                  (~24° offset from Tropical), aligning signs with their constellations.
                </p>
                <ul className="zodiac-features">
                  <li>Standard in Jyotish</li>
                  <li>Based on fixed stars</li>
                  <li>Precession-corrected</li>
                </ul>
              </SpotlightCard>
            </div>
          </ScrollReveal>
        </section>

        {/* House Systems */}
        <section className="blog-section">
          <ScrollReveal>
            <h2 className="methodology-section-title">
              <Orbit className="w-6 h-6" />
              8 House Systems
            </h2>
            <p className="methodology-intro">
              Switch between house systems instantly. Each offers a different lens
              for understanding celestial influence.
            </p>

            <div className="house-grid">
              {HOUSE_SYSTEMS.map((house, i) => (
                <SpotlightCard key={house.name} className="house-card">
                  <span className="house-number">{i + 1}</span>
                  <h4>{house.name}</h4>
                  <p>{house.desc}</p>
                </SpotlightCard>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* Cardinal Angles */}
        <section className="blog-section">
          <ScrollReveal>
            <h2 className="methodology-section-title">
              <Star className="w-6 h-6" />
              The Four Cardinal Angles
            </h2>
            <p className="methodology-intro">
              Each planet creates four lines on your astrocartography map — one for
              each angle. Understanding these is key to reading your map.
            </p>

            <div className="angles-grid">
              {CARDINAL_ANGLES.map((angle) => (
                <SpotlightCard
                  key={angle.name}
                  className="angle-card"
                  // @ts-ignore - custom style property
                  style={{ '--angle-color': angle.color }}
                >
                  <div className="angle-icon" style={{ color: angle.color }}>
                    {angle.icon}
                  </div>
                  <div className="angle-name">{angle.name}</div>
                  <div className="angle-fullname">{angle.fullName}</div>
                  <p className="angle-desc">{angle.desc}</p>
                </SpotlightCard>
              ))}
            </div>

            <div className="angles-math">
              <span className="math-label">Lines per chart:</span>
              <span className="math-equation">10 planets × 4 angles = <strong>40 planetary lines</strong></span>
            </div>
          </ScrollReveal>
        </section>

        {/* Orb of Influence */}
        <section className="blog-section">
          <ScrollReveal>
            <h2 className="methodology-section-title">
              <Sparkles className="w-6 h-6" />
              Orb of Influence
            </h2>
            <p className="methodology-intro">
              Unlike tools with arbitrary cutoffs, we use continuous decay functions.
              Influence fades gradually with distance — no artificial cliffs.
            </p>

            <SpotlightCard className="p-0 overflow-hidden">
              <div className="p-8">
                <OrbInfluenceChart className="methodology-orb-chart" />
              </div>
            </SpotlightCard>

            <div className="orb-explanation">
              <div className="orb-point">
                <div className="orb-point-icon">✓</div>
                <div>
                  <strong>Gaussian decay</strong> — Inspired by kernel density estimation
                </div>
              </div>
              <div className="orb-point">
                <div className="orb-point-icon">✓</div>
                <div>
                  <strong>No binary cutoffs</strong> — Closer is stronger, but never zero
                </div>
              </div>
              <div className="orb-point">
                <div className="orb-point-icon">✓</div>
                <div>
                  <strong>Major aspects: ±2°</strong> — Standard orb for trines, squares, sextiles
                </div>
              </div>
            </div>
          </ScrollReveal>
        </section>

        {/* Celestial Bodies */}
        <section className="blog-section">
          <ScrollReveal>
            <h2 className="methodology-section-title">
              <Sun className="w-6 h-6" />
              12 Celestial Bodies
            </h2>
            <p className="methodology-intro">
              We track all 10 major planets plus Chiron and the North Node — each
              with specialized calculation methods for maximum accuracy.
            </p>

            <div className="bodies-list">
              {CELESTIAL_BODIES.map((body) => (
                <div key={body.name} className="body-row">
                  <span className="body-symbol" style={{ color: body.color }}>
                    {body.symbol}
                  </span>
                  <span className="body-name">{body.name}</span>
                  <span className="body-type">{body.type}</span>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </section>

        {/* Scout Preview */}
        <section className="blog-section">
          <ScrollReveal>
            <SpotlightCard className="scout-preview">
              <h2 className="methodology-section-title">
                <Target className="w-6 h-6" />
                The Scout Engine
              </h2>
              <p className="methodology-intro">
                Our proprietary location scoring goes beyond simple line proximity.
                Scout analyzes three dimensions for every city.
              </p>

              <div className="scout-dimensions">
                <div className="scout-dimension">
                  <div className="scout-bar benefit" />
                  <span className="scout-label">Benefit</span>
                  <span className="scout-desc">How positive the planetary energy is (0-100)</span>
                </div>
                <div className="scout-dimension">
                  <div className="scout-bar intensity" />
                  <span className="scout-label">Intensity</span>
                  <span className="scout-desc">How strongly you'll feel the influence (0-100)</span>
                </div>
                <div className="scout-dimension">
                  <div className="scout-bar stability" />
                  <span className="scout-label">Stability</span>
                  <span className="scout-desc">How consistent the influence is over time (0-100)</span>
                </div>
              </div>

              <Link to="/blog/scout-algorithm" className="scout-link">
                Read the full Scout Engine deep-dive
                <ArrowUpRight className="w-4 h-4" />
              </Link>
            </SpotlightCard>
          </ScrollReveal>
        </section>

        {/* CTA */}
        <section className="blog-cta-section text-center mt-20 mb-12">
          <ScrollReveal>
            <h3 className="text-3xl font-serif text-white mb-4">Experience Precision Astrocartography</h3>
            <p className="text-zinc-400 text-lg mb-8 max-w-2xl mx-auto">
              Enter your birth data and explore your planetary lines with
              professional-grade accuracy.
            </p>
            <Link to="/guest" className="blog-cta-btn inline-flex items-center gap-2 px-8 py-4 bg-white text-black rounded-full font-semibold hover:bg-zinc-200 transition-colors">
              Launch App
              <ChevronRight className="w-5 h-5" />
            </Link>
          </ScrollReveal>
        </section>
      </article>

      {/* Footer */}
      <Footer showInstallButton={false} />
    </div>
  );
};

export default MethodologyBlog;
