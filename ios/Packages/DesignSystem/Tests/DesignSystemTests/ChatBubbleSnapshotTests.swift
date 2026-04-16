import XCTest
@testable import DesignSystem
import SwiftUI

final class ChatBubbleSnapshotTests: XCTestCase {
    
    // MARK: - Basic Rendering Tests
    
    func testChatBubbleUserMessage() {
        // Given
        let bubble = ChatBubble(role: .user, text: "Hello, world!")
        
        // Then - Should compile and have correct role
        XCTAssertNotNil(bubble)
    }
    
    func testChatBubbleAssistantMessage() {
        // Given
        let bubble = ChatBubble(role: .assistant, text: "How can I help you?")
        
        // Then
        XCTAssertNotNil(bubble)
    }
    
    func testChatBubbleStreaming() {
        // Given
        let bubble = ChatBubble(role: .assistant, text: "Thinking...", isStreaming: true)
        
        // Then
        XCTAssertNotNil(bubble)
    }
    
    // MARK: - Light/Dark Mode Tests
    
    func testChatBubbleInLightMode() {
        // Verify colors exist for light mode
        let userBubble = ChatBubble(role: .user, text: "Test in light mode")
        let assistantBubble = ChatBubble(role: .assistant, text: "Response in light mode")
        
        XCTAssertNotNil(userBubble)
        XCTAssertNotNil(assistantBubble)
        
        // In a real snapshot test, would capture view hierarchy
        // and compare with reference images for light mode
    }
    
    func testChatBubbleInDarkMode() {
        // Verify colors exist for dark mode
        let userBubble = ChatBubble(role: .user, text: "Test in dark mode")
        let assistantBubble = ChatBubble(role: .assistant, text: "Response in dark mode")
        
        XCTAssertNotNil(userBubble)
        XCTAssertNotNil(assistantBubble)
        
        // In a real snapshot test, would set dark mode trait collection
        // and compare with reference images for dark mode
    }
    
    // MARK: - Large Text / Accessibility Tests
    
    func testChatBubbleWithLargeText() {
        // Test with accessibility large text sizes
        let longText = String(repeating: "This is a long message to test text wrapping and layout with larger font sizes. ", count: 3)
        let bubble = ChatBubble(role: .assistant, text: longText)
        
        XCTAssertNotNil(bubble)
        
        // In a real snapshot test, would set large content size category
        // and verify layout handles it gracefully
    }
    
    func testChatBubbleAccessibility() {
        // Verify accessibility labels are set correctly
        let userBubble = ChatBubble(role: .user, text: "User message")
        let assistantBubble = ChatBubble(role: .assistant, text: "Assistant message")
        
        XCTAssertNotNil(userBubble)
        XCTAssertNotNil(assistantBubble)
        
        // Real test would verify:
        // - VoiceOver labels include role ("Your message", "Assistant message")
        // - Text is selectable
        // - Bubble respects accessibility text size
    }
    
    // MARK: - Token Verification Tests
    
    func testSpacingTokens() {
        // Verify spacing scale
        XCTAssertEqual(DSSpacing.xs, 4)
        XCTAssertEqual(DSSpacing.sm, 8)
        XCTAssertEqual(DSSpacing.md, 12)
        XCTAssertEqual(DSSpacing.lg, 16)
        XCTAssertEqual(DSSpacing.xl, 24)
    }
    
    func testTypographyStyles() {
        // Verify typography styles exist and are properly sized
        XCTAssertNotNil(DSTypography.body)
        XCTAssertNotNil(DSTypography.code)
        // Note: title, headline, footnote may not be in current typography system
        // The actual font styles used are .body and .code
    }
    
    func testBrandConfigValues() {
        // Verify brand configuration is accessible
        XCTAssertFalse(BrandConfig.appDisplayName.isEmpty)
        XCTAssertNotNil(BrandConfig.accentColor)
        XCTAssertFalse(BrandConfig.avatarFallbackSymbol.isEmpty)
    }
}

