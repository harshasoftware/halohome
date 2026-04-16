import Foundation
import SwiftData
import Core

/// Cursor for message pagination
public struct MessageCursor: Sendable, Equatable {
    public let createdAt: Date?
    public let id: UUID?
    
    public init(createdAt: Date? = nil, id: UUID? = nil) {
        self.createdAt = createdAt
        self.id = id
    }
}

/// Protocol for managing message persistence
public protocol MessageRepository: Sendable {
    func append(conversationID: UUID, role: MessageDTO.Role, text: String, createdAt: Date) async throws -> MessageDTO
    func page(conversationID: UUID, after: MessageCursor?, limit: Int) async throws -> (items: [MessageDTO], next: MessageCursor?)
    func deleteAll(in conversationID: UUID) async throws
    func batchDelete(messageIDs: [UUID]) async throws
}

/// Internal implementation using SwiftData
@available(iOS 17.0, macOS 14.0, *)
@MainActor
public final class MessageRepositoryImpl: MessageRepository {
    private let modelContext: ModelContext
    
    public init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }
    
    public func append(conversationID: UUID, role: MessageDTO.Role, text: String, createdAt: Date) async throws -> MessageDTO {
        // Validate text is not empty
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            AppLogger.error("Attempted to append empty message", category: AppLogger.storage)
            throw StorageError.validation("Message cannot be empty")
        }
        
        // Find conversation
        let descriptor = FetchDescriptor<Conversation>(
            predicate: #Predicate { $0.id == conversationID }
        )
        
        guard let conversation = try modelContext.fetch(descriptor).first else {
            AppLogger.error("Conversation not found for message append: \(conversationID)", category: AppLogger.storage)
            throw StorageError.notFound
        }
        
        // Create and append message
        let message = Message(
            role: role.rawValue,
            text: text,
            createdAt: createdAt,
            conversation: conversation
        )
        
        modelContext.insert(message)
        conversation.messages.append(message)
        conversation.updatedAt = Date()
        
        do {
            try modelContext.save()
            AppLogger.debug("Appended message to conversation \(conversationID)", category: AppLogger.storage)
            return MessageDTO(message, conversationID: conversationID)
        } catch {
            AppLogger.error("Failed to append message: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func page(conversationID: UUID, after: MessageCursor?, limit: Int) async throws -> (items: [MessageDTO], next: MessageCursor?) {
        // Build fetch descriptor with sorting by createdAt descending (newest first)
        var descriptor = FetchDescriptor<Message>(
            predicate: #Predicate { message in
                message.conversation?.id == conversationID
            },
            sortBy: [
                SortDescriptor(\.createdAt, order: .reverse),
                SortDescriptor(\.id, order: .reverse)
            ]
        )
        descriptor.fetchLimit = limit + 1 // Fetch one extra to determine if there's more
        
        // Apply cursor-based pagination
        if let cursor = after, let cursorDate = cursor.createdAt, let cursorID = cursor.id {
            descriptor.predicate = #Predicate { message in
                message.conversation?.id == conversationID &&
                (message.createdAt < cursorDate ||
                 (message.createdAt == cursorDate && message.id < cursorID))
            }
        }
        
        do {
            let messages = try modelContext.fetch(descriptor)
            
            // Determine next cursor
            let hasMore = messages.count > limit
            let items = Array(messages.prefix(limit))
            let nextCursor: MessageCursor? = hasMore && !items.isEmpty ?
                MessageCursor(createdAt: items.last?.createdAt, id: items.last?.id) : nil
            
            AppLogger.debug("Fetched \(items.count) messages for conversation \(conversationID)", category: AppLogger.storage)
            
            return (
                items: items.map { MessageDTO($0, conversationID: conversationID) },
                next: nextCursor
            )
        } catch {
            AppLogger.error("Failed to page messages: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func deleteAll(in conversationID: UUID) async throws {
        // Find conversation first to update its timestamp
        let conversationDescriptor = FetchDescriptor<Conversation>(
            predicate: #Predicate { $0.id == conversationID }
        )
        
        guard let conversation = try modelContext.fetch(conversationDescriptor).first else {
            AppLogger.error("Conversation not found for message deletion: \(conversationID)", category: AppLogger.storage)
            throw StorageError.notFound
        }
        
        let messageDescriptor = FetchDescriptor<Message>(
            predicate: #Predicate { message in
                message.conversation?.id == conversationID
            }
        )
        
        do {
            let messages = try modelContext.fetch(messageDescriptor)
            for message in messages {
                modelContext.delete(message)
            }
            
            // Update conversation's updatedAt timestamp
            conversation.updatedAt = Date()
            
            try modelContext.save()
            AppLogger.debug("Deleted \(messages.count) messages from conversation \(conversationID)", category: AppLogger.storage)
        } catch {
            AppLogger.error("Failed to delete messages: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func batchDelete(messageIDs: [UUID]) async throws {
        guard !messageIDs.isEmpty else { return }
        
        // Use #Predicate with IN operator for efficient batch delete
        let descriptor = FetchDescriptor<Message>(
            predicate: #Predicate { message in
                messageIDs.contains(message.id)
            }
        )
        
        do {
            let messages = try modelContext.fetch(descriptor)
            
            // Delete all matching messages
            for message in messages {
                modelContext.delete(message)
            }
            
            try modelContext.save()
            AppLogger.debug("Batch deleted \(messages.count) messages", category: AppLogger.storage)
        } catch {
            AppLogger.error("Failed to batch delete messages: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
}
