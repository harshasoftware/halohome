/**
 * Rendering Design Patterns
 *
 * Patterns for optimizing rendering performance including
 * Islands Architecture, View Transitions, and List Virtualization.
 */

import React, {
  ReactNode,
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  Suspense,
  lazy,
  ComponentType,
  memo,
  startTransition,
} from 'react';

// ============================================================================
// Islands Architecture - Partial hydration for static sites
// ============================================================================

type HydrationStrategy = 'load' | 'idle' | 'visible' | 'interaction' | 'media';

interface IslandProps {
  children: ReactNode;
  strategy?: HydrationStrategy;
  mediaQuery?: string;
  fallback?: ReactNode;
  onHydrate?: () => void;
}

/**
 * Island component for partial hydration.
 * Hydrates interactive components on demand while keeping static content static.
 *
 * @example
 * // Hydrate on visibility (good for below-fold content)
 * <Island strategy="visible">
 *   <InteractiveChart />
 * </Island>
 *
 * // Hydrate on interaction (good for forms, modals)
 * <Island strategy="interaction">
 *   <ContactForm />
 * </Island>
 *
 * // Hydrate on media query match (responsive islands)
 * <Island strategy="media" mediaQuery="(min-width: 768px)">
 *   <DesktopNavigation />
 * </Island>
 */
export const Island = memo(function Island({
  children,
  strategy = 'idle',
  mediaQuery,
  fallback = null,
  onHydrate,
}: IslandProps) {
  const [isHydrated, setIsHydrated] = useState(strategy === 'load');
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (isHydrated) return;

    const hydrate = () => {
      setIsHydrated(true);
      onHydrate?.();
    };

    switch (strategy) {
      case 'load':
        hydrate();
        break;

      case 'idle':
        if ('requestIdleCallback' in window) {
          const id = requestIdleCallback(hydrate);
          return () => cancelIdleCallback(id);
        } else {
          const id = setTimeout(hydrate, 200);
          return () => clearTimeout(id);
        }

      case 'visible':
        observerRef.current = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              hydrate();
              observerRef.current?.disconnect();
            }
          },
          { rootMargin: '50px' }
        );
        if (containerRef.current) {
          observerRef.current.observe(containerRef.current);
        }
        return () => observerRef.current?.disconnect();

      case 'interaction':
        const events = ['click', 'touchstart', 'mouseenter', 'focus'];
        const handler = () => {
          hydrate();
          events.forEach((e) => containerRef.current?.removeEventListener(e, handler));
        };
        events.forEach((e) =>
          containerRef.current?.addEventListener(e, handler, { once: true, passive: true })
        );
        return () => {
          events.forEach((e) => containerRef.current?.removeEventListener(e, handler));
        };

      case 'media':
        if (!mediaQuery) {
          hydrate();
          return;
        }
        const mq = window.matchMedia(mediaQuery);
        const handleChange = (e: MediaQueryListEvent | MediaQueryList) => {
          if (e.matches) {
            hydrate();
            mq.removeEventListener('change', handleChange);
          }
        };
        if (mq.matches) {
          hydrate();
        } else {
          mq.addEventListener('change', handleChange);
          return () => mq.removeEventListener('change', handleChange);
        }
        break;
    }
  }, [strategy, mediaQuery, isHydrated, onHydrate]);

  if (!isHydrated) {
    return (
      <div ref={containerRef} className="island-placeholder">
        {fallback}
      </div>
    );
  }

  return <>{children}</>;
});

/**
 * Creates an island component factory with lazy loading.
 *
 * @example
 * const InteractiveMap = createIsland(
 *   () => import('./HeavyMap'),
 *   { strategy: 'visible', fallback: <MapSkeleton /> }
 * );
 *
 * // Usage
 * <InteractiveMap lat={40.7} lng={-74} />
 */
