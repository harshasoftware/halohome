import SwiftUI
import DesignSystem
import Core

/// CartoStar hard paywall with 3-day free trial
///
/// A full-screen paywall that blocks access to the app until the user:
/// - Starts a 3-day free trial
/// - Subscribes directly
/// - Restores a previous purchase
///
/// Features:
/// - Dark cosmic theme matching web design
/// - Package selection (monthly/yearly)
/// - Feature list with checkmarks
/// - Purchase button with loading state
/// - Restore purchases and Terms/Privacy links
///
/// Usage:
/// ```swift
/// if !subscriptionState.isSubscribed {
///     AstroCartoPaywall(
///         paymentsClient: paymentsClient,
///         onSubscribed: { dismiss() }
///     )
/// }
/// ```
public struct AstroCartoPaywall: View {

    // MARK: - State

    @State private var offerings: [PaymentsOffering] = []
    @State private var selectedOffering: PaymentsOffering?
    @State private var isLoading: Bool = true
    @State private var isPurchasing: Bool = false
    @State private var isRestoring: Bool = false
    @State private var errorMessage: String?
    @State private var showError: Bool = false

    // MARK: - Dependencies

    private let paymentsClient: PaymentsClient
    private let onSubscribed: () -> Void

    // MARK: - Constants

    private let termsURL = URL(string: "https://cartostar.app/terms-of-service")!
    private let privacyURL = URL(string: "https://cartostar.app/privacy-policy")!
    private let eulaURL = URL(string: "https://cartostar.app/eula")!

    // MARK: - Initialization

    public init(
        paymentsClient: PaymentsClient,
        onSubscribed: @escaping () -> Void
    ) {
        self.paymentsClient = paymentsClient
        self.onSubscribed = onSubscribed
    }

    // MARK: - Body

    public var body: some View {
        ZStack {
            // Background gradient - dark cosmic theme
            backgroundGradient
                .ignoresSafeArea()

            ScrollView {
                VStack(spacing: DSSpacing.xl) {
                    // Header
                    headerSection
                        .padding(.top, DSSpacing.xl)

                    // Features
                    featuresSection

                    // Packages
                    packagesSection

                    // CTA Button
                    ctaSection

                    // Footer
                    footerSection

                    // Legal text
                    legalText
                        .padding(.bottom, DSSpacing.xl)
                }
                .padding(.horizontal, DSSpacing.xl)
            }
        }
        .task {
            await loadOfferings()
        }
        .alert("Error", isPresented: $showError) {
            Button("OK", role: .cancel) {
                errorMessage = nil
            }
        } message: {
            if let errorMessage = errorMessage {
                Text(errorMessage)
            }
        }
    }

    // MARK: - Subviews

    private var backgroundGradient: some View {
        LinearGradient(
            colors: [
                Color(red: 0.08, green: 0.10, blue: 0.16), // Deep navy
                Color(red: 0.12, green: 0.08, blue: 0.20)  // Cosmic purple tint
            ],
            startPoint: .top,
            endPoint: .bottom
        )
    }

