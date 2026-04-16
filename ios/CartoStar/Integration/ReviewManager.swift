import StoreKit
import UIKit
import os.log

/// Manages the App Store review prompt.
///
/// Trigger conditions (all must be true):
///   - At least 2 app launches (returned user)
///   - At least 1 birth chart set up
///   - Review has not been requested before
///
/// Call `triggerIfEligible(hasChart:)` after astro lines render on the globe.
/// A 2.5-second delay is applied so the user can experience the map first.
@MainActor
final class ReviewManager {

    static let shared = ReviewManager()

    private let logger = Logger(subsystem: "com.halohome", category: "ReviewManager")

    private enum Keys {
        static let launchCount       = "halohome_launch_count"
        static let hasRequestedReview = "halohome_has_requested_review"
    }

    private init() {}

    // MARK: - Launch tracking

    /// Call once on every app launch (before any views appear).
    func recordLaunch() {
        let count = UserDefaults.standard.integer(forKey: Keys.launchCount) + 1
        UserDefaults.standard.set(count, forKey: Keys.launchCount)
        logger.debug("Launch count: \(count)")
    }

    // MARK: - Review trigger

    /// Call after astro lines finish rendering on the globe.
    /// - Parameter hasChart: Whether the user has at least one birth chart configured.
    func triggerIfEligible(hasChart: Bool) {
        let launchCount      = UserDefaults.standard.integer(forKey: Keys.launchCount)
        let alreadyRequested = UserDefaults.standard.bool(forKey: Keys.hasRequestedReview)

        guard launchCount >= 2, hasChart, !alreadyRequested else {
            logger.debug("Review not triggered — launches: \(launchCount), hasChart: \(hasChart), alreadyRequested: \(alreadyRequested)")
            return
        }

        // Wait 2.5 s so user can actually see their lines before the prompt appears
        Task {
            try? await Task.sleep(for: .seconds(2.5))
            guard let scene = UIApplication.shared.connectedScenes
                .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene else {
                return
            }
            SKStoreReviewController.requestReview(in: scene)
            UserDefaults.standard.set(true, forKey: Keys.hasRequestedReview)
            logger.info("Review prompt shown — launches: \(launchCount)")
            Analytics.capture(.reviewPromptShown)
        }
    }
}
