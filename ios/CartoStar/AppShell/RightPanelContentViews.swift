import SwiftUI
import DesignSystem
import Core
import FeatureGlobe

// MARK: - Location Info Content

/// Content for the location info panel, showing city details and active lines.
@available(iOS 17.0, *)
struct LocationInfoContent: View {

    let cityId: String

    var body: some View {
        VStack(alignment: .leading, spacing: DSSpacing.xl) {
            // City name and country
            VStack(alignment: .leading, spacing: DSSpacing.xs) {
                Text("Sample City")
                    .saiScaledFont(size: 24, weight: .bold, relativeTo: .title2)
                    .foregroundStyle(DSColors.textPrimary)

                Text("Country Name")
                    .saiScaledFont(size: 15, relativeTo: .subheadline)
                    .foregroundStyle(DSColors.textSecondary)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Sample City, Country Name")
            .accessibilityAddTraits(.isHeader)

            // Score card
            ScoreCard(
                score: 85,
                label: "Overall Match",
                description: "This location has strong planetary alignments for your chart."
            )

            // Line summary
            VStack(alignment: .leading, spacing: DSSpacing.md) {
                Text("Active Lines")
                    .saiScaledFont(size: 14, weight: .semibold, relativeTo: .caption)
                    .foregroundStyle(DSColors.textSecondary)
                    .accessibilityAddTraits(.isHeader)

                ForEach(sampleLines, id: \.name) { line in
                    LineRow(line: line)
                }
            }

            // Weather section placeholder
            WeatherCard()

            Spacer(minLength: DSSpacing.xl)
        }
    }

    private var sampleLines: [LineData] {
        [
            LineData(name: "Sun MC", type: "mc", influence: .positive),
            LineData(name: "Jupiter ASC", type: "asc", influence: .positive),
            LineData(name: "Saturn DSC", type: "dsc", influence: .challenging)
        ]
    }
}

// MARK: - Line Info Content

/// Content for the line info panel, showing planet and line type details.
@available(iOS 17.0, *)
struct LineInfoContent: View {

    let planet: String
    let lineType: String

    var body: some View {
        VStack(alignment: .leading, spacing: DSSpacing.xl) {
            // Planet icon and name
            HStack(spacing: DSSpacing.lg) {
                planetIcon
                    .font(.system(size: 48))

                VStack(alignment: .leading, spacing: DSSpacing.xs) {
                    Text("\(planet) \(lineType.uppercased())")
                        .font(.system(size: 22, weight: .bold))
                        .foregroundStyle(DSColors.textPrimary)

                    Text(lineTypeDescription)
                        .font(.system(size: 14))
                        .foregroundStyle(DSColors.textSecondary)
                }
            }

            // Description
            Text(lineDescription)
                .font(.system(size: 15))
                .foregroundStyle(DSColors.textPrimary)
                .lineSpacing(4)

            // Themes section
            VStack(alignment: .leading, spacing: DSSpacing.md) {
                Text("Key Themes")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(DSColors.textSecondary)

                FlowLayout(spacing: DSSpacing.sm) {
                    ForEach(themes, id: \.self) { theme in
                        ThemeChip(label: theme)
                    }
                }
            }

            Spacer(minLength: DSSpacing.xl)
        }
    }

    @ViewBuilder
    private var planetIcon: some View {
        if let p = Planet(rawValue: planet) {
            Text(p.symbol)
                .foregroundStyle(p.cardColor)
        } else {
            Image(systemName: "star.fill")
                .foregroundStyle(DSColors.textSecondary)
        }
    }

    private var lineTypeDescription: String {
        switch lineType.lowercased() {
        case "mc": return "Midheaven Line"
        case "ic": return "Imum Coeli Line"
        case "asc": return "Ascendant Line"
        case "dsc": return "Descendant Line"
        default: return "Planetary Line"
        }
    }

    private var lineDescription: String {
        "This planetary line represents an area where the energy of \(planet) is strongly activated in your chart. Living near or visiting this line can bring experiences related to \(planet)'s themes."
    }

    private var themes: [String] {
        ["Career", "Public Image", "Achievement", "Recognition"]
    }
}

// MARK: - Scout Results Content

/// Content for the scout results panel, showing top ranked locations.
@available(iOS 17.0, *)
struct ScoutResultsContent: View {

