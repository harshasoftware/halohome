import SwiftUI
import DesignSystem
import CartoStorage
import CartoAuth
import Payments
import Core
import Localization

/// Settings screen with theme, notifications, and preferences
/// Presented as a sheet from the Profile tab
public struct SettingsView: View {

    @Environment(\.dismiss) private var dismiss
    @State private var viewModel: SettingsViewModel
    @AppStorage(MapStyleTheme.storageKey) private var mapStyleRaw: String = MapStyleTheme.cosmic.rawValue
    @State private var selectedLanguage: LanguageManager.AppLanguage = LanguageManager.shared.current
    @State private var showPaywall = false
    @State private var showTerms = false
    @State private var showPrivacy = false
    @State private var showSubscriptionTerms = false
    @State private var showEULA = false

    let onShowMemoryManagement: (() -> Void)?
    let onConsult: (() -> Void)?
    let onShowScoutPipeline: (() -> Void)?
    let onShowProPaywall: (() -> Void)?
    let onSignIn: (() -> Void)?

    public init(
        viewModel: SettingsViewModel,
        onShowMemoryManagement: (() -> Void)? = nil,
        onConsult: (() -> Void)? = nil,
        onShowScoutPipeline: (() -> Void)? = nil,
        onShowProPaywall: (() -> Void)? = nil,
        onSignIn: (() -> Void)? = nil
    ) {
        self.viewModel = viewModel
        self.onShowMemoryManagement = onShowMemoryManagement
        self.onConsult = onConsult
        self.onShowScoutPipeline = onShowScoutPipeline
        self.onShowProPaywall = onShowProPaywall
        self.onSignIn = onSignIn
    }
    