    private var headerSection: some View {
        VStack(spacing: DSSpacing.lg) {
            // Globe icon with gradient
            Image(systemName: "globe.americas.fill")
                .font(.system(size: 64, weight: .medium))
                .foregroundStyle(
                    LinearGradient(
                        colors: [
                            Color(red: 1.0, green: 0.75, blue: 0.4),  // Amber/gold
                            Color(red: 0.6, green: 0.4, blue: 1.0)   // Purple
                        ],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .shadow(color: Color(red: 1.0, green: 0.75, blue: 0.4).opacity(0.3), radius: 20)
                .accessibilityHidden(true)

            VStack(spacing: DSSpacing.sm) {
                Text("Unlock Your Full")
                    .font(.acSerifDisplay)
                    .foregroundStyle(.white)

                Text("Cosmic Potential")
                    .font(.acSerifDisplay)
                    .foregroundStyle(
                        LinearGradient(
                            colors: [
                                Color(red: 1.0, green: 0.75, blue: 0.4),
                                Color(red: 1.0, green: 0.6, blue: 0.5)
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                    )
            }
            .multilineTextAlignment(.center)
            .accessibilityElement(children: .combine)
        }
    }

    private var featuresSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            featureRow(icon: "globe", text: "Unlimited astro lines")
            featureRow(icon: "magnifyingglass", text: "Scout algorithm (AI location ranking)")
            featureRow(icon: "bubble.left.and.bubble.right", text: "AI astrologer chat")
            featureRow(icon: "arrow.down.circle", text: "Offline calculations")

            if let selected = selectedOffering, selected.packageType.hasDuoAccess {
                featureRow(icon: "person.2.fill", text: "Duo mode (compatibility charts)", highlighted: true)
                featureRow(icon: "sparkles", text: "100 AI questions / month", highlighted: true)
            } else {
                featureRow(icon: "person.2", text: "50 AI questions / month")
            }
        }
        .padding(DSSpacing.lg)
        .background(Color.white.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: DSRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DSRadius.lg)
                .strokeBorder(Color.white.opacity(0.1), lineWidth: 1)
        )
        .animation(.easeInOut(duration: 0.2), value: selectedOffering?.packageType)
    }

    private func featureRow(icon: String, text: String, highlighted: Bool = false) -> some View {
        HStack(spacing: DSSpacing.md) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 20, weight: .medium))
                .foregroundStyle(
                    LinearGradient(
                        colors: highlighted
                            ? [Color(red: 0.6, green: 0.4, blue: 1.0), Color(red: 0.8, green: 0.5, blue: 1.0)]
                            : [Color(red: 1.0, green: 0.75, blue: 0.4), Color(red: 1.0, green: 0.6, blue: 0.5)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    )
                )
                .frame(width: 24)
                .accessibilityHidden(true)

            Text(text)
                .font(DSTypography.body)
                .foregroundStyle(highlighted ? .white : .white.opacity(0.9))

            Spacer()
        }
    }

    private var packagesSection: some View {
        VStack(spacing: DSSpacing.md) {
            if isLoading {
                VStack(spacing: DSSpacing.md) {
                    ProgressView()
                        .tint(.white)
                    Text("Loading plans...")
                        .font(DSTypography.caption)
                        .foregroundStyle(.white.opacity(0.6))
                }
                .frame(height: 150)
            } else if offerings.isEmpty {
                Text("No subscription plans available")
                    .font(DSTypography.body)
                    .foregroundStyle(.white.opacity(0.6))
                    .frame(height: 150)
            } else {
                // Sort offerings: Duo Annual (primary) → Annual → Lifetime → Duo Monthly → Monthly
                let sortedOfferings = offerings.sorted { o1, o2 in
                    let order: [PaymentsOffering.PackageType: Int] = [
                        .duoAnnual: 0, .annual: 1, .lifetime: 2, .duoMonthly: 3, .monthly: 4
                    ]
                    return (order[o1.packageType] ?? 5) < (order[o2.packageType] ?? 5)
                }

                ForEach(sortedOfferings) { offering in
                    packageCard(for: offering)
                }
            }
        }
    }

    private func packageCard(for offering: PaymentsOffering) -> some View {
        let isSelected = selectedOffering?.id == offering.id
        let isDuo = offering.packageType == .duoAnnual || offering.packageType == .duoMonthly
        let isAnnualType = offering.packageType == .annual || offering.packageType == .duoAnnual
        let isLifetime = offering.packageType == .lifetime
        let isPrimary = offering.packageType == .duoAnnual

        let accentColor = isDuo
            ? Color(red: 0.6, green: 0.4, blue: 1.0)
            : Color(red: 1.0, green: 0.75, blue: 0.4)

        let badgeText: String? = {
            switch offering.packageType {
            case .duoAnnual: return "BEST VALUE"
            case .annual: return "POPULAR"
            case .lifetime: return "ONE-TIME"
            default: return nil
            }
        }()

        let duoBadge: Bool = offering.packageType.hasDuoAccess

        let labelText: String = {
            switch offering.packageType {
            case .duoAnnual: return "DUO YEARLY"
            case .duoMonthly: return "DUO MONTHLY"
            case .annual: return "YEARLY"
            case .lifetime: return "LIFETIME"
            case .monthly: return "MONTHLY"
            default: return "SUBSCRIPTION"
            }
        }()

        return Button {
            Haptics.tap()
            selectedOffering = offering
        } label: {
            HStack {
                VStack(alignment: .leading, spacing: DSSpacing.xs) {
                    HStack(spacing: DSSpacing.sm) {
                        Text(labelText)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(.white.opacity(0.6))

                        if let badge = badgeText {
                            Text(badge)
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(accentColor)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(accentColor.opacity(0.15))
                                .clipShape(Capsule())
                        }

                        if duoBadge {
                            Text("DUO MODE")
                                .font(.system(size: 10, weight: .bold))
                                .foregroundStyle(Color(red: 0.6, green: 0.4, blue: 1.0))
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color(red: 0.6, green: 0.4, blue: 1.0).opacity(0.15))
                                .clipShape(Capsule())
                        }
                    }

                    Text(offering.price)
                        .font(DSTypography.titleL)
                        .foregroundStyle(.white)

                    if isAnnualType, let monthlyPrice = offering.pricePerMonth {
                        Text("Just \(monthlyPrice)/month")
                            .font(DSTypography.caption)
                            .foregroundStyle(.white.opacity(0.6))
                    }

                    if isLifetime {
                        Text("Pay once, own forever")
                            .font(DSTypography.caption)
                            .foregroundStyle(.white.opacity(0.6))
                    }
                }

                Spacer()

                // Selection indicator
                ZStack {
                    Circle()
                        .strokeBorder(
                            isSelected ? accentColor : Color.white.opacity(0.3),
                            lineWidth: isSelected ? 2 : 1
                        )
                        .frame(width: 24, height: 24)

                    if isSelected {
                        Circle()
                            .fill(accentColor)
                            .frame(width: 14, height: 14)
                    }
                }
            }
            .padding(DSSpacing.lg)
            .background(
                isSelected
                    ? accentColor.opacity(0.1)
                    : Color.white.opacity(isPrimary ? 0.08 : 0.05)
            )
            .clipShape(RoundedRectangle(cornerRadius: DSRadius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: DSRadius.lg)
                    .strokeBorder(
                        isSelected ? accentColor : (isPrimary ? accentColor.opacity(0.3) : Color.white.opacity(0.1)),
                        lineWidth: isSelected ? 2 : 1
                    )
            )
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(packageAccessibilityLabel(for: offering, isSelected: isSelected))
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    private func packageAccessibilityLabel(for offering: PaymentsOffering, isSelected: Bool) -> String {
        let type: String = {
            switch offering.packageType {
            case .duoAnnual: return "Duo Yearly"
            case .duoMonthly: return "Duo Monthly"
            case .annual: return "Yearly"
            case .lifetime: return "Lifetime"
            case .monthly: return "Monthly"
            default: return "Subscription"
            }
        }()
        var label = "\(type) plan, \(offering.price)"
        if let monthly = offering.pricePerMonth {
            label += ", \(monthly) per month"
        }
        if offering.packageType == .duoAnnual {
            label += ", best value, includes duo mode"
        }
        if offering.packageType == .annual {
            label += ", popular"
        }
        if offering.packageType.hasDuoAccess {
            label += ", includes duo mode"
        }
        if offering.packageType == .lifetime {
            label += ", one-time purchase"
        }
        if isSelected {
            label += ", selected"
        }
        return label
    }

    private var isLifetimeSelected: Bool {
        selectedOffering?.packageType == .lifetime
    }

    private var ctaButtonText: String {
        if isLifetimeSelected {
            return "Purchase Lifetime Access"
        }
        return "Start 3-Day Free Trial"
    }

    private var ctaSection: some View {
        Button {
            Task {
                await purchase()
            }
        } label: {
            HStack(spacing: DSSpacing.sm) {
                if isPurchasing {
                    ProgressView()
                        .tint(Color(red: 0.08, green: 0.10, blue: 0.16))
                } else {
                    Text(ctaButtonText)
                        .saiScaledFont(size: 18, weight: .semibold, relativeTo: .headline)
                }
            }
            .frame(maxWidth: .infinity)
            .frame(height: 56)
            .background(
                LinearGradient(
                    colors: [
                        Color(red: 1.0, green: 0.75, blue: 0.4),
                        Color(red: 1.0, green: 0.6, blue: 0.5)
                    ],
                    startPoint: .leading,
                    endPoint: .trailing
                )
            )
            .foregroundStyle(Color(red: 0.08, green: 0.10, blue: 0.16))
            .clipShape(Capsule())
        }
        .disabled(selectedOffering == nil || isPurchasing || isRestoring)
        .opacity((selectedOffering == nil || isPurchasing || isRestoring) ? 0.6 : 1.0)
        .accessibilityLabel(ctaButtonText)
        .accessibilityHint(selectedOffering == nil ? "Select a plan first" : isLifetimeSelected ? "Double tap to purchase lifetime access" : "Double tap to start your free trial")
    }

    private var footerSection: some View {
        HStack(spacing: DSSpacing.md) {
            Button {
                Task {
                    await restore()
                }
            } label: {
                if isRestoring {
                    ProgressView()
                        .tint(.white.opacity(0.6))
                        .scaleEffect(0.8)
                } else {
                    Text("Restore Purchases")
                        .font(DSTypography.caption)
                        .foregroundStyle(.white.opacity(0.6))
                }
            }
            .disabled(isRestoring || isPurchasing)

            Text("\u{2022}")
                .foregroundStyle(.white.opacity(0.4))

            Link("Terms", destination: termsURL)
                .font(DSTypography.caption)
                .foregroundStyle(.white.opacity(0.6))

            Text("\u{2022}")
                .foregroundStyle(.white.opacity(0.4))

            Link("Privacy", destination: privacyURL)
                .font(DSTypography.caption)
                .foregroundStyle(.white.opacity(0.6))

            Text("\u{2022}")
                .foregroundStyle(.white.opacity(0.4))

            Link("EULA", destination: eulaURL)
                .font(DSTypography.caption)
                .foregroundStyle(.white.opacity(0.6))
        }
    }

    private var legalText: some View {
        Text("Payment will be charged to your Apple ID account at the confirmation of purchase. Subscriptions automatically renew unless canceled at least 24 hours before the end of the current period. Your account will be charged for renewal within 24 hours prior to the end of the current period. You can manage and cancel your subscriptions by going to your account settings on the App Store after purchase. Lifetime purchases are a one-time, non-recurring charge and are non-refundable.")
            .font(.system(size: 10))
            .foregroundStyle(.white.opacity(0.4))
            .multilineTextAlignment(.center)
            .padding(.horizontal, DSSpacing.md)
    }

    // MARK: - Actions

    private func loadOfferings() async {
        isLoading = true
        errorMessage = nil

        do {
            offerings = try await paymentsClient.getOfferings()

            // Auto-select duo annual plan (best value / primary CTA)
            if let duoAnnual = offerings.first(where: { $0.packageType == .duoAnnual }) {
                selectedOffering = duoAnnual
            } else if let annual = offerings.first(where: { $0.packageType == .annual }) {
                selectedOffering = annual
            } else {
                selectedOffering = offerings.first
            }
        } catch {
            AppLogger.error("Failed to load offerings: \(error)", category: AppLogger.payments)
            errorMessage = "Unable to load subscription plans. Please check your connection and try again."
            showError = true
        }

        isLoading = false
    }

    private func purchase() async {
        guard let offering = selectedOffering else { return }

        isPurchasing = true
        errorMessage = nil

        do {
            try await paymentsClient.purchase(productID: offering.id)

            // Check if subscription is now active
            let state = await paymentsClient.currentState()
            if state.isSubscribed || state.activeEntitlementIDs.contains("premium") || state.activeEntitlementIDs.contains("premium_duo") {
                Haptics.success()
                onSubscribed()
            }
        } catch let error as PaymentsError {
            switch error {
            case .cancelled:
                // User cancelled, no error message needed
                AppLogger.info("Purchase cancelled by user", category: AppLogger.payments)
            case .purchaseNotAllowed:
                Haptics.error()
                errorMessage = "Purchases are not allowed on this device."
                showError = true
            case .network:
                Haptics.error()
                errorMessage = "Network error. Please check your connection and try again."
                showError = true
            case .notConfigured:
                Haptics.error()
                errorMessage = "Subscription service not configured. Please try again later."
                showError = true
            case .server(let message):
                Haptics.error()
                errorMessage = message ?? "Server error. Please try again later."
                showError = true
            case .unknown:
                Haptics.error()
                errorMessage = "An unexpected error occurred. Please try again."
                showError = true
            }
        } catch {
            Haptics.error()
            errorMessage = "An unexpected error occurred. Please try again."
            showError = true
            AppLogger.error("Unexpected purchase error: \(error)", category: AppLogger.payments)
        }

        isPurchasing = false
    }

    private func restore() async {
        isRestoring = true
        errorMessage = nil

        do {
            let state = try await paymentsClient.restore()

            if state.isSubscribed || state.activeEntitlementIDs.contains("premium") || state.activeEntitlementIDs.contains("premium_duo") {
                Haptics.success()
                onSubscribed()
            } else {
                Haptics.warning()
                errorMessage = "No active subscription found. Please subscribe to continue."
                showError = true
            }
        } catch let error as PaymentsError {
            switch error {
            case .cancelled:
                AppLogger.info("Restore cancelled by user", category: AppLogger.payments)
            case .network:
                Haptics.error()
                errorMessage = "Network error. Please check your connection and try again."
                showError = true
            default:
                Haptics.error()
                errorMessage = "Unable to restore purchases. Please try again."
                showError = true
            }
        } catch {
            Haptics.error()
            errorMessage = "Unable to restore purchases. Please try again."
            showError = true
            AppLogger.error("Unexpected restore error: \(error)", category: AppLogger.payments)
        }

        isRestoring = false
    }
}

