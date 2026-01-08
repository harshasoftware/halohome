/**
 * useVirtualList Hook
 *
 * A flexible hook for virtualizing long lists with support for:
 * - Fixed and variable height items
 * - Overscan for smooth scrolling
 * - Resize handling
 * - Scroll restoration
 *
 * @example
 * // Fixed height items
 * const { virtualItems, totalHeight, containerRef } = useVirtualList({
 *   items: cities,
 *   itemHeight: 80,
 *   overscan: 5,
 * });
 *
 * @example
 * // Variable height items
 * const { virtualItems, totalHeight, containerRef } = useVirtualList({
 *   items: sections,
 *   itemHeight: (index) => sections[index].expanded ? 200 : 50,
 *   overscan: 3,
 * });
 */

import { useState, useEffect, useRef, useCallback, useMemo, RefObject } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface VirtualItem<T> {
  /** The original item data */
  item: T;
  /** The index of the item in the original array */
  index: number;
  /** The top position of the item in pixels */
  top: number;
  /** The height of the item in pixels */
  height: number;
  /** Style object for positioning the item */
  style: React.CSSProperties;
}

export interface UseVirtualListOptions<T> {
  /** The array of items to virtualize */
  items: T[];
  /**
   * Item height - can be a fixed number or a function that returns height for each index
   * When using a function, heights are cached automatically
   */
  itemHeight: number | ((index: number, item: T) => number);
  /**
   * Optional container ref - if not provided, the hook will create one
   * Use this when you have an existing scroll container
   */
  containerRef?: RefObject<HTMLElement | null>;
  /**
   * Fixed container height - use this if container height is known and static
   * If not provided, the hook will measure the container
   */
  containerHeight?: number;
  /**
   * Number of items to render outside the visible area (default: 5)
   * Higher values result in smoother scrolling but more DOM nodes
   */
  overscan?: number;
  /**
   * Initial scroll position for scroll restoration (default: 0)
   */
  initialScrollTop?: number;
  /**
   * Callback when scroll position changes
   */
  onScroll?: (scrollTop: number) => void;
  /**
   * Enabled flag - when false, returns all items without virtualization (default: true)
   * Useful for disabling virtualization when list is small
   */
  enabled?: boolean;
  /**
   * Minimum item count before virtualization kicks in (default: 0)
   * When item count is below this, all items are rendered
   */
  minItemsForVirtualization?: number;
}

