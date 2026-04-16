import Foundation
import SwiftUI
import Observation
import os.log

// MARK: - Globe View Model

/// Main view model for the globe view
///
/// Manages:
/// - Camera position and state
/// - Astro line data and visibility
/// - Selected locations
/// - Markers
/// - Integration with AstroCore
@Observable
@MainActor
public final class GlobeViewModel {
    // MARK: - Published State

    /// Current camera state
    public var cameraState: GlobeCameraState = .initial

    /// All astro lines calculated for the current birth chart
    public private(set) var astroLines: [AstroLine] = []

    /// Aspect lines from the current birth chart
    public private(set) var aspectLines: [GlobeAspectLine] = []

    /// Paran lines from the current birth chart
    public private(set) var paranLines: [GlobeParanLine] = []

    /// Zenith points from the current birth chart
    public private(set) var zenithPoints: [GlobeZenithPoint] = []

    /// Nakshatra band data projected onto the globe (computed from GMST + Julian Date)
    public private(set) var nakshatraData: [NakshatraGlobeData] = []

    /// Birth Moon's Janma Nakshatra index (1–27), computed from Moon's tropical longitude + Lahiri ayanamsa.
    /// Used to calculate Tarabala when a nakshatra band is tapped.
    private var janmaNakshatraIndex: Int?

    /// Currently selected nakshatra (for info card)
    public var selectedNakshatra: NakshatraCardData?

    // MARK: - Transit Lines

    /// Whether transit mode is active
    public var isTransitMode: Bool = false

    /// Transit date (scrubber-controlled)
    public var transitDate: Date = {
        var c = Calendar.current.dateComponents([.year, .month, .day], from: Date())
        c.hour = 12
        return Calendar.current.date(from: c) ?? Date()
    }()

    /// Transit planetary lines (calculated for transitDate)
    public private(set) var transitLines: [AstroLine] = []

    /// Transit aspect lines
    public private(set) var transitAspectLines: [GlobeAspectLine] = []

    /// Transit paran lines
    public private(set) var transitParanLines: [GlobeParanLine] = []

    /// Whether transit lines are currently being calculated
    public private(set) var isCalculatingTransit: Bool = false

    /// Transit playback state
    public var isTransitPlaying: Bool = false

    /// Transit filter — which planets/line types/aspects/parans to show
    public var transitFilterPlanets: Set<Planet> = Set(Planet.allCases)
    public var transitFilterLineTypes: Set<AstroLineType> = Set(AstroLineType.allCases)
    public var transitFilterShowAspects: Bool = true
    public var transitFilterShowParans: Bool = true

    /// Whether any transit filter is non-default (for highlight indicator)
    public var hasActiveTransitFilters: Bool {
        transitFilterPlanets.count != Planet.allCases.count ||
        transitFilterLineTypes.count != AstroLineType.allCases.count ||
        !transitFilterShowAspects || !transitFilterShowParans
    }

    /// Filtered transit planetary lines (respecting transit filter)
    public var filteredTransitLines: [AstroLine] {
        transitLines.filter {
            transitFilterPlanets.contains($0.planet) && transitFilterLineTypes.contains($0.lineType)
        }
    }

    /// Filtered transit aspect lines
    public var filteredTransitAspectLines: [GlobeAspectLine] {
        guard transitFilterShowAspects else { return [] }
        return transitAspectLines.filter { transitFilterPlanets.contains($0.planet) }
    }

    /// Reset transit filters to all-on
    public func transitFilterSelectAll() {
        transitFilterPlanets = Set(Planet.allCases)
        transitFilterLineTypes = Set(AstroLineType.allCases)
        transitFilterShowAspects = true
        transitFilterShowParans = true
    }

    /// Clear all transit planet filters
    public func transitFilterClearAll() {
        transitFilterPlanets = []
    }

    /// Which lines are currently visible
    public var lineVisibility: AstroLineVisibility = .all

    /// Whether the line filters sheet is showing
    public var showLineFilters: Bool = false

    /// Markers displayed on the globe
    public private(set) var markers: [GlobeMarker] = []

    /// Currently selected location
    public var selectedLocation: SelectedLocation?

    /// Local space lines (azimuth-based from selected location)
    public private(set) var localSpaceLines: [AstroLine] = []

    /// Center coordinate for local space radius circle
    public private(set) var localSpaceCenter: GlobeCoordinate?