// MARK: - Preview

#Preview("Paywall - Loading") {
    AstroCartoPaywall(
        paymentsClient: MockPaymentsClient(offerings: [], delay: 5.0),
        onSubscribed: {}
    )
}

#Preview("Paywall - With Plans") {
    AstroCartoPaywall(
        paymentsClient: MockPaymentsClient(
            offerings: [
                PaymentsOffering(
                    id: "com.cartostar.duo.annual",
                    title: "Duo Annual",
                    price: "$79.99/year",
                    pricePerMonth: "$6.67",
                    packageType: .duoAnnual
                ),
                PaymentsOffering(
                    id: "com.cartostar.pro.annual",
                    title: "Annual",
                    price: "$59.99/year",
                    pricePerMonth: "$5.00",
                    packageType: .annual
                ),
                PaymentsOffering(
                    id: "com.cartostar.lifetime",
                    title: "Lifetime",
                    price: "$199.00",
                    pricePerMonth: nil,
                    packageType: .lifetime
                ),
                PaymentsOffering(
                    id: "com.cartostar.duo.monthly",
                    title: "Duo Monthly",
                    price: "$14.99/month",
                    pricePerMonth: nil,
                    packageType: .duoMonthly
                ),
                PaymentsOffering(
                    id: "com.cartostar.pro.monthly",
                    title: "Monthly",
                    price: "$9.99/month",
                    pricePerMonth: nil,
                    packageType: .monthly
                )
            ],
            delay: 0.5
        ),
        onSubscribed: {}
    )
}

// MARK: - Mock Client for Previews

private final class MockPaymentsClient: PaymentsClient, @unchecked Sendable {
    private let mockOfferings: [PaymentsOffering]
    private let delay: TimeInterval

    init(offerings: [PaymentsOffering], delay: TimeInterval = 0) {
        self.mockOfferings = offerings
        self.delay = delay
    }

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
        try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
    }

    func restore() async throws -> PaymentsState {
        try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
        return PaymentsState(isSubscribed: false)
    }

    func prefetchOfferings() async {}

    func getOfferings() async throws -> [PaymentsOffering] {
        try await Task.sleep(nanoseconds: UInt64(delay * 1_000_000_000))
        return mockOfferings
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
