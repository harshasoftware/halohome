import Foundation

/// Payments-specific error cases
public enum PaymentsError: Error, Sendable, Equatable {
    /// Purchase was cancelled by user
    case cancelled
    
    /// Payments system is not configured
    case notConfigured
    
    /// User is not allowed to make purchases
    case purchaseNotAllowed
    
    /// Network error occurred
    case network(underlying: Error)
    
    /// Server or Adapty error
    case server(message: String?)
    
    /// Unknown error occurred
    case unknown(underlying: Error)
    
    public static func == (lhs: PaymentsError, rhs: PaymentsError) -> Bool {
        switch (lhs, rhs) {
        case (.cancelled, .cancelled):
            return true
        case (.notConfigured, .notConfigured):
            return true
        case (.purchaseNotAllowed, .purchaseNotAllowed):
            return true
        case let (.network(lErr), .network(rErr)):
            return (lErr as NSError) == (rErr as NSError)
        case let (.server(lMsg), .server(rMsg)):
            return lMsg == rMsg
        case let (.unknown(lErr), .unknown(rErr)):
            return (lErr as NSError) == (rErr as NSError)
        default:
            return false
        }
    }
}
