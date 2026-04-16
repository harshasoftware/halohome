import Foundation
import Networking
import CartoStorage
import Core

/// Main session manager implementing AuthClient and SessionStore
@available(iOS 17.0, *)
public actor SessionManager: @preconcurrency AuthClient, @preconcurrency SessionStore {
    // MARK: - Properties
    
    private let httpClient: HTTPClient
    private let keychain: SecureStore
    private let apple: AppleSignInProvider
    private let google: GoogleSignInProvider?
    private let config: AuthConfig
    private let sleeper: Sleeper
    private let api: SupabaseAuthAPI
    
    private var currentSession: AuthSession?
    private var refreshTask: Task<Void, Never>?
    private var stateContinuations: [UUID: AsyncStream<AuthState>.Continuation] = [:]
    private var isRefreshing = false
    
    // MARK: - Keychain Keys
    
    private enum Keys {
        static let accessToken = "auth_access_token"
        static let refreshToken = "auth_refresh_token"
        static let expiresAt = "auth_expires_at"
        static let userJSON = "auth_user_json"
    }
    
    // MARK: - Initialization
    
    public init(
        httpClient: HTTPClient,
        keychain: SecureStore,
        apple: AppleSignInProvider,
        google: GoogleSignInProvider? = nil,
        config: AuthConfig
    ) {
        self.httpClient = httpClient
        self.keychain = keychain
        self.apple = apple
        self.google = google
        self.config = config
        self.sleeper = DefaultSleeper()
        self.api = SupabaseAuthAPI(httpClient: httpClient, config: config)
        
        // Load initial session
        Task {
            await loadInitialSession()
        }
    }
    
    // Internal init for testing
    init(
        httpClient: HTTPClient,
        keychain: SecureStore,
        apple: AppleSignInProvider,
        google: GoogleSignInProvider? = nil,
        config: AuthConfig,
        sleeper: Sleeper
    ) {
        self.httpClient = httpClient
        self.keychain = keychain
        self.apple = apple
        self.google = google
        self.config = config
        self.sleeper = sleeper
        self.api = SupabaseAuthAPI(httpClient: httpClient, config: config)
        
        Task {
            await loadInitialSession()
        }
    }
    
    deinit {
        for continuation in stateContinuations.values {
            continuation.finish()
        }
        refreshTask?.cancel()
    }
    
    // MARK: - AuthClient
    
    public func signInAnonymously() async throws -> AuthUser {
        AppLogger.info("Starting anonymous sign in", category: AppLogger.auth)
        let session = try await api.signInAnonymously()
        try await persistSession(session)
        currentSession = session
        for continuation in stateContinuations.values {
            continuation.yield(.authenticated(session.user))
        }
        scheduleRefresh(for: session)
        AppLogger.info("Successfully signed in anonymously", category: AppLogger.auth)
        return session.user
    }

    public func signInWithApple() async throws -> AuthUser {
        // Generate nonce
        let originalNonce = Nonce.random()
        let hashedNonce = Nonce.sha256(originalNonce)
        
        AppLogger.info("Starting Apple Sign In flow", category: AppLogger.auth)
        
        // Request ID token from Apple - pass both original and hashed nonce
        let (idToken, returnedNonce) = try await apple.requestIDToken(
            originalNonce: originalNonce,
            hashedNonce: hashedNonce
        )
        
        // Exchange with Supabase using the returned original nonce
        let session = try await api.exchangeAppleIDToken(idToken: idToken, nonce: returnedNonce)
        
        // Persist session
        try await persistSession(session)
        currentSession = session
        
        // Emit authenticated state
        for continuation in stateContinuations.values {
            continuation.yield(.authenticated(session.user))
        }
        
        // Schedule refresh
        scheduleRefresh(for: session)
        
        AppLogger.info("Successfully signed in with Apple", category: AppLogger.auth)
        return session.user
    }
    
    public func signInWithGoogle() async throws -> AuthUser {
        guard let google = google else {
            throw AuthError.notConfigured
        }
        
        AppLogger.info("Starting Google Sign In flow", category: AppLogger.auth)
        
        // Request ID token + access token from Google
        let googleResult = try await google.requestTokens()

        // Exchange with Supabase
        let session = try await api.exchangeGoogleIDToken(idToken: googleResult.idToken)
        
        // Persist session
        try await persistSession(session)
        currentSession = session
        
        // Emit authenticated state
        for continuation in stateContinuations.values {
            continuation.yield(.authenticated(session.user))
        }
        
        // Schedule refresh
        scheduleRefresh(for: session)
        
        AppLogger.info("Successfully signed in with Google", category: AppLogger.auth)
        return session.user
    }
    
    public func signUpWithEmail(email: String, password: String) async throws -> AuthUser {
        AppLogger.info("Starting email sign up", category: AppLogger.auth)
        
        // Sign up with Supabase
        let session = try await api.signUpWithEmail(email: email, password: password)
        
        // Persist session
        try await persistSession(session)
        currentSession = session
        
        // Emit authenticated state
        for continuation in stateContinuations.values {
            continuation.yield(.authenticated(session.user))
        }
        
        // Schedule refresh
        scheduleRefresh(for: session)
        
        AppLogger.info("Successfully signed up with email", category: AppLogger.auth)
        return session.user
    }
    
    public func signInWithEmail(email: String, password: String) async throws -> AuthUser {
        AppLogger.info("Starting email sign in", category: AppLogger.auth)
        
        // Sign in with Supabase
        let session = try await api.signInWithEmail(email: email, password: password)
        
        // Persist session
        try await persistSession(session)
        currentSession = session
        
        // Emit authenticated state
        for continuation in stateContinuations.values {
            continuation.yield(.authenticated(session.user))
        }
        
        // Schedule refresh
        scheduleRefresh(for: session)
        
        AppLogger.info("Successfully signed in with email", category: AppLogger.auth)
        return session.user
    }
    
    public func resetPassword(email: String) async throws {
        AppLogger.info("Requesting password reset", category: AppLogger.auth)
        try await api.resetPassword(email: email)
        AppLogger.info("Password reset email sent", category: AppLogger.auth)
    }
    
    public func signOut() async throws {
        AppLogger.info("Starting sign out", category: AppLogger.auth)
        
        // Cancel refresh task
        refreshTask?.cancel()
        refreshTask = nil
        
        // Try to revoke token on server (don't fail if it errors)
        if let accessToken = currentSession?.accessToken {
            try? await api.revoke(accessToken: accessToken)
        }
        
        // Clear keychain
        try clearSession()
        
        // Clear in-memory session
        currentSession = nil
        
        // Emit unauthenticated state
        AppLogger.info("Emitting unauthenticated state to \(self.stateContinuations.count) subscriber(s)", category: AppLogger.auth)
        for continuation in stateContinuations.values {
            continuation.yield(.unauthenticated)
        }
        
        AppLogger.info("Successfully signed out", category: AppLogger.auth)
    }
    
    public func deleteAccount() async throws {
        AppLogger.info("Starting account deletion", category: AppLogger.auth)

        guard let accessToken = currentSession?.accessToken else {
            throw AuthError.notAuthenticated
        }

        // Delete user on server
        try await api.deleteUser(accessToken: accessToken)

        // Cancel refresh task
        refreshTask?.cancel()
        refreshTask = nil

        // Clear keychain
        try clearSession()

        // Clear in-memory session
        currentSession = nil

        // Emit unauthenticated state
        for continuation in stateContinuations.values {
            continuation.yield(.unauthenticated)
        }

        AppLogger.info("Account deleted and signed out", category: AppLogger.auth)
    }

    public func currentUser() async -> AuthUser? {
        currentSession?.user
    }
    
    nonisolated public func authStates() -> AsyncStream<AuthState> {
        AsyncStream { [weak self] continuation in
            guard let self = self else {
                continuation.finish()
                return
            }
            
            let id = UUID()
            
            // Store continuation and emit initial state on the actor
            Task {
                await self.registerStateContinuation(continuation, id: id)
                let state = await self.currentAuthState()
                continuation.yield(state)
            }
            
            continuation.onTermination = { @Sendable [weak self] _ in
                Task {
                    await self?.removeStateContinuation(id: id)
                }
            }
        }
    }
    
    private func registerStateContinuation(_ continuation: AsyncStream<AuthState>.Continuation, id: UUID) {
        stateContinuations[id] = continuation
        AppLogger.debug("Registered auth state subscriber (total: \(self.stateContinuations.count))", category: AppLogger.auth)
    }
    
    private func removeStateContinuation(id: UUID) {
        stateContinuations.removeValue(forKey: id)
        AppLogger.debug("Removed auth state subscriber (remaining: \(self.stateContinuations.count))", category: AppLogger.auth)
    }
    
    public func refreshIfNeeded() async throws {
        // Prevent concurrent refresh attempts
        guard !isRefreshing else {
            AppLogger.debug("Refresh already in progress, skipping", category: AppLogger.auth)
            return
        }
        
        guard let session = currentSession else {
            throw AuthError.notConfigured
        }
        
        // Check if refresh is needed
        if !session.needsRefresh {
            return
        }
        
        isRefreshing = true
        defer { isRefreshing = false }
        
        AppLogger.info("Token needs refresh", category: AppLogger.auth)
        for continuation in stateContinuations.values {
            continuation.yield(.refreshing)
        }
        
        // Retry refresh up to 3 times for transient failures
        var lastError: Error?
        for attempt in 1...3 {
            do {
                let newSession = try await api.refresh(refreshToken: session.refreshToken)
                
                // Update session
                try await persistSession(newSession)
                currentSession = newSession
                
                // Emit authenticated state
                for continuation in stateContinuations.values {
                    continuation.yield(.authenticated(newSession.user))
                }
                
                // Reschedule refresh
                scheduleRefresh(for: newSession)
                
                AppLogger.info("Successfully refreshed token", category: AppLogger.auth)
                return
            } catch is CancellationError {
                throw AuthError.cancelled
            } catch let error as AuthError {
                lastError = error
                // Don't retry on auth errors (invalid credentials, etc)
                if case .invalidCredentials = error {
                    break
                }
                if attempt < 3 {
                    AppLogger.debug("Refresh attempt \(attempt) failed, retrying", category: AppLogger.auth)
                    try? await sleeper.sleep(for: Double(attempt))
                }
            } catch {
                lastError = error
                if attempt < 3 {
                    try? await sleeper.sleep(for: Double(attempt))
                }
            }
        }
        
        // All retries failed, clear session
        AppLogger.error("Failed to refresh token after 3 attempts", category: AppLogger.auth)
        try? clearSession()
        currentSession = nil
        for continuation in stateContinuations.values {
            continuation.yield(.unauthenticated)
        }
        throw lastError ?? AuthError.unknown(underlying: NSError(domain: "Auth", code: -1))
    }
    
    // MARK: - SessionStore
    
    public func loadSession() throws -> AuthSession? {
        guard let accessToken = try keychain.getString(Keys.accessToken),
              let refreshToken = try keychain.getString(Keys.refreshToken),
              let expiresAtString = try keychain.getString(Keys.expiresAt),
              let expiresAtInterval = TimeInterval(expiresAtString),
              let userJSONString = try keychain.getString(Keys.userJSON),
              let userJSONData = userJSONString.data(using: .utf8) else {
            return nil
        }
        
        let expiresAt = Date(timeIntervalSince1970: expiresAtInterval)
        let user = try JSONDecoder().decode(AuthUser.self, from: userJSONData)
        
        return AuthSession(
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresAt: expiresAt,
            user: user
        )
    }
    
    public func saveSession(_ session: AuthSession) throws {
        try keychain.setString(session.accessToken, for: Keys.accessToken)
        try keychain.setString(session.refreshToken, for: Keys.refreshToken)
        try keychain.setString(String(session.expiresAt.timeIntervalSince1970), for: Keys.expiresAt)
        
        let userData = try JSONEncoder().encode(session.user)
        let userString = String(data: userData, encoding: .utf8)!
        try keychain.setString(userString, for: Keys.userJSON)
    }
    
    public func clearSession() throws {
        try? keychain.delete(Keys.accessToken)
        try? keychain.delete(Keys.refreshToken)
        try? keychain.delete(Keys.expiresAt)
        try? keychain.delete(Keys.userJSON)
    }
    
    // MARK: - Private Helpers
    
    private func loadInitialSession() async {
        do {
            if let session = try loadSession() {
                // Check if access token is expired
                if Date.now > session.expiresAt {
                    AppLogger.info("Access token expired, attempting refresh with refresh token", category: AppLogger.auth)
                    
                    // CRITICAL: Try to refresh using the refresh token before giving up!
                    // Refresh tokens are valid much longer (7+ days) than access tokens (1 hour)
                    await attemptSessionRefresh(with: session)
                    return
                }
                
                // Access token is still valid
                currentSession = session
                for continuation in stateContinuations.values {
                    continuation.yield(.authenticated(session.user))
                }
                
                // Schedule proactive refresh before token expires
                if session.needsRefresh {
                    AppLogger.debug("Session needs refresh soon, refreshing proactively", category: AppLogger.auth)
                    Task {
                        try? await refreshIfNeeded()
                    }
                } else {
                    scheduleRefresh(for: session)
                }
            }
        } catch {
            AppLogger.error("Failed to load initial session: \(error)", category: AppLogger.auth)
            try? clearSession()
        }
    }
    
    /// Attempts to refresh an expired session using the refresh token
    /// Only clears the session if the refresh token is also invalid
    private func attemptSessionRefresh(with expiredSession: AuthSession) async {
        // Set expired session temporarily so refresh can use the refresh token
        currentSession = expiredSession
        
        // Emit refreshing state to show loading UI
        for continuation in stateContinuations.values {
            continuation.yield(.refreshing)
        }
        
        // Retry refresh up to 3 times
        var lastError: Error?
        for attempt in 1...3 {
            do {
                AppLogger.debug("Session refresh attempt \(attempt)/3", category: AppLogger.auth)
                let newSession = try await api.refresh(refreshToken: expiredSession.refreshToken)
                
                // Success! Persist and use the new session
                try await persistSession(newSession)
                currentSession = newSession
                
                // Emit authenticated state
                for continuation in stateContinuations.values {
                    continuation.yield(.authenticated(newSession.user))
                }
                
                // Schedule next refresh
                scheduleRefresh(for: newSession)
                
                AppLogger.info("Successfully refreshed expired session", category: AppLogger.auth)
                return
                
            } catch let error as AuthError {
                lastError = error
                
                // Don't retry on permanent auth errors
                if case .invalidCredentials = error {
                    AppLogger.error("Refresh token is invalid or revoked", category: AppLogger.auth)
                    break
                }
                
                if attempt < 3 {
                    AppLogger.debug("Refresh attempt \(attempt) failed, retrying...", category: AppLogger.auth)
                    try? await sleeper.sleep(for: Double(attempt))
                }
            } catch {
                lastError = error
                if attempt < 3 {
                    try? await sleeper.sleep(for: Double(attempt))
                }
            }
        }
        
        // All refresh attempts failed - now we can clear the session
        AppLogger.error("Failed to refresh session after 3 attempts: \(String(describing: lastError))", category: AppLogger.auth)
        try? clearSession()
        currentSession = nil
        
        for continuation in stateContinuations.values {
            continuation.yield(.unauthenticated)
        }
    }
    
    private func persistSession(_ session: AuthSession) async throws {
        try saveSession(session)
    }
    
    private func scheduleRefresh(for session: AuthSession) {
        refreshTask?.cancel()
        
        let refreshTime = session.expiresAt.addingTimeInterval(-60)
        let delay = max(0, refreshTime.timeIntervalSinceNow)
        
        refreshTask = Task {
            do {
                try await sleeper.sleep(for: delay)
                if !Task.isCancelled {
                    try await refreshIfNeeded()
                }
            } catch is CancellationError {
                // Task was cancelled, ignore
            } catch {
                AppLogger.error("Scheduled refresh failed: \(error)", category: AppLogger.auth)
            }
        }
    }
    
    private func currentAuthState() -> AuthState {
        if let user = currentSession?.user {
            return .authenticated(user)
        } else {
            return .unauthenticated
        }
    }
}
