/**
 * Virtual List Edge Case Testing Utilities
 *
 * Provides utilities for testing edge cases in virtualized lists:
 * - Empty lists
 * - Single item lists
 * - Rapid filter changes
 * - Window resize
 * - Tab switching
 * - Orientation changes
 *
 * These utilities help verify the virtual list implementations handle
 * all edge cases gracefully without visual glitches or errors.
 */

// ============================================================================
// Types
// ============================================================================

export interface EdgeCaseTestResult {
  /** Test name/description */
  testName: string;
  /** Whether the test passed */
  passed: boolean;
  /** Detailed message about the result */
  message: string;
  /** Optional error if test failed */
  error?: Error;
  /** Timestamp */
  timestamp: number;
}

export interface EdgeCaseTestSuite {
  /** Name of the test suite */
  suiteName: string;
  /** Individual test results */
  results: EdgeCaseTestResult[];
  /** Overall pass/fail */
  allPassed: boolean;
  /** Number of tests passed */
  passedCount: number;
  /** Total number of tests */
  totalCount: number;
}

// ============================================================================
// Empty List Edge Case
// ============================================================================

/**
 * Tests that an empty list renders correctly without errors
 *
 * Expected behavior:
 * - No errors thrown
 * - Empty state message displayed
 * - Total height is 0 or minimal
 * - No virtual items rendered
 */
export function testEmptyList(
  virtualItems: unknown[],
  totalHeight: number,
  containerElement?: HTMLElement | null
): EdgeCaseTestResult {
  const testName = 'Empty List Handling';

  try {
    // Check that virtualItems is empty
    if (virtualItems.length !== 0) {
      return {
        testName,
        passed: false,
        message: `Expected 0 virtual items but got ${virtualItems.length}`,
        timestamp: Date.now(),
      };
    }

    // Check that totalHeight is 0 or reasonable (just padding)
    if (totalHeight < 0) {
      return {
        testName,
        passed: false,
        message: `Total height should not be negative, got ${totalHeight}`,
        timestamp: Date.now(),
      };
    }

    // If container provided, check it doesn't have scroll issues
    if (containerElement) {
      const scrollHeight = containerElement.scrollHeight;
      const clientHeight = containerElement.clientHeight;

      // Empty list shouldn't have significant scrollable content
      if (scrollHeight > clientHeight + 100) {
        return {
          testName,
          passed: false,
          message: `Empty list has unexpected scroll height: ${scrollHeight} vs ${clientHeight}`,
          timestamp: Date.now(),
        };
      }
    }

    return {
      testName,
      passed: true,
      message: 'Empty list handled correctly with 0 items and valid height',
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      message: `Error testing empty list: ${(error as Error).message}`,
      error: error as Error,
      timestamp: Date.now(),
    };
  }
}

// ============================================================================
// Single Item Edge Case
// ============================================================================

/**
 * Tests that a single item list renders correctly
 *
 * Expected behavior:
 * - Exactly 1 virtual item
 * - Item is positioned at top (0)
 * - Total height matches item height
 * - No virtualization gaps
 */
export function testSingleItem(
  virtualItems: Array<{ index: number; top: number; height: number }>,
  totalHeight: number,
  expectedItemHeight: number
): EdgeCaseTestResult {
  const testName = 'Single Item Handling';

  try {
    // Check that we have exactly 1 item
    if (virtualItems.length !== 1) {
      return {
        testName,
        passed: false,
        message: `Expected 1 virtual item but got ${virtualItems.length}`,
        timestamp: Date.now(),
      };
    }

    const item = virtualItems[0];

    // Check item is at index 0
    if (item.index !== 0) {
      return {
        testName,
        passed: false,
        message: `Single item should have index 0, got ${item.index}`,
        timestamp: Date.now(),
      };
    }

    // Check item is positioned at top
    if (item.top !== 0) {
      return {
        testName,
        passed: false,
        message: `Single item should be at top position 0, got ${item.top}`,
        timestamp: Date.now(),
      };
    }

    // Check total height approximately matches item height
    const heightDifference = Math.abs(totalHeight - expectedItemHeight);
    if (heightDifference > 20) {
      return {
        testName,
        passed: false,
        message: `Total height ${totalHeight} doesn't match expected item height ${expectedItemHeight}`,
        timestamp: Date.now(),
      };
    }

    return {
      testName,
      passed: true,
      message: 'Single item rendered correctly at position 0',
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      message: `Error testing single item: ${(error as Error).message}`,
      error: error as Error,
      timestamp: Date.now(),
    };
  }
}

