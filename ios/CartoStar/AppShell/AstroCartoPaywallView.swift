import SwiftUI
import DesignSystem
import Payments
import Core

// MARK: - HaloHome Paywall View

/// Hard paywall view for HaloHome - no skip option
/// Users must subscribe or start a trial to access the app
@available(iOS 17.0, *)
struct AstroCartoPaywallView: View {

    // MARK: - Properties

    private let paymentsClient: PaymentsClient
    private let placementID: String?
    private let onPurchaseComplete: () -> Void
    private let onDismiss: (() -> Void)?

    @State private var offerings: [PaymentsOffering] = []
    @State private var selectedOffering: PaymentsOffering?
    @State private var isLoading = false
    @State private var isPurchasing = false
    @State private var errorMessage: String?

    // MARK: - Init

    init(
        paymentsClient: PaymentsClient,
        placementID: String? = nil,
        onPurchaseComplete: @escaping () -> Void,
        onDismiss: (() -> Void)? = nil
    ) {
        self.paymentsClient = paymentsClient
        self.placementID = placementID
        self.onPurchaseComplete = onPurchaseComplete
        self.onDismiss = onDismiss
    }

    // MARK: - Body

    var body: some View {
        ZStack {
            // Cosmic background
            cosmicBackground
                .ignoresSafeArea()

            // Close button overlay (when dismissable)
            if let onDismiss = onDismiss {
                VStack {
                    HStack {
                        Spacer()
                        Button {
                            onDismiss()
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 30))
                                .foregroundStyle(Color.acMutedForeground.opacity(0.6))
                        }
                        .padding(.trailing, DSSpacing.lg)
                        .padding(.top, 16)
                        .safeAreaPadding(.top)
                    }
                    Spacer()
                }
                .zIndex(10)
            }

            ScrollView {
                VStack(spacing: DSSpacing.xl) {
                    // Header section
                    headerSection
                        .padding(.top, onDismiss != nil ? 60 : 60)

                    // Features section
                    featuresSection

                    // Package selection
                    if !offerings.isEmpty {
                        packagesSection
                    } else if isLoading {
                        ProgressView()
                            .tint(Color.acAmber500)
                            .padding(.vertical, DSSpacing.xl)
                    }

                    // Error message
                    if let error = errorMessage {
                        errorBanner(message: error)
                    }

                    // CTA button
                    ctaSection

                    // Footer
                    footerSection
                        .padding(.bottom, DSSpacing.xl)
                }
                .padding(.horizontal, DSSpacing.xl)
            }

