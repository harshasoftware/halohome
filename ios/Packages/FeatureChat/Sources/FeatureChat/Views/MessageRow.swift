import SwiftUI
import DesignSystem

/// Single message row component
public struct MessageRow: View {
    
    let message: ChatMessage
    
    public init(message: ChatMessage) {
        self.message = message
    }
    
    public var body: some View {
        HStack {
            if message.role == .user {
                Spacer()
                userBubble
            } else {
                assistantBubble
                Spacer()
            }
        }
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityDescription)
    }

    private var accessibilityDescription: String {
        let role = message.role == .user ? "You" : "Assistant"
        if message.isStreaming && message.text.isEmpty {
            return "\(role) is typing"
        }
        return "\(role): \(message.text)"
    }
    
    // MARK: - Bubbles
    
    private var userBubble: some View {
        Text(message.text)
            .font(DSTypography.body)
            .foregroundStyle(.white)
            .padding(DSSpacing.lg)
            .background(DSGradient.primaryLinear)
            .clipShape(.rect(cornerRadius: DSRadius.lg))
            .frame(maxWidth: 280, alignment: .trailing)
    }
    
    private var assistantBubble: some View {
        SAIStreamingBubble(
            text: message.text,
            isStreaming: message.isStreaming,
            isTyping: message.isStreaming && message.text.isEmpty
        )
        .frame(maxWidth: 320, alignment: .leading)
    }
}

