import XCTest
@testable import CartoAuth
import CartoStorage

@available(iOS 17.0, *)
final class SupabaseAuthAPITests: XCTestCase {
    
    private var api: SupabaseAuthAPI!
    private var httpClient: SupabaseHTTPClient!
    private var config: AuthConfig!
    private var session: URLSession!
    
    override func setUp() {
        super.setUp()
        
        config = AuthConfig(
            supabaseURL: URL(string: "https://test.supabase.co")!,
            supabaseAnonKey: "test-anon-key"
        )
        
        let configuration = URLSessionConfiguration.ephemeral
        configuration.protocolClasses = [URLProtocolStub.self]
        session = URLSession(configuration: configuration)
        
        httpClient = SupabaseHTTPClient(baseURL: config.supabaseURL, session: session)
        api = SupabaseAuthAPI(httpClient: httpClient, config: config)
        
        URLProtocolStub.reset()
    }
    
    override func tearDown() {
        URLProtocolStub.reset()
        super.tearDown()
    }
    
    func testExchangeAppleIDTokenSuccess() async throws {
        // Given
        let responseJSON = """
        {
            "access_token": "access-token-123",
            "refresh_token": "refresh-token-456",
            "expires_in": 3600,
            "token_type": "bearer",
            "user": {
                "id": "user-123",
                "email": "test@example.com",
                "user_metadata": {
                    "full_name": "Test User",
                    "avatar_url": "https://example.com/avatar.png"
                }
            }
        }
        """
        
        // Stub both possible query parameter orderings (dictionary order is not guaranteed)
        let url1 = "https://test.supabase.co/auth/v1/token?grant_type=id_token&provider=apple"
        let url2 = "https://test.supabase.co/auth/v1/token?provider=apple&grant_type=id_token"
        
        let response = HTTPURLResponse(
            url: URL(string: url1)!,
            statusCode: 200,
            httpVersion: nil,
            headerFields: nil
        )
        
        URLProtocolStub.stubsLock.withLock {
            URLProtocolStub.stubs[url1] = (
                data: responseJSON.data(using: .utf8),
                response: response,
                error: nil
            )
            URLProtocolStub.stubs[url2] = (
                data: responseJSON.data(using: .utf8),
                response: response,
                error: nil
            )
        }
        
        // When
        let session = try await api.exchangeAppleIDToken(
            idToken: "apple-id-token",
            nonce: "test-nonce"
        )
        
        // Then
        XCTAssertEqual(session.accessToken, "access-token-123")
        XCTAssertEqual(session.refreshToken, "refresh-token-456")
        XCTAssertEqual(session.user.id, "user-123")
        XCTAssertEqual(session.user.email, "test@example.com")
        XCTAssertEqual(session.user.name, "Test User")
        
        // Verify expiresAt is computed correctly
        let expectedExpiry = Date.now.addingTimeInterval(3600)
        XCTAssertEqual(session.expiresAt.timeIntervalSince1970, expectedExpiry.timeIntervalSince1970, accuracy: 2)
    }
    
    func testRefreshSuccess() async throws {
        // Given
        let responseJSON = """
        {
            "access_token": "new-access-token",
            "refresh_token": "new-refresh-token",
            "expires_in": 7200,
            "token_type": "bearer",
            "user": {
                "id": "user-123",
                "email": "test@example.com"
            }
        }
        """
        
        let url = "https://test.supabase.co/auth/v1/token?grant_type=refresh_token"
        URLProtocolStub.stubsLock.withLock {
            URLProtocolStub.stubs[url] = (
                data: responseJSON.data(using: .utf8),
                response: HTTPURLResponse(
                    url: URL(string: url)!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: nil
                ),
                error: nil
            )
        }
        
        // When
        let session = try await api.refresh(refreshToken: "old-refresh-token")
        
        // Then
        XCTAssertEqual(session.accessToken, "new-access-token")
        XCTAssertEqual(session.refreshToken, "new-refresh-token")
        XCTAssertEqual(session.user.id, "user-123")
    }
    
