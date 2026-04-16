import Foundation
import CoreLocation

// MARK: - Coordinate Types

/// A geographic coordinate with latitude and longitude
public struct GlobeCoordinate: Equatable, Hashable, Codable, Sendable {
    public let latitude: Double
    public let longitude: Double

    public init(latitude: Double, longitude: Double) {
        self.latitude = latitude
        self.longitude = longitude
    }

    public init(from location: CLLocationCoordinate2D) {
        self.latitude = location.latitude
        self.longitude = location.longitude
    }

    public var clLocationCoordinate: CLLocationCoordinate2D {
        CLLocationCoordinate2D(latitude: latitude, longitude: longitude)
    }
}

// MARK: - Camera State

/// Represents the camera position and orientation on the globe
public struct GlobeCameraState: Equatable, Sendable {
    /// Center coordinate the camera is looking at
    public var center: GlobeCoordinate

    /// Zoom level (0-22)
    public var zoom: Double

    /// Camera pitch in degrees (0 = looking straight down, 60 = tilted view)
    public var pitch: Double

    /// Camera bearing/rotation in degrees (0 = north up)
    public var bearing: Double

    public init(
        center: GlobeCoordinate = GlobeCoordinate(latitude: 0, longitude: 0),
        zoom: Double = 2.0,
        pitch: Double = 0,
        bearing: Double = 0
    ) {
        self.center = center
        self.zoom = zoom
        self.pitch = pitch
        self.bearing = bearing
    }

    /// Default initial camera state for astrocartography view
    public static let initial = GlobeCameraState(
        center: GlobeCoordinate(latitude: 20, longitude: 0),
        zoom: 0.3,
        pitch: 0,
        bearing: 0
    )
}

// MARK: - Astro Line Types

/// Types of astrocartography lines
public enum AstroLineType: String, CaseIterable, Codable, Sendable {
    /// Ascendant line - where the planet was rising on the eastern horizon
    case ascendant = "ASC"
    /// Descendant line - where the planet was setting on the western horizon
    case descendant = "DSC"
    /// Midheaven/Medium Coeli line - where the planet was at its highest point
    case midheaven = "MC"
    /// Imum Coeli line - where the planet was at its lowest point
    case imumCoeli = "IC"

    public var displayName: String {
        switch self {
        case .ascendant: return "Ascendant"
        case .descendant: return "Descendant"
        case .midheaven: return "Midheaven"
        case .imumCoeli: return "Imum Coeli"
        }
    }

    public var shortName: String {
        rawValue
    }
}

/// Celestial bodies used in astrocartography
public enum Planet: String, CaseIterable, Codable, Sendable {
    case sun = "Sun"
    case moon = "Moon"
    case mercury = "Mercury"
    case venus = "Venus"
    case mars = "Mars"
    case jupiter = "Jupiter"
    case saturn = "Saturn"
    case uranus = "Uranus"
    case neptune = "Neptune"
    case pluto = "Pluto"
    case chiron = "Chiron"
    case northNode = "NorthNode"
    case southNode = "SouthNode"

    /// Symbol character for the planet
    public var symbol: String {
        switch self {
        case .sun: return "\u{2609}"      // Sun symbol
        case .moon: return "\u{263D}"     // Moon symbol
        case .mercury: return "\u{263F}"  // Mercury symbol
        case .venus: return "\u{2640}"    // Venus symbol
        case .mars: return "\u{2642}"     // Mars symbol
        case .jupiter: return "\u{2643}"  // Jupiter symbol
        case .saturn: return "\u{2644}"   // Saturn symbol
        case .uranus: return "\u{2645}"   // Uranus symbol
        case .neptune: return "\u{2646}"  // Neptune symbol
        case .pluto: return "\u{2647}"    // Pluto symbol
        case .chiron: return "\u{26B7}"   // Chiron symbol
        case .northNode: return "\u{260A}" // North Node symbol
        case .southNode: return "\u{260B}" // South Node symbol
        }
    }
}

/// Represents a single astrocartography line
public struct AstroLine: Identifiable, Equatable, Hashable, Sendable {
    public let id: String
    public let planet: Planet
    public let lineType: AstroLineType
    public let coordinates: [GlobeCoordinate]

    public init(
        id: String = UUID().uuidString,
        planet: Planet,
        lineType: AstroLineType,
        coordinates: [GlobeCoordinate]
    ) {
        self.id = id
        self.planet = planet
        self.lineType = lineType
        self.coordinates = coordinates
    }

    /// Display name combining planet and line type
    public var displayName: String {
        "\(planet.rawValue) \(lineType.displayName)"
    }

    /// Short identifier like "Sun MC" or "Moon ASC"
    public var shortName: String {
        "\(planet.rawValue) \(lineType.shortName)"
    }
}

// MARK: - Aspect Line

