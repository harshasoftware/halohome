import Foundation
import CoreLocation

// MARK: - Birth Data Model

/// Represents complete birth data for astrological calculations
public struct BirthData: Identifiable, Codable, Equatable, Sendable {

    public let id: UUID
    public var name: String
    public var date: Date
    public var time: Date?
    public var isTimeUnknown: Bool
    public var latitude: Double
    public var longitude: Double
    public var placeName: String
    public var timezone: TimeZone
    public var createdAt: Date
    public var updatedAt: Date

    // MARK: - Computed Properties

    /// Combined date and time for calculations
    public var dateTime: Date {
        guard let time = time, !isTimeUnknown else {
            // Use noon if time is unknown (standard astrological practice)
            return Calendar.current.date(
                bySettingHour: 12,
                minute: 0,
                second: 0,
                of: date
            ) ?? date
        }

        let calendar = Calendar.current
        let dateComponents = calendar.dateComponents([.year, .month, .day], from: date)
        let timeComponents = calendar.dateComponents([.hour, .minute], from: time)

        var combined = DateComponents()
        combined.year = dateComponents.year
        combined.month = dateComponents.month
        combined.day = dateComponents.day
        combined.hour = timeComponents.hour
        combined.minute = timeComponents.minute
        combined.timeZone = timezone

        return calendar.date(from: combined) ?? date
    }

    /// Location as CLLocationCoordinate2D
    public var coordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }

    // MARK: - Cached Formatters

    private static let dateOnlyFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .long
        f.timeStyle = .none
        return f
    }()

    private static let timeOnlyFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .none
        f.timeStyle = .short
        return f
    }()

    /// Formatted birth date string
    public var formattedDate: String {
        Self.dateOnlyFormatter.string(from: date)
    }

    /// Formatted birth time string
    public var formattedTime: String {
        guard let time = time, !isTimeUnknown else {
            return "Time Unknown"
        }
        return Self.timeOnlyFormatter.string(from: time)
    }

    /// Formatted location string
    public var formattedLocation: String {
        placeName
    }

    // MARK: - Initialization

    public init(
        id: UUID = UUID(),
        name: String,
        date: Date,
        time: Date? = nil,
        isTimeUnknown: Bool = false,
        latitude: Double,
        longitude: Double,
        placeName: String,
        timezone: TimeZone,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.name = name
        self.date = date
        self.time = time
        self.isTimeUnknown = isTimeUnknown
        self.latitude = latitude
        self.longitude = longitude
        self.placeName = placeName
        self.timezone = timezone
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }

    // MARK: - Codable

    private enum CodingKeys: String, CodingKey {
        case id, name, date, time, isTimeUnknown
        case latitude, longitude, placeName
        case timezoneIdentifier
        case createdAt, updatedAt
    }

    public init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(UUID.self, forKey: .id)
        name = try container.decode(String.self, forKey: .name)
        date = try container.decode(Date.self, forKey: .date)
        time = try container.decodeIfPresent(Date.self, forKey: .time)
        isTimeUnknown = try container.decode(Bool.self, forKey: .isTimeUnknown)
        latitude = try container.decode(Double.self, forKey: .latitude)
        longitude = try container.decode(Double.self, forKey: .longitude)
        placeName = try container.decode(String.self, forKey: .placeName)

        let tzIdentifier = try container.decode(String.self, forKey: .timezoneIdentifier)
        timezone = TimeZone(identifier: tzIdentifier) ?? .current

        createdAt = try container.decode(Date.self, forKey: .createdAt)
        updatedAt = try container.decode(Date.self, forKey: .updatedAt)
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(name, forKey: .name)
        try container.encode(date, forKey: .date)
        try container.encodeIfPresent(time, forKey: .time)
        try container.encode(isTimeUnknown, forKey: .isTimeUnknown)
        try container.encode(latitude, forKey: .latitude)
        try container.encode(longitude, forKey: .longitude)
        try container.encode(placeName, forKey: .placeName)
        try container.encode(timezone.identifier, forKey: .timezoneIdentifier)
        try container.encode(createdAt, forKey: .createdAt)
        try container.encode(updatedAt, forKey: .updatedAt)
    }
}

// MARK: - Validation

public extension BirthData {

    /// Validation error types
    enum ValidationError: LocalizedError, Equatable {
        case nameEmpty
        case nameTooLong
        case dateInFuture
        case dateTooOld
        case invalidCoordinates
        case placeNameEmpty

        public var errorDescription: String? {
            switch self {
            case .nameEmpty:
                return "Please enter a name for this chart"
            case .nameTooLong:
                return "Name must be 50 characters or less"
            case .dateInFuture:
                return "Birth date cannot be in the future"
            case .dateTooOld:
                return "Birth date seems too far in the past"
            case .invalidCoordinates:
                return "Please select a valid location"
            case .placeNameEmpty:
                return "Please select a birth location"
            }
        }
    }

    /// Validates the birth data and returns any errors
    func validate() -> [ValidationError] {
        var errors: [ValidationError] = []

        // Name validation
        if name.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors.append(.nameEmpty)
        } else if name.count > 50 {
            errors.append(.nameTooLong)
        }

        // Date validation
        if date > Date() {
            errors.append(.dateInFuture)
        }

        // Check if date is before year 1800 (reasonable limit for astrology)
        let calendar = Calendar.current
        if let year = calendar.dateComponents([.year], from: date).year, year < 1800 {
            errors.append(.dateTooOld)
        }

        // Location validation
        if latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 {
            errors.append(.invalidCoordinates)
        }

        if placeName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors.append(.placeNameEmpty)
        }

        return errors
    }

    /// Returns true if the birth data is valid
    var isValid: Bool {
        validate().isEmpty
    }
}

// MARK: - Sample Data

public extension BirthData {

    /// Sample birth data for previews
    static let sample = BirthData(
        name: "Sample Chart",
        date: Calendar.current.date(from: DateComponents(year: 1990, month: 6, day: 15)) ?? Date(),
        time: Calendar.current.date(from: DateComponents(hour: 14, minute: 30)) ?? Date(),
        isTimeUnknown: false,
        latitude: 40.7128,
        longitude: -74.0060,
        placeName: "New York, NY, USA",
        timezone: TimeZone(identifier: "America/New_York") ?? .current
    )

    /// Sample birth data with unknown time
    static let sampleUnknownTime = BirthData(
        name: "Unknown Time Chart",
        date: Calendar.current.date(from: DateComponents(year: 1985, month: 12, day: 25)) ?? Date(),
        time: nil,
        isTimeUnknown: true,
        latitude: 51.5074,
        longitude: -0.1278,
        placeName: "London, United Kingdom",
        timezone: TimeZone(identifier: "Europe/London") ?? .current
    )
}
