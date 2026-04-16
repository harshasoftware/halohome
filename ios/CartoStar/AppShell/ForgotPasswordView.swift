import SwiftUI
import MapKit
import CartoAuth
import Core
import DesignSystem

/// Password reset request screen with Liquid Glass UI and subtle globe background
@available(iOS 17.0, *)
struct ForgotPasswordView: View {

    // MARK: - Properties

    @State private var viewModel: ForgotPasswordViewModel
    @FocusState private var isEmailFocused: Bool

    // Animation states
    @State private var showBackground = false
    @State private var showHeader = false
    @State private var showCard = false
    @State private var showFooter = false

    // Globe state for background
    @State private var mapPosition: MapCameraPosition = .automatic

    // MARK: - Initialization

    init(authClient: AuthClient, onBackToLogin: @escaping () -> Void) {
        self.viewModel = ForgotPasswordViewModel(
            authClient: authClient,
            onBackToLogin: onBackToLogin
        )
    }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ZStack {
                // 3D Globe background
                globeBackground
                    .ignoresSafeArea()

                ScrollView {
                    VStack(spacing: 0) {
                        Spacer()
                            .frame(height: 40)

                        // Header
                        headerSection
                            .padding(.bottom, 32)

                        // Glass card with form or success
                        if viewModel.isSuccess {
                            successCard
                                .padding(.horizontal, 24)
                        } else {
                            formCard
                                .padding(.horizontal, 24)
                        }

                        Spacer()
                            .frame(height: 24)

                        // Back to login
                        backToLoginSection
                    }
                    .padding(.bottom, 40)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        viewModel.backToLogin()
                    }
                    .foregroundStyle(Color.acGlassTextSecondary)
                }
            }
            .disabled(viewModel.isLoading)
            .contentShape(Rectangle())
            .onTapGesture {
                isEmailFocused = false
            }
            .onAppear {
                startEntranceAnimation()
            }
        }
    }

    // MARK: - Entrance Animation

    private func startEntranceAnimation() {
        withAnimation(.easeOut(duration: 0.6)) {
            showBackground = true
        }
        withAnimation(ACSpring.smooth.delay(0.2)) {
            showHeader = true
        }
        withAnimation(ACSpring.smooth.delay(0.35)) {
            showCard = true
        }
        withAnimation(ACSpring.gentle.delay(0.5)) {
            showFooter = true
        }
    }

    // MARK: - Globe Background

    private var globeBackground: some View {
        ZStack {
            // Dark base for space effect
            Color.black

            // MapKit 3D Globe
            Map(position: $mapPosition) {}
                .mapStyle(.imagery(elevation: .realistic))
                .mapControlVisibility(.hidden)
                .allowsHitTesting(false)
                .scaleEffect(showBackground ? 1.15 : 0.9)
                .opacity(showBackground ? 1 : 0)
                .onAppear {
                    mapPosition = .camera(MapCamera(
                        centerCoordinate: CLLocationCoordinate2D(latitude: 50, longitude: 10),
                        distance: 30_000_000,
                        heading: 0,
                        pitch: 0
                    ))
                }

            // Top vignette for header readability
            LinearGradient(
                colors: [
                    Color.black.opacity(0.85),
                    Color.black.opacity(0.4),
                    Color.clear
                ],
                startPoint: .top,
                endPoint: .center
            )

            // Bottom vignette for form card
            LinearGradient(
                colors: [
                    Color.clear,
                    Color.black.opacity(0.5),
                    Color.black.opacity(0.9)
                ],
                startPoint: .center,
                endPoint: .bottom
            )

            // Ambient cosmic glow
            RadialGradient(
                colors: [
                    Color.acAccent.opacity(0.1),
                    Color.clear
                ],
                center: .topLeading,
                startRadius: 0,
                endRadius: 350
            )

            RadialGradient(
                colors: [
                    Color.acCosmicPurple.opacity(0.08),
                    Color.clear
                ],
                center: .bottomTrailing,
                startRadius: 0,
                endRadius: 300
            )
        }
    }

    // MARK: - Subviews

    private var headerSection: some View {
        VStack(spacing: 12) {
            // Icon with glass effect
            ZStack {
                Circle()
                    .fill(.ultraThinMaterial)
                    .frame(width: 80, height: 80)

                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color.acAccent.opacity(0.3),
                                Color.clear
                            ],
                            center: .center,
                            startRadius: 0,
                            endRadius: 40
                        )
                    )
                    .frame(width: 70, height: 70)

                Image(systemName: "lock.rotation")
                    .font(.system(size: 32, weight: .medium))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color.acAccent.opacity(0.8), Color.acAccent],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
            }
            .shadow(color: Color.acAccent.opacity(0.3), radius: 20)
            .opacity(showHeader ? 1 : 0)
            .scaleEffect(showHeader ? 1 : 0.8)

            Text("Forgot Password?")
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(Color.white)
                .opacity(showHeader ? 1 : 0)
                .offset(y: showHeader ? 0 : 10)

            Text("Enter your email to receive reset instructions")
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(Color.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .opacity(showHeader ? 1 : 0)
                .offset(y: showHeader ? 0 : 10)
        }
    }

    private var formCard: some View {
        VStack(spacing: 20) {
            // Error display
            if let errorMessage = viewModel.errorMessage {
                errorBanner(errorMessage)
            }

            // Email field
            glassTextField

            // Send button
            sendButton
        }
        .padding(24)
        .acLiquidGlass(cornerRadius: ACRadius.glassSheet)
        .shadow(color: Color.black.opacity(0.3), radius: 30, y: 15)
        .opacity(showCard ? 1 : 0)
        .offset(y: showCard ? 0 : 30)
    }

    private var glassTextField: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Email")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Color.white)

            TextField("your@email.com", text: $viewModel.email)
                .font(.system(size: 16))
                .foregroundStyle(Color.black)
                .textContentType(.emailAddress)
                .keyboardType(.emailAddress)
                .autocapitalization(.none)
                .autocorrectionDisabled()
                .focused($isEmailFocused)
                .submitLabel(.send)
                .onSubmit {
                    Task { await viewModel.sendResetLink() }
                }
                .padding(16)
                .background(Color.white)
                .clipShape(RoundedRectangle(cornerRadius: ACRadius.glassInput, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: ACRadius.glassInput)
                        .strokeBorder(
                            viewModel.emailError != nil ? Color.red : Color.clear,
                            lineWidth: 2
                        )
                )

            if let error = viewModel.emailError {
                Text(error)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.red)
            }
        }
    }

    private var sendButton: some View {
        Button {
            Task { await viewModel.sendResetLink() }
        } label: {
            HStack(spacing: 10) {
                if viewModel.isLoading {
                    ProgressView()
                        .tint(.black)
                        .scaleEffect(0.9)
                }
                Text(viewModel.isLoading ? "Sending..." : "Send Reset Link")
                    .font(.system(size: 17, weight: .semibold))
            }
            .foregroundStyle(.black)
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(
                viewModel.isFormValid
                    ? Color.white
                    : Color.white.opacity(0.5)
            )
            .clipShape(RoundedRectangle(cornerRadius: ACRadius.glassDefault, style: .continuous))
        }
        .disabled(!viewModel.isFormValid || viewModel.isLoading)
        .acPressable(scale: 0.98)
        .padding(.top, 8)
    }

    private var successCard: some View {
        VStack(spacing: 20) {
            // Success icon
            ZStack {
                Circle()
                    .fill(.ultraThinMaterial)
                    .frame(width: 80, height: 80)

                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color.green.opacity(0.3),
                                Color.clear
                            ],
                            center: .center,
                            startRadius: 0,
                            endRadius: 40
                        )
                    )
                    .frame(width: 70, height: 70)

                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 40))
                    .foregroundStyle(Color.green)
            }
            .shadow(color: Color.green.opacity(0.3), radius: 20)

            Text("Check Your Email")
                .font(.system(size: 22, weight: .bold))
                .foregroundStyle(Color.white)

            VStack(spacing: 8) {
                Text("We've sent reset instructions to")
                    .font(.system(size: 15, weight: .regular))
                    .foregroundStyle(Color.white.opacity(0.7))

                Text(viewModel.email)
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color.acAmber500)
            }

            Text("Please check your inbox and follow the link to reset your password")
                .font(.system(size: 14, weight: .regular))
                .foregroundStyle(Color.white.opacity(0.7))
                .multilineTextAlignment(.center)
                .padding(.top, 4)

            // Back to login button
            Button {
                viewModel.backToLogin()
            } label: {
                Text("Back to Sign In")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.black)
                    .frame(maxWidth: .infinity)
                    .frame(height: 50)
                    .background(Color.white)
                    .clipShape(RoundedRectangle(cornerRadius: ACRadius.glassSmall, style: .continuous))
            }
            .acPressable(scale: 0.98)
            .padding(.top, 8)
        }
        .padding(24)
        .background(Color.green.opacity(0.15))
        .background(.ultraThinMaterial)
        .clipShape(RoundedRectangle(cornerRadius: ACRadius.glassSheet, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: ACRadius.glassSheet, style: .continuous)
                .strokeBorder(Color.green.opacity(0.3), lineWidth: 1)
        )
        .shadow(color: Color.black.opacity(0.3), radius: 30, y: 15)
        .opacity(showCard ? 1 : 0)
        .offset(y: showCard ? 0 : 30)
        .transition(.scale(scale: 0.95).combined(with: .opacity))
    }

    private var backToLoginSection: some View {
        Button {
            viewModel.backToLogin()
        } label: {
            HStack(spacing: 8) {
                Image(systemName: "arrow.left")
                    .font(.system(size: 14, weight: .medium))
                Text("Back to Sign In")
                    .font(.system(size: 15, weight: .semibold))
            }
            .foregroundStyle(Color.acAmber500)
        }
        .opacity(showFooter && !viewModel.isSuccess ? 1 : 0)
        .offset(y: showFooter ? 0 : 10)
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 18))
                .foregroundStyle(Color.red)

            Text(message)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Color.white)
                .multilineTextAlignment(.leading)

            Spacer()

            Button {
                withAnimation(ACSpring.quick) {
                    viewModel.errorMessage = nil
                }
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 20))
                    .foregroundStyle(Color.white.opacity(0.6))
            }
        }
        .padding(16)
        .background(Color.red.opacity(0.2))
        .clipShape(RoundedRectangle(cornerRadius: ACRadius.glassSmall, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: ACRadius.glassSmall, style: .continuous)
                .strokeBorder(Color.red.opacity(0.5), lineWidth: 1)
        )
        .transition(.scale(scale: 0.95).combined(with: .opacity))
    }
}

