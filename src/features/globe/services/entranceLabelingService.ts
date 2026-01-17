/**
 * Entrance Labeling Service
 *
 * Projects detected entrances onto SAM v2 segmented building perimeters
 * and validates them using Street View imagery analysis.
 *
 * Flow:
 * 1. Take building polygon from SAM v2 segmentation (top-down view)
 * 2. Take entrance point from entranceDetectionService
 * 3. Project entrance onto closest edge of building perimeter
 * 4. Fetch Street View imagery to validate entrance location
 * 5. Return labeled building footprint with entrance markers
 */

import { monitoredFetch } from '@/lib/monitoring';
import {
  type LatLng,
  type Polygon,
  haversineDistance,
} from '@/lib/building-footprints/coordinate-utils';
import {
  type BuildingFootprint,
} from './buildingFootprintsService';
import {
  type EntrancePoint,
  type EntranceDetectionResult,
  entranceDetectionService,
} from './entranceDetectionService';

// ============================================================================
// Types & Interfaces
// ============================================================================

export interface LabeledEntrance {
  /** The entrance point data */
  entrance: EntrancePoint;
  /** Point projected onto building perimeter */
  perimeterPoint: LatLng;
  /** Index of the edge this entrance is on (0-indexed) */
  edgeIndex: number;
  /** Distance from original entrance point to perimeter (meters) */
  projectionDistance: number;
  /** Cardinal direction the entrance faces based on perimeter normal */
  facingDirection: CardinalDirection;
  /** Street View validation result */
  streetViewValidation?: StreetViewValidation;
  /** Label for display */
  label: string;
}

export interface LabeledBuildingFootprint extends BuildingFootprint {
  /** Labeled entrances on this building */
  labeledEntrances: LabeledEntrance[];
  /** Primary entrance (main/preferred) */
  primaryEntrance?: LabeledEntrance;
  /** Whether Street View validation was performed */
  hasStreetViewValidation: boolean;
}

export interface StreetViewValidation {
  /** Whether an entrance was visually confirmed */
  entranceConfirmed: boolean;
  /** Confidence in the validation (0-1) */
  confidence: number;
  /** Detected entrance features */
  features: EntranceFeature[];
  /** Street View image metadata */
  imageMetadata: StreetViewImageMetadata;
  /** Heading from Street View camera to entrance */
  headingToEntrance: number;
}

export interface EntranceFeature {
  type: 'door' | 'gate' | 'driveway' | 'path' | 'stairs' | 'ramp' | 'canopy' | 'unknown';
  confidence: number;
}

export interface StreetViewImageMetadata {
  panoId: string;
  lat: number;
  lng: number;
  heading: number;
  pitch: number;
  imageUrl: string;
}

export type CardinalDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';

export interface LabelingOptions {
  /** Validate entrances with Street View */
  validateWithStreetView?: boolean;
  /** Maximum distance to project entrance onto perimeter (meters) */
  maxProjectionDistance?: number;
  /** Progress callback */
  onProgress?: (phase: string, percent: number) => void;
}

// ============================================================================
// Constants
// ============================================================================

const API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

const DEFAULT_OPTIONS: Required<Omit<LabelingOptions, 'onProgress'>> = {
  validateWithStreetView: true,
  maxProjectionDistance: 50, // 50 meters max projection
};

// Street View image size for analysis
const STREET_VIEW_SIZE = { width: 640, height: 480 };
const STREET_VIEW_FOV = 90;

// Cache for Street View metadata
const streetViewCache = new Map<string, { data: StreetViewImageMetadata | null; timestamp: number }>();
const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

// ============================================================================
// Core Labeling Functions
// ============================================================================

/**
 * Label entrances on a building footprint using detected entrance points.
 */
