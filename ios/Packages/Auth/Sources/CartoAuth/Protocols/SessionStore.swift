import Foundation

/// Protocol for session persistence
@preconcurrency
public protocol SessionStore: Sendable {
    /// Load the stored session
    func loadSession() throws -> AuthSession?
    
    /// Save a session
    func saveSession(_ session: AuthSession) throws
    
    /// Clear the stored session
    func clearSession() throws
}
