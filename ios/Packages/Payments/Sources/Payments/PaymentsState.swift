import Foundation

/// Represents the current payments/subscription state
public struct PaymentsState: Sendable, Equatable {
    /// Whether the user has an active subscription
    public let isSubscribed: Bool
    
    /// Set of active entitlement IDs
    public let activeEntitlementIDs: Set<String>
    
    /// Subscription expiry date (if available)
    public let expirationDate: Date?
    
    /// Product identifier (e.g., "monthly", "annual")
    public let productID: String?

    /// Start of the current billing period (Pro/Duo only — nil for Free and Lifetime).
    /// Used to filter AI usage counts to the current subscription cycle.
    public let billingPeriodStart: Date?

    public init(
        isSubscribed: Bool,
        activeEntitlementIDs: Set<String> = [],
        expirationDate: Date? = nil,
        productID: String? = nil,
        billingPeriodStart: Date? = nil
    ) {
        self.isSubscribed = isSubscribed
        self.activeEntitlementIDs = activeEntitlementIDs
        self.expirationDate = expirationDate
        self.productID = productID
        self.billingPeriodStart = billingPeriodStart
    }
    
    /// Convenience initializer for free state
    public static let free = PaymentsState(isSubscribed: false)

    // MARK: - Access Helpers

    /// True if the user can access Scout / pro features.
    /// Adapty only allows one access level per product, so Pro buyers have "premium"
    /// and Duo buyers have "premium_duo". AdaptyMappers falls back to "premium_duo"
    /// when "premium" is not active, so both tiers resolve isSubscribed=true correctly.
    public var hasScoutAccess: Bool {
        isSubscribed
    }

    /// True if the user can enable Duo Mode.
    /// Requires both an active subscription AND the premium_duo entitlement,
    /// preventing stale anonymous Adapty profiles from granting access.
    public var hasDuoAccess: Bool {
        isSubscribed && activeEntitlementIDs.contains("premium_duo")
    }

    /// True for one-time Lifetime purchases (productID contains "lifetime").
    public var hasLifetimeAccess: Bool {
        isSubscribed && (productID?.contains("lifetime") == true)
    }

    /// Per-tier AI question quota.
    /// Matches the server-side PRODUCT_TYPE_MAP quotas in adapty-webhook:
    ///   Free → 0 (paywall), Pro → 50, Duo → 100, Lifetime → 200
    public var aiQuestionLimit: Int {
        if hasLifetimeAccess { return 200 }
        if hasDuoAccess      { return 100 }
        if isSubscribed      { return 50  }
        return 0
    }
}
