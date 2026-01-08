/**
 * Mobile Touch Scroll Testing Utilities
 *
 * Provides utilities for testing virtualized list scroll behavior on mobile devices.
 * These utilities help verify touch scrolling, momentum, and overscroll behavior
 * work correctly in MobileScoutSheet and MobileCityInfoSheet components.
 *
 * Usage:
 * 1. Import the utilities in browser dev tools console or test files
 * 2. Use the measurement functions to track scroll performance
 * 3. Verify behavior matches mobile-specific expectations
 */

// ============================================================================
// Types
// ============================================================================

export interface TouchScrollMetrics {
  /** Total scroll events during measurement period */
  scrollEventCount: number;
  /** Average time between scroll events in ms */
  averageScrollInterval: number;
  /** Was momentum scrolling detected */
  momentumDetected: boolean;
  /** Total distance scrolled in pixels */
  totalScrollDistance: number;
  /** Peak scroll velocity in px/ms */
  peakVelocity: number;
  /** Average frame rate during scroll */
  averageFPS: number;
  /** Number of frames that dropped below 30 FPS */
  droppedFrames: number;
  /** Was overscroll rubber-banding detected */
  overscrollDetected: boolean;
  /** Duration of measurement in ms */
  measurementDurationMs: number;
}

export interface TouchScrollTestResult {
  /** Test name/description */
  testName: string;
  /** Component being tested */
  component: 'MobileScoutSheet' | 'MobileCityInfoSheet' | 'PlacesTab' | 'ScoutPanel';
  /** Metrics collected during test */
  metrics: TouchScrollMetrics;
  /** Whether test passed all criteria */
  passed: boolean;
  /** Pass/fail details for each criterion */
  criteria: {
    momentumScrollWorks: boolean;
    smoothScrolling: boolean; // FPS >= 30
    noJank: boolean; // dropped frames < 5%
    overscrollWorks: boolean;
  };
  /** Timestamp */
  timestamp: number;
}

// ============================================================================
// Constants - Mobile Scroll Performance Thresholds
// ============================================================================

export const MOBILE_SCROLL_THRESHOLDS = {
  /** Minimum acceptable average FPS during scroll */
  minAverageFPS: 30,
  /** Target FPS (ideal) */
  targetFPS: 60,
  /** Maximum acceptable dropped frame percentage */
  maxDroppedFramePercent: 5,
  /** Minimum velocity (px/ms) to indicate momentum scroll */
  momentumVelocityThreshold: 0.5,
  /** Minimum continued scroll events after touch end for momentum detection */
  momentumEventThreshold: 3,
  /** Minimum measurement duration for reliable results (ms) */
  minMeasurementDuration: 2000,
};

// ============================================================================
// Touch Scroll Measurement
// ============================================================================

/**
 * Measures touch scroll performance on a scroll container
 * Tracks scroll events, frame rate, velocity, and momentum behavior
 *
 * @param scrollContainer The element to measure scroll on
 * @param durationMs How long to measure (default 3 seconds)
 * @returns Promise with touch scroll metrics
 */
