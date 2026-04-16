import Foundation

/// Thread-safe in-memory cache for image data
/// 
/// This cache stores raw Data objects keyed by URL. UI layers should construct
/// platform-specific image objects (UIImage, NSImage) from the cached data.
public final class ImageCache: @unchecked Sendable {
    
    private let cache = NSCache<NSURL, NSData>()
    
    /// Creates a new image cache
    /// - Parameters:
    ///   - countLimit: Maximum number of objects to cache (default: 100)
    ///   - totalCostLimit: Maximum total cost in bytes (default: 50MB)
    public init(countLimit: Int = 100, totalCostLimit: Int = 50 * 1024 * 1024) {
        cache.countLimit = countLimit
        cache.totalCostLimit = totalCostLimit
        cache.name = "ImageCache"
    }
    
    /// Retrieves cached data for a URL
    /// - Parameter url: The URL to look up
    /// - Returns: Cached data if available, nil otherwise
    public func data(for url: URL) -> Data? {
        return cache.object(forKey: url as NSURL) as Data?
    }
    
    /// Stores data in the cache for a URL
    /// - Parameters:
    ///   - data: The data to cache
    ///   - url: The URL to use as the cache key
    public func insert(_ data: Data, for url: URL) {
        let cost = data.count
        cache.setObject(data as NSData, forKey: url as NSURL, cost: cost)
    }
    
    /// Removes cached data for a specific URL
    /// - Parameter url: The URL to remove from cache
    public func remove(for url: URL) {
        cache.removeObject(forKey: url as NSURL)
    }
    
    /// Removes all cached data
    public func removeAll() {
        cache.removeAllObjects()
    }
}
