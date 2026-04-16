import SwiftUI
import DesignSystem

/// View displaying compatibility analysis results - top compatible locations for a couple
public struct CompatibilityResultsView: View {

    // MARK: - Properties

    public let analysis: CompatibilityAnalysis
    public let mode: CompatibilityMode
    public let person1Name: String
    public let person2Name: String

    /// Callback when user taps on a location (for zooming/navigating)
    public var onLocationTap: ((CompatibleLocation) -> Void)?

    /// Callback when user wants city info
    public var onLocationInfoTap: ((CompatibleLocation) -> Void)?

    // MARK: - Initialization

    public init(
        analysis: CompatibilityAnalysis,
        mode: CompatibilityMode,
        person1Name: String,
        person2Name: String,
        onLocationTap: ((CompatibleLocation) -> Void)? = nil,
        onLocationInfoTap: ((CompatibleLocation) -> Void)? = nil
    ) {
        self.analysis = analysis
        self.mode = mode
        self.person1Name = person1Name
        self.person2Name = person2Name
        self.onLocationTap = onLocationTap
        self.onLocationInfoTap = onLocationInfoTap
    }

    // MARK: - Body

    public var body: some View {
        ScrollView {
            LazyVStack(spacing: DSSpacing.md) {
                // Stats summary
                statsSummary
                    .padding(.horizontal, DSSpacing.lg)
                    .padding(.top, DSSpacing.md)

                // Location cards
                if analysis.topLocations.isEmpty {
                    emptyStateView
                        .padding(.top, DSSpacing.xl)
                } else {
                    // Common Best Places section
                    sectionHeader(title: "Common Best Places", icon: "star.fill", color: .green)
                        .padding(.horizontal, DSSpacing.lg)
                        .padding(.top, DSSpacing.md)

                    ForEach(Array(bestPlaces.enumerated()), id: \.element.id) { index, location in
                        LocationCard(
                            location: location,
                            rank: index + 1,
                            person1Name: person1Name,
                            person2Name: person2Name,
                            isBestPlace: true,
                            onTap: { onLocationTap?(location) },
                            onInfoTap: { onLocationInfoTap?(location) }
                        )
                        .padding(.horizontal, DSSpacing.lg)
                    }

                    // Places to Avoid section (if any)
                    if !placesToAvoid.isEmpty {
                        sectionHeader(title: "Places to Avoid", icon: "exclamationmark.triangle.fill", color: .orange)
                            .padding(.horizontal, DSSpacing.lg)
                            .padding(.top, DSSpacing.lg)

                        ForEach(placesToAvoid, id: \.id) { location in
                            LocationCard(
                                location: location,
                                rank: nil,
                                person1Name: person1Name,
                                person2Name: person2Name,
                                isBestPlace: false,
                                onTap: { onLocationTap?(location) },
                                onInfoTap: { onLocationInfoTap?(location) }
                            )
                            .padding(.horizontal, DSSpacing.lg)
                        }
                    }
                }
            }
            .padding(.bottom, DSSpacing.xl)
        }
    }

    // MARK: - Computed Properties

    /// Top locations with high combined scores (best places)
    private var bestPlaces: [CompatibleLocation] {
        analysis.topLocations.filter { $0.combinedScore >= 60 }.prefix(10).map { $0 }
    }

    /// Locations with challenging aspects (places to potentially avoid)
    private var placesToAvoid: [CompatibleLocation] {
        analysis.topLocations.filter { $0.combinedScore < 40 }.prefix(5).map { $0 }
    }

    // MARK: - Section Header

    private func sectionHeader(title: String, icon: String, color: Color) -> some View {
        HStack(spacing: DSSpacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(color)

            Text(title)
                .font(.system(size: 17, weight: .semibold))
                .foregroundStyle(DSColors.textPrimary)

            Spacer()
        }
    }

    // MARK: - Stats Summary

    private var statsSummary: some View {
        HStack(spacing: DSSpacing.lg) {
            StatBadge(
                icon: "arrow.triangle.branch",
                value: "\(analysis.totalIntersections)",
                label: "intersections"
            )

            StatBadge(
                icon: "mappin.and.ellipse",
                value: "\(analysis.topLocations.count)",
                label: "destinations"
            )
        }
        .padding(DSSpacing.md)
        .background(Color.pink.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: DSRadius.lg))
        .overlay(
            RoundedRectangle(cornerRadius: DSRadius.lg)
                .strokeBorder(Color.pink.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Empty State

    private var emptyStateView: some View {
        VStack(spacing: DSSpacing.lg) {
            ZStack {
                Circle()
                    .fill(DSColors.surface)
                    .frame(width: 64, height: 64)

                Image(systemName: "mappin.slash")
                    .font(.system(size: 28, weight: .light))
                    .foregroundStyle(DSColors.textSecondary)
            }

            VStack(spacing: DSSpacing.sm) {
                Text("No intersections found")
                    .font(DSTypography.titleM)
                    .foregroundStyle(DSColors.textPrimary)

                Text("Your astrocartography lines don't cross at the moment. Try adjusting birth data or exploring different line types.")
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, DSSpacing.xl)
            }
        }
        .padding(.vertical, DSSpacing.xl)
    }
}

// MARK: - Stat Badge

private struct StatBadge: View {
    let icon: String
    let value: String
    let label: String

