import SwiftUI

// MARK: - Glass Card Modifier

/// Applies glass morphism effect with backdrop blur and subtle border
public struct ACGlassCardModifier: ViewModifier {
    let cornerRadius: CGFloat
    let borderOpacity: Double

    public init(
        cornerRadius: CGFloat = ACRadius.glassCard,
        borderOpacity: Double = 0.15
    ) {
        self.cornerRadius = cornerRadius
        self.borderOpacity = borderOpacity
    }

    public func body(content: Content) -> some View {
        content
            .background(.ultraThinMaterial)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(
                        LinearGradient(
                            colors: [
                                Color.white.opacity(borderOpacity * 1.5),
                                Color.white.opacity(borderOpacity * 0.3)
                            ],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        ),
                        lineWidth: 1
                    )
            )
    }
}

// MARK: - Standard Card Modifier

/// Applies standard card styling with background and border
public struct ACCardModifier: ViewModifier {
    let cornerRadius: CGFloat
    let backgroundColor: Color
    let borderColor: Color
    let hasShadow: Bool

    public init(
        cornerRadius: CGFloat = ACRadius.card,
        backgroundColor: Color = .acSecondary,
        borderColor: Color = .acBorder,
        hasShadow: Bool = false
    ) {
        self.cornerRadius = cornerRadius
        self.backgroundColor = backgroundColor
        self.borderColor = borderColor
        self.hasShadow = hasShadow
    }

    public func body(content: Content) -> some View {
        content
            .background(backgroundColor)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(borderColor, lineWidth: 1)
            )
            .shadow(
                color: hasShadow ? Color.black.opacity(0.2) : .clear,
                radius: hasShadow ? 8 : 0,
                x: 0,
                y: hasShadow ? 4 : 0
            )
    }
}

// MARK: - Elevated Card Modifier

/// Applies elevated card styling with shadow and subtle gradient border
public struct ACElevatedCardModifier: ViewModifier {
    let cornerRadius: CGFloat

    public init(cornerRadius: CGFloat = ACRadius.card) {
        self.cornerRadius = cornerRadius
    }

    public func body(content: Content) -> some View {
        content
            .background(Color.acSecondary)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(Color.acCardBorder, lineWidth: 1)
            )
            .shadow(color: Color.black.opacity(0.3), radius: 12, x: 0, y: 6)
    }
}

// MARK: - Primary Button Modifier

/// Applies primary button styling with amber accent
public struct ACPrimaryButtonModifier: ViewModifier {
    @Environment(\.isEnabled) private var isEnabled

    let isFullWidth: Bool
    let size: ButtonSize

    public enum ButtonSize {
        case small
        case medium
        case large

        var verticalPadding: CGFloat {
            switch self {
            case .small: return ACSpacing.buttonSmallVertical
            case .medium: return ACSpacing.buttonVertical
            case .large: return ACSpacing.buttonVertical + 4
            }
        }

        var horizontalPadding: CGFloat {
            switch self {
            case .small: return ACSpacing.buttonSmallHorizontal
            case .medium: return ACSpacing.buttonHorizontal
            case .large: return ACSpacing.buttonHorizontal + 8
            }
        }

        var font: Font {
            switch self {
            case .small: return ACTypography.buttonSmall
            case .medium: return ACTypography.buttonPrimary
            case .large: return ACTypography.buttonPrimary
            }
        }

        var cornerRadius: CGFloat {
            switch self {
            case .small: return ACRadius.sm
            case .medium: return ACRadius.button
            case .large: return ACRadius.lg
            }
        }
    }

    public init(isFullWidth: Bool = true, size: ButtonSize = .medium) {
        self.isFullWidth = isFullWidth
        self.size = size
    }

    public func body(content: Content) -> some View {
        content
            .font(size.font)
            .foregroundStyle(Color.white)
            .frame(maxWidth: isFullWidth ? .infinity : nil)
            .padding(.vertical, size.verticalPadding)
            .padding(.horizontal, size.horizontalPadding)
            .background(isEnabled ? Color.acAccent : Color.acAccent.opacity(0.5))
            .clipShape(RoundedRectangle(cornerRadius: size.cornerRadius))
            .opacity(isEnabled ? 1.0 : 0.6)
    }
}

