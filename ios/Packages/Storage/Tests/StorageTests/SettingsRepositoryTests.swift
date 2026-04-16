import XCTest
import SwiftData
@testable import CartoStorage

@MainActor
final class SettingsRepositoryTests: XCTestCase {
    private var container: ModelContainer!
    private var repository: SettingsRepository!
    
    override func setUp() async throws {
        try await super.setUp()
        container = try StorageModelContainer.make(inMemory: true)
        repository = SettingsRepositoryImpl(modelContext: container.mainContext)
    }
    
    override func tearDown() async throws {
        container = nil
        repository = nil
        try await super.tearDown()
    }
    
    func testLoadCreatesDefaultSettingsIfNoneExist() async throws {
        // When
        let settings = try await repository.load()
        
        // Then
        XCTAssertEqual(settings.theme, .system)
        XCTAssertNil(settings.preferredModel)
        XCTAssertFalse(settings.reduceMotion)
        XCTAssertNotNil(settings.createdAt)
        XCTAssertNotNil(settings.updatedAt)
    }
    
    func testLoadReturnsExistingSettings() async throws {
        // Given - Create settings
        let firstLoad = try await repository.load()
        
        // When - Load again
        let secondLoad = try await repository.load()
        
        // Then - Should return same settings
        XCTAssertEqual(firstLoad.createdAt, secondLoad.createdAt)
    }
    
    func testSaveUpdatesExistingSettings() async throws {
        // Given - Load default settings
        _ = try await repository.load()
        
        // When - Save modified settings
        let modified = SettingsDTO(
            theme: .dark,
            preferredModel: "gpt-4",
            reduceMotion: true
        )
        try await repository.save(modified)
        
        // Then - Load should return updated settings
        let loaded = try await repository.load()
        XCTAssertEqual(loaded.theme, .dark)
        XCTAssertEqual(loaded.preferredModel, "gpt-4")
        XCTAssertTrue(loaded.reduceMotion)
    }
    
    func testSaveCreatesSettingsIfNoneExist() async throws {
        // Given - No existing settings
        let newSettings = SettingsDTO(
            theme: .light,
            preferredModel: "claude-3",
            reduceMotion: false
        )
        
        // When
        try await repository.save(newSettings)
        
        // Then
        let loaded = try await repository.load()
        XCTAssertEqual(loaded.theme, .light)
        XCTAssertEqual(loaded.preferredModel, "claude-3")
        XCTAssertFalse(loaded.reduceMotion)
    }
    
    func testMultipleSavesUpdateSameSettings() async throws {
        // Given
        _ = try await repository.load()
        
        // When - Save multiple times
        try await repository.save(SettingsDTO(theme: .light))
        try await repository.save(SettingsDTO(theme: .dark))
        try await repository.save(SettingsDTO(theme: .system))
        
        // Then - Should only have one settings record
        let context = container.mainContext
        let allSettings = try context.fetch(FetchDescriptor<Settings>())
        XCTAssertEqual(allSettings.count, 1)
        
        let loaded = try await repository.load()
        XCTAssertEqual(loaded.theme, .system)
    }
    
    func testThemeEnumMapping() async throws {
        // Test all theme values
        for theme in SettingsDTO.Theme.allCases {
            let settings = SettingsDTO(theme: theme)
            try await repository.save(settings)
            let loaded = try await repository.load()
            XCTAssertEqual(loaded.theme, theme)
        }
    }
}
