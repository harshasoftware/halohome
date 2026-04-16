import Foundation

/// Represents deep link destinations within the app
public enum DeepLink: Equatable {
    /// Navigate to chat with specific conversation
    case chat(conversationId: String)
    
    /// Parse a URL into a DeepLink
    /// - Parameter url: The URL to parse
    /// - Returns: DeepLink if parsing succeeds, nil otherwise
    public static func parse(_ url: URL) -> DeepLink? {
        guard let components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            AppLogger.debug("Failed to parse URL components", category: AppLogger.notifications)
            return nil
        }
        
        // Handle custom URL scheme: sai://chat?conversationId=debug-123
        if components.scheme == "sai" {
            switch components.host {
            case "chat":
                // Extract conversationId from query parameters
                if let conversationId = components.queryItems?.first(where: { $0.name == "conversationId" })?.value,
                   !conversationId.isEmpty {
                    AppLogger.debug("Parsed chat deep link: \(conversationId)", category: AppLogger.notifications)
                    return .chat(conversationId: conversationId)
                } else {
                    AppLogger.debug("Missing or empty conversationId in chat deep link", category: AppLogger.notifications)
                    return nil
                }
            default:
                AppLogger.debug("Unknown deep link host: \(components.host ?? "nil")", category: AppLogger.notifications)
                return nil
            }
        }
        
        AppLogger.debug("Unsupported URL scheme: \(components.scheme ?? "nil")", category: AppLogger.notifications)
        return nil
    }
}

// MARK: - CustomStringConvertible

extension DeepLink: CustomStringConvertible {
    public var description: String {
        switch self {
        case .chat(let conversationId):
            return "chat(conversationId: \(conversationId))"
        }
    }
}
