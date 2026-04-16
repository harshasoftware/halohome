import SwiftUI

/// Signature AI Section Header component
///
/// A premium section header with optional kicker text and trailing action.
/// Features an animated accent underline on appear.
///
/// Example:
/// ```swift
/// SAISectionHeader(
///     title: "Recent Conversations",
///     kicker: "History",
///     actionTitle: "View All"
/// ) {
///     // Handle action
/// }
/// ```
public struct SAISectionHeader: View {
    
    private let title: String
    private let kicker: String?
    private let actionTitle: String?
    private let onAction: (() -> Void)?
    
    @State private var underlineWidth: CGFloat = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    public init(
        title: String,
        kicker: String? = nil,
        actionTitle: String? = nil,
        onAction: (() -> Void)? = nil
    ) {
        self.title = title
        self.kicker = kicker
        self.actionTitle = actionTitle
        self.onAction = onAction
    }
    
    public var body: some View {
        HStack(alignment: .center) {
            VStack(alignment: .leading, spacing: DSSpacing.xs) {
                if let kicker = kicker {
                    Text(kicker.uppercased())
                        .font(.system(size: 11, weight: .bold))
                        .foregroundStyle(DSColors.accentPrimary)
                        .tracking(1.0)
                }
                
                HStack(spacing: DSSpacing.xs) {
                    Text(title)
                        .font(DSTypography.titleL)
                        .foregroundStyle(DSColors.textPrimary)
                    
                    // Animated underline
                    GeometryReader { geometry in
                        DSColors.accentPrimary
                            .frame(width: underlineWidth, height: 3)
                            .clipShape(.rect(cornerRadius: 1.5))
                            .onAppear {
                                animateUnderline(targetWidth: geometry.size.width)
                            }
                    }
                    .frame(height: 3)
                }
            }
            
            Spacer()
            
            if let actionTitle = actionTitle, let onAction = onAction {
                Button(action: onAction) {
                    Text(actionTitle)
                        .font(.system(size: 14, weight: .medium))
                        .foregroundStyle(DSColors.accentPrimary)
                }
            }
        }
        .padding(.vertical, DSSpacing.sm)
    }
    
    private func animateUnderline(targetWidth: CGFloat) {
        guard !reduceMotion else {
            underlineWidth = targetWidth
            return
        }
        
        withAnimation(.spring(response: 0.6, dampingFraction: 0.7)) {
            underlineWidth = targetWidth
        }
    }
}

// MARK: - Previews

#Preview("Section Headers") {
    VStack(spacing: DSSpacing.xl) {
        SAISectionHeader(title: "Simple Header")
        
        SAISectionHeader(
            title: "With Kicker",
            kicker: "Category"
        )
        
        SAISectionHeader(
            title: "With Action",
            actionTitle: "View All"
        ) {
            print("Action tapped")
        }
        
        SAISectionHeader(
            title: "Complete",
            kicker: "Recent",
            actionTitle: "See More"
        ) {
            print("See More tapped")
        }
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
}

#Preview("Section Header Dark Mode") {
    SAISectionHeader(
        title: "Recent Conversations",
        kicker: "History",
        actionTitle: "View All"
    ) {}
    .padding(DSSpacing.xl)
    .background(DSColors.background)
    .preferredColorScheme(.dark)
}

