import { useEffect } from 'react';

/**
 * Prevents browser zoom gestures while allowing the globe to handle its own zoom.
 * - Blocks Ctrl/Cmd + scroll wheel zoom
 * - Blocks Ctrl/Cmd + +/- keyboard zoom
 * - Blocks Ctrl/Cmd + 0 reset zoom
 */
export function usePreventBrowserZoom() {
  useEffect(() => {
    // Prevent Ctrl/Cmd + scroll wheel zoom
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };

    // Prevent Ctrl/Cmd + +/- and Ctrl/Cmd + 0 keyboard zoom
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
        e.preventDefault();
      }
    };

    // Prevent pinch-to-zoom on trackpad (gesturestart/change/end)
    const handleGestureStart = (e: Event) => {
      e.preventDefault();
    };

    // Use passive: false to allow preventDefault
    document.addEventListener('wheel', handleWheel, { passive: false });
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('gesturestart', handleGestureStart);
    document.addEventListener('gesturechange', handleGestureStart);
    document.addEventListener('gestureend', handleGestureStart);

    return () => {
      document.removeEventListener('wheel', handleWheel);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('gesturestart', handleGestureStart);
      document.removeEventListener('gesturechange', handleGestureStart);
      document.removeEventListener('gestureend', handleGestureStart);
    };
  }, []);
}
