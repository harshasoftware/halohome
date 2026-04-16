import Foundation
import Networking
import Core
import OSLog

/// Supabase Auth API client using GoTrue endpoints
/// 
/// This client makes direct HTTP calls to Supabase's GoTrue API (no third-party SDK).
/// The httpClient is configured with the Supabase project URL from AuthConfig.
/// 
/// Configuration:
/// - Set AuthConfig.supabaseURL to your project URL (e.g., https://yourproject.supabase.co)
/// - Set AuthConfig.supabaseAnonKey to your public anonymous key from Supabase dashboard
/// - Both values are safe to include in the app (not secret)
@available(iOS 17.0, *)
struct SupabaseAuthAPI {
    private let httpClient: HTTPClient
    private let config: AuthConfig
    
    init(httpClient: HTTPClient, config: AuthConfig) {
        self.httpClient = httpClient
        self.config = config
    }
    
    // MARK: - Public Methods
    
    /// Exchange Apple ID token for Supabase session
    /// Calls Supabase GoTrue endpoint: POST /auth/v1/token?grant_type=id_token&provider=apple
    func exchangeAppleIDToken(idToken: String, nonce: String) async throws -> AuthSession {
        let requestBody = AppleSignInRequest(id_token: idToken, nonce: nonce)
        let bodyData = try JSONEncoder().encode(requestBody)
        
        let request = HTTPRequest(
            path: "/auth/v1/token",
            method: .post,
            headers: [
                "apikey": config.supabaseAnonKey,
                "Authorization": "Bearer \(config.supabaseAnonKey)",
                "Content-Type": "application/json"
            ],
            query: ["grant_type": "id_token", "provider": "apple"],
            body: bodyData
        )
        
        AppLogger.debug("Exchanging Apple ID token with Supabase", category: AppLogger.auth)
        
        do {
            let response = try await httpClient.send(request)
            
            if response.statusCode >= 200 && response.statusCode < 300 {
                let session = try mapToAuthSession(from: response.data)
                AppLogger.info("Successfully exchanged Apple ID token", category: AppLogger.auth)
                return session
            } else {
                throw mapError(statusCode: response.statusCode, data: response.data)
            }
        } catch is CancellationError {
            throw AuthError.cancelled
        } catch let error as AuthError {
            throw error
        } catch {
            throw mapNetworkError(error)
        }
    }
    
    /// Exchange Google ID token for Supabase session
    /// Calls Supabase GoTrue endpoint: POST /auth/v1/token?grant_type=id_token&provider=google
    func exchangeGoogleIDToken(idToken: String) async throws -> AuthSession {
        let requestBody = GoogleSignInRequest(id_token: idToken)
        let bodyData = try JSONEncoder().encode(requestBody)
        
        let request = HTTPRequest(
            path: "/auth/v1/token",
            method: .post,
            headers: [
                "apikey": config.supabaseAnonKey,
                "Authorization": "Bearer \(config.supabaseAnonKey)",
                "Content-Type": "application/json"
            ],
            query: ["grant_type": "id_token", "provider": "google"],
            body: bodyData
        )
        
        AppLogger.debug("Exchanging Google ID token with Supabase", category: AppLogger.auth)
        
        do {
            let response = try await httpClient.send(request)
            
            if response.statusCode >= 200 && response.statusCode < 300 {
                let session = try mapToAuthSession(from: response.data)
                AppLogger.info("Successfully exchanged Google ID token", category: AppLogger.auth)
                return session
            } else {
                throw mapError(statusCode: response.statusCode, data: response.data)
            }
        } catch is CancellationError {
            throw AuthError.cancelled
        } catch let error as AuthError {
            throw error
        } catch {
            throw mapNetworkError(error)
        }
    }
    
