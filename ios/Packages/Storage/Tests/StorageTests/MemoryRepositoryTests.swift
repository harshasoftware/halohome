import XCTest
import SwiftData
@testable import CartoStorage
import Core

@available(iOS 17.0, macOS 14.0, *)
final class MemoryRepositoryTests: XCTestCase {
    var container: ModelContainer!
    var repository: MemoryRepository!
    
    override func setUp() async throws {
        try await super.setUp()
        
        // Create in-memory container for testing
        container = try StorageModelContainer.make(inMemory: true)
        let context = container.mainContext
        repository = MemoryRepositoryImpl(modelContext: context)
    }
    
    override func tearDown() async throws {
        repository = nil
        container = nil
        try await super.tearDown()
    }
    
    // MARK: - Create Tests
    
    func testCreate_savesMemory() async throws {
        // Given
        let content = "User prefers dark mode"
        let keywords = ["dark", "mode", "preference"]
        let importance = 8
        
        // When
        let memory = try await repository.create(
            content: content,
            keywords: keywords,
            importance: importance,
            conversationID: nil
        )
        
        // Then
        XCTAssertEqual(memory.content, content)
        XCTAssertEqual(memory.keywords, keywords)
        XCTAssertEqual(memory.importance, importance)
        XCTAssertNil(memory.conversationID)
        XCTAssertEqual(memory.accessCount, 0)
    }
    
    func testCreate_withConversationID() async throws {
        // Given
        let conversationID = UUID()
        
        // When
        let memory = try await repository.create(
            content: "User's name is John",
            keywords: ["name", "john"],
            importance: 9,
            conversationID: conversationID
        )
        
        // Then
        XCTAssertEqual(memory.conversationID, conversationID)
    }
    
    // MARK: - Find One Tests
    
    func testFindOne_returnsMemory() async throws {
        // Given
        let created = try await repository.create(
            content: "Test memory",
            keywords: ["test"],
            importance: 5,
            conversationID: nil
        )
        
        // When
        let found = try await repository.findOne(id: created.id)
        
        // Then
        XCTAssertNotNil(found)
        XCTAssertEqual(found?.id, created.id)
        XCTAssertEqual(found?.content, "Test memory")
    }
    
    func testFindOne_returnsNilForNonexistent() async throws {
        // When
        let found = try await repository.findOne(id: UUID())
        
        // Then
        XCTAssertNil(found)
    }
    
    // MARK: - Find Many Tests
    
    func testFindMany_returnsAllMemories() async throws {
        // Given
        _ = try await repository.create(content: "Memory 1", keywords: ["test"], importance: 5, conversationID: nil)
        _ = try await repository.create(content: "Memory 2", keywords: ["test"], importance: 7, conversationID: nil)
        _ = try await repository.create(content: "Memory 3", keywords: ["test"], importance: 3, conversationID: nil)
        
        // When
        let memories = try await repository.findMany(limit: 10, after: nil)
        
        // Then
        XCTAssertEqual(memories.count, 3)
    }
    
    func testFindMany_respectsLimit() async throws {
        // Given
        for i in 1...5 {
            _ = try await repository.create(content: "Memory \(i)", keywords: ["test"], importance: 5, conversationID: nil)
        }
        
        // When
        let memories = try await repository.findMany(limit: 3, after: nil)
        
        // Then
        XCTAssertEqual(memories.count, 3)
    }
    
    func testFindMany_paginationWithAfter() async throws {
        // Given
        let memory1 = try await repository.create(content: "Memory 1", keywords: ["test"], importance: 5, conversationID: nil)
        try await Task.sleep(nanoseconds: 100_000_000) // 0.1 second
        _ = try await repository.create(content: "Memory 2", keywords: ["test"], importance: 5, conversationID: nil)
        
        // When
        let memories = try await repository.findMany(limit: 10, after: memory1.createdAt)
        
        // Then
        XCTAssertEqual(memories.count, 0) // Memory 1 should be excluded
    }
    
    // MARK: - Update Tests
    
    func testUpdate_modifiesContent() async throws {
        // Given
        let memory = try await repository.create(content: "Old content", keywords: ["test"], importance: 5, conversationID: nil)
        
        // When
        try await repository.update(id: memory.id, content: "New content", importance: nil)
        
        // Then
        let updated = try await repository.findOne(id: memory.id)
        XCTAssertEqual(updated?.content, "New content")
        XCTAssertEqual(updated?.importance, 5) // Unchanged
    }
    
    func testUpdate_modifiesImportance() async throws {
        // Given
        let memory = try await repository.create(content: "Test", keywords: ["test"], importance: 5, conversationID: nil)
        
        // When
        try await repository.update(id: memory.id, content: nil, importance: 9)
        
        // Then
        let updated = try await repository.findOne(id: memory.id)
        XCTAssertEqual(updated?.importance, 9)
        XCTAssertEqual(updated?.content, "Test") // Unchanged
    }
    
    func testUpdate_throwsForNonexistent() async throws {
        // When/Then
        do {
            try await repository.update(id: UUID(), content: "Test", importance: nil)
            XCTFail("Should throw error")
        } catch {
            // Expected
        }
    }
    
    // MARK: - Delete Tests
    
