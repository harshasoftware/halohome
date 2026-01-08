/**
 * LandingPlanetaryDemo - Interactive planetary suite demo for landing page
 *
 * Features:
 * - Animated orbital display of all planets
 * - Toggle between Western and Vedic systems
 * - Planet descriptions and meanings
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import { Sparkles } from 'lucide-react';

type AstroSystem = 'western' | 'vedic';

interface Planet {
  name: string;
  vedicName?: string;
  symbol: string;
  color: string;
  orbitRadius: number;
  orbitDuration: number;
  size: number;
  meaning: string;
  vedicMeaning?: string;
}

// Full planetary suite with both Western and Vedic interpretations
const PLANETS: Planet[] = [
  {
    name: 'Sun',
    vedicName: 'Surya',
    symbol: '☉',
    color: '#FFD700',
    orbitRadius: 45,
    orbitDuration: 20,
    size: 28,
    meaning: 'Identity, ego, vitality',
    vedicMeaning: 'Soul, authority, father',
  },
  {
    name: 'Moon',
    vedicName: 'Chandra',
    symbol: '☽',
    color: '#C0C0DC',
    orbitRadius: 65,
    orbitDuration: 25,
    size: 22,
    meaning: 'Emotions, intuition, nurturing',
    vedicMeaning: 'Mind, mother, emotions',
  },
  {
    name: 'Mercury',
    vedicName: 'Budha',
    symbol: '☿',
    color: '#87CEEB',
    orbitRadius: 85,
    orbitDuration: 15,
    size: 16,
    meaning: 'Communication, intellect',
    vedicMeaning: 'Intelligence, speech, commerce',
  },
  {
    name: 'Venus',
    vedicName: 'Shukra',
    symbol: '♀',
    color: '#FFB6C1',
    orbitRadius: 105,
    orbitDuration: 30,
    size: 20,
    meaning: 'Love, beauty, harmony',
    vedicMeaning: 'Love, luxury, creativity',
  },
  {
    name: 'Mars',
    vedicName: 'Mangala',
    symbol: '♂',
    color: '#FF6347',
    orbitRadius: 125,
    orbitDuration: 35,
    size: 18,
    meaning: 'Action, energy, passion',
    vedicMeaning: 'Courage, strength, siblings',
  },
  {
    name: 'Jupiter',
    vedicName: 'Guru',
    symbol: '♃',
    color: '#DEB887',
    orbitRadius: 150,
    orbitDuration: 50,
    size: 26,
    meaning: 'Expansion, wisdom, luck',
    vedicMeaning: 'Wisdom, teacher, dharma',
  },
  {
    name: 'Saturn',
    vedicName: 'Shani',
    symbol: '♄',
    color: '#708090',
    orbitRadius: 175,
    orbitDuration: 60,
    size: 24,
    meaning: 'Structure, discipline, karma',
    vedicMeaning: 'Karma, longevity, lessons',
  },
  {
    name: 'Uranus',
    symbol: '♅',
    color: '#40E0D0',
    orbitRadius: 195,
    orbitDuration: 70,
    size: 20,
    meaning: 'Innovation, rebellion, awakening',
  },
  {
    name: 'Neptune',
    symbol: '♆',
    color: '#6495ED',
    orbitRadius: 215,
    orbitDuration: 80,
    size: 20,
    meaning: 'Dreams, spirituality, illusion',
  },
  {
    name: 'Pluto',
    symbol: '♇',
    color: '#9370DB',
    orbitRadius: 235,
    orbitDuration: 90,
    size: 14,
    meaning: 'Transformation, power, rebirth',
  },
];

// Vedic-only planets (nodes)
const VEDIC_NODES = [
  {
    name: 'Rahu',
    symbol: '☊',
    color: '#4B0082',
    orbitRadius: 140,
    orbitDuration: 45,
    size: 18,
    meaning: 'North Node - ambition, obsession, material desires',
  },
  {
    name: 'Ketu',
    symbol: '☋',
    color: '#8B4513',
    orbitRadius: 160,
    orbitDuration: 45,
    size: 18,
    meaning: 'South Node - spirituality, past lives, liberation',
  },
];

const SystemToggle = memo(({
  system,
  onChange
}: {
  system: AstroSystem;
  onChange: (system: AstroSystem) => void;
}) => (
  <div className="system-toggle">
    <button
      className={`system-btn ${system === 'western' ? 'active' : ''}`}
      onClick={() => onChange('western')}
    >
      <span className="system-icon">♈</span>
      Western
    </button>
    <button
      className={`system-btn ${system === 'vedic' ? 'active' : ''}`}
      onClick={() => onChange('vedic')}
    >
      <span className="system-icon">ॐ</span>
      Vedic
    </button>
  </div>
));

const PlanetOrbit = memo(({
  planet,
  system,
  index,
  isHovered,
  onHover
}: {
  planet: Planet;
  system: AstroSystem;
  index: number;
  isHovered: boolean;
  onHover: (index: number | null) => void;
}) => {
  const displayName = system === 'vedic' && planet.vedicName ? planet.vedicName : planet.name;
  const scale = window.innerWidth < 1280 ? 0.7 : 0.85;
  const radius = planet.orbitRadius * scale;
  const size = planet.size * scale;

  return (
    <div
      className="planet-orbit-group"
      style={{
        '--orbit-radius': `${radius}px`,
        '--orbit-duration': `${planet.orbitDuration}s`,
        '--start-angle': `${index * 36}deg`,
      } as React.CSSProperties}
    >
      {/* Orbit ring */}
      <div
        className={`planet-orbit-ring ${isHovered ? 'highlighted' : ''}`}
        style={{ borderColor: `${planet.color}20` }}
      />

      {/* Planet */}
      <div
        className={`planet-body ${isHovered ? 'hovered' : ''}`}
        style={{
          '--planet-size': `${size}px`,
          '--planet-color': planet.color,
        } as React.CSSProperties}
        onMouseEnter={() => onHover(index)}
        onMouseLeave={() => onHover(null)}
      >
        <span className="planet-symbol">{planet.symbol}</span>
        {isHovered && (
          <div className="planet-tooltip">
            <span className="tooltip-name">{displayName}</span>
            <span className="tooltip-meaning">
              {system === 'vedic' && planet.vedicMeaning ? planet.vedicMeaning : planet.meaning}
            </span>
          </div>
        )}
      </div>
    </div>
  );
});

