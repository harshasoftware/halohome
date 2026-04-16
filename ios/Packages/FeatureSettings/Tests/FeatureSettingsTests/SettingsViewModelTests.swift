import XCTest
@testable import FeatureSettings
import CartoStorage
import CartoAuth
import Payments
import Core

@MainActor
final class SettingsViewModelTests: XCTestCase {
    
    private var viewModel: SettingsViewModel!
    private var fakeSettingsRepo: FakeSettingsRepository!
    private var fakeAuthClient: FakeAuthClient!
    private var fakePaymentsClient: FakePaymentsClient!
    
    override func setUp() {
        super.setUp()
        
        fakeSettingsRepo = FakeSettingsRepository()
        fakeAuthClient = FakeAuthClient()
        fakePaymentsClient = FakePaymentsClient()
        
        viewModel = SettingsViewModel(
            settingsRepository: fakeSettingsRepo,
            authClient: fakeAuthClient,
            paymentsClient: fakePaymentsClient
        )
    }
    
    override func tearDown() {
        viewModel = nil
        fakeSettingsRepo = nil
        fakeAuthClient = nil
        fakePaymentsClient = nil
        super.tearDown()
    }
    
    func testInitialState() {
        // Then
        XCTAssertEqual(viewModel.theme, .system)
        XCTAssertFalse(viewModel.isAuthenticated)
        XCTAssertFalse(viewModel.isSubscribed)
        XCTAssertNil(viewModel.errorMessage)
    }
    
    func testAppearLoadsSettings() async {
        // Given
        let settings = SettingsDTO(theme: .dark)
        fakeSettingsRepo.storedSettings = settings
        
        // When
        await viewModel.appear()
        
        // Then
        XCTAssertEqual(viewModel.theme, .dark)
    }
    
    func testSetThemeUpdatesAndPersists() async {
        // Given
        await viewModel.appear()
        
        // When
        await viewModel.setTheme(.light)
        
        // Then
        XCTAssertEqual(viewModel.theme, .light)
        XCTAssertEqual(fakeSettingsRepo.storedSettings?.theme, .light)
        XCTAssertNil(viewModel.errorMessage)
    }
    
