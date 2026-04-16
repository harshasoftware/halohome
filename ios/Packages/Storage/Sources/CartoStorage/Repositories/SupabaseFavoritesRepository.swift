import Foundation
import Networking
import Core

/// Supabase implementation of FavoritesRepository
/// Uses direct REST API calls to the favorite_cities table
@available(iOS 17.0, *)
public final class SupabaseFavoritesRepository: FavoritesRepository, @unchecked Sendable {

    private let httpClient: HTTPClient
    private let supabaseURL: URL
    private let supabaseAnonKey: String
    private let accessTokenProvider: @Sendable () -> String?
    private let userIdProvider: @Sendable () async -> String?

    /// In-memory cache of favorites for fast lookups
    private var cachedFavorites: [FavoriteCity] = []
    private let cacheLock = NSLock()

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

    // MARK: - FavoritesRepository

    public func loadFavorites() async throws -> [FavoriteCity] {
        guard let userId = await userIdProvider() else {
            AppLogger.debug("No user ID, returning empty favorites", category: AppLogger.storage)
            return []
        }

        guard let accessToken = accessTokenProvider() else {
            throw FavoritesError.notAuthenticated
        }

        let request = HTTPRequest(
            path: "/rest/v1/favorite_cities",
            method: .get,
            headers: makeHeaders(accessToken: accessToken),
            query: [
                "user_id": "eq.\(userId)",
                "order": "created_at.desc",
                "select": "*"
            ]
        )

        AppLogger.debug("Loading favorites from Supabase", category: AppLogger.storage)

        let response = try await httpClient.send(request)

        guard response.statusCode >= 200 && response.statusCode < 300 else {
            throw mapError(statusCode: response.statusCode, data: response.data)
        }

        let rows = try JSONDecoder().decode([FavoriteCityRow].self, from: response.data)
        let favorites = rows.map { $0.toFavoriteCity() }

        // Update cache
        cacheLock.withLock { cachedFavorites = favorites }

        AppLogger.info("Loaded \(favorites.count) favorites", category: AppLogger.storage)
        return favorites
    }

    public func addFavorite(_ input: FavoriteCityInput) async throws -> FavoriteCity {
        guard let userId = await userIdProvider() else {
            throw FavoritesError.notAuthenticated
        }

        guard let accessToken = accessTokenProvider() else {
            throw FavoritesError.notAuthenticated
        }

        // Check for duplicate
        if let existing = await getFavoriteByLocation(latitude: input.latitude, longitude: input.longitude) {
            AppLogger.debug("Location already favorited: \(existing.id)", category: AppLogger.storage)
            return existing
        }

        let createBody = FavoriteCityCreate(
            user_id: userId,
            latitude: input.latitude,
            longitude: input.longitude,
            city_name: input.cityName,
            country: input.country,
            notes: input.notes
        )

        let bodyData = try JSONEncoder().encode(createBody)

        var headers = makeHeaders(accessToken: accessToken)
        headers["Prefer"] = "return=representation"

        let request = HTTPRequest(
            path: "/rest/v1/favorite_cities",
            method: .post,
            headers: headers,
            body: bodyData
        )

        AppLogger.debug("Adding favorite: \(input.cityName)", category: AppLogger.storage)

        let response = try await httpClient.send(request)

        guard response.statusCode >= 200 && response.statusCode < 300 else {
            throw mapError(statusCode: response.statusCode, data: response.data)
        }

        let rows = try JSONDecoder().decode([FavoriteCityRow].self, from: response.data)
        guard let row = rows.first else {
            throw FavoritesError.unexpected("No data returned from insert")
        }

        let favorite = row.toFavoriteCity()

        // Update cache
        cacheLock.withLock { cachedFavorites.insert(favorite, at: 0) }

        AppLogger.info("Added favorite: \(favorite.cityName)", category: AppLogger.storage)
        return favorite
    }

    public func removeFavorite(id: String) async throws {
        guard let accessToken = accessTokenProvider() else {
            throw FavoritesError.notAuthenticated
        }

        guard let userId = await userIdProvider() else {
            throw FavoritesError.notAuthenticated
        }

        let request = HTTPRequest(
            path: "/rest/v1/favorite_cities",
            method: .delete,
            headers: makeHeaders(accessToken: accessToken),
            query: [
                "id": "eq.\(id)",
                "user_id": "eq.\(userId)"
            ]
        )

        AppLogger.debug("Removing favorite: \(id)", category: AppLogger.storage)

        let response = try await httpClient.send(request)

        guard response.statusCode >= 200 && response.statusCode < 300 else {
            throw mapError(statusCode: response.statusCode, data: response.data)
        }

        // Update cache
        cacheLock.withLock { cachedFavorites.removeAll { $0.id == id } }

        AppLogger.info("Removed favorite: \(id)", category: AppLogger.storage)
    }

