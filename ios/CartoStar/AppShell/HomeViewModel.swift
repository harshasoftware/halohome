import Foundation
import SwiftUI
import CartoStorage
import Core

/// Home screen view model
/// Manages home screen state, content loading, and user interactions
@MainActor
@Observable
public final class HomeViewModel {
    
    // MARK: - State
    
    var content: HomeContent
    var recentConversations: [ConversationDTO] = []
    var isLoading = false
    var errorMessage: String?
    var userName: String?
    
    // MARK: - Dependencies
    
    private let conversationRepository: ConversationRepository
    
    // MARK: - Initialization
    
    public init(
        conversationRepository: ConversationRepository,
        content: HomeContent = HomeContent()
    ) {
        self.conversationRepository = conversationRepository
        self.content = content
    }
    
    // MARK: - Public Methods
    
    /// Load home screen data
    public func loadData() async {
        isLoading = true
        errorMessage = nil
        
        defer { isLoading = false }
        
        do {
            // Load recent conversations
            let conversations = try await conversationRepository.list(limit: 3, after: nil)
            recentConversations = conversations
            
            AppLogger.debug("Loaded \(conversations.count) recent conversations", category: AppLogger.ui)
        } catch {
            errorMessage = "Failed to load recent activity"
            AppLogger.error("Failed to load home data: \(error)", category: AppLogger.ui)
        }
    }
    
    /// Refresh home screen data (pull-to-refresh)
    public func refresh() async {
        await loadData()
    }
    
    /// Set user name for welcome message
    public func setUserName(_ name: String?) {
        userName = name
    }
    
    // MARK: - Quick Actions
    
    /// Handle quick action tap
    public func handleQuickAction(_ actionType: HomeContent.QuickAction.ActionType) {
        AppLogger.info("Quick action tapped: \(actionType)", category: AppLogger.ui)
        // Actions will be handled by the view via closures/navigation
    }
}