    /// Radius in km for local space boundary circle
    public private(set) var localSpaceRadiusKm: Double = 0

    /// Whether local space mode is active
    public var isLocalSpaceActive: Bool = false

    /// Currently highlighted astro line
    public var selectedLine: AstroLineCardData?

    /// Currently highlighted aspect line
    public var selectedAspectLine: AspectLineCardData?

    /// Currently selected paran point
    public var selectedParanPoint: ParanPointCardData?

    /// Currently selected zenith point
    public var selectedZenithPoint: ZenithPointCardData?

    /// Returns true if any info card is currently active (line, aspect, paran, or zenith)
    public var hasActiveInfoCard: Bool {
        selectedLine != nil ||
        selectedAspectLine != nil ||
        selectedParanPoint != nil ||
        selectedZenithPoint != nil
    }

    /// One-shot flag set by handleNakshatraTap to suppress the locationTapped event
    /// that MapboxGlobeView fires on the same gesture.
    private var suppressNextLocationTap: Bool = false

    /// Loading state
    public private(set) var isLoading: Bool = false

    /// Error state
    public private(set) var error: GlobeError?

    // MARK: - Natal Chart

    /// Whether to show the natal chart widget
    public var showNatalChart: Bool = false

    /// Natal chart data for rendering
    public private(set) var natalChartData: NatalChartData?

    /// Current house system for natal chart
    public var natalHouseSystem: String = "placidus"

    /// Whether to use sidereal zodiac for natal chart
    public var natalUseSidereal: Bool = false

    /// Ayanamsa system for sidereal mode ("lahiri", "fagan_bradley", "raman", "krishnamurti", "yukteswar")
    public var natalAyanamsaSystem: String = "lahiri"

    // MARK: - Birth Chart Data

    /// Birth date for calculations
    public var birthDate: Date?

    /// Birth time for calculations
    public var birthTime: Date?

    /// Birth location for calculations
    public var birthLocation: GlobeCoordinate?

    // MARK: - Dependencies

    private let astroLineProvider: AstroLineProvider
    private let geocodingProvider: GeocodingProvider
    private let natalChartProvider: NatalChartProvider?
    private let logger = Logger(subsystem: "com.cartostar.globe", category: "GlobeViewModel")

    // MARK: - Private State

    private var calculationTask: Task<Void, Never>?

    // MARK: - Initialization

    public init(
        astroLineProvider: AstroLineProvider = StubAstroLineProvider(),
        geocodingProvider: GeocodingProvider = StubGeocodingProvider(),
        natalChartProvider: NatalChartProvider? = nil
    ) {
        self.astroLineProvider = astroLineProvider
        self.geocodingProvider = geocodingProvider
        self.natalChartProvider = natalChartProvider
        self.lineVisibility = AstroLineVisibility.loadSaved()
    }

    // MARK: - Public Methods

    /// Set birth chart data and calculate astro lines
    /// - Parameters:
    ///   - date: Birth date
    ///   - time: Birth time
    ///   - location: Birth location coordinates
    ///   - avatarIdentifier: Unique identifier for avatar (based on name + date + location)
    public func setBirthData(
        date: Date,
        time: Date,
        location: GlobeCoordinate,
        avatarIdentifier: String? = nil
    ) async {
        birthDate = date
        birthTime = time
        birthLocation = location

        // Add birth place marker with avatar identifier
        let birthMarker = GlobeMarker(
            id: "birth-place",
            coordinate: location,
            title: "Birth Place",
            type: .birthPlace,
            avatarIdentifier: avatarIdentifier
        )
        updateMarker(birthMarker)

        // Calculate astro lines
        await calculateAstroLines()
    }

    /// Recalculate natal chart with current settings
    public func recalculateNatalChart() {
        guard let provider = natalChartProvider,
              let date = birthDate,
              let time = birthTime,
              let location = birthLocation else { return }

        let houseSystem = natalHouseSystem
        let useSidereal = natalUseSidereal
        let ayanamsaSystem = natalAyanamsaSystem

        Task {
            do {
                let data = try await provider.calculateNatalChart(
                    birthDate: date,
                    birthTime: time,
                    birthLocation: location,
                    houseSystem: houseSystem,
                    useSidereal: useSidereal,
                    ayanamsaSystem: ayanamsaSystem
                )
                natalChartData = data
                logger.info("Natal chart recalculated (houseSystem: \(houseSystem), sidereal: \(useSidereal), ayanamsa: \(ayanamsaSystem))")
            } catch {
                logger.error("Natal chart recalculation failed: \(error.localizedDescription)")
            }
        }
    }

