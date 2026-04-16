import SwiftUI
import DesignSystem

// MARK: - City Search Overlay

/// Dropdown overlay showing city search results.
/// Appears below the search bar when user is typing.
@available(iOS 17.0, *)
public struct CitySearchOverlay: View {

    let completions: [SearchCompletion]
    let isSearching: Bool
    let onSelect: (SearchCompletion) -> Void

    public init(
        completions: [SearchCompletion],
        isSearching: Bool,
        onSelect: @escaping (SearchCompletion) -> Void
    ) {
        self.completions = completions
        self.isSearching = isSearching
        self.onSelect = onSelect
    }

    public var body: some View {
        VStack(spacing: 0) {
            if isSearching {
                HStack(spacing: 8) {
                    ProgressView()
                        .tint(Color.acAccent)
                    Text("Searching...")
                        .font(.subheadline)
                        .foregroundStyle(Color.acGlassTextSecondary)
                    Spacer()
                }
                .padding(12)
            } else if completions.isEmpty {
                // Empty — don't show anything
                EmptyView()
            } else {
                ForEach(completions) { completion in
                    Button {
                        onSelect(completion)
                    } label: {
                        HStack(spacing: 10) {
                            Image(systemName: "mappin.circle.fill")
                                .font(.system(size: 20))
                                .foregroundStyle(Color.acAccent)

                            VStack(alignment: .leading, spacing: 2) {
                                Text(completion.title)
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                                    .foregroundStyle(Color.acGlassTextPrimary)
                                    .lineLimit(1)

                                if !completion.subtitle.isEmpty {
                                    Text(completion.subtitle)
                                        .font(.caption)
                                        .foregroundStyle(Color.acGlassTextSecondary)
                                        .lineLimit(1)
                                }
                            }

                            Spacer()

                            Image(systemName: "arrow.right.circle")
                                .font(.caption)
                                .foregroundStyle(Color.acGlassTextSecondary)
                        }
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .contentShape(Rectangle())
                    }
                    .accessibilityLabel("\(completion.title), \(completion.subtitle)")
                    .accessibilityHint("Double tap to navigate to this location")

                    if completion.id != completions.last?.id {
                        Divider()
                            .background(Color.acBorder.opacity(0.3))
                            .padding(.leading, 42)
                    }
                }
            }
        }
        .acLiquidGlass(cornerRadius: ACRadius.glassSmall)
        .shadow(color: .black.opacity(0.25), radius: 12, y: 4)
        // Block touch passthrough to globe
        .contentShape(Rectangle())
    }
}
