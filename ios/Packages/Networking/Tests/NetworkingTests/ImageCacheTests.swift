import XCTest
@testable import Networking

final class ImageCacheTests: XCTestCase {
    
    private var cache: ImageCache!
    
    override func setUp() {
        super.setUp()
        cache = ImageCache(countLimit: 10, totalCostLimit: 1024 * 1024) // 1MB for tests
    }
    
    override func tearDown() {
        cache.removeAll()
        cache = nil
        super.tearDown()
    }
    
    // MARK: - Basic Operations
    
    func testInsertAndRetrieve() {
        // Given
        let url = URL(string: "https://example.com/image.jpg")!
        let data = "test image data".data(using: .utf8)!
        
        // When
        cache.insert(data, for: url)
        let retrievedData = cache.data(for: url)
        
        // Then
        XCTAssertEqual(retrievedData, data)
    }
    
    func testRetrieveNonExistentData() {
        // Given
        let url = URL(string: "https://example.com/missing.jpg")!
        
        // When
        let data = cache.data(for: url)
        
        // Then
        XCTAssertNil(data)
    }
    
    func testRemoveSpecificURL() {
        // Given
        let url1 = URL(string: "https://example.com/image1.jpg")!
        let url2 = URL(string: "https://example.com/image2.jpg")!
        let data1 = "image1 data".data(using: .utf8)!
        let data2 = "image2 data".data(using: .utf8)!
        
        cache.insert(data1, for: url1)
        cache.insert(data2, for: url2)
        
        // When
        cache.remove(for: url1)
        
        // Then
        XCTAssertNil(cache.data(for: url1))
        XCTAssertEqual(cache.data(for: url2), data2)
    }
    
    func testRemoveAll() {
        // Given
        let url1 = URL(string: "https://example.com/image1.jpg")!
        let url2 = URL(string: "https://example.com/image2.jpg")!
        let data1 = "image1 data".data(using: .utf8)!
        let data2 = "image2 data".data(using: .utf8)!
        
        cache.insert(data1, for: url1)
        cache.insert(data2, for: url2)
        
        // When
        cache.removeAll()
        
        // Then
        XCTAssertNil(cache.data(for: url1))
        XCTAssertNil(cache.data(for: url2))
    }
    
    func testOverwriteExistingData() {
        // Given
        let url = URL(string: "https://example.com/image.jpg")!
        let originalData = "original data".data(using: .utf8)!
        let newData = "new data".data(using: .utf8)!
        
        // When
        cache.insert(originalData, for: url)
        cache.insert(newData, for: url)
        
        // Then
        XCTAssertEqual(cache.data(for: url), newData)
    }
    
    // MARK: - Thread Safety Tests
    
    func testConcurrentInsertAndRead() async {
        // Given
        let urls = (0..<10).map { URL(string: "https://example.com/image\($0).jpg")! }
        let dataArray = urls.map { "data for \($0.lastPathComponent)".data(using: .utf8)! }
        
        // When - concurrent inserts and reads
        await withTaskGroup(of: Void.self) { group in
            // Insert tasks
            for (index, url) in urls.enumerated() {
                group.addTask {
                    self.cache.insert(dataArray[index], for: url)
                }
            }
            
            // Read tasks
            for url in urls {
                group.addTask {
                    _ = self.cache.data(for: url)
                }
            }
        }
        
        // Then - all data should be accessible
        for (index, url) in urls.enumerated() {
            let retrievedData = cache.data(for: url)
            XCTAssertEqual(retrievedData, dataArray[index])
        }
    }
    
    func testConcurrentRemoveOperations() async {
        // Given
        let urls = (0..<5).map { URL(string: "https://example.com/image\($0).jpg")! }
        let dataArray = urls.map { "data for \($0.lastPathComponent)".data(using: .utf8)! }
        
        // Insert all data first
        for (index, url) in urls.enumerated() {
            cache.insert(dataArray[index], for: url)
        }
        
        // When - concurrent removes
        await withTaskGroup(of: Void.self) { group in
            for url in urls {
                group.addTask {
                    self.cache.remove(for: url)
                }
            }
        }
        
        // Then - all should be removed
        for url in urls {
            XCTAssertNil(cache.data(for: url))
        }
    }
    
    // MARK: - Cache Limits Tests
    
    func testCountLimit() {
        // Given - cache with count limit of 3
        let limitedCache = ImageCache(countLimit: 3, totalCostLimit: Int.max)
        let urls = (0..<5).map { URL(string: "https://example.com/image\($0).jpg")! }
        let data = "test data".data(using: .utf8)!
        
        // When - insert more items than limit
        for url in urls {
            limitedCache.insert(data, for: url)
        }
        
        // Then - some items should be evicted (exact behavior depends on NSCache)
        let cachedCount = urls.compactMap { limitedCache.data(for: $0) }.count
        XCTAssertLessThanOrEqual(cachedCount, 3)
    }
    
    func testDefaultInitialization() {
        // Given & When
        let defaultCache = ImageCache()
        let url = URL(string: "https://example.com/test.jpg")!
        let data = "test".data(using: .utf8)!
        
        // Then - should work with default limits
        defaultCache.insert(data, for: url)
        XCTAssertEqual(defaultCache.data(for: url), data)
    }
    
    // MARK: - URL Key Tests
    
    func testDifferentURLsStoreSeparately() {
        // Given
        let url1 = URL(string: "https://example.com/image.jpg")!
        let url2 = URL(string: "https://example.com/image.png")!
        let data1 = "jpg data".data(using: .utf8)!
        let data2 = "png data".data(using: .utf8)!
        
        // When
        cache.insert(data1, for: url1)
        cache.insert(data2, for: url2)
        
        // Then
        XCTAssertEqual(cache.data(for: url1), data1)
        XCTAssertEqual(cache.data(for: url2), data2)
    }
    
    func testSameURLWithDifferentFragments() {
        // Given
        let url1 = URL(string: "https://example.com/image.jpg")!
        let url2 = URL(string: "https://example.com/image.jpg#fragment")!
        let data1 = "data1".data(using: .utf8)!
        let data2 = "data2".data(using: .utf8)!
        
        // When
        cache.insert(data1, for: url1)
        cache.insert(data2, for: url2)
        
        // Then - should be treated as different keys
        XCTAssertEqual(cache.data(for: url1), data1)
        XCTAssertEqual(cache.data(for: url2), data2)
    }
}
