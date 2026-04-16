import Foundation
import CoreLocation

// MARK: - Airport Model

/// Airport with IATA code and coordinates (matches web CompactAirport)
public struct Airport: Codable, Sendable {
    public let iataCode: String
    public let name: String
    public let city: String
    public let country: String
    public let latitude: Double
    public let longitude: Double

    enum CodingKeys: String, CodingKey {
        case iataCode = "i"
        case name = "n"
        case city = "c"
        case country = "co"
        case latitude = "la"
        case longitude = "lo"
    }
}

// MARK: - Airport Service

/// Loads and searches ~3,300 airports with IATA codes.
/// Matches web airportData.ts — lazy-loaded, Haversine nearest-airport lookup.
public actor AirportService {

    public static let shared = AirportService()

    private var airports: [Airport]?

    // MARK: - Loading

    /// Lazy-load airports from bundled JSON
    public func loadAirports() -> [Airport] {
        if let cached = airports { return cached }

        guard let url = Bundle.module.url(forResource: "airports", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let decoded = try? JSONDecoder().decode([Airport].self, from: data) else {
            return []
        }

        airports = decoded
        return decoded
    }

    // MARK: - Nearest Airport

    /// Find the nearest airport to given coordinates using Haversine distance.
    /// Matches web findNearestAirport().
    public func findNearestAirport(latitude: Double, longitude: Double) -> Airport? {
        let airports = loadAirports()
        guard !airports.isEmpty else { return nil }

        var nearest: Airport?
        var minDistance = Double.greatestFiniteMagnitude

        for airport in airports {
            let d = haversineDistance(
                lat1: latitude, lon1: longitude,
                lat2: airport.latitude, lon2: airport.longitude
            )
            if d < minDistance {
                minDistance = d
                nearest = airport
            }
        }

        return nearest
    }

    // MARK: - Haversine

    private func haversineDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double) -> Double {
        let R = 6371.0 // Earth radius in km
        let dLat = (lat2 - lat1) * .pi / 180
        let dLon = (lon2 - lon1) * .pi / 180
        let a = sin(dLat / 2) * sin(dLat / 2) +
                cos(lat1 * .pi / 180) * cos(lat2 * .pi / 180) *
                sin(dLon / 2) * sin(dLon / 2)
        let c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return R * c
    }
}
