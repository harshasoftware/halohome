import XCTest
@testable import Networking
import Core

final class RetryInterceptorTests: XCTestCase {
    
    private var client: URLSessionHTTPClient!
    private var fakeSleeper: FakeSleeper!
    private let baseURL = URL(string: "https://api.example.com")!
    
    override func setUp() {
        super.setUp()
        URLProtocolStub.reset()
        fakeSleeper = FakeSleeper()
    }
    
    override func tearDown() {
        URLProtocolStub.reset()
        client = nil
        fakeSleeper = nil
        super.tearDown()
    }
    
    // MARK: - Server Error Retry Tests
    
    func testServerError500RetriesUpToMaxAttempts() async throws {
        // Given
        let testSession = URLProtocolStub.makeTestSession()
        let retryPolicy = RetryPolicy(maxAttempts: 3, baseDelay: 0.5, jitter: 0.0)
        
        let interceptors: [HTTPInterceptor] = [
            RetryInterceptor(policy: retryPolicy)
        ]
        
        client = URLSessionHTTPClient(
            baseURL: baseURL,
            session: testSession,
            interceptors: interceptors,
            retryPolicy: retryPolicy,
            sleeper: fakeSleeper
        )
        
        let path = "/server-error"
        let expectedURL = URL(string: "https://api.example.com/server-error")!
        
        // Stub to always return 500
        URLProtocolStub.stub(
            url: expectedURL,
            data: "{\"error\": \"Internal server error\"}".data(using: .utf8)!,
            statusCode: 500
        )
        
        let request = HTTPRequest(path: path, method: .get)
        
        // When & Then
        do {
            _ = try await client.send(request)
            XCTFail("Expected error to be thrown")
        } catch let error as AppError {
            // Should be server error after retries exhausted
            if case .network(let code, let message) = error {
                XCTAssertEqual(code, 500)
                XCTAssertEqual(message, "Internal server error")
            } else {
                XCTFail("Expected network error, got: \(error)")
            }
        }
        
        // Should have made 3 attempts (initial + 2 retries)
        let capturedRequests = URLProtocolStub.capturedRequests()
        XCTAssertEqual(capturedRequests.count, 3)
        
        // Should have made 2 sleep calls (between attempts)
        XCTAssertEqual(fakeSleeper.callCount, 2)
        
        // Verify exponential backoff delays
        XCTAssertEqual(fakeSleeper.sleepCalls[0], 0.5, accuracy: 0.01) // First retry
        XCTAssertEqual(fakeSleeper.sleepCalls[1], 1.0, accuracy: 0.01) // Second retry
    }
    
    func testRateLimitWithRetryAfterHeader() async throws {
        // Given
        let testSession = URLProtocolStub.makeTestSession()
        let retryPolicy = RetryPolicy(maxAttempts: 3, baseDelay: 0.5, jitter: 0.0)
        
        let interceptors: [HTTPInterceptor] = [
            RetryInterceptor(policy: retryPolicy)
        ]
        
        client = URLSessionHTTPClient(
            baseURL: baseURL,
            session: testSession,
            interceptors: interceptors,
            retryPolicy: retryPolicy,
            sleeper: fakeSleeper
        )
        
        let path = "/rate-limited"
        let expectedURL = URL(string: "https://api.example.com/rate-limited")!
        
        // First call returns 429 with Retry-After: 2, second call succeeds  
        URLProtocolStub.stub(
            url: expectedURL,
            data: "{\"error\": \"Rate limited\"}".data(using: .utf8)!,
            statusCode: 429,
            headers: ["Retry-After": "2"]
        )
        
        let request = HTTPRequest(path: path, method: .get)
        
        // When - this test expects failure since we only stub 429 responses
        do {
            _ = try await client.send(request)
            XCTFail("Expected error to be thrown")
        } catch let error as AppError {
            // Should be rate limit error after retries exhausted
            if case .network(let code, let message) = error {
                XCTAssertEqual(code, 429)
                XCTAssertEqual(message, "Rate limited")
            } else {
                XCTFail("Expected network error, got: \(error)")
            }
        }
        
        // Should have made 3 attempts (initial + 2 retries)
        let capturedRequests = URLProtocolStub.capturedRequests()
        XCTAssertEqual(capturedRequests.count, 3)
        
        // Should have used server-specified delay (2 seconds) for retries
        XCTAssertEqual(fakeSleeper.callCount, 2)
        XCTAssertEqual(fakeSleeper.sleepCalls[0], 2.0, accuracy: 0.01) // Retry-After: 2
        XCTAssertEqual(fakeSleeper.sleepCalls[1], 2.0, accuracy: 0.01) // Retry-After: 2
    }
    
    // MARK: - Transport Error Retry Tests
    
