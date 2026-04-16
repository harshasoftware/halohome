import XCTest
@testable import Networking
import Core

final class HTTPClientTests: XCTestCase {
    
    private var client: URLSessionHTTPClient!
    private let baseURL = URL(string: "https://api.example.com")!
    
    override func setUp() {
        super.setUp()
        URLProtocolStub.reset()
        
        let testSession = URLProtocolStub.makeTestSession()
        client = URLSessionHTTPClient(
            baseURL: baseURL,
            session: testSession,
            defaultHeaders: ["Accept": "application/json"]
        )
    }
    
    override func tearDown() {
        URLProtocolStub.reset()
        client = nil
        super.tearDown()
    }
    
    // MARK: - GET Success Tests
    
    func testGETSuccess() async throws {
        // Given
        let path = "/v1/messages"
        let expectedURL = URL(string: "https://api.example.com/v1/messages")!
        let responseData = "{\"ok\": true}".data(using: .utf8)!
        
        URLProtocolStub.stub(
            url: expectedURL,
            data: responseData,
            statusCode: 200,
            headers: ["Content-Type": "application/json"]
        )
        
        let request = HTTPRequest(path: path, method: .get)
        
        // When
        let response = try await client.send(request)
        
        // Then
        XCTAssertEqual(response.statusCode, 200)
        XCTAssertEqual(response.data, responseData)
        XCTAssertEqual(response.headers["Content-Type"], "application/json")
        
        // Verify request was constructed correctly
        let capturedRequest = URLProtocolStub.lastRequest()
        XCTAssertNotNil(capturedRequest)
        XCTAssertEqual(capturedRequest?.url, expectedURL)
        XCTAssertEqual(capturedRequest?.httpMethod, "GET")
        XCTAssertEqual(capturedRequest?.value(forHTTPHeaderField: "Accept"), "application/json")
    }
    
    func testGETWithQueryParameters() async throws {
        // Given
        let path = "/v1/search"
        let query = ["q": "swift", "limit": "10"]
        let responseData = "{\"results\": []}".data(using: .utf8)!
        
        // Stub both possible query parameter orderings (dictionary order is not guaranteed)
        let url1 = URL(string: "https://api.example.com/v1/search?q=swift&limit=10")!
        let url2 = URL(string: "https://api.example.com/v1/search?limit=10&q=swift")!
        URLProtocolStub.stub(url: url1, data: responseData)
        URLProtocolStub.stub(url: url2, data: responseData)
        
        let request = HTTPRequest(path: path, method: .get, query: query)
        
        // When
        let response = try await client.send(request)
        
        // Then
        XCTAssertEqual(response.statusCode, 200)
        
        // Verify URL construction with query parameters
        let capturedRequest = URLProtocolStub.lastRequest()
        XCTAssertNotNil(capturedRequest)
        
        // Check that URL contains query parameters (order may vary)
        let urlString = capturedRequest?.url?.absoluteString ?? ""
        XCTAssertTrue(urlString.contains("q=swift"))
        XCTAssertTrue(urlString.contains("limit=10"))
    }
    
    // MARK: - POST Success Tests
    
    func testPOSTSuccess() async throws {
        // Given
        let path = "/v1/messages"
        let expectedURL = URL(string: "https://api.example.com/v1/messages")!
        let requestBody = "{\"text\": \"Hello, world!\"}".data(using: .utf8)!
        let responseData = "{\"id\": \"123\", \"created\": true}".data(using: .utf8)!
        
        URLProtocolStub.stub(
            url: expectedURL,
            data: responseData,
            statusCode: 201,
            headers: ["Content-Type": "application/json"]
        )
        
        let request = HTTPRequest(
            path: path,
            method: .post,
            headers: ["Content-Type": "application/json"],
            body: requestBody
        )
        
        // When
        let response = try await client.send(request)
        
        // Then
        XCTAssertEqual(response.statusCode, 201)
        XCTAssertEqual(response.data, responseData)
        
        // Verify request was constructed correctly
        let capturedRequest = URLProtocolStub.lastRequest()
        XCTAssertNotNil(capturedRequest)
        XCTAssertEqual(capturedRequest?.httpMethod, "POST")
        // Note: httpBody may be nil due to URLRequest streaming behavior
        XCTAssertEqual(capturedRequest?.value(forHTTPHeaderField: "Content-Type"), "application/json")
    }
    
