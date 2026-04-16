import Foundation

#if canImport(UIKit)
import UIKit
#endif

/// Interceptor that adds standard headers and telemetry information to requests
public struct HeadersInterceptor: HTTPInterceptor {
    private let appVersion: String
    private let platform: String
    private let deviceModel: String?
    private let extraHeaders: [String: String]
    
    /// Creates a headers interceptor
    /// - Parameters:
    ///   - appVersion: Application version string
    ///   - platform: Platform identifier (default: "iOS")
    ///   - deviceModel: Device model string (default: auto-detected)
    ///   - extraHeaders: Additional headers to include
    public init(
        appVersion: String,
        platform: String = "iOS",
        deviceModel: String? = nil,
        extraHeaders: [String: String] = [:]
    ) {
        self.appVersion = appVersion
        self.platform = platform
        self.deviceModel = deviceModel ?? Self.detectDeviceModel()
        self.extraHeaders = extraHeaders
    }
    
    /// Adapts the request by adding standard headers if not already present
    /// - Parameter request: The mutable URLRequest to modify
    public func adapt(_ request: inout URLRequest) {
        // Build standard headers
        var standardHeaders: [String: String] = [
            "User-Agent": buildUserAgent(),
            "X-App-Version": appVersion,
            "X-Platform": platform
        ]
        
        // Add device model if available
        if let deviceModel = deviceModel {
            standardHeaders["X-Device-Model"] = deviceModel
        }
        
        // Add extra headers
        for (key, value) in extraHeaders {
            standardHeaders[key] = value
        }
        
        // Set headers only if not already present (request headers take precedence)
        for (key, value) in standardHeaders {
            if request.value(forHTTPHeaderField: key) == nil {
                request.setValue(value, forHTTPHeaderField: key)
            }
        }
    }
    
    /// Headers interceptor does not handle retries
    /// - Parameters:
    ///   - response: HTTP response
    ///   - data: Response data
    ///   - error: Error that occurred
    ///   - attempt: Current attempt number
    /// - Returns: Always returns .noRetry
    public func shouldRetry(
        response: HTTPURLResponse?,
        data: Data?,
        error: Error?,
        attempt: Int
    ) -> RetryDecision {
        return .noRetry
    }
    
    // MARK: - Private Helpers
    
    /// Builds a User-Agent string
    /// - Returns: Formatted User-Agent string
    private func buildUserAgent() -> String {
        var components = [appVersion, platform]
        
        if let deviceModel = deviceModel {
            components.append(deviceModel)
        }
        
        return components.joined(separator: " ")
    }
    
    /// Detects the current device model
    /// - Returns: Device model string, or nil if detection fails
    private static func detectDeviceModel() -> String? {
        #if canImport(UIKit)
        return UIDevice.current.model
        #else
        return nil
        #endif
    }
}
