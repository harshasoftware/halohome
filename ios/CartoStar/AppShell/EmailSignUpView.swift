import SwiftUI
import MapKit
import CartoAuth
import Core
import DesignSystem

/// Email sign-up screen with Liquid Glass UI and subtle globe background
@available(iOS 17.0, *)
struct EmailSignUpView: View {

    // MARK: - Properties

    @State private var viewModel: EmailSignUpViewModel
    @FocusState private var focusedField: Field?
    @State private var showTerms = false

    // Animation states
    @State private var showBackground = false
    @State private var showHeader = false
    @State private var showCard = false
    @State private var showFooter = false

    // Globe state for background
    @State private var mapPosition: MapCameraPosition = .automatic

    private enum Field: Hashable {
        case email, password, confirmPassword
    }

    // MARK: - Initialization

    init(
        authClient: AuthClient,
        onSuccess: @escaping () -> Void,
        onSwitchToLogin: @escaping () -> Void
    ) {
        self.viewModel = EmailSignUpViewModel(
            authClient: authClient,
            onSuccess: onSuccess,
            onSwitchToLogin: onSwitchToLogin
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
                            .frame(height: 32)

                        // Header
                        headerSection
                            .padding(.bottom, 28)

                        // Glass card with form
                        formCard
                            .padding(.horizontal, 24)

                        Spacer()
                            .frame(height: 24)

                        // Switch to login
                        switchToLoginSection
                    }
                    .padding(.bottom, 40)
                }
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        viewModel.onSuccess()
                    }
                    .foregroundStyle(Color.acGlassTextSecondary)
                }
            }
            .disabled(viewModel.isLoading)
            .contentShape(Rectangle())
            .onTapGesture {
                focusedField = nil
            }
            .sheet(isPresented: $showTerms) {
                LegalDocumentView.terms()
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

    // MARK: - Dark Cosmic Background

    private var globeBackground: some View {
        CosmicBackground()
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
                                Color.acCosmicPurple.opacity(0.3),
                                Color.clear
                            ],
                            center: .center,
                            startRadius: 0,
                            endRadius: 40
                        )
                    )
                    .frame(width: 70, height: 70)

                Image(systemName: "person.badge.plus.fill")
                    .font(.system(size: 32, weight: .medium))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color.acCosmicPurple.opacity(0.8), Color.acCosmicPurple],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
            }
            .shadow(color: Color.acCosmicPurple.opacity(0.3), radius: 20)
            .opacity(showHeader ? 1 : 0)
            .scaleEffect(showHeader ? 1 : 0.8)

            Text("Create Account")
                .font(.system(size: 28, weight: .bold))
                .foregroundStyle(Color.white)
                .opacity(showHeader ? 1 : 0)
                .offset(y: showHeader ? 0 : 10)

            Text("Sign up to start your cosmic journey")
                .font(.system(size: 16, weight: .regular))
                .foregroundStyle(Color.white.opacity(0.7))
                .opacity(showHeader ? 1 : 0)
                .offset(y: showHeader ? 0 : 10)
        }
    }

    private var formCard: some View {
        VStack(spacing: 20) {
            // Success message
            if let successMessage = viewModel.successMessage {
                successBanner(successMessage)
            }

            // Error display
            if let errorMessage = viewModel.errorMessage {
                errorBanner(errorMessage)
            }

            // Email field
            glassTextField(
                title: "Email",
                placeholder: "your@email.com",
                text: $viewModel.email,
                error: viewModel.emailError,
                keyboardType: .emailAddress,
                textContentType: .emailAddress,
                isSecure: false,
                field: .email
            )

            // Password field with strength indicator
            VStack(alignment: .leading, spacing: 8) {
                glassTextField(
                    title: "Password",
                    placeholder: "At least 8 characters",
                    text: $viewModel.password,
                    error: viewModel.passwordError,
                    keyboardType: .default,
                    textContentType: .newPassword,
                    isSecure: !viewModel.showPassword,
                    field: .password,
                    showToggle: true,
                    isToggled: $viewModel.showPassword
                )

                // Password strength indicator
                if !viewModel.password.isEmpty {
                    passwordStrengthView
                        .padding(.top, 4)
                }
            }

            // Confirm password field
            glassTextField(
                title: "Confirm Password",
                placeholder: "Re-enter password",
                text: $viewModel.confirmPassword,
                error: viewModel.confirmPasswordError,
                keyboardType: .default,
                textContentType: .newPassword,
                isSecure: !viewModel.showConfirmPassword,
                field: .confirmPassword,
                showToggle: true,
                isToggled: $viewModel.showConfirmPassword
            )

            // Terms acceptance
            termsSection

            // Sign up button
            signUpButton
        }
        .padding(24)
        .acLiquidGlass(cornerRadius: ACRadius.glassSheet)
        .shadow(color: Color.black.opacity(0.3), radius: 30, y: 15)
        .frame(maxWidth: 400) // Restrict width
        .opacity(showCard ? 1 : 0)
        .offset(y: showCard ? 0 : 30)
    }

    private func glassTextField(
        title: String,
        placeholder: String,
        text: Binding<String>,
        error: String?,
        keyboardType: UIKeyboardType,
        textContentType: UITextContentType,
        isSecure: Bool,
        field: Field,
        showToggle: Bool = false,
        isToggled: Binding<Bool>? = nil
    ) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(Color.white)

            HStack(spacing: 12) {
                Group {
                    if isSecure {
                        SecureField(placeholder, text: text)
                    } else {
                        TextField(placeholder, text: text)
                    }
                }
                .font(.system(size: 16))
                .foregroundStyle(Color.black)
                .textContentType(textContentType)
                .keyboardType(keyboardType)
                .autocapitalization(.none)
                .autocorrectionDisabled()
                .focused($focusedField, equals: field)
                .submitLabel(field == .confirmPassword ? .done : .next)
                .onSubmit {
                    switch field {
                    case .email:
                        focusedField = .password
                    case .password:
                        focusedField = .confirmPassword
                    case .confirmPassword:
                        Task { await viewModel.signUp() }
                    }
                }

                if showToggle, let toggle = isToggled {
                    Button {
                        toggle.wrappedValue.toggle()
                    } label: {
                        Image(systemName: toggle.wrappedValue ? "eye.slash.fill" : "eye.fill")
                            .font(.system(size: 18))
                            .foregroundStyle(Color.gray)
                    }
                }
            }
            .padding(16)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: ACRadius.glassInput, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: ACRadius.glassInput)
                    .strokeBorder(
                        error != nil ? Color.acDestructive : Color.clear,
                        lineWidth: 2
                    )
            )

            if let error = error {
                Text(error)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.red)
            }
        }
    }

    private var passwordStrengthView: some View {
        VStack(spacing: 6) {
            HStack(spacing: 6) {
                ForEach(0..<4, id: \.self) { index in
                    Capsule()
                        .fill(index < viewModel.passwordStrength.rawValue ? strengthColor : Color.white.opacity(0.2))
                        .frame(height: 4)
                }
            }

            HStack {
                Text(viewModel.passwordStrength.label)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(strengthColor)
                Spacer()
            }
        }
        .padding(.horizontal, 4)
    }

    private var strengthColor: Color {
        switch viewModel.passwordStrength {
        case .weak: return Color.acDestructive
        case .fair: return Color.orange
        case .good: return Color.yellow
        case .strong: return Color.green
        }
    }

    private var termsSection: some View {
        HStack(alignment: .top, spacing: 14) {
            // Custom checkbox
            Button {
                viewModel.acceptedTerms.toggle()
            } label: {
                ZStack {
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .fill(viewModel.acceptedTerms ? Color.acAmber500 : Color.white.opacity(0.2))
                        .frame(width: 24, height: 24)

                    if viewModel.acceptedTerms {
                        Image(systemName: "checkmark")
                            .font(.system(size: 12, weight: .bold))
                            .foregroundStyle(.black)
                    }
                }
                .overlay(
                    RoundedRectangle(cornerRadius: 6, style: .continuous)
                        .strokeBorder(
                            viewModel.termsError != nil
                                ? Color.red
                                : viewModel.acceptedTerms
                                    ? Color.clear
                                    : Color.white.opacity(0.3),
                            lineWidth: 1
                        )
                )
            }

            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 4) {
                    Text("I agree to the")
                        .font(.system(size: 14, weight: .regular))
                        .foregroundStyle(Color.white.opacity(0.7))

                    Button {
                        showTerms = true
                    } label: {
                        Text("Terms & Privacy")
                            .font(.system(size: 14, weight: .medium))
                            .foregroundStyle(Color.acAmber500)
                    }
                }

                if viewModel.termsError != nil {
                    Text("You must accept the terms to continue")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(Color.red)
                }
            }

            Spacer()
        }
        .padding(.top, 4)
    }

    private var signUpButton: some View {
        Button {
            Task { await viewModel.signUp() }
        } label: {
            HStack(spacing: 10) {
                if viewModel.isLoading {
                    ProgressView()
                        .tint(.black)
                        .scaleEffect(0.9)
                }
                Text(viewModel.isLoading ? "Creating account..." : "Create Account")
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

    private var switchToLoginSection: some View {
        HStack(spacing: 6) {
            Text("Already have an account?")
                .font(.system(size: 15, weight: .regular))
                .foregroundStyle(Color.white.opacity(0.7))

            Button {
                viewModel.switchToLogin()
            } label: {
                Text("Sign In")
                    .font(.system(size: 15, weight: .semibold))
                    .foregroundStyle(Color.acAmber500)
            }
        }
        .opacity(showFooter ? 1 : 0)
        .offset(y: showFooter ? 0 : 10)
    }

    private func successBanner(_ message: String) -> some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: "envelope.circle.fill")
                .font(.system(size: 24))
                .foregroundStyle(Color.green)

            VStack(alignment: .leading, spacing: 8) {
                Text(message)
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Color.white)
                    .multilineTextAlignment(.leading)

                Button {
                    viewModel.switchToLogin()
                } label: {
                    Text("Go to Sign In")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(.black)
                        .padding(.horizontal, 16)
                        .padding(.vertical, 10)
                        .background(Color.white)
                        .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))
                }
                .acPressable(scale: 0.96)
            }

            Spacer()
        }
        .padding(16)
        .background(Color.green.opacity(0.2))
        .clipShape(RoundedRectangle(cornerRadius: ACRadius.glassSmall, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: ACRadius.glassSmall, style: .continuous)
                .strokeBorder(Color.green.opacity(0.5), lineWidth: 1)
        )
        .transition(.scale(scale: 0.95).combined(with: .opacity))
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
final class EmailSignUpViewModel {

