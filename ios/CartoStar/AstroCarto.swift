import SwiftUI
import SceneKit
import UserNotifications
import CartoAuth
import Payments
import Core
import DesignSystem
import GoogleSignIn
import PostHog
import Localization

@main
@available(iOS 17.0, *)
struct HaloHomeApp: App {
    
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @State private var compositionRoot: CompositionRoot?
    @State private var environment: AppEnvironment?
    @State private var initError: Error?
    @State private var layoutDirection: LayoutDirection = LanguageManager.shared.layoutDirection
    
    init() {
        // Register custom fonts
        CinzelFont.registerFonts()

        // Setup theme system
        DSColors.observeThemeChanges()
        ThemeManager.shared.applyTheme()

        // Setup PostHog analytics + session replay
        // Must be called before any views are shown
        let config = PostHogConfig(
            apiKey: AppConfiguration.POSTHOG_API_KEY,
            host: AppConfiguration.POSTHOG_HOST
        )
        config.sessionReplay = FeatureFlags.sessionReplayEnabled
        config.sessionReplayConfig.screenshotMode = true     // required for SwiftUI capture; wireframe mode misses most views
        config.sessionReplayConfig.maskAllTextInputs = true  // masks passwords, birth dates etc.
        config.sessionReplayConfig.maskAllImages = false
        // Mapbox globe (Metal/GPU) is excluded via .accessibilityIdentifier("ph-no-capture") in MainAppView
        PostHogSDK.shared.setup(config)
        // Super-property added to every event — enables cross-platform filtering in PostHog
        PostHogSDK.shared.register(["platform": "ios"])
        // Bridge subscription lifecycle events from the Payments package to PostHog
        PaymentsEventTracker.onEvent = { name, props in
            PostHogSDK.shared.capture(name, properties: props.isEmpty ? nil : props)
        }
        // Bridge purchase revenue events to PostHog + Singular
        PaymentsEventTracker.onRevenue = { currency, amount, productID in
            Analytics.revenue(currency: currency, amount: amount, productID: productID)
        }

        Analytics.capture(.appOpened, properties: [
            "app_version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown",
            "build": Bundle.main.infoDictionary?["CFBundleVersion"] as? String ?? "unknown"
        ])
        ReviewManager.shared.recordLaunch()
    }
    
    var body: some Scene {
        WindowGroup {
            ZStack {
                if let env = environment {
                    AppRootView(environment: env)
                        .environment(ThemeManager.shared)
                        .transition(.opacity)
                } else if let error = initError {
                    ErrorView(error: error)
                        .transition(.opacity)
                } else {
                    // Clean loading state that matches launch screen
                    LaunchScreenStyle()
                        .transition(.opacity)
                }
            }
            .animation(.easeInOut(duration: 0.3), value: environment != nil)
            .environment(\.layoutDirection, layoutDirection)
            .onReceive(NotificationCenter.default.publisher(for: LanguageManager.languageDidChange)) { _ in
                layoutDirection = LanguageManager.shared.layoutDirection
            }
            .task {
                await initialize()
            }
            .onOpenURL { url in
                // Handle Google Sign In callback
                if GIDSignIn.sharedInstance.handle(url) {
                    return
                }
                // Handle internal deep links
                if let deepLink = DeepLink.parse(url) {
                    DeepLinkBus.shared.publish(deepLink)
                }
            }
        }
    }
    
    // MARK: - Initialization
    
    private func initialize() async {
        do {
            AppLogger.info("App starting...", category: AppLogger.ui)
            
            // Load configuration from Config/
            let authConfig = try loadAuthConfig()
            let paymentsConfig = try loadPaymentsConfig()
            
            // Build dependency graph
            let root = try CompositionRoot(
                authConfig: authConfig,
                paymentsConfig: paymentsConfig
            )
            
            compositionRoot = root
            environment = AppEnvironment(compositionRoot: root)
            
            // Set environment in AppDelegate for device token uploads
            appDelegate.setEnvironment(environment!)

            // Initialize ANISE JPL ephemeris (de440s.bsp + chiron.bsp) for accurate Moon/Pluto/Chiron
            CityDataLoader.initializeEphemeris()

            // Initialize city cache for Scout feature (bincode is ~20-50x faster than JSON)
            let cityCount = await CityDataLoader.initializeRustCache()
            AppLogger.info("City cache initialized: \(cityCount) cities", category: AppLogger.ui)

            AppLogger.info("App initialized successfully", category: AppLogger.ui)

            // Start location monitoring for premium users (journal + GPS zone detection)
            let paymentsState = await root.paymentsClient.currentState()
            if paymentsState.isSubscribed {
                root.locationMonitor.startMonitoring()
                AppLogger.info("Location monitoring started for premium user", category: AppLogger.ui)
            }

            // Request notification permissions on first launch
            await requestNotificationPermissionsIfNeeded()
            
        } catch {
            AppLogger.error("App initialization failed: \(error)", category: AppLogger.ui)
            initError = error
        }
    }
    
    // MARK: - Notification Permissions
    
    /**
     * Requests notification permissions if not already granted
     * 
     * This method checks the current authorization status and only requests
     * permissions if the user hasn't been asked before (notDetermined status)
     */
    private func requestNotificationPermissionsIfNeeded() async {
        let center = UNUserNotificationCenter.current()
        let settings = await center.notificationSettings()
        
        // Only request permissions if user hasn't been asked before
        guard settings.authorizationStatus == .notDetermined else {
            AppLogger.info(
                "Notification permissions already determined: \(settings.authorizationStatus.rawValue)",
                category: AppLogger.ui
            )
            return
        }
        
        // Request permissions using NotificationPermissionClient
        let client = DefaultNotificationPermissionClient()
        _ = try? await client.requestAuthorization()
    }
    
