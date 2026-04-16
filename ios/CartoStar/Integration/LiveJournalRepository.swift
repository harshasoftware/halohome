import Foundation
import Networking
import Core
import FeatureJournaling

/// Supabase implementation of JournalRepositoryProtocol
/// Uses direct REST API calls to the journal_entries table
@available(iOS 17.0, *)
public final class LiveJournalRepository: JournalRepositoryProtocol, @unchecked Sendable {

    private let httpClient: HTTPClient
    private let supabaseURL: URL
    private let supabaseAnonKey: String
    private let accessTokenProvider: @Sendable () -> String?
    private let userIdProvider: @Sendable () async -> String?

    public init(
        httpClient: HTTPClient,
        supabaseURL: URL,
        supabaseAnonKey: String,
        accessTokenProvider: @escaping @Sendable () -> String?,
        userIdProvider: @escaping @Sendable () async -> String?
    ) {
        self.httpClient = httpClient
        self.supabaseURL = supabaseURL
        self.supabaseAnonKey = supabaseAnonKey
        self.accessTokenProvider = accessTokenProvider
        self.userIdProvider = userIdProvider
    }

    // MARK: - JournalRepositoryProtocol

    public func loadEntries() async throws -> [JournalEntry] {
        guard let userId = await userIdProvider() else {
            throw JournalRepositoryError.notAuthenticated
        }

        guard let accessToken = accessTokenProvider() else {
            throw JournalRepositoryError.notAuthenticated
        }

        let request = HTTPRequest(
            path: "/rest/v1/journal_entries",
            method: .get,
            headers: makeHeaders(accessToken: accessToken),
            query: [
                "user_id": "eq.\(userId)",
                "order": "created_at.desc",
                "select": "*"
            ]
        )

        AppLogger.debug("Loading journal entries from Supabase", category: AppLogger.storage)

        let response = try await httpClient.send(request)

        guard response.statusCode >= 200 && response.statusCode < 300 else {
            throw mapError(statusCode: response.statusCode, data: response.data)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let entries = try decoder.decode([JournalEntry].self, from: response.data)

        AppLogger.info("Loaded \(entries.count) journal entries", category: AppLogger.storage)
        return entries
    }

    public func createEntry(_ entry: JournalEntry) async throws -> JournalEntry {
        guard let userId = await userIdProvider() else {
            throw JournalRepositoryError.notAuthenticated
        }

        guard let accessToken = accessTokenProvider() else {
            throw JournalRepositoryError.notAuthenticated
        }

        // Override userId with the authenticated user
        var entryToCreate = entry
        entryToCreate.userId = userId

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let bodyData = try encoder.encode(entryToCreate)

        var headers = makeHeaders(accessToken: accessToken)
        headers["Prefer"] = "return=representation"

        let request = HTTPRequest(
            path: "/rest/v1/journal_entries",
            method: .post,
            headers: headers,
            body: bodyData
        )

        AppLogger.debug("Creating journal entry for place: \(entry.placeName)", category: AppLogger.storage)

        let response = try await httpClient.send(request)

        guard response.statusCode >= 200 && response.statusCode < 300 else {
            throw mapError(statusCode: response.statusCode, data: response.data)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let rows = try decoder.decode([JournalEntry].self, from: response.data)
        guard let created = rows.first else {
            throw JournalRepositoryError.networkError("No data returned from insert")
        }

        AppLogger.info("Created journal entry: \(created.id)", category: AppLogger.storage)
        return created
    }

    public func updateEntry(_ entry: JournalEntry) async throws -> JournalEntry {
        guard let userId = await userIdProvider() else {
            throw JournalRepositoryError.notAuthenticated
        }

        guard let accessToken = accessTokenProvider() else {
            throw JournalRepositoryError.notAuthenticated
        }

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        let bodyData = try encoder.encode(entry)

        var headers = makeHeaders(accessToken: accessToken)
        headers["Prefer"] = "return=representation"

        let request = HTTPRequest(
            path: "/rest/v1/journal_entries",
            method: .patch,
            headers: headers,
            query: [
                "id": "eq.\(entry.id.uuidString)",
                "user_id": "eq.\(userId)"
            ],
            body: bodyData
        )

        AppLogger.debug("Updating journal entry: \(entry.id)", category: AppLogger.storage)

        let response = try await httpClient.send(request)

        guard response.statusCode >= 200 && response.statusCode < 300 else {
            throw mapError(statusCode: response.statusCode, data: response.data)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let rows = try decoder.decode([JournalEntry].self, from: response.data)
        guard let updated = rows.first else {
            throw JournalRepositoryError.entryNotFound
        }

        AppLogger.info("Updated journal entry: \(updated.id)", category: AppLogger.storage)
        return updated
    }

    public func deleteEntry(id: UUID) async throws {
        guard let userId = await userIdProvider() else {
            throw JournalRepositoryError.notAuthenticated
        }

        guard let accessToken = accessTokenProvider() else {
            throw JournalRepositoryError.notAuthenticated
        }

        let request = HTTPRequest(
            path: "/rest/v1/journal_entries",
            method: .delete,
            headers: makeHeaders(accessToken: accessToken),
            query: [
                "id": "eq.\(id.uuidString)",
                "user_id": "eq.\(userId)"
            ]
        )

        AppLogger.debug("Deleting journal entry: \(id)", category: AppLogger.storage)

        let response = try await httpClient.send(request)

        guard response.statusCode >= 200 && response.statusCode < 300 else {
            throw mapError(statusCode: response.statusCode, data: response.data)
        }

        AppLogger.info("Deleted journal entry: \(id)", category: AppLogger.storage)
    }

    // MARK: - Private Helpers

    private func makeHeaders(accessToken: String) -> [String: String] {
        [
            "apikey": supabaseAnonKey,
            "Authorization": "Bearer \(accessToken)",
            "Content-Type": "application/json"
        ]
    }

    private func mapError(statusCode: Int, data: Data) -> JournalRepositoryError {
        let message = String(data: data, encoding: .utf8)
        AppLogger.error("Journal API error (\(statusCode)): \(message ?? "no body")", category: AppLogger.storage)

        switch statusCode {
        case 401, 403:
            return .notAuthenticated
        case 404:
            return .entryNotFound
        default:
            return .networkError(message ?? "Server error (\(statusCode))")
        }
    }
}
