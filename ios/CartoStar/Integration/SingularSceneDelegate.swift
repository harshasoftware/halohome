import UIKit
import Singular
import Core

/// SceneDelegate that handles all three Singular SDK entry points:
/// 1. Cold launch (willConnectTo) — passes initial userActivity or openURL
/// 2. Universal links (continue userActivity) — AASA-based deep links
/// 3. URI scheme (openURLContexts) — custom scheme deep links
final class SingularSceneDelegate: NSObject, UIWindowSceneDelegate {

    // MARK: - Entry Point 1: Cold Launch

    func scene(
        _ scene: UIScene,
        willConnectTo session: UISceneSession,
        options connectionOptions: UIScene.ConnectionOptions
    ) {
        let userActivity = connectionOptions.userActivities.first
        guard let config = singularConfig(userActivity: userActivity) else { return }
        Singular.start(config)
        AppLogger.info("Singular started (cold launch)", category: AppLogger.ui)
    }

    // MARK: - Entry Point 2: Universal Links

    func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
        guard let config = singularConfig(userActivity: userActivity) else { return }
        Singular.start(config)
        AppLogger.info("Singular started (universal link)", category: AppLogger.ui)
    }

    // MARK: - Entry Point 3: URI Scheme

    func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
        guard let url = URLContexts.first?.url,
              let config = singularConfig(openURL: url) else { return }
        Singular.start(config)
        AppLogger.info("Singular started (URI scheme: \(url.scheme ?? ""))", category: AppLogger.ui)
    }

    // MARK: - Config Builder

    private func singularConfig(
        userActivity: NSUserActivity? = nil,
        openURL: URL? = nil
    ) -> SingularConfig? {
        guard let config = SingularConfig(
            apiKey: AppConfiguration.SINGULAR_SDK_KEY,
            andSecret: AppConfiguration.SINGULAR_SDK_SECRET
        ) else { return nil }

        // Wait up to 5 min for ATT before flushing first events
        config.waitForTrackingAuthorizationWithTimeoutInterval = 300

        // SKAdNetwork in managed mode
        config.skAdNetworkEnabled = true

        // Deep link handler
        config.singularLinksHandler = { params in
            guard let params = params, let deepLinkUrl = params.getDeepLink() else { return }
            AppLogger.info("Singular deep link: \(deepLinkUrl)", category: AppLogger.ui)
        }

        #if DEBUG
        config.logLevel = .debug
        #endif

        if let userActivity = userActivity {
            config.userActivity = userActivity
        }
        if let openURL = openURL {
            config.openUrl = openURL
        }

        return config
    }
}