    // MARK: - Published State

    var email = "" {
        didSet { emailError = nil; errorMessage = nil }
    }
    var password = "" {
        didSet { passwordError = nil; confirmPasswordError = nil; errorMessage = nil }
    }
    var confirmPassword = "" {
        didSet { confirmPasswordError = nil; errorMessage = nil }
    }
    var acceptedTerms = false {
        didSet { termsError = nil; errorMessage = nil }
    }

    var showPassword = false
    var showConfirmPassword = false

    var isLoading = false
    var errorMessage: String?
    var successMessage: String?

    // Validation errors
    var emailError: String?
    var passwordError: String?
    var confirmPasswordError: String?
    var termsError: String?

    // MARK: - Computed Properties

    var passwordStrength: PasswordStrength {
        PasswordStrength.evaluate(password)
    }

    var isFormValid: Bool {
        !email.isEmpty &&
        !password.isEmpty &&
        !confirmPassword.isEmpty &&
        acceptedTerms &&
        emailError == nil &&
        passwordError == nil &&
        confirmPasswordError == nil
    }

    // MARK: - Dependencies

    private let authClient: AuthClient
    let onSuccess: () -> Void
    private let onSwitchToLogin: () -> Void

    // MARK: - Initialization

    init(
        authClient: AuthClient,
        onSuccess: @escaping () -> Void,
        onSwitchToLogin: @escaping () -> Void
    ) {
        self.authClient = authClient
        self.onSuccess = onSuccess
        self.onSwitchToLogin = onSwitchToLogin
    }