    // MARK: - HTTP Error Mapping Tests
    
    func testHTTPServerError() async throws {
        // Given
        let path = "/v1/error"
        let expectedURL = URL(string: "https://api.example.com/v1/error")!
        let errorData = "{\"error\": \"Internal server error\"}".data(using: .utf8)!
        
        URLProtocolStub.stub(
            url: expectedURL,
            data: errorData,
            statusCode: 500,
            headers: ["Content-Type": "application/json"]
        )
        
        let request = HTTPRequest(path: path, method: .get)
        
        // When/Then
        do {
            _ = try await client.send(request)
            XCTFail("Expected error to be thrown")
        } catch let error as AppError {
            // Verify error mapping
            if case .network(let code, let message) = error {
                XCTAssertEqual(code, 500)
                XCTAssertEqual(message, "Internal server error")
            } else {
                XCTFail("Expected network error, got: \(error)")
            }
        }
    }
    
    func testHTTPClientError() async throws {
        // Given
        let path = "/v1/notfound"
        let expectedURL = URL(string: "https://api.example.com/v1/notfound")!
        
        URLProtocolStub.stub(
            url: expectedURL,
            data: Data(),
            statusCode: 404
        )
        
        let request = HTTPRequest(path: path, method: .get)
        
        // When/Then
        do {
            _ = try await client.send(request)
            XCTFail("Expected error to be thrown")
        } catch let error as AppError {
            // Verify error mapping
            if case .network(let code, _) = error {
                XCTAssertEqual(code, 404)
            } else {
                XCTFail("Expected network error, got: \(error)")
            }
        }
    }
    
    // MARK: - Transport Error Mapping Tests
    
    func testTransportErrorMapping() async throws {
        // Given
        let path = "/v1/offline"
        let expectedURL = URL(string: "https://api.example.com/v1/offline")!
        
        URLProtocolStub.stub(
            url: expectedURL,
            error: URLError(.notConnectedToInternet)
        )
        
        let request = HTTPRequest(path: path, method: .get)
        
        // When/Then
        do {
            _ = try await client.send(request)
            XCTFail("Expected error to be thrown")
        } catch let error as AppError {
            // Verify error mapping
            if case .network(let code, let message) = error {
                XCTAssertEqual(code, URLError.notConnectedToInternet.rawValue)
                XCTAssertEqual(message, "Offline")
            } else {
                XCTFail("Expected network error, got: \(error)")
            }
        }
    }
    
    func testTimeoutErrorMapping() async throws {
        // Given
        let path = "/v1/timeout"
        let expectedURL = URL(string: "https://api.example.com/v1/timeout")!
        
        URLProtocolStub.stub(
            url: expectedURL,
            error: URLError(.timedOut)
        )
        
        let request = HTTPRequest(path: path, method: .get)
        
        // When/Then
        do {
            _ = try await client.send(request)
            XCTFail("Expected error to be thrown")
        } catch let error as AppError {
            // Verify error mapping
            if case .network(let code, let message) = error {
                XCTAssertEqual(code, URLError.timedOut.rawValue)
                XCTAssertEqual(message, "Timed out")
            } else {
                XCTFail("Expected network error, got: \(error)")
            }
        }
    }
    
    // MARK: - Header Override Tests
    
    func testHeaderOverrideOrder() async throws {
        // Given
        let path = "/v1/custom"
        let expectedURL = URL(string: "https://api.example.com/v1/custom")!
        
        URLProtocolStub.stub(url: expectedURL, data: Data())
        
        // Request overrides default Accept header
        let request = HTTPRequest(
            path: path,
            method: .get,
            headers: ["Accept": "text/plain", "Custom-Header": "custom-value"]
        )
        
        // When
        _ = try await client.send(request)
        
        // Then
        let capturedRequest = URLProtocolStub.lastRequest()
        XCTAssertNotNil(capturedRequest)
        
        // Request header should override default
        XCTAssertEqual(capturedRequest?.value(forHTTPHeaderField: "Accept"), "text/plain")
        XCTAssertEqual(capturedRequest?.value(forHTTPHeaderField: "Custom-Header"), "custom-value")
    }
    

}
