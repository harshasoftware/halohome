import Foundation
import SwiftUI
import FeatureSettings
import SwiftData
import Core
import Networking
import CartoStorage
import CartoAuth
import Payments
import FeatureChat
import DesignSystem
import FeatureJournaling
import FeatureBirthData


/// Central dependency injection container
/// Builds and owns all app-wide singletons and factories
@MainActor
@available(iOS 17.0, *)
public final class CompositionRoot {
    
    // MARK: - Singletons
    
    /// SwiftData model container
    public let modelContainer: ModelContainer
    
    /// HTTP client with interceptors
    public let httpClient: HTTPClient
    
    /// Keychain storage
    public let keychainStore: KeychainStore
    
    /// Auth client (SessionManager or MockAuthClient)
    public let sessionManager: AuthClient
    
    /// Payments client
    public let paymentsClient: PaymentsClient
    
    /// LLM client for HaloHome chat feature
    public let llmClient: LLMClient
    
    /// Crash reporter for diagnostics
    public let crashReporter: CrashReporter
    
    // MARK: - Repositories

    public let conversationRepository: ConversationRepository
    public let messageRepository: MessageRepository
    public let settingsRepository: SettingsRepository
    public let favoritesRepository: FavoritesRepository?
    
    /// Profile photo storage client (optional - Supabase or mock)
    public let profilePhotoStorageClient: ProfilePhotoStorageClient?

    // MARK: - Journaling & Location

    /// Location monitor for visit detection and significant location changes
    public let locationMonitor: LocationMonitorProtocol

    /// Journal repository for CRUD operations
    public let journalRepository: JournalRepositoryProtocol

    /// Zone detection service for planetary influence detection
    public let zoneDetectionService: ZoneDetectionProtocol

    // MARK: - Configuration
    
    private let authConfig: AuthConfig
    private let paymentsConfig: PaymentsConfig
    
    /// Proxy base URL for device token uploads and AI requests
    public let proxyBaseURL: URL?
    
    // MARK: - Initialization
    