export function createIsland<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: Omit<IslandProps, 'children'> = {}
) {
  const LazyComponent = lazy(importFn);

  const IslandComponent = (props: P) => (
    <Island {...options}>
      <Suspense fallback={options.fallback || null}>
        <LazyComponent {...props} />
      </Suspense>
    </Island>
  );

  IslandComponent.displayName = 'Island';
  return IslandComponent;
}

// ============================================================================
// View Transitions API Integration
// ============================================================================

/**
 * Checks if View Transitions API is supported.
 */
export function supportsViewTransitions(): boolean {
  return typeof document !== 'undefined' && 'startViewTransition' in document;
}

/**
 * Performs a view transition with fallback.
 *
 * @example
 * await viewTransition(() => {
 *   setActiveTab(newTab);
 * });
 */
export async function viewTransition(
  updateCallback: () => void | Promise<void>,
  options: {
    fallback?: boolean;
    onStart?: () => void;
    onFinish?: () => void;
    types?: string[];
  } = {}
): Promise<void> {
  const { fallback = true, onStart, onFinish, types } = options;

  if (!supportsViewTransitions()) {
    if (fallback) {
      await updateCallback();
    }
    return;
  }

  onStart?.();

  try {
    const transition = (document as any).startViewTransition(async () => {
      await updateCallback();
    });

    if (types && types.length > 0) {
      (transition as any).types?.add?.(...types);
    }

    await transition.finished;
  } finally {
    onFinish?.();
  }
}

/**
 * Hook for managing view transitions in React.
 *
 * @example
 * const { startTransition, isTransitioning } = useViewTransition();
 *
 * const handleNavigate = (path) => {
 *   startTransition(() => {
 *     router.push(path);
 *   });
 * };
 */
export function useViewTransition() {
  const [isTransitioning, setIsTransitioning] = useState(false);

  const startViewTransition = useCallback(
    async (callback: () => void | Promise<void>) => {
      setIsTransitioning(true);

      try {
        await viewTransition(callback);
      } finally {
        setIsTransitioning(false);
      }
    },
    []
  );

  return {
    startTransition: startViewTransition,
    isTransitioning,
    isSupported: supportsViewTransitions(),
  };
}

/**
 * Component wrapper for view transition names.
 *
 * @example
 * <ViewTransitionName name="hero-image">
 *   <img src={heroImage} alt="Hero" />
 * </ViewTransitionName>
 */
