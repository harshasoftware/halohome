import Foundation
import SwiftUI

// MARK: - City Data for Duo Mode

/// City data for duo mode scoring
public struct DuoCity: Sendable {
    public let name: String
    public let country: String
    public let countryCode: String
    public let latitude: Double
    public let longitude: Double
    public let population: Int

    public init(name: String, country: String, countryCode: String, latitude: Double, longitude: Double, population: Int) {
        self.name = name
        self.country = country
        self.countryCode = countryCode
        self.latitude = latitude
        self.longitude = longitude
        self.population = population
    }
}

/// Protocol for city data provider (implemented in Integration layer)
public protocol DuoCityProvider: Sendable {
    func loadCities() async throws -> [DuoCity]
}

// MARK: - Compatibility Mode

/// Mode for compatibility analysis - determines which planetary energies are prioritized
public enum CompatibilityMode: String, CaseIterable, Identifiable, Codable, Sendable {
    case honeymoon
    case relocation
    case travel
    case business

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .honeymoon: return "Honeymoon"
        case .relocation: return "Relocation"
        case .travel: return "Travel"
        case .business: return "Business"
        }
    }

    public var icon: String {
        switch self {
        case .honeymoon: return "heart.fill"
        case .relocation: return "house.fill"
        case .travel: return "airplane"
        case .business: return "briefcase.fill"
        }
    }

    public var description: String {
        switch self {
        case .honeymoon:
            return "Find destinations where Venus and Moon energies support romantic connection, emotional bonding, and shared pleasure"
        case .relocation:
            return "Discover cities where Jupiter and Sun lines support building foundations, career success, and long-term stability together"
        case .travel:
            return "Plan adventures where Jupiter, Mercury, and Uranus energies bring expansion, discovery, and shared experiences"
        case .business:
            return "Find locations where Sun, Jupiter, and Saturn lines support professional success, recognition, and financial growth"
        }
    }

    public var accentColor: Color {
        switch self {
        case .honeymoon: return .pink
        case .relocation: return .blue
        case .travel: return .orange
        case .business: return .purple
        }
    }
}

// MARK: - Partner Chart Data

/// Data representing a partner's birth chart for duo mode
public struct PartnerChartData: Identifiable, Equatable, Codable, Sendable {
    public let id: String
    public var name: String
    public var birthDate: Date
    public var birthTime: Date
    public var birthLocation: GlobeCoordinate
    public var cityName: String?
    public var isSaved: Bool

    public init(
        id: String = UUID().uuidString,
        name: String,
        birthDate: Date,
        birthTime: Date,
        birthLocation: GlobeCoordinate,
        cityName: String? = nil,
        isSaved: Bool = false
    ) {
        self.id = id
        self.name = name
        self.birthDate = birthDate
        self.birthTime = birthTime
        self.birthLocation = birthLocation
        self.cityName = cityName
        self.isSaved = isSaved
    }

    /// Formatted birth date string
    public var formattedBirthDate: String {
        birthDate.formatted(date: .long, time: .omitted)
    }

    /// Formatted birth time string
    public var formattedBirthTime: String {
        birthTime.formatted(date: .omitted, time: .shortened)
    }

    /// Location display string
    public var locationDisplayName: String {
        if let cityName = cityName, !cityName.isEmpty {
            return cityName
        }
        return String(format: "%.4f, %.4f", birthLocation.latitude, birthLocation.longitude)
    }
}

// MARK: - Saved Chart Info

/// Info about a saved chart from My Charts for quick partner selection
public struct SavedChartInfo: Identifiable, Equatable, Sendable {
    public let id: String
    public let name: String
    public let birthDate: Date
    public let birthTime: Date
    public let birthLocation: GlobeCoordinate
    public let cityName: String?

    public init(
        id: String = UUID().uuidString,
        name: String,
        birthDate: Date,
        birthTime: Date,
        birthLocation: GlobeCoordinate,
        cityName: String? = nil
    ) {
        self.id = id
        self.name = name
        self.birthDate = birthDate
        self.birthTime = birthTime
        self.birthLocation = birthLocation
        self.cityName = cityName
    }

    /// First letter of name for avatar display
    public var avatarInitial: String {
        String(name.prefix(1)).uppercased()
    }
}

// MARK: - Compatible Location

/// A location scored for compatibility between two people
public struct CompatibleLocation: Identifiable, Equatable, Sendable {
    public let id: String
    public let coordinate: GlobeCoordinate
    public var cityName: String?
    public var country: String?
    public let person1Score: Int
    public let person2Score: Int
    public let combinedScore: Int
    public let overlapBonus: Int
    public let person1Lines: [LineInfo]
    public let person2Lines: [LineInfo]
    public let interpretation: String
    public let themes: [String]

    /// Information about a line near this location
    public struct LineInfo: Equatable, Sendable {
        public let planet: Planet
        public let lineType: AstroLineType
        public let distance: Double // km

