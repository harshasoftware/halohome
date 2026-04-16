import Foundation

/// Centralized error type for the application.
/// Maps various system errors to user-facing messages while preserving technical details for logging.
public enum AppError: Error, Equatable, CustomStringConvertible, LocalizedError, Sendable {
    case network(code: Int, message: String?)
    case decoding
    case unauthorized
    case rateLimited(retryAfter: TimeInterval?)
    case cancelled
    case validation(message: String)
    case auth(code: Int, message: String)
    case storage(code: Int, message: String)
    case payments(code: Int, message: String)
    case server(code: Int, message: String?)
    case unknown(underlying: Error?)
    
    // MARK: - CustomStringConvertible
    
    public var description: String {
        switch self {
        case .network(let code, let message):
            return "Network error (\(code)): \(message ?? "Unknown network error")"
        case .decoding:
            return "Data parsing error"
        case .unauthorized:
            return "Authentication required"
        case .rateLimited(let retryAfter):
            if let retryAfter = retryAfter {
                return "Rate limited. Try again in \(Int(retryAfter)) seconds"
            } else {
                return "Rate limited. Please try again later"
            }
        case .cancelled:
            return "Request was cancelled"
        case .validation(let message):
            return "Validation error: \(message)"
        case .auth(let code, let message):
            return "Authentication error (\(code)): \(message)"
        case .storage(let code, let message):
            return "Storage error (\(code)): \(message)"
        case .payments(let code, let message):
            return "Payments error (\(code)): \(message)"
        case .server(let code, let message):
            return "Server error (\(code)): \(message ?? "Unknown server error")"
        case .unknown(let underlying):
            return "Unexpected error: \(underlying?.localizedDescription ?? "Unknown")"
        }
    }
    
    /// User-facing error message that's safe to display in UI
    public var userMessage: String {
        switch self {
        case .network(let code, let message):
            // Handle specific network conditions
            if let message = message {
                if message.lowercased().contains("offline") || message.lowercased().contains("not connected") {
                    return "You're offline. Please check your internet connection."
                }
                if message.lowercased().contains("timed out") || message.lowercased().contains("timeout") {
                    return "Request timed out. Please try again."
                }
            }
            
            // Generic status code handling
            if code >= 500 {
                return "Server is temporarily unavailable. Please try again."
            } else if code >= 400 {
                return "Request failed. Please check your input and try again."
            } else {
                return "Network error occurred. Please try again."
            }
        case .decoding:
            return "Unable to process server response. Please try again."
        case .unauthorized:
            return "Invalid email or password. Please check your credentials and try again."
        case .rateLimited:
            return "Too many requests. Please wait a moment and try again."
        case .cancelled:
            return "Request was cancelled."
        case .validation(let message):
            return message
        case .auth(_, let message):
            return message
        case .storage:
            return "Unable to save or retrieve data. Please try again."
        case .payments(_, let message):
            return message
        case .server(let code, _):
            if code >= 500 {
                return "Server is temporarily unavailable. Please try again."
            } else {
                return "Server error occurred. Please try again."
            }
        case .unknown:
            return "Something went wrong. Please try again."
        }
    }
    
    // MARK: - LocalizedError
    
    public var errorDescription: String? {
        return userMessage
    }
    
    // MARK: - Equatable
    
    public static func == (lhs: AppError, rhs: AppError) -> Bool {
        switch (lhs, rhs) {
        case (.network(let lCode, let lMessage), .network(let rCode, let rMessage)):
            return lCode == rCode && lMessage == rMessage
        case (.decoding, .decoding),
             (.unauthorized, .unauthorized),
             (.cancelled, .cancelled):
            return true
        case (.rateLimited(let lRetryAfter), .rateLimited(let rRetryAfter)):
            return lRetryAfter == rRetryAfter
        case (.validation(let lMessage), .validation(let rMessage)):
            return lMessage == rMessage
        case (.auth(let lCode, let lMessage), .auth(let rCode, let rMessage)):
            return lCode == rCode && lMessage == rMessage
        case (.storage(let lCode, let lMessage), .storage(let rCode, let rMessage)):
            return lCode == rCode && lMessage == rMessage
        case (.payments(let lCode, let lMessage), .payments(let rCode, let rMessage)):
            return lCode == rCode && lMessage == rMessage
        case (.server(let lCode, let lMessage), .server(let rCode, let rMessage)):
            return lCode == rCode && lMessage == rMessage
        case (.unknown(let lUnderlying), .unknown(let rUnderlying)):
            // Compare underlying errors by NSError domain+code when possible, fallback to description
            if let lNSError = lUnderlying as? NSError,
               let rNSError = rUnderlying as? NSError {
                return lNSError.domain == rNSError.domain && lNSError.code == rNSError.code
            }
            return lUnderlying?.localizedDescription == rUnderlying?.localizedDescription
        default:
            return false
        }
    }
    
