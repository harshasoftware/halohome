/**
 * Higher-Order Component (HOC) Patterns
 *
 * Reusable HOCs for cross-cutting concerns like monitoring,
 * error handling, authentication, and lazy loading.
 */

import React, {
  ComponentType,
  Suspense,
  lazy,
  memo,
  useEffect,
  useState,
  ErrorInfo,
} from 'react';
import { trackError } from '@/lib/monitoring';

// Simple metric tracking (logs to console in dev, can be extended to analytics)
const trackMetric = (name: string, value: number): void => {
  if (import.meta.env.DEV) {
    console.debug(`[Metric] ${name}: ${value.toFixed(2)}ms`);
  }
  // Could be extended to send to analytics:
  // analytics.track('metric', { name, value });
};

// ============================================================================
// withMonitoring - Tracks component render performance
// ============================================================================

interface MonitoringOptions {
  name?: string;
  trackRenders?: boolean;
  trackMounts?: boolean;
  slowThreshold?: number; // ms
}

export function withMonitoring<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: MonitoringOptions = {}
) {
  const {
    name = WrappedComponent.displayName || WrappedComponent.name || 'Component',
    trackRenders = true,
    trackMounts = true,
    slowThreshold = 16, // ~60fps
  } = options;

  const MonitoredComponent = (props: P) => {
    const startTime = performance.now();

    useEffect(() => {
      if (trackMounts) {
        const mountTime = performance.now() - startTime;
        trackMetric(`${name}.mount`, mountTime);

        if (mountTime > slowThreshold) {
          console.warn(`[Performance] ${name} slow mount: ${mountTime.toFixed(2)}ms`);
        }
      }
    }, []);

    if (trackRenders) {
      const renderTime = performance.now() - startTime;
      if (renderTime > slowThreshold) {
        trackMetric(`${name}.slowRender`, renderTime);
      }
    }

    return <WrappedComponent {...props} />;
  };

  MonitoredComponent.displayName = `withMonitoring(${name})`;
  return MonitoredComponent;
}

// ============================================================================
// withErrorBoundary - Wraps component in error boundary
// ============================================================================

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

interface ErrorBoundaryOptions {
  fallback?: React.ReactNode | ((error: Error) => React.ReactNode);
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetKeys?: unknown[];
}

class ErrorBoundaryWrapper extends React.Component<
  { children: React.ReactNode } & ErrorBoundaryOptions,
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode } & ErrorBoundaryOptions) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    trackError(error, { componentStack: errorInfo.componentStack });
    this.props.onError?.(error, errorInfo);
  }

  componentDidUpdate(prevProps: ErrorBoundaryOptions) {
    if (
      this.state.hasError &&
      this.props.resetKeys &&
      prevProps.resetKeys &&
      !this.props.resetKeys.every((key, i) => key === prevProps.resetKeys?.[i])
    ) {
      this.setState({ hasError: false, error: null });
    }
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      if (typeof fallback === 'function') {
        return fallback(this.state.error!);
      }
      return fallback ?? (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400">Something went wrong</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export function withErrorBoundary<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: ErrorBoundaryOptions = {}
) {
  const name = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WithErrorBoundary = (props: P) => (
    <ErrorBoundaryWrapper {...options}>
      <WrappedComponent {...props} />
    </ErrorBoundaryWrapper>
  );

  WithErrorBoundary.displayName = `withErrorBoundary(${name})`;
  return WithErrorBoundary;
}

// ============================================================================
// withAuth - Protects component with authentication check
// ============================================================================

interface AuthOptions {
  fallback?: React.ReactNode;
  redirectTo?: string;
  requiredRole?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  user: { id: string; role?: string } | null;
  isLoading: boolean;
}

// This should be replaced with actual auth hook
const useAuth = (): AuthState => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
    isLoading: true,
  });

  useEffect(() => {
    // Check auth state - integrate with Supabase
    import('@/integrations/supabase/client').then(({ supabase }) => {
      supabase.auth.getSession().then(({ data }) => {
        setState({
          isAuthenticated: !!data.session,
          user: data.session?.user ? { id: data.session.user.id } : null,
          isLoading: false,
        });
      });
    });
  }, []);

  return state;
};