    /// Initialize composition root with all dependencies
    /// - Parameters:
    ///   - authConfig: Auth configuration
    ///   - paymentsConfig: Payments configuration
    public init(
        authConfig: AuthConfig,
        paymentsConfig: PaymentsConfig
    ) throws {
        self.authConfig = authConfig
        self.paymentsConfig = paymentsConfig
        
        // Extract proxy base URL from AppConfiguration (generated from Config/Secrets.xcconfig)
        if let proxyURL = URL(string: AppConfiguration.PROXY_BASE_URL),
           !AppConfiguration.PROXY_BASE_URL.contains("YOUR") {
            self.proxyBaseURL = proxyURL
        } else {
            self.proxyBaseURL = nil
        }
        
        AppLogger.info("Initializing CompositionRoot", category: AppLogger.ui)
        
        // 1. Storage: SwiftData model container
        let schema = Schema([
            Conversation.self,
            Message.self,
            Settings.self
        ])
        
        let modelConfiguration = ModelConfiguration(
            schema: schema,
            isStoredInMemoryOnly: false
        )
        
        self.modelContainer = try ModelContainer(
            for: schema,
            configurations: [modelConfiguration]
        )
        
        let mainContext = modelContainer.mainContext
        
        // 2. Keychain storage
        self.keychainStore = KeychainStore(
            accessGroup: nil
        )
        
        // 3. HTTP Client with interceptors
        // Use CartoStorage.KeychainTokenProvider which conforms to Networking.TokenProvider
        let tokenProvider = CartoStorage.KeychainTokenProvider(
            keychain: keychainStore,
            tokenKey: KeychainStore.Keys.authAccessToken
        )
        
        let authInterceptor = Networking.AuthInterceptor(tokenProvider: tokenProvider)
        let retryInterceptor = Networking.RetryInterceptor(
            policy: Networking.RetryPolicy(maxAttempts: 3)
        )
        let headersInterceptor = Networking.HeadersInterceptor(
            appVersion: "1.0.0",
            platform: "iOS",
            extraHeaders: [:]
        )
        
        self.httpClient = Networking.URLSessionHTTPClient(
            baseURL: URL(string: "https://api.example.com")!, // TODO: Replace with actual API base URL
            session: .shared,
            defaultHeaders: ["Accept": "application/json"],
            interceptors: [headersInterceptor, authInterceptor, retryInterceptor]
        )
        
        // 4. Repositories (local SwiftData - always created for offline support)
        let localConversationRepo = ConversationRepositoryImpl(modelContext: mainContext)
        let localMessageRepo = MessageRepositoryImpl(modelContext: mainContext)
        self.settingsRepository = SettingsRepositoryImpl(modelContext: mainContext)
        
        // 5. Auth: Supabase SDK-backed auth with Apple + Google + Email
        AppLogger.info("Using real authentication (Supabase SDK + Apple + Google + Email)", category: AppLogger.auth)
        let appleSignInCoordinator = CartoAuth.AppleSignInCoordinator()
        let googleSignInCoordinator = CartoAuth.GoogleSignInCoordinator(clientID: AppConfiguration.GOOGLE_CLIENT_ID)
        self.sessionManager = SupabaseSDKAuthClient(
            supabaseURL: authConfig.supabaseURL,
            supabaseKey: authConfig.supabaseAnonKey,
            apple: appleSignInCoordinator,
            google: googleSignInCoordinator,
            keychain: keychainStore
        )
        
        // 4a. Chat Sync Repositories (hybrid: local + optional remote)
        // Enable by setting FeatureFlags.chatSyncEnabled = true (see docs/CHAT_SYNC_SETUP.md)
        if FeatureFlags.chatSyncEnabled {
            AppLogger.info("Chat sync enabled - using hybrid repositories", category: AppLogger.storage)
            // TODO: Uncomment when Supabase is configured
            // let remoteConversationRepo = SupabaseConversationRepository(
            //     supabaseClient: supabaseClient,
            //     userId: currentUserId
            // )
            // let remoteMessageRepo = SupabaseMessageRepository(
            //     supabaseClient: supabaseClient,
            //     userId: currentUserId
            // )
            // self.conversationRepository = HybridConversationRepository(
            //     local: localConversationRepo,
            //     remote: remoteConversationRepo
            // )
            // self.messageRepository = HybridMessageRepository(
            //     local: localMessageRepo,
            //     remote: remoteMessageRepo
            // )
            
            // For now, use local-only even if flag is enabled
            self.conversationRepository = localConversationRepo
            self.messageRepository = localMessageRepo
        } else {
            AppLogger.info("Chat sync disabled - using local-only repositories", category: AppLogger.storage)
            self.conversationRepository = localConversationRepo
            self.messageRepository = localMessageRepo
        }
        
        // 5a. Profile Photo Storage (optional - requires Supabase setup)
        self.profilePhotoStorageClient = nil  // Disabled until Supabase storage bucket is configured

        // 5b. Favorites Repository (Supabase) - requires auth
        let supabaseHTTPClient = URLSessionHTTPClient(
            baseURL: authConfig.supabaseURL,
            session: .shared,
            defaultHeaders: ["Accept": "application/json"],
            interceptors: []
        )
        let capturedSessionManager = self.sessionManager
        let capturedKeychainStore = self.keychainStore
        let supabaseFavoritesRepo = SupabaseFavoritesRepository(
            httpClient: supabaseHTTPClient,
            supabaseURL: authConfig.supabaseURL,
            supabaseAnonKey: authConfig.supabaseAnonKey,
            accessTokenProvider: {
                try? capturedKeychainStore.getString(KeychainStore.Keys.authAccessToken)
            },
            userIdProvider: {
                await capturedSessionManager.currentUser()?.id
            }
        )
        self.favoritesRepository = HybridFavoritesRepository(
            local: InMemoryFavoritesRepository(userId: "guest"),
            remote: supabaseFavoritesRepo,
            isAuthenticatedProvider: {
                await capturedSessionManager.currentUser() != nil
            }
        )

        // 5c. Journaling: Location monitor, journal repository, zone detection
        self.locationMonitor = LiveLocationMonitorService()

        self.journalRepository = LiveJournalRepository(
            httpClient: supabaseHTTPClient,
            supabaseURL: authConfig.supabaseURL,
            supabaseAnonKey: authConfig.supabaseAnonKey,
            accessTokenProvider: {
                try? capturedKeychainStore.getString(KeychainStore.Keys.authAccessToken)
            },
            userIdProvider: {
                await capturedSessionManager.currentUser()?.id
            }
        )

        self.zoneDetectionService = LiveZoneDetectionService(
            birthDataProvider: {
                // Resolve current birth data from BirthDataStore on main actor
                await MainActor.run {
                    guard let bd = BirthDataStore.shared.currentBirthData else { return nil }
                    let time = bd.time ?? bd.date // Fall back to date if time is nil
                    return (date: bd.date, time: time, latitude: bd.latitude, longitude: bd.longitude)
                }
            }
        )

        // 6. Payments: Adapty
        let adaptyClient = Payments.AdaptyClient()
        adaptyClient.configure(paymentsConfig)
        self.paymentsClient = adaptyClient
        
        // 7. LLM Client: Echo (proxy removed — astro AI uses its own endpoint)
        self.llmClient = EchoLLMClient()
        
        // 8. Crash Reporter: Crashlytics if enabled, otherwise NoOp
        if FeatureFlags.crashlyticsEnabled && Self.checkCrashlyticsAvailable() {
            self.crashReporter = CrashlyticsCrashReporter()
            AppLogger.info("Crashlytics enabled", category: AppLogger.ui)
        } else {
            self.crashReporter = NoOpCrashReporter()
            AppLogger.info("Crash reporting disabled (NoOp)", category: AppLogger.ui)
        }
        
        AppLogger.info("CompositionRoot initialized successfully", category: AppLogger.ui)
        
        #if DEBUG
        _ = DSColors.textPrimary // touch colors to trigger sanity warnings once
        #endif
    }
    
