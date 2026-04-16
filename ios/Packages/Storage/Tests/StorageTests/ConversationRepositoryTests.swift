import XCTest
import SwiftData
@testable import CartoStorage

@MainActor
final class ConversationRepositoryTests: XCTestCase {
    private var container: ModelContainer!
    private var repository: ConversationRepository!
    
    override func setUp() async throws {
        try await super.setUp()
        container = try StorageModelContainer.make(inMemory: true)
        repository = ConversationRepositoryImpl(modelContext: container.mainContext)
    }
    
    override func tearDown() async throws {
        container = nil
        repository = nil
        try await super.tearDown()
    }
    
    func testCreateConversation() async throws {
        // Given
        let title = "Test Conversation"
        let personaName = "Assistant"
        
        // When
        let conversation = try await repository.create(
            title: title,
            personaName: personaName
        )
        
        // Then
        XCTAssertEqual(conversation.title, title)
        XCTAssertEqual(conversation.personaName, personaName)
        XCTAssertNotNil(conversation.id)
        XCTAssertNotNil(conversation.createdAt)
        XCTAssertNotNil(conversation.updatedAt)
    }
    
    func testRenameConversation() async throws {
        // Given
        let conversation = try await repository.create(
            title: "Original Title",
            personaName: nil
        )
        let newTitle = "Updated Title"
        
        // When
        try await repository.rename(id: conversation.id, title: newTitle)
        
        // Then
        let conversations = try await repository.list(limit: 10, after: nil)
        XCTAssertEqual(conversations.first?.title, newTitle)
    }
    
    func testRenameNonExistentConversationThrows() async throws {
        // Given
        let nonExistentID = UUID()
        
        // When/Then
        do {
            try await repository.rename(id: nonExistentID, title: "New Title")
            XCTFail("Should have thrown notFound error")
        } catch let error as StorageError {
            XCTAssertEqual(error, .notFound)
        }
    }
    
    func testDeleteConversation() async throws {
        // Given
        let conversation = try await repository.create(
            title: "To Delete",
            personaName: nil
        )
        
        // When
        try await repository.delete(id: conversation.id)
        
        // Then
        let conversations = try await repository.list(limit: 10, after: nil)
        XCTAssertTrue(conversations.isEmpty)
    }
    
    func testDeleteNonExistentConversationThrows() async throws {
        // Given
        let nonExistentID = UUID()
        
        // When/Then
        do {
            try await repository.delete(id: nonExistentID)
            XCTFail("Should have thrown notFound error")
        } catch let error as StorageError {
            XCTAssertEqual(error, .notFound)
        }
    }
    
    func testListConversationsOrderedByUpdatedAt() async throws {
        // Given
        let conv1 = try await repository.create(title: "First", personaName: nil)
        try await Task.sleep(nanoseconds: 10_000_000) // 10ms
        let conv2 = try await repository.create(title: "Second", personaName: nil)
        try await Task.sleep(nanoseconds: 10_000_000) // 10ms
        let conv3 = try await repository.create(title: "Third", personaName: nil)
        
        // When
        let conversations = try await repository.list(limit: 10, after: nil)
        
        // Then
        XCTAssertEqual(conversations.count, 3)
        XCTAssertEqual(conversations[0].id, conv3.id) // Most recent first
        XCTAssertEqual(conversations[1].id, conv2.id)
        XCTAssertEqual(conversations[2].id, conv1.id)
    }
    
    func testListConversationsWithPagination() async throws {
        // Given
        let conv1 = try await repository.create(title: "First", personaName: nil)
        try await Task.sleep(nanoseconds: 10_000_000)
        let conv2 = try await repository.create(title: "Second", personaName: nil)
        try await Task.sleep(nanoseconds: 10_000_000)
        let conv3 = try await repository.create(title: "Third", personaName: nil)
        
        // When - Get first page
        let page1 = try await repository.list(limit: 2, after: nil)
        
        // Then
        XCTAssertEqual(page1.count, 2)
        XCTAssertEqual(page1[0].id, conv3.id)
        XCTAssertEqual(page1[1].id, conv2.id)
        
        // When - Get second page
        let page2 = try await repository.list(limit: 2, after: page1.last?.updatedAt)
        
        // Then
        XCTAssertEqual(page2.count, 1)
        XCTAssertEqual(page2[0].id, conv1.id)
    }
}
