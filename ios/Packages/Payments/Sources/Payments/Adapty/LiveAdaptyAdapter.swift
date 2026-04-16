import Foundation
import Adapty
import AdaptyUI
import Core

/// Live adapter wrapping the real Adapty SDK
@available(iOS 17.0, *)
final class LiveAdaptyAdapter: AdaptyPurchasesProtocol, @unchecked Sendable {

    private let delegateHandler = AdaptyDelegateHandler()

    init() {}

    func activate(apiKey: String) async throws {
        let config = AdaptyConfiguration
            .builder(withAPIKey: apiKey)
            .build()
        try await Adapty.activate(with: config)
        Adapty.delegate = delegateHandler
        AppLogger.info("Adapty SDK activated", category: AppLogger.payments)

        // Activate AdaptyUI for no-code paywall support
        try await AdaptyUI.activate()
        AppLogger.info("AdaptyUI activated", category: AppLogger.payments)
    }

    func getProfile() async throws -> AdaptyProfileProtocol {
        let profile = try await Adapty.getProfile()
        return LiveProfileAdapter(profile: profile)
    }

    func profileUpdates() -> AsyncStream<AdaptyProfileProtocol> {
        AsyncStream { continuation in
            let id = UUID()
            self.delegateHandler.addListener(id: id) { profile in
                continuation.yield(LiveProfileAdapter(profile: profile))
            }
            continuation.onTermination = { [weak self] _ in
                self?.delegateHandler.removeListener(id: id)
            }
        }
    }

    func getPaywall(placementID: String) async throws -> AdaptyPaywallProtocol {
        let paywall = try await Adapty.getPaywall(placementId: placementID)
        return LivePaywallAdapter(paywall: paywall)
    }

    func getPaywallProducts(paywall: AdaptyPaywallProtocol) async throws -> [AdaptyProductProtocol] {
        guard let adapted = paywall as? LivePaywallAdapter else {
            throw NSError(domain: "Payments", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Invalid paywall type"
            ])
        }
        let products = try await Adapty.getPaywallProducts(paywall: adapted.paywall)
        return products.map { LiveProductAdapter(product: $0) }
    }

    func makePurchase(product: AdaptyProductProtocol) async throws -> PaymentPurchaseResult {
        guard let adapted = product as? LiveProductAdapter else {
            throw NSError(domain: "Payments", code: -1, userInfo: [
                NSLocalizedDescriptionKey: "Invalid product type"
            ])
        }

        let result = try await Adapty.makePurchase(product: adapted.product)
        switch result {
        case .success(let profile, _):
            return .success(profile: LiveProfileAdapter(profile: profile))
        case .userCancelled:
            return .userCancelled
        case .pending:
            return .pending
        }
    }

    func restorePurchases() async throws -> AdaptyProfileProtocol {
        let profile = try await Adapty.restorePurchases()
        return LiveProfileAdapter(profile: profile)
    }

    func identify(userId: String) async throws {
        try await Adapty.identify(userId)
        AppLogger.info("Adapty user identified", category: AppLogger.payments)
    }

    func updateProfile(email: String?, firstName: String?) async throws {
        let builder = AdaptyProfileParameters.Builder()
            .with(email: email)
            .with(firstName: firstName)
        try await Adapty.updateProfile(params: builder.build())
        AppLogger.info("Adapty profile updated — email=\(email ?? "nil")", category: AppLogger.payments)
    }

    func logout() async throws {
        do {
            try await Adapty.logout()
            AppLogger.info("Adapty user logged out", category: AppLogger.payments)
        } catch let adaptyError where adaptyError.adaptyErrorCode == .unidentifiedUserLogout {
            // User was already anonymous in Adapty — already in the desired post-logout state.
            AppLogger.debug("Adapty logout: user already anonymous, skipping", category: AppLogger.payments)
        }
    }
}

// MARK: - Delegate Handler

@available(iOS 17.0, *)
private final class AdaptyDelegateHandler: NSObject, AdaptyDelegate, @unchecked Sendable {
    private let lock = NSLock()
    private var listeners: [UUID: @Sendable (AdaptyProfile) -> Void] = [:]

    /// Snapshot of the previous access-level state used for delta-event detection.
    private struct AccessLevelSnapshot: Sendable {
        var isActive: Bool
        var willRenew: Bool
        var isInGracePeriod: Bool
        var billingIssueDetectedAt: Date?
        var renewedAt: Date?
        var vendorProductId: String?

        init(_ level: AdaptyProfile.AccessLevel) {
            isActive                = level.isActive
            willRenew               = level.willRenew
            isInGracePeriod         = level.isInGracePeriod
            billingIssueDetectedAt  = level.billingIssueDetectedAt
            renewedAt               = level.renewedAt
            vendorProductId         = level.vendorProductId
        }
    }

    private var previousSnapshots: [String: AccessLevelSnapshot] = [:]

