import SwiftUI
import DesignSystem

/// A selectable package card for the paywall
///
/// Displays subscription package information with:
/// - Package type label (Monthly/Yearly)
/// - "BEST VALUE" badge for annual plans
/// - Price with monthly equivalent for annual
/// - Selection indicator
///
/// Usage:
/// ```swift
/// PaywallPackageCard(
///     offering: offering,
///     isSelected: selectedOffering?.id == offering.id,
///     onSelect: { selectedOffering = offering }
/// )
/// ```
public struct PaywallPackageCard: View {

    private let offering: PaymentsOffering
    private let isSelected: Bool
    private let onSelect: () -> Void

    public init(
        offering: PaymentsOffering,
        isSelected: Bool,
        onSelect: @escaping () -> Void
    ) {
        self.offering = offering
        self.isSelected = isSelected
        self.onSelect = onSelect
    }

    public var body: some View {
        Button(action: {
            Haptics.tap()
            onSelect()
        }) {
            HStack {
                VStack(alignment: .leading, spacing: DSSpacing.xs) {
                    // Package type and badge
                    HStack(spacing: DSSpacing.sm) {
                        Text(packageTypeLabel)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(DSColors.textSecondary)
                            .textCase(.uppercase)

                        if isAnnual {
                            bestValueBadge
                        }
                    }

                    // Price
                    Text(offering.price)
                        .font(DSTypography.titleL)
                        .foregroundStyle(DSColors.textPrimary)

                    // Monthly equivalent for annual
                    if isAnnual, let monthlyPrice = offering.pricePerMonth {
                        Text("Just \(monthlyPrice)/month")
                            .font(DSTypography.caption)
                            .foregroundStyle(DSColors.textSecondary)
                    }
                }

                Spacer()

                // Selection indicator
                selectionIndicator
            }
            .padding(DSSpacing.lg)
            .background(cardBackground)
            .clipShape(RoundedRectangle(cornerRadius: DSRadius.lg))
            .overlay(cardBorder)
        }
        .buttonStyle(.plain)
        .accessibilityElement(children: .combine)
        .accessibilityLabel(accessibilityLabel)
        .accessibilityAddTraits(isSelected ? [.isSelected] : [])
    }

    // MARK: - Subviews

    private var bestValueBadge: some View {
        Text("BEST VALUE")
            .font(.system(size: 10, weight: .bold))
            .foregroundStyle(DSColors.accentPrimary)
            .padding(.horizontal, 8)
            .padding(.vertical, 4)
            .background(DSColors.accentPrimary.opacity(0.15))
            .clipShape(Capsule())
    }

    private var selectionIndicator: some View {
        ZStack {
            Circle()
                .strokeBorder(
                    isSelected ? DSColors.accentPrimary : DSColors.borderSubtle,
                    lineWidth: isSelected ? 2 : 1
                )
                .frame(width: 24, height: 24)

            if isSelected {
                Circle()
                    .fill(DSColors.accentPrimary)
                    .frame(width: 14, height: 14)
            }
        }
    }

    private var cardBackground: some View {
        Group {
            if isSelected {
                DSColors.accentPrimary.opacity(0.08)
            } else {
                DSColors.surface
            }
        }
    }

    private var cardBorder: some View {
        RoundedRectangle(cornerRadius: DSRadius.lg)
            .strokeBorder(
                isSelected ? DSColors.accentPrimary : DSColors.borderHairline,
                lineWidth: isSelected ? 2 : 1
            )
    }

    // MARK: - Computed Properties

    private var isAnnual: Bool {
        offering.packageType == .annual
    }

    private var packageTypeLabel: String {
        switch offering.packageType {
        case .monthly:
            return "Monthly"
        case .annual:
            return "Yearly"
        case .duoMonthly:
            return "Duo Monthly"
        case .duoAnnual:
            return "Duo Yearly"
        case .lifetime:
            return "Lifetime"
        case .unknown:
            return "Subscription"
        }
    }

    private var accessibilityLabel: String {
        var label = "\(packageTypeLabel) plan, \(offering.price)"
        if isAnnual, let monthlyPrice = offering.pricePerMonth {
            label += ", which is \(monthlyPrice) per month"
        }
        if isAnnual {
            label += ", best value"
        }
        if isSelected {
            label += ", selected"
        }
        return label
    }
}

// MARK: - Preview

#Preview("Package Cards") {
    VStack(spacing: DSSpacing.md) {
        PaywallPackageCard(
            offering: PaymentsOffering(
                id: "cartostar_yearly",
                title: "Yearly",
                price: "$49.99/year",
                pricePerMonth: "$4.17",
                packageType: .annual
            ),
            isSelected: true,
            onSelect: {}
        )

        PaywallPackageCard(
            offering: PaymentsOffering(
                id: "cartostar_monthly",
                title: "Monthly",
                price: "$6.99/month",
                pricePerMonth: nil,
                packageType: .monthly
            ),
            isSelected: false,
            onSelect: {}
        )
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
}

#Preview("Dark Mode") {
    VStack(spacing: DSSpacing.md) {
        PaywallPackageCard(
            offering: PaymentsOffering(
                id: "cartostar_yearly",
                title: "Yearly",
                price: "$49.99/year",
                pricePerMonth: "$4.17",
                packageType: .annual
            ),
            isSelected: true,
            onSelect: {}
        )

        PaywallPackageCard(
            offering: PaymentsOffering(
                id: "cartostar_monthly",
                title: "Monthly",
                price: "$6.99/month",
                pricePerMonth: nil,
                packageType: .monthly
            ),
            isSelected: false,
            onSelect: {}
        )
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
    .preferredColorScheme(.dark)
}
