import XCTest
@testable import Core

final class DiagnosticsTests: XCTestCase {
    
    func testNoOpCrashReporterDoesNothing() {
        let reporter = NoOpCrashReporter()
        
        // Should not crash or throw
        reporter.setEnabled(true)
        reporter.setUser(id: "123", email: "test@example.com", name: "Test User")
        reporter.setAttributes(["key": "value"])
        reporter.recordError(TestError.sample, context: [:], isFatal: false)
        reporter.log(message: "Test", level: .info)
        
        // Test passes if no crash occurs
        XCTAssertTrue(true)
    }
    
    func testPIISanitizerFiltersAllowedKeys() {
        let input = [
            "appVersion": "1.0.0",
            "email": "user@example.com",  // Should be filtered
            "plan": "pro",
            "password": "secret123",  // Should be filtered
            "locale": "en_US"
        ]
        
        let filtered = PIISanitizer.filter(input)
        
        XCTAssertEqual(filtered["appVersion"], "1.0.0")
        XCTAssertEqual(filtered["plan"], "pro")
        XCTAssertEqual(filtered["locale"], "en_US")
        XCTAssertNil(filtered["email"])
        XCTAssertNil(filtered["password"])
    }
    
    func testPIISanitizerTruncatesLongStrings() {
        let longString = String(repeating: "a", count: 500)
        let input = ["appVersion": longString]
        
        let filtered = PIISanitizer.filter(input)
        
        XCTAssertEqual(filtered["appVersion"]?.count, 256)
    }
    
    func testPIISanitizerNeverReturnsEmail() {
        XCTAssertNil(PIISanitizer.sanitizeEmail("user@example.com"))
        XCTAssertNil(PIISanitizer.sanitizeEmail(""))
        XCTAssertNil(PIISanitizer.sanitizeEmail(nil))
    }
}

private enum TestError: Error {
    case sample
}
