import Foundation
import SwiftUI
import os.log

// MARK: - Globe Interaction Handler

/// Handles user interactions with the globe
///
/// Features:
/// - Tap to select location
/// - Long press for context menu
/// - Line tap to show info card
/// - Marker selection
/// - Gesture coordination with map view
@MainActor
@Observable
public final class GlobeInteractionHandler {
    // MARK: - State

    /// Currently selected location (from tap or long press)
    public private(set) var selectedLocation: SelectedLocation?

    /// Currently hovered/tapped astro line
    public private(set) var selectedLine: AstroLineCardData?

    /// Currently tapped aspect line
    public private(set) var selectedAspectLine: AspectLineCardData?

    /// Currently tapped paran point
    public private(set) var selectedParanPoint: ParanPointCardData?

    /// Currently tapped zenith point
    public private(set) var selectedZenithPoint: ZenithPointCardData?

    /// Whether a context menu should be shown
    public private(set) var showContextMenu: Bool = false

    /// Context menu position in screen coordinates
    public private(set) var contextMenuPosition: CGPoint = .zero

    /// Selected marker (if any)
    public private(set) var selectedMarker: GlobeMarker?

    // MARK: - Dependencies

    private let geocodingProvider: GeocodingProvider
    private let logger = Logger(subsystem: "com.cartostar.globe", category: "InteractionHandler")

    /// Callback for interaction events
    public var onEvent: ((GlobeInteractionEvent) -> Void)?

    // MARK: - Private State

    private var pendingReverseGeocode: Task<Void, Never>?
    private var lastTapTime: Date = .distantPast
    private let doubleTapInterval: TimeInterval = 0.3

    // MARK: - Initialization

    public init(
        geocodingProvider: GeocodingProvider = StubGeocodingProvider()
    ) {
        self.geocodingProvider = geocodingProvider
    }

    // MARK: - Public Methods

    /// Handle a tap on the globe at the given coordinate
    public func handleTap(
        at coordinate: GlobeCoordinate,
        screenPoint: CGPoint,
        nearbyLine: AstroLine? = nil
    ) {
        let now = Date()
        let isDoubleTap = now.timeIntervalSince(lastTapTime) < doubleTapInterval
        lastTapTime = now

        if isDoubleTap {
            // Double tap handled by MKMapView natively
            return
        }

        // Check if tapped on a line
        if let line = nearbyLine {
            handleLineTap(line: line, nearCoordinate: coordinate)
            return
        }

        // Otherwise, select the location
        selectLocation(at: coordinate)
        onEvent?(.locationTapped(coordinate))
    }

    /// Handle a long press on the globe
    public func handleLongPress(
        at coordinate: GlobeCoordinate,
        screenPoint: CGPoint
    ) {
        logger.debug("Long press at \(coordinate.latitude), \(coordinate.longitude)")

        // Show context menu
        contextMenuPosition = screenPoint
        showContextMenu = true

        // Also select the location
        selectLocation(at: coordinate)
        onEvent?(.locationLongPressed(coordinate))
    }

    /// Handle tapping on a marker
    public func handleMarkerTap(_ marker: GlobeMarker) {
        logger.debug("Marker tapped: \(marker.title)")

        selectedMarker = marker
        selectedLine = nil  // Clear line selection

        // Also update selected location
        selectedLocation = SelectedLocation(
            coordinate: marker.coordinate,
            name: marker.title,
            country: marker.subtitle
        )

        onEvent?(.markerTapped(marker))
    }

    /// Handle tapping on an astro line
    public func handleLineTap(line: AstroLine, nearCoordinate: GlobeCoordinate) {
        logger.debug("Line tapped: \(line.shortName)")

        selectedLine = AstroLineCardData(
            line: line,
            nearestLocation: nearCoordinate,
            distanceFromLine: calculateDistanceToLine(line, from: nearCoordinate)
        )
        selectedAspectLine = nil  // Clear aspect line selection
        selectedMarker = nil  // Clear marker selection

        // Highlight the line
        // Line highlighting handled by AppleGlobeView overlay rendering

        onEvent?(.lineTapped(line, nearCoordinate: nearCoordinate))
    }

    /// Handle tapping on an aspect line
    public func handleAspectLineTap(aspectLine: GlobeAspectLine, nearCoordinate: GlobeCoordinate) {
        logger.debug("Aspect line tapped: \(aspectLine.planet.rawValue) \(aspectLine.aspectType) \(aspectLine.angle)")

        selectedAspectLine = AspectLineCardData(
            aspectLine: aspectLine,
            nearestLocation: nearCoordinate,
            distanceFromLine: calculateDistanceToAspectLine(aspectLine, from: nearCoordinate)
        )
        selectedLine = nil  // Clear regular line selection
        selectedMarker = nil  // Clear marker selection

        onEvent?(.aspectLineTapped(aspectLine, nearCoordinate: nearCoordinate))
    }

    /// Handle tapping on a paran point
    public func handleParanPointTap(paranLine: GlobeParanLine) {
        logger.debug("Paran point tapped: \(paranLine.planet1) \(paranLine.angle1) × \(paranLine.planet2) \(paranLine.angle2)")

        selectedParanPoint = ParanPointCardData(paranLine: paranLine)
        selectedLine = nil
        selectedAspectLine = nil
        selectedZenithPoint = nil
        selectedMarker = nil

        onEvent?(.paranPointTapped(paranLine))
    }

    /// Handle tapping on a zenith point
    public func handleZenithPointTap(zenithPoint: GlobeZenithPoint) {
        logger.debug("Zenith point tapped: \(zenithPoint.planet.rawValue)")

        selectedZenithPoint = ZenithPointCardData(zenithPoint: zenithPoint)
        selectedLine = nil
        selectedAspectLine = nil
        selectedParanPoint = nil
        selectedMarker = nil

        onEvent?(.zenithPointTapped(zenithPoint))
    }

