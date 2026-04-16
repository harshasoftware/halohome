import Foundation

/// Lightweight data transfer object for message data
public struct MessageDTO: Sendable, Equatable {
    public enum Role: String, Sendable, Equatable, CaseIterable {
        case user
        case assistant
        case system
    }
    
    public let id: UUID
    public let role: Role
    public let text: String
    public let createdAt: Date
    public let conversationID: UUID
    
    public init(
        id: UUID,
        role: Role,
        text: String,
        createdAt: Date,
        conversationID: UUID
    ) {
        self.id = id
        self.role = role
        self.text = text
        self.createdAt = createdAt
        self.conversationID = conversationID
    }
}

// MARK: - Internal Mappers

@available(iOS 17.0, macOS 14.0, *)
extension MessageDTO {
    /// Maps from SwiftData model to DTO
    init(_ model: Message, conversationID: UUID) {
        self.id = model.id
        self.role = Role(rawValue: model.role) ?? .system
        self.text = model.text
        self.createdAt = model.createdAt
        self.conversationID = conversationID
    }
    
    /// Maps from DTO to SwiftData model role string
    var roleString: String {
        role.rawValue
    }
}
