import Foundation

/// Policy for HTTP response caching behavior
public struct CachePolicy: Sendable, Equatable {
    
    /// Cache mode determining how requests interact with URLCache
    public enum Mode: Sendable, Equatable {
        /// Use URLCache with standard protocol behavior
        case useURLCache
        
        /// Reload ignoring local cache data
        case reloadIgnoringCache
    }
    
    /// The caching mode to use
    public let mode: Mode
    
    /// Default TTL to apply when server headers are missing or don't specify cache duration
    /// If nil, no synthetic TTL is applied for responses without cache headers
    public let defaultTTL: TimeInterval?
    
    /// Creates a cache policy
    /// - Parameters:
    ///   - mode: Caching mode (default: .useURLCache)
    ///   - defaultTTL: Fallback TTL when server headers are missing (default: nil)
    public init(mode: Mode = .useURLCache, defaultTTL: TimeInterval? = nil) {
        self.mode = mode
        self.defaultTTL = defaultTTL
    }
}