        public init(planet: Planet, lineType: AstroLineType, distance: Double) {
            self.planet = planet
            self.lineType = lineType
            self.distance = distance
        }

        public var shortName: String {
            "\(planet.rawValue.prefix(3)) \(lineType.shortName)"
        }
    }

    public init(
        id: String = UUID().uuidString,
        coordinate: GlobeCoordinate,
        cityName: String? = nil,
        country: String? = nil,
        person1Score: Int,
        person2Score: Int,
        combinedScore: Int,
        overlapBonus: Int,
        person1Lines: [LineInfo],
        person2Lines: [LineInfo],
        interpretation: String,
        themes: [String]
    ) {
        self.id = id
        self.coordinate = coordinate
        self.cityName = cityName
        self.country = country
        self.person1Score = person1Score
        self.person2Score = person2Score
        self.combinedScore = combinedScore
        self.overlapBonus = overlapBonus
        self.person1Lines = person1Lines
        self.person2Lines = person2Lines
        self.interpretation = interpretation
        self.themes = themes
    }

    /// Display name for the location
    public var displayName: String {
        if let cityName = cityName, !cityName.isEmpty {
            if let country = country, !country.isEmpty {
                return "\(cityName), \(country)"
            }
            return cityName
        }
        return String(format: "%.4f, %.4f", coordinate.latitude, coordinate.longitude)
    }
}

// MARK: - Compatibility Analysis

/// Full compatibility analysis result between two people
public struct CompatibilityAnalysis: Equatable, Sendable {
    public let mode: CompatibilityMode
    public var person1Name: String?
    public var person2Name: String?
    public let topLocations: [CompatibleLocation]
    public let totalIntersections: Int
    public let bestForRomance: CompatibleLocation?
    public let bestForGrowth: CompatibleLocation?
    public let bestForSuccess: CompatibleLocation?
    public let calculationTime: TimeInterval

    public init(
        mode: CompatibilityMode,
        person1Name: String? = nil,
        person2Name: String? = nil,
        topLocations: [CompatibleLocation],
        totalIntersections: Int,
        bestForRomance: CompatibleLocation? = nil,
        bestForGrowth: CompatibleLocation? = nil,
        bestForSuccess: CompatibleLocation? = nil,
        calculationTime: TimeInterval = 0
    ) {
        self.mode = mode
        self.person1Name = person1Name
        self.person2Name = person2Name
        self.topLocations = topLocations
        self.totalIntersections = totalIntersections
        self.bestForRomance = bestForRomance
        self.bestForGrowth = bestForGrowth
        self.bestForSuccess = bestForSuccess
        self.calculationTime = calculationTime
    }

    /// Empty analysis result
    public static let empty = CompatibilityAnalysis(
        mode: .honeymoon,
        topLocations: [],
        totalIntersections: 0
    )
}

// MARK: - Duo State

/// Current state of duo/compatibility mode
public enum DuoModeState: Equatable, Sendable {
    case disabled
    case enabled(partner: PartnerChartData)
    case calculating
    case ready(analysis: CompatibilityAnalysis)
    case error(message: String)

    public var isEnabled: Bool {
        switch self {
        case .disabled: return false
        default: return true
        }
    }

    public var isCalculating: Bool {
        if case .calculating = self { return true }
        return false
    }

    public var partner: PartnerChartData? {
        switch self {
        case .enabled(let partner): return partner
        case .ready:
            // Would need to store partner separately - for now return nil
            return nil
        default: return nil
        }
    }

    public var analysis: CompatibilityAnalysis? {
        if case .ready(let analysis) = self {
            return analysis
        }
        return nil
    }
}

// MARK: - Duo Lines Style

/// Visual style for partner lines on the globe
public struct DuoLinesStyle: Equatable, Sendable {
    /// Whether partner lines are dashed (to distinguish from user lines)
    public var isDashed: Bool

    /// Opacity of partner lines (0-1)
    public var opacity: Double

    /// Line width multiplier
    public var lineWidthMultiplier: Double

    /// Whether to show partner's lines
    public var showPartnerLines: Bool

    /// Whether to show user's lines
    public var showUserLines: Bool

    public init(
        isDashed: Bool = true,
        opacity: Double = 0.8,
        lineWidthMultiplier: Double = 1.0,
        showPartnerLines: Bool = true,
        showUserLines: Bool = true
    ) {
        self.isDashed = isDashed
        self.opacity = opacity
        self.lineWidthMultiplier = lineWidthMultiplier
        self.showPartnerLines = showPartnerLines
        self.showUserLines = showUserLines
    }

    /// Default style for duo mode
    public static let `default` = DuoLinesStyle()

    /// Style with partner lines highlighted
    public static let partnerHighlighted = DuoLinesStyle(
        isDashed: false,
        opacity: 1.0,
        lineWidthMultiplier: 1.2
    )
}
