import SwiftUI
import DesignSystem

/// Pre-prompt screen explaining the value of location access
/// Shown before the system permission dialog
@available(iOS 17.0, *)
public struct LocationPermissionView: View {
    let onContinue: () -> Void
    let onSkip: () -> Void

    public init(
        onContinue: @escaping () -> Void,
        onSkip: @escaping () -> Void
    ) {
        self.onContinue = onContinue
        self.onSkip = onSkip
    }

    public var body: some View {
        VStack(spacing: DSSpacing.xl) {
            Spacer()

            // Icon
            Image(systemName: "location.circle.fill")
                .font(.system(size: 64))
                .foregroundStyle(DSColors.brandPrimary)

            // Title
            Text("Enable Location")
                .font(DSTypography.titleL)
                .foregroundStyle(DSColors.textPrimary)

            // Description
            Text("CartoStar uses your location to provide personalized planetary insights.")
                .font(DSTypography.body)
                .foregroundStyle(DSColors.textTertiary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DSSpacing.xl)

            // Benefits
            VStack(alignment: .leading, spacing: DSSpacing.md) {
                benefitRow(
                    icon: "globe.americas.fill",
                    title: "Detect Planetary Zones",
                    subtitle: "Know which planetary lines influence your current location"
                )
                benefitRow(
                    icon: "book.fill",
                    title: "Journal Prompts",
                    subtitle: "Get prompted to journal after 7+ days at a location"
                )
                benefitRow(
                    icon: "bell.fill",
                    title: "Zone Notifications",
                    subtitle: "Be notified when you enter a new planetary zone"
                )
            }
            .padding(DSSpacing.lg)
            .background(DSColors.surfaceElevated)
            .clipShape(.rect(cornerRadius: DSRadius.card))
            .padding(.horizontal, DSSpacing.lg)

            Spacer()

            // CTA
            VStack(spacing: DSSpacing.md) {
                Button {
                    onContinue()
                } label: {
                    Text("Enable Location")
                        .font(DSTypography.titleS)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, DSSpacing.md)
                        .background(DSColors.brandPrimary)
                        .clipShape(.rect(cornerRadius: DSRadius.card))
                }

                Button("Not Now") {
                    onSkip()
                }
                .font(DSTypography.body)
                .foregroundStyle(DSColors.textTertiary)
            }
            .padding(.horizontal, DSSpacing.lg)
            .padding(.bottom, DSSpacing.xl)
        }
        .background(DSColors.background)
    }

    @ViewBuilder
    private func benefitRow(icon: String, title: String, subtitle: String) -> some View {
        HStack(alignment: .top, spacing: DSSpacing.md) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundStyle(DSColors.brandPrimary)
                .frame(width: 28)
            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(DSTypography.body)
                    .fontWeight(.medium)
                    .foregroundStyle(DSColors.textPrimary)
                Text(subtitle)
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.textTertiary)
            }
        }
    }
}
