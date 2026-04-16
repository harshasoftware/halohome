import Foundation
import SwiftUI
import Core

/// Observable subscription state for SwiftUI views
///
/// Provides reactive access to subscription status and syncs with Adapty profile.
/// Use this class in SwiftUI views to react to subscription changes.
///
/// Usage:
/// ```swift
/// @Environment(SubscriptionState.self) var subscriptionState
///
/// if subscriptionState.isSubscribed {
///     MainAppView()
/// } else {
///     AstroCartoPaywall()
/// }
/// ```
@MainActor
@Observable
public final class SubscriptionState {

    // MARK: - Public Properties

    /// Whether the user has an active "premium" subscription
    public private(set) var isSubscribed: Bool = false

    /// Whether the user has Duo mode access ("premium_duo" access level)
    public private(set) var hasDuoAccess: Bool = false

    /// Whether the user is currently in a trial period
    public private(set) var isTrialing: Bool = false

    /// Subscription expiration date (nil if no subscription)
    public private(set) var expirationDate: Date?

    /// Active product identifier (e.g., "cartostar_monthly", "cartostar_yearly")
    public private(set) var activeProductID: String?

    /// Whether subscription state is being loaded
    public private(set) var isLoading: Bool = true

    /// Last error that occurred
    public private(set) var lastError: PaymentsError?

    // MARK: - Private Properties

    private let paymentsClient: PaymentsClient
    private var stateTask: Task<Void, Never>?

    // MARK: - Initialization

    public init(paymentsClient: PaymentsClient) {
        self.paymentsClient = paymentsClient
    }

    deinit {
        let task = MainActor.assumeIsolated { stateTask }
        task?.cancel()
    }

    // MARK: - Public Methods

    /// Start observing subscription state changes
    /// Call this once when the app starts after configuring Adapty
    public func startObserving() {
        stateTask?.cancel()

        stateTask = Task { [weak self] in
            guard let self = self else { return }

            for await state in self.paymentsClient.states() {
                guard !Task.isCancelled else { break }
                self.updateFromPaymentsState(state)
            }
        }
    }

    /// Refresh subscription state immediately
    public func refresh() async {
        isLoading = true
        lastError = nil

        let state = await paymentsClient.currentState()
        updateFromPaymentsState(state)

        isLoading = false
    }

    /// Check if the user has access to pro features
    /// Convenience method that checks both subscription and trial status
    public var hasProAccess: Bool {
        isSubscribed || isTrialing
    }

    /// Time remaining until subscription expires (nil if no expiration)
    public var timeUntilExpiration: TimeInterval? {
        guard let expirationDate = expirationDate else { return nil }
        return expirationDate.timeIntervalSinceNow
    }

    /// Formatted string for days remaining in trial
    public var trialDaysRemaining: Int? {
        guard isTrialing, let timeRemaining = timeUntilExpiration else { return nil }
        let days = Int(ceil(timeRemaining / (24 * 60 * 60)))
        return max(0, days)
    }

    // MARK: - Private Methods

    private func updateFromPaymentsState(_ state: PaymentsState) {
        // Check for access levels
        // Note: premium_duo is a superset of premium, so it also grants pro access
        let hasDuo = state.activeEntitlementIDs.contains("premium_duo")
        let hasPro = state.activeEntitlementIDs.contains("premium") || state.isSubscribed || hasDuo

        self.isSubscribed = hasPro
        self.hasDuoAccess = hasDuo
        self.expirationDate = state.expirationDate
        self.activeProductID = state.productID

        // Determine if trialing based on subscription state
        // Adapty includes trial in the active access level, so we check expiration date
        if hasPro, let expiration = state.expirationDate {
            // If subscription is recent and within trial window (3 days from first sub)
            let trialWindow = TimeInterval(3 * 24 * 60 * 60) // 3 days
            let now = Date()

            // Simple heuristic: if expiration is within trial window, assume trialing
            // This is a simplified approach - in production, Adapty profile
            // provides explicit trial period information
            self.isTrialing = expiration.timeIntervalSinceNow <= trialWindow && expiration > now
        } else {
            self.isTrialing = false
        }

        self.isLoading = false

        AppLogger.info(
            "Subscription state updated: subscribed=\(self.isSubscribed), trialing=\(self.isTrialing)",
            category: AppLogger.payments
        )
    }
}

// MARK: - Environment Key

public extension EnvironmentValues {
    @Entry var subscriptionState: SubscriptionState? = nil
}
