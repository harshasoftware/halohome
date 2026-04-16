import SwiftUI
import CoreText

// MARK: - Cinzel Font Registration

/// Cinzel serif font — used for app wordmark, titles, and display headings.
/// Matches the web app's `font-family: 'Cinzel', serif` usage.
///
/// **Weights bundled:** Regular (400), SemiBold (600), Bold (700)
///
/// **Usage:**
/// 1. Call `CinzelFont.registerFonts()` once at app startup
/// 2. Use `Font.cinzel(size:weight:)` or the ACTypography serif tokens
public enum CinzelFont {

    // MARK: - PostScript Names

    /// PostScript name for Cinzel Regular (weight 400)
    public static let regular = "Cinzel-Regular"

    /// PostScript name for Cinzel SemiBold (weight 600)
    public static let semiBold = "Cinzel-SemiBold"

    /// PostScript name for Cinzel Bold (weight 700)
    public static let bold = "Cinzel-Bold"

    // MARK: - Registration

    /// Whether fonts have been registered
    private static var isRegistered = false

    /// Register Cinzel fonts from the DesignSystem package bundle.
    /// Call this once at app startup (in App.init or similar).
    /// Safe to call multiple times — subsequent calls are no-ops.
    public static func registerFonts() {
        guard !isRegistered else { return }
        isRegistered = true

        registerFont(named: regular)
        registerFont(named: semiBold)
        registerFont(named: bold)
    }

    private static func registerFont(named name: String) {
        guard let url = Bundle.module.url(forResource: name, withExtension: "ttf") else {
            #if DEBUG
            print("⚠️ CinzelFont: \(name).ttf not found in DesignSystem bundle")
            #endif
            return
        }

        var error: Unmanaged<CFError>?
        CTFontManagerRegisterFontsForURL(url as CFURL, .process, &error)

        #if DEBUG
        if let error = error?.takeRetainedValue() {
            // Ignore "already registered" errors — safe to call multiple times
            let desc = CFErrorCopyDescription(error) as String? ?? ""
            if !desc.contains("already registered") {
                print("⚠️ CinzelFont: Failed to register \(name): \(desc)")
            }
        }
        #endif
    }
}

// MARK: - Font Convenience

public extension Font {

    /// Create a Cinzel serif font at the specified size and weight.
    /// Falls back to system serif if Cinzel is not registered.
    ///
    /// - Parameters:
    ///   - size: Font size in points
    ///   - weight: Font weight (.regular, .semibold, .bold)
    /// - Returns: Cinzel `Font` instance
    static func cinzel(size: CGFloat, weight: Font.Weight = .regular) -> Font {
        let name: String
        switch weight {
        case .bold, .heavy, .black:
            name = CinzelFont.bold
        case .semibold, .medium:
            name = CinzelFont.semiBold
        default:
            name = CinzelFont.regular
        }
        return .custom(name, size: size)
    }

    // MARK: - Semantic Serif Fonts

    /// Cinzel wordmark font (30pt bold) — for "CartoStar" app name display
    static var acWordmark: Font { .cinzel(size: 30, weight: .bold) }

    /// Cinzel hero title (34pt bold) — for large display/hero titles
    static var acSerifHero: Font { .cinzel(size: 34, weight: .bold) }

    /// Cinzel display title (28pt bold) — for major section titles
    static var acSerifDisplay: Font { .cinzel(size: 28, weight: .bold) }

    /// Cinzel medium title (22pt semibold) — for medium section titles
    static var acSerifTitle: Font { .cinzel(size: 22, weight: .semibold) }

    /// Cinzel heading (18pt semibold) — for subsection headings
    static var acSerifHeading: Font { .cinzel(size: 18, weight: .semibold) }

    /// Cinzel body (16pt regular) — for serif body text
    static var acSerifBody: Font { .cinzel(size: 16, weight: .regular) }
}

// MARK: - View Extensions

public extension View {

    /// Apply Cinzel wordmark style (30pt bold, tight tracking)
    func acWordmarkStyle() -> some View {
        self
            .font(.acWordmark)
            .tracking(ACTypography.tightTracking)
    }

    /// Apply Cinzel serif hero title style (34pt bold)
    func acSerifHeroStyle() -> some View {
        self
            .font(.acSerifHero)
            .lineSpacing(ACTypography.heroLineSpacing)
    }

    /// Apply Cinzel serif display title style (28pt bold)
    func acSerifDisplayStyle() -> some View {
        self
            .font(.acSerifDisplay)
            .lineSpacing(ACTypography.displayLineSpacing)
    }

    /// Apply Cinzel serif title style (22pt semibold)
    func acSerifTitleStyle() -> some View {
        self
            .font(.acSerifTitle)
    }

    /// Apply Cinzel serif heading style (18pt semibold)
    func acSerifHeadingStyle() -> some View {
        self
            .font(.acSerifHeading)
    }
}
