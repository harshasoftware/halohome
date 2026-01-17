/**
 * LandingPlanetaryDemo - Interactive 8 directions demo for landing page
 *
 * Features:
 * - 8 Direction Analysis visualization with animated lines
 * - Direction markers with hover tooltips
 * - Vastu direction meanings and energy descriptions
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import { Sparkles, Compass } from 'lucide-react';

interface Direction {
  name: string;
  vedicName: string;
  symbol: string;
  color: string;
  angle: number; // Degrees from top (N=0, E=90, S=180, W=270)
  meaning: string;
  vedicMeaning: string;
  baguaArea: string;
  baguaColor: string;
}

// 8 directions with Vastu and Feng Shui interpretations
const DIRECTIONS: Direction[] = [
  {
    name: 'North',
    vedicName: 'Uttara',
    symbol: 'N',
    color: '#87CEEB',
    angle: 0,
    meaning: 'Career, opportunities, wealth flow',
    vedicMeaning: 'Water element, Kubera (wealth)',
    baguaArea: 'Career',
    baguaColor: '#1a1a2e',
  },
  {
    name: 'Northeast',
    vedicName: 'Ishanya',
    symbol: 'NE',
    color: '#FFD700',
    angle: 45,
    meaning: 'Spirituality, wisdom, new beginnings',
    vedicMeaning: 'Most auspicious, divine energy',
    baguaArea: 'Knowledge',
    baguaColor: '#2d4a3e',
  },
  {
    name: 'East',
    vedicName: 'Purva',
    symbol: 'E',
    color: '#90EE90',
    angle: 90,
    meaning: 'Health, family, social connections',
    vedicMeaning: 'Sun energy, Indra (vitality)',
    baguaArea: 'Family',
    baguaColor: '#2d5a3e',
  },
  {
    name: 'Southeast',
    vedicName: 'Agneya',
    symbol: 'SE',
    color: '#FF6347',
    angle: 135,
    meaning: 'Wealth, abundance, prosperity',
    vedicMeaning: 'Agni (fire), kitchen zone',
    baguaArea: 'Wealth',
    baguaColor: '#4a2d5a',
  },
  {
    name: 'South',
    vedicName: 'Dakshina',
    symbol: 'S',
    color: '#DEB887',
    angle: 180,
    meaning: 'Fame, reputation, strength',
    vedicMeaning: 'Yama, courage & fame',
    baguaArea: 'Fame',
    baguaColor: '#8b2500',
  },
  {
    name: 'Southwest',
    vedicName: 'Nairitya',
    symbol: 'SW',
    color: '#708090',
    angle: 225,
    meaning: 'Relationships, love, partnership',
    vedicMeaning: 'Earth element, stability',
    baguaArea: 'Love',
    baguaColor: '#8b4560',
  },
  {
    name: 'West',
    vedicName: 'Paschima',
    symbol: 'W',
    color: '#C0C0DC',
    angle: 270,
    meaning: 'Creativity, children, joy',
    vedicMeaning: 'Varuna (water), gains',
    baguaArea: 'Children',
    baguaColor: '#4a4a5a',
  },
  {
    name: 'Northwest',
    vedicName: 'Vayavya',
    symbol: 'NW',
    color: '#40E0D0',
    angle: 315,
    meaning: 'Travel, helpful people, mentors',
    vedicMeaning: 'Vayu (air), movement',
    baguaArea: 'Helpful People',
    baguaColor: '#3a3a4a',
  },
];

// 8 Direction line colors for the animation
const DIRECTION_LINE_COLORS = [
  { deg: 0, color: '#fbbf24', textColor: '#b45309' },    // N - Gold (darker for text)
  { deg: 45, color: '#60a5fa', textColor: '#1d4ed8' },   // NE - Blue (darker for text)
  { deg: 90, color: '#f97316', textColor: '#c2410c' },   // E - Orange
  { deg: 135, color: '#a78bfa', textColor: '#7c3aed' },  // SE - Purple
  { deg: 180, color: '#ef4444', textColor: '#dc2626' },  // S - Red
  { deg: 225, color: '#22c55e', textColor: '#16a34a' },  // SW - Green
  { deg: 270, color: '#06b6d4', textColor: '#0891b2' },  // W - Cyan
  { deg: 315, color: '#ec4899', textColor: '#db2777' },  // NW - Pink
];

// Direction marker around the compass
const DirectionMarker = memo(({
  direction,
  lineColor,
  textColor,
  isHovered,
  onHover,
  lineLength,
  isInView,
  index
}: {
  direction: Direction;
  lineColor: string;
  textColor: string;
  isHovered: boolean;
  onHover: (name: string | null) => void;
  lineLength: number;
  isInView: boolean;
  index: number;
}) => {
  // Position markers at the end of each direction line
  // CSS rotate uses clockwise from top, so 0=up, 90=right, 180=down, 270=left
  // Convert to math coordinates where 0=right, 90=up
  const angleRad = (direction.angle - 90) * (Math.PI / 180);
  const x = Math.cos(angleRad) * lineLength;
  const y = Math.sin(angleRad) * lineLength;

  return (
    <div
      className={`direction-marker ${isHovered ? 'hovered' : ''} ${isInView ? 'visible' : ''}`}
      style={{
        '--dir-color': lineColor,
        transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
        background: isHovered ? '#fff' : 'transparent',
        border: isHovered ? `2px solid ${lineColor}` : 'none',
        boxShadow: isHovered ? `0 4px 16px ${lineColor}50` : 'none',
        color: textColor,
        animationDelay: `${index * 0.1}s`
      } as React.CSSProperties}
      onMouseEnter={() => onHover(direction.name)}
      onMouseLeave={() => onHover(null)}
    >
      <span className="direction-symbol" style={{ fontWeight: 700, textShadow: isHovered ? 'none' : '0 1px 2px rgba(255,255,255,0.8)' }}>{direction.symbol}</span>
      {isHovered && (
        <div className="direction-tooltip" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', '--tooltip-title-color': textColor } as React.CSSProperties}>
          <span className="tooltip-title">{direction.vedicName}</span>
          <span className="tooltip-meaning">{direction.vedicMeaning}</span>
        </div>
      )}
    </div>
  );
});

// 8 Direction Analysis visualization - animated compass lines
const DirectionAnalysis = memo(({
  hoveredDirection,
  onDirectionHover,
  isInView
}: {
  hoveredDirection: string | null;
  onDirectionHover: (name: string | null) => void;
  isInView: boolean;
}) => {
  const isSmallScreen = typeof window !== 'undefined' && window.innerWidth < 1280;
  const size = isSmallScreen ? 380 : 480;
  // Line length must match CSS animation (140px large, 110px small)
  const lineLength = isSmallScreen ? 110 : 140;

  // Find hovered direction info
  const hoveredDir = hoveredDirection
    ? DIRECTIONS.find(d => d.name === hoveredDirection)
    : null;

  // Get line color for a direction angle
  const getLineData = (angle: number) => {
    return DIRECTION_LINE_COLORS.find(l => l.deg === angle) || { color: '#fbbf24', textColor: '#b45309' };
  };

  return (
    <div className={`direction-analysis ${isInView ? 'animate' : ''}`} style={{ width: size, height: size }}>
      {/* Orbit rings background */}
      <div className="direction-orbit-group">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="direction-orbit-ring"
            style={{
              '--orbit-radius': `${i * 50}px`,
            } as React.CSSProperties}
          />
        ))}
      </div>

      {/* Animated direction lines */}
      <div className="direction-lines-container">
        {DIRECTION_LINE_COLORS.map(({ deg, color }, i) => (
          <div
            key={deg}
            className={`direction-line ${isInView ? 'animate' : ''}`}
            style={{
              transform: `translate(-50%, -100%) rotate(${deg}deg)`,
              background: color,
              animationDelay: `${i * 0.1}s`
            } as React.CSSProperties}
          />
        ))}
        {/* Center point */}
        <div className="direction-center" />
      </div>

      {/* Direction markers - positioned at end of lines */}
      {DIRECTION_LINE_COLORS.map(({ deg, color, textColor }, i) => {
        // Find the matching direction data
        const dir = DIRECTIONS.find(d => d.angle === deg);
        if (!dir) return null;

        return (
          <DirectionMarker
            key={dir.name}
            direction={dir}
            lineColor={color}
            textColor={textColor}
            isHovered={hoveredDirection === dir.name}
            onHover={onDirectionHover}
            lineLength={lineLength}
            isInView={isInView}
            index={i}
          />
        );
      })}

      {/* Tooltip for hovered direction */}
      {hoveredDir && (
        <div className="direction-info-tooltip" style={{ background: '#fff', border: '1px solid #e5e7eb', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', '--tooltip-area-color': getLineData(hoveredDir.angle).textColor } as React.CSSProperties}>
          <span className="tooltip-area">{hoveredDir.baguaArea}</span>
          <span className="tooltip-direction">{hoveredDir.name}</span>
          <span className="tooltip-meaning">{hoveredDir.meaning}</span>
        </div>
      )}
    </div>
  );
});

