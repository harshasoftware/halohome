import Foundation
import MapKit

// MARK: - Location Search Result

/// Represents a location search result from MapKit
public struct LocationSearchResult: Identifiable, Equatable, Sendable {

    public let id: UUID
    public let title: String
    public let subtitle: String
    public let latitude: Double
    public let longitude: Double
    public let timezone: TimeZone

    /// Full display name combining title and subtitle
    public var displayName: String {
        if subtitle.isEmpty {
            return title
        }
        return "\(title), \(subtitle)"
    }

    public init(
        id: UUID = UUID(),
        title: String,
        subtitle: String,
        latitude: Double,
        longitude: Double,
        timezone: TimeZone
    ) {
        self.id = id
        self.title = title
        self.subtitle = subtitle
        self.latitude = latitude
        self.longitude = longitude
        self.timezone = timezone
    }
}

// MARK: - Recent Location

/// Represents a recently used location for quick access
public struct RecentLocation: Identifiable, Codable, Equatable, Sendable {

    public let id: UUID
    public let title: String
    public let subtitle: String
    public let latitude: Double
    public let longitude: Double
    public let timezoneIdentifier: String
    public let lastUsed: Date

    public var timezone: TimeZone {
        TimeZone(identifier: timezoneIdentifier) ?? .current
    }

    public var displayName: String {
        if subtitle.isEmpty {
            return title
        }
        return "\(title), \(subtitle)"
    }

    public init(
        id: UUID = UUID(),
        title: String,
        subtitle: String,
        latitude: Double,
        longitude: Double,
        timezoneIdentifier: String,
        lastUsed: Date = Date()
    ) {
        self.id = id
        self.title = title
        self.subtitle = subtitle
        self.latitude = latitude
        self.longitude = longitude
        self.timezoneIdentifier = timezoneIdentifier
        self.lastUsed = lastUsed
    }

    /// Creates a RecentLocation from a LocationSearchResult
    public init(from result: LocationSearchResult) {
        self.id = UUID()
        self.title = result.title
        self.subtitle = result.subtitle
        self.latitude = result.latitude
        self.longitude = result.longitude
        self.timezoneIdentifier = result.timezone.identifier
        self.lastUsed = Date()
    }
}