            // Loading overlay
            if isPurchasing {
                purchasingOverlay
            }
        }
        .task {
            await loadOfferings()
        }
    }

    // MARK: - Subviews

    private var cosmicBackground: some View {
        ZStack {
            // Base background
            Color.acBackground

            // Gradient overlay
            LinearGradient(
                colors: [
                    Color.acBackground,
                    Color(hex: "#0A0A15"),
                    Color.acBackground
                ],
                startPoint: .top,
                endPoint: .bottom
            )

            // Ambient glow
            RadialGradient(
                colors: [
                    Color.acCosmicPurple.opacity(0.15),
                    Color.clear
                ],
                center: .top,
                startRadius: 0,
                endRadius: 400
            )
        }
    }

    private var headerSection: some View {
        VStack(spacing: DSSpacing.lg) {
            // Premium icon
            ZStack {
                Circle()
                    .fill(
                        RadialGradient(
                            colors: [
                                Color.acAmber500.opacity(0.3),
                                Color.clear
                            ],
                            center: .center,
                            startRadius: 20,
                            endRadius: 80
                        )
                    )
                    .frame(width: 160, height: 160)

                Image(systemName: "globe.americas.fill")
                    .font(.system(size: 70, weight: .light))
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color.acAmber400, Color.acCosmicPurple],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
            }

            VStack(spacing: DSSpacing.sm) {
                Text("Unlock Your Full")
                    .font(.acSerifDisplay)
                    .foregroundStyle(Color.acForeground)

                Text("Cosmic Potential")
                    .font(.acSerifDisplay)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [Color.acAmber400, Color.acAmber500],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
            }
            .multilineTextAlignment(.center)
        }
    }

    private var featuresSection: some View {
        VStack(spacing: DSSpacing.md) {
            PaywallFeatureRow(icon: "globe", text: "Unlimited astro lines on the globe")
            PaywallFeatureRow(icon: "magnifyingglass", text: "Scout algorithm (AI location ranking)")
            PaywallFeatureRow(icon: "person.2", text: "Duo mode (compatibility charts)")
            PaywallFeatureRow(icon: "bubble.left.and.bubble.right", text: "AI astrologer chat")
            PaywallFeatureRow(icon: "arrow.down.circle", text: "Offline calculations")
        }
        .padding(DSSpacing.lg)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.white.opacity(0.03))
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.acCardBorder, lineWidth: 1)
        )
    }

    private var packagesSection: some View {
        VStack(spacing: DSSpacing.md) {
            // Sort: Annual (best value) → Lifetime (one-time) → Monthly
            let sortedOfferings = offerings.sorted { o1, o2 in
                let order: [PaymentsOffering.PackageType: Int] = [.annual: 0, .lifetime: 1, .monthly: 2]
                return (order[o1.packageType] ?? 3) < (order[o2.packageType] ?? 3)
            }
            ForEach(sortedOfferings) { offering in
                PackageOptionCard(
                    offering: offering,
                    isSelected: selectedOffering?.id == offering.id,
                    onSelect: {
                        withAnimation(SAIMotion.quick) {
                            selectedOffering = offering
                        }
                    }
                )
            }
        }
    }

    private var isLifetimeSelected: Bool {
        selectedOffering?.packageType == .lifetime
    }

    private var ctaButtonText: String {
        isLifetimeSelected ? "Purchase Lifetime Access" : "Start 3-Day Free Trial"
    }

    private var ctaSection: some View {
        VStack(spacing: DSSpacing.md) {
            Button {
                Task { await purchase() }
            } label: {
                HStack(spacing: DSSpacing.sm) {
                    if isPurchasing {
                        ProgressView()
                            .tint(Color.acBackground)
                    } else {
                        Text(ctaButtonText)
                            .font(.system(size: 17, weight: .semibold))
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, DSSpacing.lg)
                .background(
                    Capsule()
                        .fill(LinearGradient.acAmberGradient)
                )
                .foregroundStyle(Color.acBackground)
            }
            .disabled(selectedOffering == nil || isPurchasing)
            .opacity(selectedOffering == nil ? 0.6 : 1.0)

            // Subscription info
            VStack(spacing: DSSpacing.xs) {
                if let offering = selectedOffering {
                    if offering.packageType == .lifetime {
                        Text("One-time purchase of \(offering.price)")
                            .font(.system(size: 13))
                            .foregroundStyle(Color.acMutedForeground)
                    } else {
                        Text("Then \(offering.price) per \(isYearly(offering) ? "year" : "month")")
                            .font(.system(size: 13))
                            .foregroundStyle(Color.acMutedForeground)
                    }
                }

                Text(isLifetimeSelected ? "Pay once, yours forever." : "Cancel anytime. No commitment.")
                    .font(.system(size: 12))
                    .foregroundStyle(Color.acMutedForeground.opacity(0.7))
            }
        }
    }

    private var footerSection: some View {
        VStack(spacing: DSSpacing.lg) {
            // Restore purchases
            Button {
                Task { await restore() }
            } label: {
                Text("Restore Purchases")
                    .font(.system(size: 14, weight: .medium))
                    .foregroundStyle(Color.acMutedForeground)
            }
            .disabled(isPurchasing)

            // Legal links
            HStack(spacing: DSSpacing.lg) {
                Link("Terms", destination: URL(string: "https://halohome.app/terms-of-service")!)
                    .font(.system(size: 12))
                    .foregroundStyle(Color.acMutedForeground.opacity(0.7))

                Text("|")
                    .foregroundStyle(Color.acMutedForeground.opacity(0.3))

                Link("Privacy", destination: URL(string: "https://halohome.app/privacy-policy")!)
                    .font(.system(size: 12))
                    .foregroundStyle(Color.acMutedForeground.opacity(0.7))

                Text("|")
                    .foregroundStyle(Color.acMutedForeground.opacity(0.3))

                Link("EULA", destination: URL(string: "https://halohome.app/eula")!)
                    .font(.system(size: 12))
                    .foregroundStyle(Color.acMutedForeground.opacity(0.7))
            }
        }
    }

    private func errorBanner(message: String) -> some View {
        HStack(spacing: DSSpacing.sm) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(Color.acDestructive)

            Text(message)
                .font(.system(size: 13))
                .foregroundStyle(Color.acDestructive)
                .multilineTextAlignment(.leading)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(DSSpacing.md)
        .background(
            RoundedRectangle(cornerRadius: 8)
                .fill(Color.acDestructive.opacity(0.1))
        )
    }

    private var purchasingOverlay: some View {
        ZStack {
            Color.black.opacity(0.5)
                .ignoresSafeArea()

            VStack(spacing: DSSpacing.lg) {
                ProgressView()
                    .tint(Color.acAmber500)
                    .scaleEffect(1.2)

                Text("Processing...")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Color.acForeground)
            }
            .padding(DSSpacing.xl)
            .background(
                RoundedRectangle(cornerRadius: 16)
                    .fill(Color.acSecondary)
            )
        }
    }

    // MARK: - Helpers

    private func isYearly(_ offering: PaymentsOffering) -> Bool {
        offering.packageType == .annual
    }

    // MARK: - Actions

    private func loadOfferings() async {
        isLoading = true
        errorMessage = nil

        do {
            if let placementID = placementID {
                offerings = try await paymentsClient.getOfferings(forPlacement: placementID)
            } else {
                offerings = try await paymentsClient.getOfferings()
            }

            // Auto-select yearly (best value) by default, then lifetime, then first
            if let yearly = offerings.first(where: { isYearly($0) }) {
                selectedOffering = yearly
            } else if let lifetime = offerings.first(where: { $0.packageType == .lifetime }) {
                selectedOffering = lifetime
            } else {
                selectedOffering = offerings.first
            }

            let placement = placementID ?? "default"
            AppLogger.info("Loaded \(offerings.count) offerings for placement '\(placement)'", category: AppLogger.payments)
        } catch {
            errorMessage = "Unable to load subscription options. Please try again."
            AppLogger.error("Failed to load offerings: \(error)", category: AppLogger.payments)
        }

        isLoading = false
    }

    private func purchase() async {
        guard let offering = selectedOffering else { return }

        isPurchasing = true
        errorMessage = nil

        do {
            try await paymentsClient.purchase(productID: offering.id)
            AppLogger.info("Purchase successful", category: AppLogger.payments)

            // Notify parent that purchase completed
            onPurchaseComplete()
        } catch {
            if case PaymentsError.cancelled = error {
                // User cancelled, no error message needed
                AppLogger.info("Purchase cancelled by user", category: AppLogger.payments)
            } else {
                errorMessage = "Purchase failed. Please try again."
                AppLogger.error("Purchase failed: \(error)", category: AppLogger.payments)
            }
        }

        isPurchasing = false
    }

    private func restore() async {
        isPurchasing = true
        errorMessage = nil

        do {
            let state = try await paymentsClient.restore()

            if state.isSubscribed {
                AppLogger.info("Restore successful - subscription active", category: AppLogger.payments)
                onPurchaseComplete()
            } else {
                errorMessage = "No active subscription found."
                AppLogger.info("Restore complete but no active subscription", category: AppLogger.payments)
            }
        } catch {
            errorMessage = "Unable to restore purchases. Please try again."
            AppLogger.error("Restore failed: \(error)", category: AppLogger.payments)
        }

        isPurchasing = false
    }
}

