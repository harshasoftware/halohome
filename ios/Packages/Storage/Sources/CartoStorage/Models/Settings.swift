import Foundation
import SwiftData

/// SwiftData model for persisting user settings
@available(iOS 17.0, macOS 14.0, *)
@Model
public final class Settings {
    @Attribute(.unique) public var id: UUID
    public var theme: String // "system" | "light" | "dark"
    public var preferredModel: String?
    public var reduceMotion: Bool
    public var hasSeenOnboarding: Bool
    public var notificationsEnabled: Bool = true
    public var shareDiagnostics: Bool = true
    public var hapticsEnabled: Bool = true
    public var createdAt: Date
    public var updatedAt: Date
    
    public init(
        id: UUID = UUID(),
        theme: String = "system",
        preferredModel: String? = nil,
        reduceMotion: Bool = false,
        hasSeenOnboarding: Bool = false,
        notificationsEnabled: Bool = true,
        shareDiagnostics: Bool = true,
        hapticsEnabled: Bool = true,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
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
