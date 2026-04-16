import Foundation
import Core

/// Handles uploading device tokens to the backend for push notification registration
public struct DeviceTokenUploader {
    /// Base URL for the backend API
    public let baseURL: URL
    
    /// HTTP client for making requests
    public let httpClient: HTTPClient
    
    /// Initialize the device token uploader
    /// - Parameters:
    ///   - baseURL: Base URL for the backend API
    ///   - httpClient: HTTP client for making requests
    public init(baseURL: URL, httpClient: HTTPClient) {
        self.baseURL = baseURL
        self.httpClient = httpClient
    }
    
    /// Upload device token to backend for push notification registration
    /// - Parameter tokenHex: Device token as hexadecimal string
    /// - Throws: AppError.network if upload fails
    public func upload(tokenHex: String) async throws {
        let request = HTTPRequest(
            path: "/v1/device/register",
            method: .post,
            headers: [
                "Content-Type": "application/json"
            ],
            body: createRequestBody(tokenHex: tokenHex)
        )
        
        do {
            let response = try await httpClient.send(request)
            
            // Check if status is in success range (200-299)
            guard (200...299).contains(response.statusCode) else {
                throw AppError.fromHTTPStatus(response.statusCode, data: response.data)
            }
            
            AppLogger.info(
                "Device token uploaded successfully (length: \(tokenHex.count))",
                category: AppLogger.notifications
            )
        } catch let error as AppError {
            throw error
        } catch {
            throw AppError.fromNetworking(error)
        }
    }
}

// MARK: - Private Helpers

private extension DeviceTokenUploader {
    /// Create JSON request body for device token upload
    /// - Parameter tokenHex: Device token as hexadecimal string
    /// - Returns: JSON data for the request body
    func createRequestBody(tokenHex: String) -> Data {
        let body = [
            "token": tokenHex,
            "platform": "ios"
        ]
        
        do {
            return try JSONSerialization.data(withJSONObject: body)
        } catch {
            AppLogger.error(
                "Failed to create device token request body: \(error.localizedDescription)",
                category: AppLogger.notifications
            )
            return Data()
        }
    }
}
