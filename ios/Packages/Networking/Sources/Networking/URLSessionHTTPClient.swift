import Foundation
import Core

/// URLSession-based implementation of HTTPClient
/// 
/// Provides HTTP client functionality using URLSession with configurable base URL,
/// default headers, and comprehensive error handling with logging support.
@available(iOS 17.0, macOS 14.0, *)
public final class URLSessionHTTPClient: HTTPClient, @unchecked Sendable {
    private let baseURL: URL
    private let session: URLSession
    private let defaultHeaders: [String: String]
    private let interceptors: [HTTPInterceptor]
    private let retryPolicy: RetryPolicy
    private let sleeper: Sleeper
    private let urlCache: URLCache
    
    /// Creates a new URLSession-based HTTP client
    /// - Parameters:
    ///   - baseURL: The base URL for all requests
    ///   - session: URLSession to use (defaults to .shared)
    ///   - defaultHeaders: Default headers applied to all requests
    ///   - interceptors: HTTP interceptors to apply in order
    ///   - retryPolicy: Retry policy for backoff calculation
    ///   - urlCache: URL cache to use (defaults to .shared)
    public init(
        baseURL: URL,
        session: URLSession = .shared,
        defaultHeaders: [String: String] = ["Accept": "application/json"],
        interceptors: [HTTPInterceptor] = [],
        retryPolicy: RetryPolicy = RetryPolicy(),
        urlCache: URLCache? = nil
    ) {
        self.baseURL = baseURL
        self.session = session
        self.defaultHeaders = defaultHeaders
        self.interceptors = interceptors
        self.retryPolicy = retryPolicy
        self.sleeper = DefaultSleeper()
        self.urlCache = urlCache ?? .shared
    }
    
    /// Internal initializer for testing with custom sleeper
    /// - Parameters:
    ///   - baseURL: The base URL for all requests
    ///   - session: URLSession to use
    ///   - defaultHeaders: Default headers applied to all requests
    ///   - interceptors: HTTP interceptors to apply in order
    ///   - retryPolicy: Retry policy for backoff calculation
    ///   - sleeper: Sleep implementation for retry delays
    ///   - urlCache: URL cache to use
    internal init(
        baseURL: URL,
        session: URLSession,
        defaultHeaders: [String: String] = ["Accept": "application/json"],
        interceptors: [HTTPInterceptor] = [],
        retryPolicy: RetryPolicy = RetryPolicy(),
        sleeper: Sleeper,
        urlCache: URLCache? = nil
    ) {
        self.baseURL = baseURL
        self.session = session
        self.defaultHeaders = defaultHeaders
        self.interceptors = interceptors
        self.retryPolicy = retryPolicy
        self.sleeper = sleeper
        self.urlCache = urlCache ?? .shared
    }
    
