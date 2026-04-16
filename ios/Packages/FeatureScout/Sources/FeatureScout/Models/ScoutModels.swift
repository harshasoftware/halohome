import Foundation

// MARK: - Population Tier

/// Population tiers for filtering scout results (matches web population-tiers.ts)
public enum PopulationTier: String, CaseIterable, Identifiable, Sendable {
    case all           // All cities (15k+, ~33k cities)
    case small         // 50k+ (~6k cities)
    case medium        // 100k+ (~4k cities) - DEFAULT
    case large         // 250k+ (~2k cities)
    case major         // 500k+ (~1k cities)
    case mega          // 1M+ (~500 cities)

    public var id: String { rawValue }

    public var label: String {
        switch self {
        case .all: return "All Cities"
        case .small: return "Small+"
        case .medium: return "Medium+"
        case .large: return "Large+"
        case .major: return "Major+"
        case .mega: return "Mega"
        }
    }

    public var minPopulation: Int {
        switch self {
        case .all: return 15_000
        case .small: return 50_000
        case .medium: return 100_000
        case .large: return 250_000
        case .major: return 500_000
        case .mega: return 1_000_000
        }
    }

    public var description: String {
        switch self {
        case .all: return "All cities 15k+"
        case .small: return "Cities 50k+"
        case .medium: return "Cities 100k+"
        case .large: return "Cities 250k+"
        case .major: return "Cities 500k+"
        case .mega: return "Cities 1M+"
        }
    }

    public var approximateCities: String {
        switch self {
        case .all: return "~33,000"
        case .small: return "~6,000"
        case .medium: return "~4,000"
        case .large: return "~2,000"
        case .major: return "~1,000"
        case .mega: return "~500"
        }
    }

    /// Default tier for new users (matches web DEFAULT_POPULATION_TIER = 'medium')
    public static let defaultTier: PopulationTier = .medium
}

// MARK: - Scout Category

/// Life categories for scouting optimal locations — matches Rust LifeCategory enum
public enum ScoutCategory: String, CaseIterable, Identifiable, Sendable {
    case overall
    case career
    case love
    case health
    case home
    case wellbeing
    case wealth

    public var id: String { rawValue }

    /// Display label for the category
    public var label: String {
        switch self {
        case .overall: return "Overall"
        case .career: return "Career"
        case .love: return "Love"
        case .health: return "Health"
        case .home: return "Home"
        case .wellbeing: return "Wellbeing"
        case .wealth: return "Wealth"
        }
    }

    /// SF Symbol icon name for the category
    public var iconName: String {
        switch self {
        case .overall: return "star.fill"
        case .career: return "briefcase.fill"
        case .love: return "heart.fill"
        case .health: return "heart.text.square.fill"
        case .home: return "house.fill"
        case .wellbeing: return "sparkles"
        case .wealth: return "dollarsign.circle.fill"
        }
    }

    /// Category description
    public var description: String {
        switch self {
        case .overall: return "Best places across all life areas"
        case .career: return "Professional success and recognition"
        case .love: return "Romance, relationships, and partnerships"
        case .health: return "Physical vitality and wellness"
        case .home: return "Security, comfort, and foundations"
        case .wellbeing: return "Inner peace and overall happiness"
        case .wealth: return "Financial prosperity and abundance"
        }
    }

    /// Theme color for the category
    public var themeColor: CategoryColor {
        switch self {
        case .overall: return .indigo
        case .career: return .blue
        case .love: return .pink
        case .health: return .green
        case .home: return .amber
        case .wellbeing: return .purple
        case .wealth: return .teal
        }
    }

    /// Subcategories (all categories except overall)
    public static var subcategories: [ScoutCategory] {
        allCases.filter { $0 != .overall }
    }
}

/// Category theme colors
public enum CategoryColor: String, Sendable {
    case indigo, blue, pink, green, amber, purple, teal
}

// MARK: - Scout Location

/// A city/location with scout scores
public struct ScoutLocation: Identifiable, Sendable, Equatable {
    public let id: UUID
    public let cityName: String
    public let country: String
    public let countryCode: String
    public let latitude: Double
    public let longitude: Double
    public let benefitScore: Double
    public let intensityScore: Double
    public let volatilityScore: Double
    public let mixedFlag: Bool
    public let nature: LocationNature
    public let influences: [ScoutInfluence]

