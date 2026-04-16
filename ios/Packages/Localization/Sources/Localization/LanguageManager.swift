import Foundation
import SwiftUI

/// Manages the app's language override independently of the system locale.
///
/// Uses `UserDefaults` so the preference is available immediately at launch,
/// before SwiftData or any heavy dependency loads.
///
/// Usage:
/// ```swift
/// // Change language
/// LanguageManager.shared.setLanguage(.ar)
///
/// // Current language code (nil = system)
/// LanguageManager.shared.current
///
/// // Apply RTL in SwiftUI root view
/// ContentView()
///     .environment(\.layoutDirection, LanguageManager.shared.layoutDirection)
/// ```
public final class LanguageManager: @unchecked Sendable {

    public static let shared = LanguageManager()

    /// Notification posted when the language changes.
    /// Observe this to force UI refreshes.
    public static let languageDidChange = Notification.Name("LanguageManagerDidChange")

    /// Supported app languages
    public enum AppLanguage: String, CaseIterable, Sendable, Identifiable {
        case system  // follow device
        case en
        case es
        case ptBR = "pt-BR"
        case ja
        case de
        case fr
        case it
        case hi
        case ar
        case tr
        case uk
        case ru
        case th
        case id
        case ko
        case zhHans = "zh-Hans"
        case zhHant = "zh-Hant"
        case ms
        case el

        public var id: String { rawValue }

        /// Display name key in Localizable.strings
        public var displayName: String {
            let key = "language.\(rawValue)"
            return NSLocalizedString(key, bundle: LanguageManager.shared.bundle, comment: "")
        }

        /// Whether this language uses right-to-left layout
        public var isRTL: Bool {
            switch self {
            case .ar: return true
            default: return false
            }
        }
    }

    // MARK: - RTL Languages

    /// Language codes that use right-to-left layout
    private static let rtlCodes: Set<String> = ["ar", "he", "fa", "ur"]

    // MARK: - Storage

    private static let storageKey = "cartostar_app_language"

    // MARK: - State

    /// The currently selected language (nil == system).
    public private(set) var current: AppLanguage {
        didSet {
            guard current != oldValue else { return }
            _bundle = nil // invalidate cached bundle
            UserDefaults.standard.set(current.rawValue, forKey: Self.storageKey)
            NotificationCenter.default.post(name: Self.languageDidChange, object: nil)
        }
    }

    /// Resolved bundle for the active language.
    /// Falls back to `.module` (which respects the device locale).
    public var bundle: Bundle {
        if let cached = _bundle { return cached }
        let resolved = resolveBundle()
        _bundle = resolved
        return resolved
    }

    /// The layout direction for the current language.
    /// Apply via `.environment(\.layoutDirection, LanguageManager.shared.layoutDirection)`
    public var layoutDirection: LayoutDirection {
        switch current {
        case .system:
            // Respect system locale RTL setting
            let code = Locale.current.language.languageCode?.identifier ?? "en"
            return Self.rtlCodes.contains(code) ? .rightToLeft : .leftToRight
        case .ar:
            return .rightToLeft
        default:
            return .leftToRight
        }
    }

    /// Whether the current language is RTL
    public var isRTL: Bool {
        layoutDirection == .rightToLeft
    }

    private var _bundle: Bundle?

    // MARK: - Init

    private init() {
        if let raw = UserDefaults.standard.string(forKey: Self.storageKey),
           let lang = AppLanguage(rawValue: raw) {
            current = lang
        } else {
            current = .system
        }
    }

    // MARK: - Public API

    /// Change the app language. Pass `.system` to follow the device.
    public func setLanguage(_ language: AppLanguage) {
        current = language
    }

    // MARK: - Bundle Resolution

    private func resolveBundle() -> Bundle {
        guard current != .system else { return .module }

        let code = current.rawValue

        // Try the exact code first (e.g. "pt-BR"), then the base (e.g. "pt")
        if let path = Bundle.module.path(forResource: code, ofType: "lproj"),
           let bundle = Bundle(path: path) {
            return bundle
        }

        // Fallback: base language code
        let base = code.components(separatedBy: "-").first ?? code
        if let path = Bundle.module.path(forResource: base, ofType: "lproj"),
           let bundle = Bundle(path: path) {
            return bundle
        }

        return .module
    }
}