// ============================================================================
// Rapid Filter Changes Edge Case
// ============================================================================

/**
 * Simulates rapid filter changes and verifies list stability
 *
 * @param filterCallbacks Array of filter functions to call rapidly
 * @param delayBetweenFilters Milliseconds between filter changes
 * @param getVirtualItems Function to get current virtual items
 */
export async function testRapidFilterChanges(
  filterCallbacks: Array<() => void>,
  delayBetweenFilters: number = 50,
  getVirtualItems: () => unknown[]
): Promise<EdgeCaseTestResult> {
  const testName = 'Rapid Filter Changes';

  try {
    const errors: string[] = [];

    for (let i = 0; i < filterCallbacks.length; i++) {
      // Apply filter
      filterCallbacks[i]();

      // Wait a short time
      await new Promise((resolve) => setTimeout(resolve, delayBetweenFilters));

      // Check for errors after each change
      try {
        const items = getVirtualItems();
        if (!Array.isArray(items)) {
          errors.push(`After filter ${i + 1}: virtualItems is not an array`);
        }
      } catch (e) {
        errors.push(`After filter ${i + 1}: ${(e as Error).message}`);
      }
    }

    if (errors.length > 0) {
      return {
        testName,
        passed: false,
        message: `Errors during rapid filter changes: ${errors.join('; ')}`,
        timestamp: Date.now(),
      };
    }

    return {
      testName,
      passed: true,
      message: `Successfully handled ${filterCallbacks.length} rapid filter changes`,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      message: `Error during rapid filter test: ${(error as Error).message}`,
      error: error as Error,
      timestamp: Date.now(),
    };
  }
}

// ============================================================================
// Window Resize Edge Case
// ============================================================================

/**
 * Tests that list handles window resize correctly
 *
 * Expected behavior:
 * - Container height updates
 * - Visible item count adjusts
 * - No layout thrashing
 * - Scroll position preserved or reset appropriately
 */
export async function testWindowResize(
  containerElement: HTMLElement,
  getVirtualItems: () => Array<{ index: number }>,
  newWidth: number,
  newHeight: number
): Promise<EdgeCaseTestResult> {
  const testName = 'Window Resize Handling';

  try {
    const initialItems = getVirtualItems();
    const initialCount = initialItems.length;

    // Simulate resize by dispatching resize event
    // Note: In a real browser, this would trigger ResizeObserver
    window.dispatchEvent(new Event('resize'));

    // Wait for resize handling
    await new Promise((resolve) => setTimeout(resolve, 100));

    const afterItems = getVirtualItems();

    // Check that items array is still valid
    if (!Array.isArray(afterItems)) {
      return {
        testName,
        passed: false,
        message: 'Virtual items became invalid after resize',
        timestamp: Date.now(),
      };
    }

    // Check container dimensions updated (if we could set them)
    const containerHeight = containerElement.clientHeight;
    if (containerHeight <= 0) {
      return {
        testName,
        passed: false,
        message: `Container height is invalid after resize: ${containerHeight}`,
        timestamp: Date.now(),
      };
    }

    return {
      testName,
      passed: true,
      message: `Resize handled correctly. Items: ${initialCount} -> ${afterItems.length}`,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      message: `Error during resize test: ${(error as Error).message}`,
      error: error as Error,
      timestamp: Date.now(),
    };
  }
}

// ============================================================================
// Tab Switching Edge Case
// ============================================================================

/**
 * Tests that scroll position is handled correctly on tab/view switches
 *
 * Expected behavior:
 * - Scroll position resets to top on view change
 * - Or scroll position is restored if returning to same view
 * - No visual glitches during switch
 */
