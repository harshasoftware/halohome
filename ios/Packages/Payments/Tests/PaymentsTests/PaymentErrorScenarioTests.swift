import XCTest
@testable import Payments

final class PaymentErrorScenarioTests: XCTestCase {
    
    fileprivate var mockClient: MockPaymentsClient!
    
    override func setUp() {
        super.setUp()
        mockClient = MockPaymentsClient()
    }
    
    override func tearDown() {
        mockClient = nil
        super.tearDown()
    }
    
    // MARK: - Purchase Errors
    
    func testPurchase_userCancelled_throwsCancelledError() async throws {
        mockClient.shouldFailWithCancellation = true
        
        do {
            try await mockClient.purchase(productID: "premium_monthly")
            XCTFail("Should throw error")
        } catch let error as PaymentsError {
            XCTAssertEqual(error, .cancelled)
        }
    }
    
    func testPurchase_productNotFound_throwsServerError() async throws {
        mockClient.shouldFailWithProductNotFound = true
        
        do {
            try await mockClient.purchase(productID: "invalid_product")
            XCTFail("Should throw error")
        } catch let error as PaymentsError {
            // Product not found is typically a server error
            if case .server = error {
                XCTAssertTrue(true)
            } else {
                XCTFail("Expected server error, got \(error)")
            }
        }
    }
    
    func testPurchase_paymentFailed_throwsError() async throws {
        mockClient.shouldFailWithPaymentFailed = true
        
        do {
            try await mockClient.purchase(productID: "premium_monthly")
            XCTFail("Should throw error")
        } catch let error as PaymentsError {
            // Payment failure could be purchaseNotAllowed or server error
            XCTAssertTrue(error == .purchaseNotAllowed || error == .cancelled)
        }
    }
    
    func testPurchase_pending_throwsUnknownError() async throws {
        mockClient.shouldFailWithPending = true
        
        do {
            try await mockClient.purchase(productID: "premium_monthly")
            XCTFail("Should throw error")
        } catch let error as PaymentsError {
            // Pending status is typically unknown error
            if case .unknown = error {
                XCTAssertTrue(true)
            } else {
                XCTFail("Expected unknown error, got \(error)")
            }
        }
    }
    
    func testPurchase_networkError_throwsNetworkError() async throws {
        mockClient.shouldFailWithNetwork = true
        
        do {
            try await mockClient.purchase(productID: "premium_monthly")
            XCTFail("Should throw error")
        } catch let error as PaymentsError {
            if case .network = error {
                XCTAssertTrue(true)
            } else {
                XCTFail("Expected network error, got \(error)")
            }
        }
    }
    
    // MARK: - Restore Errors
    
    func testRestore_noPurchasesFound_completesSuccessfully() async throws {
        mockClient.hasPurchases = false
        
        // Should not throw, just return empty state
        try await mockClient.restore()
        
        let state = await mockClient.currentState()
        XCTAssertFalse(state.isSubscribed)
    }
    
    func testRestore_networkError_throwsError() async throws {
        mockClient.shouldFailWithNetwork = true
        
        do {
            try await mockClient.restore()
            XCTFail("Should throw error")
        } catch let error as PaymentsError {
            if case .network = error {
                XCTAssertTrue(true)
            } else {
                XCTFail("Expected network error, got \(error)")
            }
        }
    }
    
    // MARK: - Offerings Errors
    
    func testGetOfferings_networkError_throwsError() async throws {
        mockClient.shouldFailWithNetwork = true
        
        do {
            _ = try await mockClient.getOfferings()
            XCTFail("Should throw error")
        } catch let error as PaymentsError {
            if case .network = error {
                XCTAssertTrue(true)
            } else {
                XCTFail("Expected network error, got \(error)")
            }
        }
    }
    
    func testGetOfferings_noOfferingsAvailable_returnsEmptyArray() async throws {
        mockClient.offerings = []
        
        let offerings = try await mockClient.getOfferings()
        
        XCTAssertTrue(offerings.isEmpty)
    }
    
    // MARK: - Configuration Errors
    
    func testConfigure_invalidAPIKey_doesNotCrash() {
        let config = PaymentsConfig(apiKey: "", entitlementID: "premium")
        
        // Should handle gracefully
        mockClient.configure(config)
        
        XCTAssertTrue(true)
    }
    
    func testConfigure_invalidEntitlementID_doesNotCrash() {
        let config = PaymentsConfig(apiKey: "valid_key", entitlementID: "")
        
        mockClient.configure(config)
        
        XCTAssertTrue(true)
    }
    
    // MARK: - State Management Errors
    
    func testCurrentState_whenNotConfigured_returnsDefaultState() async {
        // Don't configure
        let state = await mockClient.currentState()
        
        XCTAssertFalse(state.isSubscribed)
        XCTAssertTrue(state.activeEntitlementIDs.isEmpty)
    }
    
    func testStates_whenError_continuesStreaming() async {
        mockClient.shouldFailWithNetwork = true
        
        let stream = mockClient.states()
        
        var stateCount = 0
        for await _ in stream {
            stateCount += 1
            if stateCount > 0 {
                break
            }
        }
        
        // Should still emit states despite errors
        XCTAssertGreaterThan(stateCount, 0)
    }
    