    public var body: some View {
        NavigationStack {
            ZStack {
                DSColors.background.ignoresSafeArea()
                
                Form {
                    // Error Banner (at top)
                    if let error = viewModel.errorMessage {
                        Section {
                            EmptyView()
                        } header: {
                            HStack(spacing: DSSpacing.md) {
                                Image(systemName: "exclamationmark.triangle.fill")
                                    .foregroundStyle(.red)
                                Text(error)
                                    .font(DSTypography.caption)
                                    .foregroundStyle(.red)
                                    .multilineTextAlignment(.leading)
                            }
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(DSSpacing.md)
                            .background(
                                RoundedRectangle(cornerRadius: DSSpacing.md)
                                    .fill(Color.red.opacity(0.12))
                            )
                            .accessibilityLabel("Error")
                            .accessibilityAddTraits(.updatesFrequently)
                            .animation(.easeInOut, value: viewModel.errorMessage)
                        }
                    }
                    
                    // Appearance Section - Compact dropdowns
                    Section {
                        // App Theme Picker
                        Picker(selection: Binding(
                            get: { viewModel.theme },
                            set: { newTheme in
                                Task { await viewModel.setTheme(newTheme) }
                            }
                        )) {
                            ForEach(SettingsDTO.Theme.allCases, id: \.self) { theme in
                                Label {
                                    HStack {
                                        Text(theme.displayName)
                                        if theme.isPremium {
                                            Text("PRO")
                                                .font(.system(size: 9, weight: .bold))
                                                .foregroundStyle(.white)
                                                .padding(.horizontal, 4)
                                                .padding(.vertical, 1)
                                                .background(DSGradient.primaryLinear)
                                                .clipShape(Capsule())
                                        }
                                    }
                                } icon: {
                                    Image(systemName: theme.symbolName)
                                }
                                .tag(theme)
                            }
                        } label: {
                            Label("App Theme", systemImage: "paintbrush.fill")
                        }
                        .pickerStyle(.menu)

                        // Map Style Picker
                        Picker(selection: Binding(
                            get: { MapStyleTheme(rawValue: mapStyleRaw) ?? .cosmic },
                            set: { newStyle in
                                mapStyleRaw = newStyle.rawValue
                                Haptics.tap()
                            }
                        )) {
                            ForEach(MapStyleCategory.allCases, id: \.rawValue) { category in
                                Section(category.rawValue) {
                                    ForEach(MapStyleTheme.allCases.filter { $0.category == category }) { theme in
                                        Label(theme.displayName, systemImage: theme.icon)
                                            .tag(theme)
                                    }
                                }
                            }
                        } label: {
                            Label("Map Style", systemImage: "map.fill")
                        }
                        .pickerStyle(.menu)
                        // Language Picker
                        Picker(selection: $selectedLanguage) {
                            ForEach(LanguageManager.AppLanguage.allCases) { lang in
                                Text(lang.displayName).tag(lang)
                            }
                        } label: {
                            Label(L10n.Settings.language, systemImage: "globe")
                        }
                        .pickerStyle(.menu)
                        .onChange(of: selectedLanguage) { _, newLang in
                            LanguageManager.shared.setLanguage(newLang)
                            Haptics.tap()
                        }
                    } header: {
                        Text("Appearance")
                    } footer: {
                        Text(L10n.Settings.languageFooter)
                            .font(DSTypography.caption)
                            .foregroundStyle(DSColors.textSecondary)
                    }

                    // Account Section (sign-in for guests)
                    if viewModel.isGuest {
                        Section {
                            Button {
                                onSignIn?()
                                dismiss()
                            } label: {
                                HStack(spacing: DSSpacing.sm) {
                                    Image(systemName: "person.crop.circle.badge.plus")
                                        .foregroundStyle(Color.acAmber500)
                                    Text("Sign In or Create Account")
                                        .foregroundStyle(Color.acAmber500)
                                }
                            }
                        } header: {
                            Text("Account")
                        } footer: {
                            Text("Sign in to save your data across devices and unlock all features.")
                        }
                    }

                    // Subscription Section
                    Section {
                        if viewModel.isSubscribed {
                            HStack {
                                Image(systemName: "star.fill")
                                    .foregroundStyle(.yellow)
                                Text("Pro Subscriber")
                                Spacer()
                                Text("Active")
                                    .font(DSTypography.caption)
                                    .foregroundStyle(.green)
                            }
                        } else {
                            Button {
                                if let onShowProPaywall {
                                    dismiss()
                                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                                        onShowProPaywall()
                                    }
                                } else {
                                    showPaywall = true
                                }
                            } label: {
                                HStack(spacing: DSSpacing.sm) {
                                    Image(systemName: "star.fill")
                                        .foregroundStyle(Color.acAmber500)
                                    Text("Go Pro")
                                        .foregroundStyle(Color.acAmber500)
                                        .fontWeight(.semibold)
                                }
                            }
                            .disabled(viewModel.isLoading)
                        }
                        
                        // Restore Purchases - REQUIRED by App Store Guideline 3.1.1
                        // Secondary location (primary is in Profile view)
                        Button {
                            Task {
                                await viewModel.restorePurchases()
                            }
                        } label: {
                            HStack(spacing: DSSpacing.sm) {
                                Image(systemName: "arrow.clockwise")
                                    .foregroundStyle(DSColors.accentPrimary)
                                Text("Restore Purchases")
                                    .foregroundStyle(DSColors.accentPrimary)
                                Spacer()
                                if viewModel.isLoading {
                                    ProgressView()
                                        .scaleEffect(0.8)
                                }
                            }
                        }
                        .disabled(viewModel.isLoading)
                        .accessibilityIdentifier("settingsRestorePurchasesButton")
                    } header: {
                        Text("Subscription")
                    } footer: {
                        Text("Restore purchases if you've subscribed on another device or reinstalled the app.")
                            .font(DSTypography.caption)
                            .foregroundStyle(DSColors.textSecondary)
                    }

                    // Consultation Section
                    if let consultAction = onConsult {
                        Section {
                            Button {
                                consultAction()
                            } label: {
                                HStack {
                                    Image(systemName: "person.fill.questionmark")
                                        .foregroundStyle(DSColors.accentSecondary)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Book a Consultation")
                                            .foregroundStyle(DSColors.textPrimary)
                                        Text("Talk to a real astrologer")
                                            .font(DSTypography.caption)
                                            .foregroundStyle(DSColors.textSecondary)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.caption)
                                        .foregroundStyle(DSColors.textSecondary)
                                }
                            }
                            .buttonStyle(.plain)
                        } header: {
                            Text("Consultation")
                        } footer: {
                            Text("Schedule a live video session with a professional astrologer for personalized guidance.")
                                .font(DSTypography.caption)
                                .foregroundStyle(DSColors.textSecondary)
                        }
                    }

                    // AI Section
                    if let showMemory = onShowMemoryManagement {
                        Section {
                            Button {
                                showMemory()
                            } label: {
                                HStack {
                                    Image(systemName: "brain")
                                        .foregroundStyle(DSColors.accentPrimary)
                                    Text("AI Memories")
                                        .foregroundStyle(DSColors.textPrimary)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.caption)
                                        .foregroundStyle(DSColors.textSecondary)
                                }
                            }
                            .buttonStyle(.plain)
                        } header: {
                            Text("AI")
                        } footer: {
                            Text("View and manage facts the AI has learned about you from conversations.")
                                .font(DSTypography.caption)
                                .foregroundStyle(DSColors.textSecondary)
                        }
                    }
                    
                    // Scout Pipeline Section
                    if let showPipeline = onShowScoutPipeline {
                        Section {
                            Button {
                                showPipeline()
                            } label: {
                                HStack {
                                    Image(systemName: "slider.horizontal.3")
                                        .foregroundStyle(DSColors.accentPrimary)
                                    VStack(alignment: .leading, spacing: 2) {
                                        Text("Scoring Pipeline")
                                            .foregroundStyle(DSColors.textPrimary)
                                        Text("Toggle scoring modules for Scout")
                                            .font(DSTypography.caption)
                                            .foregroundStyle(DSColors.textSecondary)
                                    }
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.caption)
                                        .foregroundStyle(DSColors.textSecondary)
                                }
                            }
                            .buttonStyle(.plain)
                        } header: {
                            Text("Scout")
                        } footer: {
                            Text("Enable modules like Essential Dignity and House Rulership to personalize city scoring based on your natal chart.")
                                .font(DSTypography.caption)
                                .foregroundStyle(DSColors.textSecondary)
                        }
                    }

