import SwiftUI
import MapKit

import AuthenticationServices
import DesignSystem
import CartoAuth
import Core

/// Premium sign-in screen featuring a rotating 3D globe background
/// with iOS 26 Liquid Glass UI overlays for an immersive astrocartography preview
@MainActor
@available(iOS 17.0, *)
struct SignInView: View {

    @State private var viewModel: SignInViewModel
    @State private var showEmailLogin = false
    @State private var showEmailSignUp = false
    @State private var showForgotPassword = false

    // Animation states for staggered entrance
    @State private var showGlobe = false
    @State private var showOverlay = false
    @State private var showTitle = false
    @State private var showAuthCard = false
    @State private var showFeaturePills = false
    @State private var showLegal = false

    // Marquee animation
    @State private var marqueeOffset: CGFloat = 0

    // Rotating headlines & subheadlines (matching web landing page)
    @State private var currentTaglineIndex: Int = 0
    private let headlines: [String] = [
        "Navigate Your\nCosmic Destiny",
        "Find Where\nYou Belong",
        "Map Your\nLife Path",
        "Discover Your\nPower Places"
    ]
    private let subheadlines: [String] = [
        "Discover where you belong in the universe.",
        "Map your planetary lines for love and career.",
        "Find your power places with AI astrology.",
        "Real-time astrocartography for your life path."
    ]

    init(authClient: AuthClient) {
        self._viewModel = State(initialValue: SignInViewModel(authClient: authClient))
    }

    var body: some View {
        NavigationStack {
            GeometryReader { geometry in
                ZStack {
                    // 1. Background (Bottom)
                    globeBackground
                        .ignoresSafeArea()
                        .zIndex(0)

                    // 2. Main Content (Top)
                    VStack(spacing: 0) {
                        // Feature pills at top
                        featurePreviewSection
                            .padding(.top, 0)
                            .padding(.bottom, 8)
                            .zIndex(3)
                            .clipped() // CRITICAL: Clip the marquee so it doesn't expand VStack

                        // Large orrery
                        orrerySection(geometry: geometry)
                            .zIndex(2)

                        Spacer(minLength: 8)

                        // Bottom: Auth card
                        inlineAuthCard
                            .padding(.bottom, 20)
                            .zIndex(3)

                        // Legal footer
                        legalSection
                            .padding(.bottom, 10)
                            .zIndex(3)
                    }
                    .frame(width: geometry.size.width) // CRITICAL: Force VStack to screen width
                    .frame(maxHeight: .infinity)
                    .zIndex(1)
                }
            }
            .onAppear {
                startEntranceAnimation()
            }
            .sheet(isPresented: $showEmailLogin) {
                EmailLoginView(
                    authClient: viewModel.authClient,
                    onSuccess: { showEmailLogin = false },
                    onSwitchToSignUp: {
                        showEmailLogin = false
                        Task { @MainActor in
                            try? await Task.sleep(nanoseconds: 300_000_000)
                            showEmailSignUp = true
                        }
                    },
                    onForgotPassword: {
                        showEmailLogin = false
                        Task { @MainActor in
                            try? await Task.sleep(nanoseconds: 300_000_000)
                            showForgotPassword = true
                        }
                    }
                )
                .preferredColorScheme(.dark)
            }
            .sheet(isPresented: $showEmailSignUp) {
                EmailSignUpView(
                    authClient: viewModel.authClient,
                    onSuccess: { showEmailSignUp = false },
                    onSwitchToLogin: {
                        showEmailSignUp = false
                        Task { @MainActor in
                            try? await Task.sleep(nanoseconds: 300_000_000)
                            showEmailLogin = true
                        }
                    }
                )
                .preferredColorScheme(.dark)
            }
            .sheet(isPresented: $showForgotPassword) {
                ForgotPasswordView(
                    authClient: viewModel.authClient,
                    onBackToLogin: {
                        showForgotPassword = false
                        Task { @MainActor in
                            try? await Task.sleep(nanoseconds: 300_000_000)
                            showEmailLogin = true
                        }
                    }
                )
                .preferredColorScheme(.dark)
            }
        }
        .preferredColorScheme(.dark)
    }

