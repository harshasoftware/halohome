import Foundation
import Core

/// Protocol for retrieving relevant memories for a given context
/// 
/// Implementations search stored memories and return the most relevant ones
/// to inject into LLM context for personalized responses.
public protocol MemoryRetriever: Sendable {
    /// Retrieve relevant memories for a user prompt
    /// - Parameters:
    ///   - prompt: The user's message/prompt
    ///   - conversationID: Optional conversation ID to prioritize memories from same conversation
    ///   - limit: Maximum number of memories to return
    /// - Returns: Array of relevant memories, sorted by relevance
    func retrieve(for prompt: String, conversationID: UUID?, limit: Int) async throws -> [MemoryDTO]
}

/// Configuration for memory retrieval scoring
public struct MemoryRetrievalConfig: Sendable {
    /// Weight for keyword overlap score (0-1 match ratio)
    public let keywordWeight: Double
    
    /// Weight for importance score (1-10)
    public let importanceWeight: Double
    
    /// Weight for recency score (decays over time)
    public let recencyWeight: Double
    
    /// Recency decay rate (points lost per day)
    public let recencyDecayPerDay: Double
    
    /// Weight for access frequency score
    public let frequencyWeight: Double
    
    /// Bonus points for same conversation
    public let conversationBonus: Double
    
    /// Search expansion factor (fetch N*factor, then score and trim)
    public let searchExpansionFactor: Int
    
    public init(
        keywordWeight: Double = 100.0,
        importanceWeight: Double = 1.0,
        recencyWeight: Double = 20.0,
        recencyDecayPerDay: Double = 1.0,
        frequencyWeight: Double = 0.5,
        conversationBonus: Double = 20.0,
        searchExpansionFactor: Int = 3
    ) {
        self.keywordWeight = keywordWeight
        self.importanceWeight = importanceWeight
        self.recencyWeight = recencyWeight
        self.recencyDecayPerDay = recencyDecayPerDay
        self.frequencyWeight = frequencyWeight
        self.conversationBonus = conversationBonus
        self.searchExpansionFactor = searchExpansionFactor
    }
    
    public static let `default` = MemoryRetrievalConfig()
}

/// Keyword-based memory retriever
/// 
/// Finds relevant memories by:
/// 1. Extracting keywords from the user's prompt
/// 2. Searching for memories with matching keywords
/// 3. Scoring memories by relevance (keyword overlap + importance + recency + frequency)
/// 4. Updating access statistics for retrieved memories
public final class KeywordMemoryRetriever: MemoryRetriever {
    private let repository: MemoryRepository
    private let config: MemoryRetrievalConfig
    
    // Common stopwords to filter out
    private let stopwords = Set([
        "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
        "been", "being", "have", "has", "had", "do", "does", "did", "will",
        "would", "should", "could", "may", "might", "must", "can", "what",
        "when", "where", "who", "why", "how", "i", "you", "me", "my"
    ])
    
    public init(repository: MemoryRepository, config: MemoryRetrievalConfig = .default) {
        self.repository = repository
        self.config = config
    }
    
    public func retrieve(for prompt: String, conversationID: UUID?, limit: Int) async throws -> [MemoryDTO] {
        // 1. Extract keywords from prompt
        let keywords = extractKeywords(from: prompt)
        
        guard !keywords.isEmpty else {
            AppLogger.debug("No keywords extracted from prompt, skipping memory retrieval", category: AppLogger.storage)
            return []
        }
        
        AppLogger.debug("Extracted keywords for memory search: \(keywords)", category: AppLogger.storage)
        
        // 2. Search repository (get more than needed for scoring)
        let searchLimit = limit * config.searchExpansionFactor
        let memories = try await repository.search(keywords: keywords, limit: searchLimit)
        
        guard !memories.isEmpty else {
            AppLogger.debug("No memories found matching keywords", category: AppLogger.storage)
            return []
        }
        
        // 3. Score memories by relevance
        let scoredMemories = scoreMemories(memories, against: keywords, conversationID: conversationID)
        
        // 4. Take top N
        let topMemories = Array(scoredMemories.prefix(limit))
        
        // 5. Update access stats asynchronously (don't block on this)
        Task {
            for memory in topMemories {
                try? await repository.updateAccessStats(id: memory.id)
            }
        }
        
        AppLogger.debug("Retrieved \(topMemories.count) relevant memories", category: AppLogger.storage)
        return topMemories
    }
    
    // MARK: - Keyword Extraction
    
    private func extractKeywords(from text: String) -> [String] {
        // Tokenize and filter
        let words = text
            .lowercased()
            .components(separatedBy: .whitespacesAndNewlines)
            .map { $0.trimmingCharacters(in: .punctuationCharacters) }
            .filter { !$0.isEmpty && !stopwords.contains($0) && $0.count > 2 }
        
        // Return unique keywords, limited to 10 most relevant
        let unique = Array(Set(words))
        
        // Prioritize longer words (often more specific/meaningful)
        let sorted = unique.sorted { $0.count > $1.count }
        
        return Array(sorted.prefix(10))
    }
    
    // MARK: - Relevance Scoring
    
    private func scoreMemories(
        _ memories: [MemoryDTO],
        against keywords: [String],
        conversationID: UUID?
    ) -> [MemoryDTO] {
        let now = Date()
        
        // Calculate scores for each memory
        let scored: [(memory: MemoryDTO, score: Double)] = memories.map { memory in
            var score: Double = 0.0
            
            // 1. Keyword overlap score (weighted)
            let keywordScore = calculateKeywordOverlap(memory: memory, keywords: keywords)
            score += keywordScore * config.keywordWeight
            
            // 2. Importance score (weighted)
            score += Double(memory.importance) * config.importanceWeight
            
            // 3. Recency score (weighted, decays over time)
            let daysSinceAccess = now.timeIntervalSince(memory.lastAccessedAt) / 86400 // seconds to days
            let recencyScore = max(0, config.recencyWeight - (daysSinceAccess * config.recencyDecayPerDay))
            score += recencyScore
            
            // 4. Frequency score (weighted, capped at 10 uses)
            let frequencyScore = min(10, Double(memory.accessCount)) * config.frequencyWeight
            score += frequencyScore
            
            // 5. Conversation match bonus
            if let conversationID = conversationID, memory.conversationID == conversationID {
                score += config.conversationBonus
            }
            
            return (memory: memory, score: score)
        }
        
        // Sort by score descending
        return scored
            .sorted { $0.score > $1.score }
            .map { $0.memory }
    }
    
    private func calculateKeywordOverlap(memory: MemoryDTO, keywords: [String]) -> Double {
        let memoryKeywords = Set(memory.keywords.map { $0.lowercased() })
        let searchKeywords = Set(keywords.map { $0.lowercased() })
        
        // Count how many search keywords appear in memory keywords
        var matches = 0
        for searchKeyword in searchKeywords {
            // Exact match
            if memoryKeywords.contains(searchKeyword) {
                matches += 1
                continue
            }
            
            // Partial match (search keyword is substring of memory keyword)
            for memoryKeyword in memoryKeywords {
                if memoryKeyword.contains(searchKeyword) || searchKeyword.contains(memoryKeyword) {
                    matches += 1
                    break
                }
            }
        }
        
        // Return overlap ratio (0.0 to 1.0)
        guard !searchKeywords.isEmpty else { return 0.0 }
        return Double(matches) / Double(searchKeywords.count)
    }
}

