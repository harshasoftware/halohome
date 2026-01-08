/**
 * Progressive Loading Patterns
 *
 * Implements progressive hydration, selective loading,
 * and priority-based rendering for optimal performance.
 */

import React, {
  ReactNode,
  useState,
  useEffect,
  useCallback,
  useRef,
  Suspense,
  lazy,
  ComponentType,
  memo,
} from 'react';

// ============================================================================
// Types
// ============================================================================

export type LoadingPriority = 'critical' | 'high' | 'medium' | 'low' | 'idle';

interface ProgressiveLoaderProps {
  children: ReactNode;
  priority?: LoadingPriority;
  fallback?: ReactNode;
  delay?: number;
  onLoad?: () => void;
}

interface SelectiveHydrationProps {
  children: ReactNode;
  when?: 'visible' | 'idle' | 'interaction' | 'immediate';
  fallback?: ReactNode;
  rootMargin?: string;
  threshold?: number;
}

interface DeferredRenderProps {
  children: ReactNode;
  defer?: number;
  renderOnIdle?: boolean;
  fallback?: ReactNode;
}

// ============================================================================
// Priority Queue for component loading
// ============================================================================

type QueueItem = {
  priority: LoadingPriority;
  callback: () => void;
  id: string;
};

const priorityValues: Record<LoadingPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
  idle: 4,
};

class ComponentQueue {
  private queue: QueueItem[] = [];
  private isProcessing = false;
  private frameId: number | null = null;

  add(item: QueueItem) {
    this.queue.push(item);
    this.queue.sort((a, b) => priorityValues[a.priority] - priorityValues[b.priority]);
    this.process();
  }

  remove(id: string) {
    this.queue = this.queue.filter((item) => item.id !== id);
  }

  private process() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    const processNext = () => {
      const item = this.queue.shift();
      if (!item) {
        this.isProcessing = false;
        return;
      }

      if (item.priority === 'idle') {
        if ('requestIdleCallback' in window) {
          requestIdleCallback(() => {
            item.callback();
            this.frameId = requestAnimationFrame(processNext);
          });
        } else {
          setTimeout(() => {
            item.callback();
            this.frameId = requestAnimationFrame(processNext);
          }, 50);
        }
      } else if (item.priority === 'critical') {
        item.callback();
        processNext();
      } else {
        this.frameId = requestAnimationFrame(() => {
          item.callback();
          processNext();
        });
      }
    };

    processNext();
  }

  clear() {
    this.queue = [];
    if (this.frameId) {
      cancelAnimationFrame(this.frameId);
    }
    this.isProcessing = false;
  }
}

export const PriorityQueue = new ComponentQueue();

// ============================================================================
// ProgressiveLoader - Loads components based on priority
// ============================================================================

export const ProgressiveLoader = memo(function ProgressiveLoader({
  children,
  priority = 'medium',
  fallback = null,
  delay = 0,
  onLoad,
}: ProgressiveLoaderProps) {
  const [shouldRender, setShouldRender] = useState(priority === 'critical');
  const idRef = useRef(`progressive-${Date.now()}-${Math.random()}`);

  useEffect(() => {
    if (priority === 'critical') {
      onLoad?.();
      return;
    }

    const timeoutId = delay > 0 ? setTimeout(() => {
      PriorityQueue.add({
        priority,
        callback: () => {
          setShouldRender(true);
          onLoad?.();
        },
        id: idRef.current,
      });
    }, delay) : null;

    if (!timeoutId) {
      PriorityQueue.add({
        priority,
        callback: () => {
          setShouldRender(true);
          onLoad?.();
        },
        id: idRef.current,
      });
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      PriorityQueue.remove(idRef.current);
    };
  }, [priority, delay, onLoad]);

  if (!shouldRender) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
});

// ============================================================================
// SelectiveHydration - Hydrates components selectively
// ============================================================================

export const SelectiveHydration = memo(function SelectiveHydration({
  children,
  when = 'visible',
  fallback = null,
  rootMargin = '50px',
  threshold = 0,
}: SelectiveHydrationProps) {
  const [isHydrated, setIsHydrated] = useState(when === 'immediate');
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (when === 'immediate' || isHydrated) return;

    const hydrate = () => {
      setIsHydrated(true);
      observerRef.current?.disconnect();
    };

    switch (when) {
      case 'visible':
        observerRef.current = new IntersectionObserver(
          ([entry]) => {
            if (entry.isIntersecting) {
              hydrate();
            }
          },
          { rootMargin, threshold }
        );
        if (containerRef.current) {
          observerRef.current.observe(containerRef.current);
        }
        break;

      case 'idle':
        if ('requestIdleCallback' in window) {
          const id = requestIdleCallback(hydrate);
          return () => cancelIdleCallback(id);
        } else {
          const id = setTimeout(hydrate, 200);
          return () => clearTimeout(id);
        }

      case 'interaction':
        const handlers = ['click', 'touchstart', 'mouseover', 'focus'];
        const onInteraction = () => {
          hydrate();
          handlers.forEach((event) => {
            containerRef.current?.removeEventListener(event, onInteraction);
          });
        };
        handlers.forEach((event) => {
          containerRef.current?.addEventListener(event, onInteraction, { once: true, passive: true });
        });
        return () => {
          handlers.forEach((event) => {
            containerRef.current?.removeEventListener(event, onInteraction);
          });
        };
    }

    return () => {
      observerRef.current?.disconnect();
    };
  }, [when, rootMargin, threshold, isHydrated]);

  if (!isHydrated) {
    return (
      <div ref={containerRef} style={{ minHeight: '1px' }}>
        {fallback}
      </div>
    );
  }

  return <>{children}</>;
});

