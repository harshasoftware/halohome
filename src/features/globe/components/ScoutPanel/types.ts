/**
 * ScoutPanel Types
 *
 * Type definitions for the ScoutPanel component and its sub-components.
 * Extracted from ScoutPanel.tsx for better code organization.
 */

import type { PlanetaryLine, AspectLine } from '@/lib/astro-types';
import type {
  ScoutCategory,
  ScoutLocation,
  RankedCountryGroup,
  OverallScoutLocation,
  OverallCountryGroup,
} from '../../utils/scout-utils';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Marker data for displaying scout locations on the globe
 */
export interface ScoutMarker {
  lat: number;
  lng: number;
  name: string;
  nature: 'beneficial' | 'challenging';
}

/**
 * View filter for showing beneficial or challenging locations
 */
export type ViewFilter = 'beneficial' | 'challenging';

/**
 * View mode for displaying locations - ranked list or grouped by country
 */
export type ViewMode = 'top' | 'countries';

/**
 * Selected tab - either overall view or a specific category
 */
export type SelectedTab = 'overall' | ScoutCategory;

// ============================================================================
// Main Component Props
// ============================================================================

/**
 * Props for the main ScoutPanel component
 */
export interface ScoutPanelProps {
  planetaryLines: PlanetaryLine[];
  aspectLines: AspectLine[];
  onCityClick?: (lat: number, lng: number, cityName: string) => void;
  onShowCountryMarkers?: (markers: ScoutMarker[]) => void;
  onClose?: () => void;
}

// ============================================================================
// Sub-Component Props
// ============================================================================

/**
 * Props for the CategoryUpgradeModal component
 */
export interface CategoryUpgradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Props for the CountrySection component (category view)
 */
export interface CountrySectionProps {
  country: RankedCountryGroup;
  category: ScoutCategory;
  isExpanded: boolean;
  onToggle: () => void;
  onCityClick: (location: ScoutLocation) => void;
  onShowMarkers?: (markers: ScoutMarker[]) => void;
}

/**
 * Props for the OverallCountrySection component (overall view)
 */
export interface OverallCountrySectionProps {
  country: OverallCountryGroup;
  isExpanded: boolean;
  onToggle: () => void;
  onCityClick: (location: OverallScoutLocation) => void;
  onShowMarkers?: (markers: ScoutMarker[]) => void;
}

/**
 * Props for the LocationCard component (basic location card with expandable influences)
 */
export interface LocationCardProps {
  location: ScoutLocation;
  category: ScoutCategory;
  onClick: () => void;
}

/**
 * Props for the RankedLocationCard component (card with rank badge for top locations view)
 */
export interface RankedLocationCardProps {
  location: ScoutLocation & { countryName: string };
  rank: number;
  category: ScoutCategory;
  onClick: () => void;
}

/**
 * Props for the OverallLocationCard component (card for cross-category ranking)
 */
export interface OverallLocationCardProps {
  location: OverallScoutLocation;
  rank: number;
  onClick: () => void;
}

/**
 * Props for the BlurredOverallCard component (hack-proof placeholder for overall view)
 */
export interface BlurredOverallCardProps {
  fakeCity: { name: string; country: string };
  rank: number;
}

/**
 * Props for the BlurredRankedCard component (hack-proof placeholder for category view)
 */
export interface BlurredRankedCardProps {
  fakeCity: { name: string; country: string };
  rank: number;
}

/**
 * Props for the SignUpPromptCard component (auth gating prompt)
 */
export interface SignUpPromptCardProps {
  remainingCount: number;
  category: string;
  /** If true, this gates the TOP locations (premium) rather than extras */
  isTopLocations?: boolean;
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

// Re-export scout-utils types that are commonly used with ScoutPanel
export type {
  ScoutCategory,
  ScoutLocation,
  RankedCountryGroup,
  OverallScoutLocation,
  OverallCountryGroup,
} from '../../utils/scout-utils';
