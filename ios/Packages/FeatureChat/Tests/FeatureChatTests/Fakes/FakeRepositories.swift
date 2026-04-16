import Foundation
import CartoStorage
@testable import FeatureChat

/// In-memory message repository for testing
public final class FakeMessageRepository: MessageRepository, @unchecked Sendable {
    private var messages: [MessageDTO] = []
    private var shouldThrow = false
    
    public init() {}
    
    public func append(conversationID: UUID, role: MessageDTO.Role, text: String, createdAt: Date) async throws -> MessageDTO {
        if shouldThrow {
            throw StorageError.validation("Test error")
        }
        
        let message = MessageDTO(
            id: UUID(),
            role: role,
            text: text,
            createdAt: createdAt,
            conversationID: conversationID
        )
        
        messages.insert(message, at: 0) // Newest first
        return message
    }
    
    public func page(conversationID: UUID, after: MessageCursor?, limit: Int) async throws -> (items: [MessageDTO], next: MessageCursor?) {
        if shouldThrow {
            throw StorageError.underlying(NSError(domain: "Test", code: -1))
        }
        
        var filtered = messages
        
        // Apply cursor filtering
        if let cursor = after, let cursorDate = cursor.createdAt, let cursorID = cursor.id {
            filtered = messages.filter { msg in
                msg.createdAt < cursorDate || (msg.createdAt == cursorDate && msg.id < cursorID)
            }
        }
        
        let page = Array(filtered.prefix(limit))
        let hasMore = filtered.count > limit
        let nextCursor = hasMore && !page.isEmpty ? 
            MessageCursor(createdAt: page.last?.createdAt, id: page.last?.id) : nil
        
        return (items: page, next: nextCursor)
    }
    
    public func deleteAll(in conversationID: UUID) async throws {
        messages.removeAll()
    }
    
    public func batchDelete(messageIDs: [UUID]) async throws {
        messages.removeAll { messageIDs.contains($0.id) }
    }
    
    func reset() {
        messages.removeAll()
        shouldThrow = false
    }
}







