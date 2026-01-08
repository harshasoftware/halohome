# Virtual List Performance Test Plan

This document outlines the manual testing procedures for verifying the virtual scrolling implementation across all virtualized lists.

## Overview

The following components have been virtualized:
1. **ScoutPanel - Overall Top Locations** (`overallVirtualItems`)
2. **ScoutPanel - Category Top Locations** (`categoryVirtualItems`)
3. **ScoutPanel - Overall Countries View** (`overallCountryVirtualItems`)
4. **ScoutPanel - Category Countries View** (`categoryCountryVirtualItems`)
5. **PlacesTab - Places List** (`placesVirtualItems`)

## Performance Metrics

### Target Metrics
| Metric | Target | Acceptable |
|--------|--------|------------|
| Frame Rate (FPS) | 60 | 30+ |
| Initial Render Time | <50ms | <100ms |
| DOM Node Reduction | >80% | >70% |
| Memory Growth During Scroll | <5MB | <10MB |

### Measurement Tools
- **Chrome DevTools Performance Tab** - Frame rate, render times
- **React DevTools Profiler** - Component render counts
- **Memory Tab** - Heap snapshots, memory usage
- **`usePerformanceMetrics` hook** - Built-in metrics collection

## Test Procedures

### Setup

1. Start the development server:
   ```bash
   npm run dev
   ```

2. Open Chrome DevTools (F12)

3. Import test utilities in browser console:
   ```javascript
   // These are available in development builds
   import { generateMockRankedLocations, PERFORMANCE_EXPECTATIONS } from '/src/test-utils/virtual-list-test-data';
   ```

### Test 1: DOM Node Count Verification

**Purpose:** Verify virtualization is reducing DOM nodes

**Steps:**
1. Open the ScoutPanel with the "Top Locations" view
2. Trigger a search that returns 200+ results
3. Open Chrome DevTools → Elements tab
4. Count the number of rendered location cards
5. Compare with total items in the list

**Expected Results:**
- With 200 items and ~400px viewport: ~10-15 cards rendered
- DOM reduction: 90%+ compared to rendering all items

**Console Test:**
```javascript
// In browser console while viewing the list
const container = document.querySelector('[data-testid="scout-list-container"]');
const cards = container.querySelectorAll('[data-testid="location-card"]');
console.log(`Rendered cards: ${cards.length}`);
```

### Test 2: Scroll Performance (60 FPS Target)

**Purpose:** Verify smooth scrolling without jank

**Steps:**
1. Open Chrome DevTools → Performance tab
2. Click "Record" button
3. Scroll through the list for 5-10 seconds (fast and slow)
4. Stop recording
5. Analyze the Frame Rate chart

**Expected Results:**
- Frame rate stays above 60 FPS (green bars)
- No red "dropped frames" indicators
- No long task warnings (>50ms)

**Automated Test:**
```javascript
// In browser console
import { measureScrollPerformance } from '/src/hooks/usePerformanceMetrics';

const container = document.querySelector('[data-testid="scout-scroll-container"]');
const results = await measureScrollPerformance(container, 2000, 3000);
console.log('Scroll Performance:', results);
// Expected: avgFps > 55, dropped < 5
```

### Test 3: Memory Usage During Scroll

**Purpose:** Verify no memory leaks during extended scrolling

**Steps:**
1. Open Chrome DevTools → Memory tab
2. Take a "Heap snapshot" (baseline)
3. Scroll up and down through the list 20+ times
4. Take another heap snapshot
5. Compare memory usage

**Expected Results:**
- Memory growth < 10MB between snapshots
- No unbounded growth pattern
- Objects properly garbage collected

### Test 4: Initial Render Time

**Purpose:** Verify fast initial load with large datasets

**Steps:**
1. Open Chrome DevTools → Performance tab
2. Enable "Screenshots" option
3. Hard refresh the page (Ctrl+Shift+R)
4. Navigate to ScoutPanel
5. Trigger search with 200+ results
6. Analyze the timeline for render time

**Expected Results:**
- Initial render < 100ms
- First contentful paint < 500ms
- Time to Interactive < 1000ms

### Test 5: Variable Height Items (Country Sections)

**Purpose:** Verify collapsible sections work correctly

**Steps:**
1. Switch to "Countries" view in ScoutPanel
2. Load 20+ country sections
3. Expand/collapse several sections while scrolling
4. Verify scroll position is maintained

**Expected Results:**
- Expanding a section doesn't cause scroll jumps
- Collapsed sections show correct heights
- Expanded sections show all nested items

### Test 6: Rapid Filter Changes

**Purpose:** Verify stability during quick filter changes

