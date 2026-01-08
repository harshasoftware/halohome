/**
 * Container/Presentational Pattern
 *
 * Separates data fetching logic (Container) from UI rendering (Presentational).
 * Containers handle state, API calls, and business logic.
 * Presentational components are pure, receiving data via props.
 */

import React, {
  ComponentType,
  useState,
  useEffect,
  useCallback,
  useMemo,
  ReactNode,
} from 'react';

// ============================================================================
// Types
// ============================================================================

export interface ContainerProps<T> {
  data: T | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export interface PresentationalProps {
  className?: string;
  children?: ReactNode;
}

interface ContainerConfig<T, P extends object> {
  name: string;
  fetchData: (props: P) => Promise<T>;
  dependencies?: (props: P) => unknown[];
  onError?: (error: Error) => void;
  staleTime?: number;
}

// ============================================================================
// createContainer - Factory for creating container components
// ============================================================================

export function createContainer<T, P extends object = {}>(
  PresentationalComponent: ComponentType<ContainerProps<T> & P>,
  config: ContainerConfig<T, P>
) {
  const { name, fetchData, dependencies, onError, staleTime = 0 } = config;

  const cache = new Map<string, { data: T; timestamp: number }>();

  const Container = (props: P) => {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [fetchCount, setFetchCount] = useState(0);

    // Generate cache key from dependencies
    const deps = dependencies?.(props) ?? [];
    const cacheKey = useMemo(() => JSON.stringify(deps), deps);

    const fetch = useCallback(async () => {
      // Check cache
      if (staleTime > 0) {
        const cached = cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < staleTime) {
          setData(cached.data);
          setIsLoading(false);
          return;
        }
      }

      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchData(props);
        setData(result);

        // Update cache
        if (staleTime > 0) {
          cache.set(cacheKey, { data: result, timestamp: Date.now() });
        }
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        onError?.(error);
      } finally {
        setIsLoading(false);
      }
    }, [cacheKey, ...deps]);

    useEffect(() => {
      fetch();
    }, [fetch, fetchCount]);

    const refetch = useCallback(() => {
      cache.delete(cacheKey);
      setFetchCount((c) => c + 1);
    }, [cacheKey]);

    return (
      <PresentationalComponent
        {...props}
        data={data}
        isLoading={isLoading}
        error={error}
        refetch={refetch}
      />
    );
  };

  Container.displayName = `${name}Container`;
  return Container;
}

// ============================================================================
// createSmartDumbPair - Creates connected container + presentational pair
// ============================================================================

interface SmartDumbConfig<T, ContainerP extends object, PresentationalP extends object> {
  name: string;
  Presentational: ComponentType<PresentationalP>;
  useData: (props: ContainerP) => {
    data: T | null;
    isLoading: boolean;
    error: Error | null;
    refetch?: () => void;
  };
  mapDataToProps: (data: T | null, isLoading: boolean, error: Error | null) => Partial<PresentationalP>;
}

export function createSmartDumbPair<
  T,
  ContainerP extends object,
  PresentationalP extends object
>(config: SmartDumbConfig<T, ContainerP, PresentationalP>) {
  const { name, Presentational, useData, mapDataToProps } = config;

  const Smart = (props: ContainerP & Omit<PresentationalP, keyof ReturnType<typeof mapDataToProps>>) => {
    const { data, isLoading, error, refetch } = useData(props);
    const mappedProps = mapDataToProps(data, isLoading, error);

    return (
      <Presentational
        {...(props as any)}
        {...mappedProps}
        refetch={refetch}
      />
    );
  };

  Smart.displayName = `Smart${name}`;

  return {
    Smart,
    Dumb: Presentational,
  };
}

// ============================================================================
// withContainer - HOC for adding container logic to presentational components
// ============================================================================

interface WithContainerOptions<T, P extends object> {
  fetchData: (props: P) => Promise<T>;
  mapDataToProps?: (data: T | null) => Partial<P>;
  loadingComponent?: ReactNode;
  errorComponent?: ReactNode | ((error: Error) => ReactNode);
}

export function withContainer<T, P extends object>(
  PresentationalComponent: ComponentType<P>,
  options: WithContainerOptions<T, P>
) {
  const {
    fetchData,
    mapDataToProps = () => ({}),
    loadingComponent,
    errorComponent,
  } = options;

  const name = PresentationalComponent.displayName || PresentationalComponent.name || 'Component';

  const WithContainer = (props: Omit<P, keyof ReturnType<typeof mapDataToProps>>) => {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
      let mounted = true;

      setIsLoading(true);
      fetchData(props as P)
        .then((result) => {
          if (mounted) {
            setData(result);
            setIsLoading(false);
          }
        })
        .catch((err) => {
          if (mounted) {
            setError(err instanceof Error ? err : new Error('Unknown error'));
            setIsLoading(false);
          }
        });

      return () => {
        mounted = false;
      };
    }, [props]);

    if (isLoading) {
      return (
        <>
          {loadingComponent ?? (
            <div className="flex items-center justify-center p-4">
              <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
            </div>
          )}
        </>
      );
    }

    if (error) {
      if (typeof errorComponent === 'function') {
        return <>{errorComponent(error)}</>;
      }
      return (
        <>
          {errorComponent ?? (
            <div className="p-4 text-red-400">
              Error: {error.message}
            </div>
          )}
        </>
      );
    }

    const mappedProps = mapDataToProps(data);
    return <PresentationalComponent {...(props as P)} {...mappedProps} />;
  };

  WithContainer.displayName = `withContainer(${name})`;
  return WithContainer;
}

// ============================================================================
// Example: List Container Pattern
// ============================================================================

interface ListContainerProps<T> {
  items: T[];
  isLoading: boolean;
  error: Error | null;
  hasMore: boolean;
  loadMore: () => void;
  refetch: () => void;
}

interface ListContainerConfig<T, P extends object> {
  fetchItems: (page: number, props: P) => Promise<{ items: T[]; hasMore: boolean }>;
  pageSize?: number;
}

export function createListContainer<T, P extends object = {}>(
  ListComponent: ComponentType<ListContainerProps<T> & P>,
  config: ListContainerConfig<T, P>
) {
  const { fetchItems, pageSize = 20 } = config;

  const ListContainer = (props: P) => {
    const [items, setItems] = useState<T[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [page, setPage] = useState(1);

    const fetch = useCallback(async (pageNum: number, append = false) => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await fetchItems(pageNum, props);
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setHasMore(result.hasMore);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Unknown error'));
      } finally {
        setIsLoading(false);
      }
    }, [props]);

    useEffect(() => {
      fetch(1);
    }, []);

    const loadMore = useCallback(() => {
      if (!isLoading && hasMore) {
        const nextPage = page + 1;
        setPage(nextPage);
        fetch(nextPage, true);
      }
    }, [isLoading, hasMore, page, fetch]);

    const refetch = useCallback(() => {
      setPage(1);
      fetch(1);
    }, [fetch]);

    return (
      <ListComponent
        {...props}
        items={items}
        isLoading={isLoading}
        error={error}
        hasMore={hasMore}
        loadMore={loadMore}
        refetch={refetch}
      />
    );
  };

  return ListContainer;
}