export function ViewTransitionName({
  name,
  children,
  className = '',
}: {
  name: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={className}
      style={{ viewTransitionName: name } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

// ============================================================================
// List Virtualization (Advanced)
// ============================================================================

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number, style: React.CSSProperties) => ReactNode;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  scrollTo?: number;
}

/**
 * Advanced virtualized list with variable heights and scroll restoration.
 *
 * @example
 * <VirtualList
 *   items={users}
 *   itemHeight={60}
 *   containerHeight={400}
 *   overscan={5}
 *   renderItem={(user, index, style) => (
 *     <div style={style} key={user.id}>
 *       <UserCard user={user} />
 *     </div>
 *   )}
 * />
 */
export function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  overscan = 3,
  renderItem,
  className = '',
  onScroll,
  scrollTo,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const heightCache = useRef<Map<number, number>>(new Map());

  // Calculate item positions
  const { positions, totalHeight } = useMemo(() => {
    const positions: number[] = [];
    let total = 0;

    for (let i = 0; i < items.length; i++) {
      positions.push(total);
      const height =
        typeof itemHeight === 'function'
          ? heightCache.current.get(i) ?? itemHeight(i)
          : itemHeight;
      total += height;
    }

    return { positions, totalHeight: total };
  }, [items.length, itemHeight]);

  // Find visible range
  const { startIndex, endIndex } = useMemo(() => {
    const getHeight = (i: number) =>
      typeof itemHeight === 'function' ? itemHeight(i) : itemHeight;

    let start = 0;
    let accumulated = 0;

    // Find start index
    for (let i = 0; i < items.length; i++) {
      if (accumulated + getHeight(i) > scrollTop) {
        start = i;
        break;
      }
      accumulated += getHeight(i);
    }

    // Find end index
    let end = start;
    accumulated = positions[start] || 0;

    for (let i = start; i < items.length; i++) {
      if (accumulated > scrollTop + containerHeight) {
        end = i;
        break;
      }
      accumulated += getHeight(i);
      end = i;
    }

    return {
      startIndex: Math.max(0, start - overscan),
      endIndex: Math.min(items.length - 1, end + overscan),
    };
  }, [scrollTop, containerHeight, items.length, positions, itemHeight, overscan]);

  // Handle scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const newScrollTop = e.currentTarget.scrollTop;
      setScrollTop(newScrollTop);
      onScroll?.(newScrollTop);
    },
    [onScroll]
  );

  // Scroll to position
  useEffect(() => {
    if (scrollTo !== undefined && containerRef.current) {
      containerRef.current.scrollTop = scrollTo;
    }
  }, [scrollTo]);

  // Render visible items
  const visibleItems = useMemo(() => {
    const result: ReactNode[] = [];
    const getHeight = (i: number) =>
      typeof itemHeight === 'function' ? itemHeight(i) : itemHeight;

    for (let i = startIndex; i <= endIndex && i < items.length; i++) {
      const style: React.CSSProperties = {
        position: 'absolute',
        top: positions[i],
        height: getHeight(i),
        width: '100%',
      };
      result.push(renderItem(items[i], i, style));
    }

    return result;
  }, [startIndex, endIndex, items, positions, itemHeight, renderItem]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: containerHeight, overflow: 'auto', position: 'relative' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>{visibleItems}</div>
    </div>
  );
}

// ============================================================================
// Infinite Scroll with Virtualization
// ============================================================================

interface InfiniteVirtualListProps<T> extends Omit<VirtualListProps<T>, 'items'> {
  items: T[];
  hasMore: boolean;
  isLoading: boolean;
  loadMore: () => void;
  loadingIndicator?: ReactNode;
  threshold?: number;
}

/**
 * Virtualized infinite scroll list.
 *
 * @example
 * <InfiniteVirtualList
 *   items={posts}
 *   hasMore={hasNextPage}
 *   isLoading={isFetching}
 *   loadMore={fetchNextPage}
 *   itemHeight={120}
 *   containerHeight={600}
 *   renderItem={(post, i, style) => (
 *     <div style={style}><PostCard post={post} /></div>
 *   )}
 * />
 */
export function InfiniteVirtualList<T>({
  items,
  hasMore,
  isLoading,
  loadMore,
  loadingIndicator,
  threshold = 200,
  ...props
}: InfiniteVirtualListProps<T>) {
  const handleScroll = useCallback(
    (scrollTop: number) => {
      const containerHeight = props.containerHeight;
      const itemH =
        typeof props.itemHeight === 'function' ? props.itemHeight(0) : props.itemHeight;
      const totalHeight = items.length * itemH;

      const distanceFromBottom = totalHeight - scrollTop - containerHeight;

      if (distanceFromBottom < threshold && hasMore && !isLoading) {
        loadMore();
      }

      props.onScroll?.(scrollTop);
    },
    [items.length, hasMore, isLoading, loadMore, threshold, props]
  );

  const extendedItems = useMemo(() => {
    if (isLoading) {
      return [...items, null as unknown as T]; // Add loading placeholder
    }
    return items;
  }, [items, isLoading]);

  const renderItem = useCallback(
    (item: T, index: number, style: React.CSSProperties) => {
      if (item === null && isLoading) {
        return (
          <div key="loading" style={style}>
            {loadingIndicator || (
              <div className="flex items-center justify-center p-4">
                <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
              </div>
            )}
          </div>
        );
      }
      return props.renderItem(item, index, style);
    },
    [isLoading, loadingIndicator, props]
  );

  return (
    <VirtualList
      {...props}
      items={extendedItems}
      onScroll={handleScroll}
      renderItem={renderItem}
    />
  );
}

