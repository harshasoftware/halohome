import SwiftUI
import MapKit
import DesignSystem
import Core
import os.log

// MARK: - Apple Globe View

/// SwiftUI wrapper for MKMapView configured for 3D globe rendering.
///
/// Uses Apple's native MapKit which renders a 3D globe when zoomed out.
/// Astrocartography lines are drawn as MKPolyline overlays.
@available(iOS 17.0, *)
public struct AppleGlobeView: UIViewRepresentable {
    // MARK: - Properties

    @Binding var cameraState: GlobeCameraState
    let markers: [GlobeMarker]
    let astroLines: [AstroLine]
    let lineVisibility: AstroLineVisibility
    let mapStyleTheme: MapStyleTheme
    let onInteraction: ((GlobeInteractionEvent) -> Void)?

    private let logger = Logger(subsystem: "com.cartostar.globe", category: "AppleGlobeView")

    // MARK: - Initialization

    public init(
        cameraState: Binding<GlobeCameraState>,
        markers: [GlobeMarker] = [],
        astroLines: [AstroLine] = [],
        lineVisibility: AstroLineVisibility = .all,
        mapStyleTheme: MapStyleTheme = .cosmic,
        onInteraction: ((GlobeInteractionEvent) -> Void)? = nil
    ) {
        self._cameraState = cameraState
        self.markers = markers
        self.astroLines = astroLines
        self.lineVisibility = lineVisibility
        self.mapStyleTheme = mapStyleTheme
        self.onInteraction = onInteraction
    }

    // MARK: - UIViewRepresentable

    public func makeUIView(context: Context) -> MKMapView {
        let mapView = MKMapView(frame: .zero)

        // Configure map view
        mapView.delegate = context.coordinator

        // Use dark/muted appearance for cosmic themes
        configureMapStyle(mapView, theme: mapStyleTheme)

        // Enable all interactions
        mapView.isRotateEnabled = true
        mapView.isPitchEnabled = true
        mapView.isZoomEnabled = true
        mapView.isScrollEnabled = true

        // Hide Apple Maps UI chrome
        mapView.showsCompass = false
        mapView.showsScale = false
        mapView.showsUserLocation = false

        // Disable points of interest for clean astro view
        mapView.pointOfInterestFilter = .excludingAll

        // Allow full zoom range — from street level to full globe view
        // maxCenterCoordinateDistance must be large enough to see the whole Earth as a ball
        mapView.cameraZoomRange = MKMapView.CameraZoomRange(
            minCenterCoordinateDistance: 500,           // ~street level
            maxCenterCoordinateDistance: 45_000_000     // full globe view
        )

        // Set initial camera
        setCamera(mapView: mapView, state: cameraState, animated: false)

        // Add gesture recognizers
        addGestureRecognizers(to: mapView, coordinator: context.coordinator)

        // Store theme
        context.coordinator.currentTheme = mapStyleTheme

        logger.info("Apple MapKit globe view created")

        return mapView
    }

    public func updateUIView(_ mapView: MKMapView, context: Context) {
        // Detect theme change
        if context.coordinator.currentTheme != mapStyleTheme {
            context.coordinator.currentTheme = mapStyleTheme
            configureMapStyle(mapView, theme: mapStyleTheme)
        }

        // Update camera if changed externally
        if context.coordinator.lastKnownCameraState != cameraState {
            setCamera(mapView: mapView, state: cameraState, animated: true)
            context.coordinator.lastKnownCameraState = cameraState
        }

        // Update markers
        updateMarkers(mapView: mapView, coordinator: context.coordinator)

        // Update astro lines
        updateAstroLines(mapView: mapView, coordinator: context.coordinator)
    }

    public func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    // MARK: - Map Style

