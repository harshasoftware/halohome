import Foundation

// MARK: - Localization Namespace
/// Type-safe localization keys for CartoStar
///
/// Usage:
/// ```swift
/// import Localization
///
/// // Simple string
/// Text(L10n.Auth.tagline)
///
/// // String with arguments
/// Text(L10n.Chat.messagesRemaining(5))
///
/// // In ViewModel
/// errorMessage = L10n.Error.networkOffline
/// ```
///
/// ## Adding New Strings
/// 1. Add the key to this file under the appropriate namespace
/// 2. Add the translation to all `.strings` files in Resources/
/// 3. Use `String(localized:bundle:)` for type-safe access
///
/// ## Adding New Languages
/// 1. Create new folder: `Resources/[language-code].lproj/`
/// 2. Copy `Localizable.strings` from `en.lproj/`
/// 3. Translate all strings
/// 4. Xcode will automatically include the new language
public enum L10n {
    
    // MARK: - Bundle Reference
    /// The bundle containing localization resources, resolved via LanguageManager
    private static var bundle: Bundle {
        LanguageManager.shared.bundle
    }
    
    // MARK: - Auth
    /// Authentication-related strings
    public enum Auth {
        /// "Your AI assistant" - App tagline on sign-in screen
        public static var tagline: String {
            String(localized: "auth.tagline", bundle: bundle)
        }
        
        /// "Sign in with Apple"
        public static var signInApple: String {
            String(localized: "auth.signIn.apple", bundle: bundle)
        }
        
        /// "Continue with Google"
        public static var signInGoogle: String {
            String(localized: "auth.signIn.google", bundle: bundle)
        }
        
        /// "Use email instead"
        public static var useEmail: String {
            String(localized: "auth.useEmail", bundle: bundle)
        }
        
        /// "Sign in" - Email sign in button
        public static var signIn: String {
            String(localized: "auth.signIn", bundle: bundle)
        }
        
        /// "Create account" - Email sign up button
        public static var createAccount: String {
            String(localized: "auth.createAccount", bundle: bundle)
        }
        
        /// "Forgot password?"
        public static var forgotPassword: String {
            String(localized: "auth.forgotPassword", bundle: bundle)
        }
        
        /// "Sign out"
        public static var signOut: String {
            String(localized: "auth.signOut", bundle: bundle)
        }
        
        /// "Email"
        public static var email: String {
            String(localized: "auth.email", bundle: bundle)
        }
        
        /// "Password"
        public static var password: String {
            String(localized: "auth.password", bundle: bundle)
        }
        
        /// "Confirm password"
        public static var confirmPassword: String {
            String(localized: "auth.confirmPassword", bundle: bundle)
        }
        
        /// Legal disclaimer with links
        public static var legalDisclaimer: String {
            String(localized: "auth.legalDisclaimer", bundle: bundle)
        }
    }
    
    // MARK: - Chat
    /// Chat-related strings
    public enum Chat {
        /// "Type a message..."
        public static var placeholder: String {
            String(localized: "chat.placeholder", bundle: bundle)
        }
        
        /// "New Chat"
        public static var newChat: String {
            String(localized: "chat.newChat", bundle: bundle)
        }
        
        /// "Chat History"
        public static var history: String {
            String(localized: "chat.history", bundle: bundle)
        }
        
        /// "Delete Chat"
        public static var deleteChat: String {
            String(localized: "chat.deleteChat", bundle: bundle)
        }
        
        /// "Delete all chats"
        public static var deleteAll: String {
            String(localized: "chat.deleteAll", bundle: bundle)
        }
        
        /// "No messages yet"
        public static var emptyState: String {
            String(localized: "chat.emptyState", bundle: bundle)
        }
        
        /// "Start a conversation to see messages here"
        public static var emptyStateSubtitle: String {
            String(localized: "chat.emptyStateSubtitle", bundle: bundle)
        }
        
        /// "Thinking..." - AI processing indicator
        public static var thinking: String {
            String(localized: "chat.thinking", bundle: bundle)
        }
        
        /// "Copy" - Copy message action
        public static var copy: String {
            String(localized: "chat.copy", bundle: bundle)
        }
        
        /// "Copied!"
        public static var copied: String {
            String(localized: "chat.copied", bundle: bundle)
        }
        
        /// "Retry" - Retry failed message
        public static var retry: String {
            String(localized: "chat.retry", bundle: bundle)
        }
        
