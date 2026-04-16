import SwiftUI
import Core
import CartoAuth
import Payments
import CartoStorage
import FeatureOnboarding
import Adapty
import PostHog

/// Manages app-level routing based on authentication, onboarding, and subscription state
@MainActor
@available(iOS 17.0, *)
@Observable
public final class LaunchRouter {

    /// Current routing destination
    public enum Destination: Equatable {
        case signIn
        case afterAuthPaywall      // "afterauth" placement — shown after login/signup
        case lifetimeOfferPaywall  // "propaywallgotcancelled" placement — shown if afterauth dismissed
        case main
    }

    /// Current destination - starts at signIn, will switch based on state
    public private(set) var destination: Destination = .signIn

    /// Whether to show Adapty no-code onboarding modal
    public private(set) var shouldShowOnboarding: Bool = false

    /// Whether to show WebView onboarding (controlled by PostHog feature flag)
    public private(set) var shouldShowWebOnboarding: Bool = false

    /// Whether subscription is active
    public private(set) var isSubscribed: Bool = false

    /// Whether user has already passed through (or dismissed) the post-auth paywall this session
    private var hasPassedPaywall: Bool = false

    /// Auth client for state observation
    private let authClient: AuthClient

    /// Payments client for subscription state
    private let paymentsClient: PaymentsClient

    /// Settings repository to check onboarding status
    private let settingsRepository: SettingsRepository

    /// Crash reporter — receives user identity for contextual crash reports
    private let crashReporter: CrashReporter

    /// Auth state observation task
    private var authStateTask: Task<Void, Never>?

    /// Payments state observation task
    private var paymentsStateTask: Task<Void, Never>?

    /// Initialize router with dependencies
    public init(
        authClient: AuthClient,
        paymentsClient: PaymentsClient,
        settingsRepository: SettingsRepository,
        crashReporter: CrashReporter
    ) {
        self.authClient = authClient
        self.paymentsClient = paymentsClient
        self.settingsRepository = settingsRepository
        self.crashReporter = crashReporter
    }
    
    /// Start routing logic
    public func start() async {
        // Run PostHog flag fetch, Adapty onboarding, and subscription check concurrently
        async let webOnboardingCheck: () = checkWebOnboarding()
        async let onboardingCheck: () = checkAdaptyOnboarding()
        async let paymentsState = paymentsClient.currentState()
        let currentUser = await authClient.currentUser()

        // Await all concurrent tasks
        _ = await (webOnboardingCheck, onboardingCheck)
        isSubscribed = await paymentsState.hasScoutAccess
        AppLogger.info("LaunchRouter: Subscription status = \(self.isSubscribed)", category: AppLogger.ui)
        AppLogger.info("LaunchRouter: Starting with current user: \(currentUser != nil ? "present" : "nil")", category: AppLogger.ui)

        // Navigate immediately — don't block on Adapty identify
        updateDestination(isAuthenticated: currentUser != nil)

        // Observe auth + payments state changes (will pick up Adapty identify result)
        observeAuthState()
        observePaymentsState()

        // Identify existing user with Adapty in background (payments observer updates UI when complete)
        if let user = currentUser {
            let kind = user.isAnonymous ? "guest (anonymous)" : "authenticated"
            AppLogger.info("LaunchRouter: Identifying \(kind) user with Adapty in background — userID=\(user.id)", category: AppLogger.payments)
            let paymentsClient = self.paymentsClient
            Task {
                do {
                    let state = try await paymentsClient.logIn(userID: user.id, email: user.email, name: user.name)
                    await MainActor.run { self.isSubscribed = state.hasScoutAccess }
                    AppLogger.info("LaunchRouter: Adapty identify complete — subscribed=\(state.isSubscribed) entitlements=\(state.activeEntitlementIDs)", category: AppLogger.payments)
                } catch {
                    AppLogger.error("LaunchRouter: Adapty identify failed for \(kind) user: \(error)", category: AppLogger.payments)
                }
            }
        }
    }

    /// Update destination based on auth and subscription state
    private func updateDestination(isAuthenticated: Bool) {
        if !isAuthenticated {
            destination = .signIn
            hasPassedPaywall = false // Reset on sign-out so paywall shows on next sign-in
            AppLogger.info("LaunchRouter: No user, showing sign in", category: AppLogger.ui)
        } else if !self.isSubscribed && !hasPassedPaywall {
            // Show paywall once after auth — user can dismiss to enter free tier
            destination = .afterAuthPaywall
            Analytics.capture(.paywallViewed, properties: ["placement": "afterauth", "trigger": "post_auth"])
            AppLogger.info("LaunchRouter: User authenticated but not subscribed, showing paywall", category: AppLogger.ui)
        } else {
            destination = .main
            AppLogger.info("LaunchRouter: User authenticated, showing main (subscribed=\(self.isSubscribed))", category: AppLogger.ui)
        }
    }