// MARK: - ViewModel

@available(iOS 17.0, *)
@Observable
final class ForgotPasswordViewModel {

    // MARK: - Published State

    var email = "" {
        didSet { emailError = nil; errorMessage = nil }
    }
    var isLoading = false
    var isSuccess = false
    var errorMessage: String?
    var emailError: String?

    // MARK: - Computed Properties

    var isFormValid: Bool {
        !email.isEmpty && emailError == nil
    }

    // MARK: - Dependencies

    private let authClient: AuthClient
    private let onBackToLogin: () -> Void

    // MARK: - Initialization

    init(authClient: AuthClient, onBackToLogin: @escaping () -> Void) {
        self.authClient = authClient
        self.onBackToLogin = onBackToLogin
    }

    // MARK: - Actions

    @MainActor
    func sendResetLink() async {
        emailError = nil
        errorMessage = nil

        guard validate() else { return }

        isLoading = true

        do {
            try await authClient.resetPassword(email: email)
            AppLogger.info("Password reset email sent", category: AppLogger.auth)
            withAnimation(ACSpring.smooth) {
                isSuccess = true
            }
        } catch {
            AppLogger.error("Password reset failed: \(error.localizedDescription)", category: AppLogger.auth)
            errorMessage = AppError.from(error).userMessage
        }

        isLoading = false
    }

    func backToLogin() {
        onBackToLogin()
    }

    // MARK: - Validation

    private func validate() -> Bool {
        if email.isEmpty {
            emailError = "Email is required"
            return false
        } else if !email.isValidEmail {
            emailError = "Invalid email address"
            return false
        }

        return true
    }
}

// MARK: - Email Validation Extension

private extension String {
    var isValidEmail: Bool {
        let emailRegex = "^[A-Z0-9a-z._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,64}$"
        let emailPredicate = NSPredicate(format: "SELF MATCHES %@", emailRegex)
        return emailPredicate.evaluate(with: self)
    }
}
