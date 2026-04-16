import SwiftUI
import UIKit

// MARK: - Natal Chart View

/// SwiftUI Canvas-rendered natal chart wheel.
/// Draws zodiac ring, house lines, planet glyphs, and aspect lines.
@available(iOS 17.0, *)
public struct NatalChartView: View {

    let chartData: NatalChartData
    let size: CGFloat
    @State private var selectedPlanet: String?
    @Environment(\.colorScheme) private var colorScheme

    public init(chartData: NatalChartData, size: CGFloat = 300) {
        self.chartData = chartData
        self.size = size
    }

    public var body: some View {
        ZStack {
            Canvas { context, canvasSize in
                let cx = canvasSize.width / 2
                let cy = canvasSize.height / 2
                let radius = min(cx, cy) - 4

                drawBackgroundCircle(context: context, cx: cx, cy: cy, radius: radius)
                drawInnerCircle(context: context, cx: cx, cy: cy, radius: radius * 0.35)
                drawAspectLines(context: context, cx: cx, cy: cy, innerRadius: radius * 0.35, planetRadius: radius * 0.68)
                drawHouseLines(context: context, cx: cx, cy: cy, innerRadius: radius * 0.35, outerRadius: radius * 0.85)
                drawZodiacRing(context: context, cx: cx, cy: cy, outerRadius: radius, innerRadius: radius * 0.85)
                drawCardinalLabels(context: context, cx: cx, cy: cy, radius: radius * 0.78)
            }
            zodiacLabelsOverlay
            planetGlyphOverlay
        }
        .frame(width: size, height: size)
        .contentShape(Rectangle())
        .onTapGesture {
            // Tap on empty space deselects
            selectedPlanet = nil
        }
        .accessibilityElement(children: .ignore)
        .accessibilityLabel(chartAccessibilityLabel)
    }

    // MARK: - Chart Math

    /// Convert ecliptic longitude to chart angle.
    /// ASC at left (180°), counter-clockwise.
    private func toChartAngle(_ longitude: Double) -> Double {
        let angle = (chartData.ascendant - longitude + 180).truncatingRemainder(dividingBy: 360)
        return angle < 0 ? angle + 360 : angle
    }

    private func polarToCartesian(cx: CGFloat, cy: CGFloat, radius: CGFloat, angleDeg: Double) -> CGPoint {
        let rad = angleDeg * .pi / 180
        return CGPoint(
            x: cx + radius * cos(CGFloat(rad)),
            y: cy - radius * sin(CGFloat(rad))
        )
    }

    // MARK: - Background

    private func drawBackgroundCircle(context: GraphicsContext, cx: CGFloat, cy: CGFloat, radius: CGFloat) {
        let rect = CGRect(x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2)
        let path = Path(ellipseIn: rect)
        context.fill(path, with: .color(chartBackgroundFillColor))
        context.stroke(path, with: .color(chartBorderColor), lineWidth: 1)
    }

    private func drawInnerCircle(context: GraphicsContext, cx: CGFloat, cy: CGFloat, radius: CGFloat) {
        let rect = CGRect(x: cx - radius, y: cy - radius, width: radius * 2, height: radius * 2)
        let path = Path(ellipseIn: rect)
        context.stroke(path, with: .color(chartSecondaryBorderColor), lineWidth: 0.5)
    }

    // MARK: - Aspect Lines

    private func drawAspectLines(context: GraphicsContext, cx: CGFloat, cy: CGFloat, innerRadius: CGFloat, planetRadius: CGFloat) {
        let allAspects = calculateAspects()

        // Filter aspects by selected planet (if any)
        let aspects: [ChartAspect]
        if let selected = selectedPlanet {
            aspects = allAspects.filter { $0.planet1 == selected || $0.planet2 == selected }
        } else {
            aspects = allAspects
        }

        for aspect in aspects {
            let angle1 = toChartAngle(aspect.longitude1)
            let angle2 = toChartAngle(aspect.longitude2)

            let p1 = polarToCartesian(cx: cx, cy: cy, radius: innerRadius * 0.95, angleDeg: angle1)
            let p2 = polarToCartesian(cx: cx, cy: cy, radius: innerRadius * 0.95, angleDeg: angle2)

            var path = Path()
            path.move(to: p1)
            path.addLine(to: p2)

            // Highlight aspects when a planet is selected; minor aspects are thinner
            let isMajor = aspect.type.isMajor
            let opacity: Double = selectedPlanet != nil
                ? (isMajor ? 0.8 : 0.6)
                : (isMajor ? 0.5 : 0.3)
            let lineWidth: CGFloat
            if selectedPlanet != nil {
                lineWidth = isMajor ? (aspect.type == .conjunction ? 2.0 : 1.2) : 0.8
            } else {
                lineWidth = isMajor ? (aspect.type == .conjunction ? 1.5 : 0.8) : 0.5
            }

            // Minor aspects use dashed lines; creative (quintile/bi-quintile) get dot-dash
            var style = StrokeStyle(lineWidth: lineWidth)
            if !isMajor {
                switch aspect.type {
                case .quintile, .biQuintile:
                    style.dash = [6, 2, 2, 2]   // dot-dash for creative aspects
                default:
                    style.dash = [4, 3]          // dashed for other minor aspects
                }
            }

            context.stroke(
                path,
                with: .color(aspect.color.opacity(opacity)),
                style: style
            )
        }
    }

