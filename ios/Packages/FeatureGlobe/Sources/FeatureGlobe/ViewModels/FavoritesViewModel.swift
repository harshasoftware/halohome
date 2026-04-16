import Foundation
import Observation
import SwiftUI
import Core

/// Protocol for favorites repository - allows dependency injection
public protocol FavoritesRepositoryProtocol: Sendable {
    func loadFavorites() async throws -> [FavoriteCityData]
    func addFavorite(_ input: FavoriteCityInputData) async throws -> FavoriteCityData
    func removeFavorite(id: String) async throws
    func removeMultipleFavorites(ids: [String]) async throws
    func updateNotes(id: String, notes: String) async throws
    func isFavorite(latitude: Double, longitude: Double) async -> Bool
    func getFavoriteByLocation(latitude: Double, longitude: Double) async -> FavoriteCityData?

    /// Merge locally-stored guest favorites to Supabase after sign-in.
    func syncGuestFavorites() async

    /// Fetch latest from remote and sync to local cache. Returns remote data or nil.
    func refreshFromRemote() async -> [FavoriteCityData]?
}

public extension FavoritesRepositoryProtocol {
    func syncGuestFavorites() async { /* no-op for non-hybrid repos */ }
    func refreshFromRemote() async -> [FavoriteCityData]? { nil }
}

/// Data transfer object for favorite cities (decoupled from Storage package)
public struct FavoriteCityData: Identifiable, Equatable, Sendable {
    public let id: String
    public let userId: String
    public let latitude: Double
    public let longitude: Double
    public let cityName: String
    public let country: String?
    public var notes: String?
    public let createdAt: Date
    public let updatedAt: Date

