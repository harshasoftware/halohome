import Foundation

/// Bus for storing and retrieving reply text from notification actions
public final class ReplyActionBus {
    
    /// Shared instance for app-wide reply handling
    public static let shared = ReplyActionBus()
    
    /// Private storage for reply text keyed by conversation ID
    private var store = [String: String]()
    
    /// Private initializer to enforce singleton pattern
    private init() {
        AppLogger.debug("ReplyActionBus initialized", category: AppLogger.notifications)
    }
    
    /// Store reply text for a specific conversation
    /// - Parameters:
    ///   - text: The reply text to store
    ///   - conversationId: The conversation ID to associate with the text
    public func put(_ text: String, for conversationId: String) {
        AppLogger.debug("Storing reply text for conversation: \(conversationId)", category: AppLogger.notifications)
        store[conversationId] = text
    }
    
    /// Retrieve and remove reply text for a specific conversation
    /// - Parameter conversationId: The conversation ID to retrieve text for
    /// - Returns: The stored reply text, or nil if none exists
    @discardableResult
    public func take(for conversationId: String) -> String? {
        defer { 
            store[conversationId] = nil 
            AppLogger.debug("Cleared reply text for conversation: \(conversationId)", category: AppLogger.notifications)
        }
        
        let text = store[conversationId]
        if text != nil {
            AppLogger.debug("Retrieved reply text for conversation: \(conversationId)", category: AppLogger.notifications)
        } else {
            AppLogger.debug("No reply text found for conversation: \(conversationId)", category: AppLogger.notifications)
        }
        
        return text
    }
    
    /// Check if there's pending reply text for a conversation without removing it
    /// - Parameter conversationId: The conversation ID to check
    /// - Returns: True if there's pending reply text
    public func hasPendingReply(for conversationId: String) -> Bool {
        return store[conversationId] != nil
    }
    
    /// Clear all stored reply text (useful for cleanup)
    public func clearAll() {
        AppLogger.debug("Clearing all stored reply text", category: AppLogger.notifications)
        store.removeAll()
    }
}
