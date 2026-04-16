import XCTest
@testable import FeatureGlobe

final class FeatureGlobeTests: XCTestCase {

    // MARK: - Coordinate Tests

    func testGlobeCoordinateCreation() {
        let coordinate = GlobeCoordinate(latitude: 40.7128, longitude: -74.0060)

        XCTAssertEqual(coordinate.latitude, 40.7128)
        XCTAssertEqual(coordinate.longitude, -74.0060)
    }

    func testGlobeCoordinateCLLocationConversion() {
        let coordinate = GlobeCoordinate(latitude: 34.0522, longitude: -118.2437)
        let clCoordinate = coordinate.clLocationCoordinate

        XCTAssertEqual(clCoordinate.latitude, 34.0522)
        XCTAssertEqual(clCoordinate.longitude, -118.2437)
    }

    // MARK: - Camera State Tests

    func testCameraStateInitialValues() {
        let camera = GlobeCameraState.initial

        XCTAssertEqual(camera.center.latitude, 20)
        XCTAssertEqual(camera.center.longitude, 0)
        XCTAssertEqual(camera.zoom, 1.5)
        XCTAssertEqual(camera.pitch, 0)
        XCTAssertEqual(camera.bearing, 0)
    }

    func testCameraStateCustomValues() {
        let camera = GlobeCameraState(
            center: GlobeCoordinate(latitude: 51.5074, longitude: -0.1278),
            zoom: 10,
            pitch: 45,
            bearing: 90
        )

        XCTAssertEqual(camera.center.latitude, 51.5074)
        XCTAssertEqual(camera.zoom, 10)
        XCTAssertEqual(camera.pitch, 45)
        XCTAssertEqual(camera.bearing, 90)
    }

    // MARK: - Astro Line Type Tests

    func testAstroLineTypeDisplayNames() {
        XCTAssertEqual(AstroLineType.ascendant.displayName, "Ascendant")
        XCTAssertEqual(AstroLineType.descendant.displayName, "Descendant")
        XCTAssertEqual(AstroLineType.midheaven.displayName, "Midheaven")
        XCTAssertEqual(AstroLineType.imumCoeli.displayName, "Imum Coeli")
    }

    func testAstroLineTypeShortNames() {
        XCTAssertEqual(AstroLineType.ascendant.shortName, "ASC")
        XCTAssertEqual(AstroLineType.descendant.shortName, "DSC")
        XCTAssertEqual(AstroLineType.midheaven.shortName, "MC")
        XCTAssertEqual(AstroLineType.imumCoeli.shortName, "IC")
    }

    // MARK: - Planet Tests

    func testPlanetSymbols() {
        XCTAssertEqual(Planet.sun.symbol, "\u{2609}")
        XCTAssertEqual(Planet.moon.symbol, "\u{263D}")
        XCTAssertEqual(Planet.venus.symbol, "\u{2640}")
        XCTAssertEqual(Planet.mars.symbol, "\u{2642}")
    }

    func testAllPlanetsHaveSymbols() {
        for planet in Planet.allCases {
            XCTAssertFalse(planet.symbol.isEmpty, "\(planet.rawValue) should have a symbol")
        }
    }

    // MARK: - Astro Line Tests

    func testAstroLineCreation() {
        let coordinates = [
            GlobeCoordinate(latitude: -90, longitude: 0),
            GlobeCoordinate(latitude: 0, longitude: 0),
            GlobeCoordinate(latitude: 90, longitude: 0)
        ]

        let line = AstroLine(
            planet: .sun,
            lineType: .midheaven,
            coordinates: coordinates
        )

        XCTAssertEqual(line.planet, .sun)
        XCTAssertEqual(line.lineType, .midheaven)
        XCTAssertEqual(line.coordinates.count, 3)
    }

    func testAstroLineDisplayName() {
        let line = AstroLine(
            planet: .venus,
            lineType: .ascendant,
            coordinates: []
        )

        XCTAssertEqual(line.displayName, "Venus Ascendant")
        XCTAssertEqual(line.shortName, "Venus ASC")
    }