/// Represents an aspect line between planetary positions
public struct GlobeAspectLine: Identifiable, Equatable, Sendable {
    public let id: String
    public let planet: Planet
    public let angle: String
    public let aspectType: String
    public let isHarmonious: Bool
    public let coordinates: [GlobeCoordinate]
    public let color: String

    public init(
        id: String = UUID().uuidString,
        planet: Planet,
        angle: String,
        aspectType: String,
        isHarmonious: Bool,
        coordinates: [GlobeCoordinate],
        color: String
    ) {
        self.id = id
        self.planet = planet
        self.angle = angle
        self.aspectType = aspectType
        self.isHarmonious = isHarmonious
        self.coordinates = coordinates
        self.color = color
    }
}

// MARK: - Paran Line

/// Represents a paran crossing point where two planets share angular relationships.
/// Rendered as a point marker (not a latitude circle line).
public struct GlobeParanLine: Identifiable, Equatable, Sendable {
    public let id: String
    public let planet1: String
    public let angle1: String
    public let planet2: String
    public let angle2: String
    public let latitude: Double
    public let longitude: Double?  // For paran crossing points
    public let isTransit: Bool

    public init(
        id: String = UUID().uuidString,
        planet1: String,
        angle1: String,
        planet2: String,
        angle2: String,
        latitude: Double,
        longitude: Double? = nil,
        isTransit: Bool = false
    ) {
        self.id = id
        self.planet1 = planet1
        self.angle1 = angle1
        self.planet2 = planet2
        self.angle2 = angle2
        self.latitude = latitude
        self.longitude = longitude
        self.isTransit = isTransit
    }
}

// MARK: - Zenith Point

/// Represents a zenith point where a planet is directly overhead
public struct GlobeZenithPoint: Identifiable, Equatable, Sendable {
    public let id: String
    public let planet: Planet
    public let coordinate: GlobeCoordinate

    public init(
        id: String = UUID().uuidString,
        planet: Planet,
        coordinate: GlobeCoordinate
    ) {
        self.id = id
        self.planet = planet
        self.coordinate = coordinate
    }
}

// MARK: - Line Visibility

/// Configuration for which lines are visible
public struct AstroLineVisibility: Equatable, Sendable, Codable {
    /// Which planets' lines to show
    public var visiblePlanets: Set<Planet>

    /// Which line types to show
    public var visibleLineTypes: Set<AstroLineType>

    /// Whether harmonious aspect lines are visible (trine, sextile)
    public var showHarmoniousAspects: Bool

    /// Whether disharmonious aspect lines are visible (square, opposition)
    public var showDisharmoniousAspects: Bool

    /// Computed property for backwards compatibility - true if either aspect type is shown
    public var showAspects: Bool {
        showHarmoniousAspects || showDisharmoniousAspects
    }

    /// Whether paran lines are visible (for future rendering)
    public var showParans: Bool

    /// Whether zenith points are visible (for future rendering)
    public var showZeniths: Bool

    /// Whether nakshatra (lunar mansion) bands are visible on the globe
    public var showNakshatraBands: Bool

    /// Whether line labels (planet symbol + line type) are shown along lines
    public var showLineLabels: Bool

    public init(
        visiblePlanets: Set<Planet> = Set(Planet.allCases),
        visibleLineTypes: Set<AstroLineType> = Set(AstroLineType.allCases),
        showHarmoniousAspects: Bool = false,
        showDisharmoniousAspects: Bool = false,
        showParans: Bool = false,
        showZeniths: Bool = true,
        showNakshatraBands: Bool = false,
        showLineLabels: Bool = false
    ) {
        self.visiblePlanets = visiblePlanets
        self.visibleLineTypes = visibleLineTypes
        self.showHarmoniousAspects = showHarmoniousAspects
        self.showDisharmoniousAspects = showDisharmoniousAspects
        self.showParans = showParans
        self.showZeniths = showZeniths
        self.showNakshatraBands = showNakshatraBands
        self.showLineLabels = showLineLabels
    }

    /// Check if a specific line should be visible
    public func isVisible(_ line: AstroLine) -> Bool {
        visiblePlanets.contains(line.planet) && visibleLineTypes.contains(line.lineType)
    }

    /// All lines visible
    public static let all = AstroLineVisibility()

    /// No lines visible
    public static let none = AstroLineVisibility(
        visiblePlanets: [],
        visibleLineTypes: []
    )

    // MARK: - Persistence

    private static let storageKey = "astro_line_visibility"

    public static func loadSaved() -> AstroLineVisibility {
        guard let data = UserDefaults.standard.data(forKey: storageKey),
              let decoded = try? JSONDecoder().decode(AstroLineVisibility.self, from: data) else {
            return .all
        }
        return decoded
    }