    /// Refresh access token using refresh token
    /// Calls Supabase GoTrue endpoint: POST /auth/v1/token?grant_type=refresh_token
    func refresh(refreshToken: String) async throws -> AuthSession {
        let requestBody = RefreshTokenRequest(refresh_token: refreshToken)
        let bodyData = try JSONEncoder().encode(requestBody)
        
        let request = HTTPRequest(
            path: "/auth/v1/token",
            method: .post,
            headers: [
                "apikey": config.supabaseAnonKey,
                "Content-Type": "application/json"
            ],
            query: ["grant_type": "refresh_token"],
            body: bodyData
        )
        
        AppLogger.debug("Refreshing auth token", category: AppLogger.auth)
        
        do {
            let response = try await httpClient.send(request)
            
            if response.statusCode >= 200 && response.statusCode < 300 {
                // Pass existing refresh token to handle rotation
                let session = try mapToAuthSession(from: response.data, existingRefreshToken: refreshToken)
                AppLogger.info("Successfully refreshed auth token", category: AppLogger.auth)
                return session
            } else {
                throw mapError(statusCode: response.statusCode, data: response.data)
            }
        } catch is CancellationError {
            throw AuthError.cancelled
        } catch let error as AuthError {
            throw error
        } catch {
            throw mapNetworkError(error)
        }
    }
    
    /// Sign up with email and password
    /// Calls Supabase GoTrue endpoint: POST /auth/v1/signup
    func signUpWithEmail(email: String, password: String) async throws -> AuthSession {
        let requestBody = EmailSignUpRequest(email: email, password: password)
        let bodyData = try JSONEncoder().encode(requestBody)
        
        let request = HTTPRequest(
            path: "/auth/v1/signup",
            method: .post,
            headers: [
                "apikey": config.supabaseAnonKey,
                "Content-Type": "application/json"
            ],
            body: bodyData
        )
        
        AppLogger.debug("Signing up with email", category: AppLogger.auth)
        
        do {
            let response = try await httpClient.send(request)
            
            if response.statusCode >= 200 && response.statusCode < 300 {
                let session = try mapToAuthSession(from: response.data)
                AppLogger.info("Successfully signed up with email", category: AppLogger.auth)
                return session
            } else {
                throw mapError(statusCode: response.statusCode, data: response.data)
            }
        } catch is CancellationError {
            throw AuthError.cancelled
        } catch let error as AuthError {
            throw error
        } catch {
            throw mapNetworkError(error)
        }
    }
    
    /// Sign in with email and password
    /// Calls Supabase GoTrue endpoint: POST /auth/v1/token?grant_type=password
    func signInWithEmail(email: String, password: String) async throws -> AuthSession {
        let requestBody = EmailSignInRequest(email: email, password: password)
        let bodyData = try JSONEncoder().encode(requestBody)
        
        let request = HTTPRequest(
            path: "/auth/v1/token",
            method: .post,
            headers: [
                "apikey": config.supabaseAnonKey,
                "Content-Type": "application/json"
            ],
            query: ["grant_type": "password"],
            body: bodyData
        )
        
        AppLogger.debug("Signing in with email", category: AppLogger.auth)
        
        do {
            let response = try await httpClient.send(request)
            
            if response.statusCode >= 200 && response.statusCode < 300 {
                let session = try mapToAuthSession(from: response.data)
                AppLogger.info("Successfully signed in with email", category: AppLogger.auth)
                return session
            } else {
                throw mapError(statusCode: response.statusCode, data: response.data)
            }
        } catch is CancellationError {
            throw AuthError.cancelled
        } catch let error as AuthError {
            throw error
        } catch {
            throw mapNetworkError(error)
        }
    }
    
    /// Sign in anonymously (no credentials)
    /// Calls Supabase GoTrue endpoint: POST /auth/v1/signup with empty body
    func signInAnonymously() async throws -> AuthSession {
        let request = HTTPRequest(
            path: "/auth/v1/signup",
            method: .post,
            headers: [
                "apikey": config.supabaseAnonKey,
                "Content-Type": "application/json"
            ],
            body: "{}".data(using: .utf8)
        )

        AppLogger.debug("Signing in anonymously", category: AppLogger.auth)

        do {
            let response = try await httpClient.send(request)
            if response.statusCode >= 200 && response.statusCode < 300 {
                let session = try mapToAuthSession(from: response.data)
                AppLogger.info("Successfully signed in anonymously", category: AppLogger.auth)
                return session
            } else {
                throw mapError(statusCode: response.statusCode, data: response.data)
            }
        } catch is CancellationError {
            throw AuthError.cancelled
        } catch let error as AuthError {
            throw error
        } catch {
            throw mapNetworkError(error)
        }
    }

