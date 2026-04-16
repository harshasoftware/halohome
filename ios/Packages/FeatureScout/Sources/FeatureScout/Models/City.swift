import Foundation

// MARK: - City

/// A geographic city for scout calculations
public struct City: Identifiable, Sendable, Equatable, Hashable {
    public let id: UUID
    public let name: String
    public let country: String
    public let countryCode: String
    public let latitude: Double
    public let longitude: Double
    public let population: Int

    public init(
        id: UUID = UUID(),
        name: String,
        country: String,
        countryCode: String,
        latitude: Double,
        longitude: Double,
        population: Int = 0
    ) {
        self.id = id
        self.name = name
        self.country = country
        self.countryCode = countryCode
        self.latitude = latitude
        self.longitude = longitude
        self.population = population
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

    public func hash(into hasher: inout Hasher) {
        hasher.combine(name)
        hasher.combine(countryCode)
    }
}

// MARK: - Planetary Line

/// A planetary line on the astrocartography map
public struct PlanetaryLine: Identifiable, Sendable, Equatable {
    public let id: UUID
    public let planet: String
    public let lineType: String // MC, IC, ASC, DSC
    public let points: [(latitude: Double, longitude: Double)]

    public init(
        id: UUID = UUID(),
        planet: String,
        lineType: String,
        points: [(latitude: Double, longitude: Double)]
    ) {
        self.id = id
        self.planet = planet
        self.lineType = lineType
        self.points = points
    }

    public static func == (lhs: PlanetaryLine, rhs: PlanetaryLine) -> Bool {
        lhs.id == rhs.id &&
        lhs.planet == rhs.planet &&
        lhs.lineType == rhs.lineType
    }

    public var lineKey: String {
        "\(planet):\(lineType)"
    }
}

// MARK: - Aspect Type

/// Astrological aspect types
public enum AspectType: String, Sendable, Equatable {
    case conjunction
    case trine
    case sextile
    case square
    case opposition
    case quincunx
    case sesquisquare

    public var isHarmonious: Bool {
        switch self {
        case .conjunction, .trine, .sextile:
            return true
        case .square, .opposition, .quincunx, .sesquisquare:
            return false
        }
    }
}

// MARK: - Aspect Line

/// An aspect line between two planetary lines
public struct AspectLine: Identifiable, Sendable, Equatable {
    public let id: UUID
    public let planet: String
    public let angle: String
    public let aspectType: AspectType
    public let points: [(latitude: Double, longitude: Double)]

    public init(
        id: UUID = UUID(),
        planet: String,
        angle: String,
        aspectType: AspectType,
        points: [(latitude: Double, longitude: Double)]
    ) {
        self.id = id
        self.planet = planet
        self.angle = angle
        self.aspectType = aspectType
        self.points = points
    }

    public static func == (lhs: AspectLine, rhs: AspectLine) -> Bool {
        lhs.id == rhs.id &&
        lhs.planet == rhs.planet &&
        lhs.angle == rhs.angle &&
        lhs.aspectType == rhs.aspectType
    }
}
