import XCTest
import SwiftData
@testable import CartoStorage

final class StorageModelContainerTests: XCTestCase {
    
    @MainActor
    func testCreateInMemoryContainer() throws {
        // Given/When
        let container = try StorageModelContainer.make(inMemory: true)
        
        // Then
        XCTAssertNotNil(container)
        XCTAssertNotNil(container.mainContext)
    }
    
    @MainActor
    func testCreatePersistentContainer() throws {
        // Given/When
        let container = try StorageModelContainer.make(inMemory: false)
        
        // Then
        XCTAssertNotNil(container)
        XCTAssertNotNil(container.mainContext)
    }
    
    @MainActor
    func testMakeRepositories() throws {
        // Given
        let container = try StorageModelContainer.make(inMemory: true)
        
        // When
        let repos = StorageModelContainer.makeRepositories(container: container)
        
        // Then
        XCTAssertNotNil(repos.conversations)
        XCTAssertNotNil(repos.messages)
        XCTAssertNotNil(repos.settings)
    }
    
    func testSchemaContainsAllModels() throws {
        // Given
        let container = try StorageModelContainer.make(inMemory: true)
        
        // When
        let schema = container.schema
        
        // Then
        XCTAssertEqual(schema.entities.count, 3)
        XCTAssertTrue(schema.entities.contains { $0.name == "Conversation" })
        XCTAssertTrue(schema.entities.contains { $0.name == "Message" })
        XCTAssertTrue(schema.entities.contains { $0.name == "Settings" })
    }
}
