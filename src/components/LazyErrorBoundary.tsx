/**
 * LazyErrorBoundary Component
 *
 * Specialized error boundary for lazy-loaded components that provides:
 * - User-friendly error messages (no technical jargon)
 * - Retry mechanism without full page reload
 * - Offline detection with specific messaging
 * - Retry count tracking with escalated messaging after 3 attempts
 *
 * @example
 * ```tsx
 * <LazyErrorBoundary componentName="Dashboard">
 *   <Suspense fallback={<RouteLoader />}>
 *     <LazyDashboard />
 *   </Suspense>
 * </LazyErrorBoundary>
 * ```
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { WifiOff, RefreshCw, AlertCircle } from 'lucide-react';
import { isOnline, subscribeToNetworkChanges } from '@/lib/utils/network';
import { analytics, AnalyticsEvent } from '@/lib/utils/eventConstants';

/**
 * Maximum number of retry attempts before showing escalated message.
 */
const MAX_RETRY_ATTEMPTS = 3;

/**
 * Error messages displayed to users.
 * Kept as constants for maintainability and potential future i18n.
 */
const ERROR_MESSAGES = {
  offline: 'You appear to be offline',
  offlineDescription: 'Please check your internet connection and try again.',
  loadFailed: 'Something went wrong',
  loadFailedDescription: 'We couldn\'t load this content. Please try again.',
  maxRetriesReached: 'Still having trouble?',
  maxRetriesDescription: 'Try refreshing the page or check your internet connection.',
} as const;

interface LazyErrorBoundaryProps {
  /** Child components to render (typically Suspense with lazy component) */
  children: ReactNode;
  /** Optional custom fallback UI when error occurs */
  fallback?: ReactNode;
  /** Name of the component for error logging purposes */
  componentName?: string;
  /** Optional callback when retry is triggered */
  onRetry?: () => void;
  /** Optional callback when an error is caught */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface LazyErrorBoundaryState {
  /** Whether an error has been caught */
  hasError: boolean;
  /** The caught error object */
  error: Error | null;
  /** React error info including component stack */
  errorInfo: ErrorInfo | null;
  /** Current network online status */
  isOnline: boolean;
  /** Number of retry attempts made */
  retryCount: number;
}

class LazyErrorBoundary extends Component<LazyErrorBoundaryProps, LazyErrorBoundaryState> {
  /** Cleanup function for network status subscription */
  private networkCleanup: (() => void) | null = null;

  constructor(props: LazyErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isOnline: isOnline(),
      retryCount: 0,
    };
  }

  /**
   * React lifecycle method called when an error is thrown in a descendant component.
   * Updates state to trigger error UI rendering.
   */
  static getDerivedStateFromError(error: Error): Partial<LazyErrorBoundaryState> {
    return {
      hasError: true,
      error,
      isOnline: isOnline(),
    };
  }

  /**
   * React lifecycle method called after an error has been thrown.
   * Used for error logging and reporting.
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Call optional onError callback
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Track error in PostHog with detailed properties
    analytics.capture(AnalyticsEvent.COMPONENT_LOAD_ERROR, {
      error_message: error.message || 'Failed to load component',
      component_stack: errorInfo.componentStack || '',
      is_offline: !isOnline(),
      retry_count: this.state.retryCount,
      timestamp: new Date().toISOString(),
      component_name: this.props.componentName || 'LazyComponent',
      error_name: error.name || 'LazyLoadError',
    });

    // Track error in Firebase analytics (lazy import to avoid module loading conflicts)
    import('@/lib/analytics').then(({ trackError }) => {
      trackError(
        error.name || 'LazyLoadError',
        error.message || 'Failed to load component',
        this.props.componentName || 'LazyComponent'
      );
    }).catch(() => {
      // Silently fail if analytics can't be loaded
    });
  }

  componentDidMount(): void {
    // Subscribe to network status changes
    this.networkCleanup = subscribeToNetworkChanges((online) => {
      this.setState({ isOnline: online });
    });
  }

  componentWillUnmount(): void {
    // Clean up network subscription
    if (this.networkCleanup) {
      this.networkCleanup();
      this.networkCleanup = null;
    }
  }

  /**
   * Handles retry button click.
   * Resets error state to attempt re-rendering the component.
   */
  private handleRetry = (): void => {
    this.setState((prevState) => ({
      hasError: false,
      error: null,
      errorInfo: null,
      retryCount: prevState.retryCount + 1,
      isOnline: isOnline(),
    }));

    // Call optional onRetry callback
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  /**
   * Handles page reload button click (used after max retries).
   */
  private handleReload = (): void => {
    window.location.reload();
  };

  /**
   * Renders the offline error state.
   */
  private renderOfflineError(): ReactNode {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
        <div className="w-14 h-14 mb-4 rounded-xl flex items-center justify-center bg-amber-100 dark:bg-amber-900/30">
          <WifiOff className="w-7 h-7 text-amber-600 dark:text-amber-400" />
        </div>
        <h2 className="text-lg font-semibold text-amber-700 dark:text-amber-400 mb-2">
          {ERROR_MESSAGES.offline}
        </h2>
        <p className="text-sm text-amber-600 dark:text-amber-500 mb-4 text-center max-w-md">
          {ERROR_MESSAGES.offlineDescription}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={this.handleRetry}
          className="gap-2 border-amber-300 dark:border-amber-700 hover:bg-amber-100 dark:hover:bg-amber-900/50"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    );
  }

  /**
   * Renders the max retries reached error state.
   */
  private renderMaxRetriesError(): ReactNode {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-orange-50 dark:bg-orange-950/20 rounded-lg border border-orange-200 dark:border-orange-800">
        <div className="w-14 h-14 mb-4 rounded-xl flex items-center justify-center bg-orange-100 dark:bg-orange-900/30">
          <AlertCircle className="w-7 h-7 text-orange-600 dark:text-orange-400" />
        </div>
        <h2 className="text-lg font-semibold text-orange-700 dark:text-orange-400 mb-2">
          {ERROR_MESSAGES.maxRetriesReached}
        </h2>
        <p className="text-sm text-orange-600 dark:text-orange-500 mb-4 text-center max-w-md">
          {ERROR_MESSAGES.maxRetriesDescription}
        </p>
        <div className="flex gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={this.handleRetry}
            className="gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try Again
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={this.handleReload}
          >
            Refresh Page
          </Button>
        </div>
      </div>
    );
  }

  /**
   * Renders the default error state.
   */
  private renderDefaultError(): ReactNode {
    return (
      <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
        <div className="w-14 h-14 mb-4 rounded-xl flex items-center justify-center bg-red-100 dark:bg-red-900/30">
          <AlertCircle className="w-7 h-7 text-red-600 dark:text-red-400" />
        </div>
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
          {ERROR_MESSAGES.loadFailed}
        </h2>
        <p className="text-sm text-red-600 dark:text-red-500 mb-4 text-center max-w-md">
          {ERROR_MESSAGES.loadFailedDescription}
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={this.handleRetry}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Try Again
        </Button>
      </div>
    );
  }

  public render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Show offline-specific error UI
      if (!this.state.isOnline) {
        return this.renderOfflineError();
      }

      // Show max retries error UI
      if (this.state.retryCount >= MAX_RETRY_ATTEMPTS) {
        return this.renderMaxRetriesError();
      }

      // Show default error UI
      return this.renderDefaultError();
    }

    return this.props.children;
  }
}

export default LazyErrorBoundary;
