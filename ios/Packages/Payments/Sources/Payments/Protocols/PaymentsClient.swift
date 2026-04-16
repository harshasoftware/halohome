import Foundation

/// Main payments client protocol
public protocol PaymentsClient: Sendable {
    /// Configure the payments system. Call once at app start. Idempotent.
    func configure(_ config: PaymentsConfig)

    /// Stream of subscription state changes
    func states() -> AsyncStream<PaymentsState>

    /// Get current subscription state immediately (cached)
    func currentState() async -> PaymentsState

    /// Purchase a product by ID
    func purchase(productID: String) async throws

    /// Restore previous purchases
    /// Returns the resulting PaymentsState after restore completes
    @discardableResult
    func restore() async throws -> PaymentsState

    /// Prefetch offerings for paywall (optional optimization)
    func prefetchOfferings() async

    /// Get available product offerings with pricing (uses default placement)
    func getOfferings() async throws -> [PaymentsOffering]

    /// Get available product offerings for a specific Adapty placement ID
    func getOfferings(forPlacement placementID: String) async throws -> [PaymentsOffering]

    /// Log in a user for cross-platform subscription sync
    func logIn(userID: String, email: String?, name: String?) async throws -> PaymentsState

    /// Log out the current user
    func logOut() async throws -> PaymentsState
}

/// Default implementation so existing conformances don't need to add the new method
public extension PaymentsClient {
    func getOfferings(forPlacement placementID: String) async throws -> [PaymentsOffering] {
        try await getOfferings()
    }
}
