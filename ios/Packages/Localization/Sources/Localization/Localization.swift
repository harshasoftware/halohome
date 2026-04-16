// Localization Module
// Re-exports for convenient importing

@_exported import struct Foundation.Locale

/// Localization module provides type-safe string localization for CartoStar.
///
/// ## Quick Start
/// ```swift
/// import Localization
///
/// // Use type-safe string keys
/// Text(L10n.Auth.tagline)
/// Text(L10n.Chat.messagesRemaining(5))
/// ```
///
/// ## Adding Languages
/// 1. Create `[language-code].lproj/Localizable.strings` in Resources/
/// 2. Copy content from en.lproj and translate
/// 3. Rebuild - new language is automatically available
///
/// ## Documentation
/// See `docs/modules/Localization.md` for full documentation.
public enum Localization {
    /// Module version
    public static let version = "1.1.0"
}
