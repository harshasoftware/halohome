import Foundation
import CartoStarCore
import FeatureScout

/// Loads city data from the Rust bincode cache (loaded at app startup via initializeRustCache).
/// Cities are serialized from the in-memory Rust cache — no JSON file needed.
enum CityDataLoader {

    // MARK: - JSON Model (decoded from Rust getCachedCitiesJson output)

    private struct RawCity: Decodable, Sendable {
        let name: String
        let country_code: String
        let lat: Double
        let lon: Double
        let population: Int
    }

    // MARK: - Cached Cities

    private static let cache = CityCache()

    /// Actor-isolated cache for thread-safe access
    private final actor CityCache {
        var cities: [City]?
        var isRustCacheInitialized: Bool = false

        func get() -> [City]? { cities }
        func set(_ value: [City]) { cities = value }
        func setRustInitialized() { isRustCacheInitialized = true }
        func isRustReady() -> Bool { isRustCacheInitialized }
    }

    // MARK: - Public API

    /// Initialize the ANISE JPL ephemeris (planets_small.bsp + chiron.bsp).
    ///
    /// Call this once at app startup before performing any planetary position
    /// calculations.  The files are read from the main bundle Resources folder.
    /// This is a no-op if the almanac has already been initialised.
    ///
    /// - Returns: `true` if both BSP files were loaded successfully.
    @discardableResult
    static func initializeEphemeris() -> Bool {
        guard
            let planetsBsp = Bundle.main.path(forResource: "planets_small", ofType: "bsp"),
            let chironBsp = Bundle.main.path(forResource: "chiron", ofType: "bsp")
        else {
            print("[CityDataLoader] Warning: BSP ephemeris files not found in bundle — using analytic fallback")
            return false
        }
        let ok = initEphemerisBsp(planetsBspPath: planetsBsp, chironBspPath: chironBsp)
        if ok {
            print("[CityDataLoader] ANISE ephemeris loaded (planets_small.bsp + chiron.bsp)")
        } else {
            print("[CityDataLoader] Warning: Failed to initialise ANISE ephemeris")
        }
        return ok
    }

    /// Initialize cities in Rust cache from bincode (fastest path).
    /// Call this once at app startup before using Scout features.
    /// Returns the number of cities loaded.
    @MainActor
    static func initializeRustCache() async -> Int {
        // Try bincode first (20-50x faster)
        if let bincodePath = Bundle.main.url(forResource: "geonames-cities", withExtension: "bincode"),
           let data = try? Data(contentsOf: bincodePath) {
            let count = initCitiesBincode(bytes: data)
            if count > 0 {
                await cache.setRustInitialized()
                print("[CityDataLoader] Loaded \(count) cities from bincode (\(data.count) bytes)")
                return Int(count)
            }
        }

        print("[CityDataLoader] Warning: Failed to load cities into Rust cache")
        return 0
    }

    /// Check if Rust cache is initialized
    static func isRustCacheReady() async -> Bool {
        await cache.isRustReady() || citiesLoaded()
    }

    /// Load all cities asynchronously (Swift side, for display purposes).
    /// Reads from the Rust in-memory cache loaded via initializeRustCache().
    static func loadCities() async throws -> [City] {
        if let cached = await cache.get() {
            return cached
        }

        // Ensure Rust cache is initialized first
        if await !cache.isRustReady() {
            _ = await initializeRustCache()
        }

        let cities = try await Task.detached(priority: .userInitiated) {
            let json = getCachedCitiesJson()
            guard json != "[]" else {
                throw CityLoadError.cacheEmpty
            }
            let data = Data(json.utf8)
            let rawCities = try JSONDecoder().decode([RawCity].self, from: data)
            return rawCities.map { raw in
                City(
                    name: raw.name,
                    country: countryName(for: raw.country_code),
                    countryCode: raw.country_code,
                    latitude: raw.lat,
                    longitude: raw.lon,
                    population: raw.population
                )
            }
        }.value

        await cache.set(cities)
        return cities
    }

    // MARK: - Errors

    enum CityLoadError: LocalizedError {
        case cacheEmpty

        var errorDescription: String? {
            switch self {
            case .cacheEmpty:
                return "City cache is empty — ensure initializeRustCache() completed successfully"
            }
        }
    }

    // MARK: - Country Code → Name

    private static func countryName(for code: String) -> String {
        Locale.current.localizedString(forRegionCode: code) ?? code
    }
}

// MARK: - Scout Integration

extension CityDataLoader {

    /// Score cities using the Rust cache (no JSON serialization for cities!).
    /// This is the fastest path for Scout scoring.
    ///
    /// - Parameters:
    ///   - linesJson: JSON array of planetary lines
    ///   - ratingsJson: JSON object of rating overrides
    ///   - configJson: JSON object of scoring configuration
    /// - Returns: Scoring results JSON string
    static func scoreCachedCities(
        linesJson: String,
        ratingsJson: String = "{}",
        configJson: String = "{}",
        paranLinesJson: String = "",
        zenithJson: String = "[]"
    ) -> String {
        scoreCachedCitiesJson(
            linesJson: linesJson,
            ratingsJson: ratingsJson,
            configJson: configJson,
            paranLinesJson: paranLinesJson,
            zenithJson: zenithJson
        )
    }
}
