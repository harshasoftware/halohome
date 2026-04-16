import Foundation
import Core

/// Token provider protocol for Storage module
/// Note: Also conforms to Networking.TokenProvider via extension
public protocol TokenProvider: Sendable {
    func currentToken() -> String?
}

/// Keychain-based token provider for authentication
/// Conforms to both CartoStorage.TokenProvider and Networking.TokenProvider
public struct KeychainTokenProvider: TokenProvider {
    private let keychain: SecureStore
    private let tokenKey: String
    
    /// Creates a token provider that reads from keychain
    /// - Parameters:
    ///   - keychain: The keychain store to use
    ///   - tokenKey: The key to read the token from (defaults to auth access token)
    public init(
        keychain: SecureStore = KeychainStore(),
        tokenKey: String = KeychainStore.Keys.authAccessToken
    ) {
        self.keychain = keychain
        self.tokenKey = tokenKey
    }
    
    public func currentToken() -> String? {
        do {
            let token = try keychain.getString(tokenKey)
            if token != nil {
                AppLogger.debug("Retrieved auth token from keychain", category: AppLogger.storage)
            }
            return token
        } catch {
            AppLogger.error("Failed to retrieve auth token: \(error)", category: AppLogger.storage)
            return nil
        }
    }
}

// MARK: - Networking.TokenProvider Conformance

#if canImport(Networking)
import Networking

/// Conform to Networking.TokenProvider so KeychainTokenProvider can be used with AuthInterceptor
extension KeychainTokenProvider: Networking.TokenProvider {
    // currentToken() is already implemented above and satisfies both protocols
}
#endif
