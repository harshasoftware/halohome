import XCTest
@testable import Networking

final class CachePolicyTests: XCTestCase {
    
    // MARK: - CachePolicy Tests
    
    func testCachePolicyDefaultValues() {
        // Given
        let policy = CachePolicy()
        
        // Then
        XCTAssertEqual(policy.mode, .useURLCache)
        XCTAssertNil(policy.defaultTTL)
    }
    
    func testCachePolicyCustomValues() {
        // Given
        let policy = CachePolicy(mode: .reloadIgnoringCache, defaultTTL: 300)
        
        // Then
        XCTAssertEqual(policy.mode, .reloadIgnoringCache)
        XCTAssertEqual(policy.defaultTTL, 300)
    }
    
    func testCachePolicyEquality() {
        // Given
        let policy1 = CachePolicy(mode: .useURLCache, defaultTTL: 60)
        let policy2 = CachePolicy(mode: .useURLCache, defaultTTL: 60)
        let policy3 = CachePolicy(mode: .reloadIgnoringCache, defaultTTL: 60)
        let policy4 = CachePolicy(mode: .useURLCache, defaultTTL: 120)
        
        // Then
        XCTAssertEqual(policy1, policy2)
        XCTAssertNotEqual(policy1, policy3)
        XCTAssertNotEqual(policy1, policy4)
    }
    
    // MARK: - HTTPRequest Integration Tests
    
    func testHTTPRequestWithCachePolicy() {
        // Given
        let cachePolicy = CachePolicy(mode: .reloadIgnoringCache, defaultTTL: 600)
        let request = HTTPRequest(
            path: "/test",
            method: .get,
            cachePolicy: cachePolicy
        )
        
        // Then
        XCTAssertEqual(request.cachePolicy, cachePolicy)
    }
    
    func testHTTPRequestWithCacheConvenienceMethod() {
        // Given
        let originalRequest = HTTPRequest(path: "/test", method: .get)
        let cachePolicy = CachePolicy(mode: .reloadIgnoringCache)
        
        // When
        let requestWithCache = originalRequest.withCache(cachePolicy)
        
        // Then
        XCTAssertNil(originalRequest.cachePolicy)
        XCTAssertEqual(requestWithCache.cachePolicy, cachePolicy)
        XCTAssertEqual(requestWithCache.path, "/test")
        XCTAssertEqual(requestWithCache.method, .get)
    }
    
    func testHTTPRequestCachePolicyPreservedInConvenienceMethods() {
        // Given
        let cachePolicy = CachePolicy(mode: .useURLCache, defaultTTL: 300)
        let request = HTTPRequest(path: "/test", cachePolicy: cachePolicy)
        
        // When
        let requestWithHeader = request.withHeader("Authorization", "Bearer token")
        let requestWithQuery = request.withQuery("param", "value")
        
        // Then
        XCTAssertEqual(requestWithHeader.cachePolicy, cachePolicy)
        XCTAssertEqual(requestWithQuery.cachePolicy, cachePolicy)
    }
    
    func testCachePolicyModeValues() {
        // Given & When
        let useCache = CachePolicy.Mode.useURLCache
        let reloadIgnoring = CachePolicy.Mode.reloadIgnoringCache
        
        // Then
        XCTAssertEqual(useCache, .useURLCache)
        XCTAssertEqual(reloadIgnoring, .reloadIgnoringCache)
        XCTAssertNotEqual(useCache, reloadIgnoring)
    }
}
