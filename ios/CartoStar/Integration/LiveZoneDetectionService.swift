import Foundation
import FeatureJournaling
@preconcurrency import CartoStarCore
import struct CartoStarCore.BirthData
import Core

/// Typealias to disambiguate from FeatureBirthData.BirthData
private typealias AstroBirthData = BirthData

/// Live implementation of ZoneDetectionProtocol using the Rust-based AstroCore engine.
/// Detects which planetary lines are near a given coordinate.
@available(iOS 17.0, *)
struct LiveZoneDetectionService: ZoneDetectionProtocol {

    /// Maximum distance in km to consider a line as "active" at a location
    private let detectionThresholdKm: Double = 200.0

    private let calculator = AstroCore()

    /// Birth data provider closure — called each time to get current birth data
    private let birthDataProvider: @Sendable () async -> (date: Date, time: Date, latitude: Double, longitude: Double)?

    init(birthDataProvider: @escaping @Sendable () async -> (date: Date, time: Date, latitude: Double, longitude: Double)?) {
        self.birthDataProvider = birthDataProvider
    }

    func detectInfluences(
        latitude: Double,
        longitude: Double
    ) async throws -> [PlanetaryInfluence] {
        guard let birth = await birthDataProvider() else {
            throw ZoneDetectionError.noBirthDataAvailable
        }

        let birthData = AstroBirthData(
            year: Int32(Calendar.current.component(.year, from: birth.date)),
            month: UInt32(Calendar.current.component(.month, from: birth.date)),
            day: UInt32(Calendar.current.component(.day, from: birth.date)),
            hour: UInt32(Calendar.current.component(.hour, from: birth.time)),
            minute: UInt32(Calendar.current.component(.minute, from: birth.time)),
            second: UInt32(Calendar.current.component(.second, from: birth.time)),
            latitude: birth.latitude,
            longitude: birth.longitude
        )

        // Run Rust calculation on background thread
        let result = try await Task.detached(priority: .userInitiated) {
            try calculator.calculateLines(birthData: birthData)
        }.value

        // Find lines near the target coordinate
        var influences: [PlanetaryInfluence] = []

        for line in result.planetaryLines {
            let minDistance = minimumDistance(
                from: (latitude, longitude),
                toPolyline: line.points.map { ($0.lat, $0.lng) }
            )

            if minDistance <= detectionThresholdKm {
                let lineTypeName = mapLineType(line.lineType)
                influences.append(PlanetaryInfluence(
                    planet: line.planet,
                    lineType: lineTypeName,
                    distanceKm: minDistance,
                    interpretation: basicInterpretation(planet: line.planet, lineType: lineTypeName)
                ))
            }
        }

        // Sort by distance (closest first)
        influences.sort { $0.distanceKm < $1.distanceKm }

        AppLogger.info("Detected \(influences.count) influences at (\(latitude), \(longitude))", category: AppLogger.feature)
        return influences
    }

    // MARK: - Distance Calculation

    /// Calculate minimum Haversine distance from a point to a polyline in km
    private func minimumDistance(
        from point: (lat: Double, lng: Double),
        toPolyline polyline: [(lat: Double, lng: Double)]
    ) -> Double {
        guard !polyline.isEmpty else { return .infinity }

        var minDist = Double.infinity
        for vertex in polyline {
            let dist = haversineDistance(
                lat1: point.lat, lon1: point.lng,
                lat2: vertex.lat, lon2: vertex.lng
            )
            minDist = min(minDist, dist)
        }
        return minDist
    }

    /// Haversine distance between two coordinates in km
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

    // MARK: - Type Mapping

    private func mapLineType(_ type: String) -> String {
        switch type {
        case "MC": return "Midheaven"
        case "IC": return "Imum Coeli"
        case "ASC": return "Ascendant"
        case "DSC": return "Descendant"
        default: return type
        }
    }

    private func basicInterpretation(planet: String, lineType: String) -> String {
        "\(planet) \(lineType) energy is active at this location. This influence may affect your experiences here."
    }
}
