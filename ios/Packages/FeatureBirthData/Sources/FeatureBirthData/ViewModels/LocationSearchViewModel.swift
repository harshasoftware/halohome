import Foundation
import MapKit
import Observation

// MARK: - Location Search View Model

/// ViewModel for managing location search with MapKit's MKLocalSearchCompleter
@Observable
@MainActor
public final class LocationSearchViewModel: NSObject {

    // MARK: - Published Properties

    /// Current search query
    public var searchQuery: String = "" {
        didSet {
            updateSearch()
        }
    }

    /// Search results from MapKit
    public private(set) var searchResults: [LocationSearchResult] = []

    /// Whether a search is in progress
    public private(set) var isSearching: Bool = false

    /// Error message if search fails
    public var errorMessage: String?

    // MARK: - Private Properties

    private let completer = MKLocalSearchCompleter()
    private var pendingCompletions: [MKLocalSearchCompletion] = []

    // MARK: - Initialization

    public override init() {
        super.init()
        setupCompleter()
    }

    private func setupCompleter() {
        completer.delegate = self
        completer.resultTypes = [.address, .pointOfInterest]
    }

    // MARK: - Search

    private func updateSearch() {
        let trimmed = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)

        if trimmed.isEmpty {
            searchResults = []
            isSearching = false
            return
        }

        isSearching = true
        completer.queryFragment = trimmed
    }

    /// Clears the search state
    public func clearSearch() {
        searchQuery = ""
        searchResults = []
        isSearching = false
        errorMessage = nil
    }

    /// Resolves a search completion to get full location details
    public func selectCompletion(_ completion: MKLocalSearchCompletion) async -> LocationSearchResult? {
        let request = MKLocalSearch.Request(completion: completion)
        let search = MKLocalSearch(request: request)

        do {
            let response = try await search.start()

            guard let mapItem = response.mapItems.first else {
                errorMessage = "Could not find location details"
                return nil
            }

            let coordinate = mapItem.placemark.coordinate
            let timezone = await resolveTimezone(for: coordinate)

            return LocationSearchResult(
                title: completion.title,
                subtitle: completion.subtitle,
                latitude: coordinate.latitude,
                longitude: coordinate.longitude,
                timezone: timezone
            )
        } catch {
            errorMessage = "Failed to get location details"
            return nil
        }
    }

    /// Resolves timezone for a coordinate
    private func resolveTimezone(for coordinate: CLLocationCoordinate2D) async -> TimeZone {
        let location = CLLocation(latitude: coordinate.latitude, longitude: coordinate.longitude)
        let geocoder = CLGeocoder()

        do {
            let placemarks = try await geocoder.reverseGeocodeLocation(location)
            if let timezone = placemarks.first?.timeZone {
                return timezone
            }
        } catch {
            // Fall through to default
        }

        return .current
    }
}

// MARK: - MKLocalSearchCompleterDelegate

extension LocationSearchViewModel: MKLocalSearchCompleterDelegate {

    nonisolated public func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        Task { @MainActor in
            self.pendingCompletions = completer.results
            self.searchResults = completer.results.map { completion in
                // Create placeholder results - full details fetched on selection
                LocationSearchResult(
                    title: completion.title,
                    subtitle: completion.subtitle,
                    latitude: 0,
                    longitude: 0,
                    timezone: .current
                )
            }
            self.isSearching = false
        }
    }

    nonisolated public func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        Task { @MainActor in
            // Only show error for non-cancelled searches
            if (error as NSError).code != MKError.placemarkNotFound.rawValue {
                self.errorMessage = "Search failed. Please try again."
            }
            self.isSearching = false
        }
    }
}

// MARK: - Completion Access

extension LocationSearchViewModel {

    /// Gets the MKLocalSearchCompletion for a result index
    public func completion(at index: Int) -> MKLocalSearchCompletion? {
        guard index < pendingCompletions.count else { return nil }
        return pendingCompletions[index]
    }
}
