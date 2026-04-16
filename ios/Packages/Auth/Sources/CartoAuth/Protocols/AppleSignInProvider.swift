import Foundation

/// Protocol for Apple Sign In functionality
public protocol AppleSignInProvider: Sendable {
    /// Request an ID token from Apple Sign In
    /// - Parameters:
    ///   - originalNonce: The original unhashed nonce
    ///   - hashedNonce: The SHA256 hashed nonce to use in the Apple request
    /// - Returns: Tuple containing the ID token and original nonce
    func requestIDToken(originalNonce: String, hashedNonce: String) async throws -> (idToken: String, nonce: String)
}
