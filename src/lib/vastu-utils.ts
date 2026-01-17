/**
 * Vastu Utility Functions
 *
 * Core calculations for Vastu analysis including:
 * - Property orientation calculation
 * - Zone analysis
 * - Vastu score calculation
 * - Remedy generation
 */

import type {
  Coordinates,
  VastuDirection,
  VastuElement,
  VastuPlanet,
  VastuZone,
  VastuRemedy,
  VastuAnalysis,
  PropertyShapeAnalysis,
  EntranceAnalysis,
  VASTU_ZONES,
} from '@/stores/vastuStore';

// Re-export zone definitions
export { VASTU_ZONES } from '@/stores/vastuStore';

/**
 * Calculate the orientation of a property from true north
 * Based on the longest edge of the property boundary
 */
export function calculateOrientation(boundary: Coordinates[]): number {
  if (boundary.length < 2) return 0;

  // Find the longest edge
  let maxLength = 0;
  let longestEdgeAngle = 0;

  for (let i = 0; i < boundary.length; i++) {
    const p1 = boundary[i];
    const p2 = boundary[(i + 1) % boundary.length];

    const dx = p2.lng - p1.lng;
    const dy = p2.lat - p1.lat;
    const length = Math.sqrt(dx * dx + dy * dy);

    if (length > maxLength) {
      maxLength = length;
      // Calculate angle from north (0°)
      longestEdgeAngle = Math.atan2(dx, dy) * (180 / Math.PI);
    }
  }

  // Normalize to 0-360
  return ((longestEdgeAngle % 360) + 360) % 360;
}

/**
 * Get the Vastu direction for a given angle from north
 */
export function getDirectionFromAngle(angle: number): VastuDirection {
  // Normalize angle to 0-360
  const normalizedAngle = ((angle % 360) + 360) % 360;

  // Each direction spans 45 degrees, centered on the cardinal/ordinal direction
  // North is centered at 0° (spans 337.5° to 22.5°)
  if (normalizedAngle >= 337.5 || normalizedAngle < 22.5) return 'N';
  if (normalizedAngle >= 22.5 && normalizedAngle < 67.5) return 'NE';
  if (normalizedAngle >= 67.5 && normalizedAngle < 112.5) return 'E';
  if (normalizedAngle >= 112.5 && normalizedAngle < 157.5) return 'SE';
  if (normalizedAngle >= 157.5 && normalizedAngle < 202.5) return 'S';
  if (normalizedAngle >= 202.5 && normalizedAngle < 247.5) return 'SW';
  if (normalizedAngle >= 247.5 && normalizedAngle < 292.5) return 'W';
  if (normalizedAngle >= 292.5 && normalizedAngle < 337.5) return 'NW';

  return 'N';
}

/**
 * Analyze the shape of a property
 */
export function analyzePropertyShape(boundary: Coordinates[]): PropertyShapeAnalysis {
  if (boundary.length < 3) {
    return {
      shape: 'irregular',
      isAuspicious: false,
      issues: ['Property boundary not defined'],
      recommendations: ['Draw the property boundary to analyze shape'],
    };
  }

  // Calculate the bounding box
  const lats = boundary.map(p => p.lat);
  const lngs = boundary.map(p => p.lng);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);

  const width = maxLng - minLng;
  const height = maxLat - minLat;
  const aspectRatio = width / height;

  // Calculate area of boundary vs bounding box to determine regularity
  const boundaryArea = calculatePolygonArea(boundary);
  const boxArea = width * height;
  const fillRatio = boundaryArea / boxArea;

  let shape: PropertyShapeAnalysis['shape'];
  let isAuspicious = false;
  const issues: string[] = [];
  const recommendations: string[] = [];

  // Determine shape based on fill ratio and aspect ratio
  if (fillRatio > 0.9) {
    // Nearly fills the bounding box - likely square or rectangle
    if (aspectRatio >= 0.9 && aspectRatio <= 1.1) {
      shape = 'square';
      isAuspicious = true;
    } else {
      shape = 'rectangle';
      isAuspicious = true;
    }
  } else if (fillRatio > 0.7) {
    // Possibly L-shaped or has an extension/cut
    if (boundary.length === 6) {
      shape = 'L-shaped';
      issues.push('L-shaped properties may have missing corners affecting certain directions');
      recommendations.push('Consider remedies for the missing corner direction');
    } else {
      shape = 'irregular';
      issues.push('Irregular shape may create energy imbalances');
      recommendations.push('Use mirrors or plants to correct energy flow');
    }
  } else if (fillRatio > 0.4 && boundary.length === 3) {
    shape = 'triangular';
    issues.push('Triangular plots are generally not recommended in Vastu');
    recommendations.push('Consider rectangular construction within the plot');
  } else {
    shape = 'irregular';
    issues.push('Highly irregular shape disrupts energy flow');
    recommendations.push('Regularize the usable area with fencing or landscaping');
  }

  return {
    shape,
    isAuspicious,
    issues,
    recommendations,
  };
}

