import Foundation

/// Domain model for chat messages
public struct ChatMessage: Sendable, Equatable, Identifiable {
    
    public enum Role: String, Sendable, Codable {
        case user
        case assistant
        case system
    }
    
    public let id: UUID
    public let role: Role
    public var text: String
    public let createdAt: Date
    public var isStreaming: Bool // Non-persisted, VM-only flag
    
    public init(id: UUID = UUID(), role: Role, text: String, createdAt: Date = Date(), isStreaming: Bool = false) {
        self.id = id
        self.role = role
        self.text = text
        self.createdAt = createdAt
        self.isStreaming = isStreaming
    }
}

