import Foundation
import Core

/// Mock authentication client for debug/testing purposes
/// Provides a bypass mechanism for development without requiring real authentication
@available(iOS 17.0, *)
@MainActor
public final class MockAuthClient: AuthClient {
    
    // MARK: - Properties
    
    /// In-memory storage for the current session
    private var currentSession: AuthSession?
    
    /// Continuation for auth state stream
    private var authStateContinuation: AsyncStream<AuthState>.Continuation?
    
    // MARK: - Initialization
    
    public init() {
        AppLogger.info("MockAuthClient initialized (DEBUG)", category: AppLogger.auth)
    }
    
    // MARK: - AuthClient
    
    /// Sign in anonymously (mock implementation)
    public func signInAnonymously() async throws -> AuthUser {
        let mockUser = AuthUser(id: "guest-user", email: nil, name: "Guest", avatarURL: nil)
        currentSession = AuthSession(
            accessToken: "guest-token", refreshToken: "guest-refresh",
            expiresAt: Date().addingTimeInterval(3600), user: mockUser
        )
        AppLogger.info("MockAuthClient: signed in anonymously (debug)", category: AppLogger.auth)
        authStateContinuation?.yield(.authenticated(mockUser))
        return mockUser
    }

    /// Sign in with Apple (mock implementation)
    /// - Returns: A mock authentication user
    public func signInWithApple() async throws -> AuthUser {
        let mockUser = AuthUser(
            id: "debug-user",
            email: "debug@local",
            name: "Debug User",
            avatarURL: nil
        )
        
        let session = AuthSession(
            accessToken: "debug-token",
            refreshToken: "debug-refresh",
            expiresAt: Date().addingTimeInterval(3600), // 1 hour from now
            user: mockUser
        )
        
        currentSession = session
        AppLogger.info("MockAuthClient: signed in (debug)", category: AppLogger.auth)
        
        // Yield authenticated state to the stream
        authStateContinuation?.yield(.authenticated(mockUser))
        
        return mockUser
    }
    
    /// Sign in with Google (mock implementation)
    /// - Returns: A mock authentication user
    public func signInWithGoogle() async throws -> AuthUser {
        let mockUser = AuthUser(
            id: "debug-google-user",
            email: "debug@google.local",
            name: "Debug Google User",
            avatarURL: nil
        )
        
        let session = AuthSession(
            accessToken: "debug-google-token",
            refreshToken: "debug-google-refresh",
            expiresAt: Date().addingTimeInterval(3600), // 1 hour from now
            user: mockUser
        )
        
        currentSession = session
        AppLogger.info("MockAuthClient: signed in with Google (debug)", category: AppLogger.auth)
        
        // Yield authenticated state to the stream
        authStateContinuation?.yield(.authenticated(mockUser))
        
        return mockUser
    }
    
    /// Sign up with email and password (mock implementation)
    /// - Parameters:
    ///   - email: User's email address
    ///   - password: User's password
    /// - Returns: A mock authentication user
    public func signUpWithEmail(email: String, password: String) async throws -> AuthUser {
        let mockUser = AuthUser(
            id: "debug-email-user",
            email: email,
            name: "Debug Email User",
            avatarURL: nil
        )
        
        let session = AuthSession(
            accessToken: "debug-email-token",
            refreshToken: "debug-email-refresh",
            expiresAt: Date().addingTimeInterval(3600),
            user: mockUser
        )
        
        currentSession = session
        AppLogger.info("MockAuthClient: signed up with email (debug)", category: AppLogger.auth)
        
        authStateContinuation?.yield(.authenticated(mockUser))
        
        return mockUser
    }
    
    /// Sign in with email and password (mock implementation)
    /// - Parameters:
    ///   - email: User's email address
    ///   - password: User's password
    /// - Returns: A mock authentication user
    public func signInWithEmail(email: String, password: String) async throws -> AuthUser {
        let mockUser = AuthUser(
            id: "debug-email-user",
            email: email,
            name: "Debug Email User",
            avatarURL: nil
        )
        
        let session = AuthSession(
            accessToken: "debug-email-token",
            refreshToken: "debug-email-refresh",
            expiresAt: Date().addingTimeInterval(3600),
            user: mockUser
        )
        
        currentSession = session
        AppLogger.info("MockAuthClient: signed in with email (debug)", category: AppLogger.auth)
        
        authStateContinuation?.yield(.authenticated(mockUser))
        
        return mockUser
    }
    
    /// Request password reset email (mock implementation)
    /// - Parameter email: User's email address
    public func resetPassword(email: String) async throws {
        AppLogger.info("MockAuthClient: password reset requested for \(email) (debug)", category: AppLogger.auth)
        // Mock: do nothing, just log
    }
    
    /// Sign out and clear the current session
    public func signOut() async throws {
        currentSession = nil
        AppLogger.info("MockAuthClient: signed out (debug)", category: AppLogger.auth)
        
        // Yield unauthenticated state to the stream
        authStateContinuation?.yield(.unauthenticated)
    }
    
    /// Get the current authenticated user
    /// - Returns: The current user if authenticated, nil otherwise
    public func currentUser() async -> AuthUser? {
        AppLogger.debug("MockAuthClient: getting current user", category: AppLogger.auth)
        return currentSession?.user
    }
    
    /// Stream of authentication state changes
    /// - Returns: AsyncStream of AuthState changes
    nonisolated public func authStates() -> AsyncStream<AuthState> {
        AppLogger.debug("MockAuthClient: providing auth states stream", category: AppLogger.auth)
        return AsyncStream { [weak self] continuation in
            guard let self = self else {
                continuation.finish()
                return
            }
            
            // Store continuation and emit initial state on the actor
            Task { @MainActor in
                self.authStateContinuation = continuation
                
                // Yield initial state
                if let user = self.currentSession?.user {
                    continuation.yield(.authenticated(user))
                } else {
                    continuation.yield(.unauthenticated)
                }
            }
            
            // Keep stream alive for ongoing observation
            // The stream will be cancelled when the observer is deallocated
        }
    }
    
    /// Refresh the authentication token if needed (mock implementation)
    public func refreshIfNeeded() async throws {
        AppLogger.debug("MockAuthClient: refreshIfNeeded (no-op)", category: AppLogger.auth)
    }

    /// Delete account (mock implementation)
    public func deleteAccount() async throws {
        currentSession = nil
        AppLogger.info("MockAuthClient: account deleted (debug)", category: AppLogger.auth)
        authStateContinuation?.yield(.unauthenticated)
    }
}
