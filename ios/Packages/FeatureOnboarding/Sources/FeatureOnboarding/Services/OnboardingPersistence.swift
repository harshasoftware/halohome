import Foundation

/// Handles persistence of onboarding state to UserDefaults.
public struct OnboardingPersistence {

    // MARK: - Keys

    private enum Keys {
        static let hasCompletedOnboarding = "hasCompletedOnboarding"
        static let userGoals = "user_goals"
        static let userGender = "user_gender"
        static let locationRemindersEnabled = "location_reminders_enabled"
        static let journalingRemindersEnabled = "journaling_reminders_enabled"
        static let aiTrainingOptIn = "ai_training_opt_in"
    }

    private let defaults: UserDefaults

    // MARK: - Initialization

    public init(defaults: UserDefaults = .standard) {
        self.defaults = defaults
    }

    // MARK: - Completion Status

    /// Check if onboarding has been completed.
    public var hasCompletedOnboarding: Bool {
        defaults.bool(forKey: Keys.hasCompletedOnboarding)
    }

    /// Mark onboarding as completed.
    public func markCompleted() {
        defaults.set(true, forKey: Keys.hasCompletedOnboarding)
    }

    /// Reset onboarding status (for testing/debugging).
    public func reset() {
        defaults.removeObject(forKey: Keys.hasCompletedOnboarding)
        defaults.removeObject(forKey: Keys.userGoals)
        defaults.removeObject(forKey: Keys.userGender)
        defaults.removeObject(forKey: Keys.locationRemindersEnabled)
        defaults.removeObject(forKey: Keys.journalingRemindersEnabled)
        defaults.removeObject(forKey: Keys.aiTrainingOptIn)
    }

    // MARK: - Save Onboarding Data

    /// Save all onboarding data.
    public func save(_ data: OnboardingData) {
        // Save goals as string array
        let goalStrings = data.goals.map { $0.rawValue }
        defaults.set(goalStrings, forKey: Keys.userGoals)

        // Save gender
        defaults.set(data.gender.rawValue, forKey: Keys.userGender)

        // Save preferences
        defaults.set(data.locationRemindersEnabled, forKey: Keys.locationRemindersEnabled)
        defaults.set(data.journalingRemindersEnabled, forKey: Keys.journalingRemindersEnabled)
        defaults.set(data.aiTrainingOptIn, forKey: Keys.aiTrainingOptIn)

        // Mark completed
        markCompleted()
    }

    // MARK: - Load Saved Data

    /// Load saved goals.
    public var savedGoals: Set<LifeGoal> {
        guard let strings = defaults.stringArray(forKey: Keys.userGoals) else {
            return []
        }
        return Set(strings.compactMap { LifeGoal(rawValue: $0) })
    }

    /// Load saved gender.
    public var savedGender: Gender {
        guard let string = defaults.string(forKey: Keys.userGender),
              let gender = Gender(rawValue: string) else {
            return .preferNotToSay
        }
        return gender
    }

    /// Load location reminders preference.
    public var locationRemindersEnabled: Bool {
        defaults.bool(forKey: Keys.locationRemindersEnabled)
    }

    /// Load journaling reminders preference.
    public var journalingRemindersEnabled: Bool {
        defaults.bool(forKey: Keys.journalingRemindersEnabled)
    }

    /// Load AI training opt-in preference.
    public var aiTrainingOptIn: Bool {
        // Default to true if not set
        if defaults.object(forKey: Keys.aiTrainingOptIn) == nil {
            return true
        }
        return defaults.bool(forKey: Keys.aiTrainingOptIn)
    }
}
