import SwiftUI

/// 12-step onboarding flow matching web implementation.
public enum OnboardingStep: Int, CaseIterable, Identifiable {
    case welcome = 0
    case meetCaro = 1
    case pronouns = 2
    case goals = 3
    case birthDate = 4
    case birthTime = 5
    case locationPermission = 6
    case journaling = 7
    case aiTraining = 8
    case socialProof = 9
    case loading = 10
    case paywall = 11

    public var id: Int { rawValue }

    /// Background color for concentric circle transition.
    /// Each step has a distinct cosmic gradient color.
    public var backgroundColor: Color {
        switch self {
        case .welcome:
            return Color(red: 0.02, green: 0.02, blue: 0.05)
        case .meetCaro:
            return Color(red: 0.05, green: 0.03, blue: 0.08)
        case .pronouns:
            return Color(red: 0.04, green: 0.04, blue: 0.10)
        case .goals:
            return Color(red: 0.06, green: 0.03, blue: 0.12)
        case .birthDate:
            return Color(red: 0.08, green: 0.04, blue: 0.14)
        case .birthTime:
            return Color(red: 0.06, green: 0.05, blue: 0.12)
        case .locationPermission:
            return Color(red: 0.04, green: 0.06, blue: 0.10)
        case .journaling:
            return Color(red: 0.05, green: 0.04, blue: 0.10)
        case .aiTraining:
            return Color(red: 0.06, green: 0.03, blue: 0.08)
        case .socialProof:
            return Color(red: 0.04, green: 0.04, blue: 0.08)
        case .loading:
            return Color(red: 0.03, green: 0.03, blue: 0.06)
        case .paywall:
            return Color(red: 0.02, green: 0.02, blue: 0.05)
        }
    }

    /// Whether this step shows progress bar (steps 2-8)
    public var showsProgress: Bool {
        switch self {
        case .pronouns, .goals, .birthDate, .birthTime, .locationPermission, .journaling, .aiTraining:
            return true
        default:
            return false
        }
    }

    /// Progress value for steps that show progress bar (0.0 to 1.0)
    public var progress: Double {
        guard showsProgress else { return 0 }
        // Steps 2-8 map to progress 1/7 through 7/7
        let progressSteps: [OnboardingStep] = [
            .pronouns, .goals, .birthDate, .birthTime,
            .locationPermission, .journaling, .aiTraining
        ]
        guard let index = progressSteps.firstIndex(of: self) else { return 0 }
        return Double(index + 1) / Double(progressSteps.count)
    }
}
