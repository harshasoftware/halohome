/**
 * Astrocartography PDF Report Generator
 * Premium branded report with cosmic aesthetic matching halohome.app
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { findCitiesAlongLine, type CityInfluence, type ZenithPointData } from './city-line-utils';
import { PLANET_COLORS, type Planet, type LineType } from './astro-types';
import type { PlanetaryLine, AspectLine, ZenithPoint } from './astro-types';
import {
  type ScoutCategory,
  SCOUT_CATEGORIES,
  CATEGORY_INFO,
  scoutLocationsForCategory,
  getPlainLanguageInfluence,
} from '@/features/globe/utils/scout-utils';

// Extend jsPDF with autoTable
declare module 'jspdf' {
  interface jsPDF {
    lastAutoTable: { finalY: number };
  }
}

export interface ReportConfig {
  birthDate: string;
  birthTime: string;
  birthLocation: string;
  selectedLines: PlanetaryLine[];
  zenithPoints: ZenithPoint[];
  citiesPerLine?: number;
  /** If true, returns base64 PDF data instead of downloading */
  returnBase64?: boolean;
  /** All planetary lines for scout analysis */
  allPlanetaryLines?: PlanetaryLine[];
  /** Aspect lines for scout analysis */
  aspectLines?: AspectLine[];
  /** Include scout locations by category in the report */
  includeScoutSection?: boolean;
}

export interface ReportResult {
  /** Base64 encoded PDF data (without data URI prefix) */
  base64Data: string;
  /** Suggested filename */
  filename: string;
}

// ============================================
// BRAND COLORS - Matching halohome.app
// ============================================
const BRAND = {
  // Primary dark theme
  deepSpace: [5, 5, 5] as [number, number, number],           // #050505
  darkCard: [15, 15, 20] as [number, number, number],         // Dark card background

  // Text colors
  white: [255, 255, 255] as [number, number, number],         // #ffffff
  zinc400: [161, 161, 170] as [number, number, number],       // #a1a1aa
  zinc500: [113, 113, 122] as [number, number, number],       // #71717a
  zinc600: [82, 85, 91] as [number, number, number],          // #52525b

  // Cosmic accent colors
  purple: [147, 112, 219] as [number, number, number],        // #9370DB
  blue: [100, 149, 237] as [number, number, number],          // #6495ED
  pink: [255, 182, 193] as [number, number, number],          // #FFB6C1
  gold: [251, 191, 36] as [number, number, number],           // #fbbf24

  // Category colors
  indigo: [79, 70, 229] as [number, number, number],          // #4F46E5
  rose: [236, 72, 153] as [number, number, number],           // #EC4899
  emerald: [16, 185, 129] as [number, number, number],        // #10B981
  amber: [245, 158, 11] as [number, number, number],          // #F59E0B
  violet: [139, 92, 246] as [number, number, number],         // #8B5CF6
  green: [34, 197, 94] as [number, number, number],           // #22C55E

  // Subtle backgrounds
  cardBg: [18, 18, 24] as [number, number, number],           // Subtle dark card
  headerBg: [25, 25, 35] as [number, number, number],         // Header background
};

// Category colors for the scout section
const CATEGORY_COLORS: Record<ScoutCategory, [number, number, number]> = {
  career: BRAND.indigo,
  love: BRAND.rose,
  health: BRAND.emerald,
  home: BRAND.amber,
  wellbeing: BRAND.violet,
  wealth: BRAND.green,
};