    private func configureMapStyle(_ mapView: MKMapView, theme: MapStyleTheme) {
        switch theme {
        // Dark themes - use muted emphasis for better line visibility
        case .cosmic, .dark, .midnight:
            mapView.overrideUserInterfaceStyle = .dark
            let config = MKStandardMapConfiguration(emphasisStyle: .muted)
            config.pointOfInterestFilter = .excludingAll
            config.showsTraffic = false
            mapView.preferredConfiguration = config

        // Light themes - standard Apple Maps appearance
        case .light:
            mapView.overrideUserInterfaceStyle = .light
            let config = MKStandardMapConfiguration(emphasisStyle: .default)
            config.pointOfInterestFilter = .excludingAll
            config.showsTraffic = false
            mapView.preferredConfiguration = config

        case .streets:
            mapView.overrideUserInterfaceStyle = .light
            let config = MKStandardMapConfiguration(emphasisStyle: .default)
            config.pointOfInterestFilter = .includingAll
            config.showsTraffic = false
            mapView.preferredConfiguration = config

        case .outdoors:
            mapView.overrideUserInterfaceStyle = .light
            let config = MKStandardMapConfiguration(elevationStyle: .realistic)
            config.pointOfInterestFilter = .excludingAll
            config.showsTraffic = false
            mapView.preferredConfiguration = config

        // Satellite themes - use imagery configuration
        case .satellite:
            mapView.overrideUserInterfaceStyle = .dark
            let config = MKImageryMapConfiguration()
            mapView.preferredConfiguration = config

        case .hybrid:
            mapView.overrideUserInterfaceStyle = .dark
            let config = MKHybridMapConfiguration()
            config.pointOfInterestFilter = .excludingAll
            config.showsTraffic = false
            mapView.preferredConfiguration = config
        }
    }

    // MARK: - Camera

    private func setCamera(mapView: MKMapView, state: GlobeCameraState, animated: Bool) {
        let center = state.center.clLocationCoordinate
        let altitude = altitudeForZoom(state.zoom)

        let camera = MKMapCamera(
            lookingAtCenter: center,
            fromDistance: altitude,
            pitch: CGFloat(state.pitch),
            heading: state.bearing
        )

        if animated {
            UIView.animate(withDuration: 0.3) {
                mapView.camera = camera
            }
        } else {
            mapView.camera = camera
        }
    }

    private func altitudeForZoom(_ zoom: Double) -> Double {
        // Convert zoom level to altitude (meters)
        // At zoom 0, show full globe (~20M meters altitude)
        let baseAltitude = 20_000_000.0
        return baseAltitude / pow(2, zoom)
    }

    private func zoomForAltitude(_ altitude: Double) -> Double {
        let baseAltitude = 20_000_000.0
        guard altitude > 0 else { return 20 }
        return log2(baseAltitude / altitude)
    }

    // MARK: - Gestures

