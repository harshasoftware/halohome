// Networking module for CartoStar
// Provides HTTP client functionality with async/await support, interceptors, and retry logic

// Re-export public APIs for convenient access
@_exported import Foundation

// Public APIs are defined in individual files:
// - HTTPClient: Protocol for making HTTP requests
// - HTTPRequest/HTTPResponse: Request and response types
// - HTTPMethod: Supported HTTP methods
// - URLSessionHTTPClient: URLSession-based implementation
// - HTTPInterceptor: Protocol for request/response interception
// - HeadersInterceptor/AuthInterceptor/RetryInterceptor: Built-in interceptors
// - RetryPolicy: Configurable retry behavior with exponential backoff
// - TokenProvider: Protocol for authentication token provision