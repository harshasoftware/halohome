/**
 * Scout Panel Card Height Constants
 *
 * These constants define the measured/estimated heights for virtualization
 * of the various card components in the ScoutPanel.
 *
 * Height measurements are based on the collapsed state of cards (not expanded).
 * Cards with expandable content (RankedLocationCard, OverallLocationCard) use
 * their collapsed height for virtualization efficiency.
 *
 * IMPORTANT: If card styling changes (padding, font sizes, spacing), these
 * values may need to be updated to maintain accurate virtualization.
 */

// ============================================================================
// Card Heights (in pixels)
// ============================================================================

/**
 * BlurredRankedCard - Fixed height, no expansion capability
 * Structure: p-4 padding + rank badge (36px) + content + score badge (40px)
 * Content: name + country + nature badges + influence pill
 */
export const BLURRED_RANKED_CARD_HEIGHT = 130;

/**
 * BlurredOverallCard - Fixed height, no expansion capability
 * Structure: p-4 padding + rank badge (36px) + content + score badge (44px)
 * Content: name + country + category badges + category pills
 */
export const BLURRED_OVERALL_CARD_HEIGHT = 130;

/**
 * RankedLocationCard - Variable height due to expandable details
 * Base collapsed height when hasMoreInfluences is false
 */
export const RANKED_CARD_BASE_HEIGHT = 130;

/**
 * RankedLocationCard - Height when "Show details" button is visible
 * (when card has more than 1 influence)
 * Includes: base content + border-t + mt-3 (12px) + pt-3 (12px) + button (~16px)
 */
export const RANKED_CARD_WITH_EXPAND_HEIGHT = 170;

/**
 * OverallLocationCard - Variable height due to expandable categories
 * Base collapsed height when hasMoreCategories is false
 */
export const OVERALL_CARD_BASE_HEIGHT = 136;

/**
 * OverallLocationCard - Height when "Show all categories" button is visible
 * (when card has more than 3 categories)
 */
export const OVERALL_CARD_WITH_EXPAND_HEIGHT = 176;

/**
 * SignUpPromptCard - Fixed height for authentication prompt
 * Structure: p-5 padding + lock icon + title + description + 2 buttons + divider
 */
export const SIGNUP_PROMPT_CARD_HEIGHT = 200;

// ============================================================================
// List Spacing
// ============================================================================

/**
 * Gap between cards in the list (from space-y-3 class)
 */
export const SCOUT_CARD_GAP = 12;

/**
 * Container padding (from p-4 class on the list container)
 */
export const SCOUT_LIST_PADDING = 16;

// ============================================================================
// Recommended Heights for Virtualization
// ============================================================================

/**
 * Recommended fixed height for RankedLocationCard in virtualization
 * Uses the "with expand button" height as most cards have multiple influences
 */
export const RANKED_CARD_VIRTUAL_HEIGHT = RANKED_CARD_WITH_EXPAND_HEIGHT;

/**
 * Recommended fixed height for OverallLocationCard in virtualization
 * Uses the "with expand button" height as most cards have multiple categories
 */
export const OVERALL_CARD_VIRTUAL_HEIGHT = OVERALL_CARD_WITH_EXPAND_HEIGHT;

/**
 * Total item height including gap for virtualization calculations
 * Use this when items are spaced with gap between them
 */
export const RANKED_CARD_ITEM_HEIGHT = RANKED_CARD_VIRTUAL_HEIGHT + SCOUT_CARD_GAP;
export const OVERALL_CARD_ITEM_HEIGHT = OVERALL_CARD_VIRTUAL_HEIGHT + SCOUT_CARD_GAP;
export const BLURRED_RANKED_ITEM_HEIGHT = BLURRED_RANKED_CARD_HEIGHT + SCOUT_CARD_GAP;
export const BLURRED_OVERALL_ITEM_HEIGHT = BLURRED_OVERALL_CARD_HEIGHT + SCOUT_CARD_GAP;
export const SIGNUP_PROMPT_ITEM_HEIGHT = SIGNUP_PROMPT_CARD_HEIGHT + SCOUT_CARD_GAP;

// ============================================================================
// Height Estimator Function
// ============================================================================

export type ScoutCardType =
  | 'ranked'
  | 'overall'
  | 'blurredRanked'
  | 'blurredOverall'
  | 'signupPrompt';

/**
 * Get the estimated height for a scout card type
 * Useful for variable height virtualization scenarios
 */
export function getScoutCardHeight(
  cardType: ScoutCardType,
  hasExpandButton: boolean = true
): number {
  switch (cardType) {
    case 'ranked':
      return hasExpandButton ? RANKED_CARD_WITH_EXPAND_HEIGHT : RANKED_CARD_BASE_HEIGHT;
    case 'overall':
      return hasExpandButton ? OVERALL_CARD_WITH_EXPAND_HEIGHT : OVERALL_CARD_BASE_HEIGHT;
    case 'blurredRanked':
      return BLURRED_RANKED_CARD_HEIGHT;
    case 'blurredOverall':
      return BLURRED_OVERALL_CARD_HEIGHT;
    case 'signupPrompt':
      return SIGNUP_PROMPT_CARD_HEIGHT;
  }
}