    // MARK: - House Lines

    private func drawHouseLines(context: GraphicsContext, cx: CGFloat, cy: CGFloat, innerRadius: CGFloat, outerRadius: CGFloat) {
        for (i, cusp) in chartData.houseCusps.enumerated() {
            let angle = toChartAngle(cusp)
            let inner = polarToCartesian(cx: cx, cy: cy, radius: innerRadius, angleDeg: angle)
            let outer = polarToCartesian(cx: cx, cy: cy, radius: outerRadius, angleDeg: angle)

            var path = Path()
            path.move(to: inner)
            path.addLine(to: outer)

            // Cardinal houses (1, 4, 7, 10) are solid + thicker
            let isCardinal = [0, 3, 6, 9].contains(i)
            context.stroke(
                path,
                with: .color(isCardinal ? chartMajorHouseLineColor : chartMinorHouseLineColor),
                style: StrokeStyle(
                    lineWidth: isCardinal ? 1.5 : 0.5,
                    dash: isCardinal ? [] : [4, 3]
                )
            )
        }
    }

    // MARK: - Zodiac Ring

    private func drawZodiacRing(context: GraphicsContext, cx: CGFloat, cy: CGFloat, outerRadius: CGFloat, innerRadius: CGFloat) {
        // Draw 12 segments
        for i in 0..<12 {
            let segmentStart = Double(i) * 30.0
            let startAngle = toChartAngle(segmentStart)
            let endAngle = toChartAngle(segmentStart + 30.0)

            // Element-based colors
            let color = zodiacSegmentColor(signIndex: i)

            // Draw arc segment
            var path = Path()
            path.addArc(
                center: CGPoint(x: cx, y: cy),
                radius: outerRadius,
                startAngle: .degrees(-startAngle),
                endAngle: .degrees(-endAngle),
                clockwise: false
            )
            path.addArc(
                center: CGPoint(x: cx, y: cy),
                radius: innerRadius,
                startAngle: .degrees(-endAngle),
                endAngle: .degrees(-startAngle),
                clockwise: true
            )
            path.closeSubpath()

            context.fill(path, with: .color(color.opacity(0.3)))

            // Draw segment border
            context.stroke(path, with: .color(chartBorderColor), lineWidth: 0.5)
        }
    }

    // MARK: - Cardinal Labels

    private func drawCardinalLabels(context: GraphicsContext, cx: CGFloat, cy: CGFloat, radius: CGFloat) {
        let labels: [(String, Double)] = [
            ("ASC", chartData.ascendant),
            ("MC", chartData.midheaven),
            ("DSC", chartData.descendant),
            ("IC", chartData.imumCoeli),
        ]

        for (label, longitude) in labels {
            let angle = toChartAngle(longitude)
            let point = polarToCartesian(cx: cx, cy: cy, radius: radius, angleDeg: angle)

            let text = Text(label)
                .font(.system(size: size * 0.028, weight: .bold))
                .foregroundStyle(Color.acAccent)

            context.draw(
                context.resolve(text),
                at: point,
                anchor: .center
            )
        }
    }

    // MARK: - Overlay Icons

    private var zodiacLabelsOverlay: some View {
        GeometryReader { proxy in
            let cx = proxy.size.width / 2
            let cy = proxy.size.height / 2
            let radius = min(cx, cy) - 4

            ForEach(ZodiacSign.allCases) { sign in
                let index = sign.rawValue
                let midLongitude = Double(index) * 30.0 + 15.0
                let angle = toChartAngle(midLongitude)
                let point = polarToCartesian(cx: cx, cy: cy, radius: radius * 0.925, angleDeg: angle)

                ZodiacIconView(sign: sign, tint: chartLabelColor, fallbackFontSize: size * 0.022)
                    .frame(width: size * 0.048, height: size * 0.048)
                    .position(point)
            }
        }
        .allowsHitTesting(false)
    }