export interface UseVirtualListResult<T> {
  /** Array of visible virtual items with positioning info */
  virtualItems: VirtualItem<T>[];
  /** Total height of all items (for scroll container) */
  totalHeight: number;
  /** Ref to attach to the scroll container */
  containerRef: RefObject<HTMLDivElement | null>;
  /** Current scroll position */
  scrollTop: number;
  /** Start index of visible range (including overscan) */
  startIndex: number;
  /** End index of visible range (including overscan) */
  endIndex: number;
  /** Measured container height */
  containerHeight: number;
  /** Scroll to a specific item index */
  scrollToIndex: (index: number, behavior?: ScrollBehavior) => void;
  /** Scroll to a specific pixel offset */
  scrollToOffset: (offset: number, behavior?: ScrollBehavior) => void;
  /** Whether virtualization is currently active */
  isVirtualized: boolean;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Binary search to find the first item that intersects with the given offset
 */
function findStartIndex(positions: number[], offset: number): number {
  let low = 0;
  let high = positions.length - 1;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const pos = positions[mid];
    const nextPos = positions[mid + 1] ?? Infinity;

    if (pos <= offset && nextPos > offset) {
      return mid;
    } else if (pos > offset) {
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return Math.max(0, low);
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function useVirtualList<T>({
  items,
  itemHeight,
  containerRef: externalContainerRef,
  containerHeight: fixedContainerHeight,
  overscan = 5,
  initialScrollTop = 0,
  onScroll,
  enabled = true,
  minItemsForVirtualization = 0,
}: UseVirtualListOptions<T>): UseVirtualListResult<T> {
  // Create internal ref if external one not provided
  const internalContainerRef = useRef<HTMLDivElement>(null);
  const containerRef = (externalContainerRef as RefObject<HTMLDivElement | null>) ?? internalContainerRef;

  // State
  const [scrollTop, setScrollTop] = useState(initialScrollTop);
  const [measuredContainerHeight, setMeasuredContainerHeight] = useState(0);

  // Height cache for variable heights
  const heightCache = useRef<Map<number, number>>(new Map());

  // Determine if we should virtualize
  const shouldVirtualize = enabled && items.length >= minItemsForVirtualization;

  // Use fixed height or measured height
  const containerHeight = fixedContainerHeight ?? measuredContainerHeight;

  // Calculate heights and positions for all items
  const { positions, heights, totalHeight } = useMemo(() => {
    const positions: number[] = [];
    const heights: number[] = [];
    let total = 0;

    for (let i = 0; i < items.length; i++) {
      positions.push(total);

      let height: number;
      if (typeof itemHeight === 'function') {
        // Check cache first
        const cached = heightCache.current.get(i);
        if (cached !== undefined) {
          height = cached;
        } else {
          height = itemHeight(i, items[i]);
          heightCache.current.set(i, height);
        }
      } else {
        height = itemHeight;
      }

      heights.push(height);
      total += height;
    }

    return { positions, heights, totalHeight: total };
  }, [items, itemHeight]);

  // Clear height cache when items change significantly
  useEffect(() => {
    // Clear cache when items array reference changes
    heightCache.current.clear();
  }, [items]);

  // Calculate visible range
  const { startIndex, endIndex } = useMemo(() => {
    if (!shouldVirtualize || containerHeight === 0) {
      return { startIndex: 0, endIndex: items.length - 1 };
    }

    // Find start index using binary search
    let start = findStartIndex(positions, scrollTop);

    // Find end index by iterating until we exceed viewport
    let end = start;
    let accumulated = positions[start] ?? 0;

    for (let i = start; i < items.length; i++) {
      if (accumulated > scrollTop + containerHeight) {
        end = i;
        break;
      }
      accumulated += heights[i];
      end = i;
    }

    // Apply overscan
    return {
      startIndex: Math.max(0, start - overscan),
      endIndex: Math.min(items.length - 1, end + overscan),
    };
  }, [scrollTop, containerHeight, items.length, positions, heights, overscan, shouldVirtualize]);

  // Create virtual items array
  const virtualItems = useMemo((): VirtualItem<T>[] => {
    if (items.length === 0) {
      return [];
    }

    const result: VirtualItem<T>[] = [];

    const renderStart = shouldVirtualize ? startIndex : 0;
    const renderEnd = shouldVirtualize ? endIndex : items.length - 1;

    for (let i = renderStart; i <= renderEnd && i < items.length; i++) {
      const top = positions[i];
      const height = heights[i];

      result.push({
        item: items[i],
        index: i,
        top,
        height,
        style: {
          position: 'absolute',
          top,
          height,
          width: '100%',
          left: 0,
        },
      });
    }

    return result;
  }, [items, positions, heights, startIndex, endIndex, shouldVirtualize]);

  // Handle scroll events
  const handleScroll = useCallback((e: Event) => {
    const target = e.target as HTMLElement;
    const newScrollTop = target.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  // Attach scroll listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [containerRef, handleScroll]);

  // Measure container height and handle resize
  useEffect(() => {
    const container = containerRef.current;
    if (!container || fixedContainerHeight !== undefined) return;

    const measureHeight = () => {
      const height = container.clientHeight;
      setMeasuredContainerHeight(height);
    };

    // Initial measurement
    measureHeight();

    // Set up ResizeObserver for container resizes
    const resizeObserver = new ResizeObserver(measureHeight);
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
    };
  }, [containerRef, fixedContainerHeight]);

  // Handle initial scroll position
  useEffect(() => {
    const container = containerRef.current;
    if (!container || initialScrollTop === 0) return;

    container.scrollTop = initialScrollTop;
  }, [containerRef, initialScrollTop]);

  // Scroll to index function
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'auto') => {
    const container = containerRef.current;
    if (!container || index < 0 || index >= items.length) return;

    const targetOffset = positions[index] ?? 0;
    container.scrollTo({ top: targetOffset, behavior });
  }, [containerRef, items.length, positions]);

  // Scroll to offset function
  const scrollToOffset = useCallback((offset: number, behavior: ScrollBehavior = 'auto') => {
    const container = containerRef.current;
    if (!container) return;

    container.scrollTo({ top: offset, behavior });
  }, [containerRef]);

  return {
    virtualItems,
    totalHeight,
    containerRef: internalContainerRef,
    scrollTop,
    startIndex,
    endIndex,
    containerHeight,
    scrollToIndex,
    scrollToOffset,
    isVirtualized: shouldVirtualize,
  };
}

// ============================================================================
// Utility Types for Consumers
// ============================================================================

/**
 * Helper type to extract item type from virtual items array
 */
export type ExtractVirtualItem<T> = T extends VirtualItem<infer U> ? U : never;

/**
 * Style object type for virtual list container
 */
export interface VirtualListContainerStyle {
  height: number;
  position: 'relative';
  overflow: 'auto';
}

/**
 * Creates the required styles for the virtual list scroll container
 */
export function getVirtualListContainerStyle(height: number): VirtualListContainerStyle {
  return {
    height,
    position: 'relative',
    overflow: 'auto',
  };
}

/**
 * Creates the required styles for the virtual list inner container (spacer)
 */
export function getVirtualListInnerStyle(totalHeight: number): React.CSSProperties {
  return {
    height: totalHeight,
    position: 'relative',
    width: '100%',
  };
}