/**
 * Calculate the area of a polygon using the Shoelace formula
 */
function calculatePolygonArea(boundary: Coordinates[]): number {
  let area = 0;
  const n = boundary.length;

  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    area += boundary[i].lng * boundary[j].lat;
    area -= boundary[j].lng * boundary[i].lat;
  }

  return Math.abs(area / 2);
}

/**
 * Analyze each Vastu zone based on property orientation
 */
export function analyzeZones(
  boundary: Coordinates[],
  orientation: number,
  entranceDirection?: VastuDirection
): VastuZone[] {
  const zones: VastuZone[] = [];
  const directions: VastuDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW', 'CENTER'];

  // Zone definitions with element, deity, planet, and ideal uses
  const zoneDefinitions: Record<VastuDirection, { element: VastuElement; deity: string; planet: VastuPlanet; idealUses: string[] }> = {
    N: { element: 'Water', deity: 'Kubera', planet: 'Mercury', idealUses: ['treasury', 'water-storage', 'entrance', 'living-room'] },
    NE: { element: 'Water', deity: 'Ishanya (Shiva)', planet: 'Jupiter', idealUses: ['prayer-room', 'meditation', 'water-source', 'open-space'] },
    E: { element: 'Air', deity: 'Indra', planet: 'Sun', idealUses: ['entrance', 'living-room', 'study', 'bathroom'] },
    SE: { element: 'Fire', deity: 'Agni', planet: 'Venus', idealUses: ['kitchen', 'electrical-room', 'generator'] },
    S: { element: 'Fire', deity: 'Yama', planet: 'Mars', idealUses: ['bedroom', 'storage', 'heavy-items'] },
    SW: { element: 'Earth', deity: 'Nairuti', planet: 'Rahu', idealUses: ['master-bedroom', 'storage', 'heavy-furniture'] },
    W: { element: 'Space', deity: 'Varuna', planet: 'Saturn', idealUses: ['dining', 'children-room', 'study', 'storage'] },
    NW: { element: 'Air', deity: 'Vayu', planet: 'Moon', idealUses: ['guest-room', 'garage', 'storage', 'bathroom'] },
    CENTER: { element: 'Space', deity: 'Brahma', planet: 'Sun', idealUses: ['open-courtyard', 'living-room', 'empty-space'] },
  };

  for (const direction of directions) {
    const def = zoneDefinitions[direction];
    const issues: string[] = [];
    const recommendations: string[] = [];
    let score = 80; // Base score

    // Adjust score based on orientation alignment
    // Perfect alignment with cardinal directions is ideal
    const orientationOffset = Math.abs(orientation % 45);
    if (orientationOffset > 10 && orientationOffset < 35) {
      score -= 10;
      issues.push('Property orientation is not aligned with cardinal directions');
      recommendations.push('Use symbolic corrections like placing a Vastu pyramid');
    }

    // Entrance direction affects specific zones
    if (entranceDirection) {
      if (entranceDirection === 'NE' && direction === 'NE') {
        score += 10;
      } else if (entranceDirection === 'SW' && direction === 'SW') {
        score -= 15;
        issues.push('Southwest entrance is not ideal in Vastu');
        recommendations.push('Add a threshold or small barrier to reduce negative effects');
      }
    }

    // Center (Brahmasthan) should ideally be open
    if (direction === 'CENTER') {
      recommendations.push('Keep the center area as open and clutter-free as possible');
    }

    zones.push({
      direction,
      element: def.element,
      deity: def.deity,
      planet: def.planet,
      idealUses: def.idealUses,
      score: Math.max(0, Math.min(100, score)),
      issues,
      recommendations,
    });
  }

  return zones;
}

/**
 * Analyze the entrance direction
 */