                    // Notifications Section
                    Section("Notifications") {
                        Toggle("Enable Notifications", isOn: Binding(
                            get: { viewModel.notificationsEnabled },
                            set: { newValue in
                                Task {
                                    await viewModel.toggleNotifications(newValue)
                                }
                            }
                        ))
                        .tint(DSColors.primary)
                        
                        if !viewModel.notificationPermissionGranted && viewModel.notificationsEnabled {
                            Button {
                                viewModel.openSystemNotificationSettings()
                            } label: {
                                HStack {
                                    Image(systemName: "exclamationmark.triangle")
                                        .foregroundStyle(.orange)
                                    Text("Grant Permission in Settings")
                                        .foregroundStyle(DSColors.textPrimary)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.caption)
                                        .foregroundStyle(DSColors.textSecondary)
                                }
                            }
                        }
                    }
                    
                    // Accessibility Section
                    Section {
                        Toggle("Reduce Motion", isOn: Binding(
                            get: { viewModel.reduceMotion },
                            set: { newValue in
                                Task {
                                    await viewModel.toggleReduceMotion(newValue)
                                }
                            }
                        ))
                        .tint(DSColors.primary)
                        
                        Toggle("Haptic Feedback", isOn: Binding(
                            get: { viewModel.hapticsEnabled },
                            set: { newValue in
                                Task {
                                    await viewModel.toggleHaptics(newValue)
                                }
                            }
                        ))
                        .tint(DSColors.primary)
                    } header: {
                        Text("Accessibility & Feel")
                    } footer: {
                        Text("Reduce animations and control haptic feedback for a more comfortable experience.")
                            .font(DSTypography.caption)
                            .foregroundStyle(DSColors.textSecondary)
                    }
                    
                    // Privacy & Diagnostics Section
                    Section {
                        Toggle("Share Diagnostics", isOn: Binding(
                            get: { viewModel.shareDiagnostics },
                            set: { newValue in
                                Task {
                                    await viewModel.toggleDiagnostics(newValue)
                                }
                            }
                        ))
                        .tint(DSColors.primary)
                    } header: {
                        Text("Privacy & Diagnostics")
                    } footer: {
                        Text("Help improve the app by sharing crash reports and usage statistics. No personal information is collected.")
                            .font(DSTypography.caption)
                            .foregroundStyle(DSColors.textSecondary)
                    }
                    
                    // Legal Section
                    Section("Legal") {
                        Button {
                            showPrivacy = true
                        } label: {
                            Label("Privacy Policy", systemImage: "hand.raised")
                        }
                        
                        Button {
                            showTerms = true
                        } label: {
                            Label("Terms of Service", systemImage: "doc.text")
                        }
                        
                        Button {
                            showSubscriptionTerms = true
                        } label: {
                            Label("Subscription Terms", systemImage: "creditcard")
                        }

                        Button {
                            showEULA = true
                        } label: {
                            Label("End User License Agreement", systemImage: "doc.badge.gearshape")
                        }
                    }
                    
                    // About Section
                    Section {
                        HStack {
                            Text("Version")
                            Spacer()
                            Text(Bundle.main.appVersion)
                                .foregroundStyle(DSColors.textSecondary)
                        }

                        HStack {
                            Text("Build")
                            Spacer()
                            Text(Bundle.main.buildNumber)
                                .foregroundStyle(DSColors.textSecondary)
                        }
                    } header: {
                        Text("About")
                    }

                    // Account Actions Section (for authenticated users)
                    if !viewModel.isGuest {
                        Section {
                            Button(role: .destructive) {
                                Task {
                                    await viewModel.signOut()
                                    dismiss()
                                }
                            } label: {
                                HStack {
                                    Image(systemName: "rectangle.portrait.and.arrow.right")
                                    Text("Sign Out")
                                }
                            }
                            .disabled(viewModel.isLoading)

                            Button(role: .destructive) {
                                viewModel.showDeleteConfirmation = true
                            } label: {
                                HStack {
                                    Image(systemName: "trash")
                                    Text("Delete Account")
                                }
                                .foregroundStyle(.red)
                            }
                            .disabled(viewModel.isLoading)
                        } header: {
                            Text("Account")
                        } footer: {
                            Text("Deleting your account will permanently remove all your data and cannot be undone.")
                                .font(DSTypography.caption)
                                .foregroundStyle(DSColors.textSecondary)
                        }
                        .confirmationDialog(
                            "Delete Account",
                            isPresented: $viewModel.showDeleteConfirmation,
                            titleVisibility: .visible
                        ) {
                            Button("Delete Account", role: .destructive) {
                                Task {
                                    await viewModel.deleteAccount()
                                    dismiss()
                                }
                            }
                            Button("Cancel", role: .cancel) {}
                        } message: {
                            Text("This will permanently delete your account and all associated data. This action cannot be undone.")
                        }
                    }

                    #if DEBUG
                    // Debug Section (Development only)
                    Section("Debug (Development)") {
                        Button {
                            Task {
                                await LocalNotificationTester.diagnostics()
                            }
                        } label: {
                            Label("Run Notification Diagnostics", systemImage: "stethoscope")
                        }
                        
                        if ProcessInfo.processInfo.environment["ENABLE_TEST_CRASH"] == "true" {
                            Button {
                                // WARNING: This will crash the app for testing!
                                fatalError("Test crash triggered from Settings")
                            } label: {
                                Label("Trigger Test Crash", systemImage: "exclamationmark.octagon")
                                    .foregroundStyle(.red)
                            }
                        }
                        
                        Button {
                            Task {
                                await LocalNotificationTester.scheduleTest()
                            }
                        } label: {
                            Label("Send Test Notification", systemImage: "bell.badge")
                        }
                        
                        Button {
                            Task {
                                await LocalNotificationTester.quickTest()
                            }
                        } label: {
                            Label("Quick Test (with permission)", systemImage: "bell.badge.fill")
                        }
                    }
                    .foregroundStyle(.secondary)
                    #endif
                }
                .scrollContentBackground(.hidden)
                .navigationTitle("Settings")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .confirmationAction) {
                        Button("Done") {
                            dismiss()
                        }
                        .fontWeight(.semibold)
                    }
                }
                .task {
                    await viewModel.appear()
                }
                
                // Loading Overlay
                if viewModel.isLoading {
                    Color.black.opacity(0.2)
                        .ignoresSafeArea()
                        .overlay {
                            ProgressView()
                                .scaleEffect(1.2)
                                .padding(DSSpacing.xl)
                                .background(
                                    RoundedRectangle(cornerRadius: DSSpacing.lg)
                                        .fill(.regularMaterial)
                                )
                        }
                }
            }
            .sheet(isPresented: $showPaywall) {
                PaywallView(paymentsClient: viewModel.paymentsClientAccessor) {
                    showPaywall = false
                }
            }
            .sheet(isPresented: $showTerms) {
                LegalDocumentView.terms()
            }
            .sheet(isPresented: $showPrivacy) {
                LegalDocumentView.privacy()
            }
            .sheet(isPresented: $showSubscriptionTerms) {
                LegalDocumentView.subscriptionTerms()
            }
            .sheet(isPresented: $showEULA) {
                LegalDocumentView.eula()
            }
        }
        .refreshOnThemeChange()
        .toastContainer()
    }
}