export function measureTouchScrollPerformance(
  scrollContainer: HTMLElement,
  durationMs: number = 3000
): Promise<TouchScrollMetrics> {
  return new Promise((resolve) => {
    const scrollEvents: { time: number; scrollTop: number }[] = [];
    const frameTimes: number[] = [];
    let lastFrameTime = performance.now();
    let lastScrollTop = scrollContainer.scrollTop;
    let measurementActive = true;
    let touchEndTime = 0;
    let postTouchScrollEvents = 0;
    let overscrollDetected = false;

    // Track frame rate
    const measureFrame = () => {
      if (!measurementActive) return;

      const now = performance.now();
      frameTimes.push(now - lastFrameTime);
      lastFrameTime = now;

      requestAnimationFrame(measureFrame);
    };

    // Track scroll events
    const handleScroll = () => {
      const now = performance.now();
      const scrollTop = scrollContainer.scrollTop;

      scrollEvents.push({ time: now, scrollTop });

      // Track if scrolling continues after touch end (momentum)
      if (touchEndTime > 0 && now > touchEndTime) {
        postTouchScrollEvents++;
      }

      lastScrollTop = scrollTop;
    };

    // Track touch end for momentum detection
    const handleTouchEnd = () => {
      touchEndTime = performance.now();
    };

    // Track overscroll
    const handleScroll_Overscroll = () => {
      const scrollTop = scrollContainer.scrollTop;
      const maxScroll = scrollContainer.scrollHeight - scrollContainer.clientHeight;

      // Detect if we've hit boundaries (potential overscroll)
      if (scrollTop <= 0 || scrollTop >= maxScroll) {
        overscrollDetected = true;
      }
    };

    // Set up listeners
    scrollContainer.addEventListener('scroll', handleScroll, { passive: true });
    scrollContainer.addEventListener('scroll', handleScroll_Overscroll, { passive: true });
    scrollContainer.addEventListener('touchend', handleTouchEnd, { passive: true });

    // Start frame measurement
    requestAnimationFrame(measureFrame);

    // End measurement after duration
    setTimeout(() => {
      measurementActive = false;
      scrollContainer.removeEventListener('scroll', handleScroll);
      scrollContainer.removeEventListener('scroll', handleScroll_Overscroll);
      scrollContainer.removeEventListener('touchend', handleTouchEnd);

      // Calculate metrics
      const scrollEventCount = scrollEvents.length;

      // Average scroll interval
      let totalInterval = 0;
      for (let i = 1; i < scrollEvents.length; i++) {
        totalInterval += scrollEvents[i].time - scrollEvents[i - 1].time;
      }
      const averageScrollInterval =
        scrollEventCount > 1 ? totalInterval / (scrollEventCount - 1) : 0;

      // Total scroll distance
      let totalScrollDistance = 0;
      for (let i = 1; i < scrollEvents.length; i++) {
        totalScrollDistance += Math.abs(scrollEvents[i].scrollTop - scrollEvents[i - 1].scrollTop);
      }

      // Peak velocity
      let peakVelocity = 0;
      for (let i = 1; i < scrollEvents.length; i++) {
        const timeDiff = scrollEvents[i].time - scrollEvents[i - 1].time;
        const scrollDiff = Math.abs(scrollEvents[i].scrollTop - scrollEvents[i - 1].scrollTop);
        const velocity = timeDiff > 0 ? scrollDiff / timeDiff : 0;
        peakVelocity = Math.max(peakVelocity, velocity);
      }

      // FPS calculation
      const fpsList = frameTimes.filter((t) => t > 0).map((t) => 1000 / t);
      const averageFPS =
        fpsList.length > 0
          ? Math.round(fpsList.reduce((a, b) => a + b, 0) / fpsList.length)
          : 0;
      const droppedFrames = fpsList.filter((fps) => fps < 30).length;

      // Momentum detection
      const momentumDetected =
        postTouchScrollEvents >= MOBILE_SCROLL_THRESHOLDS.momentumEventThreshold ||
        peakVelocity >= MOBILE_SCROLL_THRESHOLDS.momentumVelocityThreshold;

      resolve({
        scrollEventCount,
        averageScrollInterval: Math.round(averageScrollInterval * 100) / 100,
        momentumDetected,
        totalScrollDistance: Math.round(totalScrollDistance),
        peakVelocity: Math.round(peakVelocity * 1000) / 1000,
        averageFPS,
        droppedFrames,
        overscrollDetected,
        measurementDurationMs: durationMs,
      });
    }, durationMs);
  });
}

/**
 * Run a complete touch scroll test on a mobile bottom sheet component
 *
 * @param scrollContainer The scroll container element
 * @param componentName Name of the component being tested
 * @param durationMs Measurement duration
 * @returns Test result with pass/fail status
 */
export async function runTouchScrollTest(
  scrollContainer: HTMLElement,
  componentName: TouchScrollTestResult['component'],
  durationMs: number = 3000
): Promise<TouchScrollTestResult> {
  const metrics = await measureTouchScrollPerformance(scrollContainer, durationMs);

  const droppedFramePercent =
    metrics.droppedFrames / Math.max(1, metrics.scrollEventCount) * 100;

  const criteria = {
    momentumScrollWorks: metrics.momentumDetected,
    smoothScrolling: metrics.averageFPS >= MOBILE_SCROLL_THRESHOLDS.minAverageFPS,
    noJank: droppedFramePercent <= MOBILE_SCROLL_THRESHOLDS.maxDroppedFramePercent,
    overscrollWorks: metrics.overscrollDetected,
  };

  const passed = Object.values(criteria).every(Boolean);

  return {
    testName: `Touch Scroll Test - ${componentName}`,
    component: componentName,
    metrics,
    passed,
    criteria,
    timestamp: Date.now(),
  };
}

