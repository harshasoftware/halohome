/**
 * Astrocartography Types
 * Type definitions for planetary line calculations
 */

// Planets supported in astrocartography
export type Planet =
  | 'Sun'
  | 'Moon'
  | 'Mercury'
  | 'Venus'
  | 'Mars'
  | 'Jupiter'
  | 'Saturn'
  | 'Uranus'
  | 'Neptune'
  | 'Pluto'
  | 'Chiron'
  | 'NorthNode';

export const ALL_PLANETS: Planet[] = [
  'Sun', 'Moon', 'Mercury', 'Venus', 'Mars',
  'Jupiter', 'Saturn', 'Uranus', 'Neptune', 'Pluto',
  'Chiron', 'NorthNode'
];

// Line types
export type LineType = 'MC' | 'IC' | 'ASC' | 'DSC';
export const ALL_LINE_TYPES: LineType[] = ['MC', 'IC', 'ASC', 'DSC'];

// Aspect types with their angles in degrees
export type AspectType = 'trine' | 'square' | 'sextile' | 'opposition';

export const ASPECT_ANGLES: Record<AspectType, number> = {
  sextile: 60,
  square: 90,
  trine: 120,
  opposition: 180,
};

// Planet colors for visualization
export const PLANET_COLORS: Record<Planet, string> = {
  Sun: '#FFD700',      // Gold
  Moon: '#C0C0C0',     // Silver
  Mercury: '#B8860B',  // Dark golden rod
  Venus: '#FF69B4',    // Hot pink
  Mars: '#DC143C',     // Crimson
  Jupiter: '#9400D3',  // Dark violet
  Saturn: '#8B4513',   // Saddle brown
  Uranus: '#00CED1',   // Dark turquoise
  Neptune: '#4169E1',  // Royal blue
  Pluto: '#2F4F4F',    // Dark slate gray
  Chiron: '#FF8C00',   // Dark orange - healing/bridging
  NorthNode: '#9932CC', // Dark orchid - karmic/destiny
};

// Line type styles
export const LINE_TYPE_STYLES: Record<LineType, { dash?: number[] }> = {
  MC: {},                    // Solid
  IC: { dash: [5, 5] },      // Dashed
  ASC: {},                   // Solid
  DSC: { dash: [2, 3] },     // Dotted
};

// Planetary position in equatorial coordinates
export interface PlanetaryPosition {
  planet: Planet;
  rightAscension: number;  // in radians
  declination: number;     // in radians
  eclipticLongitude: number; // in degrees (for display)
}

// A single point on the globe [latitude, longitude]
export type GlobePoint = [number, number];

/**
 * A main planetary line (MC, IC, ASC, DSC)
 *
 * **Renderer Contract for ASC/DSC lines:**
 * - Points are ordered by longitude (NOT sorted by latitude) to maintain correct polyline connectivity.
 * - Near the dateline or for circumpolar planets, there may be large latitude jumps between
 *   consecutive points. The renderer is responsible for detecting these jumps and splitting
 *   the line into separate segments to avoid visual artifacts.
 * - A typical threshold for splitting is when consecutive points differ by >45° latitude.
 */
export interface PlanetaryLine {
  planet: Planet;
  lineType: LineType;
  points: GlobePoint[];
  color: string;
  // For MC/IC lines, this is the single longitude value
  longitude?: number;
  // Flag to identify local space lines (azimuth-based, radiating from origin)
  isLocalSpace?: boolean;
  // For local space lines: the azimuth angle in degrees
  azimuth?: number;
  // For local space lines: cardinal direction (N, NE, E, etc.)
  direction?: string;
}

// An aspect line (planet forming aspect to an angle)
export interface AspectLine {
  planet: Planet;
  angle: LineType;           // Which angle the aspect is to: ASC, DSC, MC, IC
  aspectType: AspectType;    // trine, sextile, square
  direction: '+' | '-';      // + for applying, - for separating
  isHarmonious: boolean;     // true for trine/sextile (harmonious), false for square (challenging)
  points: GlobePoint[];
  color: string;
}

// A paran line (intersection of two planetary lines)
export interface ParanLine {
  planet1: Planet;
  angle1: LineType;
  planet2: Planet;
  angle2: LineType;
  latitude: number;
  longitude?: number;  // For point parans
  // Most parans are latitude circles
  isLatitudeCircle: boolean;
}

/**
 * A zenith point (where planet culminates directly overhead - 90° altitude).
 *
 * **Note:** This is the geographic point on the **MC meridian** where the planet reaches
 * zenith at the moment of upper culmination, NOT the instantaneous sub-planet point
 * (which would require hour angle / GHA for longitude). This MC-tied interpretation
 * is standard for astrocartography.
 */
