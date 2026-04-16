import SwiftUI
import DesignSystem

/// Collapsible country section for "By Country" view mode.
/// Shows a country header with flag, name, city count, and top score.
/// Expands to reveal all cities within that country.
struct ScoutCountrySection: View {

    let group: CountryGroup
    let category: ScoutCategory
    let onLocationTap: ((ScoutLocation) -> Void)?

    @State private var isExpanded: Bool = true

    var body: some View {
        VStack(alignment: .leading, spacing: 0) {
            // Country header
            Button {
                withAnimation(SAIMotion.quick) {
                    isExpanded.toggle()
                }
                Haptics.tap()
            } label: {
                HStack(spacing: DSSpacing.sm) {
                    Text(group.countryFlag)

                    VStack(alignment: .leading, spacing: 2) {
                        Text(group.countryName)
                            .font(DSTypography.titleM)
                            .foregroundStyle(DSColors.textPrimary)

                        HStack(spacing: DSSpacing.sm) {
                            Text("\(group.locations.count) \(group.locations.count == 1 ? "city" : "cities")")
                                .font(DSTypography.caption)
                                .foregroundStyle(DSColors.textSecondary)

                            if group.beneficialCount > 0 {
                                Label("\(group.beneficialCount)", systemImage: "arrow.up.right")
                                    .font(.system(size: 11))
                                    .foregroundStyle(DSColors.success)
                            }

                            if group.challengingCount > 0 {
                                Label("\(group.challengingCount)", systemImage: "arrow.down.right")
                                    .font(.system(size: 11))
                                    .foregroundStyle(DSColors.danger)
                            }
                        }
                    }

                    Spacer()

                    // Top score for this country
                    if let topLocation = group.locations.first {
                        ScoreBadge(
                            score: topLocation.score,
                            nature: topLocation.nature
                        )
                    }

                    Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(DSColors.textSecondary)
                }
                .padding(DSSpacing.md)
                .background(DSColors.surface)
                .clipShape(.rect(cornerRadius: DSRadius.md))
            }
            .buttonStyle(.plain)
            .accessibilityLabel("\(group.countryName), \(group.locations.count) cities")
            .accessibilityHint(isExpanded ? "Collapse section" : "Expand section")

            // City cards within this country
            if isExpanded {
                VStack(spacing: DSSpacing.sm) {
                    ForEach(Array(group.locations.enumerated()), id: \.element.id) { index, location in
                        ScoutResultCard(
                            location: location,
                            rank: index + 1,
                            category: category
                        )
                        .onTapGesture {
                            onLocationTap?(location)
                        }
                    }
                }
                .padding(.top, DSSpacing.sm)
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
    }
}
