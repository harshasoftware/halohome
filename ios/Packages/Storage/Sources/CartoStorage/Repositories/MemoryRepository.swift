import Foundation
import SwiftData
import Core

/// Protocol for managing memory persistence
/// 
/// Memories are facts, preferences, or important information that provide
/// personalized context for AI conversations.
public protocol MemoryRepository: Sendable {
    // MARK: - CRUD Operations
    
    /// Create a new memory
    func create(
        content: String,
        keywords: [String],
        importance: Int,
        conversationID: UUID?
    ) async throws -> MemoryDTO
    
    /// Find a single memory by ID
    func findOne(id: UUID) async throws -> MemoryDTO?
    
    /// List memories with pagination
    func findMany(limit: Int, after: Date?) async throws -> [MemoryDTO]
    
    /// Update an existing memory
    func update(id: UUID, content: String?, importance: Int?) async throws
    
    /// Delete a single memory
    func delete(id: UUID) async throws
    
    /// Delete all memories for a conversation
    func deleteAll(conversationID: UUID) async throws
    
    /// Delete all memories (clear everything)
    func deleteAll() async throws
    
    // MARK: - Search Operations
    
    /// Search memories by keywords
    /// Returns memories that match any of the provided keywords
    func search(keywords: [String], limit: Int) async throws -> [MemoryDTO]
    
    /// Search memories by conversation
    func searchByConversation(conversationID: UUID, limit: Int) async throws -> [MemoryDTO]
    
    // MARK: - Maintenance
    
    /// Update access statistics when a memory is used
    func updateAccessStats(id: UUID) async throws
    
    /// Find and delete conflicting memories based on overlapping keywords
    /// Used when corrections are detected to remove outdated information
    func deleteConflicting(keywords: [String], excludingContent: String, conversationID: UUID) async throws
}

/// Internal implementation using SwiftData
/// 
/// Note: All operations must be called from MainActor to ensure ModelContext thread-safety.
/// ModelContext is not thread-safe and must be accessed from the actor it was created on.
@available(iOS 17.0, macOS 14.0, *)
@MainActor
public final class MemoryRepositoryImpl: MemoryRepository {
    private let modelContext: ModelContext
    
    public init(modelContext: ModelContext) {
        self.modelContext = modelContext
    }
    
    // MARK: - CRUD Operations
    
    public func create(
        content: String,
        keywords: [String],
        importance: Int,
        conversationID: UUID?
    ) async throws -> MemoryDTO {
        return try await StorageRetry.withRetry {
            let memory = Memory(
                content: content,
                keywords: keywords,
                importance: importance,
                conversationID: conversationID
            )
            
            modelContext.insert(memory)
            
            do {
                try modelContext.save()
                AppLogger.debug("Created memory: \(memory.id)", category: AppLogger.storage)
                return MemoryDTO(memory)
            } catch {
                AppLogger.error("Failed to create memory: \(error)", category: AppLogger.storage)
                throw StorageError.underlying(error)
            }
        }
    }
    