    private var planetGlyphOverlay: some View {
        GeometryReader { proxy in
            let cx = proxy.size.width / 2
            let cy = proxy.size.height / 2
            let radius = min(cx, cy) - 4
            let positioned = resolvePositions(radius: radius * 0.68)

            ForEach(Array(positioned.enumerated()), id: \.offset) { _, planet in
                let point = polarToCartesian(cx: cx, cy: cy, radius: planet.resolvedRadius, angleDeg: planet.resolvedAngle)

                PlanetIconView(
                    planetName: planet.planetName,
                    tint: selectedPlanet == planet.planetName ? planet.color : planet.color.opacity(selectedPlanet == nil ? 1.0 : 0.4),
                    fallbackFontSize: size * 0.05
                )
                    .frame(width: size * 0.08, height: size * 0.08)
                    .contentShape(Rectangle())
                    .onTapGesture {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            if selectedPlanet == planet.planetName {
                                selectedPlanet = nil
                            } else {
                                selectedPlanet = planet.planetName
                            }
                        }
                    }
                    .position(point)
            }
        }
    }

    // MARK: - Crowding Detection

    private struct PositionedPlanet {
        let planetName: String
        let color: Color
        let longitude: Double
        var resolvedAngle: Double
        var resolvedRadius: CGFloat
    }

    private func resolvePositions(radius: CGFloat) -> [PositionedPlanet] {
        var planets: [PositionedPlanet] = chartData.planets.map { p in
            PositionedPlanet(
                planetName: p.planet,
                color: planetGlyphColor(p.planet),
                longitude: p.longitude,
                resolvedAngle: toChartAngle(p.longitude),
                resolvedRadius: radius
            )
        }

        // Sort by angle for crowding detection
        planets.sort { $0.resolvedAngle < $1.resolvedAngle }

        // Separate crowded planets (within 8°)
        let minSeparation = 8.0
        for i in 1..<planets.count {
            let diff = abs(planets[i].resolvedAngle - planets[i - 1].resolvedAngle)
            if diff < minSeparation {
                // Push outward
                planets[i].resolvedRadius = radius * 1.12
            }
        }

        return planets
    }

    // MARK: - Aspect Calculation

    private struct ChartAspect {
        let type: AspectType
        let planet1: String
        let planet2: String
        let longitude1: Double
        let longitude2: Double
        let color: Color
    }

    private enum AspectType: String {
        case conjunction, sextile, square, trine, opposition
        // Minor aspects
        case semiSextile, semiSquare, quintile, sesquiquadrate, biQuintile, quincunx

        var isMajor: Bool {
            switch self {
            case .conjunction, .sextile, .square, .trine, .opposition: return true
            default: return false
            }
        }
    }

    private func calculateAspects() -> [ChartAspect] {
        let aspectDefinitions: [(AspectType, Double, Double, Color)] = [
            // Major (Ptolemaic) aspects
            (.conjunction, 0, 8, .purple),
            (.sextile, 60, 4, .green),
            (.square, 90, 6, .red),
            (.trine, 120, 6, .blue),
            (.opposition, 180, 8, .orange),
            // Minor aspects
            (.semiSextile, 30, 2, Color(red: 0.6, green: 0.9, blue: 0.6)),   // light green
            (.semiSquare, 45, 2, Color(red: 1.0, green: 0.6, blue: 0.2)),     // orange
            (.quintile, 72, 2, Color(red: 1.0, green: 0.4, blue: 0.7)),       // pink
            (.sesquiquadrate, 135, 2, Color(red: 0.9, green: 0.4, blue: 0.1)),// dark orange
            (.biQuintile, 144, 2, Color(red: 0.8, green: 0.2, blue: 0.8)),    // fuchsia
            (.quincunx, 150, 3, Color(red: 0.0, green: 0.6, blue: 0.6)),      // teal
        ]

        var aspects: [ChartAspect] = []
        let planets = chartData.planets

        for i in 0..<planets.count {
            for j in (i + 1)..<planets.count {
                var diff = abs(planets[i].longitude - planets[j].longitude)
                if diff > 180 { diff = 360 - diff }

                for (type, angle, orb, color) in aspectDefinitions {
                    if abs(diff - angle) <= orb {
                        aspects.append(ChartAspect(
                            type: type,
                            planet1: planets[i].planet,
                            planet2: planets[j].planet,
                            longitude1: planets[i].longitude,
                            longitude2: planets[j].longitude,
                            color: color
                        ))
                        break
                    }
                }
            }
        }

        return aspects
    }

    // MARK: - Color Helpers

    private func zodiacSegmentColor(signIndex: Int) -> Color {
        // Element colors: fire=amber, earth=emerald, air=cornflower, water=purple
        let element = signIndex % 4
        switch element {
        case 0: return Color.orange   // Fire (Aries, Leo, Sag)
        case 1: return Color.green    // Earth (Taurus, Virgo, Cap)
        case 2: return Color.blue     // Air (Gemini, Libra, Aqua)
        case 3: return Color.purple   // Water (Cancer, Scorpio, Pisces)
        default: return Color.gray
        }
    }

    private func planetGlyphColor(_ name: String) -> Color {
        switch name {
        case "Sun": return Color.acPlanetSun
        case "Moon": return Color.acPlanetMoon
        case "Mercury": return Color.acPlanetMercury
        case "Venus": return Color.acPlanetVenus
        case "Mars": return Color.acPlanetMars
        case "Jupiter": return Color.acPlanetJupiter
        case "Saturn": return Color.acPlanetSaturn
        case "Uranus": return Color.acPlanetUranus
        case "Neptune": return Color.acPlanetNeptune
        case "Pluto": return Color.acPlanetPluto
        case "Chiron": return Color.acPlanetChiron
        case "NorthNode": return Color.acPlanetNorthNode
        case "SouthNode": return Color.acPlanetSouthNode
        default: return defaultPlanetGlyphColor
        }
    }

    private var chartBackgroundFillColor: Color {
        colorScheme == .dark
            ? Color(white: 0.08)
            : Color(white: 0.95)
    }

    private var chartBorderColor: Color {
        colorScheme == .dark
            ? Color.white.opacity(0.15)
            : Color.black.opacity(0.14)
    }

    private var chartSecondaryBorderColor: Color {
        colorScheme == .dark
            ? Color.white.opacity(0.2)
            : Color.black.opacity(0.2)
    }

    private var chartMajorHouseLineColor: Color {
        colorScheme == .dark
            ? Color.white.opacity(0.5)
            : Color.black.opacity(0.45)
    }

    private var chartMinorHouseLineColor: Color {
        colorScheme == .dark
            ? Color.white.opacity(0.2)
            : Color.black.opacity(0.2)
    }

    private var chartLabelColor: Color {
        colorScheme == .dark
            ? Color.white.opacity(0.8)
            : Color.black.opacity(0.75)
    }

    private var defaultPlanetGlyphColor: Color {
        colorScheme == .dark ? .white : .black
    }

    private var chartAccessibilityLabel: String {
        let planetDescriptions = chartData.planets.prefix(5).map { p in
            "\(p.planet) in \(p.signName) at \(Int(p.degreeInSign)) degrees, house \(p.house)"
        }
        return "Natal chart. Ascendant in \(chartData.planets.isEmpty ? "unknown" : signName(for: chartData.ascendant)). \(planetDescriptions.joined(separator: ". "))"
    }

    private func signName(for longitude: Double) -> String {
        let signs = ["Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
                     "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"]
        let index = Int(longitude / 30.0) % 12
        return signs[index]
    }
}

