import Foundation

/// Lightweight data transfer object for memory data
/// 
/// This DTO provides a clean boundary between persistence (SwiftData) and domain logic.
/// Sensitive internal fields (sourceMessageID, rawExtraction) are NOT exposed here.
/// This is automatic "field masking" - only safe, necessary fields are public.
/// 
/// Codable conformance enables future Supabase sync integration.
public struct MemoryDTO: Sendable, Equatable, Identifiable, Codable {
    /// Unique identifier
    public let id: UUID
    
    /// The actual memory content
    public let content: String
    
    /// Keywords for search
    public let keywords: [String]
    
    /// Importance score (1-10)
    public let importance: Int
    
    /// Optional link to originating conversation
    public let conversationID: UUID?
    
    /// When this memory was created
    public let createdAt: Date
    
    /// When this memory was last accessed
    public let lastAccessedAt: Date
    
    /// How many times this memory has been used
    public let accessCount: Int
    
    public init(
        id: UUID,
        content: String,
        keywords: [String],
        importance: Int,
        conversationID: UUID? = nil,
        createdAt: Date,
        lastAccessedAt: Date,
        accessCount: Int
    ) {
        self.id = id
        self.content = content
        self.keywords = keywords
        self.importance = importance
        self.conversationID = conversationID
        self.createdAt = createdAt
        self.lastAccessedAt = lastAccessedAt
        self.accessCount = accessCount
    }
}

// MARK: - Internal Mappers

@available(iOS 17.0, macOS 14.0, *)
extension MemoryDTO {
    /// Maps from SwiftData model to DTO
    /// 
    /// This is where "field masking" happens automatically:
    /// - sourceMessageID is NOT copied (internal tracking only)
    /// - rawExtraction is NOT copied (debug data only)
    /// 
    /// Views and ViewModels only see the clean DTO with safe fields.
    init(_ model: Memory) {
        self.id = model.id
        self.content = model.content
        self.keywords = model.keywords
        self.importance = model.importance
        self.conversationID = model.conversationID
        self.createdAt = model.createdAt
        self.lastAccessedAt = model.lastAccessedAt
        self.accessCount = model.accessCount
        
        // Notice: sourceMessageID and rawExtraction are never exposed
    }
}

