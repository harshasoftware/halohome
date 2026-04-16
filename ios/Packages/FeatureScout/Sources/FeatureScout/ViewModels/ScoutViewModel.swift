import Foundation
import SwiftUI
import Core

/// ViewModel for the Scout feature
@MainActor
@Observable
public final class ScoutViewModel {

    // MARK: - Published State

    /// Currently selected category (defaults to overall)
    public var selectedCategory: ScoutCategory = .overall

    /// Current results for the selected category
    public var results: [ScoutLocation] = []

    /// All computed results by category
    public private(set) var categoryResults: [ScoutCategory: ScoutResult] = [:]

    /// Current computation progress
    public var progress: ScoutProgress = .idle

    /// Error message if computation failed
    public var errorMessage: String?

    /// Whether results are currently being computed
    public var isComputing: Bool {
        progress.phase == .computing || progress.phase == .initializing
    }

    /// Whether results are available
    public var hasResults: Bool {
        !results.isEmpty
    }

    /// Whether a birth chart has been configured (cities loaded).
    /// When false, show a "no chart" prompt instead of an error.
    public var isChartConfigured: Bool { !cities.isEmpty }

    /// Filter mode (beneficial or challenging)
    public var filterMode: FilterMode = .beneficial

    /// View mode (top locations or by country)
    public var viewMode: ViewMode = .top

    /// Maximum number of results to display
    public var resultLimit: Int = 200

    /// Total number of cities scored (before filtering/limiting)
    public private(set) var totalCitiesScored: Int = 0

    /// Population tier filter (default matches web's DEFAULT_POPULATION_TIER = 'medium')
    public var populationTier: PopulationTier = .medium {
        didSet {
            if oldValue != populationTier {
                // Clear results when tier changes - will recompute
                categoryResults = [:]
                results = []
                progress = .idle
                currentCacheKey = nil
            }
        }
    }

    /// Country filter — nil means all countries
    public var selectedCountryCode: String? = nil {
        didSet {
            if oldValue != selectedCountryCode {
                categoryResults = [:]
                results = []
                progress = .idle
                currentCacheKey = nil
            }
        }
    }

    /// Cached available countries (invalidated when cities or population tier changes)
    private var cachedAvailableCountries: [(code: String, name: String, count: Int)]?
    private var cachedCountriesPopulationTier: PopulationTier?
    private var cachedCountriesCityCount: Int?

    /// Available countries from the loaded city data, sorted by name
    public var availableCountries: [(code: String, name: String, count: Int)] {
        // Return cached result if still valid
        if let cached = cachedAvailableCountries,
           cachedCountriesPopulationTier == populationTier,
           cachedCountriesCityCount == cities.count {
            return cached
        }

        let populationFiltered = cities.filter { $0.population >= populationTier.minPopulation }
        var countryMap: [String: (name: String, count: Int)] = [:]
        for city in populationFiltered {
            if let existing = countryMap[city.countryCode] {
                countryMap[city.countryCode] = (existing.name, existing.count + 1)
            } else {
                countryMap[city.countryCode] = (city.country, 1)
            }
        }
        let result = countryMap.map { (code: $0.key, name: $0.value.name, count: $0.value.count) }
            .sorted { $0.name < $1.name }

        // Cache the result
        cachedAvailableCountries = result
        cachedCountriesPopulationTier = populationTier
        cachedCountriesCityCount = cities.count

        return result
    }

    /// Filter cities by population tier and country
    private var filteredCities: [City] {
        var filtered = cities.filter { $0.population >= populationTier.minPopulation }
        if let countryCode = selectedCountryCode {
            filtered = filtered.filter { $0.countryCode == countryCode }
        }
        return filtered
    }

    // MARK: - Pipeline Settings

    /// Pipeline module toggles (persisted to UserDefaults)
    public let pipelineSettings: PipelineSettings

    /// Natal chart JSON for pipeline modules that need it
    public var natalChartJson: String?

    /// Whether the pipeline settings sheet is presented
    public var showPipelineSettings = false

    // MARK: - Dependencies