    // MARK: - Line Visibility Tests

    func testLineVisibilityAll() {
        let visibility = AstroLineVisibility.all

        XCTAssertTrue(visibility.visiblePlanets.contains(.sun))
        XCTAssertTrue(visibility.visiblePlanets.contains(.pluto))
        XCTAssertTrue(visibility.visibleLineTypes.contains(.ascendant))
        XCTAssertTrue(visibility.visibleLineTypes.contains(.imumCoeli))
    }

    func testLineVisibilityNone() {
        let visibility = AstroLineVisibility.none

        XCTAssertTrue(visibility.visiblePlanets.isEmpty)
        XCTAssertTrue(visibility.visibleLineTypes.isEmpty)
    }

    func testLineVisibilityFilter() {
        var visibility = AstroLineVisibility()
        visibility.visiblePlanets = [.sun, .moon]
        visibility.visibleLineTypes = [.ascendant, .midheaven]

        let sunAscLine = AstroLine(planet: .sun, lineType: .ascendant, coordinates: [])
        let marsIcLine = AstroLine(planet: .mars, lineType: .imumCoeli, coordinates: [])
        let moonMcLine = AstroLine(planet: .moon, lineType: .midheaven, coordinates: [])

        XCTAssertTrue(visibility.isVisible(sunAscLine))
        XCTAssertFalse(visibility.isVisible(marsIcLine))
        XCTAssertTrue(visibility.isVisible(moonMcLine))
    }

    // MARK: - Selected Location Tests

    func testSelectedLocationWithName() {
        let location = SelectedLocation(
            coordinate: GlobeCoordinate(latitude: 48.8566, longitude: 2.3522),
            name: "Paris",
            country: "France"
        )

        XCTAssertEqual(location.displayName, "Paris, France")
    }

    func testSelectedLocationWithoutName() {
        let location = SelectedLocation(
            coordinate: GlobeCoordinate(latitude: 48.8566, longitude: 2.3522)
        )

        XCTAssertEqual(location.displayName, "48.8566, 2.3522")
    }

    // MARK: - Globe Marker Tests

    func testGlobeMarkerCreation() {
        let marker = GlobeMarker(
            coordinate: GlobeCoordinate(latitude: 35.6762, longitude: 139.6503),
            title: "Tokyo",
            subtitle: "Japan",
            type: .scoutResult
        )

        XCTAssertEqual(marker.title, "Tokyo")
        XCTAssertEqual(marker.subtitle, "Japan")
        XCTAssertEqual(marker.type, .scoutResult)
    }

    // MARK: - PMTiles Configuration Tests

    func testPMTilesDefaultConfiguration() {
        let config = PMTilesConfiguration.astrocarto

        XCTAssertEqual(config.url.absoluteString, "https://tiles.cartostar.com/globe.pmtiles")
        XCTAssertTrue(config.offlineEnabled)
    }

    // MARK: - Stub Provider Tests

    func testStubAstroLineProvider() async throws {
        let provider = StubAstroLineProvider()
        let bundle = try await provider.calculateAstroLines(
            birthDate: Date(),
            birthTime: Date(),
            birthLocation: GlobeCoordinate(latitude: 0, longitude: 0)
        )

        // Should return lines for all planets and types
        let expectedCount = Planet.allCases.count * AstroLineType.allCases.count
        XCTAssertEqual(bundle.planetaryLines.count, expectedCount)

        // Stub returns empty aspect/paran/zenith arrays
        XCTAssertTrue(bundle.aspectLines.isEmpty)
        XCTAssertTrue(bundle.paranLines.isEmpty)
        XCTAssertTrue(bundle.zenithPoints.isEmpty)
    }

    func testStubGeocodingProvider() async throws {
        let provider = StubGeocodingProvider()
        let location = try await provider.reverseGeocode(
            coordinate: GlobeCoordinate(latitude: 40.7128, longitude: -74.0060)
        )

        XCTAssertEqual(location.coordinate.latitude, 40.7128)
        XCTAssertEqual(location.coordinate.longitude, -74.0060)
    }
}