// MARK: - Theme Display Name

extension SettingsDTO.Theme {
    var displayName: String {
        switch self {
        case .system: return "System"
        case .light: return "Light"
        case .dark: return "Dark"
        case .aurora: return "Aurora"
        case .obsidian: return "Obsidian"
        }
    }
    
    var description: String {
        switch self {
        case .system: return "Follows system"
        case .light: return "Always light"
        case .dark: return "Always dark"
        case .aurora: return "Premium light theme"
        case .obsidian: return "Premium dark theme"
        }
    }
    
    var symbolName: String {
        switch self {
        case .system: return "circle.lefthalf.filled"
        case .light: return "sun.max.fill"
        case .dark: return "moon.fill"
        case .aurora: return "sparkles"
        case .obsidian: return "moon.stars.fill"
        }
    }
    
    var isPremium: Bool {
        self == .aurora || self == .obsidian
    }
}


// MARK: - Bundle Extension

extension Bundle {
    var appVersion: String {
        infoDictionary?["CFBundleShortVersionString"] as? String ?? "1.0.0"
    }
    
    var buildNumber: String {
        infoDictionary?["CFBundleVersion"] as? String ?? "1"
    }
}

#if DEBUG
// MARK: - Preview Helpers

@MainActor
private func createPreviewViewModel() -> SettingsViewModel {
    SettingsViewModel(
        settingsRepository: MockSettingsRepository(),
        authClient: MockAuthClient(),
        paymentsClient: MockPaymentsClient()
    )
}