// ============================================================================
// Concurrent Mode Helpers
// ============================================================================

/**
 * Wraps state updates in React's startTransition for non-urgent updates.
 *
 * @example
 * const [filter, setFilter] = useDeferredState('');
 *
 * // Filter updates won't block typing
 * <input onChange={(e) => setFilter(e.target.value)} />
 */
export function useDeferredState<T>(
  initialValue: T
): [T, (value: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState(initialValue);

  const setDeferredValue = useCallback((newValue: T | ((prev: T) => T)) => {
    startTransition(() => {
      setValue(newValue);
    });
  }, []);

  return [value, setDeferredValue];
}

/**
 * Batches multiple state updates for better performance.
 *
 * @example
 * const batchUpdate = useBatchedUpdates();
 *
 * batchUpdate(() => {
 *   setName(newName);
 *   setEmail(newEmail);
 *   setAge(newAge);
 * });
 */
export function useBatchedUpdates() {
  return useCallback((callback: () => void) => {
    // React 18+ automatically batches, but startTransition helps with priorities
    startTransition(() => {
      callback();
    });
  }, []);
}

// ============================================================================
// Skeleton Loading Patterns
// ============================================================================

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  animate?: boolean;
  variant?: 'text' | 'rectangular' | 'circular';
}

/**
 * Skeleton loader component for content placeholders.
 *
 * @example
 * <ContentSkeleton variant="text" />
 * <ContentSkeleton variant="rectangular" width={200} height={100} />
 * <ContentSkeleton variant="circular" width={40} height={40} />
 */
export const ContentSkeleton = memo(function ContentSkeleton({
  width = '100%',
  height,
  borderRadius,
  className = '',
  animate = true,
  variant = 'rectangular',
}: SkeletonProps) {
  const variantStyles: Record<string, React.CSSProperties> = {
    text: {
      height: height || '1em',
      borderRadius: borderRadius ?? '0.25rem',
    },
    rectangular: {
      height: height || '1rem',
      borderRadius: borderRadius ?? '0.25rem',
    },
    circular: {
      width: width,
      height: height || width,
      borderRadius: '50%',
    },
  };

  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 ${animate ? 'animate-pulse' : ''} ${className}`}
      style={{
        width,
        ...variantStyles[variant],
      }}
    />
  );
});

/**
 * Creates a skeleton version of a component.
 *
 * @example
 * const UserCardSkeleton = createSkeletonComponent(() => (
 *   <div className="flex gap-4">
 *     <ContentSkeleton variant="circular" width={40} height={40} />
 *     <div className="flex-1">
 *       <ContentSkeleton variant="text" width="60%" />
 *       <ContentSkeleton variant="text" width="40%" />
 *     </div>
 *   </div>
 * ));
 */
export function createSkeletonComponent(
  render: () => ReactNode
): ComponentType<{ className?: string }> {
  return memo(function SkeletonComponent({ className = '' }) {
    return <div className={className}>{render()}</div>;
  });
}

// ============================================================================
// Content Visibility for Off-Screen Content
// ============================================================================

interface ContentVisibilityProps {
  children: ReactNode;
  estimatedHeight?: number;
  className?: string;
}

/**
 * Uses CSS content-visibility for off-screen optimization.
 *
 * @example
 * <ContentVisibility estimatedHeight={500}>
 *   <HeavyContent />
 * </ContentVisibility>
 */
export const ContentVisibility = memo(function ContentVisibility({
  children,
  estimatedHeight = 500,
  className = '',
}: ContentVisibilityProps) {
  return (
    <div
      className={className}
      style={{
        contentVisibility: 'auto',
        containIntrinsicSize: `0 ${estimatedHeight}px`,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
});
