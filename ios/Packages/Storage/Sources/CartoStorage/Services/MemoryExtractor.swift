import Foundation

/// Represents a memory extracted from conversation
public struct ExtractedMemory: Sendable, Equatable {
    public let content: String
    public let keywords: [String]
    public let importance: Int
    public let isCorrection: Bool // True if this memory corrects previous information
    
    public init(content: String, keywords: [String], importance: Int, isCorrection: Bool = false) {
        self.content = content
        self.keywords = keywords
        self.importance = importance
        self.isCorrection = isCorrection
    }
}

/// Protocol for extracting memories from chat messages
/// 
/// Implementations analyze conversation patterns to identify facts, preferences,
/// and important information worth remembering for future context.
public protocol MemoryExtractor: Sendable {
    /// Extract memories from a list of chat messages
    /// - Parameter messages: Array of messages to analyze (user and assistant)
    /// - Returns: Array of extracted memories
    func extractMemories(from messages: [ChatMessageForExtraction]) async -> [ExtractedMemory]
}

/// Message role for extraction
public enum MessageRole: String, Sendable, Codable {
    case user
    case assistant
    case system
}

/// Lightweight message representation for memory extraction
/// This avoids coupling to FeatureChat's ChatMessage type
public struct ChatMessageForExtraction: Sendable {
    public let role: MessageRole
    public let text: String
    public let createdAt: Date
    
    public init(role: MessageRole, text: String, createdAt: Date) {
        self.role = role
        self.text = text
        self.createdAt = createdAt
    }
}

/// Keyword-based memory extractor
/// 
/// Identifies memory-worthy statements using pattern matching:
/// - Personal information: "I am...", "My name is...", "I live in..."
/// - Preferences: "I like...", "I prefer...", "I hate..."
/// - Explicit memory requests: "Remember that...", "Don't forget..."
/// - Corrections: "Actually...", "I meant..."
/// - Repeated questions (indicates importance)
public final class KeywordMemoryExtractor: MemoryExtractor {
    
    // MARK: - Pattern Definitions (Regex for accuracy)
    
    private let reIAm: NSRegularExpression
    private let reIm: NSRegularExpression
    private let reMyNameIs: NSRegularExpression
    private let reLiveIn: NSRegularExpression
    private let reWorkAs: NSRegularExpression
    
    private let reILike: NSRegularExpression
    private let reILove: NSRegularExpression
    private let reIPrefer: NSRegularExpression
    private let reIHate: NSRegularExpression
    private let reIDislike: NSRegularExpression
    private let reIEnjoy: NSRegularExpression
    private let reDontLike: NSRegularExpression
    
    private let reRememberThat: NSRegularExpression
    private let reDontForget: NSRegularExpression
    private let reKeepInMind: NSRegularExpression
    private let reNoteThat: NSRegularExpression
    
    private let reActually: NSRegularExpression
    private let reIMeant: NSRegularExpression
    private let reToClarify: NSRegularExpression
    
    // Common stopwords to filter out from keywords
    private let stopwords = Set([
        "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for",
        "of", "with", "by", "from", "as", "is", "was", "are", "were", "be",
        "been", "being", "have", "has", "had", "do", "does", "did", "will",
        "would", "should", "could", "may", "might", "must", "can", "i", "you",
        "he", "she", "it", "we", "they", "my", "your", "his", "her", "its",
        "our", "their", "this", "that", "these", "those"
    ])
    
