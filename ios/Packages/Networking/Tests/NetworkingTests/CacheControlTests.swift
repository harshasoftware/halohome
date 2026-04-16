import XCTest
@testable import Networking

final class CacheControlTests: XCTestCase {
    
    // MARK: - TTL Parsing Tests
    
    func testTTLFromCacheControlMaxAge() {
        // Given
        let headers = ["Cache-Control": "max-age=3600"]
        
        // When
        let ttl = CacheControl.ttl(from: headers)
        
        // Then
        XCTAssertEqual(ttl, 3600)
    }
    
    func testTTLFromCacheControlMaxAgeWithOtherDirectives() {
        // Given
        let headers = ["Cache-Control": "public, max-age=1800, must-revalidate"]
        
        // When
        let ttl = CacheControl.ttl(from: headers)
        
        // Then
        XCTAssertEqual(ttl, 1800)
    }
    
    func testTTLFromCacheControlZeroMaxAge() {
        // Given
        let headers = ["Cache-Control": "max-age=0"]
        
        // When
        let ttl = CacheControl.ttl(from: headers)
        
        // Then
        XCTAssertNil(ttl) // Zero or negative max-age should return nil
    }
    
    func testTTLFromExpiresHeaderFuture() {
        // Given
        let futureDate = Date().addingTimeInterval(7200) // 2 hours from now
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(abbreviation: "GMT")
        let expiresString = formatter.string(from: futureDate)
        
        let headers = ["Expires": expiresString]
        
        // When
        let ttl = CacheControl.ttl(from: headers)
        
        // Then
        XCTAssertNotNil(ttl)
        XCTAssertGreaterThan(ttl!, 7000) // Should be close to 7200 seconds
        XCTAssertLessThan(ttl!, 7300)
    }
    
    func testTTLFromExpiresHeaderPast() {
        // Given
        let pastDate = Date().addingTimeInterval(-3600) // 1 hour ago
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(abbreviation: "GMT")
        let expiresString = formatter.string(from: pastDate)
        
        let headers = ["Expires": expiresString]
        
        // When
        let ttl = CacheControl.ttl(from: headers)
        
        // Then
        XCTAssertNil(ttl) // Past dates should return nil
    }
    
    func testTTLFromExpiresHeaderRFC850Format() {
        // Given
        let futureDate = Date().addingTimeInterval(3600) // 1 hour from now
        let formatter = DateFormatter()
        formatter.dateFormat = "EEEE, dd-MMM-yy HH:mm:ss zzz"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(abbreviation: "GMT")
        let expiresString = formatter.string(from: futureDate)
        
        let headers = ["Expires": expiresString]
        
        // When
        let ttl = CacheControl.ttl(from: headers)
        
        // Then
        XCTAssertNotNil(ttl)
        XCTAssertGreaterThan(ttl!, 3500) // Should be close to 3600 seconds
        XCTAssertLessThan(ttl!, 3700)
    }
    
    func testTTLFromExpiresHeaderANSICFormat() {
        // Given
        let futureDate = Date().addingTimeInterval(1800) // 30 minutes from now
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE MMM d HH:mm:ss yyyy"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(abbreviation: "GMT")
        let expiresString = formatter.string(from: futureDate)
        
        let headers = ["Expires": expiresString]
        
        // When
        let ttl = CacheControl.ttl(from: headers)
        
        // Then
        XCTAssertNotNil(ttl)
        XCTAssertGreaterThan(ttl!, 1700) // Should be close to 1800 seconds
        XCTAssertLessThan(ttl!, 1900)
    }
    
    func testTTLCacheControlTakesPrecedenceOverExpires() {
        // Given
        let futureDate = Date().addingTimeInterval(7200)
        let formatter = DateFormatter()
        formatter.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(abbreviation: "GMT")
        let expiresString = formatter.string(from: futureDate)
        
        let headers = [
            "Cache-Control": "max-age=1800",
            "Expires": expiresString
        ]
        
        // When
        let ttl = CacheControl.ttl(from: headers)
        
        // Then
        XCTAssertEqual(ttl, 1800) // Should use max-age, not Expires
    }
    
