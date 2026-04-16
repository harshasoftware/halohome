import XCTest
@testable import FeatureSettings
import Payments
import Core

@MainActor
final class PaywallViewModelTests: XCTestCase {
    
    private var viewModel: PaywallViewModel!
    private var mockPaymentsClient: MockPaymentsClient!
    
    override func setUp() {
        super.setUp()
        
        mockPaymentsClient = MockPaymentsClient()
        viewModel = PaywallViewModel(paymentsClient: mockPaymentsClient)
    }
    
    override func tearDown() {
        viewModel = nil
        mockPaymentsClient = nil
        super.tearDown()
    }
    
    // MARK: - Initialization Tests
    
    func testInitialState() {
        // Then
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isSubscribed)
        XCTAssertTrue(viewModel.offerings.isEmpty)
        XCTAssertNil(viewModel.selectedOffering)
    }
    
    // MARK: - Appear Tests
    
    func testAppear_loadsOfferingsSuccessfully() async {
        // Given
        let offerings = [
            PaymentsOffering(id: "monthly", title: "Monthly", price: "$9.99", packageType: .monthly),
            PaymentsOffering(id: "annual", title: "Annual", price: "$99.99", packageType: .annual)
        ]
        mockPaymentsClient.mockOfferings = offerings
        
        // When
        await viewModel.appear()
        
        // Then
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertEqual(viewModel.offerings.count, 2)
        XCTAssertEqual(viewModel.offerings[0].id, "monthly")
        XCTAssertEqual(viewModel.offerings[1].id, "annual")
    }
    
    func testAppear_selectsMonthlyOfferingByDefault() async {
        // Given
        let offerings = [
            PaymentsOffering(id: "annual", title: "Annual", price: "$99.99", packageType: .annual),
            PaymentsOffering(id: "monthly", title: "Monthly", price: "$9.99", packageType: .monthly)
        ]
        mockPaymentsClient.mockOfferings = offerings
        
        // When
        await viewModel.appear()
        
        // Then
        XCTAssertEqual(viewModel.selectedOffering?.id, "monthly")
        XCTAssertEqual(viewModel.selectedOffering?.packageType, .monthly)
    }
    
    func testAppear_selectsFirstOfferingIfNoMonthly() async {
        // Given
        let offerings = [
            PaymentsOffering(id: "annual", title: "Annual", price: "$99.99", packageType: .annual),
            PaymentsOffering(id: "lifetime", title: "Lifetime", price: "$199.99", packageType: .lifetime)
        ]
        mockPaymentsClient.mockOfferings = offerings
        
        // When
        await viewModel.appear()
        
        // Then
        XCTAssertEqual(viewModel.selectedOffering?.id, "annual")
    }
    
    func testAppear_loadsSubscriptionState() async {
        // Given
        mockPaymentsClient.isSubscribed = true
        
        // When
        await viewModel.appear()
        
        // Then
        XCTAssertTrue(viewModel.isSubscribed)
    }
    
    func testAppear_handlesOfferingsLoadError() async {
        // Given
        mockPaymentsClient.shouldFailGetOfferings = true
        
        // When
        await viewModel.appear()
        
        // Then
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertTrue(viewModel.offerings.isEmpty)
        XCTAssertNil(viewModel.selectedOffering)
    }
    
    func testAppear_observesPaymentStateChanges() async {
        // Given
        mockPaymentsClient.isSubscribed = false
        
        // When
        await viewModel.appear()
        
        // Then - Initial state
        XCTAssertFalse(viewModel.isSubscribed)
        
        // When - State changes
        mockPaymentsClient.isSubscribed = true
        mockPaymentsClient.emitStateChange()
        
        // Give stream time to process
        try? await Task.sleep(nanoseconds: 100_000_000) // 100ms
        
        // Then - State updated
        XCTAssertTrue(viewModel.isSubscribed)
    }
    
    // MARK: - Purchase Tests
    
    func testPurchase_success() async {
        // Given
        let offering = PaymentsOffering(id: "monthly", title: "Monthly", price: "$9.99", packageType: .monthly)
        viewModel.selectedOffering = offering
        
        // When
        await viewModel.purchase()
        
        // Then
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertEqual(mockPaymentsClient.lastPurchasedProductID, "monthly")
    }
    
    func testPurchase_noSelectedOffering_setsError() async {
        // Given
        viewModel.selectedOffering = nil
        
        // When
        await viewModel.purchase()
        
        // Then
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertEqual(viewModel.errorMessage, "Please select a subscription plan")
        XCTAssertNil(mockPaymentsClient.lastPurchasedProductID)
    }
    
    func testPurchase_failure_setsErrorMessage() async {
        // Given
        let offering = PaymentsOffering(id: "monthly", title: "Monthly", price: "$9.99", packageType: .monthly)
        viewModel.selectedOffering = offering
        mockPaymentsClient.shouldFailPurchase = true
        
        // When
        await viewModel.purchase()
        
        // Then
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.errorMessage)
    }
    
    func testPurchase_setsLoadingDuringOperation() async {
        // Given
        let offering = PaymentsOffering(id: "monthly", title: "Monthly", price: "$9.99", packageType: .monthly)
        viewModel.selectedOffering = offering
        mockPaymentsClient.purchaseDelay = 0.1
        
        // When
        let task = Task {
            await viewModel.purchase()
        }
        
        // Then - Loading is set during operation
        try? await Task.sleep(nanoseconds: 10_000_000) // 10ms
        XCTAssertTrue(viewModel.isLoading)
        
        await task.value
        XCTAssertFalse(viewModel.isLoading)
    }
    
    // MARK: - Select Offering Tests
    
    func testSelectOffering_updatesSelectedOffering() {
        // Given
        let offering = PaymentsOffering(id: "annual", title: "Annual", price: "$99.99", packageType: .annual)
        
        // When
        viewModel.selectOffering(offering)
        
        // Then
        XCTAssertEqual(viewModel.selectedOffering?.id, "annual")
        XCTAssertEqual(viewModel.selectedOffering?.title, "Annual")
        XCTAssertEqual(viewModel.selectedOffering?.price, "$99.99")
    }
    
    func testSelectOffering_canSwitchBetweenOfferings() {
        // Given
        let monthly = PaymentsOffering(id: "monthly", title: "Monthly", price: "$9.99", packageType: .monthly)
        let annual = PaymentsOffering(id: "annual", title: "Annual", price: "$99.99", packageType: .annual)
        
        // When
        viewModel.selectOffering(monthly)
        XCTAssertEqual(viewModel.selectedOffering?.id, "monthly")
        
        viewModel.selectOffering(annual)
        
        // Then
        XCTAssertEqual(viewModel.selectedOffering?.id, "annual")
    }
    
    // MARK: - Restore Tests
    
    func testRestore_success() async {
        // When
        await viewModel.restore()
        
        // Then
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertTrue(mockPaymentsClient.restoreCalled)
    }
    
    func testRestore_failure_setsErrorMessage() async {
        // Given
        mockPaymentsClient.shouldFailRestore = true
        
        // When
        await viewModel.restore()
        
        // Then
        XCTAssertFalse(viewModel.isLoading)
        XCTAssertNotNil(viewModel.errorMessage)
    }
    
    func testRestore_setsLoadingDuringOperation() async {
        // Given
        mockPaymentsClient.restoreDelay = 0.1
        
        // When
        let task = Task {
            await viewModel.restore()
        }
        
        // Then - Loading is set during operation
        try? await Task.sleep(nanoseconds: 10_000_000) // 10ms
        XCTAssertTrue(viewModel.isLoading)
        
        await task.value
        XCTAssertFalse(viewModel.isLoading)
    }
    
    // MARK: - Error Handling Tests
    
    func testAppear_clearsErrorMessage() async {
        // Given
        viewModel.errorMessage = "Previous error"
        
        // When
        await viewModel.appear()
        
        // Then
        XCTAssertNil(viewModel.errorMessage)
    }
    
    func testPurchase_clearsErrorMessage() async {
        // Given
        let offering = PaymentsOffering(id: "monthly", title: "Monthly", price: "$9.99", packageType: .monthly)
        viewModel.selectedOffering = offering
        viewModel.errorMessage = "Previous error"
        
        // When
        await viewModel.purchase()
        
        // Then
        XCTAssertNil(viewModel.errorMessage)
    }
    
    func testRestore_clearsErrorMessage() async {
        // Given
        viewModel.errorMessage = "Previous error"
        
        // When
        await viewModel.restore()
        
        // Then
        XCTAssertNil(viewModel.errorMessage)
    }
}

