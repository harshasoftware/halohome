import XCTest
@testable import Localization

/// Tests for Localization module
final class L10nTests: XCTestCase {
    
    // MARK: - String Resolution Tests
    
    func testAuth_tagline_returnsNonEmptyString() {
        let tagline = L10n.Auth.tagline
        XCTAssertFalse(tagline.isEmpty, "Tagline should not be empty")
        XCTAssertEqual(tagline, "Your AI assistant")
    }
    
    func testChat_placeholder_returnsExpectedString() {
        let placeholder = L10n.Chat.placeholder
        XCTAssertEqual(placeholder, "Type a message...")
    }
    
    func testSettings_title_returnsExpectedString() {
        let title = L10n.Settings.title
        XCTAssertEqual(title, "Settings")
    }
    
    // MARK: - Pluralization Tests
    
    func testChat_messagesRemaining_zero() {
        let message = L10n.Chat.messagesRemaining(0)
        XCTAssertEqual(message, "No messages remaining")
    }
    
    func testChat_messagesRemaining_one() {
        let message = L10n.Chat.messagesRemaining(1)
        XCTAssertEqual(message, "1 message remaining")
    }
    
    func testChat_messagesRemaining_many() {
        let message = L10n.Chat.messagesRemaining(5)
        XCTAssertEqual(message, "5 messages remaining")
    }
    
    // MARK: - Error Messages Tests
    
    func testError_generic_returnsUserFriendlyMessage() {
        let message = L10n.Error.generic
        XCTAssertFalse(message.isEmpty)
        XCTAssertTrue(message.contains("try again"), "Generic error should suggest trying again")
    }
    
    func testError_networkOffline_mentionsConnection() {
        let message = L10n.Error.networkOffline
        XCTAssertTrue(message.lowercased().contains("offline") || message.lowercased().contains("connection"))
    }
    
    // MARK: - Accessibility Labels Tests
    
    func testA11y_sendMessage_returnsLabel() {
        let label = L10n.A11y.sendMessage
        XCTAssertFalse(label.isEmpty)
    }
    
    func testA11y_sendMessageHint_returnsHint() {
        let hint = L10n.A11y.sendMessageHint
        XCTAssertFalse(hint.isEmpty)
        XCTAssertTrue(hint.lowercased().contains("tap") || hint.lowercased().contains("send"))
    }
    
    // MARK: - Theme Names Tests
    
    func testTheme_allThemesHaveNames() {
        XCTAssertFalse(L10n.Theme.system.isEmpty)
        XCTAssertFalse(L10n.Theme.light.isEmpty)
        XCTAssertFalse(L10n.Theme.dark.isEmpty)
        XCTAssertFalse(L10n.Theme.aurora.isEmpty)
        XCTAssertFalse(L10n.Theme.obsidian.isEmpty)
    }
    
    // MARK: - Common Strings Tests
    
    func testCommon_ok_isShort() {
        let ok = L10n.Common.ok
        XCTAssertLessThanOrEqual(ok.count, 10, "OK button text should be short")
    }
    
    func testCommon_cancel_exists() {
        XCTAssertFalse(L10n.Common.cancel.isEmpty)
    }
    
    // MARK: - Locale Utilities Tests
    
    func testSupportedLanguages_includesEnglish() {
        let languages = L10n.supportedLanguages
        XCTAssertTrue(languages.contains("en"), "English should be supported")
    }
    
    func testCurrentLanguage_returnsValidCode() {
        let language = L10n.currentLanguage
        XCTAssertFalse(language.isEmpty)
        XCTAssertLessThanOrEqual(language.count, 5, "Language code should be short (e.g., 'en', 'es', 'zh-Hans')")
    }
    
    func testIsLanguageSupported_english_returnsTrue() {
        XCTAssertTrue(L10n.isLanguageSupported("en"))
    }
    
    func testIsLanguageSupported_invalidCode_returnsFalse() {
        XCTAssertFalse(L10n.isLanguageSupported("xx"))
    }
}
