import SwiftUI
import MapboxMaps
import DesignSystem
import Core
import os.log

// MARK: - Mapbox Globe View

/// SwiftUI wrapper for Mapbox MapView with globe projection.
///
/// Uses Mapbox Maps SDK v11+ with globe projection for true 3D globe rendering.
/// Astrocartography lines are drawn as GeoJSON line layers.
@available(iOS 17.0, *)
public struct MapboxGlobeView: UIViewRepresentable {
    // MARK: - Properties

    @Binding var cameraState: GlobeCameraState
    let markers: [GlobeMarker]
    let astroLines: [AstroLine]
    let localSpaceLines: [AstroLine]
    let localSpaceCenter: GlobeCoordinate?
    let localSpaceRadiusKm: Double
    let aspectLines: [GlobeAspectLine]
    let paranLines: [GlobeParanLine]
    let zenithPoints: [GlobeZenithPoint]
    let lineVisibility: AstroLineVisibility
    let mapStyleTheme: MapStyleTheme
    let onInteraction: ((GlobeInteractionEvent) -> Void)?

    private let logger = Logger(subsystem: "com.cartostar.globe", category: "MapboxGlobeView")

    // MARK: - Constants

    private static let lineSourceId = "astro-lines-source"
    private static let lineLayerIdPrefix = "astro-line-"
    private static let lineLabelsSourceId = "line-labels-source"
    private static let lineLabelsLayerId = "line-labels-layer"
    private static let transitLineLabelsLayerId = "transit-line-labels-layer"
    private static let markerSourceId = "markers-source"
    private static let markerLayerId = "markers-layer"
    private static let birthPlaceLayerId = "birthplace-layer"
    private static let selectedLocationSourceId = "selected-location-source"  // Separate non-clustered source
    private static let selectedLocationLayerId = "selected-location-layer"
    private static let selectedLocationPinImageId = "selected-location-pin"
    private static let clusterLayerId = "clusters-layer"
    private static let clusterCountLayerId = "cluster-count-layer"

    // Local space lines (dashed, radiating from selected location)
    private static let localSpaceSourceId = "local-space-source"
    private static let localSpaceLayerId = "local-space-layer"
    private static let localSpaceRadiusSourceId = "local-space-radius-source"
    private static let localSpaceRadiusLayerId = "local-space-radius-layer"
    private static let localSpaceRadiusFillLayerId = "local-space-radius-fill-layer"

    // Aspect lines (two layers: outer glow + inner dashed)
    private static let aspectSourceId = "aspect-lines-source"
    private static let aspectLayerId = "aspect-lines-layer"
    private static let aspectGlowLayerId = "aspect-lines-glow-layer"

    // Paran lines
    private static let paranSourceId = "paran-lines-source"
    private static let paranLayerId = "paran-lines-layer"

    // Zenith points
    private static let zenithSourceId = "zenith-points-source"
    private static let zenithLayerId = "zenith-points-layer"
    private static let zenithGlyphLayerId = "zenith-glyph-layer"

    // Zenith belt (declination band shown on tap)
    private static let zenithBeltSourceId = "zenith-belt-source"
    private static let zenithBeltLayerId = "zenith-belt-layer"

    // Paran ambient latitude circles (thin lines for all visible parans)
    private static let paranAmbientSourceId = "paran-ambient-source"
    private static let paranAmbientLayerId = "paran-ambient-layer"

    // Paran selected latitude line (two-tone highlight on tap)
    private static let paranLatSourceId = "paran-lat-source"
    private static let paranLatLayerId = "paran-lat-layer"
    private static let paranLatLayer2Id = "paran-lat-layer-2"

    // Transit lines (overlay on natal lines, dashed styling)
    private static let transitSourceId = "transit-lines-source"
    private static let transitLayerId = "transit-lines-layer"
    private static let transitDashedLayerId = "transit-lines-dashed-layer"
    // Transit hit layers (invisible wide layers for tap detection, matching web)
    private static let transitHitLayerId = "transit-lines-hit"
    private static let transitDashedHitLayerId = "transit-lines-dashed-hit"
    private static let transitAspectHitLayerId = "transit-aspect-lines-hit"

    // Nakshatra bands (27 lunar mansion meridian strips)
    private static let nakshatraSourceId = "nakshatra-source"
    private static let nakshatraFillLayerId = "nakshatra-fill"
    private static let nakshatraCuspLayerId = "nakshatra-cusp"
    private static let nakshatraPadaLayerId = "nakshatra-pada"

    // Zenith orb circles (concentric influence zones)
    private static let zenithCirclesSourceId = "zenith-circles-source"
    private static let zenithCirclesFillLayerId = "zenith-circles-fill-layer"
    private static let zenithCirclesStrokeLayerId = "zenith-circles-stroke-layer"

    // Clustering settings
    private static let clusterRadius: Double = 50
    private static let clusterMaxZoom: Double = 14

    // MARK: - Initialization

    /// The currently selected zenith planet (triggers belt rendering)
    var selectedZenithPlanet: String?

    /// Nakshatra band data projected onto the globe
    var nakshatraData: [NakshatraGlobeData] = []

    /// Transit lines (overlay, dashed styling)
    var transitLines: [AstroLine] = []
    var transitAspectLines: [GlobeAspectLine] = []
    var transitParanLines: [GlobeParanLine] = []

    /// Currently selected paran point (renders latitude line on tap)
    var selectedParanPoint: GlobeParanLine?

    public init(
        cameraState: Binding<GlobeCameraState>,
        markers: [GlobeMarker] = [],
        astroLines: [AstroLine] = [],
        localSpaceLines: [AstroLine] = [],
        localSpaceCenter: GlobeCoordinate? = nil,
        localSpaceRadiusKm: Double = 0,
        aspectLines: [GlobeAspectLine] = [],
        paranLines: [GlobeParanLine] = [],
        zenithPoints: [GlobeZenithPoint] = [],
        selectedZenithPlanet: String? = nil,
        transitLines: [AstroLine] = [],
        transitAspectLines: [GlobeAspectLine] = [],
        transitParanLines: [GlobeParanLine] = [],
        selectedParanPoint: GlobeParanLine? = nil,
        nakshatraData: [NakshatraGlobeData] = [],
        lineVisibility: AstroLineVisibility = .all,
        mapStyleTheme: MapStyleTheme = .streets,
        onInteraction: ((GlobeInteractionEvent) -> Void)? = nil
    ) {
        self._cameraState = cameraState
        self.markers = markers
        self.astroLines = astroLines
        self.localSpaceLines = localSpaceLines
        self.localSpaceCenter = localSpaceCenter
        self.localSpaceRadiusKm = localSpaceRadiusKm
        self.aspectLines = aspectLines
        self.paranLines = paranLines
        self.zenithPoints = zenithPoints
        self.selectedZenithPlanet = selectedZenithPlanet
        self.transitLines = transitLines
        self.transitAspectLines = transitAspectLines
        self.transitParanLines = transitParanLines
        self.selectedParanPoint = selectedParanPoint
        self.nakshatraData = nakshatraData
        self.lineVisibility = lineVisibility
        self.mapStyleTheme = mapStyleTheme
        self.onInteraction = onInteraction
    }

    // MARK: - UIViewRepresentable

