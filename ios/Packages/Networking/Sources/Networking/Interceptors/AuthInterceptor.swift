import Foundation

/// Interceptor that adds Bearer token authentication to requests
public struct AuthInterceptor: HTTPInterceptor {
    private let tokenProvider: TokenProvider
    
    /// Creates an auth interceptor
    /// - Parameter tokenProvider: Provider for authentication tokens
    public init(tokenProvider: TokenProvider) {
        self.tokenProvider = tokenProvider
    }
    
    /// Adapts the request by adding Authorization header if token is available
    /// - Parameter request: The mutable URLRequest to modify
    public func adapt(_ request: inout URLRequest) {
        // Only set Authorization header if not already present
        guard request.value(forHTTPHeaderField: "Authorization") == nil else {
            return
        }
        
        // Get current token and set Authorization header
        if let token = tokenProvider.currentToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
    }
    
    /// Auth interceptor does not handle retries
    /// 
    /// Note: Auth refresh logic will live in Auth module. This interceptor
    /// does not auto-retry 401/403 responses to avoid coupling.
    /// 
    /// - Parameters:
    ///   - response: HTTP response
    ///   - data: Response data
    ///   - error: Error that occurred
    ///   - attempt: Current attempt number
    /// - Returns: Always returns .noRetry
    public func shouldRetry(
        response: HTTPURLResponse?,
        data: Data?,
        error: Error?,
        attempt: Int
    ) -> RetryDecision {
        return .noRetry
    }
}
