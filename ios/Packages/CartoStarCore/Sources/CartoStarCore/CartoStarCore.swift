// AstroCore - Swift wrapper for astro-core Rust library
// Provides high-performance astrocartography calculations for iOS

import Foundation

// MARK: - Models

/// Represents a celestial planet or point
public enum AstroPlanet: String, Codable, CaseIterable {
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
}

/// Represents a type of astrocartography line
public enum AstroLineType: String, Codable {
    case mc = "MC"      // Midheaven (culminating)
    case ic = "IC"      // Imum Coeli (anti-culminating)
    case asc = "ASC"    // Ascending (rising)
    case dsc = "DSC"    // Descending (setting)
}

/// A geographic point with latitude and longitude
public struct GlobePoint: Codable, Equatable {
    public let lat: Double
    public let lng: Double

    public init(lat: Double, lng: Double) {
        self.lat = lat
        self.lng = lng
    }
}

/// Planetary position in equatorial coordinates
public struct PlanetaryPosition: Codable {
    public let planet: String
    public let rightAscension: Double   // radians
    public let declination: Double      // radians
    public let eclipticLongitude: Double // degrees

    enum CodingKeys: String, CodingKey {
        case planet
        case rightAscension = "right_ascension"
        case declination
        case eclipticLongitude = "ecliptic_longitude"
    }
}

/// A planetary line on the globe
public struct PlanetaryLine: Codable {
    public let planet: String
    public let lineType: String
    public let points: [GlobePoint]
    public let color: String
    public let longitude: Double?

    enum CodingKeys: String, CodingKey {
        case planet
        case lineType = "line_type"
        case points
        case color
        case longitude
    }
}

/// Aspect line (planet forming aspect to angle)
public struct AspectLine: Codable {
    public let planet: String
    public let angle: String
    public let aspectType: String
    public let isHarmonious: Bool
    public let points: [GlobePoint]
    public let color: String

    enum CodingKeys: String, CodingKey {
        case planet
        case angle
        case aspectType = "aspect_type"
        case isHarmonious = "is_harmonious"
        case points
        case color
    }
}

/// Paran line (two planets at angles simultaneously)
public struct ParanLine: Codable {
    public let planet1: String
    public let angle1: String
    public let planet2: String
    public let angle2: String
    public let latitude: Double
    public let longitude: Double?
    public let isLatitudeCircle: Bool

    enum CodingKeys: String, CodingKey {
        case planet1
        case angle1
        case planet2
        case angle2
        case latitude
        case longitude
        case isLatitudeCircle = "is_latitude_circle"
    }
}

/// Zenith point where a planet culminates directly overhead
public struct ZenithPoint: Codable {
    public let planet: String
    public let latitude: Double
    public let longitude: Double
    public let declination: Double
    public let maxAltitude: Double

    enum CodingKeys: String, CodingKey {
        case planet
        case latitude
        case longitude
        case declination
        case maxAltitude = "max_altitude"
    }
}

/// Complete astrocartography calculation result
public struct AstroResult: Codable {
    public let julianDate: Double
    public let gmst: Double
    public let planetaryPositions: [PlanetaryPosition]
    public let planetaryLines: [PlanetaryLine]
    public let aspectLines: [AspectLine]
    public let paranLines: [ParanLine]
    public let zenithPoints: [ZenithPoint]
    public let calculationTime: Double
    public let backend: String

    enum CodingKeys: String, CodingKey {
        case julianDate = "julian_date"
        case gmst
        case planetaryPositions = "planetary_positions"
        case planetaryLines = "planetary_lines"
        case aspectLines = "aspect_lines"
        case paranLines = "paran_lines"
        case zenithPoints = "zenith_points"
        case calculationTime = "calculation_time"
        case backend
    }
}

/// Extended result with timezone information
public struct AstroResultLocal: Codable {
    public let julianDate: Double
    public let gmst: Double
    public let timezone: String
    public let timezoneOffsetHours: Double
    public let planetaryPositions: [PlanetaryPosition]
    public let planetaryLines: [PlanetaryLine]
    public let aspectLines: [AspectLine]
    public let paranLines: [ParanLine]
    public let zenithPoints: [ZenithPoint]
    public let calculationTime: Double
    public let backend: String

