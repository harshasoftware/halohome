import SwiftUI

/// Signature AI Button component
///
/// A premium button with multiple style variants and sizes:
/// Styles:
/// - `.primary`: Gradient background with white text
/// - `.secondary`: Outline style with accent text
/// - `.quiet`: Text-only with subtle pressed background
///
/// Sizes:
/// - `.sm`: Compact size (32pt height)
/// - `.md`: Standard size (44pt height) - default
/// - `.lg`: Large size (52pt height)
///
/// Example:
/// ```swift
/// SAIButton("Continue", style: .primary, size: .md, icon: Image(systemName: "arrow.right")) {
///     // Handle action
/// }
/// ```
public struct SAIButton: View {
    
    public enum Style {
        case primary
        case solidPrimary  // Solid accent color, no gradient
        case secondary
        case quiet
    }
    
    public enum Size {
        case sm
        case md
        case lg
        
        var height: CGFloat {
            switch self {
            case .sm: return 32
            case .md: return 44
            case .lg: return 52
            }
        }
        
        var horizontalPadding: CGFloat {
            switch self {
            case .sm: return DSSpacing.md
            case .md: return DSSpacing.lg
            case .lg: return DSSpacing.xl
            }
        }
        
        var fontSize: CGFloat {
            switch self {
            case .sm: return 14
            case .md: return 16
            case .lg: return 18
            }
        }
        
        var minWidth: CGFloat {
            switch self {
            case .lg: return 160   // primary CTA baseline
            case .md: return 140
            case .sm: return 120
            }
        }
    }
    
    public enum ButtonLayout {
        case inline
        case block
    }
    
    private let title: String
    private let style: Style
    private let size: Size
    private let icon: Image?
    private let layout: ButtonLayout
    private let action: () -> Void
    
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @Environment(\.isEnabled) private var isEnabled
    @State private var isPressed = false
    
    public init(
        _ title: String,
        style: Style = .primary,
        size: Size = .md,
        icon: Image? = nil,
        layout: ButtonLayout = .inline,
        action: @escaping () -> Void
    ) {
        self.title = title
        self.style = style
        self.size = size
        self.icon = icon
        self.layout = layout
        self.action = action
    }
    
    public var body: some View {
        Button(action: handleTap) {
            HStack(spacing: DSSpacing.xs) {
                if let icon = icon {
                    icon
                        .font(.system(size: size.fontSize, weight: .semibold))
                }
                Text(title)
                    .font(.system(size: size.fontSize, weight: .semibold))
            }
            .foregroundStyle(foregroundColor)
            .padding(.horizontal, size.horizontalPadding)
            .padding(.vertical, 0)
            .frame(minWidth: size.minWidth)
            .frame(height: size.height)
            .frame(maxWidth: layout == .block ? .infinity : nil, alignment: .center)
            .background(backgroundView)
            .overlay(overlayView)
            .clipShape(Capsule())
            .contentShape(Capsule())
        }
        .buttonStyle(SAIButtonStyle(isPressed: $isPressed))
        .opacity(isEnabled ? 1.0 : 0.5)
    }
    
    // MARK: - Tap Handler
    
    private func handleTap() {
        guard isEnabled else { return }
        Haptics.tap()
        action()
    }
    
    // MARK: - Style Helpers
    
    private var foregroundColor: Color {
        switch style {
        case .primary, .solidPrimary:
            return DSColors.background
        case .secondary:
            return DSColors.accentPrimary
        case .quiet:
            return DSColors.textPrimary
        }
    }
    
    @ViewBuilder
    private var backgroundView: some View {
        switch style {
        case .primary:
            DSGradient.primaryLinear
        case .solidPrimary:
            DSColors.accentPrimary
        case .secondary:
            DSColors.surface
        case .quiet:
            isPressed ? DSColors.chipBackground : Color.clear
        }
    }
    
    @ViewBuilder
    private var overlayView: some View {
        if style == .secondary {
            Capsule()
                .strokeBorder(DSColors.accentPrimary, lineWidth: 1.5)
        }
    }
}

// MARK: - Button Style

private struct SAIButtonStyle: ButtonStyle {
    @Binding var isPressed: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(scale(for: configuration))
            .animation(SAIMotion.quick, value: configuration.isPressed)
            .onChange(of: configuration.isPressed) { _, newValue in
                isPressed = newValue
            }
    }
    
    private func scale(for configuration: Configuration) -> CGFloat {
        guard !reduceMotion else { return 1.0 }
        return configuration.isPressed ? 0.96 : 1.0
    }
}

// MARK: - Previews

#Preview("Button Styles & Sizes") {
    VStack(spacing: DSSpacing.xl) {
        // Primary buttons
        VStack(spacing: DSSpacing.md) {
            Text("Primary").font(DSTypography.caption).foregroundStyle(DSColors.textSecondary)
            SAIButton("Small Primary", style: .primary, size: .sm) {}
            SAIButton("Medium Primary", style: .primary, size: .md) {}
            SAIButton("Large Primary", style: .primary, size: .lg) {}
            SAIButton("With Icon", style: .primary, size: .md, icon: Image(systemName: "arrow.right")) {}
        }
        
        // Secondary buttons
        VStack(spacing: DSSpacing.md) {
            Text("Secondary").font(DSTypography.caption).foregroundStyle(DSColors.textSecondary)
            SAIButton("Small Secondary", style: .secondary, size: .sm) {}
            SAIButton("Medium Secondary", style: .secondary, size: .md) {}
            SAIButton("Large Secondary", style: .secondary, size: .lg) {}
        }
        
        // Quiet buttons
        VStack(spacing: DSSpacing.md) {
            Text("Quiet").font(DSTypography.caption).foregroundStyle(DSColors.textSecondary)
            SAIButton("Small Quiet", style: .quiet, size: .sm) {}
            SAIButton("Medium Quiet", style: .quiet, size: .md) {}
            SAIButton("Large Quiet", style: .quiet, size: .lg) {}
        }
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
}

#Preview("Button Dark Mode") {
    VStack(spacing: DSSpacing.lg) {
        SAIButton("Primary", style: .primary) {}
        SAIButton("Secondary", style: .secondary) {}
        SAIButton("Quiet", style: .quiet) {}
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
    .preferredColorScheme(.dark)
}

#Preview("Disabled State") {
    VStack(spacing: DSSpacing.lg) {
        SAIButton("Enabled Primary", style: .primary) {}
        SAIButton("Disabled Primary", style: .primary) {}
            .disabled(true)
        SAIButton("Disabled Secondary", style: .secondary) {}
            .disabled(true)
    }
    .padding(DSSpacing.xl)
    .background(DSColors.background)
}