    public func save() {
        guard let data = try? JSONEncoder().encode(self) else { return }
        UserDefaults.standard.set(data, forKey: AstroLineVisibility.storageKey)
    }
}

// MARK: - Selected Location

/// Represents a location selected on the globe
public struct SelectedLocation: Identifiable, Equatable, Sendable {
    public let id: String
    public let coordinate: GlobeCoordinate
    public let name: String?
    public let country: String?
    public let timezone: String?

    public init(
        id: String = UUID().uuidString,
        coordinate: GlobeCoordinate,
        name: String? = nil,
        country: String? = nil,
        timezone: String? = nil
    ) {
        self.id = id
        self.coordinate = coordinate
        self.name = name
        self.country = country
        self.timezone = timezone
    }

    /// Display name or formatted coordinates
    public var displayName: String {
        if let name = name {
            if let country = country {
                return "\(name), \(country)"
            }
            return name
        }
        return String(format: "%.4f, %.4f", coordinate.latitude, coordinate.longitude)
    }
}

// MARK: - Globe Marker

/// A marker to display on the globe
public struct GlobeMarker: Identifiable, Equatable, Hashable, Sendable {
    public let id: String
    public let coordinate: GlobeCoordinate
    public let title: String
    public let subtitle: String?
    public let type: MarkerType
    /// Avatar identifier for birthPlace markers (based on birth data hash)
    public let avatarIdentifier: String?

    public enum MarkerType: String, Codable, Sendable {
        case birthPlace
        case selectedLocation
        case scoutResult
        case favorite
        case custom
    }

    public init(
        id: String = UUID().uuidString,
        coordinate: GlobeCoordinate,
        title: String,
        subtitle: String? = nil,
        type: MarkerType = .custom,
        avatarIdentifier: String? = nil
    ) {
        self.id = id
        self.coordinate = coordinate
        self.title = title
        self.subtitle = subtitle
        self.type = type
        self.avatarIdentifier = avatarIdentifier
    }
}

// MARK: - Interaction Events

/// Events from globe interactions
public enum GlobeInteractionEvent: Equatable, Sendable {
    case locationTapped(GlobeCoordinate)
    case locationLongPressed(GlobeCoordinate)
    case markerTapped(GlobeMarker)
    case lineTapped(AstroLine, nearCoordinate: GlobeCoordinate)
    case aspectLineTapped(GlobeAspectLine, nearCoordinate: GlobeCoordinate)
    case paranPointTapped(GlobeParanLine)
    case zenithPointTapped(GlobeZenithPoint)
    case nakshatraTapped(NakshatraTapData)
    case cameraChanged(GlobeCameraState)
    case zoomChanged(Double)
}

// MARK: - Nakshatra Tap Data

/// Data passed when a nakshatra band is tapped on the globe
public struct NakshatraTapData: Equatable, Sendable {
    public let nakshatraIndex: Int  // 1-27
    public let pada: Int            // 1-4 (quarter within nakshatra)
    public let coordinate: GlobeCoordinate

    public init(nakshatraIndex: Int, pada: Int = 1, coordinate: GlobeCoordinate) {
        self.nakshatraIndex = nakshatraIndex
        self.pada = pada
        self.coordinate = coordinate
    }
}

// MARK: - Astro Line Card Data

/// Data model for the line info card shown when a line is tapped
public struct AstroLineCardData: Identifiable, Equatable, Sendable {
    public let id: String
    public let line: AstroLine
    public let nearestLocation: GlobeCoordinate
    public let distanceFromLine: Double?

    public init(
        line: AstroLine,
        nearestLocation: GlobeCoordinate,
        distanceFromLine: Double? = nil
    ) {
        self.id = "\(line.id)-\(nearestLocation.latitude)-\(nearestLocation.longitude)"
        self.line = line
        self.nearestLocation = nearestLocation
        self.distanceFromLine = distanceFromLine
    }

    /// Formatted distance string (e.g. "42 km")
    public var distanceString: String? {
        guard let distance = distanceFromLine else { return nil }
        if distance < 1 {
            return String(format: "%.0f m", distance * 1000)
        }
        return String(format: "%.0f km", distance)
    }
}

// MARK: - Aspect Line Card Data

/// Data model for the aspect line info card shown when an aspect line is tapped
public struct AspectLineCardData: Identifiable, Equatable, Sendable {
    public let id: String
    public let aspectLine: GlobeAspectLine
    public let nearestLocation: GlobeCoordinate
    public let distanceFromLine: Double?

    public init(
        aspectLine: GlobeAspectLine,
        nearestLocation: GlobeCoordinate,
        distanceFromLine: Double? = nil
    ) {
        self.id = "\(aspectLine.id)-\(nearestLocation.latitude)-\(nearestLocation.longitude)"
        self.aspectLine = aspectLine
        self.nearestLocation = nearestLocation
        self.distanceFromLine = distanceFromLine
    }

