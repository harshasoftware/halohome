import Foundation

/// Represents an authenticated user
public struct AuthUser: Sendable, Equatable, Codable {
    /// Unique identifier for the user
    public let id: String

    /// User's email address
    public let email: String?

    /// User's display name
    public let name: String?

    /// URL to user's avatar image
    public let avatarURL: URL?

    /// True for anonymous (guest) sessions created via signInAnonymously()
    public let isAnonymous: Bool

    public init(
        id: String,
        email: String? = nil,
        name: String? = nil,
        avatarURL: URL? = nil,
        isAnonymous: Bool = false
    ) {
        self.id = id
        self.email = email
        self.name = name
        self.avatarURL = avatarURL
        self.isAnonymous = isAnonymous
    }
}
