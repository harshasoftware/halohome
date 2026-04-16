import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

// MARK: - Animation Extensions

/// CartoStar Animation presets
///
/// Provides consistent animation timings that map to web equivalents.
public extension Animation {

    // MARK: - Duration-Based Animations

    /// Extra fast animation (100ms) - for micro-interactions
    static var acExtraFast: Animation {
        .easeOut(duration: ACAnimation.extraFast)
    }

    /// Fast animation (150ms) - for quick feedback
    static var acFast: Animation {
        .easeOut(duration: ACAnimation.fast)
    }

    /// Normal animation (200ms) - for standard transitions
    static var acNormal: Animation {
        .easeInOut(duration: ACAnimation.normal)
    }

    /// Medium animation (300ms) - for more noticeable transitions
    static var acMedium: Animation {
        .easeInOut(duration: ACAnimation.medium)
    }

    /// Slow animation (400ms) - for emphasis
    static var acSlow: Animation {
        .easeInOut(duration: ACAnimation.slow)
    }

    /// Extra slow animation (500ms) - for dramatic effect
    static var acExtraSlow: Animation {
        .easeInOut(duration: ACAnimation.extraSlow)
    }

    // MARK: - Purpose-Based Animations

    /// Micro interaction animation (120ms)
    static var acMicro: Animation {
        .easeOut(duration: ACAnimation.micro)
    }

    /// Standard UI animation (180ms)
    static var acStandard: Animation {
        .easeInOut(duration: ACAnimation.standard)
    }

    /// Smooth transition animation (250ms)
    static var acSmooth: Animation {
        .easeInOut(duration: ACAnimation.smooth)
    }

    /// Page transition animation (350ms)
    static var acPageTransition: Animation {
        .easeInOut(duration: ACAnimation.pageTransition)
    }

    /// Modal presentation animation (400ms)
    static var acModalPresentation: Animation {
        .easeOut(duration: ACAnimation.modalPresentation)
    }

    /// Scroll reveal animation (700ms)
    static var acReveal: Animation {
        .easeOut(duration: ACAnimation.reveal)
    }

    // MARK: - Spring Animations

    /// Snappy spring animation - quick with minimal bounce
    static var acSpringSnappy: Animation {
        .spring(response: ACAnimation.springSnappy, dampingFraction: ACAnimation.dampingTight)
    }

    /// Default spring animation - balanced
    static var acSpringDefault: Animation {
        .spring(response: ACAnimation.springDefault, dampingFraction: ACAnimation.dampingDefault)
    }

    /// Gentle spring animation - smooth and subtle
    static var acSpringGentle: Animation {
        .spring(response: ACAnimation.springGentle, dampingFraction: ACAnimation.dampingDefault)
    }

    /// Bouncy spring animation - playful with more bounce
    static var acSpringBouncy: Animation {
        .spring(response: ACAnimation.springBouncy, dampingFraction: ACAnimation.dampingBouncy)
    }

    // MARK: - Component-Specific Animations

    /// Glass card hover/press animation
    static var acGlassCard: Animation {
        .spring(response: 0.3, dampingFraction: 0.7)
    }

    /// Button press animation
    static var acButtonPress: Animation {
        .easeOut(duration: ACAnimation.micro)
    }

    /// Toggle switch animation
    static var acToggle: Animation {
        .spring(response: ACAnimation.springSnappy, dampingFraction: ACAnimation.dampingDefault)
    }

    /// Progress bar animation
    static var acProgress: Animation {
        .easeOut(duration: ACAnimation.medium)
    }

    /// Shimmer loop animation
    static var acShimmer: Animation {
        .linear(duration: ACAnimation.shimmerCycle).repeatForever(autoreverses: false)
    }

    // MARK: - Accessibility-Aware Animations

    /// Returns appropriate animation based on Reduce Motion setting
    static func acAdaptive(_ normal: Animation, reduced: Animation? = nil) -> Animation {
        #if canImport(UIKit)
        if UIAccessibility.isReduceMotionEnabled {
            return reduced ?? .default
        }
        #endif
        return normal
    }

