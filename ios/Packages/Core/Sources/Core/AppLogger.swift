import OSLog

/// Centralized logging system using OSLog with predefined categories and redaction helpers.
/// Provides structured logging across the application with automatic PII protection.
@available(iOS 14.0, macOS 11.0, *)
public enum AppLogger {
    
    /// Application subsystem identifier for logging
    public static let subsystem = Bundle.main.bundleIdentifier ?? "SwiftAI"
    
    // MARK: - Logger Categories
    
    /// Logger for networking operations (HTTP requests, responses, errors)
    public static let networking = Logger(subsystem: subsystem, category: "networking")
    
    /// Logger for AI operations (LLM requests, streaming, provider interactions)
    public static let ai = Logger(subsystem: subsystem, category: "ai")
    
    /// Logger for UI operations (user interactions, view lifecycle, navigation)
    public static let ui = Logger(subsystem: subsystem, category: "ui")
    
    /// Logger for feature operations (chat, settings, etc.)
    public static let feature = Logger(subsystem: subsystem, category: "feature")
    
    /// Logger for storage operations (SwiftData, Keychain, persistence)
    public static let storage = Logger(subsystem: subsystem, category: "storage")
    
    /// Logger for notification operations (APNs, permissions, push notifications)
    public static let notifications = Logger(subsystem: subsystem, category: "notifications")
    
    /// Logger for authentication operations (sign in, sign out, token refresh)
    public static let auth = Logger(subsystem: subsystem, category: "auth")
    
    /// Logger for payment operations (subscriptions, purchases, Adapty)
    public static let payments = Logger(subsystem: subsystem, category: "payments")
    
    // MARK: - Logging Methods
    
    /// Log debug message
    /// - Parameters:
    ///   - message: Debug message to log
    ///   - category: Logger category (defaults to .ui)
    public static func debug(_ message: @autoclosure @escaping () -> String, category: Logger = AppLogger.ui) {
        category.debug("\(message())")
    }
    
    /// Log info message
    /// - Parameters:
    ///   - message: Info message to log
    ///   - category: Logger category (defaults to .ui)
    public static func info(_ message: @autoclosure @escaping () -> String, category: Logger = AppLogger.ui) {
        category.info("\(message())")
    }
    
    /// Log error message
    /// - Parameters:
    ///   - message: Error message to log
    ///   - category: Logger category (defaults to .ui)
    public static func error(_ message: @autoclosure @escaping () -> String, category: Logger = AppLogger.ui) {
        category.error("\(message())")
    }
    
    // MARK: - Redaction Helpers
    
    /// Redacts sensitive information from strings to prevent logging of secrets.
    /// 
    /// **Usage**: Always pass sensitive data through this function before logging:
    /// ```swift
    /// AppLogger.debug("API Key: \(AppLogger.redacted(apiKey))", category: .networking)
    /// ```
    /// 
    /// **Patterns redacted**:
    /// - API keys starting with "sk-", "pk-", "rk-"
    /// - Bearer tokens
    /// - Authorization headers
    /// - JWT tokens (detected by structure)
    /// - Long base64-like strings (>20 chars, alphanumeric + common base64 chars)
    /// 
    /// - Parameter string: String that may contain sensitive information
    /// - Returns: String with sensitive parts replaced with "•••"
    public static func redacted(_ string: String) -> String {
        var result = string
        
        // Redact common API key patterns (case-insensitive)
        let apiKeyPatterns = [
            "sk-[a-zA-Z0-9]+",      // OpenAI style secret keys
            "pk-[a-zA-Z0-9]+",      // Public keys
            "rk-[a-zA-Z0-9]+",      // Restricted keys
            "(?i)bearer [a-zA-Z0-9._-]+", // Bearer tokens (case-insensitive)
            "(?i)authorization[:=]\\s*[a-zA-Z0-9._-]+", // Auth headers/params (case-insensitive)
            "(?i)api_key[:=][a-zA-Z0-9._-]+", // API key query params (case-insensitive)
        ]
        
        for pattern in apiKeyPatterns {
            result = result.replacingOccurrences(
                of: pattern,
                with: "•••",
                options: .regularExpression
            )
        }
        
        // Redact JWT-like tokens (three base64 parts separated by dots)
        let jwtPattern = "[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+\\.[a-zA-Z0-9_-]+"
        result = result.replacingOccurrences(
            of: jwtPattern,
            with: "•••",
            options: .regularExpression
        )
        
        // Redact long base64-like strings (likely to be tokens/keys)
        let longBase64Pattern = "[a-zA-Z0-9+/=]{20,}"
        result = result.replacingOccurrences(
            of: longBase64Pattern,
            with: "•••",
            options: .regularExpression
        )
        
        return result
    }
    
    /// Convenience method to redact multiple strings in a dictionary-like format
    /// Useful for logging request/response data
    /// - Parameter data: Dictionary-like data that may contain sensitive keys
    /// - Returns: Redacted string representation
    public static func redactedData<T>(_ data: T) -> String where T: CustomStringConvertible {
        return redacted(data.description)
    }
}