    enum CodingKeys: String, CodingKey {
        case julianDate = "julian_date"
        case gmst
        case timezone
        case timezoneOffsetHours = "timezone_offset_hours"
        case planetaryPositions = "planetary_positions"
        case planetaryLines = "planetary_lines"
        case aspectLines = "aspect_lines"
        case paranLines = "paran_lines"
        case zenithPoints = "zenith_points"
        case calculationTime = "calculation_time"
        case backend
    }


    /// Convert to AstroResult by dropping timezone fields
    public func toAstroResult() -> AstroResult {
        AstroResult(
            julianDate: julianDate,
            gmst: gmst,
            planetaryPositions: planetaryPositions,
            planetaryLines: planetaryLines,
            aspectLines: aspectLines,
            paranLines: paranLines,
            zenithPoints: zenithPoints,
            calculationTime: calculationTime,
            backend: backend
        )
    }
}

// MARK: - Natal Chart

/// Complete natal chart calculation result
public struct NatalChartResult: Codable {
    public let ascendant: Double
    public let midheaven: Double
    public let descendant: Double
    public let imumCoeli: Double
    public let houseCusps: [Double]       // 12 cusp longitudes
    public let houseSystem: String
    public let planets: [NatalPlanetPosition]
    public let zodiacType: String
    public let ayanamsa: Double?
    public let julianDate: Double
    public let localSiderealTime: Double
    public let obliquity: Double
    public let calculationTime: Double

    enum CodingKeys: String, CodingKey {
        case ascendant
        case midheaven
        case descendant
        case imumCoeli = "imum_coeli"
        case houseCusps = "house_cusps"
        case houseSystem = "house_system"
        case planets
        case zodiacType = "zodiac_type"
        case ayanamsa
        case julianDate = "julian_date"
        case localSiderealTime = "local_sidereal_time"
        case obliquity
        case calculationTime = "calculation_time"
    }
}

/// A planet's position in the natal chart
public struct NatalPlanetPosition: Codable {
    public let planet: String
    public let longitude: Double          // 0-360 ecliptic
    public let longitudeSidereal: Double? // Sidereal longitude if Vedic
    public let signIndex: Int             // 0=Aries
    public let signName: String
    public let degreeInSign: Double       // 0-30
    public let retrograde: Bool
    public let house: Int                 // 1-12

    enum CodingKeys: String, CodingKey {
        case planet
        case longitude
        case longitudeSidereal = "longitude_sidereal"
        case signIndex = "sign_index"
        case signName = "sign_name"
        case degreeInSign = "degree_in_sign"
        case retrograde
        case house
    }
}

// MARK: - Scout Types

/// Result for a single scout life category
public struct ScoutCategoryResult: Codable, Sendable {
    public let rankings: [ScoutCityRanking]
    public let totalBeneficial: Int
    public let totalChallenging: Int

    enum CodingKeys: String, CodingKey {
        case rankings
        case totalBeneficial = "total_beneficial"
        case totalChallenging = "total_challenging"
    }
}

/// A city's ranking within a scout category
public struct ScoutCityRanking: Codable, Sendable {
    public let cityName: String
    public let country: String
    public let latitude: Double
    public let longitude: Double
    public let benefitScore: Double
    public let intensityScore: Double
    public let volatilityScore: Double
    public let mixedFlag: Bool
    public let topInfluences: [[ScoutInfluenceValue]]
    public let nature: String

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

/// A value in the top_influences array — can be String or Double
public enum ScoutInfluenceValue: Codable, Sendable {
    case string(String)
    case double(Double)

    public init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let s = try? container.decode(String.self) {
            self = .string(s)
        } else if let d = try? container.decode(Double.self) {
            self = .double(d)
        } else {
            throw DecodingError.typeMismatch(
                ScoutInfluenceValue.self,
                DecodingError.Context(codingPath: decoder.codingPath, debugDescription: "Expected String or Double")
            )
        }
    }

    public func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .string(let s): try container.encode(s)
        case .double(let d): try container.encode(d)
        }
    }

    public var stringValue: String? {
        if case .string(let s) = self { return s }
        return nil
    }

    public var doubleValue: Double? {
        if case .double(let d) = self { return d }
        return nil
    }
}

