import Foundation
import Core

/// Adapty-based payments client implementation
public final class AdaptyClient: PaymentsClient, @unchecked Sendable {

    private let environment: AdaptyEnvironment
    private let lock = NSLock()

    private var config: PaymentsConfig?
    private var currentPaymentsState: PaymentsState
    private var stateContinuations: [UUID: AsyncStream<PaymentsState>.Continuation] = [:]
    private var profileListenerTask: Task<Void, Never>?

    /// Cached paywall and products for purchase lookups
    private var cachedPaywall: AdaptyPaywallProtocol?
    private var cachedProducts: [AdaptyProductProtocol] = []

    /// Create an Adapty client with optional environment override for testing
    public init(environment: AdaptyEnvironment? = nil) {
        self.environment = environment ?? Self.liveEnvironment()
        self.currentPaymentsState = PaymentsState(isSubscribed: false)
    }

    deinit {
        profileListenerTask?.cancel()
        lock.withLock {
            stateContinuations.values.forEach { $0.finish() }
            stateContinuations.removeAll()
        }
    }

    // MARK: - PaymentsClient

    public func configure(_ config: PaymentsConfig) {
        lock.lock()

        if let existingConfig = self.config, existingConfig == config {
            lock.unlock()
            AppLogger.debug("Payments already configured", category: AppLogger.payments)
            return
        }

        self.config = config
        lock.unlock()

        let maskedKey = maskIdentifier(config.apiKey)
        AppLogger.info("Configuring Adapty with key: \(maskedKey)", category: AppLogger.payments)

        // Launch async activation
        Task {
            do {
                try await environment.purchases.activate(apiKey: config.apiKey)
                startProfileListener(accessLevelID: config.entitlementID)

                // Fetch initial profile
                let profile = try await environment.purchases.getProfile()
                let newState = AdaptyMappers.mapToState(profile: profile, accessLevelID: config.entitlementID)
                emitState(newState)
            } catch {
                AppLogger.error("Failed to activate Adapty: \(error)", category: AppLogger.payments)
            }
        }
    }

    public func states() -> AsyncStream<PaymentsState> {
        AsyncStream { continuation in
            let id = UUID()

            lock.withLock {
                stateContinuations[id] = continuation
                continuation.yield(currentPaymentsState)
            }

            continuation.onTermination = { [weak self] _ in
                _ = self?.lock.withLock {
                    self?.stateContinuations.removeValue(forKey: id)
                }
            }
        }
    }

    public func currentState() async -> PaymentsState {
        lock.withLock {
            currentPaymentsState
        }
    }

    public func purchase(productID: String) async throws {
        guard let config = config else {
            throw PaymentsError.notConfigured
        }

        let maskedID = maskIdentifier(productID)
        AppLogger.info("Purchasing product: \(maskedID)", category: AppLogger.payments)

        // Find product in cache
        guard let product = cachedProducts.first(where: { $0.vendorProductId == productID }) else {
            // Try fetching products if cache is empty
            try await fetchAndCacheProducts()
            guard let product = cachedProducts.first(where: { $0.vendorProductId == productID }) else {
                throw PaymentsError.server(message: "Product not found: \(productID)")
            }
            try await executePurchase(product: product, config: config)
            return
        }

        try await executePurchase(product: product, config: config)
    }

    @discardableResult
    public func restore() async throws -> PaymentsState {
        guard let config = config else {
            throw PaymentsError.notConfigured
        }

        AppLogger.info("Restoring purchases", category: AppLogger.payments)

        do {
            let profile = try await environment.purchases.restorePurchases()
            AppLogger.info("Restore successful", category: AppLogger.payments)

            let newState = AdaptyMappers.mapToState(profile: profile, accessLevelID: config.entitlementID)
            emitState(newState)
            return newState
        } catch is CancellationError {
            throw PaymentsError.cancelled
        } catch {
            let paymentsError = AdaptyMappers.mapError(error)
            AppLogger.error("Restore failed: \(paymentsError)", category: AppLogger.payments)
            throw paymentsError
        }
    }

    public func prefetchOfferings() async {
        do {
            try await fetchAndCacheProducts()
            let count = cachedProducts.count
            AppLogger.debug("Prefetched \(count) products", category: AppLogger.payments)
        } catch {
            AppLogger.debug("Failed to prefetch offerings: \(error)", category: AppLogger.payments)
        }
    }

    public func getOfferings() async throws -> [PaymentsOffering] {
        guard config != nil else {
            throw PaymentsError.notConfigured
        }

        AppLogger.debug("Fetching product offerings", category: AppLogger.payments)

        do {
            try await fetchAndCacheProducts()
            let mapped = cachedProducts.map { AdaptyMappers.mapToOffering($0) }
            AppLogger.debug("Fetched \(mapped.count) offerings", category: AppLogger.payments)
            return mapped
        } catch {
            let paymentsError = AdaptyMappers.mapError(error)
            AppLogger.error("Failed to fetch offerings: \(paymentsError)", category: AppLogger.payments)
            throw paymentsError
        }
    }

