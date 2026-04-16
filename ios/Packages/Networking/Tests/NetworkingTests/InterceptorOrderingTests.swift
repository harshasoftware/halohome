import XCTest
@testable import Networking
import Core

final class InterceptorOrderingTests: XCTestCase {
    
    private var client: URLSessionHTTPClient!
    private let baseURL = URL(string: "https://api.example.com")!
    
    override func setUp() {
        super.setUp()
        URLProtocolStub.reset()
    }
    
    override func tearDown() {
        URLProtocolStub.reset()
        client = nil
        super.tearDown()
    }
    
    // MARK: - Mock Token Provider
    
    private struct MockTokenProvider: TokenProvider {
        let token: String?
        
        func currentToken() -> String? {
            return token
        }
    }
    
    // MARK: - Header Precedence Tests
    
    func testHeadersPrecedenceOrder() async throws {
        // Given
        let testSession = URLProtocolStub.makeTestSession()
        let tokenProvider = MockTokenProvider(token: "test-token")
        
        let interceptors: [HTTPInterceptor] = [
            HeadersInterceptor(
                appVersion: "1.0.0",
                platform: "iOS",
                extraHeaders: ["X-Custom": "headers-interceptor"]
            ),
            AuthInterceptor(tokenProvider: tokenProvider)
        ]
        
        client = URLSessionHTTPClient(
            baseURL: baseURL,
            session: testSession,
            defaultHeaders: ["Accept": "application/json", "X-Default": "default-value"],
            interceptors: interceptors,
            sleeper: FakeSleeper()
        )
        
        let path = "/test"
        let expectedURL = URL(string: "https://api.example.com/test")!
        
        URLProtocolStub.stub(url: expectedURL, data: Data())
        
        // Request with specific headers that should override
        let request = HTTPRequest(
            path: path,
            method: .get,
            headers: ["Accept": "text/plain", "X-Request": "request-value"]
        )
        
        // When
        _ = try await client.send(request)
        
        // Then
        let capturedRequest = URLProtocolStub.lastRequest()
        XCTAssertNotNil(capturedRequest)
        
        // Request headers should override defaults
        XCTAssertEqual(capturedRequest?.value(forHTTPHeaderField: "Accept"), "text/plain")
        
        // Default headers should be present if not overridden
        XCTAssertEqual(capturedRequest?.value(forHTTPHeaderField: "X-Default"), "default-value")
        
        // Headers interceptor should add telemetry
        XCTAssertEqual(capturedRequest?.value(forHTTPHeaderField: "X-App-Version"), "1.0.0")
        XCTAssertEqual(capturedRequest?.value(forHTTPHeaderField: "X-Platform"), "iOS")
        XCTAssertEqual(capturedRequest?.value(forHTTPHeaderField: "X-Custom"), "headers-interceptor")
        XCTAssertNotNil(capturedRequest?.value(forHTTPHeaderField: "User-Agent"))
        
        // Auth interceptor should add authorization
        XCTAssertEqual(capturedRequest?.value(forHTTPHeaderField: "Authorization"), "Bearer test-token")
        
        // Request-specific header should be present
        XCTAssertEqual(capturedRequest?.value(forHTTPHeaderField: "X-Request"), "request-value")
    }
    
    func testAuthorizationNotOverriddenWhenPresent() async throws {
        // Given
        let testSession = URLProtocolStub.makeTestSession()
        let tokenProvider = MockTokenProvider(token: "interceptor-token")
        
        let interceptors: [HTTPInterceptor] = [
            AuthInterceptor(tokenProvider: tokenProvider)
        ]
        
        client = URLSessionHTTPClient(
            baseURL: baseURL,
            session: testSession,
            interceptors: interceptors,
            sleeper: FakeSleeper()
        )
        
        let path = "/test"
        let expectedURL = URL(string: "https://api.example.com/test")!
        
        URLProtocolStub.stub(url: expectedURL, data: Data())
        
        // Request already has Authorization header
        let request = HTTPRequest(
            path: path,
            method: .get,
            headers: ["Authorization": "Bearer request-token"]
        )
        
        // When
        _ = try await client.send(request)
        
        // Then
        let capturedRequest = URLProtocolStub.lastRequest()
        XCTAssertNotNil(capturedRequest)
        
        // Request authorization should be preserved
        XCTAssertEqual(capturedRequest?.value(forHTTPHeaderField: "Authorization"), "Bearer request-token")
    }
    
    func testHeadersInterceptorDoesNotOverrideExisting() async throws {
        // Given
        let testSession = URLProtocolStub.makeTestSession()
        
        let interceptors: [HTTPInterceptor] = [
            HeadersInterceptor(
                appVersion: "1.0.0",
                extraHeaders: ["User-Agent": "should-not-override"]
            )
        ]
        
        client = URLSessionHTTPClient(
            baseURL: baseURL,
            session: testSession,
            interceptors: interceptors,
            sleeper: FakeSleeper()
        )
        
        let path = "/test"
        let expectedURL = URL(string: "https://api.example.com/test")!
        
        URLProtocolStub.stub(url: expectedURL, data: Data())
        
        // Request with existing User-Agent
        let request = HTTPRequest(
            path: path,
            method: .get,
            headers: ["User-Agent": "custom-agent"]
        )
        
        // When
        _ = try await client.send(request)
        
        // Then
        let capturedRequest = URLProtocolStub.lastRequest()
        XCTAssertNotNil(capturedRequest)
        
        // Request User-Agent should be preserved
        XCTAssertEqual(capturedRequest?.value(forHTTPHeaderField: "User-Agent"), "custom-agent")
        
        // Other headers from interceptor should still be added
        XCTAssertEqual(capturedRequest?.value(forHTTPHeaderField: "X-App-Version"), "1.0.0")
    }
    
    func testNoTokenProviderDoesNotAddAuth() async throws {
        // Given
        let testSession = URLProtocolStub.makeTestSession()
        let tokenProvider = MockTokenProvider(token: nil) // No token
        
        let interceptors: [HTTPInterceptor] = [
            AuthInterceptor(tokenProvider: tokenProvider)
        ]
        
        client = URLSessionHTTPClient(
            baseURL: baseURL,
            session: testSession,
            interceptors: interceptors,
            sleeper: FakeSleeper()
        )
        
        let path = "/test"
        let expectedURL = URL(string: "https://api.example.com/test")!
        
        URLProtocolStub.stub(url: expectedURL, data: Data())
        
        let request = HTTPRequest(path: path, method: .get)
        
        // When
        _ = try await client.send(request)
        
        // Then
        let capturedRequest = URLProtocolStub.lastRequest()
        XCTAssertNotNil(capturedRequest)
        
        // No Authorization header should be added
        XCTAssertNil(capturedRequest?.value(forHTTPHeaderField: "Authorization"))
    }
}