    func testServer401MapsToInvalidCredentials() async throws {
        // Given
        let url1 = "https://test.supabase.co/auth/v1/token?grant_type=id_token&provider=apple"
        let url2 = "https://test.supabase.co/auth/v1/token?provider=apple&grant_type=id_token"
        
        let response = HTTPURLResponse(
            url: URL(string: url1)!,
            statusCode: 401,
            httpVersion: nil,
            headerFields: nil
        )
        
        URLProtocolStub.stubsLock.withLock {
            URLProtocolStub.stubs[url1] = (
                data: "{}".data(using: .utf8),
                response: response,
                error: nil
            )
            URLProtocolStub.stubs[url2] = (
                data: "{}".data(using: .utf8),
                response: response,
                error: nil
            )
        }
        
        // When/Then
        do {
            _ = try await api.exchangeAppleIDToken(idToken: "token", nonce: "nonce")
            XCTFail("Should have thrown")
        } catch let error as AuthError {
            XCTAssertEqual(error, .invalidCredentials)
        }
    }
    
    func testServer500MapsToServerError() async throws {
        // Given
        let errorJSON = """
        {
            "error": "internal_error",
            "error_description": "Something went wrong"
        }
        """
        
        let url = "https://test.supabase.co/auth/v1/token?grant_type=refresh_token"
        URLProtocolStub.stubsLock.withLock {
            URLProtocolStub.stubs[url] = (
                data: errorJSON.data(using: .utf8),
                response: HTTPURLResponse(
                    url: URL(string: url)!,
                    statusCode: 500,
                    httpVersion: nil,
                    headerFields: nil
                ),
                error: nil
            )
        }
        
        // When/Then
        do {
            _ = try await api.refresh(refreshToken: "token")
            XCTFail("Should have thrown")
        } catch let error as AuthError {
            if case let .server(code, message) = error {
                XCTAssertEqual(code, 500)
                XCTAssertEqual(message, "Something went wrong")
            } else {
                XCTFail("Wrong error type: \(error)")
            }
        }
    }
    
    func testRefreshTokenRotation() async throws {
        // Given - Supabase returns a new refresh token
        let responseJSON = """
        {
            "access_token": "new-access-token",
            "refresh_token": "rotated-refresh-token",
            "expires_in": 7200,
            "token_type": "bearer",
            "user": {"id": "user-123"}
        }
        """
        
        let url = "https://test.supabase.co/auth/v1/token?grant_type=refresh_token"
        URLProtocolStub.stubsLock.withLock {
            URLProtocolStub.stubs[url] = (
                data: responseJSON.data(using: .utf8),
                response: HTTPURLResponse(
                    url: URL(string: url)!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: nil
                ),
                error: nil
            )
        }
        
        // When
        let session = try await api.refresh(refreshToken: "old-refresh-token")
        
        // Then - Should use the new rotated refresh token
        XCTAssertEqual(session.refreshToken, "rotated-refresh-token")
    }
    
    func testRefreshWithoutNewRefreshTokenKeepsExisting() async throws {
        // Given - Supabase doesn't return refresh token (keeps existing)
        let responseJSON = """
        {
            "access_token": "new-access-token",
            "expires_in": 7200,
            "token_type": "bearer",
            "user": {"id": "user-123"}
        }
        """
        
        let url = "https://test.supabase.co/auth/v1/token?grant_type=refresh_token"
        URLProtocolStub.stubsLock.withLock {
            URLProtocolStub.stubs[url] = (
                data: responseJSON.data(using: .utf8),
                response: HTTPURLResponse(
                    url: URL(string: url)!,
                    statusCode: 200,
                    httpVersion: nil,
                    headerFields: nil
                ),
                error: nil
            )
        }
        
        // When
        let session = try await api.refresh(refreshToken: "existing-refresh-token")
        
        // Then - Should keep the existing refresh token
        XCTAssertEqual(session.refreshToken, "existing-refresh-token")
    }
    
    func testURLErrorMapsToNetworkError() async throws {
        // Given
        let url = "https://test.supabase.co/auth/v1/token?grant_type=refresh_token"
        URLProtocolStub.stubsLock.withLock {
            URLProtocolStub.stubs[url] = (
                data: nil,
                response: nil,
                error: URLError(.notConnectedToInternet)
            )
        }
        
        // When/Then
        do {
            _ = try await api.refresh(refreshToken: "token")
            XCTFail("Should have thrown")
        } catch let error as AuthError {
            if case let .network(underlying) = error {
                XCTAssertTrue(underlying is URLError)
            } else {
                XCTFail("Wrong error type: \(error)")
            }
        }
    }
}
