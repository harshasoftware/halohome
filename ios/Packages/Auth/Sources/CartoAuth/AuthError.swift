import Foundation

/// Authentication-specific error cases
public enum AuthError: Error, Sendable, Equatable {
    /// Operation was cancelled
    case cancelled
    
    /// Auth service is not configured
    case notConfigured

    /// User is not authenticated
    case notAuthenticated
    
    /// Invalid credentials provided
    case invalidCredentials
    
    /// Email confirmation required before sign in
    case emailConfirmationRequired
    
    /// Network error occurred
    case network(underlying: Error)
    
    /// Server returned an error
    case server(code: Int, message: String?)
    
    /// Failed to parse response
    case parsing
    
    /// Unknown error occurred
    case unknown(underlying: Error)
    
    public static func == (lhs: AuthError, rhs: AuthError) -> Bool {
        switch (lhs, rhs) {
        case (.cancelled, .cancelled):
            return true
        case (.notConfigured, .notConfigured):
            return true
        case (.notAuthenticated, .notAuthenticated):
            return true
        case (.invalidCredentials, .invalidCredentials):
            return true
        case (.emailConfirmationRequired, .emailConfirmationRequired):
            return true
        case let (.network(lErr), .network(rErr)):
            return (lErr as NSError) == (rErr as NSError)
        case let (.server(lCode, lMsg), .server(rCode, rMsg)):
            return lCode == rCode && lMsg == rMsg
        case (.parsing, .parsing):
            return true
        case let (.unknown(lErr), .unknown(rErr)):
            return (lErr as NSError) == (rErr as NSError)
        default:
            return false
        }
    }
}
