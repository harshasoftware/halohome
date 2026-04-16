import Foundation
import CoreLocation

// MARK: - Location Analysis Models

/// Influence level based on distance to an astro line
public enum InfluenceLevel: String, Sendable, CaseIterable {
    case zenith    // Within zenith point proximity (≤200km from zenith)
    case gold      // Very close to line (≤200km)
    case strong    // Close to line (200-350km)
    case moderate  // Within influence range (350-500km)
    case weak      // Beyond influence range

    public var displayName: String {
        switch self {
        case .zenith: return "Zenith"
        case .gold: return "Power Zone"
        case .strong: return "Strong"
        case .moderate: return "Moderate"
        case .weak: return "Weak"
        }
    }

    public var colorHex: String {
        switch self {
        case .zenith: return "#E11D48"
        case .gold: return "#FFD700"
        case .strong: return "#22C55E"
        case .moderate: return "#3B82F6"
        case .weak: return "#94A3B8"
        }
    }
}

/// A single line's influence on a location
public struct LineInfluence: Identifiable, Sendable, Equatable {
    public let id: String
    public let type: LineInfluenceType
    public let planet: Planet
    public let lineType: AstroLineType?
    public let distance: Int        // km from line
    public let distanceFromZenith: Int?
    public let influenceScore: Int  // 0-100
    public let influenceLevel: InfluenceLevel
    public let interpretation: String

    public enum LineInfluenceType: String, Sendable {
        case planetary
        case aspect
    }

    public init(
        type: LineInfluenceType,
        planet: Planet,
        lineType: AstroLineType?,
        distance: Int,
        distanceFromZenith: Int? = nil,
        influenceScore: Int,
        influenceLevel: InfluenceLevel,
        interpretation: String
    ) {
        self.id = "\(planet.rawValue)-\(lineType?.rawValue ?? "aspect")-\(distance)"
        self.type = type
        self.planet = planet
        self.lineType = lineType
        self.distance = distance
        self.distanceFromZenith = distanceFromZenith
        self.influenceScore = influenceScore
        self.influenceLevel = influenceLevel
        self.interpretation = interpretation
    }
}

/// Quality classification for a location
public enum LocationQuality: String, Sendable {
    case exceptional  // 80-100
    case strong       // 60-79
    case notable      // 40-59
    case moderate     // 20-39
    case minimal      // 0-19

    public var displayName: String { rawValue.capitalized }

    public init(score: Int) {
        switch score {
        case 80...100: self = .exceptional
        case 60..<80: self = .strong
        case 40..<60: self = .notable
        case 20..<40: self = .moderate
        default: self = .minimal
        }
    }
}

/// Full analysis of a location
public struct LocationAnalysis: Sendable, Equatable {
    public let coordinate: GlobeCoordinate
    public let cityName: String?
    public let country: String?
    public let lines: [LineInfluence]
    public let aggregateScore: Int
    public let quality: LocationQuality
    public let dominantPlanets: [Planet]
    public let overallInterpretation: String

    public init(
        coordinate: GlobeCoordinate,
        cityName: String? = nil,
        country: String? = nil,
        lines: [LineInfluence],
        aggregateScore: Int,
        dominantPlanets: [Planet],
        overallInterpretation: String
    ) {
        self.coordinate = coordinate
        self.cityName = cityName
        self.country = country
        self.lines = lines
        self.aggregateScore = aggregateScore
        self.quality = LocationQuality(score: aggregateScore)
        self.dominantPlanets = dominantPlanets
        self.overallInterpretation = overallInterpretation
    }
}

// MARK: - Location Analysis Service

