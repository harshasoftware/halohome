import Foundation

// MARK: - Journal Repository Protocol

/// Protocol for journal entry persistence
/// Implemented by the integration layer using Supabase
public protocol JournalRepositoryProtocol: Sendable {
    /// Load all journal entries for the current user
    func loadEntries() async throws -> [JournalEntry]

    /// Create a new journal entry
    func createEntry(_ entry: JournalEntry) async throws -> JournalEntry

    /// Update an existing journal entry
    func updateEntry(_ entry: JournalEntry) async throws -> JournalEntry

    /// Delete a journal entry by ID
    func deleteEntry(id: UUID) async throws
}

// MARK: - Journal Repository Errors

public enum JournalRepositoryError: Error, LocalizedError {
    case notAuthenticated
    case entryNotFound
    case networkError(String)
    case decodingError(String)

    public var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "You must be signed in to use the journal"
        case .entryNotFound:
            return "Journal entry not found"
        case .networkError(let message):
            return "Network error: \(message)"
        case .decodingError(let message):
            return "Data error: \(message)"
        }
    }
}