    /// Dismiss the context menu
    public func dismissContextMenu() {
        showContextMenu = false
    }

    /// Clear all selections
    public func clearSelection() {
        selectedLocation = nil
        selectedLine = nil
        selectedAspectLine = nil
        selectedParanPoint = nil
        selectedZenithPoint = nil
        selectedMarker = nil
        showContextMenu = false
        // Line highlighting handled by AppleGlobeView overlay rendering
    }

    /// Clear only the line selection
    public func clearLineSelection() {
        selectedLine = nil
        // Line highlighting handled by AppleGlobeView overlay rendering
    }

    // MARK: - Private Methods

    private func selectLocation(at coordinate: GlobeCoordinate) {
        // Cancel any pending reverse geocode
        pendingReverseGeocode?.cancel()

        // Create initial location with just coordinates
        selectedLocation = SelectedLocation(coordinate: coordinate)
        selectedMarker = nil

        // Start reverse geocoding
        pendingReverseGeocode = Task {
            do {
                let location = try await geocodingProvider.reverseGeocode(coordinate: coordinate)

                // Update if not cancelled
                if !Task.isCancelled {
                    self.selectedLocation = location
                }
            } catch {
                logger.error("Reverse geocoding failed: \(error.localizedDescription)")
                // Keep the coordinate-only location
            }
        }
    }

    private func calculateDistanceToLine(_ line: AstroLine, from coordinate: GlobeCoordinate) -> Double? {
        guard line.coordinates.count >= 2 else { return nil }

        var minDistance = Double.greatestFiniteMagnitude

        // Find minimum distance to any segment of the line
        for i in 0..<(line.coordinates.count - 1) {
            let segmentStart = line.coordinates[i]
            let segmentEnd = line.coordinates[i + 1]

            let distance = distanceToLineSegment(
                point: coordinate,
                segmentStart: segmentStart,
                segmentEnd: segmentEnd
            )

            minDistance = min(minDistance, distance)
        }

        return minDistance == Double.greatestFiniteMagnitude ? nil : minDistance
    }

    private func calculateDistanceToAspectLine(_ line: GlobeAspectLine, from coordinate: GlobeCoordinate) -> Double? {
        guard line.coordinates.count >= 2 else { return nil }

        var minDistance = Double.greatestFiniteMagnitude

        // Find minimum distance to any segment of the line
        for i in 0..<(line.coordinates.count - 1) {
            let segmentStart = line.coordinates[i]
            let segmentEnd = line.coordinates[i + 1]

            let distance = distanceToLineSegment(
                point: coordinate,
                segmentStart: segmentStart,
                segmentEnd: segmentEnd
            )

            minDistance = min(minDistance, distance)
        }

        return minDistance == Double.greatestFiniteMagnitude ? nil : minDistance
    }

    private func distanceToLineSegment(
        point: GlobeCoordinate,
        segmentStart: GlobeCoordinate,
        segmentEnd: GlobeCoordinate
    ) -> Double {
        // Use haversine formula for geographic distance
        // Simplified: find closest point on segment, then calculate distance

        // Vector from start to end
        let dx = segmentEnd.longitude - segmentStart.longitude
        let dy = segmentEnd.latitude - segmentStart.latitude

        // Parameter t for closest point on line
        let lengthSquared = dx * dx + dy * dy
        var t = 0.0

        if lengthSquared > 0 {
            t = ((point.longitude - segmentStart.longitude) * dx +
                 (point.latitude - segmentStart.latitude) * dy) / lengthSquared
            t = max(0, min(1, t))
        }

        // Closest point on segment
        let closestLon = segmentStart.longitude + t * dx
        let closestLat = segmentStart.latitude + t * dy

        // Calculate haversine distance
        return haversineDistance(
            lat1: point.latitude,
            lon1: point.longitude,
            lat2: closestLat,
            lon2: closestLon
        )
    }

    private func haversineDistance(
        lat1: Double,
        lon1: Double,
        lat2: Double,
        lon2: Double
    ) -> Double {
        let R = 6371.0  // Earth's radius in km

        let dLat = (lat2 - lat1) * .pi / 180
        let dLon = (lon2 - lon1) * .pi / 180

        let a = sin(dLat / 2) * sin(dLat / 2) +
                cos(lat1 * .pi / 180) * cos(lat2 * .pi / 180) *
                sin(dLon / 2) * sin(dLon / 2)

        let c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return R * c
    }
}

// MARK: - Context Menu Actions

/// Actions available in the globe context menu
public enum GlobeContextMenuAction: String, CaseIterable {
    case getInfo = "Get Location Info"
    case addToFavorites = "Add to Favorites"
    case calculateLines = "Calculate Lines Here"
    case setAsBirthPlace = "Set as Birth Place"
    case share = "Share Location"

    public var systemImage: String {
        switch self {
        case .getInfo: return "info.circle"
        case .addToFavorites: return "heart"
        case .calculateLines: return "line.3.horizontal"
        case .setAsBirthPlace: return "mappin.and.ellipse"
        case .share: return "square.and.arrow.up"
        }
    }
}

// MARK: - Gesture State

/// Tracks the state of multi-touch gestures
public struct GlobeGestureState: Equatable {
    public var isPanning: Bool = false
    public var isZooming: Bool = false
    public var isRotating: Bool = false

    public var isInteracting: Bool {
        isPanning || isZooming || isRotating
    }

    public static let idle = GlobeGestureState()
}
