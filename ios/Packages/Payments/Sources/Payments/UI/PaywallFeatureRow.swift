import SwiftUI
import DesignSystem

/// A feature row for the paywall displaying a checkmark icon and feature text
///
/// Usage:
/// ```swift
/// PaywallFeatureRow(icon: "globe", text: "Unlimited astro lines")
/// PaywallFeatureRow(icon: "magnifyingglass", text: "Scout algorithm")
/// ```
public struct PaywallFeatureRow: View {

    private let icon: String
    private let text: String

    public init(icon: String, text: String) {
        self.icon = icon
        self.text = text
    }

    public var body: some View {
        HStack(spacing: DSSpacing.md) {
            Image(systemName: "checkmark.circle.fill")
                .font(.system(size: 20, weight: .medium))
                .foregroundStyle(accentGradient)
                .frame(width: 24)

            Text(text)
                .font(DSTypography.body)
                .foregroundStyle(DSColors.textPrimary)

            Spacer()
        }
    }

    private var accentGradient: LinearGradient {
        LinearGradient(
            colors: [DSColors.accentPrimary, DSColors.accentSecondary],
            startPoint: .topLeading,
            endPoint: .bottomTrailing
        )
    }
}

// MARK: - Preview

#Preview("Feature Rows") {
    VStack(alignment: .leading, spacing: DSSpacing.md) {
        PaywallFeatureRow(icon: "globe", text: "Unlimited astro lines")
        PaywallFeatureRow(icon: "magnifyingglass", text: "Scout algorithm (AI location ranking)")
        PaywallFeatureRow(icon: "person.2", text: "Duo mode (compatibility charts)")
        PaywallFeatureRow(icon: "bubble.left.and.bubble.right", text: "AI astrologer chat")
        PaywallFeatureRow(icon: "arrow.down.circle", text: "Offline calculations")
    }
    .padding(DSSpacing.lg)
    .background(DSColors.surface)
    .clipShape(RoundedRectangle(cornerRadius: DSRadius.lg))
    .padding(DSSpacing.xl)
    .background(DSColors.background)
}

#Preview("Dark Mode") {
    VStack(alignment: .leading, spacing: DSSpacing.md) {
        PaywallFeatureRow(icon: "globe", text: "Unlimited astro lines")
        PaywallFeatureRow(icon: "magnifyingglass", text: "Scout algorithm")
    }
    .padding(DSSpacing.lg)
    .background(DSColors.surface)
    .clipShape(RoundedRectangle(cornerRadius: DSRadius.lg))
    .padding(DSSpacing.xl)
    .background(DSColors.background)
    .preferredColorScheme(.dark)
}
