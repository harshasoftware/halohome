import Foundation
import Core

/// Centralized manager for Adapty subscription management
///
/// Provides:
/// - Configuration with API key and user ID
/// - Subscription status checking
/// - Cross-platform entitlement verification (Stripe + IAP)
/// - User identification for existing web subscribers
@MainActor
public final class AdaptyManager {

    // MARK: - Singleton

    public static let shared = AdaptyManager()

    // MARK: - Properties

    private var paymentsClient: AdaptyClient?
    private let accessLevelID = "premium"

    // MARK: - Configuration

    private init() {}

    /// Configure Adapty with your API key and optional user ID
    ///
    /// - Parameters:
    ///   - apiKey: Adapty public API key
    ///   - userID: Optional user ID (should match Supabase user ID for cross-platform sync)
    public func configure(apiKey: String, userID: String? = nil) {
        let client = AdaptyClient()

        let config = PaymentsConfig(apiKey: apiKey, entitlementID: accessLevelID)
        client.configure(config)

        self.paymentsClient = client

        if let userID = userID {
            Task {
                await identifyUser(userID)
            }
        }

        AppLogger.info("AdaptyManager configured", category: AppLogger.payments)
    }

    /// Identify the current user for cross-platform subscription sync
    public func identifyUser(_ userID: String) async {
        guard let client = paymentsClient else {
            AppLogger.info("AdaptyManager not configured, skipping identify", category: AppLogger.payments)
            return
        }

        do {
            let state = try await client.logIn(userID: userID, email: nil, name: nil)
            AppLogger.info("User identified for subscription sync: \(self.maskUserID(userID)), subscribed=\(state.isSubscribed)", category: AppLogger.payments)
        } catch {
            AppLogger.error("Failed to identify user: \(error)", category: AppLogger.payments)
        }
    }

    /// Log out the current user (call on sign out)
    public func logOut() async {
        guard let client = paymentsClient else {
            AppLogger.info("AdaptyManager not configured, skipping logout", category: AppLogger.payments)
            return
        }

        do {
            _ = try await client.logOut()
            AppLogger.info("User logged out from subscription service", category: AppLogger.payments)
        } catch {
            AppLogger.error("Failed to log out user: \(error)", category: AppLogger.payments)
        }
    }

    // MARK: - Subscription Status

    /// Check if the user has an active "premium" subscription
    public func isSubscribed() async -> Bool {
        guard let client = paymentsClient else {
            AppLogger.info("AdaptyManager not configured", category: AppLogger.payments)
            return false
        }

        let state = await client.currentState()
        return state.isSubscribed || state.activeEntitlementIDs.contains(accessLevelID)
    }

    /// Get the current subscription state
    public func currentState() async -> PaymentsState {
        guard let client = paymentsClient else {
            return .free
        }
        return await client.currentState()
    }

    /// Stream of subscription state changes
    public func stateStream() -> AsyncStream<PaymentsState> {
        guard let client = paymentsClient else {
            return AsyncStream { continuation in
                continuation.yield(.free)
                continuation.finish()
            }
        }
        return client.states()
    }

    // MARK: - Purchase Operations

    /// Purchase a subscription product
    public func purchase(productID: String) async throws {
        guard let client = paymentsClient else {
            throw PaymentsError.notConfigured
        }
        try await client.purchase(productID: productID)
    }

    /// Restore previous purchases
    @discardableResult
    public func restorePurchases() async throws -> PaymentsState {
        guard let client = paymentsClient else {
            throw PaymentsError.notConfigured
        }
        return try await client.restore()
    }

    /// Get available subscription offerings
    public func getOfferings() async throws -> [PaymentsOffering] {
        guard let client = paymentsClient else {
            throw PaymentsError.notConfigured
        }
        return try await client.getOfferings()
    }

    /// Prefetch offerings for faster paywall display
    public func prefetchOfferings() async {
        await paymentsClient?.prefetchOfferings()
    }

    // MARK: - Cross-Platform Support

    /// Check if user has a valid cross-platform subscription
    public func hasCrossPlatformSubscription() async -> Bool {
        guard let client = paymentsClient else { return false }

        let state = await client.currentState()
        return state.activeEntitlementIDs.contains(accessLevelID)
    }

    // MARK: - Private Helpers

    private func maskUserID(_ userID: String) -> String {
        guard userID.count > 8 else { return "***" }
        let prefix = userID.prefix(4)
        let suffix = userID.suffix(4)
        return "\(prefix)...\(suffix)"
    }
}

// MARK: - Convenience Extensions

public extension AdaptyManager {

    /// Quick check if manager is configured
    var isConfigured: Bool {
        paymentsClient != nil
    }

    /// The access level ID used for premium access
    var premiumAccessLevelID: String {
        accessLevelID
    }
}