    /// Set natal chart data (called from integration layer after Rust calculation)
    public func setNatalChartData(_ data: NatalChartData) {
        natalChartData = data
    }

    /// Recalculate astro lines with current birth data
    public func calculateAstroLines() async {
        guard let date = birthDate,
              let time = birthTime,
              let location = birthLocation else {
            logger.warning("Cannot calculate lines - missing birth data")
            return
        }

        // Cancel any existing calculation
        calculationTask?.cancel()

        isLoading = true
        error = nil

        calculationTask = Task {
            do {
                logger.info("Calculating astro lines...")

                let bundle = try await astroLineProvider.calculateAstroLines(
                    birthDate: date,
                    birthTime: time,
                    birthLocation: location
                )

                if !Task.isCancelled {
                    self.astroLines = bundle.planetaryLines
                    self.aspectLines = bundle.aspectLines
                    self.paranLines = bundle.paranLines
                    self.zenithPoints = bundle.zenithPoints

                    // Compute nakshatra bands from GMST + Julian Date
                    if let gmst = bundle.gmst, let jd = bundle.julianDate {
                        let gmstDeg = gmst * (180.0 / .pi)
                        self.nakshatraData = calculateNakshatraGlobe(gmstDeg: gmstDeg, julianDate: jd)
                        // Compute Janma Nakshatra for Tarabala
                        if let moonLon = bundle.moonTropicalLongitude {
                            self.janmaNakshatraIndex = computeJanmaNakshatraIndex(moonTropicalLongitude: moonLon, julianDate: jd)
                        }
                    }

                    logger.info("Calculated \(bundle.planetaryLines.count) planetary, \(bundle.aspectLines.count) aspect, \(bundle.paranLines.count) paran lines, \(bundle.zenithPoints.count) zenith points, \(self.nakshatraData.count) nakshatras")
                }
            } catch {
                if !Task.isCancelled {
                    self.error = .calculationFailed(error)
                    logger.error("Line calculation failed: \(error.localizedDescription)")
                }
            }

            self.isLoading = false
        }

        await calculationTask?.value
    }

    /// Navigate to a specific coordinate
    public func navigateTo(
        coordinate: GlobeCoordinate,
        zoom: Double? = nil,
        animated: Bool = true
    ) {
        var newState = cameraState
        newState.center = coordinate
        if let zoom = zoom {
            newState.zoom = zoom
        }
        cameraState = newState
    }

    /// Navigate to show all astro lines
    public func showAllLines(animated: Bool = true) {
        // Calculate bounds that contain all lines
        guard !astroLines.isEmpty else { return }

        var minLat = 90.0
        var maxLat = -90.0
        var minLon = 180.0
        var maxLon = -180.0

        for line in astroLines where lineVisibility.isVisible(line) {
            for coord in line.coordinates {
                minLat = min(minLat, coord.latitude)
                maxLat = max(maxLat, coord.latitude)
                minLon = min(minLon, coord.longitude)
                maxLon = max(maxLon, coord.longitude)
            }
        }

        // Navigate to center of bounds
        let centerLat = (minLat + maxLat) / 2
        let centerLon = (minLon + maxLon) / 2

        // Calculate appropriate zoom
        let latSpan = maxLat - minLat
        let lonSpan = maxLon - minLon
        let maxSpan = max(latSpan, lonSpan)
        let zoom = max(0, 8 - log2(maxSpan / 10))

        navigateTo(
            coordinate: GlobeCoordinate(latitude: centerLat, longitude: centerLon),
            zoom: zoom,
            animated: animated
        )
    }

    /// Select a location on the globe
    public func selectLocation(_ location: SelectedLocation) {
        selectedLocation = location
        selectedLine = nil

        // Add or update selection marker
        let marker = GlobeMarker(
            id: "selected-location",
            coordinate: location.coordinate,
            title: location.displayName,
            type: .selectedLocation
        )
        updateMarker(marker)
    }

    /// Clear the current selection
    public func clearSelection() {
        selectedLocation = nil
        selectedLine = nil
        removeMarker(id: "selected-location")
    }

    // MARK: - Local Space

