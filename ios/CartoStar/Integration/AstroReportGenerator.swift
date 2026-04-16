import UIKit
import FeatureGlobe
import FeatureScout

// MARK: - Report Configuration

struct ReportConfig {
    let birthDate: String
    let birthTime: String
    let birthLocation: String
    let selectedLines: [AstroLine]
    let citiesPerLine: Int

    init(
        birthDate: String,
        birthTime: String,
        birthLocation: String,
        selectedLines: [AstroLine],
        citiesPerLine: Int = 5
    ) {
        self.birthDate = birthDate
        self.birthTime = birthTime
        self.birthLocation = birthLocation
        self.selectedLines = selectedLines
        self.citiesPerLine = citiesPerLine
    }
}

// MARK: - City Influence Result

struct CityInfluenceResult {
    let city: City
    let distance: Int        // km from line
    let influenceLevel: InfluenceLevel
}

// MARK: - Report Generator

/// Generates branded PDF astrocartography reports.
/// Drawing primitives, colors, and interpretations are in ReportDrawingHelpers.swift.
enum AstroReportGenerator {

    private typealias D = ReportDrawing
    private typealias Brand = ReportDrawing.Brand

    // MARK: - Public API

    /// Generate a branded PDF report and return the data
    static func generateReport(config: ReportConfig) async -> Data {
        let pageRect = CGRect(x: 0, y: 0, width: D.pageWidth, height: D.pageHeight)
        let renderer = UIGraphicsPDFRenderer(bounds: pageRect)

        let cities: [City]
        do {
            cities = try await CityDataLoader.loadCities()
        } catch {
            cities = []
        }

        let data = renderer.pdfData { context in
            // Title page
            drawTitlePage(context: context, config: config)

            // Line detail pages
            for line in config.selectedLines {
                let topCities = findCitiesAlongLine(
                    line: line,
                    cities: cities,
                    maxResults: config.citiesPerLine
                )
                drawLineDetailPage(
                    context: context,
                    line: line,
                    cities: topCities,
                    config: config
                )
            }
        }

        return data
    }

    /// Suggested filename for the report
    static func suggestedFilename() -> String {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        return "astrocartography-report-\(formatter.string(from: Date())).pdf"
    }

    // MARK: - Title Page