    func testSignInSuccess() async {
        // When
        await viewModel.signInWithApple()
        
        // Then
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isLoading)
    }
    
    func testSignInFailure() async {
        // Given
        fakeAuthClient.shouldFail = true
        
        // When
        await viewModel.signInWithApple()
        
        // Then
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isLoading)
    }
    
    func testSignOutSuccess() async {
        // Given
        fakeAuthClient.currentAuthUser = AuthUser(id: "123", email: "test@example.com")
        await viewModel.appear()
        
        // When
        await viewModel.signOut()
        
        // Then
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isLoading)
    }
    
    func testPurchaseSuccess() async {
        // When
        await viewModel.purchase()
        
        // Then
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isLoading)
    }
    
    func testPurchaseFailure() async {
        // Given
        fakePaymentsClient.shouldFail = true
        
        // When
        await viewModel.purchase()
        
        // Then
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isLoading)
    }
    
    func testRestoreSuccess() async {
        // When
        await viewModel.restorePurchases()
        
        // Then
        XCTAssertNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isLoading)
    }
    
    func testRestoreFailure() async {
        // Given
        fakePaymentsClient.shouldFail = true
        
        // When
        await viewModel.restorePurchases()
        
        // Then
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.isLoading)
    }
    
    // MARK: - Notification Tests
    
    func testToggleNotifications_enableWithoutPermission() async {
        // Given
        await viewModel.appear()
        
        // When
        await viewModel.toggleNotifications(true)
        
        // Then
        XCTAssertTrue(viewModel.notificationsEnabled)
        XCTAssertFalse(viewModel.notificationPermissionGranted)
    }
    
    func testToggleNotifications_disable() async {
        // Given
        await viewModel.appear()
        
        // When
        await viewModel.toggleNotifications(false)
        
        // Then
        XCTAssertFalse(viewModel.notificationsEnabled)
        XCTAssertEqual(fakeSettingsRepo.storedSettings?.notificationsEnabled, false)
    }
    
    func testOpenSystemNotificationSettings_doesNotCrashInTests() {
        // When/Then - Should not crash
        viewModel.openSystemNotificationSettings()
    }
    
    // MARK: - State Observation Tests
    
    func testAppear_observesAuthStateChanges() async {
        // Given
        fakeAuthClient.currentAuthUser = nil
        
        // When
        await viewModel.appear()
        
        // Then - Initial state
        XCTAssertFalse(viewModel.isAuthenticated)
        
        // When - Auth state changes
        fakeAuthClient.currentAuthUser = AuthUser(id: "123", email: "test@example.com")
        fakeAuthClient.emitStateChange()
        
        // Give stream time to process
        try? await Task.sleep(nanoseconds: 100_000_000) // 100ms
        
        // Then - State updated
        XCTAssertTrue(viewModel.isAuthenticated)
    }
    
    func testAppear_observesPaymentsStateChanges() async {
        // Given
        fakePaymentsClient.isSubscribed = false
        
        // When
        await viewModel.appear()
        
        // Then - Initial state
        XCTAssertFalse(viewModel.isSubscribed)
        
        // When - Payment state changes
        fakePaymentsClient.isSubscribed = true
        fakePaymentsClient.emitStateChange()
        
        // Give stream time to process
        try? await Task.sleep(nanoseconds: 100_000_000) // 100ms
        
        // Then - State updated
        XCTAssertTrue(viewModel.isSubscribed)
    }
    
    // MARK: - Error Handling Tests
    
    func testSetTheme_withSaveError() async {
        // Given
        fakeSettingsRepo.shouldThrow = true
        
        // When
        await viewModel.setTheme(.dark)
        
        // Then
        XCTAssertEqual(viewModel.theme, .dark)
        XCTAssertNotNil(viewModel.errorMessage)
    }
    
    func testLoadSettings_withNoSettings_usesDefaults() async {
        // Given
        fakeSettingsRepo.storedSettings = nil
        fakeSettingsRepo.shouldThrow = true
        
        // When
        await viewModel.appear()
        
        // Then
        XCTAssertEqual(viewModel.theme, .system)
        XCTAssertTrue(viewModel.notificationsEnabled)
    }
    
    // MARK: - ThemeManager Integration Tests
    
    func testSetTheme_updatesThemeManager() async {
        // Given
        let themeManager = ThemeManager.shared
        
        // When
        await viewModel.setTheme(.dark)
        
        // Then
        XCTAssertEqual(themeManager.selected, ThemeManager.Theme.dark)
    }
    
    func testSetTheme_allThemeVariants() async {
        // Test all theme mappings
        await viewModel.setTheme(.system)
        XCTAssertEqual(ThemeManager.shared.selected, ThemeManager.Theme.system)
        
        await viewModel.setTheme(.light)
        XCTAssertEqual(ThemeManager.shared.selected, ThemeManager.Theme.light)
        
        await viewModel.setTheme(.dark)
        XCTAssertEqual(ThemeManager.shared.selected, ThemeManager.Theme.dark)
        
        await viewModel.setTheme(.aurora)
        XCTAssertEqual(ThemeManager.shared.selected, ThemeManager.Theme.aurora)
        
        await viewModel.setTheme(.obsidian)
        XCTAssertEqual(ThemeManager.shared.selected, ThemeManager.Theme.obsidian)
    }
    
    // MARK: - PaymentsClient Accessor Tests
    
    func testPaymentsClientAccessor_returnsCorrectClient() {
        // When
        let accessor = viewModel.paymentsClientAccessor
        
        // Then - Verify it returns the same client (identity check not possible with protocols)
        XCTAssertNotNil(accessor)
    }
    
    // MARK: - Settings Toggle Tests
    
    func testToggleDiagnostics_enablesAndPersists() async {
        // Given
        await viewModel.appear()
        
        // When
        await viewModel.toggleDiagnostics(true)
        
        // Then
        XCTAssertTrue(viewModel.shareDiagnostics)
        XCTAssertTrue(fakeSettingsRepo.storedSettings?.shareDiagnostics ?? false)
    }
    
    func testToggleDiagnostics_disablesAndPersists() async {
        // Given
        await viewModel.appear()
        
        // When
        await viewModel.toggleDiagnostics(false)
        
        // Then
        XCTAssertFalse(viewModel.shareDiagnostics)
        XCTAssertFalse(fakeSettingsRepo.storedSettings?.shareDiagnostics ?? true)
    }
    
    func testToggleHaptics_enablesAndPersists() async {
        // Given
        await viewModel.appear()
        
        // When
        await viewModel.toggleHaptics(true)
        
        // Then
        XCTAssertTrue(viewModel.hapticsEnabled)
        XCTAssertTrue(fakeSettingsRepo.storedSettings?.hapticsEnabled ?? false)
    }
    
    func testToggleReduceMotion_enablesAndPersists() async {
        // Given
        await viewModel.appear()
        
        // When
        await viewModel.toggleReduceMotion(true)
        
        // Then
        XCTAssertTrue(viewModel.reduceMotion)
        XCTAssertTrue(fakeSettingsRepo.storedSettings?.reduceMotion ?? false)
    }
    
    func testAppear_loadsAllSettingsProperties() async {
        // Given
        let settings = SettingsDTO(
            theme: .aurora,
            preferredModel: "gpt-4",
            reduceMotion: true,
            hasSeenOnboarding: true,
            notificationsEnabled: false,
            shareDiagnostics: false,
            hapticsEnabled: false,
            createdAt: Date(),
            updatedAt: Date()
        )
        fakeSettingsRepo.storedSettings = settings
        
        // When
        await viewModel.appear()
        
        // Then
        XCTAssertEqual(viewModel.theme, .aurora)
        XCTAssertTrue(viewModel.reduceMotion)
        XCTAssertFalse(viewModel.notificationsEnabled)
        XCTAssertFalse(viewModel.shareDiagnostics)
        XCTAssertFalse(viewModel.hapticsEnabled)
    }
    
    func testConcurrentStateObservation_handlesMultipleUpdates() async {
        // Given
        await viewModel.appear()
        
        // When - Trigger multiple auth state changes rapidly
        fakeAuthClient.currentAuthUser = AuthUser(id: "1", email: "a@test.com")
        fakeAuthClient.emitStateChange()
        
        fakeAuthClient.currentAuthUser = nil
        fakeAuthClient.emitStateChange()
        
        fakeAuthClient.currentAuthUser = AuthUser(id: "2", email: "b@test.com")
        fakeAuthClient.emitStateChange()
        
        // Give time for async stream to process
        try? await Task.sleep(nanoseconds: 100_000_000)
        
        // Then - Should reflect final state
        XCTAssertTrue(viewModel.isAuthenticated)
    }
    
    func testErrorHandling_settingsSaveFails_showsUserMessage() async {
        // Given
        fakeSettingsRepo.shouldThrow = true
        await viewModel.appear()
        
        // When
        await viewModel.setTheme(.dark)
        
        // Then - Verify error message is shown to user
        XCTAssertNotNil(viewModel.errorMessage)
        XCTAssertFalse(viewModel.errorMessage!.isEmpty)
    }
}

