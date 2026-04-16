# Payments Package

RevenueCat wrapper for subscription management in CartoStar.

**This package gives you:**
- Clean abstraction over RevenueCat SDK (no RC types leak out)
- Reactive subscription state via AsyncStream
- Single entitlement model for MVP
- Purchase and restore flows with proper error handling
- Thread-safe multi-subscriber support with state replay
- Comprehensive testing without touching real SDK

## Quick Start

```swift
import Payments

// Configure once at app start
let config = PaymentsConfig(
    apiKey: "your_revenuecat_api_key",
    entitlementID: "premium"
)

let paymentsClient = RevenueCatClient()
paymentsClient.configure(config)

// Observe subscription state
for await state in paymentsClient.states() {
    if state.isSubscribed {
        print("User has premium access")
    } else {
        print("User is on free tier")
    }
}

// Purchase a product
try await paymentsClient.purchase(productID: "monthly_subscription")

// Restore purchases
try await paymentsClient.restore()
```

## Overview

The Payments package provides a clean, testable wrapper around RevenueCat's Purchases SDK. It handles subscription state management, purchase flows, and error handling while keeping RevenueCat types internal to maintain architectural boundaries.

## Key Concepts

### Single Entitlement Model
For MVP, the app uses one entitlement ID (e.g., "premium") that gates all premium features. This simplifies:
- State management (boolean `isSubscribed`)
- Paywall logic (show/hide based on single flag)
- Testing (one subscription state to mock)

### Reactive State
- **AsyncStream<PaymentsState>**: Hot stream that replays last state to new subscribers
- **Multiple subscribers**: Safe for use across ViewModels
- **Automatic updates**: State changes from purchases/restores propagate instantly

### Error Handling
- Maps RevenueCat errors to `PaymentsError` enum
- Distinguishes user cancellation from system errors
- Converts to `AppError` for consistent app-wide handling

## Usage

### Configure at App Launch

```swift
// In your app's composition root or @main
let paymentsClient = RevenueCatClient()
paymentsClient.configure(PaymentsConfig(
    apiKey: Bundle.main.infoDictionary?["REVENUECAT_API_KEY"] as? String ?? "",
    entitlementID: "premium"
))
```

### Check Subscription Status

```swift
// Get current state (cached, fast)
let state = await paymentsClient.currentState()
if state.isSubscribed {
    // Show premium features
}

// Or observe changes
for await state in paymentsClient.states() {
    updateUI(isPremium: state.isSubscribed)
}
```

### Purchase Flow

```swift
// In your paywall ViewModel
func purchaseMonthly() async {
    do {
        try await paymentsClient.purchase(productID: "monthly_sub")
        // State automatically updates via stream
    } catch let error as PaymentsError {
        if error == .cancelled {
            // User cancelled, no error UI needed
        } else {
            showError(error.asAppError())
        }
    }
}
```

### Restore Purchases

```swift
func restorePurchases() async {
    do {
        try await paymentsClient.restore()
        // State updates if entitlements found
    } catch {
        showError(error)
    }
}
```

## Testing

Tests use `FakePurchases` that implements the `RCPurchases` protocol:
- No network calls or real RevenueCat SDK
- Fully deterministic and fast
- Simulates purchase, restore, errors, and cancellation

```swift
let fakePurchases = FakePurchases()
let client = RevenueCatClient(environment: RCEnvironment(purchases: fakePurchases))

// Simulate purchase success
try await client.purchase(productID: "premium")

// Simulate error
fakePurchases.shouldThrowOnPurchase = true
```

## RevenueCat Configuration

### Setup Steps:
1. Create account at revenueCat.com
2. Add your app bundle ID
3. Configure iOS app with App Store Connect
4. Get public SDK key (not secret!)
5. Store in app config (environment variable or xcconfig)

### Entitlement Setup:
1. In RevenueCat dashboard, create entitlement: "premium"
2. Attach products (monthly/annual subscriptions)
3. Use same entitlement ID in `PaymentsConfig`

**Security Note:** The RevenueCat API key is public and safe to include in the app. Secret keys stay server-side.

## Why This Exists

Provides a thin, testable abstraction over RevenueCat that maintains clean MVVM boundaries. Views and ViewModels never import RevenueCat directly, making the codebase easier to test and reducing coupling to the payment provider.
