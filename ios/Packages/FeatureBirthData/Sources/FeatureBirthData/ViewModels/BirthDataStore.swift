import Foundation
import Observation
import CoreLocation
import OSLog
import Core

// MARK: - Birth Data Store

/// Observable store for managing birth data across the app
@MainActor
@Observable
public final class BirthDataStore {

    // MARK: - Published Properties

    /// Currently active birth data (the main chart being viewed/edited)
    public var currentBirthData: BirthData?

    /// All saved birth charts
    public private(set) var savedCharts: [BirthData] = []

    /// Default chart ID (used for the primary user chart)
    public var defaultChartId: UUID?

    /// Loading state
    public var isLoading: Bool = false

    /// Error message for display
    public var errorMessage: String?

    // MARK: - Private Properties

    private let userDefaultsKey = "com.cartostar.birthdata.saved"
    private let defaultChartKey = "com.cartostar.birthdata.default"
    private let recentLocationsKey = "com.cartostar.locations.recent"
    private let store = ProtectedFileStore()

    // MARK: - Computed Properties

    /// The default chart if one is set
    public var defaultChart: BirthData? {
        guard let defaultId = defaultChartId else { return nil }
        return savedCharts.first { $0.id == defaultId }
    }

    /// Recent locations for quick selection
    public private(set) var recentLocations: [RecentLocation] = []

    // MARK: - Initialization

    public init() {
        migrateFromUserDefaults()
        loadSavedCharts()
        loadRecentLocations()
    }

    // MARK: - Chart Management

    /// Saves a new birth chart
    public func saveChart(_ birthData: BirthData) {
        var data = birthData
        data.updatedAt = Date()

        if let index = savedCharts.firstIndex(where: { $0.id == data.id }) {
            savedCharts[index] = data
        } else {
            savedCharts.insert(data, at: 0)
        }

        // Set as current birth data
        currentBirthData = data

        // Set as default if it's the first chart
        if savedCharts.count == 1 {
            defaultChartId = data.id
        }

        persistCharts()
    }

    /// Deletes a birth chart
    public func deleteChart(_ birthData: BirthData) {
        savedCharts.removeAll { $0.id == birthData.id }

        // Clear default if deleted
        if defaultChartId == birthData.id {
            defaultChartId = savedCharts.first?.id
        }

        // Clear current if deleted
        if currentBirthData?.id == birthData.id {
            currentBirthData = nil
        }

        persistCharts()
    }

    /// Deletes a chart at the specified indices
    public func deleteCharts(at offsets: IndexSet) {
        let chartsToDelete = offsets.map { savedCharts[$0] }
        for chart in chartsToDelete {
            deleteChart(chart)
        }
    }

    /// Sets a chart as the default
    public func setDefaultChart(_ birthData: BirthData) {
        guard savedCharts.contains(where: { $0.id == birthData.id }) else { return }
        defaultChartId = birthData.id
        try? store.save(birthData.id.uuidString, key: defaultChartKey)
    }

    /// Loads a chart as the current chart
    public func loadChart(_ birthData: BirthData) {
        currentBirthData = birthData
    }

    /// Creates a new empty chart and sets it as current
    public func createNewChart() {
        currentBirthData = BirthData(
            name: "",
            date: Date(),
            time: Date(),
            isTimeUnknown: false,
            latitude: 0,
            longitude: 0,
            placeName: "",
            timezone: .current
        )
    }

    // MARK: - Location Management

    /// Adds a location to recent locations
    public func addRecentLocation(_ location: LocationSearchResult) {
        let recent = RecentLocation(from: location)

        // Remove duplicate if exists
        recentLocations.removeAll {
            $0.latitude == location.latitude && $0.longitude == location.longitude
        }

        // Add to front
        recentLocations.insert(recent, at: 0)

        // Limit to 10 recent locations
        if recentLocations.count > 10 {
            recentLocations = Array(recentLocations.prefix(10))
        }

        persistRecentLocations()
    }

    /// Clears all recent locations
    public func clearRecentLocations() {
        recentLocations = []
        persistRecentLocations()
    }

    // MARK: - Persistence

    private func loadSavedCharts() {
        guard let charts = store.load([BirthData].self, key: userDefaultsKey) else { return }
        savedCharts = charts

        // Load default chart ID
        if let defaultIdString = store.load(String.self, key: defaultChartKey),
           let defaultId = UUID(uuidString: defaultIdString) {
            defaultChartId = defaultId
        } else {
            defaultChartId = savedCharts.first?.id
        }
    }

    private func persistCharts() {
        do {
            try store.save(savedCharts, key: userDefaultsKey)

            if let defaultId = defaultChartId {
                try store.save(defaultId.uuidString, key: defaultChartKey)
            }
        } catch {
            errorMessage = "Failed to save charts"
        }
    }

    private func loadRecentLocations() {
        guard let locations = store.load([RecentLocation].self, key: recentLocationsKey) else { return }
        recentLocations = locations
    }

    private func persistRecentLocations() {
        do {
            try store.save(recentLocations, key: recentLocationsKey)
        } catch {
            Logger(subsystem: Bundle.main.bundleIdentifier ?? "CartoStar", category: "storage")
                .info("Failed to persist recent locations: \(error.localizedDescription)")
        }
    }

    // MARK: - Migration

    private func migrateFromUserDefaults() {
        let defaults = UserDefaults.standard
        let sentinel = "com.cartostar.storage.birthdata.migrated"
        guard !defaults.bool(forKey: sentinel) else { return }

        // Migrate saved charts
        if let data = defaults.data(forKey: userDefaultsKey),
           let items = try? JSONDecoder().decode([BirthData].self, from: data) {
            try? store.save(items, key: userDefaultsKey)
            defaults.removeObject(forKey: userDefaultsKey)
        }

        // Migrate default chart ID
        if let defaultIdString = defaults.string(forKey: defaultChartKey) {
            try? store.save(defaultIdString, key: defaultChartKey)
            defaults.removeObject(forKey: defaultChartKey)
        }

        // Migrate recent locations
        if let data = defaults.data(forKey: recentLocationsKey),
           let locations = try? JSONDecoder().decode([RecentLocation].self, from: data) {
            try? store.save(locations, key: recentLocationsKey)
            defaults.removeObject(forKey: recentLocationsKey)
        }

        defaults.set(true, forKey: sentinel)
    }
}

// MARK: - Singleton Access

public extension BirthDataStore {

    /// Shared instance for app-wide access
    static let shared = BirthDataStore()
}