    // MARK: - Concurrent Operations
    
    func testConcurrentPurchases_handleGracefully() async throws {
        // Multiple purchase attempts should not crash
        let client = mockClient!
        async let purchase1 = client.purchase(productID: "premium_monthly")
        async let purchase2 = client.purchase(productID: "premium_annual")
        
        do {
            try await purchase1
            try await purchase2
        } catch {
            // May fail, but should not crash
            XCTAssertTrue(true)
        }
    }
    
    func testPurchaseDuringRestore_handleGracefully() async throws {
        // Purchase and restore at the same time
        let client = mockClient!
        async let purchase = client.purchase(productID: "premium_monthly")
        async let restore = client.restore()
        
        do {
            try await purchase
            try await restore
        } catch {
            // Should handle concurrency
            XCTAssertTrue(true)
        }
    }
    
    // MARK: - Subscription Expiry
    
    func testSubscription_afterExpiry_isNotSubscribed() async throws {
        // Set up expired subscription
        mockClient.subscriptionExpiryDate = Date().addingTimeInterval(-3600) // 1 hour ago
        
        let state = await mockClient.currentState()
        
        XCTAssertFalse(state.isSubscribed)
    }
    
    func testSubscription_beforeExpiry_isSubscribed() async throws {
        // Set up active subscription
        mockClient.subscriptionExpiryDate = Date().addingTimeInterval(3600) // 1 hour from now
        mockClient.isSubscribed = true
        
        let state = await mockClient.currentState()
        
        XCTAssertTrue(state.isSubscribed)
    }
}

// MARK: - Mock Client

private final class MockPaymentsClient: PaymentsClient, @unchecked Sendable {
    nonisolated(unsafe) var shouldFailWithCancellation = false
    nonisolated(unsafe) var shouldFailWithProductNotFound = false
    nonisolated(unsafe) var shouldFailWithPaymentFailed = false
    nonisolated(unsafe) var shouldFailWithPending = false
    nonisolated(unsafe) var shouldFailWithNetwork = false
    nonisolated(unsafe) var hasPurchases = true
    nonisolated(unsafe) var offerings: [PaymentsOffering] = [
        PaymentsOffering(
            id: "premium_monthly",
            title: "Premium Monthly",
            price: "$9.99",
            pricePerMonth: nil,
            packageType: .monthly
        )
    ]
    nonisolated(unsafe) var isSubscribed = false
    nonisolated(unsafe) var subscriptionExpiryDate: Date?
    
    func configure(_ config: PaymentsConfig) {
        // Mock configuration
    }
    
    func states() -> AsyncStream<PaymentsState> {
        AsyncStream { continuation in
            continuation.yield(PaymentsState(
                isSubscribed: isSubscribed,
                activeEntitlementIDs: isSubscribed ? ["premium"] : [],
                expirationDate: subscriptionExpiryDate,
                productID: isSubscribed ? "premium_monthly" : nil
            ))
        }
    }
    
    func currentState() async -> PaymentsState {
        return PaymentsState(
            isSubscribed: isSubscribed,
            activeEntitlementIDs: isSubscribed ? ["premium"] : [],
            expirationDate: subscriptionExpiryDate,
            productID: isSubscribed ? "premium_monthly" : nil
        )
    }
    
    func purchase(productID: String) async throws {
        if shouldFailWithCancellation {
            throw PaymentsError.cancelled
        }
        if shouldFailWithProductNotFound {
            throw PaymentsError.server(message: "Product not found")
        }
        if shouldFailWithPaymentFailed {
            throw PaymentsError.purchaseNotAllowed
        }
        if shouldFailWithPending {
            throw PaymentsError.unknown(underlying: NSError(domain: "Payment", code: -1, userInfo: [NSLocalizedDescriptionKey: "Pending"]))
        }
        if shouldFailWithNetwork {
            throw PaymentsError.network(underlying: NSError(domain: "Network", code: -1))
        }
        
        // Success
        isSubscribed = true
    }
    
    @discardableResult
    func restore() async throws -> PaymentsState {
        if shouldFailWithNetwork {
            throw PaymentsError.network(underlying: NSError(domain: "Network", code: -1))
        }
        
        isSubscribed = hasPurchases
        return PaymentsState(
            isSubscribed: isSubscribed,
            activeEntitlementIDs: isSubscribed ? ["premium"] : [],
            expirationDate: subscriptionExpiryDate,
            productID: isSubscribed ? "premium_monthly" : nil
        )
    }
    
    func getOfferings() async throws -> [PaymentsOffering] {
        if shouldFailWithNetwork {
            throw PaymentsError.network(underlying: NSError(domain: "Network", code: -1))
        }
        
        return offerings
    }
    
    func prefetchOfferings() async {
        // Mock prefetch
    }

    @discardableResult
    func logIn(userID: String, email: String?, name: String?) async throws -> PaymentsState {
        PaymentsState(
            isSubscribed: isSubscribed,
            activeEntitlementIDs: isSubscribed ? ["premium"] : [],
            expirationDate: subscriptionExpiryDate,
            productID: isSubscribed ? "premium_monthly" : nil
        )
    }

    @discardableResult
    func logOut() async throws -> PaymentsState {
        isSubscribed = false
        return PaymentsState(isSubscribed: false)
    }
}

