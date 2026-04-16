import SwiftUI
import DesignSystem
import Payments

/// Paywall screen for subscription
public struct PaywallView: View {
    
    @State private var viewModel: PaywallViewModel
    private let onClose: () -> Void
    
    public init(paymentsClient: PaymentsClient, onClose: @escaping () -> Void = {}) {
        self._viewModel = State(initialValue: PaywallViewModel(paymentsClient: paymentsClient))
        self.onClose = onClose
    }
    
    #if DEBUG
    init(viewModel: PaywallViewModel, onClose: @escaping () -> Void = {}) {
        self._viewModel = State(initialValue: viewModel)
        self.onClose = onClose
    }
    #endif
    
    public var body: some View {
        NavigationStack {
            ZStack {
                ScrollView {
                    if viewModel.isSubscribed {
                        // Already subscribed view
                        alreadySubscribedSection
                    } else {
                        // Normal paywall content
                        paywallContent
                    }
                }
                
                // Loading overlay
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
            .navigationTitle(viewModel.isSubscribed ? "Pro Status" : "Go Pro")
            .navigationBarTitleDisplayMode(.inline)
            .task {
                await viewModel.appear()
            }
        }
    }
    
    // MARK: - Already Subscribed Section
    
    private var alreadySubscribedSection: some View {
        VStack(spacing: DSSpacing.xl) {
            Spacer().frame(height: DSSpacing.xl)
            
            // Success checkmark
            ZStack {
                Circle()
                    .fill(Color.green.opacity(0.15))
                    .frame(width: 100, height: 100)
                
                Image(systemName: "checkmark.circle.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(.green)
            }
            
            Text("You're a Pro! 🎉")
                .font(.system(size: 28, weight: .bold, design: .rounded))
                .foregroundStyle(DSColors.textPrimary)
            
            Text("You have full access to all Pro features")
                .font(.system(size: 16))
                .foregroundStyle(DSColors.textSecondary)
            
            // Feature list showing what they have
            VStack(spacing: DSSpacing.lg) {
                FeatureRow(icon: "checkmark.circle.fill", title: "Advanced AI", description: "Access to enhanced AI models")
                FeatureRow(icon: "checkmark.circle.fill", title: "Faster Processing", description: "Priority queue enabled")
                FeatureRow(icon: "checkmark.circle.fill", title: "Unlimited Usage", description: "No limits on your usage")
            }
            .padding(.horizontal, DSSpacing.xl)
            .padding(.vertical, DSSpacing.lg)
            
            Spacer()
            
            // Action buttons
            VStack(spacing: DSSpacing.lg) {
                Button {
                    onClose()
                } label: {
                    Text("Continue")
                        .frame(maxWidth: .infinity)
                        .padding(DSSpacing.xl)
                        .background(DSColors.primary)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: DSSpacing.lg))
                }
                
                Button {
                    SubscriptionManager.openManageSubscriptions()
                } label: {
                    Text("Manage Subscription")
                        .frame(maxWidth: .infinity)
                        .padding(DSSpacing.xl)
                        .background(Color.clear)
                        .foregroundStyle(DSColors.textPrimary)
                        .overlay(
                            RoundedRectangle(cornerRadius: DSSpacing.lg)
                                .stroke(DSColors.separator, lineWidth: 1)
                        )
                }
            }
            .padding(.horizontal, DSSpacing.xl)
            .padding(.bottom, DSSpacing.xl)
        }
    }
    
    // MARK: - Paywall Content
    
    private var paywallContent: some View {
        VStack(spacing: DSSpacing.xl) {
            // Header
            VStack(spacing: DSSpacing.lg) {
                Image(systemName: "lock.fill")
                    .font(.system(size: 60))
                    .foregroundStyle(DSColors.primary)
                
                Text("Go Pro")
                    .titleText()
                    .foregroundStyle(DSColors.textPrimary)
                
                Text("Unlock premium features")
                    .bodyText()
                    .foregroundStyle(DSColors.textSecondary)
            }
            .padding(.top, DSSpacing.xl)
            
            // Features
            VStack(spacing: DSSpacing.lg) {
                FeatureRow(icon: "sparkles", title: "Advanced AI", description: "Get smarter responses with enhanced models")
                FeatureRow(icon: "bolt.fill", title: "Faster Processing", description: "Priority queue for quicker results")
                FeatureRow(icon: "infinity", title: "Unlimited Usage", description: "No daily limits or restrictions")
            }
            .padding(.horizontal, DSSpacing.xl)
            
            // Plan Selection
            if !viewModel.offerings.isEmpty {
                VStack(spacing: DSSpacing.md) {
                    Text("Choose Your Plan")
                        .bodyText()
                        .fontWeight(.semibold)
                        .foregroundStyle(DSColors.textPrimary)
                    
                    ForEach(viewModel.offerings) { offering in
                        PlanOptionCard(
                            offering: offering,
                            isSelected: viewModel.selectedOffering?.id == offering.id,
                            onSelect: {
                                viewModel.selectOffering(offering)
                            }
                        )
                    }
                }
                .padding(.horizontal, DSSpacing.xl)
            }
            
            // Subscription info
            VStack(spacing: DSSpacing.xs) {
                Text("Cancel anytime")
                    .footnoteText()
                    .fontWeight(.medium)
                    .foregroundStyle(DSColors.textPrimary)
                
                Text("Subscription auto-renews until cancelled")
                    .footnoteText()
                    .foregroundStyle(DSColors.textSecondary)
            }
            
            // Error banner
            if let errorMessage = viewModel.errorMessage {
                HStack(spacing: DSSpacing.md) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(.red)
                    Text(errorMessage)
                        .footnoteText()
                        .foregroundStyle(.red)
                        .multilineTextAlignment(.leading)
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(DSSpacing.lg)
                .background(
                    RoundedRectangle(cornerRadius: DSSpacing.md)
                        .fill(Color.red.opacity(0.12))
                )
                .padding(.horizontal, DSSpacing.xl)
                .accessibilityLabel("Error")
                .accessibilityAddTraits(.updatesFrequently)
                .accessibilityIdentifier("paywallErrorBanner")
            }
            
            // Action buttons
            VStack(spacing: DSSpacing.lg) {
                Button {
                    Task {
                        await viewModel.purchase()
                    }
                } label: {
                    Text("Subscribe")
                        .frame(maxWidth: .infinity)
                        .padding(DSSpacing.xl)
                        .background(DSColors.primary)
                        .foregroundStyle(.white)
                        .clipShape(RoundedRectangle(cornerRadius: DSSpacing.lg))
                }
                .disabled(viewModel.isLoading)
                .accessibilityIdentifier("paywallSubscribeButton")
                
                Button {
                    Task {
                        await viewModel.restore()
                    }
                } label: {
                    Text("Restore Purchases")
                        .frame(maxWidth: .infinity)
                        .padding(DSSpacing.xl)
                        .background(Color.clear)
                        .foregroundStyle(DSColors.textPrimary)
                        .overlay(
                            RoundedRectangle(cornerRadius: DSSpacing.lg)
                                .stroke(DSColors.separator, lineWidth: 1)
                        )
                }
                .disabled(viewModel.isLoading)
                .accessibilityIdentifier("paywallRestoreButton")
                
                Button("Maybe later") {
                    onClose()
                }
                .foregroundStyle(DSColors.textSecondary)
                .disabled(viewModel.isLoading)
            }
            .padding(.horizontal, DSSpacing.xl)
            .padding(.bottom, DSSpacing.xl)
        }
    }
}