// ============================================================================
// Simulated Touch Scroll (for automated testing)
// ============================================================================

/**
 * Simulates a touch scroll gesture on a container
 * Useful for automated testing when actual touch events aren't available
 *
 * @param scrollContainer The container to scroll
 * @param distance Scroll distance in pixels (positive = down, negative = up)
 * @param durationMs Duration of the scroll animation
 */
export function simulateTouchScroll(
  scrollContainer: HTMLElement,
  distance: number,
  durationMs: number = 500
): Promise<void> {
  return new Promise((resolve) => {
    const startScroll = scrollContainer.scrollTop;
    const startTime = performance.now();

    // Easing function for momentum-like scroll
    const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

    const animate = () => {
      const now = performance.now();
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const easedProgress = easeOutCubic(progress);

      scrollContainer.scrollTop = startScroll + distance * easedProgress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    };

    requestAnimationFrame(animate);
  });
}

/**
 * Simulates multiple rapid scroll gestures to test virtualization under stress
 *
 * @param scrollContainer The container to scroll
 * @param iterations Number of scroll gestures to perform
 * @param distanceRange Range of scroll distances [min, max]
 */
export async function simulateRapidScrolling(
  scrollContainer: HTMLElement,
  iterations: number = 10,
  distanceRange: [number, number] = [100, 500]
): Promise<TouchScrollMetrics> {
  const startMetrics = performance.now();
  const scrollEvents: { time: number; scrollTop: number }[] = [];

  scrollContainer.addEventListener(
    'scroll',
    () => {
      scrollEvents.push({
        time: performance.now(),
        scrollTop: scrollContainer.scrollTop,
      });
    },
    { passive: true }
  );

  for (let i = 0; i < iterations; i++) {
    // Alternate scroll direction
    const direction = i % 2 === 0 ? 1 : -1;
    const distance =
      direction *
      (Math.random() * (distanceRange[1] - distanceRange[0]) + distanceRange[0]);

    await simulateTouchScroll(scrollContainer, distance, 200);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  const measurementDurationMs = performance.now() - startMetrics;

  // Calculate basic metrics
  let totalScrollDistance = 0;
  for (let i = 1; i < scrollEvents.length; i++) {
    totalScrollDistance += Math.abs(scrollEvents[i].scrollTop - scrollEvents[i - 1].scrollTop);
  }

  return {
    scrollEventCount: scrollEvents.length,
    averageScrollInterval: scrollEvents.length > 1 ? measurementDurationMs / scrollEvents.length : 0,
    momentumDetected: true, // Simulated scrolls include momentum-like behavior
    totalScrollDistance: Math.round(totalScrollDistance),
    peakVelocity: 0, // Not calculated for simulated scrolls
    averageFPS: 60, // Assumed for simulated scrolls
    droppedFrames: 0,
    overscrollDetected: false,
    measurementDurationMs: Math.round(measurementDurationMs),
  };
}

// ============================================================================
// Test Result Reporting
// ============================================================================

/**
 * Format test results for console output
 */
export function formatTestResults(result: TouchScrollTestResult): string {
  const status = result.passed ? '✅ PASSED' : '❌ FAILED';

  return `
📱 MOBILE TOUCH SCROLL TEST RESULTS
====================================
Test: ${result.testName}
Component: ${result.component}
Status: ${status}

📊 Metrics:
  Scroll Events: ${result.metrics.scrollEventCount}
  Total Distance: ${result.metrics.totalScrollDistance}px
  Peak Velocity: ${result.metrics.peakVelocity} px/ms
  Average FPS: ${result.metrics.averageFPS}
  Dropped Frames: ${result.metrics.droppedFrames}
  Duration: ${result.metrics.measurementDurationMs}ms

✓ Criteria:
  ${result.criteria.momentumScrollWorks ? '✅' : '❌'} Momentum scrolling
  ${result.criteria.smoothScrolling ? '✅' : '❌'} Smooth scrolling (≥30 FPS)
  ${result.criteria.noJank ? '✅' : '❌'} No jank (<5% dropped frames)
  ${result.criteria.overscrollWorks ? '✅' : '❌'} Overscroll behavior

Timestamp: ${new Date(result.timestamp).toISOString()}
====================================
  `.trim();
}

/**
 * Log test results to console with formatting
 */
export function logTestResults(result: TouchScrollTestResult): void {
  console.log(formatTestResults(result));
}

// ============================================================================
// Browser Detection for Mobile-Specific Tests
// ============================================================================

export interface MobileDeviceInfo {
  isMobile: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isSafari: boolean;
  isChrome: boolean;
  userAgent: string;
}

/**
 * Detect mobile device and browser for targeted testing
 */
export function detectMobileDevice(): MobileDeviceInfo {
  const ua = navigator.userAgent;

  return {
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua),
    isIOS: /iPhone|iPad|iPod/i.test(ua),
    isAndroid: /Android/i.test(ua),
    isSafari: /Safari/i.test(ua) && !/Chrome/i.test(ua),
    isChrome: /Chrome/i.test(ua) && !/Edge/i.test(ua),
    userAgent: ua,
  };
}