// Interpretations for planet-line combinations
const LINE_INTERPRETATIONS: Record<Planet, Record<LineType, string>> = {
  Sun: {
    MC: 'Career recognition and public visibility flourish. Leadership opportunities abound. Your authentic self shines in professional spheres.',
    IC: 'Deep sense of belonging and family connection. A place to establish strong roots and feel truly at home.',
    ASC: 'Enhanced vitality and self-expression. Your authentic identity radiates powerfully. Great for self-reinvention.',
    DSC: 'Attracts significant partnerships and recognition through others. People see and appreciate your inner light.',
  },
  Moon: {
    MC: 'Emotional fulfillment through career. Public nurturing roles favored. Recognition for caring and intuitive work.',
    IC: 'Profound emotional security and comfort. Ideal for home, family, and putting down roots.',
    ASC: 'Heightened intuition and emotional sensitivity. Deep connection to your inner self and needs.',
    DSC: 'Attracts nurturing relationships. Emotional bonds form easily. Great for finding emotional support.',
  },
  Mercury: {
    MC: 'Success in communication, writing, teaching, and commerce. Intellectual recognition in career.',
    IC: 'Mental stimulation at home. Great for home-based learning, writing, or commerce.',
    ASC: 'Quick thinking and articulate expression. Excellent for networking and making connections.',
    DSC: 'Attracts intellectual partners. Stimulating conversations and mental exchanges flourish.',
  },
  Venus: {
    MC: 'Artistic success and social popularity. Beauty, harmony, and pleasure in career pursuits.',
    IC: 'Aesthetic home environment. Love, beauty, and comfort in domestic life.',
    ASC: 'Enhanced charm and attractiveness. Social grace comes naturally. Magnetic presence.',
    DSC: 'Magnetic attraction for romantic relationships. Love, beauty, and harmony in partnerships.',
  },
  Mars: {
    MC: 'Drive for career achievement. Competitive success, leadership, and entrepreneurial energy.',
    IC: 'Active home life. Energy for domestic projects, renovations, and family protection.',
    ASC: 'Increased courage and initiative. Physical vitality enhanced. Great for taking action.',
    DSC: 'Attracts passionate, dynamic relationships. Partnerships with energy and drive.',
  },
  Jupiter: {
    MC: 'Expansion and luck in career. Recognition, international opportunities, and abundance.',
    IC: 'Abundance in home life. Generous family connections, growth, and prosperity at home.',
    ASC: 'Optimism and personal growth. Opportunities seem to find you. Expanded worldview.',
    DSC: 'Attracts beneficial partnerships. Luck through relationships and collaborations.',
  },
  Saturn: {
    MC: 'Serious career achievements through discipline and hard work. Authority and lasting success.',
    IC: 'Building solid foundations. Responsibility toward family and creating lasting structure.',
    ASC: 'Discipline and maturity enhanced. Taking yourself and your goals seriously.',
    DSC: 'Committed, long-lasting relationships. Learning important lessons through partnerships.',
  },
  Uranus: {
    MC: 'Unconventional career path. Innovation, technology, and sudden changes in professional status.',
    IC: 'Unusual home life. Freedom, independence, and progressive ideas in domestic matters.',
    ASC: 'Unique self-expression. Embracing your individuality and originality fully.',
    DSC: 'Attracts unusual, exciting relationships. Freedom and unpredictability in partnerships.',
  },
  Neptune: {
    MC: 'Creative and spiritual career pursuits. Artistic recognition, healing professions favored.',
    IC: 'Spiritual home environment. Idealistic family connections and artistic domestic life.',
    ASC: 'Enhanced intuition and creativity. Spiritual sensitivity and compassion heightened.',
    DSC: 'Soulmate connections possible. Idealistic, spiritual, and creative relationships.',
  },
  Pluto: {
    MC: 'Transformative career experiences. Power, influence, and profound impact in public life.',
    IC: 'Deep psychological roots. Transformation through family and ancestral healing.',
    ASC: 'Personal transformation and empowerment. Intense self-discovery and rebirth.',
    DSC: 'Intense, transformative relationships. Deep psychological bonds and mutual evolution.',
  },
  Chiron: {
    MC: 'Healing through career. Teaching, mentoring, and guiding others from your experience.',
    IC: 'Healing family wounds. Finding wholeness through understanding your roots.',
    ASC: 'Embracing your wounds as gifts. Becoming a wise guide for others.',
    DSC: 'Healing through relationships. Attracting those who benefit from your wisdom.',
  },
  NorthNode: {
    MC: 'Career aligned with life purpose. Destiny calling in the public sphere.',
    IC: 'Soul growth through family and home. Karmic connections to your roots.',
    ASC: 'Stepping into your destined self. Life path activation and soul purpose.',
    DSC: 'Karmic relationships. Meeting destined partners for soul growth.',
  },
};

