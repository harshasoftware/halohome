import SwiftUI
import DesignSystem

/// Reusable card component for featured content
/// Displays an icon, title, and description in a modern card layout
struct FeatureCard: View {
    
    let item: HomeContent.FeatureItem
    
    var body: some View {
        VStack(alignment: .leading, spacing: DSSpacing.md) {
            // Icon
            Image(systemName: item.systemImage)
                .font(.system(size: 40))
                .foregroundStyle(colorForAccent(item.accentColor))
                .symbolRenderingMode(.hierarchical)
                .frame(width: 60, height: 60)
            
            // Title
            Text(item.title)
                .font(DSTypography.titleM)
                .foregroundStyle(DSColors.textPrimary)
                .lineLimit(2)
            
            // Description
            Text(item.description)
                .font(DSTypography.body)
                .foregroundStyle(DSColors.textSecondary)
                .lineLimit(3)
            
            Spacer()
        }
        .frame(width: 250, height: 200)
        .padding(DSSpacing.lg)
        .background(
            RoundedRectangle(cornerRadius: DSRadius.lg)
                .fill(DSColors.surface)
                .overlay(
                    RoundedRectangle(cornerRadius: DSRadius.lg)
                        .strokeBorder(DSColors.borderHairline, lineWidth: 1)
                )
        )
        .elevation(DSElevation.soft)
    }
    
    // MARK: - Helpers
    
    private func colorForAccent(_ accent: String) -> Color {
        switch accent.lowercased() {
        case "blue": return .blue
        case "green": return .green
        case "purple": return .purple
        case "orange": return .orange
        case "red": return .red
        case "pink": return .pink
        case "yellow": return .yellow
        case "gray": return .gray
        case "primary": return DSColors.primary
        default: return .blue
        }
    }
}

// MARK: - Preview

#if DEBUG
#Preview {
    ScrollView(.horizontal) {
        HStack(spacing: DSSpacing.lg) {
            ForEach(HomeContent.FeatureItem.defaults) { item in
                FeatureCard(item: item)
            }
        }
        .padding()
    }
    .background(DSColors.background)
}
#endif

