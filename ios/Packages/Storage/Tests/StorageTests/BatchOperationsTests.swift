import XCTest
import SwiftData
@testable import CartoStorage

@MainActor
final class BatchOperationsTests: XCTestCase {
    private var container: ModelContainer!
    private var conversationRepo: ConversationRepository!
    private var messageRepo: MessageRepository!
    private var testConversationID: UUID!
    
    override func setUp() async throws {
        try await super.setUp()
        container = try StorageModelContainer.make(inMemory: true)
        let context = container.mainContext
        conversationRepo = ConversationRepositoryImpl(modelContext: context)
        messageRepo = MessageRepositoryImpl(modelContext: context)
        
        let conversation = try await conversationRepo.create(title: "Test Chat", personaName: nil)
        testConversationID = conversation.id
    }
    
    override func tearDown() async throws {
        container = nil
        conversationRepo = nil
        messageRepo = nil
        testConversationID = nil
        try await super.tearDown()
    }
    
    func testBatchDeleteMessages() async throws {
        // Given - Create multiple messages
        var messageIDs: [UUID] = []
        for i in 1...10 {
            let message = try await messageRepo.append(
                conversationID: testConversationID,
                role: .user,
                text: "Message \\(i)",
                createdAt: Date()
            )
            messageIDs.append(message.id)
        }
        
        // Verify all messages exist
        let beforeDelete = try await messageRepo.page(
            conversationID: testConversationID,
            after: nil,
            limit: 20
        )
        XCTAssertEqual(beforeDelete.items.count, 10)
        
        // When - Batch delete first 5 messages
        let toDelete = Array(messageIDs.prefix(5))
        try await messageRepo.batchDelete(messageIDs: toDelete)
        
        // Then - Only 5 messages should remain
        let afterDelete = try await messageRepo.page(
            conversationID: testConversationID,
            after: nil,
            limit: 20
        )
        XCTAssertEqual(afterDelete.items.count, 5)
        
        // Verify the correct messages were deleted
        let remainingIDs = Set(afterDelete.items.map(\.id))
        for deletedID in toDelete {
            XCTAssertFalse(remainingIDs.contains(deletedID))
        }
    }
    
    func testBatchDeleteEmptyArray() async throws {
        // Given
        let emptyIDs: [UUID] = []
        
        // When/Then - Should not throw
        try await messageRepo.batchDelete(messageIDs: emptyIDs)
    }
    
    func testBackgroundContextRepositories() throws {
        // Given
        let container = try StorageModelContainer.make(inMemory: true)
        
        // When
        let backgroundRepos = StorageModelContainer.makeBackgroundRepositories(container: container)
        
        // Then
        XCTAssertNotNil(backgroundRepos.conversations)
        XCTAssertNotNil(backgroundRepos.messages)
        XCTAssertNotNil(backgroundRepos.settings)
    }
}
