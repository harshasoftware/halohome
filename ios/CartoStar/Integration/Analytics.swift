import Foundation
import PostHog
import Singular
#if canImport(FirebaseAnalytics)
import FirebaseAnalytics
#endif

/// Centralized analytics — fires PostHog + Singular in one call.
/// PostHog: product analytics + session replay.
/// Singular: attribution + Google Ads conversion forwarding (S2S, no Firebase needed).
/// Call from any thread — both SDKs are thread-safe.
enum Analytics {

    // MARK: - Identity

    static func identify(userID: String, isAnonymous: Bool) {
        let version = Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"

        // PostHog identity
        PostHogSDK.shared.identify(userID, userProperties: [
            "is_anonymous": isAnonymous,
            "app_version": version,
            "platform": "ios"
        ])

        // Singular identity (ties attribution data to user)
        if !isAnonymous {
            Singular.setCustomUserId(userID)
        }

        // Firebase Analytics — set user ID for crash/funnel correlation
        #if canImport(FirebaseAnalytics)
        FirebaseAnalytics.Analytics.setUserID(isAnonymous ? nil : userID)
        #endif
    }

    static func reset() {
        PostHogSDK.shared.reset()
        Singular.unsetCustomUserId()
        #if canImport(FirebaseAnalytics)
        FirebaseAnalytics.Analytics.setUserID(nil)
        #endif
    }

    // MARK: - Capture

    static func capture(_ event: Event, properties: [String: Any] = [:]) {
        // PostHog — all events
        PostHogSDK.shared.capture(event.rawValue, properties: properties.isEmpty ? nil : properties)

        // Singular — only events Google Ads needs for conversion/bidding
        switch event {
        case .subscriptionStarted:
            Singular.event("sng_subscribe")
        case .onboardingCompleted:
            Singular.event("sng_complete_registration")
        case .birthDataEntered:
            Singular.event("sng_complete_registration_with_data")
        case .chatSessionStarted:
            Singular.event("sng_start_trial")
        default:
            break
        }

        // Firebase Analytics — review prompt (for engagement funnel in BigQuery / GA4)
        #if canImport(FirebaseAnalytics)
        if event == .reviewPromptShown {
            FirebaseAnalytics.Analytics.logEvent("review_prompt_shown", parameters: properties.isEmpty ? nil : properties as [String: Any])
        }
        #endif
    }

    /// Fire a revenue event — call this when Adapty confirms a purchase with price info.
    /// - Parameters:
    ///   - currency: ISO 4217 currency code e.g. "USD"
    ///   - amount: Purchase price
    ///   - productID: App Store product identifier
    static func revenue(currency: String, amount: Double, productID: String) {
        // PostHog — product analytics revenue tracking
        PostHogSDK.shared.capture(Event.subscriptionStarted.rawValue, properties: [
            "currency": currency,
            "amount": amount,
            "product_id": productID
        ])

        // Firebase Analytics — standard purchase event (feeds Google Ads audiences + BigQuery)
        #if canImport(FirebaseAnalytics)
        FirebaseAnalytics.Analytics.logEvent(AnalyticsEventPurchase, parameters: [
            AnalyticsParameterCurrency: currency,
            AnalyticsParameterValue: amount,
            AnalyticsParameterItemID: productID,
            AnalyticsParameterTransactionID: UUID().uuidString
        ])
        #endif

        // NOTE: Singular revenue is intentionally NOT reported here.
        // Singular's SDK automatically observes StoreKit transactions via its built-in
        // IAP observer (enabled by default in SingularConfig). Calling customRevenue()
        // here would double-count every purchase in Singular and Google Ads S2S postbacks.
    }

    // MARK: - Event Names

    enum Event: String {
        // App lifecycle
        case appOpened                  = "app_opened"
        case appForegrounded            = "app_foregrounded"
        case appBackgrounded            = "app_backgrounded"

        // Auth
        case signInAttempted            = "sign_in_attempted"
        case signInSucceeded            = "sign_in_succeeded"
        case signInFailed               = "sign_in_failed"
        case signedOut                  = "signed_out"

        // Onboarding
        case onboardingStarted          = "onboarding_started"
        case onboardingStepCompleted    = "onboarding_step_completed"
        case onboardingCompleted        = "onboarding_completed"
        case birthDataEntered           = "birth_data_entered"

        // Globe
        case globeCityTapped            = "globe_city_tapped"
        case globeLineTapped            = "globe_line_tapped"
        case locationAnalyzed           = "location_analyzed"
        case locationAddedToFavorites   = "location_added_to_favorites"

        // Chat
        case chatSessionStarted         = "chat_session_started"
        case chatMessageSent            = "chat_message_sent"
        case chatLimitReached           = "chat_limit_reached"
        case aiToolCalled               = "ai_tool_called"

        // Paywall & subscription
        case paywallViewed              = "paywall_viewed"
        case paywallDismissed           = "paywall_dismissed"
        case subscriptionStarted        = "subscription_started"
        case subscriptionRenewed        = "subscription_renewed"
        case subscriptionRenewalCancelled   = "subscription_renewal_cancelled"
        case subscriptionRenewalReactivated = "subscription_renewal_reactivated"
        case subscriptionExpired        = "subscription_expired"
        case enteredGracePeriod         = "entered_grace_period"
        case billingIssueDetected       = "billing_issue_detected"

        // Notifications
        case notificationPermissionGranted  = "notification_permission_granted"
        case notificationPermissionDenied   = "notification_permission_denied"

        // Review
        case reviewPromptShown              = "review_prompt_shown"
    }
}