    /// Formatted distance string (e.g. "42 km")
    public var distanceString: String? {
        guard let distance = distanceFromLine else { return nil }
        if distance < 1 {
            return String(format: "%.0f m", distance * 1000)
        }
        return String(format: "%.0f km", distance)
    }

    /// Display name for the aspect (e.g. "Sun Trine ASC")
    public var displayName: String {
        // Avoid duplication when aspectType and angle carry the same word (e.g. transit aspect lines)
        if aspectLine.aspectType.lowercased() == aspectLine.angle.lowercased() {
            return "\(aspectLine.planet.rawValue) \(aspectLine.aspectType.capitalized)"
        }
        return "\(aspectLine.planet.rawValue) \(aspectLine.aspectType.capitalized) \(aspectLine.angle)"
    }

    /// Whether this is a harmonious (beneficial) or challenging aspect
    public var natureDescription: String {
        aspectLine.isHarmonious ? "Harmonious" : "Challenging"
    }
}

// MARK: - Paran Point Card Data

/// Data model for the paran point info card shown when a paran point is tapped
public struct ParanPointCardData: Identifiable, Equatable, Sendable {
    public let id: String
    public let paranLine: GlobeParanLine

    public init(paranLine: GlobeParanLine) {
        self.id = paranLine.id
        self.paranLine = paranLine
    }

    /// Display name (e.g. "Sun MC × Moon ASC")
    public var displayName: String {
        "\(paranLine.planet1) \(paranLine.angle1) × \(paranLine.planet2) \(paranLine.angle2)"
    }

    /// Short description of the paran
    public var description: String {
        "Where \(paranLine.planet1) on the \(paranLine.angle1) crosses \(paranLine.planet2) on the \(paranLine.angle2)"
    }

    /// Formatted latitude
    public var latitudeString: String {
        let direction = paranLine.latitude >= 0 ? "N" : "S"
        return String(format: "%.2f°%@", abs(paranLine.latitude), direction)
    }
}

// MARK: - Zenith Point Card Data

/// Data model for the zenith point info card shown when a zenith point is tapped
public struct ZenithPointCardData: Identifiable, Equatable, Sendable {
    public let id: String
    public let zenithPoint: GlobeZenithPoint

    public init(zenithPoint: GlobeZenithPoint) {
        self.id = zenithPoint.id
        self.zenithPoint = zenithPoint
    }

    /// Display name (e.g. "Sun Zenith")
    public var displayName: String {
        "\(zenithPoint.planet.rawValue) Zenith"
    }

    /// Description of the zenith point
    public var description: String {
        "\(zenithPoint.planet.rawValue) culminates directly overhead at this location"
    }

    /// Formatted coordinates
    public var coordinateString: String {
        let latDir = zenithPoint.coordinate.latitude >= 0 ? "N" : "S"
        let lngDir = zenithPoint.coordinate.longitude >= 0 ? "E" : "W"
        return String(
            format: "%.2f°%@ %.2f°%@",
            abs(zenithPoint.coordinate.latitude), latDir,
            abs(zenithPoint.coordinate.longitude), lngDir
        )
    }
}

// MARK: - Nakshatra Card Data

/// Data model for the nakshatra info card shown when a band is tapped
public struct NakshatraCardData: Identifiable, Equatable, Sendable {
    public let id: String
    public let nakshatra: Nakshatra
    public let pada: Int  // 1-4
    public let coordinate: GlobeCoordinate
    /// Tarabala compatibility relative to the birth Moon's nakshatra. Nil if birth chart is unavailable.
    public let tarabala: TarabalaResult?

    public init(nakshatra: Nakshatra, pada: Int = 1, coordinate: GlobeCoordinate, tarabala: TarabalaResult? = nil) {
        self.id = "\(nakshatra.id)-\(pada)"
        self.nakshatra = nakshatra
        self.pada = pada
        self.coordinate = coordinate
        self.tarabala = tarabala
    }

    /// Display name (Sanskrit name)
    public var displayName: String { nakshatra.name }

    /// English translation
    public var englishName: String { nakshatra.englishName }

    /// Pada label (e.g. "Pada 2 of 4")
    public var padaLabel: String { "Pada \(pada) of 4" }

    /// Ruling planet
    public var rulingPlanet: String { nakshatra.rulingPlanet }

    /// Associated deity
    public var deity: String { nakshatra.deity }

    /// Symbol
    public var symbol: String { nakshatra.symbol }

    /// Star name
    public var starName: String { nakshatra.starName }

    /// IAU designation
    public var iauStar: String { nakshatra.iauStar }

    /// Band color hex
    public var colorHex: String { nakshatra.color }

    /// Formatted index
    public var indexLabel: String { "#\(nakshatra.id) of 27" }
}
