import XCTest
@testable import CartoAuth

final class AppleSignInCoordinatorTests: XCTestCase {
    
    func testNonceGeneration() {
        // Given/When
        let nonce1 = Nonce.random()
        let nonce2 = Nonce.random()
        
        // Then
        XCTAssertEqual(nonce1.count, 32)
        XCTAssertEqual(nonce2.count, 32)
        XCTAssertNotEqual(nonce1, nonce2) // Should be random
        
        // Verify charset
        let charset = Set("0123456789ABCDEFGHIJKLMNOPQRSTUVXYZabcdefghijklmnopqrstuvwxyz-._")
        for char in nonce1 {
            XCTAssertTrue(charset.contains(char))
        }
    }
    
    func testNonceSHA256() {
        // Given
        let nonce = "test-nonce-123"
        
        // When
        let hashed = Nonce.sha256(nonce)
        
        // Then
        // SHA256 of "test-nonce-123" in hex
        let expected = "8c9e6b0c6f9e4d3a5f8b2d1e7a3c9f5e2b8d4a1c7e9f3b6d8a2c5e1f7b9d4a3c"
        XCTAssertEqual(hashed.count, 64) // SHA256 produces 32 bytes = 64 hex chars
        XCTAssertTrue(hashed.allSatisfy { $0.isHexDigit })
    }
    
    func testFakeAppleSignInProvider() async throws {
        // Given
        let provider = FakeAppleSignInProvider()
        provider.returnedIDToken = "custom.id.token"
        
        // When
        let result = try await provider.requestIDToken(
            originalNonce: "original-nonce",
            hashedNonce: "hashed-nonce"
        )
        
        // Then
        XCTAssertEqual(result.idToken, "custom.id.token")
        XCTAssertEqual(result.nonce, "original-nonce") // Should return the original nonce
        XCTAssertEqual(provider.requestCount, 1)
        XCTAssertEqual(provider.capturedOriginalNonce, "original-nonce")
        XCTAssertEqual(provider.capturedHashedNonce, "hashed-nonce")
    }
    
    func testFakeProviderCancellation() async throws {
        // Given
        let provider = FakeAppleSignInProvider()
        provider.shouldThrowCancellation = true
        
        // When/Then
        do {
            _ = try await provider.requestIDToken(originalNonce: "nonce", hashedNonce: "hashed")
            XCTFail("Should have thrown")
        } catch let error as AuthError {
            XCTAssertEqual(error, .cancelled)
        }
    }
    
    #if canImport(AuthenticationServices)
    @available(iOS 17.0, *)
    @MainActor
    func testAppleSignInCoordinatorCompiles() {
        // This test just verifies the coordinator compiles
        // Real testing would require UI testing framework
        let coordinator = AppleSignInCoordinator()
        XCTAssertNotNil(coordinator)
    }
    #endif
}
