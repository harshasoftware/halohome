import Foundation
import Core

/// Hybrid repository that syncs between local SwiftData and Supabase
/// - Writes to both local and remote (with fallback to local-only if remote fails)
/// - Reads from local (fast) and syncs from remote in background
/// - Provides offline-first experience with cloud sync
@available(iOS 17.0, macOS 14.0, *)
public final class HybridConversationRepository: ConversationRepository {
    
    private let local: ConversationRepository
    private let remote: ConversationRepository?
    private let syncEnabled: Bool
    
    /// Initialize hybrid repository
    /// - Parameters:
    ///   - local: Local SwiftData repository (always used)
    ///   - remote: Optional Supabase repository (for sync)
    public init(local: ConversationRepository, remote: ConversationRepository? = nil) {
        self.local = local
        self.remote = remote
        self.syncEnabled = remote != nil
    }
    
    public func create(title: String, personaName: String?) async throws -> ConversationDTO {
        // Create locally first (offline-first)
        let localConversation = try await local.create(title: title, personaName: personaName)
        
        // Sync to remote if available
        if syncEnabled, let remote = remote {
            Task {
                do {
                    _ = try await remote.create(title: title, personaName: personaName)
                    AppLogger.debug("Synced new conversation to remote", category: AppLogger.storage)
                } catch {
                    AppLogger.error("Failed to sync conversation to remote (local saved): \(error)", category: AppLogger.storage)
                }
            }
        }
        
        return localConversation
    }
    
    public func rename(id: UUID, title: String) async throws {
        // Update locally first
        try await local.rename(id: id, title: title)
        
        // Sync to remote if available
        if syncEnabled, let remote = remote {
            Task {
                do {
                    try await remote.rename(id: id, title: title)
                    AppLogger.debug("Synced conversation rename to remote", category: AppLogger.storage)
                } catch {
                    AppLogger.error("Failed to sync rename to remote (local updated): \(error)", category: AppLogger.storage)
                }
            }
        }
    }
    
    public func delete(id: UUID) async throws {
        // Delete locally first
        try await local.delete(id: id)
        
        // Sync deletion to remote if available
        if syncEnabled, let remote = remote {
            Task {
                do {
                    try await remote.delete(id: id)
                    AppLogger.debug("Synced conversation deletion to remote", category: AppLogger.storage)
                } catch {
                    AppLogger.error("Failed to sync deletion to remote (local deleted): \(error)", category: AppLogger.storage)
                }
            }
        }
    }
    
    public func list(limit: Int, after: Date?) async throws -> [ConversationDTO] {
        // Always return local data for fast response
        let localConversations = try await local.list(limit: limit, after: after)
        
        // Sync from remote in background (pull changes from other devices)
        if syncEnabled, let remote = remote, after == nil { // Only sync on initial load
            Task {
                do {
                    let remoteConversations = try await remote.list(limit: 100, after: nil)
                    await syncRemoteToLocal(remoteConversations)
                } catch {
                    AppLogger.error("Failed to sync conversations from remote: \(error)", category: AppLogger.storage)
                }
            }
        }
        
        return localConversations
    }
    
    /// Sync remote conversations to local storage
    /// Implements last-write-wins conflict resolution
    private func syncRemoteToLocal(_ remoteConversations: [ConversationDTO]) async {
        do {
            let localConversations = try await local.list(limit: 1000, after: nil)
            let localMap = Dictionary(uniqueKeysWithValues: localConversations.map { ($0.id, $0) })
            
            for remote in remoteConversations {
                if let local = localMap[remote.id] {
                    // Conversation exists locally - check if remote is newer
                    if remote.updatedAt > local.updatedAt {
                        try await self.local.rename(id: remote.id, title: remote.title)
                        AppLogger.debug("Updated local conversation from remote: \(remote.id)", category: AppLogger.storage)
                    }
                } else {
                    // New conversation from another device - create locally
                    _ = try await self.local.create(title: remote.title, personaName: remote.personaName)
                    AppLogger.debug("Created local conversation from remote: \(remote.id)", category: AppLogger.storage)
                }
            }
        } catch {
            AppLogger.error("Failed to sync remote conversations to local: \(error)", category: AppLogger.storage)
        }
    }
}

