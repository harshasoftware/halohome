import SwiftUI

/// Signature Design System elevation (shadow) tokens
///
/// Provides premium shadow presets for depth and hierarchy.
public enum DSElevation {
    
    /// Soft elevation (y=0, blur=12, opacity=0.06) - Premium, subtle lift
    public static let soft = ShadowStyle(
        color: Color.black.opacity(0.06),
        radius: 12,
        x: 0,
        y: 0
    )
    
    /// Light elevation (y=2, blur=8, opacity=0.10)
    public static let level1 = ShadowStyle(
        color: Color.black.opacity(0.10),
        radius: 8,
        x: 0,
        y: 2
    )
    
    /// Medium elevation (y=6, blur=16, opacity=0.12)
    public static let level2 = ShadowStyle(
        color: Color.black.opacity(0.12),
        radius: 16,
        x: 0,
        y: 6
    )
    
    /// High elevation (y=12, blur=24, opacity=0.14)
    public static let level3 = ShadowStyle(
        color: Color.black.opacity(0.14),
        radius: 24,
        x: 0,
        y: 12
    )
}

// MARK: - Shadow Style

public struct ShadowStyle {
    public let color: Color
    public let radius: CGFloat
    public let x: CGFloat
    public let y: CGFloat
    
    public init(color: Color, radius: CGFloat, x: CGFloat, y: CGFloat) {
        self.color = color
        self.radius = radius
        self.x = x
        self.y = y
    }
}

// MARK: - View Extension

public extension View {
    /// Apply elevation shadow to a view
    func elevation(_ style: ShadowStyle) -> some View {
        self.shadow(
            color: style.color,
            radius: style.radius,
            x: style.x,
            y: style.y
        )
    }
}