// Convert hex to RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
}

// Get influence level label
function getInfluenceLabel(level: CityInfluence['influenceLevel']): string {
  const labels = {
    zenith: 'ZENITH - Maximum Power',
    gold: 'POWER ZONE',
    strong: 'Strong Influence',
    moderate: 'Moderate',
    weak: 'Subtle',
  };
  return labels[level];
}

// Get influence level color
function getInfluenceColor(level: CityInfluence['influenceLevel']): [number, number, number] {
  const colors: Record<string, [number, number, number]> = {
    zenith: BRAND.gold,
    gold: BRAND.purple,
    strong: BRAND.blue,
    moderate: BRAND.zinc400,
    weak: BRAND.zinc500,
  };
  return colors[level] || BRAND.zinc400;
}

// ============================================
// PDF STYLING HELPERS
// ============================================

/**
 * Draw a cosmic gradient header bar
 */
function drawCosmicHeader(doc: jsPDF, y: number, height: number, pageWidth: number): void {
  // Dark gradient background
  doc.setFillColor(...BRAND.deepSpace);
  doc.rect(0, y, pageWidth, height, 'F');

  // Purple accent line at bottom
  doc.setFillColor(...BRAND.purple);
  doc.rect(0, y + height - 1, pageWidth, 1, 'F');
}

/**
 * Draw a dark card with subtle border
 */
function drawDarkCard(
  doc: jsPDF,
  x: number,
  y: number,
  width: number,
  height: number,
  accentColor?: [number, number, number]
): void {
  // Card background
  doc.setFillColor(248, 250, 252); // Light background for readability
  doc.roundedRect(x, y, width, height, 4, 4, 'F');

  // Left accent bar if provided
  if (accentColor) {
    doc.setFillColor(...accentColor);
    doc.roundedRect(x, y, 4, height, 2, 2, 'F');
  }
}

/**
 * Draw a subtle divider line
 */
function drawDivider(doc: jsPDF, y: number, pageWidth: number, margin: number): void {
  doc.setDrawColor(...BRAND.zinc400);
  doc.setLineWidth(0.3);
  doc.line(margin, y, pageWidth - margin, y);
}

/**
 * Add page footer with branding
 */
function addBrandedFooter(doc: jsPDF, pageWidth: number, pageNum: number, totalPages: number): void {
  const footerY = 285;

  // Footer line
  doc.setDrawColor(...BRAND.purple);
  doc.setLineWidth(0.5);
  doc.line(20, footerY - 5, pageWidth - 20, footerY - 5);

  // Brand name
  doc.setFontSize(9);
  doc.setTextColor(...BRAND.purple);
  doc.setFont('helvetica', 'bold');
  doc.text('halohome.app', 20, footerY);

  // Page number
  doc.setTextColor(...BRAND.zinc500);
  doc.setFont('helvetica', 'normal');
  doc.text(`${pageNum} of ${totalPages}`, pageWidth - 20, footerY, { align: 'right' });
}

/**
 * Draw decorative cosmic orb
 */
function drawCosmicOrb(doc: jsPDF, x: number, y: number, radius: number, color: [number, number, number]): void {
  // Outer glow (lighter)
  doc.setFillColor(color[0], color[1], color[2]);
  doc.circle(x, y, radius, 'F');

  // Inner highlight
  doc.setFillColor(
    Math.min(255, color[0] + 50),
    Math.min(255, color[1] + 50),
    Math.min(255, color[2] + 50)
  );
  doc.circle(x - radius * 0.2, y - radius * 0.2, radius * 0.4, 'F');
}

// ============================================
// SCOUT SECTION GENERATOR
// ============================================

