import SwiftUI
#if canImport(UIKit)
import UIKit
#endif

/// Signature Design System motion utilities
///
/// Provides standard animation timings and effects with accessibility support.
/// All animations respect Reduce Motion preferences.
public enum SAIMotion {
    
    // MARK: - Standard Timings
    
    /// Quick animation (120ms) - for micro-interactions
    public static let quick = Animation.easeOut(duration: 0.12)
    
    /// Standard animation (180ms) - for most UI changes
    public static let standard = Animation.easeInOut(duration: 0.18)
    
    /// Smooth animation (250ms) - for larger transitions
    public static let smooth = Animation.easeInOut(duration: 0.25)
    
    /// Spring animation - for natural feel on large moves
    public static let spring = Animation.spring(response: 0.3, dampingFraction: 0.7)
    
    /// Gentle spring - for subtle bounces
    public static let gentleSpring = Animation.spring(response: 0.25, dampingFraction: 0.8)
    
    // MARK: - Accessibility-Aware Animations
    
    /// Returns appropriate animation based on Reduce Motion setting
    /// - Parameters:
    ///   - normal: Animation to use when Reduce Motion is off
    ///   - reduced: Animation to use when Reduce Motion is on (defaults to nil/instant)
    public static func adaptive(_ normal: Animation, reduced: Animation? = nil) -> Animation {
        #if canImport(UIKit)
        if UIAccessibility.isReduceMotionEnabled {
            return reduced ?? .default
        }
        #endif
        return normal
    }
    
    /// Standard animation that respects Reduce Motion
    public static var adaptiveStandard: Animation {
        adaptive(standard)
    }
    
    /// Spring animation that respects Reduce Motion
    public static var adaptiveSpring: Animation {
        adaptive(spring)
    }
}

// MARK: - Pressed Effect Modifier

public extension View {
    /// Apply signature pressed effect (scale + shadow compression)
    /// Respects Reduce Motion by switching to opacity-only feedback.
    ///
    /// Example:
    /// ```swift
    /// Button("Tap Me") { }
    ///     .pressedEffect(isPressed: $isPressed)
    /// ```
    func pressedEffect(isPressed: Bool) -> some View {
        self.modifier(PressedEffectModifier(isPressed: isPressed))
    }
}

private struct PressedEffectModifier: ViewModifier {
    let isPressed: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    
    func body(content: Content) -> some View {
        if reduceMotion {
            // Opacity-only feedback when Reduce Motion is enabled
            content
                .opacity(isPressed ? 0.7 : 1.0)
                .animation(SAIMotion.quick, value: isPressed)
        } else {
            // Full pressed effect with scale and shadow
            content
                .scaleEffect(isPressed ? 0.98 : 1.0)
                .animation(SAIMotion.quick, value: isPressed)
        }
    }
}

// MARK: - Shimmer Effect

public extension View {
    /// Apply shimmer loading effect
    /// Automatically disabled when Reduce Motion is enabled.
    func shimmer(isActive: Bool = true) -> some View {
        self.modifier(ShimmerModifier(isActive: isActive))
    }
}

private struct ShimmerModifier: ViewModifier {
    let isActive: Bool
    @Environment(\.accessibilityReduceMotion) private var reduceMotion
    @State private var phase: CGFloat = 0
    
    func body(content: Content) -> some View {
        content
            .overlay(
                GeometryReader { geometry in
                    if isActive && !reduceMotion {
                        DSGradient.shimmer
                            .frame(width: geometry.size.width)
                            .offset(x: phase * geometry.size.width * 2 - geometry.size.width)
                            .mask(content)
                    }
                }
            )
            .onAppear {
                guard isActive && !reduceMotion else { return }
                withAnimation(.linear(duration: 1.5).repeatForever(autoreverses: false)) {
                    phase = 1
                }
            }
    }
}