// MARK: - Mock Types

@MainActor
private final class MockPaymentsClient: PaymentsClient, @unchecked Sendable {
    var isSubscribed = false
    var mockOfferings: [PaymentsOffering] = []
    var shouldFailPurchase = false
    var shouldFailRestore = false
    var shouldFailGetOfferings = false
    var purchaseDelay: TimeInterval = 0
    var restoreDelay: TimeInterval = 0
    
    var lastPurchasedProductID: String?
    var restoreCalled = false
    
    private var stateContinuation: AsyncStream<PaymentsState>.Continuation?
    
    func configure(_ config: PaymentsConfig) {
        // No-op for tests
    }
    
    func states() -> AsyncStream<PaymentsState> {
        AsyncStream { continuation in
            self.stateContinuation = continuation
            continuation.yield(PaymentsState(isSubscribed: self.isSubscribed))
        }
    }
    
    func emitStateChange() {
        stateContinuation?.yield(PaymentsState(isSubscribed: isSubscribed))
    }
    
    func currentState() async -> PaymentsState {
        PaymentsState(isSubscribed: isSubscribed)
    }
    
    func purchase(productID: String) async throws {
        if purchaseDelay > 0 {
            try await Task.sleep(nanoseconds: UInt64(purchaseDelay * 1_000_000_000))
        }
        
        if shouldFailPurchase {
            throw PaymentsError.cancelled
        }
        
        lastPurchasedProductID = productID
        isSubscribed = true
    }
    
    @discardableResult
    func restore() async throws -> PaymentsState {
        if restoreDelay > 0 {
            try await Task.sleep(nanoseconds: UInt64(restoreDelay * 1_000_000_000))
        }
        
        if shouldFailRestore {
            throw PaymentsError.network(underlying: NSError(domain: "Test", code: -1))
        }
        
        restoreCalled = true
        return PaymentsState(isSubscribed: isSubscribed)
    }
    
    func prefetchOfferings() async {
        // No-op for tests
    }
    
    func getOfferings() async throws -> [PaymentsOffering] {
        if shouldFailGetOfferings {
            throw PaymentsError.network(underlying: NSError(domain: "Test", code: -1))
        }

        return mockOfferings
    }

    @discardableResult
    func logIn(userID: String, email: String?, name: String?) async throws -> PaymentsState {
        PaymentsState(isSubscribed: isSubscribed)
    }

    @discardableResult
    func logOut() async throws -> PaymentsState {
        isSubscribed = false
        return PaymentsState(isSubscribed: false)
    }
}

