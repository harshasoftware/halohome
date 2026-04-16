import Foundation

/// A favorited/saved location
public struct FavoriteCity: Identifiable, Codable, Equatable, Sendable {
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
        id: String = UUID().uuidString,
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

/// Input for creating a new favorite
public struct FavoriteCityInput: Sendable {
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

// MARK: - Supabase Row Mapping

/// Supabase row format for favorite_cities table
struct FavoriteCityRow: Codable {
    let id: String
    let user_id: String
    let latitude: Double
    let longitude: Double
    let city_name: String
    let country: String?
    let notes: String?
    let created_at: String
    let updated_at: String

    func toFavoriteCity() -> FavoriteCity {
        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        return FavoriteCity(
            id: id,
            userId: user_id,
            latitude: latitude,
            longitude: longitude,
            cityName: city_name,
            country: country,
            notes: notes,
            createdAt: dateFormatter.date(from: created_at) ?? Date(),
            updatedAt: dateFormatter.date(from: updated_at) ?? Date()
        )
    }
}

/// Request body for creating a favorite
struct FavoriteCityCreate: Encodable {
    let user_id: String
    let latitude: Double
    let longitude: Double
    let city_name: String
    let country: String?
    let notes: String?
}

/// Request body for updating notes
struct FavoriteCityNotesUpdate: Encodable {
    let notes: String
}