    public func getOfferings(forPlacement placementID: String) async throws -> [PaymentsOffering] {
        guard config != nil else {
            throw PaymentsError.notConfigured
        }

        AppLogger.debug("Fetching offerings for placement: \(placementID)", category: AppLogger.payments)

        do {
            let paywall = try await environment.purchases.getPaywall(placementID: placementID)
            let products = try await environment.purchases.getPaywallProducts(paywall: paywall)

            // Cache for purchase lookups
            cachedPaywall = paywall
            cachedProducts = products

            let mapped = products.map { AdaptyMappers.mapToOffering($0) }
            AppLogger.debug("Fetched \(mapped.count) offerings for placement \(placementID)", category: AppLogger.payments)
            return mapped
        } catch {
            let paymentsError = AdaptyMappers.mapError(error)
            AppLogger.error("Failed to fetch offerings for placement \(placementID): \(paymentsError)", category: AppLogger.payments)
            throw paymentsError
        }
    }

    @discardableResult
    public func logIn(userID: String, email: String? = nil, name: String? = nil) async throws -> PaymentsState {
        guard let config = config else {
            throw PaymentsError.notConfigured
        }

        AppLogger.info("Logging in user for subscription sync", category: AppLogger.payments)

        do {
            try await environment.purchases.identify(userId: userID)

            // Sync email/name to Adapty profile so they appear in the dashboard
            if email != nil || name != nil {
                try? await environment.purchases.updateProfile(email: email, firstName: name)
            }

            let profile = try await environment.purchases.getProfile()
            let newState = AdaptyMappers.mapToState(profile: profile, accessLevelID: config.entitlementID)
            emitState(newState)
            return newState
        } catch {
            let paymentsError = AdaptyMappers.mapError(error)
            AppLogger.error("LogIn failed: \(paymentsError)", category: AppLogger.payments)
            throw paymentsError
        }
    }

    @discardableResult
    public func logOut() async throws -> PaymentsState {
        guard let config = config else {
            throw PaymentsError.notConfigured
        }

        AppLogger.info("Logging out user from subscription service", category: AppLogger.payments)

        do {
            try await environment.purchases.logout()
            let profile = try await environment.purchases.getProfile()
            let newState = AdaptyMappers.mapToState(profile: profile, accessLevelID: config.entitlementID)
            emitState(newState)
            return newState
        } catch {
            let paymentsError = AdaptyMappers.mapError(error)
            AppLogger.error("LogOut failed: \(paymentsError)", category: AppLogger.payments)
            throw paymentsError
        }
    }

    // MARK: - Private Helpers

    private func executePurchase(product: AdaptyProductProtocol, config: PaymentsConfig) async throws {
        do {
            let result = try await environment.purchases.makePurchase(product: product)

            switch result {
            case .success(let profile):
                AppLogger.info("Purchase successful", category: AppLogger.payments)
                let newState = AdaptyMappers.mapToState(profile: profile, accessLevelID: config.entitlementID)
                emitState(newState)

                // Fire revenue event to PostHog — must hop to MainActor as PaymentsEventTracker is @MainActor
                let amount = NSDecimalNumber(decimal: product.price).doubleValue
                let currency = product.currencyCode ?? "USD"
                let productID = product.vendorProductId
                Task { @MainActor in
                    PaymentsEventTracker.revenue(currency: currency, amount: amount, productID: productID)
                }

            case .userCancelled:
                AppLogger.info("Purchase cancelled by user", category: AppLogger.payments)
                throw PaymentsError.cancelled

            case .pending:
                AppLogger.info("Purchase pending approval", category: AppLogger.payments)
                throw PaymentsError.server(message: "Purchase is pending approval.")
            }
        } catch let error as PaymentsError {
            throw error
        } catch is CancellationError {
            throw PaymentsError.cancelled
        } catch {
            let paymentsError = AdaptyMappers.mapError(error)
            AppLogger.error("Purchase failed: \(paymentsError)", category: AppLogger.payments)
            throw paymentsError
        }
    }

    private func fetchAndCacheProducts() async throws {
        guard let config = config else { return }
        let placementID = config.placementID

        let paywall = try await environment.purchases.getPaywall(placementID: placementID)
        cachedPaywall = paywall

        let products = try await environment.purchases.getPaywallProducts(paywall: paywall)
        cachedProducts = products
    }

    private func startProfileListener(accessLevelID: String) {
        profileListenerTask?.cancel()

        profileListenerTask = Task {
            let stream = environment.purchases.profileUpdates()

            for await profile in stream {
                guard !Task.isCancelled else { break }
                let newState = AdaptyMappers.mapToState(profile: profile, accessLevelID: accessLevelID)
                emitState(newState)
            }
        }
    }

    private func emitState(_ newState: PaymentsState) {
        lock.withLock {
            guard newState != currentPaymentsState else { return }

            currentPaymentsState = newState

            AppLogger.info("Subscription state updated: subscribed=\(newState.isSubscribed)", category: AppLogger.payments)

            for continuation in stateContinuations.values {
                continuation.yield(newState)
            }
        }
    }

    private func maskIdentifier(_ id: String) -> String {
        guard id.count > 4 else { return "***" }
        let prefix = id.prefix(2)
        let suffix = id.suffix(2)
        return "\(prefix)***\(suffix)"
    }

    // MARK: - Live Environment

    @available(iOS 17.0, *)
    private static func liveEnvironment() -> AdaptyEnvironment {
        let liveAdapter = LiveAdaptyAdapter()
        return AdaptyEnvironment(purchases: liveAdapter)
    }
}