    var body: some View {
        VStack(alignment: .leading, spacing: DSSpacing.xl) {
            // Summary
            Text("Top locations based on your birth chart and preferences.")
                .font(.system(size: 15))
                .foregroundStyle(DSColors.textSecondary)

            // Results list
            ForEach(1...10, id: \.self) { rank in
                ScoutResultRow(
                    rank: rank,
                    cityName: "City \(rank)",
                    country: "Country",
                    score: 100 - (rank * 5)
                )
            }

            Spacer(minLength: DSSpacing.xl)
        }
    }
}

// MARK: - Supporting Views

struct ScoreCard: View {
    let score: Int
    let label: String
    let description: String

    var body: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: DSSpacing.xs) {
                    Text(label)
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(DSColors.textSecondary)

                    Text("\(score)")
                        .font(.system(size: 48, weight: .bold))
                        .foregroundStyle(scoreColor)
                }

                Spacer()

                // Score ring
                CircularProgressView(progress: Double(score) / 100.0, color: scoreColor)
                    .frame(width: 60, height: 60)
                    .accessibilityHidden(true)
            }

            Text(description)
                .font(.system(size: 13))
                .foregroundStyle(DSColors.textPrimary)
                .lineSpacing(2)
        }
        .padding(DSSpacing.lg)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(DSColors.surface)
        )
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(DSColors.borderSubtle, lineWidth: 1)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(label), \(score) out of 100. \(description)")
    }

    private var scoreColor: Color {
        switch score {
        case 90...100: return .acScoreExcellent
        case 70..<90: return .acScoreGood
        case 50..<70: return .acScoreAverage
        case 30..<50: return .acScoreBelowAverage
        default: return .acScorePoor
        }
    }
}

struct CircularProgressView: View {
    let progress: Double
    let color: Color

    var body: some View {
        ZStack {
            Circle()
                .stroke(DSColors.textSecondary.opacity(0.2), lineWidth: 4)

            Circle()
                .trim(from: 0, to: progress)
                .stroke(color, style: StrokeStyle(lineWidth: 4, lineCap: .round))
                .rotationEffect(.degrees(-90))
        }
    }
}

struct LineRow: View {
    let line: LineData

    var body: some View {
        HStack(spacing: DSSpacing.md) {
            Circle()
                .fill(line.influence.color)
                .frame(width: 8, height: 8)

            Text(line.name)
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(DSColors.textPrimary)

            Spacer()

            Text(line.influence.label)
                .font(.system(size: 12))
                .foregroundStyle(line.influence.color)
        }
        .padding(.vertical, DSSpacing.xs)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(line.name), \(line.influence.label)")
    }
}

struct LineData {
    let name: String
    let type: String
    let influence: Influence

    enum Influence {
        case positive
        case neutral
        case challenging

        var color: Color {
            switch self {
            case .positive: return .acSuccess
            case .neutral: return .acAmber500
            case .challenging: return .acDestructive
            }
        }

        var label: String {
            switch self {
            case .positive: return "Beneficial"
            case .neutral: return "Mixed"
            case .challenging: return "Challenging"
            }
        }
    }
}

struct WeatherCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            Text("Current Conditions")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(DSColors.textSecondary)

            HStack(spacing: DSSpacing.xl) {
                // Temperature
                VStack(spacing: DSSpacing.xs) {
                    Image(systemName: "sun.max.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(.yellow)
                        .accessibilityHidden(true)

                    Text("72F")
                        .font(.system(size: 18, weight: .semibold))
                        .foregroundStyle(DSColors.textPrimary)
                }

                Divider()
                    .frame(height: 40)

                // Air quality
                VStack(spacing: DSSpacing.xs) {
                    Image(systemName: "aqi.medium")
                        .font(.system(size: 24))
                        .foregroundStyle(.green)
                        .accessibilityHidden(true)

                    Text("Good")
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(DSColors.textPrimary)
                }
            }
        }
        .padding(DSSpacing.lg)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(
            RoundedRectangle(cornerRadius: 12)
                .fill(DSColors.surface)
        )
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Current conditions, 72 degrees Fahrenheit, air quality good")
    }
}

struct ThemeChip: View {
    let label: String