export const LandingPlanetaryDemo = memo(() => {
  const [hoveredDirection, setHoveredDirection] = useState<string | null>(null);
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

  // Get line color for a direction
  const getLineColor = (angle: number) => {
    const lineData = DIRECTION_LINE_COLORS.find(l => l.deg === angle);
    return lineData?.color || '#fbbf24';
  };

  return (
    <section className="planetary-demo-section" ref={containerRef}>
      <div className="planetary-demo-container">
        {/* Left side - 8 Direction Analysis */}
        <div className="planetary-orrery">
          <DirectionAnalysis
            hoveredDirection={hoveredDirection}
            onDirectionHover={setHoveredDirection}
            isInView={isInView}
          />
        </div>

        {/* Right side - Content */}
        <div className="planetary-demo-content">
          <h2 className="planetary-demo-title text-gradient">
            8 Directions.<br />Complete Analysis.
          </h2>

          <div className="planetary-demo-divider" />

          {/* Description */}
          <div className="planetary-description">
            <p className="planetary-intro">
              <Compass className="w-4 h-4 inline mr-2 text-amber-500" />
              Vastu Shastra • Directional Energy
            </p>
            <p className="planetary-text">
              Every direction carries unique energy. We analyze all 8 directions — North, South, East, West,
              and their ordinal combinations — to reveal how your property aligns with cosmic forces.
            </p>
          </div>

          {/* Direction chips */}
          <div className="planet-chips">
            {DIRECTIONS.slice(0, 5).map((dir) => (
              <span
                key={dir.name}
                className="planet-chip"
                style={{ '--chip-color': getLineColor(dir.angle) } as React.CSSProperties}
              >
                {dir.symbol} {dir.vedicName}
              </span>
            ))}
            <span className="planet-chip more">+{DIRECTIONS.length - 5} more</span>
          </div>

          <div className="planetary-cta-group">
            <a href="/guest" className="demo-cta planetary-cta">
              Analyze Your Property Free
              <span className="demo-cta-arrow">→</span>
            </a>
            <a href="/blog/methodology" className="planetary-learn-link">
              How it works →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
});

export default LandingPlanetaryDemo;
