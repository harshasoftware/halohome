import XCTest
import SwiftData
@testable import CartoStorage

@MainActor
final class MessageRepositoryTests: XCTestCase {
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
        
        // Create a test conversation
        let conversation = try await conversationRepo.create(
            title: "Test Chat",
            personaName: nil
        )
        testConversationID = conversation.id
    }
    
    override func tearDown() async throws {
        container = nil
        conversationRepo = nil
        messageRepo = nil
        testConversationID = nil
        try await super.tearDown()
    }
    
    func testAppendMessage() async throws {
        // Given
        let text = "Hello, world!"
        let role = MessageDTO.Role.user
        let createdAt = Date()
        
        // When
        let message = try await messageRepo.append(
            conversationID: testConversationID,
            role: role,
            text: text,
            createdAt: createdAt
        )
        
        // Then
        XCTAssertEqual(message.text, text)
        XCTAssertEqual(message.role, role)
        XCTAssertEqual(message.conversationID, testConversationID)
        XCTAssertNotNil(message.id)
    }
    
    func testAppendEmptyMessageThrows() async throws {
        // Given
        let emptyText = "   "
        
        // When/Then
        do {
            _ = try await messageRepo.append(
                conversationID: testConversationID,
                role: .user,
                text: emptyText,
                createdAt: Date()
            )
            XCTFail("Should have thrown validation error")
        } catch let error as StorageError {
            if case .validation(let message) = error {
                XCTAssertEqual(message, "Message cannot be empty")
            } else {
                XCTFail("Wrong error type")
            }
        }
    }
    
    func testAppendToNonExistentConversationThrows() async throws {
        // Given
        let nonExistentID = UUID()
        
        // When/Then
        do {
            _ = try await messageRepo.append(
                conversationID: nonExistentID,
                role: .user,
                text: "Test",
                createdAt: Date()
            )
            XCTFail("Should have thrown notFound error")
        } catch let error as StorageError {
            XCTAssertEqual(error, .notFound)
        }
    }
    
    func testPageMessagesWithCursor() async throws {
        // Given - Create messages with different timestamps
        let baseDate = Date()
        let messages = [
            (role: MessageDTO.Role.user, text: "Message 1", createdAt: baseDate.addingTimeInterval(-60)),
            (role: MessageDTO.Role.assistant, text: "Message 2", createdAt: baseDate.addingTimeInterval(-50)),
            (role: MessageDTO.Role.user, text: "Message 3", createdAt: baseDate.addingTimeInterval(-40)),
            (role: MessageDTO.Role.assistant, text: "Message 4", createdAt: baseDate.addingTimeInterval(-30)),
            (role: MessageDTO.Role.user, text: "Message 5", createdAt: baseDate.addingTimeInterval(-20))
        ]
        
        var createdMessages: [MessageDTO] = []
        for msg in messages {
            let created = try await messageRepo.append(
                conversationID: testConversationID,
                role: msg.role,
                text: msg.text,
                createdAt: msg.createdAt
            )
            createdMessages.append(created)
        }
        
        // When - Get first page (newest first)
        let page1 = try await messageRepo.page(
            conversationID: testConversationID,
            after: nil,
            limit: 2
        )
        
        // Then
        XCTAssertEqual(page1.items.count, 2)
        XCTAssertEqual(page1.items[0].text, "Message 5") // Newest
        XCTAssertEqual(page1.items[1].text, "Message 4")
        XCTAssertNotNil(page1.next)
        
        // When - Get second page using cursor
        let page2 = try await messageRepo.page(
            conversationID: testConversationID,
            after: page1.next,
            limit: 2
        )
        
        // Then
        XCTAssertEqual(page2.items.count, 2)
        XCTAssertEqual(page2.items[0].text, "Message 3")
        XCTAssertEqual(page2.items[1].text, "Message 2")
        XCTAssertNotNil(page2.next)
        
        // When - Get last page
        let page3 = try await messageRepo.page(
            conversationID: testConversationID,
            after: page2.next,
            limit: 2
        )
        
        // Then
        XCTAssertEqual(page3.items.count, 1)
        XCTAssertEqual(page3.items[0].text, "Message 1")
        XCTAssertNil(page3.next) // No more pages
    }
    
    func testDeleteAllMessages() async throws {
        // Given - Add some messages
        for i in 1...3 {
            _ = try await messageRepo.append(
                conversationID: testConversationID,
                role: .user,
                text: "Message \(i)",
                createdAt: Date()
            )
        }
        
        // Verify messages exist
        let beforeDelete = try await messageRepo.page(
            conversationID: testConversationID,
            after: nil,
            limit: 10
        )
        XCTAssertEqual(beforeDelete.items.count, 3)
        
        // When
        try await messageRepo.deleteAll(in: testConversationID)
        
        // Then
        let afterDelete = try await messageRepo.page(
            conversationID: testConversationID,
            after: nil,
            limit: 10
        )
        XCTAssertTrue(afterDelete.items.isEmpty)
        XCTAssertNil(afterDelete.next)
    }
    
    func testDeleteAllUpdatesConversationTimestamp() async throws {
        // Given - Add messages and record initial conversation updatedAt
        let initialConversations = try await conversationRepo.list(limit: 1, after: nil)
        let initialUpdatedAt = initialConversations.first?.updatedAt
        XCTAssertNotNil(initialUpdatedAt)
        
        // Add messages
        for i in 1...3 {
            _ = try await messageRepo.append(
                conversationID: testConversationID,
                role: .user,
                text: "Message \(i)",
                createdAt: Date()
            )
        }
        
        // Small delay to ensure timestamp difference
        try await Task.sleep(nanoseconds: 100_000_000) // 100ms
        
        // When - Delete all messages
        try await messageRepo.deleteAll(in: testConversationID)
        
        // Then - Conversation's updatedAt should be newer
        let updatedConversations = try await conversationRepo.list(limit: 1, after: nil)
        let newUpdatedAt = updatedConversations.first?.updatedAt
        XCTAssertNotNil(newUpdatedAt)
        XCTAssertGreaterThan(newUpdatedAt!, initialUpdatedAt!)
    }
    
    func testDeterministicPaginationOrder() async throws {
        // Given - Messages with same timestamp but different IDs
        let sameTime = Date()
        let ids = [UUID(), UUID(), UUID()].sorted { $0.uuidString > $1.uuidString }
        
        for (index, id) in ids.enumerated() {
            let context = container.mainContext
            let conversation = try context.fetch(
                FetchDescriptor<Conversation>(predicate: #Predicate { $0.id == testConversationID })
            ).first!
            
            let message = Message(
                id: id,
                role: "user",
                text: "Message \(index)",
                createdAt: sameTime,
                conversation: conversation
            )
            context.insert(message)
        }
        try container.mainContext.save()
        
        // When
        let page = try await messageRepo.page(
            conversationID: testConversationID,
            after: nil,
            limit: 10
        )
        
        // Then - Should be ordered by ID when timestamps are equal
        XCTAssertEqual(page.items.count, 3)
        XCTAssertEqual(page.items[0].id, ids[0]) // Largest UUID first
        XCTAssertEqual(page.items[1].id, ids[1])
        XCTAssertEqual(page.items[2].id, ids[2])
    }
    
    func testPaginationWithIdenticalTimestampsAndLimit1() async throws {
        // Given - Multiple messages with same timestamp but different IDs
        let sameTime = Date()
        let ids = [UUID(), UUID(), UUID()].sorted { $0.uuidString > $1.uuidString }
        
        // Create messages with same timestamp
        for id in ids {
            let context = container.mainContext
            let conversation = try context.fetch(
                FetchDescriptor<Conversation>(predicate: #Predicate { $0.id == testConversationID })
            ).first!
            
            let message = Message(
                id: id,
                role: "user",
                text: "Message \(id.uuidString.prefix(8))",
                createdAt: sameTime,
                conversation: conversation
            )
            context.insert(message)
        }
        try container.mainContext.save()
        
        // When - Page with limit=1
        let page1 = try await messageRepo.page(
            conversationID: testConversationID,
            after: nil,
            limit: 1
        )
        
        // Then - Should get first ID (largest UUID)
        XCTAssertEqual(page1.items.count, 1)
        XCTAssertEqual(page1.items[0].id, ids[0])
        XCTAssertNotNil(page1.next)
        
        // When - Get second page
        let page2 = try await messageRepo.page(
            conversationID: testConversationID,
            after: page1.next,
            limit: 1
        )
        
        // Then - Should get second ID
        XCTAssertEqual(page2.items.count, 1)
        XCTAssertEqual(page2.items[0].id, ids[1])
        XCTAssertNotNil(page2.next)
        
        // When - Get third page
        let page3 = try await messageRepo.page(
            conversationID: testConversationID,
            after: page2.next,
            limit: 1
        )
        
        // Then - Should get third ID
        XCTAssertEqual(page3.items.count, 1)
        XCTAssertEqual(page3.items[0].id, ids[2])
        XCTAssertNil(page3.next) // No more pages
    }
}