    var body: some View {
        HStack(spacing: DSSpacing.sm) {
            Image(systemName: icon)
                .font(.system(size: 14))
                .foregroundStyle(.pink)

            Text(value)
                .font(.system(size: 15, weight: .bold))
                .foregroundStyle(.pink) +
            Text(" \(label)")
                .font(.system(size: 15))
                .foregroundStyle(Color.pink.opacity(0.8))
        }
    }
}

// MARK: - Location Card

private struct LocationCard: View {
    let location: CompatibleLocation
    let rank: Int?
    let person1Name: String
    let person2Name: String
    var isBestPlace: Bool = true
    let onTap: () -> Void
    let onInfoTap: () -> Void

    var body: some View {
        Button(action: onTap) {
            VStack(alignment: .leading, spacing: DSSpacing.md) {
                // Header row with rank and score
                HStack(alignment: .top) {
                    if let rank = rank {
                        rankBadge(rank)
                    } else {
                        avoidBadge
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        // City name
                        Text(location.displayName)
                            .font(DSTypography.body.weight(.semibold))
                            .foregroundStyle(DSColors.textPrimary)

                        // Coordinates
                        HStack(spacing: DSSpacing.xs) {
                            Image(systemName: "mappin")
                                .font(.system(size: 10))

                            Text(String(format: "%.4f, %.4f", location.coordinate.latitude, location.coordinate.longitude))
                                .font(.system(size: 11))
                        }
                        .foregroundStyle(DSColors.accentPrimary)
                    }

                    Spacer()

                    // Score badge
                    scoreBadge
                }

                // Lines for each person
                VStack(alignment: .leading, spacing: DSSpacing.xs) {
                    linesRow(label: person1Name, lines: location.person1Lines)
                    linesRow(label: person2Name, lines: location.person2Lines)
                }

                // Themes
                if !location.themes.isEmpty {
                    themesRow
                }

                // Interpretation
                if !location.interpretation.isEmpty {
                    Text(location.interpretation)
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                        .lineLimit(2)
                }

                // City Info button
                Button(action: onInfoTap) {
                    HStack {
                        Image(systemName: "info.circle")
                            .font(.system(size: 14))

                        Text("View City Info")
                            .font(DSTypography.caption.weight(.medium))
                    }
                    .foregroundStyle(DSColors.accentPrimary)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, DSSpacing.sm)
                    .background(DSColors.accentPrimary.opacity(0.08))
                    .clipShape(RoundedRectangle(cornerRadius: DSRadius.sm))
                }
            }
            .padding(DSSpacing.md)
            .background(DSColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: DSRadius.lg))
            .overlay(
                RoundedRectangle(cornerRadius: DSRadius.lg)
                    .strokeBorder(DSColors.borderHairline, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    // MARK: - Rank Badge

    @ViewBuilder
    private func rankBadge(_ rank: Int) -> some View {
        ZStack {
            Circle()
                .fill(rankBackground(rank))
                .frame(width: 32, height: 32)

            if rank == 1 {
                Image(systemName: "trophy.fill")
                    .font(.system(size: 14))
                    .foregroundStyle(.yellow)
            } else {
                Text("\(rank)")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(rankForeground(rank))
            }
        }
    }

    private var avoidBadge: some View {
        ZStack {
            Circle()
                .fill(Color.orange.opacity(0.15))
                .frame(width: 32, height: 32)

            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 14))
                .foregroundStyle(.orange)
        }
    }

    private func rankBackground(_ rank: Int) -> Color {
        switch rank {
        case 1: return Color.yellow.opacity(0.15)
        case 2: return Color.gray.opacity(0.15)
        case 3: return Color.orange.opacity(0.15)
        default: return DSColors.surface
        }
    }

    private func rankForeground(_ rank: Int) -> Color {
        switch rank {
        case 1: return .yellow
        case 2: return .gray
        case 3: return .orange
        default: return DSColors.textSecondary
        }
    }

