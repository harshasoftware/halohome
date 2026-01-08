/**
 * LineInfoCard Component
 * Displays information about a clicked planetary line
 */

import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, MapPin, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { PLANET_COLORS } from '@/lib/astro-types';
import { CitiesAlongLine } from './CitiesAlongLine';
import type { GlobePath } from './MigrationGlobe';
import type { ZenithPointData, CityInfluence } from '@/lib/city-line-utils';
import { findNearestCitiesToPointAsync } from '@/lib/city-line-utils';

interface LineInfoCardProps {
  line: GlobePath;
  onClose: () => void;
  zenithPoint?: ZenithPointData | null;
  isMobile?: boolean;
  isBottomSheet?: boolean;
  onCityClick?: (lat: number, lng: number, cityName: string) => void;
}

const LINE_TYPE_INFO: Record<string, { name: string; description: string }> = {
  MC: {
    name: 'Midheaven (MC)',
    description: 'Career power and public visibility. The MC represents your highest achievements, professional reputation, and how the world sees you. Strong for career advancement, recognition, and authority positions.',
  },
  IC: {
    name: 'Imum Coeli (IC)',
    description: 'Home, roots, and private foundation. The IC represents your deepest sense of belonging, family connections, and emotional security. Ideal for settling down, building foundations, and family life.',
  },
  ASC: {
    name: 'Ascendant (ASC)',
    description: 'Personal vitality and self-expression. The ASC affects your physical presence, health, and how you naturally present yourself. Strong for personal magnetism, health improvements, and new beginnings.',
  },
  DSC: {
    name: 'Descendant (DSC)',
    description: 'Relationships and significant others. The DSC governs partnerships, marriage, and the people you attract. This is the primary love line for meeting partners and forming meaningful bonds.',
  },
};

const PLANET_INFO: Record<string, { name: string; keywords: string }> = {
  Sun: { name: 'Sun', keywords: 'Vitality, confidence, leadership, recognition, personal power' },
  Moon: { name: 'Moon', keywords: 'Emotional security, nurturing, home, intuition, public appeal' },
  Mercury: { name: 'Mercury', keywords: 'Communication, learning, writing, commerce, mental agility' },
  Venus: { name: 'Venus', keywords: 'Love, beauty, harmony, pleasure, art, money attraction' },
  Mars: { name: 'Mars', keywords: 'Action, energy, courage, competition, physical drive' },
  Jupiter: { name: 'Jupiter', keywords: 'Expansion, luck, abundance, opportunity, wisdom' },
  Saturn: { name: 'Saturn', keywords: 'Structure, discipline, mastery, long-term building, authority' },
  Uranus: { name: 'Uranus', keywords: 'Innovation, freedom, sudden change, technology, awakening' },
  Neptune: { name: 'Neptune', keywords: 'Spirituality, creativity, imagination, healing, transcendence' },
  Pluto: { name: 'Pluto', keywords: 'Transformation, power, rebirth, depth, empowerment' },
  Chiron: { name: 'Chiron', keywords: 'Healing, wisdom, teaching, mentorship, wounded healer' },
  NorthNode: { name: 'North Node', keywords: 'Destiny, soul growth, life purpose, evolution' },
};

const ASPECT_INFO: Record<string, { name: string; description: string }> = {
  trine: {
    name: 'Trine (120°)',
    description: 'Effortless harmony and natural flow. Talents manifest easily here with minimal friction. The most "zen" aspect for relaxed success and opportunities that come naturally.',
  },
  sextile: {
    name: 'Sextile (60°)',
    description: 'Supportive energy with gentle effort required. Opportunities arise through engagement and willingness to act. Good for learning, networking, and building skills.',
  },
  square: {
    name: 'Square (90°)',
    description: 'Dynamic tension that drives growth. Challenges here push you to develop and achieve. More effort required but often produces significant results through determination.',
  },
};

// Local Space direction display names
const DIRECTION_NAMES: Record<string, string> = {
  N: 'North',
  NE: 'Northeast',
  E: 'East',
  SE: 'Southeast',
  S: 'South',
  SW: 'Southwest',
  W: 'West',
  NW: 'Northwest',
};

// Cardinal directions have maximum planetary power
const CARDINAL_DIRECTIONS = ['N', 'S', 'E', 'W'];
const isCardinalDirection = (dir: string): boolean => CARDINAL_DIRECTIONS.includes(dir);

// Local Space orb of influence (in miles and km)
const LOCAL_SPACE_ORB = {
  minMiles: 50,
  maxMiles: 150,
  minKm: 80,
  maxKm: 240,
};

// Full Local Space planet interpretations
// Sources: Michael Erlewine's Local Space system, locational astrology literature
interface LocalSpaceInterpretation {
  theme: string;
  positive: string;
  shadow: string;
  experience: string;
  bestFor: string;
  notes: string;
  isOuterPlanet?: boolean; // Uranus/Neptune/Pluto require conscious handling
}

