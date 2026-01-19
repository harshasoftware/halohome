import React, { useEffect, useMemo, useRef } from 'react';
import { useGoogleMap } from '@react-google-maps/api';
 
type LatLngLiteral = google.maps.LatLngLiteral;
 
export type AdvancedMarkerProps = {
  position: LatLngLiteral;
  title?: string;
  zIndex?: number;
  className?: string;
  /**
   * Back-compat with <Marker icon={...}> usage.
   * If provided, we render the icon as <img> content for AdvancedMarkerElement.
   */
  icon?: google.maps.Icon | string;
  onClick?: () => void;
};
 
async function ensureMarkerLibraryLoaded(): Promise<void> {
  // If the marker library is already present, no-op.
  if (google.maps.marker?.AdvancedMarkerElement) return;
 
  // Prefer importLibrary when available (recommended by Google).
  if (typeof google.maps.importLibrary === 'function') {
    await google.maps.importLibrary('marker');
  }
}
 
function createIconContent(icon: google.maps.Icon | string, className?: string): HTMLElement {
  const wrapper = document.createElement('div');
  // No CSS transforms - AdvancedMarkerElement handles positioning via anchorLeft/anchorTop
  // This prevents drift at different zoom levels
  wrapper.style.position = 'relative';
  wrapper.style.display = 'inline-block';
  wrapper.style.lineHeight = '0'; // Remove inline spacing
  if (className) wrapper.className = className;

  const img = document.createElement('img');
  const iconUrl = typeof icon === 'string' ? icon : icon.url;
  img.src = iconUrl || '';
  img.alt = '';
  img.draggable = false;
  img.decoding = 'async';
  img.loading = 'lazy';
  img.style.display = 'block'; // Remove inline spacing
  img.style.verticalAlign = 'bottom'; // Align to bottom of container

  // Set explicit dimensions if available to ensure stable anchor calculations
  const size =
    typeof icon !== 'string' && icon.scaledSize
      ? { w: icon.scaledSize.width, h: icon.scaledSize.height }
      : null;
  if (size) {
    img.style.width = `${size.w}px`;
    img.style.height = `${size.h}px`;
    // Also set wrapper size to match for consistent anchor calculations
    wrapper.style.width = `${size.w}px`;
    wrapper.style.height = `${size.h}px`;
  }

  wrapper.appendChild(img);
  return wrapper;
}
 
export function AdvancedMarker({ position, title, zIndex, icon, className, onClick }: AdvancedMarkerProps) {
  const map = useGoogleMap();
  const markerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
 
  const content = useMemo(() => {
    if (!icon) return undefined;
    if (typeof window === 'undefined') return undefined;
    return createIconContent(icon, className);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [icon, className]);
 
  useEffect(() => {
    let cancelled = false;
 
    async function mount() {
      if (!map) return;
      await ensureMarkerLibraryLoaded();
      if (cancelled) return;
 
      const AdvancedMarkerElement = google.maps.marker?.AdvancedMarkerElement;
      if (!AdvancedMarkerElement) {
        // Marker library not available; bail quietly.
        return;
      }
 
      // Create once, then update.
      if (!markerRef.current) {
        // Use explicit anchor values to ensure consistent positioning at all zoom levels
        // Defaults are -50% (center) and -100% (bottom), but we set them explicitly
        // to ensure they're applied correctly and prevent drift
        markerRef.current = new AdvancedMarkerElement({
          map,
          position,
          title,
          content,
          zIndex,
          // Explicitly set anchor to bottom-center to match legacy Marker behavior
          // -50% centers horizontally, -100% anchors at bottom edge
          anchorLeft: '-50%',
          anchorTop: '-100%',
        } as google.maps.marker.AdvancedMarkerElementOptions);
      } else {
        markerRef.current.map = map;
        markerRef.current.position = position;
        markerRef.current.title = title ?? '';
        markerRef.current.content = content;
        if (zIndex !== undefined) markerRef.current.zIndex = zIndex;
        // Note: anchorLeft/anchorTop are constructor-only options and cannot be updated
        // If anchor needs to change, the marker must be recreated
      }
 
      // Replace click handler.
      if (clickListenerRef.current) {
        clickListenerRef.current.remove();
        clickListenerRef.current = null;
      }
      if (onClick && markerRef.current) {
        // Advanced markers emit 'gmp-click'. Some environments also support 'click'.
        clickListenerRef.current = markerRef.current.addListener('gmp-click', () => onClick());
      }
    }
 
    void mount();
 
    return () => {
      cancelled = true;
      if (clickListenerRef.current) {
        clickListenerRef.current.remove();
        clickListenerRef.current = null;
      }
      if (markerRef.current) {
        markerRef.current.map = null;
        markerRef.current = null;
      }
    };
  }, [map, position, title, content, zIndex, onClick]);
 
  return null;
}
 