    public func findOne(id: UUID) async throws -> MemoryDTO? {
        let descriptor = FetchDescriptor<Memory>(
            predicate: #Predicate { $0.id == id }
        )
        
        do {
            let memories = try modelContext.fetch(descriptor)
            let memory = memories.first
            
            if let memory = memory {
                AppLogger.debug("Found memory: \(id)", category: AppLogger.storage)
                return MemoryDTO(memory)
            } else {
                AppLogger.debug("Memory not found: \(id)", category: AppLogger.storage)
                return nil
            }
        } catch {
            AppLogger.error("Failed to find memory: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func findMany(limit: Int, after: Date?) async throws -> [MemoryDTO] {
        var descriptor = FetchDescriptor<Memory>(
            sortBy: [SortDescriptor(\.createdAt, order: .reverse)]
        )
        descriptor.fetchLimit = limit
        
        if let after = after {
            descriptor.predicate = #Predicate { $0.createdAt < after }
        }
        
        do {
            let memories = try modelContext.fetch(descriptor)
            AppLogger.debug("Fetched \(memories.count) memories", category: AppLogger.storage)
            return memories.map(MemoryDTO.init)
        } catch {
            AppLogger.error("Failed to list memories: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func update(id: UUID, content: String?, importance: Int?) async throws {
        let descriptor = FetchDescriptor<Memory>(
            predicate: #Predicate { $0.id == id }
        )
        
        guard let memory = try modelContext.fetch(descriptor).first else {
            AppLogger.error("Memory not found for update: \(id)", category: AppLogger.storage)
            throw StorageError.notFound
        }
        
        if let content = content {
            memory.content = content
        }
        
        if let importance = importance {
            memory.importance = importance
        }
        
        do {
            try modelContext.save()
            AppLogger.debug("Updated memory: \(id)", category: AppLogger.storage)
        } catch {
            AppLogger.error("Failed to update memory: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func delete(id: UUID) async throws {
        let descriptor = FetchDescriptor<Memory>(
            predicate: #Predicate { $0.id == id }
        )
        
        guard let memory = try modelContext.fetch(descriptor).first else {
            AppLogger.error("Memory not found for deletion: \(id)", category: AppLogger.storage)
            throw StorageError.notFound
        }
        
        modelContext.delete(memory)
        
        do {
            try modelContext.save()
            AppLogger.debug("Deleted memory: \(id)", category: AppLogger.storage)
        } catch {
            AppLogger.error("Failed to delete memory: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func deleteAll(conversationID: UUID) async throws {
        let descriptor = FetchDescriptor<Memory>(
            predicate: #Predicate { $0.conversationID == conversationID }
        )
        
        do {
            let memories = try modelContext.fetch(descriptor)
            for memory in memories {
                modelContext.delete(memory)
            }
            try modelContext.save()
            AppLogger.debug("Deleted \(memories.count) memories for conversation: \(conversationID)", category: AppLogger.storage)
        } catch {
            AppLogger.error("Failed to delete memories for conversation: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func deleteAll() async throws {
        let descriptor = FetchDescriptor<Memory>()
        
        do {
            let memories = try modelContext.fetch(descriptor)
            for memory in memories {
                modelContext.delete(memory)
            }
            try modelContext.save()
            AppLogger.debug("Deleted all \(memories.count) memories", category: AppLogger.storage)
        } catch {
            AppLogger.error("Failed to delete all memories: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    // MARK: - Search Operations
    
    public func search(keywords: [String], limit: Int) async throws -> [MemoryDTO] {
        // Convert keywords to lowercase for case-insensitive matching
        let lowercaseKeywords = keywords.map { $0.lowercased() }
        
        // Fetch all memories (we'll filter in memory for keyword matching)
        // Note: SwiftData predicates don't support array contains operations easily,
        // so we fetch and filter manually for keyword matching
        let descriptor = FetchDescriptor<Memory>(
            sortBy: [
                SortDescriptor(\.importance, order: .reverse),
                SortDescriptor(\.lastAccessedAt, order: .reverse)
            ]
        )
        
        do {
            let allMemories = try modelContext.fetch(descriptor)
            
            // Filter memories that contain any of the keywords
            let matchingMemories = allMemories.filter { memory in
                let memoryKeywords = memory.keywords.map { $0.lowercased() }
                return lowercaseKeywords.contains { keyword in
                    memoryKeywords.contains { $0.contains(keyword) }
                }
            }
            
            let limitedMemories = Array(matchingMemories.prefix(limit))
            AppLogger.debug("Found \(limitedMemories.count) memories matching keywords", category: AppLogger.storage)
            return limitedMemories.map(MemoryDTO.init)
        } catch {
            AppLogger.error("Failed to search memories: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func searchByConversation(conversationID: UUID, limit: Int) async throws -> [MemoryDTO] {
        var descriptor = FetchDescriptor<Memory>(
            predicate: #Predicate { $0.conversationID == conversationID },
            sortBy: [
                SortDescriptor(\.importance, order: .reverse),
                SortDescriptor(\.createdAt, order: .reverse)
            ]
        )
        descriptor.fetchLimit = limit
        
        do {
            let memories = try modelContext.fetch(descriptor)
            AppLogger.debug("Found \(memories.count) memories for conversation: \(conversationID)", category: AppLogger.storage)
            return memories.map(MemoryDTO.init)
        } catch {
            AppLogger.error("Failed to search memories by conversation: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    // MARK: - Maintenance
    
    public func updateAccessStats(id: UUID) async throws {
        let descriptor = FetchDescriptor<Memory>(
            predicate: #Predicate { $0.id == id }
        )
        
        guard let memory = try modelContext.fetch(descriptor).first else {
            AppLogger.error("Memory not found for access update: \(id)", category: AppLogger.storage)
            throw StorageError.notFound
        }
        
        memory.lastAccessedAt = Date()
        memory.accessCount += 1
        
        do {
            try modelContext.save()
            AppLogger.debug("Updated access stats for memory: \(id) (count: \(memory.accessCount))", category: AppLogger.storage)
        } catch {
            AppLogger.error("Failed to update access stats: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func deleteConflicting(keywords: [String], excludingContent: String, conversationID: UUID) async throws {
        guard !keywords.isEmpty else { return }
        
        // Fetch all memories for this conversation
        let descriptor = FetchDescriptor<Memory>(
            predicate: #Predicate { $0.conversationID == conversationID }
        )
        
        do {
            let memories = try modelContext.fetch(descriptor)
            
            // Find memories with overlapping keywords but different content
            let lowercaseKeywords = Set(keywords.map { $0.lowercased() })
            let excludeContentLower = excludingContent.lowercased()
            
            var deletedCount = 0
            for memory in memories {
                // Skip if it's the same memory (by content)
                if memory.content.lowercased() == excludeContentLower {
                    continue
                }
                
                // Check if memory has overlapping keywords
                let memoryKeywords = Set(memory.keywords.map { $0.lowercased() })
                let overlap = lowercaseKeywords.intersection(memoryKeywords)
                
                // If 50%+ keywords overlap, consider it conflicting
                if !overlap.isEmpty && Double(overlap.count) / Double(memoryKeywords.count) >= 0.5 {
                    modelContext.delete(memory)
                    deletedCount += 1
                    AppLogger.debug("Deleted conflicting memory: \(memory.content)", category: AppLogger.storage)
                }
            }
            
            if deletedCount > 0 {
                try modelContext.save()
                AppLogger.info("Deleted \(deletedCount) conflicting memories", category: AppLogger.storage)
            }
        } catch {
            AppLogger.error("Failed to delete conflicting memories: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
}

