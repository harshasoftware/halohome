import XCTest
@testable import FeatureScout

final class FeatureScoutTests: XCTestCase {

    // MARK: - Model Tests

    func testScoutCategoryAllCases() {
        XCTAssertEqual(ScoutCategory.allCases.count, 6)
        XCTAssertTrue(ScoutCategory.allCases.contains(.career))
        XCTAssertTrue(ScoutCategory.allCases.contains(.love))
        XCTAssertTrue(ScoutCategory.allCases.contains(.health))
        XCTAssertTrue(ScoutCategory.allCases.contains(.home))
        XCTAssertTrue(ScoutCategory.allCases.contains(.wellbeing))
        XCTAssertTrue(ScoutCategory.allCases.contains(.wealth))
    }

    func testScoutCategoryHasLabels() {
        for category in ScoutCategory.allCases {
            XCTAssertFalse(category.label.isEmpty)
            XCTAssertFalse(category.iconName.isEmpty)
            XCTAssertFalse(category.description.isEmpty)
        }
    }

    func testLocationNatureLabels() {
        XCTAssertEqual(LocationNature.beneficial.label, "Beneficial")
        XCTAssertEqual(LocationNature.challenging.label, "Challenging")
        XCTAssertEqual(LocationNature.mixed.label, "Mixed")
    }

    func testCityCountryFlag() {
        let city = City(
            name: "Tokyo",
            country: "Japan",
            countryCode: "JP",
            latitude: 35.6762,
            longitude: 139.6503
        )
        XCTAssertEqual(city.countryFlag, "🇯🇵")
    }

    func testScoutLocationCountryFlag() {
        let location = ScoutLocation(
            cityName: "Paris",
            country: "France",
            countryCode: "FR",
            latitude: 48.8566,
            longitude: 2.3522,
            benefitScore: 85,
            nature: .beneficial,
            influences: []
        )
        XCTAssertEqual(location.countryFlag, "🇫🇷")
        XCTAssertEqual(location.score, 85)
    }

    func testScoutInfluenceLineKey() {
        let influence = ScoutInfluence(
            planet: "Sun",
            angle: "MC",
            distanceKm: 100
        )
        XCTAssertEqual(influence.lineKey, "Sun:MC")
    }

    func testScoutResultTopLocations() {
        let locations = (1...20).map { i in
            ScoutLocation(
                cityName: "City \(i)",
                country: "Country",
                countryCode: "XX",
                latitude: Double(i),
                longitude: Double(i),
                benefitScore: Double(100 - i),
                nature: .beneficial,
                influences: []
            )
        }

        let result = ScoutResult(
            category: .career,
            locations: locations,
            totalBeneficial: 20,
            totalChallenging: 0
        )

        let top5 = result.topLocations(5)
        XCTAssertEqual(top5.count, 5)
        XCTAssertEqual(top5.first?.cityName, "City 1")
        XCTAssertEqual(top5.first?.score, 99)
    }

    func testScoutProgressPhases() {
        XCTAssertEqual(ScoutProgress.idle.phase, .idle)
        XCTAssertEqual(ScoutProgress.idle.percentage, 0)

        XCTAssertEqual(ScoutProgress.complete.phase, .complete)
        XCTAssertEqual(ScoutProgress.complete.percentage, 100)

        let computing = ScoutProgress(
            phase: .computing,
            percentage: 50,
            currentCategory: .career,
            message: "Processing..."
        )
        XCTAssertEqual(computing.phase, .computing)
        XCTAssertEqual(computing.percentage, 50)
        XCTAssertEqual(computing.currentCategory, .career)
        XCTAssertEqual(computing.message, "Processing...")
    }

    func testScoutLocationScoreFields() {
        let location = ScoutLocation(
            cityName: "Tokyo",
            country: "Japan",
            countryCode: "JP",
            latitude: 35.68,
            longitude: 139.69,
            benefitScore: 72.5,
            intensityScore: 45.0,
            volatilityScore: 12.0,
            mixedFlag: true,
            nature: .mixed,
            influences: [
                ScoutInfluence(planet: "Sun", angle: "MC", distanceKm: 120),
                ScoutInfluence(planet: "Saturn", angle: "ASC", distanceKm: 200),
            ]
        )

        XCTAssertEqual(location.score, 72.5)
        XCTAssertEqual(location.intensityScore, 45.0)
        XCTAssertEqual(location.volatilityScore, 12.0)
        XCTAssertTrue(location.mixedFlag)
        XCTAssertEqual(location.nature, .mixed)
        XCTAssertEqual(location.influences.count, 2)
        XCTAssertEqual(location.influences[0].lineKey, "Sun:MC")
    }
}
