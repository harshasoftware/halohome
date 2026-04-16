import Foundation
import Core

/// Write-through favorites repository.
///
/// - Always writes to local UserDefaults immediately (guest-safe, offline-first).
/// - Also syncs to Supabase in the background when the user is authenticated.
/// - Reads from Supabase when authenticated (source of truth), local otherwise.
/// - `syncGuestFavoritesToRemote()` merges local favorites to Supabase after sign-in.
@available(iOS 17.0, *)
public final class HybridFavoritesRepository: FavoritesRepository, @unchecked Sendable {

    private let local: InMemoryFavoritesRepository
    private let remote: SupabaseFavoritesRepository
    private let isAuthenticatedProvider: @Sendable () async -> Bool

    public init(
        local: InMemoryFavoritesRepository,
        remote: SupabaseFavoritesRepository,
        isAuthenticatedProvider: @escaping @Sendable () async -> Bool
    ) {
        self.local = local
        self.remote = remote
        self.isAuthenticatedProvider = isAuthenticatedProvider
    }

    // MARK: - FavoritesRepository

    public func loadFavorites() async throws -> [FavoriteCity] {
        // Always start with local cache (instant, persisted in UserDefaults)
        return try await local.loadFavorites()
    }

    /// Fetch latest favorites from Supabase and sync to local cache.
    /// Returns the remote favorites, or nil if not authenticated or on failure.
    public func refreshFromRemote() async -> [FavoriteCity]? {
        guard await isAuthenticatedProvider() else { return nil }
        do {
            let remoteFavorites = try await remote.loadFavorites()
            let localFavorites = (try? await local.loadFavorites()) ?? []

            // Never overwrite local data with an empty remote response —
            // this prevents Supabase empty state from wiping locally-saved favorites.
            if remoteFavorites.isEmpty && !localFavorites.isEmpty {
                AppLogger.debug("HybridFavorites: remote returned empty but local has \(localFavorites.count) — keeping local", category: AppLogger.storage)
                return localFavorites
            }

            if !remoteFavorites.isEmpty {
                try? await local.replaceAll(remoteFavorites)
                AppLogger.debug("HybridFavorites: synced \(remoteFavorites.count) favorites from Supabase → local", category: AppLogger.storage)
            }
            return remoteFavorites.isEmpty ? localFavorites : remoteFavorites
        } catch {
            AppLogger.error("HybridFavorites: remote refresh failed: \(error)", category: AppLogger.storage)
            return nil
        }
    }

    public func addFavorite(_ input: FavoriteCityInput) async throws -> FavoriteCity {
        // Always save locally first (persists to UserDefaults immediately)
        let localResult = try await local.addFavorite(input)

        // Fire-and-forget Supabase sync — local is already persisted
        if await isAuthenticatedProvider() {
            Task.detached { [remote] in
                do {
                    _ = try await remote.addFavorite(input)
                    AppLogger.debug("HybridFavorites: synced add to Supabase", category: AppLogger.storage)
                } catch {
                    AppLogger.error("HybridFavorites: remote add failed (local saved): \(error)", category: AppLogger.storage)
                }
            }
        }

        return localResult
    }

    public func removeFavorite(id: String) async throws {
        try await local.removeFavorite(id: id)

        if await isAuthenticatedProvider() {
            Task.detached { [remote] in
                do {
                    try await remote.removeFavorite(id: id)
                    AppLogger.debug("HybridFavorites: synced remove to Supabase", category: AppLogger.storage)
                } catch {
                    AppLogger.error("HybridFavorites: remote remove failed (local removed): \(error)", category: AppLogger.storage)
                }
            }
        }
    }

    public func removeMultipleFavorites(ids: [String]) async throws {
        try await local.removeMultipleFavorites(ids: ids)

        if await isAuthenticatedProvider() {
            Task.detached { [remote] in
                do {
                    try await remote.removeMultipleFavorites(ids: ids)
                } catch {
                    AppLogger.error("HybridFavorites: remote bulk remove failed: \(error)", category: AppLogger.storage)
                }
            }
        }
    }

    public func updateNotes(id: String, notes: String) async throws {
        try await local.updateNotes(id: id, notes: notes)

        if await isAuthenticatedProvider() {
            Task.detached { [remote] in
                do {
                    try await remote.updateNotes(id: id, notes: notes)
                } catch {
                    AppLogger.error("HybridFavorites: remote updateNotes failed: \(error)", category: AppLogger.storage)
                }
            }
        }
    }

    public func isFavorite(latitude: Double, longitude: Double) async -> Bool {
        // Always check local first (instant, kept in sync)
        await local.isFavorite(latitude: latitude, longitude: longitude)
    }

    public func getFavoriteByLocation(latitude: Double, longitude: Double) async -> FavoriteCity? {
        // Always check local first (instant, kept in sync)
        await local.getFavoriteByLocation(latitude: latitude, longitude: longitude)
    }

    // MARK: - Guest → Account Migration

    /// Merges locally-stored guest favorites into Supabase after sign-in.
    /// Skips any locations already saved in the user's Supabase account.
    /// Call this once after the user successfully signs in.
    public func syncGuestFavoritesToRemote() async {
        let localFavorites = (try? await local.loadFavorites()) ?? []
        guard !localFavorites.isEmpty else { return }

        AppLogger.info("HybridFavorites: merging \(localFavorites.count) guest favorites to Supabase", category: AppLogger.storage)

        for favorite in localFavorites {
            let input = FavoriteCityInput(
                latitude: favorite.latitude,
                longitude: favorite.longitude,
                cityName: favorite.cityName,
                country: favorite.country,
                notes: favorite.notes
            )
            do {
                _ = try await remote.addFavorite(input)
            } catch {
                // Duplicate check is inside SupabaseFavoritesRepository — skip silently
                AppLogger.debug("HybridFavorites: skipped or failed merging \(favorite.cityName): \(error)", category: AppLogger.storage)
            }
        }

        AppLogger.info("HybridFavorites: guest merge complete", category: AppLogger.storage)
    }
}