export function withAuth<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: AuthOptions = {}
) {
  const { fallback, redirectTo, requiredRole } = options;
  const name = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WithAuth = (props: P) => {
    const { isAuthenticated, user, isLoading } = useAuth();

    if (isLoading) {
      return (
        <div className="flex items-center justify-center p-4">
          <div className="animate-spin w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full" />
        </div>
      );
    }

    if (!isAuthenticated) {
      if (redirectTo && typeof window !== 'undefined') {
        window.location.href = redirectTo;
        return null;
      }
      return fallback ?? (
        <div className="p-4 text-center text-gray-400">
          Please sign in to access this content
        </div>
      );
    }

    if (requiredRole && user?.role !== requiredRole) {
      return (
        <div className="p-4 text-center text-gray-400">
          You don't have permission to access this content
        </div>
      );
    }

    return <WrappedComponent {...props} />;
  };

  WithAuth.displayName = `withAuth(${name})`;
  return WithAuth;
}

// ============================================================================
// withLazyLoad - Lazy loads component with Suspense
// ============================================================================

interface LazyLoadOptions {
  fallback?: React.ReactNode;
  delay?: number; // Artificial delay for loading state
  preload?: boolean;
}

export function withLazyLoad<P extends object>(
  importFn: () => Promise<{ default: ComponentType<P> }>,
  options: LazyLoadOptions = {}
) {
  const { fallback = null, delay = 0, preload = false } = options;

  const LazyComponent = lazy(async () => {
    const [module] = await Promise.all([
      importFn(),
      delay > 0 ? new Promise(r => setTimeout(r, delay)) : Promise.resolve(),
    ]);
    return module;
  });

  // Preload on idle
  if (preload && typeof window !== 'undefined') {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => importFn());
    } else {
      setTimeout(() => importFn(), 200);
    }
  }

  const WithLazyLoad = (props: P) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );

  WithLazyLoad.displayName = 'withLazyLoad(LazyComponent)';
  return WithLazyLoad;
}

// ============================================================================
// withMemo - Enhanced memoization with custom comparison
// ============================================================================

type CompareFunction<P> = (prevProps: P, nextProps: P) => boolean;

export function withMemo<P extends object>(
  WrappedComponent: ComponentType<P>,
  compare?: CompareFunction<P> | keyof P | (keyof P)[]
) {
  const name = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  let compareFn: CompareFunction<P> | undefined;

  if (typeof compare === 'function') {
    compareFn = compare;
  } else if (typeof compare === 'string') {
    compareFn = (prev, next) => prev[compare] === next[compare];
  } else if (Array.isArray(compare)) {
    compareFn = (prev, next) => compare.every(key => prev[key] === next[key]);
  }

  const MemoizedComponent = memo(WrappedComponent, compareFn);
  MemoizedComponent.displayName = `withMemo(${name})`;
  return MemoizedComponent;
}

// ============================================================================
// compose - Compose multiple HOCs
// ============================================================================

type HOC<P> = (Component: ComponentType<P>) => ComponentType<P>;

export function compose<P extends object>(...hocs: HOC<P>[]): HOC<P> {
  return (Component: ComponentType<P>) =>
    hocs.reduceRight((acc, hoc) => hoc(acc), Component);
}

// ============================================================================
// withFeatureFlag - Conditional rendering based on feature flags
// ============================================================================

interface FeatureFlagOptions {
  flag: string;
  fallback?: React.ReactNode;
}

const featureFlags: Record<string, boolean> = {};

export function setFeatureFlag(flag: string, enabled: boolean) {
  featureFlags[flag] = enabled;
}

export function withFeatureFlag<P extends object>(
  WrappedComponent: ComponentType<P>,
  options: FeatureFlagOptions
) {
  const { flag, fallback = null } = options;
  const name = WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const WithFeatureFlag = (props: P) => {
    if (!featureFlags[flag]) {
      return <>{fallback}</>;
    }
    return <WrappedComponent {...props} />;
  };

  WithFeatureFlag.displayName = `withFeatureFlag(${name})`;
  return WithFeatureFlag;
}
