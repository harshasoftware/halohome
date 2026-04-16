import UIKit
import FeatureGlobe

// MARK: - Report Drawing Helpers

/// Extracted drawing primitives and shared constants from AstroReportGenerator.
/// Keeps the generator focused on page layout logic.
enum ReportDrawing {

    // MARK: - Page Constants

    static let pageWidth: CGFloat = 595.28   // A4
    static let pageHeight: CGFloat = 841.89
    static let margin: CGFloat = 40
    static var contentWidth: CGFloat { pageWidth - margin * 2 }

    // MARK: - Brand Colors (UIColor for Core Graphics)

    enum Brand {
        static let deepSpace = UIColor(red: 0.02, green: 0.02, blue: 0.02, alpha: 1)
        static let white = UIColor.white
        static let zinc400 = UIColor(red: 0.63, green: 0.63, blue: 0.67, alpha: 1)
        static let zinc500 = UIColor(red: 0.44, green: 0.44, blue: 0.48, alpha: 1)
        static let purple = UIColor(red: 0.576, green: 0.439, blue: 0.859, alpha: 1)
        static let blue = UIColor(red: 0.392, green: 0.584, blue: 0.929, alpha: 1)
        static let gold = UIColor(red: 0.984, green: 0.749, blue: 0.141, alpha: 1)
        static let green = UIColor(red: 0.133, green: 0.773, blue: 0.369, alpha: 1)
        static let amber = UIColor(red: 0.961, green: 0.620, blue: 0.043, alpha: 1)
        static let darkText = UIColor(red: 0.12, green: 0.12, blue: 0.16, alpha: 1)
        static let bodyText = UIColor(red: 0.24, green: 0.24, blue: 0.27, alpha: 1)
        static let cardBg = UIColor(red: 0.97, green: 0.98, blue: 0.99, alpha: 1)
    }

    // MARK: - Planet Colors

    static let planetColors: [Planet: UIColor] = [
        .sun: UIColor(red: 1.0, green: 0.843, blue: 0, alpha: 1),
        .moon: UIColor(red: 0.753, green: 0.753, blue: 0.753, alpha: 1),
        .mercury: UIColor(red: 0, green: 0.808, blue: 0.820, alpha: 1),
        .venus: UIColor(red: 1.0, green: 0.412, blue: 0.706, alpha: 1),
        .mars: UIColor(red: 1.0, green: 0.271, blue: 0, alpha: 1),
        .jupiter: UIColor(red: 1.0, green: 0.647, blue: 0, alpha: 1),
        .saturn: UIColor(red: 0.855, green: 0.647, blue: 0.125, alpha: 1),
        .uranus: UIColor(red: 0.529, green: 0.808, blue: 0.922, alpha: 1),
        .neptune: UIColor(red: 0.255, green: 0.412, blue: 0.882, alpha: 1),
        .pluto: UIColor(red: 0.576, green: 0.439, blue: 0.859, alpha: 1),
        .chiron: UIColor(red: 1.0, green: 0.412, blue: 0.706, alpha: 1),
        .northNode: UIColor(red: 0.6, green: 0.196, blue: 0.8, alpha: 1),
        .southNode: UIColor(red: 0.545, green: 0.0, blue: 0.545, alpha: 1),
    ]

    // MARK: - Line Interpretations

