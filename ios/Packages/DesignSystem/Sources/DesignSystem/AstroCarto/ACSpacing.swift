import SwiftUI

// MARK: - Spacing Tokens

/// CartoStar Design System spacing tokens
///
/// Provides a consistent spacing scale based on a 4pt grid.
/// Maps Tailwind spacing classes (p-1, p-2, etc.) to iOS equivalents.
public enum ACSpacing {

    // MARK: - Base Scale (4pt grid)

    /// 1 unit - 4pt (Tailwind p-1)
    public static let space1: CGFloat = 4

    /// 2 units - 8pt (Tailwind p-2)
    public static let space2: CGFloat = 8

    /// 3 units - 12pt (Tailwind p-3)
    public static let space3: CGFloat = 12

    /// 4 units - 16pt (Tailwind p-4)
    public static let space4: CGFloat = 16

    /// 5 units - 20pt (Tailwind p-5)
    public static let space5: CGFloat = 20

    /// 6 units - 24pt (Tailwind p-6)
    public static let space6: CGFloat = 24

    /// 8 units - 32pt (Tailwind p-8)
    public static let space8: CGFloat = 32

    /// 10 units - 40pt (Tailwind p-10)
    public static let space10: CGFloat = 40

    /// 12 units - 48pt (Tailwind p-12)
    public static let space12: CGFloat = 48

    /// 16 units - 64pt (Tailwind p-16)
    public static let space16: CGFloat = 64

    /// 20 units - 80pt (Tailwind p-20)
    public static let space20: CGFloat = 80

    /// 24 units - 96pt (Tailwind p-24)
    public static let space24: CGFloat = 96

    // MARK: - Semantic Aliases

    /// Extra extra small - 4pt
    public static let xxs: CGFloat = space1

    /// Extra small - 8pt
    public static let xs: CGFloat = space2

    /// Small - 12pt
    public static let sm: CGFloat = space3

    /// Medium - 16pt (default padding)
    public static let md: CGFloat = space4

    /// Large - 24pt
    public static let lg: CGFloat = space6

    /// Extra large - 32pt
    public static let xl: CGFloat = space8

    /// Extra extra large - 48pt
    public static let xxl: CGFloat = space12

    // MARK: - Component-Specific Spacing

    /// Card padding - 24pt
    public static let cardPadding: CGFloat = space6

    /// Card inner padding - 16pt
    public static let cardInnerPadding: CGFloat = space4

    /// Section padding - 32pt
    public static let sectionPadding: CGFloat = space8

    /// Page horizontal padding - 16pt
    public static let pageHorizontal: CGFloat = space4

    /// Page vertical padding - 24pt
    public static let pageVertical: CGFloat = space6

    /// Button horizontal padding - 24pt
    public static let buttonHorizontal: CGFloat = space6

    /// Button vertical padding - 12pt
    public static let buttonVertical: CGFloat = space3

    /// Button small horizontal padding - 16pt
    public static let buttonSmallHorizontal: CGFloat = space4

    /// Button small vertical padding - 8pt
    public static let buttonSmallVertical: CGFloat = space2

    /// Icon spacing from text - 8pt
    public static let iconSpacing: CGFloat = space2

    /// Form field spacing - 16pt
    public static let formSpacing: CGFloat = space4

    /// List item spacing - 12pt
    public static let listSpacing: CGFloat = space3

    /// Section title to content spacing - 16pt
    public static let sectionTitleSpacing: CGFloat = space4

    /// Stack default spacing - 12pt
    public static let stackSpacing: CGFloat = space3

    /// Chip spacing - 8pt
    public static let chipSpacing: CGFloat = space2

    /// Modal/sheet padding - 24pt
    public static let sheetPadding: CGFloat = space6

    /// Safe area bottom padding - 34pt (for home indicator)
    public static let safeAreaBottom: CGFloat = 34

    // MARK: - Gap Values (for stacks)

    /// Tight gap - 4pt
    public static let gapTight: CGFloat = space1

    /// Small gap - 8pt
    public static let gapSmall: CGFloat = space2