    private func addGestureRecognizers(to mapView: MKMapView, coordinator: Coordinator) {
        let tapGesture = UITapGestureRecognizer(target: coordinator, action: #selector(Coordinator.handleTap(_:)))
        mapView.addGestureRecognizer(tapGesture)

        let longPressGesture = UILongPressGestureRecognizer(target: coordinator, action: #selector(Coordinator.handleLongPress(_:)))
        longPressGesture.minimumPressDuration = 0.5
        mapView.addGestureRecognizer(longPressGesture)
    }

    // MARK: - Markers

    private func updateMarkers(mapView: MKMapView, coordinator: Coordinator) {
        let oldIds = Set(coordinator.markerAnnotations.values.map(\.id))
        let newIds = Set(markers.map(\.id))

        guard oldIds != newIds else { return }

        // Remove old markers
        let toRemove = coordinator.markerAnnotations.filter { !newIds.contains($0.value.id) }
        if !toRemove.isEmpty {
            mapView.removeAnnotations(Array(toRemove.keys))
            for key in toRemove.keys {
                coordinator.markerAnnotations.removeValue(forKey: key)
            }
        }

        // Add new markers
        let existingIds = Set(coordinator.markerAnnotations.values.map(\.id))
        for marker in markers where !existingIds.contains(marker.id) {
            let annotation = MKPointAnnotation()
            annotation.coordinate = marker.coordinate.clLocationCoordinate
            annotation.title = marker.title
            annotation.subtitle = marker.subtitle
            mapView.addAnnotation(annotation)
            coordinator.markerAnnotations[annotation] = marker
        }
    }

    // MARK: - Astro Lines

    private func updateAstroLines(mapView: MKMapView, coordinator: Coordinator) {
        let desiredLineIds = Set(astroLines.filter { lineVisibility.isVisible($0) }.map(\.id))
        let existingLineIds = Set(coordinator.lineOverlays.keys)

        // Remove lines no longer needed
        let toRemove = existingLineIds.subtracting(desiredLineIds)
        for id in toRemove {
            if let overlay = coordinator.lineOverlays[id] {
                mapView.removeOverlay(overlay)
                coordinator.lineOverlays.removeValue(forKey: id)
                coordinator.lineData.removeValue(forKey: id)
            }
        }

        // Add new visible lines
        let toAdd = desiredLineIds.subtracting(existingLineIds)
        for line in astroLines where toAdd.contains(line.id) {
            var coords = line.coordinates.map { $0.clLocationCoordinate }
            let polyline = MKPolyline(coordinates: &coords, count: coords.count)
            polyline.title = line.id

            coordinator.lineOverlays[line.id] = polyline
            coordinator.lineData[line.id] = line
            mapView.addOverlay(polyline, level: .aboveRoads)
        }
    }

    // MARK: - Coordinator

    public class Coordinator: NSObject, MKMapViewDelegate {
        let parent: AppleGlobeView
        var lastKnownCameraState: GlobeCameraState
        var currentTheme: MapStyleTheme
        var markerAnnotations: [MKPointAnnotation: GlobeMarker] = [:]
        var lineOverlays: [String: MKPolyline] = [:]
        var lineData: [String: AstroLine] = [:]
        private let logger = Logger(subsystem: "com.cartostar.globe", category: "Coordinator")

        init(parent: AppleGlobeView) {
            self.parent = parent
            self.lastKnownCameraState = parent.cameraState
            self.currentTheme = parent.mapStyleTheme
            super.init()
        }

        // MARK: - MKMapViewDelegate

        public func mapView(_ mapView: MKMapView, rendererFor overlay: MKOverlay) -> MKOverlayRenderer {
            guard let polyline = overlay as? MKPolyline,
                  let lineId = polyline.title,
                  let line = lineData[lineId] else {
                return MKOverlayRenderer(overlay: overlay)
            }

            let renderer = MKPolylineRenderer(polyline: polyline)
            renderer.strokeColor = planetUIColor(for: line.planet)
            renderer.lineWidth = lineWidth(for: line.lineType)
            renderer.alpha = 0.85

            // Dashed pattern for IC/DSC lines
            if line.lineType == .imumCoeli || line.lineType == .descendant {
                renderer.lineDashPattern = [8, 6]
            }

            return renderer
        }

        public func mapView(_ mapView: MKMapView, regionDidChangeAnimated animated: Bool) {
            let camera = mapView.camera
            let newState = GlobeCameraState(
                center: GlobeCoordinate(from: camera.centerCoordinate),
                zoom: parent.zoomForAltitude(camera.centerCoordinateDistance),
                pitch: Double(camera.pitch),
                bearing: camera.heading
            )

            if newState != lastKnownCameraState {
                lastKnownCameraState = newState
                DispatchQueue.main.async {
                    self.parent.cameraState = newState
                    self.parent.onInteraction?(.cameraChanged(newState))
                }
            }
        }

        public func mapView(_ mapView: MKMapView, viewFor annotation: MKAnnotation) -> MKAnnotationView? {
            guard let pointAnnotation = annotation as? MKPointAnnotation,
                  let marker = markerAnnotations[pointAnnotation] else {
                return nil
            }

            let reuseId = "marker-\(marker.type.rawValue)"
            var annotationView = mapView.dequeueReusableAnnotationView(withIdentifier: reuseId)

            if annotationView == nil {
                annotationView = MKAnnotationView(annotation: annotation, reuseIdentifier: reuseId)
                annotationView?.frame = CGRect(x: 0, y: 0, width: 24, height: 24)

                let markerView = createMarkerView(for: marker.type)
                annotationView?.addSubview(markerView)
            }

            annotationView?.annotation = annotation
            return annotationView
        }

        public func mapView(_ mapView: MKMapView, didSelect annotation: MKAnnotation) {
            guard let pointAnnotation = annotation as? MKPointAnnotation,
                  let marker = markerAnnotations[pointAnnotation] else {
                return
            }
            parent.onInteraction?(.markerTapped(marker))
        }

        // MARK: - Gesture Handlers

        @objc func handleTap(_ gesture: UITapGestureRecognizer) {
            guard gesture.state == .ended,
                  let mapView = gesture.view as? MKMapView else { return }

            let point = gesture.location(in: mapView)

            // Check if tapped near an astro line
            if let line = findLineAtPoint(point, in: mapView) {
                let coordinate = mapView.convert(point, toCoordinateFrom: mapView)
                parent.onInteraction?(.lineTapped(line, nearCoordinate: GlobeCoordinate(from: coordinate)))
                return
            }

            // Otherwise, report location tap
            let coordinate = mapView.convert(point, toCoordinateFrom: mapView)
            parent.onInteraction?(.locationTapped(GlobeCoordinate(from: coordinate)))
        }

        @objc func handleLongPress(_ gesture: UILongPressGestureRecognizer) {
            guard gesture.state == .began,
                  let mapView = gesture.view as? MKMapView else { return }

            let point = gesture.location(in: mapView)
            let coordinate = mapView.convert(point, toCoordinateFrom: mapView)
            parent.onInteraction?(.locationLongPressed(GlobeCoordinate(from: coordinate)))
        }

        // MARK: - Private Methods

        private func findLineAtPoint(_ point: CGPoint, in mapView: MKMapView) -> AstroLine? {
            let tapCoord = mapView.convert(point, toCoordinateFrom: mapView)
            let tapLocation = GlobeCoordinate(from: tapCoord)
            let tapThresholdKm = 50.0 // km radius for line hit-testing

            var closestLine: AstroLine?
            var closestDistance = Double.greatestFiniteMagnitude

            for (_, line) in lineData {
                for coord in line.coordinates {
                    let dist = haversineDistance(
                        lat1: tapLocation.latitude, lon1: tapLocation.longitude,
                        lat2: coord.latitude, lon2: coord.longitude
                    )
                    if dist < tapThresholdKm && dist < closestDistance {
                        closestDistance = dist
                        closestLine = line
                    }
                }
            }

            return closestLine
        }

        private func haversineDistance(lat1: Double, lon1: Double, lat2: Double, lon2: Double) -> Double {
            let R = 6371.0
            let dLat = (lat2 - lat1) * .pi / 180
            let dLon = (lon2 - lon1) * .pi / 180
            let a = sin(dLat / 2) * sin(dLat / 2) +
                    cos(lat1 * .pi / 180) * cos(lat2 * .pi / 180) *
                    sin(dLon / 2) * sin(dLon / 2)
            let c = 2 * atan2(sqrt(a), sqrt(1 - a))
            return R * c
        }

        private func createMarkerView(for type: GlobeMarker.MarkerType) -> UIView {
            let size: CGFloat = 24
            let view = UIView(frame: CGRect(x: 0, y: 0, width: size, height: size))

            let color: UIColor
            switch type {
            case .birthPlace:
                color = UIColor(Color.acAccent)
            case .selectedLocation:
                color = UIColor(Color.acAmber400)
            case .scoutResult:
                color = UIColor(Color.acSuccess)
            case .favorite:
                color = UIColor(Color.acPlanetVenus)
            case .custom:
                color = UIColor(Color.acZinc400)
            }

            let circleLayer = CAShapeLayer()
            circleLayer.path = UIBezierPath(ovalIn: view.bounds.insetBy(dx: 2, dy: 2)).cgPath
            circleLayer.fillColor = color.cgColor
            circleLayer.strokeColor = UIColor.white.cgColor
            circleLayer.lineWidth = 2
            view.layer.addSublayer(circleLayer)

            view.layer.shadowColor = color.cgColor
            view.layer.shadowOffset = .zero
            view.layer.shadowRadius = 4
            view.layer.shadowOpacity = 0.6

            return view
        }

        private func planetUIColor(for planet: Planet) -> UIColor {
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

        private func lineWidth(for lineType: AstroLineType) -> CGFloat {
            switch lineType {
            case .ascendant, .midheaven: return 2.5
            case .descendant, .imumCoeli: return 2.0
            }
        }
    }
}
