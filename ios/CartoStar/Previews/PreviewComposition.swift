#if DEBUG
import Foundation
import SwiftUI
import FeatureChat
import FeatureSettings
import CartoAuth
import CartoStorage

/// Composition helpers for SwiftUI previews
@MainActor
enum PreviewComposition {
    
    /// Create ChatViewModel with preview mocks
    static func chatVM() -> ChatViewModel {
        ChatViewModel(
            conversationID: UUID(),
            messageRepository: PreviewMocks.MockMessageRepository(),
            llmClient: PreviewMocks.MockLLMClient()
        )
    }
    
    /// Create ChatHistoryViewModel with preview mocks
    @available(iOS 17.0, *)
    static func chatHistoryVM() -> ChatHistoryViewModel {
        ChatHistoryViewModel(
            conversationRepository: PreviewMocks.MockConversationRepository()
        ) { conversationID, style in
            let vm = chatVM()
            // Return appropriate view based on style
            switch style {
            case .bubbles:
                return AnyView(ChatView(viewModel: vm, onRequireSubscription: nil))
            case .centered:
                return AnyView(ChatGPTStyleView(viewModel: vm, onRequireSubscription: nil))
            }
        }
    }
    
    /// Create SettingsViewModel with preview mocks
    static func settingsVM() -> SettingsViewModel {
        SettingsViewModel(
            settingsRepository: PreviewMocks.MockSettingsRepository(),
            authClient: PreviewMocks.MockAuthClient(),
            paymentsClient: PreviewMocks.MockPaymentsClient()
        )
    }
    
    /// Create mock AuthClient for previews
    static func mockAuthClient() -> AuthClient {
        PreviewMocks.MockAuthClient()
    }
}
#endif


