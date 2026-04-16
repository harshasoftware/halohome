import Foundation

// MARK: - Onboarding Step Labels (matches web STEP_LABELS)

/// The 12 onboarding steps matching web MobileOnboarding.tsx exactly
enum OnboardingStep: Int, CaseIterable {
    case welcome = 0        // Splash with orbiting planets
    case meetCaro = 1       // AI astrologer introduction
    case pronouns = 2       // Gender selection
    case questionnaire = 3  // Goal multi-select
    case birthdate = 4      // Date drum picker
    case birthTime = 5      // Time drum picker
    case locationAccess = 6 // GPS permission
    case journaling = 7     // Journaling prompts toggle
    case aiTraining = 8     // Anonymized data toggle
    case socialProof = 9    // Before/after testimonials
    case personalizing = 10 // Loading animation (auto-advance → complete)

    var label: String {
        switch self {
        case .welcome: return "Welcome"
        case .meetCaro: return "Meet Caro"
        case .pronouns: return "Pronouns"
        case .questionnaire: return "Questionnaire"
        case .birthdate: return "Birthdate"
        case .birthTime: return "Birth Time"
        case .locationAccess: return "Location Access"
        case .journaling: return "Journaling"
        case .aiTraining: return "AI Training"
        case .socialProof: return "Social Proof"
        case .personalizing: return "Personalizing"
        }
    }

    /// Whether the progress meter is shown on this step
    var showsProgress: Bool {
        switch self {
        case .welcome: return false
        default: return true
        }
    }

    /// Progress percentage (0-100) for this step
    var progressPercent: Double {
        switch self {
        case .welcome: return 0
        case .meetCaro: return 2
        case .pronouns: return 17
        case .questionnaire: return 25
        case .birthdate: return 33
        case .birthTime: return 42
        case .locationAccess: return 50
        case .journaling: return 58
        case .aiTraining: return 67
        case .socialProof: return 75
        case .personalizing: return 100
        }
    }
}

// MARK: - Onboarding Data Model

/// Collected onboarding data (persisted for chart creation)
struct OnboardingData {
    var gender: String = "They/Them"
    var goals: Set<String> = []
    var birthDay: Int = 14
    var birthMonth: Int = 5
    var birthYear: Int = 1994
    var birthHour: Int = 11
    var birthMinute: Int = 0
    var birthAmPm: String = "AM"
    var locationReminders: Bool = true
    var journalingReminders: Bool = true
    var aiTraining: Bool = true
}

// MARK: - Goal Definition

struct OnboardingGoal: Identifiable {
    let id: String
    let label: String      // Full label matching web
    let tag: String         // Short tag for display
    let icon: String        // SF Symbol
    let toneHex: String     // Tone color (border, icon, glow)
    let femaleImage: String?
    let maleImage: String?
}

extension OnboardingGoal {
    /// Goals matching web GOAL_OPTIONS exactly (order, labels, tones)
    static let allGoals: [OnboardingGoal] = [
        OnboardingGoal(id: "career", label: "Find my strongest career city", tag: "Career",
                       icon: "briefcase.fill", toneHex: "#60A5FA",
                       femaleImage: "careerwoman", maleImage: "careerman"),
        OnboardingGoal(id: "love", label: "Build healthy relationships", tag: "Love",
                       icon: "heart.fill", toneHex: "#F472B6",
                       femaleImage: "lovememoji", maleImage: "lovememoji"),
        OnboardingGoal(id: "focus", label: "Boost confidence and momentum", tag: "Confidence",
                       icon: "star.fill", toneHex: "#EAB308",
                       femaleImage: "confidentwoman", maleImage: "confidentman"),
        OnboardingGoal(id: "balance", label: "Improve emotional balance", tag: "Wellbeing",
                       icon: "safari.fill", toneHex: "#A78BFA",
                       femaleImage: "womenzen", maleImage: "menzen"),
        OnboardingGoal(id: "wealth", label: "Attract abundance and prosperity", tag: "Wealth",
                       icon: "chart.line.uptrend.xyaxis", toneHex: "#10B981",
                       femaleImage: nil, maleImage: nil),
        OnboardingGoal(id: "travel", label: "Discover best places to travel", tag: "Adventure",
                       icon: "location.north.fill", toneHex: "#C49958",
                       femaleImage: "womentravel", maleImage: "travelman"),
    ]
}

// MARK: - Gender Options

let genderOptions = ["She/Her", "He/Him", "They/Them"]

// MARK: - Months / Days / Years for Pickers

let monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
let dayRange = Array(1...31)
let yearRange = Array(1940...2010).reversed().map { $0 }
let hourRange = Array(1...12)
let minuteRange = Array(0...59)
let ampmOptions = ["AM", "PM"]
