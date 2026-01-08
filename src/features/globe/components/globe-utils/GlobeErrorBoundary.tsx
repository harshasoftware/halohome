/**
 * Globe Error Boundary - Catches WebGL/Three.js rendering errors
 */

import React, { Component, type ErrorInfo } from 'react';
import { trackGlobeRenderError } from '@/lib/webgl-diagnostics';

interface GlobeErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
}

interface GlobeErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class GlobeErrorBoundary extends Component<GlobeErrorBoundaryProps, GlobeErrorBoundaryState> {
  constructor(props: GlobeErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): GlobeErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[WebGL] Globe rendering error caught:', error.message, errorInfo);

    // Track the render error with full details
    trackGlobeRenderError(error, 'GlobeErrorBoundary');

    // Log additional debugging info
    console.error('[WebGL] Error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack?.slice(0, 500),
      componentStack: errorInfo.componentStack?.slice(0, 500),
    });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
    this.props.onRetry?.();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-full w-full bg-[#050505] rounded-xl">
          <div className="text-center p-6 max-w-xs">
            {/* Icon in glass card style */}
            <div
              className="w-14 h-14 mx-auto mb-4 rounded-xl flex items-center justify-center"
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <svg className="w-7 h-7 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
            </div>
            <p className="text-zinc-300 text-sm font-medium">Globe loading failed</p>
            <p className="text-zinc-500 text-xs mt-1 mb-4">
              {this.state.error?.message?.slice(0, 50) || 'Graphics context error'}
            </p>
            <button
              onClick={this.handleRetry}
              className="px-5 py-2 bg-white text-[#050505] text-sm font-medium rounded-full transition-all hover:scale-[1.02] active:scale-[0.98]"
            >
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default GlobeErrorBoundary;