const VedicNode = memo(({
  node,
  index,
  isHovered,
  onHover
}: {
  node: typeof VEDIC_NODES[0];
  index: number;
  isHovered: boolean;
  onHover: (index: number | null) => void;
}) => {
  const scale = window.innerWidth < 1280 ? 0.7 : 0.85;
  const radius = node.orbitRadius * scale;
  const size = node.size * scale;

  return (
    <div
      className="planet-orbit-group vedic-node"
      style={{
        '--orbit-radius': `${radius}px`,
        '--orbit-duration': `${node.orbitDuration}s`,
        '--start-angle': `${180 + index * 180}deg`,
      } as React.CSSProperties}
    >
      <div
        className={`planet-body node-body ${isHovered ? 'hovered' : ''}`}
        style={{
          '--planet-size': `${size}px`,
          '--planet-color': node.color,
        } as React.CSSProperties}
        onMouseEnter={() => onHover(100 + index)}
        onMouseLeave={() => onHover(null)}
      >
        <span className="planet-symbol">{node.symbol}</span>
        {isHovered && (
          <div className="planet-tooltip">
            <span className="tooltip-name">{node.name}</span>
            <span className="tooltip-meaning">{node.meaning}</span>
          </div>
        )}
      </div>
    </div>
  );
});

export const LandingPlanetaryDemo = memo(() => {
  const [system, setSystem] = useState<AstroSystem>('western');
  const [hoveredPlanet, setHoveredPlanet] = useState<number | null>(null);
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

  // Filter planets based on system (Vedic traditionally uses 7 classical planets + nodes)
  const visiblePlanets = system === 'vedic'
    ? PLANETS.filter(p => p.vedicName) // Only show planets with Vedic names
    : PLANETS;

  return (
    <section className="planetary-demo-section" ref={containerRef}>
      <div className="planetary-demo-container">
        {/* Left side - Orbital display */}
        <div className={`planetary-orrery ${isInView ? 'animate' : ''}`}>
          {/* Center sun glow */}
          <div className="orrery-center">
            <div className="center-glow" />
          </div>

          {/* Planet orbits */}
          {visiblePlanets.map((planet, i) => (
            <PlanetOrbit
              key={planet.name}
              planet={planet}
              system={system}
              index={i}
              isHovered={hoveredPlanet === i}
              onHover={setHoveredPlanet}
            />
          ))}

          {/* Vedic nodes (Rahu/Ketu) */}
          {system === 'vedic' && VEDIC_NODES.map((node, i) => (
            <VedicNode
              key={node.name}
              node={node}
              index={i}
              isHovered={hoveredPlanet === 100 + i}
              onHover={setHoveredPlanet}
            />
          ))}
        </div>

        {/* Right side - Content */}
        <div className="planetary-demo-content">
          <h2 className="planetary-demo-title text-gradient">
            Every Planet.<br />Every Line.
          </h2>

          <div className="planetary-demo-divider" />

          {/* System toggle */}
          <SystemToggle system={system} onChange={setSystem} />

          {/* Description */}
          <div className="planetary-description">
            {system === 'western' ? (
              <>
                <p className="planetary-intro">
                  <Sparkles className="w-4 h-4 inline mr-2 text-purple-400" />
                  Tropical & Sidereal • 8 House Systems
                </p>
                <p className="planetary-text">
                  Built for serious astrologers. Choose Placidus, Whole Sign, Koch, Equal, Campanus,
                  Regiomontanus, Porphyry, or Morinus. All 10 celestial bodies mapped with precision.
                </p>
              </>
            ) : (
              <>
                <p className="planetary-intro">
                  <Sparkles className="w-4 h-4 inline mr-2 text-amber-400" />
                  True Sidereal • Lahiri Ayanamsa
                </p>
                <p className="planetary-text">
                  Full Jyotish support with Navagraha lines including Rahu and Ketu.
                  Understand your karmic path and past-life patterns across the globe.
                </p>
              </>
            )}
          </div>

          {/* Planet list */}
          <div className="planet-chips">
            {visiblePlanets.slice(0, 5).map((planet) => (
              <span
                key={planet.name}
                className="planet-chip"
                style={{ '--chip-color': planet.color } as React.CSSProperties}
              >
                {planet.symbol} {system === 'vedic' && planet.vedicName ? planet.vedicName : planet.name}
              </span>
            ))}
            <span className="planet-chip more">+{visiblePlanets.length - 5} more</span>
          </div>

          <div className="planetary-cta-group">
            <a href="/guest" className="demo-cta planetary-cta">
              See All Your Lines Free
              <span className="demo-cta-arrow">→</span>
            </a>
            <a href="/blog/astrology-systems" className="planetary-learn-link">
              How it works →
            </a>
          </div>
        </div>
      </div>
    </section>
  );
});

export default LandingPlanetaryDemo;
