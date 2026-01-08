/**
 * PlacesTab Card Height Constants
 *
 * These constants define the measured heights for virtualization
 * of the PlaceCard components in CityInfoPanel's PlacesTab.
 *
 * Height measurements are based on PlaceCard with all optional elements visible
 * (photo, title, rating, price level, distance, open/closed status, badge).
 *
 * IMPORTANT: If PlaceCard styling changes (padding, font sizes, spacing), these
 * values may need to be updated to maintain accurate virtualization.
 */

// ============================================================================
// PlaceCard Component Structure
// ============================================================================
// Container: flex gap-3 p-2 rounded-lg
//   - Photo: w-20 h-20 (80px × 80px fixed)
//   - Info section:
//     - Title (h4, text-sm): ~20px line-height
//     - Rating row (mt-1): ~20px (4px margin + 16px content)
//     - Distance row (mt-1): ~20px (4px margin + 16px content)
//     - Badge (mt-1.5, h-5): ~26px (6px margin + 20px badge)
// ============================================================================

// ============================================================================
// Card Heights (in pixels)
// ============================================================================

/**
 * PlaceCard photo height (w-20 h-20)
 * This is the minimum card content height
 */
export const PLACE_CARD_PHOTO_SIZE = 80;

/**
 * PlaceCard padding (p-2 on container)
 */
export const PLACE_CARD_PADDING = 8;

/**
 * PlaceCard info section height when all optional elements are shown
 * - Title: 20px
 * - Rating row: 4px (mt-1) + 16px (text-xs line-height) = 20px
 * - Distance row: 4px (mt-1) + 16px (text-xs line-height) = 20px
 * - Badge: 6px (mt-1.5) + 20px (h-5) = 26px
 * Total: 86px
 */
export const PLACE_CARD_INFO_MAX_HEIGHT = 86;

/**
 * PlaceCard base height (when only photo determines height)
 * Container padding + photo height + container padding
 * 8px + 80px + 8px = 96px
 */
export const PLACE_CARD_BASE_HEIGHT = 96;

/**
 * PlaceCard max height (when info section determines height)
 * Container padding + info section + container padding
 * 8px + 86px + 8px = 102px
 */
export const PLACE_CARD_MAX_HEIGHT = 102;

/**
 * PlaceCard height for virtualization
 * Uses max height to ensure all content fits
 * Adding 2px buffer for rendering variations
 */
export const PLACE_CARD_HEIGHT = 104;

// ============================================================================
// List Spacing
// ============================================================================

/**
 * Gap between PlaceCards (from space-y-3 class)
 */
export const PLACE_CARD_GAP = 12;

/**
 * Container padding (from p-4 class on the list container)
 */
export const PLACES_LIST_PADDING = 16;

// ============================================================================
// Virtualization Heights
// ============================================================================

/**
 * Total item height including gap for virtualization calculations
 * Card height + gap between cards
 */
export const PLACE_CARD_ITEM_HEIGHT = PLACE_CARD_HEIGHT + PLACE_CARD_GAP;

// ============================================================================
// Skeleton Loading Heights
// ============================================================================

/**
 * Skeleton item height (matches PlaceCard structure)
 * Based on: w-20 h-20 photo skeleton with p-4 space-y-3 container
 */
export const PLACE_SKELETON_HEIGHT = PLACE_CARD_HEIGHT;

// ============================================================================
// Virtualization Configuration
// ============================================================================

/**
 * Configuration object for useVirtualList hook when virtualizing PlaceCards
 */
export const PLACES_LIST_VIRTUALIZATION_CONFIG = {
  /** Minimum items before virtualization activates */
  minItemsForVirtualization: 10,
  /** Number of items to render outside visible area */
  overscan: 5,
} as const;
