import XCTest
import OSLog
@testable import Core

final class AppLoggerTests: XCTestCase {
    
    // MARK: - Smoke Tests
    
    func testLogging_DoesNotCrash() {
        // Test that logging methods don't crash and compile correctly
        XCTAssertNoThrow(AppLogger.debug("Debug message"))
        XCTAssertNoThrow(AppLogger.info("Info message"))
        XCTAssertNoThrow(AppLogger.error("Error message"))
    }
    
    func testLogging_WithCategory() {
        // Test logging with specific categories
        XCTAssertNoThrow(AppLogger.debug("Network debug", category: AppLogger.networking))
        XCTAssertNoThrow(AppLogger.info("AI info", category: AppLogger.ai))
        XCTAssertNoThrow(AppLogger.error("UI error", category: AppLogger.ui))
    }
    
    func testLoggerCategories_AreConfigured() {
        // Test that logger categories are properly configured
        XCTAssertNotNil(AppLogger.networking)
        XCTAssertNotNil(AppLogger.ai)
        XCTAssertNotNil(AppLogger.ui)
    }
    
    // MARK: - Redaction Tests
    
    func testRedacted_APIKeys() {
        let apiKey = "sk-1234567890abcdef"
        let redacted = AppLogger.redacted("API Key: \(apiKey)")
        
        XCTAssertEqual(redacted, "API Key: •••")
        XCTAssertFalse(redacted.contains("sk-1234567890abcdef"))
    }
    
    func testRedacted_PublicKeys() {
        let publicKey = "pk-abcdef1234567890"
        let redacted = AppLogger.redacted("Public Key: \(publicKey)")
        
        XCTAssertEqual(redacted, "Public Key: •••")
        XCTAssertFalse(redacted.contains("pk-abcdef1234567890"))
    }
    
    func testRedacted_BearerTokens() {
        let token = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        let redacted = AppLogger.redacted("Authorization: \(token)")
        
        XCTAssertEqual(redacted, "Authorization: •••")
        XCTAssertFalse(redacted.contains("Bearer"))
        XCTAssertFalse(redacted.contains("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"))
    }
    
    func testRedacted_JWTTokens() {
        let jwt = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        let redacted = AppLogger.redacted("Token: \(jwt)")
        
        XCTAssertEqual(redacted, "Token: •••")
        XCTAssertFalse(redacted.contains("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"))
    }
    
    func testRedacted_LongBase64Strings() {
        let longBase64 = "dGhpc2lzYXZlcnlsb25nYmFzZTY0ZW5jb2RlZHN0cmluZ3RoYXRzaG91bGRiZXJlZGFjdGVk"
        let redacted = AppLogger.redacted("Data: \(longBase64)")
        
        XCTAssertEqual(redacted, "Data: •••")
        XCTAssertFalse(redacted.contains(longBase64))
    }
    
    func testRedacted_MultipleSecrets() {
        let input = "API: sk-1234567890 Token: Bearer abc123def456 Key: pk-abcdef123456"
        let redacted = AppLogger.redacted(input)
        
        XCTAssertEqual(redacted, "API: ••• Token: ••• Key: •••")
        XCTAssertFalse(redacted.contains("sk-1234567890"))
        XCTAssertFalse(redacted.contains("Bearer abc123def456"))
        XCTAssertFalse(redacted.contains("pk-abcdef123456"))
    }
    
    func testRedacted_SafeStrings() {
        let safeString = "This is a safe string with no secrets"
        let redacted = AppLogger.redacted(safeString)
        
        XCTAssertEqual(redacted, safeString)
    }
    
    func testRedacted_ShortStrings() {
        // Short strings that might look like secrets but aren't long enough
        let shortString = "sk-123"  // Too short to be a real API key
        let redacted = AppLogger.redacted(shortString)
        
        // Should still be redacted if it matches the pattern
        XCTAssertEqual(redacted, "•••")
    }
    
    func testRedacted_EmptyString() {
        let empty = ""
        let redacted = AppLogger.redacted(empty)
        
        XCTAssertEqual(redacted, "")
    }
    
    // MARK: - RedactedData Tests
    
