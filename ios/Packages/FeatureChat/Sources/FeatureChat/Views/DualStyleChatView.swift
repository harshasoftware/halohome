import SwiftUI
import DesignSystem
import Core
import CartoStorage

/// Container view that switches between bubble and centered chat UI styles
/// Both use the same ChatViewModel and persistence - only the UI differs
public struct DualStyleChatView: View {
    
    @State private var selectedStyle: ChatUIStyle = .centered
    @State private var viewModel: ChatViewModel
    @Namespace private var styleAnimation
    
    public var onRequireSubscription: (() -> Void)? = nil
    
    public init(
        viewModel: ChatViewModel,
        onRequireSubscription: (() -> Void)? = nil
    ) {
        self.viewModel = viewModel
        self.onRequireSubscription = onRequireSubscription
    }
    
    public var body: some View {
        chatContentView
            .navigationTitle("Chat")
            .navigationBarTitleDisplayMode(.inline)
    }
    
    // MARK: - Subviews
    
    @ViewBuilder
    private var chatContentView: some View {
        // Use the selected style without showing a switcher
        switch selectedStyle {
        case .bubbles:
            ChatView(
                viewModel: viewModel,
                onRequireSubscription: onRequireSubscription
            )
            
        case .centered:
            ChatGPTStyleView(
                viewModel: viewModel,
                onRequireSubscription: onRequireSubscription
            )
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
                let response = "This is a preview response."
                for char in response {
                    try? await Task.sleep(nanoseconds: 20_000_000)
                    continuation.yield(String(char))
                }
                continuation.finish()
            }
        }
    }
}

#Preview("Dual Style Chat") {
    NavigationStack {
        DualStyleChatView(
            viewModel: ChatViewModel(
                conversationID: UUID(),
                messageRepository: PreviewMessageRepository(),
                llmClient: PreviewLLMClient()
            )
        )
    }
}
#endif

