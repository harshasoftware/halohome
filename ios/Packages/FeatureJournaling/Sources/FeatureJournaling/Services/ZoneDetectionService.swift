import Foundation

// MARK: - Zone Detection Protocol

/// Protocol for detecting planetary influences at a given coordinate
/// Implemented by the integration layer bridging to AstroCore
public protocol ZoneDetectionProtocol: Sendable {
    /// Detect active planetary influences near a coordinate
    /// - Parameters:
    ///   - latitude: Location latitude
    ///   - longitude: Location longitude
    /// - Returns: Array of planetary influences within detection threshold
    func detectInfluences(
        latitude: Double,
        longitude: Double
    ) async throws -> [PlanetaryInfluence]
}

// MARK: - Zone Detection Errors

public enum ZoneDetectionError: Error, LocalizedError {
    case noBirthDataAvailable
    case calculationFailed(String)

    public var errorDescription: String? {
        switch self {
        case .noBirthDataAvailable:
            return "No birth data available for zone detection"
        case .calculationFailed(let message):
            return "Zone detection failed: \(message)"
        }
    }
}