        /// "{count} messages remaining" - Pluralized
        public static func messagesRemaining(_ count: Int) -> String {
            String(localized: "chat.messagesRemaining \(count)", bundle: bundle)
        }
        
        /// "Today"
        public static var today: String {
            String(localized: "chat.today", bundle: bundle)
        }
        
        /// "Yesterday"
        public static var yesterday: String {
            String(localized: "chat.yesterday", bundle: bundle)
        }
    }
    
    // MARK: - Settings
    /// Settings-related strings
    public enum Settings {
        /// "Settings"
        public static var title: String {
            String(localized: "settings.title", bundle: bundle)
        }
        
        /// "Appearance"
        public static var appearance: String {
            String(localized: "settings.appearance", bundle: bundle)
        }
        
        /// "Theme"
        public static var theme: String {
            String(localized: "settings.theme", bundle: bundle)
        }
        
        /// "Notifications"
        public static var notifications: String {
            String(localized: "settings.notifications", bundle: bundle)
        }
        
        /// "Push Notifications"
        public static var pushNotifications: String {
            String(localized: "settings.pushNotifications", bundle: bundle)
        }
        
        /// "Privacy"
        public static var privacy: String {
            String(localized: "settings.privacy", bundle: bundle)
        }
        
        /// "Share diagnostics"
        public static var shareDiagnostics: String {
            String(localized: "settings.shareDiagnostics", bundle: bundle)
        }
        
        /// "Help us improve by sharing crash reports"
        public static var shareDiagnosticsSubtitle: String {
            String(localized: "settings.shareDiagnosticsSubtitle", bundle: bundle)
        }
        
        /// "Account"
        public static var account: String {
            String(localized: "settings.account", bundle: bundle)
        }
        
        /// "Delete Account"
        public static var deleteAccount: String {
            String(localized: "settings.deleteAccount", bundle: bundle)
        }
        
        /// "Legal"
        public static var legal: String {
            String(localized: "settings.legal", bundle: bundle)
        }
        
        /// "Terms of Service"
        public static var termsOfService: String {
            String(localized: "settings.termsOfService", bundle: bundle)
        }
        
        /// "Privacy Policy"
        public static var privacyPolicy: String {
            String(localized: "settings.privacyPolicy", bundle: bundle)
        }
        
        /// "About"
        public static var about: String {
            String(localized: "settings.about", bundle: bundle)
        }
        
        /// "Version"
        public static var version: String {
            String(localized: "settings.version", bundle: bundle)
        }

        /// "Language"
        public static var language: String {
            String(localized: "settings.language", bundle: bundle)
        }

        /// "Choose the app language..."
        public static var languageFooter: String {
            String(localized: "settings.languageFooter", bundle: bundle)
        }
    }

    // MARK: - Languages
    /// Language display names
    public enum Language {
        /// "System"
        public static var system: String {
            String(localized: "language.system", bundle: bundle)
        }

        /// "English"
        public static var en: String {
            String(localized: "language.en", bundle: bundle)
        }

        /// "Español"
        public static var es: String {
            String(localized: "language.es", bundle: bundle)
        }

        /// "Português (Brasil)"
        public static var ptBR: String {
            String(localized: "language.pt-BR", bundle: bundle)
        }

        /// "日本語"
        public static var ja: String {
            String(localized: "language.ja", bundle: bundle)
        }

        /// "Deutsch"
        public static var de: String {
            String(localized: "language.de", bundle: bundle)
        }

        /// "Français"
        public static var fr: String {
            String(localized: "language.fr", bundle: bundle)
        }

        /// "Italiano"
        public static var it: String {
            String(localized: "language.it", bundle: bundle)
        }

        /// "हिन्दी"
        public static var hi: String {
            String(localized: "language.hi", bundle: bundle)
        }

        /// "العربية"
        public static var ar: String {
            String(localized: "language.ar", bundle: bundle)
        }

        /// "Türkçe"
        public static var tr: String {
            String(localized: "language.tr", bundle: bundle)
        }

        /// "Українська"
        public static var uk: String {
            String(localized: "language.uk", bundle: bundle)
        }

        /// "Русский"
        public static var ru: String {
            String(localized: "language.ru", bundle: bundle)
        }

        /// "ไทย"
        public static var th: String {
            String(localized: "language.th", bundle: bundle)
        }