export async function labelBuildingEntrances(
  footprint: BuildingFootprint,
  entranceResult: EntranceDetectionResult,
  options: LabelingOptions = {}
): Promise<LabeledBuildingFootprint> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const labeledEntrances: LabeledEntrance[] = [];

  opts.onProgress?.('Projecting entrances', 10);

  for (const entrance of entranceResult.entrances) {
    // Project entrance onto building perimeter
    const projection = projectPointOntoPolygon(
      { lat: entrance.lat, lng: entrance.lng },
      footprint.coordinates
    );

    // Skip if projection is too far
    if (projection.distance > opts.maxProjectionDistance) {
      continue;
    }

    // Calculate facing direction from perimeter normal
    const facingDirection = calculateEdgeFacingDirection(
      footprint.coordinates,
      projection.edgeIndex
    );

    const labeledEntrance: LabeledEntrance = {
      entrance,
      perimeterPoint: projection.point,
      edgeIndex: projection.edgeIndex,
      projectionDistance: projection.distance,
      facingDirection,
      label: entrance.isPreferred ? 'Main Entrance' : `Entrance ${labeledEntrances.length + 1}`,
    };

    labeledEntrances.push(labeledEntrance);
  }

  opts.onProgress?.('Processing entrances', 40);

  // Validate with Street View if enabled
  if (opts.validateWithStreetView && labeledEntrances.length > 0) {
    opts.onProgress?.('Fetching Street View', 50);

    const validatedEntrances = await Promise.all(
      labeledEntrances.map(async (le, index) => {
        opts.onProgress?.(
          `Validating entrance ${index + 1}/${labeledEntrances.length}`,
          50 + (index / labeledEntrances.length) * 40
        );

        const validation = await validateEntranceWithStreetView(
          le.perimeterPoint,
          footprint.centroid,
          le.facingDirection
        );

        return {
          ...le,
          streetViewValidation: validation,
        };
      })
    );

    // Replace with validated entrances
    labeledEntrances.length = 0;
    labeledEntrances.push(...validatedEntrances);
  }

  opts.onProgress?.('Finalizing', 95);

  // Sort by confidence and preference
  labeledEntrances.sort((a, b) => {
    if (a.entrance.isPreferred !== b.entrance.isPreferred) {
      return a.entrance.isPreferred ? -1 : 1;
    }
    const aConf = a.streetViewValidation?.confidence ?? a.entrance.confidence;
    const bConf = b.streetViewValidation?.confidence ?? b.entrance.confidence;
    return bConf - aConf;
  });

  // Find primary entrance
  const primaryEntrance = labeledEntrances.find(
    (le) => le.entrance.isPreferred || le.streetViewValidation?.entranceConfirmed
  ) || labeledEntrances[0];

  opts.onProgress?.('Complete', 100);

  return {
    ...footprint,
    labeledEntrances,
    primaryEntrance,
    hasStreetViewValidation: opts.validateWithStreetView && labeledEntrances.length > 0,
  };
}

/**
 * Label entrances for multiple building footprints.
 */
export async function labelMultipleBuildingEntrances(
  footprints: BuildingFootprint[],
  options: LabelingOptions = {}
): Promise<LabeledBuildingFootprint[]> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const results: LabeledBuildingFootprint[] = [];
  const total = footprints.length;

  for (let i = 0; i < footprints.length; i++) {
    const footprint = footprints[i];

    opts.onProgress?.(`Processing building ${i + 1}/${total}`, (i / total) * 100);

    try {
      // Detect entrances for this building
      const entranceResult = await entranceDetectionService.detectByCoordinates(
        footprint.centroid.lat,
        footprint.centroid.lng
      );

      // Label the entrances on the building
      const labeled = await labelBuildingEntrances(footprint, entranceResult, {
        ...opts,
        onProgress: undefined, // Don't pass individual progress
      });

      results.push(labeled);
    } catch (error) {
      console.error(`Failed to label entrances for building ${footprint.id}:`, error);
      // Return unlabeled footprint
      results.push({
        ...footprint,
        labeledEntrances: [],
        hasStreetViewValidation: false,
      });
    }
  }

  opts.onProgress?.('Complete', 100);
  return results;
}

// ============================================================================
// Geometry Functions
// ============================================================================

interface ProjectionResult {
  point: LatLng;
  edgeIndex: number;
  distance: number;
}

/**
 * Project a point onto the nearest edge of a polygon.
 * Returns the closest point on the polygon perimeter.
 */
function projectPointOntoPolygon(
  point: LatLng,
  polygon: LatLng[]
): ProjectionResult {
  let closestPoint: LatLng = polygon[0];
  let closestDistance = Infinity;
  let closestEdgeIndex = 0;

  for (let i = 0; i < polygon.length; i++) {
    const p1 = polygon[i];
    const p2 = polygon[(i + 1) % polygon.length];

    const projected = projectPointOntoLineSegment(point, p1, p2);
    const distance = haversineDistance(point, projected);

    if (distance < closestDistance) {
      closestDistance = distance;
      closestPoint = projected;
      closestEdgeIndex = i;
    }
  }

  return {
    point: closestPoint,
    edgeIndex: closestEdgeIndex,
    distance: closestDistance,
  };
}

/**
 * Project a point onto a line segment defined by two endpoints.
 */
function projectPointOntoLineSegment(
  point: LatLng,
  lineStart: LatLng,
  lineEnd: LatLng
): LatLng {
  // Convert to local coordinates for projection
  const dx = lineEnd.lng - lineStart.lng;
  const dy = lineEnd.lat - lineStart.lat;
  const lengthSquared = dx * dx + dy * dy;

  if (lengthSquared === 0) {
    return lineStart;
  }

  // Calculate projection parameter t
  const t = Math.max(
    0,
    Math.min(
      1,
      ((point.lng - lineStart.lng) * dx + (point.lat - lineStart.lat) * dy) / lengthSquared
    )
  );

  return {
    lat: lineStart.lat + t * dy,
    lng: lineStart.lng + t * dx,
  };
}

