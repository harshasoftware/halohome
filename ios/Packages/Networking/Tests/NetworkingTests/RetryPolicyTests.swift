import XCTest
@testable import Networking

final class RetryPolicyTests: XCTestCase {
    
    // MARK: - Backoff Delay Tests
    
    func testNextDelayExponentialGrowth() {
        // Given
        let policy = RetryPolicy(
            maxAttempts: 5,
            baseDelay: 1.0,
            maxDelay: 10.0,
            jitter: 0.0 // No jitter for predictable testing
        )
        
        // When & Then
        let delay1 = policy.nextDelay(for: 1)
        let delay2 = policy.nextDelay(for: 2)
        let delay3 = policy.nextDelay(for: 3)
        
        // Exponential backoff: 1.0 * 2^(attempt-1)
        XCTAssertEqual(delay1, 1.0, accuracy: 0.001) // 1.0 * 2^0 = 1.0
        XCTAssertEqual(delay2, 2.0, accuracy: 0.001) // 1.0 * 2^1 = 2.0
        XCTAssertEqual(delay3, 4.0, accuracy: 0.001) // 1.0 * 2^2 = 4.0
    }
    
    func testNextDelayMaxCapApplied() {
        // Given
        let policy = RetryPolicy(
            maxAttempts: 10,
            baseDelay: 2.0,
            maxDelay: 5.0,
            jitter: 0.0 // No jitter for predictable testing
        )
        
        // When & Then
        let delay1 = policy.nextDelay(for: 1)
        let delay2 = policy.nextDelay(for: 2)
        let delay3 = policy.nextDelay(for: 3)
        let delay4 = policy.nextDelay(for: 4)
        
        XCTAssertEqual(delay1, 2.0, accuracy: 0.001) // 2.0 * 2^0 = 2.0
        XCTAssertEqual(delay2, 4.0, accuracy: 0.001) // 2.0 * 2^1 = 4.0
        XCTAssertEqual(delay3, 5.0, accuracy: 0.001) // 2.0 * 2^2 = 8.0, capped at 5.0
        XCTAssertEqual(delay4, 5.0, accuracy: 0.001) // Remains at cap
    }
    
    func testNextDelayWithJitter() {
        // Given
        let policy = RetryPolicy(
            maxAttempts: 3,
            baseDelay: 2.0,
            maxDelay: 10.0,
            jitter: 0.5 // 50% jitter
        )
        
        // When
        let delay1 = policy.nextDelay(for: 1)
        let delay2 = policy.nextDelay(for: 2)
        
        // Then - delays should be within jitter range
        // Attempt 1: base delay = 2.0, jitter range = ±1.0, so [1.0, 3.0]
        XCTAssertGreaterThanOrEqual(delay1, 1.0)
        XCTAssertLessThanOrEqual(delay1, 3.0)
        
        // Attempt 2: base delay = 4.0, jitter range = ±2.0, so [2.0, 6.0]
        XCTAssertGreaterThanOrEqual(delay2, 2.0)
        XCTAssertLessThanOrEqual(delay2, 6.0)
    }
    
    func testNextDelayNonNegative() {
        // Given - extreme jitter that could theoretically go negative
        let policy = RetryPolicy(
            maxAttempts: 3,
            baseDelay: 0.1,
            maxDelay: 10.0,
            jitter: 1.0 // 100% jitter
        )
        
        // When
        let delay = policy.nextDelay(for: 1)
        
        // Then - should never be negative
        XCTAssertGreaterThanOrEqual(delay, 0.0)
    }
    
    func testJitterClampedToValidRange() {
        // Given - jitter values outside [0.0, 1.0] range
        let policy1 = RetryPolicy(jitter: -0.5) // Negative
        let policy2 = RetryPolicy(jitter: 1.5)  // > 1.0
        
        // When & Then - should be clamped
        // We can't directly test the clamped jitter value, but delays should be reasonable
        let delay1 = policy1.nextDelay(for: 1)
        let delay2 = policy2.nextDelay(for: 1)
        
        XCTAssertGreaterThanOrEqual(delay1, 0.0)
        XCTAssertGreaterThanOrEqual(delay2, 0.0)
    }
    
    // MARK: - Retry-After Parsing Tests
    
    func testParseRetryAfterNumericSeconds() {
        // When & Then
        XCTAssertEqual(RetryPolicy.parseRetryAfter("30"), 30.0)
        XCTAssertEqual(RetryPolicy.parseRetryAfter("0"), 0.0)
        XCTAssertEqual(RetryPolicy.parseRetryAfter("120"), 120.0)
        XCTAssertEqual(RetryPolicy.parseRetryAfter("1.5"), 1.5)
    }
    
    func testParseRetryAfterHTTPDate() {
        // Given - HTTP-date format (RFC 7231)
        let futureDate = Date().addingTimeInterval(60) // 60 seconds in the future
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        dateFormatter.timeZone = TimeZone(abbreviation: "GMT")
        let httpDateString = dateFormatter.string(from: futureDate)
        
        // When
        let parsedDelay = RetryPolicy.parseRetryAfter(httpDateString)
        
        // Then - should be approximately 60 seconds (allow some tolerance)
        XCTAssertNotNil(parsedDelay)
        XCTAssertGreaterThan(parsedDelay!, 55.0)
        XCTAssertLessThan(parsedDelay!, 65.0)
    }
    
    func testParseRetryAfterHTTPDateInPast() {
        // Given - date in the past
        let pastDate = Date().addingTimeInterval(-60) // 60 seconds ago
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        dateFormatter.timeZone = TimeZone(abbreviation: "GMT")
        let httpDateString = dateFormatter.string(from: pastDate)
        
        // When
        let parsedDelay = RetryPolicy.parseRetryAfter(httpDateString)
        
        // Then - should return nil for past dates
        XCTAssertNil(parsedDelay)
    }
    
    func testParseRetryAfterInvalidFormat() {
        // When & Then
        XCTAssertNil(RetryPolicy.parseRetryAfter("invalid"))
        XCTAssertNil(RetryPolicy.parseRetryAfter(""))
        XCTAssertNil(RetryPolicy.parseRetryAfter("not-a-number"))
        XCTAssertNil(RetryPolicy.parseRetryAfter("Mon, 32 Jan 2024 10:00:00 GMT")) // Invalid date
    }
    
    // MARK: - Default Values Tests
    
    func testDefaultPolicyValues() {
        // Given
        let policy = RetryPolicy()
        
        // Then
        XCTAssertEqual(policy.maxAttempts, 3)
        XCTAssertEqual(policy.baseDelay, 0.5)
        XCTAssertEqual(policy.maxDelay, 8.0)
        XCTAssertEqual(policy.jitter, 0.2)
    }
    
    func testCustomPolicyValues() {
        // Given
        let policy = RetryPolicy(
            maxAttempts: 5,
            baseDelay: 1.0,
            maxDelay: 16.0,
            jitter: 0.1
        )
        
        // Then
        XCTAssertEqual(policy.maxAttempts, 5)
        XCTAssertEqual(policy.baseDelay, 1.0)
        XCTAssertEqual(policy.maxDelay, 16.0)
        XCTAssertEqual(policy.jitter, 0.1)
    }
}
