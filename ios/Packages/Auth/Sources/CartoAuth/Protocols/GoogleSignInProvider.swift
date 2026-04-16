import Foundation

/// Result from Google Sign In containing both tokens needed for Supabase exchange
public struct GoogleSignInResult: Sendable {
    public let idToken: String
    public let accessToken: String

    public init(idToken: String, accessToken: String) {
        self.idToken = idToken
        self.accessToken = accessToken
    }
}

/// Protocol for Google Sign In provider
@available(iOS 17.0, *)
public protocol GoogleSignInProvider: Sendable {
    /// Request ID token + access token from Google
    func requestTokens() async throws -> GoogleSignInResult
}