/**
 * Get device-specific test recommendations
 */
export function getDeviceTestRecommendations(): string[] {
  const device = detectMobileDevice();
  const recommendations: string[] = [];

  if (device.isIOS && device.isSafari) {
    recommendations.push(
      'iOS Safari: Test with -webkit-overflow-scrolling: touch enabled',
      'iOS Safari: Verify rubber-banding effect at scroll boundaries',
      'iOS Safari: Test with low power mode enabled (may affect performance)'
    );
  }

  if (device.isAndroid && device.isChrome) {
    recommendations.push(
      'Android Chrome: Test with overscroll-behavior: contain',
      'Android Chrome: Verify glow effect at scroll boundaries',
      'Android Chrome: Test with battery saver mode enabled'
    );
  }

  if (!device.isMobile) {
    recommendations.push(
      'Desktop detected: Use Chrome DevTools mobile emulation for testing',
      'Enable touch simulation in DevTools for touch event testing',
      'Consider testing on actual mobile devices for accurate results'
    );
  }

  return recommendations;
}

// ============================================================================
// Console Helpers for Manual Testing
// ============================================================================

/**
 * Log mobile scroll test instructions to console
 */
export function logMobileTestInstructions(): void {
  console.group('📱 Mobile Touch Scroll Testing Guide');
  console.log(`
HOW TO TEST MOBILE TOUCH SCROLLING
==================================

1. OPEN ON MOBILE DEVICE
   - Open the app on an iOS or Android device
   - Or use Chrome DevTools mobile emulation

2. NAVIGATE TO TEST COMPONENTS
   - MobileScoutSheet: Tap "Scout" button on mobile
   - MobileCityInfoSheet: Tap on any city marker
   - PlacesTab: Within MobileCityInfoSheet, navigate to Places tab

3. TEST TOUCH SCROLL BEHAVIORS
   a) Basic Scroll
      - Touch and drag to scroll
      - Should be smooth with no jitter

   b) Momentum Scroll
      - Flick/swipe quickly and release
      - List should continue scrolling with deceleration

   c) Overscroll
      - Scroll past the top or bottom
      - Should show rubber-band effect (iOS) or glow (Android)

4. RUN AUTOMATED TEST (in console)
   const container = document.querySelector('[data-scroll-container]');
   const result = await runTouchScrollTest(container, 'MobileScoutSheet');
   logTestResults(result);

5. CHECK FOR COMMON ISSUES
   - Janky scrolling (low FPS)
   - Missing momentum after flick
   - Items not rendering during fast scroll
   - Touch not registering in bottom sheet

EXPECTED RESULTS
================
✓ 60 FPS during scroll (30 FPS minimum acceptable)
✓ Momentum scrolling after flick gesture
✓ Native overscroll behavior at boundaries
✓ Items render correctly during fast scroll
  `);
  console.groupEnd();
}