    func testTTLWithInvalidHeaders() {
        // Given & When & Then
        XCTAssertNil(CacheControl.ttl(from: ["Cache-Control": "max-age=invalid"]))
        XCTAssertNil(CacheControl.ttl(from: ["Expires": "invalid-date"]))
        XCTAssertNil(CacheControl.ttl(from: ["Cache-Control": "public"]))
        XCTAssertNil(CacheControl.ttl(from: [:]))
    }
    
    func testTTLWithCaseInsensitiveHeaders() {
        // Given
        let headers1 = ["cache-control": "max-age=600"]
        let headers2 = ["expires": "Wed, 21 Oct 2025 07:28:00 GMT"]
        
        // When & Then
        XCTAssertEqual(CacheControl.ttl(from: headers1), 600)
        XCTAssertNotNil(CacheControl.ttl(from: headers2))
    }
    
    // MARK: - Cacheability Tests
    
    func testIsCacheableWithCacheableStatusCodes() {
        // Given
        let cacheableStatusCodes = [200, 203, 204, 206, 300, 301, 308, 404, 410]
        let headers: [String: String] = [:]
        
        // When & Then
        for statusCode in cacheableStatusCodes {
            XCTAssertTrue(
                CacheControl.isCacheable(status: statusCode, headers: headers),
                "Status code \(statusCode) should be cacheable"
            )
        }
    }
    
    func testIsCacheableWithNonCacheableStatusCodes() {
        // Given
        let nonCacheableStatusCodes = [201, 202, 400, 401, 403, 500, 502]
        let headers: [String: String] = [:]
        
        // When & Then
        for statusCode in nonCacheableStatusCodes {
            XCTAssertFalse(
                CacheControl.isCacheable(status: statusCode, headers: headers),
                "Status code \(statusCode) should not be cacheable"
            )
        }
    }
    
    func testIsCacheableWithNoStoreDirective() {
        // Given
        let headers = ["Cache-Control": "no-store"]
        
        // When & Then
        XCTAssertFalse(CacheControl.isCacheable(status: 200, headers: headers))
    }
    
    func testIsCacheableWithNoStoreAmongOtherDirectives() {
        // Given
        let headers = ["Cache-Control": "public, no-store, max-age=3600"]
        
        // When & Then
        XCTAssertFalse(CacheControl.isCacheable(status: 200, headers: headers))
    }
    
    func testIsCacheableWithCaseInsensitiveHeaders() {
        // Given
        let headers = ["cache-control": "no-store"]
        
        // When & Then
        XCTAssertFalse(CacheControl.isCacheable(status: 200, headers: headers))
    }
    
    func testIsCacheableWithOtherCacheDirectives() {
        // Given
        let allowedDirectives = [
            "public, max-age=3600",
            "private, max-age=1800",
            "no-cache, max-age=0", // no-cache is allowed (just means must revalidate)
            "must-revalidate, max-age=600"
        ]
        
        // When & Then
        for directive in allowedDirectives {
            let headers = ["Cache-Control": directive]
            XCTAssertTrue(
                CacheControl.isCacheable(status: 200, headers: headers),
                "Directive '\(directive)' should allow caching"
            )
        }
    }
    
    func testCacheControlDirectivesHandling() {
        // Given
        let testCases: [(directive: String, shouldCache: Bool, description: String)] = [
            ("no-store", false, "no-store should prevent caching"),
            ("no-cache", true, "no-cache should allow caching (requires revalidation)"),
            ("must-revalidate", true, "must-revalidate should allow caching"),
            ("public", true, "public should allow caching"),
            ("private", true, "private should allow caching"),
            ("max-age=3600", true, "max-age should allow caching"),
            ("no-store, max-age=3600", false, "no-store should override max-age")
        ]
        
        // When & Then
        for testCase in testCases {
            let headers = ["Cache-Control": testCase.directive]
            let result = CacheControl.isCacheable(status: 200, headers: headers)
            XCTAssertEqual(result, testCase.shouldCache, testCase.description)
        }
    }
    
    func testStatus308IsCacheable() {
        // Given
        let headers: [String: String] = [:]
        
        // When
        let isCacheable = CacheControl.isCacheable(status: 308, headers: headers)
        
        // Then
        XCTAssertTrue(isCacheable, "Status 308 (Permanent Redirect) should be cacheable")
    }
}
