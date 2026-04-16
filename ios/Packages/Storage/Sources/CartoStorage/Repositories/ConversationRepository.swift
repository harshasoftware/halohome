import Foundation
import SwiftData
import Core

/// Protocol for managing conversation persistence
public protocol ConversationRepository: Sendable {
    func create(title: String, personaName: String?) async throws -> ConversationDTO
    func rename(id: UUID, title: String) async throws
    func delete(id: UUID) async throws
    func list(limit: Int, after: Date?) async throws -> [ConversationDTO]
}

/// Internal implementation using SwiftData
@available(iOS 17.0, macOS 14.0, *)
@MainActor
public final class ConversationRepositoryImpl: ConversationRepository {
    private let modelContext: ModelContext
    
    public init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }
    
    public func create(title: String, personaName: String?) async throws -> ConversationDTO {
        return try await StorageRetry.withRetry {
            let conversation = Conversation(
                title: title,
                personaName: personaName
            )
            
            modelContext.insert(conversation)
            
            do {
                try modelContext.save()
                AppLogger.debug("Created conversation: \(conversation.id)", category: AppLogger.storage)
                return ConversationDTO(conversation)
            } catch {
                AppLogger.error("Failed to create conversation: \(error)", category: AppLogger.storage)
                throw StorageError.underlying(error)
            }
        }
    }
    
    public func rename(id: UUID, title: String) async throws {
        let descriptor = FetchDescriptor<Conversation>(
            predicate: #Predicate { $0.id == id }
        )
        
        guard let conversation = try modelContext.fetch(descriptor).first else {
            AppLogger.error("Conversation not found for rename: \(id)", category: AppLogger.storage)
            throw StorageError.notFound
        }
        
        conversation.title = title
        conversation.updatedAt = Date()
        
        do {
            try modelContext.save()
            AppLogger.debug("Renamed conversation \(id) to: \(title)", category: AppLogger.storage)
        } catch {
            AppLogger.error("Failed to rename conversation: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func delete(id: UUID) async throws {
        let descriptor = FetchDescriptor<Conversation>(
            predicate: #Predicate { $0.id == id }
        )
        
        guard let conversation = try modelContext.fetch(descriptor).first else {
            AppLogger.error("Conversation not found for deletion: \(id)", category: AppLogger.storage)
            throw StorageError.notFound
        }
        
        modelContext.delete(conversation)
        
        do {
            try modelContext.save()
            AppLogger.debug("Deleted conversation: \(id)", category: AppLogger.storage)
        } catch {
            AppLogger.error("Failed to delete conversation: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func list(limit: Int, after: Date?) async throws -> [ConversationDTO] {
        var descriptor = FetchDescriptor<Conversation>(
            sortBy: [SortDescriptor(\.updatedAt, order: .reverse)]
        )
        descriptor.fetchLimit = limit
        
        if let after = after {
            descriptor.predicate = #Predicate { $0.updatedAt < after }
        }
        
        do {
            let conversations = try modelContext.fetch(descriptor)
            AppLogger.debug("Fetched \(conversations.count) conversations", category: AppLogger.storage)
            return conversations.map(ConversationDTO.init)
        } catch {
            AppLogger.error("Failed to list conversations: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
}
