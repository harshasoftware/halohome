import Foundation
import MapKit
import OSLog

// MARK: - City Search Result

/// A city search result from MapKit autocomplete
public struct CitySearchResult: Identifiable, Hashable, Sendable {
    public let id: String
    public let name: String
    public let subtitle: String  // Country or region
    public let coordinate: GlobeCoordinate

    public init(name: String, subtitle: String, coordinate: GlobeCoordinate) {
        self.id = "\(name)-\(coordinate.latitude)-\(coordinate.longitude)"
        self.name = name
        self.subtitle = subtitle
        self.coordinate = coordinate
    }
}

// MARK: - Search Completion (pre-resolution)

/// A search completion before coordinate resolution
public struct SearchCompletion: Identifiable, Hashable {
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

    public static func == (lhs: SearchCompletion, rhs: SearchCompletion) -> Bool {
        lhs.id == rhs.id
    }

    public func hash(into hasher: inout Hasher) {
        hasher.combine(id)
    }
}

// MARK: - City Search Service

/// Provides city search using MapKit's MKLocalSearchCompleter.
/// Uses iOS native geocoding — no third-party API keys needed.
@MainActor
@available(iOS 17.0, *)
@Observable
public final class CitySearchService: NSObject {

    // MARK: - Published State

    /// Resolved results (with coordinates) - for backward compatibility
    public private(set) var results: [CitySearchResult] = []

    /// Raw completions (shown immediately, resolved on selection)
    public private(set) var completions: [SearchCompletion] = []

    /// Whether search is in progress
    public private(set) var isSearching = false

    /// Error message if search failed
    public private(set) var searchError: String?

    // MARK: - Private

    private let completer = MKLocalSearchCompleter()
    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "CartoStar", category: "search")

    // MARK: - Init

    public override init() {
        super.init()
        completer.delegate = self
        // Use query type for broader results (cities, addresses, POIs)
        completer.resultTypes = [.address, .query]
    }

    // MARK: - Public API

    /// Update the search query. Results update via delegate callbacks.
    public func search(query: String) {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        searchError = nil

        guard trimmed.count >= 2 else {
            results = []
            completions = []
            isSearching = false
            return
        }

        isSearching = true
        completer.queryFragment = trimmed
    }

    /// Resolve a completion to get coordinates (call when user selects)
    public func resolve(_ completion: SearchCompletion) async -> CitySearchResult? {
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

            return CitySearchResult(
                name: completion.title,
                subtitle: completion.subtitle,
                coordinate: GlobeCoordinate(
                    latitude: location.coordinate.latitude,
                    longitude: location.coordinate.longitude
                )
            )
        } catch {
            logger.error("Failed to resolve '\(completion.title)': \(error.localizedDescription)")
            return nil
        }
    }

    /// Clear all results
    public func clear() {
        results = []
        completions = []
        isSearching = false
        searchError = nil
    }
}

// MARK: - MKLocalSearchCompleterDelegate

@available(iOS 17.0, *)
extension CitySearchService: MKLocalSearchCompleterDelegate {

    public nonisolated func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        let rawCompletions = completer.results
        Task { @MainActor in
            // Show completions immediately (no resolution delay)
            self.completions = rawCompletions.prefix(10).map { SearchCompletion(completion: $0) }
            self.isSearching = false

            // Debug log
            self.logger.debug("Got \(rawCompletions.count) completions")
        }
    }

    public nonisolated func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        Task { @MainActor in
            self.isSearching = false
            self.searchError = error.localizedDescription
            self.logger.error("Search failed: \(error.localizedDescription)")
        }
    }
}