    func testDelete_removesMemory() async throws {
        // Given
        let memory = try await repository.create(content: "Test", keywords: ["test"], importance: 5, conversationID: nil)
        
        // When
        try await repository.delete(id: memory.id)
        
        // Then
        let found = try await repository.findOne(id: memory.id)
        XCTAssertNil(found)
    }
    
    func testDelete_throwsForNonexistent() async throws {
        // When/Then
        do {
            try await repository.delete(id: UUID())
            XCTFail("Should throw error")
        } catch {
            // Expected
        }
    }
    
    func testDeleteAll_byConversation() async throws {
        // Given
        let conversationID = UUID()
        _ = try await repository.create(content: "Memory 1", keywords: ["test"], importance: 5, conversationID: conversationID)
        _ = try await repository.create(content: "Memory 2", keywords: ["test"], importance: 5, conversationID: conversationID)
        _ = try await repository.create(content: "Memory 3", keywords: ["test"], importance: 5, conversationID: nil)
        
        // When
        try await repository.deleteAll(conversationID: conversationID)
        
        // Then
        let remaining = try await repository.findMany(limit: 10, after: nil)
        XCTAssertEqual(remaining.count, 1)
        XCTAssertNil(remaining.first?.conversationID)
    }
    
    func testDeleteAll_removesAllMemories() async throws {
        // Given
        _ = try await repository.create(content: "Memory 1", keywords: ["test"], importance: 5, conversationID: nil)
        _ = try await repository.create(content: "Memory 2", keywords: ["test"], importance: 5, conversationID: nil)
        
        // When
        try await repository.deleteAll()
        
        // Then
        let memories = try await repository.findMany(limit: 10, after: nil)
        XCTAssertTrue(memories.isEmpty)
    }
    
    // MARK: - Search Tests
    
    func testSearch_findsMatchingKeywords() async throws {
        // Given
        _ = try await repository.create(content: "User prefers dark mode", keywords: ["dark", "mode", "preference"], importance: 8, conversationID: nil)
        _ = try await repository.create(content: "User likes coffee", keywords: ["coffee", "like"], importance: 6, conversationID: nil)
        _ = try await repository.create(content: "User's name is John", keywords: ["name", "john"], importance: 9, conversationID: nil)
        
        // When
        let results = try await repository.search(keywords: ["dark", "mode"], limit: 10)
        
        // Then
        XCTAssertEqual(results.count, 1)
        XCTAssertTrue(results.first?.content.contains("dark mode") ?? false)
    }
    
    func testSearch_caseInsensitive() async throws {
        // Given
        _ = try await repository.create(content: "Test", keywords: ["Dark", "Mode"], importance: 5, conversationID: nil)
        
        // When
        let results = try await repository.search(keywords: ["dark"], limit: 10)
        
        // Then
        XCTAssertEqual(results.count, 1)
    }
    
    func testSearch_respectsLimit() async throws {
        // Given
        for i in 1...5 {
            _ = try await repository.create(content: "Memory \(i)", keywords: ["test"], importance: i, conversationID: nil)
        }
        
        // When
        let results = try await repository.search(keywords: ["test"], limit: 3)
        
        // Then
        XCTAssertEqual(results.count, 3)
    }
    
    func testSearchByConversation_findsMemories() async throws {
        // Given
        let conversationID = UUID()
        _ = try await repository.create(content: "Memory 1", keywords: ["test"], importance: 5, conversationID: conversationID)
        _ = try await repository.create(content: "Memory 2", keywords: ["test"], importance: 7, conversationID: conversationID)
        _ = try await repository.create(content: "Memory 3", keywords: ["test"], importance: 3, conversationID: nil)
        
        // When
        let results = try await repository.searchByConversation(conversationID: conversationID, limit: 10)
        
        // Then
        XCTAssertEqual(results.count, 2)
        XCTAssertTrue(results.allSatisfy { $0.conversationID == conversationID })
    }
    
    // MARK: - Access Stats Tests
    
    func testUpdateAccessStats_incrementsCount() async throws {
        // Given
        let memory = try await repository.create(content: "Test", keywords: ["test"], importance: 5, conversationID: nil)
        XCTAssertEqual(memory.accessCount, 0)
        
        // When
        try await repository.updateAccessStats(id: memory.id)
        
        // Then
        let updated = try await repository.findOne(id: memory.id)
        XCTAssertEqual(updated?.accessCount, 1)
    }
    
    func testUpdateAccessStats_updatesLastAccessed() async throws {
        // Given
        let memory = try await repository.create(content: "Test", keywords: ["test"], importance: 5, conversationID: nil)
        let originalLastAccessed = memory.lastAccessedAt
        
        try await Task.sleep(nanoseconds: 100_000_000) // 0.1 second
        
        // When
        try await repository.updateAccessStats(id: memory.id)
        
        // Then
        let updated = try await repository.findOne(id: memory.id)
        XCTAssertGreaterThan(updated!.lastAccessedAt, originalLastAccessed)
    }
    
    func testUpdateAccessStats_throwsForNonexistent() async throws {
        // When/Then
        do {
            try await repository.updateAccessStats(id: UUID())
            XCTFail("Should throw error")
        } catch {
            // Expected
        }
    }
}

