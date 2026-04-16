import UIKit

/// Utilities for image processing in profile photo uploads
enum ImageUtilities {
    
    /// Compress image to target size in KB
    /// - Parameters:
    ///   - image: The UIImage to compress
    ///   - maxSizeKB: Maximum size in kilobytes (default: 500KB)
    /// - Returns: Compressed JPEG data, or nil if compression fails
    static func compress(_ image: UIImage, maxSizeKB: Int = 500) -> Data? {
        let maxBytes = maxSizeKB * 1024
        var compression: CGFloat = 0.9
        var imageData = image.jpegData(compressionQuality: compression)
        
        // Progressively reduce quality until under target size
        while let data = imageData, data.count > maxBytes && compression > 0.1 {
            compression -= 0.1
            imageData = image.jpegData(compressionQuality: compression)
        }
        
        return imageData
    }
    
    /// Validate image data
    /// - Parameters:
    ///   - data: Image data to validate
    ///   - maxSizeMB: Maximum allowed size in megabytes (default: 10MB)
    /// - Returns: Validation result with error message if invalid
    static func validate(_ data: Data, maxSizeMB: Int = 10) -> Result<UIImage, ImageError> {
        // Check size
        let maxBytes = maxSizeMB * 1024 * 1024
        guard data.count <= maxBytes else {
            return .failure(.tooLarge(sizeInMB: Double(data.count) / 1024.0 / 1024.0))
        }
        
        // Check if valid image
        guard let image = UIImage(data: data) else {
            return .failure(.invalidFormat)
        }
        
        return .success(image)
    }
    
    /// Process image for profile photo: validate and compress
    /// - Parameters:
    ///   - data: Raw image data from photo picker
    ///   - targetSizeKB: Target compressed size (default: 500KB)
    /// - Returns: Processed image data ready for upload
    /// - Note: No cropping is applied - image keeps original aspect ratio.
    ///         SwiftUI's .scaledToFill() handles circular display automatically.
    static func processForProfile(_ data: Data, targetSizeKB: Int = 500) -> Result<Data, ImageError> {
        // Validate
        let validationResult = validate(data)
        guard case .success(let image) = validationResult else {
            if case .failure(let error) = validationResult {
                return .failure(error)
            }
            return .failure(.processingFailed)
        }
        
        // Compress (no cropping - preserves user's selected framing)
        guard let compressedData = compress(image, maxSizeKB: targetSizeKB) else {
            return .failure(.compressionFailed)
        }
        
        return .success(compressedData)
    }
    
    enum ImageError: Error, LocalizedError {
        case tooLarge(sizeInMB: Double)
        case invalidFormat
        case compressionFailed
        case processingFailed
        
        var errorDescription: String? {
            switch self {
            case .tooLarge(let size):
                return "Image too large (\(String(format: "%.1f", size))MB). Please choose a smaller image."
            case .invalidFormat:
                return "Invalid image format. Please choose a valid photo."
            case .compressionFailed:
                return "Failed to compress image. Please try a different photo."
            case .processingFailed:
                return "Failed to process image. Please try again."
            }
        }
    }
}

