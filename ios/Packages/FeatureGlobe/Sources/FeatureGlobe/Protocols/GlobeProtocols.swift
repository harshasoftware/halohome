import Foundation
import CoreLocation

// MARK: - Astro Line Bundle

/// Bundle of all line types returned from a single calculation
public struct AstroLineBundle: Sendable, Equatable {
    public let planetaryLines: [AstroLine]
    public let aspectLines: [GlobeAspectLine]
    public let paranLines: [GlobeParanLine]
    public let zenithPoints: [GlobeZenithPoint]

    /// GMST in radians at birth moment (from AstroResult)
    public let gmst: Double?

    /// Julian Date at birth moment (from AstroResult)
    public let julianDate: Double?

    /// Moon's tropical ecliptic longitude in degrees at birth (used for Tarabala calculation)
    public let moonTropicalLongitude: Double?

    public init(
        planetaryLines: [AstroLine] = [],
        aspectLines: [GlobeAspectLine] = [],
        paranLines: [GlobeParanLine] = [],
        zenithPoints: [GlobeZenithPoint] = [],
        gmst: Double? = nil,
        julianDate: Double? = nil,
        moonTropicalLongitude: Double? = nil
    ) {
        self.planetaryLines = planetaryLines
        self.aspectLines = aspectLines
        self.paranLines = paranLines
        self.zenithPoints = zenithPoints
        self.gmst = gmst
        self.julianDate = julianDate
        self.moonTropicalLongitude = moonTropicalLongitude
    }
}

// MARK: - AstroCore Provider Protocol

/// Protocol for providing astrological calculations
/// This will be implemented by the actual AstroCore package
public protocol AstroLineProvider: Sendable {
    /// Calculate astrocartography lines for given birth data
    func calculateAstroLines(
        birthDate: Date,
        birthTime: Date,
        birthLocation: GlobeCoordinate
    ) async throws -> AstroLineBundle

    /// Get line interpretation for a specific location
    func getLineInterpretation(
        line: AstroLine,
        location: GlobeCoordinate
    ) async throws -> String

    /// Calculate local space lines radiating from a location
    func calculateLocalSpaceLines(
        birthDate: Date,
        birthTime: Date,
        birthLocation: GlobeCoordinate,
        maxDistanceKm: Double,
        stepKm: Double
    ) async throws -> [AstroLine]
}

/// Default implementation so existing conformers don't break
public extension AstroLineProvider {
    func calculateLocalSpaceLines(
        birthDate: Date,
        birthTime: Date,
        birthLocation: GlobeCoordinate,
        maxDistanceKm: Double = 500,
        stepKm: Double = 10
    ) async throws -> [AstroLine] { [] }
}

// MARK: - Geocoding Provider Protocol

/// Protocol for reverse geocoding coordinates to location names
public protocol GeocodingProvider: Sendable {
    /// Convert coordinates to a location name
    func reverseGeocode(coordinate: GlobeCoordinate) async throws -> SelectedLocation
}

// MARK: - Tile Provider Protocol

/// Protocol for custom tile loading
public protocol TileProvider: Sendable {
    /// Load a tile at the specified coordinates and zoom level
    func loadTile(x: Int, y: Int, z: Int) async throws -> Data

    /// Check if a tile is cached
    func isTileCached(x: Int, y: Int, z: Int) -> Bool

    /// Clear the tile cache
    func clearCache() async throws
}

// MARK: - Natal Chart Provider Protocol

/// Protocol for providing natal chart calculations
/// Implemented by the integration layer wrapping AstroCore
public protocol NatalChartProvider: Sendable {
    /// Calculate natal chart for given birth data and settings
    func calculateNatalChart(
        birthDate: Date,
        birthTime: Date,
        birthLocation: GlobeCoordinate,
        houseSystem: String,
        useSidereal: Bool,
        ayanamsaSystem: String
    ) async throws -> NatalChartData
}

// MARK: - Globe Event Handler Protocol

/// Protocol for handling globe interaction events
public protocol GlobeEventHandler: AnyObject {
    /// Called when a location is tapped
    func didTapLocation(_ coordinate: GlobeCoordinate)

