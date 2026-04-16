import Foundation

/// Internal helper for building URLRequest instances from HTTPRequest
enum URLRequestBuilder {
    
    /// Builds a URLRequest from an HTTPRequest and base URL
    /// - Parameters:
    ///   - httpRequest: The HTTP request to convert
    ///   - baseURL: The base URL to combine with the request path
    ///   - defaultHeaders: Default headers to apply (can be overridden by request headers)
    /// - Returns: A configured URLRequest
    /// - Throws: If URL construction fails
    static func build(
        from httpRequest: HTTPRequest,
        baseURL: URL,
        defaultHeaders: [String: String] = [:]
    ) throws -> URLRequest {
        // Construct the full URL
        let fullURL = try buildURL(baseURL: baseURL, path: httpRequest.path, query: httpRequest.query)
        
        // Create the URLRequest
        var urlRequest = URLRequest(url: fullURL)
        urlRequest.httpMethod = httpRequest.method.rawValue
        urlRequest.httpBody = httpRequest.body
        
        // Apply default headers first, then override with request-specific headers
        let mergedHeaders = defaultHeaders.merging(httpRequest.headers) { _, requestValue in
            requestValue // Request headers override defaults
        }
        
        for (key, value) in mergedHeaders {
            urlRequest.setValue(value, forHTTPHeaderField: key)
        }
        
        return urlRequest
    }
    
    /// Builds a complete URL by combining base URL, path, and query parameters
    /// - Parameters:
    ///   - baseURL: The base URL
    ///   - path: The request path
    ///   - query: Query parameters
    /// - Returns: The complete URL with query parameters
    /// - Throws: If URL construction fails
    private static func buildURL(
        baseURL: URL,
        path: String,
        query: [String: String?]
    ) throws -> URL {
        // Normalize path by removing leading slash if present
        let normalizedPath = path.hasPrefix("/") ? String(path.dropFirst()) : path
        
        // Combine base URL with normalized path
        let pathURL = baseURL.appendingPathComponent(normalizedPath)
        
        // Filter out nil query parameters
        let nonNilQuery = query.compactMapValues { $0 }
        
        // Add query parameters if any
        guard !nonNilQuery.isEmpty else {
            return pathURL
        }
        
        guard var components = URLComponents(url: pathURL, resolvingAgainstBaseURL: true) else {
            throw URLError(.badURL)
        }
        
        // Convert query dictionary to URLQueryItem array
        var queryItems: [URLQueryItem] = []
        for (key, value) in nonNilQuery {
            queryItems.append(URLQueryItem(name: key, value: value))
        }
        
        components.queryItems = queryItems
        
        guard let finalURL = components.url else {
            throw URLError(.badURL)
        }
        
        return finalURL
    }
}