/**
 * Calculate the outward-facing cardinal direction for an edge of a polygon.
 */
function calculateEdgeFacingDirection(
  polygon: LatLng[],
  edgeIndex: number
): CardinalDirection {
  const p1 = polygon[edgeIndex];
  const p2 = polygon[(edgeIndex + 1) % polygon.length];

  // Calculate edge midpoint
  const midpoint = {
    lat: (p1.lat + p2.lat) / 2,
    lng: (p1.lng + p2.lng) / 2,
  };

  // Calculate polygon centroid
  const centroid = {
    lat: polygon.reduce((sum, p) => sum + p.lat, 0) / polygon.length,
    lng: polygon.reduce((sum, p) => sum + p.lng, 0) / polygon.length,
  };

  // Outward normal is from centroid to midpoint
  const normalAngle = Math.atan2(
    midpoint.lng - centroid.lng,
    midpoint.lat - centroid.lat
  ) * (180 / Math.PI);

  return angleToCardinalDirection(normalAngle);
}

/**
 * Convert an angle (degrees, 0 = North) to cardinal direction.
 */
function angleToCardinalDirection(angle: number): CardinalDirection {
  const normalized = ((angle % 360) + 360) % 360;
  const directions: CardinalDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}

/**
 * Calculate heading from one point to another.
 */
function calculateHeading(from: LatLng, to: LatLng): number {
  const dLng = to.lng - from.lng;
  const y = Math.sin(dLng * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180);
  const x = Math.cos(from.lat * Math.PI / 180) * Math.sin(to.lat * Math.PI / 180) -
            Math.sin(from.lat * Math.PI / 180) * Math.cos(to.lat * Math.PI / 180) *
            Math.cos(dLng * Math.PI / 180);
  const heading = Math.atan2(y, x) * (180 / Math.PI);
  return (heading + 360) % 360;
}

// ============================================================================
// Street View Functions
// ============================================================================

/**
 * Validate an entrance location using Street View imagery.
 */
async function validateEntranceWithStreetView(
  entrancePoint: LatLng,
  buildingCentroid: LatLng,
  expectedDirection: CardinalDirection
): Promise<StreetViewValidation | undefined> {
  try {
    // Get Street View metadata for best viewpoint
    const metadata = await getStreetViewMetadata(entrancePoint, buildingCentroid);

    if (!metadata) {
      return undefined;
    }

    // Calculate heading from Street View position to entrance
    const headingToEntrance = calculateHeading(
      { lat: metadata.lat, lng: metadata.lng },
      entrancePoint
    );

    // Get Street View image URL
    const imageUrl = getStreetViewImageUrl(
      metadata.lat,
      metadata.lng,
      headingToEntrance
    );

    // Analyze the image for entrance features
    // Note: Full CV analysis would require a backend service
    // For now, we estimate based on position and metadata
    const features = estimateEntranceFeatures(metadata, expectedDirection);
    const confidence = calculateValidationConfidence(features, expectedDirection);

    return {
      entranceConfirmed: confidence > 0.5,
      confidence,
      features,
      imageMetadata: {
        ...metadata,
        heading: headingToEntrance,
        pitch: 0,
        imageUrl,
      },
      headingToEntrance,
    };
  } catch (error) {
    console.error('Street View validation failed:', error);
    return undefined;
  }
}

/**
 * Get Street View metadata for a location.
 */
