import SwiftUI

/// CartoStar Design System typography tokens
///
/// Provides a scalable type system aligned with Dynamic Type.
/// Maps Tailwind CSS text sizes to iOS equivalents with accessibility support.
public enum ACTypography {

    // MARK: - Display Fonts (Hero/Large Titles)

    /// Hero title - extra large display (text-5xl equivalent, 34pt)
    public static let heroTitle = Font.system(size: 34, weight: .bold, design: .default)

    /// Large title (text-4xl equivalent, 28pt)
    public static let displayLarge = Font.system(size: 28, weight: .bold, design: .default)

    /// Medium display title (text-3xl equivalent, 24pt)
    public static let displayMedium = Font.system(size: 24, weight: .bold, design: .default)

    /// Small display title (text-2xl equivalent, 20pt)
    public static let displaySmall = Font.system(size: 20, weight: .semibold, design: .default)

    // MARK: - Heading Fonts

    /// Section heading (text-xl equivalent, 18pt)
    public static let headingLarge = Font.system(size: 18, weight: .semibold, design: .default)

    /// Subsection heading (text-lg equivalent, 17pt)
    public static let headingMedium = Font.system(size: 17, weight: .semibold, design: .default)

    /// Small heading (16pt)
    public static let headingSmall = Font.system(size: 16, weight: .semibold, design: .default)

    // MARK: - Body Fonts

    /// Large body text (text-lg equivalent, 17pt)
    public static let bodyLarge = Font.system(size: 17, weight: .regular, design: .default)

    /// Default body text (text-base equivalent, 16pt)
    public static let body = Font.system(size: 16, weight: .regular, design: .default)

    /// Medium body text (text-sm equivalent, 14pt)
    public static let bodyMedium = Font.system(size: 14, weight: .regular, design: .default)

    /// Small body text (text-xs equivalent, 12pt)
    public static let bodySmall = Font.system(size: 12, weight: .regular, design: .default)

    // MARK: - Caption & Label Fonts

    /// Large caption (14pt)
    public static let captionLarge = Font.system(size: 14, weight: .medium, design: .default)

    /// Default caption (13pt)
    public static let caption = Font.system(size: 13, weight: .regular, design: .default)

    /// Small caption (text-xs equivalent, 12pt)
    public static let captionSmall = Font.system(size: 12, weight: .regular, design: .default)

    /// Micro caption (11pt)
    public static let captionMicro = Font.system(size: 11, weight: .regular, design: .default)

    // MARK: - Label Fonts

    /// Large label (14pt medium)
    public static let labelLarge = Font.system(size: 14, weight: .medium, design: .default)

    /// Default label (12pt medium)
    public static let labelMedium = Font.system(size: 12, weight: .medium, design: .default)

    /// Small label (11pt medium)
    public static let labelSmall = Font.system(size: 11, weight: .medium, design: .default)

    // MARK: - Button Fonts

    /// Primary button text (16pt medium)
    public static let buttonPrimary = Font.system(size: 16, weight: .medium, design: .default)

    /// Secondary button text (14pt medium)
    public static let buttonSecondary = Font.system(size: 14, weight: .medium, design: .default)

    /// Small button text (13pt medium)
    public static let buttonSmall = Font.system(size: 13, weight: .medium, design: .default)

    // MARK: - Specialized Fonts

    /// Code/monospace text (14pt)
    public static let code = Font.system(size: 14, weight: .regular, design: .monospaced)

    /// Score/number display (24pt bold monospace)
    public static let scoreDisplay = Font.system(size: 24, weight: .bold, design: .monospaced)

    /// Large number display (32pt bold)
    public static let numberLarge = Font.system(size: 32, weight: .bold, design: .rounded)

    /// Stat/metric number (20pt semibold)
    public static let statNumber = Font.system(size: 20, weight: .semibold, design: .rounded)

    // MARK: - Line Spacing

    public static let heroLineSpacing: CGFloat = 4
    public static let displayLineSpacing: CGFloat = 2
    public static let bodyLineSpacing: CGFloat = 4
    public static let captionLineSpacing: CGFloat = 2

    // MARK: - Letter Spacing (Tracking)

    public static let tightTracking: CGFloat = -0.5
    public static let normalTracking: CGFloat = 0
    public static let wideTracking: CGFloat = 0.5
}

// MARK: - Font Extensions for CartoStar

public extension Font {

    // MARK: - Quick Access Fonts

    /// Hero title font (34pt bold)
    static var acHeroTitle: Font { ACTypography.heroTitle }

    /// Display large font (28pt bold)
    static var acDisplayLarge: Font { ACTypography.displayLarge }

    /// Display medium font (24pt bold)
    static var acDisplayMedium: Font { ACTypography.displayMedium }

    /// Display small font (20pt semibold)
    static var acDisplaySmall: Font { ACTypography.displaySmall }

    /// Section heading font (18pt semibold)
    static var acHeadingLarge: Font { ACTypography.headingLarge }

