import Foundation

/// Represents an HTTP request with path, method, headers, query parameters, and body
public struct HTTPRequest: Sendable {
    /// The request path (e.g., "/v1/messages")
    public let path: String
    
    /// The HTTP method for this request
    public let method: HTTPMethod
    
    /// HTTP headers for the request
    public let headers: [String: String]
    
    /// Query parameters for the request (values can be nil to represent empty values)
    public let query: [String: String?]
    
    /// Request body data
    public let body: Data?
    
    /// Cache policy for this request (nil uses client default)
    public let cachePolicy: CachePolicy?
    
    /// Creates a new HTTP request
    /// - Parameters:
    ///   - path: The request path
    ///   - method: The HTTP method (defaults to GET)
    ///   - headers: HTTP headers (defaults to empty)
    ///   - query: Query parameters (defaults to empty)
    ///   - body: Request body data (defaults to nil)
    ///   - cachePolicy: Cache policy for this request (defaults to nil)
    public init(
        path: String,
        method: HTTPMethod = .get,
        headers: [String: String] = [:],
        query: [String: String?] = [:],
        body: Data? = nil,
        cachePolicy: CachePolicy? = nil
    ) {
        self.path = path
        self.method = method
        self.headers = headers
        self.query = query
        self.body = body
        self.cachePolicy = cachePolicy
    }
    
    /// Returns a copy of the request with an additional header
    /// - Parameters:
    ///   - key: The header name
    ///   - value: The header value
    /// - Returns: A new HTTPRequest with the added header
    public func withHeader(_ key: String, _ value: String) -> HTTPRequest {
        var newHeaders = headers
        newHeaders[key] = value
        
        return HTTPRequest(
            path: path,
            method: method,
            headers: newHeaders,
            query: query,
            body: body,
            cachePolicy: cachePolicy
        )
    }
    
    /// Returns a copy of the request with additional headers
    /// - Parameter additionalHeaders: Headers to merge with existing ones
    /// - Returns: A new HTTPRequest with the merged headers
    public func withHeaders(_ additionalHeaders: [String: String]) -> HTTPRequest {
        var newHeaders = headers
        for (key, value) in additionalHeaders {
            newHeaders[key] = value
        }
        
        return HTTPRequest(
            path: path,
            method: method,
            headers: newHeaders,
            query: query,
            body: body,
            cachePolicy: cachePolicy
        )
    }
    
    /// Returns a copy of the request with a query parameter
    /// - Parameters:
    ///   - key: The query parameter name
    ///   - value: The query parameter value (nil for empty value)
    /// - Returns: A new HTTPRequest with the added query parameter
    public func withQuery(_ key: String, _ value: String?) -> HTTPRequest {
        var newQuery = query
        newQuery[key] = value
        
        return HTTPRequest(
            path: path,
            method: method,
            headers: headers,
            query: newQuery,
            body: body,
            cachePolicy: cachePolicy
        )
    }
    
    /// Returns a copy of the request with a cache policy
    /// - Parameter policy: The cache policy to apply
    /// - Returns: A new HTTPRequest with the cache policy
    public func withCache(_ policy: CachePolicy) -> HTTPRequest {
        return HTTPRequest(
            path: path,
            method: method,
            headers: headers,
            query: query,
            body: body,
            cachePolicy: policy
        )
    }
}