// MARK: - Secondary Button Modifier

/// Applies secondary button styling with outline
public struct ACSecondaryButtonModifier: ViewModifier {
    @Environment(\.isEnabled) private var isEnabled

    let isFullWidth: Bool
    let size: ACPrimaryButtonModifier.ButtonSize

    public init(isFullWidth: Bool = true, size: ACPrimaryButtonModifier.ButtonSize = .medium) {
        self.isFullWidth = isFullWidth
        self.size = size
    }

    public func body(content: Content) -> some View {
        content
            .font(size.font)
            .foregroundStyle(isEnabled ? Color.acForeground : Color.acMutedForeground)
            .frame(maxWidth: isFullWidth ? .infinity : nil)
            .padding(.vertical, size.verticalPadding)
            .padding(.horizontal, size.horizontalPadding)
            .background(Color.acSecondary)
            .clipShape(RoundedRectangle(cornerRadius: size.cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: size.cornerRadius)
                    .stroke(isEnabled ? Color.acBorder : Color.acBorder.opacity(0.5), lineWidth: 1)
            )
            .opacity(isEnabled ? 1.0 : 0.6)
    }
}

// MARK: - Ghost Button Modifier

/// Applies ghost button styling (transparent with hover state)
public struct ACGhostButtonModifier: ViewModifier {
    @Environment(\.isEnabled) private var isEnabled

    let size: ACPrimaryButtonModifier.ButtonSize

    public init(size: ACPrimaryButtonModifier.ButtonSize = .medium) {
        self.size = size
    }

    public func body(content: Content) -> some View {
        content
            .font(size.font)
            .foregroundStyle(isEnabled ? Color.acMutedForeground : Color.acMutedForeground.opacity(0.5))
            .padding(.vertical, size.verticalPadding)
            .padding(.horizontal, size.horizontalPadding)
            .opacity(isEnabled ? 1.0 : 0.6)
    }
}

// MARK: - Accent Button Modifier (Amber Outline)

/// Applies accent button styling with amber outline
public struct ACAccentButtonModifier: ViewModifier {
    @Environment(\.isEnabled) private var isEnabled

    let isFullWidth: Bool
    let size: ACPrimaryButtonModifier.ButtonSize

    public init(isFullWidth: Bool = false, size: ACPrimaryButtonModifier.ButtonSize = .medium) {
        self.isFullWidth = isFullWidth
        self.size = size
    }

    public func body(content: Content) -> some View {
        content
            .font(size.font)
            .foregroundStyle(isEnabled ? Color.acAccent : Color.acAccent.opacity(0.5))
            .frame(maxWidth: isFullWidth ? .infinity : nil)
            .padding(.vertical, size.verticalPadding)
            .padding(.horizontal, size.horizontalPadding)
            .background(Color.acAccent.opacity(0.1))
            .clipShape(RoundedRectangle(cornerRadius: size.cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: size.cornerRadius)
                    .stroke(isEnabled ? Color.acAccent : Color.acAccent.opacity(0.5), lineWidth: 1)
            )
            .opacity(isEnabled ? 1.0 : 0.6)
    }
}

// MARK: - Pressed Effect Modifier

/// Applies pressed effect with scale and opacity change
public struct ACPressedEffectModifier: ViewModifier {
    let isPressed: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(isPressed: Bool) {
        self.isPressed = isPressed
    }

    public func body(content: Content) -> some View {
        if reduceMotion {
            content
                .opacity(isPressed ? 0.7 : 1.0)
                .animation(.easeOut(duration: ACAnimation.micro), value: isPressed)
        } else {
            content
                .scaleEffect(isPressed ? 0.98 : 1.0)
                .opacity(isPressed ? 0.9 : 1.0)
                .animation(.easeOut(duration: ACAnimation.micro), value: isPressed)
        }
    }
}

// MARK: - Input Field Modifier

/// Applies input field styling
public struct ACInputFieldModifier: ViewModifier {
    let isFocused: Bool
    let hasError: Bool
    let cornerRadius: CGFloat

