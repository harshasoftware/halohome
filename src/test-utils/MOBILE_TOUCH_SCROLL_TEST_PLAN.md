# Mobile Touch Scroll Test Plan for Virtualized Lists

This document outlines the test procedures for verifying that virtualized lists work correctly in mobile bottom sheets on iOS Safari and Android Chrome.

## Overview

The virtualization implementation must maintain smooth touch scrolling behavior in:
- **MobileScoutSheet** - Scout Locations bottom sheet with virtualized city lists
- **MobileCityInfoSheet** - City Info bottom sheet with virtualized PlacesTab

## Test Environment Setup

### Required Devices/Emulators

1. **iOS Safari** (Primary)
   - iPhone 12 or newer recommended
   - iOS 15+
   - Test both standard and low power modes

2. **Android Chrome** (Primary)
   - Pixel 5 or equivalent
   - Android 11+
   - Test both standard and battery saver modes

3. **Chrome DevTools Mobile Emulation** (Development)
   - Enable touch simulation
   - Use responsive mode with mobile device presets

### Test Data Requirements

Generate test data with 200+ items to stress-test virtualization:

```typescript
import { generateMockRankedLocations, generateMockPlaces } from '@/test-utils/virtual-list-test-data';

// Generate 200 locations for ScoutPanel testing
const testLocations = generateMockRankedLocations(200);

// Generate 200 places for PlacesTab testing
const testPlaces = generateMockPlaces(200);
```

---

## Test Procedures

### Test 1: Basic Touch Scroll (MobileScoutSheet)

**Objective:** Verify basic touch scrolling works in MobileScoutSheet

**Steps:**
1. Open app on mobile device
2. Navigate to Globe view
3. Tap "Scout" button to open MobileScoutSheet
4. Touch and drag up/down on the city list
5. Observe scroll behavior

**Expected Results:**
- [ ] List scrolls smoothly following finger movement
- [ ] No jitter or stutter during drag
- [ ] Items render correctly as new ones come into view
- [ ] No blank areas appear during scroll

**Pass Criteria:**
- Scroll follows finger with < 50ms latency
- Visual frame rate appears smooth (no perceptible stutter)

---

### Test 2: Momentum Scrolling (MobileScoutSheet)

**Objective:** Verify momentum/inertia scrolling works after flick gesture

**Steps:**
1. Open MobileScoutSheet with 200+ items
2. Perform a quick flick/swipe gesture upward
3. Release finger
4. Observe continued scroll behavior

**Expected Results:**
- [ ] List continues scrolling after finger release
- [ ] Scroll speed gradually decelerates
- [ ] Deceleration feels natural (matches native iOS/Android behavior)
- [ ] Items continue rendering during momentum scroll

**Pass Criteria:**
- Scroll continues for at least 500ms after release
- Deceleration follows native platform behavior

---

### Test 3: Overscroll Behavior (MobileScoutSheet)

**Objective:** Verify native overscroll behavior at list boundaries

**Steps:**
1. Open MobileScoutSheet
2. Scroll to the top of the list
3. Continue dragging downward past the top
4. Release and observe

**Steps (repeat for bottom):**
1. Scroll to the bottom of the list
2. Continue dragging upward past the bottom
3. Release and observe

**Expected Results:**
- [ ] iOS: Rubber-band effect at boundaries
- [ ] Android: Glow/edge effect at boundaries
- [ ] List snaps back to valid position on release
- [ ] No crash or unexpected behavior

**Pass Criteria:**
- Native platform overscroll effect is visible
- List returns to valid bounds after release

---

### Test 4: Fast Scroll Performance (MobileScoutSheet)

**Objective:** Verify virtualization handles rapid scrolling

**Steps:**
1. Open MobileScoutSheet with 200+ items
2. Perform rapid up/down flicks in succession
3. Continue for 10-15 seconds
4. Observe performance

**Expected Results:**
- [ ] Frame rate stays above 30 FPS
- [ ] No memory warnings or crashes
- [ ] Items render correctly (no missing content)
- [ ] No visual glitches or artifacts

**Pass Criteria:**
- Average FPS >= 30 during rapid scrolling
- No visible jank or stuttering

---

### Test 5: Touch Scroll in PlacesTab (MobileCityInfoSheet)

**Objective:** Verify touch scrolling works in nested PlacesTab

**Steps:**
1. Tap on a city marker to open MobileCityInfoSheet
2. Navigate to "Places" tab
3. Wait for places to load (200+ items if test data)
4. Touch and drag to scroll the places list
5. Perform momentum scroll
6. Test overscroll at boundaries

**Expected Results:**
- [ ] Basic touch scroll works correctly
- [ ] Momentum scroll works correctly
- [ ] Overscroll behavior matches platform
- [ ] Category filter changes don't break scroll

**Pass Criteria:**
- All touch interactions work as expected
- Switching categories resets scroll smoothly

---

### Test 6: Bottom Sheet Drag vs List Scroll Conflict

**Objective:** Verify scroll container doesn't conflict with sheet drag handle

