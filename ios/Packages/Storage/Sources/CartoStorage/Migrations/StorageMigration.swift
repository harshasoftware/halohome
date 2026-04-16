import Foundation
import SwiftData
import Core

/// Storage schema version
public enum StorageSchemaVersion: Int, Codable, CaseIterable {
    case v1 = 1
    // Future versions:
    // case v2 = 2 // Example: Add Message.attachments
    // case v3 = 3 // Example: Add Conversation.archivedAt
    
    /// Current schema version
    public static let current: StorageSchemaVersion = .v1
}

/// Migration coordinator for storage schema changes
@available(iOS 17.0, macOS 14.0, *)
public enum StorageMigration {
    
    /// Get the migration plan for the current schema
    public static func migrationPlan() -> SchemaMigrationPlan? {
        // Currently on v1, no migrations needed yet
        // When adding v2, create a VersionedSchema and migration plan:
        /*
        Example for future v2:
        
        enum StorageSchemaV1: VersionedSchema {
            static var versionIdentifier = Schema.Version(1, 0, 0)
            static var models: [any PersistentModel.Type] = [
                Conversation.self,
                Message.self,
                Settings.self
            ]
        }
        
        enum StorageSchemaV2: VersionedSchema {
            static var versionIdentifier = Schema.Version(2, 0, 0)
            // Updated models with new fields
        }
        
        enum StorageMigrationPlan: SchemaMigrationPlan {
            static var schemas: [any VersionedSchema.Type] = [
                StorageSchemaV1.self,
                StorageSchemaV2.self
            ]
            
            static var stages: [MigrationStage] = [
                .lightweight(fromVersion: StorageSchemaV1.self, toVersion: StorageSchemaV2.self)
                // Or for custom migration:
                // .custom(fromVersion: StorageSchemaV1.self,
                //         toVersion: StorageSchemaV2.self,
                //         willMigrate: { context in
                //             // Pre-migration logic
                //         },
                //         didMigrate: { context in
                //             // Post-migration logic
                //         })
            ]
        }
        */
        
        return nil
    }
    
    /// Validate that the schema version is compatible
    public static func validateSchema(for container: ModelContainer) throws {
        // For v1, we just ensure the container is initialized
        // Future: Check version in UserDefaults/Keychain and validate compatibility
        
        let version = getCurrentVersion()
        AppLogger.info("Storage schema version: \(version.rawValue)", category: AppLogger.storage)
        
        if version != .current {
            AppLogger.debug("Schema migration may be needed from \(version.rawValue) to \(StorageSchemaVersion.current.rawValue)", category: AppLogger.storage)
        }
    }
    
    /// Get the current schema version from storage
    private static func getCurrentVersion() -> StorageSchemaVersion {
        // Read from UserDefaults
        let key = "storage_schema_version"
        let stored = UserDefaults.standard.integer(forKey: key)
        
        if stored == 0 {
            // First time, set to current
            UserDefaults.standard.set(StorageSchemaVersion.current.rawValue, forKey: key)
            return .current
        }
        
        return StorageSchemaVersion(rawValue: stored) ?? .current
    }
    
    /// Update the stored schema version
    public static func updateVersion(to version: StorageSchemaVersion) {
        UserDefaults.standard.set(version.rawValue, forKey: "storage_schema_version")
        AppLogger.info("Updated schema version to \(version.rawValue)", category: AppLogger.storage)
    }
}

// MARK: - Migration Guidelines (Documentation)

/*
 MIGRATION GUIDELINES
 ====================
 
 When adding a new schema version:
 
 1. Add new case to StorageSchemaVersion enum:
    case v2 = 2
 
 2. Update StorageSchemaVersion.current
 
 3. Create VersionedSchema for old and new versions
 
 4. Add migration stage (lightweight or custom):
    - Lightweight: SwiftData handles simple changes (new optional fields, etc.)
    - Custom: You provide migration logic for complex changes
 
 5. Test migration path:
    - Create test database with old schema
    - Run app with new schema
    - Verify data integrity
 
 SAFE CHANGES (Lightweight Migration):
 - Adding new optional properties
 - Adding new entities
 - Renaming properties (with @Attribute(originalName:))
 - Adding new relationships
 
 COMPLEX CHANGES (Custom Migration Required):
 - Removing required properties
 - Changing property types
 - Splitting/merging entities
 - Complex data transformations
 
 EXAMPLE: Adding Message.attachments field
 
 1. Create v2 schema:
    @Model final class MessageV2 {
        var id: UUID
        var role: String
        var text: String
        var createdAt: Date
        var attachments: [String]? // NEW FIELD
        var conversation: ConversationV2?
    }
 
 2. Add migration stage:
    .lightweight(fromVersion: StorageSchemaV1.self, 
                 toVersion: StorageSchemaV2.self)
 
 3. Test thoroughly before shipping!
 */
