import Foundation
import FeatureScout

// Import only the specific AstroCore structs we need to avoid ambiguity
// (AstroCore module contains a class also named `AstroCore`, so
//  `import CartoStarCore` + `AstroCore.PlanetaryLine` resolves to the class)
import struct CartoStarCore.PlanetaryLine
import struct CartoStarCore.AspectLine
import struct CartoStarCore.ParanLine
import struct CartoStarCore.GlobePoint
import struct CartoStarCore.ZenithPoint

/// Converts AstroCore calculation results into FeatureScout-compatible types.
/// AstroCore uses String-based planet/lineType and GlobePoint(lat, lng).
/// FeatureScout uses String-based planet/lineType and (latitude, longitude) tuples.
enum AstroScoutAdapter {

    /// Create a fully-wired ScoutViewModel backed by Rust scoring
    @MainActor
    static func makeScoutViewModel(pipelineSettings: PipelineSettings? = nil) -> ScoutViewModel {
        let settings = pipelineSettings ?? PipelineSettings()
        let provider = LiveScoutScoringProvider()
        let service = ScoutService(scoringProvider: provider)
        return ScoutViewModel(scoutService: service, pipelineSettings: settings)
    }

    /// Convert AstroCore PlanetaryLine array → FeatureScout.PlanetaryLine array
    static func convertPlanetaryLines(_ lines: [PlanetaryLine]) -> [FeatureScout.PlanetaryLine] {
        lines.map { line in
            FeatureScout.PlanetaryLine(
                planet: line.planet,
                lineType: line.lineType,
                points: line.points.map { (latitude: $0.lat, longitude: $0.lng) }
            )
        }
    }

    /// Convert AstroCore AspectLine array → FeatureScout.AspectLine array
    static func convertAspectLines(_ lines: [AspectLine]) -> [FeatureScout.AspectLine] {
        lines.compactMap { (line: AspectLine) -> FeatureScout.AspectLine? in
            guard let aspectType = mapAspectType(line.aspectType) else {
                return nil
            }
            return FeatureScout.AspectLine(
                planet: line.planet,
                angle: line.angle,
                aspectType: aspectType,
                points: line.points.map { (latitude: $0.lat, longitude: $0.lng) }
            )
        }
    }

    /// Serialize AstroCore ParanLine array → JSON string matching Rust's ParanPoint struct
    static func serializeParanLines(_ parans: [ParanLine]) -> String {
        struct ParanDTO: Encodable {
            let planet1: String
            let angle1: String
            let planet2: String
            let angle2: String
            let latitude: Double
            let longitude: Double?
        }

        let dtos = parans.map {
            ParanDTO(
                planet1: $0.planet1, angle1: $0.angle1,
                planet2: $0.planet2, angle2: $0.angle2,
                latitude: $0.latitude, longitude: $0.longitude
            )
        }
        guard let data = try? JSONEncoder().encode(dtos) else { return "[]" }
        return String(data: data, encoding: .utf8) ?? "[]"
    }

    /// Serialize AstroCore ZenithPoint array → JSON string for Rust scoring
    /// Format matches web: [{"planet":"Sun","declination":23.4,"longitude":120.5}, ...]
    static func serializeZenithPoints(_ points: [ZenithPoint]) -> String {
        struct ZenithDTO: Encodable {
            let planet: String
            let declination: Double
            let longitude: Double
        }

        let dtos = points.map {
            ZenithDTO(planet: $0.planet, declination: $0.declination, longitude: $0.longitude)
        }
        guard let data = try? JSONEncoder().encode(dtos) else { return "[]" }
        return String(data: data, encoding: .utf8) ?? "[]"
    }

    // MARK: - Aspect Type Mapping

    private static func mapAspectType(_ type: String) -> FeatureScout.AspectType? {
        // Rust produces aspect types with direction suffix: "trine+", "sextile-", "square+"
        // Strip the trailing +/- before matching (matches web's .replace(/[+-]$/, ''))
        var base = type.lowercased()
        if base.hasSuffix("+") || base.hasSuffix("-") {
            base.removeLast()
        }
        switch base {
        case "conjunction": return .conjunction
        case "trine": return .trine
        case "sextile": return .sextile
        case "square": return .square
        case "opposition": return .opposition
        case "quincunx": return .quincunx
        case "sesquisquare": return .sesquisquare
        default: return nil
        }
    }
}
