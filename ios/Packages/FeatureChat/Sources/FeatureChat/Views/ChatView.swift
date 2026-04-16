import SwiftUI
import DesignSystem
import Core

/// Main chat interface view
/// Implements WhatsApp-style chat with auto-scroll and keyboard handling
public struct ChatView: View {
    
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
            
            // Input bar
            inputBarView
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
                LazyVStack(spacing: DSSpacing.md, pinnedViews: []) {
                    // Messages in reverse order (newest at bottom)
                    ForEach(Array(viewModel.messages.reversed().enumerated()), id: \.element.id) { index, message in
                        MessageRow(message: message)
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
                .padding(DSSpacing.lg)
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
    
    private var inputBarView: some View {
        SAIInputBar(
            text: $viewModel.inputText,
            isSending: viewModel.isSending,
            placeholder: "Message",
            showTokenCount: false,
            focusState: $isInputFocused
        ) {
            sendMessage()
        }
    }
    
    // MARK: - Helpers
    
    private var canSendMessage: Bool {
        !viewModel.isSending && !viewModel.inputText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
    }
    
    private func sendMessage() {
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

