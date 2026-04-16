import SwiftUI

// MARK: - Hex Color Initializer

public extension Color {
    /// Initialize a Color from a hex string
    /// - Parameter hex: Hex color string (e.g., "#F59E0B" or "F59E0B")
    init(hex: String) {
        let hex = hex.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
        var int: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&int)

        let a, r, g, b: UInt64
        switch hex.count {
        case 3: // RGB (12-bit)
            (a, r, g, b) = (255, (int >> 8) * 17, (int >> 4 & 0xF) * 17, (int & 0xF) * 17)
        case 6: // RGB (24-bit)
            (a, r, g, b) = (255, int >> 16, int >> 8 & 0xFF, int & 0xFF)
        case 8: // ARGB (32-bit)
            (a, r, g, b) = (int >> 24, int >> 16 & 0xFF, int >> 8 & 0xFF, int & 0xFF)
        default:
            (a, r, g, b) = (255, 0, 0, 0)
        }

        self.init(
            .sRGB,
            red: Double(r) / 255,
            green: Double(g) / 255,
            blue: Double(b) / 255,
            opacity: Double(a) / 255
        )
    }
}

// MARK: - CartoStar Color Palette

/// CartoStar Design System color tokens
///
/// Implements the cosmic dark theme with amber accents.
/// Features deep space black backgrounds (#050505) and amber golden accents (#F59E0B).
public extension Color {

    // MARK: - Core Background Colors

    /// Primary background - deep space black (#050505)
    static var acBackground: Color {
        Color(red: 0.02, green: 0.02, blue: 0.02)
    }

    /// Primary foreground/text color (#FAFAFA)
    static var acForeground: Color {
        Color(red: 0.98, green: 0.98, blue: 0.98)
    }

    /// Primary color - same as foreground for dark theme (#FAFAFA)
    static var acPrimary: Color {
        Color(red: 0.98, green: 0.98, blue: 0.98)
    }

    /// Secondary background - slightly elevated (#141414)
    static var acSecondary: Color {
        Color(red: 0.078, green: 0.078, blue: 0.078)
    }

    /// Muted background for subtle surfaces (#1F1F1F)
    static var acMuted: Color {
        Color(red: 0.12, green: 0.12, blue: 0.12)
    }

    /// Muted foreground for secondary text (#A1A1A1)
    static var acMutedForeground: Color {
        Color(red: 0.63, green: 0.63, blue: 0.63)
    }

    // MARK: - Accent Colors (Amber Scale)

    /// Primary accent - amber 500 (#F59E0B)
    static var acAccent: Color {
        Color(red: 0.96, green: 0.62, blue: 0.05)
    }

    /// Amber 50 - lightest amber (#FFFBEB)
    static var acAmber50: Color {
        Color(hex: "#FFFBEB")
    }

    /// Amber 100 (#FEF3C7)
    static var acAmber100: Color {
        Color(hex: "#FEF3C7")
    }

    /// Amber 200 (#FDE68A)
    static var acAmber200: Color {
        Color(hex: "#FDE68A")
    }

    /// Amber 300 (#FCD34D)
    static var acAmber300: Color {
        Color(hex: "#FCD34D")
    }

    /// Amber 400 (#FBBF24)
    static var acAmber400: Color {
        Color(hex: "#FBBF24")
    }

    /// Amber 500 - primary accent (#F59E0B)
    static var acAmber500: Color {
        Color(hex: "#F59E0B")
    }

    /// Amber 600 (#D97706)
    static var acAmber600: Color {
        Color(hex: "#D97706")
    }

    /// Amber 700 (#B45309)
    static var acAmber700: Color {
        Color(hex: "#B45309")
    }

    /// Amber 800 (#92400E)
    static var acAmber800: Color {
        Color(hex: "#92400E")
    }

    /// Amber 900 (#78350F)
    static var acAmber900: Color {
        Color(hex: "#78350F")
    }

    // MARK: - Zinc/Slate Gray Scale

    /// Zinc 50 (#FAFAFA)
    static var acZinc50: Color {
        Color(hex: "#FAFAFA")
    }

    /// Zinc 100 (#F4F4F5)
    static var acZinc100: Color {
        Color(hex: "#F4F4F5")
    }

    /// Zinc 200 (#E4E4E7)
    static var acZinc200: Color {
        Color(hex: "#E4E4E7")
    }

