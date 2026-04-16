import SwiftUI
import DesignSystem

/// Create or edit a journal entry
@available(iOS 17.0, *)
public struct JournalEntryView: View {
    @Bindable var viewModel: JournalViewModel
    @Environment(\.dismiss) private var dismiss

    public init(viewModel: JournalViewModel) {
        self.viewModel = viewModel
    }

    private var isEditing: Bool {
        viewModel.selectedEntry != nil
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: DSSpacing.lg) {
                    // Location info
                    if let entry = viewModel.selectedEntry {
                        locationSection(placeName: entry.placeName, daysStayed: entry.daysStayed)
                    }

                    // Planetary influences
                    if !viewModel.detectedInfluences.isEmpty {
                        influencesSection
                    } else if viewModel.isDetectingInfluences {
                        HStack(spacing: DSSpacing.sm) {
                            ProgressView()
                            Text("Detecting planetary influences...")
                                .font(DSTypography.body)
                                .foregroundStyle(DSColors.textTertiary)
                        }
                        .padding(.horizontal, DSSpacing.lg)
                    }

                    // Journal text
                    VStack(alignment: .leading, spacing: DSSpacing.sm) {
                        Text("Your Experience")
                            .font(DSTypography.titleS)
                            .foregroundStyle(DSColors.textPrimary)
                        TextEditor(text: $viewModel.draftText)
                            .frame(minHeight: 150)
                            .padding(DSSpacing.sm)
                            .background(DSColors.surface)
                            .clipShape(.rect(cornerRadius: DSRadius.card))
                            .overlay(
                                RoundedRectangle(cornerRadius: DSRadius.card)
                                    .strokeBorder(DSColors.borderHairline, lineWidth: 1)
                            )
                    }
                    .padding(.horizontal, DSSpacing.lg)

                    // Mood picker
                    moodSection

                    // Privacy toggles
                    privacySection
                }
                .padding(.vertical, DSSpacing.lg)
            }
            .background(DSColors.background)
            .navigationTitle(isEditing ? "Edit Entry" : "New Entry")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") { dismiss() }
                        .foregroundStyle(DSColors.textTertiary)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Save") {
                        Task {
                            let entry = viewModel.selectedEntry
                            await viewModel.saveDraft(
                                userId: entry?.userId ?? "",
                                latitude: entry?.latitude ?? 0,
                                longitude: entry?.longitude ?? 0,
                                placeName: entry?.placeName ?? "Unknown",
                                daysStayed: entry?.daysStayed ?? 0,
                                stayStartDate: entry?.stayStartDate
                            )
                            dismiss()
                        }
                    }
                    .fontWeight(.semibold)
                    .foregroundStyle(DSColors.brandPrimary)
                }
            }
        }
    }

    @ViewBuilder
    private func locationSection(placeName: String, daysStayed: Int) -> some View {
        VStack(alignment: .leading, spacing: DSSpacing.xs) {
            HStack(spacing: DSSpacing.sm) {
                Image(systemName: "mappin.circle.fill")
                    .foregroundStyle(DSColors.brandPrimary)
                Text(placeName)
                    .font(DSTypography.titleS)
                    .foregroundStyle(DSColors.textPrimary)
            }
            if daysStayed > 0 {
                Text("\(daysStayed) days at this location")
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.textTertiary)
            }
        }
        .padding(.horizontal, DSSpacing.lg)
    }

    @ViewBuilder
    private var influencesSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.sm) {
            Text("Planetary Influences")
                .font(DSTypography.titleS)
                .foregroundStyle(DSColors.textPrimary)

            FlowLayout(spacing: DSSpacing.xs) {
                ForEach(viewModel.detectedInfluences) { influence in
                    HStack(spacing: 4) {
                        Text(influence.planet)
                            .fontWeight(.medium)
                        Text(influence.lineType)
                        Text(String(format: "%.0f km", influence.distanceKm))
                            .foregroundStyle(DSColors.textTertiary)
                    }
                    .font(DSTypography.caption)
                    .padding(.horizontal, DSSpacing.sm)
                    .padding(.vertical, 4)
                    .background(DSColors.surfaceTinted)
                    .clipShape(Capsule())
                    .foregroundStyle(DSColors.textTertiary)
                }
            }
        }
        .padding(.horizontal, DSSpacing.lg)
    }

    @ViewBuilder
    private var moodSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.sm) {
            Text("How do you feel here?")
                .font(DSTypography.titleS)
                .foregroundStyle(DSColors.textPrimary)

            HStack(spacing: DSSpacing.md) {
                ForEach(1...5, id: \.self) { value in
                    Button {
                        viewModel.draftMood = value
                    } label: {
                        Image(systemName: value <= (viewModel.draftMood ?? 0) ? "star.fill" : "star")
                            .font(.title2)
                            .foregroundStyle(value <= (viewModel.draftMood ?? 0) ? Color.yellow : DSColors.textTertiary)
                    }
                }
            }
        }
        .padding(.horizontal, DSSpacing.lg)
    }

    @ViewBuilder
    private var privacySection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.sm) {
            Text("Privacy")
                .font(DSTypography.titleS)
                .foregroundStyle(DSColors.textPrimary)

            Toggle(isOn: $viewModel.draftIsPublic) {
                VStack(alignment: .leading) {
                    Text("Share publicly")
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textPrimary)
                    Text("Allow others to see this entry")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textTertiary)
                }
            }
            .tint(DSColors.brandPrimary)

            Toggle(isOn: $viewModel.draftConsentForAITraining) {
                VStack(alignment: .leading) {
                    Text("AI training consent")
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textPrimary)
                    Text("Help improve CartoStar's AI insights")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textTertiary)
                }
            }
            .tint(DSColors.brandPrimary)
        }
        .padding(.horizontal, DSSpacing.lg)
    }
}

// MARK: - Flow Layout

/// Simple flow layout for wrapping tags
private struct FlowLayout: Layout {
    var spacing: CGFloat

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = arrange(proposal: proposal, subviews: subviews)
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = arrange(proposal: proposal, subviews: subviews)
        for (index, position) in result.positions.enumerated() {
            subviews[index].place(at: CGPoint(x: bounds.minX + position.x, y: bounds.minY + position.y), proposal: .unspecified)
        }
    }

    private struct ArrangeResult {
        var size: CGSize
        var positions: [CGPoint]
    }

    private func arrange(proposal: ProposedViewSize, subviews: Subviews) -> ArrangeResult {
        let maxWidth = proposal.width ?? .infinity
        var positions: [CGPoint] = []
        var x: CGFloat = 0
        var y: CGFloat = 0
        var rowHeight: CGFloat = 0
        var maxX: CGFloat = 0

        for subview in subviews {
            let size = subview.sizeThatFits(.unspecified)
            if x + size.width > maxWidth && x > 0 {
                x = 0
                y += rowHeight + spacing
                rowHeight = 0
            }
            positions.append(CGPoint(x: x, y: y))
            rowHeight = max(rowHeight, size.height)
            x += size.width + spacing
            maxX = max(maxX, x)
        }

        return ArrangeResult(
            size: CGSize(width: maxX, height: y + rowHeight),
            positions: positions
        )
    }
}
