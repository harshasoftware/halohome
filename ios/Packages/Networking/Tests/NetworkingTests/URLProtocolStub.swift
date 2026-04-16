import Foundation

/// Test helper that intercepts URLSession requests and returns stubbed responses
final class URLProtocolStub: URLProtocol {
    
    /// Storage for stubbed responses
    private static var stubResponses: [URL: StubResponse] = [:]
    
    /// Storage for stubbed errors
    private static var stubErrors: [URL: Error] = [:]
    
    /// Captured requests for verification
    private static var _capturedRequests: [URLRequest] = []
    
    /// Custom stub handler for dynamic responses
    static var stub: ((URL, Data?, Int?, [String: String]?) -> Void)? = nil
    
    /// Response data structure
    struct StubResponse {
        let data: Data
        let statusCode: Int
        let headers: [String: String]
    }
    
    // MARK: - URLProtocol Implementation
    
    override class func canInit(with request: URLRequest) -> Bool {
        return true // Intercept all requests
    }
    
    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        return request
    }
    
    override func startLoading() {
        // Capture the request
        Self._capturedRequests.append(request)
        
        guard let url = request.url else {
            client?.urlProtocol(self, didFailWithError: URLError(.badURL))
            return
        }
        
        // Check for stubbed error first
        if let error = Self.stubErrors[url] {
            client?.urlProtocol(self, didFailWithError: error)
            return
        }
        
        // Check for stubbed response
        if let stubResponse = Self.stubResponses[url] {
            let httpResponse = HTTPURLResponse(
                url: url,
                statusCode: stubResponse.statusCode,
                httpVersion: "HTTP/1.1",
                headerFields: stubResponse.headers
            )!
            
            client?.urlProtocol(self, didReceive: httpResponse, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: stubResponse.data)
            client?.urlProtocolDidFinishLoading(self)
        } else {
            // No stub found - return 404
            let httpResponse = HTTPURLResponse(
                url: url,
                statusCode: 404,
                httpVersion: "HTTP/1.1",
                headerFields: [:]
            )!
            
            client?.urlProtocol(self, didReceive: httpResponse, cacheStoragePolicy: .notAllowed)
            client?.urlProtocol(self, didLoad: Data())
            client?.urlProtocolDidFinishLoading(self)
        }
    }
    
    override func stopLoading() {
        // No-op
    }
    
    // MARK: - Test Helper Methods
    
    /// Stubs a successful response for a URL
    /// - Parameters:
    ///   - url: The URL to stub
    ///   - data: Response data
    ///   - statusCode: HTTP status code (defaults to 200)
    ///   - headers: Response headers (defaults to empty)
    static func stub(
        url: URL,
        data: Data,
        statusCode: Int = 200,
        headers: [String: String] = [:]
    ) {
        stubResponses[url] = StubResponse(
            data: data,
            statusCode: statusCode,
            headers: headers
        )
    }
    
    /// Stubs an error for a URL
    /// - Parameters:
    ///   - url: The URL to stub
    ///   - error: The error to return
    static func stub(url: URL, error: Error) {
        stubErrors[url] = error
    }
    
    /// Returns all captured requests
    /// - Returns: Array of captured URLRequest objects
    static func capturedRequests() -> [URLRequest] {
        return _capturedRequests
    }
    
    /// Returns the last captured request
    /// - Returns: The most recent URLRequest, or nil if none
    static func lastRequest() -> URLRequest? {
        return _capturedRequests.last
    }
    
    /// Clears all stubs and captured requests
    static func reset() {
        stubResponses.removeAll()
        stubErrors.removeAll()
        _capturedRequests.removeAll()
    }
    
    /// Creates a URLSession configured to use this protocol
    /// - Returns: URLSession that will use URLProtocolStub for all requests
    static func makeTestSession() -> URLSession {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [URLProtocolStub.self]
        return URLSession(configuration: config)
    }
}