export async function testTabSwitching(
  containerElement: HTMLElement,
  switchTab: () => void,
  expectScrollReset: boolean = true
): Promise<EdgeCaseTestResult> {
  const testName = 'Tab Switching Handling';

  try {
    // Set initial scroll position
    const initialScroll = 200;
    containerElement.scrollTop = initialScroll;

    // Wait for scroll to settle
    await new Promise((resolve) => setTimeout(resolve, 50));

    // Switch tab
    switchTab();

    // Wait for switch to complete
    await new Promise((resolve) => setTimeout(resolve, 100));

    const afterScroll = containerElement.scrollTop;

    if (expectScrollReset) {
      // Should reset to top (within some tolerance)
      if (afterScroll > 50) {
        return {
          testName,
          passed: false,
          message: `Expected scroll reset to ~0, but got ${afterScroll}`,
          timestamp: Date.now(),
        };
      }
    } else {
      // Should preserve scroll position (within some tolerance)
      if (Math.abs(afterScroll - initialScroll) > 50) {
        return {
          testName,
          passed: false,
          message: `Expected scroll preserved at ~${initialScroll}, but got ${afterScroll}`,
          timestamp: Date.now(),
        };
      }
    }

    return {
      testName,
      passed: true,
      message: expectScrollReset
        ? 'Scroll correctly reset on tab switch'
        : 'Scroll correctly preserved on tab switch',
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      message: `Error during tab switch test: ${(error as Error).message}`,
      error: error as Error,
      timestamp: Date.now(),
    };
  }
}

// ============================================================================
// Orientation Change Edge Case
// ============================================================================

/**
 * Tests that list handles orientation changes on mobile devices
 *
 * Expected behavior:
 * - Container dimensions update
 * - Virtual list recalculates visible items
 * - Scroll position handled appropriately
 * - No jank during transition
 */
export async function testOrientationChange(
  containerElement: HTMLElement,
  getVirtualItems: () => unknown[]
): Promise<EdgeCaseTestResult> {
  const testName = 'Orientation Change Handling';

  try {
    const initialItems = getVirtualItems();

    // Simulate orientation change by dispatching event
    // Note: This triggers handlers but doesn't actually change orientation
    window.dispatchEvent(new Event('orientationchange'));

    // Also dispatch resize as orientation changes trigger resize
    window.dispatchEvent(new Event('resize'));

    // Wait for handlers to process
    await new Promise((resolve) => setTimeout(resolve, 150));

    const afterItems = getVirtualItems();

    // Verify list is still functional
    if (!Array.isArray(afterItems)) {
      return {
        testName,
        passed: false,
        message: 'Virtual items became invalid after orientation change',
        timestamp: Date.now(),
      };
    }

    // Verify container is still valid
    if (containerElement.clientHeight <= 0 || containerElement.clientWidth <= 0) {
      return {
        testName,
        passed: false,
        message: `Invalid container dimensions after orientation change: ${containerElement.clientWidth}x${containerElement.clientHeight}`,
        timestamp: Date.now(),
      };
    }

    return {
      testName,
      passed: true,
      message: `Orientation change handled. Items: ${initialItems.length} -> ${afterItems.length}`,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      message: `Error during orientation change test: ${(error as Error).message}`,
      error: error as Error,
      timestamp: Date.now(),
    };
  }
}

// ============================================================================
// Items at Boundary Edge Case
// ============================================================================

/**
 * Tests items at scroll boundaries (first, last items)
 *
 * Expected behavior:
 * - First item visible when scrolled to top
 * - Last item visible when scrolled to bottom
 * - No gaps or overlaps at boundaries
 */