    /// Request password reset email
    /// Calls Supabase GoTrue endpoint: POST /auth/v1/recover
    func resetPassword(email: String) async throws {
        let requestBody = PasswordResetRequest(email: email)
        let bodyData = try JSONEncoder().encode(requestBody)
        
        let request = HTTPRequest(
            path: "/auth/v1/recover",
            method: .post,
            headers: [
                "apikey": config.supabaseAnonKey,
                "Content-Type": "application/json"
            ],
            body: bodyData
        )
        
        AppLogger.debug("Requesting password reset", category: AppLogger.auth)
        
        do {
            let response = try await httpClient.send(request)
            
            if response.statusCode >= 200 && response.statusCode < 300 {
                AppLogger.info("Password reset email sent", category: AppLogger.auth)
            } else {
                throw mapError(statusCode: response.statusCode, data: response.data)
            }
        } catch is CancellationError {
            throw AuthError.cancelled
        } catch let error as AuthError {
            throw error
        } catch {
            throw mapNetworkError(error)
        }
    }
    
    /// Update password (requires valid access token)
    /// Calls Supabase GoTrue endpoint: PUT /auth/v1/user
    func updatePassword(newPassword: String, accessToken: String) async throws {
        let requestBody = PasswordUpdateRequest(password: newPassword)
        let bodyData = try JSONEncoder().encode(requestBody)
        
        let request = HTTPRequest(
            path: "/auth/v1/user",
            method: .put,
            headers: [
                "apikey": config.supabaseAnonKey,
                "Authorization": "Bearer \(accessToken)",
                "Content-Type": "application/json"
            ],
            body: bodyData
        )
        
        AppLogger.debug("Updating password", category: AppLogger.auth)
        
        do {
            let response = try await httpClient.send(request)
            
            if response.statusCode >= 200 && response.statusCode < 300 {
                AppLogger.info("Password updated successfully", category: AppLogger.auth)
            } else {
                throw mapError(statusCode: response.statusCode, data: response.data)
            }
        } catch is CancellationError {
            throw AuthError.cancelled
        } catch let error as AuthError {
            throw error
        } catch {
            throw mapNetworkError(error)
        }
    }
    
    /// Revoke access token (sign out)
    /// Calls Supabase GoTrue endpoint: POST /auth/v1/logout
    /// Note: This is best-effort; local session is cleared even if this fails
    func revoke(accessToken: String) async throws {
        let request = HTTPRequest(
            path: "/auth/v1/logout",
            method: .post,
            headers: [
                "apikey": config.supabaseAnonKey,
                "Authorization": "Bearer \(accessToken)"
            ]
        )
        
        AppLogger.debug("Revoking auth token", category: AppLogger.auth)
        
        do {
            let response = try await httpClient.send(request)
            
            if response.statusCode >= 200 && response.statusCode < 300 {
                AppLogger.info("Successfully revoked auth token", category: AppLogger.auth)
            } else {
                // Log but don't throw - we want to clear local session even if revoke fails
                AppLogger.error("Failed to revoke token: HTTP \(response.statusCode)", category: AppLogger.auth)
            }
        } catch is CancellationError {
            throw AuthError.cancelled
        } catch {
            // Log but don't throw
            AppLogger.error("Failed to revoke token: \(error)", category: AppLogger.auth)
        }
    }
    
    /// Delete the current user's account
    /// Calls Supabase GoTrue admin endpoint or user self-deletion endpoint
    func deleteUser(accessToken: String) async throws {
        let request = HTTPRequest(
            path: "/auth/v1/user",
            method: .delete,
            headers: [
                "apikey": config.supabaseAnonKey,
                "Authorization": "Bearer \(accessToken)"
            ]
        )

        AppLogger.info("Requesting account deletion", category: AppLogger.auth)

        do {
            let response = try await httpClient.send(request)

            if response.statusCode >= 200 && response.statusCode < 300 {
                AppLogger.info("Account deleted on server", category: AppLogger.auth)
            } else {
                AppLogger.error("Account deletion failed: HTTP \(response.statusCode)", category: AppLogger.auth)
                throw AuthError.server(code: response.statusCode, message: "Account deletion failed")
            }
        } catch is CancellationError {
            throw AuthError.cancelled
        } catch let error as AuthError {
            throw error
        } catch {
            throw mapNetworkError(error)
        }
    }

    // MARK: - Private Helpers