    /// Subsection heading font (17pt semibold)
    static var acHeadingMedium: Font { ACTypography.headingMedium }

    /// Small heading font (16pt semibold)
    static var acHeadingSmall: Font { ACTypography.headingSmall }

    /// Body font (16pt regular)
    static var acBody: Font { ACTypography.body }

    /// Body large font (17pt regular)
    static var acBodyLarge: Font { ACTypography.bodyLarge }

    /// Body medium font (14pt regular)
    static var acBodyMedium: Font { ACTypography.bodyMedium }

    /// Body small font (12pt regular)
    static var acBodySmall: Font { ACTypography.bodySmall }

    /// Caption font (13pt regular)
    static var acCaption: Font { ACTypography.caption }

    /// Caption small font (12pt regular)
    static var acCaptionSmall: Font { ACTypography.captionSmall }

    /// Primary button font (16pt medium)
    static var acButton: Font { ACTypography.buttonPrimary }

    /// Secondary button font (14pt medium)
    static var acButtonSecondary: Font { ACTypography.buttonSecondary }

    /// Label font (12pt medium)
    static var acLabel: Font { ACTypography.labelMedium }

    /// Code font (14pt monospace)
    static var acCode: Font { ACTypography.code }
}

// MARK: - View Extensions for CartoStar Typography

public extension View {

    /// Apply hero title text style
    func acHeroTitleStyle() -> some View {
        self
            .font(.acHeroTitle)
            .lineSpacing(ACTypography.heroLineSpacing)
            .tracking(ACTypography.tightTracking)
    }

    /// Apply display large text style
    func acDisplayLargeStyle() -> some View {
        self
            .font(.acDisplayLarge)
            .lineSpacing(ACTypography.displayLineSpacing)
    }

    /// Apply display medium text style
    func acDisplayMediumStyle() -> some View {
        self
            .font(.acDisplayMedium)
            .lineSpacing(ACTypography.displayLineSpacing)
    }

    /// Apply display small text style
    func acDisplaySmallStyle() -> some View {
        self
            .font(.acDisplaySmall)
            .lineSpacing(ACTypography.displayLineSpacing)
    }

    /// Apply heading large text style
    func acHeadingLargeStyle() -> some View {
        self.font(.acHeadingLarge)
    }

    /// Apply heading medium text style
    func acHeadingMediumStyle() -> some View {
        self.font(.acHeadingMedium)
    }

    /// Apply heading small text style
    func acHeadingSmallStyle() -> some View {
        self.font(.acHeadingSmall)
    }

    /// Apply body text style
    func acBodyStyle() -> some View {
        self
            .font(.acBody)
            .lineSpacing(ACTypography.bodyLineSpacing)
    }

    /// Apply body large text style
    func acBodyLargeStyle() -> some View {
        self
            .font(.acBodyLarge)
            .lineSpacing(ACTypography.bodyLineSpacing)
    }

    /// Apply body medium text style
    func acBodyMediumStyle() -> some View {
        self.font(.acBodyMedium)
    }

    /// Apply body small text style
    func acBodySmallStyle() -> some View {
        self.font(.acBodySmall)
    }

    /// Apply caption text style
    func acCaptionStyle() -> some View {
        self
            .font(.acCaption)
            .lineSpacing(ACTypography.captionLineSpacing)
    }

    /// Apply caption small text style
    func acCaptionSmallStyle() -> some View {
        self.font(.acCaptionSmall)
    }

    /// Apply button text style
    func acButtonTextStyle() -> some View {
        self.font(.acButton)
    }

    /// Apply label text style
    func acLabelStyle() -> some View {
        self.font(.acLabel)
    }

    /// Apply code text style
    func acCodeStyle() -> some View {
        self.font(.acCode)
    }

    /// Apply muted foreground color
    func acMutedStyle() -> some View {
        self.foregroundStyle(Color.acMutedForeground)
    }

    /// Apply accent foreground color
    func acAccentStyle() -> some View {
        self.foregroundStyle(Color.acAccent)
    }
}

// MARK: - Text Modifier for Semantic Styles

public extension Text {

    /// Apply CartoStar primary text style (white on dark)
    func acPrimaryTextStyle() -> Text {
        self
            .font(.acBody)
            .foregroundStyle(Color.acForeground)
    }

    /// Apply CartoStar secondary/muted text style
    func acSecondaryTextStyle() -> Text {
        self
            .font(.acBodyMedium)
            .foregroundStyle(Color.acMutedForeground)
    }

    /// Apply CartoStar accent text style (amber)
    func acAccentTextStyle() -> Text {
        self
            .font(.acBody)
            .foregroundStyle(Color.acAccent)
    }

    /// Apply CartoStar heading style
    func acHeadingTextStyle() -> Text {
        self
            .font(.acHeadingLarge)
            .foregroundStyle(Color.acForeground)
    }
}