    var body: some View {
        Text(label)
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(Color.acAmber500)
            .padding(.horizontal, DSSpacing.md)
            .padding(.vertical, DSSpacing.xs)
            .background(
                Capsule()
                    .fill(Color.acAmber500.opacity(0.15))
            )
    }
}

struct ScoutResultRow: View {
    let rank: Int
    let cityName: String
    let country: String
    let score: Int

    var body: some View {
        HStack(spacing: DSSpacing.md) {
            // Rank
            Text("#\(rank)")
                .font(.system(size: 14, weight: .bold))
                .foregroundStyle(rank <= 3 ? Color.acAmber500 : DSColors.textSecondary)
                .frame(width: 32)

            // City info
            VStack(alignment: .leading, spacing: 2) {
                Text(cityName)
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(DSColors.textPrimary)

                Text(country)
                    .font(.system(size: 12))
                    .foregroundStyle(DSColors.textSecondary)
            }

            Spacer()

            // Score
            Text("\(score)")
                .font(.system(size: 18, weight: .bold))
                .foregroundStyle(scoreColor)
        }
        .padding(.vertical, DSSpacing.sm)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Rank \(rank), \(cityName), \(country), score \(score)")
    }

    private var scoreColor: Color {
        switch score {
        case 90...100: return .acScoreExcellent
        case 70..<90: return .acScoreGood
        case 50..<70: return .acScoreAverage
        default: return .acScoreBelowAverage
        }
    }
}

// MARK: - Flow Layout

struct FlowLayout: Layout {
    var spacing: CGFloat = 8

    func sizeThatFits(proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) -> CGSize {
        let result = FlowResult(
            in: proposal.width ?? 0,
            subviews: subviews,
            spacing: spacing
        )
        return result.size
    }

    func placeSubviews(in bounds: CGRect, proposal: ProposedViewSize, subviews: Subviews, cache: inout ()) {
        let result = FlowResult(
            in: bounds.width,
            subviews: subviews,
            spacing: spacing
        )

        for (index, subview) in subviews.enumerated() {
            subview.place(
                at: CGPoint(
                    x: bounds.minX + result.positions[index].x,
                    y: bounds.minY + result.positions[index].y
                ),
                proposal: ProposedViewSize(result.sizes[index])
            )
        }
    }

    struct FlowResult {
        var size: CGSize = .zero
        var positions: [CGPoint] = []
        var sizes: [CGSize] = []

        init(in maxWidth: CGFloat, subviews: Subviews, spacing: CGFloat) {
            var currentX: CGFloat = 0
            var currentY: CGFloat = 0
            var lineHeight: CGFloat = 0

            for subview in subviews {
                let size = subview.sizeThatFits(.unspecified)
                sizes.append(size)

                if currentX + size.width > maxWidth && currentX > 0 {
                    currentX = 0
                    currentY += lineHeight + spacing
                    lineHeight = 0
                }

                positions.append(CGPoint(x: currentX, y: currentY))
                lineHeight = max(lineHeight, size.height)
                currentX += size.width + spacing
                self.size.width = max(self.size.width, currentX)
            }

            self.size.height = currentY + lineHeight
        }
    }
}

// MARK: - Panel Empty State

/// Placeholder shown in the iPad inline side panel when no content is selected
@available(iOS 17.0, *)
struct PanelEmptyState: View {
    var body: some View {
        VStack(spacing: DSSpacing.xl) {
            Spacer()

            Image(systemName: "globe.americas.fill")
                .font(.system(size: 48))
                .foregroundStyle(DSColors.textSecondary.opacity(0.3))
                .accessibilityHidden(true)

            VStack(spacing: DSSpacing.sm) {
                Text("Select a Location")
                    .saiScaledFont(size: 18, weight: .semibold, relativeTo: .headline)
                    .foregroundStyle(DSColors.textSecondary)

                Text("Tap a city on the globe or search\nto see its astrocartography analysis.")
                    .saiScaledFont(size: 14, relativeTo: .subheadline)
                    .foregroundStyle(DSColors.textSecondary.opacity(0.7))
                    .multilineTextAlignment(.center)
            }
            .accessibilityElement(children: .combine)
            .accessibilityLabel("Select a location. Tap a city on the globe or search to see its astrocartography analysis.")

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(
            ZStack {
                DSColors.background
                DSColors.surface.opacity(0.5)
            }
        )
    }
}