const LOCAL_SPACE_INTERPRETATIONS: Record<string, LocalSpaceInterpretation> = {
  Sun: {
    theme: 'Vitality, confidence, leadership, personal visibility',
    positive: 'Stronger self-expression; increased confidence; feeling energized and "seen"; leadership focus.',
    shadow: 'Ego inflation; burnout from overexertion; identity conflict if seeking approval.',
    experience: 'Directions that amplify presence, visibility, and "I can do this" energy.',
    bestFor: 'Career visibility, launching projects, confidence building, creative output.',
    notes: 'Repeated travel or engagement along this direction can reinforce the effect.',
  },
  Moon: {
    theme: 'Emotional life, intuition, home/family needs, comfort, belonging',
    positive: 'Feeling nurtured; stronger intuition; emotional bonding; home-making energy.',
    shadow: 'Moodiness; emotional flooding; over-attachment; family-pattern triggers.',
    experience: 'Directions that feel like "home base" emotionally, or that activate memory/need states.',
    bestFor: 'Rest, recovery, family connection, inner work, nesting/settling.',
    notes: 'Interpreting Moon lines benefits from context (natal Moon condition).',
  },
  Mercury: {
    theme: 'Communication, learning, networking, trade, movement, mental stimulation',
    positive: 'Easier conversations; study and writing flow; networking; quick problem-solving.',
    shadow: 'Nervousness; scattered attention; superficial connections; overthinking.',
    experience: 'Busy, "connected" directions—meetings, commuting, messages, learning.',
    bestFor: 'Writing, sales, teaching, content creation, product iteration, negotiation.',
    notes: 'Local Space works as a directional compass for planetary functions.',
  },
  Venus: {
    theme: 'Love, beauty, pleasure, harmony, art, social ease, attraction',
    positive: 'More social warmth; romance; aesthetic enjoyment; creative inspiration; harmony.',
    shadow: 'Indulgence; people-pleasing; relational fog; overspending.',
    experience: 'Directions that feel sweet/pleasant, supportive for dating, art, music, style, leisure.',
    bestFor: 'Dating, friendship, creative work, hospitality/venues, "enjoy life" sectors.',
    notes: 'First-person reports describe Venus directions as feeling notably pleasant compared to Saturn.',
  },
  Mars: {
    theme: 'Action, drive, courage, physicality, assertion, competition, heat/conflict',
    positive: 'Energy boost; decisiveness; athletic drive; willingness to confront and act.',
    shadow: 'Conflict zones; impatience; accidents/cuts/burns; aggression; impulsivity.',
    experience: '"Go time" directions—training, pushing projects, confronting issues, initiating change.',
    bestFor: 'Fitness, entrepreneurship, courageous conversations, rapid execution sprints.',
    notes: 'Mars-direction travel is known for energizing assertiveness and activity.',
  },
  Jupiter: {
    theme: 'Growth, luck, opportunity, optimism, abundance, higher learning, expansion',
    positive: 'Doors open; supportive mentors; growth mindset; travel/education benefits; "more" energy.',
    shadow: 'Overconfidence; excess; risk-taking; overpromising; weight/overindulgence themes.',
    experience: 'Directions that feel spacious, future-oriented, opportunity-rich; "yes" energy.',
    bestFor: 'Business expansion, education, publishing, networking upward, spiritual/philosophical growth.',
    notes: 'Classic example: "Jupiter line points due north" supporting directional-compass usage.',
  },
  Saturn: {
    theme: 'Discipline, structure, responsibility, limits, tests, mastery, long-term building',
    positive: 'Focus and endurance; building foundations; mastery through repetition; seriousness and credibility.',
    shadow: 'Delays; heaviness; loneliness; pressure; restriction; "hard lessons."',
    experience: 'Directions that feel demanding but productive—where life says "earn it."',
    bestFor: 'Deep work, credentialing, long-term career building, committing to a craft.',
    notes: 'First-person reports describe Saturn-direction travel as bringing "pressure and obstacles."',
  },
  Uranus: {
    theme: 'Freedom, disruption, innovation, breakthroughs, rebellion, sudden change',
    positive: 'New ideas; liberation from stagnation; unconventional innovation.',
    shadow: 'Instability; sudden separations; erratic outcomes; nervous tension; chaos.',
    experience: 'Directions that feel electric/unpredictable; great for experimenting, less for stability.',
    bestFor: 'Reinvention, tech/innovation, radical lifestyle shifts, meeting unusual communities.',
    notes: 'Outer planet—can feel "too much" unless handled consciously.',
    isOuterPlanet: true,
  },
  Neptune: {
    theme: 'Spirituality, dreams, imagination, compassion, mysticism, dissolution/blurred boundaries',
    positive: 'Meditation/retreat energy; artistic flow; compassion; mystical connection and inspiration.',
    shadow: 'Confusion; escapism; deception (self/others); boundary issues; idealization.',
    experience: 'Directions that feel hazy, sacred, or deeply imaginative—beautiful but potentially ungrounding.',
    bestFor: 'Art, music, spirituality, retreats, healing/compassionate service (with boundaries).',
    notes: 'Outer planet—requires conscious handling. High intensity, high ambiguity.',
    isOuterPlanet: true,
  },
  Pluto: {
    theme: 'Transformation, power, intensity, psychological depth, death/rebirth processes',
    positive: 'Deep personal growth; empowerment; cutting away what\'s false; intense focus and regeneration.',
    shadow: 'Power struggles; obsession; compulsion; emotional extremes; control dynamics.',
    experience: 'Directions that feel fated/intense; things surface; "no more pretending" energy.',
    bestFor: 'Therapy/shadow work, major life resets, deep research, serious transformation.',
    notes: 'Outer planet—most intense. First-person reports note major events near Pluto directions.',
    isOuterPlanet: true,
  },
  Chiron: {
    theme: 'Healing, wounding, vulnerability, redemption, bridging pain and wisdom',
    positive: 'Deep healing; accessing core wounds for transformation; healing others; redemption of past pain.',
    shadow: 'Triggers old wounds; vulnerability and sensitivity; may feel tender.',
    experience: 'Directions where your deepest wounds can surface and be healed.',
    bestFor: 'Deep inner work, therapy, healing professions, spiritual transformation.',
    notes: 'For those ready to "get to the core wounding"—requires emotional readiness.',
  },
  NorthNode: {
    theme: 'Destiny, life path, karmic direction, soul growth, evolutionary purpose',
    positive: 'Alignment with life purpose; fated encounters; growth opportunities; spiritual evolution.',
    shadow: 'Discomfort from growth; stepping outside comfort zone; karmic lessons.',
    experience: 'Directions that feel destined or significant; "meant to be" encounters.',
    bestFor: 'Soul-aligned decisions, meeting key people, pursuing true calling.',
    notes: 'North Node directions often correlate with meaningful life developments.',
  },
};

