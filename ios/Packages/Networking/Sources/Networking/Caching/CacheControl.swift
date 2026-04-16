import Foundation

/// Utilities for parsing and evaluating HTTP cache control headers
public enum CacheControl {
    
    /// Extracts TTL (time-to-live) from HTTP response headers
    /// - Parameter headers: Response headers dictionary
    /// - Returns: TTL in seconds, or nil if not cacheable or negative
    public static func ttl(from headers: [String: String]) -> TimeInterval? {
        // Normalize headers to lowercase for consistent lookup
        let normalizedHeaders = Dictionary(uniqueKeysWithValues: headers.map { (key, value) in
            (key.lowercased(), value)
        })
        
        // Check for Cache-Control: max-age first (takes precedence over Expires)
        if let cacheControl = normalizedHeaders["cache-control"] {
            if let maxAge = parseMaxAge(from: cacheControl) {
                return maxAge > 0 ? maxAge : nil
            }
        }
        
        // Fall back to Expires header
        if let expires = normalizedHeaders["expires"] {
            return parseExpires(expires)
        }
        
        return nil
    }
    
    /// Determines if a response is cacheable based on status code and headers
    /// - Parameters:
    ///   - status: HTTP status code
    ///   - headers: Response headers dictionary
    /// - Returns: true if the response can be cached
    public static func isCacheable(status: Int, headers: [String: String]) -> Bool {
        // Normalize headers to lowercase for consistent lookup
        let normalizedHeaders = Dictionary(uniqueKeysWithValues: headers.map { (key, value) in
            (key.lowercased(), value)
        })
        
        // Check for explicit no-store directive
        if let cacheControl = normalizedHeaders["cache-control"] {
            let directives = parseCacheControlDirectives(cacheControl)
            if directives.contains("no-store") {
                return false
            }
        }
        
        // Check status codes that are cacheable by default
        let cacheableStatusCodes: Set<Int> = [200, 203, 204, 206, 300, 301, 308, 404, 410]
        return cacheableStatusCodes.contains(status)
    }
    
    // MARK: - Private Helpers
    
    /// Parses max-age directive from Cache-Control header
    /// - Parameter cacheControl: Cache-Control header value
    /// - Returns: max-age value in seconds, or nil if not found
    private static func parseMaxAge(from cacheControl: String) -> TimeInterval? {
        let directives = parseCacheControlDirectives(cacheControl)
        
        for directive in directives {
            let parts = directive.split(separator: "=", maxSplits: 1)
            if parts.count == 2 && parts[0].trimmingCharacters(in: .whitespaces).lowercased() == "max-age" {
                let value = parts[1].trimmingCharacters(in: .whitespaces)
                return TimeInterval(value)
            }
        }
        
        return nil
    }
    
    /// Parses Cache-Control header into individual directives
    /// - Parameter cacheControl: Cache-Control header value
    /// - Returns: Array of directive strings (lowercased and trimmed)
    private static func parseCacheControlDirectives(_ cacheControl: String) -> [String] {
        return cacheControl
            .split(separator: ",")
            .map { $0.trimmingCharacters(in: .whitespaces).lowercased() }
    }
    
    /// Parses Expires header to calculate TTL
    /// - Parameter expires: Expires header value
    /// - Returns: TTL in seconds from now, or nil if invalid/past
    private static func parseExpires(_ expires: String) -> TimeInterval? {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(abbreviation: "GMT")
        
        // Try common HTTP-date formats in order of preference
        let dateFormats = [
            "EEE, dd MMM yyyy HH:mm:ss zzz",  // RFC1123: "Wed, 09 Jun 1999 10:18:14 GMT"
            "EEEE, dd-MMM-yy HH:mm:ss zzz",  // RFC850: "Wednesday, 09-Jun-99 10:18:14 GMT"
            "EEE MMM d HH:mm:ss yyyy"        // ANSI C asctime: "Wed Jun  9 10:18:14 1999"
        ]
        
        for dateFormat in dateFormats {
            formatter.dateFormat = dateFormat
            if let expiresDate = formatter.date(from: expires) {
                let ttl = expiresDate.timeIntervalSinceNow
                return ttl > 0 ? ttl : nil
            }
        }
        
        return nil
    }
}
