/**
 * FavoritesPanelContent - Content for the favorites panel in the right panel stack
 *
 * Displays user's favorite cities with actions to navigate or remove.
 */

import React from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, MapPin, Trash2, Navigation, Globe2 } from 'lucide-react';
import type { FavoriteCity } from '@/hooks/useFavoriteCities';
import { toast } from 'sonner';
import { FavoriteNoteEditor } from './FavoriteNoteEditor';

interface FavoritesPanelContentProps {
  favorites: FavoriteCity[];
  loading: boolean;
  onSelectFavorite: (lat: number, lng: number, name: string) => void;
  onRemoveFavorite: (id: string, name: string) => void;
  onUpdateNotes?: (id: string, notes: string) => void;
  onClose: () => void;
}

export const FavoritesPanelContent: React.FC<FavoritesPanelContentProps> = ({
  favorites,
  loading,
  onSelectFavorite,
  onRemoveFavorite,
  onUpdateNotes,
  onClose,
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8 h-64">
        <div className="w-6 h-6 border-2 rounded-full animate-spin border-slate-200 border-t-purple-500" />
      </div>
    );
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 h-full min-h-[300px] text-center">
        <div className="w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <Heart className="w-8 h-8 text-slate-300 dark:text-slate-600" />
        </div>
        <h3 className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-2">
          No Favorites Yet
        </h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-[250px]">
          Click the heart icon on any city to save it to your favorites for quick access.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10">
        <div className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          <h2 className="text-lg font-semibold text-slate-800 dark:text-white">
            Favorite Cities
          </h2>
          <span className="ml-auto text-sm text-slate-500 dark:text-slate-400">
            {favorites.length} {favorites.length === 1 ? 'city' : 'cities'}
          </span>
        </div>
      </div>

      {/* Favorites List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {favorites.map((fav) => (
            <div
              key={fav.id}
              className="group relative rounded-lg border border-slate-200 dark:border-white/10 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors"
            >
              {/* Clickable header area for navigation */}
              <button
                onClick={() => onSelectFavorite(fav.latitude, fav.longitude, fav.city_name)}
                className="w-full p-3 pb-1 text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-blue-500" />
                  </div>
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
                  </div>
                </div>
              </button>

              {/* Notes section - separate from navigation button */}
              <div className="px-3 pb-3 pl-16">
                {onUpdateNotes ? (
                  <FavoriteNoteEditor
                    id={fav.id}
                    initialNotes={fav.notes || ''}
                    onSave={async (id, notes) => {
                      onUpdateNotes(id, notes);
                    }}
                  />
                ) : (
                  fav.notes && (
                    <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                      {fav.notes}
                    </p>
                  )
                )}
              </div>

              {/* Actions */}
              <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30"
                  onClick={() => onSelectFavorite(fav.latitude, fav.longitude, fav.city_name)}
                  title="Navigate to city"
                >
                  <Navigation className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveFavorite(fav.id, fav.city_name);
                  }}
                  title="Remove from favorites"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Footer tip */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50">
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Globe2 className="w-4 h-4" />
          Click a city to fly there on the globe
        </p>
      </div>
    </div>
  );
};

export default FavoritesPanelContent;
