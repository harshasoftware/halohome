import Foundation

/// Main authentication client protocol
@available(iOS 17.0, *)
@preconcurrency
public protocol AuthClient: Sendable {
    /// Sign in with Apple ID
    func signInWithApple() async throws -> AuthUser
    
    /// Sign in as an anonymous guest (no credentials required)
    func signInAnonymously() async throws -> AuthUser

    /// Sign in with Google
    func signInWithGoogle() async throws -> AuthUser
    
    /// Sign up with email and password
    func signUpWithEmail(email: String, password: String) async throws -> AuthUser
    
    /// Sign in with email and password
    func signInWithEmail(email: String, password: String) async throws -> AuthUser
    
    /// Request password reset email
    func resetPassword(email: String) async throws
    
    /// Sign out the current user
    func signOut() async throws
    
    /// Get the current authenticated user
    func currentUser() async -> AuthUser?
    
    /// Stream of authentication state changes
    func authStates() -> AsyncStream<AuthState>
    
    /// Refresh the authentication token if needed
    func refreshIfNeeded() async throws

    /// Delete the current user's account on the server
    func deleteAccount() async throws
}