    private static func drawTitlePage(context: UIGraphicsPDFRendererContext, config: ReportConfig) {
        context.beginPage()
        let ctx = context.cgContext

        // Dark header area
        ctx.setFillColor(Brand.deepSpace.cgColor)
        ctx.fill(CGRect(x: 0, y: 0, width: D.pageWidth, height: 170))

        // Purple accent line
        ctx.setFillColor(Brand.purple.cgColor)
        ctx.fill(CGRect(x: 0, y: 169, width: D.pageWidth, height: 2))

        // Decorative orbs
        D.drawOrb(ctx: ctx, center: CGPoint(x: 60, y: 50), radius: 12, color: Brand.purple)
        D.drawOrb(ctx: ctx, center: CGPoint(x: D.pageWidth - 70, y: 60), radius: 8, color: Brand.blue)
        D.drawOrb(ctx: ctx, center: CGPoint(x: 100, y: 130), radius: 6, color: Brand.gold)
        D.drawOrb(ctx: ctx, center: CGPoint(x: D.pageWidth - 100, y: 120), radius: 10, color: Brand.amber)

        // Main title
        let titleAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 32, weight: .bold),
            .foregroundColor: Brand.white,
        ]
        let title = "Astrocartography" as NSString
        let titleSize = title.size(withAttributes: titleAttrs)
        title.draw(
            at: CGPoint(x: (D.pageWidth - titleSize.width) / 2, y: 55),
            withAttributes: titleAttrs
        )

        // Subtitle
        let subtitleAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 14, weight: .regular),
            .foregroundColor: Brand.zinc400,
        ]
        let subtitle = "Personal Location Report" as NSString
        let subtitleSize = subtitle.size(withAttributes: subtitleAttrs)
        subtitle.draw(
            at: CGPoint(x: (D.pageWidth - subtitleSize.width) / 2, y: 96),
            withAttributes: subtitleAttrs
        )

        // Brand URL
        let brandAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 11, weight: .medium),
            .foregroundColor: Brand.purple,
        ]
        let brand = "halohome.com" as NSString
        let brandSize = brand.size(withAttributes: brandAttrs)
        brand.draw(
            at: CGPoint(x: (D.pageWidth - brandSize.width) / 2, y: 122),
            withAttributes: brandAttrs
        )

        // Birth Information Card
        let cardY: CGFloat = 200
        let cardHeight: CGFloat = 120
        D.drawRoundedCard(
            ctx: ctx,
            rect: CGRect(x: D.margin, y: cardY, width: D.contentWidth, height: cardHeight),
            accentColor: Brand.purple
        )

        // Birth details label
        let labelAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 10, weight: .bold),
            .foregroundColor: Brand.purple,
        ]
        ("BIRTH DETAILS" as NSString).draw(
            at: CGPoint(x: D.margin + 20, y: cardY + 18),
            withAttributes: labelAttrs
        )

        // Date and time
        let dateAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 16, weight: .bold),
            .foregroundColor: Brand.darkText,
        ]
        (config.birthDate as NSString).draw(
            at: CGPoint(x: D.margin + 20, y: cardY + 40),
            withAttributes: dateAttrs
        )

        let timeAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 13, weight: .regular),
            .foregroundColor: Brand.zinc500,
        ]
        let dateWidth = (config.birthDate as NSString).size(withAttributes: dateAttrs).width
        ("at \(config.birthTime)" as NSString).draw(
            at: CGPoint(x: D.margin + 20 + dateWidth + 8, y: cardY + 42),
            withAttributes: timeAttrs
        )

        // Location
        let locationAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 12, weight: .regular),
            .foregroundColor: Brand.bodyText,
        ]
        (config.birthLocation as NSString).draw(
            at: CGPoint(x: D.margin + 20, y: cardY + 68),
            withAttributes: locationAttrs
        )

        // Lines analyzed count
        let countAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 11, weight: .bold),
            .foregroundColor: Brand.purple,
        ]
        ("\(config.selectedLines.count) LINES ANALYZED" as NSString).draw(
            at: CGPoint(x: D.margin + 20, y: cardY + 94),
            withAttributes: countAttrs
        )

        // Lines summary section
        let linesSectionY = cardY + cardHeight + 30
        ("PLANETARY LINES INCLUDED" as NSString).draw(
            at: CGPoint(x: D.margin, y: linesSectionY),
            withAttributes: labelAttrs
        )

        // Group by planet
        var linesByPlanet: [Planet: [AstroLineType]] = [:]
        for line in config.selectedLines {
            linesByPlanet[line.planet, default: []].append(line.lineType)
        }

        var lineY = linesSectionY + 24
        let colWidth = D.contentWidth / 3
        var colIndex = 0

        for (planet, lineTypes) in linesByPlanet.sorted(by: { $0.key.rawValue < $1.key.rawValue }) {
            let color = D.planetColors[planet] ?? Brand.zinc400
            let lineX = D.margin + CGFloat(colIndex % 3) * colWidth

            // Planet color dot
            D.drawOrb(ctx: ctx, center: CGPoint(x: lineX + 8, y: lineY + 4), radius: 5, color: color)

            // Planet name
            let planetNameAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 11, weight: .bold),
                .foregroundColor: Brand.darkText,
            ]
            (planet.rawValue as NSString).draw(
                at: CGPoint(x: lineX + 18, y: lineY - 4),
                withAttributes: planetNameAttrs
            )

            // Line types
            let typesStr = lineTypes.map(\.shortName).joined(separator: ", ")
            let typesAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 9, weight: .regular),
                .foregroundColor: Brand.zinc500,
            ]
            (typesStr as NSString).draw(
                at: CGPoint(x: lineX + 18, y: lineY + 10),
                withAttributes: typesAttrs
            )

            colIndex += 1
            if colIndex % 3 == 0 {
                lineY += 28
            }
        }

        // Report info box
        let infoY = max(lineY + 40, 520)
        ctx.setFillColor(Brand.cardBg.cgColor)
        let infoRect = CGRect(x: D.margin, y: infoY, width: D.contentWidth, height: 55)
        let infoPath = UIBezierPath(roundedRect: infoRect, cornerRadius: 6)
        ctx.addPath(infoPath.cgPath)
        ctx.fillPath()

        let infoAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.italicSystemFont(ofSize: 10),
            .foregroundColor: Brand.zinc500,
        ]
        ("This report analyzes your planetary lines to identify optimal locations for" as NSString).draw(
            at: CGPoint(x: D.margin + 12, y: infoY + 14),
            withAttributes: infoAttrs
        )
        ("career, relationships, home, and personal growth based on your unique birth chart." as NSString).draw(
            at: CGPoint(x: D.margin + 12, y: infoY + 30),
            withAttributes: infoAttrs
        )

        // Generated date
        let formatter = DateFormatter()
        formatter.dateStyle = .long
        let genDateAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 9, weight: .regular),
            .foregroundColor: Brand.zinc400,
        ]
        let genDate = "Generated \(formatter.string(from: Date()))" as NSString
        let genDateSize = genDate.size(withAttributes: genDateAttrs)
        genDate.draw(
            at: CGPoint(x: (D.pageWidth - genDateSize.width) / 2, y: D.pageHeight - 40),
            withAttributes: genDateAttrs
        )

        // Footer
        D.drawFooter(ctx: ctx, pageNum: 1, totalPages: config.selectedLines.count + 1)
    }

    // MARK: - Line Detail Page

    private static func drawLineDetailPage(
        context: UIGraphicsPDFRendererContext,
        line: AstroLine,
        cities: [CityInfluenceResult],
        config: ReportConfig
    ) {
        context.beginPage()
        let ctx = context.cgContext
        let color = D.planetColors[line.planet] ?? Brand.purple

        // Colored header
        ctx.setFillColor(color.cgColor)
        ctx.fill(CGRect(x: 0, y: 0, width: D.pageWidth, height: 90))

        // Darker bottom edge
        if let darkerColor = D.darkenColor(color, by: 0.15) {
            ctx.setFillColor(darkerColor.cgColor)
            ctx.fill(CGRect(x: 0, y: 75, width: D.pageWidth, height: 15))
        }

        // Planet orb
        D.drawOrb(ctx: ctx, center: CGPoint(x: D.margin + 18, y: 45), radius: 14, color: .white)

        // Planet name
        let planetAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 24, weight: .bold),
            .foregroundColor: UIColor.white,
        ]
        (line.planet.rawValue as NSString).draw(
            at: CGPoint(x: D.margin + 42, y: 30),
            withAttributes: planetAttrs
        )

        // Line type
        let lineTypeAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 15, weight: .regular),
            .foregroundColor: UIColor.white.withAlphaComponent(0.9),
        ]
        let planetWidth = (line.planet.rawValue as NSString).size(withAttributes: planetAttrs).width
        ("\(line.lineType.shortName) Line" as NSString).draw(
            at: CGPoint(x: D.margin + 50 + planetWidth, y: 34),
            withAttributes: lineTypeAttrs
        )

        // Interpretation
        let interpretation = D.interpretations[line.planet]?[line.lineType]
            ?? "\(line.planet.rawValue) energy meets \(line.lineType.displayName) themes at these locations."

        let interpRect = CGRect(x: D.margin, y: 102, width: D.contentWidth, height: 50)
        ctx.setFillColor(Brand.cardBg.cgColor)
        let interpPath = UIBezierPath(roundedRect: interpRect, cornerRadius: 6)
        ctx.addPath(interpPath.cgPath)
        ctx.fillPath()

        let interpAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.italicSystemFont(ofSize: 11),
            .foregroundColor: Brand.bodyText,
        ]
        let interpTextRect = CGRect(x: D.margin + 12, y: 112, width: D.contentWidth - 24, height: 36)
        (interpretation as NSString).draw(in: interpTextRect, withAttributes: interpAttrs)

        // Cities section
        if cities.isEmpty {
            let emptyAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 12, weight: .regular),
                .foregroundColor: Brand.zinc500,
            ]
            ("No major cities found within influence distance of this line." as NSString).draw(
                at: CGPoint(x: D.margin, y: 180),
                withAttributes: emptyAttrs
            )
        } else {
            drawCitiesTable(ctx: ctx, cities: cities, line: line, config: config)
        }

        // Footer
        let pageIndex = (config.selectedLines.firstIndex(where: { $0.id == line.id }) ?? 0) + 2
        D.drawFooter(ctx: ctx, pageNum: pageIndex, totalPages: config.selectedLines.count + 1)
    }

    // MARK: - Cities Table

    private static func drawCitiesTable(
        ctx: CGContext,
        cities: [CityInfluenceResult],
        line: AstroLine,
        config: ReportConfig
    ) {
        let color = D.planetColors[line.planet] ?? Brand.purple

        // Section header
        let headerAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 11, weight: .bold),
            .foregroundColor: color,
        ]
        ("TOP LOCATIONS" as NSString).draw(
            at: CGPoint(x: D.margin, y: 172),
            withAttributes: headerAttrs
        )

        // Table header
        var tableY: CGFloat = 192
        ctx.setFillColor(color.cgColor)
        ctx.fill(CGRect(x: D.margin, y: tableY, width: D.contentWidth, height: 28))

        let thAttrs: [NSAttributedString.Key: Any] = [
            .font: UIFont.systemFont(ofSize: 10, weight: .bold),
            .foregroundColor: UIColor.white,
        ]
        ("#" as NSString).draw(at: CGPoint(x: D.margin + 8, y: tableY + 7), withAttributes: thAttrs)
        ("City" as NSString).draw(at: CGPoint(x: D.margin + 30, y: tableY + 7), withAttributes: thAttrs)
        ("Country" as NSString).draw(at: CGPoint(x: D.margin + 200, y: tableY + 7), withAttributes: thAttrs)
        ("Distance" as NSString).draw(at: CGPoint(x: D.margin + 340, y: tableY + 7), withAttributes: thAttrs)
        ("Influence" as NSString).draw(at: CGPoint(x: D.margin + 420, y: tableY + 7), withAttributes: thAttrs)

        tableY += 28

        // Table rows
        for (index, cityResult) in cities.enumerated() {
            let isAlternate = index % 2 == 1
            if isAlternate {
                ctx.setFillColor(Brand.cardBg.cgColor)
                ctx.fill(CGRect(x: D.margin, y: tableY, width: D.contentWidth, height: 30))
            }

            let numAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 10, weight: .bold),
                .foregroundColor: color,
            ]
            ("\(index + 1)" as NSString).draw(
                at: CGPoint(x: D.margin + 10, y: tableY + 8),
                withAttributes: numAttrs
            )

            let cityNameAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 10, weight: .semibold),
                .foregroundColor: Brand.darkText,
            ]
            (cityResult.city.name as NSString).draw(
                at: CGPoint(x: D.margin + 30, y: tableY + 8),
                withAttributes: cityNameAttrs
            )

            let tdAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 10, weight: .regular),
                .foregroundColor: Brand.bodyText,
            ]
            (cityResult.city.country as NSString).draw(
                at: CGPoint(x: D.margin + 200, y: tableY + 8),
                withAttributes: tdAttrs
            )
            ("\(cityResult.distance) km" as NSString).draw(
                at: CGPoint(x: D.margin + 340, y: tableY + 8),
                withAttributes: tdAttrs
            )

            let influenceColor = D.influenceLevelColor(cityResult.influenceLevel)
            let influenceAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 10, weight: .medium),
                .foregroundColor: influenceColor,
            ]
            (cityResult.influenceLevel.displayName as NSString).draw(
                at: CGPoint(x: D.margin + 420, y: tableY + 8),
                withAttributes: influenceAttrs
            )

            tableY += 30
        }

        // City insights section
        var insightY = tableY + 24
        ("LOCATION INSIGHTS" as NSString).draw(
            at: CGPoint(x: D.margin, y: insightY),
            withAttributes: headerAttrs
        )
        insightY += 18

        for cityResult in cities {
            guard insightY + 50 < D.pageHeight - 60 else { break }

            let influenceColor = D.influenceLevelColor(cityResult.influenceLevel)
            D.drawRoundedCard(
                ctx: ctx,
                rect: CGRect(x: D.margin, y: insightY, width: D.contentWidth, height: 44),
                accentColor: influenceColor
            )

            // City name
            let insightNameAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 11, weight: .bold),
                .foregroundColor: Brand.darkText,
            ]
            ("\(cityResult.city.name), \(cityResult.city.country)" as NSString).draw(
                at: CGPoint(x: D.margin + 14, y: insightY + 8),
                withAttributes: insightNameAttrs
            )

            // Insight text
            let insight = D.cityInsight(
                planet: line.planet,
                lineType: line.lineType,
                level: cityResult.influenceLevel
            )
            let insightTextAttrs: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: 9, weight: .regular),
                .foregroundColor: Brand.zinc500,
            ]
            let insightTextRect = CGRect(x: D.margin + 14, y: insightY + 24, width: D.contentWidth - 28, height: 16)
            (insight as NSString).draw(in: insightTextRect, withAttributes: insightTextAttrs)

            insightY += 52
        }
    }

    // MARK: - City Finding

    private static let earthRadiusKm: Double = 6371
    private static let maxInfluenceDistanceKm: Double = 500
    private static let goldDistanceKm: Double = 200
    private static let strongDistanceKm: Double = 350
    private static let minPopulation: Int = 100_000

    /// Find cities along a planetary line sorted by distance
    static func findCitiesAlongLine(
        line: AstroLine,
        cities: [City],
        maxResults: Int = 5
    ) -> [CityInfluenceResult] {
        guard !line.coordinates.isEmpty else { return [] }

        // Filter to major cities
        let majorCities = cities.filter { $0.population >= minPopulation }

        var results: [CityInfluenceResult] = []

        for city in majorCities {
            let distance = distanceToLinePath(
                lat: city.latitude,
                lng: city.longitude,
                path: line.coordinates
            )

            guard distance <= maxInfluenceDistanceKm else { continue }

            let level = influenceLevel(distance: distance)
            results.append(CityInfluenceResult(
                city: city,
                distance: Int(distance.rounded()),
                influenceLevel: level
            ))
        }

        results.sort { $0.distance < $1.distance }
        return Array(results.prefix(maxResults))
    }

    private static func distanceToLinePath(
        lat: Double,
        lng: Double,
        path: [GlobeCoordinate]
    ) -> Double {
        guard !path.isEmpty else { return .infinity }
        guard path.count > 1 else {
            return haversineDistance(lat, lng, path[0].latitude, path[0].longitude)
        }

        var minDist = Double.infinity
        for i in 0..<(path.count - 1) {
            let p1 = path[i]
            let p2 = path[i + 1]
            if abs(p2.longitude - p1.longitude) > 180 { continue }

            let d = distanceToSegment(
                pLat: lat, pLng: lng,
                aLat: p1.latitude, aLng: p1.longitude,
                bLat: p2.latitude, bLng: p2.longitude
            )
            minDist = min(minDist, d)
        }
        return minDist
    }

    private static func distanceToSegment(
        pLat: Double, pLng: Double,
        aLat: Double, aLng: Double,
        bLat: Double, bLng: Double
    ) -> Double {
        let dA = haversineDistance(pLat, pLng, aLat, aLng)
        let dB = haversineDistance(pLat, pLng, bLat, bLng)
        let segLen = haversineDistance(aLat, aLng, bLat, bLng)
        guard segLen >= 0.1 else { return dA }

        let dx = bLat - aLat
        let dy = bLng - aLng
        let t = max(0, min(1, ((pLat - aLat) * dx + (pLng - aLng) * dy) / (dx * dx + dy * dy)))

        let nearLat = aLat + t * dx
        let nearLng = aLng + t * dy
        let dN = haversineDistance(pLat, pLng, nearLat, nearLng)

        return min(dA, dB, dN)
    }

    private static func haversineDistance(
        _ lat1: Double, _ lng1: Double,
        _ lat2: Double, _ lng2: Double
    ) -> Double {
        let dLat = (lat2 - lat1) * .pi / 180
        let dLng = (lng2 - lng1) * .pi / 180
        let a = sin(dLat / 2) * sin(dLat / 2)
            + cos(lat1 * .pi / 180) * cos(lat2 * .pi / 180)
            * sin(dLng / 2) * sin(dLng / 2)
        let c = 2 * atan2(sqrt(a), sqrt(1 - a))
        return earthRadiusKm * c
    }

    private static func influenceLevel(distance: Double) -> InfluenceLevel {
        if distance <= goldDistanceKm { return .gold }
        if distance <= strongDistanceKm { return .strong }
        if distance <= maxInfluenceDistanceKm { return .moderate }
        return .weak
    }
}
