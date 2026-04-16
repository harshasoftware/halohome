import Foundation
import Core

// MARK: - Scout Scoring Provider Protocol

/// Protocol for Rust-backed scout scoring (implemented in Integration layer)
public protocol ScoutScoringProvider: Sendable {
    /// Score cities across all categories. Returns JSON string from Rust.
    func scoreCities(
        citiesJson: String,
        linesJson: String,
        ratingsJson: String,
        configJson: String,
        paranLinesJson: String,
        zenithJson: String
    ) async throws -> String

    /// Score cities with natal chart data for pipeline modules.
    /// Falls back to standard scoring if natal chart is unavailable.
    func scoreCitiesWithNatal(
        citiesJson: String,
        linesJson: String,
        ratingsJson: String,
        configJson: String,
        natalChartJson: String,
        paranLinesJson: String,
        zenithJson: String
    ) async throws -> String
}

// MARK: - Scout Service Protocol

/// Protocol for scout calculation services
public protocol ScoutServiceProtocol: Sendable {
    /// Compute scout rankings for all categories in a single Rust call
    func computeAllRankings(
        cities: [City],
        planetaryLines: [PlanetaryLine],
        aspectLines: [AspectLine],
        configJson: String,
        natalChartJson: String?,
        paranLinesJson: String,
        zenithJson: String
    ) async throws -> [ScoutCategory: ScoutResult]
}

// MARK: - Scout Service

