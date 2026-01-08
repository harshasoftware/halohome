/**
 * useFavoriteSelection Hook
 * Manages multi-select state for favorites, following the LineReportPanel pattern.
 * Uses Set<string> for efficient ID lookups and selection operations.
 */

import { useState, useCallback, useMemo } from 'react';

export interface UseFavoriteSelectionReturn {
  /** Set of currently selected favorite IDs */
  selectedIds: Set<string>;
  /** Number of selected items */
  selectedCount: number;
  /** Toggle selection state for a single ID */
  toggleSelection: (id: string) => void;
  /** Select all provided IDs */
  selectAll: (ids: string[]) => void;
  /** Clear all selections */
  clearSelection: () => void;
  /** Check if a specific ID is selected */
  isSelected: (id: string) => boolean;
  /** Check if all items are selected (given total count) */
  isAllSelected: (totalCount: number) => boolean;
}

export function useFavoriteSelection(): UseFavoriteSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Toggle selection for a single ID
  const toggleSelection = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  // Select all provided IDs
  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(new Set(ids));
  }, []);

  // Clear all selections
  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Check if a specific ID is selected
  const isSelected = useCallback((id: string): boolean => {
    return selectedIds.has(id);
  }, [selectedIds]);

  // Computed: number of selected items
  const selectedCount = useMemo(() => selectedIds.size, [selectedIds]);

  // Check if all items are selected
  const isAllSelected = useCallback((totalCount: number): boolean => {
    return totalCount > 0 && selectedIds.size === totalCount;
  }, [selectedIds]);

  return {
    selectedIds,
    selectedCount,
    toggleSelection,
    selectAll,
    clearSelection,
    isSelected,
    isAllSelected,
  };
}