    // MARK: - Entrance Animation

    private func startEntranceAnimation() {
        // Set all to true immediately to debug rendering
        showGlobe = true
        showOverlay = true
        showTitle = true
        showFeaturePills = true
        showAuthCard = true
        showLegal = true

        // Start rotating taglines
        startTaglineRotation()
    }

    private func startTaglineRotation() {
        Task {
            while true {
                try? await Task.sleep(nanoseconds: 4_000_000_000) // 4 seconds (matching web timing)
                await MainActor.run {
                    withAnimation(.easeInOut(duration: 0.5)) {
                        currentTaglineIndex = (currentTaglineIndex + 1) % headlines.count
                    }
                }
            }
        }
    }





    // MARK: - Dark Cosmic Background

    // MARK: - Dark Cosmic Background

    private var globeBackground: some View {
        CosmicBackground()
    }

    // MARK: - Gradient Overlays



    // MARK: - Feature Preview Pills (Marquee)

    private let featurePillsData: [(icon: String, label: String, color: Color)] = [
        ("globe.americas.fill", "Astro Lines", .acPlanetSun),
        ("binoculars.fill", "Scout Cities", .acPlanetJupiter),
        ("person.2.fill", "Duo Mode", .acPlanetVenus),
        ("sparkles", "AI Insights", .white),
        ("map.fill", "Relocation", .acPlanetMars),
        ("chart.xyaxis.line", "Natal Chart", .acPlanetMoon),
    ]

    private var featurePreviewSection: some View {
        let spacing: CGFloat = 12

        // Use TimelineView for truly seamless infinite scrolling
        return TimelineView(.animation) { timeline in
            let now = timeline.date.timeIntervalSinceReferenceDate
            // Complete loop every 60 seconds (Slowed down from 25)
            let totalWidth: CGFloat = 942 // 6 pills × 145 + 6 × 12 spacing
            let progress = now.truncatingRemainder(dividingBy: 60) / 60
            let offset = -totalWidth * progress

            HStack(spacing: spacing) {
                // Double the pills for seamless looping
                ForEach(0..<2, id: \.self) { setIndex in
                    ForEach(featurePillsData.indices, id: \.self) { index in
                        let pill = featurePillsData[index]
                        featurePill(icon: pill.icon, label: pill.label, color: pill.color)
                    }
                }
            }
            .offset(x: offset)
        }
        .frame(height: 44)
        // No background - fully transparent to show orbits behind
    }

    private func featurePill(icon: String, label: String, color: Color) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(color)

