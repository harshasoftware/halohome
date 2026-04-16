import Foundation

// MARK: - Request DTOs

struct AppleSignInRequest: Codable {
    let id_token: String
    let nonce: String
}

struct GoogleSignInRequest: Codable {
    let id_token: String
}

struct RefreshTokenRequest: Codable {
    let refresh_token: String
}

struct EmailSignUpRequest: Codable {
    let email: String
    let password: String
}

struct EmailSignInRequest: Codable {
    let email: String
    let password: String
}

struct PasswordResetRequest: Codable {
    let email: String
}

struct PasswordUpdateRequest: Codable {
    let password: String
}

// MARK: - Response DTOs

struct SessionPayload: Codable {
    let access_token: String? // Optional - nil/empty when email confirmation is required
    let refresh_token: String? // Optional to support refresh token rotation
    let expires_in: Int? // Optional - nil when email confirmation is required
    let token_type: String?
    let user: UserPayload
}

struct UserPayload: Codable {
    let id: String
    let email: String?
    let user_metadata: UserMetadata?
    
    struct UserMetadata: Codable {
        let full_name: String?
        let avatar_url: String?
    }
}

// MARK: - Error Response

struct SupabaseErrorResponse: Codable {
    let error: String?
    let error_description: String?
    let msg: String?
    let message: String?
    let code: String?
}