    public init(
        isFocused: Bool = false,
        hasError: Bool = false,
        cornerRadius: CGFloat = ACRadius.input
    ) {
        self.isFocused = isFocused
        self.hasError = hasError
        self.cornerRadius = cornerRadius
    }

    public func body(content: Content) -> some View {
        content
            .padding(ACSpacing.sm)
            .background(Color.acSecondary)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius)
                    .stroke(borderColor, lineWidth: isFocused ? 2 : 1)
            )
            .foregroundStyle(Color.acForeground)
    }

    private var borderColor: Color {
        if hasError {
            return .acDestructive
        } else if isFocused {
            return .acAccent
        } else {
            return .acBorder
        }
    }
}

// MARK: - Cosmic Glow Modifier

/// Applies a cosmic glow effect behind the view
public struct ACCosmicGlowModifier: ViewModifier {
    let color: Color
    let radius: CGFloat
    let intensity: Double

    public init(
        color: Color = .acCosmicAmber,
        radius: CGFloat = 20,
        intensity: Double = 0.6
    ) {
        self.color = color
        self.radius = radius
        self.intensity = intensity
    }

    public func body(content: Content) -> some View {
        content
            .background(
                color.opacity(intensity)
                    .blur(radius: radius)
            )
    }
}

// MARK: - View Extensions

public extension View {

    /// Apply glass card styling with backdrop blur
    func acGlassCard(
        cornerRadius: CGFloat = ACRadius.glassCard,
        borderOpacity: Double = 0.15
    ) -> some View {
        modifier(ACGlassCardModifier(cornerRadius: cornerRadius, borderOpacity: borderOpacity))
    }

    /// Apply standard card styling
    func acCard(
        cornerRadius: CGFloat = ACRadius.card,
        backgroundColor: Color = .acSecondary,
        borderColor: Color = .acBorder,
        hasShadow: Bool = false
    ) -> some View {
        modifier(ACCardModifier(
            cornerRadius: cornerRadius,
            backgroundColor: backgroundColor,
            borderColor: borderColor,
            hasShadow: hasShadow
        ))
    }

    /// Apply elevated card styling with shadow
    func acElevatedCard(cornerRadius: CGFloat = ACRadius.card) -> some View {
        modifier(ACElevatedCardModifier(cornerRadius: cornerRadius))
    }

    /// Apply primary button styling
    func acPrimaryButton(
        isFullWidth: Bool = true,
        size: ACPrimaryButtonModifier.ButtonSize = .medium
    ) -> some View {
        modifier(ACPrimaryButtonModifier(isFullWidth: isFullWidth, size: size))
    }

    /// Apply secondary button styling
    func acSecondaryButton(
        isFullWidth: Bool = true,
        size: ACPrimaryButtonModifier.ButtonSize = .medium
    ) -> some View {
        modifier(ACSecondaryButtonModifier(isFullWidth: isFullWidth, size: size))
    }

    /// Apply ghost button styling
    func acGhostButton(size: ACPrimaryButtonModifier.ButtonSize = .medium) -> some View {
        modifier(ACGhostButtonModifier(size: size))
    }

    /// Apply accent button styling (amber outline)
    func acAccentButton(
        isFullWidth: Bool = false,
        size: ACPrimaryButtonModifier.ButtonSize = .medium
    ) -> some View {
        modifier(ACAccentButtonModifier(isFullWidth: isFullWidth, size: size))
    }

    /// Apply pressed effect
    func acPressedEffect(isPressed: Bool) -> some View {
        modifier(ACPressedEffectModifier(isPressed: isPressed))
    }

    /// Apply input field styling
    func acInputField(
        isFocused: Bool = false,
        hasError: Bool = false,
        cornerRadius: CGFloat = ACRadius.input
    ) -> some View {
        modifier(ACInputFieldModifier(
            isFocused: isFocused,
            hasError: hasError,
            cornerRadius: cornerRadius
        ))
    }

    /// Apply cosmic glow effect
    func acCosmicGlow(
        color: Color = .acCosmicAmber,
        radius: CGFloat = 20,
        intensity: Double = 0.6
    ) -> some View {
        modifier(ACCosmicGlowModifier(color: color, radius: radius, intensity: intensity))
    }

