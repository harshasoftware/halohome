/**
 * Constellation Component
 *
 * Renders constellation patterns with stars and connecting lines.
 * Randomly scattered throughout the page with GSAP scroll animations.
 */

import React, { useRef, useEffect, memo, useMemo } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

// Constellation data: stars as [x, y] percentages, lines as [starIndex1, starIndex2]
interface ConstellationData {
  name: string;
  stars: [number, number][];
  lines: [number, number][];
}

// Simplified constellation patterns (normalized to 0-100 coordinate space)
const CONSTELLATIONS: ConstellationData[] = [
  // Orion
  { name: 'Orion', stars: [[50, 10], [35, 25], [65, 25], [30, 40], [50, 45], [70, 40], [45, 60], [55, 60], [40, 80], [50, 75], [60, 80]], lines: [[0, 1], [0, 2], [1, 3], [2, 5], [3, 4], [4, 5], [4, 6], [4, 7], [6, 8], [6, 9], [7, 9], [7, 10]] },
  // Ursa Major (Big Dipper)
  { name: 'Ursa Major', stars: [[20, 30], [35, 25], [50, 30], [65, 35], [75, 50], [85, 55], [80, 70]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 3]] },
  // Leo
  { name: 'Leo', stars: [[25, 20], [15, 35], [30, 40], [20, 55], [35, 60], [55, 50], [70, 55], [85, 60]], lines: [[0, 1], [1, 2], [2, 0], [1, 3], [3, 4], [4, 5], [5, 6], [6, 7]] },
  // Scorpius
  { name: 'Scorpius', stars: [[20, 20], [30, 30], [40, 35], [50, 40], [55, 50], [50, 60], [55, 70], [65, 75], [75, 70]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8]] },
  // Cygnus (Northern Cross)
  { name: 'Cygnus', stars: [[50, 15], [50, 35], [50, 55], [50, 75], [25, 45], [75, 45]], lines: [[0, 1], [1, 2], [2, 3], [4, 2], [2, 5]] },
  // Cassiopeia
  { name: 'Cassiopeia', stars: [[15, 50], [30, 30], [50, 50], [70, 30], [85, 50]], lines: [[0, 1], [1, 2], [2, 3], [3, 4]] },
  // Gemini
  { name: 'Gemini', stars: [[30, 15], [70, 15], [25, 35], [40, 40], [60, 40], [75, 35], [35, 60], [65, 60]], lines: [[0, 2], [2, 3], [3, 6], [1, 5], [5, 4], [4, 7], [3, 4]] },
  // Taurus
  { name: 'Taurus', stars: [[50, 50], [35, 45], [25, 35], [15, 25], [60, 40], [75, 35], [85, 45]], lines: [[0, 1], [1, 2], [2, 3], [0, 4], [4, 5], [5, 6]] },
  // Aquarius
  { name: 'Aquarius', stars: [[30, 20], [45, 25], [55, 20], [60, 35], [50, 45], [40, 55], [55, 65], [70, 75]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]] },
  // Pisces
  { name: 'Pisces', stars: [[20, 30], [30, 40], [45, 35], [55, 45], [70, 40], [80, 30], [60, 60], [50, 70]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [3, 6], [6, 7]] },
  // Pegasus
  { name: 'Pegasus', stars: [[25, 25], [75, 25], [75, 75], [25, 75], [10, 50], [90, 40]], lines: [[0, 1], [1, 2], [2, 3], [3, 0], [0, 4], [1, 5]] },
  // Draco
  { name: 'Draco', stars: [[20, 20], [35, 30], [50, 25], [60, 40], [50, 55], [35, 60], [25, 75], [40, 85]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7]] },
  // Andromeda
  { name: 'Andromeda', stars: [[15, 50], [30, 45], [50, 50], [70, 45], [85, 40], [55, 35]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5]] },
  // Libra
  { name: 'Libra', stars: [[50, 20], [30, 40], [70, 40], [20, 60], [50, 55], [80, 60]], lines: [[0, 1], [0, 2], [1, 3], [1, 4], [2, 4], [2, 5]] },
  // Sagittarius
  { name: 'Sagittarius', stars: [[40, 20], [55, 30], [45, 45], [60, 50], [30, 55], [50, 65], [70, 60]], lines: [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [5, 6], [3, 6]] },
  // Crux (Southern Cross)
  { name: 'Crux', stars: [[50, 15], [25, 50], [75, 50], [50, 85]], lines: [[0, 3], [1, 2]] },
  // Lyra
  { name: 'Lyra', stars: [[50, 15], [35, 40], [65, 40], [30, 65], [50, 75], [70, 65]], lines: [[0, 1], [0, 2], [1, 3], [2, 5], [3, 4], [4, 5], [1, 2]] },
  // Corona Borealis
  { name: 'Corona Borealis', stars: [[15, 50], [25, 35], [40, 25], [60, 25], [75, 35], [85, 50]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5]] },
  // Aquila
  { name: 'Aquila', stars: [[50, 20], [35, 40], [65, 40], [50, 55], [30, 70], [70, 70]], lines: [[0, 1], [0, 2], [1, 3], [2, 3], [3, 4], [3, 5]] },
  // Vela
  { name: 'Vela', stars: [[30, 20], [50, 35], [70, 25], [40, 55], [60, 60], [50, 80]], lines: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5]] },
  // Hydra
  { name: 'Hydra', stars: [[10, 30], [25, 35], [40, 30], [55, 40], [70, 35], [85, 45], [75, 60]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]] },
  // Corvus
  { name: 'Corvus', stars: [[30, 30], [70, 30], [80, 60], [50, 70], [20, 60]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 0]] },
  // Perseus
  { name: 'Perseus', stars: [[50, 15], [40, 30], [60, 35], [35, 50], [55, 55], [45, 75], [65, 70]], lines: [[0, 1], [0, 2], [1, 3], [2, 4], [3, 5], [4, 6]] },
  // Hercules
  { name: 'Hercules', stars: [[40, 25], [60, 25], [35, 45], [65, 45], [30, 65], [50, 60], [70, 65]], lines: [[0, 1], [0, 2], [1, 3], [2, 3], [2, 4], [3, 6], [4, 5], [5, 6]] },
  // Ursa Minor (Little Dipper)
  { name: 'Ursa Minor', stars: [[50, 15], [45, 30], [55, 45], [50, 60], [40, 70], [60, 75], [50, 85]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [3, 5], [4, 6], [5, 6]] },
];

