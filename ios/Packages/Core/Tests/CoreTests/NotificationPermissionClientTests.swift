import XCTest
import UserNotifications
@testable import Core

/**
 * Unit tests for NotificationPermissionClient
 * 
 * These tests verify the notification permission flow including:
 * - Authorization request success and failure scenarios
 * - Settings opening functionality
 * - Error handling and mapping
 * - Mock client behavior
 */
final class NotificationPermissionClientTests: XCTestCase {
    
    var mockNotificationCenter: MockNotificationCenter!
    var client: TestableNotificationPermissionClient!
    
    override func setUp() {
        super.setUp()
        mockNotificationCenter = MockNotificationCenter()
        client = TestableNotificationPermissionClient(mockCenter: mockNotificationCenter)
    }
    
    override func tearDown() {
        client = nil
        mockNotificationCenter = nil
        super.tearDown()
    }
    
    // MARK: - Authorization Request Tests
    
    func testRequestAuthorization_Success() async throws {
        // Given
        mockNotificationCenter.shouldGrantAuthorization = true
        
        // When
        let result = try await client.requestAuthorization()
        
        // Then
        XCTAssertTrue(result)
        XCTAssertEqual(mockNotificationCenter.requestAuthorizationCallCount, 1)
    }
    
    func testRequestAuthorization_Denied() async throws {
        // Given
        mockNotificationCenter.shouldGrantAuthorization = false
        
        // When
        let result = try await client.requestAuthorization()
        
        // Then
        XCTAssertFalse(result)
        XCTAssertEqual(mockNotificationCenter.requestAuthorizationCallCount, 1)
    }
    
    func testRequestAuthorization_Error() async {
        // Given
        mockNotificationCenter.shouldThrowError = true
        mockNotificationCenter.errorToThrow = NSError(domain: "TestError", code: 123, userInfo: nil)
        
        // When & Then
        do {
            _ = try await client.requestAuthorization()
            XCTFail("Expected error to be thrown")
        } catch let error as AppError {
            // Use pattern matching for AppError with associated values
            if case .network(let code, let message) = error {
                XCTAssertEqual(code, -1)
                XCTAssertTrue(message?.contains("TestError") ?? false)
            } else {
                XCTFail("Expected network error, got \(error)")
            }
        } catch {
            XCTFail("Unexpected error type: \(error)")
        }
    }
    
    // MARK: - Mock Client Tests
    
    func testMockNotificationPermissionClient_Success() async throws {
        // Given
        let mockClient = MockNotificationPermissionClient()
        mockClient.shouldGrantAuthorization = true
        
        // When
        let result = try await mockClient.requestAuthorization()
        
        // Then
        XCTAssertTrue(result)
        XCTAssertEqual(mockClient.getAuthorizationRequestCount(), 1)
        XCTAssertEqual(mockClient.getSettingsOpenCount(), 0)
    }
    
    func testMockNotificationPermissionClient_Error() async {
        // Given
        let mockClient = MockNotificationPermissionClient()
        mockClient.shouldThrowError = true
        mockClient.errorToThrow = AppError.network(code: 456, message: "Mock network error")
        
        // When & Then
        do {
            _ = try await mockClient.requestAuthorization()
            XCTFail("Expected error to be thrown")
        } catch let error as AppError {
            XCTAssertEqual(error, AppError.network(code: 456, message: "Mock network error"))
        } catch {
            XCTFail("Unexpected error type: \(error)")
        }
        
        XCTAssertEqual(mockClient.getAuthorizationRequestCount(), 1)
    }
    
    func testMockNotificationPermissionClient_Reset() async throws {
        // Given
        let mockClient = MockNotificationPermissionClient()
        
        // When
        _ = try await mockClient.requestAuthorization()
        await mockClient.openSettings()
        mockClient.reset()
        
        // Then
        XCTAssertEqual(mockClient.getAuthorizationRequestCount(), 0)
        XCTAssertEqual(mockClient.getSettingsOpenCount(), 0)
        XCTAssertTrue(mockClient.shouldGrantAuthorization)
        XCTAssertFalse(mockClient.shouldThrowError)
    }
}

// MARK: - Test Double

/**
 * Testable wrapper for NotificationPermissionClient that uses mocks
 */
final class TestableNotificationPermissionClient: NotificationPermissionClient {
    private let mockCenter: MockNotificationCenter
    
    init(mockCenter: MockNotificationCenter) {
        self.mockCenter = mockCenter
    }
    
    func requestAuthorization() async throws -> Bool {
        try await withCheckedThrowingContinuation { continuation in
            mockCenter.requestAuthorization(options: [.alert, .badge, .sound]) { granted, error in
                if let error = error {
                    continuation.resume(throwing: AppError.network(code: -1, message: error.localizedDescription))
                } else {
                    continuation.resume(returning: granted)
                }
            }
        }
    }
    
    func openSettings() async {
        // No-op for tests
    }
}

/**
 * Mock implementation of notification center for testing
 */
final class MockNotificationCenter {
    var shouldGrantAuthorization = true
    var shouldThrowError = false
    var errorToThrow: Error = NSError(domain: "MockError", code: -1, userInfo: nil)
    var requestAuthorizationCallCount = 0
    
    func requestAuthorization(
        options: UNAuthorizationOptions,
        completionHandler: @escaping (Bool, Error?) -> Void
    ) {
        requestAuthorizationCallCount += 1
        
        if shouldThrowError {
            completionHandler(false, errorToThrow)
        } else {
            completionHandler(shouldGrantAuthorization, nil)
        }
    }
}
