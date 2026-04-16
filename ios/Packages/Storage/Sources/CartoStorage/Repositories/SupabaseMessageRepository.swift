import Foundation
// import Supabase  // ← Uncomment when Supabase dependency is added
import Core

/// Supabase implementation of MessageRepository
/// Syncs messages to Supabase backend for cross-device access
///
/// **Setup Required:**
/// 1. Run migration: supabase/migrations/20241016000000_chat_sync.sql
/// 2. Add Supabase dependency to Storage/Package.swift
/// 3. Uncomment the Supabase import above
/// 4. See docs/CHAT_SYNC_SETUP.md for complete setup instructions
///
/// **Note:** This implementation is commented out until Supabase is configured.
/// Use MessageRepositoryImpl (SwiftData) for local-only storage.
/*
public final class SupabaseMessageRepository: MessageRepository {
    
    private let supabaseClient: SupabaseClient
    private let userId: String
    private let deviceId: String
    
    public init(supabaseClient: SupabaseClient, userId: String) {
        self.supabaseClient = supabaseClient
        self.userId = userId
        self.deviceId = UIDevice.current.identifierForVendor?.uuidString ?? "unknown"
    }
    
    public func append(conversationID: UUID, role: MessageDTO.Role, text: String, createdAt: Date) async throws -> MessageDTO {
        guard !text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            AppLogger.error("Attempted to append empty message", category: AppLogger.storage)
            throw StorageError.validation("Message cannot be empty")
        }
        
        do {
            let message = MessageCreate(
                conversation_id: conversationID.uuidString,
                user_id: userId,
                role: role.rawValue,
                content: text,
                timestamp: ISO8601DateFormatter().string(from: createdAt),
                device_id: deviceId
            )
            
            let response: MessageRow = try await supabaseClient.database
                .from("messages")
                .insert(message)
                .select()
                .single()
                .execute()
                .value
            
            // Update conversation's updated_at
            try await supabaseClient.database
                .from("conversations")
                .update(["updated_at": ISO8601DateFormatter().string(from: Date())])
                .eq("id", value: conversationID.uuidString)
                .execute()
            
            AppLogger.info("Appended message to Supabase conversation: \(conversationID)", category: AppLogger.storage)
            return response.toDTO()
            
        } catch {
            AppLogger.error("Failed to append message to Supabase: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func page(conversationID: UUID, after: MessageCursor?, limit: Int) async throws -> (items: [MessageDTO], next: MessageCursor?) {
        do {
            var query = supabaseClient.database
                .from("messages")
                .select()
                .eq("conversation_id", value: conversationID.uuidString)
                .order("timestamp", ascending: false)
                .order("id", ascending: false)
                .limit(limit + 1) // Fetch one extra to determine if there's more
            
            // Apply cursor pagination
            if let cursor = after, let cursorDate = cursor.createdAt, let cursorID = cursor.id {
                let isoDate = ISO8601DateFormatter().string(from: cursorDate)
                query = query.or("timestamp.lt.\(isoDate),and(timestamp.eq.\(isoDate),id.lt.\(cursorID.uuidString))")
            }
            
            let messages: [MessageRow] = try await query
                .execute()
                .value
            
            // Determine next cursor
            let hasMore = messages.count > limit
            let items = Array(messages.prefix(limit))
            let nextCursor: MessageCursor? = hasMore && !items.isEmpty ?
                MessageCursor(createdAt: items.last?.timestamp, id: items.last?.id) : nil
            
            AppLogger.info("Fetched \(items.count) messages from Supabase for conversation: \(conversationID)", category: AppLogger.storage)
            
            return (
                items: items.map { $0.toDTO() },
                next: nextCursor
            )
            
        } catch {
            AppLogger.error("Failed to page messages from Supabase: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func deleteAll(in conversationID: UUID) async throws {
        do {
            try await supabaseClient.database
                .from("messages")
                .delete()
                .eq("conversation_id", value: conversationID.uuidString)
                .eq("user_id", value: userId)
                .execute()
            
            // Update conversation's updated_at
            try await supabaseClient.database
                .from("conversations")
                .update(["updated_at": ISO8601DateFormatter().string(from: Date())])
                .eq("id", value: conversationID.uuidString)
                .execute()
            
            AppLogger.info("Deleted all messages from Supabase conversation: \(conversationID)", category: AppLogger.storage)
            
        } catch {
            AppLogger.error("Failed to delete messages from Supabase: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func batchDelete(messageIDs: [UUID]) async throws {
        guard !messageIDs.isEmpty else { return }
        
        do {
            let idStrings = messageIDs.map { $0.uuidString }
            try await supabaseClient.database
                .from("messages")
                .delete()
                .in("id", values: idStrings)
                .eq("user_id", value: userId)
                .execute()
            
            AppLogger.info("Batch deleted \(messageIDs.count) messages from Supabase", category: AppLogger.storage)
            
        } catch {
            AppLogger.error("Failed to batch delete messages from Supabase: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
}

// MARK: - Supabase Models

private struct MessageCreate: Encodable {
    let conversation_id: String
    let user_id: String
    let role: String
    let content: String
    let timestamp: String
    let device_id: String
}

private struct MessageRow: Decodable {
    let id: UUID
    let conversation_id: UUID
    let user_id: String
    let role: String
    let content: String
    let timestamp: Date
    let device_id: String?
    
    func toDTO() -> MessageDTO {
        return MessageDTO(
            id: id,
            role: MessageDTO.Role(rawValue: role) ?? .user,
            text: content,
            createdAt: timestamp
        )
    }
}
*/