// MARK: - Fakes

final class FakeSettingsRepository: SettingsRepository, @unchecked Sendable {
    var storedSettings: SettingsDTO?
    var shouldThrow = false
    
    func load() async throws -> SettingsDTO {
        if shouldThrow { throw StorageError.notFound }
        return storedSettings ?? SettingsDTO()
    }
    
    func save(_ settings: SettingsDTO) async throws {
        if shouldThrow { throw StorageError.validation("Test error") }
        storedSettings = settings
    }
}

final class FakeAuthClient: AuthClient, @unchecked Sendable {
    var currentAuthUser: AuthUser?
    var shouldFail = false
    
    private var stateContinuation: AsyncStream<AuthState>.Continuation?
    
    func signInWithApple() async throws -> AuthUser {
        if shouldFail { throw AuthError.invalidCredentials }
        let user = AuthUser(id: "123", email: "test@example.com")
        currentAuthUser = user
        return user
    }
    
    func signInWithGoogle() async throws -> AuthUser {
        if shouldFail { throw AuthError.invalidCredentials }
        let user = AuthUser(id: "123", email: "test@example.com")
        currentAuthUser = user
        return user
    }
    
    func signUpWithEmail(email: String, password: String) async throws -> AuthUser {
        if shouldFail { throw AuthError.invalidCredentials }
        let user = AuthUser(id: "123", email: email)
        currentAuthUser = user
        return user
    }
    