            Text(label)
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(Color.white)
                .fixedSize(horizontal: true, vertical: false)
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(
            Capsule()
                .fill(Color.black.opacity(0.5))
        )
        .overlay(
            Capsule()
                .strokeBorder(Color.white.opacity(0.25), lineWidth: 0.5)
        )
    }

    // MARK: - Orrery Hero View

    private func orreryHeroView(size: CGSize) -> some View {
        // Make orrery big - bleed past screen edges
        let orrerySize = size.width * 1.4

        return ZStack(alignment: .center) {
            // Ambient base glow
            Circle()
                .fill(
                    RadialGradient(
                        colors: [
                            Color.white.opacity(0.05),
                            Color.clear
                        ],
                        center: .center,
                        startRadius: 0,
                        endRadius: orrerySize * 0.40
                    )
                )
                .frame(width: orrerySize, height: orrerySize)

            // Canvas Orrery
            CanvasOrrery()
                .frame(width: orrerySize, height: orrerySize)
        }
        .frame(width: orrerySize, height: orrerySize)
    }



    // MARK: - Orrery Section (extracted for type-checker)

    @ViewBuilder
    private func orrerySection(geometry: GeometryProxy) -> some View {
        GeometryReader { orreryGeo in
            ZStack {
                orreryHeroView(size: geometry.size)
                    .position(x: orreryGeo.size.width / 2, y: orreryGeo.size.height / 2 - 20)

                taglineOverlay(orreryGeo: orreryGeo)
            }
        }
        .frame(height: geometry.size.height * 0.42)
        // .clipped() REMOVED so it bleeds behind other Z-indexed elements
    }

    @ViewBuilder
    private func taglineOverlay(orreryGeo: GeometryProxy) -> some View {
        VStack(spacing: 8) { // Tighter spacing
            Text(headlines[currentTaglineIndex])
                .acSerifHeroStyle() // DesignSystem Cinzel 34pt Bold
                .foregroundStyle(Color.acForeground)
                .multilineTextAlignment(.center)
                .shadow(color: .black.opacity(0.4), radius: 10) // Reduced shadow for better transparency
                .shadow(color: .purple.opacity(0.2), radius: 20) // Reduced glow
                .id("headline-\(currentTaglineIndex)")
                // Slide Up Animation (Enter from bottom +20, Exit to top -20)
                .transition(.asymmetric(
                    insertion: .opacity.combined(with: .offset(y: 20)),
                    removal: .opacity.combined(with: .offset(y: -20))
                ))

            Text(subheadlines[currentTaglineIndex])
                // Typography Match: Inter Light 18 (Web) -> System Light 18 (iOS)
                .font(.system(size: 18, weight: .light))
                .foregroundStyle(Color.acMutedForeground)
                .multilineTextAlignment(.center)
                .tracking(0.3)
                .shadow(color: .black.opacity(0.4), radius: 8) // Reduced shadow
                .id("subheadline-\(currentTaglineIndex)")
                // Slide Up Animation (Enter from bottom +20, Exit to top -20)
                .transition(.asymmetric(
                    insertion: .opacity.combined(with: .offset(y: 20)),
                    removal: .opacity.combined(with: .offset(y: -20))
                ))
        }
        .animation(.easeInOut(duration: 0.5), value: currentTaglineIndex)
        .position(x: orreryGeo.size.width / 2, y: orreryGeo.size.height / 2 - 20)
    }

    // MARK: - Inline Auth Card (used in body)

    private var inlineAuthCard: some View {
        VStack(spacing: 16) {
            if let msg = viewModel.errorMessage {
                errorBanner(msg)
            }
            inlineAppleButton
            inlineGoogleButton
            inlineOrDivider
            inlineEmailButton
            guestButton
        }
        .animation(.easeInOut(duration: 0.25), value: viewModel.errorMessage != nil)
        .padding(24)
        .background(
            RoundedRectangle(cornerRadius: ACRadius.glassSheet, style: .continuous)
                .fill(Color(hex: "050505").opacity(0.95)) // Almost opaque black to cover Orrery
                .shadow(color: Color.black.opacity(0.5), radius: 20, x: 0, y: 10)
        )
        .overlay(
            RoundedRectangle(cornerRadius: ACRadius.glassSheet, style: .continuous)
                .stroke(Color.white.opacity(0.1), lineWidth: 1)
        )
        .padding(.horizontal, 20)
        .frame(maxWidth: 400)
        .padding(.bottom, 6)
    }

    private var inlineAppleButton: some View {
        Button {
            Task { await viewModel.signInWithApple() }
        } label: {
            HStack {
                if viewModel.isLoading && viewModel.loadingMethod == .apple {
                    ProgressView().tint(.black).scaleEffect(0.8)
                } else {
                    Image(systemName: "apple.logo")
                }
                Text(viewModel.isLoading && viewModel.loadingMethod == .apple ? "Signing in..." : "Continue with Apple")
                    .font(.system(size: 16, weight: .semibold))
            }
            .foregroundStyle(.black)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .disabled(viewModel.isLoading)
    }

    private var inlineGoogleButton: some View {
        Button {
            Task { await viewModel.signInWithGoogle() }
        } label: {
            HStack {
                if viewModel.isLoading && viewModel.loadingMethod == .google {
                    ProgressView().tint(.black).scaleEffect(0.8)
                } else {
                    googleLogo.frame(width: 18, height: 18)
                }
                Text(viewModel.isLoading && viewModel.loadingMethod == .google ? "Signing in..." : "Continue with Google")
                    .font(.system(size: 16, weight: .semibold))
            }
            .foregroundStyle(.black)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .disabled(viewModel.isLoading)
    }

    private var inlineOrDivider: some View {
        HStack {
            Rectangle().frame(height: 1).foregroundStyle(Color.white.opacity(0.2))
            Text("or").font(.system(size: 14)).foregroundStyle(Color.white.opacity(0.6))
            Rectangle().frame(height: 1).foregroundStyle(Color.white.opacity(0.2))
        }
    }

    private var inlineEmailButton: some View {
        Button {
            showEmailLogin = true
        } label: {
            HStack {
                Image(systemName: "envelope.fill")
                Text("Continue with Email")
                    .font(.system(size: 16, weight: .semibold))
            }
            .foregroundStyle(.white)
            .frame(maxWidth: .infinity)
            .frame(height: 50)
            .background(Color.white.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.white.opacity(0.2), lineWidth: 1)
            )
        }
    }

    private var guestButton: some View {
        let isGuestLoading = viewModel.isLoading && viewModel.loadingMethod == .guest
        return Button {
            Task { await viewModel.continueAsGuest() }
        } label: {
            HStack(spacing: 6) {
                if isGuestLoading {
                    ProgressView()
                        .tint(Color.white.opacity(0.5))
                        .scaleEffect(0.7)
                }
                Text(isGuestLoading ? "Entering..." : "Continue as Guest")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Color.white.opacity(isGuestLoading ? 0.35 : 0.5))
                    .underline(!isGuestLoading)
            }
            .animation(.easeInOut(duration: 0.2), value: isGuestLoading)
        }
        .disabled(viewModel.isLoading)
        .padding(.top, 4)
    }

    // MARK: - Auth Card

    private var authCard: some View {
        VStack(spacing: 14) {
            // Error message
            if let msg = viewModel.errorMessage {
                errorBanner(msg)
            }

            // Apple Sign In
            appleSignInButton

            // Google Sign In
            googleSignInButton

            // Divider
            orDivider

            // Email option
            emailButton

            guestButton
        }
        .padding(20)
        // Glassmorphism style - transparent with blur like web navbar
        .background(
            RoundedRectangle(cornerRadius: ACRadius.glassSheet, style: .continuous)
                .fill(Color.white.opacity(0.08))
                .background(
                    RoundedRectangle(cornerRadius: ACRadius.glassSheet, style: .continuous)
                        .fill(.ultraThinMaterial)
                        .opacity(0.5)
                )
        )
        .clipShape(RoundedRectangle(cornerRadius: ACRadius.glassSheet, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: ACRadius.glassSheet, style: .continuous)
                .strokeBorder(Color.white.opacity(0.12), lineWidth: 1)
        )
    }

    // MARK: - Auth Buttons

    private var appleSignInButton: some View {
        Button {
            Task { await viewModel.signInWithApple() }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: "apple.logo")
                    .font(.system(size: 18, weight: .medium))

                Text(viewModel.isLoading && viewModel.loadingMethod == .apple
                     ? "Signing in..."
                     : "Continue with Apple")
                    .font(.system(size: 16, weight: .semibold))
            }
            .foregroundStyle(.black)
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .disabled(viewModel.isLoading)
        .opacity(viewModel.isLoading && viewModel.loadingMethod == .apple ? 0.7 : 1.0)
        .overlay {
            if viewModel.isLoading && viewModel.loadingMethod == .apple {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .overlay { ProgressView().tint(.black) }
            }
        }
        .acPressable(scale: 0.98)
        .accessibilityLabel("Continue with Apple")
    }

    private var googleSignInButton: some View {
        Button {
            Task { await viewModel.signInWithGoogle() }
        } label: {
            HStack(spacing: 12) {
                googleLogo
                    .frame(width: 18, height: 18)

                Text(viewModel.isLoading && viewModel.loadingMethod == .google
                     ? "Signing in..."
                     : "Continue with Google")
                    .font(.system(size: 16, weight: .medium))
                    .foregroundStyle(Color(white: 0.2))
            }
            .frame(maxWidth: .infinity)
            .frame(height: 52)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .disabled(viewModel.isLoading)
        .opacity(viewModel.isLoading && viewModel.loadingMethod == .google ? 0.7 : 1.0)
        .overlay {
            if viewModel.isLoading && viewModel.loadingMethod == .google {
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(.ultraThinMaterial)
                    .overlay { ProgressView().tint(.black) }
            }
        }
        .acPressable(scale: 0.98)
        .accessibilityLabel("Continue with Google")
    }

    private var googleLogo: some View {
        Image("GoogleLogo")
            .resizable()
            .aspectRatio(contentMode: .fit)
    }

    private var orDivider: some View {
        HStack(spacing: 16) {
            Rectangle()
                .fill(Color.acGlassBorderThemed)
                .frame(height: 1)

            Text("or")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.acGlassTextSecondary)

            Rectangle()
                .fill(Color.acGlassBorderThemed)
                .frame(height: 1)
        }
        .padding(.vertical, 2)
    }

    private var emailButton: some View {
        Button { showEmailLogin = true } label: {
            HStack(spacing: 10) {
                Image(systemName: "envelope.fill")
                    .font(.system(size: 16, weight: .medium))

                Text("Continue with Email")
                    .font(.system(size: 15, weight: .semibold))
            }
            .foregroundStyle(.black)
            .frame(maxWidth: .infinity)
            .frame(height: 48)
            .background(Color.white)
            .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .disabled(viewModel.isLoading)
        .acPressable(scale: 0.98)
        .accessibilityLabel("Continue with Email")
    }


    // MARK: - Error Banner

    private func errorBanner(_ message: String) -> some View {
        HStack(spacing: 12) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 16))
                .foregroundStyle(Color.acDestructive)

            Text(message)
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(Color.acGlassTextPrimary)
                .multilineTextAlignment(.leading)

            Spacer()

            Button {
                withAnimation(ACSpring.quick) {
                    viewModel.errorMessage = nil
                }
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 18))
                    .foregroundStyle(Color.acGlassTextSecondary)
            }
        }
        .padding(14)
        .acLiquidGlass(tint: Color.acDestructive.opacity(0.15), cornerRadius: ACRadius.glassSmall)
        .overlay(
            RoundedRectangle(cornerRadius: ACRadius.glassSmall, style: .continuous)
                .strokeBorder(Color.acDestructive.opacity(0.3), lineWidth: 1)
        )
        .transition(.asymmetric(
            insertion: .scale(scale: 0.95).combined(with: .opacity),
            removal: .scale(scale: 0.95).combined(with: .opacity)
        ))
    }

    // MARK: - Legal Section

    @State private var showTermsSheet = false
    @State private var showPrivacySheet = false
    @State private var showEulaSheet = false

    private var legalSection: some View {
        VStack(spacing: 8) {
            Text("By continuing, you agree to our")
                .font(.system(size: 11, weight: .regular))
                .foregroundStyle(Color.acMutedForeground.opacity(0.6))

            HStack(spacing: 12) {
                Button { showTermsSheet = true } label: {
                    Text("Terms of Service")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Color.white)
                        .underline()
                }

                Text("•")
                    .foregroundStyle(Color.acMutedForeground.opacity(0.3))

                Button { showPrivacySheet = true } label: {
                    Text("Privacy Policy")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Color.white)
                        .underline()
                }

                Text("•")
                    .foregroundStyle(Color.acMutedForeground.opacity(0.3))

                Button { showEulaSheet = true } label: {
                    Text("EULA")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(Color.white)
                        .underline()
                }
            }
        }
        .opacity(showLegal ? 1 : 0)
        .offset(y: showLegal ? 0 : 10)
        .sheet(isPresented: $showTermsSheet) {
            LegalDocumentView.terms()
        }
        .sheet(isPresented: $showPrivacySheet) {
            LegalDocumentView.privacy()
        }
        .sheet(isPresented: $showEulaSheet) {
            LegalDocumentView.eula()
        }
    }
}

