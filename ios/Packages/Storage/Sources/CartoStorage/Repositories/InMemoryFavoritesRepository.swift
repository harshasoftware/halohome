import Foundation
import Core

/// In-memory implementation of FavoritesRepository that persists to UserDefaults.
/// Used for debug/development builds when Supabase is not configured.
@available(iOS 17.0, *)
public final class InMemoryFavoritesRepository: FavoritesRepository, @unchecked Sendable {

    private let userDefaultsKey = "cartostar_favorites"
    private let userId: String
    private let storage: FavoritesStorage

    public init(userId: String = "mock-user") {
        self.userId = userId
        // Load cached favorites from UserDefaults synchronously at init
        // so they're available before the first loadFavorites() call.
        var initial: [FavoriteCity] = []
        if let data = UserDefaults.standard.data(forKey: "cartostar_favorites"),
           let decoded = try? JSONDecoder().decode([FavoriteCity].self, from: data) {
            initial = decoded
        }
        self.storage = FavoritesStorage(initial: initial)
    }

    // MARK: - FavoritesRepository

    public func loadFavorites() async throws -> [FavoriteCity] {
        let favorites = await storage.getAll()
        AppLogger.debug("InMemoryFavoritesRepository: Loaded \(favorites.count) favorites", category: AppLogger.storage)
        return favorites
    }

    public func addFavorite(_ input: FavoriteCityInput) async throws -> FavoriteCity {
        // Check for duplicate
        if let existing = await storage.findByLocation(latitude: input.latitude, longitude: input.longitude) {
            AppLogger.debug("InMemoryFavoritesRepository: Location already favorited", category: AppLogger.storage)
            return existing
        }

        let favorite = FavoriteCity(
            id: UUID().uuidString,
            userId: userId,
            latitude: input.latitude,
            longitude: input.longitude,
            cityName: input.cityName,
            country: input.country,
            notes: input.notes,
            createdAt: Date(),
            updatedAt: Date()
        )

        await storage.add(favorite)
        await storage.saveToUserDefaults(key: userDefaultsKey)

        AppLogger.info("InMemoryFavoritesRepository: Added favorite \(favorite.cityName)", category: AppLogger.storage)
        return favorite
    }

    public func removeFavorite(id: String) async throws {
        await storage.remove(id: id)
        await storage.saveToUserDefaults(key: userDefaultsKey)
        AppLogger.info("InMemoryFavoritesRepository: Removed favorite \(id)", category: AppLogger.storage)
    }

    public func removeMultipleFavorites(ids: [String]) async throws {
        await storage.removeMultiple(ids: ids)
        await storage.saveToUserDefaults(key: userDefaultsKey)
        AppLogger.info("InMemoryFavoritesRepository: Removed \(ids.count) favorites", category: AppLogger.storage)
    }

    public func updateNotes(id: String, notes: String) async throws {
        await storage.updateNotes(id: id, notes: notes)
        await storage.saveToUserDefaults(key: userDefaultsKey)
        AppLogger.info("InMemoryFavoritesRepository: Updated notes for \(id)", category: AppLogger.storage)
    }

    /// Replace all local favorites (used to sync remote → local cache)
    public func replaceAll(_ newFavorites: [FavoriteCity]) async throws {
        await storage.replaceAll(newFavorites)
        await storage.saveToUserDefaults(key: userDefaultsKey)
    }

    public func isFavorite(latitude: Double, longitude: Double) async -> Bool {
        await storage.findByLocation(latitude: latitude, longitude: longitude) != nil
    }

    public func getFavoriteByLocation(latitude: Double, longitude: Double) async -> FavoriteCity? {
        await storage.findByLocation(latitude: latitude, longitude: longitude)
    }
}

// MARK: - Actor for Thread-Safe Storage

/// Actor that provides thread-safe access to favorites storage
@available(iOS 17.0, *)
private actor FavoritesStorage {
    private var favorites: [FavoriteCity]

    init(initial: [FavoriteCity] = []) {
        self.favorites = initial
    }

    func getAll() -> [FavoriteCity] {
        favorites
    }

    func add(_ favorite: FavoriteCity) {
        favorites.insert(favorite, at: 0)
    }

    func remove(id: String) {
        favorites.removeAll { $0.id == id }
    }

    func removeMultiple(ids: [String]) {
        let idSet = Set(ids)
        favorites.removeAll { idSet.contains($0.id) }
    }

    func updateNotes(id: String, notes: String) {
        if let index = favorites.firstIndex(where: { $0.id == id }) {
            var updated = favorites[index]
            updated.notes = notes
            favorites[index] = updated
        }
    }

    func replaceAll(_ newFavorites: [FavoriteCity]) {
        favorites = newFavorites
    }

    func findByLocation(latitude: Double, longitude: Double) -> FavoriteCity? {
        let roundedLat = roundCoord(latitude)
        let roundedLng = roundCoord(longitude)

        return favorites.first { favorite in
            roundCoord(favorite.latitude) == roundedLat &&
            roundCoord(favorite.longitude) == roundedLng
        }
    }

    func loadFromUserDefaults(key: String) {
        guard let data = UserDefaults.standard.data(forKey: key) else {
            AppLogger.debug("FavoritesStorage: No saved favorites found", category: AppLogger.storage)
            return
        }

        do {
            self.favorites = try JSONDecoder().decode([FavoriteCity].self, from: data)
            let count = self.favorites.count
            AppLogger.debug("FavoritesStorage: Loaded \(count) favorites from UserDefaults", category: AppLogger.storage)
        } catch {
            AppLogger.error("FavoritesStorage: Failed to decode favorites: \(error)", category: AppLogger.storage)
        }
    }

    func saveToUserDefaults(key: String) {
        do {
            let data = try JSONEncoder().encode(self.favorites)
            UserDefaults.standard.set(data, forKey: key)
            let count = self.favorites.count
            AppLogger.debug("FavoritesStorage: Saved \(count) favorites to UserDefaults", category: AppLogger.storage)
        } catch {
            AppLogger.error("FavoritesStorage: Failed to encode favorites: \(error)", category: AppLogger.storage)
        }
    }

    private func roundCoord(_ value: Double) -> Double {
        (value * 10000).rounded() / 10000
    }
}