// ============================================================================
// DeferredRender - Defers rendering to next frame or idle time
// ============================================================================

export const DeferredRender = memo(function DeferredRender({
  children,
  defer = 0,
  renderOnIdle = false,
  fallback = null,
}: DeferredRenderProps) {
  const [shouldRender, setShouldRender] = useState(defer === 0 && !renderOnIdle);

  useEffect(() => {
    if (shouldRender) return;

    if (renderOnIdle) {
      if ('requestIdleCallback' in window) {
        const id = requestIdleCallback(() => setShouldRender(true));
        return () => cancelIdleCallback(id);
      } else {
        const id = setTimeout(() => setShouldRender(true), 50);
        return () => clearTimeout(id);
      }
    }

    if (defer > 0) {
      const id = setTimeout(() => setShouldRender(true), defer);
      return () => clearTimeout(id);
    }

    requestAnimationFrame(() => setShouldRender(true));
  }, [defer, renderOnIdle, shouldRender]);

  if (!shouldRender) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
});

// ============================================================================
// ChunkedRender - Renders items in chunks to avoid blocking
// ============================================================================

interface ChunkedRenderProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => ReactNode;
  chunkSize?: number;
  delay?: number;
  fallback?: ReactNode;
}

export function ChunkedRender<T>({
  items,
  renderItem,
  chunkSize = 10,
  delay = 0,
  fallback = null,
}: ChunkedRenderProps<T>) {
  const [renderedCount, setRenderedCount] = useState(chunkSize);

  useEffect(() => {
    if (renderedCount >= items.length) return;

    const scheduleNextChunk = () => {
      setRenderedCount((prev) => Math.min(prev + chunkSize, items.length));
    };

    if (delay > 0) {
      const id = setTimeout(scheduleNextChunk, delay);
      return () => clearTimeout(id);
    }

    const id = requestAnimationFrame(scheduleNextChunk);
    return () => cancelAnimationFrame(id);
  }, [renderedCount, items.length, chunkSize, delay]);

  const visibleItems = items.slice(0, renderedCount);

  return (
    <>
      {visibleItems.map((item, index) => renderItem(item, index))}
      {renderedCount < items.length && fallback}
    </>
  );
}

// ============================================================================
// LazyComponent - Creates lazy-loadable component with preload support
// ============================================================================

interface LazyComponentOptions {
  fallback?: ReactNode;
  preload?: boolean;
  retries?: number;
  retryDelay?: number;
}

export function createLazyComponent<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: LazyComponentOptions = {}
) {
  const { fallback = null, preload = false, retries = 3, retryDelay = 1000 } = options;

  let preloadPromise: Promise<{ default: ComponentType<P> }> | null = null;

  const loadWithRetry = async (
    attempt = 1
  ): Promise<{ default: ComponentType<P> }> => {
    try {
      return await importFn();
    } catch (error) {
      if (attempt >= retries) throw error;
      await new Promise((r) => setTimeout(r, retryDelay * attempt));
      return loadWithRetry(attempt + 1);
    }
  };

  const LazyComponent = lazy(() => preloadPromise || loadWithRetry());

  const Component = (props: P) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );

  Component.preload = () => {
    if (!preloadPromise) {
      preloadPromise = loadWithRetry();
    }
    return preloadPromise;
  };

  // Auto-preload on idle
  if (preload && typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => Component.preload());
    } else {
      setTimeout(() => Component.preload(), 200);
    }
  }

  return Component;
}

// ============================================================================
// VirtualizedList - Renders only visible items
// ============================================================================

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  className = '',
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalHeight = items.length * itemHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(
    items.length,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  );

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const visibleItems = items.slice(startIndex, endIndex);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map((item, index) => (
          <div
            key={startIndex + index}
            style={{
              position: 'absolute',
              top: (startIndex + index) * itemHeight,
              height: itemHeight,
              width: '100%',
            }}
          >
            {renderItem(item, startIndex + index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================================
// SkeletonLoader - Provides skeleton loading states
// ============================================================================

interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
  className?: string;
  animate?: boolean;
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  borderRadius = '0.25rem',
  className = '',
  animate = true,
}: SkeletonProps) {
  return (
    <div
      className={`bg-white/10 ${animate ? 'animate-pulse' : ''} ${className}`}
      style={{
        width,
        height,
        borderRadius,
      }}
    />
  );
}

interface SkeletonGroupProps {
  count?: number;
  gap?: string | number;
  direction?: 'row' | 'column';
  children?: ReactNode;
}

export function SkeletonGroup({
  count = 3,
  gap = '0.5rem',
  direction = 'column',
  children,
}: SkeletonGroupProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: direction,
        gap,
      }}
    >
      {children ??
        Array.from({ length: count }).map((_, i) => <Skeleton key={i} />)}
    </div>
  );
}
