import Foundation
import FeatureGlobe
@preconcurrency import CartoStarCore
import struct CartoStarCore.BirthData
import Core
import os.log

/// Typealias to disambiguate from FeatureBirthData.BirthData
private typealias AstroBirthData = BirthData

private let logger = Logger(subsystem: "com.halohome.integration", category: "AstroLineProvider")

/// Live implementation of AstroLineProvider using the Rust-based AstroCore engine.
/// Bridges AstroCore calculations → FeatureGlobe.AstroLine format.
@available(iOS 17.0, *)
struct LiveAstroLineProvider: AstroLineProvider {

    private let calculator = AstroCore()

    func calculateAstroLines(
        birthDate: Date,
        birthTime: Date,
        birthLocation: GlobeCoordinate
    ) async throws -> AstroLineBundle {
        let birthData = buildBirthData(date: birthDate, time: birthTime, location: birthLocation)

        // Run Rust calculation on background thread (CPU-intensive)
        let result = try await Task.detached(priority: .userInitiated) {
            try calculator.calculateLines(birthData: birthData)
        }.value

        // Debug: Log counts from Rust result
        let paranWithLongitude = result.paranLines.filter { $0.longitude != nil }.count
        logger.info("[AstroCore] Rust returned: \(result.planetaryLines.count) planetary, \(result.aspectLines.count) aspect, \(result.paranLines.count) paran lines (\(paranWithLongitude) with longitude)")

        let convertedAspects = convertAspectLines(result.aspectLines)
        logger.info("[AstroCore] After conversion: \(convertedAspects.count) aspect lines")

        let moonLon = result.planetaryPositions.first(where: { $0.planet == "Moon" })?.eclipticLongitude

        return AstroLineBundle(
            planetaryLines: convertLines(result.planetaryLines),
            aspectLines: convertedAspects,
            paranLines: convertParanLines(result.paranLines),
            zenithPoints: convertZenithPoints(result.zenithPoints),
            gmst: result.gmst,
            julianDate: result.julianDate,
            moonTropicalLongitude: moonLon
        )
    }

    func getLineInterpretation(
        line: AstroLine,
        location: GlobeCoordinate
    ) async throws -> String {
        // Basic interpretation — will be enhanced with Supabase edge function later
        return "\(line.planet.rawValue) \(line.lineType.displayName) line — \(line.planet.rawValue) energy is strong at this location."
    }

    func calculateLocalSpaceLines(
        birthDate: Date,
        birthTime: Date,
        birthLocation: GlobeCoordinate,
        maxDistanceKm: Double = 500,
        stepKm: Double = 10
    ) async throws -> [AstroLine] {
        let birthData = buildBirthData(date: birthDate, time: birthTime, location: birthLocation)

        let result = try await Task.detached(priority: .userInitiated) {
            try self.calculator.calculateLocalSpace(
                birthData: birthData,
                maxDistanceKm: maxDistanceKm,
                stepKm: stepKm
            )
        }.value

        logger.info("[AstroCore] Local space: \(result.lines.count) lines calculated")

        return result.lines.compactMap { line -> AstroLine? in
            guard let planet = mapPlanet(line.planet) else { return nil }
            let coordinates = line.points.map { GlobeCoordinate(latitude: $0.lat, longitude: $0.lng) }
            return AstroLine(
                id: "ls-\(line.planet)-\(line.direction)",
                planet: planet,
                lineType: .ascendant, // Rendered as dashed via localSpaceLines layer
                coordinates: coordinates
            )
        }
    }

    // MARK: - Helpers

