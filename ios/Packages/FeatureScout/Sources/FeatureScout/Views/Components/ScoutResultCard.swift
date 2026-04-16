import SwiftUI
import DesignSystem

/// Card displaying a scout location result
public struct ScoutResultCard: View {

    let location: ScoutLocation
    let rank: Int
    let category: ScoutCategory

    @State private var isExpanded: Bool = false

    public init(
        location: ScoutLocation,
        rank: Int,
        category: ScoutCategory
    ) {
        self.location = location
        self.rank = rank
        self.category = category
    }

    public var body: some View {
        SAICard(style: .elevated) {
            VStack(alignment: .leading, spacing: DSSpacing.md) {
                // Header row
                HStack(alignment: .top, spacing: DSSpacing.md) {
                    // Rank badge
                    rankBadge
                        .accessibilityHidden(true)

                    // City info
                    VStack(alignment: .leading, spacing: DSSpacing.xs) {
                        HStack(spacing: DSSpacing.xs) {
                            Text(location.countryFlag)

                            Text(location.cityName)
                                .font(DSTypography.titleM)
                                .foregroundStyle(DSColors.textPrimary)
                        }

                        Text(location.country)
                            .font(DSTypography.caption)
                            .foregroundStyle(DSColors.textSecondary)
                    }

                    Spacer()

                    // Score badge
                    ScoreBadge(
                        score: location.score,
                        nature: location.nature
                    )
                    .accessibilityHidden(true)
                }

                // Influence pills
                if !location.influences.isEmpty {
                    influencePills
                }

                // Expanded details
                if isExpanded {
                    expandedContent
                        .transition(.opacity.combined(with: .move(edge: .top)))
                }

                // Expand/collapse button
                if !location.influences.isEmpty {
                    Button {
                        withAnimation(SAIMotion.quick) {
                            isExpanded.toggle()
                        }
                        Haptics.tap()
                    } label: {
                        HStack {
                            Text(isExpanded ? "Show Less" : "Show Details")
                                .font(DSTypography.caption)
                                .foregroundStyle(DSColors.accentPrimary)

                            Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                                .font(.system(size: 12, weight: .medium))
                                .foregroundStyle(DSColors.accentPrimary)
                        }
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel(isExpanded ? "Collapse details" : "Expand details")
                }
            }
            .padding(DSSpacing.lg)
        }
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Rank \(rank), \(location.cityName), \(location.country), score \(Int(location.score)), \(location.nature.rawValue)")
    }

    // MARK: - Components

    private var rankBadge: some View {
        ZStack {
            Circle()
                .fill(rankColor)
                .frame(width: 32, height: 32)

            Text("\(rank)")
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(.white)
        }
    }

    private var rankColor: Color {
        switch rank {
        case 1: return Color(.systemYellow).opacity(0.9)
        case 2: return Color(.systemGray)
        case 3: return Color(.brown).opacity(0.8)
        default: return DSColors.accentPrimary.opacity(0.6)
        }
    }

    private var influencePills: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DSSpacing.xs) {
                ForEach(location.influences.prefix(3)) { influence in
                    InfluencePill(influence: influence, nature: location.nature)
                }

                if location.influences.count > 3 {
                    Text("+\(location.influences.count - 3)")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                        .padding(.horizontal, DSSpacing.sm)
                        .padding(.vertical, DSSpacing.xs)
                        .background(DSColors.surface)
                        .clipShape(.rect(cornerRadius: DSRadius.sm))
                }
            }
        }
    }

    private var expandedContent: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            Divider()
                .foregroundStyle(DSColors.borderHairline)

            // Score breakdown
            HStack(spacing: DSSpacing.lg) {
                scoreMetric(label: "Benefit", value: location.benefitScore, color: DSColors.success)
                scoreMetric(label: "Intensity", value: location.intensityScore, color: DSColors.accentPrimary)
                scoreMetric(label: "Volatility", value: location.volatilityScore, color: DSColors.warning)
            }

            if location.mixedFlag {
                HStack(spacing: DSSpacing.xs) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .font(.system(size: 12))
                        .foregroundStyle(DSColors.warning)
                    Text("Mixed influences — both beneficial and challenging energies")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                }
            }

            // All influences
            if !location.influences.isEmpty {
                Text("Nearby Lines")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(DSColors.textSecondary)

                ForEach(location.influences) { influence in
                    HStack(spacing: DSSpacing.sm) {
                        Circle()
                            .fill(DSColors.accentPrimary.opacity(0.2))
                            .frame(width: 24, height: 24)
                            .overlay {
                                Image(systemName: "line.diagonal")
                                    .font(.system(size: 10, weight: .bold))
                                    .foregroundStyle(DSColors.accentPrimary)
                            }

                        VStack(alignment: .leading, spacing: 2) {
                            Text(influence.lineKey)
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(DSColors.textPrimary)

                            Text("\(Int(influence.distanceKm)) km away")
                                .font(DSTypography.caption)
                                .foregroundStyle(DSColors.textSecondary)
                        }

                        Spacer()
                    }
                }
            }
        }
    }

    private func scoreMetric(label: String, value: Double, color: Color) -> some View {
        VStack(spacing: 2) {
            Text(String(format: "%.0f", value))
                .font(.system(size: 16, weight: .bold, design: .rounded))
                .foregroundStyle(color)
            Text(label)
                .font(.system(size: 11))
                .foregroundStyle(DSColors.textSecondary)
        }
    }
}

// MARK: - Score Badge

public struct ScoreBadge: View {

    let score: Double
    let nature: LocationNature

    public init(score: Double, nature: LocationNature) {
        self.score = score
        self.nature = nature
    }

    public var body: some View {
        HStack(spacing: DSSpacing.xs) {
            Image(systemName: iconName)
                .font(.system(size: 12, weight: .bold))

            Text("\(Int(score))")
                .font(.system(size: 14, weight: .bold, design: .rounded))
        }
        .foregroundStyle(foregroundColor)
        .padding(.horizontal, DSSpacing.sm)
        .padding(.vertical, DSSpacing.xs)
        .background(backgroundColor)
        .clipShape(.rect(cornerRadius: DSRadius.sm))
    }

    private var iconName: String {
        switch nature {
        case .beneficial: return "arrow.up.right"
        case .challenging: return "arrow.down.right"
        case .mixed: return "arrow.left.arrow.right"
        }
    }

    private var foregroundColor: Color {
        switch nature {
        case .beneficial: return DSColors.success
        case .challenging: return DSColors.danger
        case .mixed: return DSColors.warning
        }
    }

    private var backgroundColor: Color {
        foregroundColor.opacity(0.15)
    }
}

// MARK: - Influence Pill

public struct InfluencePill: View {

    let influence: ScoutInfluence
    let nature: LocationNature

    public init(influence: ScoutInfluence, nature: LocationNature = .beneficial) {
        self.influence = influence
        self.nature = nature
    }

    public var body: some View {
        Text(influence.lineKey)
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(pillColor)
            .padding(.horizontal, DSSpacing.sm)
            .padding(.vertical, DSSpacing.xs)
            .background(pillColor.opacity(0.12))
            .clipShape(.rect(cornerRadius: DSRadius.sm))
    }

    private var pillColor: Color {
        switch nature {
        case .beneficial: return DSColors.success
        case .challenging: return DSColors.danger
        case .mixed: return DSColors.warning
        }
    }
}