    private let scoutService: ScoutServiceProtocol
    private var computeTask: Task<Void, Never>?
    private var progressTimer: Task<Void, Never>?

    // MARK: - Data

    private var cities: [City] = []
    private var planetaryLines: [PlanetaryLine] = []
    private var aspectLines: [AspectLine] = []
    private var paranLinesJson: String = ""
    private var zenithJson: String = "[]"

    // MARK: - Caching

    /// Cache key for current birth data (set when configuring)
    private var currentCacheKey: String?

    /// In-memory cache of scout results keyed by birth data hash
    private static var resultsCache: [String: [ScoutCategory: ScoutResult]] = [:]

    /// Tracks the last computation configuration hash to prevent redundant recomputes
    private var lastComputeConfigHash: Int?

    /// Debounce timer for settings changes
    private var settingsDebounceTask: Task<Void, Never>?

    // MARK: - Initialization

    public init(scoutService: ScoutServiceProtocol, pipelineSettings: PipelineSettings) {
        self.scoutService = scoutService
        self.pipelineSettings = pipelineSettings
        // Re-score when pipeline settings change (debounced to avoid rapid-fire recomputes)
        pipelineSettings.onSettingsChanged = { [weak self] in
            guard let self else { return }
            // Cancel any pending debounce
            self.settingsDebounceTask?.cancel()
            // Debounce settings changes by 150ms to batch rapid changes
            self.settingsDebounceTask = Task { @MainActor [weak self] in
                try? await Task.sleep(for: .milliseconds(150))
                guard !Task.isCancelled, let self else { return }
                // Invalidate cache and recompute
                self.currentCacheKey = nil
                self.lastComputeConfigHash = nil  // Force recompute
                Self.resultsCache.removeAll()
                await self.startComputing()
            }
        }
    }

    /// Check if results are cached for the given birth data key
    public func hasCachedResults(for cacheKey: String) -> Bool {
        Self.resultsCache[cacheKey] != nil
    }

    /// Load cached results if available
    public func loadCachedResults(for cacheKey: String) -> Bool {
        guard let cached = Self.resultsCache[cacheKey] else { return false }
        self.categoryResults = cached
        self.currentCacheKey = cacheKey
        if let firstResult = cached.values.first {
            self.totalCitiesScored = firstResult.locations.count
        }
        self.progress = ScoutProgress.complete
        updateResultsForCategory()
        return true
    }

    // MARK: - Public Methods

    /// Configure the scout with data and optional cache key
    public func configure(
        cities: [City],
        planetaryLines: [PlanetaryLine],
        aspectLines: [AspectLine],
        paranLinesJson: String = "",
        zenithJson: String = "[]",
        cacheKey: String? = nil
    ) {
        self.cities = cities
        self.planetaryLines = planetaryLines
        self.aspectLines = aspectLines
        self.paranLinesJson = paranLinesJson
        self.zenithJson = zenithJson
        self.currentCacheKey = cacheKey
        // Invalidate countries cache since city data changed
        self.cachedAvailableCountries = nil
        // Invalidate config hash so startComputing() always runs fresh for new chart data
        self.lastComputeConfigHash = nil
    }

