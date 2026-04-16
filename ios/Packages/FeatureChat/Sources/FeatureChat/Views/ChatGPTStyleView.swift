import SwiftUI
import DesignSystem
import Core
import CartoStorage

/// ChatGPT-style chat interface with centered prompt and full-width responses
/// Uses the same ChatViewModel as bubble chat - only UI differs
public struct ChatGPTStyleView: View {
    
    @State private var viewModel: ChatViewModel
    @FocusState private var isInputFocused: Bool
    @Namespace private var bottomID
    public var onRequireSubscription: (() -> Void)? = nil
    
    public init(viewModel: ChatViewModel, onRequireSubscription: (() -> Void)? = nil) {
        self.viewModel = viewModel
        self.onRequireSubscription = onRequireSubscription
    }
    
    public var body: some View {
        VStack(spacing: 0) {
            // Message list
            messageListView
            
            // Prompt input area
            promptInputView
        }
        .toastContainer()
        .task {
            await viewModel.appear()
        }
        .onChange(of: DeepLinkBus.shared.latest) { _, deepLink in
            if let deepLink = deepLink {
                viewModel.handleDeepLink(deepLink)
                DeepLinkBus.shared.clear()
            }
        }
    }
    
    // MARK: - Subviews
    
    private var messageListView: some View {
        ScrollViewReader { scrollProxy in
            ScrollView {
                VStack(spacing: DSSpacing.xl) {
                    // Empty state
                    if viewModel.messages.isEmpty {
                        emptyStateView
                    }
                    
                    // Messages in reverse order (newest at bottom)
                    ForEach(Array(viewModel.messages.reversed().enumerated()), id: \.element.id) { index, message in
                        centeredMessageView(message: message)
                            .id(message.id)
                            .onAppear {
                                // Trigger pagination when needed
                                let actualIndex = viewModel.messages.count - 1 - index
                                viewModel.loadMoreIfNeeded(currentIndex: actualIndex)
                            }
                    }
                    
                    // Invisible anchor at the bottom for auto-scroll
                    Color.clear
                        .frame(height: 1)
                        .id(bottomID)
                }
                .padding(DSSpacing.xl)
            }
            .contentShape(Rectangle())
            .onTapGesture {
                isInputFocused = false
            }
            .onChange(of: viewModel.messages.count) { _, _ in
                scrollToBottom(proxy: scrollProxy, animated: true)
            }
            .onAppear {
                // Initial scroll to bottom
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                    scrollToBottom(proxy: scrollProxy, animated: false)
                }
            }
        }
    }
    
    private var emptyStateView: some View {
        VStack(spacing: DSSpacing.xl) {
            Spacer()
            
            ZStack {
                Circle()
                    .fill(DSGradient.primaryLinear)
                    .frame(width: 80, height: 80)
                
                Image(systemName: "sparkles")
                    .font(.system(size: 36, weight: .medium))
                    .foregroundStyle(DSColors.textPrimary)
            }
            
            VStack(spacing: DSSpacing.sm) {
                Text("How can I help you today?")
                    .font(DSTypography.titleL)
                    .foregroundStyle(DSColors.textPrimary)
                
                Text("Enter your prompt below to get started")
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textSecondary)
                    .multilineTextAlignment(.center)
            }
            
            Spacer()
        }
        .frame(maxWidth: .infinity)
    }
    
    @ViewBuilder
    private func centeredMessageView(message: ChatMessage) -> some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            // User prompt (if user message)
            if message.role == .user {
                VStack(alignment: .leading, spacing: DSSpacing.xs) {
                    Text("You")
                        .font(.caption.weight(.semibold))
                        .foregroundStyle(DSColors.textSecondary)
                        .textCase(.uppercase)
                    
                    Text(message.text)
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textPrimary)
                        .textSelection(.enabled)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(DSSpacing.lg)
                .background(DSColors.surfaceElevated)
                .clipShape(RoundedRectangle(cornerRadius: DSRadius.lg))
            }
            
            // Assistant response (if assistant message)
            if message.role == .assistant {
                VStack(alignment: .leading, spacing: DSSpacing.sm) {
                    HStack(spacing: DSSpacing.xs) {
                        ZStack {
                            Circle()
                                .fill(DSGradient.primaryLinear)
                                .frame(width: 20, height: 20)
                            
                            Image(systemName: "sparkles")
                                .font(.system(size: 10, weight: .semibold))
                                .foregroundStyle(DSColors.background)
                        }
                        
                        Text("Assistant")
                            .font(.caption.weight(.semibold))
                            .foregroundStyle(DSColors.textSecondary)
                            .textCase(.uppercase)
                        
                        if message.isStreaming {
                            ProgressView()
                                .scaleEffect(0.7)
                                .tint(DSColors.primary)
                        }
                    }
                    
                    if !message.text.isEmpty {
                        Text(message.text)
                            .font(DSTypography.body)
                            .foregroundStyle(DSColors.textPrimary)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .leading)
                    } else if message.isStreaming {
                        HStack(spacing: DSSpacing.xs) {
                            ForEach(0..<3) { index in
                                Circle()
                                    .fill(DSColors.textSecondary)
                                    .frame(width: 6, height: 6)
                                    .scaleEffect(message.isStreaming ? 1.0 : 0.5)
                                    .animation(
                                        .easeInOut(duration: 0.6)
                                        .repeatForever()
                                        .delay(Double(index) * 0.2),
                                        value: message.isStreaming
                                    )
                            }
                        }
                        .padding(.vertical, DSSpacing.sm)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
        .frame(maxWidth: DSLayout.readableMaxWidth)
        .frame(maxWidth: .infinity)
    }
    
    private var promptInputView: some View {
        VStack(spacing: 0) {
            Divider()
            
            VStack(spacing: DSSpacing.sm) {
                // Large text input area
                ZStack(alignment: .topLeading) {
                    if viewModel.inputText.isEmpty {
                        Text("Enter your prompt...")
                            .font(DSTypography.body)
                            .foregroundStyle(DSColors.textSecondary)
                            .padding(.horizontal, DSSpacing.md)
                            .padding(.vertical, DSSpacing.md)
                    }
                    
                    TextEditor(text: $viewModel.inputText)
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textPrimary)
                        .scrollContentBackground(.hidden)
                        .frame(minHeight: 60, maxHeight: 120)
                        .padding(.horizontal, DSSpacing.sm)
                        .padding(.vertical, DSSpacing.xs)
                        .focused($isInputFocused)
                        .disabled(viewModel.isSending)
                }
                .background(DSColors.surface)
                .clipShape(RoundedRectangle(cornerRadius: DSRadius.md))
                .overlay(
                    RoundedRectangle(cornerRadius: DSRadius.md)
                        .strokeBorder(
                            isInputFocused ? DSColors.primary : DSColors.borderHairline,
                            lineWidth: isInputFocused ? 2 : 1
                        )
                )
                
                // Send button
                HStack {
                    Spacer()
                    
                    SAIButton(
                        "Send",
                        style: .primary,
                        size: .lg,
                        icon: Image(systemName: viewModel.isSending ? "hourglass" : "paperplane.fill")
                    ) {
                        sendMessage()
                    }
                    .disabled(viewModel.inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || viewModel.isSending)
                }
            }
            .padding(DSSpacing.lg)
            .background(DSColors.background)
        }
    }
    
    // MARK: - Helpers
    
    private func sendMessage() {
        isInputFocused = false
        Task {
            await viewModel.send()
        }
    }
    
    private func scrollToBottom(proxy: ScrollViewProxy, animated: Bool) {
        if animated {
            withAnimation(.easeOut(duration: 0.3)) {
                proxy.scrollTo(bottomID, anchor: .bottom)
            }
        } else {
            proxy.scrollTo(bottomID, anchor: .bottom)
        }
    }
}

