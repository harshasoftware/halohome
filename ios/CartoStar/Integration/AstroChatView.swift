import SwiftUI
import DesignSystem
import FeatureChat

// MARK: - Astro Chat View

/// AI chat interface with astrocartography context.
/// Uses CopilotKit for context-aware responses with tool calls
/// that can interact with the globe (highlight lines, zoom, analyze).
@available(iOS 17.0, *)
struct AstroChatView: View {

    @State private var viewModel: AstroChatViewModel
    @FocusState private var isInputFocused: Bool
    @Namespace private var bottomID
    var onRequireSubscription: (() -> Void)?
    /// Called when a *subscribed* user hits their tier cap — routes to the upgrade paywall.
    var onRequireUpgrade: (() -> Void)?
    var isSubscribed: Bool

    init(
        viewModel: AstroChatViewModel,
        isSubscribed: Bool = true,
        onRequireSubscription: (() -> Void)? = nil,
        onRequireUpgrade: (() -> Void)? = nil
    ) {
        self.viewModel = viewModel
        self.isSubscribed = isSubscribed
        self.onRequireSubscription = onRequireSubscription
        self.onRequireUpgrade = onRequireUpgrade
    }

    var body: some View {
        VStack(spacing: 0) {
            // Message list
            messageListView

            // Tool call indicator
            if let toolCall = viewModel.activeToolCall {
                toolCallChip(toolCall)
            }

            // Error banner
            if let error = viewModel.errorMessage {
                errorBanner(error)
            }

            // Input bar
            inputBarView
        }
        .task {
            await viewModel.initialize()
        }
    }

    // MARK: - Message List

    private var messageListView: some View {
        ScrollViewReader { scrollProxy in
            ScrollView {
                LazyVStack(spacing: DSSpacing.md) {
                    // Welcome message
                    if viewModel.messages.isEmpty {
                        welcomeCard
                    }

                    // Messages (newest at bottom)
                    ForEach(Array(viewModel.messages.reversed().enumerated()), id: \.element.id) { _, message in
                        MessageRow(message: message)
                            .id(message.id)
                    }

                    // Scroll anchor
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
                withAnimation(.easeOut(duration: 0.3)) {
                    scrollProxy.scrollTo(bottomID, anchor: .bottom)
                }
            }
        }
    }

    // MARK: - Welcome Card

    private var welcomeCard: some View {
        VStack(spacing: 12) {
            Image(systemName: "sparkles")
                .font(.system(size: 36))
                .foregroundStyle(Color.acAccent)

            Text("Astro AI Assistant")
                .font(.title3)
                .fontWeight(.semibold)
                .foregroundStyle(Color.acGlassTextPrimary)

            Text("Ask about your astrocartography lines, best locations, planetary influences, and more.")
                .font(.subheadline)
                .foregroundStyle(Color.acGlassTextSecondary)
                .multilineTextAlignment(.center)

            VStack(alignment: .leading, spacing: 8) {
                suggestionButton("What are my best lines for career?")
                suggestionButton("Analyze my Sun MC line")
                suggestionButton("Where should I travel for love?")
            }
            .padding(.top, 8)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
    }

    private func suggestionButton(_ text: String) -> some View {
        Button {
            guard isSubscribed else {
                onRequireSubscription?()
                return
            }
            viewModel.inputText = text
            Task { await viewModel.send() }
        } label: {
            HStack {
                Image(systemName: "arrow.right.circle")
                    .font(.caption)
                Text(text)
                    .font(.subheadline)
                Spacer()
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 8)
            .background(Color.acGlass)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .foregroundStyle(Color.acForeground)
        }
    }

    // MARK: - Input Bar

    private var inputBarView: some View {
        SAIInputBar(
            text: $viewModel.inputText,
            isSending: viewModel.isSending,
            placeholder: "Ask about your astro lines...",
            showTokenCount: false,
            focusState: $isInputFocused
        ) {
            guard isSubscribed else {
                onRequireSubscription?()
                return
            }
            Task { await viewModel.send() }
        }
    }

    // MARK: - Tool Call Chip

    private func toolCallChip(_ text: String) -> some View {
        HStack(spacing: 6) {
            ProgressView()
                .scaleEffect(0.7)
                .tint(Color.acAccent)

            Text(text)
                .font(.caption)
                .foregroundStyle(Color.acAccent)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 6)
        .background(Color.acAccent.opacity(0.1))
        .clipShape(Capsule())
        .padding(.horizontal)
        .padding(.bottom, 4)
        .transition(.move(edge: .bottom).combined(with: .opacity))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Action in progress: \(text)")
        .accessibilityAddTraits(.updatesFrequently)
    }

    // MARK: - Error Banner

    private func errorBanner(_ message: String) -> some View {
        HStack {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.red)

            Text(message)
                .font(.caption)
                .foregroundStyle(Color.acForeground)

            Spacer()

            if message.contains("limit") {
                Button("Upgrade") {
                    if viewModel.isTierLimitError {
                        onRequireUpgrade?()
                    } else {
                        onRequireSubscription?()
                    }
                }
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(Color.acAccent)
            }
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(Color.red.opacity(0.1))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Error: \(message)")
    }

}