    // MARK: - Score Badge

    private var scoreBadge: some View {
        let scoreColor: Color = isBestPlace ? .pink : .orange

        return HStack(spacing: 4) {
            Image(systemName: isBestPlace ? "sparkles" : "exclamationmark.circle")
                .font(.system(size: 12))

            Text("\(location.combinedScore)")
                .font(.system(size: 14, weight: .bold))
        }
        .foregroundStyle(scoreColor)
        .padding(.horizontal, DSSpacing.sm)
        .padding(.vertical, 4)
        .background(scoreColor.opacity(0.1))
        .clipShape(Capsule())
    }

    // MARK: - Lines Row

    private func linesRow(label: String, lines: [CompatibleLocation.LineInfo]) -> some View {
        HStack(spacing: DSSpacing.xs) {
            Text("\(label):")
                .font(.system(size: 11))
                .foregroundStyle(DSColors.textSecondary)

            ForEach(Array(lines.prefix(3).enumerated()), id: \.offset) { _, line in
                linePill(line)
            }
        }
    }

    private func linePill(_ line: CompatibleLocation.LineInfo) -> some View {
        Text(line.shortName)
            .font(.system(size: 10, weight: .medium))
            .foregroundStyle(planetColor(line.planet))
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(planetColor(line.planet).opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: 4))
    }

    private func planetColor(_ planet: Planet) -> Color {
        switch planet {
        case .sun: return .yellow
        case .moon: return .gray
        case .mercury: return .orange
        case .venus: return .pink
        case .mars: return .red
        case .jupiter: return .purple
        case .saturn: return .brown
        case .uranus: return .cyan
        case .neptune: return .blue
        case .pluto: return .indigo
        case .chiron: return .pink
        case .northNode: return .purple
        case .southNode: return Color(red: 0.545, green: 0.0, blue: 0.545)
        }
    }

    // MARK: - Themes Row

    private var themesRow: some View {
        HStack(spacing: DSSpacing.xs) {
            ForEach(location.themes, id: \.self) { theme in
                Text(theme)
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(DSColors.textSecondary)
                    .padding(.horizontal, DSSpacing.sm)
                    .padding(.vertical, 2)
                    .background(DSColors.surface)
                    .clipShape(Capsule())
                    .overlay(
                        Capsule().strokeBorder(DSColors.borderSubtle, lineWidth: 1)
                    )
            }
        }
    }
}

// MARK: - Preview

#Preview("Compatibility Results") {
    CompatibilityResultsView(
        analysis: CompatibilityAnalysis(
            mode: .honeymoon,
            person1Name: "You",
            person2Name: "Alex",
            topLocations: [
                CompatibleLocation(
                    coordinate: GlobeCoordinate(latitude: 48.8566, longitude: 2.3522),
                    cityName: "Paris",
                    country: "France",
                    person1Score: 85,
                    person2Score: 90,
                    combinedScore: 92,
                    overlapBonus: 15,
                    person1Lines: [
                        .init(planet: .venus, lineType: .ascendant, distance: 45),
                        .init(planet: .moon, lineType: .midheaven, distance: 80)
                    ],
                    person2Lines: [
                        .init(planet: .sun, lineType: .descendant, distance: 30),
                        .init(planet: .jupiter, lineType: .imumCoeli, distance: 90)
                    ],
                    interpretation: "Your Venus and Moon lines meet their Sun and Jupiter lines here. Strong emotional and romantic resonance for romantic connection.",
                    themes: ["Romance", "Growth"]
                ),
                CompatibleLocation(
                    coordinate: GlobeCoordinate(latitude: 41.9028, longitude: 12.4964),
                    cityName: "Rome",
                    country: "Italy",
                    person1Score: 78,
                    person2Score: 82,
                    combinedScore: 84,
                    overlapBonus: 10,
                    person1Lines: [
                        .init(planet: .sun, lineType: .ascendant, distance: 60)
                    ],
                    person2Lines: [
                        .init(planet: .venus, lineType: .midheaven, distance: 50)
                    ],
                    interpretation: "A place where your energies align beautifully.",
                    themes: ["Success", "Romance"]
                )
            ],
            totalIntersections: 12
        ),
        mode: .honeymoon,
        person1Name: "You",
        person2Name: "Alex"
    )
    .preferredColorScheme(.dark)
}

#Preview("Empty Results") {
    CompatibilityResultsView(
        analysis: .empty,
        mode: .honeymoon,
        person1Name: "You",
        person2Name: "Alex"
    )
    .preferredColorScheme(.dark)
}
