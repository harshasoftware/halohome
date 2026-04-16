import Foundation
import Observation
import SwiftUI
import Core

/// ViewModel for managing Duo (compatibility) mode state
@MainActor
@Observable
public final class DuoViewModel {

    // MARK: - Published State

    /// Whether duo mode is enabled
    public var isEnabled: Bool = false

    /// Current partner chart data
    public var partnerChart: PartnerChartData?

    /// Current compatibility mode
    public var mode: CompatibilityMode = .honeymoon

    /// Current compatibility analysis results
    public var analysis: CompatibilityAnalysis?

    /// Whether calculation is in progress
    public var isCalculating: Bool = false

    /// Whether partner selection sheet is showing
    public var showPartnerSheet: Bool = false

    /// Error message if calculation failed
    public var errorMessage: String?

    /// Style for partner lines on the globe
    public var linesStyle: DuoLinesStyle = .default

    /// Partner's astro lines (calculated separately)
    public var partnerLines: [AstroLine] = []

    // MARK: - User Info (for display)

    /// Current user's name
    public var userName: String = "You"

    /// Current user's avatar identifier (for Tapback avatar loading)
    public var userAvatarIdentifier: String?

    /// Current user's astro lines
    public var userLines: [AstroLine] = []

    // MARK: - Saved Charts

    /// Saved partner charts for quick selection
    public var savedCharts: [PartnerChartData] = []

    // MARK: - City Data

    /// Loaded cities for scoring
    private var cities: [DuoCity] = []

    /// City provider for loading city data
    private let cityProvider: DuoCityProvider?

    // MARK: - Dependencies

    private let astroLineProvider: AstroLineProvider
    private let compatibilityService: CompatibilityService
    private var calculationTask: Task<Void, Never>?

    // MARK: - Storage

    private static let partnerStorageKey = "astro_partner_chart"
    private let store = ProtectedFileStore()

    // MARK: - Initialization

    public init(
        astroLineProvider: AstroLineProvider = StubAstroLineProvider(),
        compatibilityService: CompatibilityService = CompatibilityService(),
        cityProvider: DuoCityProvider? = nil
    ) {
        self.astroLineProvider = astroLineProvider
        self.compatibilityService = compatibilityService
        self.cityProvider = cityProvider
        migrateFromUserDefaults()
        loadPersistedPartner()
    }

    /// Load cities for scoring (called from Integration layer)
    public func loadCities() async {
        guard let provider = cityProvider else { return }
        do {
            cities = try await provider.loadCities()
        } catch {
            errorMessage = "Failed to load city data: \(error.localizedDescription)"
        }
    }

    /// Configure with pre-loaded cities
    public func configureCities(_ loadedCities: [DuoCity]) {
        cities = loadedCities
    }

    // MARK: - Actions

    /// Enable duo mode - auto-calculates compatibility if ready
    public func enable() {
        isEnabled = true
        autoCalculateIfReady()
    }

    /// Disable duo mode (keeps partner data for quick re-enable)
    public func disable() {
        isEnabled = false
    }

    /// Toggle duo mode
    public func toggle() {
        isEnabled.toggle()
        if isEnabled {
            autoCalculateIfReady()
        }
    }

    /// Auto-calculate compatibility if all conditions are met
    private func autoCalculateIfReady() {
        guard isEnabled, partnerChart != nil, !userLines.isEmpty else { return }

        // If we have partner lines, calculate immediately
        // Otherwise, partner lines will trigger calculation when ready
        if !partnerLines.isEmpty, analysis == nil {
            calculationTask?.cancel()
            calculationTask = Task { await calculateCompatibility() }
        }
    }

    /// Set partner chart data - auto-calculates compatibility when ready
    public func setPartnerChart(_ chart: PartnerChartData?) {
        calculationTask?.cancel()
        partnerChart = chart
        analysis = nil
        partnerLines = []

        if let chart = chart {
            persistPartner(chart)
            // Calculate partner lines, then auto-calculate compatibility
            calculationTask = Task {
                await calculatePartnerLines(chart)
                // Auto-calculate if duo mode is enabled and we have user lines
                if isEnabled, !userLines.isEmpty, !partnerLines.isEmpty {
                    await calculateCompatibility()
                }
            }
        } else {
            clearPersistedPartner()
        }
    }

    /// Update compatibility mode
    public func setMode(_ newMode: CompatibilityMode) {
        calculationTask?.cancel()
        mode = newMode
        analysis = nil
        // Recalculate if we have both user and partner data
        if isEnabled, partnerChart != nil, !userLines.isEmpty {
            calculationTask = Task { await calculateCompatibility() }
        }
    }

    /// Open partner selection sheet
    public func openPartnerSheet() {
        showPartnerSheet = true
    }

    /// Close partner selection sheet
    public func closePartnerSheet() {
        showPartnerSheet = false
    }

    /// Clear current analysis
    public func clearAnalysis() {
        analysis = nil
    }

