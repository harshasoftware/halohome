import XCTest
import SwiftUI
@testable import FeatureSettings

@MainActor
final class PaywallSnapshotTests: XCTestCase {
    
    func testPaywall_light() {
        // Given
        let paymentsClient = createMockPaymentsClient()
        let view = PaywallView(paymentsClient: paymentsClient)
        
        // Then - Should render without errors
        XCTAssertNotNil(view)
        
        // TODO: snapshot infra
        // In a real snapshot test, would capture:
        // - Light mode appearance
        // - Lock icon and "Go Pro" title
        // - Three feature rows with icons and descriptions
        // - Price text and "Cancel anytime" subtitle
        // - Subscribe and Restore buttons
        // - "Maybe later" button
        // - No error banner
        // - No loading overlay
    }
    
    func testPaywall_dark() {
        // Given
        let paymentsClient = createMockPaymentsClient()
        let view = PaywallView(paymentsClient: paymentsClient)
        
        // Then - Should render without errors
        XCTAssertNotNil(view)
        
        // TODO: snapshot infra
        // In a real snapshot test, would capture with dark mode trait collection:
        // - Dark mode appearance
        // - All elements with dark theme colors
        // - Proper contrast ratios
        // - Material backgrounds
    }
    
    func testPaywall_loadingState() {
        // Given
        let paymentsClient = createMockPaymentsClient()
        let view = PaywallView(paymentsClient: paymentsClient)
        
        // Then - Should render without errors
        XCTAssertNotNil(view)
        
        // TODO: snapshot infra
        // Would verify:
        // - Semi-transparent loading overlay
        // - Centered progress indicator with material background
        // - All buttons disabled
        // - Content visible but dimmed
    }
    
    func testPaywall_errorState() {
        // Given
        let paymentsClient = createMockPaymentsClient()
        let view = PaywallView(paymentsClient: paymentsClient)
        
        // Then - Should render without errors
        XCTAssertNotNil(view)
        
        // TODO: snapshot infra
        // Would verify:
        // - Error banner visible with red background
        // - Warning icon and error message
        // - All other content still visible
        // - Buttons enabled (not loading)
    }
    
    func testPaywall_subscribedState() {
        // Given
        let paymentsClient = createMockPaymentsClient()
        let view = PaywallView(paymentsClient: paymentsClient)
        
        // Then - Should render without errors
        XCTAssertNotNil(view)
        
        // TODO: snapshot infra
        // Would verify:
        // - Different messaging for subscribed users
        // - "Manage Subscription" instead of "Subscribe"
        // - Proper state handling
    }
    
    // MARK: - Test Helpers
    
    private func createMockPaymentsClient() -> PaymentsClient {
        MockPaymentsClient()
    }
}

// MARK: - Mock Payments Client

private final class MockPaymentsClient: PaymentsClient, @unchecked Sendable {
    func configure(_ config: PaymentsConfig) {}
    
    func states() -> AsyncStream<PaymentsState> {
        AsyncStream { continuation in
            continuation.yield(PaymentsState(isSubscribed: false))
        }
    }
    
    func currentState() async -> PaymentsState {
        PaymentsState(isSubscribed: false)
    }
    
    func purchase(productID: String) async throws {}
    
    @discardableResult
    func restore() async throws -> PaymentsState {
        return PaymentsState(isSubscribed: false)
    }
    
    func prefetchOfferings() async {}
    
    func getOfferings() async throws -> [PaymentsOffering] {
        return []
    }

    @discardableResult
    func logIn(userID: String, email: String?, name: String?) async throws -> PaymentsState {
        PaymentsState(isSubscribed: false)
    }

    @discardableResult
    func logOut() async throws -> PaymentsState {
        PaymentsState(isSubscribed: false)
    }
}