    public init(
        id: String,
        userId: String,
        latitude: Double,
        longitude: Double,
        cityName: String,
        country: String? = nil,
        notes: String? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.userId = userId
        self.latitude = latitude
        self.longitude = longitude
        self.cityName = cityName
        self.country = country
        self.notes = notes
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

/// Input for creating a favorite
public struct FavoriteCityInputData: Sendable {
    public let latitude: Double
    public let longitude: Double
    public let cityName: String
    public let country: String?
    public let notes: String?

    public init(
        latitude: Double,
        longitude: Double,
        cityName: String,
        country: String? = nil,
        notes: String? = nil
    ) {
        self.latitude = latitude
        self.longitude = longitude
        self.cityName = cityName
        self.country = country
        self.notes = notes
    }
}

/// ViewModel for managing favorites state
@MainActor
@Observable
public final class FavoritesViewModel {

    // MARK: - Published State

    /// All user favorites
    public private(set) var favorites: [FavoriteCityData] = []

    /// Whether favorites are loading
    public private(set) var isLoading: Bool = false

    /// Error message if operation failed
    public var errorMessage: String?

    /// Selected favorites for multi-select
    public var selectedIds: Set<String> = []

    /// Search query for filtering
    public var searchQuery: String = ""

    // MARK: - Dependencies

    private let repository: FavoritesRepositoryProtocol?

    // MARK: - Initialization

    public init(repository: FavoritesRepositoryProtocol? = nil) {
        self.repository = repository
    }

    // MARK: - Computed Properties

    /// Filtered favorites based on search query
    public var filteredFavorites: [FavoriteCityData] {
        guard !searchQuery.isEmpty else { return favorites }
        let query = searchQuery.lowercased()
        return favorites.filter { favorite in
            favorite.cityName.lowercased().contains(query) ||
            (favorite.country?.lowercased().contains(query) ?? false)
        }
    }

    /// Count of selected favorites
    public var selectedCount: Int {
        selectedIds.count
    }

    /// Whether all filtered favorites are selected
    public var isAllSelected: Bool {
        !filteredFavorites.isEmpty && selectedIds.count == filteredFavorites.count
    }

    // MARK: - Actions

    /// Merge guest (local) favorites to Supabase after sign-in, then reload.
    public func syncGuestFavorites() async {
        await repository?.syncGuestFavorites()
        await loadFavorites()
    }

    /// Load favorites with a two-phase approach:
    /// 1. Show local cache instantly (from UserDefaults)
    /// 2. Refresh from Supabase in the background and update the list
    public func loadFavorites() async {
        guard let repository else {
            AppLogger.debug("No favorites repository configured", category: AppLogger.storage)
            return
        }

        errorMessage = nil

        // Phase 1: Load from local cache (instant)
        do {
            let cached = try await repository.loadFavorites()
            if !cached.isEmpty {
                favorites = cached
                AppLogger.info("Loaded \(cached.count) favorites from cache", category: AppLogger.storage)
            }
        } catch {
            AppLogger.error("Failed to load cached favorites: \(error)", category: AppLogger.storage)
        }

        // Show spinner only if cache was empty (first-ever load)
        let needsSpinner = favorites.isEmpty
        if needsSpinner { isLoading = true }

        // Phase 2: Refresh from remote (Supabase)
        if let refreshed = await repository.refreshFromRemote() {
            favorites = refreshed
            AppLogger.info("Refreshed \(refreshed.count) favorites from remote", category: AppLogger.storage)
        }

        if needsSpinner { isLoading = false }
    }

    /// Add a favorite (optimistic — UI updates immediately, Supabase syncs in background)
    public func addFavorite(
        latitude: Double,
        longitude: Double,
        cityName: String,
        country: String? = nil,
        notes: String? = nil
    ) async -> FavoriteCityData? {
        guard let repository else {
            errorMessage = "Favorites not available"
            return nil
        }

        // Optimistic: insert a placeholder immediately
        let tempId = "temp-\(UUID().uuidString)"
        let placeholder = FavoriteCityData(
            id: tempId,
            userId: "",
            latitude: latitude,
            longitude: longitude,
            cityName: cityName,
            country: country,
            notes: notes,
            createdAt: Date(),
            updatedAt: Date()
        )

        if !favorites.contains(where: {
            roundCoord($0.latitude) == roundCoord(latitude) &&
            roundCoord($0.longitude) == roundCoord(longitude)
        }) {
            favorites.insert(placeholder, at: 0)
        }

        // Sync to repository in background
        let input = FavoriteCityInputData(
            latitude: latitude,
            longitude: longitude,
            cityName: cityName,
            country: country,
            notes: notes
        )

        do {
            let saved = try await repository.addFavorite(input)
            // Replace placeholder with real record
            if let idx = favorites.firstIndex(where: { $0.id == tempId }) {
                favorites[idx] = saved
            }
            AppLogger.info("Added favorite: \(cityName)", category: AppLogger.storage)
            return saved
        } catch {
            // Rollback placeholder
            favorites.removeAll { $0.id == tempId }
            errorMessage = error.localizedDescription
            AppLogger.error("Failed to add favorite: \(error)", category: AppLogger.storage)
            return nil
        }
    }

    /// Remove a single favorite
    public func removeFavorite(id: String) async {
        guard let repository else { return }

        // Optimistic removal
        let backup = favorites
        favorites.removeAll { $0.id == id }
        selectedIds.remove(id)

        do {
            try await repository.removeFavorite(id: id)
            AppLogger.info("Removed favorite: \(id)", category: AppLogger.storage)
        } catch {
            // Rollback
            favorites = backup
            errorMessage = error.localizedDescription
            AppLogger.error("Failed to remove favorite: \(error)", category: AppLogger.storage)
        }
    }

    /// Remove selected favorites
    public func removeSelectedFavorites() async {
        guard let repository, !selectedIds.isEmpty else { return }

        let idsToRemove = Array(selectedIds)

        // Optimistic removal
        let backup = favorites
        favorites.removeAll { selectedIds.contains($0.id) }
        selectedIds.removeAll()

        do {
            try await repository.removeMultipleFavorites(ids: idsToRemove)
            AppLogger.info("Removed \(idsToRemove.count) favorites", category: AppLogger.storage)
        } catch {
            // Rollback
            favorites = backup
            errorMessage = error.localizedDescription
            AppLogger.error("Failed to remove favorites: \(error)", category: AppLogger.storage)
        }
    }

    /// Update notes for a favorite
    public func updateNotes(id: String, notes: String) async {
        guard let repository else { return }

        // Optimistic update
        if let index = favorites.firstIndex(where: { $0.id == id }) {
            var updated = favorites[index]
            updated.notes = notes
            favorites[index] = updated
        }

        do {
            try await repository.updateNotes(id: id, notes: notes)
            AppLogger.info("Updated notes for: \(id)", category: AppLogger.storage)
        } catch {
            errorMessage = error.localizedDescription
            // Reload to get correct state
            await loadFavorites()
        }
    }

    /// Check if a location is favorited
    public func isFavorite(latitude: Double, longitude: Double) -> Bool {
        let roundedLat = roundCoord(latitude)
        let roundedLng = roundCoord(longitude)

        return favorites.contains { favorite in
            roundCoord(favorite.latitude) == roundedLat &&
            roundCoord(favorite.longitude) == roundedLng
        }
    }

    /// Get favorite by coordinates
    public func getFavoriteByLocation(latitude: Double, longitude: Double) -> FavoriteCityData? {
        let roundedLat = roundCoord(latitude)
        let roundedLng = roundCoord(longitude)

        return favorites.first { favorite in
            roundCoord(favorite.latitude) == roundedLat &&
            roundCoord(favorite.longitude) == roundedLng
        }
    }

    /// Toggle favorite for a location
    public func toggleFavorite(
        latitude: Double,
        longitude: Double,
        cityName: String,
        country: String? = nil
    ) async -> Bool {
        if let existing = getFavoriteByLocation(latitude: latitude, longitude: longitude) {
            await removeFavorite(id: existing.id)
            return false
        } else {
            let result = await addFavorite(
                latitude: latitude,
                longitude: longitude,
                cityName: cityName,
                country: country
            )
            return result != nil
        }
    }

    // MARK: - Selection

    /// Toggle selection for a favorite
    public func toggleSelection(_ id: String) {
        if selectedIds.contains(id) {
            selectedIds.remove(id)
        } else {
            selectedIds.insert(id)
        }
    }

    /// Select all filtered favorites
    public func selectAll() {
        selectedIds = Set(filteredFavorites.map(\.id))
    }

    /// Clear selection
    public func clearSelection() {
        selectedIds.removeAll()
    }

    /// Check if a favorite is selected
    public func isSelected(_ id: String) -> Bool {
        selectedIds.contains(id)
    }

    // MARK: - Private Helpers

    private func roundCoord(_ value: Double) -> Double {
        (value * 10000).rounded() / 10000
    }
}

// MARK: - Stub Repository

/// Stub repository for previews and testing
public final class StubFavoritesRepository: FavoritesRepositoryProtocol, @unchecked Sendable {
    private var favorites: [FavoriteCityData] = []

    public init(favorites: [FavoriteCityData] = []) {
        self.favorites = favorites
    }

    public func loadFavorites() async throws -> [FavoriteCityData] {
        favorites
    }

    public func addFavorite(_ input: FavoriteCityInputData) async throws -> FavoriteCityData {
        let favorite = FavoriteCityData(
            id: UUID().uuidString,
            userId: "stub-user",
            latitude: input.latitude,
            longitude: input.longitude,
            cityName: input.cityName,
            country: input.country,
            notes: input.notes
        )
        favorites.insert(favorite, at: 0)
        return favorite
    }

    public func removeFavorite(id: String) async throws {
        favorites.removeAll { $0.id == id }
    }

    public func removeMultipleFavorites(ids: [String]) async throws {
        let idSet = Set(ids)
        favorites.removeAll { idSet.contains($0.id) }
    }

    public func updateNotes(id: String, notes: String) async throws {
        if let index = favorites.firstIndex(where: { $0.id == id }) {
            var updated = favorites[index]
            updated.notes = notes
            favorites[index] = updated
        }
    }

    public func isFavorite(latitude: Double, longitude: Double) async -> Bool {
        await getFavoriteByLocation(latitude: latitude, longitude: longitude) != nil
    }

    public func getFavoriteByLocation(latitude: Double, longitude: Double) async -> FavoriteCityData? {
        let roundedLat = (latitude * 10000).rounded() / 10000
        let roundedLng = (longitude * 10000).rounded() / 10000
        return favorites.first { favorite in
            (favorite.latitude * 10000).rounded() / 10000 == roundedLat &&
            (favorite.longitude * 10000).rounded() / 10000 == roundedLng
        }
    }
}
