import Foundation
import Core

/// Chat-specific error message helpers
public extension AppError {
    
    /// User-friendly message for chat context
    var chatUserMessage: String {
        switch self {
        case .network:
            return "Unable to send message. Check your connection and try again."
        case .cancelled:
            return "Message sending was cancelled."
        case .rateLimited:
            return "Too many requests. Please wait a moment and try again."
        default:
            return userMessage
        }
    }
}