    /// Standard animation that respects Reduce Motion
    static var acAdaptiveStandard: Animation {
        acAdaptive(.acStandard)
    }

    /// Spring animation that respects Reduce Motion
    static var acAdaptiveSpring: Animation {
        acAdaptive(.acSpringDefault)
    }
}

// MARK: - Shimmer Modifier

/// Applies a shimmer loading effect to the view
public struct ACShimmerModifier: ViewModifier {
    let isActive: Bool
    @State private var phase: CGFloat = 0
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(isActive: Bool = true) {
        self.isActive = isActive
    }

    public func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geometry in
                    if isActive && !reduceMotion {
                        LinearGradient(
                            colors: [
                                Color.clear,
                                Color.white.opacity(0.15),
                                Color.clear
                            ],
                            startPoint: .leading,
                            endPoint: .trailing
                        )
                        .frame(width: geometry.size.width * 2)
                        .offset(x: -geometry.size.width + (phase * geometry.size.width * 2))
                        .mask(content)
                    }
                }
            )
            .onAppear {
                guard isActive && !reduceMotion else { return }
                withAnimation(.acShimmer) {
                    phase = 1
                }
            }
    }
}

// MARK: - Scroll Reveal Modifier

/// Applies a scroll reveal animation when the view appears
public struct ACScrollRevealModifier: ViewModifier {
    let delay: Double
    let offset: CGFloat
    @State private var isVisible = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(delay: Double = 0, offset: CGFloat = 16) {
        self.delay = delay
        self.offset = offset
    }

    public func body(content: Content) -> some View {
        content
            .opacity(isVisible ? 1.0 : 0.0)
            .offset(y: reduceMotion ? 0 : (isVisible ? 0 : offset))
            .animation(
                reduceMotion ? .none : .acReveal.delay(delay),
                value: isVisible
            )
            .onAppear {
                isVisible = true
            }
    }
}

// MARK: - Fade In Modifier

/// Applies a fade-in animation when the view appears
public struct ACFadeInModifier: ViewModifier {
    let delay: Double
    let duration: Double
    @State private var isVisible = false

    public init(delay: Double = 0, duration: Double = ACAnimation.medium) {
        self.delay = delay
        self.duration = duration
    }

    public func body(content: Content) -> some View {
        content
            .opacity(isVisible ? 1.0 : 0.0)
            .animation(.easeOut(duration: duration).delay(delay), value: isVisible)
            .onAppear {
                isVisible = true
            }
    }
}

// MARK: - Scale Fade Modifier

/// Applies a scale + fade animation when the view appears
public struct ACScaleFadeModifier: ViewModifier {
    let delay: Double
    let scale: CGFloat
    @State private var isVisible = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(delay: Double = 0, scale: CGFloat = 0.95) {
        self.delay = delay
        self.scale = scale
    }

    public func body(content: Content) -> some View {
        content
            .opacity(isVisible ? 1.0 : 0.0)
            .scaleEffect(reduceMotion ? 1.0 : (isVisible ? 1.0 : scale))
            .animation(
                reduceMotion ? .none : .acSpringDefault.delay(delay),
                value: isVisible
            )
            .onAppear {
                isVisible = true
            }
    }
}

// MARK: - Slide In Modifier

/// Applies a slide-in animation from a specified edge
public struct ACSlideInModifier: ViewModifier {
    let edge: Edge
    let delay: Double
    @State private var isVisible = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(edge: Edge = .bottom, delay: Double = 0) {
        self.edge = edge
        self.delay = delay
    }

    public func body(content: Content) -> some View {
        content
            .opacity(isVisible ? 1.0 : 0.0)
            .offset(x: reduceMotion ? 0 : offsetX, y: reduceMotion ? 0 : offsetY)
            .animation(
                reduceMotion ? .none : .acSpringDefault.delay(delay),
                value: isVisible
            )
            .onAppear {
                isVisible = true
            }
    }

    private var offsetX: CGFloat {
        guard !isVisible else { return 0 }
        switch edge {
        case .leading: return -20
        case .trailing: return 20
        default: return 0
        }
    }

