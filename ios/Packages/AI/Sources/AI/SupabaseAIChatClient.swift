import Foundation

// MARK: - SupabaseAIChatClient

/// Manages auth tokens for Supabase edge function calls using direct REST calls.
/// Does NOT depend on the supabase-swift SDK — that package's "Auth" and "Storage"
/// target names conflict with our local Auth and Storage packages at the SPM level.
@MainActor
public final class SupabaseAIChatClient {

    private let supabaseURL: URL
    private let supabaseKey: String
    private var accessToken: String?
    private var refreshToken: String?
    private var sessionEnsured = false

    public init(supabaseURL: URL, supabaseKey: String) {
        self.supabaseURL = supabaseURL
        self.supabaseKey = supabaseKey
    }

    // MARK: - Session Management

    /// Restore an existing Supabase auth session from stored tokens.
    /// Call this when the user is already signed in (tokens in keychain).
    public func importSession(accessToken: String, refreshToken: String) async {
        if let exp = jwtExpiry(accessToken), exp > Date.now.addingTimeInterval(60) {
            self.accessToken = accessToken
            self.refreshToken = refreshToken
            sessionEnsured = true
        } else {
            // Access token expired — try refreshing with the refresh token
            await refreshSession(using: refreshToken)
        }
    }

    /// Sign in anonymously if no auth session exists.
    /// Creates a persistent anonymous user so the JWT satisfies `verify_jwt = true`.
    public func ensureAnonymousSession() async {
        guard !sessionEnsured else { return }
        if accessToken != nil { sessionEnsured = true; return }
        await signInAnonymously()
    }

    // MARK: - Token Access

    /// Returns the current access token (a valid JWT), or nil if no session.
    public func currentAccessToken() async -> String? {
        if let token = accessToken {
            // Return token if it has more than 60 seconds remaining
            if let exp = jwtExpiry(token), exp > Date.now.addingTimeInterval(60) {
                return token
            }
            // Expired — try refresh
            if let refresh = refreshToken {
                await refreshSession(using: refresh)
                return accessToken
            }
        }
        await ensureAnonymousSession()
        return accessToken
    }

    // MARK: - GoTrue REST API

    private func signInAnonymously() async {
        guard let url = URL(string: supabaseURL.absoluteString + "/auth/v1/signup") else { return }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
        request.httpBody = Data("{}".utf8)

        guard let (data, _) = try? await URLSession.shared.data(for: request),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let access = json["access_token"] as? String,
              let refresh = json["refresh_token"] as? String else { return }

        accessToken = access
        self.refreshToken = refresh
        sessionEnsured = true
    }

    private func refreshSession(using refreshToken: String) async {
        guard let url = URL(
            string: supabaseURL.absoluteString + "/auth/v1/token?grant_type=refresh_token"
        ) else { return }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue(supabaseKey, forHTTPHeaderField: "apikey")
        request.httpBody = try? JSONSerialization.data(withJSONObject: ["refresh_token": refreshToken])

        guard let (data, _) = try? await URLSession.shared.data(for: request),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let access = json["access_token"] as? String,
              let newRefresh = json["refresh_token"] as? String else { return }

        accessToken = access
        self.refreshToken = newRefresh
        sessionEnsured = true
    }

    // MARK: - JWT helpers

    /// Decode the `exp` claim from a JWT without any external dependency.
    private func jwtExpiry(_ token: String) -> Date? {
        let parts = token.split(separator: ".", omittingEmptySubsequences: false)
        guard parts.count == 3 else { return nil }
        var payload = String(parts[1])
        // Base64url → base64 padding
        payload = payload.replacingOccurrences(of: "-", with: "+")
                         .replacingOccurrences(of: "_", with: "/")
        let padded = payload + String(repeating: "=", count: (4 - payload.count % 4) % 4)
        guard let data = Data(base64Encoded: padded),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let exp = json["exp"] as? TimeInterval else { return nil }
        return Date(timeIntervalSince1970: exp)
    }
}