    /// Zinc 300 (#D4D4D8)
    static var acZinc300: Color {
        Color(hex: "#D4D4D8")
    }

    /// Zinc 400 (#A1A1AA)
    static var acZinc400: Color {
        Color(hex: "#A1A1AA")
    }

    /// Zinc 500 (#71717A)
    static var acZinc500: Color {
        Color(hex: "#71717A")
    }

    /// Zinc 600 (#52525B)
    static var acZinc600: Color {
        Color(hex: "#52525B")
    }

    /// Zinc 700 (#3F3F46)
    static var acZinc700: Color {
        Color(hex: "#3F3F46")
    }

    /// Zinc 800 (#27272A)
    static var acZinc800: Color {
        Color(hex: "#27272A")
    }

    /// Zinc 900 (#18181B)
    static var acZinc900: Color {
        Color(hex: "#18181B")
    }

    // MARK: - Border & Separator

    /// Border color (#1A1A1A)
    static var acBorder: Color {
        Color(red: 0.10, green: 0.10, blue: 0.10)
    }

    /// Card border - subtle white at 5% opacity
    static var acCardBorder: Color {
        Color.white.opacity(0.05)
    }

    /// Glass border - gradient-like white at 10-20% opacity
    static var acGlassBorder: Color {
        Color.white.opacity(0.15)
    }

    // MARK: - Semantic Colors

    /// Destructive/error color (#EF4444)
    static var acDestructive: Color {
        Color(red: 0.94, green: 0.27, blue: 0.27)
    }

    /// Success color (#22C55E)
    static var acSuccess: Color {
        Color(hex: "#22C55E")
    }

    /// Warning color (#EAB308)
    static var acWarning: Color {
        Color(hex: "#EAB308")
    }

    /// Info color (#3B82F6)
    static var acInfo: Color {
        Color(hex: "#3B82F6")
    }

    // MARK: - Glass Effect Colors

    /// Glass background - dark with 90% opacity
    static var acGlass: Color {
        Color(red: 0.04, green: 0.04, blue: 0.04).opacity(0.9)
    }

    /// Glass background with ultra-thin material equivalent
    static var acGlassLight: Color {
        Color.white.opacity(0.1)
    }

    /// Glass border top gradient
    static var acGlassBorderTop: Color {
        Color.white.opacity(0.2)
    }

    /// Glass border bottom gradient
    static var acGlassBorderBottom: Color {
        Color.white.opacity(0.05)
    }

    // MARK: - Cosmic Glow Colors

    /// Cosmic amber glow for effects
    static var acCosmicAmber: Color {
        acAmber500.opacity(0.6)
    }

    /// Cosmic amber glow - subtle
    static var acCosmicAmberSubtle: Color {
        acAmber500.opacity(0.3)
    }

    /// Cosmic gold glow
    static var acCosmicGold: Color {
        Color(hex: "#FFD700").opacity(0.5)
    }

    /// Cosmic purple/violet glow
    static var acCosmicPurple: Color {
        Color(hex: "#8B5CF6").opacity(0.5)
    }

    /// Cosmic blue glow
    static var acCosmicBlue: Color {
        Color(hex: "#3B82F6").opacity(0.5)
    }

    /// Cosmic teal glow
    static var acCosmicTeal: Color {
        Color(hex: "#14B8A6").opacity(0.5)
    }

    // MARK: - Planet Colors (for astrocartography lines)
    // Matches web PLANET_COLORS in astro-types.ts for cross-platform consistency

    /// Sun line color - gold-orange (#E8871E)
    static var acPlanetSun: Color {
        Color(hex: "#E8871E")
    }

    /// Moon line color - pearl white (#F0EDE6)
    static var acPlanetMoon: Color {
        Color(hex: "#F0EDE6")
    }

    /// Mercury line color - forest green (#27AE60)
    static var acPlanetMercury: Color {
        Color(hex: "#27AE60")
    }

    /// Venus line color - soft rose (#F4A0B5)
    static var acPlanetVenus: Color {
        Color(hex: "#F4A0B5")
    }

    /// Mars line color - crimson (#C0392B)
    static var acPlanetMars: Color {
        Color(hex: "#C0392B")
    }

    /// Jupiter line color - saffron yellow (#F4C430)
    static var acPlanetJupiter: Color {
        Color(hex: "#F4C430")
    }

