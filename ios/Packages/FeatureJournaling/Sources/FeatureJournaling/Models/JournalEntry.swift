import Foundation

/// A journal entry recording the user's experience at a location
public struct JournalEntry: Codable, Identifiable, Sendable, Equatable {

    public let id: UUID
    public var userId: String
    public var latitude: Double
    public var longitude: Double
    public var placeName: String
    public var daysStayed: Int
    public var stayStartDate: Date?
    public var planetaryInfluences: [PlanetaryInfluence]
    public var userText: String
    public var mood: Int?
    public var isPublic: Bool
    public var consentForAITraining: Bool
    public var createdAt: Date
    public var updatedAt: Date

    public init(
        id: UUID = UUID(),
        userId: String,
        latitude: Double,
        longitude: Double,
        placeName: String,
        daysStayed: Int = 0,
        stayStartDate: Date? = nil,
        planetaryInfluences: [PlanetaryInfluence] = [],
        userText: String = "",
        mood: Int? = nil,
        isPublic: Bool = false,
        consentForAITraining: Bool = false,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.userId = userId
        self.latitude = latitude
        self.longitude = longitude
        self.placeName = placeName
        self.daysStayed = daysStayed
        self.stayStartDate = stayStartDate
        self.planetaryInfluences = planetaryInfluences
        self.userText = userText
        self.mood = mood
        self.isPublic = isPublic
        self.consentForAITraining = consentForAITraining
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    enum CodingKeys: String, CodingKey {
        case id
        case userId = "user_id"
        case latitude
        case longitude
        case placeName = "place_name"
        case daysStayed = "days_stayed"
        case stayStartDate = "stay_start_date"
        case planetaryInfluences = "planetary_influences"
        case userText = "user_text"
        case mood
        case isPublic = "is_public"
        case consentForAITraining = "consent_for_ai_training"
        case createdAt = "created_at"
        case updatedAt = "updated_at"
    }
}

/// A detected planetary influence at a location
public struct PlanetaryInfluence: Codable, Sendable, Equatable, Identifiable {
    public var id: String { "\(planet)-\(lineType)" }
    public let planet: String
    public let lineType: String
    public let distanceKm: Double
    public let interpretation: String?

    public init(
        planet: String,
        lineType: String,
        distanceKm: Double,
        interpretation: String? = nil
    ) {
        self.planet = planet
        self.lineType = lineType
        self.distanceKm = distanceKm
        self.interpretation = interpretation
    }

    enum CodingKeys: String, CodingKey {
        case planet
        case lineType = "line_type"
        case distanceKm = "distance_km"
        case interpretation
    }
}