    public init(
        id: UUID = UUID(),
        cityName: String,
        country: String,
        countryCode: String,
        latitude: Double,
        longitude: Double,
        benefitScore: Double,
        intensityScore: Double = 0,
        volatilityScore: Double = 0,
        mixedFlag: Bool = false,
        nature: LocationNature,
        influences: [ScoutInfluence]
    ) {
        self.id = id
        self.cityName = cityName
        self.country = country
        self.countryCode = countryCode
        self.latitude = latitude
        self.longitude = longitude
        self.benefitScore = benefitScore
        self.intensityScore = intensityScore
        self.volatilityScore = volatilityScore
        self.mixedFlag = mixedFlag
        self.nature = nature
        self.influences = influences
    }

    /// Primary score for display (benefit score)
    public var score: Double { benefitScore }

    /// Flag emoji for the country
    public var countryFlag: String {
        let upper = countryCode.uppercased()
        guard upper.count == 2,
              upper.unicodeScalars.allSatisfy({ $0.value >= 65 && $0.value <= 90 }) else { return "" }
        var flag = ""
        upper.unicodeScalars.forEach { scalar in
            if let s = Unicode.Scalar(127397 + scalar.value) {
                flag.unicodeScalars.append(s)
            }
        }
        return flag
    }
}

/// Nature of a location's influence
public enum LocationNature: String, Sendable, Equatable {
    case beneficial
    case challenging
    case mixed

    public var label: String {
        switch self {
        case .beneficial: return "Beneficial"
        case .challenging: return "Challenging"
        case .mixed: return "Mixed"
        }
    }
}

// MARK: - Scout Influence

/// A planetary influence affecting a location
public struct ScoutInfluence: Identifiable, Sendable, Equatable {
    public let id: UUID
    public let planet: String
    public let angle: String // MC, IC, ASC, DSC
    public let distanceKm: Double

    public init(
        id: UUID = UUID(),
        planet: String,
        angle: String,
        distanceKm: Double
    ) {
        self.id = id
        self.planet = planet
        self.angle = angle
        self.distanceKm = distanceKm
    }

    /// The line identifier (e.g., "Sun:MC")
    public var lineKey: String {
        "\(planet):\(angle)"
    }
}

// MARK: - Scout Result

/// Complete scout analysis result for a category
public struct ScoutResult: Sendable, Equatable {
    public let category: ScoutCategory
    public let locations: [ScoutLocation]
    public let totalBeneficial: Int
    public let totalChallenging: Int
    public let computedAt: Date

    public init(
        category: ScoutCategory,
        locations: [ScoutLocation],
        totalBeneficial: Int,
        totalChallenging: Int,
        computedAt: Date = Date()
    ) {
        self.category = category
        self.locations = locations
        self.totalBeneficial = totalBeneficial
        self.totalChallenging = totalChallenging
        self.computedAt = computedAt
    }

    /// Top N locations by score
    public func topLocations(_ count: Int) -> [ScoutLocation] {
        Array(locations.prefix(count))
    }

    /// Filter locations by nature
    public func locations(with nature: LocationNature) -> [ScoutLocation] {
        locations.filter { $0.nature == nature }
    }
}

// MARK: - Country Group

/// A group of scout locations within one country (for "By Country" view mode)
public struct CountryGroup: Sendable, Equatable {
    public let countryCode: String
    public let countryName: String
    public let locations: [ScoutLocation]
    public let beneficialCount: Int
    public let challengingCount: Int

    /// Top city score in this group (used for sorting countries)
    public var topScore: Double {
        locations.first?.benefitScore ?? 0
    }

    /// Flag emoji for the country
    public var countryFlag: String {
        let upper = countryCode.uppercased()
        guard upper.count == 2,
              upper.unicodeScalars.allSatisfy({ $0.value >= 65 && $0.value <= 90 }) else { return "" }
        var flag = ""
        upper.unicodeScalars.forEach { scalar in
            if let s = Unicode.Scalar(127397 + scalar.value) {
                flag.unicodeScalars.append(s)
            }
        }
        return flag
    }
}

// MARK: - Scout Progress

/// Progress state for scout computation
public struct ScoutProgress: Sendable, Equatable {
    public let phase: Phase
    public let percentage: Double
    public let currentCategory: ScoutCategory?
    public let message: String

    public init(
        phase: Phase,
        percentage: Double,
        currentCategory: ScoutCategory? = nil,
        message: String = ""
    ) {
        self.phase = phase
        self.percentage = percentage
        self.currentCategory = currentCategory
        self.message = message
    }

    public enum Phase: String, Sendable, Equatable {
        case idle
        case initializing
        case loadingCities
        case computing
        case complete
        case error
    }

    public static let idle = ScoutProgress(phase: .idle, percentage: 0)
    public static let complete = ScoutProgress(phase: .complete, percentage: 100)
}