    func testRedactedData_CustomStringConvertible() {
        struct TestData: CustomStringConvertible {
            var description: String {
                return "API Key: sk-1234567890abcdef"
            }
        }
        
        let data = TestData()
        let redacted = AppLogger.redactedData(data)
        
        XCTAssertEqual(redacted, "API Key: •••")
    }
    
    // MARK: - Query Parameter Redaction Tests
    
    func testRedacted_APIKeyQueryParam() {
        let url1 = "https://api.example.com/data?api_key=sk-1234567890abcdef&other=value"
        let url2 = "https://api.example.com/data?other=value&api_key=pk-abcdef1234567890"
        
        let redacted1 = AppLogger.redacted(url1)
        let redacted2 = AppLogger.redacted(url2)
        
        XCTAssertTrue(redacted1.contains("api_key=•••"))
        XCTAssertTrue(redacted2.contains("api_key=•••"))
        XCTAssertFalse(redacted1.contains("sk-1234567890abcdef"))
        XCTAssertFalse(redacted2.contains("pk-abcdef1234567890"))
    }
    
    func testRedacted_AuthorizationQueryParam() {
        let url = "https://api.example.com/data?Authorization=Bearer_token123&other=value"
        let redacted = AppLogger.redacted(url)
        
        // The entire "Authorization=Bearer_token123" is replaced with "•••"
        XCTAssertTrue(redacted.contains("•••"))
        XCTAssertFalse(redacted.contains("Bearer_token123"))
    }
    
    // MARK: - Case-Insensitive Tests
    
    func testRedacted_CaseInsensitiveBearerToken() {
        let token1 = "bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        let token2 = "BEARER eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        let token3 = "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"
        
        let redacted1 = AppLogger.redacted("Authorization: \(token1)")
        let redacted2 = AppLogger.redacted("Authorization: \(token2)")
        let redacted3 = AppLogger.redacted("Authorization: \(token3)")
        
        XCTAssertEqual(redacted1, "Authorization: •••")
        XCTAssertEqual(redacted2, "Authorization: •••")
        XCTAssertEqual(redacted3, "Authorization: •••")
    }
    
    func testRedacted_CaseInsensitiveAuthorizationHeader() {
        let header1 = "authorization: bearer_token123"
        let header2 = "AUTHORIZATION: bearer_token123"
        let header3 = "Authorization: bearer_token123"
        
        let redacted1 = AppLogger.redacted(header1)
        let redacted2 = AppLogger.redacted(header2)
        let redacted3 = AppLogger.redacted(header3)
        
        XCTAssertEqual(redacted1, "•••")
        XCTAssertEqual(redacted2, "•••")
        XCTAssertEqual(redacted3, "•••")
    }
    
    // MARK: - Enhanced Assertion Tests
    
    func testRedacted_LongBase64Strings_ContainsAssertion() {
        let longBase64 = "dGhpc2lzYXZlcnlsb25nYmFzZTY0ZW5jb2RlZHN0cmluZ3RoYXRzaG91bGRiZXJlZGFjdGVk"
        let input = "Data payload: \(longBase64) end"
        let redacted = AppLogger.redacted(input)
        
        XCTAssertTrue(redacted.contains("•••"))
        XCTAssertFalse(redacted.contains(longBase64))
        XCTAssertTrue(redacted.contains("Data payload:"))
        XCTAssertTrue(redacted.contains("end"))
    }
    
    func testRedacted_MultipleSecrets_DoesNotContain() {
        let input = "API: sk-1234567890 Token: Bearer abc123def456 Key: pk-abcdef123456"
        let redacted = AppLogger.redacted(input)
        
        XCTAssertFalse(redacted.contains("sk-1234567890"))
        XCTAssertFalse(redacted.contains("abc123def456"))
        XCTAssertFalse(redacted.contains("pk-abcdef123456"))
        XCTAssertTrue(redacted.contains("•••"))
    }
    
    // MARK: - Performance Tests
    
    func testRedacted_Performance() {
        let longString = String(repeating: "This is a test string with sk-1234567890abcdef and Bearer token123 ", count: 100)
        
        measure {
            _ = AppLogger.redacted(longString)
        }
    }
}