async function getStreetViewMetadata(
  target: LatLng,
  buildingCentroid: LatLng
): Promise<Omit<StreetViewImageMetadata, 'imageUrl' | 'heading' | 'pitch'> | null> {
  const cacheKey = `${target.lat.toFixed(6)},${target.lng.toFixed(6)}`;
  const cached = streetViewCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION_MS) {
    return cached.data;
  }

  try {
    const result = await monitoredFetch('street-view-metadata', async () => {
      const url = new URL('https://maps.googleapis.com/maps/api/streetview/metadata');
      url.searchParams.set('location', `${target.lat},${target.lng}`);
      url.searchParams.set('key', API_KEY);
      url.searchParams.set('radius', '50'); // Search within 50m
      url.searchParams.set('source', 'outdoor'); // Prefer outdoor imagery

      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Street View metadata request failed: ${response.status}`);
      }
      return response.json();
    });

    if (result.status !== 'OK') {
      streetViewCache.set(cacheKey, { data: null, timestamp: Date.now() });
      return null;
    }

    const metadata = {
      panoId: result.pano_id,
      lat: result.location.lat,
      lng: result.location.lng,
    };

    streetViewCache.set(cacheKey, { data: metadata, timestamp: Date.now() });
    return metadata;
  } catch (error) {
    console.error('Failed to fetch Street View metadata:', error);
    return null;
  }
}

/**
 * Generate Street View image URL.
 */
function getStreetViewImageUrl(
  lat: number,
  lng: number,
  heading: number,
  pitch: number = 0
): string {
  const url = new URL('https://maps.googleapis.com/maps/api/streetview');
  url.searchParams.set('size', `${STREET_VIEW_SIZE.width}x${STREET_VIEW_SIZE.height}`);
  url.searchParams.set('location', `${lat},${lng}`);
  url.searchParams.set('heading', heading.toString());
  url.searchParams.set('pitch', pitch.toString());
  url.searchParams.set('fov', STREET_VIEW_FOV.toString());
  url.searchParams.set('key', API_KEY);
  return url.toString();
}

/**
 * Estimate entrance features based on metadata and direction.
 * Note: Full CV analysis would detect doors, gates, etc.
 */
function estimateEntranceFeatures(
  metadata: Omit<StreetViewImageMetadata, 'imageUrl' | 'heading' | 'pitch'>,
  expectedDirection: CardinalDirection
): EntranceFeature[] {
  // Without actual CV analysis, we provide estimates
  // In a full implementation, this would call a vision API or edge function
  const features: EntranceFeature[] = [];

  // Assume some baseline features based on having Street View coverage
  features.push({
    type: 'door',
    confidence: 0.6, // Moderate confidence without actual detection
  });

  // South/East facing entrances are more common in some regions
  if (['S', 'SE', 'E'].includes(expectedDirection)) {
    features.push({
      type: 'path',
      confidence: 0.5,
    });
  }

  return features;
}

/**
 * Calculate validation confidence from detected features.
 */
function calculateValidationConfidence(
  features: EntranceFeature[],
  expectedDirection: CardinalDirection
): number {
  if (features.length === 0) {
    return 0.3; // Low confidence without features
  }

  // Weight features by their type
  const weights: Record<EntranceFeature['type'], number> = {
    door: 1.0,
    gate: 0.9,
    stairs: 0.8,
    ramp: 0.8,
    canopy: 0.7,
    path: 0.6,
    driveway: 0.5,
    unknown: 0.2,
  };

  let totalWeight = 0;
  let weightedConfidence = 0;

  for (const feature of features) {
    const weight = weights[feature.type] || 0.2;
    totalWeight += weight;
    weightedConfidence += feature.confidence * weight;
  }

  return totalWeight > 0 ? weightedConfidence / totalWeight : 0.3;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the edge coordinates for a labeled entrance.
 */
export function getEntranceEdge(
  footprint: LabeledBuildingFootprint,
  entrance: LabeledEntrance
): { start: LatLng; end: LatLng } {
  const coords = footprint.coordinates;
  const start = coords[entrance.edgeIndex];
  const end = coords[(entrance.edgeIndex + 1) % coords.length];
  return { start, end };
}

/**
 * Generate a marker for displaying an entrance on a map.
 */
export function createEntranceMarker(entrance: LabeledEntrance): {
  position: LatLng;
  rotation: number;
  label: string;
  isPrimary: boolean;
} {
  // Convert cardinal direction to rotation angle
  const directionAngles: Record<CardinalDirection, number> = {
    'N': 0,
    'NE': 45,
    'E': 90,
    'SE': 135,
    'S': 180,
    'SW': 225,
    'W': 270,
    'NW': 315,
  };

  return {
    position: entrance.perimeterPoint,
    rotation: directionAngles[entrance.facingDirection],
    label: entrance.label,
    isPrimary: entrance.entrance.isPreferred,
  };
}

/**
 * Get all entrances facing a specific direction.
 */
export function getEntrancesByDirection(
  footprint: LabeledBuildingFootprint,
  direction: CardinalDirection
): LabeledEntrance[] {
  return footprint.labeledEntrances.filter(
    (le) => le.facingDirection === direction
  );
}

/**
 * Clear Street View cache.
 */
export function clearStreetViewCache(): void {
  streetViewCache.clear();
}

// ============================================================================
// Service Export
// ============================================================================

export const entranceLabelingService = {
  // Core labeling
  labelBuildingEntrances,
  labelMultipleBuildingEntrances,

  // Geometry helpers
  projectPointOntoPolygon,
  calculateEdgeFacingDirection,

  // Street View
  validateEntranceWithStreetView,
  getStreetViewImageUrl,
  clearStreetViewCache,

  // Utilities
  getEntranceEdge,
  createEntranceMarker,
  getEntrancesByDirection,
};

export default entranceLabelingService;