    func testTimeoutErrorRetries() async throws {
        // Given
        let testSession = URLProtocolStub.makeTestSession()
        let retryPolicy = RetryPolicy(maxAttempts: 2, baseDelay: 0.3, jitter: 0.0)
        
        let interceptors: [HTTPInterceptor] = [
            RetryInterceptor(policy: retryPolicy)
        ]
        
        client = URLSessionHTTPClient(
            baseURL: baseURL,
            session: testSession,
            interceptors: interceptors,
            retryPolicy: retryPolicy,
            sleeper: fakeSleeper
        )
        
        let path = "/timeout"
        let expectedURL = URL(string: "https://api.example.com/timeout")!
        
        // Stub to return timeout error
        URLProtocolStub.stub(url: expectedURL, error: URLError(.timedOut))
        
        let request = HTTPRequest(path: path, method: .get)
        
        // When & Then
        do {
            _ = try await client.send(request)
            XCTFail("Expected error to be thrown")
        } catch let error as AppError {
            // Should be network error after retries exhausted
            if case .network(let code, let message) = error {
                XCTAssertEqual(code, URLError.timedOut.rawValue)
                XCTAssertEqual(message, "Timed out")
            } else {
                XCTFail("Expected network error, got: \(error)")
            }
        }
        
        // Should have made 2 attempts (initial + 1 retry)
        let capturedRequests = URLProtocolStub.capturedRequests()
        XCTAssertEqual(capturedRequests.count, 2)
        
        // Should have made 1 sleep call (between attempts)
        XCTAssertEqual(fakeSleeper.callCount, 1)
        XCTAssertEqual(fakeSleeper.sleepCalls[0], 0.3, accuracy: 0.01) // Base delay
    }
    
    // MARK: - Non-Retryable Error Tests
    
    func testClientError401DoesNotRetry() async throws {
        // Given
        let testSession = URLProtocolStub.makeTestSession()
        let retryPolicy = RetryPolicy(maxAttempts: 3, baseDelay: 0.5, jitter: 0.0)
        
        let interceptors: [HTTPInterceptor] = [
            RetryInterceptor(policy: retryPolicy)
        ]
        
        client = URLSessionHTTPClient(
            baseURL: baseURL,
            session: testSession,
            interceptors: interceptors,
            retryPolicy: retryPolicy,
            sleeper: fakeSleeper
        )
        
        let path = "/unauthorized"
        let expectedURL = URL(string: "https://api.example.com/unauthorized")!
        
        URLProtocolStub.stub(
            url: expectedURL,
            data: "{\"error\": \"Unauthorized\"}".data(using: .utf8)!,
            statusCode: 401
        )
        
        let request = HTTPRequest(path: path, method: .get)
        
        // When & Then
        do {
            _ = try await client.send(request)
            XCTFail("Expected error to be thrown")
        } catch let error as AppError {
            // Should be network error
            if case .network(let code, let message) = error {
                XCTAssertEqual(code, 401)
                XCTAssertEqual(message, "Unauthorized")
            } else {
                XCTFail("Expected network error, got: \(error)")
            }
        }
        
        // Should have made only 1 attempt (no retries for 401)
        let capturedRequests = URLProtocolStub.capturedRequests()
        XCTAssertEqual(capturedRequests.count, 1)
        
        // Should not have made any sleep calls (no retries)
        XCTAssertEqual(fakeSleeper.callCount, 0)
    }
    
    func testClientError403DoesNotRetry() async throws {
        // Given
        let testSession = URLProtocolStub.makeTestSession()
        let retryPolicy = RetryPolicy(maxAttempts: 3, baseDelay: 0.5, jitter: 0.0)
        
        let interceptors: [HTTPInterceptor] = [
            RetryInterceptor(policy: retryPolicy)
        ]
        
        client = URLSessionHTTPClient(
            baseURL: baseURL,
            session: testSession,
            interceptors: interceptors,
            retryPolicy: retryPolicy,
            sleeper: fakeSleeper
        )
        
        let path = "/forbidden"
        let expectedURL = URL(string: "https://api.example.com/forbidden")!
        
        URLProtocolStub.stub(
            url: expectedURL,
            data: "{\"error\": \"Forbidden\"}".data(using: .utf8)!,
            statusCode: 403
        )
        
        let request = HTTPRequest(path: path, method: .get)
        
        // When & Then
        do {
            _ = try await client.send(request)
            XCTFail("Expected error to be thrown")
        } catch let error as AppError {
            if case .network(let code, let message) = error {
                XCTAssertEqual(code, 403)
                XCTAssertEqual(message, "Forbidden")
            } else {
                XCTFail("Expected network error, got: \(error)")
            }
        }
        
        // Should have made only 1 attempt (no retries for 403)
        let capturedRequests = URLProtocolStub.capturedRequests()
        XCTAssertEqual(capturedRequests.count, 1)
        
        // Should not have made any sleep calls (no retries)
        XCTAssertEqual(fakeSleeper.callCount, 0)
    }
    
}