    /// Activate local space mode with lines radiating from a location
    public func activateLocalSpace(lines: [AstroLine], center: GlobeCoordinate, radiusKm: Double) {
        localSpaceLines = lines
        localSpaceCenter = center
        localSpaceRadiusKm = radiusKm
        isLocalSpaceActive = true
    }

    /// Deactivate local space mode and clear lines
    public func resetLocalSpace() {
        localSpaceLines = []
        localSpaceCenter = nil
        localSpaceRadiusKm = 0
        isLocalSpaceActive = false
    }

    /// Toggle visibility of a specific planet's lines
    public func togglePlanet(_ planet: Planet) {
        if lineVisibility.visiblePlanets.contains(planet) {
            lineVisibility.visiblePlanets.remove(planet)
        } else {
            lineVisibility.visiblePlanets.insert(planet)
        }
        lineVisibility.save()
    }

    /// Toggle visibility of a specific line type
    public func toggleLineType(_ lineType: AstroLineType) {
        if lineVisibility.visibleLineTypes.contains(lineType) {
            lineVisibility.visibleLineTypes.remove(lineType)
        } else {
            lineVisibility.visibleLineTypes.insert(lineType)
        }
        lineVisibility.save()
    }

    /// Toggle harmonious aspect line visibility (trine, sextile)
    public func toggleHarmoniousAspects() {
        lineVisibility.showHarmoniousAspects.toggle()
        lineVisibility.save()
    }

    /// Toggle disharmonious aspect line visibility (square, opposition)
    public func toggleDisharmoniousAspects() {
        lineVisibility.showDisharmoniousAspects.toggle()
        lineVisibility.save()
    }

    /// Toggle paran line visibility
    public func toggleParans() {
        lineVisibility.showParans.toggle()
        lineVisibility.save()
    }

    /// Toggle zenith point visibility
    public func toggleZeniths() {
        lineVisibility.showZeniths.toggle()
        lineVisibility.save()
    }

    /// Toggle line labels visibility
    public func toggleLineLabels() {
        lineVisibility.showLineLabels.toggle()
        lineVisibility.save()
    }

    /// Toggle nakshatra band visibility
    public func toggleNakshatraBands() {
        lineVisibility.showNakshatraBands.toggle()
        lineVisibility.save()
    }

    // MARK: - Transit Line Calculation

    /// Toggle transit mode on/off
    public func toggleTransitMode() {
        isTransitMode.toggle()
        if !isTransitMode {
            transitLines = []
            transitAspectLines = []
            transitParanLines = []
            isTransitPlaying = false
        } else {
            calculateTransitLines()
        }
    }

    /// Monotonic counter to ensure only the latest calculation updates state
    private var transitCalcGeneration: Int = 0

    /// Recalculate transit lines for the current transitDate (fire-and-forget).
    /// Used for non-playback callers (slider drag, step buttons, reset).
    public func calculateTransitLines() {
        Task { await calculateTransitLinesAsync() }
    }

    /// Recalculate transit lines and await completion.
    /// The caller suspends until the calculation finishes and state is updated.
    /// Uses a generation counter so only the latest result is applied (stale results are dropped).
    public func calculateTransitLinesAsync() async {
        guard isTransitMode else { return }

        transitCalcGeneration += 1
        let generation = transitCalcGeneration
        let date = transitDate
        let location = birthLocation ?? GlobeCoordinate(latitude: 0, longitude: 0)

        isCalculatingTransit = true

        do {
            // Run heavy computation off MainActor; awaiting .value releases the actor
            let bundle = try await Task.detached(priority: .userInitiated) { [weak self] in
                guard let self else { throw CancellationError() }
                return try await self.astroLineProvider.calculateAstroLines(
                    birthDate: date,
                    birthTime: date,
                    birthLocation: location
                )
            }.value

            // Back on MainActor — drop stale results
            guard transitCalcGeneration == generation else {
                isCalculatingTransit = false
                return
            }
            transitLines = bundle.planetaryLines
            transitAspectLines = bundle.aspectLines
            transitParanLines = bundle.paranLines.map {
                GlobeParanLine(id: $0.id, planet1: $0.planet1, angle1: $0.angle1,
                               planet2: $0.planet2, angle2: $0.angle2,
                               latitude: $0.latitude, longitude: $0.longitude, isTransit: true)
            }
            isCalculatingTransit = false
        } catch {
            guard transitCalcGeneration == generation else { return }
            isCalculatingTransit = false
            logger.error("Transit calculation failed: \(error.localizedDescription)")
        }
    }

