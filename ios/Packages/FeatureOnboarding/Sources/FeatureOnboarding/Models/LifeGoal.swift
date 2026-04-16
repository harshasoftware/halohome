import SwiftUI

/// Life goals the user can select during onboarding.
/// Maps to web's 6-category life focus system.
public enum LifeGoal: String, CaseIterable, Identifiable, Codable {
    case career = "career"
    case love = "love"
    case focus = "focus"
    case balance = "balance"
    case wealth = "wealth"
    case travel = "travel"

    public var id: String { rawValue }

    public var title: String {
        switch self {
        case .career: return "Find my strongest career city"
        case .love: return "Build healthy relationships"
        case .focus: return "Boost confidence and momentum"
        case .balance: return "Improve emotional balance"
        case .wealth: return "Attract abundance and prosperity"
        case .travel: return "Discover best places to travel"
        }
    }

    public var subtitle: String {
        switch self {
        case .career: return "Ambition, visibility, and long-term growth"
        case .love: return "Connection, compatibility, and emotional safety"
        case .focus: return "Motivation, discipline, and execution energy"
        case .balance: return "Regulation, recovery, and inner steadiness"
        case .wealth: return "Flow, opportunity, and financial alignment"
        case .travel: return "Ease, inspiration, and aligned movement"
        }
    }

    public var icon: String {
        switch self {
        case .career: return "briefcase.fill"
        case .love: return "heart.fill"
        case .focus: return "star.fill"
        case .balance: return "location.north.fill"
        case .wealth: return "chart.line.uptrend.xyaxis"
        case .travel: return "paperplane.fill"
        }
    }

    public var color: Color {
        switch self {
        case .career: return Color(red: 0.96, green: 0.71, blue: 0.25) // amber
        case .love: return Color(red: 0.96, green: 0.45, blue: 0.71) // pink
        case .focus: return Color(red: 1.0, green: 0.84, blue: 0.0) // gold
        case .balance: return Color(red: 0.55, green: 0.35, blue: 0.95) // violet
        case .wealth: return Color(red: 0.20, green: 0.78, blue: 0.60) // emerald
        case .travel: return Color(red: 0.94, green: 0.90, blue: 0.55) // khaki
        }
    }
}
