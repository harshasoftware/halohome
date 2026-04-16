import Foundation
import FeatureGlobe
@preconcurrency import CartoStarCore
import struct CartoStarCore.BirthData

/// Typealias to disambiguate from FeatureBirthData.BirthData
private typealias AstroBirthData = BirthData

/// Live implementation of NatalChartProvider using the Rust-based AstroCore engine.
/// Bridges AstroCore.calculateNatalChart → FeatureGlobe.NatalChartData format.
@available(iOS 17.0, *)
struct LiveNatalChartProvider: NatalChartProvider {

    private let calculator = AstroCore()

    func calculateNatalChart(
        birthDate: Date,
        birthTime: Date,
        birthLocation: GlobeCoordinate,
        houseSystem: String,
        useSidereal: Bool,
        ayanamsaSystem: String = "lahiri"
    ) async throws -> NatalChartData {
        let birthData = buildBirthData(date: birthDate, time: birthTime, location: birthLocation)

        // Run Rust calculation on background thread (CPU-intensive)
        let result = try await Task.detached(priority: .userInitiated) {
            try calculator.calculateNatalChart(
                birthData: birthData,
                houseSystem: houseSystem,
                useSidereal: useSidereal,
                ayanamsaSystem: ayanamsaSystem
            )
        }.value

        return convertResult(result)
    }

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

    private func convertResult(_ result: NatalChartResult) -> NatalChartData {
        let isSidereal = result.zodiacType == "sidereal"
        let planets = result.planets.map { p in
            // In sidereal mode, use sidereal longitude for chart rendering
            // to match sidereal-adjusted house cusps and ascendant
            let displayLongitude = isSidereal ? (p.longitudeSidereal ?? p.longitude) : p.longitude
            return NatalChartPlanet(
                planet: p.planet,
                longitude: displayLongitude,
                signName: p.signName,
                degreeInSign: p.degreeInSign,
                retrograde: p.retrograde,
                house: p.house
            )
        }
        return NatalChartData(
            ascendant: result.ascendant,
            midheaven: result.midheaven,
            descendant: result.descendant,
            imumCoeli: result.imumCoeli,
            houseCusps: result.houseCusps,
            houseSystem: result.houseSystem,
            planets: planets,
            zodiacType: result.zodiacType
        )
    }
}
