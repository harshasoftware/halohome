/**
 * VastuCompassOverlay - SVG compass overlay showing Vastu directions
 *
 * Displays 8 directions with color-coded Vastu zones and element associations.
 * Can be positioned relative to a map or property.
 */

import React, { memo } from 'react';
import { cn } from '@/lib/utils';
import type { VastuDirection, VastuElement } from '@/stores/vastuStore';

// Direction angles (degrees from north, clockwise)
const DIRECTION_ANGLES: Record<VastuDirection, number> = {
  N: 0,
  NE: 45,
  E: 90,
  SE: 135,
  S: 180,
  SW: 225,
  W: 270,
  NW: 315,
  CENTER: 0, // Not used for compass points
};

// Element colors for each direction
const DIRECTION_COLORS: Record<VastuDirection, { bg: string; text: string; element: VastuElement }> = {
  N: { bg: '#3B82F6', text: '#FFFFFF', element: 'Water' },      // Blue - Water/Kubera
  NE: { bg: '#06B6D4', text: '#FFFFFF', element: 'Water' },     // Cyan - Water/Shiva
  E: { bg: '#F59E0B', text: '#000000', element: 'Air' },        // Amber - Air/Indra
  SE: { bg: '#EF4444', text: '#FFFFFF', element: 'Fire' },      // Red - Fire/Agni
  S: { bg: '#DC2626', text: '#FFFFFF', element: 'Fire' },       // Dark Red - Fire/Yama
  SW: { bg: '#92400E', text: '#FFFFFF', element: 'Earth' },     // Brown - Earth/Nairuti
  W: { bg: '#8B5CF6', text: '#FFFFFF', element: 'Space' },      // Purple - Space/Varuna
  NW: { bg: '#22D3EE', text: '#000000', element: 'Air' },       // Light Cyan - Air/Vayu
  CENTER: { bg: '#FFFFFF', text: '#000000', element: 'Space' }, // White - Space/Brahma
};

// Direction labels
const DIRECTION_LABELS: Record<VastuDirection, { short: string; full: string; deity: string }> = {
  N: { short: 'N', full: 'North', deity: 'Kubera' },
  NE: { short: 'NE', full: 'North-East', deity: 'Ishanya' },
  E: { short: 'E', full: 'East', deity: 'Indra' },
  SE: { short: 'SE', full: 'South-East', deity: 'Agni' },
  S: { short: 'S', full: 'South', deity: 'Yama' },
  SW: { short: 'SW', full: 'South-West', deity: 'Nairuti' },
  W: { short: 'W', full: 'West', deity: 'Varuna' },
  NW: { short: 'NW', full: 'North-West', deity: 'Vayu' },
  CENTER: { short: 'C', full: 'Center', deity: 'Brahma' },
};

interface VastuCompassOverlayProps {
  size?: number;
  rotation?: number; // Property orientation offset
  showLabels?: boolean;
  showElements?: boolean;
  highlightDirection?: VastuDirection | null;
  onDirectionClick?: (direction: VastuDirection) => void;
  className?: string;
  style?: React.CSSProperties;
}