export interface ZenithPoint {
  planet: Planet;
  latitude: number;    // = planet's declination (latitude where zenith occurs on MC)
  longitude: number;   // = MC line longitude (where planet culminates)
  declination: number; // planet's declination for reference
  maxAltitude: number; // always 90.0 at zenith
}

// Birth data input
export interface BirthData {
  date: Date;           // Birth date/time in UTC
  latitude: number;     // Birth location latitude
  longitude: number;    // Birth location longitude
  // Optional: raw local time data for WASM timezone conversion
  localDate?: string;   // Local date string in YYYY-MM-DD format
  localTime?: string;   // Local time string in HH:MM format
  lat?: number;         // Birth location latitude (alias for WASM)
  lng?: number;         // Birth location longitude (alias for WASM)
}

// Complete astrocartography result
export interface AstroCartographyResult {
  birthData: BirthData;
  julianDate: number;
  gmst: number;  // Greenwich Mean Sidereal Time in radians
  planetaryPositions: PlanetaryPosition[];
  planetaryLines: PlanetaryLine[];
  aspectLines: AspectLine[];
  paranLines: ParanLine[];
  zenithPoints: ZenithPoint[];
  calculationBackend: 'wasm' | 'worker' | 'main';
  calculationTime: number;  // milliseconds
}

// Calculation options
export interface AstroCalculationOptions {
  planets?: Planet[];           // Which planets to calculate (default: all)
  lineTypes?: LineType[];       // Which line types (default: all)
  includeAspects?: boolean;     // Include aspect lines (default: false)
  aspectTypes?: AspectType[];   // Which aspects (default: all major)
  includeParans?: boolean;      // Include paran lines (default: false)
  longitudeStep?: number;       // Step for line calculations (default: 1 degree)
}

// Default calculation options
export const DEFAULT_ASTRO_OPTIONS: Required<AstroCalculationOptions> = {
  planets: ALL_PLANETS,
  lineTypes: ALL_LINE_TYPES,
  includeAspects: false,
  aspectTypes: ['trine', 'square', 'sextile', 'opposition'],
  includeParans: false,
  longitudeStep: 1,
};

// Visibility state for UI controls
export interface AstroVisibilityState {
  planets: Record<Planet, boolean>;
  lineTypes: Record<LineType, boolean>;
  showAspects: boolean;
  showHarmoniousAspects: boolean;  // Trine, Sextile
  showDisharmoniousAspects: boolean;  // Square
  showParans: boolean;
  showZenithPoints: boolean;  // Zenith markers on MC lines
  showLocalSpace: boolean;  // Local Space azimuth lines from birth location
  showLineLabels: boolean;  // Labels on planetary lines (MC/IC/ASC/DSC)
}

// Create default visibility state (all visible)
export function createDefaultVisibility(): AstroVisibilityState {
  return {
    planets: Object.fromEntries(ALL_PLANETS.map(p => [p, true])) as Record<Planet, boolean>,
    lineTypes: Object.fromEntries(ALL_LINE_TYPES.map(lt => [lt, true])) as Record<LineType, boolean>,
    showAspects: false,
    showHarmoniousAspects: true,
    showDisharmoniousAspects: true,
    showParans: false,
    showZenithPoints: true,  // Show zenith markers by default
    showLocalSpace: false,  // Local Space lines off by default (professional feature)
    showLineLabels: false,  // Line labels off by default
  };
}

// Worker message types
export interface AstroWorkerRequest {
  type: 'calculate';
  id: string;
  birthData: BirthData;
  options: AstroCalculationOptions;
}

export interface AstroWorkerResponse {
  type: 'result' | 'progress' | 'error';
  id: string;
  result?: AstroCartographyResult;
  progress?: { percent: number; stage: string };
  error?: string;
}

// ============================================
// Relocation Chart Types
// ============================================

export interface RelocationLocation {
  lat: number;
  lng: number;
  name?: string;
}

// Legacy interface for backwards compatibility
export interface RelocationAnalysis {
  originalLocation: RelocationLocation;
  targetLocation: RelocationLocation;
  // Angular shifts
  ascendantShift: number;      // Degrees the ASC moved
  midheavenShift: number;      // Degrees the MC moved
  newAscendant: number;        // New ASC longitude in degrees
  newMidheaven: number;        // New MC longitude in degrees
  // Summary of changes
  significantChanges: string[];
}

// Relocation planet position from WASM calculation
export interface RelocationPlanetPosition {
  planet: string;
  longitude: number;           // Ecliptic longitude (same for both locations)
  signName: string;            // Mapped from sign_name
  degreeInSign: number;        // Mapped from degree_in_sign
  originalHouse: number;       // House in original chart
  relocatedHouse: number;      // House in relocated chart
  houseChanged: boolean;       // True if planet changed houses
}

// Full relocation chart result from WASM
export interface RelocationChartResult {
  // Original location data
  originalLat: number;
  originalLng: number;

  // Relocation data
  relocatedLat: number;
  relocatedLng: number;

