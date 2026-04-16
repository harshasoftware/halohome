import Foundation

/// Client for uploading and downloading profile photos to cloud storage
public protocol ProfilePhotoStorageClient: Sendable {
    /// Upload profile photo
    /// - Parameters:
    ///   - data: Image data (should be pre-processed/compressed)
    ///   - userId: User ID for file naming
    /// - Returns: Public URL of uploaded photo
    func upload(data: Data, userId: String) async throws -> URL
    
    /// Download profile photo
    /// - Parameter userId: User ID to fetch photo for
    /// - Returns: Image data, or nil if no photo exists
    func download(userId: String) async throws -> Data?
    
    /// Delete profile photo
    /// - Parameter userId: User ID to delete photo for
    func delete(userId: String) async throws
}

/// Error types for profile photo storage operations
public enum ProfilePhotoStorageError: Error, LocalizedError {
    case uploadFailed(Error)
    case downloadFailed(Error)
    case deleteFailed(Error)
    case invalidURL
    case noPhotoExists
    
    public var errorDescription: String? {
        switch self {
        case .uploadFailed(let error):
            return "Failed to upload photo: \(error.localizedDescription)"
        case .downloadFailed(let error):
            return "Failed to download photo: \(error.localizedDescription)"
        case .deleteFailed(let error):
            return "Failed to delete photo: \(error.localizedDescription)"
        case .invalidURL:
            return "Invalid photo URL"
        case .noPhotoExists:
            return "No profile photo exists"
        }
    }
}