    /// Show only specific planets
    public func showOnlyPlanets(_ planets: Set<Planet>) {
        lineVisibility.visiblePlanets = planets
        lineVisibility.save()
    }

    /// Show all lines
    public func showAllLineTypes() {
        lineVisibility = .all
        lineVisibility.save()
    }

    /// Hide all lines
    public func hideAllLines() {
        lineVisibility = .none
        lineVisibility.save()
    }

    /// Get lines at a specific location
    public func linesNear(_ coordinate: GlobeCoordinate, radius: Double = 50) -> [AstroLine] {
        // Find lines within the given radius (in km) of the coordinate
        return astroLines.filter { line in
            guard lineVisibility.isVisible(line) else { return false }
            return lineIntersectsCircle(line, center: coordinate, radiusKm: radius)
        }
    }

    /// Add a marker to the globe
    public func addMarker(_ marker: GlobeMarker) {
        if let index = markers.firstIndex(where: { $0.id == marker.id }) {
            markers[index] = marker
        } else {
            markers.append(marker)
        }
    }

    /// Update an existing marker
    public func updateMarker(_ marker: GlobeMarker) {
        addMarker(marker)
    }

    /// Remove a marker by ID
    public func removeMarker(id: String) {
        markers.removeAll { $0.id == id }
    }

    /// Clear all markers
    public func clearMarkers() {
        markers.removeAll()
    }

    /// Clear only scout result markers
    public func clearScoutMarkers() {
        markers.removeAll { $0.type == .scoutResult }
    }

    /// Add multiple markers at once (useful for scout results)
    public func addMarkers(_ newMarkers: [GlobeMarker]) {
        for marker in newMarkers {
            addMarker(marker)
        }
    }

    /// Set scout result markers (replaces existing scout markers)
    /// Batched: single array mutation to avoid per-marker view invalidation.
    public func setScoutMarkers(_ newMarkers: [GlobeMarker]) {
        var updated = markers.filter { $0.type != .scoutResult }
        updated.append(contentsOf: newMarkers)
        markers = updated
    }

    /// Clear the current error state
    public func clearError() {
        error = nil
    }

    /// Handle an interaction event
    public func handleInteraction(_ event: GlobeInteractionEvent) {
        switch event {
        case .locationTapped(let coordinate):
            Task {
                await handleLocationTap(coordinate)
            }

        case .locationLongPressed(let coordinate):
            Task {
                await handleLocationLongPress(coordinate)
            }

        case .markerTapped(let marker):
            handleMarkerTap(marker)

        case .lineTapped(let line, let coordinate):
            handleLineTap(line, nearCoordinate: coordinate)

        case .aspectLineTapped(let aspectLine, let coordinate):
            handleAspectLineTap(aspectLine, nearCoordinate: coordinate)

        case .paranPointTapped(let paranLine):
            handleParanPointTap(paranLine)

        case .zenithPointTapped(let zenithPoint):
            handleZenithPointTap(zenithPoint)

        case .nakshatraTapped(let tapData):
            handleNakshatraTap(tapData)

        case .cameraChanged:
            // Camera state is bound, no action needed
            break

        case .zoomChanged(let zoom):
            cameraState.zoom = zoom
        }
    }

    // MARK: - Private Methods

    private func handleLocationTap(_ coordinate: GlobeCoordinate) async {
        // If a nakshatra band was just tapped on this same gesture, skip location selection.
        if suppressNextLocationTap {
            suppressNextLocationTap = false
            return
        }
        // Reverse geocode and select
        do {
            let location = try await geocodingProvider.reverseGeocode(coordinate: coordinate)
            selectLocation(location)
        } catch {
            // Still select with just coordinates
            let location = SelectedLocation(coordinate: coordinate)
            selectLocation(location)
        }
    }

    private func handleLocationLongPress(_ coordinate: GlobeCoordinate) async {
        // Same as tap for now, context menu handled by view
        await handleLocationTap(coordinate)
    }

    private func handleMarkerTap(_ marker: GlobeMarker) {
        selectedLocation = SelectedLocation(
            coordinate: marker.coordinate,
            name: marker.title,
            country: marker.subtitle
        )
        selectedLine = nil
    }

    private func handleLineTap(_ line: AstroLine, nearCoordinate: GlobeCoordinate) {
        selectedLine = AstroLineCardData(
            line: line,
            nearestLocation: nearCoordinate
        )
        selectedAspectLine = nil
        selectedLocation = nil
    }