    // MARK: - Error Mapping
    
    /// Maps any Error to AppError with intelligent type detection
    /// - Parameter error: Any error to map
    /// - Returns: Appropriate AppError for the input error
    public static func from(_ error: Error) -> AppError {
        // Handle AppError passthrough
        if let appError = error as? AppError {
            return appError
        }
        
        // Handle URLError specifically
        if let urlError = error as? URLError {
            switch urlError.code {
            case .notConnectedToInternet:
                return .network(code: urlError.errorCode, message: "Offline")
            case .timedOut:
                return .network(code: urlError.errorCode, message: "Timed out")
            case .cancelled:
                return .cancelled
            default:
                return .network(code: urlError.errorCode, message: urlError.localizedDescription)
            }
        }
        
        // Handle NSError (defensive cast for Objective-C interop)
        let nsError = error as NSError
        if nsError.code == NSURLErrorCancelled {
            return .cancelled
        }
        
        // Check for payment-related errors by domain
        // This catches Adapty and StoreKit errors that weren't mapped to PaymentsError
        if nsError.domain.contains("Adapty") ||
           nsError.domain.contains("AdaptyError") ||
           nsError.domain == "SKErrorDomain" ||
           nsError.domain == "Payments" {
            // Extract message from NSError
            let message = nsError.localizedDescription
            return .payments(code: nsError.code, message: message)
        }
        
        // For other errors, preserve them as unknown with the original error
        // This prevents misleading "network error" messages
        return .unknown(underlying: error)
    }
    
    // MARK: - HTTP Response Mapping
    
    /// Maps HTTP response to appropriate AppError
    /// - Parameters:
    ///   - httpURLResponse: HTTP response with status code
    ///   - data: Response data for extracting error messages
    /// - Returns: Appropriate AppError for the HTTP status
    public static func fromURLResponse(_ httpURLResponse: HTTPURLResponse?, data: Data?) -> AppError {
        guard let response = httpURLResponse else {
            return .network(code: 0, message: "No response received")
        }
        
        let statusCode = response.statusCode
        
        // Extract error message from response data if available
        var errorMessage: String?
        if let data = data,
           let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            // Try multiple common error message keys
            errorMessage = json["error"] as? String ??
                          json["message"] as? String ??
                          json["detail"] as? String
        }
        
        switch statusCode {
        case 401:
            return .unauthorized
        case 429:
            // Extract retry-after header if present
            let retryAfter: TimeInterval? = parseRetryAfter(from: response)
            return .rateLimited(retryAfter: retryAfter)
        case 500...599:
            return .server(code: statusCode, message: errorMessage)
        default:
            return .network(code: statusCode, message: errorMessage)
        }
    }
    
    // MARK: - Private Helpers
    
    /// Parses Retry-After header supporting both seconds and HTTP-date formats
    /// - Parameter response: HTTP response containing headers
    /// - Returns: TimeInterval in seconds, or nil if not parseable
    private static func parseRetryAfter(from response: HTTPURLResponse) -> TimeInterval? {
        guard let retryAfterString = response.allHeaderFields["Retry-After"] as? String else {
            return nil
        }
        
        // Try parsing as seconds first (most common)
        if let retryAfterSeconds = TimeInterval(retryAfterString) {
            return retryAfterSeconds
        }
        
        // Try parsing as HTTP-date format (RFC 7231)
        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "EEE, dd MMM yyyy HH:mm:ss zzz"
        dateFormatter.locale = Locale(identifier: "en_US_POSIX")
        dateFormatter.timeZone = TimeZone(abbreviation: "GMT")
        
        if let retryAfterDate = dateFormatter.date(from: retryAfterString) {
            let timeInterval = retryAfterDate.timeIntervalSinceNow
            return timeInterval > 0 ? timeInterval : nil
        }
        
        return nil
    }
}
