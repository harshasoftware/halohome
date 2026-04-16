import Foundation

/// Configuration for retry behavior with exponential backoff and jitter
public struct RetryPolicy: Sendable {
    /// Maximum number of retry attempts
    public let maxAttempts: Int
    
    /// Base delay for exponential backoff calculation
    public let baseDelay: TimeInterval
    
    /// Maximum delay cap for backoff
    public let maxDelay: TimeInterval
    
    /// Jitter fraction (0.0...1.0) to randomize delays
    public let jitter: Double
    
    /// Creates a retry policy with default values
    /// - Parameters:
    ///   - maxAttempts: Maximum retry attempts (default: 3)
    ///   - baseDelay: Base delay in seconds (default: 0.5)
    ///   - maxDelay: Maximum delay cap in seconds (default: 8.0)
    ///   - jitter: Jitter fraction 0.0...1.0 (default: 0.2)
    public init(
        maxAttempts: Int = 3,
        baseDelay: TimeInterval = 0.5,
        maxDelay: TimeInterval = 8.0,
        jitter: Double = 0.2
    ) {
        self.maxAttempts = maxAttempts
        self.baseDelay = baseDelay
        self.maxDelay = maxDelay
        self.jitter = max(0.0, min(1.0, jitter)) // Clamp to [0.0, 1.0]
    }
    
    /// Calculates the next delay for the given attempt using exponential backoff with jitter
    /// - Parameter attempt: The attempt number (1-based)
    /// - Returns: Delay in seconds
    public func nextDelay(for attempt: Int) -> TimeInterval {
        // Exponential backoff: baseDelay * (2 ^ (attempt - 1))
        let exponentialDelay = baseDelay * pow(2.0, Double(attempt - 1))
        
        // Cap at maxDelay
        let cappedDelay = min(exponentialDelay, maxDelay)
        
        // Apply jitter: delay ± (jitter * delay)
        let jitterRange = cappedDelay * jitter
        let randomJitter = Double.random(in: -jitterRange...jitterRange)
        
        // Ensure non-negative result
        return max(0.0, cappedDelay + randomJitter)
    }
    
    /// Parses Retry-After header value to TimeInterval
    /// - Parameter retryAfterValue: The Retry-After header value
    /// - Returns: Delay in seconds, or nil if not parseable
    public static func parseRetryAfter(_ retryAfterValue: String) -> TimeInterval? {
        // Try parsing as numeric seconds first
        if let seconds = TimeInterval(retryAfterValue) {
            return seconds
        }
        
        // Try parsing as HTTP-date (RFC 7231)
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        dateFormatter.timeZone = TimeZone(abbreviation: "GMT")
        
        if let retryAfterDate = dateFormatter.date(from: retryAfterValue) {
            let timeInterval = retryAfterDate.timeIntervalSinceNow
            return timeInterval > 0 ? timeInterval : nil
        }
        
        return nil
    }
}
