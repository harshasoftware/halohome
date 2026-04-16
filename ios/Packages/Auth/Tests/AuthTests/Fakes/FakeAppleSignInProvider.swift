import Foundation
@testable import CartoAuth

/// Fake Apple Sign In provider for testing
final class FakeAppleSignInProvider: AppleSignInProvider, @unchecked Sendable {
    var shouldSucceed = true
    var shouldThrowCancellation = false
    var returnedIDToken = "fake.id.token"
    var requestCount = 0
    var capturedOriginalNonce: String?
    var capturedHashedNonce: String?
    
    func requestIDToken(originalNonce: String, hashedNonce: String) async throws -> (idToken: String, nonce: String) {
        requestCount += 1
        capturedOriginalNonce = originalNonce
        capturedHashedNonce = hashedNonce
        
        if shouldThrowCancellation {
            throw AuthError.cancelled
        }
        
        if !shouldSucceed {
            throw AuthError.invalidCredentials
        }
        
        // Return the original nonce as passed in
        return (idToken: returnedIDToken, nonce: originalNonce)
    }
    
    func reset() {
        shouldSucceed = true
        shouldThrowCancellation = false
        requestCount = 0
        capturedOriginalNonce = nil
        capturedHashedNonce = nil
    }
}
