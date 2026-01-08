/**
 * FavoritesPanelContent - Content for the favorites panel in the right panel stack
 *
 * Displays user's favorite cities with actions to navigate or remove.
 * Includes search functionality to filter favorites by city name or country.
 * Supports batch selection and deletion of favorites.
 */

import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Heart, MapPin, Trash2, Navigation, Globe2, CheckSquare, X, Search, SearchX } from 'lucide-react';
import type { FavoriteCity } from '@/hooks/useFavoriteCities';
import { useFavoriteSelection } from '@/hooks/useFavoriteSelection';
import { useFavoritesFilter } from '@/hooks/useFavoritesFilter';
import { toast } from 'sonner';
import { FavoriteNoteEditor } from './FavoriteNoteEditor';

interface FavoritesPanelContentProps {
  favorites: FavoriteCity[];
  loading: boolean;
  onSelectFavorite: (lat: number, lng: number, name: string) => void;
  onRemoveFavorite: (id: string, name: string) => void;
  onUpdateNotes?: (id: string, notes: string) => Promise<void>;
  onRemoveMultipleFavorites?: (ids: string[]) => Promise<void>;
  onClose: () => void;
}

export const FavoritesPanelContent: React.FC<FavoritesPanelContentProps> = ({
  favorites,
  loading,
  onSelectFavorite,
  onRemoveFavorite,
  onUpdateNotes,
  onRemoveMultipleFavorites,
  onClose,
}) => {
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { filteredFavorites } = useFavoritesFilter(favorites, searchQuery);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const {
    selectedIds,
    selectedCount,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    isAllSelected,
  } = useFavoriteSelection();

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (searchQuery) {
        handleClearSearch();
      } else {
        searchInputRef.current?.blur();
      }
    }
  }, [searchQuery, handleClearSearch]);

  // Determine if we're showing filtered results
  const isFiltering = searchQuery.trim().length > 0;
  const hasNoResults = isFiltering && filteredFavorites.length === 0;

  // Exit select mode and clear selection
  const exitSelectMode = () => {
    setIsSelectMode(false);
    clearSelection();
  };

  // Handle select all favorites (uses filtered list when searching)
  const handleSelectAll = () => {
    selectAll(filteredFavorites.map(fav => fav.id));
  };

  // Handle batch delete with confirmation
  const handleBatchDelete = async () => {
    if (!onRemoveMultipleFavorites || selectedCount === 0) return;

    setIsDeleting(true);
    try {
      const idsToDelete = Array.from(selectedIds);
      await onRemoveMultipleFavorites(idsToDelete);
      toast.success(`Deleted ${selectedCount} ${selectedCount === 1 ? 'favorite' : 'favorites'}`);
      exitSelectMode();
    } catch (error) {
      toast.error('Failed to delete favorites. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

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
            {isFiltering
              ? `${filteredFavorites.length} of ${favorites.length}`
              : `${favorites.length} ${favorites.length === 1 ? 'city' : 'cities'}`}
          </span>
          {/* Select mode toggle */}
          {!isSelectMode ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsSelectMode(true)}
              className="h-8 px-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              title="Select multiple"
            >
              <CheckSquare className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={exitSelectMode}
              className="h-8 px-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
              title="Exit select mode"
            >
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>

        {/* Bulk action toolbar - shown when in select mode */}
        {isSelectMode && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
            <Button
              variant="outline"
              size="sm"
              onClick={isAllSelected(filteredFavorites.length) ? clearSelection : handleSelectAll}
              className="h-8 text-xs"
            >
              {isAllSelected(filteredFavorites.length) ? 'Deselect All' : 'Select All'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              className="h-8 text-xs"
              disabled={selectedCount === 0}
            >
              Clear
            </Button>
            <div className="flex-1" />
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs"
              disabled={selectedCount === 0 || !onRemoveMultipleFavorites || isDeleting}
              onClick={() => setShowDeleteConfirm(true)}
            >
              <Trash2 className="w-3 h-3 mr-1" />
              Delete{selectedCount > 0 ? ` (${selectedCount})` : ''}
            </Button>
          </div>
        )}
      </div>

      {/* Search Input */}
      <div className="px-4 py-3 border-b border-slate-200 dark:border-white/10">
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" aria-hidden="true" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search favorites..."
            aria-label="Search favorite cities"
            aria-describedby="favorites-search-hint"
            className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            style={{ fontSize: '16px' }}
          />
          {searchQuery && (
            <button
              onClick={handleClearSearch}
              className="absolute right-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              aria-label="Clear search"
            >
              <X className="w-4 h-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" />
            </button>
          )}
        </div>
        <span id="favorites-search-hint" className="sr-only">
          Press Escape to clear search
        </span>
      </div>
      {/* Screen reader announcement for result count changes */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="sr-only"
      >
        {isFiltering && (
          hasNoResults
            ? `No favorites found matching ${searchQuery}`
            : `${filteredFavorites.length} of ${favorites.length} favorites shown`
        )}
      </div>

      {/* Favorites List */}
      <ScrollArea className="flex-1">
        {hasNoResults ? (
          <div className="flex flex-col items-center justify-center p-8 h-full min-h-[200px] text-center">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-3">
              <SearchX className="w-6 h-6 text-slate-300 dark:text-slate-600" />
            </div>
            <h3 className="text-base font-medium text-slate-700 dark:text-slate-200 mb-1">
              No Results Found
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              No favorites match "{searchQuery.trim()}"
            </p>
            <button
              onClick={handleClearSearch}
              className="mt-3 text-sm text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
            >
              Clear search
            </button>
          </div>
        ) : (
        <div className="p-2 space-y-1">
          {filteredFavorites.map((fav) => (
            <div
              key={fav.id}
              className={`group relative rounded-lg border bg-white dark:bg-slate-900 transition-colors ${
                isSelectMode && isSelected(fav.id)
                  ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              {isSelectMode ? (
                // Select mode: clicking anywhere toggles selection
                <button
                  onClick={() => toggleSelection(fav.id)}
                  className="w-full p-3 text-left"
                >
                  <div className="flex items-start gap-3">
                    {/* Checkbox */}
                    <div className="flex-shrink-0 flex items-center justify-center w-10 h-10">
                      <Checkbox
                        checked={isSelected(fav.id)}
                        onCheckedChange={() => toggleSelection(fav.id)}
                        onClick={(e) => e.stopPropagation()}
                        className="h-5 w-5"
                      />
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
                      {fav.notes && (
                        <p className="text-sm text-slate-600 dark:text-slate-300 mt-2 line-clamp-2">
                          {fav.notes}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ) : (
                // Normal mode: clicking navigates to city
                <>
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
                          await onUpdateNotes(id, notes);
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

                  {/* Actions - only visible in normal mode */}
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
                </>
              )}
            </div>
          ))}
        </div>
        )}
      </ScrollArea>

      {/* Footer tip */}
      <div className="px-4 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50">
        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
          <Globe2 className="w-4 h-4" />
          Click a city to fly there on the globe
        </p>
      </div>

      {/* Batch Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedCount} {selectedCount === 1 ? 'favorite' : 'favorites'}?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. {selectedCount === 1
                ? 'This favorite city will be permanently removed.'
                : `These ${selectedCount} favorite cities will be permanently removed.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleBatchDelete();
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? 'Deleting...' : `Delete ${selectedCount === 1 ? 'Favorite' : 'Favorites'}`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FavoritesPanelContent;
