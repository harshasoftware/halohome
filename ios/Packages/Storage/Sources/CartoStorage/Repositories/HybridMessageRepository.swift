import Foundation
import Core

/// Hybrid repository that syncs between local SwiftData and Supabase
/// - Writes to both local and remote (with fallback to local-only if remote fails)
/// - Reads from local (fast) and syncs from remote in background
/// - Provides offline-first experience with cloud sync
@available(iOS 17.0, macOS 14.0, *)
public final class HybridMessageRepository: MessageRepository {
    
    private let local: MessageRepository
    private let remote: MessageRepository?
    private let syncEnabled: Bool
    
    /// Initialize hybrid repository
    /// - Parameters:
    ///   - local: Local SwiftData repository (always used)
    ///   - remote: Optional Supabase repository (for sync)
    public init(local: MessageRepository, remote: MessageRepository? = nil) {
        self.local = local
        self.remote = remote
        self.syncEnabled = remote != nil
    }
    
    public func append(conversationID: UUID, role: MessageDTO.Role, text: String, createdAt: Date) async throws -> MessageDTO {
        // Append locally first (offline-first)
        let localMessage = try await local.append(conversationID: conversationID, role: role, text: text, createdAt: createdAt)
        
        // Sync to remote if available
        if syncEnabled, let remote = remote {
            Task {
                do {
                    _ = try await remote.append(conversationID: conversationID, role: role, text: text, createdAt: createdAt)
                    AppLogger.debug("Synced new message to remote", category: AppLogger.storage)
                } catch {
                    AppLogger.error("Failed to sync message to remote (local saved): \(error)", category: AppLogger.storage)
                }
            }
        }
        
        return localMessage
    }
    
    public func page(conversationID: UUID, after: MessageCursor?, limit: Int) async throws -> (items: [MessageDTO], next: MessageCursor?) {
        // Always return local data for fast response
        let localPage = try await local.page(conversationID: conversationID, after: after, limit: limit)
        
        // Sync from remote in background (pull changes from other devices)
        if syncEnabled, let remote = remote, after == nil { // Only sync on initial load
            Task {
                do {
                    let remotePage = try await remote.page(conversationID: conversationID, after: nil, limit: 100)
                    await syncRemoteToLocal(conversationID: conversationID, remoteMessages: remotePage.items)
                } catch {
                    AppLogger.error("Failed to sync messages from remote: \(error)", category: AppLogger.storage)
                }
            }
        }
        
        return localPage
    }
    
    public func deleteAll(in conversationID: UUID) async throws {
        // Delete locally first
        try await local.deleteAll(in: conversationID)
        
        // Sync deletion to remote if available
        if syncEnabled, let remote = remote {
            Task {
                do {
                    try await remote.deleteAll(in: conversationID)
                    AppLogger.debug("Synced message deletion to remote", category: AppLogger.storage)
                } catch {
                    AppLogger.error("Failed to sync message deletion to remote (local deleted): \(error)", category: AppLogger.storage)
                }
            }
        }
    }
    
    public func batchDelete(messageIDs: [UUID]) async throws {
        // Delete locally first
        try await local.batchDelete(messageIDs: messageIDs)
        
        // Sync deletion to remote if available
        if syncEnabled, let remote = remote {
            Task {
                do {
                    try await remote.batchDelete(messageIDs: messageIDs)
                    AppLogger.debug("Synced batch message deletion to remote", category: AppLogger.storage)
                } catch {
                    AppLogger.error("Failed to sync batch deletion to remote (local deleted): \(error)", category: AppLogger.storage)
                }
            }
        }
    }
    
    /// Sync remote messages to local storage
    /// New messages from other devices are added to local storage
    private func syncRemoteToLocal(conversationID: UUID, remoteMessages: [MessageDTO]) async {
        do {
            let localPage = try await local.page(conversationID: conversationID, after: nil, limit: 1000)
            let localIDs = Set(localPage.items.map { $0.id })
            
            // Add messages that don't exist locally (from other devices)
            for remote in remoteMessages {
                if !localIDs.contains(remote.id) {
                    _ = try await local.append(
                        conversationID: conversationID,
                        role: remote.role,
                        text: remote.text,
                        createdAt: remote.createdAt
                    )
                    AppLogger.debug("Synced message from remote to local: \(remote.id)", category: AppLogger.storage)
                }
            }
        } catch {
            AppLogger.error("Failed to sync remote messages to local: \(error)", category: AppLogger.storage)
        }
    }
}

