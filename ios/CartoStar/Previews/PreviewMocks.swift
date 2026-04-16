#if DEBUG
import Foundation
import CartoStorage
import CartoAuth
import Payments
import FeatureChat

/// Minimal mocks for SwiftUI previews
/// These conform to public protocols and return static/empty data
enum PreviewMocks {
    
    // MARK: - Storage Mocks
    
    final class MockMessageRepository: MessageRepository, @unchecked Sendable {
        func append(conversationID: UUID, role: MessageDTO.Role, text: String, createdAt: Date) async throws -> MessageDTO {
            MessageDTO(id: UUID(), role: role, text: text, createdAt: createdAt, conversationID: conversationID)
        }
        
        func page(conversationID: UUID, after: MessageCursor?, limit: Int) async throws -> (items: [MessageDTO], next: MessageCursor?) {
            (items: [], next: nil)
        }
        
        func deleteAll(in conversationID: UUID) async throws {}
        func batchDelete(messageIDs: [UUID]) async throws {}
    }
    
    final class MockSettingsRepository: SettingsRepository, @unchecked Sendable {
        func load() async throws -> SettingsDTO {
            SettingsDTO(theme: .system)
        }
        
        func save(_ settings: SettingsDTO) async throws {}
    }
    
    final class MockConversationRepository: ConversationRepository, @unchecked Sendable {
        func create(title: String, personaName: String?) async throws -> ConversationDTO {
            ConversationDTO(
                id: UUID(),
                title: title,
                createdAt: Date(),
                updatedAt: Date(),
                personaName: personaName
            )
        }
        
        func rename(id: UUID, title: String) async throws {}
        
        func delete(id: UUID) async throws {}
        
        func list(limit: Int, after: Date?) async throws -> [ConversationDTO] {
            [
                ConversationDTO(
                    id: UUID(),
                    title: "Preview Chat 1",
                    createdAt: Date().addingTimeInterval(-3600),
                    updatedAt: Date().addingTimeInterval(-1800),
                    personaName: nil
                ),
                ConversationDTO(
                    id: UUID(),
                    title: "Preview Chat 2",
                    createdAt: Date().addingTimeInterval(-7200),
                    updatedAt: Date().addingTimeInterval(-3600),
                    personaName: "AI Assistant"
                )
            ]
        }
    }
    
    // MARK: - Auth Mock
    
    final class MockAuthClient: AuthClient, @unchecked Sendable {
        func signUpWithEmail(email: String, password: String) async throws -> CartoAuth.AuthUser {
            //No need to implement
            return CartoAuth.AuthUser(id: "MockID")
        }

        func signInWithEmail(email: String, password: String) async throws -> CartoAuth.AuthUser {
            //No need to implement
            return CartoAuth.AuthUser(id: "MockID")
        }

        func resetPassword(email: String) async throws {
            //No need to implement
        }

        func signInAnonymously() async throws -> AuthUser { AuthUser(id: "preview-guest") }
        func signInWithApple() async throws -> AuthUser { AuthUser(id: "preview", email: "preview@example.com") }
        func signInWithGoogle() async throws -> AuthUser { AuthUser(id: "preview-google", email: "preview@google.com") }
        func signOut() async throws {}
        func deleteAccount() async throws {}
        func currentUser() async -> AuthUser? { nil }
        func authStates() -> AsyncStream<AuthState> { AsyncStream { $0.yield(.unauthenticated) } }
        func refreshIfNeeded() async throws {}
    }
    
    /// Mock auth client that fails - useful for testing error states
    final class FailingMockAuthClient: AuthClient, @unchecked Sendable {
        func signUpWithEmail(email: String, password: String) async throws -> CartoAuth.AuthUser {
            //No need to implement
            return CartoAuth.AuthUser(id: "MockID")
        }
        
        func signInWithEmail(email: String, password: String) async throws -> CartoAuth.AuthUser {
            //No need to implement
            return CartoAuth.AuthUser(id: "MockID")
        }
        
