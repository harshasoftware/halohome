import Foundation
import CartoAuth
import CartoStorage
import Supabase  // available transitively: main app → AI package → supabase-swift

// NOTE: This file lives in the main app target, not in the Auth package.
// The Auth package cannot import supabase-swift because supabase-swift's
// umbrella product includes targets named "Auth" (GoTrue) and "Storage" that
// collide with our own module names, breaking SPM package resolution.

/// SDK-backed AuthClient implementation using the official supabase-swift library.
///
/// - Handles JWT management, session persistence, and token refresh automatically.
/// - Mirrors tokens to legacy keychain keys so that SupabaseFavoritesRepository
///   and SupabaseAIChatClient continue to work without changes.
@available(iOS 17.0, *)
@MainActor
final class SupabaseSDKAuthClient: @preconcurrency CartoAuth.AuthClient, @unchecked Sendable {

    // MARK: - Private state

    private let supabase: SupabaseClient
    private let supabaseURL: URL
    private let supabaseKey: String
    private let appleSignIn: AppleSignInProvider
    private let googleSignIn: GoogleSignInProvider?
    private let keychain: SecureStore
    private var stateContinuations: [UUID: AsyncStream<AuthState>.Continuation] = [:]
    private var observationTask: Task<Void, Never>?

    // MARK: - Init

    init(
        supabaseURL: URL,
        supabaseKey: String,
        apple: AppleSignInProvider,
        google: GoogleSignInProvider? = nil,
        keychain: SecureStore
    ) {
        self.supabaseURL = supabaseURL
        self.supabaseKey = supabaseKey
        self.supabase = SupabaseClient(
            supabaseURL: supabaseURL,
            supabaseKey: supabaseKey,
            options: SupabaseClientOptions(
                auth: SupabaseClientOptions.AuthOptions(emitLocalSessionAsInitialSession: true)
            )
        )
        self.appleSignIn = apple
        self.googleSignIn = google
        self.keychain = keychain
        observationTask = Task { [weak self] in
            await self?.observeAuthStateChanges()
        }
    }

    deinit { observationTask?.cancel() }

    // MARK: - SDK state observation

    private func observeAuthStateChanges() async {
        for await (event, session) in supabase.auth.authStateChanges {
            guard !Task.isCancelled else { break }
            mirrorToLegacyKeychain(session: session)
            let state: AuthState
            switch event {
            case .signedIn, .tokenRefreshed, .userUpdated, .initialSession:
                if let user = session?.user {
                    state = .authenticated(map(user))
                } else {
                    state = .unauthenticated
                }
            case .signedOut:
                state = .unauthenticated
            default:
                continue
            }
            stateContinuations.values.forEach { $0.yield(state) }
        }
    }

    private func mirrorToLegacyKeychain(session: Session?) {
        if let session {
            try? keychain.setString(session.accessToken, for: KeychainStore.Keys.authAccessToken)
            try? keychain.setString(session.refreshToken, for: KeychainStore.Keys.authRefreshToken)
        } else {
            try? keychain.delete(KeychainStore.Keys.authAccessToken)
            try? keychain.delete(KeychainStore.Keys.authRefreshToken)
        }
    }

    // MARK: - AuthClient

    func signInAnonymously() async throws -> AuthUser {
        let session = try await supabase.auth.signInAnonymously()
        return map(session.user)
    }

    func signInWithApple() async throws -> AuthUser {
        let nonce = Nonce.random()
        let (idToken, originalNonce) = try await appleSignIn.requestIDToken(
            originalNonce: nonce,
            hashedNonce: Nonce.sha256(nonce)
        )
        let session = try await supabase.auth.signInWithIdToken(
            credentials: OpenIDConnectCredentials(
                provider: .apple,
                idToken: idToken,
                nonce: originalNonce
            )
        )
        return map(session.user)
    }

    func signInWithGoogle() async throws -> AuthUser {
        guard let google = googleSignIn else { throw AuthError.notConfigured }
        let result = try await google.requestTokens()
        let session = try await supabase.auth.signInWithIdToken(
            credentials: OpenIDConnectCredentials(
                provider: .google,
                idToken: result.idToken,
                accessToken: result.accessToken
            )
        )
        return map(session.user)
    }

    func signUpWithEmail(email: String, password: String) async throws -> AuthUser {
        let response = try await supabase.auth.signUp(email: email, password: password)
        guard let session = response.session else {
            throw AuthError.emailConfirmationRequired
        }
        return map(session.user)
    }

    func signInWithEmail(email: String, password: String) async throws -> AuthUser {
        let session = try await supabase.auth.signIn(email: email, password: password)
        return map(session.user)
    }

    func resetPassword(email: String) async throws {
        try await supabase.auth.resetPasswordForEmail(email)
    }

    func signOut() async throws {
        try await supabase.auth.signOut()
    }

    func currentUser() async -> AuthUser? {
        supabase.auth.currentUser.map { map($0) }
    }

    func authStates() -> AsyncStream<AuthState> {
        AsyncStream { [weak self] continuation in
            guard let self else {
                continuation.yield(.unauthenticated)
                continuation.finish()
                return
            }
            let id = UUID()
            stateContinuations[id] = continuation
            if let user = supabase.auth.currentUser {
                continuation.yield(.authenticated(map(user)))
            } else {
                continuation.yield(.unauthenticated)
            }
            continuation.onTermination = { [weak self] _ in
                Task { @MainActor [weak self] in
                    self?.stateContinuations.removeValue(forKey: id)
                }
            }
        }
    }

    func refreshIfNeeded() async throws {
        guard let session = supabase.auth.currentSession else { return }
        let expiresAt = Date(timeIntervalSince1970: session.expiresAt)
        if Date.now >= expiresAt.addingTimeInterval(-60) {
            _ = try await supabase.auth.refreshSession()
        }
    }

    func deleteAccount() async throws {
        guard let session = supabase.auth.currentSession else { throw AuthError.notAuthenticated }
        // supabase-swift doesn't expose a self-delete method; use the GoTrue REST API directly.
        var request = URLRequest(url: supabaseURL.appendingPathComponent("/auth/v1/user"))
        request.httpMethod = "DELETE"
        request.setValue("Bearer \(session.accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
        let (_, response) = try await URLSession.shared.data(for: request)
        if let http = response as? HTTPURLResponse, !(200..<300).contains(http.statusCode) {
            throw AuthError.server(code: http.statusCode, message: nil)
        }
        try await supabase.auth.signOut()
        mirrorToLegacyKeychain(session: nil)
    }

    // MARK: - Mapping

    private func map(_ user: Supabase.User) -> AuthUser {
        let name: String?
        if case .string(let n) = user.userMetadata["full_name"] { name = n }
        else if case .string(let n) = user.userMetadata["name"] { name = n }
        else { name = nil }

        let avatarURL: URL?
        if case .string(let s) = user.userMetadata["avatar_url"] { avatarURL = URL(string: s) }
        else { avatarURL = nil }

        return AuthUser(
            id: user.id.uuidString,
            email: user.email,
            name: name,
            avatarURL: avatarURL,
            isAnonymous: user.isAnonymous
        )
    }
}
