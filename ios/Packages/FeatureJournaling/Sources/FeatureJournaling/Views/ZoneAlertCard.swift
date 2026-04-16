import SwiftUI
import DesignSystem

/// Card displayed when a user enters a new planetary zone
@available(iOS 17.0, *)
public struct ZoneAlertCard: View {
    let planet: String
    let lineType: String
    let interpretation: String?
    let onDismiss: () -> Void
    let onJournal: () -> Void

    public init(
        planet: String,
        lineType: String,
        interpretation: String? = nil,
        onDismiss: @escaping () -> Void,
        onJournal: @escaping () -> Void
    ) {
        self.planet = planet
        self.lineType = lineType
        self.interpretation = interpretation
        self.onDismiss = onDismiss
        self.onJournal = onJournal
    }

    public var body: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            // Header
            HStack {
                Image(systemName: "location.circle.fill")
                    .font(.title2)
                    .foregroundStyle(DSColors.brandPrimary)
                VStack(alignment: .leading, spacing: 2) {
                    Text("New Planetary Zone")
                        .font(DSTypography.titleS)
                        .foregroundStyle(DSColors.textPrimary)
                    Text("\(planet) \(lineType)")
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.brandPrimary)
                }
                Spacer()
                Button { onDismiss() } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title3)
                        .foregroundStyle(DSColors.textTertiary)
                }
            }

            // Interpretation
            if let interpretation {
                Text(interpretation)
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textTertiary)
                    .lineLimit(3)
            }

            // Action
            Button {
                onJournal()
            } label: {
                Text("Journal This")
                    .font(DSTypography.body)
                    .fontWeight(.medium)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, DSSpacing.sm)
                    .background(DSColors.brandPrimary)
                    .clipShape(.rect(cornerRadius: DSRadius.card))
            }
        }
        .padding(DSSpacing.lg)
        .background(DSColors.surfaceElevated)
        .clipShape(.rect(cornerRadius: DSRadius.card))
    }
}
