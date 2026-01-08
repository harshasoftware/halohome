/**
 * Privacy levels for shared astrocartography links
 * - full: Show all birth data (date, time, location)
 * - anonymous: Show lines only, no birth data visible
 * - partial: Show lines + general region (~11km), no exact time
 */
export type PrivacyLevel = 'full' | 'anonymous' | 'partial';

/**
 * Birth data payload for share links
 */
export interface ShareBirthData {
  date: string;
  latitude: number;
  longitude: number;
  localDate?: string;
  localTime?: string;
  cityName?: string;
  timezone?: string;
}

/**
 * Visibility state for astrocartography lines
 */
export interface ShareVisibilityState {
  planets?: Record<string, boolean>;
  lineTypes?: Record<string, boolean>;
  aspects?: boolean;
  parans?: boolean;
  zenith?: boolean;
}

/**
 * Camera position for globe view
 */
export interface ShareCameraPosition {
  lat: number;
  lng: number;
  altitude: number;
}

/**
 * Request payload for creating a share link
 */
export interface CreateShareRequest {
  birthData: ShareBirthData;
  visibilityState?: ShareVisibilityState;
  cameraPosition?: ShareCameraPosition;
  privacyLevel: PrivacyLevel;
  title?: string;
  description?: string;
  expiresInDays?: number;
}

/**
 * Response from creating a share link
 */
export interface CreateShareResponse {
  shortCode: string;
  shareUrl: string;
  embedUrl: string;
  embedCode: string;
  expiresAt: string | null;
  viewCount: number;
}

/**
 * Data returned when fetching a share link
 */
export interface ShareLinkData {
  shortCode: string;
  birthData: ShareBirthData;
  visibilityState: ShareVisibilityState | null;
  cameraPosition: ShareCameraPosition | null;
  privacyLevel: PrivacyLevel;
  title: string | null;
  description: string | null;
  viewCount: number;
  createdAt: string;
}
