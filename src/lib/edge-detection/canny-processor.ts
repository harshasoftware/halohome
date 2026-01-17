/**
 * Canny Edge Detection Processor
 *
 * Uses OpenCV.js to detect edges in map images that represent property boundaries.
 * Applies preprocessing to enhance boundary line visibility.
 */

import { loadOpenCV, type OpenCV, type Mat } from './opencv-loader';

export interface DetectedLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  length: number;
  angle: number; // degrees from horizontal
}

export interface EdgeDetectionConfig {
  /** Low threshold for Canny edge detection (default: 50) */
  cannyLow?: number;
  /** High threshold for Canny edge detection (default: 150) */
  cannyHigh?: number;
  /** Gaussian blur kernel size (default: 5) */
  blurSize?: number;
  /** Minimum line length for Hough transform (default: 50) */
  minLineLength?: number;
  /** Maximum gap between line segments to treat as single line (default: 10) */
  maxLineGap?: number;
  /** Accumulator threshold for Hough transform (default: 50) */
  houghThreshold?: number;
}

const DEFAULT_CONFIG: Required<EdgeDetectionConfig> = {
  cannyLow: 50,
  cannyHigh: 150,
  blurSize: 5,
  minLineLength: 50,
  maxLineGap: 10,
  houghThreshold: 50,
};

/**
 * Detect edges in an image using Canny edge detection.
 */
export async function detectEdges(
  imageData: ImageData,
  config: EdgeDetectionConfig = {}
): Promise<ImageData> {
  const cv = await loadOpenCV();
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Convert ImageData to OpenCV Mat
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();

  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // Apply Gaussian blur to reduce noise
    const ksize = new cv.Size(cfg.blurSize, cfg.blurSize);
    cv.GaussianBlur(gray, blurred, ksize, 0);

    // Apply Canny edge detection
    cv.Canny(blurred, edges, cfg.cannyLow, cfg.cannyHigh);

    // Convert back to RGBA for visualization
    const result = new cv.Mat();
    cv.cvtColor(edges, result, cv.COLOR_GRAY2RGBA);

    // Create output ImageData
    const outputData = new ImageData(
      new Uint8ClampedArray(result.data),
      result.cols,
      result.rows
    );

    result.delete();
    return outputData;
  } finally {
    // Clean up OpenCV matrices
    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
  }
}

/**
 * Detect straight lines using Hough Line Transform.
 */
export async function detectLines(
  imageData: ImageData,
  config: EdgeDetectionConfig = {}
): Promise<DetectedLine[]> {
  const cv = await loadOpenCV();
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Convert ImageData to OpenCV Mat
  const src = cv.matFromImageData(imageData);
  const gray = new cv.Mat();
  const blurred = new cv.Mat();
  const edges = new cv.Mat();
  const lines = new cv.Mat();

  try {
    // Convert to grayscale
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);

    // Apply Gaussian blur
    const ksize = new cv.Size(cfg.blurSize, cfg.blurSize);
    cv.GaussianBlur(gray, blurred, ksize, 0);

    // Apply Canny edge detection
    cv.Canny(blurred, edges, cfg.cannyLow, cfg.cannyHigh);

    // Apply Probabilistic Hough Line Transform
    cv.HoughLinesP(
      edges,
      lines,
      1, // rho resolution in pixels
      Math.PI / 180, // theta resolution in radians
      cfg.houghThreshold,
      cfg.minLineLength,
      cfg.maxLineGap
    );

    // Extract line data
    const detectedLines: DetectedLine[] = [];
    for (let i = 0; i < lines.rows; i++) {
      const x1 = lines.data32S[i * 4];
      const y1 = lines.data32S[i * 4 + 1];
      const x2 = lines.data32S[i * 4 + 2];
      const y2 = lines.data32S[i * 4 + 3];

      const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
      const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);

      detectedLines.push({ x1, y1, x2, y2, length, angle });
    }

    return detectedLines;
  } finally {
    // Clean up OpenCV matrices
    src.delete();
    gray.delete();
    blurred.delete();
    edges.delete();
    lines.delete();
  }
}

/**
 * Filter lines to keep only those likely to be property boundaries.
 * Property boundaries tend to be:
 * - Horizontal or vertical (0°, 90°, 180°, 270°)
 * - Or at 45° angles
 * - Relatively long
 */
export function filterBoundaryLines(
  lines: DetectedLine[],
  options: {
    minLength?: number;
    angleTolerance?: number;
  } = {}
): DetectedLine[] {
  const { minLength = 30, angleTolerance = 10 } = options;

  const targetAngles = [0, 45, 90, 135, 180, -45, -90, -135, -180];

  return lines.filter((line) => {
    // Filter by length
    if (line.length < minLength) return false;

    // Check if angle is close to a target angle
    const normalizedAngle = ((line.angle % 180) + 180) % 180;
    const isAlignedAngle = targetAngles.some((target) => {
      const normalizedTarget = ((target % 180) + 180) % 180;
      return Math.abs(normalizedAngle - normalizedTarget) <= angleTolerance;
    });

    return isAlignedAngle;
  });
}