    /// Called when the afterauth paywall is dismissed without purchase
    public func handleAfterAuthPaywallDismissed() {
        hasPassedPaywall = true
        destination = .main
        Analytics.capture(.paywallDismissed, properties: ["placement": "afterauth"])
        AppLogger.info("LaunchRouter: Paywall dismissed, proceeding to main (free tier)", category: AppLogger.ui)
    }

    /// Called when the lifetime offer paywall is dismissed without purchase
    public func handleLifetimeOfferDismissed() {
        hasPassedPaywall = true
        destination = .main
        Analytics.capture(.paywallDismissed, properties: ["placement": "lifetime_offer"])
        AppLogger.info("LaunchRouter: Lifetime offer dismissed, proceeding to main (free tier)", category: AppLogger.ui)
    }

    /// Show the paywall (called when user tries to access premium features)
    public func showPaywall() {
        destination = .afterAuthPaywall
        Analytics.capture(.paywallViewed, properties: ["placement": "afterauth", "trigger": "premium_feature"])
        AppLogger.info("LaunchRouter: Showing paywall for premium feature access", category: AppLogger.ui)
    }
    
    /// Mark onboarding as complete and dismiss modal
    public func completeOnboarding() async {
        AppLogger.info("LaunchRouter: Marking onboarding as complete", category: AppLogger.ui)

        shouldShowOnboarding = false
        UserDefaults.standard.set(true, forKey: "hasCompletedOnboarding")
        
        do {
            var settings = try await settingsRepository.load()
            settings = SettingsDTO(
                theme: settings.theme,
                preferredModel: settings.preferredModel,
                reduceMotion: settings.reduceMotion,
                hasSeenOnboarding: true,
                notificationsEnabled: settings.notificationsEnabled,
                createdAt: settings.createdAt,
                updatedAt: Date()
            )
            try await settingsRepository.save(settings)
        } catch {
            // If no settings exist, create new with onboarding complete
            let newSettings = SettingsDTO(hasSeenOnboarding: true)
            do {
                try await settingsRepository.save(newSettings)
            } catch {
                AppLogger.error("LaunchRouter: Failed to save onboarding settings: \(error)", category: AppLogger.ui)
            }
        }
        
        // Destination is already set in start(), no need to change it
        AppLogger.info("LaunchRouter: Onboarding complete, returning to app", category: AppLogger.ui)
    }
    
    /// Stop routing logic
    public func stop() {
        authStateTask?.cancel()
        authStateTask = nil
        paymentsStateTask?.cancel()
        paymentsStateTask = nil
    }
    
    // MARK: - Adapty Onboarding

    /// Placement ID for the Adapty no-code onboarding (set in Adapty Dashboard → Placements)
    private static let onboardingPlacementID = "beforesignup"

    // MARK: - WebView Onboarding (PostHog feature flag)

    /// Check PostHog feature flag to show WebView onboarding
    /// Uses async reload to ensure flags are fetched from server before checking.
    private func checkWebOnboarding() async {
        guard !UserDefaults.standard.bool(forKey: "hasCompletedOnboarding") else {
            AppLogger.info("LaunchRouter: Onboarding already completed, skipping web onboarding", category: AppLogger.ui)
            return
        }

        // Wait for PostHog to fetch feature flags from server
        await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
            PostHogSDK.shared.reloadFeatureFlags {
                continuation.resume()
            }
        }

