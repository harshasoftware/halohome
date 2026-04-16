import Foundation
import SwiftData
import Core

/// Protocol for managing settings persistence
public protocol SettingsRepository: Sendable {
    func load() async throws -> SettingsDTO
    func save(_ settings: SettingsDTO) async throws
}

/// Internal implementation using SwiftData
@available(iOS 17.0, macOS 14.0, *)
@MainActor
public final class SettingsRepositoryImpl: SettingsRepository {
    private let modelContext: ModelContext
    
    public init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }
    
    public func load() async throws -> SettingsDTO {
        let descriptor = FetchDescriptor<Settings>(
            sortBy: [SortDescriptor(\.createdAt, order: .forward)]
        )
        
        do {
            let allSettings = try modelContext.fetch(descriptor)
            
            if let existing = allSettings.first {
                AppLogger.debug("Loaded existing settings", category: AppLogger.storage)
                return SettingsDTO(existing)
            } else {
                // Create default settings if none exist
                let defaultSettings = Settings()
                modelContext.insert(defaultSettings)
                try modelContext.save()
                
                AppLogger.debug("Created default settings", category: AppLogger.storage)
                return SettingsDTO(defaultSettings)
            }
        } catch {
            AppLogger.error("Failed to load settings: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func save(_ settings: SettingsDTO) async throws {
        let descriptor = FetchDescriptor<Settings>(
            sortBy: [SortDescriptor(\.createdAt, order: .forward)]
        )
        
        do {
            let allSettings = try modelContext.fetch(descriptor)
            
            let settingsModel: Settings
            if let existing = allSettings.first {
                // Update existing settings
                existing.theme = settings.themeString
                existing.preferredModel = settings.preferredModel
                existing.reduceMotion = settings.reduceMotion
                existing.hasSeenOnboarding = settings.hasSeenOnboarding
                existing.notificationsEnabled = settings.notificationsEnabled
                existing.updatedAt = Date()
                settingsModel = existing
            } else {
                // Create new settings
                settingsModel = Settings(
                    theme: settings.themeString,
                    preferredModel: settings.preferredModel,
                    reduceMotion: settings.reduceMotion,
                    hasSeenOnboarding: settings.hasSeenOnboarding,
                    notificationsEnabled: settings.notificationsEnabled,
                    updatedAt: Date()
                )
                modelContext.insert(settingsModel)
            }
            
            try modelContext.save()
            AppLogger.debug("Saved settings", category: AppLogger.storage)
        } catch {
            AppLogger.error("Failed to save settings: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
}