// MARK: - Natal Chart Data Model

/// Data model for NatalChartView rendering
public struct NatalChartData: Equatable, Sendable {
    public let ascendant: Double
    public let midheaven: Double
    public let descendant: Double
    public let imumCoeli: Double
    public let houseCusps: [Double]
    public let houseSystem: String
    public let planets: [NatalChartPlanet]
    public let zodiacType: String

    public init(
        ascendant: Double,
        midheaven: Double,
        descendant: Double,
        imumCoeli: Double,
        houseCusps: [Double],
        houseSystem: String,
        planets: [NatalChartPlanet],
        zodiacType: String
    ) {
        self.ascendant = ascendant
        self.midheaven = midheaven
        self.descendant = descendant
        self.imumCoeli = imumCoeli
        self.houseCusps = houseCusps
        self.houseSystem = houseSystem
        self.planets = planets
        self.zodiacType = zodiacType
    }
}

/// Planet position data for chart rendering
public struct NatalChartPlanet: Equatable, Sendable {
    public let planet: String
    public let longitude: Double
    public let signName: String
    public let degreeInSign: Double
    public let retrograde: Bool
    public let house: Int

    public init(planet: String, longitude: Double, signName: String, degreeInSign: Double, retrograde: Bool, house: Int) {
        self.planet = planet
        self.longitude = longitude
        self.signName = signName
        self.degreeInSign = degreeInSign
        self.retrograde = retrograde
        self.house = house
    }
}

