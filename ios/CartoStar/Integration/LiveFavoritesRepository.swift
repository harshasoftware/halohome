import Foundation
import CartoStorage
import FeatureGlobe

/// Adapter that bridges CartoStorage.FavoritesRepository → FeatureGlobe.FavoritesRepositoryProtocol
/// Converts between Storage types and FeatureGlobe DTOs
@available(iOS 17.0, *)
public final class LiveFavoritesRepository: FavoritesRepositoryProtocol, @unchecked Sendable {

    private let repository: FavoritesRepository

    public init(repository: FavoritesRepository) {
        self.repository = repository
    }

    // MARK: - FavoritesRepositoryProtocol

    public func loadFavorites() async throws -> [FavoriteCityData] {
        let favorites = try await repository.loadFavorites()
        return favorites.map { mapToData($0) }
    }

    public func addFavorite(_ input: FavoriteCityInputData) async throws -> FavoriteCityData {
        let storageInput = FavoriteCityInput(
            latitude: input.latitude,
            longitude: input.longitude,
            cityName: input.cityName,
            country: input.country,
            notes: input.notes
        )
        let favorite = try await repository.addFavorite(storageInput)
        return mapToData(favorite)
    }

    public func removeFavorite(id: String) async throws {
        try await repository.removeFavorite(id: id)
    }

    public func removeMultipleFavorites(ids: [String]) async throws {
        try await repository.removeMultipleFavorites(ids: ids)
    }

    public func updateNotes(id: String, notes: String) async throws {
        try await repository.updateNotes(id: id, notes: notes)
    }

    public func isFavorite(latitude: Double, longitude: Double) async -> Bool {
        await repository.isFavorite(latitude: latitude, longitude: longitude)
    }

    public func getFavoriteByLocation(latitude: Double, longitude: Double) async -> FavoriteCityData? {
        guard let favorite = await repository.getFavoriteByLocation(latitude: latitude, longitude: longitude) else {
            return nil
        }
        return mapToData(favorite)
    }

    public func syncGuestFavorites() async {
        await repository.syncGuestFavoritesToRemote()
    }

    public func refreshFromRemote() async -> [FavoriteCityData]? {
        guard let remoteFavorites = await repository.refreshFromRemote() else { return nil }
        return remoteFavorites.map { mapToData($0) }
    }

    // MARK: - Private Helpers

    private func mapToData(_ favorite: FavoriteCity) -> FavoriteCityData {
        FavoriteCityData(
            id: favorite.id,
            userId: favorite.userId,
            latitude: favorite.latitude,
            longitude: favorite.longitude,
            cityName: favorite.cityName,
            country: favorite.country,
            notes: favorite.notes,
            createdAt: favorite.createdAt,
            updatedAt: favorite.updatedAt
        )
    }
}