// MARK: - Local Space Models

/// A local space line radiating from the birth location in a planet's azimuth direction
public struct LocalSpaceLine: Codable {
    public let planet: String
    public let azimuth: Double       // 0-360° from North
    public let altitude: Double      // Degrees above/below horizon
    public let points: [GlobePoint]
    public let direction: String     // Cardinal direction (N, NE, E, etc.)
    public let color: String
}

/// Result of local space calculation
public struct LocalSpaceResult: Codable {
    public let birthLatitude: Double
    public let birthLongitude: Double
    public let lines: [LocalSpaceLine]
    public let julianDate: Double
    public let calculationTime: Double

    enum CodingKeys: String, CodingKey {
        case birthLatitude = "birth_latitude"
        case birthLongitude = "birth_longitude"
        case lines
        case julianDate = "julian_date"
        case calculationTime = "calculation_time"
    }
}

// MARK: - Birth Data

/// Birth data for astrocartography calculations
public struct BirthData {
    public let year: Int32
    public let month: UInt32
    public let day: UInt32
    public let hour: UInt32
    public let minute: UInt32
    public let second: UInt32
    public let latitude: Double?
    public let longitude: Double?

    public init(
        year: Int32,
        month: UInt32,
        day: UInt32,
        hour: UInt32,
        minute: UInt32,
        second: UInt32 = 0,
        latitude: Double? = nil,
        longitude: Double? = nil
    ) {
        self.year = year
        self.month = month
        self.day = day
        self.hour = hour
        self.minute = minute
        self.second = second
        self.latitude = latitude
        self.longitude = longitude
    }

    /// Create from a Date and optional location
    public init(date: Date, latitude: Double? = nil, longitude: Double? = nil) {
        let calendar = Calendar(identifier: .gregorian)
        let components = calendar.dateComponents([.year, .month, .day, .hour, .minute, .second], from: date)

        self.year = Int32(components.year ?? 2000)
        self.month = UInt32(components.month ?? 1)
        self.day = UInt32(components.day ?? 1)
        self.hour = UInt32(components.hour ?? 12)
        self.minute = UInt32(components.minute ?? 0)
        self.second = UInt32(components.second ?? 0)
        self.latitude = latitude
        self.longitude = longitude
    }
}

// MARK: - AstroCore Calculator

/// Main interface for astrocartography calculations
///
/// Uses the high-performance Rust astro-core library via UniFFI bindings.
/// All calculations use VSOP87 planetary theory for accurate positions.
///
/// Example usage:
/// ```swift
/// let calculator = AstroCore()
/// let birthData = BirthData(year: 1990, month: 6, day: 15, hour: 14, minute: 30, latitude: 40.7128, longitude: -74.0060)
/// let result = try calculator.calculateLines(birthData: birthData)
/// ```
// MARK: - FFI Free-Function Wrappers
// These wrap UniFFI-generated free functions whose names collide with AstroCore class methods.
// Defined at file scope so they are callable without ambiguity from inside the class.

#if canImport(cartostar_coreFFI)
private func ffiToJulianDate(
    year: Int32, month: UInt32, day: UInt32,
    hour: UInt32, minute: UInt32, second: UInt32
) -> Double {
    toJulianDate(year: year, month: month, day: day, hour: hour, minute: minute, second: second)
}

private func ffiCalculateDeltaT(year: Int32, month: UInt32) -> Double {
    calculateDeltaT(year: year, month: month)
}
#endif

public class AstroCore {

    /// Longitude step size for line calculations (degrees).
    /// Matches the web default of 1° for full-resolution lines.
    public var longitudeStep: Double = 1.0

    public init() {}

    // MARK: - Julian Date Calculations

    /// Convert calendar date to Julian Date (UTC)
    public func toJulianDate(
        year: Int32,
        month: UInt32,
        day: UInt32,
        hour: UInt32,
        minute: UInt32,
        second: UInt32
    ) -> Double {
        // Use Rust FFI when available, otherwise fall back to Swift implementation
        #if canImport(cartostar_coreFFI)
        return ffiToJulianDate(year: year, month: month, day: day, hour: hour, minute: minute, second: second)
        #else
        return julianDateSwift(year: year, month: month, day: day, hour: hour, minute: minute, second: second)
        #endif
    }

