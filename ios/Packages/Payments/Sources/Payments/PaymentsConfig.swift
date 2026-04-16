import Foundation

/// Configuration for payments and subscriptions
public struct PaymentsConfig: Sendable, Equatable {
    /// Adapty public SDK key
    public let apiKey: String

    /// Single access level ID for premium features
    public let entitlementID: String

    /// Adapty paywall placement ID
    public let placementID: String

    public init(apiKey: String, entitlementID: String, placementID: String = "default") {
        self.apiKey = apiKey
        self.entitlementID = entitlementID
        self.placementID = placementID
    }
}