    func addListener(id: UUID, handler: @escaping @Sendable (AdaptyProfile) -> Void) {
        lock.withLock { listeners[id] = handler }
    }

    func removeListener(id: UUID) {
        lock.withLock { _ = listeners.removeValue(forKey: id) }
    }

    func didLoadLatestProfile(_ profile: AdaptyProfile) {
        let currentListeners = lock.withLock { Array(listeners.values) }
        for listener in currentListeners {
            listener(profile)
        }
        // Dispatch to main queue: onEvent/onRevenue are set there, previousSnapshots
        // is only mutated here — no lock needed, no data race.
        DispatchQueue.main.async { [weak self] in
            MainActor.assumeIsolated {
                self?.trackSubscriptionDelta(profile)
            }
        }
    }

    // MARK: - Subscription lifecycle delta tracking

    @MainActor
    private func trackSubscriptionDelta(_ profile: AdaptyProfile) {
        // Called only from DispatchQueue.main — no lock needed for previousSnapshots.
        for (levelID, level) in profile.accessLevels {
            let prev = previousSnapshots[levelID]
            let current = AccessLevelSnapshot(level)
            previousSnapshots[levelID] = current  // always update before any early-exit

            guard let prev else {
                // First time we see this level — snapshot seeded above, no events.
                continue
            }

            let productID = current.vendorProductId ?? prev.vendorProductId ?? ""
            let props: [String: Any] = ["access_level": levelID, "product_id": productID]

            if current.isActive, let newDate = current.renewedAt, newDate != prev.renewedAt {
                PaymentsEventTracker.capture("subscription_renewed", properties: props)
            }
            if prev.willRenew, !current.willRenew, current.isActive {
                PaymentsEventTracker.capture("subscription_renewal_cancelled", properties: props)
            }
            if !prev.willRenew, current.willRenew, current.isActive {
                PaymentsEventTracker.capture("subscription_renewal_reactivated", properties: props)
            }
            if !prev.isInGracePeriod, current.isInGracePeriod {
                PaymentsEventTracker.capture("entered_grace_period", properties: props)
            }
            if prev.billingIssueDetectedAt == nil, current.billingIssueDetectedAt != nil {
                PaymentsEventTracker.capture("billing_issue_detected", properties: props)
            }
            if prev.isActive, !current.isActive, !current.isInGracePeriod {
                PaymentsEventTracker.capture("subscription_expired", properties: props)
            }
        }
    }
}

// MARK: - Live Adapters

@available(iOS 17.0, *)
struct LiveProfileAdapter: AdaptyProfileProtocol {
    private let profile: AdaptyProfile

    init(profile: AdaptyProfile) {
        self.profile = profile
    }

    func isAccessLevelActive(_ id: String) -> Bool {
        profile.accessLevels[id]?.isActive ?? false
    }

    func accessLevelExpiresAt(_ id: String) -> Date? {
        profile.accessLevels[id]?.expiresAt
    }

    func accessLevelRenewedAt(_ id: String) -> Date? {
        profile.accessLevels[id]?.renewedAt
    }

    func accessLevelVendorProductId(_ id: String) -> String? {
        profile.accessLevels[id]?.vendorProductId
    }

    var activeAccessLevelIDs: Set<String> {
        Set(profile.accessLevels.filter { $0.value.isActive }.keys)
    }
}

@available(iOS 17.0, *)
struct LivePaywallAdapter: AdaptyPaywallProtocol {
    let paywall: AdaptyPaywall

    init(paywall: AdaptyPaywall) {
        self.paywall = paywall
    }

    var placementID: String {
        paywall.placement.id
    }
}

@available(iOS 17.0, *)
struct LiveProductAdapter: AdaptyProductProtocol {
    let product: AdaptyPaywallProduct

    init(product: AdaptyPaywallProduct) {
        self.product = product
    }

    var vendorProductId: String {
        product.vendorProductId
    }

    var localizedPrice: String {
        product.localizedPrice ?? ""
    }

    var localizedTitle: String {
        product.localizedTitle
    }

    var subscriptionPeriod: PaymentSubscriptionPeriod? {
        guard let period = product.subscriptionPeriod else { return nil }
        let unit: PaymentSubscriptionPeriod.Unit
        switch period.unit {
        case .day: unit = .day
        case .week: unit = .week
        case .month: unit = .month
        case .year: unit = .year
        case .unknown: unit = .month
        @unknown default: unit = .month
        }
        return PaymentSubscriptionPeriod(unit: unit, numberOfUnits: period.numberOfUnits)
    }

    var localizedIntroductoryPrice: String? {
        guard let offer = product.subscriptionOffer,
              offer.offerType == .introductory else { return nil }
        return offer.localizedPrice
    }

    var price: Decimal {
        product.price
    }

    var currencyCode: String? {
        product.currencyCode
    }
}
