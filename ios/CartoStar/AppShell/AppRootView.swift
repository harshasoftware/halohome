import SwiftUI
import Core
import CartoStorage
import FeatureChat
import FeatureSettings
import FeatureOnboarding
import Payments
import DesignSystem
import FeatureBirthData

/// Root view that manages app-level routing and theme
@available(iOS 17.0, *)
struct AppRootView: View {

    @State private var router: LaunchRouter
    @State private var selectedTab: MainTabView.Tab = .home
    @Environment(ThemeManager.self) private var themeManager
    @Environment(\.scenePhase) private var scenePhase
    @Environment(\.colorScheme) private var systemColorScheme  // Observe system color scheme changes

    private let environment: AppEnvironment

    init(environment: AppEnvironment) {
        self.environment = environment
        self.router = LaunchRouter(
            authClient: environment.authClient,
            paymentsClient: environment.paymentsClient,
            settingsRepository: environment.settingsRepository,
            crashReporter: environment.compositionRoot.crashReporter
        )
    }
    
    private var theme: SettingsDTO.Theme {
        switch themeManager.selected {
        case .system: return .system
        case .light: return .light
        case .dark: return .dark
        case .aurora: return .aurora
        case .obsidian: return .obsidian
        }
    }
    
    var body: some View {
        Group {
            switch router.destination {
            case .signIn:
                SignInView(authClient: environment.authClient)
                    .transition(.opacity)

            case .afterAuthPaywall:
                // After-auth paywall — "afterauth" Adapty no-code placement
                ZStack {
                    Color.black.ignoresSafeArea()
                    AdaptyNoCodePaywallView(
                        placementID: "afterauth",
                        onPurchaseComplete: {
                            router.handlePurchaseComplete()
                        },
                        onDismiss: {
                            router.handleAfterAuthPaywallDismissed()
                        }
                    )
                }
                .transition(.opacity)

            case .lifetimeOfferPaywall:
                // Lifetime offer — "propaywallgotcancelled" Adapty no-code placement
                ZStack {
                    Color.black.ignoresSafeArea()
                    AdaptyNoCodePaywallView(
                        placementID: "propaywallgotcancelled",
                        onPurchaseComplete: {
                            router.handlePurchaseComplete()
                        },
                        onDismiss: {
                            router.handleLifetimeOfferDismissed()
                        }
                    )
                }
                .transition(.opacity)

            case .main:
                MainAppView(environment: environment)
                    .transition(.opacity)
            }
        }
        .appEnvironment(environment)
        .preferredColorScheme(colorScheme)
        .refreshOnThemeChange()
        .fullScreenCover(isPresented: Binding(
            get: { router.shouldShowWebOnboarding },
            set: { _ in }
        )) {
            // PostHog-controlled WebView onboarding
            OnboardingWebView {
                Task { await router.completeWebOnboarding() }
            }
        }
        .fullScreenCover(isPresented: Binding(
            get: { router.shouldShowOnboarding },
            set: { _ in }
        )) {
            // Adapty no-code onboarding — "beforesignup" placement (currently off)
            ZStack {
                Color.black.ignoresSafeArea()
                AdaptyOnboardingView(
                    placementID: "beforesignup",
                    onPurchaseComplete: {
                        router.handlePurchaseComplete()
                    },
                    onDismiss: {
                        Task { await router.completeOnboarding() }
                    }
                )
            }
        }
        .task {
            // Start routing and theme loading
            await loadTheme()
            await router.start()
        }
        .onDisappear {
            router.stop()
        }
        .onChange(of: router.destination) { _, newDestination in
            // Reset to home tab when navigating to main (after login)
            if case .main = newDestination {
                selectedTab = .home
            }
        }
        .onChange(of: themeManager.selected) { _, newTheme in
            applyThemeToDesignSystem(theme)
        }
        .onChange(of: systemColorScheme) { _, newColorScheme in
            // Re-apply theme when system color scheme changes (for "system" theme users)
            applyThemeToDesignSystem(theme)
            AppLogger.debug("System color scheme changed to \(newColorScheme == .dark ? "dark" : "light")", category: AppLogger.ui)
        }
        .onAppear {
            // Ensure theme is applied on first appearance
            applyThemeToDesignSystem(theme)
        }
        .onChange(of: scenePhase) { _, newPhase in
            switch newPhase {
            case .background:
                AppLogger.debug("App entered background — pausing updates", category: AppLogger.ui)
                Analytics.capture(.appBackgrounded)
            case .active:
                AppLogger.debug("App became active — resuming", category: AppLogger.ui)
                Analytics.capture(.appForegrounded)
                // Re-apply theme in case system appearance changed
                applyThemeToDesignSystem(theme)
            case .inactive:
                break
            @unknown default:
                break
            }
        }
    }
    
    // MARK: - Theme Handling
    
    private var colorScheme: ColorScheme? {
        switch theme {
        case .system: return nil
        case .light, .aurora: return .light
        case .dark, .obsidian: return .dark
        }
    }
    
    private func loadTheme() async {
        do {
            let settings = try await environment.settingsRepository.load()
            
            // Map to ThemeManager theme
            let managerTheme: ThemeManager.Theme
            switch settings.theme {
            case .system: managerTheme = .system
            case .light: managerTheme = .light
            case .dark: managerTheme = .dark
            case .aurora: managerTheme = .aurora
            case .obsidian: managerTheme = .obsidian
            }
            
            themeManager.selected = managerTheme
            AppLogger.debug("Theme loaded: \(settings.theme.rawValue)", category: AppLogger.ui)
        } catch {
            // Use default if settings don't exist
            themeManager.selected = .system
            AppLogger.debug("No theme settings, using system default", category: AppLogger.ui)
        }
    }
    
    private func applyThemeToDesignSystem(_ theme: SettingsDTO.Theme) {
        let scheme: ColorScheme
        switch theme {
        case .system:
            // Use the actual system color scheme from environment (reactive)
            scheme = systemColorScheme
        case .light, .aurora:
            scheme = .light
        case .dark, .obsidian:
            scheme = .dark
        }

        DSColors.setTheme(theme.rawValue, colorScheme: scheme)
        AppLogger.debug("Applied theme to design system: \(theme.rawValue), colorScheme: \(scheme == .dark ? "dark" : "light")", category: AppLogger.ui)
    }
}