/**
 * Merge nearby parallel lines into single lines.
 * This helps consolidate double-detected boundaries.
 */
export function mergeNearbyLines(
  lines: DetectedLine[],
  options: {
    distanceThreshold?: number;
    angleTolerance?: number;
  } = {}
): DetectedLine[] {
  const { distanceThreshold = 20, angleTolerance = 5 } = options;

  if (lines.length === 0) return [];

  const merged: DetectedLine[] = [];
  const used = new Set<number>();

  for (let i = 0; i < lines.length; i++) {
    if (used.has(i)) continue;

    const lineA = lines[i];
    const group = [lineA];
    used.add(i);

    for (let j = i + 1; j < lines.length; j++) {
      if (used.has(j)) continue;

      const lineB = lines[j];

      // Check if angles are similar
      const angleDiff = Math.abs(lineA.angle - lineB.angle);
      if (angleDiff > angleTolerance && Math.abs(angleDiff - 180) > angleTolerance) {
        continue;
      }

      // Check if lines are close (perpendicular distance)
      const distance = perpendicularDistance(lineA, lineB);
      if (distance <= distanceThreshold) {
        group.push(lineB);
        used.add(j);
      }
    }

    // Merge the group into a single line
    if (group.length > 0) {
      merged.push(mergeLineGroup(group));
    }
  }

  return merged;
}

/**
 * Calculate perpendicular distance between two parallel lines.
 */
function perpendicularDistance(lineA: DetectedLine, lineB: DetectedLine): number {
  // Midpoint of line B
  const midX = (lineB.x1 + lineB.x2) / 2;
  const midY = (lineB.y1 + lineB.y2) / 2;

  // Distance from midpoint to line A
  const dx = lineA.x2 - lineA.x1;
  const dy = lineA.y2 - lineA.y1;
  const len = Math.sqrt(dx * dx + dy * dy);

  if (len === 0) return Infinity;

  // Perpendicular distance formula
  const distance =
    Math.abs(dy * midX - dx * midY + lineA.x2 * lineA.y1 - lineA.y2 * lineA.x1) / len;

  return distance;
}

/**
 * Merge a group of parallel lines into a single representative line.
 */
function mergeLineGroup(group: DetectedLine[]): DetectedLine {
  // Find the extreme points
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;

  for (const line of group) {
    minX = Math.min(minX, line.x1, line.x2);
    minY = Math.min(minY, line.y1, line.y2);
    maxX = Math.max(maxX, line.x1, line.x2);
    maxY = Math.max(maxY, line.y1, line.y2);
  }

  // Use the average angle
  const avgAngle = group.reduce((sum, l) => sum + l.angle, 0) / group.length;
  const angleRad = avgAngle * (Math.PI / 180);

  // Create a line along the average direction through the centroid
  const centroidX = (minX + maxX) / 2;
  const centroidY = (minY + maxY) / 2;

  // Project points onto the average direction
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);

  let minProj = Infinity, maxProj = -Infinity;
  for (const line of group) {
    for (const [x, y] of [[line.x1, line.y1], [line.x2, line.y2]]) {
      const proj = (x - centroidX) * cos + (y - centroidY) * sin;
      minProj = Math.min(minProj, proj);
      maxProj = Math.max(maxProj, proj);
    }
  }

  // Create the merged line
  const x1 = centroidX + minProj * cos;
  const y1 = centroidY + minProj * sin;
  const x2 = centroidX + maxProj * cos;
  const y2 = centroidY + maxProj * sin;

  const length = Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));

  return { x1, y1, x2, y2, length, angle: avgAngle };
}

/**
 * Visualize detected lines on a canvas.
 */
export function drawLinesOnCanvas(
  canvas: HTMLCanvasElement,
  lines: DetectedLine[],
  options: {
    color?: string;
    lineWidth?: number;
    showEndpoints?: boolean;
  } = {}
): void {
  const { color = '#ff0000', lineWidth = 2, showEndpoints = false } = options;

  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;

  for (const line of lines) {
    ctx.beginPath();
    ctx.moveTo(line.x1, line.y1);
    ctx.lineTo(line.x2, line.y2);
    ctx.stroke();

    if (showEndpoints) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(line.x1, line.y1, 3, 0, 2 * Math.PI);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(line.x2, line.y2, 3, 0, 2 * Math.PI);
      ctx.fill();
    }
  }
}