// MARK: - Paywall Feature Row

struct PaywallFeatureRow: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: DSSpacing.md) {
            Image(systemName: icon)
                .font(.system(size: 18))
                .foregroundStyle(Color.acAmber500)
                .frame(width: 24)

            Text(text)
                .font(.system(size: 15))
                .foregroundStyle(Color.acForeground)

            Spacer()
        }
    }
}

// MARK: - Package Option Card

@available(iOS 17.0, *)
struct PackageOptionCard: View {

    let offering: PaymentsOffering
    let isSelected: Bool
    let onSelect: () -> Void

    private var isYearly: Bool {
        offering.packageType == .annual
    }

    private var isLifetime: Bool {
        offering.packageType == .lifetime
    }

    private var labelText: String {
        switch offering.packageType {
        case .annual: return "YEARLY"
        case .lifetime: return "LIFETIME"
        case .monthly: return "MONTHLY"
        default: return "SUBSCRIPTION"
        }
    }

    private var badgeText: String? {
        switch offering.packageType {
        case .annual: return "BEST VALUE"
        case .lifetime: return "ONE-TIME"
        default: return nil
        }
    }

    var body: some View {
        Button(action: {
            Haptics.tap()
            onSelect()
        }) {
            HStack {
                VStack(alignment: .leading, spacing: DSSpacing.xs) {
                    HStack(spacing: DSSpacing.sm) {
                        Text(labelText)
                            .font(.system(size: 11, weight: .bold))
                            .foregroundStyle(Color.acMutedForeground)

                        if let badge = badgeText {
                            Text(badge)
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(Color.acAmber500)
                                .padding(.horizontal, DSSpacing.sm)
                                .padding(.vertical, 2)
                                .background(
                                    Capsule()
                                        .fill(Color.acAmber500.opacity(0.15))
                                )
                        }
                    }

                    Text(offering.price)
                        .font(.system(size: 20, weight: .bold))
                        .foregroundStyle(Color.acForeground)

                    if let pricePerMonth = offering.pricePerMonth, isYearly {
                        Text("Just \(pricePerMonth)")
                            .font(.system(size: 12))
                            .foregroundStyle(Color.acMutedForeground)
                    }

                    if isLifetime {
                        Text("Pay once, own forever")
                            .font(.system(size: 12))
                            .foregroundStyle(Color.acMutedForeground)
                    }
                }

                Spacer()

                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 24))
                    .foregroundStyle(isSelected ? Color.acAmber500 : Color.acMutedForeground)
            }
            .padding(DSSpacing.lg)
            .background(
                RoundedRectangle(cornerRadius: 12)
                    .fill(isSelected ? Color.acAmber500.opacity(0.08) : Color.white.opacity(0.03))
            )
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(
                        isSelected ? Color.acAmber500 : Color.acCardBorder,
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(labelText.capitalized) \(isLifetime ? "purchase" : "subscription") for \(offering.price)")
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }
}

