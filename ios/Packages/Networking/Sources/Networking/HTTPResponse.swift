import Foundation

/// Represents an HTTP response with status code, headers, data, and optional request ID
public struct HTTPResponse: Sendable {
    /// HTTP status code
    public let statusCode: Int
    
    /// Response headers
    public let headers: [String: String]
    
    /// Response body data
    public let data: Data
    
    /// Request ID extracted from response headers (X-Request-ID, case-insensitive)
    public let requestID: String?
    
    /// Creates a new HTTP response
    /// - Parameters:
    ///   - statusCode: HTTP status code
    ///   - headers: Response headers
    ///   - data: Response body data
    ///   - requestID: Optional request ID (will be extracted from headers if not provided)
    public init(
        statusCode: Int,
        headers: [String: String],
        data: Data,
        requestID: String? = nil
    ) {
        self.statusCode = statusCode
        self.headers = headers
        self.data = data
        
        // Extract request ID from headers if not explicitly provided
        if let requestID = requestID {
            self.requestID = requestID
        } else {
            self.requestID = Self.extractRequestID(from: headers)
        }
    }
    
    /// Convenience initializer from URLSession response
    /// - Parameters:
    ///   - data: Response data
    ///   - response: URLResponse from URLSession
    public init(data: Data, response: URLResponse) {
        if let httpResponse = response as? HTTPURLResponse {
            self.statusCode = httpResponse.statusCode
            
            // Convert HTTPURLResponse.allHeaderFields to [String: String]
            var stringHeaders: [String: String] = [:]
            for (key, value) in httpResponse.allHeaderFields {
                if let keyString = key as? String,
                   let valueString = value as? String {
                    stringHeaders[keyString] = valueString
                }
            }
            self.headers = stringHeaders
            
            self.data = data
            self.requestID = Self.extractRequestID(from: stringHeaders)
        } else {
            // Fallback for non-HTTP responses
            self.statusCode = 0
            self.headers = [:]
            self.data = data
            self.requestID = nil
        }
    }
    
    /// Extracts request ID from headers (case-insensitive lookup)
    /// - Parameter headers: Response headers
    /// - Returns: Request ID if found
    private static func extractRequestID(from headers: [String: String]) -> String? {
        // Common request ID header names (case-insensitive)
        let requestIDKeys = ["x-request-id", "x-requestid", "request-id"]
        
        for (key, value) in headers {
            if requestIDKeys.contains(key.lowercased()) {
                return value
            }
        }
        
        return nil
    }
    
    /// Returns true if the response indicates success (status code 200-299)
    public var isSuccess: Bool {
        return (200..<300).contains(statusCode)
    }
    
    /// Returns true if the response indicates a client error (status code 400-499)
    public var isClientError: Bool {
        return (400..<500).contains(statusCode)
    }
    
    /// Returns true if the response indicates a server error (status code 500-599)
    public var isServerError: Bool {
        return (500..<600).contains(statusCode)
    }
}
