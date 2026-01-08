/**
 * MobileFavoritesSheet - Bottom sheet for favorite cities on mobile
 *
 * Displays user's favorite cities with ability to navigate to them
 * or remove from favorites. Optimized for touch interactions with virtualized list.
 */

import React, { useState, useCallback } from 'react';
import {
  Heart,
  MapPin,
  Trash2,
  Navigation,
  Globe2,
  Loader2,
  Search,
  SearchX,
  X,
} from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';
import { VirtualList } from '@/lib/patterns';
import type { FavoriteCity } from '@/hooks/useFavoriteCities';
import { useFavoritesFilter } from '@/hooks/useFavoritesFilter';
import { cn } from '@/lib/utils';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';

interface MobileFavoritesSheetProps {
  favorites: FavoriteCity[];
  loading: boolean;
  onSelectFavorite: (lat: number, lng: number, name: string) => void;
  onRemoveFavorite: (id: string, name: string) => void;
  onClose: () => void;
}

export const MobileFavoritesSheet: React.FC<MobileFavoritesSheetProps> = ({
  favorites,
  loading,
  onSelectFavorite,
  onRemoveFavorite,
  onClose,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const setMobileSheetMaximized = useGlobeInteractionStore((s) => s.setMobileSheetMaximized);
  const { filteredFavorites } = useFavoritesFilter(favorites, searchQuery);

  // Determine if we're showing filtered results
  const isFiltering = searchQuery.trim().length > 0;
  const hasNoResults = isFiltering && filteredFavorites.length === 0;

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  const handleClose = () => {
    setMobileSheetMaximized(false);
    onClose();
  };

  const handleSelectAndClose = (lat: number, lng: number, name: string) => {
    onSelectFavorite(lat, lng, name);
    handleClose();
  };

  const icon = (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center">
      <Heart className="w-4 h-4 text-white fill-white" />
    </div>
  );

  return (
    <MobileBottomSheet
      onClose={handleClose}
      title="Favorite Cities"
      subtitle={
        isFiltering
          ? `${filteredFavorites.length} of ${favorites.length} location${favorites.length !== 1 ? 's' : ''}`
          : `${favorites.length} saved location${favorites.length !== 1 ? 's' : ''}`
      }
      icon={icon}
      maxHeight="70vh"
      showBackdrop={true}
      onBackdropClick={handleClose}
      allowMaximize={true}
      isMaximized={isMaximized}
      onToggleMaximize={() => setIsMaximized(!isMaximized)}
      onMaximizeChange={setMobileSheetMaximized}
    >
      <div className="flex flex-col h-full">
        {/* Search Input - only show when there are favorites */}
        {!loading && favorites.length > 0 && (
          <div className="flex-shrink-0 px-4 py-3 border-b border-slate-200 dark:border-white/10">
            <div className="relative flex items-center">
              <Search className="absolute left-3 w-5 h-5 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search favorites..."
                className={cn(
                  'w-full h-11 pl-10 pr-10 rounded-xl',
                  'border border-slate-200 dark:border-slate-700',
                  'bg-white dark:bg-slate-800',
                  'text-slate-700 dark:text-slate-200',
                  'placeholder-slate-400 dark:placeholder-slate-500',
                  'focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
                  'transition-colors'
                )}
                style={{ fontSize: '16px' }} // Prevents iOS zoom on focus
              />
              {searchQuery && (
                <button
                  onClick={handleClearSearch}
                  className="absolute right-2 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-5 h-5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
                </button>
              )}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-pink-500" />
          </div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-20 h-20 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-4">
              <Heart className="h-10 w-10 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-base font-medium text-slate-700 dark:text-slate-200 mb-2">
              No Favorites Yet
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[250px]">
              Tap the heart icon on any city to save it to your favorites for quick access
            </p>
          </div>
        ) : hasNoResults ? (
          <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center mb-4">
              <SearchX className="h-8 w-8 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-base font-medium text-slate-700 dark:text-slate-200 mb-2">
              No Results Found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[250px]">
              No favorites match "{searchQuery.trim()}"
            </p>
            <button
              onClick={handleClearSearch}
              className="mt-4 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Clear search
            </button>
          </div>
        ) : (
          <div className="flex-1 px-4 py-3">
            <VirtualList
              items={filteredFavorites}
              itemHeight={160}
              containerHeight={Math.min(filteredFavorites.length * 160, 400)}
              overscan={2}
              className="overflow-y-auto"
              renderItem={(fav, index, style) => (
                <div key={fav.id} style={{ ...style, paddingBottom: 8 }}>
                  <div
                    className={cn(
                      'relative rounded-xl border p-4 transition-all',
                      'bg-white dark:bg-white/[0.02]',
                      'border-slate-200 dark:border-white/10',
                      'active:bg-slate-50 dark:active:bg-white/5'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      {/* City icon */}
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-cyan-100 dark:from-blue-900/30 dark:to-cyan-900/30 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-blue-500" />
                      </div>

                      {/* City info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-slate-800 dark:text-white truncate">
                          {fav.city_name}
                        </h3>
                        {fav.country && (
                          <p className="text-sm text-slate-500 dark:text-slate-400 truncate">
                            {fav.country}
                          </p>
                        )}
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 font-mono">
                          {fav.latitude.toFixed(4)}°, {fav.longitude.toFixed(4)}°
                        </p>
                        {fav.notes && (
                          <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                            {fav.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-200 dark:border-white/10">
                      <button
                        onClick={() => handleSelectAndClose(fav.latitude, fav.longitude, fav.city_name)}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-blue-500 hover:bg-blue-600 text-white text-sm font-medium transition-colors"
                      >
                        <Navigation className="h-4 w-4" />
                        Go to City
                      </button>
                      <button
                        onClick={() => onRemoveFavorite(fav.id, fav.city_name)}
                        className="flex items-center justify-center w-10 h-10 rounded-lg bg-red-100 dark:bg-red-500/10 text-red-500 hover:bg-red-200 dark:hover:bg-red-500/20 transition-colors"
                        title="Remove from favorites"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            />
          </div>
        )}

        {/* Footer tip - only show when favorites are displayed */}
        {favorites.length > 0 && !hasNoResults && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50">
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Globe2 className="w-4 h-4" />
              Tap "Go to City" to fly there on the globe
            </p>
          </div>
        )}
      </div>
    </MobileBottomSheet>
  );
};

export default MobileFavoritesSheet;