    public func makeUIView(context: Context) -> MapView {
        // Configure map initialization options
        let options = MapInitOptions(
            cameraOptions: cameraOptionsFromState(cameraState),
            styleURI: styleURI(for: mapStyleTheme)
        )

        // Use screen bounds as the initial frame — Mapbox requires a non-zero size at init time.
        // SwiftUI's layout system will resize the view immediately after, so this is just a bootstrap rect.
        let mapView = MapView(frame: UIScreen.main.bounds, mapInitOptions: options)

        // Hide all default ornaments - we provide our own UI
        mapView.ornaments.options.compass.visibility = .hidden
        mapView.ornaments.options.scaleBar.visibility = .hidden
        // Position logo at bottom-left corner (Mapbox TOS requires logo visibility)
        mapView.ornaments.options.logo.position = .bottomLeading
        mapView.ornaments.options.logo.margins = CGPoint(x: 8, y: 8)  // Tucked in corner
        // Position attribution button next to logo
        mapView.ornaments.options.attributionButton.position = .bottomLeading
        mapView.ornaments.options.attributionButton.margins = CGPoint(x: 98, y: 8)

        // Enable all gestures
        mapView.gestures.options.panEnabled = true
        mapView.gestures.options.pinchEnabled = true
        mapView.gestures.options.rotateEnabled = true
        mapView.gestures.options.pitchEnabled = true

        // Note: We do NOT set custom gesture delegates here.
        // Mapbox SDK v11+ handles gestures internally and setting custom delegates
        // breaks the pan/bearing coordination. The SwiftUI overlay views at the
        // bottom (.contentShape + gesture handlers) properly intercept touches.

        // Set up globe projection when style loads
        context.coordinator.styleLoadedCancellable = mapView.mapboxMap.onStyleLoaded.observe { _ in
            self.configureGlobeProjection(mapView)
            self.setupInitialLayers(mapView, context: context)
        }

        // Set up camera change observer
        context.coordinator.cameraChangedCancellable = mapView.mapboxMap.onCameraChanged.observe { event in
            context.coordinator.handleCameraChange(event, mapView: mapView)
        }

        // Add tap gesture — accept both direct touch (iOS) and indirect pointer (macOS mouse/trackpad)
        let tapGesture = UITapGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleTap(_:)))
        tapGesture.allowedTouchTypes = [
            NSNumber(value: UITouch.TouchType.direct.rawValue),
            NSNumber(value: UITouch.TouchType.indirectPointer.rawValue)
        ]
        mapView.addGestureRecognizer(tapGesture)

        // Add long press gesture — accept both direct touch and indirect pointer
        let longPressGesture = UILongPressGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleLongPress(_:)))
        longPressGesture.minimumPressDuration = 0.5
        longPressGesture.allowedTouchTypes = [
            NSNumber(value: UITouch.TouchType.direct.rawValue),
            NSNumber(value: UITouch.TouchType.indirectPointer.rawValue)
        ]
        mapView.addGestureRecognizer(longPressGesture)

        // Add hover gesture (iPad trackpad/mouse + Apple Pencil hover on supported devices)
        let hoverGesture = UIHoverGestureRecognizer(target: context.coordinator, action: #selector(Coordinator.handleHover(_:)))
        mapView.addGestureRecognizer(hoverGesture)

        context.coordinator.mapView = mapView
        context.coordinator.currentTheme = mapStyleTheme

        logger.info("Mapbox globe view created with globe projection")

        return mapView
    }

    public func updateUIView(_ mapView: MapView, context: Context) {
        // Update style if theme changed
        if context.coordinator.currentTheme != mapStyleTheme {
            context.coordinator.currentTheme = mapStyleTheme
            mapView.mapboxMap.loadStyle(styleURI(for: mapStyleTheme)) { _ in
                self.configureGlobeProjection(mapView)
                self.setupInitialLayers(mapView, context: context)
            }
        }

        // Update camera if changed externally
        if context.coordinator.lastKnownCameraState != cameraState && !context.coordinator.isUserInteracting {
            let cameraOptions = cameraOptionsFromState(cameraState)
            mapView.camera.fly(to: cameraOptions, duration: 1.5)
            context.coordinator.lastKnownCameraState = cameraState
        }

        // Only update layers once sources have been created
        guard context.coordinator.sourcesReady else { return }

        // Update lines and markers
        updateNakshatraBands(mapView)
        context.coordinator.currentNakshatraData = nakshatraData
        context.coordinator.currentShowNakshatraBands = lineVisibility.showNakshatraBands
        updateAstroLines(mapView, context: context)
        updateLocalSpaceLines(mapView)
        updateAspectLines(mapView, context: context)
        updateParanLines(mapView, context: context)
        updateParanLatitudeLine(mapView)
        updateTransitLines(mapView, context: context)
        updateLineLabels(mapView)
        updateZenithPoints(mapView, context: context)
        updateMarkers(mapView, context: context)
    }

    public func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    // MARK: - Globe Projection

    private func configureGlobeProjection(_ mapView: MapView) {
        do {
            // Set projection to globe for 3D Earth rendering
            try mapView.mapboxMap.setProjection(StyleProjection(name: .globe))

            // Configure atmosphere for cosmic effect
            try mapView.mapboxMap.setAtmosphere(Atmosphere())

            logger.info("Globe projection enabled")
        } catch {
            logger.error("Failed to set globe projection: \(error.localizedDescription)")
        }
    }

    // MARK: - Style

    private func styleURI(for theme: MapStyleTheme) -> StyleURI {
        switch theme {
        // Dark themes
        case .cosmic:
            // Standard dark - good contrast for astro lines
            return .dark
        case .dark:
            // Standard Mapbox dark
            return .dark
        case .midnight:
            // Navigation night for OLED-friendly pure blacks
            // Falls back to dark if not available
            return StyleURI(rawValue: "mapbox://styles/mapbox/navigation-night-v1") ?? .dark

        // Light themes
        case .light:
            return .light
        case .streets:
            return .streets
        case .outdoors:
            return .outdoors

        // Satellite themes
        case .satellite:
            return .satellite
        case .hybrid:
            return .satelliteStreets
        }
    }

    // MARK: - Camera

    private func cameraOptionsFromState(_ state: GlobeCameraState) -> CameraOptions {
        CameraOptions(
            center: CLLocationCoordinate2D(latitude: state.center.latitude, longitude: state.center.longitude),
            zoom: state.zoom,
            bearing: state.bearing,
            pitch: state.pitch
        )
    }

    // MARK: - Initial Setup

    /// Safely add a GeoJSON source — skips if it already exists
    private func addSourceIfNeeded(_ mapView: MapView, _ source: GeoJSONSource) {
        if mapView.mapboxMap.sourceExists(withId: source.id) { return }
        do {
            try mapView.mapboxMap.addSource(source)
        } catch {
            logger.error("Failed to add source \(source.id): \(error.localizedDescription)")
        }
    }

    /// Safely update a GeoJSON source — skips if source doesn't exist
    private func safeUpdateSource(_ mapView: MapView, sourceId: String, geoJSON: GeoJSONObject) {
        guard mapView.mapboxMap.sourceExists(withId: sourceId) else { return }
        mapView.mapboxMap.updateGeoJSONSource(withId: sourceId, geoJSON: geoJSON)
    }

    private func setupInitialLayers(_ mapView: MapView, context: Context) {
        // Create source for astro lines
        var lineSource = GeoJSONSource(id: Self.lineSourceId)
        lineSource.data = .featureCollection(FeatureCollection(features: []))
        addSourceIfNeeded(mapView, lineSource)

        // Add selected location pin image to the style
        addSelectedLocationPinImage(mapView)

        // Create all GeoJSON sources (safely skips if already exists)
        var markerSource = GeoJSONSource(id: Self.markerSourceId)
        markerSource.data = .featureCollection(FeatureCollection(features: []))
        markerSource.cluster = true
        markerSource.clusterRadius = Self.clusterRadius
        markerSource.clusterMaxZoom = Self.clusterMaxZoom
        addSourceIfNeeded(mapView, markerSource)

        var selectedLocationSource = GeoJSONSource(id: Self.selectedLocationSourceId)
        selectedLocationSource.data = .featureCollection(FeatureCollection(features: []))
        addSourceIfNeeded(mapView, selectedLocationSource)

        // Line labels source (planet symbol + line type at midpoints)
        var lineLabelsSource = GeoJSONSource(id: Self.lineLabelsSourceId)
        lineLabelsSource.data = .featureCollection(FeatureCollection(features: []))
        addSourceIfNeeded(mapView, lineLabelsSource)

        // Local space lines source
        var localSpaceSource = GeoJSONSource(id: Self.localSpaceSourceId)
        localSpaceSource.data = .featureCollection(FeatureCollection(features: []))
        addSourceIfNeeded(mapView, localSpaceSource)

        for sourceId in [Self.aspectSourceId, Self.paranSourceId, Self.zenithSourceId,
                         Self.paranAmbientSourceId, Self.paranLatSourceId,
                         Self.transitSourceId,
                         Self.nakshatraSourceId, Self.zenithCirclesSourceId, Self.zenithBeltSourceId] {
            var source = GeoJSONSource(id: sourceId)
            source.data = .featureCollection(FeatureCollection(features: []))
            addSourceIfNeeded(mapView, source)
        }

        // Mark sources as ready — updateUIView will skip until this is set
        context.coordinator.sourcesReady = true

        // Initial update
        updateNakshatraBands(mapView)
        updateAstroLines(mapView, context: context)
        updateAspectLines(mapView, context: context)
        updateParanLines(mapView, context: context)
        updateParanLatitudeLine(mapView)
        updateTransitLines(mapView, context: context)
        updateLineLabels(mapView)
        updateZenithPoints(mapView, context: context)
        updateMarkers(mapView, context: context)
    }

    // MARK: - Astro Lines

    /// Split ASC/DSC line coordinates at large latitude jumps to prevent
    /// spurious diagonal lines across the globe.
    /// Matches web's splitAtDiscontinuities() in geoJsonConverters.ts.
    private func splitAtDiscontinuities(
        _ coordinates: [CLLocationCoordinate2D],
        latThreshold: Double = 60.0
    ) -> [[CLLocationCoordinate2D]] {
        guard coordinates.count >= 2 else { return [coordinates] }

        var segments: [[CLLocationCoordinate2D]] = []
        var currentSegment: [CLLocationCoordinate2D] = [coordinates[0]]

        for i in 1..<coordinates.count {
            let latDiff = abs(coordinates[i].latitude - coordinates[i - 1].latitude)

            if latDiff > latThreshold {
                // Large latitude jump — start a new segment
                if currentSegment.count >= 2 {
                    segments.append(currentSegment)
                }
                currentSegment = [coordinates[i]]
            } else {
                currentSegment.append(coordinates[i])
            }
        }

        if currentSegment.count >= 2 {
            segments.append(currentSegment)
        }

        return segments.isEmpty ? [coordinates] : segments
    }

    private func updateAstroLines(_ mapView: MapView, context: Context) {
        // Hide AC/MC/DSC/IC lines when local space mode is active
        let visibleLines = localSpaceLines.isEmpty
            ? astroLines.filter { lineVisibility.isVisible($0) }
            : []

        // Group lines by planet for efficient rendering
        var featuresByPlanet: [Planet: [Feature]] = [:]

        for line in visibleLines {
            let coordinates = line.coordinates.map {
                CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude)
            }

            guard coordinates.count >= 2 else { continue }

            // ASC/DSC lines need discontinuity splitting — the Rust engine
            // emits points for ~half the longitude range and large latitude
            // jumps occur at the boundary. Without splitting, Mapbox draws
            // spurious diagonal lines connecting distant points.
            let isHorizonLine = line.lineType == .ascendant || line.lineType == .descendant
            let segments = isHorizonLine ? splitAtDiscontinuities(coordinates) : [coordinates]

            if segments.count == 1 {
                let lineString = LineString(segments[0])
                var feature = Feature(geometry: .lineString(lineString))
                feature.identifier = .string(line.id)
                feature.properties = [
                    "planet": .string(line.planet.rawValue),
                    "lineType": .string(line.lineType.rawValue),
                    "id": .string(line.id)
                ]
                featuresByPlanet[line.planet, default: []].append(feature)
            } else {
                // Multiple segments → MultiLineString (prevents diagonal artifacts)
                let multiLine = MultiLineString(segments)
                var feature = Feature(geometry: .multiLineString(multiLine))
                feature.identifier = .string(line.id)
                feature.properties = [
                    "planet": .string(line.planet.rawValue),
                    "lineType": .string(line.lineType.rawValue),
                    "id": .string(line.id)
                ]
                featuresByPlanet[line.planet, default: []].append(feature)
            }
        }

        // Update source with all features
        let allFeatures = featuresByPlanet.values.flatMap { $0 }
        let featureCollection = FeatureCollection(features: allFeatures)

        mapView.mapboxMap.updateGeoJSONSource(
            withId: Self.lineSourceId,
            geoJSON: .featureCollection(featureCollection)
        )

        // Create/update layers for each planet
        for planet in Planet.allCases {
            let layerId = "\(Self.lineLayerIdPrefix)\(planet.rawValue)"
            let hasVisibleLines = visibleLines.contains { $0.planet == planet }

            if hasVisibleLines {
                addOrUpdateLineLayer(mapView, planet: planet, layerId: layerId)
            } else {
                removeLayerIfExists(mapView, layerId: layerId)
            }
        }

        context.coordinator.currentLines = visibleLines
    }

    private func addOrUpdateLineLayer(_ mapView: MapView, planet: Planet, layerId: String) {
        let color = planetColor(planet)

        // Check if layer exists
        if mapView.mapboxMap.layerExists(withId: layerId) {
            // Update existing layer properties
            do {
                try mapView.mapboxMap.updateLayer(withId: layerId, type: LineLayer.self) { layer in
                    layer.lineColor = .constant(StyleColor(color))
                }
            } catch {
                logger.error("Failed to update line layer: \(error.localizedDescription)")
            }
        } else {
            // Create new layer
            var lineLayer = LineLayer(id: layerId, source: Self.lineSourceId)
            lineLayer.lineColor = .constant(StyleColor(color))
            lineLayer.lineWidth = .constant(2.5)
            lineLayer.lineOpacity = .constant(0.85)
            lineLayer.lineCap = .constant(.round)
            lineLayer.lineJoin = .constant(.round)

            // Filter to only show this planet's lines
            lineLayer.filter = Exp(.eq) {
                Exp(.get) { "planet" }
                planet.rawValue
            }

            do {
                try mapView.mapboxMap.addLayer(lineLayer)
            } catch {
                logger.error("Failed to add line layer: \(error.localizedDescription)")
            }
        }
    }

    private func removeLayerIfExists(_ mapView: MapView, layerId: String) {
        if mapView.mapboxMap.layerExists(withId: layerId) {
            do {
                try mapView.mapboxMap.removeLayer(withId: layerId)
            } catch {
                logger.error("Failed to remove layer: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Local Space Lines

    private static let localSpaceLabelsSourceId = "local-space-labels-source"
    private static let localSpaceLabelsLayerId = "local-space-labels-layer"
    private static let localSpaceGlyphLayerId = "local-space-glyph-layer"

    private func updateLocalSpaceLines(_ mapView: MapView) {
        var lineFeatures: [Feature] = []
        var labelFeatures: [Feature] = []

        for line in localSpaceLines {
            let coordinates = line.coordinates.map {
                CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude)
            }
            guard coordinates.count >= 2 else { continue }

            let lineString = LineString(coordinates)
            var feature = Feature(geometry: .lineString(lineString))
            let colorHex = colorToHex(planetColor(line.planet))
            // Extract direction from the line id (format: "ls-Planet-Direction")
            let direction = line.id.components(separatedBy: "-").last ?? ""
            feature.properties = [
                "planet": .string(line.planet.rawValue),
                "color": .string(colorHex),
                "lineType": .string("LS"),
                "direction": .string(direction)
            ]
            lineFeatures.append(feature)

            // Place planet glyph label at ~40% along the line (matching natal line label pattern)
            let midIdx = coordinates.count * 2 / 5
            let midCoord = coordinates[min(midIdx, coordinates.count - 1)]
            let point = Point(midCoord)
            var labelFeature = Feature(geometry: .point(point))
            let label = "\(line.planet.symbol) \(direction)"
            labelFeature.properties = [
                "label": .string(label),
                "color": .string(colorHex),
                "planet": .string(line.planet.rawValue)
            ]
            labelFeatures.append(labelFeature)

            // Place planet glyph icon near the start of the line (~15% in)
            let glyphIdx = max(1, coordinates.count / 7)
            let glyphCoord = coordinates[min(glyphIdx, coordinates.count - 1)]
            let glyphImageId = "ls-glyph-\(line.planet.rawValue)"

            // Register glyph image if not already present
            if !mapView.mapboxMap.imageExists(withId: glyphImageId) {
                let glyph = line.planet.symbol
                let planetUIColor = planetColor(line.planet)
                if let image = renderZenithGlyphImage(glyph: glyph, backgroundColor: planetUIColor, size: 22) {
                    try? mapView.mapboxMap.addImage(image, id: glyphImageId, sdf: false)
                }
            }

            var glyphFeature = Feature(geometry: .point(Point(glyphCoord)))
            glyphFeature.properties = [
                "planet": .string(line.planet.rawValue),
                "imageId": .string(glyphImageId)
            ]
            labelFeatures.append(glyphFeature)
        }

        // Update line source
        mapView.mapboxMap.updateGeoJSONSource(
            withId: Self.localSpaceSourceId,
            geoJSON: .featureCollection(FeatureCollection(features: lineFeatures))
        )

        // Create or update labels source
        if !mapView.mapboxMap.sourceExists(withId: Self.localSpaceLabelsSourceId) {
            var source = GeoJSONSource(id: Self.localSpaceLabelsSourceId)
            source.data = .featureCollection(FeatureCollection(features: []))
            addSourceIfNeeded(mapView, source)
        }
        mapView.mapboxMap.updateGeoJSONSource(
            withId: Self.localSpaceLabelsSourceId,
            geoJSON: .featureCollection(FeatureCollection(features: labelFeatures))
        )

        // Add dashed line layer
        if !mapView.mapboxMap.layerExists(withId: Self.localSpaceLayerId) {
            var layer = LineLayer(id: Self.localSpaceLayerId, source: Self.localSpaceSourceId)
            layer.lineColor = .expression(Exp(.get) { "color" })
            layer.lineWidth = .constant(2.5)
            layer.lineDasharray = .constant([8, 4])
            layer.lineOpacity = .constant(0.85)
            do {
                try mapView.mapboxMap.addLayer(layer)
            } catch {
                logger.error("Failed to add local space layer: \(error)")
            }
        }

        // Add text label layer (planet symbol + direction, e.g. "☉ NE")
        if !mapView.mapboxMap.layerExists(withId: Self.localSpaceLabelsLayerId) {
            var labelLayer = SymbolLayer(id: Self.localSpaceLabelsLayerId, source: Self.localSpaceLabelsSourceId)
            labelLayer.filter = Exp(.has) { "label" }
            labelLayer.textField = .expression(Exp(.get) { "label" })
            labelLayer.textSize = .constant(11)
            labelLayer.textColor = .expression(Exp(.get) { "color" })
            labelLayer.textHaloColor = .constant(StyleColor(UIColor.black.withAlphaComponent(0.7)))
            labelLayer.textHaloWidth = .constant(1.5)
            labelLayer.textFont = .constant(["DIN Pro Medium", "Arial Unicode MS Regular"])
            labelLayer.textAllowOverlap = .constant(false)
            labelLayer.textIgnorePlacement = .constant(false)
            labelLayer.textOffset = .constant([0, 1.2])
            labelLayer.symbolPlacement = .constant(.point)
            do {
                try mapView.mapboxMap.addLayer(labelLayer)
            } catch {
                logger.error("Failed to add local space labels layer: \(error)")
            }
        }

        // Add glyph icon layer (circular planet icons near line start)
        if !mapView.mapboxMap.layerExists(withId: Self.localSpaceGlyphLayerId) {
            var glyphLayer = SymbolLayer(id: Self.localSpaceGlyphLayerId, source: Self.localSpaceLabelsSourceId)
            glyphLayer.filter = Exp(.has) { "imageId" }
            glyphLayer.iconImage = .expression(Exp(.get) { "imageId" })
            glyphLayer.iconSize = .constant(1.0)
            glyphLayer.iconAllowOverlap = .constant(true)
            glyphLayer.iconIgnorePlacement = .constant(true)
            do {
                try mapView.mapboxMap.addLayer(glyphLayer)
            } catch {
                logger.error("Failed to add local space glyph layer: \(error)")
            }
        }

        // Radius boundary circle
        updateLocalSpaceRadiusCircle(mapView)
    }

    /// Draw a circle boundary around the local space center
    private func updateLocalSpaceRadiusCircle(_ mapView: MapView) {
        // Ensure source exists
        if !mapView.mapboxMap.sourceExists(withId: Self.localSpaceRadiusSourceId) {
            var source = GeoJSONSource(id: Self.localSpaceRadiusSourceId)
            source.data = .featureCollection(FeatureCollection(features: []))
            do {
                try mapView.mapboxMap.addSource(source)
            } catch {
                logger.error("Failed to create radius source: \(error)")
                return
            }
        }

        // Generate circle polygon or clear
        var features: [Feature] = []
        if let center = localSpaceCenter, localSpaceRadiusKm > 0 {
            let coords = generateCircleCoordinates(
                center: CLLocationCoordinate2D(latitude: center.latitude, longitude: center.longitude),
                radiusKm: localSpaceRadiusKm,
                points: 72
            )
            let ring = Ring(coordinates: coords + [coords[0]])
            let polygon = Polygon(outerRing: ring)
            features.append(Feature(geometry: .polygon(polygon)))
        }

        mapView.mapboxMap.updateGeoJSONSource(
            withId: Self.localSpaceRadiusSourceId,
            geoJSON: .featureCollection(FeatureCollection(features: features))
        )

        // Semi-transparent fill
        if !mapView.mapboxMap.layerExists(withId: Self.localSpaceRadiusFillLayerId) {
            var fillLayer = FillLayer(id: Self.localSpaceRadiusFillLayerId, source: Self.localSpaceRadiusSourceId)
            fillLayer.fillColor = .constant(StyleColor(UIColor(red: 1, green: 0.6, blue: 0, alpha: 0.06)))
            do {
                try mapView.mapboxMap.addLayer(fillLayer)
            } catch {
                logger.error("Failed to add radius fill: \(error)")
            }
        }

        // Dashed stroke outline
        if !mapView.mapboxMap.layerExists(withId: Self.localSpaceRadiusLayerId) {
            var strokeLayer = LineLayer(id: Self.localSpaceRadiusLayerId, source: Self.localSpaceRadiusSourceId)
            strokeLayer.lineColor = .constant(StyleColor(UIColor(red: 1, green: 0.6, blue: 0, alpha: 0.6)))
            strokeLayer.lineWidth = .constant(2.0)
            strokeLayer.lineDasharray = .constant([6, 4])
            do {
                try mapView.mapboxMap.addLayer(strokeLayer)
            } catch {
                logger.error("Failed to add radius stroke: \(error)")
            }
        }
    }

    /// Generate circle polygon coordinates using Haversine destination formula
    private func generateCircleCoordinates(center: CLLocationCoordinate2D, radiusKm: Double, points: Int) -> [CLLocationCoordinate2D] {
        let earthRadius = 6371.0
        let angDist = radiusKm / earthRadius
        let latR = center.latitude * .pi / 180
        let lngR = center.longitude * .pi / 180

        return (0..<points).map { i in
            let bearing = Double(i) * 2.0 * .pi / Double(points)
            let lat = asin(sin(latR) * cos(angDist) + cos(latR) * sin(angDist) * cos(bearing))
            let lng = lngR + atan2(sin(bearing) * sin(angDist) * cos(latR),
                                   cos(angDist) - sin(latR) * sin(lat))
            return CLLocationCoordinate2D(latitude: lat * 180 / .pi, longitude: lng * 180 / .pi)
        }
    }

    // MARK: - Aspect Lines

    private func updateAspectLines(_ mapView: MapView, context: Context) {
        // Hide aspect lines in local space mode
        if !localSpaceLines.isEmpty {
            if mapView.mapboxMap.sourceExists(withId: Self.aspectSourceId) {
                mapView.mapboxMap.updateGeoJSONSource(withId: Self.aspectSourceId, geoJSON: .featureCollection(FeatureCollection(features: [])))
            }
            return
        }
        // Debug: Log aspect line status
        logger.debug("[AspectLines] showHarmonious=\(lineVisibility.showHarmoniousAspects), showDisharmonious=\(lineVisibility.showDisharmoniousAspects), count=\(aspectLines.count)")

        // Always store aspect lines in coordinator for tap detection
        context.coordinator.currentAspectLines = aspectLines

        // Filter aspect lines based on visibility settings
        let filteredAspects = aspectLines.filter { line in
            if line.isHarmonious {
                return lineVisibility.showHarmoniousAspects
            } else {
                return lineVisibility.showDisharmoniousAspects
            }
        }

        guard !filteredAspects.isEmpty else {
            // Remove layers and clear source when hidden
            if !lineVisibility.showAspects {
                logger.debug("[AspectLines] Hidden - no aspect types enabled")
            }
            if aspectLines.isEmpty {
                logger.debug("[AspectLines] Empty array - no aspect lines to render")
            }
            removeLayerIfExists(mapView, layerId: Self.aspectLayerId)
            removeLayerIfExists(mapView, layerId: Self.aspectGlowLayerId)
            mapView.mapboxMap.updateGeoJSONSource(
                withId: Self.aspectSourceId,
                geoJSON: .featureCollection(FeatureCollection(features: []))
            )
            return
        }

        var features: [Feature] = []

        for line in filteredAspects {
            let coordinates = line.coordinates.map {
                CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude)
            }
            guard coordinates.count >= 2 else { continue }

            let lineString = LineString(coordinates)
            var feature = Feature(geometry: .lineString(lineString))
            feature.identifier = .string(line.id)

            // Get planet color hex for the inner dashed line
            let planetColorHex = colorToHex(planetColor(line.planet))

            feature.properties = [
                "id": .string(line.id),
                "color": .string(line.color),
                "planetColor": .string(planetColorHex),
                "planet": .string(line.planet.rawValue),
                "aspectType": .string(line.aspectType),
                "isHarmonious": .boolean(line.isHarmonious)
            ]
            features.append(feature)
        }

        let featureCollection = FeatureCollection(features: features)
        mapView.mapboxMap.updateGeoJSONSource(
            withId: Self.aspectSourceId,
            geoJSON: .featureCollection(featureCollection)
        )

        // Layer 1: Outer glow layer (green/orange based on harmonious)
        if !mapView.mapboxMap.layerExists(withId: Self.aspectGlowLayerId) {
            var glowLayer = LineLayer(id: Self.aspectGlowLayerId, source: Self.aspectSourceId)

            // Green for harmonious, orange for challenging
            glowLayer.lineColor = .expression(
                Exp(.match) {
                    Exp(.get) { "isHarmonious" }
                    true
                    "#22C55E"  // Green for harmonious (trine/sextile)
                    "#F97316"  // Orange for challenging (square)
                }
            )
            glowLayer.lineWidth = .constant(4.0)  // Wider for glow effect
            glowLayer.lineOpacity = .constant(0.4)
            glowLayer.lineBlur = .constant(2.0)  // Blur for glow effect
            glowLayer.lineCap = .constant(.round)
            glowLayer.lineJoin = .constant(.round)

            do {
                try mapView.mapboxMap.addLayer(glowLayer)
            } catch {
                logger.error("Failed to add aspect glow layer: \(error.localizedDescription)")
            }
        }

        // Layer 2: Inner dashed line (planet color)
        if !mapView.mapboxMap.layerExists(withId: Self.aspectLayerId) {
            var lineLayer = LineLayer(id: Self.aspectLayerId, source: Self.aspectSourceId)

            // Use planet color for the inner dashed line
            lineLayer.lineColor = .expression(Exp(.get) { "planetColor" })
            lineLayer.lineWidth = .constant(1.5)
            lineLayer.lineOpacity = .constant(0.9)
            lineLayer.lineDasharray = .constant([4, 3])
            lineLayer.lineCap = .constant(.round)
            lineLayer.lineJoin = .constant(.round)

            do {
                try mapView.mapboxMap.addLayer(lineLayer)
            } catch {
                logger.error("Failed to add aspect line layer: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Paran Points

    /// Paran marker image prefix
    private static let paranImagePrefix = "paran-split-"

    /// Renders paran crossing points as split-circle markers (half planet1, half planet2).
    /// Each paran point shows where two planetary lines cross at a specific lat/lng.
    private func updateParanLines(_ mapView: MapView, context: Context) {
        // Store current paran lines in coordinator for tap detection
        context.coordinator.currentParanLines = paranLines

        // Hide paran lines in local space mode
        guard localSpaceLines.isEmpty else { return }

        guard lineVisibility.showParans, !paranLines.isEmpty else {
            removeLayerIfExists(mapView, layerId: Self.paranLayerId)
            mapView.mapboxMap.updateGeoJSONSource(
                withId: Self.paranSourceId,
                geoJSON: .featureCollection(FeatureCollection(features: []))
            )
            return
        }

        var features: [Feature] = []

        for paran in paranLines {
            // Only render parans that have a longitude (crossing point)
            guard let longitude = paran.longitude else {
                logger.debug("[Paran] Skipping paran without longitude: \(paran.planet1)/\(paran.planet2)")
                continue
            }

            let point = Point(CLLocationCoordinate2D(
                latitude: paran.latitude,
                longitude: longitude
            ))

            var feature = Feature(geometry: .point(point))
            feature.identifier = .string(paran.id)

            // Generate split-circle image for this paran
            let imageId = "\(Self.paranImagePrefix)\(paran.planet1)-\(paran.planet2)"
            addSplitCircleImage(
                mapView: mapView,
                imageId: imageId,
                color1: planetColorForName(paran.planet1),
                color2: planetColorForName(paran.planet2)
            )

            feature.properties = [
                "id": .string(paran.id),
                "imageId": .string(imageId),
                "planet1": .string(paran.planet1),
                "planet2": .string(paran.planet2),
                "angle1": .string(paran.angle1),
                "angle2": .string(paran.angle2)
            ]
            features.append(feature)
        }

        logger.debug("[Paran] Rendering \(features.count) paran crossing points")

        let featureCollection = FeatureCollection(features: features)
        mapView.mapboxMap.updateGeoJSONSource(
            withId: Self.paranSourceId,
            geoJSON: .featureCollection(featureCollection)
        )

        // Create SymbolLayer for paran crossing points (split-circle icons)
        if !mapView.mapboxMap.layerExists(withId: Self.paranLayerId) {
            var symbolLayer = SymbolLayer(id: Self.paranLayerId, source: Self.paranSourceId)

            // Use the pre-generated split-circle image
            symbolLayer.iconImage = .expression(Exp(.get) { "imageId" })
            symbolLayer.iconSize = .expression(
                Exp(.interpolate) {
                    Exp(.linear)
                    Exp(.zoom)
                    0
                    0.4
                    5
                    0.6
                    10
                    0.8
                }
            )
            symbolLayer.iconAllowOverlap = .constant(true)
            symbolLayer.iconIgnorePlacement = .constant(true)

            do {
                try mapView.mapboxMap.addLayer(symbolLayer)
            } catch {
                logger.error("Failed to add paran point layer: \(error.localizedDescription)")
            }
        }
    }

    /// Creates a split-circle image with two half-circles in different colors
    private func addSplitCircleImage(mapView: MapView, imageId: String, color1: UIColor, color2: UIColor) {
        // Check if image already exists
        if mapView.mapboxMap.imageExists(withId: imageId) {
            return
        }

        let size: CGFloat = 40
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: size, height: size))

        let image = renderer.image { ctx in
            let rect = CGRect(origin: .zero, size: CGSize(width: size, height: size))
            let center = CGPoint(x: size / 2, y: size / 2)
            let radius = size / 2 - 2  // Leave room for stroke

            // Draw left half (planet1)
            ctx.cgContext.setFillColor(color1.cgColor)
            ctx.cgContext.move(to: center)
            ctx.cgContext.addArc(
                center: center,
                radius: radius,
                startAngle: .pi / 2,
                endAngle: 3 * .pi / 2,
                clockwise: false
            )
            ctx.cgContext.closePath()
            ctx.cgContext.fillPath()

            // Draw right half (planet2)
            ctx.cgContext.setFillColor(color2.cgColor)
            ctx.cgContext.move(to: center)
            ctx.cgContext.addArc(
                center: center,
                radius: radius,
                startAngle: 3 * .pi / 2,
                endAngle: .pi / 2,
                clockwise: false
            )
            ctx.cgContext.closePath()
            ctx.cgContext.fillPath()

            // Draw white border
            ctx.cgContext.setStrokeColor(UIColor.white.cgColor)
            ctx.cgContext.setLineWidth(2)
            ctx.cgContext.addEllipse(in: rect.insetBy(dx: 2, dy: 2))
            ctx.cgContext.strokePath()

            // Draw center divider line
            ctx.cgContext.setStrokeColor(UIColor.white.withAlphaComponent(0.8).cgColor)
            ctx.cgContext.setLineWidth(1)
            ctx.cgContext.move(to: CGPoint(x: size / 2, y: 2))
            ctx.cgContext.addLine(to: CGPoint(x: size / 2, y: size - 2))
            ctx.cgContext.strokePath()
        }

        do {
            try mapView.mapboxMap.addImage(image, id: imageId)
        } catch {
            logger.error("Failed to add paran split-circle image: \(error.localizedDescription)")
        }
    }

    /// Get UIColor for a planet name string
    private func planetColorForName(_ name: String) -> UIColor {
        if let planet = Planet(rawValue: name) {
            return planetColor(planet)
        }
        return .gray
    }

    // MARK: - Line Labels

    /// Place planet symbol + line type labels at midpoints of visible lines.
    /// Controlled by lineVisibility.showLineLabels toggle.
    private func updateLineLabels(_ mapView: MapView) {
        guard lineVisibility.showLineLabels else {
            removeLayerIfExists(mapView, layerId: Self.lineLabelsLayerId)
            removeLayerIfExists(mapView, layerId: Self.transitLineLabelsLayerId)
            if mapView.mapboxMap.sourceExists(withId: Self.lineLabelsSourceId) {
                mapView.mapboxMap.updateGeoJSONSource(
                    withId: Self.lineLabelsSourceId,
                    geoJSON: .featureCollection(FeatureCollection(features: []))
                )
            }
            return
        }

        var features: [Feature] = []

        // Natal line labels
        for line in astroLines {
            guard lineVisibility.isVisible(line) else { continue }
            guard !line.coordinates.isEmpty else { continue }

            // Place label at ~40% of line length for visual variety
            let midIdx = line.coordinates.count * 2 / 5
            let coord = line.coordinates[min(midIdx, line.coordinates.count - 1)]
            let point = Point(CLLocationCoordinate2D(latitude: coord.latitude, longitude: coord.longitude))

            var feature = Feature(geometry: .point(point))
            let label = "\(line.planet.symbol) \(line.lineType.shortName)"
            let color = colorToHex(planetColor(line.planet))
            feature.properties = [
                "label": .string(label),
                "color": .string(color),
                "isTransit": .boolean(false),
            ]
            features.append(feature)
        }

        // Transit line labels (with "T" prefix)
        for line in transitLines {
            guard lineVisibility.isVisible(line) else { continue }
            guard !line.coordinates.isEmpty else { continue }

            let midIdx = line.coordinates.count * 3 / 5 // Offset from natal label position
            let coord = line.coordinates[min(midIdx, line.coordinates.count - 1)]
            let point = Point(CLLocationCoordinate2D(latitude: coord.latitude, longitude: coord.longitude))

            var feature = Feature(geometry: .point(point))
            let label = "T \(line.planet.symbol) \(line.lineType.shortName)"
            let color = colorToHex(planetColor(line.planet))
            feature.properties = [
                "label": .string(label),
                "color": .string(color),
                "isTransit": .boolean(true),
            ]
            features.append(feature)
        }

        if mapView.mapboxMap.sourceExists(withId: Self.lineLabelsSourceId) {
            mapView.mapboxMap.updateGeoJSONSource(
                withId: Self.lineLabelsSourceId,
                geoJSON: .featureCollection(FeatureCollection(features: features))
            )
        }

        // Symbol layer for labels
        if !mapView.mapboxMap.layerExists(withId: Self.lineLabelsLayerId) {
            var labelLayer = SymbolLayer(id: Self.lineLabelsLayerId, source: Self.lineLabelsSourceId)
            labelLayer.textField = .expression(Exp(.get) { "label" })
            labelLayer.textSize = .constant(11)
            labelLayer.textColor = .expression(Exp(.get) { "color" })
            labelLayer.textHaloColor = .constant(StyleColor(UIColor.black.withAlphaComponent(0.7)))
            labelLayer.textHaloWidth = .constant(1.5)
            labelLayer.textFont = .constant(["DIN Pro Medium", "Arial Unicode MS Regular"])
            labelLayer.textAllowOverlap = .constant(false)
            labelLayer.textIgnorePlacement = .constant(false)
            labelLayer.textOffset = .constant([0, 1.2]) // Offset below the line
            labelLayer.symbolPlacement = .constant(.point)
            do {
                try mapView.mapboxMap.addLayer(labelLayer)
            } catch {
                logger.error("Failed to add line labels layer: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Transit Lines

    /// Render transit lines matching web: per-planet colors, 0.5 opacity for planetary,
    /// 0.35 opacity for aspects. MC/ASC solid, IC dashed [4,2], DSC dashed [2,2].
    private func updateTransitLines(_ mapView: MapView, context: Context) {
        // Store transit paran lines in coordinator for tap detection
        context.coordinator.currentTransitParanLines = transitParanLines

        let hasTransit = !transitLines.isEmpty || !transitAspectLines.isEmpty || !transitParanLines.isEmpty

        guard hasTransit else {
            removeLayerIfExists(mapView, layerId: Self.transitLayerId)
            removeLayerIfExists(mapView, layerId: Self.transitDashedLayerId)
            removeLayerIfExists(mapView, layerId: "transit-aspect-lines-layer")
            removeLayerIfExists(mapView, layerId: Self.transitHitLayerId)
            removeLayerIfExists(mapView, layerId: Self.transitDashedHitLayerId)
            removeLayerIfExists(mapView, layerId: Self.transitAspectHitLayerId)
            removeLayerIfExists(mapView, layerId: "transit-paran-lines-layer")
            if mapView.mapboxMap.sourceExists(withId: Self.transitSourceId) {
                mapView.mapboxMap.updateGeoJSONSource(
                    withId: Self.transitSourceId,
                    geoJSON: .featureCollection(FeatureCollection(features: []))
                )
            }
            return
        }

        var features: [Feature] = []

        // Planetary transit lines — per-planet colors, split by line type
        for line in transitLines {
            guard lineVisibility.isVisible(line) else { continue }

            let coordinates = line.coordinates.map {
                CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude)
            }

            // Split ASC/DSC at discontinuities (same as natal)
            let segments: [[CLLocationCoordinate2D]]
            if line.lineType == .ascendant || line.lineType == .descendant {
                segments = splitAtDiscontinuities(coordinates, latThreshold: 60)
            } else {
                segments = [coordinates]
            }

            let geometry: Geometry
            if segments.count > 1 {
                geometry = .multiLineString(MultiLineString(segments))
            } else {
                geometry = .lineString(LineString(segments[0]))
            }

            var feature = Feature(geometry: geometry)
            let color = colorToHex(planetColor(line.planet))

            // Classify: "solid" (MC/ASC) vs "dashed" (IC/DSC) for separate layer styling
            let isSolid = line.lineType == .midheaven || line.lineType == .ascendant
            let transitId = "transit-\(line.planet.rawValue)-\(line.lineType.rawValue)"
            feature.properties = [
                "id": .string(transitId),
                "planet": .string(line.planet.rawValue),
                "lineType": .string(line.lineType.rawValue),
                "color": .string(color),
                "layerType": .string(isSolid ? "solid" : "dashed"),
                "isTransit": .boolean(true),
            ]
            features.append(feature)
        }

        // Aspect transit lines — per-planet color (NOT green/orange)
        for aspect in transitAspectLines {
            let coordinates = aspect.coordinates.map {
                CLLocationCoordinate2D(latitude: $0.latitude, longitude: $0.longitude)
            }
            var feature = Feature(geometry: .lineString(LineString(coordinates)))
            let color = colorToHex(planetColor(aspect.planet))
            feature.properties = [
                "id": .string("transit-aspect-\(aspect.planet.rawValue)-\(aspect.id)"),
                "planet": .string(aspect.planet.rawValue),
                "color": .string(color),
                "layerType": .string("aspect"),
                "isTransit": .boolean(true),
            ]
            features.append(feature)
        }

        // Transit paran lines — latitude circles at 0.5 opacity, [4,4] dash (matching web)
        for paran in transitParanLines {
            guard paran.longitude != nil else { continue }
            let coords = latitudeCircleCoords(paran.latitude)
            let color = planetColorHex(paran.planet1)
            var feature = Feature(geometry: .lineString(LineString(coords)))
            feature.properties = [
                "id": .string("transit-paran-\(paran.id)"),
                "planet": .string(paran.planet1),
                "color": .string(color),
                "layerType": .string("paran"),
                "isTransit": .boolean(true),
            ]
            features.append(feature)
        }

        if mapView.mapboxMap.sourceExists(withId: Self.transitSourceId) {
            mapView.mapboxMap.updateGeoJSONSource(
                withId: Self.transitSourceId,
                geoJSON: .featureCollection(FeatureCollection(features: features))
            )
        }

        // Transit paran layer — dashed latitude circles
        let transitParanLayerId = "transit-paran-lines-layer"
        if !features.isEmpty && !mapView.mapboxMap.layerExists(withId: transitParanLayerId) {
            var paranLayer = LineLayer(id: transitParanLayerId, source: Self.transitSourceId)
            paranLayer.lineColor = .expression(Exp(.get) { "color" })
            paranLayer.lineWidth = .constant(1.0)
            paranLayer.lineOpacity = .constant(0.5)
            paranLayer.lineDasharray = .constant([4, 4])
            paranLayer.filter = Exp(.eq) { Exp(.get) { "layerType" }; "paran" }
            do { try mapView.mapboxMap.addLayer(paranLayer) } catch {}
        }

        // Layer 1: Transit solid lines (MC/ASC) — per-planet color, 0.5 opacity
        if !mapView.mapboxMap.layerExists(withId: Self.transitLayerId) {
            var solidLayer = LineLayer(id: Self.transitLayerId, source: Self.transitSourceId)
            solidLayer.lineColor = .expression(Exp(.get) { "color" })
            solidLayer.lineWidth = .constant(2.5)
            solidLayer.lineOpacity = .constant(0.5)
            solidLayer.lineCap = .constant(.round)
            solidLayer.lineJoin = .constant(.round)
            solidLayer.filter = Exp(.eq) { Exp(.get) { "layerType" }; "solid" }
            do {
                try mapView.mapboxMap.addLayer(solidLayer)
            } catch {
                logger.error("Failed to add transit solid layer: \(error.localizedDescription)")
            }
        }

        // Layer 2: Transit dashed lines (IC/DSC) — per-planet color, 0.5 opacity, [4,2] dash
        if !mapView.mapboxMap.layerExists(withId: Self.transitDashedLayerId) {
            var dashedLayer = LineLayer(id: Self.transitDashedLayerId, source: Self.transitSourceId)
            dashedLayer.lineColor = .expression(Exp(.get) { "color" })
            dashedLayer.lineWidth = .constant(2.5)
            dashedLayer.lineOpacity = .constant(0.5)
            dashedLayer.lineDasharray = .constant([4, 2])
            dashedLayer.lineCap = .constant(.round)
            dashedLayer.lineJoin = .constant(.round)
            dashedLayer.filter = Exp(.eq) { Exp(.get) { "layerType" }; "dashed" }
            do {
                try mapView.mapboxMap.addLayer(dashedLayer)
            } catch {
                logger.error("Failed to add transit dashed layer: \(error.localizedDescription)")
            }
        }

        // Layer 3: Transit aspect lines — per-planet color, 0.35 opacity, [3,3] dash, width 1
        let transitAspectLayerId = "transit-aspect-lines-layer"
        if !mapView.mapboxMap.layerExists(withId: transitAspectLayerId) {
            var aspectLayer = LineLayer(id: transitAspectLayerId, source: Self.transitSourceId)
            aspectLayer.lineColor = .expression(Exp(.get) { "color" })
            aspectLayer.lineWidth = .constant(1.0)
            aspectLayer.lineOpacity = .constant(0.35)
            aspectLayer.lineDasharray = .constant([3, 3])
            aspectLayer.filter = Exp(.eq) { Exp(.get) { "layerType" }; "aspect" }
            do {
                try mapView.mapboxMap.addLayer(aspectLayer)
            } catch {
                logger.error("Failed to add transit aspect layer: \(error.localizedDescription)")
            }
        }

        // Hit layers — invisible wide lines for tap detection (matching web: 20px, 0.01 opacity)
        if !mapView.mapboxMap.layerExists(withId: Self.transitHitLayerId) {
            var hitLayer = LineLayer(id: Self.transitHitLayerId, source: Self.transitSourceId)
            hitLayer.lineColor = .expression(Exp(.get) { "color" })
            hitLayer.lineWidth = .constant(20)
            hitLayer.lineOpacity = .constant(0.001)
            hitLayer.lineCap = .constant(.round)
            hitLayer.lineJoin = .constant(.round)
            hitLayer.filter = Exp(.eq) { Exp(.get) { "layerType" }; "solid" }
            do { try mapView.mapboxMap.addLayer(hitLayer) } catch {}
        }

        if !mapView.mapboxMap.layerExists(withId: Self.transitDashedHitLayerId) {
            var hitLayer = LineLayer(id: Self.transitDashedHitLayerId, source: Self.transitSourceId)
            hitLayer.lineColor = .expression(Exp(.get) { "color" })
            hitLayer.lineWidth = .constant(20)
            hitLayer.lineOpacity = .constant(0.01)
            hitLayer.lineCap = .constant(.round)
            hitLayer.lineJoin = .constant(.round)
            hitLayer.filter = Exp(.eq) { Exp(.get) { "layerType" }; "dashed" }
            do { try mapView.mapboxMap.addLayer(hitLayer) } catch {}
        }

        if !mapView.mapboxMap.layerExists(withId: Self.transitAspectHitLayerId) {
            var hitLayer = LineLayer(id: Self.transitAspectHitLayerId, source: Self.transitSourceId)
            hitLayer.lineColor = .expression(Exp(.get) { "color" })
            hitLayer.lineWidth = .constant(16)
            hitLayer.lineOpacity = .constant(0.01)
            hitLayer.filter = Exp(.eq) { Exp(.get) { "layerType" }; "aspect" }
            do { try mapView.mapboxMap.addLayer(hitLayer) } catch {}
        }
    }

    // MARK: - Paran Latitude Lines

    /// Generate a full latitude circle as coordinates (72 steps, matching web)
    private func latitudeCircleCoords(_ latitude: Double) -> [CLLocationCoordinate2D] {
        stride(from: -180.0, through: 180.0, by: 5.0).map {
            CLLocationCoordinate2D(latitude: latitude, longitude: $0)
        }
    }

    /// Render ambient paran latitude circles for ALL visible parans + highlighted selected paran.
    /// Matches web: ambient = 1px [4,4] dash in planet1 color; selected = two-tone overlapping lines.
    private func updateParanLatitudeLine(_ mapView: MapView) {
        // --- 1. Ambient latitude circles for all parans ---
        if lineVisibility.showParans && !paranLines.isEmpty {
            var ambientFeatures: [Feature] = []
            // De-duplicate by rounded latitude to avoid overlapping lines
            var processedLats = Set<Int>()
            for paran in paranLines {
                guard paran.longitude != nil else { continue }
                let latKey = Int(paran.latitude * 10) // round to 0.1°
                guard !processedLats.contains(latKey) else { continue }
                processedLats.insert(latKey)

                let coords = latitudeCircleCoords(paran.latitude)
                let color = planetColorHex(paran.planet1)
                var feature = Feature(geometry: .lineString(LineString(coords)))
                feature.properties = [
                    "color": .string(color),
                ]
                ambientFeatures.append(feature)
            }

            mapView.mapboxMap.updateGeoJSONSource(
                withId: Self.paranAmbientSourceId,
                geoJSON: .featureCollection(FeatureCollection(features: ambientFeatures))
            )

            if !mapView.mapboxMap.layerExists(withId: Self.paranAmbientLayerId) {
                var lineLayer = LineLayer(id: Self.paranAmbientLayerId, source: Self.paranAmbientSourceId)
                lineLayer.lineColor = .expression(Exp(.get) { "color" })
                lineLayer.lineOpacity = .constant(0.5)
                lineLayer.lineWidth = .constant(1.0)
                lineLayer.lineDasharray = .constant([4, 4])
                do {
                    try mapView.mapboxMap.addLayer(lineLayer)
                } catch {
                    logger.error("Failed to add paran ambient layer: \(error.localizedDescription)")
                }
            }
        } else {
            removeLayerIfExists(mapView, layerId: Self.paranAmbientLayerId)
            mapView.mapboxMap.updateGeoJSONSource(
                withId: Self.paranAmbientSourceId,
                geoJSON: .featureCollection(FeatureCollection(features: []))
            )
        }

        // --- 2. Selected paran highlight (two-tone overlapping lines at same latitude) ---
        guard let paran = selectedParanPoint else {
            mapView.mapboxMap.updateGeoJSONSource(
                withId: Self.paranLatSourceId,
                geoJSON: .featureCollection(FeatureCollection(features: []))
            )
            removeLayerIfExists(mapView, layerId: Self.paranLatLayerId)
            removeLayerIfExists(mapView, layerId: Self.paranLatLayer2Id)
            return
        }

        let coords = latitudeCircleCoords(paran.latitude)
        let color1 = planetColorHex(paran.planet1)
        let color2 = planetColorHex(paran.planet2)

        // Planet1 line: 2.5px, [6, 3] dash (matches web)
        var feature1 = Feature(geometry: .lineString(LineString(coords)))
        feature1.properties = [
            "color": .string(color1),
            "lineIndex": .number(1),
        ]

        // Planet2 line: 2.0px, [3, 6] dash (inverted — creates two-tone stripe effect)
        var feature2 = Feature(geometry: .lineString(LineString(coords)))
        feature2.properties = [
            "color": .string(color2),
            "lineIndex": .number(2),
        ]

        mapView.mapboxMap.updateGeoJSONSource(
            withId: Self.paranLatSourceId,
            geoJSON: .featureCollection(FeatureCollection(features: [feature1, feature2]))
        )

        // Layer 1: planet1 color, 2.5px, [6, 3] dash
        if !mapView.mapboxMap.layerExists(withId: Self.paranLatLayerId) {
            var lineLayer = LineLayer(id: Self.paranLatLayerId, source: Self.paranLatSourceId)
            lineLayer.lineColor = .expression(Exp(.get) { "color" })
            lineLayer.lineOpacity = .constant(1.0)
            lineLayer.lineWidth = .constant(2.5)
            lineLayer.lineDasharray = .constant([6, 3])
            lineLayer.filter = Exp(.eq) { Exp(.get) { "lineIndex" }; 1 }
            do {
                try mapView.mapboxMap.addLayer(lineLayer)
            } catch {
                logger.error("Failed to add paran highlight layer 1: \(error.localizedDescription)")
            }
        }

        // Layer 2: planet2 color, 2.0px, [3, 6] dash (inverted)
        if !mapView.mapboxMap.layerExists(withId: Self.paranLatLayer2Id) {
            var lineLayer2 = LineLayer(id: Self.paranLatLayer2Id, source: Self.paranLatSourceId)
            lineLayer2.lineColor = .expression(Exp(.get) { "color" })
            lineLayer2.lineOpacity = .constant(1.0)
            lineLayer2.lineWidth = .constant(2.0)
            lineLayer2.lineDasharray = .constant([3, 6])
            lineLayer2.filter = Exp(.eq) { Exp(.get) { "lineIndex" }; 2 }
            do {
                try mapView.mapboxMap.addLayer(lineLayer2)
            } catch {
                logger.error("Failed to add paran highlight layer 2: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Nakshatra Bands

    /// Render 27 nakshatra meridian bands on the globe.
    /// Each band is a vertical strip from -85° to +85° lat, colored by ruling planet.
    /// Matches web's nakshatra rendering: fill (subtle) + cusp lines + pada subdivision lines.
    private func updateNakshatraBands(_ mapView: MapView) {
        let visible = lineVisibility.showNakshatraBands && !nakshatraData.isEmpty

        guard visible else {
            // Clear all nakshatra layers
            removeLayerIfExists(mapView, layerId: Self.nakshatraFillLayerId)
            removeLayerIfExists(mapView, layerId: Self.nakshatraCuspLayerId)
            removeLayerIfExists(mapView, layerId: Self.nakshatraPadaLayerId)
            mapView.mapboxMap.updateGeoJSONSource(
                withId: Self.nakshatraSourceId,
                geoJSON: .featureCollection(FeatureCollection(features: []))
            )
            return
        }

        var features: [Feature] = []
        let latBound = 85.0

        for band in nakshatraData {
            let startLng = band.startLng
            let endLng = band.endLng
            let color = band.nakshatra.color

            // --- Fill polygon (subtle band background) ---
            let polygon = nakshatraBandPolygon(startLng: startLng, endLng: endLng, latBound: latBound)
            var fillFeature = Feature(geometry: polygon)
            fillFeature.properties = [
                "subtype": .string("fill"),
                "color": .string(color),
                "name": .string(band.nakshatra.name),
            ]
            features.append(fillFeature)

            // --- Cusp line (band start boundary) ---
            let cuspCoords = stride(from: -latBound, through: latBound, by: 5.0).map {
                CLLocationCoordinate2D(latitude: $0, longitude: startLng)
            }
            var cuspFeature = Feature(geometry: .lineString(LineString(cuspCoords)))
            cuspFeature.properties = [
                "subtype": .string("cusp"),
                "color": .string(color),
            ]
            features.append(cuspFeature)

            // --- Pada subdivision lines (3 internal boundaries) ---
            for padaLng in band.padaLngs {
                let padaCoords = stride(from: -latBound, through: latBound, by: 5.0).map {
                    CLLocationCoordinate2D(latitude: $0, longitude: padaLng)
                }
                var padaFeature = Feature(geometry: .lineString(LineString(padaCoords)))
                padaFeature.properties = [
                    "subtype": .string("pada"),
                    "color": .string(color),
                ]
                features.append(padaFeature)
            }
        }

        mapView.mapboxMap.updateGeoJSONSource(
            withId: Self.nakshatraSourceId,
            geoJSON: .featureCollection(FeatureCollection(features: features))
        )

        // Fill layer (very subtle — opacity 0.06 matching web)
        if !mapView.mapboxMap.layerExists(withId: Self.nakshatraFillLayerId) {
            var fillLayer = FillLayer(id: Self.nakshatraFillLayerId, source: Self.nakshatraSourceId)
            fillLayer.fillColor = .expression(Exp(.get) { "color" })
            fillLayer.fillOpacity = .constant(0.06)
            fillLayer.filter = Exp(.eq) { Exp(.get) { "subtype" }; "fill" }
            do {
                // Add behind all other layers (nakshatra bands are background)
                try mapView.mapboxMap.addLayer(fillLayer, layerPosition: .at(0))
            } catch {
                logger.error("Failed to add nakshatra fill layer: \(error.localizedDescription)")
            }
        }

        // Cusp line layer (prominent band boundaries — opacity 0.55)
        if !mapView.mapboxMap.layerExists(withId: Self.nakshatraCuspLayerId) {
            var cuspLayer = LineLayer(id: Self.nakshatraCuspLayerId, source: Self.nakshatraSourceId)
            cuspLayer.lineColor = .expression(Exp(.get) { "color" })
            cuspLayer.lineOpacity = .constant(0.55)
            cuspLayer.lineWidth = .constant(1.5)
            cuspLayer.filter = Exp(.eq) { Exp(.get) { "subtype" }; "cusp" }
            do {
                try mapView.mapboxMap.addLayer(cuspLayer)
            } catch {
                logger.error("Failed to add nakshatra cusp layer: \(error.localizedDescription)")
            }
        }

        // Pada subdivision line layer (subtle dashed — opacity 0.3)
        if !mapView.mapboxMap.layerExists(withId: Self.nakshatraPadaLayerId) {
            var padaLayer = LineLayer(id: Self.nakshatraPadaLayerId, source: Self.nakshatraSourceId)
            padaLayer.lineColor = .expression(Exp(.get) { "color" })
            padaLayer.lineOpacity = .constant(0.3)
            padaLayer.lineWidth = .constant(0.7)
            padaLayer.lineDasharray = .constant([4, 4])
            padaLayer.filter = Exp(.eq) { Exp(.get) { "subtype" }; "pada" }
            do {
                try mapView.mapboxMap.addLayer(padaLayer)
            } catch {
                logger.error("Failed to add nakshatra pada layer: \(error.localizedDescription)")
            }
        }
    }

    /// Generate a polygon for a nakshatra band, handling antimeridian crossing.
    private func nakshatraBandPolygon(startLng: Double, endLng: Double, latBound: Double) -> Geometry {
        // Normalize both to [-180, 180]
        let s = ((startLng + 180).truncatingRemainder(dividingBy: 360)) - 180
        let e = ((endLng + 180).truncatingRemainder(dividingBy: 360)) - 180

        // Check if band crosses antimeridian
        let crosses = (s > e) && (s - e > 180 || (s > 0 && e < 0 && abs(s - e) > 13.5))

        if !crosses {
            // Simple rectangle
            let ring = [
                CLLocationCoordinate2D(latitude: -latBound, longitude: s),
                CLLocationCoordinate2D(latitude: latBound, longitude: s),
                CLLocationCoordinate2D(latitude: latBound, longitude: e),
                CLLocationCoordinate2D(latitude: -latBound, longitude: e),
                CLLocationCoordinate2D(latitude: -latBound, longitude: s),
            ]
            return .polygon(Polygon([ring]))
        } else {
            // Split into two polygons at ±180
            let ring1 = [
                CLLocationCoordinate2D(latitude: -latBound, longitude: s),
                CLLocationCoordinate2D(latitude: latBound, longitude: s),
                CLLocationCoordinate2D(latitude: latBound, longitude: 180),
                CLLocationCoordinate2D(latitude: -latBound, longitude: 180),
                CLLocationCoordinate2D(latitude: -latBound, longitude: s),
            ]
            let ring2 = [
                CLLocationCoordinate2D(latitude: -latBound, longitude: -180),
                CLLocationCoordinate2D(latitude: latBound, longitude: -180),
                CLLocationCoordinate2D(latitude: latBound, longitude: e),
                CLLocationCoordinate2D(latitude: -latBound, longitude: e),
                CLLocationCoordinate2D(latitude: -latBound, longitude: -180),
            ]
            return .multiPolygon(MultiPolygon([Polygon([ring1]), Polygon([ring2])]))
        }
    }

    // MARK: - Zenith Points

    /// Planet glyph mapping matching web ZENITH_GLYPHS
    private static let zenithGlyphs: [String: String] = [
        "Sun": "\u{2609}", "Moon": "\u{263D}", "Mercury": "\u{263F}", "Venus": "\u{2640}",
        "Mars": "\u{2642}", "Jupiter": "\u{2643}", "Saturn": "\u{2644}", "Uranus": "\u{2645}",
        "Neptune": "\u{2646}", "Pluto": "\u{2647}", "Chiron": "\u{26B7}",
        "NorthNode": "\u{260A}", "SouthNode": "\u{260B}",
    ]

    /// Zenith influence tiers matching web ZENITH_TIERS (km, fillOpacity, strokeOpacity)
    private static let zenithTiers: [(km: Double, fillOpacity: Double, strokeOpacity: Double)] = [
        (180, 0.12, 0.7),   // peak — Gaussian kernel σ
        (350, 0.06, 0.45),  // strong — LocationAnalysisCard boundary
        (500, 0.03, 0.25),  // moderate — DEFAULT_MAX_DISTANCE_KM
    ]

    private func updateZenithPoints(_ mapView: MapView, context: Context) {
        // Store current zenith points in coordinator for tap detection
        context.coordinator.currentZenithPoints = zenithPoints

        let visible = lineVisibility.showZeniths && !zenithPoints.isEmpty

        // --- 1. Point markers (colored circle + planet glyph via SymbolLayer) ---
        if !visible {
            removeLayerIfExists(mapView, layerId: Self.zenithLayerId)
            removeLayerIfExists(mapView, layerId: Self.zenithCirclesFillLayerId)
            removeLayerIfExists(mapView, layerId: Self.zenithCirclesStrokeLayerId)
            mapView.mapboxMap.updateGeoJSONSource(
                withId: Self.zenithSourceId,
                geoJSON: .featureCollection(FeatureCollection(features: []))
            )
            mapView.mapboxMap.updateGeoJSONSource(
                withId: Self.zenithCirclesSourceId,
                geoJSON: .featureCollection(FeatureCollection(features: []))
            )
            updateZenithBelt(mapView)
            return
        }

        // Build point features
        var pointFeatures: [Feature] = []
        for zenith in zenithPoints {
            let point = Point(CLLocationCoordinate2D(
                latitude: zenith.coordinate.latitude,
                longitude: zenith.coordinate.longitude
            ))
            var feature = Feature(geometry: .point(point))
            feature.identifier = .string(zenith.id)
            let color = colorToHex(planetColor(zenith.planet))
            let glyph = Self.zenithGlyphs[zenith.planet.rawValue] ?? "\u{2609}"
            let isSelected = selectedZenithPlanet == zenith.planet.rawValue
            feature.properties = [
                "id": .string(zenith.id),
                "planet": .string(zenith.planet.rawValue),
                "color": .string(color),
                "glyph": .string(glyph),
                "selected": .boolean(isSelected),
            ]
            pointFeatures.append(feature)
        }

        mapView.mapboxMap.updateGeoJSONSource(
            withId: Self.zenithSourceId,
            geoJSON: .featureCollection(FeatureCollection(features: pointFeatures))
        )

        // Register glyph images for each zenith planet (rendered from Unicode on device)
        for zenith in zenithPoints {
            let planetName = zenith.planet.rawValue
            let imageId = "zenith-glyph-\(planetName)"
            if !mapView.mapboxMap.imageExists(withId: imageId) {
                let glyph = Self.zenithGlyphs[planetName] ?? "\u{2609}"
                let planetUIColor = planetColor(zenith.planet)
                if let image = renderZenithGlyphImage(glyph: glyph, backgroundColor: planetUIColor, size: 26) {
                    try? mapView.mapboxMap.addImage(image, id: imageId, sdf: false)
                }
            }
        }

        // Single SymbolLayer for zenith markers (icon image per planet)
        if !mapView.mapboxMap.layerExists(withId: Self.zenithLayerId) {
            var symbolLayer = SymbolLayer(id: Self.zenithLayerId, source: Self.zenithSourceId)
            // Build expression: match planet name → "zenith-glyph-{planet}" image ID
            symbolLayer.iconImage = .expression(
                Exp(.concat) { "zenith-glyph-"; Exp(.get) { "planet" } }
            )
            symbolLayer.iconSize = .constant(1.0)
            symbolLayer.iconAllowOverlap = .constant(true)
            symbolLayer.iconIgnorePlacement = .constant(true)
            do {
                try mapView.mapboxMap.addLayer(symbolLayer)
            } catch {
                logger.error("Failed to add zenith symbol layer: \(error.localizedDescription)")
            }
        }

        // --- 2. Orb circles (concentric influence zones) ---
        updateZenithOrbCircles(mapView)

        // --- 3. Belt (declination band on tap) ---
        updateZenithBelt(mapView)
    }

    // MARK: - Zenith Orb Circles

    /// Generate circle polygon features around each zenith point at 3 distance tiers.
    private func updateZenithOrbCircles(_ mapView: MapView) {
        guard lineVisibility.showZeniths, !zenithPoints.isEmpty else {
            mapView.mapboxMap.updateGeoJSONSource(
                withId: Self.zenithCirclesSourceId,
                geoJSON: .featureCollection(FeatureCollection(features: []))
            )
            removeLayerIfExists(mapView, layerId: Self.zenithCirclesFillLayerId)
            removeLayerIfExists(mapView, layerId: Self.zenithCirclesStrokeLayerId)
            return
        }

        var features: [Feature] = []
        for zenith in zenithPoints {
            let center = CLLocationCoordinate2D(
                latitude: zenith.coordinate.latitude,
                longitude: zenith.coordinate.longitude
            )
            let color = colorToHex(planetColor(zenith.planet))

            for (tierIndex, tier) in Self.zenithTiers.enumerated() {
                let ring = generateCircle(center: center, radiusKm: tier.km, segments: 48)
                var feature = Feature(geometry: .polygon(Polygon([ring])))
                feature.properties = [
                    "color": .string(color),
                    "fillOpacity": .number(tier.fillOpacity),
                    "strokeOpacity": .number(tier.strokeOpacity),
                    "tier": .number(Double(tierIndex)),
                ]
                features.append(feature)
            }
        }

        mapView.mapboxMap.updateGeoJSONSource(
            withId: Self.zenithCirclesSourceId,
            geoJSON: .featureCollection(FeatureCollection(features: features))
        )

        // Fill layer
        if !mapView.mapboxMap.layerExists(withId: Self.zenithCirclesFillLayerId) {
            var fillLayer = FillLayer(id: Self.zenithCirclesFillLayerId, source: Self.zenithCirclesSourceId)
            fillLayer.fillColor = .expression(Exp(.get) { "color" })
            fillLayer.fillOpacity = .expression(Exp(.get) { "fillOpacity" })
            do {
                try mapView.mapboxMap.addLayer(fillLayer)
            } catch {
                logger.error("Failed to add zenith circles fill layer: \(error.localizedDescription)")
            }
        }

        // Stroke (dashed outline) layer
        if !mapView.mapboxMap.layerExists(withId: Self.zenithCirclesStrokeLayerId) {
            var strokeLayer = LineLayer(id: Self.zenithCirclesStrokeLayerId, source: Self.zenithCirclesSourceId)
            strokeLayer.lineColor = .expression(Exp(.get) { "color" })
            strokeLayer.lineOpacity = .expression(Exp(.get) { "strokeOpacity" })
            strokeLayer.lineWidth = .constant(1.5)
            strokeLayer.lineDasharray = .constant([4, 3])
            do {
                try mapView.mapboxMap.addLayer(strokeLayer)
            } catch {
                logger.error("Failed to add zenith circles stroke layer: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Zenith Belt (Declination Band)

    /// Render 7 latitude parallels at graded opacities when a zenith marker is tapped.
    /// Matches web's useMapLibreLayers zenith belt implementation.
    private func updateZenithBelt(_ mapView: MapView) {
        let kmPerDeg = 111.0

        // Belt offsets matching web: center + 3 north/south tiers
        let beltLines: [(latOffset: Double, opacity: Double)] = [
            (0, 0.85),                         // center (exact declination)
            ( 180.0 / kmPerDeg,  0.65),        // peak north
            (-180.0 / kmPerDeg,  0.65),        // peak south
            ( 350.0 / kmPerDeg,  0.40),        // strong north
            (-350.0 / kmPerDeg,  0.40),        // strong south
            ( 500.0 / kmPerDeg,  0.20),        // moderate north
            (-500.0 / kmPerDeg,  0.20),        // moderate south
        ]

        guard let planetName = selectedZenithPlanet,
              let zenith = zenithPoints.first(where: { $0.planet.rawValue == planetName }) else {
            // Clear belt
            mapView.mapboxMap.updateGeoJSONSource(
                withId: Self.zenithBeltSourceId,
                geoJSON: .featureCollection(FeatureCollection(features: []))
            )
            removeLayerIfExists(mapView, layerId: Self.zenithBeltLayerId)
            return
        }

        let declination = zenith.coordinate.latitude // zenith lat = planet declination
        let color = colorToHex(planetColor(zenith.planet))

        var features: [Feature] = []
        for belt in beltLines {
            let lat = declination + belt.latOffset
            // Full latitude circle from -180 to 180
            let coords = stride(from: -180.0, through: 180.0, by: 3.0).map {
                CLLocationCoordinate2D(latitude: lat, longitude: $0)
            }
            var feature = Feature(geometry: .lineString(LineString(coords)))
            feature.properties = [
                "color": .string(color),
                "opacity": .number(belt.opacity),
            ]
            features.append(feature)
        }

        mapView.mapboxMap.updateGeoJSONSource(
            withId: Self.zenithBeltSourceId,
            geoJSON: .featureCollection(FeatureCollection(features: features))
        )

        if !mapView.mapboxMap.layerExists(withId: Self.zenithBeltLayerId) {
            var lineLayer = LineLayer(id: Self.zenithBeltLayerId, source: Self.zenithBeltSourceId)
            lineLayer.lineColor = .expression(Exp(.get) { "color" })
            lineLayer.lineOpacity = .expression(Exp(.get) { "opacity" })
            lineLayer.lineWidth = .constant(1.5)
            lineLayer.lineDasharray = .constant([6, 4])
            do {
                try mapView.mapboxMap.addLayer(lineLayer)
            } catch {
                logger.error("Failed to add zenith belt layer: \(error.localizedDescription)")
            }
        }
    }

    // MARK: - Zenith Glyph Image Renderer

    /// Render a planet glyph Unicode character into a circular UIImage for Mapbox icon use.
    /// Matches web: 26×26px circle with planet color background, white glyph, white border.
    private func renderZenithGlyphImage(glyph: String, backgroundColor: UIColor, size: CGFloat) -> UIImage? {
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: size, height: size))
        return renderer.image { ctx in
            let rect = CGRect(x: 0, y: 0, width: size, height: size)
            let insetRect = rect.insetBy(dx: 1, dy: 1) // Leave room for border

            // Filled circle background
            ctx.cgContext.setFillColor(backgroundColor.cgColor)
            ctx.cgContext.fillEllipse(in: insetRect)

            // White border (2pt)
            ctx.cgContext.setStrokeColor(UIColor.white.withAlphaComponent(0.8).cgColor)
            ctx.cgContext.setLineWidth(2)
            ctx.cgContext.strokeEllipse(in: insetRect)

            // Draw glyph centered
            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: size * 0.5, weight: .medium),
                .foregroundColor: UIColor.white,
            ]
            let attrString = NSAttributedString(string: glyph, attributes: attributes)
            let textSize = attrString.size()
            let textOrigin = CGPoint(
                x: (size - textSize.width) / 2,
                y: (size - textSize.height) / 2
            )
            attrString.draw(at: textOrigin)
        }
    }

    // MARK: - Spherical Circle Generator

    /// Generate a circle on the sphere at a given center and radius in km.
    /// Uses spherical trigonometry (matching web's generateCircleAroundPoint).
    private func generateCircle(
        center: CLLocationCoordinate2D,
        radiusKm: Double,
        segments: Int = 48
    ) -> [CLLocationCoordinate2D] {
        let earthRadiusKm = 6371.0
        let angularRadius = radiusKm / earthRadiusKm

        let lat1 = center.latitude * .pi / 180
        let lon1 = center.longitude * .pi / 180

        var coords: [CLLocationCoordinate2D] = []
        for i in 0...segments {
            let bearing = Double(i) / Double(segments) * 2 * .pi
            let lat2 = asin(sin(lat1) * cos(angularRadius) + cos(lat1) * sin(angularRadius) * cos(bearing))
            let lon2 = lon1 + atan2(
                sin(bearing) * sin(angularRadius) * cos(lat1),
                cos(angularRadius) - sin(lat1) * sin(lat2)
            )
            coords.append(CLLocationCoordinate2D(
                latitude: lat2 * 180 / .pi,
                longitude: lon2 * 180 / .pi
            ))
        }
        return coords
    }

    // MARK: - Markers

    private func updateMarkers(_ mapView: MapView, context: Context) {
        var clusterableFeatures: [Feature] = []
        var selectedLocationFeatures: [Feature] = []

        for marker in markers {
            let point = Point(CLLocationCoordinate2D(
                latitude: marker.coordinate.latitude,
                longitude: marker.coordinate.longitude
            ))

            var feature = Feature(geometry: .point(point))
            feature.identifier = .string(marker.id)

            // For birthplace markers, use Tapback avatar image based on avatarIdentifier
            let avatarKey = marker.avatarIdentifier ?? marker.id
            let imageId = marker.type == .birthPlace ? "\(Self.birthPlaceImagePrefix)\(avatarKey)" : ""

            feature.properties = [
                "id": .string(marker.id),
                "title": .string(marker.title),
                "type": .string(marker.type.rawValue),
                "imageId": .string(imageId)
            ]

            // Load and add Tapback avatar for birthplace markers
            if marker.type == .birthPlace {
                loadBirthPlaceAvatar(for: marker, avatarKey: avatarKey, mapView: mapView, context: context)
            }

            // Separate selected location markers into their own non-clustered source
            if marker.type == .selectedLocation {
                selectedLocationFeatures.append(feature)
            } else {
                clusterableFeatures.append(feature)
            }
        }

        // Update clustered marker source (excludes selectedLocation)
        let clusterableCollection = FeatureCollection(features: clusterableFeatures)
        mapView.mapboxMap.updateGeoJSONSource(
            withId: Self.markerSourceId,
            geoJSON: .featureCollection(clusterableCollection)
        )

        // Update separate non-clustered source for selected location pin
        let selectedLocationCollection = FeatureCollection(features: selectedLocationFeatures)
        mapView.mapboxMap.updateGeoJSONSource(
            withId: Self.selectedLocationSourceId,
            geoJSON: .featureCollection(selectedLocationCollection)
        )

        // Add cluster layer for grouped markers
        if !mapView.mapboxMap.layerExists(withId: Self.clusterLayerId) {
            var clusterLayer = CircleLayer(id: Self.clusterLayerId, source: Self.markerSourceId)

            // Only show clusters (where point_count > 0)
            clusterLayer.filter = Exp(.has) { "point_count" }

            // Size based on cluster point count
            clusterLayer.circleRadius = .expression(
                Exp(.step) {
                    Exp(.get) { "point_count" }
                    15  // Default radius
                    10  // Step threshold
                    20  // Radius when >= 10
                    25
                    25  // Radius when >= 25
                    50
                    30  // Radius when >= 50
                }
            )

            // Gradient color based on cluster size
            // Note: Expressions require hex strings, not StyleColor
            clusterLayer.circleColor = .expression(
                Exp(.step) {
                    Exp(.get) { "point_count" }
                    colorToHex(UIColor(Color.acAccent))  // Default color
                    10
                    colorToHex(UIColor(Color.acAmber500))  // Color when >= 10
                    25
                    colorToHex(UIColor(Color.acPlanetMars))  // Color when >= 25
                }
            )
            clusterLayer.circleStrokeWidth = .constant(3)
            clusterLayer.circleStrokeColor = .constant(StyleColor(.white.withAlphaComponent(0.8)))
            clusterLayer.circleOpacity = .constant(0.9)

            do {
                try mapView.mapboxMap.addLayer(clusterLayer)
            } catch {
                logger.error("Failed to add cluster layer: \(error.localizedDescription)")
            }
        }

        // Add cluster count labels
        if !mapView.mapboxMap.layerExists(withId: Self.clusterCountLayerId) {
            var countLayer = SymbolLayer(id: Self.clusterCountLayerId, source: Self.markerSourceId)
            countLayer.filter = Exp(.has) { "point_count" }
            countLayer.textField = .expression(Exp(.get) { "point_count_abbreviated" })
            countLayer.textSize = .constant(12)
            countLayer.textColor = .constant(StyleColor(.white))
            countLayer.textFont = .constant(["DIN Pro Medium", "Arial Unicode MS Bold"])
            countLayer.textAllowOverlap = .constant(true)

            do {
                try mapView.mapboxMap.addLayer(countLayer)
            } catch {
                logger.error("Failed to add cluster count layer: \(error.localizedDescription)")
            }
        }

        // Add/update birthplace marker layer (Tapback Memoji avatars)
        if !mapView.mapboxMap.layerExists(withId: Self.birthPlaceLayerId) {
            var symbolLayer = SymbolLayer(id: Self.birthPlaceLayerId, source: Self.markerSourceId)

            // Only show birthPlace markers (no cluster)
            symbolLayer.filter = Exp(.all) {
                Exp(.not) { Exp(.has) { "point_count" } }
                Exp(.eq) {
                    Exp(.get) { "type" }
                    "birthPlace"
                }
            }

            // Display the Tapback avatar image from feature properties
            symbolLayer.iconImage = .expression(Exp(.get) { "imageId" })
            symbolLayer.iconSize = .constant(0.5)  // Scale down the image
            symbolLayer.iconAllowOverlap = .constant(true)
            symbolLayer.iconIgnorePlacement = .constant(true)

            do {
                try mapView.mapboxMap.addLayer(symbolLayer)
            } catch {
                logger.error("Failed to add birthplace layer: \(error.localizedDescription)")
            }
        }

        // Add/update selected location pin layer (uses separate non-clustered source)
        if !mapView.mapboxMap.layerExists(withId: Self.selectedLocationLayerId) {
            var pinLayer = SymbolLayer(id: Self.selectedLocationLayerId, source: Self.selectedLocationSourceId)

            // No filter needed - this source only contains selectedLocation markers
            pinLayer.iconImage = .constant(.name(Self.selectedLocationPinImageId))
            pinLayer.iconSize = .constant(0.7)
            pinLayer.iconAnchor = .constant(.bottom)  // Pin tip points to location
            pinLayer.iconAllowOverlap = .constant(true)
            pinLayer.iconIgnorePlacement = .constant(true)

            do {
                try mapView.mapboxMap.addLayer(pinLayer)
            } catch {
                logger.error("Failed to add selected location layer: \(error.localizedDescription)")
            }
        }

        // Add/update individual marker layer (unclustered points, excluding birthPlace)
        // Note: selectedLocation markers are in a separate source, so no filter needed for them
        if !mapView.mapboxMap.layerExists(withId: Self.markerLayerId) {
            var circleLayer = CircleLayer(id: Self.markerLayerId, source: Self.markerSourceId)

            // Only show individual markers (no cluster, not birthPlace)
            circleLayer.filter = Exp(.all) {
                Exp(.not) { Exp(.has) { "point_count" } }
                Exp(.neq) {
                    Exp(.get) { "type" }
                    "birthPlace"
                }
            }

            // Different sizes based on marker type
            circleLayer.circleRadius = .expression(
                Exp(.match) {
                    Exp(.get) { "type" }
                    "scoutResult"
                    8   // Scout results standard
                    "favorite"
                    10  // Favorites slightly larger
                    8   // Default
                }
            )

            // Different colors based on marker type
            // Note: Expressions require hex strings, not StyleColor
            circleLayer.circleColor = .expression(
                Exp(.match) {
                    Exp(.get) { "type" }
                    "scoutResult"
                    colorToHex(UIColor(Color.acAccent))  // Accent for scout
                    "favorite"
                    colorToHex(UIColor(Color.acPlanetVenus))  // Pink for favorites
                    colorToHex(UIColor(Color.acAccent))  // Default accent
                }
            )
            circleLayer.circleStrokeWidth = .constant(2)
            circleLayer.circleStrokeColor = .constant(StyleColor(.white))

            do {
                try mapView.mapboxMap.addLayer(circleLayer)
            } catch {
                logger.error("Failed to add marker layer: \(error.localizedDescription)")
            }
        }

        context.coordinator.currentMarkers = markers
    }

    // MARK: - Birthplace Avatar

    /// Birthplace marker image ID prefix for Mapbox style
    private static let birthPlaceImagePrefix = "birthplace-avatar-"

    /// Loads Tapback Memoji avatar for a birthplace marker and adds it to the map style
    /// - Parameters:
    ///   - marker: The globe marker
    ///   - avatarKey: Unique key for the avatar (from birth data hash)
    ///   - mapView: The Mapbox map view
    ///   - context: UIViewRepresentable context for tracking current avatar
    private func loadBirthPlaceAvatar(for marker: GlobeMarker, avatarKey: String, mapView: MapView, context: Context) {
        let imageId = "\(Self.birthPlaceImagePrefix)\(avatarKey)"

        // Check if avatar changed - remove old image if needed
        if let previousAvatarKey = context.coordinator.currentBirthPlaceAvatarKey,
           previousAvatarKey != avatarKey {
            let oldImageId = "\(Self.birthPlaceImagePrefix)\(previousAvatarKey)"
            if mapView.mapboxMap.imageExists(withId: oldImageId) {
                do {
                    try mapView.mapboxMap.removeImage(withId: oldImageId)
                    logger.info("Removed old avatar image: \(oldImageId)")
                } catch {
                    logger.warning("Failed to remove old avatar: \(error.localizedDescription)")
                }
            }
        }

        // Update the current avatar key
        context.coordinator.currentBirthPlaceAvatarKey = avatarKey

        // Check if image already exists in style
        if mapView.mapboxMap.imageExists(withId: imageId) {
            return
        }

        // Load avatar asynchronously using Core's AvatarLoader
        Task {
            guard let image = await AvatarLoader.shared.loadAvatar(for: avatarKey) else {
                logger.warning("Failed to load avatar for key: \(avatarKey)")
                // Add fallback circle image
                addFallbackBirthPlaceImage(imageId: imageId, mapView: mapView)
                return
            }

            // Create circular masked image with border
            let circularImage = createCircularImage(from: image, size: 80)

            // Add to map style on main thread
            await MainActor.run {
                do {
                    try mapView.mapboxMap.addImage(circularImage, id: imageId)
                    logger.info("Added avatar to map style: \(imageId)")
                } catch {
                    logger.error("Failed to add avatar image to style: \(error.localizedDescription)")
                }
            }
        }
    }

    /// Creates a circular masked image with a white border
    private func createCircularImage(from image: UIImage, size: CGFloat) -> UIImage {
        let rect = CGRect(origin: .zero, size: CGSize(width: size, height: size))
        let borderWidth: CGFloat = 3

        UIGraphicsBeginImageContextWithOptions(rect.size, false, 0)
        defer { UIGraphicsEndImageContext() }

        guard let context = UIGraphicsGetCurrentContext() else {
            return image
        }

        // Draw white border circle
        context.setFillColor(UIColor.white.cgColor)
        context.fillEllipse(in: rect)

        // Draw image in smaller circle (inset by border width)
        let imageRect = rect.insetBy(dx: borderWidth, dy: borderWidth)
        let path = UIBezierPath(ovalIn: imageRect)
        path.addClip()

        image.draw(in: imageRect)

        return UIGraphicsGetImageFromCurrentImageContext() ?? image
    }

    /// Adds a fallback colored circle if both Tapback and DiceBear avatars fail to load
    private func addFallbackBirthPlaceImage(imageId: String, mapView: MapView) {
        let size: CGFloat = 80
        let rect = CGRect(origin: .zero, size: CGSize(width: size, height: size))

        UIGraphicsBeginImageContextWithOptions(rect.size, false, 0)
        defer { UIGraphicsEndImageContext() }

        guard let context = UIGraphicsGetCurrentContext() else { return }

        // White border
        context.setFillColor(UIColor.white.cgColor)
        context.fillEllipse(in: rect)

        // Gold fill
        let innerRect = rect.insetBy(dx: 3, dy: 3)
        context.setFillColor(UIColor(Color.acPlanetSun).cgColor)
        context.fillEllipse(in: innerRect)

        // Person icon
        let personIcon = UIImage(systemName: "person.fill")?.withTintColor(.white, renderingMode: .alwaysOriginal)
        let iconSize: CGFloat = 36
        let iconRect = CGRect(
            x: (size - iconSize) / 2,
            y: (size - iconSize) / 2,
            width: iconSize,
            height: iconSize
        )
        personIcon?.draw(in: iconRect)

        guard let fallbackImage = UIGraphicsGetImageFromCurrentImageContext() else { return }

        do {
            try mapView.mapboxMap.addImage(fallbackImage, id: imageId)
        } catch {
            logger.error("Failed to add fallback image: \(error.localizedDescription)")
        }
    }

    // MARK: - Selected Location Pin

    /// Creates and adds a custom red map pin image for selected locations
    private func addSelectedLocationPinImage(_ mapView: MapView) {
        // Check if already added
        if mapView.mapboxMap.imageExists(withId: Self.selectedLocationPinImageId) {
            return
        }

        let pinImage = createCustomPinImage(size: 64)

        do {
            try mapView.mapboxMap.addImage(pinImage, id: Self.selectedLocationPinImageId)
            logger.info("Added selected location pin to style")
        } catch {
            logger.error("Failed to add pin image: \(error.localizedDescription)")
        }
    }

    /// Creates a custom red map pin image for use as a location marker
    /// Styled similar to the Mapbox custom-point-annotation example
    private func createCustomPinImage(size: CGFloat) -> UIImage {
        // Pin dimensions - wider and bolder for better visibility
        let width = size
        let height = size * 1.3
        let renderer = UIGraphicsImageRenderer(size: CGSize(width: width, height: height))

        return renderer.image { ctx in
            let context = ctx.cgContext

            // Pin colors
            let pinRed = UIColor(red: 234/255, green: 67/255, blue: 53/255, alpha: 1.0)  // Google red
            let white = UIColor.white

            // Pin geometry - wider proportions for bolder look
            let pinWidth = width * 0.9
            let pinHeight = height * 0.85
            let circleRadius = pinWidth * 0.4
            let centerX = width / 2
            let topY = height * 0.08

            // Draw shadow
            context.saveGState()
            context.setShadow(offset: CGSize(width: 0, height: 3), blur: 6, color: UIColor.black.withAlphaComponent(0.4).cgColor)

            // Draw pin body (teardrop shape)
            let pinPath = UIBezierPath()

            // Start at bottom point (tip of pin)
            let tipY = topY + pinHeight
            pinPath.move(to: CGPoint(x: centerX, y: tipY))

            // Curve up to left side of circle
            let circleY = topY + circleRadius
            pinPath.addCurve(
                to: CGPoint(x: centerX - circleRadius, y: circleY),
                controlPoint1: CGPoint(x: centerX - pinWidth * 0.15, y: tipY - pinHeight * 0.25),
                controlPoint2: CGPoint(x: centerX - circleRadius, y: circleY + circleRadius * 0.8)
            )

            // Arc around the top (the circle part)
            pinPath.addArc(
                withCenter: CGPoint(x: centerX, y: circleY),
                radius: circleRadius,
                startAngle: .pi,
                endAngle: 0,
                clockwise: true
            )

            // Curve down to bottom point
            pinPath.addCurve(
                to: CGPoint(x: centerX, y: tipY),
                controlPoint1: CGPoint(x: centerX + circleRadius, y: circleY + circleRadius * 0.8),
                controlPoint2: CGPoint(x: centerX + pinWidth * 0.15, y: tipY - pinHeight * 0.25)
            )

            pinPath.close()

            // Fill with gradient effect (darker on right for 3D look)
            pinRed.setFill()
            pinPath.fill()

            context.restoreGState()

            // Draw inner white circle (the hole in the pin)
            let innerCircleRadius = circleRadius * 0.45
            let innerCirclePath = UIBezierPath(
                arcCenter: CGPoint(x: centerX, y: circleY),
                radius: innerCircleRadius,
                startAngle: 0,
                endAngle: .pi * 2,
                clockwise: true
            )
            white.setFill()
            innerCirclePath.fill()

            // Add subtle highlight on left side for 3D effect
            context.saveGState()
            let highlightPath = UIBezierPath()
            highlightPath.move(to: CGPoint(x: centerX - circleRadius * 0.6, y: circleY - circleRadius * 0.3))
            highlightPath.addQuadCurve(
                to: CGPoint(x: centerX - circleRadius * 0.2, y: circleY + circleRadius * 0.8),
                controlPoint: CGPoint(x: centerX - circleRadius * 0.9, y: circleY + circleRadius * 0.2)
            )
            highlightPath.addQuadCurve(
                to: CGPoint(x: centerX - circleRadius * 0.6, y: circleY - circleRadius * 0.3),
                controlPoint: CGPoint(x: centerX - circleRadius * 0.5, y: circleY + circleRadius * 0.3)
            )
            UIColor.white.withAlphaComponent(0.25).setFill()
            highlightPath.fill()
            context.restoreGState()
        }
    }

    // MARK: - Helpers

    /// Converts UIColor to hex string for Mapbox expressions.
    /// Expressions require string format, not StyleColor.
    private func colorToHex(_ color: UIColor) -> String {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        color.getRed(&r, green: &g, blue: &b, alpha: &a)
        return String(format: "#%02X%02X%02X", Int(r * 255), Int(g * 255), Int(b * 255))
    }

    /// Maps a planet name string to a hex color (for paran lines where planet is a String, not enum)
    private func planetColorHex(_ planetName: String) -> String {
        if let planet = Planet(rawValue: planetName) {
            return colorToHex(planetColor(planet))
        }
        // Fallback for unmapped planets
        return "#FFFFFF"
    }

    private func planetColor(_ planet: Planet) -> UIColor {
        switch planet {
        case .sun: return UIColor(Color.acPlanetSun)
        case .moon: return UIColor(Color.acPlanetMoon)
        case .mercury: return UIColor(Color.acPlanetMercury)
        case .venus: return UIColor(Color.acPlanetVenus)
        case .mars: return UIColor(Color.acPlanetMars)
        case .jupiter: return UIColor(Color.acPlanetJupiter)
        case .saturn: return UIColor(Color.acPlanetSaturn)
        case .uranus: return UIColor(Color.acPlanetUranus)
        case .neptune: return UIColor(Color.acPlanetNeptune)
        case .pluto: return UIColor(Color.acPlanetPluto)
        case .chiron: return UIColor(Color.acPlanetChiron)
        case .northNode: return UIColor(Color.acPlanetNorthNode)
        case .southNode: return UIColor(Color.acPlanetSouthNode)
        }
    }

    // MARK: - Coordinator

    public class Coordinator: NSObject {
        let parent: MapboxGlobeView
        weak var mapView: MapView?
        var lastKnownCameraState: GlobeCameraState
        var currentTheme: MapStyleTheme
        var currentLines: [AstroLine] = []
        var currentAspectLines: [GlobeAspectLine] = []
        var currentParanLines: [GlobeParanLine] = []
        var currentTransitParanLines: [GlobeParanLine] = []
        var currentZenithPoints: [GlobeZenithPoint] = []
        var currentMarkers: [GlobeMarker] = []
        var currentNakshatraData: [NakshatraGlobeData] = []
        var currentShowNakshatraBands: Bool = false
        var isUserInteracting = false
        var sourcesReady = false

        // Hover tooltip (iPad trackpad/mouse + Apple Pencil hover)
        private var tooltipLabel: UILabel?
        private var lastHoverQueryTime: Date = .distantPast

        // Track current birthplace avatar to detect changes
        var currentBirthPlaceAvatarKey: String?

        // Mapbox SDK Cancelables
        var styleLoadedCancellable: Cancelable?
        var cameraChangedCancellable: Cancelable?

        private let logger = Logger(subsystem: "com.cartostar.globe", category: "Coordinator")

        init(parent: MapboxGlobeView) {
            self.parent = parent
            self.lastKnownCameraState = parent.cameraState
            self.currentTheme = parent.mapStyleTheme
            super.init()
        }

        deinit {
            styleLoadedCancellable?.cancel()
            cameraChangedCancellable?.cancel()
        }

        func handleCameraChange(_ event: CameraChanged, mapView: MapView) {
            let cameraState = mapView.mapboxMap.cameraState
            let newState = GlobeCameraState(
                center: GlobeCoordinate(latitude: cameraState.center.latitude, longitude: cameraState.center.longitude),
                zoom: cameraState.zoom,
                pitch: cameraState.pitch,
                bearing: cameraState.bearing
            )

            if newState != lastKnownCameraState {
                lastKnownCameraState = newState
                DispatchQueue.main.async {
                    self.parent.cameraState = newState
                    self.parent.onInteraction?(.cameraChanged(newState))
                }
            }
        }

        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            guard gesture.state == .ended,
                  let mapView = mapView else { return }

            let point = gesture.location(in: mapView)
            let coordinate = mapView.mapboxMap.coordinate(for: point)
            let fallbackCoordinate = coordinate

            // Check transit lines FIRST (separate query so they don't get masked by natal lines)
            let transitLayerIds = [
                MapboxGlobeView.transitLayerId,
                MapboxGlobeView.transitDashedLayerId,
            ].filter { mapView.mapboxMap.layerExists(withId: $0) }

            if !transitLayerIds.isEmpty {
                let transitOptions = RenderedQueryOptions(layerIds: transitLayerIds, filter: nil)
                mapView.mapboxMap.queryRenderedFeatures(with: point, options: transitOptions) { [weak self] result in
                    guard let self = self else { return }
                    if case .success(let features) = result,
                       let feature = features.first,
                       let props = feature.queriedFeature.feature.properties,
                       let planetValue = props["planet"],
                       case .string(let planetName) = planetValue,
                       let lineTypeValue = props["lineType"],
                       case .string(let lineTypeRaw) = lineTypeValue,
                       let planet = Planet(rawValue: planetName),
                       let lineType = AstroLineType(rawValue: lineTypeRaw) {
                        let transitLine = AstroLine(
                            id: "transit-\(planetName)-\(lineTypeRaw)",
                            planet: planet,
                            lineType: lineType,
                            coordinates: []
                        )
                        let tapCoord = GlobeCoordinate(latitude: coordinate.latitude, longitude: coordinate.longitude)
                        self.parent.onInteraction?(.lineTapped(transitLine, nearCoordinate: tapCoord))
                        return
                    }
                    // No transit line found — check natal lines
                    self.checkNatalLineTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)
                }
            } else {
                // No transit layers — check natal lines directly
                checkNatalLineTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)
            }
        }

        private func checkNatalLineTap(at point: CGPoint, mapView: MapView, fallbackCoordinate: CLLocationCoordinate2D) {
            // Check local space lines first (when active, natal lines are hidden)
            if mapView.mapboxMap.layerExists(withId: MapboxGlobeView.localSpaceLayerId) {
                let lsOptions = RenderedQueryOptions(layerIds: [MapboxGlobeView.localSpaceLayerId], filter: nil)
                mapView.mapboxMap.queryRenderedFeatures(with: point, options: lsOptions) { [weak self] result in
                    guard let self = self else { return }
                    if case .success(let features) = result,
                       let feature = features.first,
                       let props = feature.queriedFeature.feature.properties,
                       let planetValue = props["planet"],
                       case .string(let planetName) = planetValue,
                       let planet = Planet(rawValue: planetName) {
                        let direction = props["direction"].flatMap { if case .string(let d) = $0 { return d } else { return nil } } ?? ""
                        let lsLine = AstroLine(
                            id: "ls-\(planetName)-\(direction)",
                            planet: planet,
                            lineType: .ascendant,
                            coordinates: []
                        )
                        let tapCoord = GlobeCoordinate(latitude: fallbackCoordinate.latitude, longitude: fallbackCoordinate.longitude)
                        self.parent.onInteraction?(.lineTapped(lsLine, nearCoordinate: tapCoord))
                        return
                    }
                    // No local space line hit — fall through to natal
                    self.checkNatalLineLayersTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)
                }
                return
            }
            checkNatalLineLayersTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)
        }

        private func checkNatalLineLayersTap(at point: CGPoint, mapView: MapView, fallbackCoordinate: CLLocationCoordinate2D) {
            let lineLayerIds = Planet.allCases.map { "\(MapboxGlobeView.lineLayerIdPrefix)\($0.rawValue)" }
            let existingLayerIds = lineLayerIds.filter { mapView.mapboxMap.layerExists(withId: $0) }

            guard !existingLayerIds.isEmpty else {
                self.checkAspectLineTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)
                return
            }

            let lineOptions = RenderedQueryOptions(layerIds: existingLayerIds, filter: nil)
            let coordinate = fallbackCoordinate

            mapView.mapboxMap.queryRenderedFeatures(with: point, options: lineOptions) { [weak self] result in
                guard let self = self else { return }

                switch result {
                case .success(let features):
                    if let feature = features.first,
                       let props = feature.queriedFeature.feature.properties,
                       let idValue = props["id"],
                       case .string(let lineId) = idValue,
                       let line = self.currentLines.first(where: { $0.id == lineId }) {
                        let tapCoord = GlobeCoordinate(latitude: coordinate.latitude, longitude: coordinate.longitude)
                        self.parent.onInteraction?(.lineTapped(line, nearCoordinate: tapCoord))
                        return
                    }

                    // Check aspect lines (natal + transit)
                    self.checkAspectLineTap(at: point, mapView: mapView, fallbackCoordinate: coordinate)

                case .failure(let error):
                    self.logger.error("Query failed: \(error.localizedDescription)")
                    let tapCoord = GlobeCoordinate(latitude: coordinate.latitude, longitude: coordinate.longitude)
                    self.parent.onInteraction?(.locationTapped(tapCoord))
                }
            }
        }

        private func checkAspectLineTap(at point: CGPoint, mapView: MapView, fallbackCoordinate: CLLocationCoordinate2D) {
            // Query all aspect layers (natal + transit)
            let allAspectLayers = [
                MapboxGlobeView.aspectLayerId,
                MapboxGlobeView.aspectGlowLayerId,
                "transit-aspect-lines-layer",
            ].filter { mapView.mapboxMap.layerExists(withId: $0) }

            guard !allAspectLayers.isEmpty else {
                self.checkParanPointTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)
                return
            }

            let aspectOptions = RenderedQueryOptions(layerIds: allAspectLayers, filter: nil)

            mapView.mapboxMap.queryRenderedFeatures(with: point, options: aspectOptions) { [weak self] result in
                guard let self = self else { return }

                switch result {
                case .success(let features):
                    if let feature = features.first,
                       let props = feature.queriedFeature.feature.properties,
                       let idValue = props["id"],
                       case .string(let aspectId) = idValue {

                        let tapCoord = GlobeCoordinate(latitude: fallbackCoordinate.latitude, longitude: fallbackCoordinate.longitude)

                        // Transit aspect (id starts with "transit-")
                        if aspectId.hasPrefix("transit-"),
                           let planetValue = props["planet"],
                           case .string(let planetName) = planetValue,
                           let planet = Planet(rawValue: planetName) {
                            let colorHex: String
                            if let c = props["color"], case .string(let hex) = c { colorHex = hex } else { colorHex = "#888888" }
                            let transitAspect = GlobeAspectLine(
                                id: aspectId,
                                planet: planet,
                                angle: "Transit",
                                aspectType: "transit",
                                isHarmonious: true,
                                coordinates: [],
                                color: colorHex
                            )
                            self.parent.onInteraction?(.aspectLineTapped(transitAspect, nearCoordinate: tapCoord))
                            return
                        }

                        // Natal aspect
                        if let aspectLine = self.currentAspectLines.first(where: { $0.id == aspectId }) {
                            self.parent.onInteraction?(.aspectLineTapped(aspectLine, nearCoordinate: tapCoord))
                            return
                        }
                    }

                    self.checkParanPointTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)

                case .failure:
                    self.checkParanPointTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)
                }
            }
        }

        private func checkParanPointTap(at point: CGPoint, mapView: MapView, fallbackCoordinate: CLLocationCoordinate2D) {
            // Check transit paran lines first (dashed latitude circles on transit-paran-lines-layer)
            let transitParanLayerId = "transit-paran-lines-layer"
            if mapView.mapboxMap.layerExists(withId: transitParanLayerId) {
                let transitParanOptions = RenderedQueryOptions(layerIds: [transitParanLayerId], filter: nil)
                mapView.mapboxMap.queryRenderedFeatures(with: point, options: transitParanOptions) { [weak self] result in
                    guard let self = self else { return }
                    if case .success(let features) = result,
                       let feature = features.first,
                       let props = feature.queriedFeature.feature.properties,
                       let idValue = props["id"],
                       case .string(let featureId) = idValue {
                        // Feature ID format: "transit-paran-{paranId}"
                        let paranId = featureId.replacingOccurrences(of: "transit-paran-", with: "")
                        if let paranLine = self.currentTransitParanLines.first(where: { $0.id == paranId }) {
                            self.parent.onInteraction?(.paranPointTapped(paranLine))
                            return
                        }
                    }
                    // No transit paran hit — check natal paran markers
                    self.checkNatalParanPointTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)
                }
            } else {
                checkNatalParanPointTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)
            }
        }

        private func checkNatalParanPointTap(at point: CGPoint, mapView: MapView, fallbackCoordinate: CLLocationCoordinate2D) {
            let paranOptions = RenderedQueryOptions(
                layerIds: [MapboxGlobeView.paranLayerId],
                filter: nil
            )

            mapView.mapboxMap.queryRenderedFeatures(with: point, options: paranOptions) { [weak self] result in
                guard let self = self else { return }

                switch result {
                case .success(let features):
                    if let feature = features.first,
                       let props = feature.queriedFeature.feature.properties,
                       let idValue = props["id"],
                       case .string(let paranId) = idValue,
                       let paranLine = self.currentParanLines.first(where: { $0.id == paranId }) {
                        self.parent.onInteraction?(.paranPointTapped(paranLine))
                        return
                    }

                    // Not a paran point, check zenith points
                    self.checkZenithPointTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)

                case .failure:
                    self.checkZenithPointTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)
                }
            }
        }

        private func checkZenithPointTap(at point: CGPoint, mapView: MapView, fallbackCoordinate: CLLocationCoordinate2D) {
            let zenithOptions = RenderedQueryOptions(
                layerIds: [MapboxGlobeView.zenithLayerId],
                filter: nil
            )

            mapView.mapboxMap.queryRenderedFeatures(with: point, options: zenithOptions) { [weak self] result in
                guard let self = self else { return }

                switch result {
                case .success(let features):
                    if let feature = features.first,
                       let props = feature.queriedFeature.feature.properties,
                       let idValue = props["id"],
                       case .string(let zenithId) = idValue,
                       let zenithPoint = self.currentZenithPoints.first(where: { $0.id == zenithId }) {
                        self.parent.onInteraction?(.zenithPointTapped(zenithPoint))
                        return
                    }

                    // Not a zenith point, check nakshatra bands
                    self.checkNakshatraTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)

                case .failure:
                    self.checkNakshatraTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)
                }
            }
        }

        private func checkNakshatraTap(at point: CGPoint, mapView: MapView, fallbackCoordinate: CLLocationCoordinate2D) {
            // Skip if nakshatra bands layer is not visible
            guard self.currentShowNakshatraBands, !self.currentNakshatraData.isEmpty else {
                self.checkMarkerTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)
                return
            }

            // Query the nakshatra fill layer for tap detection
            let nakshatraOptions = RenderedQueryOptions(
                layerIds: [MapboxGlobeView.nakshatraFillLayerId],
                filter: nil
            )

            mapView.mapboxMap.queryRenderedFeatures(with: point, options: nakshatraOptions) { [weak self] result in
                guard let self = self else { return }

                switch result {
                case .success(let features):
                    if let feature = features.first,
                       let props = feature.queriedFeature.feature.properties,
                       let nameValue = props["name"],
                       case .string(let nakshatraName) = nameValue {
                        // Find matching nakshatra by name from current data
                        let nakshatraData = self.currentNakshatraData
                        if let band = nakshatraData.first(where: { $0.nakshatra.name == nakshatraName }) {
                            let coord = GlobeCoordinate(
                                latitude: fallbackCoordinate.latitude,
                                longitude: fallbackCoordinate.longitude
                            )
                            // Determine pada from tap longitude
                            let pada = self.determinePada(longitude: fallbackCoordinate.longitude, band: band)
                            self.parent.onInteraction?(.nakshatraTapped(NakshatraTapData(
                                nakshatraIndex: band.id,
                                pada: pada,
                                coordinate: coord
                            )))
                            return
                        }
                    }

                    self.checkMarkerTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)

                case .failure:
                    self.checkMarkerTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)
                }
            }
        }

        /// Determine which pada (1-4) a longitude falls in within a nakshatra band
        private func determinePada(longitude: Double, band: NakshatraGlobeData) -> Int {
            let lng = ((longitude + 180).truncatingRemainder(dividingBy: 360)) - 180
            let boundaries = [band.startLng] + band.padaLngs + [band.endLng]

            for i in 0..<4 {
                guard i + 1 < boundaries.count else { break }
                let pStart = ((boundaries[i] + 180).truncatingRemainder(dividingBy: 360)) - 180
                let pEnd = ((boundaries[i + 1] + 180).truncatingRemainder(dividingBy: 360)) - 180

                let inPada: Bool
                if pStart <= pEnd {
                    inPada = lng >= pStart && lng < pEnd
                } else {
                    inPada = lng >= pStart || lng < pEnd
                }
                if inPada { return i + 1 }
            }
            return 1
        }

        private func checkMarkerTap(at point: CGPoint, mapView: MapView, fallbackCoordinate: CLLocationCoordinate2D) {
            // First check if we tapped a cluster
            let clusterOptions = RenderedQueryOptions(layerIds: [MapboxGlobeView.clusterLayerId], filter: nil)

            mapView.mapboxMap.queryRenderedFeatures(with: point, options: clusterOptions) { [weak self] result in
                guard let self = self else { return }

                switch result {
                case .success(let features):
                    if let feature = features.first,
                       let props = feature.queriedFeature.feature.properties,
                       props["point_count"] != nil {
                        // Tapped on a cluster - zoom in to expand it
                        self.handleClusterTap(feature: feature.queriedFeature.feature, mapView: mapView)
                        return
                    }

                    // Not a cluster, check individual markers
                    self.checkIndividualMarkerTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)

                case .failure:
                    self.checkIndividualMarkerTap(at: point, mapView: mapView, fallbackCoordinate: fallbackCoordinate)
                }
            }
        }

        private func handleClusterTap(feature: Feature, mapView: MapView) {
            // Get cluster expansion zoom level
            guard case .point(let point) = feature.geometry else { return }

            let coordinate = point.coordinates
            let currentZoom = mapView.mapboxMap.cameraState.zoom

            // Zoom in by 2 levels or to max zoom, whichever is less
            let targetZoom = min(currentZoom + 2, MapboxGlobeView.clusterMaxZoom + 1)

            let cameraOptions = CameraOptions(
                center: CLLocationCoordinate2D(latitude: coordinate.latitude, longitude: coordinate.longitude),
                zoom: targetZoom
            )

            mapView.camera.ease(to: cameraOptions, duration: 0.5)
        }

        private func checkIndividualMarkerTap(at point: CGPoint, mapView: MapView, fallbackCoordinate: CLLocationCoordinate2D) {
            let options = RenderedQueryOptions(layerIds: [MapboxGlobeView.markerLayerId], filter: nil)

            mapView.mapboxMap.queryRenderedFeatures(with: point, options: options) { [weak self] result in
                guard let self = self else { return }

                switch result {
                case .success(let features):
                    if let feature = features.first,
                       let props = feature.queriedFeature.feature.properties,
                       let idValue = props["id"],
                       case .string(let markerId) = idValue,
                       let marker = self.currentMarkers.first(where: { $0.id == markerId }) {
                        self.parent.onInteraction?(.markerTapped(marker))
                        return
                    }

                    // No marker found, report location tap
                    let tapCoord = GlobeCoordinate(latitude: fallbackCoordinate.latitude, longitude: fallbackCoordinate.longitude)
                    self.parent.onInteraction?(.locationTapped(tapCoord))

                case .failure:
                    let tapCoord = GlobeCoordinate(latitude: fallbackCoordinate.latitude, longitude: fallbackCoordinate.longitude)
                    self.parent.onInteraction?(.locationTapped(tapCoord))
                }
            }
        }

        @objc func handleLongPress(_ gesture: UILongPressGestureRecognizer) {
            guard gesture.state == .began,
                  let mapView = mapView else { return }

            let point = gesture.location(in: mapView)
            let coordinate = mapView.mapboxMap.coordinate(for: point)
            let longPressCoord = GlobeCoordinate(latitude: coordinate.latitude, longitude: coordinate.longitude)
            parent.onInteraction?(.locationLongPressed(longPressCoord))
        }

        // MARK: - Hover Tooltip (iPad trackpad/mouse + Apple Pencil hover)

        @objc func handleHover(_ gesture: UIHoverGestureRecognizer) {
            guard let mapView = mapView else { return }

            switch gesture.state {
            case .began, .changed:
                let point = gesture.location(in: mapView)

                // Throttle queries to max ~15fps (67ms) to avoid perf issues
                let now = Date()
                guard now.timeIntervalSince(lastHoverQueryTime) > 0.067 else { return }
                lastHoverQueryTime = now

                queryHoverFeature(at: point, in: mapView)

            case .ended, .cancelled:
                hideTooltip()

            default:
                break
            }
        }

        private func queryHoverFeature(at point: CGPoint, in mapView: MapView) {
            // Query all line layers (natal + transit + aspects)
            var layerIds = Planet.allCases.map { "\(MapboxGlobeView.lineLayerIdPrefix)\($0.rawValue)" }
            layerIds.append(contentsOf: [
                MapboxGlobeView.transitHitLayerId,
                MapboxGlobeView.transitDashedHitLayerId,
                MapboxGlobeView.aspectLayerId,
                MapboxGlobeView.aspectGlowLayerId,
                MapboxGlobeView.transitAspectHitLayerId,
                MapboxGlobeView.paranLayerId,
                MapboxGlobeView.zenithLayerId,
                MapboxGlobeView.localSpaceLayerId,
            ])

            let options = RenderedQueryOptions(layerIds: layerIds, filter: nil)

            mapView.mapboxMap.queryRenderedFeatures(with: point, options: options) { [weak self] result in
                guard let self = self else { return }

                switch result {
                case .success(let features):
                    if let feature = features.first,
                       let props = feature.queriedFeature.feature.properties {

                        // Build tooltip text from feature properties
                        var label = ""
                        var isTransit = false

                        if let planetValue = props["planet"],
                           case .string(let planetName) = planetValue {
                            let symbol = Planet(rawValue: planetName)?.symbol ?? ""

                            if let lineTypeValue = props["lineType"],
                               case .string(let lineType) = lineTypeValue {
                                if lineType == "LS" {
                                    // Local space line — show planet + direction
                                    let dir = (props["direction"].flatMap { if case .string(let d) = $0 { return d } else { return nil } }) ?? ""
                                    label = "\(symbol) LS \(dir)"
                                } else if let layerType = props["layerType"],
                                   case .string(_) = layerType {
                                    isTransit = true
                                    label = "T \(symbol) \(lineType)"
                                } else {
                                    label = "\(symbol) \(lineType)"
                                }
                            } else if let aspectType = props["aspectType"],
                                      case .string(let aspect) = aspectType {
                                // Aspect line
                                label = "\(symbol) \(aspect)"
                            } else {
                                // Zenith or other
                                label = "\(symbol) \(planetName)"
                            }
                        } else if let p1 = props["planet1"], case .string(let planet1) = p1,
                                  let p2 = props["planet2"], case .string(let planet2) = p2 {
                            // Paran point
                            let s1 = Planet(rawValue: planet1)?.symbol ?? planet1
                            let s2 = Planet(rawValue: planet2)?.symbol ?? planet2
                            if let a1 = props["angle1"], case .string(let angle1) = a1,
                               let a2 = props["angle2"], case .string(let angle2) = a2 {
                                label = "\(s1) \(angle1) × \(s2) \(angle2)"
                            } else {
                                label = "\(s1) × \(s2)"
                            }
                        }

                        if !label.isEmpty {
                            // Get planet color
                            var tooltipColor = UIColor.white
                            if let colorValue = props["color"],
                               case .string(let hex) = colorValue {
                                tooltipColor = UIColor(Color(hex: hex))
                            }
                            self.showTooltip(label, at: point, in: mapView, color: tooltipColor, isTransit: isTransit)
                        } else {
                            self.hideTooltip()
                        }
                    } else {
                        self.hideTooltip()
                    }

                case .failure:
                    self.hideTooltip()
                }
            }
        }

        private func showTooltip(_ text: String, at point: CGPoint, in mapView: MapView, color: UIColor, isTransit: Bool) {
            if tooltipLabel == nil {
                let label = UILabel()
                label.font = .systemFont(ofSize: 12, weight: .semibold)
                label.textAlignment = .center
                label.layer.cornerRadius = 6
                label.layer.masksToBounds = true
                label.isUserInteractionEnabled = false
                mapView.addSubview(label)
                tooltipLabel = label
            }

            guard let label = tooltipLabel else { return }

            label.text = "  \(text)  "
            label.textColor = color
            label.backgroundColor = UIColor.black.withAlphaComponent(0.75)
            label.layer.borderWidth = isTransit ? 1 : 0
            label.layer.borderColor = UIColor(red: 0.13, green: 0.77, blue: 0.37, alpha: 0.6).cgColor // green border for transit
            label.sizeToFit()

            // Position above the cursor with padding
            let tooltipX = min(max(point.x - label.frame.width / 2, 8), mapView.bounds.width - label.frame.width - 8)
            let tooltipY = point.y - label.frame.height - 12
            label.frame.origin = CGPoint(x: tooltipX, y: max(tooltipY, 8))
            label.isHidden = false
        }

        private func hideTooltip() {
            tooltipLabel?.isHidden = true
        }
    }
}