// Generate random constellation placements spread across viewport
const generateRandomPlacements = (count: number, seed: number = 42) => {
  const placements: {
    constellation: ConstellationData;
    x: number;
    y: number;
    size: number;
    opacity: number;
    rotation: number;
  }[] = [];

  // Simple seeded random for consistent placement
  let s = seed;
  const random = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };

  for (let i = 0; i < count; i++) {
    const constellation = CONSTELLATIONS[Math.floor(random() * CONSTELLATIONS.length)];
    // Spread across the full viewport height (0-100vh)
    // Alternate left and right sides
    const isLeftSide = i % 2 === 0;
    placements.push({
      constellation,
      x: isLeftSide ? random() * 30 + 5 : random() * 30 + 65, // Left: 5-35%, Right: 65-95%
      y: (i / count) * 100 + random() * 15, // Spread evenly with some randomness
      size: 80 + random() * 60, // 80-140px
      opacity: 0.15 + random() * 0.1, // 0.15-0.25
      rotation: random() * 360,
    });
  }

  return placements;
};

// Individual constellation component
const ConstellationSVG = memo(({
  data,
  size,
  opacity,
  rotation,
  delay
}: {
  data: ConstellationData;
  size: number;
  opacity: number;
  rotation: number;
  delay: number;
}) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current) return;

    const svg = svgRef.current;
    const stars = svg.querySelectorAll('.c-star');
    const lines = svg.querySelectorAll('.c-line');

    // Animate in after delay
    const ctx = gsap.context(() => {
      // Stars twinkle in
      gsap.fromTo(stars,
        { scale: 0, opacity: 0 },
        {
          scale: 1,
          opacity: 1,
          duration: 0.8,
          delay: delay,
          stagger: { each: 0.1, from: 'random' },
          ease: 'back.out(2)'
        }
      );

      // Lines draw in
      gsap.fromTo(lines,
        { strokeDashoffset: 50, opacity: 0 },
        {
          strokeDashoffset: 0,
          opacity: 0.5,
          duration: 0.6,
          delay: delay + 0.3,
          stagger: 0.1,
          ease: 'power2.out'
        }
      );

      // Subtle floating animation
      gsap.to(svg, {
        y: '+=8',
        duration: 3 + Math.random() * 2,
        ease: 'sine.inOut',
        repeat: -1,
        yoyo: true,
        delay: Math.random() * 2
      });
    }, svg);

    return () => ctx.revert();
  }, [delay]);

  return (
    <svg
      ref={svgRef}
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        opacity,
        transform: `rotate(${rotation}deg)`,
      }}
    >
      {/* Lines */}
      {data.lines.map(([from, to], i) => {
        const [x1, y1] = data.stars[from];
        const [x2, y2] = data.stars[to];
        return (
          <line
            key={`l${i}`}
            className="c-line"
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="rgba(255,255,255,0.5)"
            strokeWidth="0.5"
            strokeDasharray="50"
            strokeDashoffset="50"
          />
        );
      })}
      {/* Stars */}
      {data.stars.map(([x, y], i) => (
        <circle
          key={`s${i}`}
          className="c-star"
          cx={x}
          cy={y}
          r={i === 0 ? 2 : 1.2}
          fill="white"
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      ))}
    </svg>
  );
});

ConstellationSVG.displayName = 'ConstellationSVG';

// Main component that renders all constellations
export const LandingConstellations = memo(() => {
  const placements = useMemo(() => generateRandomPlacements(12), []);

  return (
    <div
      className="constellations-layer"
      style={{
        position: 'fixed',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'hidden',
      }}
    >
      {placements.map((p, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${p.x}%`,
            top: `${p.y}vh`,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <ConstellationSVG
            data={p.constellation}
            size={p.size}
            opacity={p.opacity}
            rotation={p.rotation}
            delay={i * 0.15}
          />
        </div>
      ))}
    </div>
  );
});

LandingConstellations.displayName = 'LandingConstellations';

export default LandingConstellations;
