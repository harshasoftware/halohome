import Foundation

/// Map style themes for the Mapbox globe
///
/// Controls the visual appearance of the globe's base map (background, water, land, etc.)
/// while astrocartography lines remain visible on all styles.
public enum MapStyleTheme: String, CaseIterable, Identifiable, Sendable {
    // Dark themes (best for astro lines visibility)
    case cosmic      // Dark with enhanced colors (default)
    case dark        // Standard Mapbox dark
    case midnight    // Navigation dark (OLED friendly)

    // Light themes
    case light       // Standard Mapbox light
    case streets     // Classic street map
    case outdoors    // Topographic/hiking style

    // Satellite themes
    case satellite   // Pure satellite imagery
    case hybrid      // Satellite with labels

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .cosmic: return "Cosmic"
        case .dark: return "Dark"
        case .midnight: return "Midnight"
        case .light: return "Light"
        case .streets: return "Streets"
        case .outdoors: return "Outdoors"
        case .satellite: return "Satellite"
        case .hybrid: return "Hybrid"
        }
    }

    public var description: String {
        switch self {
        case .cosmic: return "Dark space theme"
        case .dark: return "Standard dark mode"
        case .midnight: return "OLED pure black"
        case .light: return "Bright minimal style"
        case .streets: return "Classic street map"
        case .outdoors: return "Terrain & hiking trails"
        case .satellite: return "Satellite imagery"
        case .hybrid: return "Satellite with labels"
        }
    }

    /// SF Symbol name for the theme
    public var icon: String {
        switch self {
        case .cosmic: return "sparkles"
        case .dark: return "moon.fill"
        case .midnight: return "moon.stars.fill"
        case .light: return "sun.max.fill"
        case .streets: return "map.fill"
        case .outdoors: return "mountain.2.fill"
        case .satellite: return "globe.americas.fill"
        case .hybrid: return "globe.desk.fill"
        }
    }

    /// Whether this is a dark theme (affects UI overlays)
    public var isDark: Bool {
        switch self {
        case .cosmic, .dark, .midnight, .satellite, .hybrid:
            return true
        case .light, .streets, .outdoors:
            return false
        }
    }

    /// Category for grouping in settings UI
    public var category: MapStyleCategory {
        switch self {
        case .cosmic, .dark, .midnight:
            return .dark
        case .light, .streets, .outdoors:
            return .light
        case .satellite, .hybrid:
            return .satellite
        }
    }

    /// UserDefaults key for persisting the selected map style
    public static let storageKey = "mapStyleTheme"

    /// Read current theme from UserDefaults, defaulting to `.cosmic`
    public static var current: MapStyleTheme {
        guard let raw = UserDefaults.standard.string(forKey: storageKey),
              let theme = MapStyleTheme(rawValue: raw) else { return .cosmic }
        return theme
    }
}

/// Categories for grouping map styles in settings
public enum MapStyleCategory: String, CaseIterable {
    case dark = "Dark Themes"
    case light = "Light Themes"
    case satellite = "Satellite"
}