    // Swift fallback implementation of Julian Date calculation
    private func julianDateSwift(
        year: Int32,
        month: UInt32,
        day: UInt32,
        hour: UInt32,
        minute: UInt32,
        second: UInt32
    ) -> Double {
        let ut = Double(hour) + Double(minute) / 60.0 + Double(second) / 3600.0

        var y = Int(year)
        var m = Int(month)

        if month <= 2 {
            y -= 1
            m += 12
        }

        let a = floor(Double(y) / 100.0)
        let b = 2.0 - a + floor(a / 4.0)

        return floor(365.25 * Double(y + 4716))
            + floor(30.6001 * Double(m + 1))
            + Double(day)
            + ut / 24.0
            + b
            - 1524.5
    }

    // MARK: - Main Calculation Functions

    /// Calculate all astrocartography lines for a birth time (UTC)
    ///
    /// - Parameters:
    ///   - birthData: Birth date/time information
    /// - Returns: Complete calculation result with all lines
    /// - Throws: AstroCoreError if calculation fails
    public func calculateLines(birthData: BirthData) throws -> AstroResult {
        if let lat = birthData.latitude, let lng = birthData.longitude {
            // Use local time with timezone detection, convert to AstroResult
            let local = try calculateLinesLocal(birthData: birthData, latitude: lat, longitude: lng)
            return local.toAstroResult()
        } else {
            // Use UTC time directly
            return try calculateLinesUTC(birthData: birthData)
        }
    }

    /// Calculate lines using UTC time
    public func calculateLinesUTC(birthData: BirthData) throws -> AstroResult {
        #if canImport(cartostar_coreFFI)
        let jsonString = calculateAllLinesJson(
            year: birthData.year,
            month: birthData.month,
            day: birthData.day,
            hour: birthData.hour,
            minute: birthData.minute,
            second: birthData.second,
            longitudeStep: longitudeStep
        )

        guard let data = jsonString.data(using: .utf8) else {
            throw AstroCoreError.invalidResponse
        }

        let decoder = JSONDecoder()
        return try decoder.decode(AstroResult.self, from: data)
        #else
        throw AstroCoreError.ffiNotAvailable
        #endif
    }

    /// Calculate lines using local time with automatic timezone detection
    public func calculateLinesLocal(
        birthData: BirthData,
        latitude: Double,
        longitude: Double
    ) throws -> AstroResultLocal {
        #if canImport(cartostar_coreFFI)
        let jsonString = calculateAllLinesLocalJson(
            birthLat: latitude,
            birthLng: longitude,
            year: birthData.year,
            month: birthData.month,
            day: birthData.day,
            hour: birthData.hour,
            minute: birthData.minute,
            second: birthData.second,
            longitudeStep: longitudeStep
        )

        guard let data = jsonString.data(using: .utf8) else {
            throw AstroCoreError.invalidResponse
        }

        let decoder = JSONDecoder()
        return try decoder.decode(AstroResultLocal.self, from: data)
        #else
        throw AstroCoreError.ffiNotAvailable
        #endif
    }

    // MARK: - Natal Chart