    private func buildBirthData(date: Date, time: Date, location: GlobeCoordinate) -> AstroBirthData {
        let calendar = Calendar(identifier: .gregorian)
        let dc = calendar.dateComponents([.year, .month, .day], from: date)
        let tc = calendar.dateComponents([.hour, .minute, .second], from: time)
        return AstroBirthData(
            year: Int32(dc.year ?? 2000),
            month: UInt32(dc.month ?? 1),
            day: UInt32(dc.day ?? 1),
            hour: UInt32(tc.hour ?? 12),
            minute: UInt32(tc.minute ?? 0),
            second: UInt32(tc.second ?? 0),
            latitude: location.latitude,
            longitude: location.longitude
        )
    }

    private func convertLines(_ planetaryLines: [PlanetaryLine]) -> [AstroLine] {
        planetaryLines.compactMap { (line: PlanetaryLine) -> AstroLine? in
            guard let planet = mapPlanet(line.planet),
                  let lineType = mapLineType(line.lineType) else {
                AppLogger.debug("Skipping unmapped line: planet=\(line.planet) lineType=\(line.lineType)", category: AppLogger.feature)
                return nil
            }

            let coordinates = line.points.map { point in
                GlobeCoordinate(latitude: point.lat, longitude: point.lng)
            }

            return AstroLine(
                id: "\(line.planet)-\(line.lineType)",
                planet: planet,
                lineType: lineType,
                coordinates: coordinates
            )
        }
    }

    private func convertAspectLines(_ aspectLines: [AspectLine]) -> [GlobeAspectLine] {
        aspectLines.compactMap { line -> GlobeAspectLine? in
            guard let planet = mapPlanet(line.planet) else {
                AppLogger.debug("Skipping unmapped aspect line: planet=\(line.planet)", category: AppLogger.feature)
                return nil
            }

            let coordinates = line.points.map { point in
                GlobeCoordinate(latitude: point.lat, longitude: point.lng)
            }

            return GlobeAspectLine(
                id: "\(line.planet)-\(line.angle)-\(line.aspectType)",
                planet: planet,
                angle: line.angle,
                aspectType: line.aspectType,
                isHarmonious: line.isHarmonious,
                coordinates: coordinates,
                color: line.color
            )
        }
    }

    private func convertParanLines(_ paranLines: [ParanLine]) -> [GlobeParanLine] {
        paranLines.map { line in
            GlobeParanLine(
                id: "\(line.planet1)-\(line.angle1)-\(line.planet2)-\(line.angle2)",
                planet1: line.planet1,
                angle1: line.angle1,
                planet2: line.planet2,
                angle2: line.angle2,
                latitude: line.latitude,
                longitude: line.longitude  // Pass through for paran crossing points
            )
        }
    }

    private func convertZenithPoints(_ zenithPoints: [ZenithPoint]) -> [GlobeZenithPoint] {
        zenithPoints.compactMap { point -> GlobeZenithPoint? in
            guard let planet = mapPlanet(point.planet) else {
                AppLogger.debug("Skipping unmapped zenith point: planet=\(point.planet)", category: AppLogger.feature)
                return nil
            }

            return GlobeZenithPoint(
                id: "zenith-\(point.planet)",
                planet: planet,
                coordinate: GlobeCoordinate(latitude: point.latitude, longitude: point.longitude)
            )
        }
    }

    // MARK: - Type Mapping

    private func mapPlanet(_ name: String) -> Planet? {
        switch name {
        case "Sun": return .sun
        case "Moon": return .moon
        case "Mercury": return .mercury
        case "Venus": return .venus
        case "Mars": return .mars
        case "Jupiter": return .jupiter
        case "Saturn": return .saturn
        case "Uranus": return .uranus
        case "Neptune": return .neptune
        case "Pluto": return .pluto
        case "Chiron": return .chiron
        case "NorthNode": return .northNode
        case "SouthNode": return .southNode
        default: return nil
        }
    }

    private func mapLineType(_ type: String) -> FeatureGlobe.AstroLineType? {
        switch type {
        case "MC": return .midheaven
        case "IC": return .imumCoeli
        case "ASC": return .ascendant
        case "DSC": return .descendant
        default: return nil
        }
    }
}
