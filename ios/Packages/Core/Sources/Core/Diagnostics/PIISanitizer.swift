import Foundation

/// Sanitizes attributes to prevent PII leakage
public struct PIISanitizer {
    private static let allowedKeys: Set<String> = [
        "appVersion", "build", "tenant", "plan", "screen", "flow",
        "locale", "deviceModel", "osVersion", "feature", "action",
        "conversationId", "messageCount", "provider", "style"
    ]
    
    private static let maxStringLength = 256
    
    /// Filter attributes to allowed keys only
    public static func filter(_ attributes: [String: String]) -> [String: String] {
        attributes
            .filter { allowedKeys.contains($0.key) }
            .mapValues { truncate($0) }
    }
    
    /// Truncate string to max length
    private static func truncate(_ value: String) -> String {
        value.count > maxStringLength
            ? String(value.prefix(maxStringLength))
            : value
    }
    
    /// Sanitize user email (if needed, hash or redact)
    public static func sanitizeEmail(_ email: String?) -> String? {
        guard email != nil else { return nil }
        // For now, return nil to never send email
        // If needed: return email.sha256() or similar
        return nil
    }
}

