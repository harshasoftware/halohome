import SwiftUI
import DesignSystem

/// Quick action button card
/// Provides a tappable card with icon and title for common actions
struct QuickActionCard: View {
    
    let action: HomeContent.QuickAction
    let onTap: () -> Void
    
    var body: some View {
        Button(action: onTap) {
            VStack(spacing: DSSpacing.md) {
                // Icon
                Image(systemName: action.systemImage)
                    .font(.system(size: 32))
                    .foregroundStyle(colorForAccent(action.accentColor))
                    .symbolRenderingMode(.hierarchical)
                    .frame(height: 40)
                
                // Title
                Text(action.title)
                    .font(DSTypography.body)
                    .fontWeight(.medium)
                    .foregroundStyle(DSColors.textPrimary)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 110)
            .background(
                // Inner container: background + corner radius + border applied here
                RoundedRectangle(cornerRadius: DSRadius.lg)
                    .fill(DSColors.surface)
                    .overlay(
                        RoundedRectangle(cornerRadius: DSRadius.lg)
                            .strokeBorder(DSColors.borderHairline, lineWidth: 1)
                    )
            )
            .elevation(DSElevation.level1) // Outer shadow applied here (not clipped)
        }
        .buttonStyle(.plain)
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
    VStack {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: DSSpacing.md) {
            ForEach(HomeContent.QuickAction.defaults) { action in
                QuickActionCard(action: action) {
                    print("Tapped: \(action.title)")
                }
            }
        }
        .padding()
    }
    .background(DSColors.background)
}
#endif