    /// Start computing rankings — single Rust call scores all 6 categories
    public func startComputing() async {
        guard !cities.isEmpty else {
            // No chart configured yet — ScoutView shows the no-chart empty state; no error needed.
            AppLogger.debug("Scout waiting: no birth chart configured", category: AppLogger.feature)
            return
        }

        // Build a hash of the current computation configuration to detect redundant calls
        let filteredCount = filteredCities.count
        let configHash = computeConfigurationHash(cityCount: filteredCount)

        // Skip if we're already computing with the same configuration
        if isComputing {
            AppLogger.debug("[Scout] Already computing, skipping redundant startComputing call", category: AppLogger.feature)
            return
        }

        // Skip if we just computed with the exact same configuration
        if let lastHash = lastComputeConfigHash, lastHash == configHash, hasResults {
            AppLogger.debug("[Scout] Same config hash (\(configHash)), results exist, skipping recompute", category: AppLogger.feature)
            return
        }

        lastComputeConfigHash = configHash
        AppLogger.info("[Scout] Starting computation with \(filteredCount) cities, configHash=\(configHash)", category: AppLogger.feature)

        // Cancel any existing computation
        computeTask?.cancel()
        progressTimer?.cancel()
        errorMessage = nil

        // Clear results immediately to show loading state (prevents flicker)
        results = []
        categoryResults = [:]

        progress = ScoutProgress(phase: .computing, percentage: 5, currentCategory: .career, message: "Scoring cities...")

        // Start a progress simulation timer that ticks toward 90% while Rust runs
        startProgressTimer()

        computeTask = Task.detached(priority: .userInitiated) { [weak self] in
            guard let self else { return }

            do {
                // Filter cities by population tier
                let cities = await self.filteredCities
                let lines = await self.planetaryLines
                let aspects = await self.aspectLines
                let paranJson = await self.paranLinesJson
                let zenith = await self.zenithJson

                // Build config JSON from pipeline settings (must await @MainActor)
                let configJson = await self.pipelineSettings.toConfigJson()
                let needsNatal = await self.pipelineSettings.requiresNatalChart
                let natalJson = await self.natalChartJson

                // Single Rust call — computes all 6 categories with bounding box optimization
                let allResults = try await self.scoutService.computeAllRankings(
                    cities: cities,
                    planetaryLines: lines,
                    aspectLines: aspects,
                    configJson: configJson,
                    natalChartJson: needsNatal ? natalJson : nil,
                    paranLinesJson: paranJson,
                    zenithJson: zenith
                )

                await MainActor.run {
                    self.progressTimer?.cancel()
                    self.categoryResults = allResults
                    // Track total cities scored (use first category's count)
                    if let firstResult = allResults.values.first {
                        self.totalCitiesScored = firstResult.locations.count
                    }
                    // Cache results if we have a cache key
                    if let cacheKey = self.currentCacheKey {
                        Self.resultsCache[cacheKey] = allResults
                    }
                    self.progress = ScoutProgress.complete
                    self.updateResultsForCategory()
                }

            } catch is CancellationError {
                await MainActor.run {
                    self.progressTimer?.cancel()
                }
                AppLogger.debug("Scout computation cancelled", category: AppLogger.feature)
            } catch {
                AppLogger.error("Failed to compute scout rankings: \(error)", category: AppLogger.feature)
                await MainActor.run {
                    self.progressTimer?.cancel()
                    self.errorMessage = "Failed to compute rankings. Please try again."
                    self.progress = ScoutProgress(phase: .error, percentage: 0, message: error.localizedDescription)
                }
            }
        }

        await computeTask?.value
    }

    /// Cancel current computation
    public func cancelComputing() {
        computeTask?.cancel()
        computeTask = nil
        progressTimer?.cancel()
        progressTimer = nil
        progress = .idle
    }

    /// Select a category
    public func selectCategory(_ category: ScoutCategory) {
        selectedCategory = category
        updateResultsForCategory()
    }

    /// Results grouped by country for "By Country" view mode.
    /// Countries sorted by their top city score; cities within each country sorted by score.
    public var groupedByCountry: [CountryGroup] {
        let locations = results
        var grouped: [String: [ScoutLocation]] = [:]
        for location in locations {
            grouped[location.countryCode, default: []].append(location)
        }
        var groups: [CountryGroup] = grouped.map { code, locs in
            let sorted = locs.sorted { $0.benefitScore > $1.benefitScore }
            return CountryGroup(
                countryCode: code,
                countryName: sorted.first?.country ?? code,
                locations: sorted,
                beneficialCount: sorted.filter { $0.nature == .beneficial }.count,
                challengingCount: sorted.filter { $0.nature == .challenging }.count
            )
        }
        // Sort countries by top city score descending
        groups.sort { $0.topScore > $1.topScore }
        return groups
    }

    /// Set filter mode
    public func setFilter(_ mode: FilterMode) {
        filterMode = mode
        updateResultsForCategory()
    }

