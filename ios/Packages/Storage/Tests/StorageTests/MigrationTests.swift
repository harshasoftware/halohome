import XCTest
import SwiftData
@testable import CartoStorage

@available(iOS 17.0, macOS 14.0, *)
final class MigrationTests: XCTestCase {
    
    func testCurrentSchemaVersion() {
        // Given/When
        let version = StorageSchemaVersion.current
        
        // Then
        XCTAssertEqual(version, .v1)
    }
    
    func testSchemaVersionCases() {
        // Verify all cases are defined
        XCTAssertEqual(StorageSchemaVersion.allCases.count, 1)
        XCTAssertEqual(StorageSchemaVersion.v1.rawValue, 1)
    }
    
    func testValidateSchemaForContainer() throws {
        // Given
        let container = try StorageModelContainer.make(inMemory: true)
        
        // When/Then - Should not throw
        XCTAssertNoThrow(try StorageMigration.validateSchema(for: container))
    }
    
    func testMigrationPlanIsNilForV1() {
        // Given/When
        let plan = StorageMigration.migrationPlan()
        
        // Then - v1 has no migrations yet
        XCTAssertNil(plan)
    }
    
    func testUpdateVersion() {
        // Given
        let newVersion = StorageSchemaVersion.v1
        
        // When
        StorageMigration.updateVersion(to: newVersion)
        
        // Then - Version should be stored
        let stored = UserDefaults.standard.integer(forKey: "storage_schema_version")
        XCTAssertEqual(stored, newVersion.rawValue)
        
        // Cleanup
        UserDefaults.standard.removeObject(forKey: "storage_schema_version")
    }
}