    /// Apply cosmic background with dark gradient
    func acCosmicBackground() -> some View {
        self.background(LinearGradient.acCosmicGradient)
    }

    /// Apply amber accent glow behind content
    func acAmberGlow(radius: CGFloat = 50) -> some View {
        self.background(
            RadialGradient.acAmberGlow
                .frame(width: radius * 2, height: radius * 2)
                .blur(radius: radius / 2)
        )
    }
}

// MARK: - Button Styles

/// Primary button style for CartoStar
public struct ACPrimaryButtonStyle: ButtonStyle {
    let isFullWidth: Bool
    let size: ACPrimaryButtonModifier.ButtonSize

    public init(
        isFullWidth: Bool = true,
        size: ACPrimaryButtonModifier.ButtonSize = .medium
    ) {
        self.isFullWidth = isFullWidth
        self.size = size
    }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .acPrimaryButton(isFullWidth: isFullWidth, size: size)
            .acPressedEffect(isPressed: configuration.isPressed)
    }
}

/// Secondary button style for CartoStar
public struct ACSecondaryButtonStyle: ButtonStyle {
    let isFullWidth: Bool
    let size: ACPrimaryButtonModifier.ButtonSize

    public init(
        isFullWidth: Bool = true,
        size: ACPrimaryButtonModifier.ButtonSize = .medium
    ) {
        self.isFullWidth = isFullWidth
        self.size = size
    }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .acSecondaryButton(isFullWidth: isFullWidth, size: size)
            .acPressedEffect(isPressed: configuration.isPressed)
    }
}

/// Ghost button style for CartoStar
public struct ACGhostButtonStyle: ButtonStyle {
    let size: ACPrimaryButtonModifier.ButtonSize

    public init(size: ACPrimaryButtonModifier.ButtonSize = .medium) {
        self.size = size
    }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .acGhostButton(size: size)
            .acPressedEffect(isPressed: configuration.isPressed)
    }
}

/// Accent button style for CartoStar (amber outline)
public struct ACAccentButtonStyle: ButtonStyle {
    let isFullWidth: Bool
    let size: ACPrimaryButtonModifier.ButtonSize

    public init(
        isFullWidth: Bool = false,
        size: ACPrimaryButtonModifier.ButtonSize = .medium
    ) {
        self.isFullWidth = isFullWidth
        self.size = size
    }

    public func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .acAccentButton(isFullWidth: isFullWidth, size: size)
            .acPressedEffect(isPressed: configuration.isPressed)
    }
}

// MARK: - Liquid Glass Modifiers

/// Applies iOS 26+ Liquid Glass effect with fallback for earlier versions.
/// Now color-scheme-aware: automatically adapts to light/dark mode using SwiftUI's environment.
public extension View {

    /// Applies iOS 26+ Liquid Glass effect with optional tint and customizable shape.
    /// Falls back to color-scheme-aware glass morphism on earlier iOS versions.
    ///
    /// Theme behavior:
    /// - Light: Frosted white glass with subtle dark border
    /// - Dark: Dark gray glass with subtle light border
    /// - Aurora: Warm cream glass with peachy border
    /// - Obsidian: Deep navy glass with cool blue border
    func acLiquidGlass<S: Shape>(tint: Color? = nil, in shape: S) -> some View {
        modifier(ACLiquidGlassModifier(tint: tint, shape: shape))
    }

    /// Applies iOS 26+ Liquid Glass effect with rounded rectangle shape.
    func acLiquidGlass(tint: Color? = nil, cornerRadius: CGFloat = ACRadius.glassDefault) -> some View {
        acLiquidGlass(tint: tint, in: RoundedRectangle(cornerRadius: cornerRadius))
    }

    /// Applies iOS 26+ Liquid Glass effect with capsule shape.
    func acLiquidGlassCapsule(tint: Color? = nil) -> some View {
        acLiquidGlass(tint: tint, in: Capsule())
    }

    /// Applies iOS 26+ interactive Liquid Glass effect (for buttons).
    func acLiquidGlassInteractive<S: Shape>(in shape: S) -> some View {
        modifier(ACLiquidGlassInteractiveModifier(shape: shape))
    }