// MARK: - Feature Row Component

private struct FeatureRow: View {
    let icon: String
    let title: String
    let description: String
    
    var body: some View {
        HStack(spacing: DSSpacing.lg) {
            Image(systemName: icon)
                .font(.title2)
                .foregroundStyle(DSColors.primary)
                .frame(width: 32)
            
            VStack(alignment: .leading, spacing: DSSpacing.xs) {
                Text(title)
                    .bodyText()
                    .foregroundStyle(DSColors.textPrimary)
                
                Text(description)
                    .footnoteText()
                    .foregroundStyle(DSColors.textSecondary)
            }
            
            Spacer()
        }
        .accessibilityElement(children: .combine)
    }
}

// MARK: - Plan Option Card Component

private struct PlanOptionCard: View {
    let offering: PaymentsOffering
    let isSelected: Bool
    let onSelect: () -> Void
    
    var body: some View {
        Button(action: onSelect) {
            HStack(spacing: DSSpacing.lg) {
                VStack(alignment: .leading, spacing: DSSpacing.xs) {
                    Text(offering.title)
                        .bodyText()
                        .fontWeight(.semibold)
                        .foregroundStyle(DSColors.textPrimary)
                    
                    if let pricePerMonth = offering.pricePerMonth {
                        Text(pricePerMonth)
                            .footnoteText()
                            .foregroundStyle(DSColors.textSecondary)
                    }
                }
                
                Spacer()
                
                Text(offering.price)
                    .headlineText()
                    .foregroundStyle(DSColors.primary)
                
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(isSelected ? DSColors.primary : DSColors.separator)
            }
            .padding(DSSpacing.lg)
            .background(
                RoundedRectangle(cornerRadius: DSSpacing.md)
                    .fill(DSColors.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: DSSpacing.md)
                            .stroke(isSelected ? DSColors.primary : DSColors.separator, lineWidth: 2)
                    )
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(offering.title) plan for \(offering.price)")
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }
}

#if DEBUG
// MARK: - Preview Helpers

@MainActor
private func createPreviewPaymentsClient() -> PaymentsClient {
    MockPaymentsClient()
}

private final class MockPaymentsClient: PaymentsClient, @unchecked Sendable {
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
        try await Task.sleep(nanoseconds: 1_000_000_000) // 1 second delay
    }
    
    @discardableResult
    func restore() async throws -> PaymentsState {
        try await Task.sleep(nanoseconds: 500_000_000) // 0.5 second delay
        return PaymentsState(isSubscribed: false)
    }
    
    func prefetchOfferings() async {}
    
    func getOfferings() async throws -> [PaymentsOffering] {
        [
            PaymentsOffering(
                id: "$rc_monthly",
                title: "Monthly",
                price: "$12.99",
                pricePerMonth: nil,
                packageType: .monthly
            ),
            PaymentsOffering(
                id: "$rc_annual",
                title: "Annual",
                price: "$99.99",
                pricePerMonth: "$8.33",
                packageType: .annual
            ),
            PaymentsOffering(
                id: "$rc_lifetime",
                title: "Lifetime",
                price: "$149.99",
                pricePerMonth: nil,
                packageType: .lifetime
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

// MARK: - Previews

#Preview("Default") {
    PaywallView(paymentsClient: createPreviewPaymentsClient())
}

#Preview("Loading") {
    let vm = PaywallViewModel(paymentsClient: createPreviewPaymentsClient())
    vm.isLoading = true
    return PaywallView(viewModel: vm)
}

#Preview("Error") {
    let vm = PaywallViewModel(paymentsClient: createPreviewPaymentsClient())
    vm.errorMessage = "Unable to connect to App Store. Please check your internet connection."
    return PaywallView(viewModel: vm)
}
#endif
