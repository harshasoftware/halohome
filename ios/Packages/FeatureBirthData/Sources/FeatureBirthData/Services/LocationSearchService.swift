import Foundation
import MapKit
import OSLog

// MARK: - Location Search Completion

/// A search completion before coordinate/timezone resolution
public struct LocationSearchCompletion: Identifiable, Hashable {
    public let id: String
    public let title: String
    public let subtitle: String
    let completion: MKLocalSearchCompletion

    public init(completion: MKLocalSearchCompletion) {
        self.id = "\(completion.title)-\(completion.subtitle)"
        self.title = completion.title
        self.subtitle = completion.subtitle
        self.completion = completion
    }

    public static func == (lhs: LocationSearchCompletion, rhs: LocationSearchCompletion) -> Bool {
        lhs.id == rhs.id
    }

    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

// MARK: - Location Search Service

/// Provides location search using MapKit's MKLocalSearchCompleter.
/// Resolves coordinates and timezone on selection.
@MainActor
@available(iOS 17.0, *)
@Observable
public final class LocationSearchService: NSObject {

    // MARK: - Published State

    /// Raw completions (shown immediately, resolved on selection)
    public private(set) var completions: [LocationSearchCompletion] = []

    /// Whether search is in progress
    public private(set) var isSearching = false

    /// Error message if search failed
    public private(set) var searchError: String?

    // MARK: - Private

    private let completer = MKLocalSearchCompleter()
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "CartoStar", category: "location-search")

    // MARK: - Init

    public override init() {
        super.init()
        completer.delegate = self
        completer.resultTypes = [.address, .pointOfInterest]
    }

    // MARK: - Public API

    /// Update the search query. Results update via delegate callbacks.
    public func search(query: String) {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        searchError = nil

        guard trimmed.count >= 2 else {
            completions = []
            isSearching = false
            return
        }

        isSearching = true
        completer.queryFragment = trimmed
    }

    /// Resolve a completion to get coordinates and timezone (call when user selects)
    public func resolve(_ completion: LocationSearchCompletion) async -> LocationSearchResult? {
        let request = MKLocalSearch.Request(completion: completion.completion)
        request.resultTypes = [.address, .pointOfInterest]

        do {
            let search = MKLocalSearch(request: request)
            let response = try await search.start()

            guard let item = response.mapItems.first,
                  let location = item.placemark.location else {
                logger.warning("No location found for: \(completion.title)")
                return nil
            }

            let timezone = await resolveTimezone(for: location.coordinate)

            return LocationSearchResult(
                title: completion.title,
                subtitle: completion.subtitle,
                latitude: location.coordinate.latitude,
                longitude: location.coordinate.longitude,
                timezone: timezone
            )
        } catch {
            logger.error("Failed to resolve '\(completion.title)': \(error.localizedDescription)")
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
            logger.debug("Timezone resolution failed, using .current: \(error.localizedDescription)")
        }

        return .current
    }

    /// Clear all results
    public func clear() {
        completions = []
        isSearching = false
        searchError = nil
    }
}

// MARK: - MKLocalSearchCompleterDelegate

@available(iOS 17.0, *)
extension LocationSearchService: MKLocalSearchCompleterDelegate {

    public nonisolated func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        let rawCompletions = completer.results
        Task { @MainActor in
            self.completions = rawCompletions.prefix(10).map { LocationSearchCompletion(completion: $0) }
            self.isSearching = false
            self.logger.debug("Got \(rawCompletions.count) completions")
        }
    }

    public nonisolated func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        Task { @MainActor in
            self.isSearching = false
            // Only show error for non-cancelled searches
            if (error as NSError).code != MKError.placemarkNotFound.rawValue {
                self.searchError = error.localizedDescription
            }
            self.logger.error("Search failed: \(error.localizedDescription)")
        }
    }
}