        #if DEBUG
        let showFlag = true // Always show in debug for testing
        #else
        let showFlag = PostHogSDK.shared.isFeatureEnabled("show_webview_onboarding")
        #endif
        if showFlag {
            shouldShowWebOnboarding = true
            AppLogger.info("LaunchRouter: PostHog flag show_webview_onboarding=true, showing WebView onboarding", category: AppLogger.ui)
        } else {
            AppLogger.info("LaunchRouter: PostHog flag show_webview_onboarding=false, skipping", category: AppLogger.ui)
        }
    }

    /// Called when WebView onboarding is completed or dismissed
    public func completeWebOnboarding() async {
        shouldShowWebOnboarding = false
        UserDefaults.standard.set(true, forKey: "hasCompletedOnboarding")
        AppLogger.info("LaunchRouter: WebView onboarding complete", category: AppLogger.ui)
    }

    /// Fetch the "apponboarding" placement and check the remote-config "show" flag.
    /// If `show` is true and the user hasn't completed onboarding, present it.
    private func checkAdaptyOnboarding() async {
        guard !UserDefaults.standard.bool(forKey: "hasCompletedOnboarding") else {
            AppLogger.info("LaunchRouter: Onboarding already completed, skipping", category: AppLogger.ui)
            return
        }

        do {
            let onboarding = try await Adapty.getOnboarding(placementId: Self.onboardingPlacementID)

            // Parse remote config JSON manually (dictionary property has Sendable constraints)
            let show: Bool = {
                guard let jsonData = onboarding.remoteConfig?.jsonString.data(using: .utf8),
                      let dict = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
                      let flag = dict["show"] as? Bool else { return false }
                return flag
            }()

            if show {
                shouldShowOnboarding = true
                AppLogger.info("LaunchRouter: Adapty onboarding enabled (remote config show=true)", category: AppLogger.ui)
            } else {
                AppLogger.info("LaunchRouter: Adapty onboarding disabled (remote config show=false)", category: AppLogger.ui)
            }
        } catch {
            // Network failure or placement not found — skip gracefully
            AppLogger.info("LaunchRouter: Adapty onboarding fetch failed, skipping: \(error.localizedDescription)", category: AppLogger.ui)
        }
    }

    // MARK: - Private Helpers

    private func observeAuthState() {
        authStateTask?.cancel()

        // Get stream from nonisolated accessor
        let states = authClient.authStates()
        AppLogger.info("LaunchRouter: Starting auth state observation", category: AppLogger.ui)

        // Iterate and update on MainActor (since LaunchRouter is @MainActor)
        authStateTask = Task { @MainActor [weak self] in
            guard let self = self else { return }

            for await state in states {
                // Check for cancellation
                if Task.isCancelled {
                    AppLogger.debug("LaunchRouter: Auth state observation cancelled", category: AppLogger.ui)
                    break
                }

                AppLogger.info("LaunchRouter: Received auth state: \(state)", category: AppLogger.ui)

                // Update destination based on state
                switch state {
                case .authenticated(let user):
                    let kind = user.isAnonymous ? "guest (anonymous)" : "authenticated"
                    AppLogger.info("LaunchRouter: \(kind) user signed in — userID=\(user.id)", category: AppLogger.payments)

                    // Crashlytics — synchronous, no delay
                    crashReporter.setUser(id: user.id, email: user.email, name: user.name)

                    // Cache auth display name for birth chart pre-fill
                    if let name = user.name, !name.isEmpty {
                        UserDefaults.standard.set(name, forKey: "authUserDisplayName")
                    }

                    // Navigate immediately — don't block UI on network calls
                    self.updateDestination(isAuthenticated: true)

                    // Fire analytics + Adapty identify concurrently in background
                    let paymentsClient = self.paymentsClient
                    Task.detached { @MainActor in
                        Analytics.identify(userID: user.id, isAnonymous: user.isAnonymous)

                        do {
                            let state = try await paymentsClient.logIn(userID: user.id, email: user.email, name: user.name)
                            AppLogger.info("LaunchRouter: Adapty identify complete — subscribed=\(state.isSubscribed) entitlements=\(state.activeEntitlementIDs)", category: AppLogger.payments)
                        } catch {
                            AppLogger.error("LaunchRouter: Adapty identify failed for \(kind) user: \(error)", category: AppLogger.payments)
                        }
                    }

                case .unauthenticated:
                    AppLogger.info("LaunchRouter: User unauthenticated", category: AppLogger.ui)
                    Analytics.capture(.signedOut)
                    Analytics.reset()
                    crashReporter.setUser(id: nil, email: nil, name: nil)

                    // Log out from Adapty when user signs out
                    do {
                        _ = try await self.paymentsClient.logOut()
                        AppLogger.info("LaunchRouter: Logged out from payments service", category: AppLogger.ui)
                    } catch {
                        AppLogger.error("LaunchRouter: Failed to log out from payments: \(error)", category: AppLogger.ui)
                    }

                    self.updateDestination(isAuthenticated: false)

                case .refreshing:
                    AppLogger.debug("LaunchRouter: Token refreshing", category: AppLogger.ui)
                }
            }
        }
    }

    private func observePaymentsState() {
        paymentsStateTask?.cancel()

        let states = paymentsClient.states()
        AppLogger.info("LaunchRouter: Starting payments state observation", category: AppLogger.ui)

        paymentsStateTask = Task { @MainActor [weak self] in
            guard let self = self else { return }

            for await state in states {
                if Task.isCancelled {
                    AppLogger.debug("LaunchRouter: Payments state observation cancelled", category: AppLogger.ui)
                    break
                }

                let wasSubscribed = self.isSubscribed
                self.isSubscribed = state.hasScoutAccess

                AppLogger.info("LaunchRouter: Subscription state changed: \(state.isSubscribed)", category: AppLogger.ui)

                // If subscription status changed, update destination
                if wasSubscribed != state.hasScoutAccess {
                    let currentUser = await self.authClient.currentUser()
                    self.updateDestination(isAuthenticated: currentUser != nil)
                }
            }
        }
    }

    /// Called when a purchase completes successfully (for immediate navigation)
    public func handlePurchaseComplete() {
        isSubscribed = true
        Analytics.capture(.subscriptionStarted)
        Task { @MainActor in
            let currentUser = await authClient.currentUser()
            updateDestination(isAuthenticated: currentUser != nil)
        }
    }

    deinit {
        // stop() should be called from onDisappear before deallocation.
        // Tasks are MainActor-isolated so deinit cannot safely access them.
    }
}