    // MARK: - Dark Glass Variants (for floating controls over bright map content)

    /// Dark glass effect that maintains visibility over bright backgrounds like maps.
    /// Now color-scheme-aware: automatically adapts to light/dark mode.
    ///
    /// Theme behavior:
    /// - Light: Light gray surface for visibility over maps
    /// - Dark: Dark gray surface for consistent dark appearance
    /// - Aurora: Warm cream surface matching theme
    /// - Obsidian: Deep navy surface matching theme
    func acDarkGlass<S: Shape>(in shape: S) -> some View {
        modifier(ACDarkGlassModifier(shape: shape))
    }

    /// Dark glass with rounded rectangle shape.
    func acDarkGlass(cornerRadius: CGFloat = ACRadius.glassDefault) -> some View {
        acDarkGlass(in: RoundedRectangle(cornerRadius: cornerRadius))
    }

    /// Dark glass with capsule shape.
    func acDarkGlassCapsule() -> some View {
        acDarkGlass(in: Capsule())
    }

    /// Dark interactive glass for buttons over bright backgrounds.
    func acDarkGlassInteractive<S: Shape>(in shape: S) -> some View {
        modifier(ACDarkGlassInteractiveModifier(shape: shape))
    }
}

// MARK: - Liquid Glass View Modifier (Color Scheme Aware)

/// View modifier that applies liquid glass effect with proper color scheme observation
private struct ACLiquidGlassModifier<S: Shape>: ViewModifier {
    let tint: Color?
    let shape: S

    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        if #available(iOS 26, *) {
            // iOS 26+: Use native glass effect
            let effectiveTint = tint ?? glassEffectTint
            if let effectiveTint = effectiveTint {
                content.glassEffect(.regular.tint(effectiveTint), in: shape)
            } else {
                content.glassEffect(.regular, in: shape)
            }
        } else {
            // Fallback: color-scheme-aware glass morphism
            content
                .background(glassBackground)
                .background(.ultraThinMaterial)
                .clipShape(shape)
                .overlay(
                    shape
                        .stroke(glassBorder, lineWidth: 1)
                )
        }
    }

    // MARK: - Color Scheme Aware Colors

    private var glassBackground: Color {
        switch DSColors.activeTheme {
        case .aurora:
            return Color(red: 1.0, green: 0.98, blue: 0.96).opacity(0.75)
        case .obsidian:
            return Color(red: 0.12, green: 0.14, blue: 0.22).opacity(0.85)
        default:
            // Use environment colorScheme for system/light/dark
            return colorScheme == .dark
                ? Color(white: 0.15).opacity(0.9)
                : Color.white.opacity(0.7)
        }
    }

    private var glassBorder: Color {
        switch DSColors.activeTheme {
        case .aurora:
            return Color(red: 1.0, green: 0.75, blue: 0.65).opacity(0.25)
        case .obsidian:
            return Color(red: 0.5, green: 0.65, blue: 0.85).opacity(0.2)
        default:
            // Use environment colorScheme for system/light/dark
            return colorScheme == .dark
                ? Color.white.opacity(0.12)
                : Color.black.opacity(0.08)
        }
    }

    private var glassEffectTint: Color? {
        switch DSColors.activeTheme {
        case .aurora:
            return Color(red: 1.0, green: 0.45, blue: 0.6).opacity(0.05)
        case .obsidian:
            return Color(red: 0.4, green: 0.8, blue: 1.0).opacity(0.05)
        default:
            return nil
        }
    }
}

// MARK: - Interactive Liquid Glass Modifier

