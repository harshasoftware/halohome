import XCTest
@testable import Networking
import Core

final class URLRequestBuilderTests: XCTestCase {
    
    private let baseURL = URL(string: "https://api.example.com")!
    
    // MARK: - Path Normalization Tests
    
    func testPathNormalizationWithLeadingSlash() throws {
        // Given
        let request = HTTPRequest(path: "/v1/messages", method: .get)
        
        // When
        let urlRequest = try URLRequestBuilder.build(
            from: request,
            baseURL: baseURL,
            defaultHeaders: [:]
        )
        
        // Then
        let expectedURL = URL(string: "https://api.example.com/v1/messages")!
        XCTAssertEqual(urlRequest.url, expectedURL)
    }
    
    func testPathNormalizationWithoutLeadingSlash() throws {
        // Given
        let request = HTTPRequest(path: "v1/messages", method: .get)
        
        // When
        let urlRequest = try URLRequestBuilder.build(
            from: request,
            baseURL: baseURL,
            defaultHeaders: [:]
        )
        
        // Then
        let expectedURL = URL(string: "https://api.example.com/v1/messages")!
        XCTAssertEqual(urlRequest.url, expectedURL)
    }
    
    // MARK: - Query Parameter Tests
    
    func testNilQueryParametersDropped() throws {
        // Given
        let query = ["q": "swift", "filter": nil, "limit": "10"]
        let request = HTTPRequest(path: "/search", method: .get, query: query)
        
        // When
        let urlRequest = try URLRequestBuilder.build(
            from: request,
            baseURL: baseURL,
            defaultHeaders: [:]
        )
        
        // Then
        let urlString = urlRequest.url?.absoluteString ?? ""
        XCTAssertTrue(urlString.contains("q=swift"))
        XCTAssertTrue(urlString.contains("limit=10"))
        XCTAssertFalse(urlString.contains("filter="))
    }
    
    func testUnicodeQueryEncoding() throws {
        // Given
        let query = ["q": "swift 🚀"]
        let request = HTTPRequest(path: "/search", method: .get, query: query)
        
        // When
        let urlRequest = try URLRequestBuilder.build(
            from: request,
            baseURL: baseURL,
            defaultHeaders: [:]
        )
        
        // Then
        let urlString = urlRequest.url?.absoluteString ?? ""
        XCTAssertTrue(urlString.contains("swift%20%F0%9F%9A%80"))
    }
    
    func testEmptyQueryParameters() throws {
        // Given
        let request = HTTPRequest(path: "/search", method: .get, query: [:])
        
        // When
        let urlRequest = try URLRequestBuilder.build(
            from: request,
            baseURL: baseURL,
            defaultHeaders: [:]
        )
        
        // Then
        let expectedURL = URL(string: "https://api.example.com/search")!
        XCTAssertEqual(urlRequest.url, expectedURL)
    }
    
    // MARK: - Header Tests
    
    func testDefaultHeadersApplied() throws {
        // Given
        let defaultHeaders = ["Accept": "application/json", "User-Agent": "TestClient"]
        let request = HTTPRequest(path: "/test", method: .get)
        
        // When
        let urlRequest = try URLRequestBuilder.build(
            from: request,
            baseURL: baseURL,
            defaultHeaders: defaultHeaders
        )
        
        // Then
        XCTAssertEqual(urlRequest.value(forHTTPHeaderField: "Accept"), "application/json")
        XCTAssertEqual(urlRequest.value(forHTTPHeaderField: "User-Agent"), "TestClient")
    }
    
    func testRequestHeadersOverrideDefaults() throws {
        // Given
        let defaultHeaders = ["Accept": "application/json"]
        let requestHeaders = ["Accept": "text/plain", "Authorization": "Bearer token"]
        let request = HTTPRequest(path: "/test", method: .get, headers: requestHeaders)
        
        // When
        let urlRequest = try URLRequestBuilder.build(
            from: request,
            baseURL: baseURL,
            defaultHeaders: defaultHeaders
        )
        
        // Then
        XCTAssertEqual(urlRequest.value(forHTTPHeaderField: "Accept"), "text/plain")
        XCTAssertEqual(urlRequest.value(forHTTPHeaderField: "Authorization"), "Bearer token")
    }
    
    // MARK: - HTTP Method and Body Tests
    
    func testHTTPMethodSet() throws {
        // Given
        let request = HTTPRequest(path: "/test", method: .post)
        
        // When
        let urlRequest = try URLRequestBuilder.build(
            from: request,
            baseURL: baseURL,
            defaultHeaders: [:]
        )
        
        // Then
        XCTAssertEqual(urlRequest.httpMethod, "POST")
    }
    
    func testRequestBodySet() throws {
        // Given
        let body = "test data".data(using: .utf8)!
        let request = HTTPRequest(path: "/test", method: .post, body: body)
        
        // When
        let urlRequest = try URLRequestBuilder.build(
            from: request,
            baseURL: baseURL,
            defaultHeaders: [:]
        )
        
        // Then
        XCTAssertEqual(urlRequest.httpBody, body)
    }
}