    private var offsetY: CGFloat {
        guard !isVisible else { return 0 }
        switch edge {
        case .top: return -20
        case .bottom: return 20
        default: return 0
        }
    }
}

// MARK: - Pulse Modifier

/// Applies a subtle pulsing animation (useful for drawing attention)
public struct ACPulseModifier: ViewModifier {
    let isActive: Bool
    @State private var isPulsing = false
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(isActive: Bool = true) {
        self.isActive = isActive
    }

    public func body(content: Content) -> some View {
        content
            .scaleEffect(isPulsing && !reduceMotion ? 1.02 : 1.0)
            .opacity(isPulsing && !reduceMotion ? 0.9 : 1.0)
            .onAppear {
                guard isActive && !reduceMotion else { return }
                withAnimation(
                    .easeInOut(duration: 1.0)
                    .repeatForever(autoreverses: true)
                ) {
                    isPulsing = true
                }
            }
    }
}

// MARK: - Glow Pulse Modifier

/// Applies a pulsing glow effect (for cosmic emphasis)
public struct ACGlowPulseModifier: ViewModifier {
    let color: Color
    let isActive: Bool
    @State private var glowIntensity: Double = 0.3
    @Environment(\.accessibilityReduceMotion) private var reduceMotion

    public init(color: Color = .acCosmicAmber, isActive: Bool = true) {
        self.color = color
        self.isActive = isActive
    }

    public func body(content: Content) -> some View {
        content
            .shadow(
                color: isActive ? color.opacity(glowIntensity) : .clear,
                radius: 10
            )
            .onAppear {
                guard isActive && !reduceMotion else { return }
                withAnimation(
                    .easeInOut(duration: 1.5)
                    .repeatForever(autoreverses: true)
                ) {
                    glowIntensity = 0.7
                }
            }
    }
}

// MARK: - Stagger Animation Helper

/// Helper for creating staggered animations in lists
public struct ACStaggeredAnimation {

    /// Calculate delay for item at index
    public static func delay(for index: Int, baseDelay: Double = ACAnimation.staggerDelay) -> Double {
        Double(index) * baseDelay
    }

    /// Calculate delay with maximum cap
    public static func delay(
        for index: Int,
        baseDelay: Double = ACAnimation.staggerDelay,
        maxDelay: Double = 0.5
    ) -> Double {
        min(Double(index) * baseDelay, maxDelay)
    }
}

// MARK: - View Extensions

public extension View {

    /// Apply shimmer loading effect
    func acShimmer(isActive: Bool = true) -> some View {
        modifier(ACShimmerModifier(isActive: isActive))
    }

    /// Apply scroll reveal animation
    func acScrollReveal(delay: Double = 0, offset: CGFloat = 16) -> some View {
        modifier(ACScrollRevealModifier(delay: delay, offset: offset))
    }

    /// Apply fade-in animation
    func acFadeIn(delay: Double = 0, duration: Double = ACAnimation.medium) -> some View {
        modifier(ACFadeInModifier(delay: delay, duration: duration))
    }

    /// Apply scale + fade animation
    func acScaleFade(delay: Double = 0, scale: CGFloat = 0.95) -> some View {
        modifier(ACScaleFadeModifier(delay: delay, scale: scale))
    }

    /// Apply slide-in animation
    func acSlideIn(from edge: Edge = .bottom, delay: Double = 0) -> some View {
        modifier(ACSlideInModifier(edge: edge, delay: delay))
    }

    /// Apply pulse animation
    func acPulse(isActive: Bool = true) -> some View {
        modifier(ACPulseModifier(isActive: isActive))
    }

    /// Apply glow pulse animation
    func acGlowPulse(color: Color = .acCosmicAmber, isActive: Bool = true) -> some View {
        modifier(ACGlowPulseModifier(color: color, isActive: isActive))
    }

    /// Apply staggered scroll reveal for list items
    func acStaggeredReveal(index: Int, baseDelay: Double = ACAnimation.staggerDelay) -> some View {
        self.acScrollReveal(delay: ACStaggeredAnimation.delay(for: index, baseDelay: baseDelay))
    }

