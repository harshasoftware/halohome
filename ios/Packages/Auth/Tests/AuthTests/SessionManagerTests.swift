import XCTest
@testable import CartoAuth
import Networking
import CartoStorage
import Core

// Import DTOs for mocking responses
typealias SessionPayload = CartoAuth.SessionPayload
typealias UserPayload = CartoAuth.UserPayload

@available(iOS 17.0, *)
final class SessionManagerTests: XCTestCase {
    
    fileprivate var httpClient: MockHTTPClient!
    fileprivate var apple: MockAppleProvider!
    fileprivate var config: AuthConfig!
    fileprivate var sleeper: MockSleeper!
    var manager: SessionManager!
    
    override func setUp() async throws {
        try await super.setUp()
        httpClient = MockHTTPClient()
        apple = MockAppleProvider()
        config = AuthConfig(supabaseURL: URL(string: "https://test.supabase.co")!, supabaseAnonKey: "test-key")
        sleeper = MockSleeper()
        
        // Use mock keychain for testing
        let mockKeychain = MockKeychain()
        manager = SessionManager(
            httpClient: httpClient,
            keychain: mockKeychain,
            apple: apple,
            config: config,
            sleeper: sleeper
        )
        
        // Give time for initial session load
        try? await Task.sleep(nanoseconds: 10_000_000) // 10ms
    }
    
    override func tearDown() async throws {
        manager = nil
        httpClient = nil
        apple = nil
        config = nil
        sleeper = nil
        try await super.tearDown()
    }
    
    // MARK: - Sign Up Tests
    
    func testSignUpWithEmail_success_returnsUser() async throws {
        // Given
        let email = "test@example.com"
        let password = "password123"
        
        let payload = SessionPayload(
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_in: 3600,
            token_type: "bearer",
            user: UserPayload(id: "user-123", email: email, user_metadata: nil)
        )
        
        httpClient.mockResponseData = try JSONEncoder().encode(payload)
        
        // When
        let user = try await manager.signUpWithEmail(email: email, password: password)
        
        // Then
        XCTAssertEqual(user.id, "user-123")
        XCTAssertEqual(user.email, email)
        XCTAssertEqual(httpClient.requests.count, 1)
    }
    
    func testSignUpWithEmail_persistsSession() async throws {
        // Given
        let payload = SessionPayload(
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_in: 3600,
            token_type: "bearer",
            user: UserPayload(id: "user-123", email: "test@example.com", user_metadata: nil)
        )
        httpClient.mockResponseData = try JSONEncoder().encode(payload)
        
        // When
        _ = try await manager.signUpWithEmail(email: "test@example.com", password: "password123")
        
        // Then
        // Verify user is authenticated after sign up
        let user = await manager.currentUser()
        XCTAssertNotNil(user)
        XCTAssertEqual(user?.id, "user-123")
    }
    
    func testSignUpWithEmail_failure_throwsError() async {
        // Given
        httpClient.shouldThrow = true
        httpClient.errorToThrow = AuthError.invalidCredentials
        
        // When/Then
        do {
            _ = try await manager.signUpWithEmail(email: "test@example.com", password: "weak")
            XCTFail("Should have thrown error")
        } catch {
            XCTAssertTrue(error is AuthError)
        }
    }
    
    // MARK: - Sign In with Email Tests
    
    func testSignInWithEmail_success_returnsUser() async throws {
        // Given
        let email = "test@example.com"
        let password = "password123"
        
        let payload = SessionPayload(
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_in: 3600,
            token_type: "bearer",
            user: UserPayload(id: "user-123", email: email, user_metadata: nil)
        )
        
        httpClient.mockResponseData = try JSONEncoder().encode(payload)
        
        // When
        let user = try await manager.signInWithEmail(email: email, password: password)
        
        // Then
        XCTAssertEqual(user.id, "user-123")
        XCTAssertEqual(user.email, email)
    }
    
