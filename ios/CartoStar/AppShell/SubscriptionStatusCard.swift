import SwiftUI
import DesignSystem

/// Subscription status card component
/// Displays current subscription plan, status, and expiry information
struct SubscriptionStatusCard: View {
    
    let subscription: ProfileViewModel.SubscriptionInfo
    let onManageTap: () -> Void
    
    var body: some View {
        SAICard(style: .tinted) {
            VStack(alignment: .leading, spacing: DSSpacing.md) {
                // Header
                HStack {
                    Image(systemName: subscription.isActive ? "star.circle.fill" : "star.circle")
                        .font(.title2)
                        .foregroundStyle(subscription.isActive ? .orange : .gray)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: DSSpacing.sm) {
                            Text(subscription.planName ?? "Free")
                                .font(.headline)
                                .foregroundStyle(DSColors.textPrimary)
                            
                            if subscription.isActive {
                                SAITag("Pro", style: .success)
                            }
                        }
                        
                        Text(statusText)
                            .font(.caption)
                            .foregroundStyle(DSColors.textSecondary)
                    }
                    
                    Spacer()
                }
                
                // Expiry info (if applicable)
                if let expiryDate = subscription.expiryDate {
                    Divider()
                    
                    HStack {
                        Image(systemName: "calendar")
                            .font(.caption)
                            .foregroundStyle(DSColors.textSecondary)
                        
                        Text(expiryText(for: expiryDate))
                            .font(.subheadline)
                            .foregroundStyle(DSColors.textSecondary)
                    }
                }
                
                // Manage button
                SAIButton(
                    subscription.isActive ? "Manage Subscription" : "Upgrade to Pro",
                    style: subscription.isActive ? .secondary : .primary,
                    size: .md,
                    icon: Image(systemName: "arrow.right")
                ) {
                    onManageTap()
                }
            }
            .padding(DSSpacing.lg)
        }
    }
    
    // MARK: - Helpers
    
    private var statusText: String {
        if subscription.isActive {
            return subscription.willRenew ? "Active • Auto-renewing" : "Active • Expires soon"
        } else {
            return "Free plan • Upgrade for premium features"
        }
    }
    
    private func expiryText(for date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .full
        
        if subscription.willRenew {
            return "Renews \(formatter.localizedString(for: date, relativeTo: Date()))"
        } else {
            return "Expires \(formatter.localizedString(for: date, relativeTo: Date()))"
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview("Active Subscription") {
    VStack(spacing: DSSpacing.lg) {
        SubscriptionStatusCard(
            subscription: ProfileViewModel.SubscriptionInfo(
                isActive: true,
                planName: "Pro",
                expiryDate: Date().addingTimeInterval(30 * 24 * 60 * 60),
                willRenew: true
            ),
            onManageTap: { print("Manage tapped") }
        )
        
        SubscriptionStatusCard(
            subscription: ProfileViewModel.SubscriptionInfo(
                isActive: false,
                planName: "Free"
            ),
            onManageTap: { print("Upgrade tapped") }
        )
    }
    .padding()
    .background(DSColors.background)
}
#endif

