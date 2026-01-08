/**
 * usePerformanceMetrics Hook
 *
 * Development utility for measuring virtualization performance.
 * Tracks render count, DOM node count, frame rate, and memory usage.
 *
 * Usage:
 * 1. Import the hook in your component
 * 2. Call startMeasurement() before rendering the list
 * 3. Call endMeasurement() after rendering completes
 * 4. Access metrics via the returned object
 *
 * @example
 * const { metrics, startMeasurement, endMeasurement, logMetrics } = usePerformanceMetrics('ScoutPanel');
 *
 * useEffect(() => {
 *   startMeasurement();
 *   // ... rendering happens
 *   endMeasurement();
 *   logMetrics();
 * }, [items]);
 */

import { useRef, useCallback, useState } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface PerformanceMetrics {
  /** Component name being measured */
  componentName: string;
  /** Number of times the component has rendered */
  renderCount: number;
  /** Last render time in milliseconds */
  lastRenderTime: number;
  /** Average render time across all renders */
  averageRenderTime: number;
  /** Number of DOM nodes in the container */
  domNodeCount: number;
  /** Estimated memory usage in MB (if available) */
  memoryUsageMB: number | null;
  /** Current frame rate (if measured) */
  frameRate: number | null;
  /** Timestamp of last measurement */
  timestamp: number;
}

export interface UsePerformanceMetricsResult {
  /** Current metrics */
  metrics: PerformanceMetrics;
  /** Start measuring render time */
  startMeasurement: () => void;
  /** End measurement and record metrics */
  endMeasurement: (containerRef?: React.RefObject<HTMLElement | null>) => void;
  /** Measure frame rate over a duration */
  measureFrameRate: (durationMs?: number) => Promise<number>;
  /** Count DOM nodes in a container */
  countDOMNodes: (containerRef: React.RefObject<HTMLElement | null>) => number;
  /** Log metrics to console in formatted table */
  logMetrics: () => void;
  /** Reset all metrics */
  resetMetrics: () => void;
  /** Get a comparison report between before/after states */
  getComparisonReport: (beforeMetrics: PerformanceMetrics) => string;
}

// ============================================================================
// Memory Measurement (if available)
// ============================================================================

interface PerformanceMemory {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
}

interface PerformanceWithMemory extends Performance {
  memory?: PerformanceMemory;
}

function getMemoryUsageMB(): number | null {
  const perf = performance as PerformanceWithMemory;
  if (perf.memory) {
    return Math.round(perf.memory.usedJSHeapSize / (1024 * 1024) * 100) / 100;
  }
  return null;
}

// ============================================================================
// Frame Rate Measurement
// ============================================================================

function measureFrameRateAsync(durationMs: number = 1000): Promise<number> {
  return new Promise((resolve) => {
    let frameCount = 0;
    let startTime = performance.now();
    let rafId: number;

    const countFrame = () => {
      frameCount++;
      const elapsed = performance.now() - startTime;

      if (elapsed < durationMs) {
        rafId = requestAnimationFrame(countFrame);
      } else {
        const fps = Math.round((frameCount / elapsed) * 1000);
        resolve(fps);
      }
    };

    rafId = requestAnimationFrame(countFrame);

    // Cleanup timeout
    setTimeout(() => {
      if (rafId) {
        cancelAnimationFrame(rafId);
      }
    }, durationMs + 100);
  });
}

// ============================================================================
// DOM Node Counting
// ============================================================================

function countDOMNodesInElement(element: HTMLElement | null): number {
  if (!element) return 0;

  let count = 0;
  const walker = document.createTreeWalker(
    element,
    NodeFilter.SHOW_ELEMENT,
    null
  );

  while (walker.nextNode()) {
    count++;
  }

  return count + 1; // Include the root element
}

// ============================================================================
// Hook Implementation
// ============================================================================

