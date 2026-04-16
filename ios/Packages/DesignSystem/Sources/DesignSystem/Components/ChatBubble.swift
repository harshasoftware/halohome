import SwiftUI

/// Chat bubble component for messages
public struct ChatBubble: View {
    
    public enum Role: Sendable {
        case user
        case assistant
        case system
    }
    
    let role: Role
    let text: String
    let isStreaming: Bool
    
    public init(role: Role, text: String, isStreaming: Bool = false) {
        self.role = role
        self.text = text
        self.isStreaming = isStreaming
    }
    
    public var body: some View {
        HStack(alignment: .top, spacing: 0) {
            if role == .user {
                Spacer(minLength: 0)
            }
            
            VStack(alignment: role == .user ? .trailing : .leading, spacing: DSSpacing.xs) {
                Text(text.isEmpty ? " " : text)
                    .font(DSTypography.body)
                    .textSelection(.enabled)
                    .padding(DSSpacing.lg)
                    .background(bubbleColor)
                    .foregroundStyle(textColor)
                    .clipShape(RoundedRectangle(cornerRadius: DSRadius.lg))
                
                if isStreaming {
                    HStack(spacing: DSSpacing.xs) {
                        ProgressView()
                            .scaleEffect(0.7)
                        Text("Typing...")
                            .font(DSTypography.caption)
                            .foregroundStyle(DSColors.textSecondary)
                    }
                }
            }
            .frame(maxWidth: 280, alignment: role == .user ? .trailing : .leading)
            
            if role != .user {
                Spacer(minLength: 0)
            }
        }
        .frame(maxWidth: .infinity, alignment: role == .user ? .trailing : .leading)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityLabelText)
    }
    
    // MARK: - Private Computed Properties
    
    private var bubbleColor: Color {
        switch role {
        case .user:
            return DSColors.bubbleUserOrFallback
        case .assistant, .system:
            return DSColors.bubbleAssistantOrFallback
        }
    }
    
    private var textColor: Color {
        switch role {
        case .user:
            return DSColors.background
        case .assistant, .system:
            return DSColors.textPrimary
        }
    }
    
    private var accessibilityLabelText: String {
        let roleLabel = switch role {
        case .user: "Your message"
        case .assistant: "Assistant message"
        case .system: "System message"
        }
        
        return "\(roleLabel): \(text)"
    }
}

// MARK: - Previews

#Preview("User Message") {
    ChatBubble(role: .user, text: "Hello, how are you?")
        .padding()
}

#Preview("Assistant Message") {
    ChatBubble(role: .assistant, text: "I'm doing well, thank you! How can I help you today?")
        .padding()
}

#Preview("Streaming") {
    ChatBubble(role: .assistant, text: "Thinking about your question...", isStreaming: true)
        .padding()
}

