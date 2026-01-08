/**
 * MobileFavoritesSheet - Bottom sheet for favorite cities on mobile
 *
 * Displays user's favorite cities with ability to navigate to them
 * or remove from favorites. Includes search and batch selection/deletion.
 * Optimized for touch interactions with virtualized list.
 */

import React, { useState, useRef, useCallback } from 'react';
import {
  Heart,
  MapPin,
  Trash2,
  Navigation,
  Globe2,
  Loader2,
  CheckSquare,
  X,
  Search,
  SearchX,
} from 'lucide-react';
import { MobileBottomSheet } from './MobileBottomSheet';
import { VirtualList } from '@/lib/patterns';
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
import type { FavoriteCity } from '@/hooks/useFavoriteCities';
import { useFavoriteSelection } from '@/hooks/useFavoriteSelection';
import { useFavoritesFilter } from '@/hooks/useFavoritesFilter';
import { cn } from '@/lib/utils';
import { useGlobeInteractionStore } from '@/stores/globeInteractionStore';
import { toast } from 'sonner';
import { FavoriteNoteEditor } from '../panels/FavoriteNoteEditor';

interface MobileFavoritesSheetProps {
  favorites: FavoriteCity[];
  loading: boolean;
  onSelectFavorite: (lat: number, lng: number, name: string) => void;
  onRemoveFavorite: (id: string, name: string) => void;
  onUpdateNotes?: (id: string, notes: string) => Promise<void>;
  onRemoveMultipleFavorites?: (ids: string[]) => Promise<void>;
  onClose: () => void;
}

export const MobileFavoritesSheet: React.FC<MobileFavoritesSheetProps> = ({
  favorites,
  loading,
  onSelectFavorite,
  onRemoveFavorite,
  onUpdateNotes,
  onRemoveMultipleFavorites,
  onClose,
}) => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { filteredFavorites } = useFavoritesFilter(favorites, searchQuery);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const setMobileSheetMaximized = useGlobeInteractionStore((s) => s.setMobileSheetMaximized);

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
    searchInputRef.current?.focus();
  }, []);

  // Determine if we're showing filtered results
  const isFiltering = searchQuery.trim().length > 0;
  const hasNoResults = isFiltering && filteredFavorites.length === 0;
  const {
    selectedIds,
    selectedCount,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    isAllSelected,
  } = useFavoriteSelection();

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

  const handleClose = () => {
    setMobileSheetMaximized(false);
    exitSelectMode();
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
      subtitle={isFiltering
        ? `${filteredFavorites.length} of ${favorites.length} saved`
        : `${favorites.length} saved location${favorites.length !== 1 ? 's' : ''}`}
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
        ) : (
          <>
            {/* Select mode toolbar */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 dark:border-white/10">
              {isSelectMode ? (
                <>
                  <span className="text-sm text-slate-600 dark:text-slate-300">
                    {selectedCount > 0 ? `${selectedCount} selected` : 'Select items'}
                  </span>
                  <button
                    onClick={exitSelectMode}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                    Done
                  </button>
                </>
              ) : (
                <>
                  <span className="text-sm text-slate-500 dark:text-slate-400">
                    {isFiltering
                      ? `${filteredFavorites.length} of ${favorites.length}`
                      : `${favorites.length} ${favorites.length === 1 ? 'city' : 'cities'}`}
                  </span>
                  <button
                    onClick={() => setIsSelectMode(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  >
                    <CheckSquare className="w-4 h-4" />
                    Select
                  </button>
                </>
              )}
            </div>

            {/* Search Input */}
            <div className="px-4 py-2 border-b border-slate-200 dark:border-white/10">
              <div className="relative flex items-center">
                <Search className="absolute left-3 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  ref={searchInputRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search favorites..."
                  className="w-full h-9 pl-9 pr-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  style={{ fontSize: '16px' }}
                />
                {searchQuery && (
                  <button
                    onClick={handleClearSearch}
                    className="absolute right-2 p-1 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4 text-slate-400" />
                  </button>
                )}
              </div>
            </div>

            {/* Favorites list */}
            <div className="flex-1 px-4 py-3">
              {hasNoResults ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
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
                    className="mt-3 text-sm text-blue-500 hover:text-blue-600"
                  >
                    Clear search
                  </button>
                </div>
              ) : (
              <VirtualList
                items={filteredFavorites}
                itemHeight={isSelectMode ? 100 : 160}
                containerHeight={Math.min(filteredFavorites.length * (isSelectMode ? 100 : 160), 400)}
                overscan={2}
                className="overflow-y-auto"
                renderItem={(fav, index, style) => (
                  <div key={fav.id} style={{ ...style, paddingBottom: 8 }}>
                    {isSelectMode ? (
                      // Select mode: tapping toggles selection
                      <button
                        onClick={() => toggleSelection(fav.id)}
                        className={cn(
                          'w-full rounded-xl border p-4 transition-all text-left',
                          isSelected(fav.id)
                            ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20'
                            : 'bg-white dark:bg-white/[0.02] border-slate-200 dark:border-white/10 active:bg-slate-50 dark:active:bg-white/5'
                        )}
                      >
                        <div className="flex items-center gap-4">
                          {/* Touch-friendly checkbox */}
                          <div className="flex-shrink-0 flex items-center justify-center w-12 h-12">
                            <Checkbox
                              checked={isSelected(fav.id)}
                              onCheckedChange={() => toggleSelection(fav.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-6 w-6"
                            />
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
                          </div>
                        </div>
                      </button>
                    ) : (
                      // Normal mode: show full card with actions
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
                            {/* Notes section with inline editing */}
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
                    )}
                  </div>
                )}
              />
              )}
            </div>

            {/* Sticky bottom action bar - shown when in select mode */}
            {isSelectMode && (
              <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200 dark:border-white/10 bg-white dark:bg-[#0a0a0a] safe-area-pb">
                <div className="flex items-center gap-2">
                  <button
                    onClick={isAllSelected(filteredFavorites.length) ? clearSelection : handleSelectAll}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium bg-slate-100 dark:bg-white/5 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  >
                    <CheckSquare className="w-4 h-4" />
                    {isAllSelected(filteredFavorites.length) ? 'Deselect All' : 'Select All'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={selectedCount === 0 || !onRemoveMultipleFavorites || isDeleting}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-colors',
                      selectedCount === 0 || !onRemoveMultipleFavorites || isDeleting
                        ? 'bg-red-100 dark:bg-red-500/10 text-red-300 dark:text-red-700 cursor-not-allowed'
                        : 'bg-red-500 text-white hover:bg-red-600'
                    )}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete{selectedCount > 0 ? ` (${selectedCount})` : ''}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Footer tip - hide when in select mode since action bar is shown */}
        {favorites.length > 0 && !isSelectMode && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-900/50">
            <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
              <Globe2 className="w-4 h-4" />
              Tap "Go to City" to fly there on the globe
            </p>
          </div>
        )}
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
    </MobileBottomSheet>
  );
};

export default MobileFavoritesSheet;
