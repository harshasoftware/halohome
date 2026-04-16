import Foundation

/// User's gender/pronoun preference.
public enum Gender: String, CaseIterable, Identifiable, Codable {
    case sheHer = "she_her"
    case heHim = "he_him"
    case theyThem = "they_them"
    case preferNotToSay = "prefer_not_to_say"

    public var id: String { rawValue }

    public var displayText: String {
        switch self {
        case .sheHer: return "She / Her"
        case .heHim: return "He / Him"
        case .theyThem: return "They / Them"
        case .preferNotToSay: return "Prefer not to say"
        }
    }
}

/// All user data collected during onboarding.
public struct OnboardingData: Equatable {
    public var gender: Gender = .preferNotToSay
    public var goals: Set<LifeGoal> = []
    public var birthDate: Date?
    public var birthTime: Date?
    public var birthLocation: String = ""
    public var birthLatitude: Double?
    public var birthLongitude: Double?
    public var locationRemindersEnabled: Bool = true
    public var journalingRemindersEnabled: Bool = true
    public var aiTrainingOptIn: Bool = true

    public init() {}

    /// Whether all required birth data is collected
    public var hasBirthData: Bool {
        birthDate != nil && birthTime != nil && !birthLocation.isEmpty
    }

    /// Whether at least one goal is selected
    public var hasGoals: Bool {
        !goals.isEmpty
    }
}