**Steps:**
1. Open MobileScoutSheet
2. Attempt to scroll the list by touching near the top (close to drag handle)
3. Attempt to drag the sheet closed by swiping down on the list area
4. Attempt to maximize sheet by swiping up on the list

**Expected Results:**
- [ ] Drag handle area triggers sheet gestures (swipe up/down)
- [ ] List content area triggers list scroll
- [ ] No confusion between the two gesture zones
- [ ] Sheet can be closed by swiping on handle, not list

**Pass Criteria:**
- Clear separation between sheet gestures and list scroll
- Gesture conflicts are minimal/non-existent

---

### Test 7: Orientation Change

**Objective:** Verify scroll state is maintained during orientation change

**Steps:**
1. Open MobileScoutSheet
2. Scroll to middle of list
3. Rotate device from portrait to landscape
4. Observe scroll position
5. Rotate back to portrait

**Expected Results:**
- [ ] Scroll position is approximately maintained
- [ ] No crash during rotation
- [ ] Virtualization recalculates correctly
- [ ] List remains scrollable after rotation

**Pass Criteria:**
- Scroll position maintained within ~50px
- List remains functional after rotation

---

### Test 8: Memory Usage During Extended Scrolling

**Objective:** Verify no memory leaks during prolonged scroll sessions

**Steps:**
1. Open Safari/Chrome developer tools (connect to device)
2. Take initial memory snapshot
3. Open MobileScoutSheet with 200+ items
4. Scroll up and down continuously for 2 minutes
5. Take final memory snapshot
6. Compare memory usage

**Expected Results:**
- [ ] Memory usage growth < 10MB over test period
- [ ] No memory warning dialogs
- [ ] App remains responsive
- [ ] No crash or freeze

**Pass Criteria:**
- Memory growth < 10MB for 2-minute session
- No out-of-memory errors

---

## Automated Testing

Use the provided test utilities for automated verification:

```typescript
import {
  runTouchScrollTest,
  logTestResults,
  simulateRapidScrolling
} from '@/test-utils/mobile-scroll-test-utils';

// Find the scroll container (example for ScoutPanel)
const scrollContainer = document.querySelector('[class*="overflow-y-auto"]');

// Run automated test
const result = await runTouchScrollTest(scrollContainer, 'MobileScoutSheet', 3000);
logTestResults(result);

// Or run simulated rapid scrolling test
const rapidMetrics = await simulateRapidScrolling(scrollContainer, 10, [100, 500]);
console.log('Rapid scroll metrics:', rapidMetrics);
```

---

## Performance Expectations

| Metric | Target | Minimum Acceptable |
|--------|--------|-------------------|
| Scroll FPS | 60 | 30 |
| Touch Latency | < 16ms | < 50ms |
| Momentum Duration | Native | > 500ms |
| Memory Growth (2min) | < 5MB | < 10MB |
| Dropped Frames | 0% | < 5% |

---

## CSS Optimizations Applied

The following CSS optimizations have been added to `src/index.css`:

1. **`-webkit-overflow-scrolling: touch`** - Enables momentum scrolling on iOS
2. **`touch-action: pan-y`** - Allows vertical panning
3. **`overscroll-behavior-y: contain`** - Contains overscroll effect
4. **`transform: translateZ(0)`** - GPU acceleration for scroll
5. **`contain: layout paint`** - Limits repainting to item boundaries
6. **`will-change: transform`** - Hints browser for optimization

---

## Known Issues & Workarounds

### Issue: Scroll stops working after sheet minimize/maximize
**Workaround:** Ensure scroll container ref is properly maintained across sheet state changes.

### Issue: Items flicker during fast scroll on older devices
**Workaround:** Increase overscan value in useVirtualList configuration.

### Issue: Momentum scroll doesn't work in Chrome DevTools emulation
**Workaround:** This is a DevTools limitation. Test on actual devices for accurate momentum behavior.

---

## Test Sign-Off

| Test | iOS Safari | Android Chrome | Date | Tester |
|------|------------|----------------|------|--------|
| 1. Basic Touch Scroll | ⬜ | ⬜ | | |
| 2. Momentum Scroll | ⬜ | ⬜ | | |
| 3. Overscroll Behavior | ⬜ | ⬜ | | |
| 4. Fast Scroll Performance | ⬜ | ⬜ | | |
| 5. PlacesTab Touch Scroll | ⬜ | ⬜ | | |
| 6. Drag vs Scroll Conflict | ⬜ | ⬜ | | |
| 7. Orientation Change | ⬜ | ⬜ | | |
| 8. Memory Usage | ⬜ | ⬜ | | |

Legend: ⬜ Not Tested | ✅ Passed | ❌ Failed

---

## References

- [useVirtualList Hook](/src/hooks/useVirtualList.ts)
- [VirtualListContainer Component](/src/components/ui/virtual-list-container.tsx)
- [Mobile Scroll Test Utilities](/src/test-utils/mobile-scroll-test-utils.ts)
- [MobileBottomSheet Component](/src/features/globe/components/mobile/MobileBottomSheet.tsx)