    private func handleAspectLineTap(_ aspectLine: GlobeAspectLine, nearCoordinate: GlobeCoordinate) {
        selectedAspectLine = AspectLineCardData(
            aspectLine: aspectLine,
            nearestLocation: nearCoordinate
        )
        selectedLine = nil
        selectedParanPoint = nil
        selectedZenithPoint = nil
        selectedLocation = nil
    }

    private func handleParanPointTap(_ paranLine: GlobeParanLine) {
        // Toggle: tap same paran → deselect (hides latitude line); tap different → select
        if selectedParanPoint?.paranLine.id == paranLine.id {
            selectedParanPoint = nil
        } else {
            selectedParanPoint = ParanPointCardData(paranLine: paranLine)
        }
        selectedLine = nil
        selectedAspectLine = nil
        selectedZenithPoint = nil
        selectedLocation = nil
    }

    private func handleNakshatraTap(_ tapData: NakshatraTapData) {
        // Find the nakshatra by index
        guard let nakshatraGlobe = nakshatraData.first(where: { $0.id == tapData.nakshatraIndex }) else { return }

        // Suppress the locationTapped event that MapboxGlobeView fires on the same gesture
        suppressNextLocationTap = true

        // Toggle: tap same nakshatra → deselect
        if selectedNakshatra?.nakshatra.id == tapData.nakshatraIndex {
            selectedNakshatra = nil
        } else {
            let tarabala: TarabalaResult? = janmaNakshatraIndex.map {
                calculateTarabala(dayNakshatraIndex: tapData.nakshatraIndex, janmaNakshatraIndex: $0)
            }
            selectedNakshatra = NakshatraCardData(
                nakshatra: nakshatraGlobe.nakshatra,
                pada: tapData.pada,
                coordinate: tapData.coordinate,
                tarabala: tarabala
            )
        }
        selectedLine = nil
        selectedAspectLine = nil
        selectedParanPoint = nil
        selectedZenithPoint = nil
        selectedLocation = nil
    }

    private func handleZenithPointTap(_ zenithPoint: GlobeZenithPoint) {
        // Toggle: tap same zenith → deselect (hides belt); tap different → select
        if selectedZenithPoint?.zenithPoint.planet == zenithPoint.planet {
            selectedZenithPoint = nil
        } else {
            selectedZenithPoint = ZenithPointCardData(zenithPoint: zenithPoint)
        }
        selectedLine = nil
        selectedAspectLine = nil
        selectedParanPoint = nil
        selectedLocation = nil
    }

    private func lineIntersectsCircle(
        _ line: AstroLine,
        center: GlobeCoordinate,
        radiusKm: Double
    ) -> Bool {
        for coord in line.coordinates {
            let distance = haversineDistance(
                lat1: center.latitude,
                lon1: center.longitude,
                lat2: coord.latitude,
                lon2: coord.longitude
            )
            if distance <= radiusKm {
                return true
            }
        }
        return false
    }

    private func haversineDistance(
        lat1: Double,
        lon1: Double,
        lat2: Double,
        lon2: Double
    ) -> Double {
        let R = 6371.0
        let dLat = (lat2 - lat1) * .pi / 180
        let dLon = (lon2 - lon1) * .pi / 180
        let a = sin(dLat / 2) * sin(dLat / 2) +
                cos(lat1 * .pi / 180) * cos(lat2 * .pi / 180) *
                sin(dLon / 2) * sin(dLon / 2)
        let c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return R * c
    }
}

// MARK: - Globe Errors

/// Errors that can occur in the globe view
public enum GlobeError: Error, LocalizedError {
    case calculationFailed(Error)
    case geocodingFailed(Error)
    case tileLoadingFailed(Error)
    case invalidCoordinate
    case noDataAvailable

    public var errorDescription: String? {
        switch self {
        case .calculationFailed(let error):
            return "Failed to calculate astro lines: \(error.localizedDescription)"
        case .geocodingFailed(let error):
            return "Failed to get location info: \(error.localizedDescription)"
        case .tileLoadingFailed(let error):
            return "Failed to load map tiles: \(error.localizedDescription)"
        case .invalidCoordinate:
            return "Invalid coordinate"
        case .noDataAvailable:
            return "No astrology data available. Please set birth information."
        }
    }
}