**Steps:**
1. Open ScoutPanel with "Top Locations" view
2. Rapidly switch between categories (click different tabs)
3. Rapidly toggle between "Top Locations" and "Countries" views
4. Observe for visual glitches or errors

**Expected Results:**
- No React errors in console
- No visual flashing or incorrect content
- Smooth transitions between views

### Test 7: PlacesTab Performance

**Purpose:** Verify PlacesTab virtualization

**Steps:**
1. Open CityInfoPanel for a city with many nearby places
2. Switch to Places tab
3. Scroll through the places list
4. Filter by different place categories

**Expected Results:**
- Only visible PlaceCards rendered
- Smooth scroll at 60 FPS
- Filter changes don't cause scroll jumps

### Test 8: Mobile Performance (Touch Scroll)

**Purpose:** Verify touch scrolling works correctly

**Steps:**
1. Open browser DevTools
2. Enable device emulation (iPhone 12 or similar)
3. Navigate to ScoutPanel
4. Use touch gestures to scroll
5. Test momentum scrolling

**Expected Results:**
- Touch scroll is responsive
- Momentum scrolling continues smoothly
- No jank during fast swipes

## Before/After Comparison

### Baseline Measurements (Without Virtualization)

To compare improvements, temporarily disable virtualization:

```typescript
// In useVirtualList hook options
{
  enabled: false,
  // or
  minItemsForVirtualization: 99999,
}
```

Record baseline metrics:
- DOM node count with 200 items: ~XXX nodes
- Initial render time: ~XXXms
- Scroll FPS: ~XX FPS
- Memory usage: ~XX MB

### Expected Improvements

| Metric | Without Virtualization | With Virtualization | Improvement |
|--------|----------------------|---------------------|-------------|
| DOM Nodes (200 items) | ~1000+ | ~50-100 | 90%+ reduction |
| Initial Render | ~300-500ms | ~50-100ms | 70%+ faster |
| Scroll FPS | ~20-40 FPS | ~60 FPS | 50-200% improvement |
| Memory Usage | ~50-100MB | ~20-40MB | 50%+ reduction |

## Test Data Generation

For consistent testing, use the provided test data generators:

```javascript
import {
  generateMockRankedLocations,
  generateMockOverallLocations,
  generateMockCountryGroups,
  generateMockPlaces,
  TEST_SCENARIOS,
} from '@/test-utils/virtual-list-test-data';

// Generate test data
const locations = generateMockRankedLocations(200);
const countries = generateMockCountryGroups(20, 10);
const places = generateMockPlaces(200);

// Use TEST_SCENARIOS for standardized testing
TEST_SCENARIOS.forEach(scenario => {
  console.log(`Testing: ${scenario.name}`);
  const data = generateTestDataForScenario(scenario);
  // Run tests with data
});
```

## Pass/Fail Criteria

### PASS if:
- [ ] 60 FPS maintained during normal scroll
- [ ] DOM node count reduced by >80% with 200+ items
- [ ] No memory leaks during extended scrolling
- [ ] Initial render time <100ms
- [ ] No visual regressions
- [ ] Mobile touch scroll works correctly
- [ ] Expand/collapse works without scroll jumps
- [ ] Filter changes don't cause errors

### FAIL if:
- [ ] Frame rate drops below 30 FPS
- [ ] Memory grows unbounded during scroll
- [ ] DOM node count not significantly reduced
- [ ] Visual glitches or incorrect rendering
- [ ] React errors in console
- [ ] Touch scroll is unresponsive

## Reporting

After testing, document results in `build-progress.txt`:

```
## Performance Test Results - [DATE]

### Test Environment
- Browser: Chrome XXX
- Device: [Desktop/Mobile emulation]
- Screen Resolution: XXXxXXX

### Results Summary
| Component | Items | DOM Nodes | FPS | Memory | Status |
|-----------|-------|-----------|-----|--------|--------|
| Overall Top | 200 | XX | XX | XX MB | PASS/FAIL |
| Category Top | 200 | XX | XX | XX MB | PASS/FAIL |
| Overall Countries | 20x10 | XX | XX | XX MB | PASS/FAIL |
| Category Countries | 20x10 | XX | XX | XX MB | PASS/FAIL |
| PlacesTab | 200 | XX | XX | XX MB | PASS/FAIL |

### Notes
- [Any observations or issues]
```

## Related Files

- `src/hooks/useVirtualList.ts` - Virtual list hook
- `src/hooks/usePerformanceMetrics.ts` - Performance measurement utilities
- `src/components/ui/virtual-list-container.tsx` - Container component
- `src/features/globe/components/scout-panel-heights.ts` - Height constants
- `src/features/globe/components/CityInfoPanel/tabs/places-tab-heights.ts` - PlaceCard heights
- `src/test-utils/virtual-list-test-data.ts` - Test data generators