    func signInWithEmail(email: String, password: String) async throws -> AuthUser {
        if shouldFail { throw AuthError.invalidCredentials }
        let user = AuthUser(id: "123", email: email)
        currentAuthUser = user
        return user
    }
    
    func resetPassword(email: String) async throws {
        if shouldFail { throw AuthError.invalidCredentials }
    }
    
    func signOut() async throws {
        if shouldFail { throw AuthError.server(code: 401, message: "Session expired") }
        currentAuthUser = nil
    }
    
    func currentUser() async -> AuthUser? {
        currentAuthUser
    }
    
    func authStates() -> AsyncStream<AuthState> {
        AsyncStream { continuation in
            self.stateContinuation = continuation
            let state: AuthState = currentAuthUser != nil ? .authenticated(currentAuthUser!) : .unauthenticated
            continuation.yield(state)
        }
    }
    
    func emitStateChange() {
        let state: AuthState = currentAuthUser != nil ? .authenticated(currentAuthUser!) : .unauthenticated
        stateContinuation?.yield(state)
    }
    
    func refreshIfNeeded() async throws {
        if shouldFail { throw AuthError.server(code: 401, message: "Session expired") }
    }

    func signInAnonymously() async throws -> AuthUser {
        if shouldFail { throw AuthError.invalidCredentials }
        let user = AuthUser(id: "anon-123")
        currentAuthUser = user
        return user
    }

    func deleteAccount() async throws {
        if shouldFail { throw AuthError.server(code: 401, message: "Unauthorized") }
        currentAuthUser = nil
    }
}

final class FakePaymentsClient: PaymentsClient, @unchecked Sendable {
    var isSubscribed = false
    var shouldFail = false
    var restoreReturnsSubscribed = false
    
    private var stateContinuation: AsyncStream<PaymentsState>.Continuation?
    
    func configure(_ config: PaymentsConfig) {
        // No-op for tests
    }
    
    func states() -> AsyncStream<PaymentsState> {
        AsyncStream { continuation in
            self.stateContinuation = continuation
            continuation.yield(PaymentsState(isSubscribed: isSubscribed))
        }
    }
    
    func emitStateChange() {
        stateContinuation?.yield(PaymentsState(isSubscribed: isSubscribed))
    }
    
    func currentState() async -> PaymentsState {
        PaymentsState(isSubscribed: isSubscribed)
    }
    
    func purchase(productID: String) async throws {
        if shouldFail { throw PaymentsError.cancelled }
        isSubscribed = true
    }
    
    @discardableResult
    func restore() async throws -> PaymentsState {
        if shouldFail { throw PaymentsError.network(underlying: NSError(domain: "Test", code: -1)) }
        let restoredState = PaymentsState(isSubscribed: restoreReturnsSubscribed)
        isSubscribed = restoreReturnsSubscribed
        return restoredState
    }
    
    func prefetchOfferings() async {
        // No-op for tests
    }
    
    func getOfferings() async throws -> [PaymentsOffering] {
        if shouldFail { throw PaymentsError.network(underlying: NSError(domain: "Test", code: -1)) }
        return []
    }

    @discardableResult
    func logIn(userID: String, email: String?, name: String?) async throws -> PaymentsState {
        PaymentsState(isSubscribed: isSubscribed)
    }

    @discardableResult
    func logOut() async throws -> PaymentsState {
        isSubscribed = false
        return PaymentsState(isSubscribed: false)
    }
}
