import Foundation
import CoreLocation

/// Represents a detected location visit (wraps CLVisit data)
public struct LocationVisit: Sendable, Equatable {
    public let arrival: Date
    public let departure: Date
    public let latitude: Double
    public let longitude: Double

    /// Duration of stay in days (rounded down)
    public var daysStayed: Int {
        let interval = departure.timeIntervalSince(arrival)
        return max(0, Int(interval / 86400))
    }

    /// Whether this visit qualifies for a journal prompt (7+ days)
    public var qualifiesForJournalPrompt: Bool {
        daysStayed >= 7
    }

    /// Whether this is a long-term stay (30+ days)
    public var isLongTermStay: Bool {
        daysStayed >= 30
    }

    public init(
        arrival: Date,
        departure: Date,
        latitude: Double,
        longitude: Double
    ) {
        self.arrival = arrival
        self.departure = departure
        self.latitude = latitude
        self.longitude = longitude
    }

    /// Create from a CLVisit
    public init(visit: CLVisit) {
        self.arrival = visit.arrivalDate
        self.departure = visit.departureDate
        self.latitude = visit.coordinate.latitude
        self.longitude = visit.coordinate.longitude
    }
}
