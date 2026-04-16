import Testing
import Foundation
@testable import FeatureBirthData

@Suite("BirthData Model Tests")
struct BirthDataModelTests {

    // MARK: - Initialization Tests

    @Test("BirthData initializes with correct values")
    func testInitialization() {
        let date = Date()
        let time = Date()
        let data = BirthData(
            name: "Test Chart",
            date: date,
            time: time,
            isTimeUnknown: false,
            latitude: 40.7128,
            longitude: -74.0060,
            placeName: "New York, NY",
            timezone: TimeZone(identifier: "America/New_York")!
        )

        #expect(data.name == "Test Chart")
        #expect(data.date == date)
        #expect(data.time == time)
        #expect(data.isTimeUnknown == false)
        #expect(data.latitude == 40.7128)
        #expect(data.longitude == -74.0060)
        #expect(data.placeName == "New York, NY")
        #expect(data.timezone.identifier == "America/New_York")
    }

    @Test("BirthData with unknown time sets time to nil")
    func testUnknownTime() {
        let data = BirthData(
            name: "Test",
            date: Date(),
            time: nil,
            isTimeUnknown: true,
            latitude: 0,
            longitude: 0,
            placeName: "Test",
            timezone: .current
        )

        #expect(data.time == nil)
        #expect(data.isTimeUnknown == true)
        #expect(data.formattedTime == "Time Unknown")
    }

    // MARK: - Validation Tests

    @Test("Validation fails for empty name")
    func testEmptyNameValidation() {
        let data = BirthData(
            name: "",
            date: Date(),
            time: Date(),
            isTimeUnknown: false,
            latitude: 40.7128,
            longitude: -74.0060,
            placeName: "New York, NY",
            timezone: .current
        )

        let errors = data.validate()
        #expect(errors.contains(.nameEmpty))
    }

    @Test("Validation fails for name too long")
    func testNameTooLongValidation() {
        let longName = String(repeating: "A", count: 51)
        let data = BirthData(
            name: longName,
            date: Date(),
            time: Date(),
            isTimeUnknown: false,
            latitude: 40.7128,
            longitude: -74.0060,
            placeName: "New York, NY",
            timezone: .current
        )

        let errors = data.validate()
        #expect(errors.contains(.nameTooLong))
    }

    @Test("Validation fails for future date")
    func testFutureDateValidation() {
        let futureDate = Calendar.current.date(byAdding: .day, value: 1, to: Date())!
        let data = BirthData(
            name: "Test",
            date: futureDate,
            time: Date(),
            isTimeUnknown: false,
            latitude: 40.7128,
            longitude: -74.0060,
            placeName: "New York, NY",
            timezone: .current
        )

        let errors = data.validate()
        #expect(errors.contains(.dateInFuture))
    }

    @Test("Validation fails for invalid coordinates")
    func testInvalidCoordinatesValidation() {
        let data = BirthData(
            name: "Test",
            date: Date(),
            time: Date(),
            isTimeUnknown: false,
            latitude: 100, // Invalid: > 90
            longitude: -74.0060,
            placeName: "Test",
            timezone: .current
        )

        let errors = data.validate()
        #expect(errors.contains(.invalidCoordinates))
    }

    @Test("Validation fails for empty place name")
    func testEmptyPlaceNameValidation() {
        let data = BirthData(
            name: "Test",
            date: Date(),
            time: Date(),
            isTimeUnknown: false,
            latitude: 40.7128,
            longitude: -74.0060,
            placeName: "",
            timezone: .current
        )

        let errors = data.validate()
        #expect(errors.contains(.placeNameEmpty))
    }

    @Test("Valid birth data passes validation")
    func testValidData() {
        let data = BirthData.sample
        let errors = data.validate()
        #expect(errors.isEmpty)
        #expect(data.isValid)
    }

    // MARK: - Computed Properties Tests

    @Test("DateTime combines date and time correctly")
    func testDateTimeCombination() {
        let calendar = Calendar.current
        let date = calendar.date(from: DateComponents(year: 2000, month: 6, day: 15))!
        let time = calendar.date(from: DateComponents(hour: 14, minute: 30))!

        let data = BirthData(
            name: "Test",
            date: date,
            time: time,
            isTimeUnknown: false,
            latitude: 0,
            longitude: 0,
            placeName: "Test",
            timezone: .current
        )

        let dateTime = data.dateTime
        let components = calendar.dateComponents([.year, .month, .day, .hour, .minute], from: dateTime)

        #expect(components.year == 2000)
        #expect(components.month == 6)
        #expect(components.day == 15)
        #expect(components.hour == 14)
        #expect(components.minute == 30)
    }

    @Test("DateTime uses noon for unknown time")
    func testDateTimeWithUnknownTime() {
        let calendar = Calendar.current
        let date = calendar.date(from: DateComponents(year: 2000, month: 6, day: 15))!

        let data = BirthData(
            name: "Test",
            date: date,
            time: nil,
            isTimeUnknown: true,
            latitude: 0,
            longitude: 0,
            placeName: "Test",
            timezone: .current
        )

        let dateTime = data.dateTime
        let components = calendar.dateComponents([.hour], from: dateTime)

        #expect(components.hour == 12)
    }

    // MARK: - Codable Tests

    @Test("BirthData encodes and decodes correctly")
    func testCodable() throws {
        let original = BirthData.sample

        let encoder = JSONEncoder()
        let data = try encoder.encode(original)

        let decoder = JSONDecoder()
        let decoded = try decoder.decode(BirthData.self, from: data)

        #expect(decoded.id == original.id)
        #expect(decoded.name == original.name)
        #expect(decoded.latitude == original.latitude)
        #expect(decoded.longitude == original.longitude)
        #expect(decoded.placeName == original.placeName)
        #expect(decoded.timezone.identifier == original.timezone.identifier)
    }
}