/// Analyzes locations for astrocartography line influences.
/// Port of web app's location-line-utils.ts algorithm.
public actor LocationAnalysisService {

    // MARK: - Constants

    private static let earthRadiusKm: Double = 6371
    private static let maxInfluenceDistanceKm: Double = 500
    private static let zenithDistanceKm: Double = 200
    private static let goldDistanceKm: Double = 200
    private static let strongDistanceKm: Double = 350

    // MARK: - Public API

    public init() {}

    /// Analyze a location for all nearby astro line influences
    public func analyze(
        coordinate: GlobeCoordinate,
        astroLines: [AstroLine],
        cityName: String? = nil,
        country: String? = nil
    ) -> LocationAnalysis {
        let influences = findInfluences(at: coordinate, lines: astroLines)

        // Aggregate score: weighted average of all influence scores
        let aggregateScore: Int
        if influences.isEmpty {
            aggregateScore = 0
        } else {
            let total = influences.reduce(0) { $0 + $1.influenceScore }
            aggregateScore = total / influences.count
        }

        // Dominant planets: top 3 by cumulative score
        var planetScores: [Planet: Int] = [:]
        for influence in influences {
            planetScores[influence.planet, default: 0] += influence.influenceScore
        }
        let dominantPlanets = planetScores
            .sorted { $0.value > $1.value }
            .prefix(3)
            .map(\.key)

        // Overall interpretation
        let interpretation = generateOverallInterpretation(
            influences: influences,
            dominantPlanets: dominantPlanets
        )

        return LocationAnalysis(
            coordinate: coordinate,
            cityName: cityName,
            country: country,
            lines: influences,
            aggregateScore: aggregateScore,
            dominantPlanets: dominantPlanets,
            overallInterpretation: interpretation
        )
    }

    // MARK: - Line Finding

    private func findInfluences(
        at coordinate: GlobeCoordinate,
        lines: [AstroLine],
        maxResults: Int = 20
    ) -> [LineInfluence] {
        var influences: [LineInfluence] = []

        for line in lines {
            guard line.coordinates.count >= 2 else { continue }

            let distance = distanceToLinePath(
                lat: coordinate.latitude,
                lng: coordinate.longitude,
                path: line.coordinates
            )

            guard distance <= Self.maxInfluenceDistanceKm else { continue }

            let score = Self.calculateInfluenceScore(distance: distance)
            let level = Self.getInfluenceLevel(distance: distance)
            let interpretation = Self.getPlanetaryInterpretation(
                planet: line.planet,
                lineType: line.lineType
            )

            influences.append(LineInfluence(
                type: .planetary,
                planet: line.planet,
                lineType: line.lineType,
                distance: Int(distance.rounded()),
                influenceScore: Int(score.rounded()),
                influenceLevel: level,
                interpretation: interpretation
            ))
        }

        // Sort by score descending
        influences.sort { $0.influenceScore > $1.influenceScore }
        return Array(influences.prefix(maxResults))
    }

    // MARK: - Distance Calculations

    private func distanceToLinePath(
        lat: Double,
        lng: Double,
        path: [GlobeCoordinate]
    ) -> Double {
        guard !path.isEmpty else { return .infinity }
        guard path.count > 1 else {
            return Self.haversineDistance(lat, lng, path[0].latitude, path[0].longitude)
        }

        var minDistance = Double.infinity

        for i in 0..<(path.count - 1) {
            let p1 = path[i]
            let p2 = path[i + 1]

            // Skip segments that wrap around the world
            if abs(p2.longitude - p1.longitude) > 180 { continue }

            let d = Self.distanceToLineSegment(
                pointLat: lat, pointLng: lng,
                segStartLat: p1.latitude, segStartLng: p1.longitude,
                segEndLat: p2.latitude, segEndLng: p2.longitude
            )
            minDistance = min(minDistance, d)
        }

        return minDistance
    }

    private static func distanceToLineSegment(
        pointLat: Double, pointLng: Double,
        segStartLat: Double, segStartLng: Double,
        segEndLat: Double, segEndLng: Double
    ) -> Double {
        let distToStart = haversineDistance(pointLat, pointLng, segStartLat, segStartLng)
        let distToEnd = haversineDistance(pointLat, pointLng, segEndLat, segEndLng)
        let segmentLength = haversineDistance(segStartLat, segStartLng, segEndLat, segEndLng)

        guard segmentLength >= 0.1 else { return distToStart }

        let dx = segEndLat - segStartLat
        let dy = segEndLng - segStartLng

        let t = max(0, min(1,
            ((pointLat - segStartLat) * dx + (pointLng - segStartLng) * dy) /
            (dx * dx + dy * dy)
        ))

        let nearestLat = segStartLat + t * dx
        let nearestLng = segStartLng + t * dy
        let distToNearest = haversineDistance(pointLat, pointLng, nearestLat, nearestLng)

        return min(distToStart, distToEnd, distToNearest)
    }

    private static func haversineDistance(
        _ lat1: Double, _ lng1: Double,
        _ lat2: Double, _ lng2: Double
    ) -> Double {
        let dLat = (lat2 - lat1) * .pi / 180
        let dLng = (lng2 - lng1) * .pi / 180

        let a = sin(dLat / 2) * sin(dLat / 2) +
                cos(lat1 * .pi / 180) * cos(lat2 * .pi / 180) *
                sin(dLng / 2) * sin(dLng / 2)

        let c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return earthRadiusKm * c
    }

    // MARK: - Scoring

    private static func calculateInfluenceScore(
        distance: Double,
        distanceFromZenith: Double? = nil
    ) -> Double {
        if let dz = distanceFromZenith, dz <= zenithDistanceKm {
            return 100 - (dz / zenithDistanceKm) * 10  // 90-100
        }
        if distance <= goldDistanceKm {
            return 90 - (distance / goldDistanceKm) * 20  // 70-90
        }
        if distance <= maxInfluenceDistanceKm {
            let normalized = (distance - goldDistanceKm) / (maxInfluenceDistanceKm - goldDistanceKm)
            return 70 * (1 - normalized)  // 0-70
        }
        return 0
    }

    private static func getInfluenceLevel(
        distance: Double,
        distanceFromZenith: Double? = nil
    ) -> InfluenceLevel {
        if let dz = distanceFromZenith, dz <= zenithDistanceKm { return .zenith }
        if distance <= goldDistanceKm { return .gold }
        if distance <= strongDistanceKm { return .strong }
        if distance <= maxInfluenceDistanceKm { return .moderate }
        return .weak
    }

    // MARK: - Interpretations

    private static func getPlanetaryInterpretation(planet: Planet, lineType: AstroLineType) -> String {
        switch (planet, lineType) {
        // Sun
        case (.sun, .midheaven): return "Strong career recognition and public visibility. Leadership opportunities flourish here."
        case (.sun, .imumCoeli): return "Deep sense of belonging and family connection. A place to establish roots."
        case (.sun, .ascendant): return "Enhanced vitality and self-expression. Your authentic self shines brightly."
        case (.sun, .descendant): return "Attracts significant partnerships. Others see your radiance clearly."
        // Moon
        case (.moon, .midheaven): return "Emotional fulfillment through career. Public nurturing roles favored."
        case (.moon, .imumCoeli): return "Profound emotional security and comfort. Ideal for home and family."
        case (.moon, .ascendant): return "Heightened intuition and emotional sensitivity. Feeling deeply connected."
        case (.moon, .descendant): return "Attracts nurturing relationships. Emotional bonds form easily."
        // Mercury
        case (.mercury, .midheaven): return "Success in communication and intellectual pursuits. Writing, teaching, commerce thrive."
        case (.mercury, .imumCoeli): return "Mental stimulation at home. Learning and communication with family."
        case (.mercury, .ascendant): return "Quick thinking and articulate expression. Great for networking."
        case (.mercury, .descendant): return "Attracts intellectual partners. Stimulating conversations and exchanges."
        // Venus
        case (.venus, .midheaven): return "Artistic success and social popularity. Beauty and harmony in career."
        case (.venus, .imumCoeli): return "Aesthetic home environment. Love and comfort in domestic life."
        case (.venus, .ascendant): return "Enhanced charm and attractiveness. Social grace comes naturally."
        case (.venus, .descendant): return "Magnetic attraction for romantic relationships. Love and harmony flourish."
        // Mars
        case (.mars, .midheaven): return "Drive for career achievement. Competitive success and leadership."
        case (.mars, .imumCoeli): return "Active home life. Energy for domestic projects and family protection."
        case (.mars, .ascendant): return "Increased courage and initiative. Physical vitality enhanced."
        case (.mars, .descendant): return "Attracts passionate relationships. Dynamic partnerships form."
        // Jupiter
        case (.jupiter, .midheaven): return "Expansion and luck in career. Recognition, travel, and opportunities abound."
        case (.jupiter, .imumCoeli): return "Abundance in home life. Generous family connections and growth."
        case (.jupiter, .ascendant): return "Optimism and personal growth. Opportunities seem to find you."
        case (.jupiter, .descendant): return "Attracts beneficial partnerships. Luck through relationships."
        // Saturn
        case (.saturn, .midheaven): return "Serious career achievements through hard work. Authority and lasting success."
        case (.saturn, .imumCoeli): return "Building solid foundations. Responsibility toward family and home."
        case (.saturn, .ascendant): return "Discipline and maturity enhanced. Taking yourself seriously."
        case (.saturn, .descendant): return "Committed, long-lasting relationships. Learning through partnerships."
        // Uranus
        case (.uranus, .midheaven): return "Unconventional career path. Innovation and sudden changes in status."
        case (.uranus, .imumCoeli): return "Unusual home life. Freedom and independence in domestic matters."
        case (.uranus, .ascendant): return "Unique self-expression. Embracing your individuality fully."
        case (.uranus, .descendant): return "Attracts unusual relationships. Excitement and unpredictability in partnerships."
        // Neptune
        case (.neptune, .midheaven): return "Creative and spiritual career pursuits. Artistic recognition possible."
        case (.neptune, .imumCoeli): return "Spiritual home environment. Idealistic family connections."
        case (.neptune, .ascendant): return "Enhanced intuition and creativity. Spiritual sensitivity heightened."
        case (.neptune, .descendant): return "Soulmate connections possible. Idealistic and spiritual relationships."
        // Pluto
        case (.pluto, .midheaven): return "Transformative career experiences. Power and influence in public life."
        case (.pluto, .imumCoeli): return "Deep psychological roots. Transformation through family matters."
        case (.pluto, .ascendant): return "Personal transformation and power. Intense self-discovery."
        case (.pluto, .descendant): return "Intense, transformative relationships. Deep psychological connections."
        // Chiron
        case (.chiron, .midheaven): return "Healing through career and public service. Teaching and mentoring gifts emerge."
        case (.chiron, .imumCoeli): return "Deep healing of family wounds. Creating a nurturing, safe home environment."
        case (.chiron, .ascendant): return "Personal healing journey. Your vulnerability becomes your greatest strength."
        case (.chiron, .descendant): return "Healing through relationships. Attracting partners who support growth."
        // North Node
        case (.northNode, .midheaven): return "Career aligned with soul purpose. Destined public role and recognition."
        case (.northNode, .imumCoeli): return "Soul growth through home and family. Building foundations for your destiny."
        case (.northNode, .ascendant): return "This location accelerates your life purpose. Personal evolution intensified."
        case (.northNode, .descendant): return "Fated partnerships and meaningful connections. Relationships as destiny catalysts."
        // South Node
        case (.southNode, .midheaven): return "Past-life career patterns surface. Familiar skills and professional karma."
        case (.southNode, .imumCoeli): return "Deep ancestral connections. Familiar, comfortable domestic energy."
        case (.southNode, .ascendant): return "Past-life identity resonance. Comfort zone but growth requires moving beyond."
        case (.southNode, .descendant): return "Karmic relationship patterns. Familiar partnerships with lessons to resolve."
        }
    }

    private func generateOverallInterpretation(
        influences: [LineInfluence],
        dominantPlanets: [Planet]
    ) -> String {
        guard !influences.isEmpty else {
            return "This location has minimal astrological influence based on your birth chart. It is a neutral zone without strong planetary energies."
        }

        var result = ""

        let zenithLines = influences.filter { $0.influenceLevel == .zenith }
        let goldLines = influences.filter { $0.influenceLevel == .gold }
        let strongLines = influences.filter { $0.influenceLevel == .strong }

        if !zenithLines.isEmpty {
            let planets = zenithLines.map(\.planet.rawValue).joined(separator: ", ")
            result = "EXCEPTIONAL POWER ZONE: \(planets) at zenith. This is one of the most powerful locations in your astrocartography map. "
        } else if !goldLines.isEmpty {
            let planets = goldLines.map(\.planet.rawValue).joined(separator: ", ")
            result = "POWER ZONE: Strong \(planets) influence. This location is highly favorable for related activities. "
        } else if !strongLines.isEmpty {
            result = "NOTABLE INFLUENCE: Several planetary lines affect this area. "
        } else {
            result = "MODERATE INFLUENCE: Some planetary energies present. "
        }

        if !dominantPlanets.isEmpty {
            let themes = dominantPlanets.compactMap { planet -> String? in
                switch planet {
                case .sun: return "identity and recognition"
                case .moon: return "emotions and comfort"
                case .mercury: return "communication and learning"
                case .venus: return "love and beauty"
                case .mars: return "action and energy"
                case .jupiter: return "expansion and luck"
                case .saturn: return "discipline and structure"
                case .uranus: return "innovation and change"
                case .neptune: return "spirituality and creativity"
                case .pluto: return "transformation and power"
                case .chiron: return "healing and wisdom"
                case .northNode: return "destiny and soul growth"
                case .southNode: return "karmic patterns and release"
                }
            }
            result += "Dominant themes: \(themes.joined(separator: ", "))."
        }

        return result
    }
}
