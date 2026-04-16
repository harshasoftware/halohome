import Foundation

/// Lightweight data transfer object for settings data
public struct SettingsDTO: Sendable, Equatable {
    public enum Theme: String, Sendable, Equatable, CaseIterable {
        case system
        case light
        case dark
        case aurora
        case obsidian
    }
    
    public let theme: Theme
    public let preferredModel: String?
    public let reduceMotion: Bool
    public let hasSeenOnboarding: Bool
    public let notificationsEnabled: Bool
    public let shareDiagnostics: Bool
    public let hapticsEnabled: Bool
    public let createdAt: Date
    public let updatedAt: Date
    
    public init(
        theme: Theme = .system,
        preferredModel: String? = nil,
        reduceMotion: Bool = false,
        hasSeenOnboarding: Bool = false,
        notificationsEnabled: Bool = true,
        shareDiagnostics: Bool = true,
        hapticsEnabled: Bool = true,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.theme = theme
        self.preferredModel = preferredModel
        self.reduceMotion = reduceMotion
        self.hasSeenOnboarding = hasSeenOnboarding
        self.notificationsEnabled = notificationsEnabled
        self.shareDiagnostics = shareDiagnostics
        self.hapticsEnabled = hapticsEnabled
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

// MARK: - Internal Mappers

@available(iOS 17.0, macOS 14.0, *)
extension SettingsDTO {
    /// Maps from SwiftData model to DTO
    init(_ model: Settings) {
        self.theme = Theme(rawValue: model.theme) ?? .system
        self.preferredModel = model.preferredModel
        self.reduceMotion = model.reduceMotion
        self.hasSeenOnboarding = model.hasSeenOnboarding
        self.notificationsEnabled = model.notificationsEnabled
        self.shareDiagnostics = model.shareDiagnostics
        self.hapticsEnabled = model.hapticsEnabled
        self.createdAt = model.createdAt
        self.updatedAt = model.updatedAt
    }
    
    /// Maps from DTO to SwiftData model theme string
    var themeString: String {
        theme.rawValue
    }
}