    /// Fly to a location on the globe
    public func flyToLocation(_ location: ScoutLocation) {
        AppLogger.debug("Flying to: \(location.cityName)", category: AppLogger.feature)
    }

    // MARK: - Private Methods

    /// Computes a hash of the current scoring configuration to detect redundant computation requests.
    /// Includes: filtered city count, population tier, country filter, pipeline settings config JSON.
    private func computeConfigurationHash(cityCount: Int) -> Int {
        var hasher = Hasher()
        hasher.combine(cityCount)
        hasher.combine(populationTier.rawValue)
        hasher.combine(selectedCountryCode ?? "all")
        hasher.combine(pipelineSettings.toConfigJson())
        return hasher.finalize()
    }

    /// Simulated progress timer that ticks from 5% → ~90% while Rust runs.
    /// Cycles through the 6 categories to show activity.
    private func startProgressTimer() {
        let categories = ScoutCategory.subcategories
        let messages = [
            "Analyzing career lines...",
            "Scoring love & relationships...",
            "Evaluating health influences...",
            "Assessing home & foundations...",
            "Computing wellbeing scores...",
            "Calculating wealth potential..."
        ]

        progressTimer = Task { [weak self] in
            guard let self else { return }

            var currentPercentage: Double = 5
            var tick = 0

            while !Task.isCancelled && currentPercentage < 90 {
                try? await Task.sleep(for: .milliseconds(400))
                guard !Task.isCancelled else { break }

                // Asymptotic approach: larger jumps early, smaller as we near 90%
                let remaining = 90 - currentPercentage
                let increment = max(1.5, remaining * 0.12)
                currentPercentage = min(90, currentPercentage + increment)

                let categoryIndex = tick % categories.count
                let category = categories[categoryIndex]
                let message = messages[categoryIndex]

                self.progress = ScoutProgress(
                    phase: .computing,
                    percentage: currentPercentage,
                    currentCategory: category,
                    message: message
                )

                tick += 1
            }
        }
    }

    private func updateResultsForCategory() {
        // Handle overall category specially - average all subcategory scores
        if selectedCategory == .overall {
            results = computeOverallResults()
            return
        }

        guard let result = categoryResults[selectedCategory] else {
            results = []
            return
        }

        // Filter by nature and sort appropriately
        var filtered: [ScoutLocation]
        switch filterMode {
        case .beneficial:
            // Best places: filter to beneficial/mixed, sort by score descending (highest first)
            filtered = result.locations
                .filter { $0.nature == .beneficial || $0.nature == .mixed }
                .sorted { $0.benefitScore > $1.benefitScore }
        case .challenging:
            // Avoid places: filter to challenging/mixed, sort by score ascending (most challenging first)
            filtered = result.locations
                .filter { $0.nature == .challenging || $0.nature == .mixed }
                .sorted { $0.benefitScore < $1.benefitScore }
        }

        // Apply limit
        results = Array(filtered.prefix(resultLimit))
    }

