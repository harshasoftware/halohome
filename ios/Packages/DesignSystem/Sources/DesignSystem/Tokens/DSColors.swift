import SwiftUI

/// Signature Design System color tokens
/// 
/// Provides a premium, consistent color palette with theme support.
/// Supports System, Light, Dark, Aurora (premium light), and Obsidian (premium dark) themes.
public enum DSColors {
    
    // MARK: - Theme State
    
    /// Current active theme palette
    internal static var activeTheme: ThemePalette = .system(colorScheme: .light)
    
    // MARK: - Core Brand Colors
    
    /// Primary accent color - main brand color
    public static var accentPrimary: Color {
        switch activeTheme {
        case .system, .light, .dark:
            return named("AccentPrimary", fallback: Color(red: 0.0, green: 0.48, blue: 1.0))
        case .aurora:
            return Color(red: 1.0, green: 0.45, blue: 0.6) // Vibrant coral/rose
        case .obsidian:
            return Color(red: 0.4, green: 0.8, blue: 1.0) // Electric cyan
        }
    }
    
    /// Secondary accent color - for gradients and highlights
    public static var accentSecondary: Color {
        switch activeTheme {
        case .system, .light, .dark:
            return named("AccentSecondary", fallback: Color(red: 0.4, green: 0.6, blue: 1.0))
        case .aurora:
            return Color(red: 1.0, green: 0.6, blue: 0.4) // Warm peach/gold
        case .obsidian:
            return Color(red: 0.6, green: 0.4, blue: 1.0) // Vibrant purple
        }
    }
    
    // MARK: - Surface Colors
    
    /// Page background color
    public static var background: Color {
        switch activeTheme {
        case .system, .light, .dark:
            return Color(.systemBackground)
        case .aurora:
            return Color(red: 0.99, green: 0.96, blue: 0.94) // Warm cream/ivory
        case .obsidian:
            return Color(red: 0.08, green: 0.10, blue: 0.16) // Deep navy/indigo
        }
    }
    
    /// Base surface color (cards, containers)
    public static var surface: Color {
        switch activeTheme {
        case .system, .light, .dark:
            return Color(.secondarySystemBackground)
        case .aurora:
            return Color(red: 1.0, green: 0.98, blue: 0.96) // Soft peachy white
        case .obsidian:
            return Color(red: 0.12, green: 0.14, blue: 0.22) // Rich dark blue
        }
    }
    
    /// Elevated surface (modals, popovers)
    public static var surfaceElevated: Color {
        switch activeTheme {
        case .system, .light:
            return Color(UIColor.systemBackground) // White in light mode for readable cards
        case .dark:
            return Color(.tertiarySystemBackground)
        case .aurora:
            return .white
        case .obsidian:
            return Color(red: 0.16, green: 0.18, blue: 0.28) // Lighter navy for elevation
        }
    }
    
    /// Tinted surface with subtle brand color
    public static var surfaceTinted: Color {
        accentPrimary.opacity(0.08)
    }
    
    // MARK: - Border & Separator
    
    /// Hairline border color
    public static var borderHairline: Color {
        switch activeTheme {
        case .system, .light, .dark:
            return Color(.separator)
        case .aurora:
            return Color(red: 1.0, green: 0.8, blue: 0.7).opacity(0.3) // Warm peachy border
        case .obsidian:
            return Color(red: 0.4, green: 0.6, blue: 0.8).opacity(0.2) // Subtle blue glow
        }
    }
    
    /// Subtle separator for section dividers (better contrast than hairline)
    public static var borderSubtle: Color {
        switch activeTheme {
        case .system, .light:
            return Color(.separator).opacity(0.8)
        case .dark:
            return Color(.separator).opacity(0.6)
        case .aurora:
            return Color(red: 1.0, green: 0.75, blue: 0.65).opacity(0.4) // Warmer, more visible
        case .obsidian:
            return Color(red: 0.5, green: 0.65, blue: 0.85).opacity(0.25) // Softer glow
        }
    }
    
    // MARK: - Text Colors
    
    /// Primary text color
    public static var textPrimary: Color {
        switch activeTheme {
        case .system, .light, .dark:
            return Color(.label)
        case .aurora:
            return Color(red: 0.2, green: 0.15, blue: 0.15) // Warm dark brown
        case .obsidian:
            return Color(red: 0.92, green: 0.94, blue: 0.98) // Cool light blue-white
        }
    }
    
