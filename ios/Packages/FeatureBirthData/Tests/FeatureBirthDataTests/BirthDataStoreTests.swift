import Testing
import Foundation
@testable import FeatureBirthData

@Suite("BirthDataStore Tests")
struct BirthDataStoreTests {

    // MARK: - Setup

    private func createTestStore() -> BirthDataStore {
        // Create a fresh store (note: in production you'd want to mock UserDefaults)
        let store = BirthDataStore()
        // Clear any existing data for clean test state
        for chart in store.savedCharts {
            store.deleteChart(chart)
        }
        return store
    }

    // MARK: - Chart Management Tests

    @Test("Store saves new chart")
    func testSaveNewChart() {
        let store = createTestStore()
        let chart = BirthData.sample

        store.saveChart(chart)

        #expect(store.savedCharts.count == 1)
        #expect(store.savedCharts.first?.id == chart.id)
    }

    @Test("Store updates existing chart")
    func testUpdateChart() {
        let store = createTestStore()
        var chart = BirthData.sample
        store.saveChart(chart)

        chart.name = "Updated Name"
        store.saveChart(chart)

        #expect(store.savedCharts.count == 1)
        #expect(store.savedCharts.first?.name == "Updated Name")
    }

    @Test("Store deletes chart")
    func testDeleteChart() {
        let store = createTestStore()
        let chart = BirthData.sample
        store.saveChart(chart)

        store.deleteChart(chart)

        #expect(store.savedCharts.isEmpty)
    }

    @Test("First chart becomes default")
    func testFirstChartBecomesDefault() {
        let store = createTestStore()
        let chart = BirthData.sample

        store.saveChart(chart)

        #expect(store.defaultChartId == chart.id)
        #expect(store.defaultChart?.id == chart.id)
    }

    @Test("Setting default chart works")
    func testSetDefaultChart() {
        let store = createTestStore()
        let chart1 = BirthData.sample
        let chart2 = BirthData.sampleUnknownTime

        store.saveChart(chart1)
        store.saveChart(chart2)
        store.setDefaultChart(chart2)

        #expect(store.defaultChartId == chart2.id)
    }

    @Test("Deleting default chart updates default")
    func testDeleteDefaultChartUpdatesDefault() {
        let store = createTestStore()
        let chart1 = BirthData.sample
        let chart2 = BirthData.sampleUnknownTime

        store.saveChart(chart1)
        store.saveChart(chart2)
        store.deleteChart(chart1)

        #expect(store.defaultChartId == chart2.id)
    }

    @Test("Load chart sets current")
    func testLoadChart() {
        let store = createTestStore()
        let chart = BirthData.sample
        store.saveChart(chart)

        store.loadChart(chart)

        #expect(store.currentBirthData?.id == chart.id)
    }

    @Test("Create new chart initializes empty chart")
    func testCreateNewChart() {
        let store = createTestStore()

        store.createNewChart()

        #expect(store.currentBirthData != nil)
        #expect(store.currentBirthData?.name == "")
    }

    // MARK: - Recent Locations Tests

    @Test("Adding recent location works")
    func testAddRecentLocation() {
        let store = createTestStore()
        let location = LocationSearchResult(
            title: "New York",
            subtitle: "NY, USA",
            latitude: 40.7128,
            longitude: -74.0060,
            timezone: TimeZone(identifier: "America/New_York")!
        )

        store.addRecentLocation(location)

        #expect(store.recentLocations.count == 1)
        #expect(store.recentLocations.first?.title == "New York")
    }

    @Test("Recent locations limited to 10")
    func testRecentLocationsLimit() {
        let store = createTestStore()

        // Add 12 locations
        for i in 0..<12 {
            let location = LocationSearchResult(
                title: "City \(i)",
                subtitle: "Country",
                latitude: Double(i),
                longitude: Double(i),
                timezone: .current
            )
            store.addRecentLocation(location)
        }

        #expect(store.recentLocations.count == 10)
        // Most recent should be first
        #expect(store.recentLocations.first?.title == "City 11")
    }

    @Test("Duplicate locations update position")
    func testDuplicateLocationUpdatesPosition() {
        let store = createTestStore()

        let location1 = LocationSearchResult(
            title: "New York",
            subtitle: "NY, USA",
            latitude: 40.7128,
            longitude: -74.0060,
            timezone: .current
        )

        let location2 = LocationSearchResult(
            title: "Los Angeles",
            subtitle: "CA, USA",
            latitude: 34.0522,
            longitude: -118.2437,
            timezone: .current
        )

        store.addRecentLocation(location1)
        store.addRecentLocation(location2)

        // Add location1 again
        store.addRecentLocation(location1)

        #expect(store.recentLocations.count == 2)
        #expect(store.recentLocations.first?.title == "New York")
    }

    @Test("Clear recent locations works")
    func testClearRecentLocations() {
        let store = createTestStore()

        store.addRecentLocation(LocationSearchResult(
            title: "Test",
            subtitle: "",
            latitude: 0,
            longitude: 0,
            timezone: .current
        ))

        store.clearRecentLocations()

        #expect(store.recentLocations.isEmpty)
    }
}
