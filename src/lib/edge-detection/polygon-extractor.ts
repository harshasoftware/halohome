/**
 * Polygon Extractor
 *
 * Converts detected edge lines into closed polygons representing property boundaries.
 * Uses contour detection and geometric analysis to identify distinct parcels.
 */

import { loadOpenCV, type Mat, type MatVector } from './opencv-loader';
import type { DetectedLine } from './canny-processor';
import {
  type LatLng,
  type BoundingBox,
  type Polygon,
  imagePixelToLatLng,
  createPolygon,
  calculatePolygonArea,
} from '../building-footprints/coordinate-utils';

export interface PixelPolygon {
  /** Polygon vertices in pixel coordinates */
  vertices: Array<{ x: number; y: number }>;
  /** Area in square pixels */
  area: number;
  /** Bounding box in pixels */
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  /** Centroid in pixel coordinates */
  centroid: { x: number; y: number };
  /** Perimeter length in pixels */
  perimeter: number;
  /** Number of vertices (indicates shape complexity) */
  vertexCount: number;
  /** Aspect ratio (width/height) */
  aspectRatio: number;
}

export interface ExtractedParcel extends Polygon {
  /** Unique identifier */
  id: string;
  /** Original pixel polygon */
  pixelPolygon: PixelPolygon;
  /** Shape classification */
  shape: 'square' | 'rectangle' | 'irregular' | 'L-shaped' | 'triangular';
  /** Confidence score (0-1) */
  confidence: number;
}

export interface PolygonExtractionConfig {
  /** Minimum area in square pixels to consider (default: 500) */
  minArea?: number;
  /** Maximum area in square pixels to consider (default: 100000) */
  maxArea?: number;
  /** Epsilon factor for polygon approximation (default: 0.02) */
  epsilon?: number;
  /** Minimum vertices for a valid polygon (default: 3) */
  minVertices?: number;
  /** Maximum vertices for a valid polygon (default: 20) */
  maxVertices?: number;
}

const DEFAULT_CONFIG: Required<PolygonExtractionConfig> = {
  minArea: 500,
  maxArea: 100000,
  epsilon: 0.02,
  minVertices: 3,
  maxVertices: 20,
};

/**
 * Extract polygons from edge-detected image using contour detection.
 */
export async function extractPolygonsFromEdges(
  edgeImageData: ImageData,
  config: PolygonExtractionConfig = {}
): Promise<PixelPolygon[]> {
  const cv = await loadOpenCV();
  const cfg = { ...DEFAULT_CONFIG, ...config };

  // Convert ImageData to OpenCV Mat
  const src = cv.matFromImageData(edgeImageData);
  const gray = new cv.Mat();
  const contours = new cv.MatVector();
  const hierarchy = new cv.Mat();

  try {
    // Ensure we have a grayscale image
    if (src.rows > 0 && src.cols > 0) {
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    } else {
      return [];
    }

    // Find contours
    cv.findContours(gray, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    const polygons: PixelPolygon[] = [];

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);

      // Filter by area
      if (area < cfg.minArea || area > cfg.maxArea) {
        contour.delete();
        continue;
      }

      // Approximate the contour to a polygon
      const perimeter = cv.arcLength(contour, true);
      const approx = new cv.Mat();
      cv.approxPolyDP(contour, approx, cfg.epsilon * perimeter, true);

      const vertexCount = approx.rows;

      // Filter by vertex count
      if (vertexCount < cfg.minVertices || vertexCount > cfg.maxVertices) {
        approx.delete();
        contour.delete();
        continue;
      }

      // Extract vertices
      const vertices: Array<{ x: number; y: number }> = [];
      for (let j = 0; j < approx.rows; j++) {
        const point = approx.intPtr(j, 0);
        vertices.push({
          x: approx.data32S[j * 2],
          y: approx.data32S[j * 2 + 1],
        });
      }

      // Get bounding rect
      const rect = cv.boundingRect(approx);

      // Calculate centroid
      const centroidX = vertices.reduce((sum, v) => sum + v.x, 0) / vertices.length;
      const centroidY = vertices.reduce((sum, v) => sum + v.y, 0) / vertices.length;

      // Calculate aspect ratio
      const aspectRatio = rect.width / rect.height;

      polygons.push({
        vertices,
        area,
        bounds: rect,
        centroid: { x: centroidX, y: centroidY },
        perimeter,
        vertexCount,
        aspectRatio,
      });

      approx.delete();
      contour.delete();
    }

    return polygons;
  } finally {
    src.delete();
    gray.delete();
    contours.delete();
    hierarchy.delete();
  }
}