    /// Secondary text color
    public static var textSecondary: Color {
        switch activeTheme {
        case .system, .light, .dark:
            return Color(.secondaryLabel)
        case .aurora:
            return Color(red: 0.55, green: 0.45, blue: 0.45) // Muted mauve
        case .obsidian:
            return Color(red: 0.65, green: 0.7, blue: 0.8) // Soft blue-gray
        }
    }

    /// Tertiary text color (de-emphasized, placeholder-level)
    public static var textTertiary: Color {
        switch activeTheme {
        case .system, .light, .dark:
            return Color(.tertiaryLabel)
        case .aurora:
            return Color(red: 0.75, green: 0.65, blue: 0.65) // Lighter mauve
        case .obsidian:
            return Color(red: 0.45, green: 0.5, blue: 0.6) // Dimmer blue-gray
        }
    }

    /// Brand primary color — alias for accentPrimary
    public static var brandPrimary: Color { accentPrimary }

    // MARK: - Component-Specific Colors
    
    /// Chip background (unselected)
    public static var chipBackground: Color {
        named("ChipBackground", fallback: Color(.tertiarySystemFill))
    }
    
    /// Chip background (selected)
    public static var chipSelectedBackground: Color {
        named("ChipSelectedBackground", fallback: accentPrimary.opacity(0.15))
    }
    
    /// Toast accent color
    public static var toastAccent: Color {
        named("ToastAccent", fallback: accentPrimary)
    }
    
    // MARK: - Semantic Colors
    
    /// Danger/error color
    public static var danger: Color {
        named("Danger", fallback: Color(.systemRed))
    }
    
    /// Success color
    public static var success: Color {
        named("Success", fallback: Color(.systemGreen))
    }
    
    /// Warning color
    public static var warning: Color {
        named("Warning", fallback: Color(.systemOrange))
    }
    
    // MARK: - Legacy Compatibility
    
    /// Legacy primary color (maps to accentPrimary)
    public static var primary: Color { accentPrimary }
    
    /// Legacy user bubble color with fallback
    public static var bubbleUserOrFallback: Color {
        accentPrimary
    }
    
    /// Legacy assistant bubble color with fallback
    public static var bubbleAssistantOrFallback: Color {
        surface
    }
    
    /// Legacy separator color
    public static var separator: Color {
        borderHairline
    }
    
    // MARK: - Shadow Color
    
    /// Shadow color for elevation
    public static var shadow: Color {
        switch activeTheme {
        case .system, .light, .dark, .aurora:
            return .black
        case .obsidian:
            return .black // Pure black for OLED
        }
    }
    
    // MARK: - Theme Palette
    
    /// Theme palette definition
    internal enum ThemePalette {
        case system(colorScheme: ColorScheme)
        case light
        case dark
        case aurora
        case obsidian
    }
    
    // MARK: - Private Helpers
    
    private static func named(_ name: String, fallback: Color) -> Color {
        // SPM automatically provides Bundle.module when resources are included
        Color(name, bundle: .module)
    }
}

// MARK: - Theme Application

public extension DSColors {
    /// Update the active theme palette
    /// Call this when theme changes to update all color tokens
    static func setTheme(_ theme: String, colorScheme: ColorScheme) {
        let oldTheme = activeTheme
        
        switch theme {
        case "system":
            activeTheme = .system(colorScheme: colorScheme)
        case "light":
            activeTheme = .light
        case "dark":
            activeTheme = .dark
        case "aurora":
            activeTheme = .aurora
        case "obsidian":
            activeTheme = .obsidian
        default:
            activeTheme = .system(colorScheme: colorScheme)
        }
        
        // Notify that theme changed to force view refresh
        if String(describing: oldTheme) != String(describing: activeTheme) {
            NotificationCenter.default.post(
                name: NSNotification.Name("DSColorsDidChange"),
                object: nil
            )
        }
    }
    
    /// Start listening for theme change notifications
    /// Call this once at app startup
    static func observeThemeChanges() {
        NotificationCenter.default.addObserver(
            forName: NSNotification.Name("ThemeDidChange"),
            object: nil,
            queue: .main
        ) { notification in
            guard let userInfo = notification.userInfo,
                  let theme = userInfo["theme"] as? String,
                  let colorScheme = userInfo["colorScheme"] as? ColorScheme else {
                return
            }
            setTheme(theme, colorScheme: colorScheme)
        }
    }
}

