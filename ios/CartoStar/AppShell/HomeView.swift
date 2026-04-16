import SwiftUI
import DesignSystem
import CartoStorage
import Core

/// Home screen with hero section, featured carousel, and quick actions
/// Provides a modern, polished landing page for authenticated users
struct HomeView: View {
    
    @State private var viewModel: HomeViewModel
    
    // Callbacks for navigation
    let onNewChat: () -> Void
    let onShowHistory: () -> Void
    let onShowUpgrade: () -> Void
    let onShowSettings: () -> Void
    let onSelectConversation: (UUID) -> Void
    
    init(
        viewModel: HomeViewModel,
        onNewChat: @escaping () -> Void,
        onShowHistory: @escaping () -> Void,
        onShowUpgrade: @escaping () -> Void,
        onShowSettings: @escaping () -> Void,
        onSelectConversation: @escaping (UUID) -> Void
    ) {
        self.viewModel = viewModel
        self.onNewChat = onNewChat
        self.onShowHistory = onShowHistory
        self.onShowUpgrade = onShowUpgrade
        self.onShowSettings = onShowSettings
        self.onSelectConversation = onSelectConversation
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 0) {
                    // Hero Section
                    heroSection
                        .padding(.bottom, DSSpacing.xl)
                    
                    // Quick Actions Grid
                    quickActionsSection
                        .padding(.bottom, DSSpacing.xl)
                    
                    // Featured Content Carousel
                    featuredSection
                        .padding(.bottom, DSSpacing.xl)
                    
                    // Recent Activity
                    if !viewModel.recentConversations.isEmpty {
                        recentActivitySection
                    }
                }
                .padding(.top, DSSpacing.lg)
                .padding(.bottom, DSSpacing.xl)
            }
            .background(DSColors.background)
            .safeAreaInset(edge: .bottom) {
                Color.clear.frame(height: 88)
            }
            .refreshable {
                await viewModel.refresh()
            }
            .task {
                await viewModel.loadData()
            }
            .navigationTitle("Home")
            .navigationBarTitleDisplayMode(.large)
        }
    }
    
    // MARK: - Hero Section
    
    private var heroSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.sm) {
            Text(welcomeMessage)
                .font(DSTypography.titleXL)
                .foregroundStyle(DSColors.textPrimary)
            
            Text(viewModel.content.welcomeSubtitle)
                .font(DSTypography.body)
                .foregroundStyle(DSColors.textSecondary)
        }
        .padding(.horizontal, DSSpacing.lg)
    }
    
    private var welcomeMessage: String {
        if let userName = viewModel.userName, !userName.isEmpty {
            return "Welcome, \(userName)"
        }
        return viewModel.content.welcomeTitle
    }
    
    // MARK: - Quick Actions
    
    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            DSSectionHeader(title: "Quick Actions")
                .padding(.bottom, DSSpacing.xs)
            
            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible())
            ], spacing: DSSpacing.md) {
                ForEach(viewModel.content.quickActions) { action in
                    QuickActionCard(action: action) {
                        handleQuickAction(action.action)
                    }
                }
            }
            .padding(.horizontal, DSSpacing.lg)
            .padding(.top, DSSpacing.md)
        }
    }
    
    // MARK: - Featured Content
    
    private var featuredSection: some View {
        VStack(alignment: .leading, spacing: 0) {
            DSSectionHeader(title: "Featured")
                .padding(.bottom, DSSpacing.xs)
            
            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: DSSpacing.lg) {
                    ForEach(viewModel.content.featuredItems) { item in
                        FeatureCard(item: item)
                    }
                }
                .padding(.horizontal, DSSpacing.lg)
                .padding(.vertical, DSSpacing.md) // Increased padding for soft shadow breathing room
            }
            .padding(.top, DSSpacing.md)
        }
    }
    
    // MARK: - Recent Activity
    
    private var recentActivitySection: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Section header with trailing action
            HStack(alignment: .center) {
                DSSectionHeader(title: "Recent Chats", showDivider: false)
                
                Spacer()
                
                Button {
                    onShowHistory()
                } label: {
                    Text("See All")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.accentPrimary)
                }
                .padding(.horizontal, DSSpacing.lg)
            }
            .padding(.bottom, DSSpacing.xs)
            
            // Divider with proper color
            Rectangle()
                .fill(DSColors.borderSubtle)
                .frame(height: 1)
                .padding(.horizontal, DSSpacing.lg)
            
            // Recent conversations list with increased spacing
            VStack(spacing: DSSpacing.md) {
                ForEach(viewModel.recentConversations) { conversation in
                    Button {
                        onSelectConversation(conversation.id)
                    } label: {
                        recentConversationRow(conversation)
                    }
                    .buttonStyle(.plain)
                }
            }
            .padding(.horizontal, DSSpacing.lg)
            .padding(.top, DSSpacing.md)
        }
    }
    
    private func recentConversationRow(_ conversation: ConversationDTO) -> some View {
        // Apply shadow to outer wrapper to prevent clipping
        HStack(spacing: DSSpacing.md) {
            Image(systemName: "message.fill")
                .font(.title3)
                .foregroundStyle(DSColors.accentPrimary)
                .frame(width: 40, height: 40)
                .background(DSColors.accentPrimary.opacity(0.12))
                .clipShape(RoundedRectangle(cornerRadius: DSRadius.sm))
            
            VStack(alignment: .leading, spacing: 4) {
                Text(conversation.title)
                    .font(DSTypography.body)
                    .fontWeight(.medium)
                    .foregroundStyle(DSColors.textPrimary)
                    .lineLimit(1)
                
                Text(conversation.updatedAt, style: .relative)
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.textSecondary)
            }
            
            Spacer()
            
            Image(systemName: "chevron.right")
                .font(.caption)
                .foregroundStyle(DSColors.textSecondary)
        }
        .padding(.horizontal, DSSpacing.md)
        .padding(.vertical, DSSpacing.md + 2) // Slightly more vertical padding for breathing room
        .background(
            // Inner container with background and corner radius
            RoundedRectangle(cornerRadius: DSRadius.md)
                .fill(DSColors.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: DSRadius.md)
                        .strokeBorder(DSColors.borderHairline, lineWidth: 1)
                )
        )
        .elevation(DSElevation.level1) // Outer shadow applied here (not clipped)
    }
    
    // MARK: - Actions
    
    private func handleQuickAction(_ actionType: HomeContent.QuickAction.ActionType) {
        viewModel.handleQuickAction(actionType)
        
        switch actionType {
        case .newChat:
            onNewChat()
        case .history:
            onShowHistory()
        case .upgrade:
            onShowUpgrade()
        case .settings:
            onShowSettings()
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    if #available(iOS 17.0, *) {
        let viewModel = HomeViewModel(
            conversationRepository: PreviewMocks.MockConversationRepository()
        )
        
        return HomeView(
            viewModel: viewModel,
            onNewChat: { print("New Chat") },
            onShowHistory: { print("History") },
            onShowUpgrade: { print("Upgrade") },
            onShowSettings: { print("Settings") },
            onSelectConversation: { id in print("Selected: \(id)") }
        )
    } else {
        return Text("iOS 17+ required")
    }
}
#endif