/**
 * Alternative polygon extraction from detected lines.
 * Groups lines into closed shapes.
 */
export function extractPolygonsFromLines(
  lines: DetectedLine[],
  imageWidth: number,
  imageHeight: number,
  config: PolygonExtractionConfig = {}
): PixelPolygon[] {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  if (lines.length < 3) return [];

  // Find intersections between lines
  const intersections: Array<{ x: number; y: number; lineIndices: [number, number] }> = [];

  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      const intersection = lineIntersection(lines[i], lines[j]);
      if (
        intersection &&
        intersection.x >= 0 &&
        intersection.x <= imageWidth &&
        intersection.y >= 0 &&
        intersection.y <= imageHeight
      ) {
        intersections.push({
          x: intersection.x,
          y: intersection.y,
          lineIndices: [i, j],
        });
      }
    }
  }

  // Group intersections into potential polygons using connected components
  const polygons = findClosedRegions(intersections, lines, cfg);

  return polygons;
}

/**
 * Calculate intersection point of two lines.
 */
function lineIntersection(
  lineA: DetectedLine,
  lineB: DetectedLine
): { x: number; y: number } | null {
  const x1 = lineA.x1, y1 = lineA.y1, x2 = lineA.x2, y2 = lineA.y2;
  const x3 = lineB.x1, y3 = lineB.y1, x4 = lineB.x2, y4 = lineB.y2;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);

  if (Math.abs(denom) < 0.0001) {
    return null; // Lines are parallel
  }

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  // Check if intersection is within both line segments (with some tolerance)
  const tolerance = 0.1;
  if (t >= -tolerance && t <= 1 + tolerance && u >= -tolerance && u <= 1 + tolerance) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1),
    };
  }

  return null;
}

/**
 * Find closed regions from intersections.
 */
function findClosedRegions(
  intersections: Array<{ x: number; y: number; lineIndices: [number, number] }>,
  lines: DetectedLine[],
  config: Required<PolygonExtractionConfig>
): PixelPolygon[] {
  const polygons: PixelPolygon[] = [];

  // Simple approach: find cycles in the intersection graph
  // This is a simplified version - production would use more sophisticated graph algorithms

  const visited = new Set<string>();

  for (const start of intersections) {
    const startKey = `${Math.round(start.x)},${Math.round(start.y)}`;
    if (visited.has(startKey)) continue;

    // Try to find a cycle starting from this intersection
    const path = findCycle(start, intersections, lines, new Set([startKey]));

    if (path && path.length >= 3) {
      const area = calculatePixelPolygonArea(path);

      if (area >= config.minArea && area <= config.maxArea) {
        const bounds = getPixelBounds(path);
        const centroid = {
          x: path.reduce((sum, p) => sum + p.x, 0) / path.length,
          y: path.reduce((sum, p) => sum + p.y, 0) / path.length,
        };
        const perimeter = calculatePerimeter(path);

        polygons.push({
          vertices: path,
          area,
          bounds,
          centroid,
          perimeter,
          vertexCount: path.length,
          aspectRatio: bounds.width / bounds.height,
        });

        // Mark all points as visited
        for (const p of path) {
          visited.add(`${Math.round(p.x)},${Math.round(p.y)}`);
        }
      }
    }
  }

  return polygons;
}

/**
 * Find a cycle in the intersection graph.
 */
function findCycle(
  start: { x: number; y: number; lineIndices: [number, number] },
  intersections: Array<{ x: number; y: number; lineIndices: [number, number] }>,
  lines: DetectedLine[],
  visited: Set<string>,
  maxDepth: number = 8
): Array<{ x: number; y: number }> | null {
  if (maxDepth === 0) return null;

  // Find neighbors (intersections that share a line with the current point)
  const neighbors = intersections.filter((inter) => {
    const key = `${Math.round(inter.x)},${Math.round(inter.y)}`;
    if (visited.has(key)) return false;

    // Check if they share a line
    return (
      inter.lineIndices[0] === start.lineIndices[0] ||
      inter.lineIndices[0] === start.lineIndices[1] ||
      inter.lineIndices[1] === start.lineIndices[0] ||
      inter.lineIndices[1] === start.lineIndices[1]
    );
  });

  for (const neighbor of neighbors) {
    const neighborKey = `${Math.round(neighbor.x)},${Math.round(neighbor.y)}`;
    const newVisited = new Set(visited);
    newVisited.add(neighborKey);

    const subPath = findCycle(neighbor, intersections, lines, newVisited, maxDepth - 1);

    if (subPath) {
      return [{ x: start.x, y: start.y }, ...subPath];
    }
  }

  // If we've visited enough points and can close the loop
  if (visited.size >= 3) {
    return [{ x: start.x, y: start.y }];
  }

  return null;
}