private struct ACLiquidGlassInteractiveModifier<S: Shape>: ViewModifier {
    let shape: S

    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        if #available(iOS 26, *) {
            content.glassEffect(.regular.interactive(), in: shape)
        } else {
            content
                .background(glassBackground)
                .background(.ultraThinMaterial)
                .clipShape(shape)
                .overlay(
                    shape
                        .stroke(glassBorder, lineWidth: 1)
                )
        }
    }

    private var glassBackground: Color {
        switch DSColors.activeTheme {
        case .aurora:
            return Color(red: 1.0, green: 0.98, blue: 0.96).opacity(0.75)
        case .obsidian:
            return Color(red: 0.12, green: 0.14, blue: 0.22).opacity(0.85)
        default:
            return colorScheme == .dark
                ? Color(white: 0.15).opacity(0.9)
                : Color.white.opacity(0.7)
        }
    }

    private var glassBorder: Color {
        switch DSColors.activeTheme {
        case .aurora:
            return Color(red: 1.0, green: 0.75, blue: 0.65).opacity(0.25)
        case .obsidian:
            return Color(red: 0.5, green: 0.65, blue: 0.85).opacity(0.2)
        default:
            return colorScheme == .dark
                ? Color.white.opacity(0.12)
                : Color.black.opacity(0.08)
        }
    }
}

// MARK: - Dark Glass Modifier

private struct ACDarkGlassModifier<S: Shape>: ViewModifier {
    let shape: S

    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        content
            .background(darkGlassBackground)
            .clipShape(shape)
            .overlay(
                shape
                    .stroke(darkGlassBorder, lineWidth: 0.5)
            )
    }

    private var darkGlassBackground: Color {
        switch DSColors.activeTheme {
        case .aurora:
            return Color(red: 1.0, green: 0.98, blue: 0.96).opacity(0.9)
        case .obsidian:
            return Color(red: 0.12, green: 0.14, blue: 0.22).opacity(0.95)
        default:
            return colorScheme == .dark
                ? Color(white: 0.15)
                : Color(white: 0.92)
        }
    }

    private var darkGlassBorder: Color {
        switch DSColors.activeTheme {
        case .aurora:
            return Color(red: 1.0, green: 0.75, blue: 0.65).opacity(0.2)
        case .obsidian:
            return Color(red: 0.5, green: 0.65, blue: 0.85).opacity(0.15)
        default:
            return colorScheme == .dark
                ? Color.white.opacity(0.08)
                : Color.black.opacity(0.08)
        }
    }
}

// MARK: - Dark Glass Interactive Modifier

private struct ACDarkGlassInteractiveModifier<S: Shape>: ViewModifier {
    let shape: S

    @Environment(\.colorScheme) private var colorScheme

    func body(content: Content) -> some View {
        content
            .background(darkGlassBackground.opacity(1.1))
            .clipShape(shape)
            .overlay(
                shape
                    .stroke(darkGlassBorder, lineWidth: 0.5)
            )
    }

    private var darkGlassBackground: Color {
        switch DSColors.activeTheme {
        case .aurora:
            return Color(red: 1.0, green: 0.98, blue: 0.96).opacity(0.9)
        case .obsidian:
            return Color(red: 0.12, green: 0.14, blue: 0.22).opacity(0.95)
        default:
            return colorScheme == .dark
                ? Color(white: 0.15)
                : Color(white: 0.92)
        }
    }

    private var darkGlassBorder: Color {
        switch DSColors.activeTheme {
        case .aurora:
            return Color(red: 1.0, green: 0.75, blue: 0.65).opacity(0.2)
        case .obsidian:
            return Color(red: 0.5, green: 0.65, blue: 0.85).opacity(0.15)
        default:
            return colorScheme == .dark
                ? Color.white.opacity(0.08)
                : Color.black.opacity(0.08)
        }
    }
}

// MARK: - Button Style Extensions

public extension Button {

    /// Apply primary CartoStar button style
    func acPrimaryStyle(
        isFullWidth: Bool = true,
        size: ACPrimaryButtonModifier.ButtonSize = .medium
    ) -> some View {
        self.buttonStyle(ACPrimaryButtonStyle(isFullWidth: isFullWidth, size: size))
    }

    /// Apply secondary CartoStar button style
    func acSecondaryStyle(
        isFullWidth: Bool = true,
        size: ACPrimaryButtonModifier.ButtonSize = .medium
    ) -> some View {
        self.buttonStyle(ACSecondaryButtonStyle(isFullWidth: isFullWidth, size: size))
    }

