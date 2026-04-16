import Foundation

/// Protocol for making HTTP requests
/// 
/// HTTPClient provides a simple, async interface for performing HTTP requests.
/// Implementations should handle URL construction, header management, and error mapping
/// while maintaining cancellation support through Swift's structured concurrency.
public protocol HTTPClient: Sendable {
    /// Sends an HTTP request and returns the response
    /// - Parameter request: The HTTP request to send
    /// - Returns: The HTTP response
    /// - Throws: AppError for various failure scenarios (network, server, etc.)
    func send(_ request: HTTPRequest) async throws -> HTTPResponse
}