    public func removeMultipleFavorites(ids: [String]) async throws {
        guard !ids.isEmpty else { return }

        guard let accessToken = accessTokenProvider() else {
            throw FavoritesError.notAuthenticated
        }

        guard let userId = await userIdProvider() else {
            throw FavoritesError.notAuthenticated
        }

        // Supabase uses "in" filter: id=in.(id1,id2,id3)
        let idsString = ids.joined(separator: ",")

        let request = HTTPRequest(
            path: "/rest/v1/favorite_cities",
            method: .delete,
            headers: makeHeaders(accessToken: accessToken),
            query: [
                "id": "in.(\(idsString))",
                "user_id": "eq.\(userId)"
            ]
        )

        AppLogger.debug("Removing \(ids.count) favorites", category: AppLogger.storage)

        let response = try await httpClient.send(request)

        guard response.statusCode >= 200 && response.statusCode < 300 else {
            throw mapError(statusCode: response.statusCode, data: response.data)
        }

        // Update cache
        let idSet = Set(ids)
        cacheLock.withLock { cachedFavorites.removeAll { idSet.contains($0.id) } }

        AppLogger.info("Removed \(ids.count) favorites", category: AppLogger.storage)
    }

    public func updateNotes(id: String, notes: String) async throws {
        guard let accessToken = accessTokenProvider() else {
            throw FavoritesError.notAuthenticated
        }

        guard let userId = await userIdProvider() else {
            throw FavoritesError.notAuthenticated
        }

        let updateBody = FavoriteCityNotesUpdate(notes: notes)
        let bodyData = try JSONEncoder().encode(updateBody)

        let request = HTTPRequest(
            path: "/rest/v1/favorite_cities",
            method: .patch,
            headers: makeHeaders(accessToken: accessToken),
            query: [
                "id": "eq.\(id)",
                "user_id": "eq.\(userId)"
            ],
            body: bodyData
        )

        AppLogger.debug("Updating notes for favorite: \(id)", category: AppLogger.storage)

        let response = try await httpClient.send(request)

        guard response.statusCode >= 200 && response.statusCode < 300 else {
            throw mapError(statusCode: response.statusCode, data: response.data)
        }

        // Update cache
        cacheLock.withLock {
            if let index = cachedFavorites.firstIndex(where: { $0.id == id }) {
                var updated = cachedFavorites[index]
                updated.notes = notes
                cachedFavorites[index] = updated
            }
        }

        AppLogger.info("Updated notes for favorite: \(id)", category: AppLogger.storage)
    }

    public func isFavorite(latitude: Double, longitude: Double) async -> Bool {
        await getFavoriteByLocation(latitude: latitude, longitude: longitude) != nil
    }

    public func getFavoriteByLocation(latitude: Double, longitude: Double) async -> FavoriteCity? {
        let favorites = cacheLock.withLock { cachedFavorites }

        let roundedLat = Self.roundCoord(latitude)
        let roundedLng = Self.roundCoord(longitude)

        return favorites.first { favorite in
            Self.roundCoord(favorite.latitude) == roundedLat &&
            Self.roundCoord(favorite.longitude) == roundedLng
        }
    }

    // MARK: - Private Helpers

    private func makeHeaders(accessToken: String) -> [String: String] {
        [
            "apikey": supabaseAnonKey,
            "Authorization": "Bearer \(accessToken)",
            "Content-Type": "application/json"
        ]
    }

    private func mapError(statusCode: Int, data: Data) -> FavoritesError {
        let message = String(data: data, encoding: .utf8)
        AppLogger.error("Favorites API error (\(statusCode)): \(message ?? "no body")", category: AppLogger.storage)

        switch statusCode {
        case 401, 403:
            return .notAuthenticated
        case 404:
            return .notFound
        case 409:
            return .duplicate
        default:
            return .server(statusCode: statusCode, message: message)
        }
    }
}

// MARK: - Errors

public enum FavoritesError: Error, LocalizedError {
    case notAuthenticated
    case notFound
    case duplicate
    case server(statusCode: Int, message: String?)
    case unexpected(String)

    public var errorDescription: String? {
        switch self {
        case .notAuthenticated:
            return "Please sign in to save favorites"
        case .notFound:
            return "Favorite not found"
        case .duplicate:
            return "Location already saved"
        case .server(let code, let message):
            return message ?? "Server error (\(code))"
        case .unexpected(let message):
            return message
        }
    }
}
