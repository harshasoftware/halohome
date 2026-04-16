import SwiftUI
import DesignSystem

/// Prompt to upgrade from WhenInUse → Always location permission
/// Explains the value of background zone detection
@available(iOS 17.0, *)
public struct LocationPermissionUpgradeView: View {
    let onUpgrade: () -> Void
    let onSkip: () -> Void

    public init(
        onUpgrade: @escaping () -> Void,
        onSkip: @escaping () -> Void
    ) {
        self.onUpgrade = onUpgrade
        self.onSkip = onSkip
    }

    public var body: some View {
        VStack(spacing: DSSpacing.xl) {
            Spacer()

            // Icon
            Image(systemName: "location.fill.viewfinder")
                .font(.system(size: 56))
                .foregroundStyle(DSColors.brandPrimary)

            // Title
            Text("Background Location")
                .font(DSTypography.titleL)
                .foregroundStyle(DSColors.textPrimary)

            // Description
            VStack(spacing: DSSpacing.sm) {
                Text("Allow \"Always\" location access to unlock background features:")
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textTertiary)
                    .multilineTextAlignment(.center)

                VStack(alignment: .leading, spacing: DSSpacing.sm) {
                    upgradePoint("Automatic zone detection when you travel")
                    upgradePoint("Journal prompts based on how long you stay")
                    upgradePoint("No continuous GPS — battery-friendly monitoring")
                }
                .padding(.top, DSSpacing.sm)
            }
            .padding(.horizontal, DSSpacing.xl)

            // Privacy note
            HStack(spacing: DSSpacing.sm) {
                Image(systemName: "lock.shield.fill")
                    .foregroundStyle(DSColors.textTertiary)
                Text("Your location data stays on your device and in your private account. We never share or sell location data.")
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.textTertiary)
            }
            .padding(DSSpacing.md)
            .background(DSColors.surface)
            .clipShape(.rect(cornerRadius: DSRadius.card))
            .padding(.horizontal, DSSpacing.lg)

            Spacer()

            // CTA
            VStack(spacing: DSSpacing.md) {
                Button {
                    onUpgrade()
                } label: {
                    Text("Allow Always")
                        .font(DSTypography.titleS)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, DSSpacing.md)
                        .background(DSColors.brandPrimary)
                        .clipShape(.rect(cornerRadius: DSRadius.card))
                }

                Button("Keep Current Setting") {
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
    private func upgradePoint(_ text: String) -> some View {
        HStack(alignment: .top, spacing: DSSpacing.sm) {
            Image(systemName: "checkmark.circle.fill")
                .font(.caption)
                .foregroundStyle(DSColors.brandPrimary)
            Text(text)
                .font(DSTypography.body)
                .foregroundStyle(DSColors.textTertiary)
        }
    }
}