/// Service that delegates all scoring to Rust via ScoutScoringProvider
public actor ScoutService: ScoutServiceProtocol {

    private let scoringProvider: ScoutScoringProvider

    public init(scoringProvider: ScoutScoringProvider) {
        self.scoringProvider = scoringProvider
    }

    public func computeAllRankings(
        cities: [City],
        planetaryLines: [PlanetaryLine],
        aspectLines: [AspectLine],
        configJson: String,
        natalChartJson: String?,
        paranLinesJson: String,
        zenithJson: String
    ) async throws -> [ScoutCategory: ScoutResult] {

        // 1. Serialize cities to JSON
        let citiesJson = serializeCities(cities)

        // 2. Serialize lines to JSON (planetary + aspect lines combined)
        let linesJson = serializeLines(planetaryLines: planetaryLines, aspectLines: aspectLines)

        // 3. Build ratings JSON from default line ratings
        let ratingsJson = "{}"

        // 4. Call Rust — use natal-aware path when natal chart data is available
        let resultJson: String
        if let natalJson = natalChartJson, !natalJson.isEmpty {
            resultJson = try await scoringProvider.scoreCitiesWithNatal(
                citiesJson: citiesJson,
                linesJson: linesJson,
                ratingsJson: ratingsJson,
                configJson: configJson,
                natalChartJson: natalJson,
                paranLinesJson: paranLinesJson,
                zenithJson: zenithJson
            )
        } else {
            resultJson = try await scoringProvider.scoreCities(
                citiesJson: citiesJson,
                linesJson: linesJson,
                ratingsJson: ratingsJson,
                configJson: configJson,
                paranLinesJson: paranLinesJson,
                zenithJson: zenithJson
            )
        }

        // DEBUG: Log the first 500 chars of the result to understand the structure
        #if DEBUG
        print("[Scout] Result JSON preview: \(resultJson.prefix(500))")
        #endif

        // 6. Parse results
        return try parseResults(resultJson)
    }

    // MARK: - Serialization

    private nonisolated func serializeCities(_ cities: [City]) -> String {
        struct CityDTO: Encodable {
            let name: String
            let country: String
            let lat: Double
            let lon: Double
        }

        let dtos = cities.map { CityDTO(name: $0.name, country: $0.countryCode, lat: $0.latitude, lon: $0.longitude) }
        guard let data = try? JSONEncoder().encode(dtos) else { return "[]" }
        let json = String(data: data, encoding: .utf8) ?? "[]"

        #if DEBUG
        print("[Scout] Cities JSON (\(dtos.count) cities): \(json.prefix(300))...")
        #endif

        return json
    }

    /// Generic line rating (1-5 scale, category-agnostic).
    ///
    /// NOTE: For category-specific scoring, Rust's `category_rating()` overrides
    /// this value with per-category signed ratings (-5 to +5). This function is
    /// still used as the wire-format default for non-category scoring paths
    /// and for aspect rating adjustments.
    private nonisolated func getLineRating(planet: String, angle: String) -> Int {
        let ratings: [String: [String: Int]] = [
            "Sun": ["MC": 5, "IC": 4, "ASC": 5, "DSC": 4],
            "Moon": ["MC": 3, "IC": 5, "ASC": 4, "DSC": 4],
            "Mercury": ["MC": 4, "IC": 3, "ASC": 3, "DSC": 3],
            "Venus": ["MC": 4, "IC": 5, "ASC": 5, "DSC": 5],
            "Mars": ["MC": 4, "IC": 2, "ASC": 3, "DSC": 2],
            "Jupiter": ["MC": 5, "IC": 5, "ASC": 5, "DSC": 5],
            "Saturn": ["MC": 3, "IC": 2, "ASC": 2, "DSC": 2],
            "Uranus": ["MC": 2, "IC": 1, "ASC": 2, "DSC": 2],
            "Neptune": ["MC": 2, "IC": 2, "ASC": 3, "DSC": 3],
            "Pluto": ["MC": 3, "IC": 1, "ASC": 2, "DSC": 2],
            "NorthNode": ["MC": 4, "IC": 4, "ASC": 4, "DSC": 4],
            "SouthNode": ["MC": 2, "IC": 2, "ASC": 2, "DSC": 2],
            "Chiron": ["MC": 3, "IC": 3, "ASC": 3, "DSC": 3]
        ]
        return ratings[planet]?[angle] ?? 3
    }

    private nonisolated func serializeLines(
        planetaryLines: [PlanetaryLine],
        aspectLines: [AspectLine]
    ) -> String {
        struct LineDTO: Encodable {
            let planet: String
            let angle: String
            let rating: Int
            let aspect: String?
            let points: [[Double]] // [[lat, lon], ...]
        }

        var dtos: [LineDTO] = []

        // Planetary lines
        for line in planetaryLines {
            dtos.append(LineDTO(
                planet: line.planet,
                angle: line.lineType,
                rating: getLineRating(planet: line.planet, angle: line.lineType),
                aspect: nil,
                points: line.points.map { [$0.latitude, $0.longitude] }
            ))
        }

        // Aspect lines - adjust rating based on aspect harmony (matches web scout.worker.ts:300-315)
        // Harmonious aspects (trine, sextile, conjunction) get +1 rating
        // Challenging aspects (square, opposition, etc.) get -1 rating
        for line in aspectLines {
            let baseRating = getLineRating(planet: line.planet, angle: line.angle)
            let adjustedRating: Int
            if line.aspectType.isHarmonious {
                adjustedRating = min(5, baseRating + 1)
            } else {
                adjustedRating = max(1, baseRating - 1)
            }
            dtos.append(LineDTO(
                planet: line.planet,
                angle: line.angle,
                rating: adjustedRating,
                aspect: line.aspectType.rawValue.capitalized,
                points: line.points.map { [$0.latitude, $0.longitude] }
            ))
        }

        guard let data = try? JSONEncoder().encode(dtos) else { return "[]" }
        let json = String(data: data, encoding: .utf8) ?? "[]"

        #if DEBUG
        print("[Scout] Lines JSON (\(dtos.count) lines): \(json.prefix(500))...")
        #endif

        return json
    }

    // MARK: - Parsing

    private nonisolated func parseResults(_ json: String) throws -> [ScoutCategory: ScoutResult] {
        guard let data = json.data(using: .utf8) else {
            throw ScoutServiceError.invalidResponse
        }

        // Rust returns: {"career": {"rankings": [...], "total_beneficial": N, "total_challenging": N}, ...}
        let raw = try JSONDecoder().decode([String: RawCategoryResult].self, from: data)

        var results: [ScoutCategory: ScoutResult] = [:]

        for (key, rawResult) in raw {
            guard let category = ScoutCategory(rawValue: key) else { continue }

            let locations: [ScoutLocation] = rawResult.rankings.map { ranking in
                // Parse top_influences: each is [planet, angle, distance_km]
                let influences: [ScoutInfluence] = ranking.topInfluences.compactMap { values in
                    guard values.count >= 3,
                          let planet = values[0].stringValue,
                          let angle = values[1].stringValue,
                          let distance = values[2].doubleValue else { return nil }
                    return ScoutInfluence(planet: planet, angle: angle, distanceKm: distance)
                }

                let nature: LocationNature
                switch ranking.nature {
                case "beneficial": nature = .beneficial
                case "challenging": nature = .challenging
                default: nature = .mixed
                }

                // Web applies (benefit_score + 2) * 25 to Rust's 0-100 output
                // This transforms scores to 50-2550 range per category
                // Overall scores sum these, reaching 10,000+ for beneficial cities
                // Match web's scout.worker.ts line 415 exactly
                let normalizedScore = ((ranking.benefitScore + 2) * 25).rounded()

                return ScoutLocation(
                    cityName: ranking.cityName,
                    country: countryName(for: ranking.country),
                    countryCode: ranking.country,
                    latitude: ranking.latitude,
                    longitude: ranking.longitude,
                    benefitScore: normalizedScore,
                    intensityScore: ranking.intensityScore,
                    volatilityScore: ranking.volatilityScore,
                    mixedFlag: ranking.mixedFlag,
                    nature: nature,
                    influences: influences
                )
            }

            results[category] = ScoutResult(
                category: category,
                locations: locations,
                totalBeneficial: rawResult.totalBeneficial,
                totalChallenging: rawResult.totalChallenging
            )
        }

        return results
    }

    private nonisolated func countryName(for code: String) -> String {
        Locale.current.localizedString(forRegionCode: code) ?? code
    }
}

