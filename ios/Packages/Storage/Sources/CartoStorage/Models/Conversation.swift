import Foundation
import SwiftData

/// SwiftData model for persisting conversation data
@available(iOS 17.0, macOS 14.0, *)
@Model
public final class Conversation {
    @Attribute(.unique) public var id: UUID
    public var title: String
    public var createdAt: Date
    public var updatedAt: Date
    public var personaName: String?
    
    @Relationship(deleteRule: .cascade, inverse: \Message.conversation)
    public var messages: [Message]
    
    public init(
        id: UUID = UUID(),
        title: String,
        createdAt: Date = Date(),
        updatedAt: Date = Date(),
        personaName: String? = nil,
        messages: [Message] = []
    ) {
        self.id = id
        self.title = title
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.personaName = personaName
        self.messages = messages
    }
}
