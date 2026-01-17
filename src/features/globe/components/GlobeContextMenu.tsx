/**
 * GlobeContextMenu - Context menu for globe interactions
 *
 * Appears on:
 * - Desktop: Right-click on globe
 * - Mobile/Tablet: Long-press on globe (500ms)
 *
 * Provides quick access to location actions without needing to remember gestures.
 */

import React, { useEffect, useRef } from 'react';
import { MapPin, Star, Copy, X, Compass, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export interface GlobeContextMenuProps {
  x: number;
  y: number;
  lat: number;
  lng: number;
  cityName?: string;
  isOpen: boolean;
  onClose: () => void;
  // Actions
  onAnalyzeLocation: (lat: number, lng: number) => void;
  onAddToFavorites: (lat: number, lng: number, name: string) => void;
  onAskAI: (lat: number, lng: number, name: string) => void;
  // Optional - for checking if already favorited
  isFavorited?: boolean;
}

export const GlobeContextMenu: React.FC<GlobeContextMenuProps> = ({
  x,
  y,
  lat,
  lng,
  cityName,
  isOpen,
  onClose,
  onAnalyzeLocation,
  onAddToFavorites,
  onAskAI,
  isFavorited = false,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    // Small delay to prevent immediate close from the triggering event
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }, 10);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  // Adjust position to keep menu in viewport
  useEffect(() => {
    if (!isOpen || !menuRef.current) return;

    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Adjust horizontal position
    if (rect.right > viewportWidth - 16) {
      menu.style.left = `${viewportWidth - rect.width - 16}px`;
    }

    // Adjust vertical position
    if (rect.bottom > viewportHeight - 16) {
      menu.style.top = `${viewportHeight - rect.height - 16}px`;
    }
  }, [isOpen, x, y]);

  if (!isOpen) return null;

  const locationName = cityName || `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;

  const handleCopyCoordinates = () => {
    const coordsText = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    navigator.clipboard.writeText(coordsText);
    toast.success('Coordinates copied to clipboard');
    onClose();
  };

  const handleAnalyze = () => {
    onAnalyzeLocation(lat, lng);
    onClose();
  };

  const handleFavorite = () => {
    onAddToFavorites(lat, lng, locationName);
    onClose();
  };

  const handleAskAI = () => {
    onAskAI(lat, lng, locationName);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="fixed z-[10000] bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 py-1 min-w-[200px] animate-in fade-in zoom-in-95 duration-150"
      style={{ left: x, top: y }}
      role="menu"
      aria-label="Location actions"
    >
      {/* Header with location name */}
      <div className="px-3 py-2 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200 truncate max-w-[180px]">
          <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="truncate">{locationName}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded transition-colors"
          aria-label="Close menu"
        >
          <X className="w-3.5 h-3.5 text-slate-400" />
        </button>
      </div>

      {/* Menu items */}
      <div className="py-1">
        {/* Analyze Location */}
        <button
          onClick={handleAnalyze}
          className="w-full px-3 py-2 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
          role="menuitem"
        >
          <Compass className="w-4 h-4 text-purple-500" />
          <span>Analyze Location</span>
        </button>

        {/* Ask AI */}
        <button
          onClick={handleAskAI}
          className="w-full px-3 py-2 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
          role="menuitem"
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Ask AI about this location</span>
        </button>

        {/* Divider */}
        <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

        {/* Add to Favorites */}
        <button
          onClick={handleFavorite}
          className="w-full px-3 py-2 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
          role="menuitem"
        >
          <Star className={`w-4 h-4 ${isFavorited ? 'text-yellow-500 fill-yellow-500' : 'text-yellow-500'}`} />
          <span>{isFavorited ? 'Edit Favorite' : 'Add to Favorites'}</span>
        </button>

        {/* Copy Coordinates */}
        <button
          onClick={handleCopyCoordinates}
          className="w-full px-3 py-2 flex items-center gap-3 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
          role="menuitem"
        >
          <Copy className="w-4 h-4 text-slate-400" />
          <span>Copy Coordinates</span>
        </button>
      </div>

      {/* Coordinates footer */}
      <div className="px-3 py-1.5 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 font-mono">
        {lat.toFixed(4)}°, {lng.toFixed(4)}°
      </div>
    </div>
  );
};

export default GlobeContextMenu;
