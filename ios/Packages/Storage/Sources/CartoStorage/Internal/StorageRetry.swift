import Foundation
import Core

/// Retry logic for storage operations
enum StorageRetry {
    
    /// Retry a storage operation with exponential backoff
    /// - Parameters:
    ///   - maxAttempts: Maximum number of retry attempts (default: 3)
    ///   - operation: The operation to retry
    /// - Returns: The result of the operation
    /// - Throws: The last error if all attempts fail
    static func withRetry<T>(
        maxAttempts: Int = 3,
        operation: () async throws -> T
    ) async throws -> T {
        var lastError: Error?
        
        for attempt in 1...maxAttempts {
            do {
                return try await operation()
            } catch is CancellationError {
                // Never retry cancellations
                throw CancellationError()
            } catch {
                lastError = error
                
                // Check if error is retryable
                if !isRetryable(error) {
                    throw error
                }
                
                // Don't sleep on last attempt
                if attempt < maxAttempts {
                    let delay = baseDelay * Double(attempt)
                    AppLogger.debug("Storage operation failed (attempt \\(attempt)/\\(maxAttempts)), retrying after \\(delay)s", category: AppLogger.storage)
                    try? await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
                }
            }
        }
        
        AppLogger.error("Storage operation failed after \\(maxAttempts) attempts", category: AppLogger.storage)
        throw lastError ?? StorageError.underlying(NSError(domain: "Storage", code: -1))
    }
    
    private static let baseDelay: TimeInterval = 0.1
    
    /// Check if an error is retryable
    private static func isRetryable(_ error: Error) -> Bool {
        let nsError = error as NSError
        
        // SwiftData/CoreData error codes that are retryable
        let retryableCodes: Set<Int> = [
            133020, // NSManagedObjectContextLockingError
            133021, // NSPersistentStoreCoordinatorLockingError
            134030, // NSManagedObjectValidationError (sometimes transient)
            134060, // NSManagedObjectConstraintValidationError
            134080, // NSPersistentStoreSaveConflictsError
        ]
        
        // Check for common retryable conditions
        if nsError.domain == NSCocoaErrorDomain && retryableCodes.contains(nsError.code) {
            return true
        }
        
        // Retry on lock/busy errors
        if nsError.localizedDescription.lowercased().contains("locked") ||
           nsError.localizedDescription.lowercased().contains("busy") {
            return true
        }
        
        return false
    }
}
