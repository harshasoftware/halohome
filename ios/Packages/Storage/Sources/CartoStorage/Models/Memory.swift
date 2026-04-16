import Foundation
import SwiftData

/// SwiftData model for persisting memory data
/// 
/// Memories are facts, preferences, or important information extracted from conversations
/// that help provide personalized context in future interactions.
@available(iOS 17.0, macOS 14.0, *)
@Model
public final class Memory {
    /// Unique identifier
    @Attribute(.unique) public var id: UUID
    
    /// The actual memory content (e.g., "User prefers dark mode", "User's name is John")
    public var content: String
    
    /// Keywords for search (e.g., ["dark", "mode", "preference"])
    public var keywords: [String]
    
    /// Importance score (1-10, higher = more important)
    /// Used for prioritizing which memories to inject into context
    public var importance: Int
    
    /// Optional link to the conversation where this memory originated
    public var conversationID: UUID?
    
    /// When this memory was created
    public var createdAt: Date
    
    /// When this memory was last accessed/used
    public var lastAccessedAt: Date
    
    /// How many times this memory has been retrieved and used
    public var accessCount: Int
    
    // MARK: - Internal Metadata (not exposed in DTO)
    
    /// Internal tracking: which message triggered this memory extraction
    /// Used for debugging and potential future features
    var sourceMessageID: UUID?
    
    /// Internal tracking: raw extraction data for debugging
    /// Helps improve extraction algorithms over time
    var rawExtraction: String?
    
    public init(
        id: UUID = UUID(),
        content: String,
        keywords: [String],
        importance: Int,
        conversationID: UUID? = nil,
        createdAt: Date = Date(),
        lastAccessedAt: Date = Date(),
        accessCount: Int = 0,
        sourceMessageID: UUID? = nil,
        rawExtraction: String? = nil
    ) {
        self.id = id
        self.content = content
        self.keywords = keywords
        self.importance = importance
        self.conversationID = conversationID
        self.createdAt = createdAt
        self.lastAccessedAt = lastAccessedAt
        self.accessCount = accessCount
        self.sourceMessageID = sourceMessageID
        self.rawExtraction = rawExtraction
    }
}

