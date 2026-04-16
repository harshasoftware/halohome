import Foundation
// import Supabase  // ← Uncomment when Supabase dependency is added
import Core

/// Supabase implementation of ConversationRepository
/// Syncs conversations to Supabase backend for cross-device access
///
/// **Setup Required:**
/// 1. Run migration: supabase/migrations/20241016000000_chat_sync.sql
/// 2. Add Supabase dependency to Storage/Package.swift
/// 3. Uncomment the Supabase import above
/// 4. See docs/CHAT_SYNC_SETUP.md for complete setup instructions
///
/// **Note:** This implementation is commented out until Supabase is configured.
/// Use ConversationRepositoryImpl (SwiftData) for local-only storage.
/*
public final class SupabaseConversationRepository: ConversationRepository {
    
    private let supabaseClient: SupabaseClient
    private let userId: String
    private let deviceId: String
    
    public init(supabaseClient: SupabaseClient, userId: String) {
        self.supabaseClient = supabaseClient
        self.userId = userId
        self.deviceId = UIDevice.current.identifierForVendor?.uuidString ?? "unknown"
    }
    
    public func create(title: String, personaName: String?) async throws -> ConversationDTO {
        do {
            let conversation = ConversationCreate(
                user_id: userId,
                title: title,
                persona_name: personaName,
                device_id: deviceId
            )
            
            let response: ConversationRow = try await supabaseClient.database
                .from("conversations")
                .insert(conversation)
                .select()
                .single()
                .execute()
                .value
            
            AppLogger.info("Created conversation in Supabase: \(response.id)", category: AppLogger.storage)
            return response.toDTO()
            
        } catch {
            AppLogger.error("Failed to create conversation in Supabase: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func rename(id: UUID, title: String) async throws {
        do {
            try await supabaseClient.database
                .from("conversations")
                .update(["title": title])
                .eq("id", value: id.uuidString)
                .eq("user_id", value: userId)
                .execute()
            
            AppLogger.info("Renamed conversation in Supabase: \(id)", category: AppLogger.storage)
            
        } catch {
            AppLogger.error("Failed to rename conversation in Supabase: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func delete(id: UUID) async throws {
        do {
            try await supabaseClient.database
                .from("conversations")
                .delete()
                .eq("id", value: id.uuidString)
                .eq("user_id", value: userId)
                .execute()
            
            AppLogger.info("Deleted conversation from Supabase: \(id)", category: AppLogger.storage)
            
        } catch {
            AppLogger.error("Failed to delete conversation from Supabase: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
    
    public func list(limit: Int, after: Date?) async throws -> [ConversationDTO] {
        do {
            var query = supabaseClient.database
                .from("conversations")
                .select()
                .eq("user_id", value: userId)
                .order("updated_at", ascending: false)
                .limit(limit)
            
            if let after = after {
                let isoDate = ISO8601DateFormatter().string(from: after)
                query = query.lt("updated_at", value: isoDate)
            }
            
            let response: [ConversationRow] = try await query
                .execute()
                .value
            
            AppLogger.info("Fetched \(response.count) conversations from Supabase", category: AppLogger.storage)
            return response.map { $0.toDTO() }
            
        } catch {
            AppLogger.error("Failed to list conversations from Supabase: \(error)", category: AppLogger.storage)
            throw StorageError.underlying(error)
        }
    }
}

// MARK: - Supabase Models

private struct ConversationCreate: Encodable {
    let user_id: String
    let title: String
    let persona_name: String?
    let device_id: String
}

private struct ConversationRow: Decodable {
    let id: UUID
    let user_id: String
    let title: String
    let persona_name: String?
    let created_at: String
    let updated_at: String
    let device_id: String?
    
    func toDTO() -> ConversationDTO {
        let dateFormatter = ISO8601DateFormatter()
        return ConversationDTO(
            id: id,
            title: title,
            personaName: persona_name,
            createdAt: dateFormatter.date(from: created_at) ?? Date(),
            updatedAt: dateFormatter.date(from: updated_at) ?? Date()
        )
    }
}
*/

