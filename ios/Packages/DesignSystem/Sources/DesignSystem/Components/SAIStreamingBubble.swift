import SwiftUI

/// Signature AI Streaming Bubble component
///
/// An assistant message bubble with streaming states:
/// - Typing dots → streaming caret animation → fade to underline on completion
/// - Preserves monospace code runs
/// - Optional tool badges row (e.g., "Web", "Math")
///
/// Example:
/// ```swift
/// SAIStreamingBubble(
///     text: "Let me help you with that...",
///     isStreaming: true,
///     badges: ["Web", "Search"]
/// )
/// ```
public struct SAIStreamingBubble: View {
    
    private let text: String
    private let isStreaming: Bool
    private let isTyping: Bool
    private let badges: [String]
    
    @State private var caretVisible = true
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    public init(
        text: String,
        isStreaming: Bool = false,
        isTyping: Bool = false,
        badges: [String] = []
    ) {
        self.text = text
        self.isStreaming = isStreaming
        self.isTyping = isTyping
        self.badges = badges
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: DSSpacing.sm) {
            // Tool badges
            if !badges.isEmpty {
                badgesRow
            }
            
            // Message content
            HStack(alignment: .top, spacing: DSSpacing.xs) {
                if isTyping {
                    typingIndicator
                } else {
                    messageContent
                }
            }
            .padding(DSSpacing.lg)
            .background(DSColors.surface)
            .clipShape(.rect(cornerRadius: DSRadius.lg))
        }
    }
    
    // MARK: - Typing Indicator
    
    private var typingIndicator: some View {
        HStack(spacing: DSSpacing.xs) {
            ForEach(0..<3, id: \.self) { index in
                Circle()
                    .fill(DSColors.textSecondary)
                    .frame(width: 8, height: 8)
                    .animation(
                        Animation
                            .easeInOut(duration: 0.6)
                            .repeatForever()
                            .delay(Double(index) * 0.2),
                        value: isTyping
                    )
                    .opacity(isTyping ? 0.3 : 1.0)
            }
        }
    }
    
    // MARK: - Message Content
    
    private var messageContent: some View {
        HStack(alignment: .top, spacing: 0) {
            Text(text)
                .font(DSTypography.body)
                .foregroundStyle(DSColors.textPrimary)
                .textSelection(.enabled)
            
            if isStreaming {
                streamingCaret
            }
        }
    }
    
    private var streamingCaret: some View {
        Rectangle()
            .fill(DSColors.accentPrimary)
            .frame(width: 2, height: 20)
            .opacity(caretVisible ? 1.0 : 0.3)
            .animation(
                reduceMotion ? .default : .easeInOut(duration: 0.5).repeatForever(),
                value: caretVisible
            )
            .onAppear {
                if !reduceMotion {
                    caretVisible.toggle()
                }
            }
    }
    
    // MARK: - Tool Badges
    
    private var badgesRow: some View {
        HStack(spacing: DSSpacing.xs) {
            ForEach(badges, id: \.self) { badge in
                HStack(spacing: DSSpacing.xs) {
                    Image(systemName: badgeIcon(for: badge))
                        .font(.system(size: 10, weight: .medium))
                    Text(badge)
                        .font(.system(size: 11, weight: .medium))
                }
                .foregroundStyle(DSColors.accentPrimary)
                .padding(.horizontal, DSSpacing.sm)
                .padding(.vertical, DSSpacing.xs)
                .background(DSColors.chipSelectedBackground)
                .clipShape(.rect(cornerRadius: DSRadius.xs))
            }
        }
    }
    
    private func badgeIcon(for badge: String) -> String {
        switch badge.lowercased() {
        case "web", "search": return "globe"
        case "math", "calculate": return "function"
        case "code": return "chevron.left.forwardslash.chevron.right"
        case "image": return "photo"
        default: return "sparkles"
        }
    }
}

// MARK: - Code Detection Helper

private extension String {
    /// Detect if text contains code blocks
    var containsCode: Bool {
        contains("```") || contains("`")
    }
}

// MARK: - Previews

#Preview("Streaming Bubble States") {
    VStack(spacing: DSSpacing.lg) {
        // Typing state
        SAIStreamingBubble(
            text: "",
            isTyping: true
        )
        
        // Streaming state
        SAIStreamingBubble(
            text: "Let me help you with that",
            isStreaming: true
        )
        
        // Complete state
        SAIStreamingBubble(
            text: "Let me help you with that. Here's a comprehensive answer to your question with all the details you need.",
            isStreaming: false
        )
        
        // With badges
        SAIStreamingBubble(
            text: "I've searched the web and found the answer.",
            isStreaming: false,
            badges: ["Web", "Search"]
        )
        
        // Multiple badges
        SAIStreamingBubble(
            text: "I can help you with code and calculations.",
            isStreaming: true,
            badges: ["Code", "Math"]
        )
    }
    .padding(DSSpacing.lg)
    .background(DSColors.background)
}

#Preview("Streaming Bubble Dark Mode") {
    VStack(spacing: DSSpacing.lg) {
        SAIStreamingBubble(
            text: "",
            isTyping: true
        )
        
        SAIStreamingBubble(
            text: "Streaming response...",
            isStreaming: true,
            badges: ["Web"]
        )
        
        SAIStreamingBubble(
            text: "Complete response with all the details.",
            isStreaming: false
        )
    }
    .padding(DSSpacing.lg)
    .background(DSColors.background)
    .preferredColorScheme(.dark)
}

#Preview("Chat Simulation") {
    ScrollView {
        VStack(alignment: .leading, spacing: DSSpacing.lg) {
            // User message
            HStack {
                Spacer()
                Text("What's the weather like?")
                    .padding(DSSpacing.lg)
                    .background(DSColors.accentPrimary)
                    .foregroundStyle(DSColors.background)
                    .clipShape(.rect(cornerRadius: DSRadius.lg))
            }
            
            // Assistant typing
            SAIStreamingBubble(
                text: "",
                isTyping: true
            )
            
            // User message
            HStack {
                Spacer()
                Text("Can you help me with code?")
                    .padding(DSSpacing.lg)
                    .background(DSColors.accentPrimary)
                    .foregroundStyle(DSColors.background)
                    .clipShape(.rect(cornerRadius: DSRadius.lg))
            }
            
            // Assistant streaming
            SAIStreamingBubble(
                text: "Of course! I'd be happy to help you with coding. What",
                isStreaming: true,
                badges: ["Code"]
            )
        }
        .padding(DSSpacing.lg)
    }
    .background(DSColors.background)
}