    // MARK: - Actions

    @MainActor
    func signUp() async {
        emailError = nil
        passwordError = nil
        confirmPasswordError = nil
        termsError = nil
        errorMessage = nil
        successMessage = nil

        guard validate() else { return }

        isLoading = true

        do {
            _ = try await authClient.signUpWithEmail(email: email, password: password)
            AppLogger.info("User signed up successfully", category: AppLogger.auth)
            onSuccess()
        } catch let authError as AuthError {
            if authError == .emailConfirmationRequired {
                AppLogger.info("Email confirmation required for signup", category: AppLogger.auth)
                successMessage = "Account created! Please check your email and click the confirmation link to activate your account."
            } else {
                AppLogger.error("Sign up failed: \(authError)", category: AppLogger.auth)
                errorMessage = authError.asAppError().userMessage
            }
        } catch {
            AppLogger.error("Sign up failed: \(error.localizedDescription)", category: AppLogger.auth)
            errorMessage = AppError.from(error).userMessage
        }

        isLoading = false
    }

    func switchToLogin() {
        onSwitchToLogin()
    }

    // MARK: - Validation

    private func validate() -> Bool {
        var isValid = true

        if email.isEmpty {
            emailError = "Email is required"
            isValid = false
        } else if !email.isValidEmail {
            emailError = "Invalid email address"
            isValid = false
        }

        if password.isEmpty {
            passwordError = "Password is required"
            isValid = false
        } else if password.count < 8 {
            passwordError = "Password must be at least 8 characters"
            isValid = false
        }

        if confirmPassword.isEmpty {
            confirmPasswordError = "Please confirm your password"
            isValid = false
        } else if password != confirmPassword {
            confirmPasswordError = "Passwords do not match"
            isValid = false
        }

        if !acceptedTerms {
            termsError = "Required"
            isValid = false
        }

        return isValid
    }
}

// MARK: - Password Strength

enum PasswordStrength: Int {
    case weak = 1
    case fair = 2
    case good = 3
    case strong = 4

    var label: String {
        switch self {
        case .weak: return "Weak"
        case .fair: return "Fair"
        case .good: return "Good"
        case .strong: return "Strong"
        }
    }

    static func evaluate(_ password: String) -> PasswordStrength {
        var score = 0

        if password.count >= 8 { score += 1 }
        if password.count >= 12 { score += 1 }

        if password.range(of: "[A-Z]", options: .regularExpression) != nil { score += 1 }
        if password.range(of: "[a-z]", options: .regularExpression) != nil { score += 1 }
        if password.range(of: "[0-9]", options: .regularExpression) != nil { score += 1 }
        if password.range(of: "[^A-Za-z0-9]", options: .regularExpression) != nil { score += 1 }

        let normalized = min(max(score / 2, 1), 4)
        return PasswordStrength(rawValue: normalized) ?? .weak
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
