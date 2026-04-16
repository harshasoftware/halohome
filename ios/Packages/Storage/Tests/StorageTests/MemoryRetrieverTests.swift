import XCTest
import SwiftData
@testable import CartoStorage
import Core

@available(iOS 17.0, macOS 14.0, *)
final class MemoryRetrieverTests: XCTestCase {
    var container: ModelContainer!
    var repository: MemoryRepository!
    var retriever: MemoryRetriever!
    
    override func setUp() async throws {
        try await super.setUp()
        
        // Create in-memory container for testing
        container = try StorageModelContainer.make(inMemory: true)
        let context = container.mainContext
        repository = MemoryRepositoryImpl(modelContext: context)
        retriever = KeywordMemoryRetriever(repository: repository)
    }
    
    override func tearDown() async throws {
        retriever = nil
        repository = nil
        container = nil
        try await super.tearDown()
    }
    
    // MARK: - Basic Retrieval Tests
    
    func testRetrieve_findsRelevantMemories() async throws {
        // Given
        _ = try await repository.create(
            content: "User prefers dark mode",
            keywords: ["dark", "mode", "preference"],
            importance: 8,
            conversationID: nil
        )
        _ = try await repository.create(
            content: "User likes coffee",
            keywords: ["coffee", "like"],
            importance: 6,
            conversationID: nil
        )
        
        // When
        let results = try await retriever.retrieve(
            for: "What is my preferred theme mode?",
            conversationID: nil,
            limit: 5
        )
        
        // Then
        XCTAssertEqual(results.count, 1)
        XCTAssertTrue(results.first?.content.contains("dark mode") ?? false)
    }
    
    func testRetrieve_respectsLimit() async throws {
        // Given
        for i in 1...10 {
            _ = try await repository.create(
                content: "Memory \(i)",
                keywords: ["test", "memory"],
                importance: 5,
                conversationID: nil
            )
        }
        
        // When
        let results = try await retriever.retrieve(
            for: "Tell me about test memories",
            conversationID: nil,
            limit: 3
        )
        
        // Then
        XCTAssertEqual(results.count, 3)
    }
    
    func testRetrieve_returnsEmptyForNoKeywords() async throws {
        // Given
        _ = try await repository.create(
            content: "User prefers dark mode",
            keywords: ["dark", "mode"],
            importance: 8,
            conversationID: nil
        )
        
        // When
        let results = try await retriever.retrieve(
            for: "a the is", // Only stopwords
            conversationID: nil,
            limit: 5
        )
        
        // Then
        XCTAssertTrue(results.isEmpty)
    }
    
    func testRetrieve_returnsEmptyForNoMatches() async throws {
        // Given
        _ = try await repository.create(
            content: "User likes coffee",
            keywords: ["coffee", "like"],
            importance: 6,
            conversationID: nil
        )
        
        // When
        let results = try await retriever.retrieve(
            for: "What's the weather?",
            conversationID: nil,
            limit: 5
        )
        
        // Then
        XCTAssertTrue(results.isEmpty)
    }
    
    // MARK: - Scoring Tests
    
    func testRetrieve_prioritizesHigherImportance() async throws {
        // Given
        let lowImportance = try await repository.create(
            content: "Low importance memory",
            keywords: ["test"],
            importance: 3,
            conversationID: nil
        )
        let highImportance = try await repository.create(
            content: "High importance memory",
            keywords: ["test"],
            importance: 9,
            conversationID: nil
        )
        
        // When
        let results = try await retriever.retrieve(
            for: "test",
            conversationID: nil,
            limit: 10
        )
        
        // Then
        XCTAssertEqual(results.count, 2)
        XCTAssertEqual(results.first?.id, highImportance.id) // Higher importance first
    }
    
    func testRetrieve_prioritizesMoreRecentAccess() async throws {
        // Given
        let old = try await repository.create(
            content: "Old memory",
            keywords: ["test"],
            importance: 5,
            conversationID: nil
        )
        
        try await Task.sleep(nanoseconds: 100_000_000) // 0.1 second
        
        let recent = try await repository.create(
            content: "Recent memory",
            keywords: ["test"],
            importance: 5,
            conversationID: nil
        )
        
        // When
        let results = try await retriever.retrieve(
            for: "test",
            conversationID: nil,
            limit: 10
        )
        
        // Then
        XCTAssertEqual(results.count, 2)
        // Recent should score higher due to recency
        XCTAssertEqual(results.first?.id, recent.id)
    }
    
    func testRetrieve_prioritizesSameConversation() async throws {
        // Given
        let conversationID = UUID()
        
        let sameConv = try await repository.create(
            content: "Memory from same conversation",
            keywords: ["test"],
            importance: 5,
            conversationID: conversationID
        )
        let otherConv = try await repository.create(
            content: "Memory from other conversation",
            keywords: ["test"],
            importance: 5,
            conversationID: nil
        )
        
        // When
        let results = try await retriever.retrieve(
            for: "test",
            conversationID: conversationID,
            limit: 10
        )
        
        // Then
        XCTAssertEqual(results.count, 2)
        XCTAssertEqual(results.first?.id, sameConv.id) // Same conversation gets bonus
    }
    
