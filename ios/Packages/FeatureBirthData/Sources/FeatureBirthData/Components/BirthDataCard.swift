import SwiftUI
import DesignSystem

// MARK: - Birth Data Card

/// Card component for displaying saved birth chart summary
public struct BirthDataCard: View {

    // MARK: - Properties

    private let birthData: BirthData
    private let isDefault: Bool
    private let onTap: (() -> Void)?
    private let onEdit: (() -> Void)?
    private let onDelete: (() -> Void)?
    private let onSetDefault: (() -> Void)?

    // MARK: - State

    @State private var showingActions: Bool = false

    // MARK: - Initialization

    public init(
        birthData: BirthData,
        isDefault: Bool = false,
        onTap: (() -> Void)? = nil,
        onEdit: (() -> Void)? = nil,
        onDelete: (() -> Void)? = nil,
        onSetDefault: (() -> Void)? = nil
    ) {
        self.birthData = birthData
        self.isDefault = isDefault
        self.onTap = onTap
        self.onEdit = onEdit
        self.onDelete = onDelete
        self.onSetDefault = onSetDefault
    }

    // MARK: - Body

    public var body: some View {
        Button {
            Haptics.tap()
            onTap?()
        } label: {
            cardContent
        }
        .buttonStyle(CardPressStyle())
        .contextMenu {
            contextMenuContent
        }
        .confirmationDialog(
            "Chart Options",
            isPresented: $showingActions,
            titleVisibility: .visible
        ) {
            dialogContent
        }
    }

    // MARK: - Card Content

    private var cardContent: some View {
        HStack(spacing: DSSpacing.md) {
            // Avatar (unique per chart based on name + birth data)
            ChartAvatarView(birthData: birthData, size: 48)
                .accessibilityHidden(true)

            // Details
            VStack(alignment: .leading, spacing: DSSpacing.xs) {
                HStack(spacing: DSSpacing.xs) {
                    Text(birthData.name)
                        .font(DSTypography.titleM)
                        .foregroundStyle(DSColors.textPrimary)
                        .lineLimit(1)

                    if isDefault {
                        Image(systemName: "star.fill")
                            .font(.system(size: 12))
                            .foregroundStyle(DSColors.accentPrimary)
                            .accessibilityHidden(true)
                    }
                }

                Text(birthData.formattedDate)
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textSecondary)

                HStack(spacing: DSSpacing.xs) {
                    Image(systemName: "location.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(DSColors.textSecondary)
                        .accessibilityHidden(true)

                    Text(birthData.placeName)
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            // Time Badge
            VStack(alignment: .trailing, spacing: DSSpacing.xs) {
                Text(birthData.formattedTime)
                    .font(DSTypography.caption)
                    .foregroundStyle(birthData.isTimeUnknown ? DSColors.warning : DSColors.textSecondary)
                    .padding(.horizontal, DSSpacing.sm)
                    .padding(.vertical, DSSpacing.xs)
                    .background(
                        birthData.isTimeUnknown
                            ? DSColors.warning.opacity(0.15)
                            : DSColors.surface
                    )
                    .clipShape(.rect(cornerRadius: DSRadius.xs))

                Image(systemName: "chevron.right")
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(DSColors.textSecondary)
                    .accessibilityHidden(true)
            }
        }
        .padding(DSSpacing.lg)
        .background(DSColors.surfaceElevated)
        .clipShape(.rect(cornerRadius: DSRadius.card))
        .elevation(DSElevation.level1)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(birthData.name)\(isDefault ? ", default chart" : ""), \(birthData.formattedDate), \(birthData.formattedTime), \(birthData.placeName)")
    }

    // MARK: - Context Menu

    @ViewBuilder
    private var contextMenuContent: some View {
        Button {
            onTap?()
        } label: {
            Label("View Chart", systemImage: "chart.pie")
        }

        Button {
            onEdit?()
        } label: {
            Label("Edit", systemImage: "pencil")
        }

        if !isDefault {
            Button {
                onSetDefault?()
            } label: {
                Label("Set as Default", systemImage: "star")
            }
        }

        Divider()

        Button(role: .destructive) {
            onDelete?()
        } label: {
            Label("Delete", systemImage: "trash")
        }
    }

    // MARK: - Dialog Content

    @ViewBuilder
    private var dialogContent: some View {
        Button("View Chart") {
            onTap?()
        }

        Button("Edit") {
            onEdit?()
        }

        if !isDefault {
            Button("Set as Default") {
                onSetDefault?()
            }
        }

        Button("Delete", role: .destructive) {
            onDelete?()
        }

        Button("Cancel", role: .cancel) {}
    }
}

// MARK: - Card Press Style

private struct CardPressStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .opacity(configuration.isPressed ? 0.9 : 1.0)
            .animation(SAIMotion.quick, value: configuration.isPressed)
    }
}

// MARK: - Previews

#Preview("Birth Data Card") {
    VStack(spacing: DSSpacing.lg) {
        BirthDataCard(
            birthData: .sample,
            isDefault: true
        )

        BirthDataCard(
            birthData: .sampleUnknownTime,
            isDefault: false
        )
    }
    .padding(DSSpacing.lg)
    .background(DSColors.background)
}

#Preview("Birth Data Card - Dark") {
    BirthDataCard(
        birthData: .sample,
        isDefault: true
    )
    .padding(DSSpacing.lg)
    .background(DSColors.background)
    .preferredColorScheme(.dark)
}