    private func mapToAuthSession(from data: Data, existingRefreshToken: String? = nil) throws -> AuthSession {
        do {
            let payload = try JSONDecoder().decode(SessionPayload.self, from: data)
            
            // Check if email confirmation is required (access_token will be nil or empty)
            guard let accessToken = payload.access_token, !accessToken.isEmpty else {
                AppLogger.info("Signup succeeded but email confirmation required", category: AppLogger.auth)
                throw AuthError.emailConfirmationRequired
            }
            
            let user = AuthUser(
                id: payload.user.id,
                email: payload.user.email,
                name: payload.user.user_metadata?.full_name,
                avatarURL: payload.user.user_metadata?.avatar_url.flatMap(URL.init)
            )
            
            // Calculate expiration time (default to 1 hour if not provided)
            let expiresIn = payload.expires_in ?? 3600
            let expiresAt = Date.now.addingTimeInterval(TimeInterval(expiresIn))
            
            // Handle refresh token rotation: use new token if provided, otherwise keep existing
            let refreshToken: String
            if let newRefreshToken = payload.refresh_token {
                refreshToken = newRefreshToken
            } else if let existing = existingRefreshToken {
                refreshToken = existing
                AppLogger.debug("No new refresh token in response, keeping existing", category: AppLogger.auth)
            } else {
                AppLogger.error("No refresh token available", category: AppLogger.auth)
                throw AuthError.parsing
            }
            
            return AuthSession(
                accessToken: accessToken,
                refreshToken: refreshToken,
                expiresAt: expiresAt,
                user: user
            )
        } catch let error as AuthError {
            // Re-throw AuthError cases (including emailConfirmationRequired)
            throw error
        } catch {
            AppLogger.error("Failed to decode auth session: \(error)", category: AppLogger.auth)
            throw AuthError.parsing
        }
    }
    
    private func mapError(statusCode: Int, data: Data) -> AuthError {
        // Log the raw error for debugging FIRST
        let dataString = String(data: data, encoding: .utf8) ?? "<empty>"
        AppLogger.debug("Supabase error (status \(statusCode)): \(dataString)", category: AppLogger.auth)
        
        // Try to parse error message from response
        var message: String?
        if let errorResponse = try? JSONDecoder().decode(SupabaseErrorResponse.self, from: data) {
            AppLogger.debug("Parsed error response - error: \(errorResponse.error ?? "nil"), error_description: \(errorResponse.error_description ?? "nil"), message: \(errorResponse.message ?? "nil"), msg: \(errorResponse.msg ?? "nil"), code: \(errorResponse.code ?? "nil")", category: AppLogger.auth)
            
            message = errorResponse.error_description ?? 
                     errorResponse.message ?? 
                     errorResponse.msg ?? 
                     errorResponse.error
        } else {
            AppLogger.debug("Failed to decode SupabaseErrorResponse from data", category: AppLogger.auth)
        }
        
        // Check for specific error messages that indicate email confirmation required
        if let msg = message?.lowercased() {
            if msg.contains("email not confirmed") || 
               msg.contains("confirm your email") ||
               msg.contains("email confirmation") {
                AppLogger.info("Email confirmation required", category: AppLogger.auth)
                return .emailConfirmationRequired
            }
        }
        
        // Handle status codes
        switch statusCode {
        case 400:
            // Bad request - in auth context, 400 typically means invalid credentials
            if let msg = message?.lowercased() {
                if msg.contains("invalid") || 
                   msg.contains("credentials") ||
                   msg.contains("password") ||
                   msg.contains("wrong") ||
                   msg.contains("user not found") {
                    return .invalidCredentials
                }
            } else {
                // No message from auth endpoint with 400 = invalid credentials
                AppLogger.debug("400 error with no message, treating as invalid credentials", category: AppLogger.auth)
                return .invalidCredentials
            }
            return .server(code: statusCode, message: message)
        case 401, 403:
            return .invalidCredentials
        case 422:
            return .server(code: statusCode, message: message ?? "Invalid input")
        default:
            return .server(code: statusCode, message: message)
        }
    }
    
    private func mapNetworkError(_ error: Error) -> AuthError {
        if let urlError = error as? URLError {
            return .network(underlying: urlError)
        }
        return .unknown(underlying: error)
    }
}

// MARK: - AppLogger Extension

extension AppLogger {
    static let auth = Logger(
        subsystem: AppLogger.subsystem,
        category: "auth"
    )
}
