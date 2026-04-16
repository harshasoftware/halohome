import SwiftUI

/// Section header component with title, optional subtitle, and divider
/// Used for consistent section headers across the app with proper accessibility
public struct DSSectionHeader: View {
    
    let title: String
    let subtitle: String?
    let showDivider: Bool
    
    public init(
        title: String,
        subtitle: String? = nil,
        showDivider: Bool = true
    ) {
        self.title = title
        self.subtitle = subtitle
        self.showDivider = showDivider
    }
    
    public var body: some View {
        VStack(alignment: .leading, spacing: DSSpacing.xs) {
            // Title
            Text(title)
                .font(DSTypography.titleL)
                .foregroundStyle(DSColors.textPrimary)
                .accessibilityAddTraits(.isHeader)
            
            // Optional subtitle
            if let subtitle = subtitle {
                Text(subtitle)
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.textSecondary)
            }
            
            // Divider
            if showDivider {
                Rectangle()
                    .fill(DSColors.borderSubtle)
                    .frame(height: 1)
            }
        }
        .padding(.horizontal, DSSpacing.lg)
    }
}

// MARK: - Preview

#if DEBUG
#Preview("With Divider") {
    VStack(spacing: DSSpacing.xl) {
        DSSectionHeader(title: "Quick Actions")
        DSSectionHeader(title: "Featured")
        DSSectionHeader(title: "Recent Chats", subtitle: "Last 7 days")
    }
    .padding()
    .background(DSColors.background)
}

#Preview("Without Divider") {
    VStack(spacing: DSSpacing.xl) {
        DSSectionHeader(title: "Settings", showDivider: false)
        DSSectionHeader(title: "Profile", showDivider: false)
    }
    .padding()
    .background(DSColors.background)
}
#endif
