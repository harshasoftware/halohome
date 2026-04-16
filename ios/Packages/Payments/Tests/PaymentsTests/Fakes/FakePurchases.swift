import Foundation
@testable import Payments

/// Fake Adapty Purchases implementation for testing
final class FakeAdaptyPurchases: AdaptyPurchasesProtocol, @unchecked Sendable {
    var isActivated = false
    var activatedAPIKey: String?
    var activeAccessLevels: Set<String> = []
    var shouldThrowOnPurchase = false
    var shouldThrowOnRestore = false
    var purchaseError: Error?
    var purchaseResult: PaymentPurchaseResult?
    var profileContinuation: AsyncStream<AdaptyProfileProtocol>.Continuation?

    func activate(apiKey: String) async throws {
        isActivated = true
        activatedAPIKey = apiKey
    }

    func getProfile() async throws -> AdaptyProfileProtocol {
        FakeProfile(activeAccessLevelIDs: activeAccessLevels)
    }

    func profileUpdates() -> AsyncStream<AdaptyProfileProtocol> {
        AsyncStream { continuation in
            self.profileContinuation = continuation

            // Emit initial state
            let initialProfile = FakeProfile(activeAccessLevelIDs: activeAccessLevels)
            continuation.yield(initialProfile)
        }
    }

    func getPaywall(placementID: String) async throws -> AdaptyPaywallProtocol {
        FakePaywall(placementID: placementID)
    }

    func getPaywallProducts(paywall: AdaptyPaywallProtocol) async throws -> [AdaptyProductProtocol] {
        [
            FakeProduct(vendorProductId: "com.cartostar.pro.monthly", localizedPrice: "$12.99", localizedTitle: "Monthly", subscriptionPeriod: PaymentSubscriptionPeriod(unit: .month, numberOfUnits: 1)),
            FakeProduct(vendorProductId: "com.cartostar.pro.annual", localizedPrice: "$99.99", localizedTitle: "Annual", subscriptionPeriod: PaymentSubscriptionPeriod(unit: .year, numberOfUnits: 1)),
        ]
    }

    func makePurchase(product: AdaptyProductProtocol) async throws -> PaymentPurchaseResult {
        if shouldThrowOnPurchase {
            if let error = purchaseError {
                throw error
            }
            return .userCancelled
        }

        if let result = purchaseResult {
            return result
        }

        // Simulate successful purchase
        activeAccessLevels.insert("premium")
        let profile = FakeProfile(activeAccessLevelIDs: activeAccessLevels)
        profileContinuation?.yield(profile)
        return .success(profile: profile)
    }

    func restorePurchases() async throws -> AdaptyProfileProtocol {
        if shouldThrowOnRestore {
            throw NSError(domain: "AdaptyError", code: 1)
        }

        let profile = FakeProfile(activeAccessLevelIDs: activeAccessLevels)
        profileContinuation?.yield(profile)
        return profile
    }

    func identify(userId: String) async throws {
        // No-op for tests
    }

    func updateProfile(email: String?, firstName: String?) async throws {
        // No-op for tests
    }

    func logout() async throws {
        activeAccessLevels.removeAll()
        let profile = FakeProfile(activeAccessLevelIDs: activeAccessLevels)
        profileContinuation?.yield(profile)
    }

    func reset() {
        isActivated = false
        activatedAPIKey = nil
        activeAccessLevels.removeAll()
        shouldThrowOnPurchase = false
        shouldThrowOnRestore = false
        purchaseError = nil
        purchaseResult = nil
    }
}

/// Fake Profile
struct FakeProfile: AdaptyProfileProtocol {
    let activeAccessLevelIDs: Set<String>
    var accessLevelExpiryDates: [String: Date] = [:]
    var accessLevelRenewedAtDates: [String: Date] = [:]
    var accessLevelVendorProductIds: [String: String] = [:]

    func isAccessLevelActive(_ id: String) -> Bool {
        activeAccessLevelIDs.contains(id)
    }

    func accessLevelExpiresAt(_ id: String) -> Date? {
        accessLevelExpiryDates[id]
    }

    func accessLevelRenewedAt(_ id: String) -> Date? {
        accessLevelRenewedAtDates[id]
    }

    func accessLevelVendorProductId(_ id: String) -> String? {
        accessLevelVendorProductIds[id]
    }
}

/// Fake Paywall
struct FakePaywall: AdaptyPaywallProtocol {
    let placementID: String
}

/// Fake Product
struct FakeProduct: AdaptyProductProtocol {
    let vendorProductId: String
    let localizedPrice: String
    let localizedTitle: String
    let subscriptionPeriod: PaymentSubscriptionPeriod?
    var localizedIntroductoryPrice: String? = nil
}
