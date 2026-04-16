import UIKit
import UserNotifications
import AppTrackingTransparency
import Core
import Networking
import OneSignalFramework
import GoogleSignIn
#if canImport(FirebaseCore)
import FirebaseCore
#endif
#if canImport(FirebasePerformance)
import FirebasePerformance
#endif

/**
 * AppDelegate handles APNs registration and notification permissions
 * 
 * Responsibilities:
 * - Request notification permissions on app launch
 * - Register for remote notifications with APNs
 * - Handle device token registration and errors
 * - Serve as UNUserNotificationCenterDelegate for future notification handling
 */
final class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    
    /// App environment for accessing dependencies
    private var appEnvironment: AppEnvironment?
    
    /// Set the app environment (called from main app)
    func setEnvironment(_ environment: AppEnvironment) {
        self.appEnvironment = environment
    }
    
    // MARK: - UIApplicationDelegate
    
    func application(
        _ application: UIApplication,
        didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
    ) -> Bool {
        // IMPORTANT: Configure Firebase FIRST — must precede all other Firebase service calls
        #if canImport(FirebaseCore)
        FirebaseApp.configure()
        AppLogger.info("Firebase configured", category: AppLogger.ui)
        #endif

        // Firebase Performance — auto-instruments network calls, screen rendering, and startup time.
        // No additional setup needed; activates automatically once FirebaseApp is configured.
        // Add FirebasePerformance via Xcode → File → Add Package Dependencies → firebase-ios-sdk.
        #if canImport(FirebasePerformance)
        AppLogger.info("Firebase Performance monitoring active", category: AppLogger.ui)
        #endif

        // IMPORTANT: Initialize OneSignal FIRST, before setting any notification delegates
        // OneSignal needs to set up its APNs handling before we configure our own delegate
        initializeOneSignal(launchOptions: launchOptions)

        // Set up notification center delegate AFTER OneSignal initialization
        // This allows OneSignal to properly intercept and handle APNs events
        UNUserNotificationCenter.current().delegate = self
        
        // Register default notification categories
        Task {
            do {
                try await DefaultNotificationCategoryClient().registerDefaultCategories()
                AppLogger.info("Notification categories registered successfully", category: AppLogger.notifications)
            } catch {
                AppLogger.error("Failed to register notification categories: \(error.localizedDescription)", category: AppLogger.notifications)
            }
        }
        
        AppLogger.info("Notifications wired (delegate+categories)", category: AppLogger.notifications)
        return true
    }
    
    // MARK: - Scene Configuration (Singular SceneDelegate)

    func application(
        _ application: UIApplication,
        configurationForConnecting session: UISceneSession,
        options: UIScene.ConnectionOptions
    ) -> UISceneConfiguration {
        let config = UISceneConfiguration(name: nil, sessionRole: session.role)
        config.delegateClass = SingularSceneDelegate.self
        return config
    }

    // MARK: - Google Sign In URL Handler

    func application(
        _ app: UIApplication,
        open url: URL,
        options: [UIApplication.OpenURLOptionsKey: Any] = [:]
    ) -> Bool {
        if GIDSignIn.sharedInstance.handle(url) {
            return true
        }
        return false
    }

    // MARK: - Orientation

    func application(
        _ application: UIApplication,
        supportedInterfaceOrientationsFor window: UIWindow?
    ) -> UIInterfaceOrientationMask {
        // iPad: landscape only. iPhone: all orientations.
        if UIDevice.current.userInterfaceIdiom == .pad {
            return [.landscapeLeft, .landscapeRight]
        }
        return .allButUpsideDown
    }

    // MARK: - OneSignal Initialization
    
    /**
     * Initializes the OneSignal SDK for push notifications
     *
     * This method:
     * - Validates that the OneSignal App ID is configured
     * - Initializes the OneSignal SDK with the app ID
     * - Requests notification permissions (handled by OneSignal)
     *
     * For setup instructions, see: https://documentation.onesignal.com/docs/en/ios-sdk-setup
     */
    private func initializeOneSignal(launchOptions: [UIApplication.LaunchOptionsKey: Any]?) {
        let appId = AppConfiguration.ONESIGNAL_APP_ID
        
        // Validate configuration
        guard AppConfiguration.isConfigured("ONESIGNAL_APP_ID") else {
            AppLogger.error(
                "OneSignal App ID not configured - push notifications disabled. Add ONESIGNAL_APP_ID to Config/Secrets.xcconfig",
                category: AppLogger.notifications
            )
            return
        }
        
        // Remove this method to stop OneSignal Debugging
        #if DEBUG
        OneSignal.Debug.setLogLevel(.LL_VERBOSE)
        #endif
        
        // Initialize OneSignal with the App ID from configuration
        OneSignal.initialize(appId, withLaunchOptions: launchOptions)
        
        // Request push notification permission through OneSignal
        OneSignal.Notifications.requestPermission({ accepted in
            AppLogger.info("OneSignal notification permission: \(accepted ? "granted" : "denied")", category: AppLogger.notifications)
        }, fallbackToSettings: true)

        AppLogger.info("OneSignal SDK initialized successfully", category: AppLogger.notifications)
    }
    
    // MARK: - Remote Notification Registration
    
    func application(
        _ application: UIApplication,
        didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
    ) {
        let tokenHex = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        let prefix = String(tokenHex.prefix(8))
        AppLogger.info("APNs token registered - prefix: \(prefix), length: \(tokenHex.count)", category: AppLogger.notifications)
        
        // Upload device token to backend
        uploadDeviceToken(tokenHex)
    }
    
    func application(
        _ application: UIApplication,
        didFailToRegisterForRemoteNotificationsWithError error: Error
    ) {
        AppLogger.error(
            "APNs registration failed: \(error.localizedDescription)",
            category: AppLogger.notifications
        )
        
        // TODO: Handle registration failure (show user-friendly message)
        // This could be implemented as a user-facing error in the UI
    }
    
    // MARK: - Notification Permissions
    
    /**
     * Requests notification permissions and registers for remote notifications
     * 
     * This method:
     * 1. Requests authorization for alerts, sounds, and badges
     * 2. Registers for remote notifications if permission is granted
     * 3. Handles permission denial gracefully
     */
    func requestNotifications() {
        AppLogger.info("Requesting notification permissions", category: AppLogger.notifications)
        
        UNUserNotificationCenter.current().requestAuthorization(
            options: [.alert, .sound, .badge]
        ) { granted, error in
            Task { @MainActor in
                if let error = error {
                    AppLogger.error(
                        "Notification permission request failed: \(error.localizedDescription)",
                        category: AppLogger.notifications
                    )
                    return
                }

                if granted {
                    AppLogger.info(
                        "Notification permissions granted",
                        category: AppLogger.notifications
                    )
                    UIApplication.shared.registerForRemoteNotifications()
                } else {
                    AppLogger.info(
                        "Notification permissions denied",
                        category: AppLogger.notifications
                    )
                }
            }
        }
    }
    
    // MARK: - UNUserNotificationCenterDelegate
    
    /**
     * Handle notification presentation when app is in foreground
     * 
     * This will be expanded in future versions to handle:
     * - Custom notification presentation
     * - Deep linking
     * - Notification categories and actions
     */
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        willPresent notification: UNNotification,
        withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
    ) {
        AppLogger.info("Presenting notification in foreground: \(notification.request.identifier)", category: AppLogger.notifications)
        // Show banner, sound, and badge even when app is in foreground
        completionHandler([.banner, .sound, .badge])
    }
    
    /**
     * Handle notification tap when app is in background or terminated
     * 
     * Handles:
     * - Deep linking to specific conversations
     * - Reply actions from notifications
     * - Navigation to relevant screens
     */
    func userNotificationCenter(
        _ center: UNUserNotificationCenter,
        didReceive response: UNNotificationResponse,
        withCompletionHandler completionHandler: @escaping () -> Void
    ) {
        AppLogger.info("Received notification response: \(response.actionIdentifier)", category: AppLogger.notifications)
        
        // Handle reply action
        if response.actionIdentifier == "chat.reply" {
            handleReplyAction(response: response)
        }

        // Handle journal prompt notification tap
        if response.notification.request.content.categoryIdentifier == "journal_prompt" {
            handleJournalNotificationTap(response: response)
        }

        completionHandler()
    }
    
    // MARK: - Journal Notification Handler

    /// Handle tap on journal prompt notification — deep link to journal
    private func handleJournalNotificationTap(response: UNNotificationResponse) {
        let userInfo = response.notification.request.content.userInfo
        AppLogger.info("Journal notification tapped", category: AppLogger.notifications)

        var comps = URLComponents()
        comps.scheme = "halohome"
        comps.host = "journal"

        // Pass through entry context if available
        if let entryId = userInfo["entryId"] as? String {
            comps.queryItems = [URLQueryItem(name: "entryId", value: entryId)]
        }

        guard let url = comps.url else {
            AppLogger.error("Failed to build journal deeplink", category: AppLogger.notifications)
            return
        }

        Task { @MainActor in
            UIApplication.shared.open(url) { success in
                if success {
                    AppLogger.info("Opened journal deeplink: \(url.absoluteString)", category: AppLogger.notifications)
                } else {
                    AppLogger.error("Failed to open journal deeplink: \(url.absoluteString)", category: AppLogger.notifications)
                }
            }
        }
    }

    // MARK: - Private Helpers

    /// Handle reply action from notification
    /// - Parameter response: The notification response containing reply text
    private func handleReplyAction(response: UNNotificationResponse) {
        // Extract reply text
        let text = (response as? UNTextInputNotificationResponse)?.userText ?? ""
        
        // Extract and validate conversation ID from notification userInfo
        guard
            let conversationId = response.notification.request.content.userInfo["conversationId"] as? String,
            !conversationId.isEmpty,
            UUID(uuidString: conversationId) != nil
        else {
            AppLogger.error("Missing or invalid conversationId in notification userInfo", category: AppLogger.notifications)
            return
        }
        
        AppLogger.info("Handling reply action for conversation: \(conversationId)", category: AppLogger.notifications)
        
        // Store reply text for later retrieval
        ReplyActionBus.shared.put(text, for: conversationId)
        
        // Build deep link URL with proper URL encoding
        var comps = URLComponents()
        comps.scheme = "sai"
        comps.host = "chat"
        comps.queryItems = [URLQueryItem(name: "conversationId", value: conversationId)]
        guard let url = comps.url else {
            AppLogger.error("Failed to build deeplink for conversation: \(conversationId)", category: AppLogger.notifications)
            return
        }
        
        // Open deep link on main thread
        Task { @MainActor in
            UIApplication.shared.open(url) { success in
                if success {
                    AppLogger.info("Opened deeplink: \(url.absoluteString)", category: AppLogger.notifications)
                } else {
                    AppLogger.error("Failed to open deeplink: \(url.absoluteString)", category: AppLogger.notifications)
                }
            }
        }
    }
    
    /// Upload device token to backend for push notification delivery
    /// - Parameter tokenHex: Device token as hexadecimal string
    private func uploadDeviceToken(_ tokenHex: String) {
        guard let environment = appEnvironment,
              let proxyBaseURL = environment.proxyBaseURL else {
            AppLogger.info(
                "Skipping device token upload - no proxy base URL configured",
                category: AppLogger.notifications
            )
            return
        }
        
        // Use HTTP client from environment (reuse existing client)
        let httpClient = environment.compositionRoot.httpClient
        
        // Create device token uploader
        let uploader = DeviceTokenUploader(
            baseURL: proxyBaseURL,
            httpClient: httpClient
        )
        
        // Upload token asynchronously (fire-and-forget)
        Task {
            do {
                try await uploader.upload(tokenHex: tokenHex)
            } catch {
                AppLogger.error(
                    "Failed to upload device token: \(error.localizedDescription)",
                    category: AppLogger.notifications
                )
            }
        }
    }
}
