import Foundation
import UserNotifications

/// Debug utility for testing and diagnosing local notifications
/// Only intended for development/debugging purposes
public enum LocalNotificationTester {
    
    // MARK: - Diagnostics
    
    /// Run comprehensive notification diagnostics and log results
    /// Checks permission status, settings, registered categories, and pending requests
    public static func diagnostics() async {
        AppLogger.info("=== Notification Diagnostics Start ===", category: AppLogger.notifications)
        
        let center = UNUserNotificationCenter.current()
        
        // Check authorization status and settings
        let settings = await center.notificationSettings()
        AppLogger.info("Authorization Status: \(settings.authorizationStatus.rawValue)", category: AppLogger.notifications)
        AppLogger.info("Alert Setting: \(settings.alertSetting.rawValue)", category: AppLogger.notifications)
        AppLogger.info("Sound Setting: \(settings.soundSetting.rawValue)", category: AppLogger.notifications)
        AppLogger.info("Badge Setting: \(settings.badgeSetting.rawValue)", category: AppLogger.notifications)
        AppLogger.info("Notification Center Setting: \(settings.notificationCenterSetting.rawValue)", category: AppLogger.notifications)
        
        // Check registered categories
        let categories = await center.notificationCategories()
        AppLogger.info("Registered Categories Count: \(categories.count)", category: AppLogger.notifications)
        for category in categories {
            AppLogger.info("  - Category: \(category.identifier), Actions: \(category.actions.count)", category: AppLogger.notifications)
        }
        
        // Check pending notification requests
        let pendingRequests = await center.pendingNotificationRequests()
        AppLogger.info("Pending Requests: \(pendingRequests.count)", category: AppLogger.notifications)
        for request in pendingRequests {
            AppLogger.info("  - Request: \(request.identifier), Category: \(request.content.categoryIdentifier)", category: AppLogger.notifications)
        }
        
        // Check delivered notifications
        let deliveredNotifications = await center.deliveredNotifications()
        AppLogger.info("Delivered Notifications: \(deliveredNotifications.count)", category: AppLogger.notifications)
        
        AppLogger.info("=== Notification Diagnostics End ===", category: AppLogger.notifications)
    }
    
    // MARK: - Test Notification
    
    /// Schedule a test local notification
    /// - Parameter seconds: Delay in seconds before notification fires (minimum 3 seconds)
    public static func scheduleTest(after seconds: TimeInterval = 3) async {
        let center = UNUserNotificationCenter.current()
        
        // Check if we have permission
        let settings = await center.notificationSettings()
        guard settings.authorizationStatus == .authorized else {
            AppLogger.error("Cannot schedule test notification - not authorized. Status: \(settings.authorizationStatus.rawValue)", category: AppLogger.notifications)
            return
        }
        
        // Create notification content
        let content = UNMutableNotificationContent()
        content.title = "New message"
        content.body = "Local test notification"
        content.sound = .default
        content.badge = 1
        content.categoryIdentifier = "chat.message"
        content.userInfo = ["conversationId": "debug-123"]
        
        // Create trigger (minimum 3 seconds)
        let timeInterval = max(3.0, seconds)
        let trigger = UNTimeIntervalNotificationTrigger(
            timeInterval: timeInterval,
            repeats: false
        )
        
        // Create request
        let identifier = "test-notification-\(UUID().uuidString)"
        let request = UNNotificationRequest(
            identifier: identifier,
            content: content,
            trigger: trigger
        )
        
        // Schedule notification
        do {
            try await center.add(request)
            AppLogger.info("Test notification scheduled successfully (fires in \(timeInterval)s) - ID: \(identifier)", category: AppLogger.notifications)
        } catch {
            AppLogger.error("Failed to schedule test notification: \(error.localizedDescription)", category: AppLogger.notifications)
        }
    }
    
    // MARK: - Quick Test
    
    /// Quick test that requests permission if needed, then schedules a test notification
    public static func quickTest() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        
        // Request permission if not determined
        if settings.authorizationStatus == .notDetermined {
            AppLogger.info("Requesting notification permission...", category: AppLogger.notifications)
            do {
                let granted = try await center.requestAuthorization(options: [.alert, .sound, .badge])
                AppLogger.info("Permission granted: \(granted)", category: AppLogger.notifications)
                
                if granted {
                    // Schedule test after permission granted
                    await scheduleTest(after: 3)
                }
            } catch {
                AppLogger.error("Permission request failed: \(error.localizedDescription)", category: AppLogger.notifications)
            }
        } else if settings.authorizationStatus == .authorized {
            // Already authorized, schedule immediately
            await scheduleTest(after: 3)
        } else {
            AppLogger.error("Notifications not authorized. Please enable in Settings.", category: AppLogger.notifications)
        }
    }
}