    /// Calculate a complete natal chart with house cusps and planet positions
    ///
    /// - Parameters:
    ///   - birthData: Birth date/time and location
    ///   - houseSystem: House system to use ("placidus", "equal", "whole_sign", "koch", "campanus", "regiomontanus", "porphyry", "morinus")
    ///   - useSidereal: Whether to use sidereal zodiac (Vedic)
    ///   - ayanamsaSystem: Ayanamsa system for sidereal ("lahiri", "fagan_bradley", "raman", "krishnamurti", "yukteswar")
    /// - Returns: Complete natal chart result
    /// - Throws: AstroCoreError if calculation fails
    public func calculateNatalChart(
        birthData: BirthData,
        houseSystem: String = "placidus",
        useSidereal: Bool = false,
        ayanamsaSystem: String = "lahiri"
    ) throws -> NatalChartResult {
        guard let lat = birthData.latitude, let lng = birthData.longitude else {
            throw AstroCoreError.calculationFailed("Birth location (latitude/longitude) is required for natal chart")
        }

        #if canImport(cartostar_coreFFI)
        let jsonString = calculateNatalChartJson(
            birthLat: lat,
            birthLng: lng,
            year: birthData.year,
            month: birthData.month,
            day: birthData.day,
            hour: birthData.hour,
            minute: birthData.minute,
            second: birthData.second,
            houseSystem: houseSystem,
            useSidereal: useSidereal,
            ayanamsaSystem: ayanamsaSystem
        )

        guard let data = jsonString.data(using: .utf8) else {
            throw AstroCoreError.invalidResponse
        }

        let decoder = JSONDecoder()
        return try decoder.decode(NatalChartResult.self, from: data)
        #else
        throw AstroCoreError.ffiNotAvailable
        #endif
    }

    // MARK: - Local Space

    /// Calculate local space lines radiating from the birth location
    /// - Parameters:
    ///   - birthData: Birth date/time/location
    ///   - maxDistanceKm: How far lines extend (default 15000 km)
    ///   - stepKm: Distance between line points (default 200 km)
    /// - Returns: Local space result with azimuth-based lines for each planet
    public func calculateLocalSpace(
        birthData: BirthData,
        maxDistanceKm: Double = 15000,
        stepKm: Double = 200
    ) throws -> LocalSpaceResult {
        guard let lat = birthData.latitude, let lng = birthData.longitude else {
            throw AstroCoreError.calculationFailed("Birth location is required for local space")
        }

        #if canImport(cartostar_coreFFI)
        let jsonString = calculateLocalSpaceLinesJson(
            birthLat: lat,
            birthLng: lng,
            year: birthData.year,
            month: birthData.month,
            day: birthData.day,
            hour: birthData.hour,
            minute: birthData.minute,
            second: birthData.second,
            maxDistanceKm: maxDistanceKm,
            stepKm: stepKm
        )

        guard let data = jsonString.data(using: .utf8) else {
            throw AstroCoreError.invalidResponse
        }

        return try JSONDecoder().decode(LocalSpaceResult.self, from: data)
        #else
        throw AstroCoreError.ffiNotAvailable
        #endif
    }

    // MARK: - Timezone Functions

    /// Get timezone name from coordinates
    public func getTimezone(latitude: Double, longitude: Double) -> String {
        #if canImport(cartostar_coreFFI)
        return getTimezoneFromCoords(lat: latitude, lng: longitude)
        #else
        // Fallback: estimate timezone from longitude
        let hourOffset = longitude / 15.0
        let offsetHours = Int(round(hourOffset))
        if offsetHours >= 0 {
            return "UTC+\(offsetHours)"
        } else {
            return "UTC\(offsetHours)"
        }
        #endif
    }

    /// Get timezone offset in hours for a specific date/time
    public func getTimezoneOffset(
        latitude: Double,
        longitude: Double,
        year: Int32,
        month: UInt32,
        day: UInt32,
        hour: UInt32,
        minute: UInt32,
        second: UInt32
    ) -> Double {
        #if canImport(cartostar_coreFFI)
        return getTimezoneOffsetHours(
            lat: latitude, lng: longitude,
            year: year, month: month, day: day,
            hour: hour, minute: minute, second: second
        )
        #else
        // Fallback: estimate from longitude
        return round(longitude / 15.0 * 2.0) / 2.0
        #endif
    }

    // MARK: - Scout Scoring