    /// Clear partner and disable duo mode
    public func clearPartner() {
        calculationTask?.cancel()
        partnerChart = nil
        partnerLines = []
        analysis = nil
        isEnabled = false
        clearPersistedPartner()
    }

    /// Reset all duo mode state
    public func reset() {
        calculationTask?.cancel()
        isEnabled = false
        partnerChart = nil
        mode = .honeymoon
        analysis = nil
        isCalculating = false
        showPartnerSheet = false
        errorMessage = nil
        linesStyle = .default
        partnerLines = []
        clearPersistedPartner()
    }

    // MARK: - Calculations

    /// Calculate partner's astro lines
    public func calculatePartnerLines(_ partner: PartnerChartData) async {
        do {
            let bundle = try await astroLineProvider.calculateAstroLines(
                birthDate: partner.birthDate,
                birthTime: partner.birthTime,
                birthLocation: partner.birthLocation
            )
            partnerLines = bundle.planetaryLines
        } catch {
            errorMessage = "Failed to calculate partner lines: \(error.localizedDescription)"
        }
    }

    /// Calculate compatibility between user and partner
    public func calculateCompatibility() async {
        guard !userLines.isEmpty, !partnerLines.isEmpty else {
            errorMessage = "Both user and partner lines are required"
            return
        }

        isCalculating = true
        errorMessage = nil

        // Load cities if not already loaded
        if cities.isEmpty {
            await loadCities()
        }

        do {
            let result = try await compatibilityService.findCompatibleLocations(
                person1Lines: userLines,
                person2Lines: partnerLines,
                mode: mode,
                cities: cities
            )

            var updatedResult = result
            updatedResult.person1Name = userName
            updatedResult.person2Name = partnerChart?.name

            analysis = updatedResult
        } catch {
            errorMessage = "Compatibility calculation failed: \(error.localizedDescription)"
        }

        isCalculating = false
    }

    /// Update user lines and recalculate if in duo mode
    public func updateUserLines(_ lines: [AstroLine]) async {
        userLines = lines
        if isEnabled, partnerChart != nil, !partnerLines.isEmpty {
            await calculateCompatibility()
        }
    }

    // MARK: - Computed Properties

    /// Whether the user has a chart selected (birth data entered)
    public var hasUserChart: Bool {
        !userLines.isEmpty
    }

    /// Whether there's a partner set
    public var hasPartner: Bool {
        partnerChart != nil
    }

    /// Partner's display name
    public var partnerName: String {
        partnerChart?.name ?? "Partner"
    }

    /// Top compatible locations (up to limit)
    public func topLocations(limit: Int = 10) -> [CompatibleLocation] {
        Array(analysis?.topLocations.prefix(limit) ?? [])
    }

    /// Best overall location
    public var bestLocation: CompatibleLocation? {
        analysis?.topLocations.first
    }

    /// Whether duo mode is ready to show results
    public var isReady: Bool {
        isEnabled && analysis != nil && !isCalculating
    }

    /// Current state summary
    public var state: DuoModeState {
        if !isEnabled {
            return .disabled
        }
        if isCalculating {
            return .calculating
        }
        if let errorMessage = errorMessage {
            return .error(message: errorMessage)
        }
        if let analysis = analysis {
            return .ready(analysis: analysis)
        }
        if let partner = partnerChart {
            return .enabled(partner: partner)
        }
        return .disabled
    }

    // MARK: - Persistence

    private func persistPartner(_ partner: PartnerChartData) {
        try? store.save(partner, key: Self.partnerStorageKey)
    }

    private func loadPersistedPartner() {
        guard let partner = store.load(PartnerChartData.self, key: Self.partnerStorageKey) else { return }
        partnerChart = partner
    }

    private func clearPersistedPartner() {
        store.delete(key: Self.partnerStorageKey)
    }

    // MARK: - Migration

    private func migrateFromUserDefaults() {
        let defaults = UserDefaults.standard
        let sentinel = "com.cartostar.storage.partner.migrated"
        guard !defaults.bool(forKey: sentinel) else { return }

        if let data = defaults.data(forKey: Self.partnerStorageKey),
           let partner = try? JSONDecoder().decode(PartnerChartData.self, from: data) {
            try? store.save(partner, key: Self.partnerStorageKey)
            defaults.removeObject(forKey: Self.partnerStorageKey)
        }

        defaults.set(true, forKey: sentinel)
    }
}

// MARK: - Preview Helper

public extension DuoViewModel {
    /// Preview instance with sample data
    static var preview: DuoViewModel {
        let vm = DuoViewModel()
        vm.isEnabled = true
        vm.partnerChart = PartnerChartData(
            name: "Alex",
            birthDate: Date().addingTimeInterval(-86400 * 365 * 30),
            birthTime: Date(),
            birthLocation: GlobeCoordinate(latitude: 34.0522, longitude: -118.2437),
            cityName: "Los Angeles, CA",
            isSaved: true
        )
        vm.mode = .honeymoon
        return vm
    }
}
