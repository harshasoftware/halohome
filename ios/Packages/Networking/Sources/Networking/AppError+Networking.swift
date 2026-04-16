import Foundation
import Core

/// Networking-specific error mapping extensions for AppError
extension AppError {
    
    /// Maps networking errors to appropriate AppError cases
    /// - Parameter error: The error to map
    /// - Returns: Mapped AppError
    static func fromNetworking(_ error: Error) -> AppError {
        // Use existing AppError.from(_:) for most cases
        let baseError = AppError.from(error)
        
        // Handle specific URLError cases that need networking-specific treatment
        if let urlError = error as? URLError {
            switch urlError.code {
            case .networkConnectionLost:
                return .network(code: urlError.errorCode, message: "Connection lost")
            case .notConnectedToInternet:
                return .network(code: urlError.errorCode, message: "Offline")
            case .timedOut:
                return .network(code: urlError.errorCode, message: "Timed out")
            case .cancelled:
                return .cancelled
            default:
                return baseError
            }
        }
        
        return baseError
    }
    
    /// Maps HTTP status codes to appropriate AppError cases
    /// - Parameters:
    ///   - statusCode: HTTP status code
    ///   - data: Response data for extracting error messages
    /// - Returns: Mapped AppError
    static func fromHTTPStatus(_ statusCode: Int, data: Data?) -> AppError {
        // Extract error message from response data if available
        var errorMessage: String?
        if let data = data,
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            errorMessage = json["error"] as? String ??
                          json["message"] as? String ??
                          json["detail"] as? String
        }
        
        switch statusCode {
        case 400..<500:
            // Client errors - map to network error with status code
            return .network(code: statusCode, message: errorMessage ?? "Client error")
        case 500..<600:
            // Server errors - map to network error with status code
            return .network(code: statusCode, message: errorMessage ?? "Server error")
        default:
            // Unexpected status codes
            return .network(code: statusCode, message: errorMessage ?? "Unexpected response")
        }
    }
}