export function testBoundaryItems(
  virtualItems: Array<{ index: number; top: number; height: number }>,
  totalItems: number,
  scrollTop: number,
  containerHeight: number
): EdgeCaseTestResult {
  const testName = 'Boundary Items Handling';

  try {
    if (virtualItems.length === 0) {
      return {
        testName,
        passed: true,
        message: 'No items to test boundaries (empty list)',
        timestamp: Date.now(),
      };
    }

    // When at top (scrollTop ~ 0), first item should be visible
    if (scrollTop < 50) {
      const hasFirstItem = virtualItems.some((item) => item.index === 0);
      if (!hasFirstItem && totalItems > 0) {
        return {
          testName,
          passed: false,
          message: 'First item not visible when scrolled to top',
          timestamp: Date.now(),
        };
      }
    }

    // Check that visible items form a continuous range
    const indices = virtualItems.map((v) => v.index).sort((a, b) => a - b);
    for (let i = 1; i < indices.length; i++) {
      if (indices[i] !== indices[i - 1] + 1) {
        return {
          testName,
          passed: false,
          message: `Gap in visible items at indices ${indices[i - 1]} to ${indices[i]}`,
          timestamp: Date.now(),
        };
      }
    }

    return {
      testName,
      passed: true,
      message: `Boundary items rendered correctly. Visible range: ${indices[0]}-${indices[indices.length - 1]}`,
      timestamp: Date.now(),
    };
  } catch (error) {
    return {
      testName,
      passed: false,
      message: `Error testing boundary items: ${(error as Error).message}`,
      error: error as Error,
      timestamp: Date.now(),
    };
  }
}

// ============================================================================
// Test Suite Runner
// ============================================================================

/**
 * Runs a complete edge case test suite
 */
export function createEdgeCaseTestSuite(
  suiteName: string,
  results: EdgeCaseTestResult[]
): EdgeCaseTestSuite {
  const passedCount = results.filter((r) => r.passed).length;

  return {
    suiteName,
    results,
    allPassed: passedCount === results.length,
    passedCount,
    totalCount: results.length,
  };
}

/**
 * Format test suite results for console output
 */
export function formatEdgeCaseTestSuite(suite: EdgeCaseTestSuite): string {
  const status = suite.allPassed ? '✅ ALL PASSED' : '❌ SOME FAILED';

  const resultsStr = suite.results
    .map((r) => `  ${r.passed ? '✅' : '❌'} ${r.testName}: ${r.message}`)
    .join('\n');

  return `
🧪 EDGE CASE TEST SUITE: ${suite.suiteName}
=========================================
Status: ${status}
Passed: ${suite.passedCount}/${suite.totalCount}

Results:
${resultsStr}

Timestamp: ${new Date().toISOString()}
=========================================
  `.trim();
}

/**
 * Log test suite results to console
 */
export function logEdgeCaseTestSuite(suite: EdgeCaseTestSuite): void {
  console.log(formatEdgeCaseTestSuite(suite));
}

// ============================================================================
// Quick Verification Helpers
// ============================================================================

/**
 * Quick verification that virtual list handles basic edge cases
 * Returns true if all basic checks pass
 */
export function quickVerifyVirtualList(config: {
  virtualItems: Array<{ index: number; top: number; height: number }>;
  totalHeight: number;
  totalItems: number;
  scrollTop: number;
  containerHeight: number;
}): { passed: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check 1: Empty list handling
  if (config.totalItems === 0) {
    if (config.virtualItems.length !== 0) {
      issues.push('Non-empty virtualItems for empty list');
    }
    if (config.totalHeight < 0) {
      issues.push('Negative totalHeight for empty list');
    }
  }

  // Check 2: Virtual items validity
  for (const item of config.virtualItems) {
    if (item.index < 0 || item.index >= config.totalItems) {
      issues.push(`Invalid item index: ${item.index}`);
    }
    if (item.top < 0) {
      issues.push(`Negative item top position: ${item.top}`);
    }
    if (item.height <= 0) {
      issues.push(`Invalid item height: ${item.height}`);
    }
  }

  // Check 3: Continuous indices
  if (config.virtualItems.length > 1) {
    const indices = config.virtualItems.map((v) => v.index).sort((a, b) => a - b);
    for (let i = 1; i < indices.length; i++) {
      if (indices[i] !== indices[i - 1] + 1) {
        issues.push(`Gap in visible items between ${indices[i - 1]} and ${indices[i]}`);
      }
    }
  }

  // Check 4: First item visible when at top
  if (config.scrollTop < 50 && config.totalItems > 0) {
    const hasFirstItem = config.virtualItems.some((item) => item.index === 0);
    if (!hasFirstItem) {
      issues.push('First item not visible when scrolled to top');
    }
  }

  return {
    passed: issues.length === 0,
    issues,
  };
}
