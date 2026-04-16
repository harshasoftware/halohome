import Foundation
// import Supabase  // ← Uncomment when Supabase dependency is added
import Core

/// Supabase implementation of ProfilePhotoStorageClient
/// Uploads profile photos to Supabase Storage bucket
/// 
/// **Setup Required:**
/// 1. Add Supabase dependency to Storage/Package.swift
/// 2. Uncomment the Supabase import above
/// 3. See docs/PROFILE_PHOTO_SETUP.md for complete setup instructions
///
/// **Note:** This implementation is commented out until Supabase is configured.
/// Use MockProfilePhotoStorageClient for development/testing.
/*
public final class SupabaseProfilePhotoStorageClient: ProfilePhotoStorageClient {
    
    private let supabaseClient: SupabaseClient
    private let bucketName: String
    
    /// Initialize with Supabase client
    /// - Parameters:
    ///   - supabaseClient: Supabase client instance
    ///   - bucketName: Storage bucket name (default: "profile-photos")
    public init(supabaseClient: SupabaseClient, bucketName: String = "profile-photos") {
        self.supabaseClient = supabaseClient
        self.bucketName = bucketName
    }
    
    public func upload(data: Data, userId: String) async throws -> URL {
        do {
            // Generate unique filename with timestamp to avoid caching issues
            let timestamp = Int(Date().timeIntervalSince1970)
            let filename = "\(userId)_\(timestamp).jpg"
            let path = "avatars/\(filename)"
            
            // Upload to Supabase Storage
            let response = try await supabaseClient.storage
                .from(bucketName)
                .upload(
                    path: path,
                    file: data,
                    options: FileOptions(
                        cacheControl: "3600",
                        contentType: "image/jpeg",
                        upsert: false
                    )
                )
            
            // Get public URL
            let publicURL = try supabaseClient.storage
                .from(bucketName)
                .getPublicURL(path: path)
            
            AppLogger.info("Profile photo uploaded: \(path)", category: AppLogger.storage)
            return publicURL
            
        } catch {
            AppLogger.error("Profile photo upload failed: \(error)", category: AppLogger.storage)
            throw ProfilePhotoStorageError.uploadFailed(error)
        }
    }
    
    public func download(userId: String) async throws -> Data? {
        do {
            // List files for user to get latest
            let files = try await supabaseClient.storage
                .from(bucketName)
                .list(path: "avatars")
            
            // Find files matching user ID pattern
            let userFiles = files.filter { $0.name.hasPrefix(userId) }
            
            guard let latestFile = userFiles.sorted(by: { $0.createdAt ?? Date.distantPast > $1.createdAt ?? Date.distantPast }).first else {
                return nil
            }
            
            // Download the file
            let path = "avatars/\(latestFile.name)"
            let data = try await supabaseClient.storage
                .from(bucketName)
                .download(path: path)
            
            AppLogger.info("Profile photo downloaded: \(path)", category: AppLogger.storage)
            return data
            
        } catch {
            AppLogger.error("Profile photo download failed: \(error)", category: AppLogger.storage)
            throw ProfilePhotoStorageError.downloadFailed(error)
        }
    }
    
    public func delete(userId: String) async throws {
        do {
            // List all files for user
            let files = try await supabaseClient.storage
                .from(bucketName)
                .list(path: "avatars")
            
            let userFiles = files.filter { $0.name.hasPrefix(userId) }
            
            // Delete all user photos
            let paths = userFiles.map { "avatars/\($0.name)" }
            
            if !paths.isEmpty {
                try await supabaseClient.storage
                    .from(bucketName)
                    .remove(paths: paths)
                
                AppLogger.info("Deleted \(paths.count) profile photo(s) for user \(userId)", category: AppLogger.storage)
            }
            
        } catch {
            AppLogger.error("Profile photo delete failed: \(error)", category: AppLogger.storage)
            throw ProfilePhotoStorageError.deleteFailed(error)
        }
    }
}
*/

/// Mock implementation for testing and previews
public final class MockProfilePhotoStorageClient: ProfilePhotoStorageClient, @unchecked Sendable {
    
    public var uploadedPhotos: [String: Data] = [:]
    public var shouldFailUpload = false
    public var shouldFailDownload = false
    
    public init() {}
    
    public func upload(data: Data, userId: String) async throws -> URL {
        if shouldFailUpload {
            throw ProfilePhotoStorageError.uploadFailed(NSError(domain: "MockError", code: -1))
        }
        
        uploadedPhotos[userId] = data
        return URL(string: "https://mock.storage.com/\(userId).jpg")!
    }
    
    public func download(userId: String) async throws -> Data? {
        if shouldFailDownload {
            throw ProfilePhotoStorageError.downloadFailed(NSError(domain: "MockError", code: -1))
        }
        
        return uploadedPhotos[userId]
    }
    
    public func delete(userId: String) async throws {
        uploadedPhotos.removeValue(forKey: userId)
    }
}