    // MARK: - Factory Methods
    
    /// Create ChatViewModel with injected dependencies
    public func makeChatViewModel(conversationID: UUID) -> ChatViewModel {
        ChatViewModel(
            conversationID: conversationID,
            messageRepository: messageRepository,
            llmClient: llmClient
        )
    }
    
    /// Create DualStyleChatView with UI style switcher
    public func makeDualStyleChatView(
        conversationID: UUID,
        onRequireSubscription: (() -> Void)? = nil
    ) -> DualStyleChatView {
        let viewModel = makeChatViewModel(conversationID: conversationID)
        
        return DualStyleChatView(
            viewModel: viewModel,
            onRequireSubscription: onRequireSubscription
        )
    }
    
    /// Create ChatGPTStyleView with ChatGPT-like UI
    public func makeChatGPTStyleView(
        conversationID: UUID,
        onRequireSubscription: (() -> Void)? = nil
    ) -> ChatGPTStyleView {
        let viewModel = makeChatViewModel(conversationID: conversationID)
        
        return ChatGPTStyleView(
            viewModel: viewModel,
            onRequireSubscription: onRequireSubscription
        )
    }
    
    /// Create SettingsViewModel with injected dependencies
    public func makeSettingsViewModel() -> SettingsViewModel {
        SettingsViewModel(
            settingsRepository: settingsRepository,
            authClient: sessionManager,
            paymentsClient: paymentsClient
        )
    }
    
    /// Create ChatHistoryViewModel with injected dependencies
    public func makeChatHistoryViewModel() -> ChatHistoryViewModel {
        ChatHistoryViewModel(
            conversationRepository: conversationRepository
        ) { [weak self] conversationID, style in
            guard let self = self else { return AnyView(EmptyView()) }
            
            // Create chat view based on selected style
            switch style {
            case .bubbles:
                let viewModel = self.makeChatViewModel(conversationID: conversationID)
                return AnyView(ChatView(viewModel: viewModel, onRequireSubscription: nil))
                
            case .centered:
                let viewModel = self.makeChatViewModel(conversationID: conversationID)
                return AnyView(ChatGPTStyleView(viewModel: viewModel, onRequireSubscription: nil))
            }
        }
    }
    
    /// Create HomeViewModel with injected dependencies
    public func makeHomeViewModel() -> HomeViewModel {
        HomeViewModel(
            conversationRepository: conversationRepository
        )
    }
    
    /// Create JournalViewModel with injected dependencies
    public func makeJournalViewModel() -> JournalViewModel {
        JournalViewModel(
            repository: journalRepository,
            zoneDetection: zoneDetectionService
        )
    }

    /// Create ProfileViewModel with injected dependencies
    public func makeProfileViewModel() -> ProfileViewModel {
        ProfileViewModel(
            authClient: sessionManager,
            paymentsClient: paymentsClient,
            photoStorageClient: profilePhotoStorageClient
        )
    }
    
    /// Update crash reporter based on user settings
    public func updateCrashReporterFromSettings() async {
        do {
            let settings = try await settingsRepository.load()
            crashReporter.setEnabled(settings.shareDiagnostics)
            AppLogger.info("Crash reporter enabled: \(settings.shareDiagnostics)", category: AppLogger.ui)
        } catch {
            AppLogger.error("Failed to load settings for crash reporter: \(error)", category: AppLogger.ui)
        }
    }
    
    /// Check if Firebase Crashlytics is available
    private static func checkCrashlyticsAvailable() -> Bool {
        guard Bundle.main.path(forResource: "GoogleService-Info", ofType: "plist") != nil else {
            return false
        }
        return true
    }
}

// MARK: - Echo LLM Client

/// Simple echo LLM client for the HaloHome chat feature
/// The astro AI chat uses its own CopilotKit endpoint (AstroChatViewModel)
private final class EchoLLMClient: LLMClient {
    func streamResponse(messages: [LLMMessage]) -> AsyncThrowingStream<String, Error> {
        AsyncThrowingStream { continuation in
            Task {
                let lastUserMessage = messages.last(where: { $0.role == "user" })
                let response = "Echo: \(lastUserMessage?.content ?? "Hello!")"

                for char in response {
                    try? await Task.sleep(nanoseconds: 50_000_000)
                    continuation.yield(String(char))
                }

                continuation.finish()
            }
        }
    }
}
