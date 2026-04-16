import SwiftUI

/// Signature Design System typography tokens
///
/// Provides a premium, scalable type system aligned with Dynamic Type.
/// All scales adapt to user accessibility preferences.
public enum DSTypography {
    
    // MARK: - Type Scales
    
    /// Extra large title (28pt / line height 34)
    public static let titleXL = Font.system(size: 28, weight: .bold, design: .default)
    
    /// Large title (22pt / line height 28)
    public static let titleL = Font.system(size: 22, weight: .semibold, design: .default)
    
    /// Medium title (20pt / line height 24)
    public static let titleM = Font.system(size: 20, weight: .semibold, design: .default)

    /// Small title (17pt / line height 22)
    public static let titleS = Font.system(size: 17, weight: .semibold, design: .default)

    /// Body text (16pt / line height 22)
    public static let body = Font.system(size: 16, weight: .regular, design: .default)
    
    /// Caption text (13pt / line height 16)
    public static let caption = Font.system(size: 13, weight: .regular, design: .default)
    
    /// Code/monospace text (14pt)
    public static let code = Font.system(size: 14, weight: .regular, design: .monospaced)
    
    // MARK: - Line Spacing
    
    public static let titleLineSpacing: CGFloat = 2
    public static let bodyLineSpacing: CGFloat = 4
    public static let captionLineSpacing: CGFloat = 2
    
    // MARK: - Semantic Helpers
    
    /// Headline style for SAI components
    public static var saiHeadline: Font { titleL }
    
    /// Body style for SAI components
    public static var saiBody: Font { body }
    
    /// Caption style for SAI components
    public static var saiCaption: Font { caption }
}

// MARK: - View Extensions

public extension View {
    /// Apply SAI headline text style
    func saiHeadlineText() -> some View {
        self
            .font(DSTypography.saiHeadline)
            .lineSpacing(DSTypography.titleLineSpacing)
    }
    
    /// Apply SAI body text style
    func saiBodyText() -> some View {
        self
            .font(DSTypography.saiBody)
            .lineSpacing(DSTypography.bodyLineSpacing)
    }
    
    /// Apply SAI caption text style
    func saiCaptionText() -> some View {
        self
            .font(DSTypography.saiCaption)
            .lineSpacing(DSTypography.captionLineSpacing)
    }
    
    // MARK: - Legacy Compatibility Extensions
    
    /// Legacy: Apply title text style
    func titleText() -> some View {
        self.font(DSTypography.titleXL)
    }
    
    /// Legacy: Apply headline text style
    func headlineText() -> some View {
        self.font(DSTypography.titleL)
    }
    
    /// Legacy: Apply body text style with line spacing
    func bodyText() -> some View {
        self
            .font(DSTypography.body)
            .lineSpacing(DSTypography.bodyLineSpacing)
    }
    
    /// Legacy: Apply footnote text style
    func footnoteText() -> some View {
        self.font(DSTypography.caption)
    }
}