private final class MockSettingsRepository: SettingsRepository, @unchecked Sendable {
    func load() async throws -> SettingsDTO { SettingsDTO(theme: .system) }
    func save(_ settings: SettingsDTO) async throws {}
}

private final class MockAuthClient: AuthClient, @unchecked Sendable {
    func signInWithGoogle() async throws -> CartoAuth.AuthUser {
        //No need to implement
        return CartoAuth.AuthUser(id: "MockID")
    }
    
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
    
    func signInAnonymously() async throws -> AuthUser { AuthUser(id: "preview") }
    func signInWithApple() async throws -> AuthUser { AuthUser(id: "preview", email: "preview@example.com") }
    func signOut() async throws {}
    func currentUser() async -> AuthUser? { nil }
    func authStates() -> AsyncStream<AuthState> { AsyncStream { $0.yield(.unauthenticated) } }
    func refreshIfNeeded() async throws {}
    func deleteAccount() async throws {}
}

private final class MockPaymentsClient: PaymentsClient, @unchecked Sendable {
    func configure(_ config: PaymentsConfig) {}
    func states() -> AsyncStream<Payments.PaymentsState> { 
        AsyncStream { $0.yield(Payments.PaymentsState(isSubscribed: false)) } 
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
    func getOfferings() async throws -> [PaymentsOffering] { [] }

    @discardableResult
    func logIn(userID: String, email: String?, name: String?) async throws -> Payments.PaymentsState {
        Payments.PaymentsState(isSubscribed: false)
    }

    @discardableResult
    func logOut() async throws -> Payments.PaymentsState {
        Payments.PaymentsState(isSubscribed: false)
    }
}

// MARK: - Previews

#Preview("Default") {
    NavigationStack {
        SettingsView(viewModel: createPreviewViewModel())
    }
}

#Preview("Pro User") {
    let vm = createPreviewViewModel()
    vm.isSubscribed = true
    return NavigationStack {
        SettingsView(viewModel: vm)
    }
}

#Preview("Error") {
    let vm = createPreviewViewModel()
    vm.errorMessage = "Something went wrong"
    vm.isLoading = false
    return NavigationStack {
        SettingsView(viewModel: vm)
    }
}
#endif
