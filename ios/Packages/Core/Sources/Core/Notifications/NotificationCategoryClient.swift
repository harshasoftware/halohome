import Foundation
import UserNotifications

/**
 * Protocol for managing notification categories and actions
 * 
 * This protocol provides a clean interface for registering notification
 * categories with custom actions, making it easy to test and mock
 * notification interaction functionality.
 */
@available(iOS 17.0, macOS 11.0, *)
public protocol NotificationCategoryClient {
    
    /**
     * Register default notification categories with their actions
     * 
     * This method sets up the standard notification categories used
     * throughout the app, including custom actions for user interaction.
     */
    func registerDefaultCategories() async throws
}

/**
 * Default implementation of NotificationCategoryClient using UNUserNotificationCenter
 * 
 * This implementation:
 * - Registers chat.reply category with text input and mark read actions
 * - Integrates with AppLogger for consistent logging
 * - Handles errors by mapping them to AppError types
 * - Provides foundation for future notification categories
 */
@available(iOS 17.0, macOS 11.0, *)
public final class DefaultNotificationCategoryClient: NotificationCategoryClient {
    
    private let notificationCenter: UNUserNotificationCenter
    
    /**
     * Initialize with a specific notification center
     * 
     * - Parameter notificationCenter: The UNUserNotificationCenter to use (defaults to .current())
     */
    public init(notificationCenter: UNUserNotificationCenter = .current()) {
        self.notificationCenter = notificationCenter
    }
    
    // MARK: - NotificationCategoryClient
    
    public func registerDefaultCategories() async throws {
        AppLogger.info("Registering default notification categories", category: AppLogger.notifications)
        
        // Create chat.message category with text input and mark read actions
        let replyAction = UNTextInputNotificationAction(
            identifier: "chat.reply",
            title: "Reply",
            options: [.authenticationRequired],
            textInputButtonTitle: "Send",
            textInputPlaceholder: "Type a reply"
        )
        
        let markReadAction = UNNotificationAction(
            identifier: "chat.markRead",
            title: "Mark Read",
            options: []
        )
        
        let chatMessageCategory = UNNotificationCategory(
            identifier: "chat.message",
            actions: [replyAction, markReadAction],
            intentIdentifiers: [],
            options: [.customDismissAction]
        )
        
        // Register the categories
        let categories: Set<UNNotificationCategory> = [chatMessageCategory]
        notificationCenter.setNotificationCategories(categories)
        
        AppLogger.info("Registered notification categories", category: AppLogger.notifications)
    }
}

// MARK: - Mock Implementation for Testing

#if DEBUG
/**
 * Mock implementation of NotificationCategoryClient for testing and previews
 * 
 * This implementation allows tests and previews to control notification
 * category registration without actually registering system categories.
 */
@available(iOS 17.0, macOS 11.0, *)
public final class MockNotificationCategoryClient: NotificationCategoryClient {
    
    public var shouldThrowError = false
    public var errorToThrow: AppError = AppError.network(code: -1, message: "Mock error")
    
    private var registrationCallCount = 0
    
    public init() {}
    
    // MARK: - NotificationCategoryClient
    
    public func registerDefaultCategories() async throws {
        registrationCallCount += 1
        
        if shouldThrowError {
            throw errorToThrow
        }
        
        // Mock implementation - no actual category registration
        AppLogger.info("Mock: Registered default notification categories", category: AppLogger.notifications)
    }
    
    // MARK: - Test Helpers
    
    public func getRegistrationCallCount() -> Int {
        return registrationCallCount
    }
    
    public func reset() {
        registrationCallCount = 0
        shouldThrowError = false
    }
}
#endif