    /// Default gap - 12pt
    public static let gapDefault: CGFloat = space3

    /// Medium gap - 16pt
    public static let gapMedium: CGFloat = space4

    /// Large gap - 24pt
    public static let gapLarge: CGFloat = space6

    /// Section gap - 32pt
    public static let gapSection: CGFloat = space8
}

// MARK: - Radius Tokens

/// CartoStar Design System corner radius tokens
///
/// Provides consistent border radius values for rounded corners.
/// Maps Tailwind rounded classes to iOS equivalents.
public enum ACRadius {

    // MARK: - Base Scale

    /// No radius - 0pt
    public static let none: CGFloat = 0

    /// Extra small radius - 4pt (rounded-sm)
    public static let xs: CGFloat = 4

    /// Small radius - 6pt (rounded)
    public static let sm: CGFloat = 6

    /// Medium radius - 8pt (rounded-md)
    public static let md: CGFloat = 8

    /// Large radius - 12pt (rounded-lg)
    public static let lg: CGFloat = 12

    /// Extra large radius - 16pt (rounded-xl)
    public static let xl: CGFloat = 16

    /// 2XL radius - 20pt (rounded-2xl)
    public static let xxl: CGFloat = 20

    /// 3XL radius - 24pt (rounded-3xl)
    public static let xxxl: CGFloat = 24

    /// Full/pill radius - 9999pt
    public static let full: CGFloat = 9999

    // MARK: - Component-Specific Radius

    /// Card radius - 16pt
    public static let card: CGFloat = xl

    /// Glass card radius - 20pt
    public static let glassCard: CGFloat = xxl

    /// Button radius - 8pt
    public static let button: CGFloat = md

    /// Button pill radius (full)
    public static let buttonPill: CGFloat = full

    /// Input field radius - 8pt
    public static let input: CGFloat = md

    /// Chip/tag radius - 6pt
    public static let chip: CGFloat = sm

    /// Badge radius (full for pills)
    public static let badge: CGFloat = full

    /// Modal/sheet radius - 24pt
    public static let sheet: CGFloat = xxxl

    /// Avatar radius (full for circles)
    public static let avatar: CGFloat = full

    /// Tooltip radius - 8pt
    public static let tooltip: CGFloat = md

    /// Progress bar radius - 4pt
    public static let progressBar: CGFloat = xs

    // MARK: - Glass-Specific Radius

    /// Small glass radius - 12pt (compact controls, zoom buttons)
    public static let glassSmall: CGFloat = lg

    /// Default glass radius - 16pt (standard cards, info panels)
    public static let glassDefault: CGFloat = xl

    /// Large glass radius - 20pt (prominent elements, expanded cards)
    public static let glassLarge: CGFloat = xxl

    /// Glass input field radius - 14pt (search bars, text inputs)
    public static let glassInput: CGFloat = 14

    /// Glass sheet radius - 24pt (sheets, modals)
    public static let glassSheet: CGFloat = xxxl

    /// Glass control radius - 12pt (toolbar buttons, controls)
    public static let glassControl: CGFloat = lg
}

// MARK: - Animation Timing Tokens

/// CartoStar Design System animation timing tokens
///
/// Provides consistent animation durations and timing functions.
/// Maps CSS/Framer Motion durations to iOS equivalents.
public enum ACAnimation {

    // MARK: - Durations

    /// Instant - 0ms (no animation)
    public static let instant: Double = 0

    /// Extra fast - 100ms
    public static let extraFast: Double = 0.1

    /// Fast - 150ms
    public static let fast: Double = 0.15

    /// Normal - 200ms
    public static let normal: Double = 0.2

    /// Medium - 300ms
    public static let medium: Double = 0.3

    /// Slow - 400ms
    public static let slow: Double = 0.4

    /// Extra slow - 500ms
    public static let extraSlow: Double = 0.5

    /// Reveal - 700ms (for scroll reveal effects)
    public static let reveal: Double = 0.7

    // MARK: - Named Durations

