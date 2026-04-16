import Foundation

/// Decision for retry behavior after a request attempt
public enum RetryDecision: Sendable, Equatable {
    /// Do not retry the request
    case noRetry
    
    /// Retry the request after the specified delay, or use backoff policy if nil
    case retry(after: TimeInterval?)
}

/// Protocol for HTTP request/response interceptors
/// 
/// Interceptors can modify outgoing requests and decide whether to retry failed requests.
/// They are applied in order during the request lifecycle.
public protocol HTTPInterceptor: Sendable {
    /// Adapts the URLRequest before it is sent
    /// - Parameter request: The mutable URLRequest to modify
    func adapt(_ request: inout URLRequest)
    
    /// Determines if a request should be retried based on the response or error
    /// - Parameters:
    ///   - response: The HTTP response, if any
    ///   - data: The response data, if any
    ///   - error: The error that occurred, if any
    ///   - attempt: The current attempt number (1-based)
    /// - Returns: Retry decision
    func shouldRetry(
        response: HTTPURLResponse?,
        data: Data?,
        error: Error?,
        attempt: Int
    ) -> RetryDecision
}

/// Protocol for providing authentication tokens
/// 
/// Kept minimal to avoid coupling with Auth module implementation details.
public protocol TokenProvider: Sendable {
    /// Returns the current authentication token, if available
    /// - Returns: Bearer token string, or nil if not authenticated
    func currentToken() -> String?
}
