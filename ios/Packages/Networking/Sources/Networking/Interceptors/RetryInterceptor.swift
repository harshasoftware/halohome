import Foundation

/// Interceptor that implements retry decision logic for failed requests
public struct RetryInterceptor: HTTPInterceptor {
    private let policy: RetryPolicy
    
    /// Creates a retry interceptor
    /// - Parameter policy: Retry policy configuration (default: standard policy)
    public init(policy: RetryPolicy = RetryPolicy()) {
        self.policy = policy
    }
    
    /// Retry interceptor does not modify requests
    /// - Parameter request: The mutable URLRequest (unchanged)
    public func adapt(_ request: inout URLRequest) {
        // No-op: RetryInterceptor only handles retry decisions
    }
    
    /// Determines if a request should be retried based on error or response
    /// - Parameters:
    ///   - response: HTTP response, if any
    ///   - data: Response data, if any
    ///   - error: Error that occurred, if any
    ///   - attempt: Current attempt number
    /// - Returns: Retry decision based on policy rules
    public func shouldRetry(
        response: HTTPURLResponse?,
        data: Data?,
        error: Error?,
        attempt: Int
    ) -> RetryDecision {
        // Check attempt limit
        guard attempt < policy.maxAttempts else {
            return .noRetry
        }
        
        // Handle transport errors
        if let error = error {
            return shouldRetryForError(error)
        }
        
        // Handle HTTP response errors
        if let response = response {
            return shouldRetryForResponse(response)
        }
        
        return .noRetry
    }
    
    // MARK: - Private Helpers
    
    /// Determines retry behavior for transport errors
    /// - Parameter error: The error that occurred
    /// - Returns: Retry decision
    private func shouldRetryForError(_ error: Error) -> RetryDecision {
        // Check for retryable URLError codes
        if let urlError = error as? URLError {
            switch urlError.code {
            case .timedOut,
                 .networkConnectionLost,
                 .cannotFindHost,
                 .cannotConnectToHost,
                 .dnsLookupFailed:
                return .retry(after: nil) // Use backoff policy
            default:
                return .noRetry
            }
        }
        
        return .noRetry
    }
    
    /// Determines retry behavior for HTTP responses
    /// - Parameter response: The HTTP response
    /// - Returns: Retry decision
    private func shouldRetryForResponse(_ response: HTTPURLResponse) -> RetryDecision {
        let statusCode = response.statusCode
        
        switch statusCode {
        case 408, 425, 429: // Request Timeout, Too Early, Too Many Requests
            return retryWithServerDelay(from: response)
            
        case 500...599: // Server errors
            return retryWithServerDelay(from: response)
            
        default:
            return .noRetry
        }
    }
    
    /// Extracts retry delay from server response or uses backoff policy
    /// - Parameter response: HTTP response containing potential Retry-After header
    /// - Returns: Retry decision with appropriate delay
    private func retryWithServerDelay(from response: HTTPURLResponse) -> RetryDecision {
        // Check for Retry-After header
        if let retryAfterValue = response.allHeaderFields["Retry-After"] as? String,
           let serverDelay = RetryPolicy.parseRetryAfter(retryAfterValue) {
            return .retry(after: serverDelay)
        }
        
        // Fall back to backoff policy
        return .retry(after: nil)
    }
}