    public init() {
        // Initialize regex patterns with word boundaries
        self.reIAm = try! NSRegularExpression(pattern: #"\bi\s+am\b"#, options: .caseInsensitive)
        self.reIm = try! NSRegularExpression(pattern: #"\bi['']m\b"#, options: .caseInsensitive)
        self.reMyNameIs = try! NSRegularExpression(pattern: #"\bmy\s+name\s+is\b"#, options: .caseInsensitive)
        self.reLiveIn = try! NSRegularExpression(pattern: #"\bi\s+live\s+in\b"#, options: .caseInsensitive)
        self.reWorkAs = try! NSRegularExpression(pattern: #"\bi\s+work\s+as\b"#, options: .caseInsensitive)
        
        self.reILike = try! NSRegularExpression(pattern: #"\bi\s+like\b"#, options: .caseInsensitive)
        self.reILove = try! NSRegularExpression(pattern: #"\bi\s+love\b"#, options: .caseInsensitive)
        self.reIPrefer = try! NSRegularExpression(pattern: #"\bi\s+prefer\b"#, options: .caseInsensitive)
        self.reIHate = try! NSRegularExpression(pattern: #"\bi\s+hate\b"#, options: .caseInsensitive)
        self.reIDislike = try! NSRegularExpression(pattern: #"\bi\s+dislike\b"#, options: .caseInsensitive)
        self.reIEnjoy = try! NSRegularExpression(pattern: #"\bi\s+enjoy\b"#, options: .caseInsensitive)
        self.reDontLike = try! NSRegularExpression(pattern: #"\bi\s+don['']t\s+like\b"#, options: .caseInsensitive)
        
        self.reRememberThat = try! NSRegularExpression(pattern: #"\bremember\s+that\b"#, options: .caseInsensitive)
        self.reDontForget = try! NSRegularExpression(pattern: #"\bdon['']t\s+forget\b"#, options: .caseInsensitive)
        self.reKeepInMind = try! NSRegularExpression(pattern: #"\bkeep\s+in\s+mind\b"#, options: .caseInsensitive)
        self.reNoteThat = try! NSRegularExpression(pattern: #"\bnote\s+that\b"#, options: .caseInsensitive)
        
        self.reActually = try! NSRegularExpression(pattern: #"\bactually\b"#, options: .caseInsensitive)
        self.reIMeant = try! NSRegularExpression(pattern: #"\bi\s+meant\b"#, options: .caseInsensitive)
        self.reToClarify = try! NSRegularExpression(pattern: #"\bto\s+clarify\b"#, options: .caseInsensitive)
    }
    
    public func extractMemories(from messages: [ChatMessageForExtraction]) async -> [ExtractedMemory] {
        var memories: [ExtractedMemory] = []
        
        // Only analyze recent messages (last 10)
        // Use suffix to get the LATEST 10 messages, not the first 10
        let recentMessages = Array(messages.suffix(10))
        
        for message in recentMessages where message.role == .user {
            let text = message.text // Keep original casing
            
            // Check if this is a correction first
            let isCorrection = containsCorrectionPattern(text)
            
            // Check each pattern category
            if let memory = extractPersonalInfo(from: text, isCorrection: isCorrection) {
                memories.append(memory)
            }
            
            if let memory = extractPreference(from: text, isCorrection: isCorrection) {
                memories.append(memory)
            }
            
            if let memory = extractExplicitMemory(from: text, isCorrection: isCorrection) {
                memories.append(memory)
            }
            
            // Always extract correction statement itself
            if isCorrection, let memory = extractCorrection(from: text) {
                memories.append(memory)
            }
        }
        
        // Deduplicate similar memories
        return deduplicateMemories(memories)
    }
    
    // MARK: - Correction Detection
    
    private func containsCorrectionPattern(_ text: String) -> Bool {
        let patterns = [reActually, reIMeant, reToClarify]
        return patterns.contains { regex in
            regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) != nil
        }
    }
    
    // MARK: - Pattern Extraction
    
    private func extractPersonalInfo(from text: String, isCorrection: Bool) -> ExtractedMemory? {
        let patterns: [(NSRegularExpression, String)] = [
            (reIAm, "I am"),
            (reIm, "I'm"),
            (reMyNameIs, "My name is"),
            (reLiveIn, "I live in"),
            (reWorkAs, "I work as")
        ]
        
        for (regex, prefix) in patterns {
            if let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) {
                let matchEnd = text.index(text.startIndex, offsetBy: match.range.upperBound)
                let remainingText = String(text[matchEnd...])
                
                // Extract until punctuation or end (limit by word count)
                let content = extractSentence(from: remainingText, maxWords: 20)
                guard !content.isEmpty else { continue }
                
                // Format: "User: I am a software engineer" (preserve original casing)
                let fullContent = "User: \(prefix) \(content)"
                let keywords = extractKeywords(from: fullContent)
                
                return ExtractedMemory(
                    content: fullContent,
                    keywords: keywords,
                    importance: 8, // Personal info is high importance
                    isCorrection: isCorrection
                )
            }
        }
        return nil
    }
    
    private func extractPreference(from text: String, isCorrection: Bool) -> ExtractedMemory? {
        let patterns: [(NSRegularExpression, String)] = [
            (reILike, "I like"),
            (reILove, "I love"),
            (reIPrefer, "I prefer"),
            (reIHate, "I hate"),
            (reIDislike, "I dislike"),
            (reIEnjoy, "I enjoy"),
            (reDontLike, "I don't like")
        ]
        
        for (regex, prefix) in patterns {
            if let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) {
                let matchEnd = text.index(text.startIndex, offsetBy: match.range.upperBound)
                let remainingText = String(text[matchEnd...])
                
                let content = extractSentence(from: remainingText, maxWords: 20)
                guard !content.isEmpty else { continue }
                
                let fullContent = "User preference: \(prefix) \(content)"
                let keywords = extractKeywords(from: fullContent)
                
                return ExtractedMemory(
                    content: fullContent,
                    keywords: keywords,
                    importance: 7, // Preferences are important
                    isCorrection: isCorrection
                )
            }
        }
        return nil
    }
    
    private func extractExplicitMemory(from text: String, isCorrection: Bool) -> ExtractedMemory? {
        let patterns: [(NSRegularExpression, String)] = [
            (reRememberThat, "Remember:"),
            (reDontForget, "Don't forget:"),
            (reKeepInMind, "Keep in mind:"),
            (reNoteThat, "Note:")
        ]
        
        for (regex, prefix) in patterns {
            if let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) {
                let matchEnd = text.index(text.startIndex, offsetBy: match.range.upperBound)
                let remainingText = String(text[matchEnd...])
                
                let content = extractSentence(from: remainingText, maxWords: 20)
                guard !content.isEmpty else { continue }
                
                let fullContent = "\(prefix) \(content)"
                let keywords = extractKeywords(from: fullContent)
                
                return ExtractedMemory(
                    content: fullContent,
                    keywords: keywords,
                    importance: 9, // Explicit requests are highest importance
                    isCorrection: isCorrection
                )
            }
        }
        return nil
    }
    
    private func extractCorrection(from text: String) -> ExtractedMemory? {
        let patterns: [(NSRegularExpression, String)] = [
            (reActually, "Actually:"),
            (reIMeant, "Correction:"),
            (reToClarify, "To clarify:")
        ]
        
        for (regex, prefix) in patterns {
            if let match = regex.firstMatch(in: text, range: NSRange(text.startIndex..., in: text)) {
                let matchEnd = text.index(text.startIndex, offsetBy: match.range.upperBound)
                let remainingText = String(text[matchEnd...])
                
                let content = extractSentence(from: remainingText, maxWords: 20)
                guard !content.isEmpty else { continue }
                
                let fullContent = "\(prefix) \(content)"
                let keywords = extractKeywords(from: fullContent)
                
                return ExtractedMemory(
                    content: fullContent,
                    keywords: keywords,
                    importance: 8, // Corrections are important
                    isCorrection: true // This is always a correction
                )
            }
        }
        return nil
    }
    
    // MARK: - Helper Methods
    
    private func extractSentence(from text: String, maxWords: Int = 20) -> String {
        let trimmed = text.trimmingCharacters(in: .whitespaces)
        
        // Find the end of the sentence (., !, ?, or end of string)
        let punctuation = CharacterSet(charactersIn: ".!?")
        
        var result = trimmed
        if let endRange = trimmed.rangeOfCharacter(from: punctuation) {
            result = String(trimmed[..<endRange.lowerBound]).trimmingCharacters(in: .whitespaces)
        }
        
        // Limit by word count to avoid chopping mid-token
        let words = result.components(separatedBy: .whitespaces).filter { !$0.isEmpty }
        if words.count > maxWords {
            result = words.prefix(maxWords).joined(separator: " ")
        }
        
        return result
    }
    
    private func extractKeywords(from text: String) -> [String] {
        // Tokenize and filter
        let words = text
            .lowercased()
            .components(separatedBy: .whitespacesAndNewlines)
            .map { $0.trimmingCharacters(in: .punctuationCharacters) }
            .filter { !$0.isEmpty && !stopwords.contains($0) && $0.count > 2 }
        
        // Return unique keywords, limited to 10
        return Array(Set(words)).prefix(10).map { $0 }
    }
    
    private func deduplicateMemories(_ memories: [ExtractedMemory]) -> [ExtractedMemory] {
        var seen = Set<String>()
        var unique: [ExtractedMemory] = []
        
        for memory in memories {
            // Use content as deduplication key
            let key = memory.content.lowercased()
            if !seen.contains(key) {
                seen.insert(key)
                unique.append(memory)
            }
        }
        
        return unique
    }
}

