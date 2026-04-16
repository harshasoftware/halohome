import SwiftUI
import CartoStorage
import Core

@available(iOS 17.0, *)
@MainActor
@Observable
public final class ChatHistoryViewModel {
    
    var conversations: [ConversationDTO] = []
    var isLoading = false
    
    private let conversationRepository: ConversationRepository
    private let makeChatViewClosure: (UUID, ChatUIStyle) -> AnyView
    
    public init(
        conversationRepository: ConversationRepository,
        makeChatView: @escaping (UUID, ChatUIStyle) -> AnyView
    ) {
        self.conversationRepository = conversationRepository
        self.makeChatViewClosure = makeChatView
    }
    
    public func loadConversations() async {
        isLoading = true
        defer { isLoading = false }
        
        do {
            conversations = try await conversationRepository.list(limit: 100, after: nil)
            AppLogger.debug("Loaded \(self.conversations.count) conversations", category: AppLogger.ui)
        } catch {
            AppLogger.error("Failed to load conversations: \(error)", category: AppLogger.ui)
        }
    }
    
    @discardableResult
    public func createNewConversation() async -> ConversationDTO? {
        do {
            let newConversation = try await conversationRepository.create(title: "New Chat", personaName: nil)
            await loadConversations()
            AppLogger.info("Created new conversation: \(newConversation.id)", category: AppLogger.ui)
            return newConversation
        } catch {
            AppLogger.error("Failed to create conversation: \(error)", category: AppLogger.ui)
            return nil
        }
    }
    
    public func deleteConversation(id: UUID) async {
        do {
            try await conversationRepository.delete(id: id)
            await loadConversations()
            AppLogger.info("Deleted conversation: \(id)", category: AppLogger.ui)
        } catch {
            AppLogger.error("Failed to delete conversation: \(error)", category: AppLogger.ui)
        }
    }
    
    public func renameConversation(id: UUID, newTitle: String) async {
        do {
            try await conversationRepository.rename(id: id, title: newTitle)
            await loadConversations()
            AppLogger.info("Renamed conversation: \(id)", category: AppLogger.ui)
        } catch {
            AppLogger.error("Failed to rename conversation: \(id)", category: AppLogger.ui)
        }
    }
    
    public func makeChatView(conversationID: UUID, style: ChatUIStyle) -> AnyView {
        makeChatViewClosure(conversationID, style)
    }
}

