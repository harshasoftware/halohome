import Foundation

/// Shared utilities for redacting sensitive information in logs
enum Redaction {
    
    /// List of sensitive header names that should be redacted
    private static let sensitiveHeaders: Set<String> = [
        "authorization",
        "cookie",
        "set-cookie",
        "x-api-key",
        "api-key"
    ]
    
    /// Redacts sensitive headers for safe logging
    /// - Parameter headers: Original headers dictionary
    /// - Returns: Headers with sensitive values replaced with "■REDACTED■"
    static func redactedHeaders(_ headers: [String: String]) -> [String: String] {
        var redacted: [String: String] = [:]
        
        for (key, value) in headers {
            if sensitiveHeaders.contains(key.lowercased()) {
                redacted[key] = "■REDACTED■"
            } else {
                redacted[key] = value
            }
        }
        
        return redacted
    }
    
    /// Redacts sensitive headers from URLRequest for safe logging
    /// - Parameter request: URLRequest to extract headers from
    /// - Returns: Redacted headers dictionary
    static func redactedHeaders(from request: URLRequest) -> [String: String] {
        guard let headers = request.allHTTPHeaderFields else {
            return [:]
        }
        return redactedHeaders(headers)
    }
}
