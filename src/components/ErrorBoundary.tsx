/**
 * Error Boundary Component
 *
 * Catches JavaScript errors in child components and reports them
 * to Firebase Analytics for crash tracking.
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Track error in analytics (lazy import to avoid module loading conflicts)
    import('@/lib/analytics').then(({ trackError }) => {
      trackError(
        error.name || 'UnknownError',
        error.message || 'An unknown error occurred',
        this.props.componentName || 'ErrorBoundary'
      );
    }).catch(() => {
      // Silently fail if analytics can't be loaded
    });

    // Log to console for debugging
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  private handleRetry = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  private handleReload = (): void => {
    window.location.reload();
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      // Custom fallback UI if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="flex flex-col items-center justify-center min-h-[200px] p-6 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-800">
          <AlertTriangle className="w-12 h-12 text-red-500 mb-4" />
          <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">
            Something went wrong
          </h2>
          <p className="text-sm text-red-600 dark:text-red-500 mb-4 text-center max-w-md">
            {this.state.error?.message || 'An unexpected error occurred'}
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
              Reload Page
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