/**
 * Get the item height including gap for virtualization
 */
export function getScoutCardItemHeight(
  cardType: ScoutCardType,
  hasExpandButton: boolean = true
): number {
  return getScoutCardHeight(cardType, hasExpandButton) + SCOUT_CARD_GAP;
}

// ============================================================================
// Country Section Heights
// ============================================================================

/**
 * CountrySection and OverallCountrySection header (collapsed) height
 * Structure: button with py-3.5 (14px each) + content line (~24px) + border (1px)
 * Content: flag (text-base) + country name (text-sm) + badges + city count + chevron
 */
export const COUNTRY_SECTION_HEADER_HEIGHT = 56;

/**
 * Country section expanded content padding
 * Container: px-4 pb-4 pt-1 space-y-2
 */
export const COUNTRY_SECTION_PADDING_TOP = 4; // pt-1
export const COUNTRY_SECTION_PADDING_BOTTOM = 16; // pb-4
export const COUNTRY_SECTION_CARD_GAP = 8; // space-y-2

/**
 * LocationCard height (used inside CountrySection)
 * Same structure as RankedLocationCard - p-4 padding + header + influence pills + optional expand button
 */
export const LOCATION_CARD_BASE_HEIGHT = 130;
export const LOCATION_CARD_WITH_EXPAND_HEIGHT = 170;

/**
 * Recommended virtual height for LocationCard
 * Uses the "with expand button" height as most cards have multiple influences
 */
export const LOCATION_CARD_VIRTUAL_HEIGHT = LOCATION_CARD_WITH_EXPAND_HEIGHT;

// ============================================================================
// Country Section Height Calculator Functions
// ============================================================================

/**
 * Calculate the total height of a CountrySection (collapsed)
 */
export function getCountrySectionCollapsedHeight(): number {
  return COUNTRY_SECTION_HEADER_HEIGHT;
}

/**
 * Calculate the total height of a CountrySection when expanded
 * @param numLocations - Number of LocationCards in the section
 * @param useExpandButtonHeight - Whether to use the taller card height (default true)
 */
export function getCountrySectionExpandedHeight(
  numLocations: number,
  useExpandButtonHeight: boolean = true
): number {
  const cardHeight = useExpandButtonHeight
    ? LOCATION_CARD_WITH_EXPAND_HEIGHT
    : LOCATION_CARD_BASE_HEIGHT;

  // Header + top padding + cards with gaps + bottom padding
  const cardsHeight = numLocations > 0
    ? (numLocations * cardHeight) + ((numLocations - 1) * COUNTRY_SECTION_CARD_GAP)
    : 0;

  return (
    COUNTRY_SECTION_HEADER_HEIGHT +
    COUNTRY_SECTION_PADDING_TOP +
    cardsHeight +
    COUNTRY_SECTION_PADDING_BOTTOM
  );
}

/**
 * Calculate the total height of an OverallCountrySection when expanded
 * @param numLocations - Number of OverallLocationCards in the section
 * @param useExpandButtonHeight - Whether to use the taller card height (default true)
 */
export function getOverallCountrySectionExpandedHeight(
  numLocations: number,
  useExpandButtonHeight: boolean = true
): number {
  const cardHeight = useExpandButtonHeight
    ? OVERALL_CARD_WITH_EXPAND_HEIGHT
    : OVERALL_CARD_BASE_HEIGHT;

  // Header + top padding + cards with gaps + bottom padding
  const cardsHeight = numLocations > 0
    ? (numLocations * cardHeight) + ((numLocations - 1) * COUNTRY_SECTION_CARD_GAP)
    : 0;

  return (
    COUNTRY_SECTION_HEADER_HEIGHT +
    COUNTRY_SECTION_PADDING_TOP +
    cardsHeight +
    COUNTRY_SECTION_PADDING_BOTTOM
  );
}

/**
 * Generic height calculator for country sections
 * Determines height based on expansion state and number of locations
 */
export type CountrySectionType = 'category' | 'overall';

export function getCountrySectionHeight(
  type: CountrySectionType,
  isExpanded: boolean,
  numLocations: number
): number {
  if (!isExpanded) {
    return COUNTRY_SECTION_HEADER_HEIGHT;
  }

  return type === 'category'
    ? getCountrySectionExpandedHeight(numLocations)
    : getOverallCountrySectionExpandedHeight(numLocations);
}

// ============================================================================
// Virtualization Configuration
// ============================================================================

/**
 * Configuration object for useVirtualList hook when virtualizing scout cards
 */
export const SCOUT_LIST_VIRTUALIZATION_CONFIG = {
  /** Minimum items before virtualization activates */
  minItemsForVirtualization: 10,
  /** Number of items to render outside visible area */
  overscan: 5,
} as const;

/**
 * Configuration for country section virtualization
 * Uses smaller overscan since sections are larger than individual cards
 */
export const COUNTRY_SECTION_VIRTUALIZATION_CONFIG = {
  /** Minimum sections before virtualization activates */
  minItemsForVirtualization: 5,
  /** Number of sections to render outside visible area */
  overscan: 2,
} as const;