    /// Compute overall scores matching web scoutParallel.worker.ts scoutOverall() exactly:
    /// 1. Collect category scores from each category result
    /// 2. For each city, sum: beneficial scores added, challenging scores * 0.5 subtracted
    /// 3. Nature determined by beneficial vs challenging category count
    /// 4. Sort by totalScore descending
    private func computeOverallResults() -> [ScoutLocation] {
        // Track per-city: scores keyed by category, and base location data.
        // Web uses Map.set(category, score) which OVERWRITES per category — critical for
        // cities with duplicate name+country in geonames data (e.g. "São José-BR" has 2 entries).
        // Using a dictionary keyed by category matches web's overwrite semantics.
        struct CategoryScore {
            let score: Double
            let nature: LocationNature
        }

        struct CityData {
            var scores: [ScoutCategory: CategoryScore] = [:]
            var location: ScoutLocation
            var minDistance: Double
        }

        var cityDataMap: [String: CityData] = [:]

        // Collect scores from all categories (matches web cityScoresMap)
        for category in ScoutCategory.subcategories {
            guard let result = categoryResults[category] else { continue }

            for location in result.locations {
                // Skip cities with no influences (matches web)
                guard !location.influences.isEmpty else { continue }

                let key = "\(location.cityName)-\(location.countryCode)"

                // Web uses nature: 'beneficial' or 'challenging' only
                // 'mixed' is treated as 'beneficial' in web
                let nature: LocationNature = location.nature == .challenging ? .challenging : .beneficial

                if var existing = cityDataMap[key] {
                    // Web Map.set() overwrites — last city with same name+country wins per category
                    existing.scores[category] = CategoryScore(score: location.benefitScore, nature: nature)
                    existing.minDistance = min(existing.minDistance, location.influences.first?.distanceKm ?? 9999)
                    cityDataMap[key] = existing
                } else {
                    cityDataMap[key] = CityData(
                        scores: [category: CategoryScore(score: location.benefitScore, nature: nature)],
                        location: location,
                        minDistance: location.influences.first?.distanceKm ?? 9999
                    )
                }
            }
        }

        // Compute overall locations (matches web)
        var overallLocations: [ScoutLocation] = []

        for (_, data) in cityDataMap {
            var totalScore: Double = 0
            var beneficialCount = 0
            var challengingCount = 0

            // Iterate categories in order (matches web's for-of CATEGORIES loop)
            for category in ScoutCategory.subcategories {
                guard let scoreData = data.scores[category] else { continue }
                if scoreData.nature == .beneficial {
                    totalScore += scoreData.score
                    beneficialCount += 1
                } else {
                    totalScore -= scoreData.score * 0.5
                    challengingCount += 1
                }
            }

            // Only include cities with at least one category score (matches web line 566)
            guard !data.scores.isEmpty else { continue }

            // Determine overall nature by category counts (matches web lines 575-576)
            let overallNature: LocationNature
            if beneficialCount > challengingCount {
                overallNature = .beneficial
            } else if challengingCount > beneficialCount {
                overallNature = .challenging
            } else {
                overallNature = .mixed
            }

            // Round totalScore (matches web line 572)
            let overall = ScoutLocation(
                id: UUID(),
                cityName: data.location.cityName,
                country: data.location.country,
                countryCode: data.location.countryCode,
                latitude: data.location.latitude,
                longitude: data.location.longitude,
                benefitScore: totalScore.rounded(),
                intensityScore: data.location.intensityScore,
                volatilityScore: data.location.volatilityScore,
                mixedFlag: data.location.mixedFlag,
                nature: overallNature,
                influences: data.location.influences
            )
            overallLocations.append(overall)
        }

        // Sort by totalScore descending (matches web line 584)
        overallLocations.sort { $0.benefitScore > $1.benefitScore }

        // Filter based on mode
        var filtered: [ScoutLocation]
        switch filterMode {
        case .beneficial:
            filtered = overallLocations.filter { $0.nature == .beneficial || $0.nature == .mixed }
        case .challenging:
            // For challenging, reverse sort (most challenging = lowest score first)
            filtered = overallLocations
                .filter { $0.nature == .challenging || $0.nature == .mixed }
                .reversed()
        }

        // Apply limit
        return Array(filtered.prefix(resultLimit))
    }
}

// MARK: - Supporting Types

public extension ScoutViewModel {

    /// Filter mode for results
    enum FilterMode: String, CaseIterable, Identifiable {
        case beneficial
        case challenging

        public var id: String { rawValue }

        public var label: String {
            switch self {
            case .beneficial: return "Best Places"
            case .challenging: return "Avoid"
            }
        }

        public var iconName: String {
            switch self {
            case .beneficial: return "hand.thumbsup.fill"
            case .challenging: return "hand.thumbsdown.fill"
            }
        }
    }

    /// View mode for displaying results
    enum ViewMode: String, CaseIterable, Identifiable {
        case top
        case byCountry

        public var id: String { rawValue }

        public var label: String {
            switch self {
            case .top: return "Top Locations"
            case .byCountry: return "By Country"
            }
        }

        public var iconName: String {
            switch self {
            case .top: return "list.number"
            case .byCountry: return "globe"
            }
        }
    }
}