    /// Saturn line color - deep indigo (#2C1B6E)
    static var acPlanetSaturn: Color {
        Color(hex: "#2C1B6E")
    }

    /// Uranus line color - electric teal (#00CED1)
    static var acPlanetUranus: Color {
        Color(hex: "#00CED1")
    }

    /// Neptune line color - sea lavender (#6A9FB5)
    static var acPlanetNeptune: Color {
        Color(hex: "#6A9FB5")
    }

    /// Pluto line color - dark crimson (#5C0A0A)
    static var acPlanetPluto: Color {
        Color(hex: "#5C0A0A")
    }

    /// Chiron line color - iridescent violet (#A87DC8)
    static var acPlanetChiron: Color {
        Color(hex: "#A87DC8")
    }

    /// North Node (Rahu) line color - smoky blue (#607090)
    static var acPlanetNorthNode: Color {
        Color(hex: "#607090")
    }

    /// South Node (Ketu) line color - warm brown (#8B6347)
    static var acPlanetSouthNode: Color {
        Color(hex: "#8B6347")
    }

    // MARK: - Theme-Aware Glass Colors

    /// Glass background color - adapts to current theme
    /// Light: frosted white, Dark: dark gray, Aurora: warm cream, Obsidian: deep navy
    static var acGlassBackground: Color {
        switch DSColors.activeTheme {
        case .system(let cs):
            return cs == .dark ? Color(white: 0.15).opacity(0.9) : Color.white.opacity(0.7)
        case .light:
            return Color.white.opacity(0.7)
        case .dark:
            return Color(white: 0.15).opacity(0.9)
        case .aurora:
            return Color(red: 1.0, green: 0.98, blue: 0.96).opacity(0.75)
        case .obsidian:
            return Color(red: 0.12, green: 0.14, blue: 0.22).opacity(0.85)
        }
    }

    /// Glass border color - themed stroke for glass surfaces
    static var acGlassBorderThemed: Color {
        switch DSColors.activeTheme {
        case .system(let cs):
            return cs == .dark ? Color.white.opacity(0.12) : Color.black.opacity(0.08)
        case .light:
            return Color.black.opacity(0.08)
        case .dark:
            return Color.white.opacity(0.12)
        case .aurora:
            return Color(red: 1.0, green: 0.75, blue: 0.65).opacity(0.25)
        case .obsidian:
            return Color(red: 0.5, green: 0.65, blue: 0.85).opacity(0.2)
        }
    }

    /// Dark glass background - for controls over bright map content
    static var acDarkGlassBackground: Color {
        switch DSColors.activeTheme {
        case .system(let cs):
            return cs == .dark ? Color(white: 0.15) : Color(white: 0.92)
        case .light:
            return Color(white: 0.92)
        case .dark:
            return Color(white: 0.15)
        case .aurora:
            return Color(red: 1.0, green: 0.98, blue: 0.96).opacity(0.9)
        case .obsidian:
            return Color(red: 0.12, green: 0.14, blue: 0.22).opacity(0.95)
        }
    }

    /// Dark glass border color
    static var acDarkGlassBorder: Color {
        switch DSColors.activeTheme {
        case .system(let cs):
            return cs == .dark ? Color.white.opacity(0.08) : Color.black.opacity(0.08)
        case .light:
            return Color.black.opacity(0.08)
        case .dark:
            return Color.white.opacity(0.08)
        case .aurora:
            return Color(red: 1.0, green: 0.75, blue: 0.65).opacity(0.2)
        case .obsidian:
            return Color(red: 0.5, green: 0.65, blue: 0.85).opacity(0.15)
        }
    }

    /// Glass tint color for iOS 26+ glass effects (nil for no tint)
    static var acGlassTint: Color? {
        switch DSColors.activeTheme {
        case .aurora:
            return Color(red: 1.0, green: 0.45, blue: 0.6).opacity(0.05)
        case .obsidian:
            return Color(red: 0.4, green: 0.8, blue: 1.0).opacity(0.05)
        default:
            return nil
        }
    }

    // MARK: - WCAG-Compliant Glass Text Colors