export function usePerformanceMetrics(
  componentName: string
): UsePerformanceMetricsResult {
  const renderStartTime = useRef<number>(0);
  const renderTimes = useRef<number[]>([]);

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    componentName,
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    domNodeCount: 0,
    memoryUsageMB: null,
    frameRate: null,
    timestamp: Date.now(),
  });

  const startMeasurement = useCallback(() => {
    renderStartTime.current = performance.now();
  }, []);

  const endMeasurement = useCallback(
    (containerRef?: React.RefObject<HTMLElement | null>) => {
      const endTime = performance.now();
      const renderTime = endTime - renderStartTime.current;

      renderTimes.current.push(renderTime);

      const avgTime =
        renderTimes.current.reduce((a, b) => a + b, 0) /
        renderTimes.current.length;

      const domCount = containerRef
        ? countDOMNodesInElement(containerRef.current)
        : 0;

      setMetrics({
        componentName,
        renderCount: renderTimes.current.length,
        lastRenderTime: Math.round(renderTime * 100) / 100,
        averageRenderTime: Math.round(avgTime * 100) / 100,
        domNodeCount: domCount,
        memoryUsageMB: getMemoryUsageMB(),
        frameRate: null,
        timestamp: Date.now(),
      });
    },
    [componentName]
  );

  const measureFrameRate = useCallback(
    async (durationMs: number = 1000): Promise<number> => {
      const fps = await measureFrameRateAsync(durationMs);

      setMetrics((prev) => ({
        ...prev,
        frameRate: fps,
        timestamp: Date.now(),
      }));

      return fps;
    },
    []
  );

  const countDOMNodes = useCallback(
    (containerRef: React.RefObject<HTMLElement | null>): number => {
      const count = countDOMNodesInElement(containerRef.current);

      setMetrics((prev) => ({
        ...prev,
        domNodeCount: count,
        timestamp: Date.now(),
      }));

      return count;
    },
    []
  );

  const logMetrics = useCallback(() => {
    console.group(`📊 Performance Metrics: ${componentName}`);
    console.table({
      'Render Count': metrics.renderCount,
      'Last Render Time (ms)': metrics.lastRenderTime,
      'Average Render Time (ms)': metrics.averageRenderTime,
      'DOM Node Count': metrics.domNodeCount,
      'Memory Usage (MB)': metrics.memoryUsageMB ?? 'N/A',
      'Frame Rate (FPS)': metrics.frameRate ?? 'Not measured',
    });
    console.groupEnd();
  }, [componentName, metrics]);

  const resetMetrics = useCallback(() => {
    renderTimes.current = [];
    setMetrics({
      componentName,
      renderCount: 0,
      lastRenderTime: 0,
      averageRenderTime: 0,
      domNodeCount: 0,
      memoryUsageMB: null,
      frameRate: null,
      timestamp: Date.now(),
    });
  }, [componentName]);

  const getComparisonReport = useCallback(
    (beforeMetrics: PerformanceMetrics): string => {
      const domReduction =
        beforeMetrics.domNodeCount > 0
          ? Math.round(
              ((beforeMetrics.domNodeCount - metrics.domNodeCount) /
                beforeMetrics.domNodeCount) *
                100
            )
          : 0;

      const renderImprovement =
        beforeMetrics.lastRenderTime > 0
          ? Math.round(
              ((beforeMetrics.lastRenderTime - metrics.lastRenderTime) /
                beforeMetrics.lastRenderTime) *
                100
            )
          : 0;

      return `
📊 VIRTUALIZATION PERFORMANCE COMPARISON
========================================
Component: ${componentName}

DOM Nodes:
  Before: ${beforeMetrics.domNodeCount}
  After:  ${metrics.domNodeCount}
  Reduction: ${domReduction}%

Render Time (ms):
  Before: ${beforeMetrics.lastRenderTime}
  After:  ${metrics.lastRenderTime}
  Improvement: ${renderImprovement}%

Memory Usage (MB):
  Before: ${beforeMetrics.memoryUsageMB ?? 'N/A'}
  After:  ${metrics.memoryUsageMB ?? 'N/A'}

Frame Rate (FPS):
  Before: ${beforeMetrics.frameRate ?? 'N/A'}
  After:  ${metrics.frameRate ?? 'N/A'}
  Target: 60 FPS
========================================
      `.trim();
    },
    [componentName, metrics]
  );

  return {
    metrics,
    startMeasurement,
    endMeasurement,
    measureFrameRate,
    countDOMNodes,
    logMetrics,
    resetMetrics,
    getComparisonReport,
  };
}

// ============================================================================
// Standalone Utilities
// ============================================================================

/**
 * Measure scroll performance during a scroll operation
 * @param scrollContainer The scroll container element
 * @param scrollDistance Distance to scroll in pixels
 * @param durationMs Duration of scroll measurement
 * @returns Promise with FPS during scroll
 */
export async function measureScrollPerformance(
  scrollContainer: HTMLElement,
  scrollDistance: number = 1000,
  durationMs: number = 2000
): Promise<{ avgFps: number; minFps: number; maxFps: number; dropped: number }> {
  const frameTimings: number[] = [];
  let lastFrameTime = performance.now();
  let animationId: number;

  // Start scrolling
  const scrollStart = scrollContainer.scrollTop;
  const scrollEnd = scrollStart + scrollDistance;
  const startTime = performance.now();

  return new Promise((resolve) => {
    const measureFrame = () => {
      const now = performance.now();
      const frameDuration = now - lastFrameTime;
      frameTimings.push(frameDuration);
      lastFrameTime = now;

      // Animate scroll
      const progress = (now - startTime) / durationMs;
      if (progress < 1) {
        scrollContainer.scrollTop = scrollStart + (scrollEnd - scrollStart) * progress;
        animationId = requestAnimationFrame(measureFrame);
      } else {
        cancelAnimationFrame(animationId);

        // Calculate FPS metrics
        const fpsList = frameTimings.map((t) => 1000 / t);
        const avgFps = Math.round(fpsList.reduce((a, b) => a + b, 0) / fpsList.length);
        const minFps = Math.round(Math.min(...fpsList));
        const maxFps = Math.round(Math.max(...fpsList));
        const dropped = fpsList.filter((fps) => fps < 30).length;

        resolve({ avgFps, minFps, maxFps, dropped });
      }
    };

    animationId = requestAnimationFrame(measureFrame);
  });
}

/**
 * Create a snapshot of current performance metrics for comparison
 */
export function createPerformanceSnapshot(
  componentName: string,
  containerRef: React.RefObject<HTMLElement | null>
): PerformanceMetrics {
  return {
    componentName,
    renderCount: 0,
    lastRenderTime: 0,
    averageRenderTime: 0,
    domNodeCount: countDOMNodesInElement(containerRef.current),
    memoryUsageMB: getMemoryUsageMB(),
    frameRate: null,
    timestamp: Date.now(),
  };
}

/**
 * Console logger for performance reports
 */
export function logPerformanceReport(
  title: string,
  metrics: Record<string, unknown>
): void {
  console.group(`📊 ${title}`);
  console.table(metrics);
  console.groupEnd();
}
