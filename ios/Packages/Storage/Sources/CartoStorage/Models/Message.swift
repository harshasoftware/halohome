import Foundation
import SwiftData

/// SwiftData model for persisting message data
@available(iOS 17.0, macOS 14.0, *)
@Model
public final class Message {
    @Attribute(.unique) public var id: UUID
    public var role: String // "user" | "assistant" | "system"
    public var text: String
    public var createdAt: Date
    
    public var conversation: Conversation?
    
    public init(
        id: UUID = UUID(),
        role: String,
        text: String,
        createdAt: Date = Date(),
        conversation: Conversation? = nil
    ) {
        self.id = id
        self.role = role
        self.text = text
        self.createdAt = createdAt
        self.conversation = conversation
    }
}
