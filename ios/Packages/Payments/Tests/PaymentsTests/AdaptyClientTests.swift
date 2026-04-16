import XCTest
@testable import Payments

final class AdaptyClientTests: XCTestCase {

    private var client: AdaptyClient!
    private var fakePurchases: FakeAdaptyPurchases!
    private var config: PaymentsConfig!

    override func setUp() {
        super.setUp()

        fakePurchases = FakeAdaptyPurchases()
        let environment = AdaptyEnvironment(purchases: fakePurchases)
        client = AdaptyClient(environment: environment)

        config = PaymentsConfig(
            apiKey: "test_api_key",
            entitlementID: "premium"
        )
    }

    override func tearDown() {
        fakePurchases.reset()
        client = nil
        super.tearDown()
    }

    func testConfigureEmitsInitialState() async {
        // Given
        let expectation = XCTestExpectation(description: "Initial state emitted")

        // When
        client.configure(config)

        let states = client.states()
        var iterator = states.makeAsyncIterator()

        // Then
        if let firstState = await iterator.next() {
            XCTAssertFalse(firstState.isSubscribed)
            XCTAssertTrue(firstState.activeEntitlementIDs.isEmpty)
            expectation.fulfill()
        }

        await fulfillment(of: [expectation], timeout: 1.0)
    }

    func testIdempotentConfigure() async throws {
        // Given
        client.configure(config)

        // Wait for async activation to complete
        try await Task.sleep(nanoseconds: 100_000_000)

        // When - Configure again with same config
        client.configure(config)

        // Then - Should not reconfigure (activate was called once)
        XCTAssertTrue(fakePurchases.isActivated)
    }

    func testPurchaseUpdatesStateImmediately() async throws {
        // Given
        client.configure(config)

        actor StateCollector {
            var states: [PaymentsState] = []

            func append(_ state: PaymentsState) {
                states.append(state)
            }

            func getStates() -> [PaymentsState] {
                states
            }

            func count() -> Int {
                states.count
            }
        }

        let collector = StateCollector()
        let expectation = XCTestExpectation(description: "State updated after purchase")
        expectation.expectedFulfillmentCount = 2 // Initial + after purchase

        let statesStream = client.states()
        let task = Task { @Sendable in
            for await state in statesStream {
                await collector.append(state)
                expectation.fulfill()
                if await collector.count() >= 2 {
                    break
                }
            }
        }

        // Small delay to ensure subscription is active
        try await Task.sleep(nanoseconds: 100_000_000)

        // When
        try await client.purchase(productID: "com.cartostar.pro.monthly")

        // Then
        await fulfillment(of: [expectation], timeout: 2.0)
        task.cancel()

        let collectedStates = await collector.getStates()
        XCTAssertEqual(collectedStates.count, 2)
        XCTAssertFalse(collectedStates[0].isSubscribed) // Initial
        XCTAssertTrue(collectedStates[1].isSubscribed) // After purchase
        XCTAssertTrue(collectedStates[1].activeEntitlementIDs.contains("premium"))
    }

    func testRestoreUpdatesState() async throws {
        // Given
        client.configure(config)
        fakePurchases.activeAccessLevels = ["premium"]

        // Wait for activation
        try await Task.sleep(nanoseconds: 100_000_000)

        // When
        try await client.restore()

        // Then - State should update immediately
        let state = await client.currentState()
        XCTAssertTrue(state.isSubscribed)
        XCTAssertTrue(state.activeEntitlementIDs.contains("premium"))
    }

    func testMultipleSubscribersReceiveUpdates() async throws {
        // Given
        client.configure(config)

        actor StateCollector {
            var states: [PaymentsState] = []

            func append(_ state: PaymentsState) {
                states.append(state)
            }

            func getStates() -> [PaymentsState] {
                states
            }

            func count() -> Int {
                states.count
            }
        }

        let collector1 = StateCollector()
        let collector2 = StateCollector()

        let exp1 = XCTestExpectation(description: "Subscriber 1")
        let exp2 = XCTestExpectation(description: "Subscriber 2")
        exp1.expectedFulfillmentCount = 2
        exp2.expectedFulfillmentCount = 2

        let statesStream1 = client.states()
        let task1 = Task { @Sendable in
            for await state in statesStream1 {
                await collector1.append(state)
                exp1.fulfill()
                if await collector1.count() >= 2 { break }
            }
        }

        let statesStream2 = client.states()
        let task2 = Task { @Sendable in
            for await state in statesStream2 {
                await collector2.append(state)
                exp2.fulfill()
                if await collector2.count() >= 2 { break }
            }
        }

        try await Task.sleep(nanoseconds: 100_000_000)

        // Trigger state change
        try await client.purchase(productID: "com.cartostar.pro.monthly")

        // Then - Both subscribers should receive updates
        await fulfillment(of: [exp1, exp2], timeout: 2.0)
        task1.cancel()
        task2.cancel()

        let subscriber1States = await collector1.getStates()
        let subscriber2States = await collector2.getStates()

        XCTAssertEqual(subscriber1States.count, 2)
        XCTAssertEqual(subscriber2States.count, 2)
        XCTAssertTrue(subscriber1States[1].isSubscribed)
        XCTAssertTrue(subscriber2States[1].isSubscribed)
    }

    func testPurchaseCancellationThrowsCancelled() async throws {
        // Given
        client.configure(config)
        fakePurchases.shouldThrowOnPurchase = true // Returns .userCancelled

        // Wait for activation
        try await Task.sleep(nanoseconds: 100_000_000)

        // When/Then
        do {
            try await client.purchase(productID: "com.cartostar.pro.monthly")
            XCTFail("Should have thrown")
        } catch let error as PaymentsError {
            XCTAssertEqual(error, .cancelled)
        }
    }

    func testPurchaseWithoutConfigureThrows() async throws {
        // Given - No configure call

        // When/Then
        do {
            try await client.purchase(productID: "com.cartostar.pro.monthly")
            XCTFail("Should have thrown")
        } catch let error as PaymentsError {
            XCTAssertEqual(error, .notConfigured)
        }
    }

    func testCurrentStateReturnsLatest() async {
        // Given
        client.configure(config)

        // When
        let state = await client.currentState()

        // Then
        XCTAssertFalse(state.isSubscribed)
        XCTAssertTrue(state.activeEntitlementIDs.isEmpty)
    }

    func testPrefetchOfferingsDoesNotThrow() async {
        // Given
        client.configure(config)

        // Wait for activation
        try? await Task.sleep(nanoseconds: 100_000_000)

        // When/Then - Should not throw
        await client.prefetchOfferings()
    }
}