    /// Sends an HTTP request and returns the response
    /// - Parameter request: The HTTP request to send
    /// - Returns: The HTTP response
    /// - Throws: AppError for various failure scenarios
    public func send(_ request: HTTPRequest) async throws -> HTTPResponse {
        // Build initial URLRequest
        var urlRequest: URLRequest
        do {
            urlRequest = try URLRequestBuilder.build(
                from: request,
                baseURL: baseURL,
                defaultHeaders: defaultHeaders
            )
        } catch {
            AppLogger.error(
                "Failed to build URL request: \(AppLogger.redacted(error.localizedDescription))",
                category: AppLogger.networking
            )
            throw AppError.fromNetworking(error)
        }
        
        // Apply interceptors' adapt methods in order
        for interceptor in interceptors {
            interceptor.adapt(&urlRequest)
        }
        
        // Apply cache policy
        applyCachePolicy(to: &urlRequest, from: request)
        
        // Retry loop - attempt is 1-based, maxAttempts includes initial attempt
        var attempt = 1
        
        while attempt <= retryPolicy.maxAttempts {
            // Log request attempt
            logRequest(urlRequest, requestID: nil, attempt: attempt)
            
            do {
                // Perform the request
                let (data, response) = try await session.data(for: urlRequest)
                let httpResponse = HTTPResponse(data: data, response: response)
                
                // Log response
                logResponse(httpResponse, attempt: attempt)
                
                // Check for success
                if httpResponse.isSuccess {
                    // Apply synthetic TTL if needed
                    applySyntheticTTL(response: httpResponse, urlRequest: urlRequest, request: request)
                    return httpResponse
                }
                
                // Handle HTTP error with retry logic
                let shouldRetry = checkForRetry(
                    response: response as? HTTPURLResponse,
                    data: data,
                    error: nil,
                    attempt: attempt
                )
                
                if shouldRetry.shouldRetry && attempt < retryPolicy.maxAttempts {
                    // Log retry decision with delay info
                    let delayText = shouldRetry.delay > 0 ? String(format: "%.1fs", shouldRetry.delay) : "immediate"
                    AppLogger.debug(
                        "Retrying after HTTP status \(httpResponse.statusCode) (attempt \(attempt + 1)) - delay: \(delayText)",
                        category: AppLogger.networking
                    )
                    attempt += 1
                    try await sleeper.sleep(seconds: shouldRetry.delay)
                    continue
                } else {
                    // No retry or max attempts reached - throw error
                    let error = AppError.fromHTTPStatus(httpResponse.statusCode, data: data)
                    AppLogger.error(
                        "HTTP error response: \(httpResponse.statusCode) \(AppLogger.redacted(error.description))",
                        category: AppLogger.networking
                    )
                    throw error
                }
                
            } catch {
                // Pass through cancellation errors directly
                if error is CancellationError {
                    throw error
                }
                
                // Handle transport error with retry logic
                let shouldRetry = checkForRetry(
                    response: nil,
                    data: nil,
                    error: error,
                    attempt: attempt
                )
                
                if shouldRetry.shouldRetry && attempt < retryPolicy.maxAttempts {
                    let delayText = shouldRetry.delay > 0 ? String(format: "%.1fs", shouldRetry.delay) : "immediate"
                    AppLogger.debug(
                        "Retrying after error: \(AppLogger.redacted(error.localizedDescription)) (attempt \(attempt + 1)) - delay: \(delayText)",
                        category: AppLogger.networking
                    )
                    attempt += 1
                    try await sleeper.sleep(seconds: shouldRetry.delay)
                    continue
                } else {
                    // No retry or max attempts reached - throw error
                    AppLogger.error(
                        "Network request failed: \(AppLogger.redacted(error.localizedDescription))",
                        category: AppLogger.networking
                    )
                    throw AppError.fromNetworking(error)
                }
            }
        }
        
        // This should never be reached due to the loop structure
        throw AppError.network(code: 0, message: "Unexpected retry loop exit")
    }
    
    // MARK: - Private Helpers
    
    /// Result of retry decision check
    private struct RetryResult {
        let shouldRetry: Bool
        let delay: TimeInterval
    }
    
    /// Checks interceptors for retry decisions
    /// - Parameters:
    ///   - response: HTTP response, if any
    ///   - data: Response data, if any
    ///   - error: Error that occurred, if any
    ///   - attempt: Current attempt number
    /// - Returns: Retry result with decision and delay
    private func checkForRetry(
        response: HTTPURLResponse?,
        data: Data?,
        error: Error?,
        attempt: Int
    ) -> RetryResult {
        // Ask each interceptor for retry decision
        for interceptor in interceptors {
            let decision = interceptor.shouldRetry(
                response: response,
                data: data,
                error: error,
                attempt: attempt
            )
            
            switch decision {
            case .retry(let explicitDelay):
                let delay = explicitDelay ?? retryPolicy.nextDelay(for: attempt)
                return RetryResult(shouldRetry: true, delay: delay)
            case .noRetry:
                continue // Check next interceptor
            }
        }
        
        return RetryResult(shouldRetry: false, delay: 0)
    }
    

    
    /// Logs the outgoing request with redacted sensitive information
    /// - Parameters:
    ///   - request: The URLRequest to log
    ///   - requestID: Optional request ID for correlation
    ///   - attempt: Current attempt number
    private func logRequest(_ request: URLRequest, requestID: String?, attempt: Int = 1) {
        let method = request.httpMethod ?? "UNKNOWN"
        let url = request.url?.absoluteString ?? "UNKNOWN"
        let redactedURL = AppLogger.redacted(url)
        
        var logMessage = "\(method) \(redactedURL)"
        if attempt > 1 {
            logMessage += " (attempt \(attempt))"
        }
        if let requestID = requestID {
            logMessage += " [ID: \(requestID)]"
        }
        
        AppLogger.debug(logMessage, category: AppLogger.networking)
        
        // Log headers (redacted) only on first attempt to avoid spam
        if attempt == 1, !Redaction.redactedHeaders(from: request).isEmpty {
            let redactedHeaders = Redaction.redactedHeaders(from: request)
            AppLogger.debug("Request headers: \(redactedHeaders)", category: AppLogger.networking)
        }
    }
    
