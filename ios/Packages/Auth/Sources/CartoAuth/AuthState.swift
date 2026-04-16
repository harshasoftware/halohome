import Foundation

/// Represents the current authentication state
public enum AuthState: Sendable, Equatable {
    /// User is not authenticated
    case unauthenticated
    
    /// User is authenticated with the given user info
    case authenticated(AuthUser)
    
    /// Authentication token is being refreshed
    case refreshing
}
