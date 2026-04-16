import SwiftUI

/// Signature AI Card component
///
/// A premium card container with three style variants:
/// - `.elevated`: Card with shadow (default)
/// - `.outline`: Card with border stroke
/// - `.tinted`: Card with subtle brand tint
///
/// Example:
/// ```swift
/// SAICard(style: .elevated) {
///     VStack(alignment: .leading, spacing: DSSpacing.md) {
///         Text("Premium Component")
///             .font(DSTypography.titleM)
///         Text("Reusable, polished, and fast.")
///             .font(DSTypography.body)
///             .foregroundStyle(DSColors.textSecondary)
///     }
///     .padding(DSSpacing.lg)
/// }
/// ```
public struct SAICard<Content: View>: View {
    
    public enum Style {
        case elevated
        case outline
        case tinted
    }
    
    private let style: Style
    private let content: Content
    
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var isPressed = false
    
    public init(
        style: Style = .elevated,
        @ViewBuilder content: () -> Content
    ) {
        self.style = style
        self.content = content()
    }
    
    public var body: some View {
        content
            .background(backgroundForStyle)
            .clipShape(.rect(cornerRadius: DSRadius.card))
            .overlay(overlayForStyle)
            .elevation(elevationForStyle)
            .scaleEffect(pressedScale)
            .animation(SAIMotion.quick, value: isPressed)
    }
    
    // MARK: - Style Helpers
    
    @ViewBuilder
    private var backgroundForStyle: some View {
        switch style {
        case .elevated:
            DSColors.surfaceElevated
        case .outline:
            DSColors.surface
        case .tinted:
            DSColors.surfaceTinted
        }
    }
    
    @ViewBuilder
    private var overlayForStyle: some View {
        if style == .outline {
            RoundedRectangle(cornerRadius: DSRadius.card)
                .strokeBorder(DSColors.borderHairline, lineWidth: 1)
        }
    }
    
    private var elevationForStyle: ShadowStyle {
        style == .elevated ? DSElevation.level2 : ShadowStyle(color: .clear, radius: 0, x: 0, y: 0)
    }
    
    private var pressedScale: CGFloat {
        guard !reduceMotion else { return 1.0 }
        return isPressed ? 0.98 : 1.0
    }
}

// MARK: - Interactive Card

public extension SAICard {
    /// Make the card tappable with pressed effect
    func onTap(action: @escaping () -> Void) -> some View {
        Button(action: {
            Haptics.tap()
            action()
        }) {
            self
        }
        .buttonStyle(CardButtonStyle())
    }
}

private struct CardButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .opacity(configuration.isPressed ? 0.95 : 1.0)
    }
}

// MARK: - Previews

#Preview("Card Styles") {
    VStack(spacing: DSSpacing.xl) {
        SAICard(style: .elevated) {
            cardContent
        }
        
        SAICard(style: .outline) {
            cardContent
        }
        
        SAICard(style: .tinted) {
            cardContent
        }
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
}

#Preview("Card Dark Mode") {
    SAICard(style: .elevated) {
        cardContent
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
    .preferredColorScheme(.dark)
}

#Preview("Interactive Card") {
    SAICard(style: .elevated) {
        cardContent
    }
    .onTap {
        print("Card tapped")
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
}

private var cardContent: some View {
    VStack(alignment: .leading, spacing: DSSpacing.md) {
        Text("Premium Component")
            .font(DSTypography.titleM)
            .foregroundStyle(DSColors.textPrimary)
        Text("Reusable, polished, and fast.")
            .font(DSTypography.body)
            .foregroundStyle(DSColors.textSecondary)
    }
    .padding(DSSpacing.lg)
    .frame(maxWidth: .infinity, alignment: .leading)
}

