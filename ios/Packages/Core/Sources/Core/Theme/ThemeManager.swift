import SwiftUI
import Combine

/// Manages app-wide theme selection and applies interface style overrides
///
/// Usage:
/// ```swift
/// @Environment(ThemeManager.self) var themeManager
/// themeManager.selected = .aurora
/// ```
@MainActor
@Observable
public final class ThemeManager {
    
    // MARK: - Singleton
    
    public static let shared = ThemeManager()
    
    // MARK: - Theme Definition
    
    public enum Theme: String, CaseIterable, Identifiable {
        case system
        case light
        case dark
        case aurora
        case obsidian
        
        public var id: String { rawValue }
        
        public var displayName: String {
            switch self {
            case .system: return "System"
            case .light: return "Light"
            case .dark: return "Dark"
            case .aurora: return "Aurora"
            case .obsidian: return "Obsidian"
            }
        }
        
        public var description: String {
            switch self {
            case .system: return "Follows system"
            case .light: return "Always light"
            case .dark: return "Always dark"
            case .aurora: return "Premium light"
            case .obsidian: return "Premium dark"
            }
        }
        
        public var isPremium: Bool {
            self == .aurora || self == .obsidian
        }
        
        /// Base interface style for this theme
        public var baseInterfaceStyle: UIUserInterfaceStyle {
            switch self {
            case .system: return .unspecified
            case .light, .aurora: return .light
            case .dark, .obsidian: return .dark
            }
        }
    }
    
    // MARK: - State
    
    /// Currently selected theme
    public var selected: Theme {
        didSet {
            if selected != oldValue {
                persistTheme()
                applyTheme()
            }
        }
    }
    
    /// Current effective color scheme (light or dark)
    public private(set) var effectiveColorScheme: ColorScheme = .light
    
    // MARK: - Initialization
    
    private init() {
        // Load persisted theme
        if let stored = UserDefaults.standard.string(forKey: "selectedTheme"),
           let theme = Theme(rawValue: stored) {
            self.selected = theme
        } else {
            self.selected = .system
        }
        
        // Apply immediately
        applyTheme()
        
        // Observe system appearance changes
        NotificationCenter.default.addObserver(
            forName: UIApplication.didBecomeActiveNotification,
            object: nil,
            queue: .main
        ) { [weak self] _ in
            Task { @MainActor in
                self?.updateEffectiveColorScheme()
            }
        }
    }
    
    // MARK: - Theme Application
    
    /// Apply the current theme to all windows
    public func applyTheme() {
        guard let windowScene = UIApplication.shared.connectedScenes
            .first(where: { $0.activationState == .foregroundActive }) as? UIWindowScene else {
            return
        }
        
        let interfaceStyle = selected.baseInterfaceStyle
        
        // Apply to all windows with smooth animation
        UIView.animate(withDuration: 0.2, delay: 0, options: .curveEaseInOut) {
            windowScene.windows.forEach { window in
                window.overrideUserInterfaceStyle = interfaceStyle
            }
        }
        
        updateEffectiveColorScheme()
        notifyColorSystemOfThemeChange()
    }
    
    /// Notify the color system of theme changes
    /// This updates DSColors.activeTheme to match the selected theme
    private func notifyColorSystemOfThemeChange() {
        // This will be called via a notification or direct import
        // For now, we'll use NotificationCenter to avoid circular dependency
        NotificationCenter.default.post(
            name: NSNotification.Name("ThemeDidChange"),
            object: nil,
            userInfo: ["theme": selected.rawValue, "colorScheme": effectiveColorScheme]
        )
    }
    
    /// Update effective color scheme based on current theme and system
    private func updateEffectiveColorScheme() {
        let systemScheme = UITraitCollection.current.userInterfaceStyle
        
        switch selected {
        case .system:
            effectiveColorScheme = systemScheme == .dark ? .dark : .light
        case .light, .aurora:
            effectiveColorScheme = .light
        case .dark, .obsidian:
            effectiveColorScheme = .dark
        }
    }
    
    /// Persist selected theme
    private func persistTheme() {
        UserDefaults.standard.set(selected.rawValue, forKey: "selectedTheme")
    }
}

// MARK: - Environment Key

public extension EnvironmentValues {
    @Entry var themeManager: ThemeManager = {
        // Access shared instance directly - will be called on MainActor in SwiftUI context
        MainActor.assumeIsolated {
            ThemeManager.shared
        }
    }()
}