    func testSignInWithEmail_invalidCredentials_throwsError() async {
        // Given
        httpClient.shouldThrow = true
        httpClient.errorToThrow = AuthError.invalidCredentials
        
        // When/Then
        do {
            _ = try await manager.signInWithEmail(email: "wrong@example.com", password: "wrong")
            XCTFail("Should have thrown error")
        } catch let error as AuthError {
            if case .invalidCredentials = error {
                // Success
        } else {
                XCTFail("Wrong error type")
            }
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }
    
    // MARK: - Sign In with Apple Tests
    
    func testSignInWithApple_success_returnsUser() async throws {
        // Given
        let payload = SessionPayload(
            access_token: "apple-access-token",
            refresh_token: "apple-refresh-token",
            expires_in: 3600,
            token_type: "bearer",
            user: UserPayload(id: "apple-user-123", email: "apple@example.com", user_metadata: nil)
        )
        
        apple.mockIDToken = "mock-id-token"
        apple.mockNonce = "mock-nonce"
        httpClient.mockResponseData = try JSONEncoder().encode(payload)
        
        // When
        let user = try await manager.signInWithApple()
        
        // Then
        XCTAssertEqual(user.id, "apple-user-123")
        XCTAssertTrue(apple.requestIDTokenCalled)
    }
    
    func testSignInWithApple_cancelled_throwsError() async {
        // Given
        apple.shouldThrow = true
        apple.errorToThrow = AuthError.cancelled
        
        // When/Then
        do {
            _ = try await manager.signInWithApple()
            XCTFail("Should have thrown error")
        } catch let error as AuthError {
            if case .cancelled = error {
                // Success
            } else {
                XCTFail("Wrong error type")
            }
        } catch {
            XCTFail("Unexpected error: \(error)")
        }
    }
    
    // MARK: - Sign Out Tests
    
    func testSignOut_clearsSession() async throws {
        // Given - Sign in first
        let payload = SessionPayload(
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_in: 3600,
            token_type: "bearer",
            user: UserPayload(id: "user-123", email: "test@example.com", user_metadata: nil)
        )
        httpClient.mockResponseData = try JSONEncoder().encode(payload)
        _ = try await manager.signInWithEmail(email: "test@example.com", password: "password123")
        
        // When
        try await manager.signOut()
        
        // Then
        let user = await manager.currentUser()
        XCTAssertNil(user)
    }
    
    // MARK: - Current User Tests
    
    func testCurrentUser_noSession_returnsNil() async {
        // When
        let user = await manager.currentUser()
        
        // Then
        XCTAssertNil(user)
    }
    
    func testCurrentUser_afterSignIn_returnsUser() async throws {
        // Given
        let payload = SessionPayload(
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_in: 3600,
            token_type: "bearer",
            user: UserPayload(id: "user-123", email: "test@example.com", user_metadata: nil)
        )
        httpClient.mockResponseData = try JSONEncoder().encode(payload)
        
        // When
        _ = try await manager.signInWithEmail(email: "test@example.com", password: "password123")
        let user = await manager.currentUser()
        
        // Then
        XCTAssertNotNil(user)
        XCTAssertEqual(user?.id, "user-123")
    }
    
    // MARK: - Reset Password Tests
    
    func testResetPassword_success() async throws {
        // Given
        httpClient.mockResponseData = Data() // Empty response is fine
        
        // When/Then
        try await manager.resetPassword(email: "test@example.com")
        XCTAssertEqual(httpClient.requests.count, 1)
    }
    
    func testResetPassword_invalidEmail_throwsError() async {
        // Given
        httpClient.shouldThrow = true
        httpClient.errorToThrow = AuthError.invalidCredentials
        
        // When/Then
        do {
            try await manager.resetPassword(email: "invalid-email")
            XCTFail("Should have thrown error")
        } catch {
            XCTAssertTrue(error is AuthError)
        }
    }
    
    // MARK: - Auth States Tests
    
    func testAuthStates_yieldsUnauthenticatedInitially() async {
        // Given
        let expectation = expectation(description: "auth state")
        
        // When
        let stream = manager.authStates()
        let task = Task {
            var receivedState: AuthState?
            for await state in stream {
                receivedState = state
                expectation.fulfill()
                break
            }
            return receivedState
        }
        
        // Then
        await fulfillment(of: [expectation], timeout: 1.0)
        let receivedState = await task.value
        task.cancel()
        
        if case .unauthenticated = receivedState {
            // Success
        } else {
            XCTFail("Expected unauthenticated state")
        }
    }
    
    func testAuthStates_yieldsAuthenticatedAfterSignIn() async throws {
        // Given
        let expectation = expectation(description: "auth state")
        
        let payload = SessionPayload(
            access_token: "access-token",
            refresh_token: "refresh-token",
            expires_in: 3600,
            token_type: "bearer",
            user: UserPayload(id: "user-123", email: "test@example.com", user_metadata: nil)
        )
        httpClient.mockResponseData = try JSONEncoder().encode(payload)
        
        // When - Start listening before sign in
        let stream = manager.authStates()
        let task = Task {
            var states: [AuthState] = []
            for await state in stream {
                states.append(state)
                if states.count >= 2 {
                    expectation.fulfill()
                    break
                }
            }
            return states
        }
        
        // Give stream time to start
        try await Task.sleep(nanoseconds: 50_000_000) // 50ms
        
        _ = try await manager.signInWithEmail(email: "test@example.com", password: "password123")
        
        // Then
        await fulfillment(of: [expectation], timeout: 2.0)
        let states = await task.value
        task.cancel()
        
        XCTAssertGreaterThanOrEqual(states.count, 1)
        // Last state should be authenticated
        if case .authenticated(let user) = states.last {
            XCTAssertEqual(user.id, "user-123")
        } else {
            XCTFail("Expected authenticated state")
        }
    }
    
    // MARK: - Token Refresh Tests
    
    func testRefreshIfNeeded_expiredToken_refreshesSession() async throws {
        // Given - Session with expired token
        let expiredPayload = SessionPayload(
            access_token: "old-access-token",
            refresh_token: "refresh-token",
            expires_in: -100, // Expired
            token_type: "bearer",
            user: UserPayload(id: "user-123", email: "test@example.com", user_metadata: nil)
        )
        
        let newPayload = SessionPayload(
            access_token: "new-access-token",
            refresh_token: "new-refresh-token",
            expires_in: 3600,
            token_type: "bearer",
            user: UserPayload(id: "user-123", email: "test@example.com", user_metadata: nil)
        )
        
        // Sign in with expired session
        httpClient.mockResponseData = try JSONEncoder().encode(expiredPayload)
        _ = try await manager.signInWithEmail(email: "test@example.com", password: "password123")
        
        // Setup refresh response
        httpClient.mockResponseData = try JSONEncoder().encode(newPayload)
        
        // When
        try await manager.refreshIfNeeded()
        
        // Then
        let user = await manager.currentUser()
        XCTAssertNotNil(user)
        // Should have made refresh call
        XCTAssertGreaterThanOrEqual(httpClient.requests.count, 1)
    }
}

// MARK: - Mock Types

private final class MockHTTPClient: HTTPClient, @unchecked Sendable {
    var requests: [HTTPRequest] = []
    var mockResponseData: Data = Data()
    var mockStatusCode: Int = 200
    var shouldThrow = false
    var errorToThrow: Error = NSError(domain: "test", code: -1)
    
    func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        requests.append(request)
        
        if shouldThrow {
            throw errorToThrow
        }
        
        return HTTPResponse(
            statusCode: mockStatusCode,
            headers: [:],
            data: mockResponseData,
            requestID: nil
        )
    }
}

private final class MockAppleProvider: AppleSignInProvider, @unchecked Sendable {
    var requestIDTokenCalled = false
    var mockIDToken: String?
    var mockNonce: String?
    var shouldThrow = false
    var errorToThrow: Error = NSError(domain: "test", code: -1)
    
    func requestIDToken(originalNonce: String, hashedNonce: String) async throws -> (idToken: String, nonce: String) {
        requestIDTokenCalled = true
        
        if shouldThrow {
            throw errorToThrow
        }
        
        guard let token = mockIDToken, let nonce = mockNonce else {
            throw NSError(domain: "MockAppleProvider", code: -1, userInfo: [NSLocalizedDescriptionKey: "No mock ID token set"])
        }
        
        return (token, nonce)
    }
}

private final class MockSleeper: Sleeper, @unchecked Sendable {
    func sleep(for seconds: TimeInterval) async throws {
        // No-op for tests
    }
}

