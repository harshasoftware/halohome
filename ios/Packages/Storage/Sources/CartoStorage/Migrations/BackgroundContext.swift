import Foundation
import SwiftData
import Core

/// Utilities for background context operations
@available(iOS 17.0, macOS 14.0, *)
public enum BackgroundContext {
    
    /// Perform work in a background context
    /// - Parameters:
    ///   - container: The model container
    ///   - work: The work to perform with the background context
    /// - Returns: The result of the work
    public static func perform<T>(
        in container: ModelContainer,
        _ work: @escaping @Sendable (ModelContext) throws -> T
    ) async throws -> T {
        return try await Task.detached {
            let context = ModelContext(container)
            let result = try work(context)
            
            if context.hasChanges {
                try context.save()
            }
            
            return result
        }.value
    }
    
    /// Perform work in a background context with actor isolation
    /// - Parameters:
    ///   - container: The model container
    ///   - work: The work to perform with the background context
    /// - Returns: The result of the work
    public static func performAsync<T: Sendable>(
        in container: ModelContainer,
        _ work: @escaping @Sendable (ModelContext) async throws -> T
    ) async throws -> T {
        return try await Task.detached {
            let context = ModelContext(container)
            let result = try await work(context)
            
            if context.hasChanges {
                try context.save()
            }
            
            return result
        }.value
    }
}
