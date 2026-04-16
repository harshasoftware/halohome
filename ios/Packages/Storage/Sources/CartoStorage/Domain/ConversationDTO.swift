import Foundation

/// Lightweight data transfer object for conversation data
public struct ConversationDTO: Sendable, Equatable, Identifiable {
    public let id: UUID
    public let title: String
    public let createdAt: Date
    public let updatedAt: Date
    public let personaName: String?
    
    public init(
        id: UUID,
        title: String,
        createdAt: Date,
        updatedAt: Date,
        personaName: String? = nil
    ) {
        self.id = id
        self.title = title
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.personaName = personaName
    }
}

// MARK: - Internal Mappers

@available(iOS 17.0, macOS 14.0, *)
extension ConversationDTO {
    /// Maps from SwiftData model to DTO
    init(_ model: Conversation) {
        self.id = model.id
        self.title = model.title
        self.createdAt = model.createdAt
        self.updatedAt = model.updatedAt
        self.personaName = model.personaName
    }
}