/**
 * Calculate area of a pixel polygon using Shoelace formula.
 */
function calculatePixelPolygonArea(vertices: Array<{ x: number; y: number }>): number {
  let area = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    area += vertices[i].x * vertices[j].y;
    area -= vertices[j].x * vertices[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Get bounding box of pixel polygon.
 */
function getPixelBounds(
  vertices: Array<{ x: number; y: number }>
): { x: number; y: number; width: number; height: number } {
  const xs = vertices.map((v) => v.x);
  const ys = vertices.map((v) => v.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Calculate perimeter of a polygon.
 */
function calculatePerimeter(vertices: Array<{ x: number; y: number }>): number {
  let perimeter = 0;
  for (let i = 0; i < vertices.length; i++) {
    const j = (i + 1) % vertices.length;
    perimeter += Math.sqrt(
      Math.pow(vertices[j].x - vertices[i].x, 2) + Math.pow(vertices[j].y - vertices[i].y, 2)
    );
  }
  return perimeter;
}

/**
 * Convert pixel polygons to geographic coordinates.
 */
export function convertPolygonsToLatLng(
  pixelPolygons: PixelPolygon[],
  imageBounds: BoundingBox,
  imageWidth: number,
  imageHeight: number
): ExtractedParcel[] {
  return pixelPolygons.map((pixelPolygon, index) => {
    // Convert vertices to lat/lng
    const coordinates: LatLng[] = pixelPolygon.vertices.map((v) =>
      imagePixelToLatLng({ x: v.x, y: v.y }, imageWidth, imageHeight, imageBounds)
    );

    // Create the polygon
    const polygon = createPolygon(coordinates);

    // Classify the shape
    const shape = classifyShape(pixelPolygon);

    // Calculate confidence based on how clean the polygon is
    const confidence = calculateConfidence(pixelPolygon);

    return {
      ...polygon,
      id: `parcel-${index}-${Date.now()}`,
      pixelPolygon,
      shape,
      confidence,
    };
  });
}

/**
 * Classify the shape of a polygon.
 */
function classifyShape(polygon: PixelPolygon): ExtractedParcel['shape'] {
  const { vertexCount, aspectRatio, area, bounds } = polygon;

  // Calculate rectangularity (how close to a perfect rectangle)
  const boundingArea = bounds.width * bounds.height;
  const rectangularity = area / boundingArea;

  if (vertexCount === 3) {
    return 'triangular';
  }

  if (vertexCount === 4) {
    if (rectangularity > 0.9) {
      // Check if it's square or rectangle
      if (aspectRatio > 0.85 && aspectRatio < 1.15) {
        return 'square';
      }
      return 'rectangle';
    }
  }

  // Check for L-shape (typically 6 vertices with specific pattern)
  if (vertexCount === 6 && rectangularity > 0.6 && rectangularity < 0.85) {
    return 'L-shaped';
  }

  return 'irregular';
}

/**
 * Calculate confidence score for an extracted parcel.
 */
function calculateConfidence(polygon: PixelPolygon): number {
  let confidence = 1.0;

  // Penalize very small or very large polygons
  if (polygon.area < 1000) confidence *= 0.7;
  if (polygon.area > 50000) confidence *= 0.8;

  // Penalize many vertices (indicates noisy detection)
  if (polygon.vertexCount > 10) confidence *= 0.8;

  // Penalize very irregular aspect ratios
  if (polygon.aspectRatio > 5 || polygon.aspectRatio < 0.2) confidence *= 0.6;

  // Reward clean rectangular shapes
  const boundingArea = polygon.bounds.width * polygon.bounds.height;
  const rectangularity = polygon.area / boundingArea;
  if (rectangularity > 0.85) confidence *= 1.1;

  return Math.min(1.0, Math.max(0.1, confidence));
}

/**
 * Filter extracted parcels by quality criteria.
 */
export function filterQualityParcels(
  parcels: ExtractedParcel[],
  options: {
    minConfidence?: number;
    minAreaSqMeters?: number;
    maxAreaSqMeters?: number;
  } = {}
): ExtractedParcel[] {
  const {
    minConfidence = 0.5,
    minAreaSqMeters = 100, // ~1000 sq ft minimum
    maxAreaSqMeters = 50000, // ~500,000 sq ft maximum
  } = options;

  return parcels.filter((parcel) => {
    if (parcel.confidence < minConfidence) return false;
    if (parcel.area < minAreaSqMeters) return false;
    if (parcel.area > maxAreaSqMeters) return false;
    return true;
  });
}
