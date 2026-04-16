import Foundation

/// Protocol for managing favorite cities
public protocol FavoritesRepository: Sendable {
    /// Load all favorites for the current user
    func loadFavorites() async throws -> [FavoriteCity]

    /// Add a new favorite
    func addFavorite(_ input: FavoriteCityInput) async throws -> FavoriteCity

    /// Remove a favorite by ID
    func removeFavorite(id: String) async throws

    /// Remove multiple favorites by IDs
    func removeMultipleFavorites(ids: [String]) async throws

    /// Update notes for a favorite
    func updateNotes(id: String, notes: String) async throws

    /// Check if a location is favorited (by coordinates)
    func isFavorite(latitude: Double, longitude: Double) async -> Bool

    /// Get favorite by coordinates
    func getFavoriteByLocation(latitude: Double, longitude: Double) async -> FavoriteCity?

    /// Merge locally-stored guest favorites to Supabase after sign-in.
    /// Default implementation is a no-op; only `HybridFavoritesRepository` performs actual migration.
    func syncGuestFavoritesToRemote() async

    /// Fetch latest from remote and sync to local cache.
    /// Returns remote data or nil if unavailable. Default is no-op.
    func refreshFromRemote() async -> [FavoriteCity]?
}

public extension FavoritesRepository {
    func syncGuestFavoritesToRemote() async { /* no-op for non-hybrid repos */ }
    func refreshFromRemote() async -> [FavoriteCity]? { nil }
}

// MARK: - Coordinate Helpers

public extension FavoritesRepository {
    /// Round coordinate to ~11m precision for comparison
    static func roundCoord(_ value: Double) -> Double {
        (value * 10000).rounded() / 10000
    }

    /// Check if two coordinates match (within ~11m)
    static func coordinatesMatch(
        lat1: Double, lng1: Double,
        lat2: Double, lng2: Double
    ) -> Bool {
        roundCoord(lat1) == roundCoord(lat2) &&
        roundCoord(lng1) == roundCoord(lng2)
    }
}