// MARK: - Previews

#if DEBUG
private final class PreviewMessageRepository: MessageRepository {
    func append(conversationID: UUID, role: MessageDTO.Role, text: String, createdAt: Date) async throws -> MessageDTO {
        MessageDTO(id: UUID(), role: role, text: text, createdAt: createdAt, conversationID: conversationID)
    }
    
    func page(conversationID: UUID, after: MessageCursor?, limit: Int) async throws -> (items: [MessageDTO], next: MessageCursor?) {
        (items: [], next: nil)
    }
    
    func deleteAll(in conversationID: UUID) async throws {}
    func batchDelete(messageIDs: [UUID]) async throws {}
}

private final class PreviewLLMClient: LLMClient {
    func streamResponse(messages: [LLMMessage]) -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream { continuation in
            Task {
                let response = "This is a preview response from the AI assistant showing how the centered layout looks with streaming text."
                for char in response {
                    try? await Task.sleep(nanoseconds: 20_000_000)
                    continuation.yield(String(char))
                }
                continuation.finish()
            }
        }
    }
}

#Preview("Empty State") {
    NavigationStack {
        ChatGPTStyleView(
            viewModel: ChatViewModel(
                conversationID: UUID(),
                messageRepository: PreviewMessageRepository(),
                llmClient: PreviewLLMClient()
            )
        )
        .navigationTitle("Prompt Chat")
        .navigationBarTitleDisplayMode(.inline)
    }
}

#Preview("With Messages") {
    @Previewable @State var vm = ChatViewModel(
        conversationID: UUID(),
        messageRepository: PreviewMessageRepository(),
        llmClient: PreviewLLMClient()
    )
    
    NavigationStack {
        ChatGPTStyleView(viewModel: vm)
            .navigationTitle("Prompt Chat")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                vm.messages = [
                    ChatMessage(role: .assistant, text: "Hello! I'm here to help. What would you like to know?", createdAt: Date().addingTimeInterval(-120)),
                    ChatMessage(role: .user, text: "Can you explain how SwiftUI's state management works?", createdAt: Date().addingTimeInterval(-60)),
                    ChatMessage(role: .assistant, text: "SwiftUI's state management is based on several property wrappers:\n\n• @State for local view state\n• @Binding for two-way connections\n• @StateObject for reference types\n• @ObservedObject for external objects\n\nEach serves a specific purpose in managing data flow.", createdAt: Date())
                ]
            }
    }
}
#endif