        /// "Bahasa Indonesia"
        public static var id: String {
            String(localized: "language.id", bundle: bundle)
        }

        /// "한국어"
        public static var ko: String {
            String(localized: "language.ko", bundle: bundle)
        }

        /// "简体中文"
        public static var zhHans: String {
            String(localized: "language.zh-Hans", bundle: bundle)
        }

        /// "繁體中文"
        public static var zhHant: String {
            String(localized: "language.zh-Hant", bundle: bundle)
        }

        /// "Bahasa Melayu"
        public static var ms: String {
            String(localized: "language.ms", bundle: bundle)
        }

        /// "Ελληνικά"
        public static var el: String {
            String(localized: "language.el", bundle: bundle)
        }
    }
    
    // MARK: - Themes
    /// Theme names
    public enum Theme {
        /// "System"
        public static var system: String {
            String(localized: "theme.system", bundle: bundle)
        }
        
        /// "Light"
        public static var light: String {
            String(localized: "theme.light", bundle: bundle)
        }
        
        /// "Dark"
        public static var dark: String {
            String(localized: "theme.dark", bundle: bundle)
        }
        
        /// "Aurora"
        public static var aurora: String {
            String(localized: "theme.aurora", bundle: bundle)
        }
        
        /// "Obsidian"
        public static var obsidian: String {
            String(localized: "theme.obsidian", bundle: bundle)
        }
    }
    
    // MARK: - Payments
    /// Payment-related strings
    public enum Payments {
        /// "Upgrade to Pro"
        public static var upgradeToPro: String {
            String(localized: "payments.upgradeToPro", bundle: bundle)
        }
        
        /// "Restore Purchases"
        public static var restore: String {
            String(localized: "payments.restore", bundle: bundle)
        }
        
        /// "Subscribe"
        public static var subscribe: String {
            String(localized: "payments.subscribe", bundle: bundle)
        }
        
        /// "Free Trial"
        public static var freeTrial: String {
            String(localized: "payments.freeTrial", bundle: bundle)
        }
        
        /// "per month"
        public static var perMonth: String {
            String(localized: "payments.perMonth", bundle: bundle)
        }
        
        /// "per year"
        public static var perYear: String {
            String(localized: "payments.perYear", bundle: bundle)
        }
        
        /// "Best Value"
        public static var bestValue: String {
            String(localized: "payments.bestValue", bundle: bundle)
        }
        
        /// "Cancel anytime"
        public static var cancelAnytime: String {
            String(localized: "payments.cancelAnytime", bundle: bundle)
        }
        
        /// "Subscribed"
        public static var subscribed: String {
            String(localized: "payments.subscribed", bundle: bundle)
        }
        
        /// "Manage Subscription"
        public static var manageSubscription: String {
            String(localized: "payments.manageSubscription", bundle: bundle)
        }
    }
    
    // MARK: - Onboarding
    /// Onboarding-related strings
    public enum Onboarding {
        /// "Welcome"
        public static var welcome: String {
            String(localized: "onboarding.welcome", bundle: bundle)
        }
        
        /// "Get Started"
        public static var getStarted: String {
            String(localized: "onboarding.getStarted", bundle: bundle)
        }
        
        /// "Continue"
        public static var continueButton: String {
            String(localized: "onboarding.continue", bundle: bundle)
        }
        
        /// "Skip"
        public static var skip: String {
            String(localized: "onboarding.skip", bundle: bundle)
        }
        
        /// "Next"
        public static var next: String {
            String(localized: "onboarding.next", bundle: bundle)
        }
    }
    
    // MARK: - Profile
    /// Profile-related strings
    public enum Profile {
        /// "Profile"
        public static var title: String {
            String(localized: "profile.title", bundle: bundle)
        }
        
        /// "Edit Profile"
        public static var edit: String {
            String(localized: "profile.edit", bundle: bundle)
        }
        
        /// "Change Photo"
        public static var changePhoto: String {
            String(localized: "profile.changePhoto", bundle: bundle)
        }
        
        /// "Display Name"
        public static var displayName: String {
            String(localized: "profile.displayName", bundle: bundle)
        }
    }
    
    // MARK: - Common
    /// Common strings used throughout the app
    public enum Common {
        /// "OK"
        public static var ok: String {
            String(localized: "common.ok", bundle: bundle)
        }
        
        /// "Cancel"
        public static var cancel: String {
            String(localized: "common.cancel", bundle: bundle)
        }
        
