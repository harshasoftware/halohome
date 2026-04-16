import Foundation

/// Minimal abstraction of Adapty SDK for testing
public protocol AdaptyPurchasesProtocol: Sendable {
    /// Activate Adapty SDK with API key
    func activate(apiKey: String) async throws

    /// Get the current user profile
    func getProfile() async throws -> AdaptyProfileProtocol

    /// Stream of profile updates (bridged from AdaptyDelegate)
    func profileUpdates() -> AsyncStream<AdaptyProfileProtocol>

    /// Get a paywall by placement ID
    func getPaywall(placementID: String) async throws -> AdaptyPaywallProtocol

    /// Get products for a paywall
    func getPaywallProducts(paywall: AdaptyPaywallProtocol) async throws -> [AdaptyProductProtocol]

    /// Make a purchase
    func makePurchase(product: AdaptyProductProtocol) async throws -> PaymentPurchaseResult

    /// Restore purchases
    func restorePurchases() async throws -> AdaptyProfileProtocol

    /// Identify a user
    func identify(userId: String) async throws

    /// Update profile attributes (email, name) visible in Adapty dashboard
    func updateProfile(email: String?, firstName: String?) async throws

    /// Log out the current user
    func logout() async throws
}

/// Minimal abstraction of Adapty Profile
public protocol AdaptyProfileProtocol: Sendable {
    /// Whether the given access level is active
    func isAccessLevelActive(_ id: String) -> Bool

    /// Expiry date for a given access level
    func accessLevelExpiresAt(_ id: String) -> Date?

    /// The date the subscription was last renewed (start of current billing period)
    func accessLevelRenewedAt(_ id: String) -> Date?

    /// The vendor product ID associated with the given access level
    func accessLevelVendorProductId(_ id: String) -> String?

    /// Set of active access level IDs
    var activeAccessLevelIDs: Set<String> { get }
}

/// Minimal abstraction of Adapty Paywall
public protocol AdaptyPaywallProtocol: Sendable {
    /// The placement ID of this paywall
    var placementID: String { get }
}

/// Minimal abstraction of Adapty Product
public protocol AdaptyProductProtocol: Sendable {
    /// The vendor (App Store) product ID
    var vendorProductId: String { get }

    /// Localized price string (e.g. "$12.99")
    var localizedPrice: String { get }

    /// Localized title
    var localizedTitle: String { get }

    /// Subscription period (nil for lifetime/non-subscription)
    var subscriptionPeriod: PaymentSubscriptionPeriod? { get }

    /// Localized introductory price (if available)
    var localizedIntroductoryPrice: String? { get }

    /// Numeric price for revenue tracking (e.g. 9.99)
    var price: Decimal { get }

    /// ISO 4217 currency code for revenue tracking (e.g. "USD")
    var currencyCode: String? { get }
}

/// Result of a purchase attempt
public enum PaymentPurchaseResult: Sendable {
    case success(profile: AdaptyProfileProtocol)
    case userCancelled
    case pending
}

/// Subscription period abstraction
public struct PaymentSubscriptionPeriod: Sendable, Equatable {
    public enum Unit: String, Sendable {
        case day, week, month, year
    }

    public let unit: Unit
    public let numberOfUnits: Int

    public init(unit: Unit, numberOfUnits: Int) {
        self.unit = unit
        self.numberOfUnits = numberOfUnits
    }
}

/// Environment holding Adapty dependencies for DI
public struct AdaptyEnvironment: Sendable {
    let purchases: AdaptyPurchasesProtocol

    public init(purchases: AdaptyPurchasesProtocol) {
        self.purchases = purchases
    }
}