export function analyzeEntrance(direction: VastuDirection): EntranceAnalysis {
  // Entrance pada (1-4 for each direction)
  // Auspicious padas vary by direction
  const entranceData: Record<VastuDirection, { deity: string; isAuspicious: boolean; effects: string[] }> = {
    N: {
      deity: 'Kubera',
      isAuspicious: true,
      effects: ['Brings wealth and prosperity', 'Good for business success'],
    },
    NE: {
      deity: 'Ishanya',
      isAuspicious: true,
      effects: ['Most auspicious direction', 'Brings spiritual growth and harmony', 'Attracts positive energy'],
    },
    E: {
      deity: 'Indra',
      isAuspicious: true,
      effects: ['Brings fame and recognition', 'Good for health and vitality'],
    },
    SE: {
      deity: 'Agni',
      isAuspicious: false,
      effects: ['May increase conflicts', 'Risk of fire-related issues'],
    },
    S: {
      deity: 'Yama',
      isAuspicious: false,
      effects: ['May bring legal troubles', 'Health concerns possible'],
    },
    SW: {
      deity: 'Nairuti',
      isAuspicious: false,
      effects: ['Not recommended', 'May cause instability', 'Financial difficulties possible'],
    },
    W: {
      deity: 'Varuna',
      isAuspicious: true,
      effects: ['Moderate prosperity', 'Good for stability'],
    },
    NW: {
      deity: 'Vayu',
      isAuspicious: true,
      effects: ['Good for social connections', 'Travel opportunities'],
    },
    CENTER: {
      deity: 'Brahma',
      isAuspicious: false,
      effects: ['Not applicable for entrance'],
    },
  };

  const data = entranceData[direction];
  const recommendations: string[] = [];

  if (!data.isAuspicious) {
    recommendations.push(`Consider using an alternative entrance if possible`);
    recommendations.push(`Place a Vastu yantra near the entrance`);
    recommendations.push(`Use bright lighting at the entrance`);
  } else {
    recommendations.push(`Enhance with auspicious symbols`);
    recommendations.push(`Keep the entrance well-lit and clean`);
  }

  return {
    direction,
    pada: 2, // Default to pada 2 (middle range)
    isAuspicious: data.isAuspicious,
    deity: data.deity,
    effects: data.effects,
    recommendations,
  };
}

/**
 * Calculate element balance from zones
 */
export function calculateElementBalance(zones: VastuZone[]): Record<VastuElement, number> {
  const elements: VastuElement[] = ['Earth', 'Water', 'Fire', 'Air', 'Space'];
  const balance: Record<VastuElement, number> = {
    Earth: 0,
    Water: 0,
    Fire: 0,
    Air: 0,
    Space: 0,
  };

  // Weight by zone score
  let totalWeight = 0;
  for (const zone of zones) {
    balance[zone.element] += zone.score;
    totalWeight += zone.score;
  }

  // Normalize to percentages
  for (const element of elements) {
    balance[element] = Math.round((balance[element] / totalWeight) * 100);
  }

  return balance;
}

/**
 * Calculate overall Vastu score
 */
export function calculateVastuScore(
  zones: VastuZone[],
  propertyShape: PropertyShapeAnalysis,
  entrance: EntranceAnalysis | null
): number {
  // Base score from zone averages (60% weight)
  const zoneAvg = zones.reduce((sum, z) => sum + z.score, 0) / zones.length;

  // Shape score (20% weight)
  let shapeScore = propertyShape.isAuspicious ? 100 : 60;
  if (propertyShape.shape === 'square') shapeScore = 100;
  else if (propertyShape.shape === 'rectangle') shapeScore = 95;
  else if (propertyShape.shape === 'L-shaped') shapeScore = 70;
  else if (propertyShape.shape === 'triangular') shapeScore = 50;
  else shapeScore = 60;

  // Entrance score (20% weight)
  const entranceScore = entrance
    ? (entrance.isAuspicious ? 100 : 50)
    : 70; // Default if no entrance specified

  const overallScore = (zoneAvg * 0.6) + (shapeScore * 0.2) + (entranceScore * 0.2);

  return Math.round(Math.max(0, Math.min(100, overallScore)));
}

/**
 * Generate remedies based on analysis
 */
