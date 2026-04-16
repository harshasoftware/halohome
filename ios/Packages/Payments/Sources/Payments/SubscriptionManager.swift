import Foundation
import UIKit
import Core

/// Helper for managing App Store subscriptions
public enum SubscriptionManager {
    
    /// Open the App Store subscription management page
    /// This allows users to view, modify, or cancel their subscriptions
    @MainActor
    public static func openManageSubscriptions() {
        guard let url = URL(string: "https://apps.apple.com/account/subscriptions") else {
            AppLogger.error("Invalid subscription management URL", category: AppLogger.payments)
            return
        }
        
        if UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url, options: [:]) { success in
                if success {
                    AppLogger.info("Opened subscription management", category: AppLogger.payments)
                } else {
                    AppLogger.error("Failed to open subscription management", category: AppLogger.payments)
                }
            }
        } else {
            AppLogger.error("Cannot open App Store subscriptions URL", category: AppLogger.payments)
        }
    }
    
    /// Open the App Store page for this app (for reviews and general info)
    @MainActor
    public static func openAppStorePage(appID: String) {
        guard let url = URL(string: "https://apps.apple.com/app/id\(appID)") else {
            AppLogger.error("Invalid App Store URL for app ID: \(appID)", category: AppLogger.payments)
            return
        }
        
        if UIApplication.shared.canOpenURL(url) {
            UIApplication.shared.open(url, options: [:]) { success in
                if success {
                    AppLogger.info("Opened App Store page", category: AppLogger.payments)
                } else {
                    AppLogger.error("Failed to open App Store page", category: AppLogger.payments)
                }
            }
        }
    }
}