    /// Apply staggered fade-in for list items
    func acStaggeredFadeIn(index: Int, baseDelay: Double = ACAnimation.staggerDelay) -> some View {
        self.acFadeIn(delay: ACStaggeredAnimation.delay(for: index, baseDelay: baseDelay))
    }
}

// MARK: - Transition Extensions

public extension AnyTransition {

    /// Fade with scale transition
    static var acScaleFade: AnyTransition {
        .asymmetric(
            insertion: .scale(scale: 0.95).combined(with: .opacity),
            removal: .scale(scale: 0.95).combined(with: .opacity)
        )
    }

    /// Slide from bottom transition
    static var acSlideFromBottom: AnyTransition {
        .asymmetric(
            insertion: .move(edge: .bottom).combined(with: .opacity),
            removal: .move(edge: .bottom).combined(with: .opacity)
        )
    }

    /// Slide from top transition
    static var acSlideFromTop: AnyTransition {
        .asymmetric(
            insertion: .move(edge: .top).combined(with: .opacity),
            removal: .move(edge: .top).combined(with: .opacity)
        )
    }

    /// Slide from leading transition
    static var acSlideFromLeading: AnyTransition {
        .asymmetric(
            insertion: .move(edge: .leading).combined(with: .opacity),
            removal: .move(edge: .leading).combined(with: .opacity)
        )
    }

    /// Slide from trailing transition
    static var acSlideFromTrailing: AnyTransition {
        .asymmetric(
            insertion: .move(edge: .trailing).combined(with: .opacity),
            removal: .move(edge: .trailing).combined(with: .opacity)
        )
    }

    /// Push transition (like navigation)
    static var acPush: AnyTransition {
        .asymmetric(
            insertion: .move(edge: .trailing),
            removal: .move(edge: .leading)
        )
    }

    /// Pop transition (reverse of push)
    static var acPop: AnyTransition {
        .asymmetric(
            insertion: .move(edge: .leading),
            removal: .move(edge: .trailing)
        )
    }
}

// MARK: - Previews

#Preview("Animation Showcase") {
    ScrollView(.vertical, showsIndicators: true) {
        VStack(spacing: ACSpacing.xl) {
            Text("Scroll Reveal")
                .font(.acHeadingMedium)
                .foregroundStyle(Color.acForeground)

            ForEach(0..<5, id: \.self) { index in
                RoundedRectangle(cornerRadius: ACRadius.md)
                    .fill(Color.acMuted)
                    .frame(height: 60)
                    .overlay(
                        Text("Item \(index + 1)")
                            .foregroundStyle(Color.acForeground)
                    )
                    .acStaggeredReveal(index: index)
            }

            Text("Shimmer")
                .font(.acHeadingMedium)
                .foregroundStyle(Color.acForeground)

            RoundedRectangle(cornerRadius: ACRadius.md)
                .fill(Color.acMuted)
                .frame(height: 100)
                .acShimmer()

            Text("Pulse")
                .font(.acHeadingMedium)
                .foregroundStyle(Color.acForeground)

            Circle()
                .fill(Color.acAccent)
                .frame(width: 60, height: 60)
                .acPulse()

            Text("Glow Pulse")
                .font(.acHeadingMedium)
                .foregroundStyle(Color.acForeground)

            Circle()
                .fill(Color.acAccent)
                .frame(width: 60, height: 60)
                .acGlowPulse()
        }
        .padding()
    }
    .background(Color.acBackground)
}

#Preview("Fade Animations") {
    VStack(spacing: ACSpacing.lg) {
        Text("Fade In")
            .font(.acHeadingLarge)
            .foregroundStyle(Color.acForeground)
            .acFadeIn(delay: 0.2)

        Text("Scale Fade")
            .font(.acBody)
            .foregroundStyle(Color.acMutedForeground)
            .padding()
            .acCard()
            .acScaleFade(delay: 0.4)

        HStack(spacing: ACSpacing.md) {
            ForEach(0..<4, id: \.self) { index in
                Circle()
                    .fill(Color.acAccent)
                    .frame(width: 40, height: 40)
                    .acStaggeredFadeIn(index: index)
            }
        }
    }
    .padding()
    .background(Color.acBackground)
}