export function generateRemedies(
  zones: VastuZone[],
  propertyShape: PropertyShapeAnalysis,
  entrance: EntranceAnalysis | null
): VastuRemedy[] {
  const remedies: VastuRemedy[] = [];
  let remedyId = 0;

  // Zone-based remedies
  for (const zone of zones) {
    if (zone.score < 70) {
      const priority = zone.score < 50 ? 'high' : 'medium';

      for (const issue of zone.issues) {
        remedies.push({
          id: `remedy-${++remedyId}`,
          direction: zone.direction,
          issue,
          remedy: getRemedyForDirection(zone.direction, zone.element),
          priority,
          category: getCategoryForElement(zone.element),
        });
      }
    }
  }

  // Shape-based remedies
  if (!propertyShape.isAuspicious) {
    for (const issue of propertyShape.issues) {
      remedies.push({
        id: `remedy-${++remedyId}`,
        direction: 'CENTER',
        issue,
        remedy: 'Place a Vastu pyramid or copper wire grid in the center to balance energies',
        priority: 'medium',
        category: 'symbolic',
      });
    }
  }

  // Entrance-based remedies
  if (entrance && !entrance.isAuspicious) {
    remedies.push({
      id: `remedy-${++remedyId}`,
      direction: entrance.direction,
      issue: `${entrance.direction} facing entrance may bring challenges`,
      remedy: 'Install a bright light above the entrance, add auspicious symbols, and keep a water fountain nearby if possible',
      priority: 'high',
      category: 'placement',
    });
  }

  return remedies;
}

function getRemedyForDirection(direction: VastuDirection, element: VastuElement): string {
  const remedyMap: Record<VastuDirection, string> = {
    N: 'Place a water feature or aquarium in the North to enhance wealth energy',
    NE: 'Keep the Northeast clean and clutter-free; add a small water fountain or tulsi plant',
    E: 'Ensure good ventilation and natural light from the East; add green plants',
    SE: 'Keep fire-related appliances in the Southeast; use red or orange accents',
    S: 'Place heavy furniture in the South; use earth-toned colors',
    SW: 'Keep the Southwest heavier with storage; avoid water elements here',
    W: 'Add metallic objects or white/cream colors in the West',
    NW: 'Ensure good air circulation; place a wind chime in the Northwest',
    CENTER: 'Keep the Brahmasthan (center) open and well-lit; avoid heavy objects',
  };

  return remedyMap[direction] || 'Balance the energy with appropriate colors and elements';
}

function getCategoryForElement(element: VastuElement): VastuRemedy['category'] {
  switch (element) {
    case 'Water': return 'element';
    case 'Fire': return 'color';
    case 'Earth': return 'placement';
    case 'Air': return 'structural';
    case 'Space': return 'symbolic';
    default: return 'placement';
  }
}

/**
 * Generate a summary of the Vastu analysis
 */
export function generateSummary(
  score: number,
  propertyShape: PropertyShapeAnalysis,
  entrance: EntranceAnalysis | null,
  zones: VastuZone[]
): string {
  const summaryParts: string[] = [];

  // Overall assessment
  if (score >= 80) {
    summaryParts.push('This property has excellent Vastu compliance.');
  } else if (score >= 60) {
    summaryParts.push('This property has good Vastu with some areas for improvement.');
  } else if (score >= 40) {
    summaryParts.push('This property has moderate Vastu compliance and would benefit from remedies.');
  } else {
    summaryParts.push('This property has significant Vastu concerns that should be addressed.');
  }

  // Shape assessment
  if (propertyShape.isAuspicious) {
    summaryParts.push(`The ${propertyShape.shape} shape is favorable.`);
  } else {
    summaryParts.push(`The ${propertyShape.shape} shape requires attention.`);
  }

  // Entrance assessment
  if (entrance) {
    if (entrance.isAuspicious) {
      summaryParts.push(`The ${entrance.direction} entrance is auspicious.`);
    } else {
      summaryParts.push(`The ${entrance.direction} entrance needs remedial measures.`);
    }
  }

  // Highlight best zone
  const bestZone = zones.reduce((best, zone) =>
    zone.score > best.score ? zone : best
  , zones[0]);
  summaryParts.push(`The ${bestZone.direction} zone is your strongest area.`);

  return summaryParts.join(' ');
}

/**
 * Perform complete Vastu analysis
 */
export function performVastuAnalysis(
  address: string,
  coordinates: Coordinates,
  boundary: Coordinates[],
  entranceDirection?: VastuDirection
): VastuAnalysis {
  const orientation = calculateOrientation(boundary);
  const propertyShape = analyzePropertyShape(boundary);
  const zones = analyzeZones(boundary, orientation, entranceDirection);
  const entrance = entranceDirection ? analyzeEntrance(entranceDirection) : null;
  const elementBalance = calculateElementBalance(zones);
  const overallScore = calculateVastuScore(zones, propertyShape, entrance);
  const remedies = generateRemedies(zones, propertyShape, entrance);
  const summary = generateSummary(overallScore, propertyShape, entrance, zones);

  return {
    propertyAddress: address,
    propertyCoordinates: coordinates,
    orientation,
    overallScore,
    zones,
    propertyShape,
    entrance,
    elementBalance,
    remedies,
    summary,
    analyzedAt: new Date(),
  };
}
