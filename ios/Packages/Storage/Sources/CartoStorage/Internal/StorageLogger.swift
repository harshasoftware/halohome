import Foundation
import Core
import OSLog

// MARK: - AppLogger Extension

@available(iOS 17.0, macOS 14.0, *)
extension AppLogger {
    /// Storage-specific logger category
    static let storage = Logger(
        subsystem: AppLogger.subsystem,
        category: "storage"
    )
}