    /// Called when a location is long-pressed
    func didLongPressLocation(_ coordinate: GlobeCoordinate)

    /// Called when a marker is tapped
    func didTapMarker(_ marker: GlobeMarker)

    /// Called when an astro line is tapped
    func didTapLine(_ line: AstroLine, nearCoordinate: GlobeCoordinate)

    /// Called when the camera position changes
    func didChangeCamera(_ cameraState: GlobeCameraState)
}

// MARK: - Default Implementation

/// Default stub implementation for AstroLineProvider during development
public struct StubAstroLineProvider: AstroLineProvider {
    public init() {}

    public func calculateAstroLines(
        birthDate: Date,
        birthTime: Date,
        birthLocation: GlobeCoordinate
    ) async throws -> AstroLineBundle {
        // Return sample lines for UI development
        // These will be replaced by actual calculations from AstroCore
        var lines: [AstroLine] = []

        // Generate sample lines for each planet and line type
        for planet in Planet.allCases {
            for lineType in AstroLineType.allCases {
                let coordinates = generateSampleLineCoordinates(
                    for: planet,
                    lineType: lineType,
                    birthLocation: birthLocation
                )
                lines.append(AstroLine(
                    planet: planet,
                    lineType: lineType,
                    coordinates: coordinates
                ))
            }
        }

        return AstroLineBundle(planetaryLines: lines)
    }

    public func getLineInterpretation(
        line: AstroLine,
        location: GlobeCoordinate
    ) async throws -> String {
        return "Sample interpretation for \(line.displayName) at coordinates (\(location.latitude), \(location.longitude))"
    }

    private func generateSampleLineCoordinates(
        for planet: Planet,
        lineType: AstroLineType,
        birthLocation: GlobeCoordinate
    ) -> [GlobeCoordinate] {
        // Generate vertical line (MC/IC) or curved line (ASC/DSC)
        var coordinates: [GlobeCoordinate] = []

        switch lineType {
        case .midheaven, .imumCoeli:
            // Vertical lines
            let baseLongitude = birthLocation.longitude + Double(planet.hashValue % 360 - 180)
            for lat in stride(from: -85.0, through: 85.0, by: 5.0) {
                coordinates.append(GlobeCoordinate(latitude: lat, longitude: baseLongitude))
            }

        case .ascendant, .descendant:
            // Curved lines
            let offset = lineType == .ascendant ? -90.0 : 90.0
            for lon in stride(from: -180.0, through: 180.0, by: 5.0) {
                let lat = 23.5 * sin((lon - birthLocation.longitude + offset) * .pi / 180)
                    + Double(planet.hashValue % 40 - 20)
                coordinates.append(GlobeCoordinate(latitude: lat, longitude: lon))
            }
        }

        return coordinates
    }
}

/// Default stub implementation for NatalChartProvider during development
struct StubNatalChartProvider: NatalChartProvider {
    public init() {}

    public func calculateNatalChart(
        birthDate: Date,
        birthTime: Date,
        birthLocation: GlobeCoordinate,
        houseSystem: String,
        useSidereal: Bool,
        ayanamsaSystem: String = "lahiri"
    ) async throws -> NatalChartData {
        // Return empty chart data for UI development
        return NatalChartData(
            ascendant: 0,
            midheaven: 90,
            descendant: 180,
            imumCoeli: 270,
            houseCusps: (0..<12).map { Double($0) * 30.0 },
            houseSystem: houseSystem,
            planets: [],
            zodiacType: useSidereal ? "sidereal" : "tropical"
        )
    }
}

/// Default stub implementation for GeocodingProvider during development
public struct StubGeocodingProvider: GeocodingProvider {
    public init() {}

    public func reverseGeocode(coordinate: GlobeCoordinate) async throws -> SelectedLocation {
        // Return a placeholder location
        // This will be replaced by actual geocoding from Radar.io
        return SelectedLocation(
            coordinate: coordinate,
            name: "Selected Location",
            country: nil,
            timezone: nil
        )
    }
}
