import SwiftUI

/// Signature Design System gradient tokens
///
/// Provides premium, theme-aware gradient styles for buttons, cards, and accents.
public enum DSGradient {
    
    /// Primary linear gradient (accentPrimary → accentSecondary)
    /// Adapts to current theme for premium visual effect
    public static var primaryLinear: LinearGradient {
        switch DSColors.activeTheme {
        case .aurora:
            // Warm sunset gradient: coral → peach → gold
            return LinearGradient(
                colors: [
                    Color(red: 1.0, green: 0.45, blue: 0.6),  // Coral
                    Color(red: 1.0, green: 0.6, blue: 0.4)    // Peach/gold
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        case .obsidian:
            // Electric neon gradient: cyan → purple
            return LinearGradient(
                colors: [
                    Color(red: 0.4, green: 0.8, blue: 1.0),   // Electric cyan
                    Color(red: 0.6, green: 0.4, blue: 1.0)    // Vibrant purple
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        default:
            // System/Light/Dark use accent colors
            return LinearGradient(
                colors: [DSColors.accentPrimary, DSColors.accentSecondary],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )
        }
    }
    
    /// Accent border overlay gradient for rings/borders
    public static var accentBorderOverlay: AngularGradient {
        AngularGradient(
            colors: [
                DSColors.accentPrimary,
                DSColors.accentSecondary,
                DSColors.accentPrimary
            ],
            center: .center,
            startAngle: .degrees(0),
            endAngle: .degrees(360)
        )
    }
    
    /// Shimmer gradient for loading states
    public static var shimmer: LinearGradient {
        let shimmerColor: Color = {
            switch DSColors.activeTheme {
            case .obsidian:
                return Color.white.opacity(0.2)
            default:
                return Color.white.opacity(0.4)
            }
        }()
        
        return LinearGradient(
            stops: [
                .init(color: Color.clear, location: 0.0),
                .init(color: shimmerColor, location: 0.5),
                .init(color: Color.clear, location: 1.0)
            ],
            startPoint: .leading,
            endPoint: .trailing
        )
    }
    
    /// Glass effect for Obsidian theme cards
    public static var glassOverlay: LinearGradient {
        LinearGradient(
            stops: [
                .init(color: Color.white.opacity(0.05), location: 0.0),
                .init(color: Color.white.opacity(0.02), location: 1.0)
            ],
            startPoint: .top,
            endPoint: .bottom
        )
    }
}