const VastuCompassOverlay: React.FC<VastuCompassOverlayProps> = ({
  size = 200,
  rotation = 0,
  showLabels = true,
  showElements = false,
  highlightDirection = null,
  onDirectionClick,
  className,
  style,
}) => {
  const center = size / 2;
  const outerRadius = size * 0.45;
  const innerRadius = size * 0.25;
  const labelRadius = size * 0.38;

  const directions: VastuDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];

  // Calculate path for a wedge
  const createWedgePath = (startAngle: number, endAngle: number, inner: number, outer: number) => {
    const startRad = (startAngle - 90) * (Math.PI / 180);
    const endRad = (endAngle - 90) * (Math.PI / 180);

    const x1 = center + Math.cos(startRad) * outer;
    const y1 = center + Math.sin(startRad) * outer;
    const x2 = center + Math.cos(endRad) * outer;
    const y2 = center + Math.sin(endRad) * outer;
    const x3 = center + Math.cos(endRad) * inner;
    const y3 = center + Math.sin(endRad) * inner;
    const x4 = center + Math.cos(startRad) * inner;
    const y4 = center + Math.sin(startRad) * inner;

    return `M ${x1} ${y1} A ${outer} ${outer} 0 0 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 0 0 ${x4} ${y4} Z`;
  };

  // Calculate label position
  const getLabelPosition = (angle: number, radius: number) => {
    const rad = (angle - 90) * (Math.PI / 180);
    return {
      x: center + Math.cos(rad) * radius,
      y: center + Math.sin(rad) * radius,
    };
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('vastu-compass', className)}
      style={{
        transform: `rotate(${rotation}deg)`,
        ...style,
      }}
    >
      {/* Background circle */}
      <circle
        cx={center}
        cy={center}
        r={outerRadius + 2}
        fill="rgba(0,0,0,0.1)"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1"
      />

      {/* Direction wedges */}
      {directions.map((direction) => {
        const angle = DIRECTION_ANGLES[direction];
        const colors = DIRECTION_COLORS[direction];
        const isHighlighted = highlightDirection === direction;

        return (
          <g key={direction}>
            <path
              d={createWedgePath(angle - 22.5, angle + 22.5, innerRadius, outerRadius)}
              fill={colors.bg}
              fillOpacity={isHighlighted ? 1 : 0.7}
              stroke={isHighlighted ? '#FFFFFF' : 'rgba(255,255,255,0.3)'}
              strokeWidth={isHighlighted ? 2 : 1}
              className={cn(
                'transition-all duration-200',
                onDirectionClick && 'cursor-pointer hover:fill-opacity-100'
              )}
              onClick={() => onDirectionClick?.(direction)}
            />
          </g>
        );
      })}

      {/* Center circle (Brahmasthan) */}
      <circle
        cx={center}
        cy={center}
        r={innerRadius - 2}
        fill={DIRECTION_COLORS.CENTER.bg}
        fillOpacity={highlightDirection === 'CENTER' ? 1 : 0.8}
        stroke={highlightDirection === 'CENTER' ? '#FFFFFF' : 'rgba(0,0,0,0.2)'}
        strokeWidth={highlightDirection === 'CENTER' ? 2 : 1}
        className={cn(
          'transition-all duration-200',
          onDirectionClick && 'cursor-pointer hover:fill-opacity-100'
        )}
        onClick={() => onDirectionClick?.('CENTER')}
      />

      {/* Direction labels */}
      {showLabels && directions.map((direction) => {
        const angle = DIRECTION_ANGLES[direction];
        const colors = DIRECTION_COLORS[direction];
        const labels = DIRECTION_LABELS[direction];
        const pos = getLabelPosition(angle, labelRadius);

        return (
          <g key={`label-${direction}`} style={{ transform: `rotate(${-rotation}deg)`, transformOrigin: `${pos.x}px ${pos.y}px` }}>
            <text
              x={pos.x}
              y={pos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={size * 0.06}
              fontWeight="bold"
              fill={colors.text}
              style={{ pointerEvents: 'none' }}
            >
              {labels.short}
            </text>
            {showElements && (
              <text
                x={pos.x}
                y={pos.y + size * 0.05}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={size * 0.04}
                fill={colors.text}
                fillOpacity={0.8}
                style={{ pointerEvents: 'none' }}
              >
                {colors.element}
              </text>
            )}
          </g>
        );
      })}

      {/* Center label */}
      {showLabels && (
        <g style={{ transform: `rotate(${-rotation}deg)`, transformOrigin: `${center}px ${center}px` }}>
          <text
            x={center}
            y={center}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.05}
            fontWeight="bold"
            fill={DIRECTION_COLORS.CENTER.text}
            style={{ pointerEvents: 'none' }}
          >
            ॐ
          </text>
        </g>
      )}

      {/* North indicator arrow */}
      <polygon
        points={`${center},${size * 0.02} ${center - size * 0.03},${size * 0.08} ${center + size * 0.03},${size * 0.08}`}
        fill="#EF4444"
        stroke="#FFFFFF"
        strokeWidth="1"
      />
    </svg>
  );
};

export default memo(VastuCompassOverlay);