        func resetPassword(email: String) async throws {
            //No need to implement
        }
        
        func signInAnonymously() async throws -> AuthUser {
            try await Task.sleep(nanoseconds: 1_000_000_000)
            throw AuthError.network(underlying: NSError(domain: "PreviewError", code: 1001, userInfo: [NSLocalizedDescriptionKey: "Unable to continue as guest."]))
        }
        func signInWithApple() async throws -> AuthUser {
            try await Task.sleep(nanoseconds: 1_000_000_000)
            throw AuthError.network(underlying: NSError(domain: "PreviewError", code: 1001, userInfo: [NSLocalizedDescriptionKey: "Unable to sign in. Please check your internet connection and try again."]))
        }
        func signInWithGoogle() async throws -> AuthUser {
            try await Task.sleep(nanoseconds: 1_000_000_000)
            throw AuthError.network(underlying: NSError(domain: "PreviewError", code: 1001, userInfo: [NSLocalizedDescriptionKey: "Unable to sign in with Google. Please check your internet connection and try again."]))
        }
        func signOut() async throws {}
        func deleteAccount() async throws {}
        func currentUser() async -> AuthUser? { nil }
        func authStates() -> AsyncStream<AuthState> { AsyncStream { $0.yield(.unauthenticated) } }
        func refreshIfNeeded() async throws {}
    }

    // MARK: - Payments Mock
    
    final class MockPaymentsClient: PaymentsClient, @unchecked Sendable {
        func configure(_ config: PaymentsConfig) {}
        
        func states() -> AsyncStream<Payments.PaymentsState> {
            AsyncStream { continuation in
                continuation.yield(Payments.PaymentsState(isSubscribed: false))
            }
        }
        
        func currentState() async -> Payments.PaymentsState {
            Payments.PaymentsState(isSubscribed: false)
        }
        
        func purchase(productID: String) async throws {}
        
        @discardableResult
        func restore() async throws -> Payments.PaymentsState {
            return Payments.PaymentsState(isSubscribed: false)
        }
        
        func prefetchOfferings() async {}
        
        func getOfferings() async throws -> [PaymentsOffering] {
            [
                PaymentsOffering(
                    id: "com.halohome.pro.monthly",
                    title: "Monthly",
                    price: "$12.99",
                    pricePerMonth: nil,
                    packageType: .monthly
                ),
                PaymentsOffering(
                    id: "com.halohome.pro.annual",
                    title: "Annual",
                    price: "$99.99",
                    pricePerMonth: "$8.33",
                    packageType: .annual
                ),
                PaymentsOffering(
                    id: "com.halohome.lifetime",
                    title: "Lifetime",
                    price: "$149.99",
                    pricePerMonth: nil,
                    packageType: .lifetime
                )
            ]
        }

        @discardableResult
        func logIn(userID: String, email: String?, name: String?) async throws -> Payments.PaymentsState {
            Payments.PaymentsState(isSubscribed: false)
        }

        @discardableResult
        func logOut() async throws -> Payments.PaymentsState {
            Payments.PaymentsState(isSubscribed: false)
        }
    }
    
    // MARK: - LLM Mock
    
    final class MockLLMClient: LLMClient, @unchecked Sendable {
        func streamResponse(messages: [LLMMessage]) -> AsyncThrowingStream<String, Error> {
            AsyncThrowingStream { continuation in
                continuation.yield("Preview response")
                continuation.finish()
            }
        }
    }
    
    // MARK: - Convenience Static Accessors
    
    static var messageRepository: MessageRepository {
        MockMessageRepository()
    }
    
    static var conversationRepository: ConversationRepository {
        MockConversationRepository()
    }
    
    static var settingsRepository: SettingsRepository {
        MockSettingsRepository()
    }
    
    static var authClient: AuthClient {
        MockAuthClient()
    }
    
    static var paymentsClient: PaymentsClient {
        MockPaymentsClient()
    }
    
    static var llmClient: LLMClient {
        MockLLMClient()
    }
}
#endif