  // Original chart angles
  originalAscendant: number;
  originalMidheaven: number;
  originalDescendant: number;
  originalIc: number;
  originalHouseCusps: number[];

  // Relocated chart angles
  relocatedAscendant: number;
  relocatedMidheaven: number;
  relocatedDescendant: number;
  relocatedIc: number;
  relocatedHouseCusps: number[];

  // Angular shifts (how much the angles moved)
  ascendantShift: number;
  midheavenShift: number;

  // Planet positions with both house placements
  planets: RelocationPlanetPosition[];

  // House system and settings
  houseSystem: string;
  zodiacType: string;
  ayanamsa?: number;

  // Metadata
  julianDate: number;
  calculationTime: number;
}

// ============================================
// Local Space Types
// ============================================

export interface LocalSpaceLine {
  planet: Planet;
  azimuth: number;           // 0-360° from North
  altitude: number;          // Degrees above/below horizon
  points: GlobePoint[];      // Line extending outward from birth location
  direction: string;         // Cardinal direction: "N", "NE", "E", etc.
  color: string;
}

export interface LocalSpaceResult {
  birthLocation: RelocationLocation;
  lines: LocalSpaceLine[];
  julianDate: number;
  calculationTime: number;
}

// Azimuth to cardinal direction
export function azimuthToDirection(azimuth: number): string {
  const normalized = ((azimuth % 360) + 360) % 360;
  if (normalized >= 337.5 || normalized < 22.5) return 'N';
  if (normalized >= 22.5 && normalized < 67.5) return 'NE';
  if (normalized >= 67.5 && normalized < 112.5) return 'E';
  if (normalized >= 112.5 && normalized < 157.5) return 'SE';
  if (normalized >= 157.5 && normalized < 202.5) return 'S';
  if (normalized >= 202.5 && normalized < 247.5) return 'SW';
  if (normalized >= 247.5 && normalized < 292.5) return 'W';
  return 'NW';
}

// Local Space line styles (dashed to differentiate from regular lines)
export const LOCAL_SPACE_LINE_STYLE = { dash: [8, 4] };

// Astrocartography mode
export type AstroMode = 'standard' | 'relocated' | 'localSpace';

// ============================================
// Natal Chart Types
// ============================================

// House systems supported
export type HouseSystem = 'placidus' | 'equal' | 'whole_sign' | 'koch' | 'campanus' | 'regiomontanus';

// Zodiac types
export type ZodiacType = 'tropical' | 'sidereal';

// Zodiac signs
export const ZODIAC_SIGNS = [
  { name: 'Aries', symbol: '♈', element: 'fire' },
  { name: 'Taurus', symbol: '♉', element: 'earth' },
  { name: 'Gemini', symbol: '♊', element: 'air' },
  { name: 'Cancer', symbol: '♋', element: 'water' },
  { name: 'Leo', symbol: '♌', element: 'fire' },
  { name: 'Virgo', symbol: '♍', element: 'earth' },
  { name: 'Libra', symbol: '♎', element: 'air' },
  { name: 'Scorpio', symbol: '♏', element: 'water' },
  { name: 'Sagittarius', symbol: '♐', element: 'fire' },
  { name: 'Capricorn', symbol: '♑', element: 'earth' },
  { name: 'Aquarius', symbol: '♒', element: 'air' },
  { name: 'Pisces', symbol: '♓', element: 'water' },
] as const;

// Natal planet position with house placement
export interface NatalPlanetPosition {
  planet: Planet;
  longitude: number;            // Tropical ecliptic longitude (0-360)
  longitudeSidereal?: number;   // Sidereal longitude if using Vedic
  signIndex: number;            // 0=Aries, 11=Pisces
  signName: string;
  degreeInSign: number;         // 0-30
  retrograde: boolean;
  house: number;                // Which house (1-12)
}

// Natal chart settings
export interface NatalChartSettings {
  houseSystem: HouseSystem;
  zodiacType: ZodiacType;
  showHouses: boolean;
  showAspects: boolean;
}

// Complete natal chart result
export interface NatalChartResult {
  // Chart angles
  ascendant: number;
  midheaven: number;
  descendant: number;
  imumCoeli: number;

  // House cusps (12)
  houseCusps: number[];
  houseSystem: HouseSystem;

  // Planet positions
  planets: NatalPlanetPosition[];

  // Zodiac info
  zodiacType: ZodiacType;
  ayanamsa?: number;  // Difference between tropical and sidereal (for Vedic)

  // Metadata
  julianDate: number;
  localSiderealTime: number;
  obliquity: number;
  calculationTime: number;
}

// Default natal chart settings
export const DEFAULT_NATAL_SETTINGS: NatalChartSettings = {
  houseSystem: 'placidus',
  zodiacType: 'tropical',
  showHouses: true,
  showAspects: false,
};