    /// Logs the incoming response
    /// - Parameters:
    ///   - response: The HTTPResponse to log
    ///   - attempt: Current attempt number
    private func logResponse(_ response: HTTPResponse, attempt: Int = 1) {
        var logMessage = "Response: \(response.statusCode)"
        if attempt > 1 {
            logMessage += " (attempt \(attempt))"
        }
        if let requestID = response.requestID {
            logMessage += " [ID: \(requestID)]"
        }
        
        AppLogger.debug(logMessage, category: AppLogger.networking)
        
        // Log response headers (redacted) only on first attempt to avoid spam
        if attempt == 1, !response.headers.isEmpty {
            let redactedHeaders = Redaction.redactedHeaders(response.headers)
            AppLogger.debug("Response headers: \(redactedHeaders)", category: AppLogger.networking)
        }
    }
    
    // MARK: - Cache Helpers
    
    /// Applies cache policy to the URLRequest
    /// - Parameters:
    ///   - urlRequest: The mutable URLRequest
    ///   - request: The original HTTPRequest
    private func applyCachePolicy(to urlRequest: inout URLRequest, from request: HTTPRequest) {
        if let cachePolicy = request.cachePolicy {
            switch cachePolicy.mode {
            case .useURLCache:
                urlRequest.cachePolicy = .useProtocolCachePolicy
            case .reloadIgnoringCache:
                urlRequest.cachePolicy = .reloadIgnoringLocalCacheData
            }
        } else {
            urlRequest.cachePolicy = .useProtocolCachePolicy
        }
    }
    
    /// Determines if a response should be cached
    /// - Parameter response: The HTTP response
    /// - Returns: true if the response is cacheable
    @inline(__always)
    private func shouldCache(_ response: HTTPResponse) -> Bool {
        return CacheControl.isCacheable(status: response.statusCode, headers: response.headers)
    }
    
    /// Applies synthetic TTL to cacheable responses when server headers are missing
    /// - Parameters:
    ///   - response: The HTTP response
    ///   - urlRequest: The original URL request
    ///   - request: The original HTTP request
    private func applySyntheticTTL(
        response: HTTPResponse,
        urlRequest: URLRequest,
        request: HTTPRequest
    ) {
        // Only apply synthetic TTL if:
        // 1. Response is cacheable
        // 2. No existing TTL from server headers
        // 3. Request has a defaultTTL specified
        guard shouldCache(response),
              CacheControl.ttl(from: response.headers) == nil,
              let defaultTTL = request.cachePolicy?.defaultTTL else {
            return
        }
        
        // Create a synthetic Cache-Control header
        var modifiedHeaders = response.headers
        modifiedHeaders["Cache-Control"] = "max-age=\(Int(defaultTTL))"
        
        // Create cached response with synthetic TTL marker
        if let httpURLResponse = HTTPURLResponse(
            url: urlRequest.url!,
            statusCode: response.statusCode,
            httpVersion: "HTTP/1.1",
            headerFields: modifiedHeaders
        ) {
            let cachedResponse = CachedURLResponse(
                response: httpURLResponse,
                data: response.data,
                userInfo: ["syntheticTTL": true],
                storagePolicy: .allowed
            )
            
            urlCache.storeCachedResponse(cachedResponse, for: urlRequest)
            
            AppLogger.debug(
                "[syntheticTTL] Applied synthetic TTL \(defaultTTL)s to response for \(AppLogger.redacted(urlRequest.url?.absoluteString ?? "unknown"))",
                category: AppLogger.networking
            )
        }
    }
}