export const LineInfoCard: React.FC<LineInfoCardProps> = ({ line, onClose, zenithPoint, isMobile = false, isBottomSheet = false, onCityClick }) => {
  const [showCities, setShowCities] = useState(true);
  const planetInfo = line.planet ? PLANET_INFO[line.planet] : null;
  const lineTypeInfo = line.lineType ? LINE_TYPE_INFO[line.lineType] : null;
  const aspectInfo = line.aspectType ? ASPECT_INFO[line.aspectType] : null;
  const planetColor = line.planet ? PLANET_COLORS[line.planet as keyof typeof PLANET_COLORS] : '#888';

  // Paran-specific data
  const isParan = line.type === 'paran';
  // Local Space line detection and interpretations
  const isLocalSpace = line.isLocalSpace === true;
  const directionName = line.direction ? DIRECTION_NAMES[line.direction] : line.direction;
  const localSpaceInterp = line.planet ? LOCAL_SPACE_INTERPRETATIONS[line.planet] : null;
  const isCardinal = line.direction ? isCardinalDirection(line.direction) : false;
  const planet1Info = line.planet1 ? PLANET_INFO[line.planet1] : null;
  const planet2Info = line.planet2 ? PLANET_INFO[line.planet2] : null;
  const planet1Color = line.planet1 ? PLANET_COLORS[line.planet1 as keyof typeof PLANET_COLORS] : '#888';
  const planet2Color = line.planet2 ? PLANET_COLORS[line.planet2 as keyof typeof PLANET_COLORS] : '#888';
  const angle1Info = line.angle1 ? LINE_TYPE_INFO[line.angle1] : null;
  const angle2Info = line.angle2 ? LINE_TYPE_INFO[line.angle2] : null;

  // Find nearest cities for paran points (async) - top 3
  const [nearestParanCities, setNearestParanCities] = useState<Array<{ city: { name: string; country: string; lat: number; lng: number }; distance: number }>>([]);
  const [isLoadingParanCities, setIsLoadingParanCities] = useState(false);

  useEffect(() => {
    if (!isParan || !line.coords || line.coords.length === 0) {
      setNearestParanCities([]);
      return;
    }

    let mounted = true;
    const [lat, lng] = line.coords[0];

    setIsLoadingParanCities(true);
    findNearestCitiesToPointAsync(lat, lng, 3)
      .then((results) => {
        if (mounted) {
          setNearestParanCities(results);
          setIsLoadingParanCities(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setNearestParanCities([]);
          setIsLoadingParanCities(false);
        }
      });

    return () => {
      mounted = false;
    };
  }, [isParan, line.coords]);

  if (isMobile) {
    // Bottom sheet layout - simpler header, no footer, content flows naturally
    if (isBottomSheet) {
      // Bottom sheet layout - header is handled by parent MobileBottomSheet
      return (
        <div className="flex flex-col w-full bg-white dark:bg-slate-900">
          {/* Content - no internal scroll, parent handles it */}
          <div className="px-5 py-4 space-y-4">
            {/* Paran Info - Both planets */}
            {isParan && planet1Info && planet2Info && (
              <>
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl p-4">
                  <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-3">
                    What is a Paran?
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    A paran occurs where two planetary lines cross, creating a latitude band where both planets are simultaneously on angles. This creates an intensified, combined influence of both planetary energies.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: planet1Color }}
                      >
                        <span className="text-white text-xs font-bold">{line.planet1?.charAt(0)}</span>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: planet1Color }}>{planet1Info.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{planet1Info.keywords}</p>
                    {angle1Info && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                        On <strong>{angle1Info.name}</strong>
                      </p>
                    )}
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: planet2Color }}
                      >
                        <span className="text-white text-xs font-bold">{line.planet2?.charAt(0)}</span>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: planet2Color }}>{planet2Info.name}</span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{planet2Info.keywords}</p>
                    {angle2Info && (
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
                        On <strong>{angle2Info.name}</strong>
                      </p>
                    )}
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                  <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                    Combined Interpretation
                  </h4>
                  <p className="text-sm text-amber-700 dark:text-amber-300 leading-relaxed">
                    At this latitude ({line.latitude?.toFixed(1)}°), {planet1Info.name}'s themes of {planet1Info.keywords.split(', ').slice(0, 2).join(' and ').toLowerCase()} combine with {planet2Info.name}'s {planet2Info.keywords.split(', ').slice(0, 2).join(' and ').toLowerCase()}, creating an intensified zone where both energies are angular and potent.
                  </p>
                </div>

                {/* Nearest Cities for Paran */}
                {isLoadingParanCities && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                      <span className="text-sm text-slate-500">Finding nearby cities...</span>
                    </div>
                  </div>
                )}
                {!isLoadingParanCities && nearestParanCities.length > 0 && (
                  <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <MapPin className="w-4 h-4 text-slate-500" />
                      <h4 className="text-sm font-semibold">Nearby Cities</h4>
                    </div>
                    <div className="space-y-2">
                      {nearestParanCities.map((cityData, idx) => (
                        <div
                          key={`${cityData.city.name}-${idx}`}
                          className="flex items-center justify-between p-2 rounded-lg cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                          onClick={() => onCityClick?.(cityData.city.lat, cityData.city.lng, cityData.city.name)}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-400 w-4">{idx + 1}.</span>
                            <div>
                              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                                {cityData.city.name}
                              </p>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {cityData.city.country}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-slate-500 dark:text-slate-400">
                            {cityData.distance} km
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Local Space Line Info - Full interpretations */}
            {isLocalSpace && planetInfo && localSpaceInterp && (
              <>
                {/* What is Local Space - Brief intro */}
                <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl p-4">
                  <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2">
                    What is Local Space?
                  </h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                    Local Space lines radiate from your birth location based on where each planet was on the horizon. The influence extends {LOCAL_SPACE_ORB.minMiles}-{LOCAL_SPACE_ORB.maxMiles} miles ({LOCAL_SPACE_ORB.minKm}-{LOCAL_SPACE_ORB.maxKm} km).
                  </p>
                </div>

                {/* Planet Header with Direction */}
                <div className="text-center">
                  <h3 className="text-xl font-bold" style={{ color: planetColor }}>
                    {planetInfo.name} → {directionName}
                  </h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {line.azimuth?.toFixed(0)}° azimuth
                    {isCardinal && (
                      <span className="ml-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-xs rounded-full">
                        Maximum Power
                      </span>
                    )}
                  </p>
                </div>

                {/* Theme */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold mb-1" style={{ color: planetColor }}>Theme</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{localSpaceInterp.theme}</p>
                </div>

                {/* Experience */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                  <h4 className="text-sm font-semibold mb-1">Experience</h4>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{localSpaceInterp.experience}</p>
                </div>

                {/* Positive / Shadow Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-3 border border-green-200 dark:border-green-800">
                    <h4 className="text-xs font-semibold text-green-700 dark:text-green-300 mb-1">Positive</h4>
                    <p className="text-xs text-green-600 dark:text-green-400 leading-relaxed">{localSpaceInterp.positive}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-3 border border-red-200 dark:border-red-800">
                    <h4 className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">Shadow</h4>
                    <p className="text-xs text-red-600 dark:text-red-400 leading-relaxed">{localSpaceInterp.shadow}</p>
                  </div>
                </div>

                {/* Best For */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                  <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 mb-1">Best For</h4>
                  <p className="text-sm text-blue-600 dark:text-blue-400">{localSpaceInterp.bestFor}</p>
                </div>

                {/* Outer Planet Warning */}
                {localSpaceInterp.isOuterPlanet && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-3 border border-purple-200 dark:border-purple-800">
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                      <strong>Note:</strong> Outer planet lines can feel intense. Conscious integration recommended.
                    </p>
                  </div>
                )}

                {/* Notes */}
                <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 dark:text-slate-400 italic">{localSpaceInterp.notes}</p>
                </div>

                {/* Natal Aspect Disclaimer */}
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    <strong>Important:</strong> Effects depend on your natal chart. A well-aspected {planetInfo.name} amplifies positive themes; challenging aspects may bring shadow manifestations.
                  </p>
                </div>
              </>
            )}

            {/* Planet Info - Regular lines */}
            {!isParan && !isLocalSpace && planetInfo && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <h3 className="text-lg font-bold mb-1" style={{ color: planetColor }}>
                  {planetInfo.name}
                </h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {planetInfo.keywords}
                </p>
              </div>
            )}

            {/* Line Type Info - Regular lines only (not for local space) */}
            {!isParan && !isLocalSpace && lineTypeInfo && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <h4 className="text-sm font-semibold mb-1">{lineTypeInfo.name}</h4>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {lineTypeInfo.description}
                </p>
              </div>
            )}

            {/* Aspect Info */}
            {aspectInfo && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="text-sm font-semibold">{aspectInfo.name}</h4>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${line.isHarmonious ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
                    {line.isHarmonious ? 'Harmonious' : 'Challenging'}
                  </span>
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {aspectInfo.description}
                </p>
              </div>
            )}

            {/* Combined Interpretation - Regular lines only (not for local space) */}
            {!isParan && !isLocalSpace && planetInfo && lineTypeInfo && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                  Interpretation
                </h4>
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">
                  {line.planet} {line.lineType} line: {planetInfo.keywords.split(', ')[0].toLowerCase()} meets {lineTypeInfo.name.split(' ')[0].toLowerCase()} themes.
                  {line.lineType === 'MC' && ` Strong for career and public ${line.planet === 'Sun' ? 'recognition' : line.planet === 'Venus' ? 'artistic success' : line.planet === 'Mars' ? 'competitive edge' : 'influence'}.`}
                  {line.lineType === 'ASC' && ` Enhances personal ${line.planet === 'Sun' ? 'vitality' : line.planet === 'Moon' ? 'emotional expression' : line.planet === 'Venus' ? 'charm' : 'presence'}.`}
                  {line.lineType === 'DSC' && ` Attracts ${line.planet === 'Venus' ? 'romantic' : line.planet === 'Mars' ? 'passionate' : line.planet === 'Jupiter' ? 'beneficial' : 'significant'} relationships.`}
                  {line.lineType === 'IC' && ` Creates sense of ${line.planet === 'Moon' ? 'emotional' : line.planet === 'Saturn' ? 'structured' : 'deep'} belonging.`}
                </p>
              </div>
            )}

            {/* Cities Along Line Section - Regular lines only (not for parans or local space) */}
            {!isParan && !isLocalSpace && line.coords && line.coords.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <CitiesAlongLine
                  lineCoords={line.coords}
                  planetColor={planetColor}
                  zenithPoint={zenithPoint}
                  onCityClick={onCityClick}
                />
              </div>
            )}
          </div>
        </div>
      );
    }

    // Full screen mobile layout
    return (
      <div className="flex flex-col h-full w-full bg-white dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800">
          <div style={{ width: 44 }} />
          <h2 className="flex-1 text-center text-xl font-semibold flex items-center justify-center gap-2">
            <div
              className="w-5 h-5 rounded-full"
              style={{ backgroundColor: planetColor }}
            />
            {isLocalSpace ? 'Local Space Line' : line.type === 'aspect' ? 'Aspect Line' : 'Planetary Line'}
          </h2>
          <button
            onClick={onClose}
            className="border border-slate-300 dark:border-slate-700 bg-transparent rounded-full p-2 flex items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800"
            style={{ width: 44, height: 44 }}
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
          {/* Local Space Line Content - Full interpretations */}
          {isLocalSpace && planetInfo && localSpaceInterp && (
            <>
              {/* What is Local Space */}
              <div className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800/50 dark:to-slate-800/30 rounded-xl p-4">
                <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                  What is Local Space?
                </h4>
                <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                  Local Space lines radiate from your birth location based on where each planet was on the horizon. The influence extends {LOCAL_SPACE_ORB.minMiles}-{LOCAL_SPACE_ORB.maxMiles} miles ({LOCAL_SPACE_ORB.minKm}-{LOCAL_SPACE_ORB.maxKm} km).
                </p>
              </div>

              {/* Planet Header */}
              <div className="text-center">
                <h3 className="text-2xl font-bold" style={{ color: planetColor }}>
                  {planetInfo.name} → {directionName}
                </h3>
                <p className="text-base text-slate-500 dark:text-slate-400 mt-2">
                  {line.azimuth?.toFixed(0)}° azimuth
                  {isCardinal && (
                    <span className="ml-2 px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 text-sm rounded-full">
                      Maximum Power
                    </span>
                  )}
                </p>
              </div>

              {/* Theme */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <h4 className="text-lg font-semibold mb-2" style={{ color: planetColor }}>Theme</h4>
                <p className="text-base text-slate-600 dark:text-slate-300">{localSpaceInterp.theme}</p>
              </div>

              {/* Experience */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <h4 className="text-lg font-semibold mb-2">Experience</h4>
                <p className="text-base text-slate-600 dark:text-slate-300">{localSpaceInterp.experience}</p>
              </div>

              {/* Positive */}
              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-800">
                <h4 className="text-base font-semibold text-green-700 dark:text-green-300 mb-2">Positive Manifestations</h4>
                <p className="text-base text-green-600 dark:text-green-400 leading-relaxed">{localSpaceInterp.positive}</p>
              </div>

              {/* Shadow */}
              <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-800">
                <h4 className="text-base font-semibold text-red-700 dark:text-red-300 mb-2">Shadow Side</h4>
                <p className="text-base text-red-600 dark:text-red-400 leading-relaxed">{localSpaceInterp.shadow}</p>
              </div>

              {/* Best For */}
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4 border border-blue-200 dark:border-blue-800">
                <h4 className="text-base font-semibold text-blue-700 dark:text-blue-300 mb-2">Best For</h4>
                <p className="text-base text-blue-600 dark:text-blue-400">{localSpaceInterp.bestFor}</p>
              </div>

              {/* Outer Planet Warning */}
              {localSpaceInterp.isOuterPlanet && (
                <div className="bg-purple-50 dark:bg-purple-900/20 rounded-xl p-4 border border-purple-200 dark:border-purple-800">
                  <p className="text-sm text-purple-600 dark:text-purple-400">
                    <strong>Note:</strong> Outer planet lines (Uranus, Neptune, Pluto) can feel intense and require conscious integration.
                  </p>
                </div>
              )}

              {/* Notes */}
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
                <p className="text-sm text-slate-500 dark:text-slate-400 italic">{localSpaceInterp.notes}</p>
              </div>

              {/* Natal Aspect Disclaimer */}
              <div className="bg-amber-50 dark:bg-amber-900/20 rounded-xl p-4 border border-amber-200 dark:border-amber-800">
                <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">Important</h4>
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  Effects depend on your natal chart. A well-aspected {planetInfo.name} amplifies positive themes; challenging natal aspects may bring shadow manifestations to the surface.
                </p>
              </div>
            </>
          )}

          {/* Planet Info - Regular lines only */}
          {!isLocalSpace && planetInfo && (
            <div className="text-center">
              <h3 className="text-2xl font-bold" style={{ color: planetColor }}>
                {planetInfo.name}
              </h3>
              <p className="text-base text-slate-500 dark:text-slate-400 mt-2">
                {planetInfo.keywords}
              </p>
            </div>
          )}

          {/* Line Type Info - Regular lines only */}
          {!isLocalSpace && lineTypeInfo && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
              <h4 className="text-lg font-semibold mb-2">{lineTypeInfo.name}</h4>
              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {lineTypeInfo.description}
              </p>
            </div>
          )}

          {/* Aspect Info (for aspect lines) */}
          {aspectInfo && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <h4 className="text-lg font-semibold">{aspectInfo.name}</h4>
                <span className={`text-sm px-3 py-1 rounded-full ${line.isHarmonious ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
                  {line.isHarmonious ? 'Harmonious' : 'Challenging'}
                </span>
              </div>
              <p className="text-base text-slate-600 dark:text-slate-300 leading-relaxed">
                {aspectInfo.description}
              </p>
            </div>
          )}

          {/* Combined Interpretation - Regular lines only */}
          {!isLocalSpace && planetInfo && lineTypeInfo && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-4">
              <h4 className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-2">
                Interpretation
              </h4>
              <p className="text-base text-slate-700 dark:text-slate-200 leading-relaxed">
                {line.planet} {line.lineType} line: {planetInfo.keywords.split(', ')[0].toLowerCase()} meets {lineTypeInfo.name.split(' ')[0].toLowerCase()} themes.
                {line.lineType === 'MC' && ` Strong for career and public ${line.planet === 'Sun' ? 'recognition' : line.planet === 'Venus' ? 'artistic success' : line.planet === 'Mars' ? 'competitive edge' : 'influence'}.`}
                {line.lineType === 'ASC' && ` Enhances personal ${line.planet === 'Sun' ? 'vitality' : line.planet === 'Moon' ? 'emotional expression' : line.planet === 'Venus' ? 'charm' : 'presence'}.`}
                {line.lineType === 'DSC' && ` Attracts ${line.planet === 'Venus' ? 'romantic' : line.planet === 'Mars' ? 'passionate' : line.planet === 'Jupiter' ? 'beneficial' : 'significant'} relationships.`}
                {line.lineType === 'IC' && ` Creates sense of ${line.planet === 'Moon' ? 'emotional' : line.planet === 'Saturn' ? 'structured' : 'deep'} belonging.`}
              </p>
            </div>
          )}

          {/* Cities Along Line Section - Regular lines only (not local space) */}
          {!isLocalSpace && line.coords && line.coords.length > 0 && (
            <div>
              <button
                onClick={() => setShowCities(!showCities)}
                className="flex items-center justify-between w-full text-left bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl p-4 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-5 h-5 text-slate-500" />
                  <span className="text-base font-medium">Cities Along This Line</span>
                </div>
                {showCities ? (
                  <ChevronUp className="w-5 h-5 text-slate-400" />
                ) : (
                  <ChevronDown className="w-5 h-5 text-slate-400" />
                )}
              </button>
              {showCities && (
                <div className="mt-3">
                  <CitiesAlongLine
                    lineCoords={line.coords}
                    planetColor={planetColor}
                    zenithPoint={zenithPoint}
                    onCityClick={onCityClick}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 pb-8 border-t border-slate-200 dark:border-slate-800">
          <Button onClick={onClose} className="w-full h-14 text-lg">
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-lg max-h-[80vh] flex flex-col">
      <CardHeader className="pb-2 flex flex-row items-center justify-between flex-shrink-0">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          {isParan ? (
            <>
              <div className="flex -space-x-1">
                <div
                  className="w-4 h-4 rounded-full border border-white dark:border-slate-900"
                  style={{ backgroundColor: planet1Color }}
                />
                <div
                  className="w-4 h-4 rounded-full border border-white dark:border-slate-900"
                  style={{ backgroundColor: planet2Color }}
                />
              </div>
              Paran Line
            </>
          ) : isLocalSpace ? (
            <>
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: planetColor }}
              />
              Local Space Line
            </>
          ) : (
            <>
              <div
                className="w-4 h-4 rounded-full"
                style={{ backgroundColor: planetColor }}
              />
              {line.type === 'aspect' ? 'Aspect Line' : 'Planetary Line'}
            </>
          )}
        </CardTitle>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 overflow-y-auto flex-1">
        {/* Paran Info */}
        {isParan && planet1Info && planet2Info && (
          <>
            {/* Paran Header */}
            <div>
              <h4 className="text-base font-semibold">
                <span style={{ color: planet1Color }}>{line.planet1}</span>
                {' + '}
                <span style={{ color: planet2Color }}>{line.planet2}</span>
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Latitude {line.latitude?.toFixed(1)}° • Combined Influence
              </p>
            </div>

            {/* What is a Paran */}
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-3">
              <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
                What is a Paran?
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                A paran occurs where two planetary lines cross, creating a latitude band where both planets are simultaneously on angles.
              </p>
            </div>

            {/* Planet Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: planet1Color }}
                  >
                    <span className="text-white text-[10px] font-bold">{line.planet1?.charAt(0)}</span>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: planet1Color }}>{planet1Info.name}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">{planet1Info.keywords}</p>
                {angle1Info && (
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-1">
                    On <strong>{line.angle1}</strong>
                  </p>
                )}
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: planet2Color }}
                  >
                    <span className="text-white text-[10px] font-bold">{line.planet2?.charAt(0)}</span>
                  </div>
                  <span className="text-xs font-semibold" style={{ color: planet2Color }}>{planet2Info.name}</span>
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">{planet2Info.keywords}</p>
                {angle2Info && (
                  <p className="text-[10px] text-slate-600 dark:text-slate-300 mt-1">
                    On <strong>{line.angle2}</strong>
                  </p>
                )}
              </div>
            </div>

            {/* Combined Interpretation */}
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
              <h4 className="text-xs font-semibold text-amber-800 dark:text-amber-200 mb-1">
                Combined Interpretation
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                At this latitude, {planet1Info.name}'s themes of {planet1Info.keywords.split(', ').slice(0, 2).join(' and ').toLowerCase()} combine with {planet2Info.name}'s {planet2Info.keywords.split(', ').slice(0, 2).join(' and ').toLowerCase()}.
              </p>
            </div>

            {/* Nearest Cities for Paran */}
            {isLoadingParanCities && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-slate-500" />
                  <span className="text-[10px] text-slate-500">Finding nearby cities...</span>
                </div>
              </div>
            )}
            {!isLoadingParanCities && nearestParanCities.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-2">
                <div className="flex items-center gap-1.5 mb-2">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <h4 className="text-[10px] font-semibold text-slate-500">Nearby Cities</h4>
                </div>
                <div className="space-y-1.5">
                  {nearestParanCities.map((cityData, idx) => (
                    <div
                      key={`${cityData.city.name}-${idx}`}
                      className="flex items-center justify-between p-1.5 rounded cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 transition-colors"
                      onClick={() => onCityClick?.(cityData.city.lat, cityData.city.lng, cityData.city.name)}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 w-3">{idx + 1}.</span>
                        <div>
                          <p className="text-xs font-medium text-slate-700 dark:text-slate-200">
                            {cityData.city.name}
                          </p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400">
                            {cityData.city.country}
                          </p>
                        </div>
                      </div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">
                        {cityData.distance} km
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Local Space Line Info - Full rich interpretation */}
        {isLocalSpace && planetInfo && (
          <div className="space-y-3">
            {/* What is Local Space intro */}
            <div className="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-2.5">
              <h4 className="text-[10px] font-semibold text-indigo-700 dark:text-indigo-300 mb-1">
                What is Local Space?
              </h4>
              <p className="text-[10px] text-indigo-600 dark:text-indigo-400 leading-relaxed">
                Local Space maps planetary energies as compass directions from your birth location.
                Travel or face this direction to activate these themes.
              </p>
              <p className="text-[9px] text-indigo-500 dark:text-indigo-500 mt-1.5 font-medium">
                Orb of influence: {LOCAL_SPACE_ORB.minMiles}-{LOCAL_SPACE_ORB.maxMiles} miles ({LOCAL_SPACE_ORB.minKm}-{LOCAL_SPACE_ORB.maxKm} km)
              </p>
            </div>

            {/* Planet Header with Cardinal Power Badge */}
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-base font-semibold" style={{ color: planetColor }}>
                  {planetInfo.name} → {directionName}
                </h4>
                {isCardinal && (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                    Maximum Power
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
                {line.azimuth?.toFixed(0)}° azimuth
              </p>
            </div>

            {/* Theme & Experience */}
            {localSpaceInterp && (
              <>
                <div>
                  <h5 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Theme</h5>
                  <p className="text-xs text-slate-700 dark:text-slate-200">{localSpaceInterp.theme}</p>
                </div>

                <div>
                  <h5 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Experience</h5>
                  <p className="text-xs text-slate-600 dark:text-slate-300">{localSpaceInterp.experience}</p>
                </div>

                {/* Positive / Shadow Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2">
                    <h5 className="text-[10px] font-semibold text-green-700 dark:text-green-400 mb-0.5">Positive</h5>
                    <p className="text-[10px] text-green-600 dark:text-green-300 leading-relaxed">{localSpaceInterp.positive}</p>
                  </div>
                  <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2">
                    <h5 className="text-[10px] font-semibold text-red-700 dark:text-red-400 mb-0.5">Shadow</h5>
                    <p className="text-[10px] text-red-600 dark:text-red-300 leading-relaxed">{localSpaceInterp.shadow}</p>
                  </div>
                </div>

                {/* Best For */}
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2">
                  <h5 className="text-[10px] font-semibold text-blue-700 dark:text-blue-400 mb-0.5">Best For</h5>
                  <p className="text-[10px] text-blue-600 dark:text-blue-300">{localSpaceInterp.bestFor}</p>
                </div>

                {/* Outer Planet Warning */}
                {localSpaceInterp.isOuterPlanet && (
                  <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-2 border border-purple-200 dark:border-purple-800">
                    <p className="text-[10px] text-purple-700 dark:text-purple-300">
                      <span className="font-semibold">Outer Planet:</span> Effects are transpersonal and may require conscious handling.
                    </p>
                  </div>
                )}

                {/* Notes */}
                <div>
                  <h5 className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 mb-0.5">Notes</h5>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 italic">{localSpaceInterp.notes}</p>
                </div>

                {/* Natal Aspect Disclaimer */}
                <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 border border-amber-200 dark:border-amber-800">
                  <p className="text-[9px] text-amber-700 dark:text-amber-300">
                    <span className="font-semibold">Note:</span> How this direction manifests depends on how {planetInfo.name} is aspected in your natal chart.
                  </p>
                </div>
              </>
            )}
          </div>
        )}

        {/* Planet Info - Regular lines only */}
        {!isParan && !isLocalSpace && planetInfo && (
          <div>
            <h4 className="text-base font-semibold" style={{ color: planetColor }}>
              {planetInfo.name}
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {planetInfo.keywords}
            </p>
          </div>
        )}

        {/* Line Type Info - Regular lines only */}
        {!isParan && !isLocalSpace && lineTypeInfo && (
          <div>
            <h4 className="text-sm font-medium">{lineTypeInfo.name}</h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              {lineTypeInfo.description}
            </p>
          </div>
        )}

        {/* Aspect Info (for aspect lines) */}
        {aspectInfo && (
          <div>
            <h4 className="text-sm font-medium flex items-center gap-2">
              {aspectInfo.name}
              <span className={`text-xs px-2 py-0.5 rounded ${line.isHarmonious ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300' : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'}`}>
                {line.isHarmonious ? 'Harmonious' : 'Challenging'}
              </span>
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
              {aspectInfo.description}
            </p>
          </div>
        )}

        {/* Combined Interpretation - Regular lines only */}
        {!isParan && !isLocalSpace && planetInfo && lineTypeInfo && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">
              Interpretation
            </h4>
            <p className="text-xs text-slate-700 dark:text-slate-200">
              {line.planet} {line.lineType} line: {planetInfo.keywords.split(', ')[0].toLowerCase()} meets {lineTypeInfo.name.split(' ')[0].toLowerCase()} themes.
              {line.lineType === 'MC' && ` Strong for career and public ${line.planet === 'Sun' ? 'recognition' : line.planet === 'Venus' ? 'artistic success' : line.planet === 'Mars' ? 'competitive edge' : 'influence'}.`}
              {line.lineType === 'ASC' && ` Enhances personal ${line.planet === 'Sun' ? 'vitality' : line.planet === 'Moon' ? 'emotional expression' : line.planet === 'Venus' ? 'charm' : 'presence'}.`}
              {line.lineType === 'DSC' && ` Attracts ${line.planet === 'Venus' ? 'romantic' : line.planet === 'Mars' ? 'passionate' : line.planet === 'Jupiter' ? 'beneficial' : 'significant'} relationships.`}
              {line.lineType === 'IC' && ` Creates sense of ${line.planet === 'Moon' ? 'emotional' : line.planet === 'Saturn' ? 'structured' : 'deep'} belonging.`}
            </p>
          </div>
        )}

        {/* Cities Along Line Section - Regular lines only (not local space) */}
        {!isParan && !isLocalSpace && line.coords && line.coords.length > 0 && (
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
            <button
              onClick={() => setShowCities(!showCities)}
              className="flex items-center justify-between w-full text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 rounded p-1 -m-1 transition-colors"
            >
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-slate-500" />
                <h4 className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  Cities Along This Line
                </h4>
              </div>
              {showCities ? (
                <ChevronUp className="w-4 h-4 text-slate-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400" />
              )}
            </button>
            {showCities && (
              <div className="mt-2">
                <CitiesAlongLine
                  lineCoords={line.coords}
                  planetColor={planetColor}
                  zenithPoint={zenithPoint}
                  onCityClick={onCityClick}
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LineInfoCard;