// MARK: - DTO for JSON parsing

private struct RawCityRanking: Decodable {
    let cityName: String
    let country: String
    let latitude: Double
    let longitude: Double
    let benefitScore: Double
    let intensityScore: Double
    let volatilityScore: Double
    let mixedFlag: Bool
    let topInfluences: [[InfluenceValue]]
    let nature: String

    enum CodingKeys: String, CodingKey {
        case cityName = "city_name"
        case country
        case latitude
        case longitude
        case benefitScore = "benefit_score"
        case intensityScore = "intensity_score"
        case volatilityScore = "volatility_score"
        case mixedFlag = "mixed_flag"
        case topInfluences = "top_influences"
        case nature
    }
}

private enum InfluenceValue: Decodable {
    case string(String)
    case double(Double)

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let s = try? container.decode(String.self) {
            self = .string(s)
        } else if let d = try? container.decode(Double.self) {
            self = .double(d)
        } else {
            throw DecodingError.typeMismatch(
                InfluenceValue.self,
                DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Expected String or Double")
            )
        }
    }

    var stringValue: String? {
        if case .string(let s) = self { return s }
        return nil
    }

    var doubleValue: Double? {
        if case .double(let d) = self { return d }
        return nil
    }
}

private struct RawCategoryResult: Decodable {
    let rankings: [RawCityRanking]
    let totalBeneficial: Int
    let totalChallenging: Int

    enum CodingKeys: String, CodingKey {
        case rankings
        case totalBeneficial = "total_beneficial"
        case totalChallenging = "total_challenging"
    }
}

// MARK: - Errors

public enum ScoutServiceError: Error, LocalizedError {
    case invalidResponse
    case scoringFailed(String)

    public var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from scoring engine"
        case .scoringFailed(let message):
            return "Scoring failed: \(message)"
        }
    }
}
