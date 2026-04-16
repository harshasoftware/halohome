import Foundation
import Core

/// Extension to map PaymentsError to AppError
public extension PaymentsError {
    
    /// Convert PaymentsError to AppError for consistent error handling
    func asAppError() -> AppError {
        switch self {
        case .cancelled:
            return .cancelled
            
        case .notConfigured:
            return .payments(code: 1001, message: "Payments system is not configured")
            
        case .purchaseNotAllowed:
            return .payments(code: 1002, message: "Purchase not allowed")
            
        case let .network(underlying):
            if let urlError = underlying as? URLError {
                return .network(code: urlError.errorCode, message: urlError.localizedDescription)
            }
            return .network(code: -1, message: underlying.localizedDescription)
            
        case let .server(message):
            return .payments(code: 5000, message: message ?? "Payment server error")
            
        case let .unknown(underlying):
            return .unknown(underlying: underlying)
        }
    }
}
