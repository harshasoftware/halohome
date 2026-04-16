import Foundation
import UserNotifications
#if canImport(UIKit)
import UIKit
#endif

/**
 * Protocol for managing notification permissions and settings
 * 
 * This protocol provides a clean interface for requesting notification
 * permissions and opening system settings, making it easy to test
 * and mock notification-related functionality.
 */
@available(iOS 17.0, macOS 11.0, *)
public protocol NotificationPermissionClient {
    
    /**
     * Request authorization for notifications
     * 
     * - Returns: True if authorization was granted, false otherwise
     * - Throws: AppError if the request fails
     */
    func requestAuthorization() async throws -> Bool
    
    /**
     * Open the system settings for this app
     * 
     * This allows users to manually enable notifications if they
     * initially denied permission.
     */
    func openSettings() async
}

/**
 * Default implementation of NotificationPermissionClient using UNUserNotificationCenter
 * 
 * This implementation:
 * - Uses UNUserNotificationCenter for permission requests
 * - Integrates with AppLogger for consistent logging
 * - Opens system settings using UIApplication.shared.openSettingsURLString
 * - Handles errors by mapping them to AppError types
 */
@available(iOS 17.0, macOS 11.0, *)
public final class DefaultNotificationPermissionClient: NotificationPermissionClient {
    
    private let notificationCenter: UNUserNotificationCenter
    
    /**
     * Initialize with a specific notification center
     * 
     * - Parameter notificationCenter: The UNUserNotificationCenter to use (defaults to .current())
     */
    public init(notificationCenter: UNUserNotificationCenter = .current()) {
        self.notificationCenter = notificationCenter
    }
    
    // MARK: - NotificationPermissionClient
    
    public func requestAuthorization() async throws -> Bool {
        let requestId = generateRequestId()
        
        AppLogger.info("Requesting notification authorization [\(requestId)]", category: AppLogger.ui)
        
        do {
            let granted = try await notificationCenter.requestAuthorization(options: [.alert, .sound, .badge])
            
            if granted {
                AppLogger.info("Notification authorization granted [\(requestId)]", category: AppLogger.ui)
                
                // Register for remote notifications on main thread
                #if canImport(UIKit)
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                #endif
            } else {
                AppLogger.info("Notification authorization denied [\(requestId)]", category: AppLogger.ui)
            }
            
            return granted
            
        } catch {
            AppLogger.error(
                "Notification authorization request failed [\(requestId)]: \(error.localizedDescription)",
                category: AppLogger.ui
            )
            
            // Map UNError to AppError
            if let unError = error as? UNError {
                throw AppError.network(code: unError.code.rawValue, message: unError.localizedDescription)
            } else {
                throw AppError.network(code: -1, message: error.localizedDescription)
            }
        }
    }
    
    public func openSettings() async {
        let requestId = generateRequestId()
        
        AppLogger.info("Opening app settings [\(requestId)]", category: AppLogger.ui)
        
        #if canImport(UIKit)
        await MainActor.run {
            guard let settingsURL = URL(string: UIApplication.openSettingsURLString) else {
                AppLogger.error("Failed to create settings URL [\(requestId)]", category: AppLogger.ui)
                return
            }
            
            UIApplication.shared.open(settingsURL) { success in
                if success {
                    AppLogger.info("Settings opened successfully [\(requestId)]", category: AppLogger.ui)
                } else {
                    AppLogger.error("Failed to open settings [\(requestId)]", category: AppLogger.ui)
                }
            }
        }
        #else
        AppLogger.error("UIKit not available - cannot open settings [\(requestId)]", category: AppLogger.ui)
        #endif
    }
    
    // MARK: - Private Helpers
    
    private func generateRequestId() -> String {
        return UUID().uuidString.prefix(8).lowercased()
    }
}

// MARK: - Mock Implementation for Testing

#if DEBUG
/**
 * Mock implementation of NotificationPermissionClient for testing and previews
 * 
 * This implementation allows tests and previews to control notification
 * permission behavior without actually requesting system permissions.
 */
public final class MockNotificationPermissionClient: NotificationPermissionClient {
    
    public var shouldGrantAuthorization = true
    public var shouldThrowError = false
    public var errorToThrow: AppError = AppError.network(code: -1, message: "Mock error")
    
    private var authorizationRequestCount = 0
    private var settingsOpenCount = 0
    
    public init() {}
    
    // MARK: - NotificationPermissionClient
    
    public func requestAuthorization() async throws -> Bool {
        authorizationRequestCount += 1
        
        if shouldThrowError {
            throw errorToThrow
        }
        
        return shouldGrantAuthorization
    }
    
    public func openSettings() async {
        settingsOpenCount += 1
        // Mock implementation - no actual settings opening
    }
    
    // MARK: - Test Helpers
    
    public func getAuthorizationRequestCount() -> Int {
        return authorizationRequestCount
    }
    
    public func getSettingsOpenCount() -> Int {
        return settingsOpenCount
    }
    
    public func reset() {
        authorizationRequestCount = 0
        settingsOpenCount = 0
        shouldGrantAuthorization = true
        shouldThrowError = false
    }
}
#endif
