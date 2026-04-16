import Foundation

/// Centralized bus for publishing and observing deep links
@MainActor
@Observable
public final class DeepLinkBus {

    /// Shared instance for app-wide deep link handling
    public static let shared = DeepLinkBus()

    /// Latest deep link that was published
    public private(set) var latest: DeepLink?
    
    private init() {
        AppLogger.debug("DeepLinkBus initialized", category: AppLogger.notifications)
    }
    
    /// Publish a deep link to all subscribers
    /// - Parameter deepLink: The deep link to publish
    public func publish(_ deepLink: DeepLink) {
        AppLogger.debug("Publishing deep link: \(deepLink)", category: AppLogger.notifications)
        latest = deepLink
    }
    
    /// Clear the latest deep link (useful after handling)
    public func clear() {
        AppLogger.debug("Clearing latest deep link", category: AppLogger.notifications)
        latest = nil
    }
}
