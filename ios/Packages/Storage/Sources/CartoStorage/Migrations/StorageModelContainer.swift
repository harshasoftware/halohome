import Foundation
import SwiftData
import Core

/// Factory for creating SwiftData model containers
public enum StorageModelContainer {
    
    /// Creates a configured ModelContainer for the Storage module
    /// - Parameter inMemory: If true, creates an in-memory store for testing
    /// - Returns: Configured ModelContainer
    public static func make(inMemory: Bool = false) throws -> ModelContainer {
        let schema = Schema([
            Conversation.self,
            Message.self,
            Settings.self,
            Memory.self
        ])
        
        let modelConfiguration: ModelConfiguration
        
        if inMemory {
            // Create in-memory configuration for testing
            modelConfiguration = ModelConfiguration(
                schema: schema,
                isStoredInMemoryOnly: true
            )
            AppLogger.debug("Created in-memory model container", category: AppLogger.storage)
        } else {
            // Create persistent configuration
            modelConfiguration = ModelConfiguration(
                schema: schema,
                isStoredInMemoryOnly: false,
                allowsSave: true
            )
            AppLogger.debug("Created persistent model container", category: AppLogger.storage)
        }
        
        do {
            let container = try ModelContainer(
                for: schema,
                configurations: [modelConfiguration]
            )

            // Validate and handle migrations
            try StorageMigration.validateSchema(for: container)

            // Protect the SwiftData store directory with file-level encryption
            if !inMemory {
                let storeDir = modelConfiguration.url.deletingLastPathComponent()
                try? (storeDir as NSURL).setResourceValue(
                    URLFileProtection.complete,
                    forKey: .fileProtectionKey
                )
            }

            return container
        } catch {
            AppLogger.error("Failed to create model container: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    /// Creates repository instances with a shared model context
    /// - Parameters:
    ///   - container: The model container to use
    ///   - useMainContext: If true, uses main context (default). If false, creates new context.
    /// - Returns: Tuple of repository implementations
    @MainActor
    public static func makeRepositories(
        container: ModelContainer,
        useMainContext: Bool = true
    ) -> (
        conversations: ConversationRepository,
        messages: MessageRepository,
        settings: SettingsRepository,
        memory: MemoryRepository
    ) {
        let context = useMainContext ? container.mainContext : ModelContext(container)
        
        return (
            conversations: ConversationRepositoryImpl(modelContext: context),
            messages: MessageRepositoryImpl(modelContext: context),
            settings: SettingsRepositoryImpl(modelContext: context),
            memory: MemoryRepositoryImpl(modelContext: context)
        )
    }
    
    /// Creates repository instances with a background context
    /// Useful for large data operations that shouldn't block the UI
    /// - Parameter container: The model container to use
    /// - Returns: Tuple of repository implementations with background context
    @MainActor
    public static func makeBackgroundRepositories(
        container: ModelContainer
    ) -> (
        conversations: ConversationRepository,
        messages: MessageRepository,
        settings: SettingsRepository,
        memory: MemoryRepository
    ) {
        let context = ModelContext(container)
        
        return (
            conversations: ConversationRepositoryImpl(modelContext: context),
            messages: MessageRepositoryImpl(modelContext: context),
            settings: SettingsRepositoryImpl(modelContext: context),
            memory: MemoryRepositoryImpl(modelContext: context)
        )
    }
}
