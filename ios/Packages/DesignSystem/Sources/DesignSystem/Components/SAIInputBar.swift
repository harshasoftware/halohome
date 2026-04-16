import SwiftUI

/// Signature AI Input Bar component
///
/// An expanding text input area (1-6 lines) with Cmd+Enter send and Shift+Enter newline.
/// Features left slot for actions, right slot for Send button, and optional token counter.
///
/// Example:
/// ```swift
/// SAIInputBar(
///     text: $inputText,
///     isSending: viewModel.isSending,
///     placeholder: "Ask anything...",
///     onSend: { viewModel.send() }
/// )
/// ```
public struct SAIInputBar: View {
    
    @Binding private var text: String
    private let isSending: Bool
    private let placeholder: String
    private let showTokenCount: Bool
    private let onSend: () -> Void
    
    @FocusState private var internalFocus: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    private let minHeight: CGFloat = 44
    private let maxHeight: CGFloat = 132 // ~6 lines
    private let externalFocus: FocusState<Bool>.Binding?
    
    public init(
        text: Binding<String>,
        isSending: Bool = false,
        placeholder: String = "Type a message...",
        showTokenCount: Bool = false,
        focusState: FocusState<Bool>.Binding? = nil,
        onSend: @escaping () -> Void
    ) {
        self._text = text
        self.isSending = isSending
        self.placeholder = placeholder
        self.showTokenCount = showTokenCount
        self.externalFocus = focusState
        self.onSend = onSend
    }
    
    private var isFocused: Bool {
        externalFocus?.wrappedValue ?? internalFocus
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            if showTokenCount {
                tokenCounter
            }
            
            HStack(alignment: .bottom, spacing: DSSpacing.md) {
                // Text input
                ZStack(alignment: .topLeading) {
                    if text.isEmpty {
                        Text(placeholder)
                            .font(DSTypography.body)
                            .foregroundStyle(DSColors.textSecondary.opacity(0.5))
                            .padding(.horizontal, DSSpacing.md)
                            .padding(.vertical, DSSpacing.sm)
                    }
                    
                    TextEditor(text: $text)
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textPrimary)
                        .scrollContentBackground(.hidden)
                        .frame(minHeight: minHeight, maxHeight: maxHeight)
                        .padding(.horizontal, DSSpacing.sm)
                        .padding(.vertical, DSSpacing.xs)
                        .focused(externalFocus ?? $internalFocus)
                        .onSubmit(handleSubmit)
                }
                .background(DSColors.surface)
                .clipShape(.rect(cornerRadius: DSRadius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: DSRadius.md)
                        .strokeBorder(
                            isFocused ? DSColors.accentPrimary.opacity(0.5) : DSColors.borderHairline,
                            lineWidth: 1
                        )
                )
                .animation(SAIMotion.quick, value: isFocused)
                
                // Send button
                sendButton
            }
            .padding(DSSpacing.md)
            .background(DSColors.background)
        }
    }
    
    // MARK: - Send Button
    
    private var sendButton: some View {
        Button(action: handleSend) {
            Group {
                if isSending {
                    ProgressView()
                        .tint(DSColors.background)
                } else {
                    Image(systemName: "arrow.up")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(DSColors.background)
                }
            }
            .frame(width: 36, height: 36)
            .accessibilityLabel("Send message")
            .background {
                if canSend {
                    DSGradient.primaryLinear
                } else {
                    DSColors.textSecondary.opacity(0.3)
                }
            }
            .clipShape(Circle())
        }
        .disabled(!canSend)
        .animation(SAIMotion.quick, value: canSend)
    }
    
    // MARK: - Token Counter
    
    private var tokenCounter: some View {
        HStack {
            Spacer()
            Text("\(estimatedTokens) tokens")
                .font(DSTypography.caption)
                .foregroundStyle(DSColors.textSecondary)
        }
        .padding(.horizontal, DSSpacing.lg)
        .padding(.vertical, DSSpacing.xs)
    }
    
    // MARK: - Helpers
    
    private var canSend: Bool {
        !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty && !isSending
    }
    
    private var estimatedTokens: Int {
        // Rough estimate: ~4 characters per token
        max(1, text.count / 4)
    }
    
    private func handleSend() {
        guard canSend else { return }
        Haptics.tap()
        onSend()
    }
    
    private func handleSubmit() {
        // Submit is triggered by Cmd+Enter or Return
        handleSend()
    }
}

// MARK: - Previews

#Preview("Input Bar States") {
    @Previewable @State var emptyText = ""
    @Previewable @State var shortText = "Hello!"
    @Previewable @State var longText = "This is a much longer message that spans multiple lines to demonstrate the expanding behavior of the input bar component."
    
    return VStack(spacing: DSSpacing.xl) {
        SAIInputBar(text: $emptyText, placeholder: "Empty state...") {}
        
        SAIInputBar(text: $shortText, placeholder: "Short text...") {}
        
        SAIInputBar(text: $longText, placeholder: "Long text...") {}
        
        SAIInputBar(text: $shortText, isSending: true, placeholder: "Sending...") {}
        
        SAIInputBar(text: $shortText, showTokenCount: true) {}
    }
    .background(DSColors.background)
}

#Preview("Input Bar Dark Mode") {
    @Previewable @State var text = "Hello, world!"
    
    return VStack {
        Spacer()
        SAIInputBar(text: $text, showTokenCount: true) {
            print("Send tapped")
        }
    }
    .background(DSColors.background)
    .preferredColorScheme(.dark)
}

#Preview("Input Bar Interactive") {
    @Previewable @State var text = ""
    @Previewable @State var messages: [String] = []
    
    return VStack {
        ScrollView {
            VStack(alignment: .leading, spacing: DSSpacing.md) {
                ForEach(messages, id: \.self) { message in
                    Text(message)
                        .padding(DSSpacing.md)
                        .background(DSColors.surface)
                        .clipShape(.rect(cornerRadius: DSRadius.md))
                }
            }
            .padding(DSSpacing.lg)
        }
        
        Spacer()
        
        SAIInputBar(text: $text, placeholder: "Type a message...") {
            if !text.isEmpty {
                messages.append(text)
                text = ""
            }
        }
    }
    .background(DSColors.background)
}