    /// Primary text color for glass surfaces - ensures WCAG AA contrast (4.5:1)
    static var acGlassTextPrimary: Color {
        switch DSColors.activeTheme {
        case .system(let cs):
            return cs == .dark ? Color.white : Color(white: 0.1)
        case .light:
            return Color(white: 0.1)  // Dark text on light glass
        case .dark:
            return Color.white
        case .aurora:
            return Color(red: 0.15, green: 0.1, blue: 0.1)  // Dark warm brown
        case .obsidian:
            return Color(red: 0.95, green: 0.97, blue: 1.0)  // Bright blue-white
        }
    }

    /// Secondary text color for glass surfaces - ensures WCAG AA contrast (4.5:1)
    static var acGlassTextSecondary: Color {
        switch DSColors.activeTheme {
        case .system(let cs):
            return cs == .dark ? Color.white.opacity(0.7) : Color(white: 0.35)
        case .light:
            return Color(white: 0.35)  // Medium gray on light glass
        case .dark:
            return Color.white.opacity(0.7)
        case .aurora:
            return Color(red: 0.4, green: 0.32, blue: 0.32)  // Muted warm brown
        case .obsidian:
            return Color(red: 0.7, green: 0.75, blue: 0.85)  // Soft blue-gray
        }
    }

    /// Accent/interactive text on glass surfaces
    static var acGlassTextAccent: Color {
        switch DSColors.activeTheme {
        case .system(let cs):
            return cs == .dark ? acAccent : Color(red: 0.8, green: 0.5, blue: 0.0)
        case .light:
            return Color(red: 0.8, green: 0.5, blue: 0.0)  // Darker amber for contrast
        case .dark:
            return acAccent
        case .aurora:
            return Color(red: 0.85, green: 0.35, blue: 0.45)  // Deep coral
        case .obsidian:
            return Color(red: 0.3, green: 0.7, blue: 0.9)  // Bright cyan
        }
    }

    // MARK: - Score/Rating Colors

    /// Excellent score color (90-100)
    static var acScoreExcellent: Color {
        Color(hex: "#22C55E")
    }

    /// Good score color (70-89)
    static var acScoreGood: Color {
        Color(hex: "#84CC16")
    }

    /// Average score color (50-69)
    static var acScoreAverage: Color {
        acAmber500
    }

    /// Below average score color (30-49)
    static var acScoreBelowAverage: Color {
        Color(hex: "#F97316")
    }

    /// Poor score color (0-29)
    static var acScorePoor: Color {
        acDestructive
    }
}

// MARK: - Gradient Definitions

public extension LinearGradient {

    /// Amber gradient - for primary CTAs
    static var acAmberGradient: LinearGradient {
        LinearGradient(
            colors: [Color.acAmber500, Color.acAmber600],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    /// Glass border gradient - top-to-bottom white fade
    static var acGlassBorderGradient: LinearGradient {
        LinearGradient(
            colors: [Color.acGlassBorderTop, Color.acGlassBorderBottom],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }

    /// Cosmic background gradient
    static var acCosmicGradient: LinearGradient {
        LinearGradient(
            colors: [
                Color.acBackground,
                Color(hex: "#0A0A0F"),
                Color.acBackground
            ],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    /// Shimmer gradient for loading states
    static var acShimmerGradient: LinearGradient {
        LinearGradient(
            colors: [
                Color.clear,
                Color.white.opacity(0.1),
                Color.clear
            ],
            startPoint: .leading,
            endPoint: .trailing
        )
    }
}

// MARK: - Angular Gradient for Glow Effects

public extension AngularGradient {

    /// Cosmic ring glow gradient
    static var acCosmicRingGlow: AngularGradient {
        AngularGradient(
            colors: [
                Color.acCosmicAmber,
                Color.acCosmicGold,
                Color.acCosmicAmber
            ],
            center: .center
        )
    }
}

// MARK: - Radial Gradient for Glow Effects

public extension RadialGradient {

    /// Amber glow effect for behind elements
    static var acAmberGlow: RadialGradient {
        RadialGradient(
            colors: [
                Color.acAmber500.opacity(0.4),
                Color.acAmber500.opacity(0.1),
                Color.clear
            ],
            center: .center,
            startRadius: 0,
            endRadius: 100
        )
    }

    /// Cosmic ambient glow
    static var acCosmicAmbient: RadialGradient {
        RadialGradient(
            colors: [
                Color.acCosmicPurple.opacity(0.3),
                Color.acCosmicBlue.opacity(0.2),
                Color.clear
            ],
            center: .center,
            startRadius: 0,
            endRadius: 200
        )
    }
}