    /// Apply ghost CartoStar button style
    func acGhostStyle(size: ACPrimaryButtonModifier.ButtonSize = .medium) -> some View {
        self.buttonStyle(ACGhostButtonStyle(size: size))
    }

    /// Apply accent CartoStar button style
    func acAccentStyle(
        isFullWidth: Bool = false,
        size: ACPrimaryButtonModifier.ButtonSize = .medium
    ) -> some View {
        self.buttonStyle(ACAccentButtonStyle(isFullWidth: isFullWidth, size: size))
    }

    /// Apply iOS 26+ native glass button style with fallback
    @ViewBuilder
    func acGlassButtonStyle() -> some View {
        if #available(iOS 26, *) {
            self.buttonStyle(.glass)
        } else {
            self.buttonStyle(ACGhostButtonStyle(size: .medium))
        }
    }

    /// Apply iOS 26+ prominent glass button style with fallback
    @ViewBuilder
    func acGlassProminentButtonStyle() -> some View {
        if #available(iOS 26, *) {
            self.buttonStyle(.glassProminent)
        } else {
            self.buttonStyle(ACPrimaryButtonStyle(isFullWidth: false, size: .medium))
        }
    }
}

// MARK: - Liquid Glass Container

/// A wrapper that provides GlassEffectContainer on iOS 26+ for morphing effects
@available(iOS 17.0, *)
public struct ACGlassContainer<Content: View>: View {
    let spacing: CGFloat
    let content: Content

    public init(spacing: CGFloat = 24, @ViewBuilder content: () -> Content) {
        self.spacing = spacing
        self.content = content()
    }

    public var body: some View {
        if #available(iOS 26, *) {
            GlassEffectContainer(spacing: spacing) {
                content
            }
        } else {
            content
        }
    }
}

// MARK: - Morphing Glass ID Modifier

public extension View {
    /// Applies a glass effect ID for morphing transitions on iOS 26+
    @ViewBuilder
    func acGlassEffectID<ID: Hashable>(_ id: ID, in namespace: Namespace.ID) -> some View {
        if #available(iOS 26, *) {
            self.glassEffectID(id, in: namespace)
        } else {
            self
        }
    }
}

// MARK: - Spring Animations

/// Predefined spring animations matching Apple's design language
public enum ACSpring {
    /// Quick, snappy spring (0.3s)
    public static var quick: Animation {
        .spring(response: 0.3, dampingFraction: 0.7, blendDuration: 0)
    }

    /// Smooth, natural spring (0.5s)
    public static var smooth: Animation {
        .spring(response: 0.5, dampingFraction: 0.8, blendDuration: 0)
    }

    /// Bouncy spring for emphasis (0.6s)
    public static var bouncy: Animation {
        .spring(response: 0.6, dampingFraction: 0.65, blendDuration: 0)
    }

    /// Gentle spring for subtle movements (0.4s)
    public static var gentle: Animation {
        .spring(response: 0.4, dampingFraction: 0.85, blendDuration: 0)
    }

    /// Interactive spring for gestures (0.35s)
    public static var interactive: Animation {
        .interactiveSpring(response: 0.35, dampingFraction: 0.75, blendDuration: 0)
    }
}

// MARK: - Micro-interaction Modifiers

public extension View {
    /// Applies a scale effect on press with haptic feedback
    func acPressable(scale: CGFloat = 0.95, haptic: Bool = true) -> some View {
        self.modifier(ACPressableModifier(scale: scale, hapticEnabled: haptic))
    }
}

private struct ACPressableModifier: ViewModifier {
    let scale: CGFloat
    let hapticEnabled: Bool
    @State private var isPressed = false

    func body(content: Content) -> some View {
        content
            .scaleEffect(isPressed ? scale : 1.0)
            .animation(ACSpring.quick, value: isPressed)
            .simultaneousGesture(
                DragGesture(minimumDistance: 0)
                    .onChanged { _ in
                        if !isPressed {
                            isPressed = true
                            if hapticEnabled {
                                let impact = UIImpactFeedbackGenerator(style: .light)
                                impact.impactOccurred()
                            }
                        }
                    }
                    .onEnded { _ in
                        isPressed = false
                    }
            )
    }
}
