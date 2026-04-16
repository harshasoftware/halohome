import SwiftUI
import PhotosUI
import DesignSystem
import Core
import Payments
import FeatureSettings

/// Profile screen with user information and account management
/// Now serves as the main tab with Settings accessible as a sub-view
struct ProfileView: View {
    
    @State private var viewModel: ProfileViewModel
    @State private var settingsViewModel: SettingsViewModel
    @State private var showSettings = false
    
    let onShowPaywall: () -> Void
    let onShowSettings: () -> Void
    let onSignIn: () -> Void

    /// Whether the current user is a guest (anonymous, no email)
    private var isGuest: Bool {
        guard let user = viewModel.user else { return true }
        return user.email == nil || user.email?.isEmpty == true
    }

    init(
        viewModel: ProfileViewModel,
        settingsViewModel: SettingsViewModel,
        onShowPaywall: @escaping () -> Void,
        onShowSettings: @escaping () -> Void = {},
        onSignIn: @escaping () -> Void = {}
    ) {
        self.viewModel = viewModel
        self.settingsViewModel = settingsViewModel
        self.onShowPaywall = onShowPaywall
        self.onShowSettings = onShowSettings
        self.onSignIn = onSignIn
    }
    
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: DSSpacing.xl) {
                    // Profile Header
                    profileHeader
                    
                    // Guest sign-in prompt
                    if isGuest {
                        guestSignInBanner
                    }

                    // Account Info Section
                    accountInfoSection
                    
                    // Subscription Status
                    if let subscription = viewModel.subscriptionStatus {
                        subscriptionSection(subscription)
                    }
                    
                    // Quick Actions
                    quickActionsSection
                    
                    // Danger Zone
                    dangerZoneSection
                    
                    // App Info
                    appInfoSection
                }
                .padding(.vertical, DSSpacing.lg)
            }
            .background(DSColors.background)
            .safeAreaInset(edge: .bottom) {
                Color.clear.frame(height: 88)
            }
            .navigationTitle("Profile")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        showSettings = true
                    } label: {
                        Image(systemName: "gearshape")
                            .foregroundStyle(DSColors.textPrimary)
                    }
                }
            }
            .task {
                await viewModel.loadProfile()
            }
            .alert("Error", isPresented: Binding(
                get: { viewModel.errorMessage != nil },
                set: { if !$0 { viewModel.errorMessage = nil } }
            )) {
                Button("OK", role: .cancel) {
                    viewModel.errorMessage = nil
                }
            } message: {
                Text(viewModel.errorMessage ?? "")
            }
            .alert("Success", isPresented: Binding(
                get: { viewModel.successMessage != nil },
                set: { if !$0 { viewModel.successMessage = nil } }
            )) {
                Button("OK", role: .cancel) {
                    viewModel.successMessage = nil
                }
            } message: {
                Text(viewModel.successMessage ?? "")
            }
            .alert("Sign Out", isPresented: $viewModel.showSignOutConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("Sign Out", role: .destructive) {
                    Task {
                        await viewModel.signOut()
                    }
                }
            } message: {
                Text("Are you sure you want to sign out?")
            }
            .alert("Delete Account", isPresented: $viewModel.showDeleteAccountConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("Delete", role: .destructive) {
                    Task {
                        await viewModel.deleteAccount()
                    }
                }
            } message: {
                Text("This action cannot be undone. All your data will be permanently deleted.")
            }
            .sheet(isPresented: $viewModel.showEditProfile) {
                editProfileSheet
            }
            .sheet(isPresented: $showSettings) {
                SettingsView(viewModel: settingsViewModel)
            }
        }
    }
    
    // MARK: - Edit Profile Sheet
    
    @FocusState private var isNameFieldFocused: Bool
    
    private var editProfileSheet: some View {
        NavigationStack {
            ZStack {
                DSColors.background.ignoresSafeArea()
                
                ScrollView {
                    VStack(spacing: DSSpacing.xl) {
                        // Avatar Section
                        VStack(spacing: DSSpacing.md) {
                            // Preview selected photo or current avatar
                            ZStack {
                                if let imageData = viewModel.profileImageData,
                                   let uiImage = UIImage(data: imageData) {
                                    Image(uiImage: uiImage)
                                        .resizable()
                                        .scaledToFill()
                                        .frame(width: 80, height: 80)
                                        .clipShape(Circle())
                                        .overlay(
                                            Circle()
                                                .strokeBorder(DSColors.accentPrimary, lineWidth: 2)
                                        )
                                } else {
                                    SAIAvatar(
                                        name: viewModel.editingName.isEmpty ? "?" : viewModel.editingName,
                                        size: .xl,
                                        showsOnlineIndicator: false
                                    )
                                }
                                
                                // Loading overlay
                                if viewModel.isLoadingPhoto {
                                    ZStack {
                                        Circle()
                                            .fill(Color.black.opacity(0.5))
                                        
                                        ProgressView()
                                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                                    }
                                    .frame(width: 80, height: 80)
                                }
                            }
                            
                            // Photo Actions
                            let hasPhoto = viewModel.profileImageData != nil
                            VStack(spacing: DSSpacing.sm) {
                                // Choose/Change Photo Button
                                PhotosPicker(
                                    selection: $viewModel.selectedPhoto,
                                    matching: .images,
                                    photoLibrary: .shared()
                                ) {
                                    HStack(spacing: DSSpacing.sm) {
                                        Image(systemName: "photo")
                                            .font(.system(size: 14, weight: .medium))
                                        Text(hasPhoto ? "Change Photo" : "Choose Photo")
                                            .font(DSTypography.body)
                                            .fontWeight(.medium)
                                    }
                                    .foregroundStyle(DSColors.accentPrimary)
                                    .padding(.horizontal, DSSpacing.md)
                                    .padding(.vertical, DSSpacing.sm)
                                    .background(
                                        RoundedRectangle(cornerRadius: DSRadius.md)
                                            .strokeBorder(DSColors.accentPrimary, lineWidth: 1.5)
                                    )
                                }
                                .buttonStyle(.plain)
                                .disabled(viewModel.isLoadingPhoto)
                                
                                // Remove Photo Button (only show if photo exists)
                                if hasPhoto {
                                    Button {
                                        viewModel.removePhoto()
                                    } label: {
                                        HStack(spacing: DSSpacing.sm) {
                                            Image(systemName: "trash")
                                                .font(.system(size: 14, weight: .medium))
                                            Text("Remove Photo")
                                                .font(DSTypography.body)
                                                .fontWeight(.medium)
                                        }
                                        .foregroundStyle(.red)
                                        .padding(.horizontal, DSSpacing.md)
                                        .padding(.vertical, DSSpacing.sm)
                                        .background(
                                            RoundedRectangle(cornerRadius: DSRadius.md)
                                                .strokeBorder(Color.red.opacity(0.5), lineWidth: 1.5)
                                        )
                                    }
                                    .buttonStyle(.plain)
                                }
                                
                                // Helper text
                                Text("Photos are compressed automatically. Use your Photos app to crop before selecting.")
                                    .font(DSTypography.caption)
                                    .foregroundStyle(DSColors.textSecondary)
                                    .multilineTextAlignment(.center)
                            }
                        }
                        .padding(.top, DSSpacing.xl)
                        
                        // Name Input Card
                        VStack(alignment: .leading, spacing: DSSpacing.md) {
                            Text("Display Name")
                                .font(DSTypography.titleM)
                                .fontWeight(.semibold)
                                .foregroundStyle(DSColors.textPrimary)
                            
                            TextField("Enter your name", text: $viewModel.editingName)
                                .font(DSTypography.body)
                                .foregroundStyle(DSColors.textPrimary)
                                .textContentType(.name)
                                .autocorrectionDisabled()
                                .padding(DSSpacing.md)
                                .background(DSColors.surface)
                                .clipShape(.rect(cornerRadius: DSRadius.md))
                                .overlay(
                                    RoundedRectangle(cornerRadius: DSRadius.md)
                                        .strokeBorder(
                                            isNameFieldFocused ? DSColors.accentPrimary.opacity(0.5) : DSColors.borderHairline,
                                            lineWidth: isNameFieldFocused ? 2 : 1
                                        )
                                )
                                .focused($isNameFieldFocused)
                            
                            Text("Your display name is visible to you only.")
                                .font(DSTypography.caption)
                                .foregroundStyle(DSColors.textSecondary)
                        }
                        .padding(.horizontal, DSSpacing.lg)
                        
                        // Email Display (Read-only)
                        if let email = viewModel.user?.email {
                            VStack(alignment: .leading, spacing: DSSpacing.md) {
                                Text("Email")
                                    .font(DSTypography.titleM)
                                    .fontWeight(.semibold)
                                    .foregroundStyle(DSColors.textPrimary)
                                
                                HStack {
                                    Text(email)
                                        .font(DSTypography.body)
                                        .foregroundStyle(DSColors.textSecondary)
                                    
                                    Spacer()
                                    
                                    Image(systemName: "lock.fill")
                                        .font(.caption)
                                        .foregroundStyle(DSColors.textSecondary.opacity(0.5))
                                }
                                .padding(DSSpacing.md)
                                .background(DSColors.surface.opacity(0.5))
                                .clipShape(.rect(cornerRadius: DSRadius.md))
                                .overlay(
                                    RoundedRectangle(cornerRadius: DSRadius.md)
                                        .strokeBorder(DSColors.borderHairline, lineWidth: 1)
                                )
                                
                                Text("Email cannot be changed after account creation.")
                                    .font(DSTypography.caption)
                                    .foregroundStyle(DSColors.textSecondary)
                            }
                            .padding(.horizontal, DSSpacing.lg)
                        }
                    }
                    .padding(.bottom, DSSpacing.xl)
                }
                .contentShape(Rectangle())
                .onTapGesture {
                    isNameFieldFocused = false
                }
            }
            .navigationTitle("Edit Profile")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        viewModel.cancelEditing()
                    }
                    .foregroundStyle(DSColors.textSecondary)
                }
                
                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            await viewModel.saveProfile()
                        }
                    }
                    .fontWeight(.semibold)
                    .foregroundStyle(viewModel.canSave ? DSColors.accentPrimary : DSColors.textSecondary)
                    .disabled(!viewModel.canSave || viewModel.isLoading)
                }
            }
            .onChange(of: viewModel.selectedPhoto) { _, _ in
                Task {
                    await viewModel.loadPhoto()
                }
            }
        }
    }
    
    // MARK: - Profile Header
    
    private var profileHeader: some View {
        Button {
            viewModel.startEditingProfile()
        } label: {
            VStack(spacing: DSSpacing.md) {
                // Avatar with custom photo or gradient initials
                Group {
                    if let imageData = viewModel.profileImageData,
                       let uiImage = UIImage(data: imageData) {
                        Image(uiImage: uiImage)
                            .resizable()
                            .scaledToFill()
                            .frame(width: 100, height: 100)
                            .clipShape(Circle())
                    } else {
                        SAIAvatar(
                            name: viewModel.user?.name ?? "User",
                            size: .xl,
                            showsOnlineIndicator: true
                        )
                        .scaleEffect(1.25)
                    }
                }
                .overlay(alignment: .bottomTrailing) {
                    ZStack {
                        Circle()
                            .fill(DSColors.primary)
                            .frame(width: 32, height: 32)
                        
                        Image(systemName: "pencil")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(DSColors.background)
                    }
                    .offset(x: 4, y: 4)
                }
                
                // Name
                if let name = viewModel.user?.name {
                    Text(name)
                        .font(DSTypography.titleL)
                        .fontWeight(.bold)
                        .foregroundStyle(DSColors.textPrimary)
                }
                
                // Email
                if let email = viewModel.user?.email {
                    Text(email)
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textSecondary)
                }
                
                // Edit hint
                Text("Tap to edit profile")
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.primary)
            }
            .frame(maxWidth: .infinity)
            .padding(.horizontal, DSSpacing.lg)
        }
        .buttonStyle(.plain)
    }
    
    // MARK: - Account Info Section
    
    // MARK: - Guest Sign-In Banner

    private var guestSignInBanner: some View {
        VStack(spacing: DSSpacing.md) {
            HStack(spacing: DSSpacing.md) {
                Image(systemName: "person.crop.circle.badge.exclamationmark")
                    .font(.title2)
                    .foregroundStyle(Color.acAmber500)

                VStack(alignment: .leading, spacing: 4) {
                    Text("You\u{2019}re using a guest account")
                        .font(DSTypography.body)
                        .fontWeight(.semibold)
                        .foregroundStyle(DSColors.textPrimary)

                    Text("Sign in with Apple, Google, or Email to save your data and unlock all features.")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                        .lineLimit(3)
                }
                Spacer()
            }

            Button {
                onSignIn()
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "arrow.right.circle.fill")
                    Text("Sign In or Create Account")
                        .fontWeight(.semibold)
                }
                .font(.system(size: 15))
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 44)
                .background(Color.acAmber500)
                .clipShape(RoundedRectangle(cornerRadius: DSRadius.md))
            }
        }
        .padding(DSSpacing.lg)
        .background(
            RoundedRectangle(cornerRadius: DSRadius.md)
                .fill(Color.acAmber500.opacity(0.08))
                .overlay(
                    RoundedRectangle(cornerRadius: DSRadius.md)
                        .stroke(Color.acAmber500.opacity(0.3), lineWidth: 1)
                )
        )
        .padding(.horizontal, DSSpacing.lg)
    }

    // MARK: - Account Info

    private var accountInfoSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            DSSectionHeader(title: "Account")
            
            VStack(spacing: 0) {
                // User ID
                HStack {
                    Image(systemName: "person.text.rectangle")
                        .font(.title3)
                        .foregroundStyle(DSColors.primary)
                        .frame(width: 24)
                    
                    Text("User ID")
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textPrimary)
                    
                    Spacer()
                    
                    Text(String(viewModel.user?.id.prefix(8) ?? "—") + "...")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                }
                .padding(DSSpacing.lg)
                
                Divider()
                    .padding(.leading, 56)
                
                // Account type
                HStack {
                    Image(systemName: viewModel.subscriptionStatus?.isActive == true ? "star.fill" : "person.fill")
                        .font(.title3)
                        .foregroundStyle(viewModel.subscriptionStatus?.isActive == true ? .yellow : DSColors.primary)
                        .frame(width: 24)
                    
                    Text("Account Type")
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textPrimary)
                    
                    Spacer()
                    
                    Text(viewModel.subscriptionStatus?.isActive == true ? "Pro" : "Free")
                        .font(DSTypography.body)
                        .fontWeight(.semibold)
                        .foregroundStyle(viewModel.subscriptionStatus?.isActive == true ? DSColors.primary : DSColors.textSecondary)
                }
                .padding(DSSpacing.lg)
            }
            .background(DSColors.surface)
            .clipShape(.rect(cornerRadius: DSRadius.md))
            .padding(.horizontal, DSSpacing.lg)
        }
    }
    
    // MARK: - Subscription Section
    
    private func subscriptionSection(_ subscription: ProfileViewModel.SubscriptionInfo) -> some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            DSSectionHeader(title: "Subscription")
            
            VStack(spacing: DSSpacing.md) {
                SubscriptionStatusCard(
                    subscription: subscription,
                    onManageTap: {
                        if subscription.isActive {
                            // Open App Store subscription management
                            SubscriptionManager.openManageSubscriptions()
                        } else {
                            // Show paywall to upgrade
                            onShowPaywall()
                        }
                    }
                )
                
                // Restore Purchases - REQUIRED by App Store Guideline 3.1.1
                // Must be accessible WITHOUT opening a paywall
                restorePurchasesRow
                    .background(DSColors.surface)
                    .clipShape(.rect(cornerRadius: DSRadius.md))
            }
            .padding(.horizontal, DSSpacing.lg)
        }
    }
    
    // MARK: - Quick Actions Section
    
    private var quickActionsSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            DSSectionHeader(title: "Quick Actions")
            
            VStack(spacing: 0) {
                // Settings
                SAIListRow(
                    title: "Settings",
                    leading: Image(systemName: "gearshape")
                ) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundStyle(DSColors.textSecondary)
                }
                .onTap {
                    showSettings = true
                }
                
                Divider()
                    .padding(.leading, 56)
                
                // Help & Support
                SAIListRow(
                    title: "Help & Support",
                    leading: Image(systemName: "questionmark.circle")
                ) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundStyle(DSColors.textSecondary)
                }
                .onTap {
                    AppLogger.info("Help tapped", category: AppLogger.ui)
                }
                
                Divider()
                    .padding(.leading, 56)
                
                // Privacy Policy
                SAIListRow(
                    title: "Privacy Policy",
                    leading: Image(systemName: "hand.raised")
                ) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundStyle(DSColors.textSecondary)
                }
                .onTap {
                    AppLogger.info("Privacy tapped", category: AppLogger.ui)
                }
                
                Divider()
                    .padding(.leading, 56)
                
                // Terms of Service
                SAIListRow(
                    title: "Terms of Service",
                    leading: Image(systemName: "doc.text")
                ) {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundStyle(DSColors.textSecondary)
                }
                .onTap {
                    AppLogger.info("Terms tapped", category: AppLogger.ui)
                }
            }
            .background(DSColors.surface)
            .clipShape(.rect(cornerRadius: DSRadius.md))
            .padding(.horizontal, DSSpacing.lg)
        }
    }
    
    // MARK: - Restore Purchases Row
    // App Store Guideline 3.1.1 Compliance:
    // - Distinct, easily identifiable button
    // - Accessible WITHOUT opening a paywall
    // - User-initiated only (NOT called automatically)
    
    private var restorePurchasesRow: some View {
        Button {
            Task {
                await viewModel.restorePurchases()
            }
        } label: {
            HStack(spacing: DSSpacing.md) {
                // Icon
                ZStack {
                    if viewModel.isRestoringPurchases {
                        ProgressView()
                            .frame(width: 24, height: 24)
                    } else {
                        Image(systemName: "arrow.triangle.2.circlepath")
                            .font(.system(size: 20, weight: .semibold))
                            .foregroundStyle(DSColors.accentPrimary)
                            .frame(width: 24)
                    }
                }
                
                // Title and subtitle
                VStack(alignment: .leading, spacing: 2) {
                    Text(viewModel.isRestoringPurchases ? "Restoring..." : "Restore Purchases")
                        .font(DSTypography.body)
                        .fontWeight(.medium)
                        .foregroundStyle(viewModel.isRestoringPurchases ? DSColors.textSecondary : DSColors.textPrimary)
                    
                    Text("Restore previously purchased subscriptions")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                }
                
                Spacer()
                
                // Chevron (hidden when loading)
                if !viewModel.isRestoringPurchases {
                    Image(systemName: "chevron.right")
                        .font(.system(size: 14))
                        .foregroundStyle(DSColors.textSecondary)
                }
            }
            .padding(DSSpacing.lg)
        }
        .buttonStyle(.plain)
        .disabled(viewModel.isRestoringPurchases)
        .accessibilityIdentifier("restorePurchasesButton")
        .accessibilityLabel("Restore Purchases")
        .accessibilityHint("Restores previously purchased subscriptions")
    }
    
    // MARK: - Danger Zone
    
    private var dangerZoneSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            DSSectionHeader(title: "Danger Zone", subtitle: "Be careful — irreversible actions.")
            
            VStack(spacing: 0) {
                dangerActionRow(
                    title: "Sign Out",
                    icon: "rectangle.portrait.and.arrow.right",
                    action: {
                        viewModel.showSignOutConfirmation = true
                    }
                )
                
                Divider()
                    .padding(.leading, 56)
                
                dangerActionRow(
                    title: "Delete Account",
                    icon: "trash",
                    action: {
                        viewModel.showDeleteAccountConfirmation = true
                    }
                )
            }
            .background(DSColors.surface)
            .clipShape(.rect(cornerRadius: DSRadius.md))
            .padding(.horizontal, DSSpacing.lg)
        }
    }
    
    private func dangerActionRow(title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: DSSpacing.md) {
                Image(systemName: icon)
                    .font(.title3)
                    .foregroundStyle(.red)
                    .frame(width: 24)
                
                Text(title)
                    .font(.body)
                    .foregroundStyle(.red)
                
                Spacer()
            }
            .padding(DSSpacing.lg)
        }
        .buttonStyle(.plain)
    }
    
    // MARK: - App Info Section
    
    private var appInfoSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            DSSectionHeader(title: "About")
            
            VStack(spacing: 0) {
                HStack {
                    Text("Version")
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textPrimary)
                    
                    Spacer()
                    
                    Text(Bundle.main.appVersion)
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textSecondary)
                }
                .padding(DSSpacing.lg)
                
                Divider()
                    .padding(.leading, DSSpacing.lg)
                
                HStack {
                    Text("Build")
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textPrimary)
                    
                    Spacer()
                    
                    Text(Bundle.main.buildNumber)
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textSecondary)
                }
                .padding(DSSpacing.lg)
            }
            .background(DSColors.surface)
            .clipShape(.rect(cornerRadius: DSRadius.md))
            .padding(.horizontal, DSSpacing.lg)
        }
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

// MARK: - Preview

#if DEBUG
#Preview {
    if #available(iOS 17.0, *) {
        let viewModel = ProfileViewModel(
            authClient: PreviewMocks.MockAuthClient(),
            paymentsClient: PreviewMocks.MockPaymentsClient()
        )
        
        return ProfileView(
            viewModel: viewModel,
            settingsViewModel: PreviewComposition.settingsVM(),
            onShowPaywall: {
                print("Show paywall tapped")
            }
        )
    } else {
        return Text("iOS 17+ required")
    }
}
#endif
