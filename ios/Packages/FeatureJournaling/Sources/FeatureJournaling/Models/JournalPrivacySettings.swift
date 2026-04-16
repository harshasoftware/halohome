import Foundation

/// Privacy settings for journal entries
public struct JournalPrivacySettings: Codable, Sendable, Equatable {
    /// Whether the user consents to AI training on their journal data
    public var consentForAITraining: Bool

    /// Whether the user consents to community sharing of journal entries
    public var consentForCommunitySharing: Bool

    /// Number of days to retain raw location data (0 = indefinite)
    public var locationDataRetentionDays: Int

    public init(
        consentForAITraining: Bool = false,
        consentForCommunitySharing: Bool = false,
        locationDataRetentionDays: Int = 0
    ) {
        self.consentForAITraining = consentForAITraining
        self.consentForCommunitySharing = consentForCommunitySharing
        self.locationDataRetentionDays = locationDataRetentionDays
    }

    enum CodingKeys: String, CodingKey {
        case consentForAITraining = "consent_for_ai_training"
        case consentForCommunitySharing = "consent_for_community_sharing"
        case locationDataRetentionDays = "location_data_retention_days"
    }
}