// Mini compass for map overlay - modern flat design with degree markings
// Double-click to toggle between mini (80px) and expanded (160px) modes
export const MiniVastuCompass: React.FC<{
  size?: number;
  rotation?: number;
  className?: string;
  defaultExpanded?: boolean;
}> = memo(({ size: initialSize = 80, rotation = 0, className, defaultExpanded = false }) => {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const size = isExpanded ? Math.max(initialSize * 2, 160) : initialSize;
  const center = size / 2;
  const outerRadius = size * 0.48;
  const innerRadius = size * 0.42;
  const needleLength = size * 0.32;
  const needleWidth = size * 0.05;

  // Generate tick marks - more detail when expanded
  const tickInterval = isExpanded ? 5 : 10;
  const tickCount = 360 / tickInterval;

  const tickMarks = [...Array(tickCount)].map((_, i) => {
    const degree = i * tickInterval;
    const rad = (degree - 90) * (Math.PI / 180);
    const isCardinal = degree % 90 === 0;
    const isIntercardinal = degree % 45 === 0 && !isCardinal;
    const isMajor = degree % 30 === 0;

    let tickInner: number;
    let strokeWidth: number;

    if (isCardinal) {
      tickInner = innerRadius * 0.7;
      strokeWidth = 2;
    } else if (isIntercardinal) {
      tickInner = innerRadius * 0.78;
      strokeWidth = 1.5;
    } else if (isMajor) {
      tickInner = innerRadius * 0.85;
      strokeWidth = 1;
    } else {
      tickInner = innerRadius * 0.9;
      strokeWidth = 0.5;
    }

    const tickOuter = innerRadius * 0.98;
    const x1 = center + Math.cos(rad) * tickInner;
    const y1 = center + Math.sin(rad) * tickInner;
    const x2 = center + Math.cos(rad) * tickOuter;
    const y2 = center + Math.sin(rad) * tickOuter;

    return { degree, x1, y1, x2, y2, strokeWidth, isCardinal };
  });

  const handleDoubleClick = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={cn('mini-vastu-compass cursor-pointer select-none', className)}
      style={{
        filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.15))',
        transition: 'width 0.3s ease, height 0.3s ease',
      }}
      onDoubleClick={handleDoubleClick}
      title="Double-click to expand/collapse"
    >
      {/* Outer ring */}
      <circle
        cx={center}
        cy={center}
        r={outerRadius}
        fill="white"
        stroke="#e5e5e5"
        strokeWidth="1"
      />

      {/* Inner circle */}
      <circle
        cx={center}
        cy={center}
        r={innerRadius}
        fill="white"
        stroke="#f0f0f0"
        strokeWidth="1"
      />

      {/* Degree tick marks */}
      {tickMarks.map(({ degree, x1, y1, x2, y2, strokeWidth, isCardinal }) => (
        <line
          key={degree}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          stroke={isCardinal ? '#333' : '#ccc'}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
        />
      ))}

      {/* Degree numbers when expanded */}
      {isExpanded && [30, 60, 120, 150, 210, 240, 300, 330].map((degree) => {
        const rad = (degree - 90) * (Math.PI / 180);
        const labelRadius = innerRadius * 0.55;
        const x = center + Math.cos(rad) * labelRadius;
        const y = center + Math.sin(rad) * labelRadius;

        return (
          <text
            key={degree}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.055}
            fill="#999"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="500"
          >
            {degree}°
          </text>
        );
      })}

      {/* Cardinal direction labels */}
      {[
        { label: 'N', angle: 0 },
        { label: 'E', angle: 90 },
        { label: 'S', angle: 180 },
        { label: 'W', angle: 270 },
      ].map(({ label, angle }) => {
        const rad = (angle - 90) * (Math.PI / 180);
        const labelRadius = innerRadius * (isExpanded ? 0.55 : 0.6);
        const x = center + Math.cos(rad) * labelRadius;
        const y = center + Math.sin(rad) * labelRadius;

        return (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={isExpanded ? size * 0.09 : size * 0.13}
            fontWeight="600"
            fill={label === 'N' ? '#e53935' : '#555'}
            fontFamily="system-ui, -apple-system, sans-serif"
          >
            {label}
          </text>
        );
      })}

      {/* Intercardinal labels when expanded */}
      {isExpanded && [
        { label: 'NE', angle: 45 },
        { label: 'SE', angle: 135 },
        { label: 'SW', angle: 225 },
        { label: 'NW', angle: 315 },
      ].map(({ label, angle }) => {
        const rad = (angle - 90) * (Math.PI / 180);
        const labelRadius = innerRadius * 0.55;
        const x = center + Math.cos(rad) * labelRadius;
        const y = center + Math.sin(rad) * labelRadius;

        return (
          <text
            key={label}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={size * 0.055}
            fill="#888"
            fontFamily="system-ui, -apple-system, sans-serif"
            fontWeight="500"
          >
            {label}
          </text>
        );
      })}

      {/* Compass needle group - rotates with map */}
      <g style={{ transform: `rotate(${rotation}deg)`, transformOrigin: `${center}px ${center}px` }}>
        {/* North needle (red) */}
        <polygon
          points={`
            ${center},${center - needleLength}
            ${center - needleWidth},${center}
            ${center + needleWidth},${center}
          `}
          fill="#e53935"
        />

        {/* South needle (dark gray) */}
        <polygon
          points={`
            ${center},${center + needleLength}
            ${center - needleWidth},${center}
            ${center + needleWidth},${center}
          `}
          fill="#424242"
        />

        {/* Center dot */}
        <circle
          cx={center}
          cy={center}
          r={size * 0.04}
          fill="#333"
        />
        <circle
          cx={center}
          cy={center}
          r={size * 0.015}
          fill="white"
        />
      </g>

      {/* Expand hint */}
      {!isExpanded && (
        <text
          x={center}
          y={size - 6}
          textAnchor="middle"
          fontSize={size * 0.1}
          fill="#bbb"
          fontFamily="system-ui, -apple-system, sans-serif"
        >
          ⤢
        </text>
      )}
    </svg>
  );
});
MiniVastuCompass.displayName = 'MiniVastuCompass';
