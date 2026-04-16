import SwiftUI
import DesignSystem

/// Horizontal scrollable category picker for Scout
public struct ScoutCategoryPicker: View {

    @Binding var selectedCategory: ScoutCategory
    let onCategorySelected: ((ScoutCategory) -> Void)?

    public init(
        selectedCategory: Binding<ScoutCategory>,
        onCategorySelected: ((ScoutCategory) -> Void)? = nil
    ) {
        self._selectedCategory = selectedCategory
        self.onCategorySelected = onCategorySelected
    }

    public var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: DSSpacing.sm) {
                ForEach(ScoutCategory.allCases) { category in
                    categoryChip(category)
                }
            }
            .padding(.vertical, DSSpacing.xs)
        }
    }

    private func categoryChip(_ category: ScoutCategory) -> some View {
        let isSelected = category == selectedCategory

        return Button {
            withAnimation(SAIMotion.quick) {
                selectedCategory = category
                onCategorySelected?(category)
            }
            Haptics.tap()
        } label: {
            HStack(spacing: DSSpacing.xs) {
                Image(systemName: category.iconName)
                    .font(.system(size: 13, weight: .medium))

                Text(category.label)
                    .font(.system(size: 14, weight: .medium))
            }
            .foregroundStyle(foregroundColor(for: category, isSelected: isSelected))
            .padding(.horizontal, DSSpacing.md)
            .padding(.vertical, DSSpacing.sm)
            .background(backgroundColor(for: category, isSelected: isSelected))
            .clipShape(.rect(cornerRadius: DSRadius.sm))
            .overlay {
                if isSelected {
                    RoundedRectangle(cornerRadius: DSRadius.sm)
                        .strokeBorder(borderColor(for: category).opacity(0.5), lineWidth: 1)
                }
            }
        }
        .buttonStyle(CategoryChipButtonStyle())
        .accessibilityLabel(category.label)
        .accessibilityAddTraits(isSelected ? .isSelected : [])
    }

    // MARK: - Color Helpers

    private func foregroundColor(for category: ScoutCategory, isSelected: Bool) -> Color {
        if isSelected {
            return .white
        } else {
            return categoryColor(for: category).opacity(0.8)
        }
    }

    private func backgroundColor(for category: ScoutCategory, isSelected: Bool) -> Color {
        if isSelected {
            return categoryColor(for: category)
        } else {
            return categoryColor(for: category).opacity(0.12)
        }
    }

    private func borderColor(for category: ScoutCategory) -> Color {
        categoryColor(for: category)
    }

    private func categoryColor(for category: ScoutCategory) -> Color {
        switch category.themeColor {
        case .indigo: return Color(.systemIndigo)
        case .blue: return Color(.systemBlue)
        case .pink: return Color(.systemPink)
        case .green: return Color(.systemGreen)
        case .amber: return Color(.systemYellow)
        case .purple: return Color(.systemPurple)
        case .teal: return Color(.systemTeal)
        }
    }
}

// MARK: - Button Style

private struct CategoryChipButtonStyle: ButtonStyle {
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(scale(for: configuration))
            .opacity(configuration.isPressed ? 0.85 : 1.0)
            .animation(SAIMotion.quick, value: configuration.isPressed)
    }

    private func scale(for configuration: Configuration) -> CGFloat {
        guard !reduceMotion else { return 1.0 }
        return configuration.isPressed ? 0.95 : 1.0
    }
}