    // MARK: - Keyword Matching Tests
    
    func testRetrieve_matchesPartialKeywords() async throws {
        // Given
        _ = try await repository.create(
            content: "User prefers programming",
            keywords: ["programming", "preference"],
            importance: 7,
            conversationID: nil
        )
        
        // When
        let results = try await retriever.retrieve(
            for: "Tell me about program", // Partial match
            conversationID: nil,
            limit: 5
        )
        
        // Then
        XCTAssertEqual(results.count, 1)
    }
    
    func testRetrieve_caseInsensitive() async throws {
        // Given
        _ = try await repository.create(
            content: "User likes Swift",
            keywords: ["Swift", "Programming"],
            importance: 7,
            conversationID: nil
        )
        
        // When
        let results = try await retriever.retrieve(
            for: "swift programming", // Lowercase
            conversationID: nil,
            limit: 5
        )
        
        // Then
        XCTAssertEqual(results.count, 1)
    }
    
    func testRetrieve_multipleKeywordMatch() async throws {
        // Given
        _ = try await repository.create(
            content: "User prefers dark mode",
            keywords: ["dark", "mode", "preference"],
            importance: 8,
            conversationID: nil
        )
        _ = try await repository.create(
            content: "User likes dark chocolate",
            keywords: ["dark", "chocolate", "like"],
            importance: 6,
            conversationID: nil
        )
        
        // When
        let results = try await retriever.retrieve(
            for: "dark mode settings",
            conversationID: nil,
            limit: 5
        )
        
        // Then
        XCTAssertEqual(results.count, 2)
        // "dark mode" memory should score higher (2 matching keywords vs 1)
        XCTAssertTrue(results.first?.content.contains("mode") ?? false)
    }
    
    // MARK: - Access Stats Tests
    
    func testRetrieve_updatesAccessStats() async throws {
        // Given
        let memory = try await repository.create(
            content: "Test memory",
            keywords: ["test"],
            importance: 5,
            conversationID: nil
        )
        XCTAssertEqual(memory.accessCount, 0)
        
        // When
        _ = try await retriever.retrieve(
            for: "test",
            conversationID: nil,
            limit: 5
        )
        
        // Give async update time to complete
        try await Task.sleep(nanoseconds: 100_000_000)
        
        // Then
        let updated = try await repository.findOne(id: memory.id)
        XCTAssertEqual(updated?.accessCount, 1)
    }
    
    func testRetrieve_updatesMultipleAccessStats() async throws {
        // Given
        let memory1 = try await repository.create(
            content: "Memory 1",
            keywords: ["test"],
            importance: 5,
            conversationID: nil
        )
        let memory2 = try await repository.create(
            content: "Memory 2",
            keywords: ["test"],
            importance: 5,
            conversationID: nil
        )
        
        // When
        _ = try await retriever.retrieve(
            for: "test",
            conversationID: nil,
            limit: 5
        )
        
        // Give async update time to complete
        try await Task.sleep(nanoseconds: 100_000_000)
        
        // Then
        let updated1 = try await repository.findOne(id: memory1.id)
        let updated2 = try await repository.findOne(id: memory2.id)
        XCTAssertEqual(updated1?.accessCount, 1)
        XCTAssertEqual(updated2?.accessCount, 1)
    }
    
    // MARK: - Integration Tests
    
    func testRetrieve_realWorldScenario() async throws {
        // Given: Simulate a user's memory profile
        _ = try await repository.create(
            content: "User's name is Alice",
            keywords: ["name", "alice"],
            importance: 9,
            conversationID: nil
        )
        _ = try await repository.create(
            content: "User prefers dark mode",
            keywords: ["dark", "mode", "preference"],
            importance: 8,
            conversationID: nil
        )
        _ = try await repository.create(
            content: "User is allergic to peanuts",
            keywords: ["allergic", "peanuts", "health"],
            importance: 10,
            conversationID: nil
        )
        _ = try await repository.create(
            content: "User likes coffee",
            keywords: ["coffee", "like", "beverage"],
            importance: 6,
            conversationID: nil
        )
        _ = try await repository.create(
            content: "User works as a software engineer",
            keywords: ["work", "software", "engineer"],
            importance: 7,
            conversationID: nil
        )
        
        // When: User asks about their preferences
        let results = try await retriever.retrieve(
            for: "What are my preferences?",
            conversationID: nil,
            limit: 3
        )
        
        // Then: Should return most relevant memories
        XCTAssertEqual(results.count, 3)
        // Should include high-importance preference-related memories
        let contents = results.map { $0.content }
        XCTAssertTrue(contents.contains { $0.contains("dark mode") })
    }
}