    /// Micro interaction - 120ms
    public static let micro: Double = 0.12

    /// Standard UI transition - 180ms
    public static let standard: Double = 0.18

    /// Smooth transition - 250ms
    public static let smooth: Double = 0.25

    /// Page transition - 350ms
    public static let pageTransition: Double = 0.35

    /// Modal presentation - 400ms
    public static let modalPresentation: Double = 0.4

    /// Shimmer cycle - 1500ms
    public static let shimmerCycle: Double = 1.5

    // MARK: - Spring Response Values

    /// Snappy spring response
    public static let springSnappy: Double = 0.25

    /// Default spring response
    public static let springDefault: Double = 0.3

    /// Gentle spring response
    public static let springGentle: Double = 0.4

    /// Bouncy spring response
    public static let springBouncy: Double = 0.5

    // MARK: - Spring Damping Values

    /// Tight damping (less bounce)
    public static let dampingTight: Double = 0.85

    /// Default damping
    public static let dampingDefault: Double = 0.7

    /// Loose damping (more bounce)
    public static let dampingLoose: Double = 0.6

    /// Bouncy damping
    public static let dampingBouncy: Double = 0.5

    // MARK: - Delay Values

    /// No delay
    public static let delayNone: Double = 0

    /// Short delay - 50ms
    public static let delayShort: Double = 0.05

    /// Medium delay - 100ms
    public static let delayMedium: Double = 0.1

    /// Long delay - 200ms
    public static let delayLong: Double = 0.2

    /// Stagger delay for lists - 50ms
    public static let staggerDelay: Double = 0.05
}

// MARK: - View Extensions for Spacing

public extension View {

    /// Apply standard card padding (24pt)
    func acCardPadding() -> some View {
        self.padding(ACSpacing.cardPadding)
    }

    /// Apply standard page padding
    func acPagePadding() -> some View {
        self.padding(.horizontal, ACSpacing.pageHorizontal)
    }

    /// Apply standard section padding
    func acSectionPadding() -> some View {
        self.padding(ACSpacing.sectionPadding)
    }

    /// Apply sheet/modal padding
    func acSheetPadding() -> some View {
        self.padding(ACSpacing.sheetPadding)
    }

    /// Apply standard stack spacing
    func acStackSpacing(_ spacing: CGFloat = ACSpacing.stackSpacing) -> some View {
        self.padding(.vertical, spacing / 2)
    }
}

// MARK: - EdgeInsets Convenience

public extension EdgeInsets {

    /// Standard card insets
    static var acCard: EdgeInsets {
        EdgeInsets(
            top: ACSpacing.cardPadding,
            leading: ACSpacing.cardPadding,
            bottom: ACSpacing.cardPadding,
            trailing: ACSpacing.cardPadding
        )
    }

    /// Standard page insets
    static var acPage: EdgeInsets {
        EdgeInsets(
            top: ACSpacing.pageVertical,
            leading: ACSpacing.pageHorizontal,
            bottom: ACSpacing.pageVertical,
            trailing: ACSpacing.pageHorizontal
        )
    }

    /// Standard button insets
    static var acButton: EdgeInsets {
        EdgeInsets(
            top: ACSpacing.buttonVertical,
            leading: ACSpacing.buttonHorizontal,
            bottom: ACSpacing.buttonVertical,
            trailing: ACSpacing.buttonHorizontal
        )
    }

    /// Small button insets
    static var acButtonSmall: EdgeInsets {
        EdgeInsets(
            top: ACSpacing.buttonSmallVertical,
            leading: ACSpacing.buttonSmallHorizontal,
            bottom: ACSpacing.buttonSmallVertical,
            trailing: ACSpacing.buttonSmallHorizontal
        )
    }

    /// Sheet/modal insets
    static var acSheet: EdgeInsets {
        EdgeInsets(
            top: ACSpacing.sheetPadding,
            leading: ACSpacing.sheetPadding,
            bottom: ACSpacing.sheetPadding,
            trailing: ACSpacing.sheetPadding
        )
    }
}