function generateScoutSection(
  doc: jsPDF,
  planetaryLines: PlanetaryLine[],
  aspectLines: AspectLine[],
  pageWidth: number,
  pageHeight: number,
  margin: number,
  contentWidth: number
): number {
  let pageCount = 0;

  // Scout section title page
  doc.addPage();
  pageCount++;

  // Dark header with cosmic styling
  drawCosmicHeader(doc, 0, 50, pageWidth);

  // Title
  doc.setTextColor(...BRAND.white);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Location Scout', pageWidth / 2, 28, { align: 'center' });

  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.zinc400);
  doc.text('Optimal & Challenging Locations by Life Category', pageWidth / 2, 40, { align: 'center' });

  // Category overview
  let overviewY = 70;
  doc.setTextColor(...BRAND.purple);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('LIFE CATEGORIES ANALYZED', margin, overviewY);
  overviewY += 16;

  for (const category of SCOUT_CATEGORIES) {
    const info = CATEGORY_INFO[category];
    const color = CATEGORY_COLORS[category];

    // Category orb
    drawCosmicOrb(doc, margin + 6, overviewY - 2, 4, color);

    // Category name
    doc.setTextColor(30, 30, 40);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text(`${info.icon} ${info.label}`, margin + 16, overviewY);

    // Description
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.zinc500);
    doc.setFontSize(9);
    doc.text(info.description, margin + 16, overviewY + 10);

    overviewY += 28;
  }

  // Generate each category page
  for (const category of SCOUT_CATEGORIES) {
    const analysis = scoutLocationsForCategory(category, planetaryLines, aspectLines);
    const info = CATEGORY_INFO[category];
    const color = CATEGORY_COLORS[category];

    if (analysis.countries.length === 0) continue;

    doc.addPage();
    pageCount++;

    // Category header
    drawCosmicHeader(doc, 0, 45, pageWidth);

    // Category icon and name
    drawCosmicOrb(doc, margin + 10, 22, 8, color);

    doc.setTextColor(...BRAND.white);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(`${info.icon} ${info.label}`, margin + 26, 26);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.zinc400);
    doc.text(info.description, margin, 40);

    // Stats summary bar
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(margin, 55, contentWidth, 22, 3, 3, 'F');

    doc.setFontSize(10);
    doc.setTextColor(...BRAND.green);
    doc.setFont('helvetica', 'bold');
    doc.text(`${analysis.totalBeneficial} Beneficial`, margin + 12, 68);

    doc.setTextColor(...BRAND.amber);
    doc.text(`${analysis.totalChallenging} Challenging`, margin + 90, 68);

    doc.setTextColor(...BRAND.zinc500);
    doc.setFont('helvetica', 'normal');
    doc.text(`${analysis.countries.length} countries`, contentWidth - 10, 68, { align: 'right' });

    // Beneficial locations
    let currentY = 90;
    if (analysis.totalBeneficial > 0) {
      doc.setTextColor(...BRAND.green);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('BENEFICIAL LOCATIONS', margin, currentY);
      currentY += 14;

      const beneficialLocations = analysis.countries
        .flatMap(c => c.locations.filter(l => l.nature === 'beneficial'))
        .sort((a, b) => b.overallScore - a.overallScore)
        .slice(0, 5);

      for (const location of beneficialLocations) {
        if (currentY > 245) {
          doc.addPage();
          pageCount++;
          drawCosmicHeader(doc, 0, 20, pageWidth);
          currentY = 35;
        }

        // Location card
        drawDarkCard(doc, margin, currentY, contentWidth, 26, BRAND.green);

        doc.setTextColor(30, 30, 40);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${location.city.name}, ${location.city.country}`, margin + 12, currentY + 10);

        const mainInfluence = location.influences[0];
        if (mainInfluence) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(...BRAND.zinc500);
          const plainText = getPlainLanguageInfluence(mainInfluence, category);
          doc.text(`${mainInfluence.planet} ${mainInfluence.lineType}: ${plainText}`, margin + 12, currentY + 20, { maxWidth: contentWidth - 24 });
        }

        currentY += 32;
      }
    }

    // Challenging locations
    currentY += 8;
    if (analysis.totalChallenging > 0) {
      if (currentY > 215) {
        doc.addPage();
        pageCount++;
        drawCosmicHeader(doc, 0, 20, pageWidth);
        currentY = 35;
      }

      doc.setTextColor(...BRAND.amber);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.text('LOCATIONS REQUIRING AWARENESS', margin, currentY);
      currentY += 14;

      const challengingLocations = analysis.countries
        .flatMap(c => c.locations.filter(l => l.nature === 'challenging'))
        .sort((a, b) => a.overallScore - b.overallScore)
        .slice(0, 4);

      for (const location of challengingLocations) {
        if (currentY > 255) {
          doc.addPage();
          pageCount++;
          drawCosmicHeader(doc, 0, 20, pageWidth);
          currentY = 35;
        }

        drawDarkCard(doc, margin, currentY, contentWidth, 26, BRAND.amber);

        doc.setTextColor(30, 30, 40);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text(`${location.city.name}, ${location.city.country}`, margin + 12, currentY + 10);

        const mainInfluence = location.influences[0];
        if (mainInfluence) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(9);
          doc.setTextColor(...BRAND.zinc500);
          const plainText = getPlainLanguageInfluence(mainInfluence, category);
          doc.text(`${mainInfluence.planet} ${mainInfluence.lineType}: ${plainText}`, margin + 12, currentY + 20, { maxWidth: contentWidth - 24 });
        }

        currentY += 32;
      }
    }
  }

  return pageCount;
}

// ============================================
// MAIN REPORT GENERATOR
// ============================================

export function generateAstroReport(config: ReportConfig): ReportResult | void {
  const {
    birthDate,
    birthTime,
    birthLocation,
    selectedLines,
    zenithPoints,
    citiesPerLine = 5,
    returnBase64 = false,
    allPlanetaryLines,
    aspectLines = [],
    includeScoutSection = false,
  } = config;

  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;

  // Calculate total pages for footer
  const totalPages = selectedLines.length + 1;
  let currentPage = 1;

  // ============================================
  // TITLE PAGE
  // ============================================

  // Full dark header area
  drawCosmicHeader(doc, 0, 85, pageWidth);

  // Decorative cosmic orbs
  drawCosmicOrb(doc, 30, 25, 6, BRAND.purple);
  drawCosmicOrb(doc, pageWidth - 35, 30, 4, BRAND.blue);
  drawCosmicOrb(doc, 50, 70, 3, BRAND.pink);
  drawCosmicOrb(doc, pageWidth - 50, 65, 5, BRAND.gold);

  // Main title
  doc.setTextColor(...BRAND.white);
  doc.setFontSize(32);
  doc.setFont('helvetica', 'bold');
  doc.text('Astrocartography', pageWidth / 2, 42, { align: 'center' });

  // Subtitle
  doc.setFontSize(13);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BRAND.zinc400);
  doc.text('Personal Location Report', pageWidth / 2, 55, { align: 'center' });

  // Brand URL
  doc.setFontSize(10);
  doc.setTextColor(...BRAND.purple);
  doc.text('halohome.app', pageWidth / 2, 72, { align: 'center' });

  // Birth Information Card
  const infoCardY = 100;
  doc.setFillColor(250, 250, 252);
  doc.roundedRect(margin, infoCardY, contentWidth, 70, 6, 6, 'F');

  // Accent stripe
  doc.setFillColor(...BRAND.purple);
  doc.roundedRect(margin, infoCardY, 5, 70, 3, 3, 'F');

  // Birth details label
  doc.setTextColor(...BRAND.purple);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('BIRTH DETAILS', margin + 16, infoCardY + 16);

  // Date and time
  doc.setTextColor(30, 30, 40);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text(birthDate, margin + 16, infoCardY + 32);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...BRAND.zinc500);
  doc.text(`at ${birthTime}`, margin + 16 + doc.getTextWidth(birthDate) + 6, infoCardY + 32);

  // Location
  doc.setTextColor(60, 60, 70);
  doc.setFontSize(11);
  doc.text(birthLocation, margin + 16, infoCardY + 48);

  // Lines analyzed count
  doc.setTextColor(...BRAND.purple);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(`${selectedLines.length} LINES ANALYZED`, margin + 16, infoCardY + 62);

  // Lines summary section
  const linesSectionY = infoCardY + 85;
  doc.setTextColor(...BRAND.purple);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('PLANETARY LINES INCLUDED', margin, linesSectionY);

  // Group lines by planet
  const linesByPlanet: Record<string, string[]> = {};
  selectedLines.forEach(line => {
    if (!linesByPlanet[line.planet]) {
      linesByPlanet[line.planet] = [];
    }
    linesByPlanet[line.planet].push(line.lineType);
  });

  let lineY = linesSectionY + 16;
  let lineX = margin;
  const colWidth = contentWidth / 3;

  Object.entries(linesByPlanet).forEach(([planet, lineTypes], index) => {
    const planetColor = PLANET_COLORS[planet as Planet];
    const [r, g, b] = hexToRgb(planetColor);

    // Wrap to new row if needed
    if (lineX > pageWidth - margin - colWidth) {
      lineX = margin;
      lineY += 20;
    }

    // Planet color orb
    drawCosmicOrb(doc, lineX + 5, lineY - 2, 4, [r, g, b]);

    // Planet name
    doc.setTextColor(30, 30, 40);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text(planet, lineX + 14, lineY);

    // Line types
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BRAND.zinc500);
    doc.setFontSize(9);
    doc.text(lineTypes.join(', '), lineX + 14, lineY + 10);

    lineX += colWidth;
  });

  // Report info box
  const summaryY = Math.max(lineY + 30, 235);
  doc.setFillColor(248, 250, 252);
  doc.roundedRect(margin, summaryY, contentWidth, 35, 4, 4, 'F');

  doc.setTextColor(...BRAND.zinc500);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'italic');
  doc.text('This report analyzes your planetary lines to identify optimal locations for', margin + 10, summaryY + 14);
  doc.text('career, relationships, home, and personal growth based on your unique birth chart.', margin + 10, summaryY + 25);

  // Generated date
  doc.setTextColor(...BRAND.zinc400);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `Generated ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}`,
    pageWidth / 2,
    pageHeight - 15,
    { align: 'center' }
  );

  addBrandedFooter(doc, pageWidth, currentPage, totalPages);

  // ============================================
  // LINE DETAIL PAGES
  // ============================================

  for (const line of selectedLines) {
    doc.addPage();
    currentPage++;

    const planetColor = PLANET_COLORS[line.planet];
    const [r, g, b] = hexToRgb(planetColor);

    // Colored header for this line
    doc.setFillColor(r, g, b);
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Gradient fade effect
    doc.setFillColor(
      Math.max(0, r - 30),
      Math.max(0, g - 30),
      Math.max(0, b - 30)
    );
    doc.rect(0, 40, pageWidth, 10, 'F');

    // Planet orb
    drawCosmicOrb(doc, margin + 12, 25, 10, [255, 255, 255]);

    // Planet and line type
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.text(line.planet, margin + 30, 28);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text(`${line.lineType} Line`, margin + 30 + doc.getTextWidth(line.planet) + 8, 28);

    // Find zenith point for MC lines
    let zenithData: ZenithPointData | null = null;
    if (line.lineType === 'MC') {
      const zenith = zenithPoints.find(z => z.planet === line.planet);
      if (zenith) {
        zenithData = { latitude: zenith.latitude, longitude: zenith.longitude };
      }
    }

    // Get cities
    const cities = findCitiesAlongLine(
      line.points as [number, number][],
      zenithData,
      citiesPerLine
    );

    // Interpretation
    const interpretation = LINE_INTERPRETATIONS[line.planet]?.[line.lineType] ||
      `${line.planet} energy meets ${line.lineType} themes at these locations.`;

    doc.setFillColor(250, 250, 252);
    doc.roundedRect(margin, 58, contentWidth, 30, 4, 4, 'F');

    doc.setTextColor(60, 60, 70);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'italic');
    doc.text(interpretation, margin + 10, 70, { maxWidth: contentWidth - 20 });

    // Cities section
    if (cities.length > 0) {
      doc.setTextColor(r, g, b);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('TOP LOCATIONS', margin, 102);

      // Cities table with enhanced styling
      const tableData = cities.slice(0, citiesPerLine).map((city, index) => [
        `${index + 1}`,
        city.city.name,
        city.city.country,
        `${city.distance} km`,
        getInfluenceLabel(city.influenceLevel),
      ]);

      autoTable(doc, {
        startY: 108,
        head: [['#', 'City', 'Country', 'Distance', 'Influence']],
        body: tableData,
        theme: 'plain',
        headStyles: {
          fillColor: [r, g, b],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 9,
        },
        bodyStyles: {
          textColor: [50, 50, 60],
          fontSize: 10,
        },
        alternateRowStyles: {
          fillColor: [250, 250, 252],
        },
        styles: {
          cellPadding: 6,
          lineWidth: 0,
        },
        columnStyles: {
          0: { cellWidth: 12, halign: 'center', textColor: [r, g, b], fontStyle: 'bold' },
          1: { cellWidth: 50, fontStyle: 'bold' },
          2: { cellWidth: 40 },
          3: { cellWidth: 28, halign: 'right' },
          4: { cellWidth: 42 },
        },
      });

      // City insights
      const finalY = doc.lastAutoTable?.finalY || 160;
      let currentY = finalY + 18;

      doc.setTextColor(r, g, b);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('LOCATION INSIGHTS', margin, currentY);
      currentY += 12;

      cities.slice(0, citiesPerLine).forEach((city) => {
        if (currentY > 250) {
          doc.addPage();
          doc.setFillColor(r, g, b);
          doc.rect(0, 0, 6, pageHeight, 'F');
          currentY = 30;
        }

        // City insight card
        const influenceColor = getInfluenceColor(city.influenceLevel);
        drawDarkCard(doc, margin, currentY, contentWidth, 28, influenceColor);

        // City name
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 30, 40);
        doc.text(`${city.city.name}, ${city.city.country}`, margin + 12, currentY + 11);

        // Insight text
        let cityInterpretation = '';
        if (city.influenceLevel === 'zenith') {
          cityInterpretation = `Peak ${line.planet} energy. Exceptional for ${line.lineType === 'MC' ? 'career & recognition' : line.lineType === 'ASC' ? 'identity & vitality' : line.lineType === 'DSC' ? 'partnerships' : 'home & roots'}.`;
        } else if (city.influenceLevel === 'gold') {
          cityInterpretation = `Power zone. Strong ${line.planet} influence amplifies ${line.lineType === 'MC' ? 'professional success' : line.lineType === 'ASC' ? 'self-expression' : line.lineType === 'DSC' ? 'relationship attraction' : 'domestic harmony'}.`;
        } else if (city.influenceLevel === 'strong') {
          cityInterpretation = `Notable ${line.planet} presence. Good for ${line.lineType}-related pursuits.`;
        } else {
          cityInterpretation = `Moderate influence. Subtle ${line.planet} energy supports ${line.lineType} themes.`;
        }

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(...BRAND.zinc500);
        doc.text(cityInterpretation, margin + 12, currentY + 22, { maxWidth: contentWidth - 24 });

        currentY += 34;
      });
    } else {
      doc.setTextColor(...BRAND.zinc500);
      doc.setFontSize(11);
      doc.text('No major cities found within influence distance of this line.', margin, 105);
    }

    addBrandedFooter(doc, pageWidth, currentPage, totalPages);
  }

  // ============================================
  // SCOUT SECTION
  // ============================================

  if (includeScoutSection && (allPlanetaryLines || selectedLines.length > 0)) {
    const planetaryLinesToUse = allPlanetaryLines || selectedLines;
    generateScoutSection(
      doc,
      planetaryLinesToUse,
      aspectLines,
      pageWidth,
      pageHeight,
      margin,
      contentWidth
    );
  }

  // Generate filename
  const filename = `astrocartography-report-${new Date().toISOString().split('T')[0]}.pdf`;

  // Either return base64 data or save the file
  if (returnBase64) {
    const dataUri = doc.output('datauristring');
    const base64Data = dataUri.split(',')[1];
    return { base64Data, filename };
  }

  // Default: save the PDF
  doc.save(filename);
}

export default generateAstroReport;
