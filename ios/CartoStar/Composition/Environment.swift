import SwiftUI
import Core
import CartoAuth
import Payments
import CartoStorage
import FeatureChat
import FeatureGlobe
import FeatureJournaling

/// App-wide environment exposing dependencies to SwiftUI views
@MainActor
@available(iOS 17.0, *)
public struct AppEnvironment {
    
    /// Auth client for authentication flows
    public let authClient: AuthClient
    
    /// Payments client for subscription management
    public let paymentsClient: PaymentsClient
    
    /// Conversation repository
    public let conversationRepository: ConversationRepository
    
    /// Message repository
    public let messageRepository: MessageRepository
    
    /// Settings repository
    public let settingsRepository: SettingsRepository
    
    /// LLM client for AI interactions
    public let llmClient: LLMClient
    
    /// Composition root for creating view models
    public let compositionRoot: CompositionRoot

    /// Proxy base URL for device token uploads
    public let proxyBaseURL: URL?

    /// Location monitor for visit detection and zone changes
    public let locationMonitor: LocationMonitorProtocol

    /// Journal repository for CRUD operations
    public let journalRepository: JournalRepositoryProtocol

    /// Zone detection service for planetary influence detection
    public let zoneDetectionService: ZoneDetectionProtocol

    /// Initialize environment from composition root
    public init(compositionRoot: CompositionRoot) {
        self.compositionRoot = compositionRoot
        self.authClient = compositionRoot.sessionManager
        self.paymentsClient = compositionRoot.paymentsClient
        self.conversationRepository = compositionRoot.conversationRepository
        self.messageRepository = compositionRoot.messageRepository
        self.settingsRepository = compositionRoot.settingsRepository
        self.llmClient = compositionRoot.llmClient
        self.proxyBaseURL = compositionRoot.proxyBaseURL
        self.locationMonitor = compositionRoot.locationMonitor
        self.journalRepository = compositionRoot.journalRepository
        self.zoneDetectionService = compositionRoot.zoneDetectionService
    }

    // MARK: - Factory Methods

    /// Create a JournalViewModel with injected dependencies
    public func makeJournalViewModel() -> JournalViewModel {
        compositionRoot.makeJournalViewModel()
    }

    /// Create a FavoritesViewModel with repository from composition root
    public func makeFavoritesViewModel() -> FavoritesViewModel {
        if let favoritesRepo = compositionRoot.favoritesRepository {
            let adapter = LiveFavoritesRepository(repository: favoritesRepo)
            return FavoritesViewModel(repository: adapter)
        } else {
            // No Supabase configured - return empty view model
            return FavoritesViewModel(repository: nil)
        }
    }
}

// MARK: - SwiftUI Environment Key

private struct AppEnvironmentKey: EnvironmentKey {
    static let defaultValue: AppEnvironment? = nil
}

extension EnvironmentValues {
    /// Access app environment from SwiftUI views
    public var appEnv: AppEnvironment? {
        get { self[AppEnvironmentKey.self] }
        set { self[AppEnvironmentKey.self] = newValue }
    }
}

// MARK: - View Extension

extension View {
    /// Inject app environment into view hierarchy
    public func appEnvironment(_ environment: AppEnvironment) -> some View {
        self.environment(\.appEnv, environment)
    }
}
