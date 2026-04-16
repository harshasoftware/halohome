import Foundation
import Core

/// Storage-specific error cases
public enum StorageError: Error, Sendable, Equatable {
    case notFound
    case validation(String)
    case underlying(Error)
    
    public static func == (lhs: StorageError, rhs: StorageError) -> Bool {
        switch (lhs, rhs) {
        case (.notFound, .notFound):
            return true
        case let (.validation(lMsg), .validation(rMsg)):
            return lMsg == rMsg
        case let (.underlying(lErr), .underlying(rErr)):
            // Compare NSError domain and code for equality
            let lNSError = lErr as NSError
            let rNSError = rErr as NSError
            return lNSError.domain == rNSError.domain && lNSError.code == rNSError.code
        default:
            return false
        }
    }
}

// MARK: - AppError Conversion

extension StorageError {
    /// Converts StorageError to AppError for consistent error handling
    public func asAppError() -> AppError {
        switch self {
        case .notFound:
            return .storage(code: 404, message: "Item not found")
        case let .validation(message):
            return .validation(message: message)
        case let .underlying(error):
            return AppError.from(error)
        }
    }
}
