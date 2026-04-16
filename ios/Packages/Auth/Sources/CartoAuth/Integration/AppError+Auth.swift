import Foundation
import Core

/// Extension to map AuthError to AppError
public extension AuthError {
    
    /// Convert AuthError to AppError for consistent error handling
    func asAppError() -> AppError {
        switch self {
        case .cancelled:
            return .cancelled
            
        case .notConfigured:
            return .auth(code: 1001, message: "Authentication service is not configured")

        case .notAuthenticated:
            return .unauthorized

        case .invalidCredentials:
            return .unauthorized
            
        case .emailConfirmationRequired:
            return .auth(code: 1002, message: "Please check your email and confirm your account before signing in")
            
        case let .network(underlying):
            if let urlError = underlying as? URLError {
                return .network(code: urlError.errorCode, message: urlError.localizedDescription)
            }
            return .network(code: -1, message: underlying.localizedDescription)
            
        case let .server(code, message):
            return .server(code: code, message: message)
            
        case .parsing:
            return .decoding
            
        case let .unknown(underlying):
            return .unknown(underlying: underlying)
        }
    }
}
