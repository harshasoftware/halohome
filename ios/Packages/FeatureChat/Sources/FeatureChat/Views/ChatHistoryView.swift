import SwiftUI
import SwiftData
import CartoStorage
import DesignSystem
import Core

/// Chat history screen with premium launcher cards and conversation list
@available(iOS 17.0, *)
public struct ChatHistoryView: View {
    
    @State private var viewModel: ChatHistoryViewModel
    @State private var searchText = ""
    @State private var navigationPath = NavigationPath()
    @State private var isSearching = false
    @FocusState private var isSearchFocused: Bool
    @State private var renamingConversation: UUID?
    @State private var deletingConversation: UUID?
    @State private var renameText: String = ""
    
    // Design constants
    private let cornerRadius: CGFloat = 18
    private let strokeWidth: CGFloat = 1
    
    public init(viewModel: ChatHistoryViewModel) {
        self.viewModel = viewModel
    }
    
    public var body: some View {
        NavigationStack(path: $navigationPath) {
            List {
                // Launcher Cards Section
                Section {
                    launcherCardsRow
                        .listRowSeparator(.hidden)
                        .listRowInsets(EdgeInsets(top: DSSpacing.md, leading: DSSpacing.lg, bottom: DSSpacing.sm, trailing: DSSpacing.lg))
                        .listRowBackground(Color.clear)
                }
                
                // Search Bar Section
                Section {
                    ChatSearchBar(
                        searchText: $searchText,
                        isSearchFocused: $isSearchFocused,
                        cornerRadius: cornerRadius,
                        strokeWidth: strokeWidth,
                        onSearchChange: handleSearchChange
                    )
                    .listRowSeparator(.hidden)
                    .listRowInsets(EdgeInsets(top: DSSpacing.sm, leading: DSSpacing.lg, bottom: DSSpacing.sm, trailing: DSSpacing.lg))
                    .listRowBackground(Color.clear)
                }
                
                // Conversations Section
                Section {
                    // Search micro-feedback
                    if isSearching && !filteredConversations.isEmpty {
                        HStack {
                            ProgressView()
                                .scaleEffect(0.8)
                            Text("Searching…")
                                .font(.caption)
                                .foregroundStyle(DSColors.textSecondary)
                        }
                        .padding(.vertical, DSSpacing.xs)
                        .listRowSeparator(.hidden)
                        .listRowBackground(Color.clear)
                        .listRowInsets(EdgeInsets(top: 0, leading: DSSpacing.lg, bottom: 0, trailing: DSSpacing.lg))
                    }
                    
                    // Conversation List or Empty States
                    conversationListContent
                }
            }
            .listStyle(.plain)
            .scrollContentBackground(.hidden)
            .background(DSColors.background.ignoresSafeArea())
            .scrollDismissesKeyboard(.interactively)
            .refreshable {
                await viewModel.loadConversations()
            }
            .navigationTitle("Chats")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        Haptics.tap()
                        Task { await viewModel.createNewConversation() }
                    } label: {
                        ZStack {
                            Circle()
                                .fill(DSColors.surface.opacity(0.8))
                                .frame(width: 36, height: 36)
                                .overlay(
                                    Circle()
                                        .strokeBorder(DSColors.borderSubtle.opacity(0.3), lineWidth: 0.5)
                                )
                            
                            Image(systemName: "square.and.pencil")
                                .font(.system(size: 17, weight: .medium))
                                .foregroundStyle(DSColors.accentPrimary)
                        }
                    }
                }
            }
            .task {
                await viewModel.loadConversations()
            }
            .navigationDestination(for: NavigationDestination.self) { destination in
                switch destination {
                case .chat(let conversationID, let style):
                    viewModel.makeChatView(conversationID: conversationID, style: style)
                }
            }
            .toastContainer()
            .alert("Rename Conversation", isPresented: Binding(
                get: { renamingConversation != nil },
                set: { if !$0 { renamingConversation = nil } }
            )) {
                TextField("Conversation name", text: $renameText)
                Button("Cancel", role: .cancel) {
                    renamingConversation = nil
                    renameText = ""
                }
                Button("Rename") {
                    if let id = renamingConversation {
                        Task {
                            await viewModel.renameConversation(id: id, newTitle: renameText)
                            renamingConversation = nil
                            renameText = ""
                        }
                    }
                }
            } message: {
                Text("Enter a new name for this conversation")
            }
            .confirmationDialog(
                "Delete this conversation?",
                isPresented: Binding(
                    get: { deletingConversation != nil },
                    set: { if !$0 { deletingConversation = nil } }
                ),
                titleVisibility: .visible
            ) {
                Button("Delete", role: .destructive) {
                    if let id = deletingConversation {
                        Task {
                            await viewModel.deleteConversation(id: id)
                            deletingConversation = nil
                            ToastCenter.shared.show(ToastMessage(
                                title: "Conversation deleted",
                                message: nil,
                                style: .info,
                                duration: 2.0
                            ))
                        }
                    }
                }
                Button("Cancel", role: .cancel) {
                    deletingConversation = nil
                }
            } message: {
                Text("This action cannot be undone.")
            }
        }
    }
    
    // MARK: - Launcher Cards Row
    
    private var launcherCardsRow: some View {
        HStack(spacing: DSSpacing.md) {
            LauncherCard(
                title: "Bubble Chat",
                subtitle: "Classic messaging",
                icon: "ellipsis.bubble.fill",
                cornerRadius: cornerRadius
            ) {
                Haptics.tap()
                Task {
                    await startBubbleChat()
                }
            }
            
            LauncherCard(
                title: "Prompt Chat",
                subtitle: "Document style",
                icon: "text.alignleft",
                cornerRadius: cornerRadius
            ) {
                Haptics.tap()
                Task {
                    await startPromptChat()
                }
            }
        }
    }
    
    // MARK: - Conversation List Content
    
    @ViewBuilder
    private var conversationListContent: some View {
        if viewModel.conversations.isEmpty && searchText.isEmpty {
            EmptyStateView()
                .listRowSeparator(.hidden)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
        } else if filteredConversations.isEmpty && !searchText.isEmpty {
            NoResultsStateView(onClearSearch: clearSearch)
                .listRowSeparator(.hidden)
                .listRowBackground(Color.clear)
                .listRowInsets(EdgeInsets())
        } else {
            ForEach(filteredConversations) { conversation in
                ChatRowCard(
                    conversation: conversation,
                    cornerRadius: cornerRadius,
                    strokeWidth: strokeWidth,
                    onTap: {
                        Haptics.tap()
                        navigationPath.append(NavigationDestination.chat(conversationID: conversation.id, style: .bubbles))
                    }
                )
                .listRowSeparator(.hidden)
                .listRowInsets(EdgeInsets(top: DSSpacing.xs, leading: DSSpacing.lg, bottom: DSSpacing.xs, trailing: DSSpacing.lg))
                .listRowBackground(Color.clear)
                .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                    Button(role: .destructive) {
                        deletingConversation = conversation.id
                    } label: {
                        Label("Delete", systemImage: "trash")
                    }
                }
                .swipeActions(edge: .leading, allowsFullSwipe: false) {
                    Button {
                        Haptics.tap()
                        renamingConversation = conversation.id
                        renameText = conversation.title
                    } label: {
                        Label("Rename", systemImage: "pencil")
                    }
                    .tint(.blue)
                }
            }
        }
    }
    
    // MARK: - Helpers
    
    private func handleSearchChange(_ newValue: String) {
        // Debounced search feel
        isSearching = !newValue.isEmpty
        Task {
            try? await Task.sleep(nanoseconds: 150_000_000) // 150ms
            isSearching = false
        }
    }
    
    private func clearSearch() {
        searchText = ""
        isSearchFocused = false
    }
    
    private var filteredConversations: [ConversationDTO] {
        if searchText.isEmpty {
            return viewModel.conversations
        }
        return viewModel.conversations.filter { conversation in
            conversation.title.localizedCaseInsensitiveContains(searchText) ||
            (conversation.personaName?.localizedCaseInsensitiveContains(searchText) ?? false)
        }
    }
    
    private func startBubbleChat() async {
        let newConversation = await viewModel.createNewConversation()
        guard let conversationID = newConversation?.id else { return }
        
        Haptics.success()
        navigationPath.append(NavigationDestination.chat(conversationID: conversationID, style: .bubbles))
    }
    
    private func startPromptChat() async {
        let newConversation = await viewModel.createNewConversation()
        guard let conversationID = newConversation?.id else { return }
        
        Haptics.success()
        navigationPath.append(NavigationDestination.chat(conversationID: conversationID, style: .centered))
    }
}

// MARK: - Navigation Destination

enum NavigationDestination: Hashable {
    case chat(conversationID: UUID, style: ChatUIStyle)
}