// MARK: - ViewModel

@MainActor
@Observable
final class SignInViewModel {
    enum AuthMethodType {
        case apple, google, email, guest
    }

    var isLoading: Bool = false
    var loadingMethod: AuthMethodType? = nil
    var errorMessage: String?

    fileprivate let authClient: AuthClient

    init(authClient: AuthClient) {
        self.authClient = authClient
    }

    func signInWithApple() async {
        isLoading = true
        loadingMethod = .apple
        errorMessage = nil
        Analytics.capture(.signInAttempted, properties: ["method": "apple"])

        defer {
            isLoading = false
            loadingMethod = nil
        }

        do {
            _ = try await authClient.signInWithApple()
            AppLogger.info("Apple sign in successful", category: AppLogger.ui)
            Analytics.capture(.signInSucceeded, properties: ["method": "apple"])
        } catch {
            let appError = AppError.from(error)
            errorMessage = appError.userMessage
            AppLogger.error("Apple sign in failed: \(error)", category: AppLogger.ui)
            Analytics.capture(.signInFailed, properties: ["method": "apple", "error": appError.userMessage])
            autoDismissError(appError.userMessage)
        }
    }

    func signInWithGoogle() async {
        isLoading = true
        loadingMethod = .google
        errorMessage = nil
        Analytics.capture(.signInAttempted, properties: ["method": "google"])

        defer {
            isLoading = false
            loadingMethod = nil
        }

        do {
            _ = try await authClient.signInWithGoogle()
            AppLogger.info("Google sign in successful", category: AppLogger.ui)
            Analytics.capture(.signInSucceeded, properties: ["method": "google"])
        } catch {
            let appError = AppError.from(error)
            errorMessage = appError.userMessage
            AppLogger.error("Google sign in failed: \(error)", category: AppLogger.ui)
            Analytics.capture(.signInFailed, properties: ["method": "google", "error": appError.userMessage])
            autoDismissError(appError.userMessage)
        }
    }

    func continueAsGuest() async {
        isLoading = true
        loadingMethod = .guest
        errorMessage = nil
        Analytics.capture(.signInAttempted, properties: ["method": "guest"])
        do {
            _ = try await authClient.signInAnonymously()
            AppLogger.info("Anonymous sign-in successful", category: AppLogger.auth)
            Analytics.capture(.signInSucceeded, properties: ["method": "guest"])
            // Keep loading state active — view will dismiss during navigation
        } catch {
            isLoading = false
            loadingMethod = nil
            let appError = AppError.from(error)
            errorMessage = appError.userMessage
            AppLogger.error("Anonymous sign-in failed: \(error)", category: AppLogger.auth)
            Analytics.capture(.signInFailed, properties: ["method": "guest", "error": appError.userMessage])
            autoDismissError(appError.userMessage)
        }
    }

    private func autoDismissError(_ message: String) {
        Task {
            try? await Task.sleep(nanoseconds: 5_000_000_000)
            if self.errorMessage == message {
                self.errorMessage = nil
            }
        }
    }

}



// MARK: - Preview

#if DEBUG
@available(iOS 17.0, *)
#Preview("Sign In - Canvas Background") {
    SignInView(authClient: PreviewComposition.mockAuthClient())
}
#endif