    static let interpretations: [Planet: [AstroLineType: String]] = [
        .sun: [
            .midheaven: "Career recognition and public visibility flourish. Leadership opportunities abound. Your authentic self shines in professional spheres.",
            .imumCoeli: "Deep sense of belonging and family connection. A place to establish strong roots and feel truly at home.",
            .ascendant: "Enhanced vitality and self-expression. Your authentic identity radiates powerfully. Great for self-reinvention.",
            .descendant: "Attracts significant partnerships and recognition through others. People see and appreciate your inner light.",
        ],
        .moon: [
            .midheaven: "Emotional fulfillment through career. Public nurturing roles favored. Recognition for caring and intuitive work.",
            .imumCoeli: "Profound emotional security and comfort. Ideal for home, family, and putting down roots.",
            .ascendant: "Heightened intuition and emotional sensitivity. Deep connection to your inner self and needs.",
            .descendant: "Attracts nurturing relationships. Emotional bonds form easily. Great for finding emotional support.",
        ],
        .mercury: [
            .midheaven: "Success in communication, writing, teaching, and commerce. Intellectual recognition in career.",
            .imumCoeli: "Mental stimulation at home. Great for home-based learning, writing, or commerce.",
            .ascendant: "Quick thinking and articulate expression. Excellent for networking and making connections.",
            .descendant: "Attracts intellectual partners. Stimulating conversations and mental exchanges flourish.",
        ],
        .venus: [
            .midheaven: "Artistic success and social popularity. Beauty, harmony, and pleasure in career pursuits.",
            .imumCoeli: "Aesthetic home environment. Love, beauty, and comfort in domestic life.",
            .ascendant: "Enhanced charm and attractiveness. Social grace comes naturally. Magnetic presence.",
            .descendant: "Magnetic attraction for romantic relationships. Love, beauty, and harmony in partnerships.",
        ],
        .mars: [
            .midheaven: "Drive for career achievement. Competitive success, leadership, and entrepreneurial energy.",
            .imumCoeli: "Active home life. Energy for domestic projects, renovations, and family protection.",
            .ascendant: "Increased courage and initiative. Physical vitality enhanced. Great for taking action.",
            .descendant: "Attracts passionate, dynamic relationships. Partnerships with energy and drive.",
        ],
        .jupiter: [
            .midheaven: "Expansion and luck in career. Recognition, international opportunities, and abundance.",
            .imumCoeli: "Abundance in home life. Generous family connections, growth, and prosperity at home.",
            .ascendant: "Optimism and personal growth. Opportunities seem to find you. Expanded worldview.",
            .descendant: "Attracts beneficial partnerships. Luck through relationships and collaborations.",
        ],
        .saturn: [
            .midheaven: "Serious career achievements through discipline and hard work. Authority and lasting success.",
            .imumCoeli: "Building solid foundations. Responsibility toward family and creating lasting structure.",
            .ascendant: "Discipline and maturity enhanced. Taking yourself and your goals seriously.",
            .descendant: "Committed, long-lasting relationships. Learning important lessons through partnerships.",
        ],
        .uranus: [
            .midheaven: "Unconventional career path. Innovation, technology, and sudden changes in professional status.",
            .imumCoeli: "Unusual home life. Freedom, independence, and progressive ideas in domestic matters.",
            .ascendant: "Unique self-expression. Embracing your individuality and originality fully.",
            .descendant: "Attracts unusual, exciting relationships. Freedom and unpredictability in partnerships.",
        ],
        .neptune: [
            .midheaven: "Creative and spiritual career pursuits. Artistic recognition, healing professions favored.",
            .imumCoeli: "Spiritual home environment. Idealistic family connections and artistic domestic life.",
            .ascendant: "Enhanced intuition and creativity. Spiritual sensitivity and compassion heightened.",
            .descendant: "Soulmate connections possible. Idealistic, spiritual, and creative relationships.",
        ],
        .pluto: [
            .midheaven: "Transformative career experiences. Power, influence, and profound impact in public life.",
            .imumCoeli: "Deep psychological roots. Transformation through family and ancestral healing.",
            .ascendant: "Personal transformation and empowerment. Intense self-discovery and rebirth.",
            .descendant: "Intense, transformative relationships. Deep psychological bonds and mutual evolution.",
        ],
        .chiron: [
            .midheaven: "Healing through career. Teaching, mentoring, and guiding others from your experience.",
            .imumCoeli: "Healing family wounds. Finding wholeness through understanding your roots.",
            .ascendant: "Embracing your wounds as gifts. Becoming a wise guide for others.",
            .descendant: "Healing through relationships. Attracting those who benefit from your wisdom.",
        ],
        .northNode: [
            .midheaven: "Career aligned with life purpose. Destiny calling in the public sphere.",
            .imumCoeli: "Soul growth through family and home. Karmic connections to your roots.",
            .ascendant: "Stepping into your destined self. Life path activation and soul purpose.",
            .descendant: "Karmic relationships. Meeting destined partners for soul growth.",
        ],
        .southNode: [
            .midheaven: "Decreases career focus, highlighting karmic lessons over achievement.",
            .imumCoeli: "Revisits roots and emotional patterns, urging release of old \"home\" definitions.",
            .ascendant: "Shed outdated identities and rigid independence for evolution.",
            .descendant: "Draws familiar relationships that keep you stuck; time to break cycles.",
        ],
    ]

    // MARK: - Drawing Primitives

