// This file is auto-generated from Config/Secrets.xcconfig
// Run 'bash scripts/update-config.sh' after updating Secrets.xcconfig
// HaloHome iOS Configuration

import Foundation

/// Application configuration loaded from Config/Secrets.xcconfig
/// This ensures configs work in all build types (Debug, Release, Archive, TestFlight, App Store)
enum AppConfiguration {
    // MARK: - Supabase (Connected to existing web app backend)
    static let SUPABASE_URL = "https://nabekutrmmfsziizpsxt.supabase.co"
    static let SUPABASE_PUBLISHABLE_KEY = "sb_publishable_AQ5jJ1jFI6o9O2wTaxWEZg_gYhDL-Vg"

    // MARK: - Google Sign In
    // NOTE: Placeholder - requires iOS-specific OAuth Client ID
    // Create at: https://console.cloud.google.com → APIs & Services → Credentials
    // Bundle ID: llc.teamchai.halohome
    static let GOOGLE_CLIENT_ID = "842417808948-49tqq8jeh1edbtrrbai3t58h209ttnci.apps.googleusercontent.com"

    // MARK: - Adapty (iOS Subscriptions)
    static let ADAPTY_API_KEY = "public_live_EZBGzJtS.AQyOgAnyRoXpMhqgemg8"
    static let ADAPTY_ACCESS_LEVEL_ID = "premium"
    static let ADAPTY_PLACEMENT_ID = "default"

    // MARK: - AI Proxy (Supabase Edge Function)
    static let PROXY_BASE_URL = "https://nabekutrmmfsziizpsxt.supabase.co/functions/v1"
    static let PROXY_PATH = "/ai"

    // MARK: - Subscription Products (App Store Connect)
    // Pro tier
    static let MONTHLY_PRODUCT_ID = "com.halohome.pro.monthly"
    static let ANNUAL_PRODUCT_ID = "com.halohome.pro.annual"
    // Duo tier
    static let DUO_MONTHLY_PRODUCT_ID = "com.halohome.duo.monthly"
    static let DUO_ANNUAL_PRODUCT_ID = "com.halohome.duo.annual"
    // Lifetime
    static let LIFETIME_PRODUCT_ID = "com.halohome.lifetime"

    // MARK: - PostHog Analytics & Session Replay
    static let POSTHOG_API_KEY = "phc_rx38pRVWomCKdLXopTB6GSZzdfxigPmfiyNnuTpabpu6"
    static let POSTHOG_HOST = "https://analytics.halohome.com"

    // MARK: - OneSignal Push Notifications
    static let ONESIGNAL_APP_ID = "6661fc59-c486-4605-ae60-5313defc2621"

    // MARK: - Singular Attribution
    static let SINGULAR_SDK_KEY = "teamchai_382756b5"
    static let SINGULAR_SDK_SECRET = "67450ba02ff35c04cb04a122a1243f03"

    /// Check if a configuration value is available (not a placeholder)
    static func isConfigured(_ key: String) -> Bool {
        switch key {
        case "SUPABASE_URL": return !SUPABASE_URL.contains("placeholder") && !SUPABASE_URL.contains("YOUR")
        case "SUPABASE_PUBLISHABLE_KEY": return !SUPABASE_PUBLISHABLE_KEY.contains("placeholder") && !SUPABASE_PUBLISHABLE_KEY.contains("YOUR")
        case "GOOGLE_CLIENT_ID": return !GOOGLE_CLIENT_ID.contains("placeholder") && !GOOGLE_CLIENT_ID.contains("YOUR")
        case "ADAPTY_API_KEY": return !ADAPTY_API_KEY.contains("placeholder") && !ADAPTY_API_KEY.contains("YOUR")
        case "PROXY_BASE_URL": return !PROXY_BASE_URL.contains("placeholder") && !PROXY_BASE_URL.contains("YOUR")
        case "ONESIGNAL_APP_ID": return !ONESIGNAL_APP_ID.contains("placeholder") && !ONESIGNAL_APP_ID.contains("YOUR")
        default: return true
        }
    }

    /// Returns true if Supabase is fully configured and ready
    static var isSupabaseReady: Bool {
        isConfigured("SUPABASE_URL") && isConfigured("SUPABASE_PUBLISHABLE_KEY")
    }

    /// Returns true if Google Sign-In is configured
    static var isGoogleSignInReady: Bool {
        isConfigured("GOOGLE_CLIENT_ID")
    }

    /// Returns true if Adapty is configured for subscriptions
    static var isAdaptyReady: Bool {
        isConfigured("ADAPTY_API_KEY")
    }
}