    // MARK: - Configuration Loading
    
    private func loadAuthConfig() throws -> AuthConfig {
        // Load from generated AppConfiguration (created at build time from Config/Secrets.xcconfig)
        #if DEBUG
        // In DEBUG with AUTH_BYPASS, still use real Supabase config if available
        // (needed for AI chat, favorites, etc.) — only mock the auth client itself
        if ProcessInfo.processInfo.environment["AUTH_BYPASS"] == "1" {
            if AppConfiguration.isSupabaseReady,
               let url = URL(string: AppConfiguration.SUPABASE_URL) {
                AppLogger.info("DEBUG: AUTH_BYPASS=1, using real Supabase config for network calls", category: AppLogger.auth)
                return AuthConfig(
                    supabaseURL: url,
                    supabaseAnonKey: AppConfiguration.SUPABASE_PUBLISHABLE_KEY
                )
            }
            AppLogger.info("DEBUG: AUTH_BYPASS=1, Supabase not configured — using placeholder", category: AppLogger.auth)
            return AuthConfig(
                supabaseURL: URL(string: "https://placeholder.supabase.co")!,
                supabaseAnonKey: "placeholder-key-for-debug-mode"
            )
        }
        #endif
        
        guard let url = URL(string: AppConfiguration.SUPABASE_URL) else {
            throw AppError.validation(message: "Invalid SUPABASE_URL in Config/Secrets.xcconfig. Please check your configuration.")
        }
        
        guard !AppConfiguration.SUPABASE_PUBLISHABLE_KEY.isEmpty else {
            throw AppError.validation(message: "Missing SUPABASE_PUBLISHABLE_KEY. Add to Config/Secrets.xcconfig")
        }

        AppLogger.info("Loaded auth config from AppConfiguration", category: AppLogger.auth)

        return AuthConfig(
            supabaseURL: url,
            supabaseAnonKey: AppConfiguration.SUPABASE_PUBLISHABLE_KEY
        )
    }
    
    private func loadPaymentsConfig() throws -> PaymentsConfig {
        // Load from generated AppConfiguration (created at build time from Config/Secrets.xcconfig)
        #if DEBUG
        // In DEBUG, if Adapty not configured, use placeholder (mock payments)
        if !AppConfiguration.isAdaptyReady {
            AppLogger.info("DEBUG: Using mock payments (Adapty not configured)", category: AppLogger.payments)
            return PaymentsConfig(
                apiKey: "debug_mode_placeholder_key",
                entitlementID: "premium",
                placementID: "default"
            )
        }
        #endif

        // In release, if Adapty isn't configured, still allow app to run
        // Subscription features will be disabled
        guard AppConfiguration.isAdaptyReady else {
            AppLogger.info("Adapty not configured - subscription features disabled", category: AppLogger.payments)
            return PaymentsConfig(
                apiKey: "not_configured",
                entitlementID: AppConfiguration.ADAPTY_ACCESS_LEVEL_ID,
                placementID: AppConfiguration.ADAPTY_PLACEMENT_ID
            )
        }

        AppLogger.info("Loaded payments config from AppConfiguration", category: AppLogger.payments)

        return PaymentsConfig(
            apiKey: AppConfiguration.ADAPTY_API_KEY,
            entitlementID: AppConfiguration.ADAPTY_ACCESS_LEVEL_ID,
            placementID: AppConfiguration.ADAPTY_PLACEMENT_ID
        )
    }
}

// MARK: - Loading & Error Views

/// Splash screen shown while the app initializes.
@available(iOS 17.0, *)
struct LaunchScreenStyle: View {
    var body: some View {
        GeometryReader { geometry in
            let orrerySize = geometry.size.width * 1.4
            let orreryY = 32 + geometry.size.height * 0.21

            ZStack {
                Color(red: 0.02, green: 0.02, blue: 0.02)
                    .ignoresSafeArea()

                ZStack {
                    Circle()
                        .fill(RadialGradient(
                            colors: [Color.white.opacity(0.04), Color.clear],
                            center: .center,
                            startRadius: 0,
                            endRadius: orrerySize * 0.40
                        ))
                        .frame(width: orrerySize, height: orrerySize)

                    CanvasOrrery()
                        .frame(width: orrerySize, height: orrerySize)
                        .allowsHitTesting(false)
                }
                .frame(width: orrerySize, height: orrerySize)
                .position(x: geometry.size.width / 2, y: orreryY)

                VStack(spacing: 8) {
                    Spacer()
                    Text("HaloHome")
                        .font(.custom("Cinzel-SemiBold", size: 34))
                        .foregroundStyle(Color(white: 0.98))
                    Text("Your Cosmic Map")
                        .font(.system(size: 15, weight: .medium))
                        .foregroundStyle(Color(white: 0.63))
                    ProgressView()
                        .tint(.white.opacity(0.7))
                        .scaleEffect(1.2)
                        .padding(.top, 24)
                    Spacer()
                        .frame(height: 56)
                }
            }
        }
        .preferredColorScheme(.dark)
    }
}

struct ErrorView: View {
    let error: Error
    
    var body: some View {
        ZStack {
            DSColors.background
                .ignoresSafeArea()
            
            VStack(spacing: 20) {
                Image(systemName: "exclamationmark.triangle")
                    .font(.system(size: 60))
                    .foregroundStyle(.red)
                
                Text("Initialization Error")
                    .font(.title)
                    .foregroundStyle(DSColors.textPrimary)
                
                Text(error.localizedDescription)
                    .font(.body)
                    .foregroundStyle(DSColors.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding()
            }
            .padding()
        }
    }
}