    static func drawOrb(ctx: CGContext, center: CGPoint, radius: CGFloat, color: UIColor) {
        ctx.setFillColor(color.cgColor)
        ctx.fillEllipse(in: CGRect(
            x: center.x - radius,
            y: center.y - radius,
            width: radius * 2,
            height: radius * 2
        ))

        // Inner highlight
        if let lighter = lightenColor(color, by: 0.3) {
            ctx.setFillColor(lighter.cgColor)
            let smallR = radius * 0.4
            ctx.fillEllipse(in: CGRect(
                x: center.x - radius * 0.3 - smallR,
                y: center.y - radius * 0.3 - smallR,
                width: smallR * 2,
                height: smallR * 2
            ))
        }
    }

    static func drawRoundedCard(
        ctx: CGContext,
        rect: CGRect,
        accentColor: UIColor? = nil
    ) {
        ctx.setFillColor(Brand.cardBg.cgColor)
        let path = UIBezierPath(roundedRect: rect, cornerRadius: 6)
        ctx.addPath(path.cgPath)
        ctx.fillPath()

        if let accent = accentColor {
            ctx.setFillColor(accent.cgColor)
            let accentRect = CGRect(x: rect.minX, y: rect.minY, width: 4, height: rect.height)
            let accentPath = UIBezierPath(roundedRect: accentRect, cornerRadius: 2)
            ctx.addPath(accentPath.cgPath)
            ctx.fillPath()
        }
    }

    static func drawFooter(ctx: CGContext, pageNum: Int, totalPages: Int) {
        let footerY = pageHeight - 30

        // Divider line
        ctx.setStrokeColor(Brand.purple.cgColor)
        ctx.setLineWidth(0.5)
        ctx.move(to: CGPoint(x: margin, y: footerY - 8))
        ctx.addLine(to: CGPoint(x: pageWidth - margin, y: footerY - 8))
        ctx.strokePath()

        // Brand name
        let brandAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 9, weight: .bold),
            .foregroundColor: Brand.purple,
        ]
        ("halohome.com" as NSString).draw(
            at: CGPoint(x: margin, y: footerY),
            withAttributes: brandAttrs
        )

        // Page number
        let pageAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 9, weight: .regular),
            .foregroundColor: Brand.zinc500,
        ]
        let pageStr = "\(pageNum) of \(totalPages)" as NSString
        let pageSize = pageStr.size(withAttributes: pageAttrs)
        pageStr.draw(
            at: CGPoint(x: pageWidth - margin - pageSize.width, y: footerY),
            withAttributes: pageAttrs
        )
    }

    // MARK: - Color Utilities

    static func lightenColor(_ color: UIColor, by amount: CGFloat) -> UIColor? {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        guard color.getRed(&r, green: &g, blue: &b, alpha: &a) else { return nil }
        return UIColor(
            red: min(1, r + amount),
            green: min(1, g + amount),
            blue: min(1, b + amount),
            alpha: a
        )
    }

    static func darkenColor(_ color: UIColor, by amount: CGFloat) -> UIColor? {
        var r: CGFloat = 0, g: CGFloat = 0, b: CGFloat = 0, a: CGFloat = 0
        guard color.getRed(&r, green: &g, blue: &b, alpha: &a) else { return nil }
        return UIColor(
            red: max(0, r - amount),
            green: max(0, g - amount),
            blue: max(0, b - amount),
            alpha: a
        )
    }

    // MARK: - Influence Level Colors

    static func influenceLevelColor(_ level: InfluenceLevel) -> UIColor {
        switch level {
        case .zenith: return Brand.gold
        case .gold: return Brand.purple
        case .strong: return Brand.blue
        case .moderate: return Brand.zinc400
        case .weak: return Brand.zinc500
        }
    }

    // MARK: - City Insights

    static func cityInsight(planet: Planet, lineType: AstroLineType, level: InfluenceLevel) -> String {
        let lineTheme: String
        switch lineType {
        case .midheaven: lineTheme = "career & recognition"
        case .ascendant: lineTheme = "identity & vitality"
        case .descendant: lineTheme = "partnerships"
        case .imumCoeli: lineTheme = "home & roots"
        }

        switch level {
        case .zenith:
            return "Peak \(planet.rawValue) energy. Exceptional for \(lineTheme)."
        case .gold:
            return "Power zone. Strong \(planet.rawValue) influence amplifies \(lineTheme)."
        case .strong:
            return "Notable \(planet.rawValue) presence. Good for \(lineType.shortName)-related pursuits."
        case .moderate, .weak:
            return "Moderate influence. Subtle \(planet.rawValue) energy supports \(lineType.displayName) themes."
        }
    }
}