        /// "Done"
        public static var done: String {
            String(localized: "common.done", bundle: bundle)
        }
        
        /// "Save"
        public static var save: String {
            String(localized: "common.save", bundle: bundle)
        }
        
        /// "Delete"
        public static var delete: String {
            String(localized: "common.delete", bundle: bundle)
        }
        
        /// "Edit"
        public static var edit: String {
            String(localized: "common.edit", bundle: bundle)
        }
        
        /// "Close"
        public static var close: String {
            String(localized: "common.close", bundle: bundle)
        }
        
        /// "Loading..."
        public static var loading: String {
            String(localized: "common.loading", bundle: bundle)
        }
        
        /// "Try Again"
        public static var tryAgain: String {
            String(localized: "common.tryAgain", bundle: bundle)
        }
        
        /// "Learn More"
        public static var learnMore: String {
            String(localized: "common.learnMore", bundle: bundle)
        }
    }
    
    // MARK: - Errors
    /// User-facing error messages
    public enum Error {
        /// "Something went wrong. Please try again."
        public static var generic: String {
            String(localized: "error.generic", bundle: bundle)
        }
        
        /// "You're offline. Please check your internet connection."
        public static var networkOffline: String {
            String(localized: "error.networkOffline", bundle: bundle)
        }
        
        /// "Request timed out. Please try again."
        public static var timeout: String {
            String(localized: "error.timeout", bundle: bundle)
        }
        
        /// "Please enter a valid email address"
        public static var invalidEmail: String {
            String(localized: "error.invalidEmail", bundle: bundle)
        }
        
        /// "Password must be at least 8 characters"
        public static var passwordTooShort: String {
            String(localized: "error.passwordTooShort", bundle: bundle)
        }
        
        /// "Passwords don't match"
        public static var passwordMismatch: String {
            String(localized: "error.passwordMismatch", bundle: bundle)
        }
        
        /// "Authentication failed"
        public static var authFailed: String {
            String(localized: "error.authFailed", bundle: bundle)
        }
        
        /// "Purchase failed"
        public static var purchaseFailed: String {
            String(localized: "error.purchaseFailed", bundle: bundle)
        }
        
        /// "Failed to load data"
        public static var loadFailed: String {
            String(localized: "error.loadFailed", bundle: bundle)
        }
        
        /// "Failed to save changes"
        public static var saveFailed: String {
            String(localized: "error.saveFailed", bundle: bundle)
        }
    }
    
    // MARK: - Accessibility
    /// Accessibility labels and hints (VoiceOver)
    public enum A11y {
        /// "Send message"
        public static var sendMessage: String {
            String(localized: "a11y.sendMessage", bundle: bundle)
        }
        
        /// "Double tap to send your message"
        public static var sendMessageHint: String {
            String(localized: "a11y.sendMessageHint", bundle: bundle)
        }
        
        /// "Message from you"
        public static var userMessage: String {
            String(localized: "a11y.userMessage", bundle: bundle)
        }
        
        /// "Message from assistant"
        public static var assistantMessage: String {
            String(localized: "a11y.assistantMessage", bundle: bundle)
        }
        
        /// "Double tap to copy message"
        public static var copyMessageHint: String {
            String(localized: "a11y.copyMessageHint", bundle: bundle)
        }
        
        /// "Theme selector"
        public static var themeSelector: String {
            String(localized: "a11y.themeSelector", bundle: bundle)
        }
        
        /// "Double tap to sign in using your Apple ID"
        public static var signInAppleHint: String {
            String(localized: "a11y.signInAppleHint", bundle: bundle)
        }
        
        /// "Profile photo"
        public static var profilePhoto: String {
            String(localized: "a11y.profilePhoto", bundle: bundle)
        }
        
        /// "Double tap to change your profile photo"
        public static var profilePhotoHint: String {
            String(localized: "a11y.profilePhotoHint", bundle: bundle)
        }
    }
}

// MARK: - Locale Utilities
public extension L10n {
    /// Currently supported languages
    static var supportedLanguages: [String] {
        bundle.localizations.filter { $0 != "Base" }
    }
    
    /// Current app language code
    static var currentLanguage: String {
        Locale.current.language.languageCode?.identifier ?? "en"
    }
    
    /// Check if a language is supported
    static func isLanguageSupported(_ languageCode: String) -> Bool {
        supportedLanguages.contains(languageCode)
    }
}
