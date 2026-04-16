import Foundation

/// Represents an authenticated session
public struct AuthSession: Sendable, Equatable, Codable {
    /// Access token for API requests
    public let accessToken: String
    
    /// Refresh token for renewing the session
    public let refreshToken: String
    
    /// When the access token expires
    public let expiresAt: Date
    
    /// The authenticated user
    public let user: AuthUser
    
    public init(accessToken: String, refreshToken: String, expiresAt: Date, user: AuthUser) {
        self.accessToken = accessToken
        self.refreshToken = refreshToken
        self.expiresAt = expiresAt
        self.user = user
    }
    
    /// Check if the session needs refresh (60 seconds before expiry)
    public var needsRefresh: Bool {
        Date.now >= expiresAt.addingTimeInterval(-60)
    }
}