// MARK: - Astrology Icons

@available(iOS 17.0, *)
enum ZodiacSign: Int, CaseIterable, Identifiable {
    case aries = 0
    case taurus
    case gemini
    case cancer
    case leo
    case virgo
    case libra
    case scorpio
    case sagittarius
    case capricorn
    case aquarius
    case pisces

    var id: Int { rawValue }

    init?(signName: String) {
        switch signName.lowercased().replacingOccurrences(of: " ", with: "") {
        case "aries": self = .aries
        case "taurus": self = .taurus
        case "gemini": self = .gemini
        case "cancer": self = .cancer
        case "leo": self = .leo
        case "virgo": self = .virgo
        case "libra": self = .libra
        case "scorpio": self = .scorpio
        case "sagittarius": self = .sagittarius
        case "capricorn": self = .capricorn
        case "aquarius": self = .aquarius
        case "pisces": self = .pisces
        default: return nil
        }
    }

    var fallbackText: String {
        switch self {
        case .aries: return "Ar"
        case .taurus: return "Ta"
        case .gemini: return "Ge"
        case .cancer: return "Ca"
        case .leo: return "Le"
        case .virgo: return "Vi"
        case .libra: return "Li"
        case .scorpio: return "Sc"
        case .sagittarius: return "Sg"
        case .capricorn: return "Cp"
        case .aquarius: return "Aq"
        case .pisces: return "Pi"
        }
    }

    fileprivate var symbolCandidates: [String] {
        let base = String(describing: self)
        return [
            "zodiac.\(base)",
            base,
        ]
    }
}

@available(iOS 17.0, *)
struct ZodiacIconView: View {
    let sign: ZodiacSign
    let tint: Color
    let fallbackFontSize: CGFloat

    var body: some View {
        if let symbolName = availableSystemSymbolName(candidates: sign.symbolCandidates) {
            Image(systemName: symbolName)
                .resizable()
                .scaledToFit()
                .foregroundStyle(tint)
        } else {
            Text(sign.fallbackText)
                .font(.system(size: fallbackFontSize, weight: .bold, design: .rounded))
                .minimumScaleFactor(0.5)
                .lineLimit(1)
                .foregroundStyle(tint)
        }
    }
}

@available(iOS 17.0, *)
struct PlanetIconView: View {
    let planetName: String
    let tint: Color
    let fallbackFontSize: CGFloat

    var body: some View {
        if let symbol = Planet(rawValue: planetName)?.symbol {
            Text(symbol)
                .font(.system(size: fallbackFontSize))
                .foregroundStyle(tint)
        } else if let symbolName = availableSystemSymbolName(candidates: symbolCandidates(for: planetName)) {
            Image(systemName: symbolName)
                .resizable()
                .scaledToFit()
                .foregroundStyle(tint)
        } else {
            Text(fallbackPlanetText(for: planetName))
                .font(.system(size: fallbackFontSize, weight: .semibold, design: .rounded))
                .minimumScaleFactor(0.5)
                .lineLimit(1)
                .foregroundStyle(tint)
        }
    }

    private func symbolCandidates(for planetName: String) -> [String] {
        switch planetName {
        case "Sun":
            return ["sun.max.fill", "sun.max", "sun.min"]
        case "Moon":
            return ["moon.fill", "moon", "moon.stars.fill"]
        case "Mercury":
            return ["mercury", "m.circle"]
        case "Venus":
            return ["venus", "v.circle"]
        case "Mars":
            return ["mars", "m.circle.fill"]
        case "Jupiter":
            return ["jupiter", "j.circle"]
        case "Saturn":
            return ["saturn", "s.circle"]
        case "Uranus":
            return ["uranus", "u.circle"]
        case "Neptune":
            return ["neptune", "n.circle"]
        case "Pluto":
            return ["pluto", "p.circle"]
        case "Chiron":
            return ["cross.case.fill", "cross.case"]
        case "NorthNode":
            return ["arrow.up.circle.fill", "arrow.up.circle"]
        case "SouthNode":
            return ["arrow.down.circle.fill", "arrow.down.circle"]
        default:
            return []
        }
    }

    private func fallbackPlanetText(for planetName: String) -> String {
        switch planetName {
        case "NorthNode": return "NN"
        case "SouthNode": return "SN"
        default:
            return String(planetName.prefix(2)).uppercased()
        }
    }
}

@available(iOS 17.0, *)
private func availableSystemSymbolName(candidates: [String]) -> String? {
    candidates.first { UIImage(systemName: $0) != nil }
}