    /// Score cities across all 6 life categories using the Rust C2 algorithm.
    ///
    /// - Parameters:
    ///   - citiesJson: JSON array of `{"name","country","lat","lon"}` objects
    ///   - linesJson: JSON array of `{"planet","angle","rating","aspect","points"}` objects
    ///   - ratingsJson: JSON object mapping `"Planet:Angle"` → rating (e.g. `{"Sun:MC":5}`)
    ///   - configJson: JSON scoring config (kernel_type, kernel_parameter, max_distance_km, volatility_penalty)
    /// - Returns: Dictionary keyed by category name ("career", "love", etc.)
    public func scoreCities(
        citiesJson: String,
        linesJson: String,
        ratingsJson: String = "{}",
        configJson: String = "{}",
        paranLinesJson: String = "",
        zenithJson: String = "[]"
    ) throws -> [String: ScoutCategoryResult] {
        #if canImport(cartostar_coreFFI)
        let resultJson = scoreCitiesJson(
            citiesJson: citiesJson,
            linesJson: linesJson,
            ratingsJson: ratingsJson,
            configJson: configJson,
            paranLinesJson: paranLinesJson,
            zenithJson: zenithJson
        )

        guard let data = resultJson.data(using: .utf8) else {
            throw AstroCoreError.invalidResponse
        }

        let decoder = JSONDecoder()
        return try decoder.decode([String: ScoutCategoryResult].self, from: data)
        #else
        throw AstroCoreError.ffiNotAvailable
        #endif
    }

    // MARK: - Utility Functions

    /// Calculate Greenwich Mean Sidereal Time
    public func calculateGMST(julianDate: Double) -> Double {
        #if canImport(cartostar_coreFFI)
        return calculateGmst(julianDate: julianDate)
        #else
        // Swift implementation
        let j2000: Double = 2451545.0
        let century: Double = 36525.0
        let t = (julianDate - j2000) / century

        var thetaG = 280.46061837
            + 360.98564736629 * (julianDate - j2000)
            + 0.000387933 * t * t
            - t * t * t / 38710000.0

        // Normalize to 0-360
        thetaG = thetaG.truncatingRemainder(dividingBy: 360.0)
        if thetaG < 0 { thetaG += 360.0 }

        // Convert to radians
        return thetaG * .pi / 180.0
        #endif
    }

    /// Calculate Local Sidereal Time
    public func calculateLST(gmst: Double, longitudeDeg: Double) -> Double {
        #if canImport(cartostar_coreFFI)
        return calculateLst(gmst: gmst, longitudeDeg: longitudeDeg)
        #else
        let lst = gmst + longitudeDeg * .pi / 180.0
        let twoPi = 2.0 * .pi
        return ((lst.truncatingRemainder(dividingBy: twoPi)) + twoPi).truncatingRemainder(dividingBy: twoPi)
        #endif
    }

    /// Calculate Delta T (TT - UT) in seconds
    public func calculateDeltaT(year: Int32, month: UInt32) -> Double {
        #if canImport(cartostar_coreFFI)
        return ffiCalculateDeltaT(year: year, month: month)
        #else
        // Simplified approximation for modern dates
        let y = Double(year) + (Double(month) - 0.5) / 12.0
        if y >= 2005 && y < 2050 {
            let t = y - 2000.0
            return 62.92 + 0.32217 * t + 0.005589 * t * t
        }
        return 69.0 // Default approximate value for 2024
        #endif
    }
}

// MARK: - Errors

/// Errors that can occur during astrocartography calculations
public enum AstroCoreError: Error, LocalizedError {
    case invalidResponse
    case decodingError(Error)
    case ffiNotAvailable
    case calculationFailed(String)

    public var errorDescription: String? {
        switch self {
        case .invalidResponse:
            return "Invalid response from calculation engine"
        case .decodingError(let error):
            return "Failed to decode result: \(error.localizedDescription)"
        case .ffiNotAvailable:
            return "Rust FFI bindings not available. Build with build-rust-xcframework.sh"
        case .calculationFailed(let message):
            return "Calculation failed: \(message)"
        }
    }
}

// MARK: - Extensions

extension PlanetaryLine {
    /// Get the AstroPlanet enum value for this line
    public var astroPlanet: AstroPlanet? {
        AstroPlanet(rawValue: planet)
    }

    /// Get the AstroLineType enum value for this line
    public var astroLineType: AstroLineType? {
        AstroLineType(rawValue: lineType)
    }
}

extension PlanetaryPosition {
    /// Right ascension in degrees
    public var rightAscensionDegrees: Double {
        rightAscension * 180.0 / .pi
    }

    /// Declination in degrees
    public var declinationDegrees: Double {
        declination * 180.0 / .pi
    }
}
