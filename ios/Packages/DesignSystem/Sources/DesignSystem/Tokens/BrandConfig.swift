import SwiftUI

/// Brand configuration for customization
/// 
/// Buyers can modify these values to customize the app's branding.
/// Changes here will be reflected throughout the app.
public struct BrandConfig {
    
    /// App display name shown in UI
    public static let appDisplayName = "CartoStar"

    /// Accent color for highlights and CTAs
    public static let accentColor: Color = DSColors.primary

    /// SF Symbol name for default avatar
    public static let avatarFallbackSymbol = "globe.americas.fill"
    
    /// App icon background color (for generated icons)
    public static let appIconBackground: Color = DSColors.primary
    
    // MARK: - Customization Guide
    
    /*
     HOW TO CUSTOMIZE YOUR BRAND
     ============================
     
     1. App Display Name:
        Change `appDisplayName` to your app's name
        Example: "MyAI Assistant" or "ChatBot Pro"
     
     2. Accent Color:
        Option A: Update the Primary color in Colors.xcassets
        Option B: Set accentColor to a custom Color:
            public static let accentColor = Color(red: 0.2, green: 0.6, blue: 1.0)
     
     3. Avatar Symbol:
        Browse SF Symbols app and pick an icon:
        Examples: "sparkles", "brain.head.profile", "message.fill"
        Update `avatarFallbackSymbol` with the symbol name
     
     4. Color Scheme:
        Edit Resources/Colors.xcassets to customize:
        - Primary (brand color)
        - BubbleUser (user message bubble)
        - BubbleAssistant (AI message bubble)
        - TextPrimary, TextSecondary (text colors)
        - Background, Separator
     
     5. Typography:
        Modify DSTypography in Typography.swift:
        - Change font sizes
        - Switch font design (.default, .rounded, .serif, .monospaced)
        - Adjust line spacing
     
     All changes automatically apply throughout the app with no additional code changes needed.
     */
}