// MARK: - Preview

#if DEBUG
@available(iOS 17.0, *)
#Preview("HaloHome Paywall") {
    AstroCartoPaywallView(
        paymentsClient: PreviewMockPaymentsClient(),
        onPurchaseComplete: {}
    )
    .preferredColorScheme(.dark)
}

// Preview mock
private final class PreviewMockPaymentsClient: PaymentsClient, @unchecked Sendable {
    func configure(_ config: PaymentsConfig) {}

    func states() -> AsyncStream<PaymentsState> {
        AsyncStream { continuation in
            continuation.yield(PaymentsState(isSubscribed: false))
        }
    }

    func currentState() async -> PaymentsState {
        PaymentsState(isSubscribed: false)
    }

    func purchase(productID: String) async throws {
        try await Task.sleep(nanoseconds: 1_000_000_000)
    }

    @discardableResult
    func restore() async throws -> PaymentsState {
        try await Task.sleep(nanoseconds: 500_000_000)
        return PaymentsState(isSubscribed: false)
    }

    func prefetchOfferings() async {}

    func getOfferings() async throws -> [PaymentsOffering] {
        [
            PaymentsOffering(
                id: "$rc_annual",
                title: "Annual",
                price: "$99.99/year",
                pricePerMonth: "$8.33",
                packageType: .annual
            ),
            PaymentsOffering(
                id: "$rc_lifetime",
                title: "Lifetime",
                price: "$149.99",
                pricePerMonth: nil,
                packageType: .lifetime
            ),
            PaymentsOffering(
                id: "$rc_monthly",
                title: "Monthly",
                price: "$12.99/month",
                pricePerMonth: nil,
                packageType: .monthly
            )
        ]
    }

    @discardableResult
    func logIn(userID: String, email: String?, name: String?) async throws -> PaymentsState {
        PaymentsState(isSubscribed: false)
    }

    @discardableResult
    func logOut() async throws -> PaymentsState {
        PaymentsState(isSubscribed: false)
    }
}
#endif
