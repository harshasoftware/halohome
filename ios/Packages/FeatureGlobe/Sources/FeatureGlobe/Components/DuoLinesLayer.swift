import SwiftUI
import DesignSystem

/// Configuration for displaying duo mode lines on the globe
/// Handles overlay of partner lines with different styling
public struct DuoLinesConfiguration: Equatable, Sendable {

    /// User's astro lines
    public var userLines: [AstroLine]

    /// Partner's astro lines
    public var partnerLines: [AstroLine]

    /// Which user lines are visible
    public var userLineVisibility: AstroLineVisibility

    /// Which partner lines are visible
    public var partnerLineVisibility: AstroLineVisibility

    /// Visual style for the lines
    public var style: DuoLinesStyle

    /// Compatible locations to highlight
    public var compatibleLocations: [CompatibleLocation]

    /// Whether to show intersection markers
    public var showIntersectionMarkers: Bool

    public init(
        userLines: [AstroLine] = [],
        partnerLines: [AstroLine] = [],
        userLineVisibility: AstroLineVisibility = .all,
        partnerLineVisibility: AstroLineVisibility = .all,
        style: DuoLinesStyle = .default,
        compatibleLocations: [CompatibleLocation] = [],
        showIntersectionMarkers: Bool = true
    ) {
        self.userLines = userLines
        self.partnerLines = partnerLines
        self.userLineVisibility = userLineVisibility
        self.partnerLineVisibility = partnerLineVisibility
        self.style = style
        self.compatibleLocations = compatibleLocations
        self.showIntersectionMarkers = showIntersectionMarkers
    }

    /// Get visible user lines
    public var visibleUserLines: [AstroLine] {
        userLines.filter { userLineVisibility.isVisible($0) }
    }

    /// Get visible partner lines
    public var visiblePartnerLines: [AstroLine] {
        partnerLines.filter { partnerLineVisibility.isVisible($0) }
    }
}

/// Protocol for globe views that support duo lines rendering
public protocol DuoLinesRenderable {
    /// Update the duo lines configuration
    func updateDuoLines(_ configuration: DuoLinesConfiguration)

    /// Clear all duo lines
    func clearDuoLines()

    /// Highlight a specific compatible location
    func highlightLocation(_ location: CompatibleLocation)

    /// Clear location highlights
    func clearLocationHighlights()
}

// MARK: - Line Style Provider

/// Provides styling information for rendering lines
public struct LineStyleProvider {

    /// Get line color for a planet
    public static func color(for planet: Planet) -> Color {
        switch planet {
        case .sun: return Color(red: 1.0, green: 0.8, blue: 0.0)
        case .moon: return Color(red: 0.75, green: 0.75, blue: 0.8)
        case .mercury: return Color(red: 1.0, green: 0.6, blue: 0.0)
        case .venus: return Color(red: 1.0, green: 0.4, blue: 0.6)
        case .mars: return Color(red: 1.0, green: 0.2, blue: 0.2)
        case .jupiter: return Color(red: 0.6, green: 0.4, blue: 0.8)
        case .saturn: return Color(red: 0.6, green: 0.5, blue: 0.3)
        case .uranus: return Color(red: 0.0, green: 0.8, blue: 0.9)
        case .neptune: return Color(red: 0.2, green: 0.4, blue: 0.9)
        case .pluto: return Color(red: 0.4, green: 0.2, blue: 0.5)
        case .chiron: return Color(red: 1.0, green: 0.412, blue: 0.706)
        case .northNode: return Color(red: 0.6, green: 0.196, blue: 0.8)
        case .southNode: return Color(red: 0.545, green: 0.0, blue: 0.545)
        }
    }

    /// Get line width for a line type
    public static func lineWidth(for lineType: AstroLineType, isPartner: Bool = false) -> CGFloat {
        let baseWidth: CGFloat = switch lineType {
        case .midheaven, .imumCoeli: 2.0
        case .ascendant, .descendant: 2.5
        }
        return isPartner ? baseWidth * 0.9 : baseWidth
    }

    /// Get dash pattern for partner lines
    public static var partnerDashPattern: [CGFloat] {
        [8, 4]
    }

    /// Generate GeoJSON feature for a line
    public static func geoJSONFeature(for line: AstroLine, isPartner: Bool) -> [String: Any] {
        let coordinates = line.coordinates.map { [$0.longitude, $0.latitude] }

        return [
            "type": "Feature",
            "properties": [
                "planet": line.planet.rawValue,
                "lineType": line.lineType.rawValue,
                "isPartner": isPartner,
                "displayName": line.displayName,
                "color": color(for: line.planet).hexString
            ],
            "geometry": [
                "type": "LineString",
                "coordinates": coordinates
            ]
        ]
    }
}

// MARK: - Color Extension

private extension Color {
    var hexString: String {
        guard let components = cgColor?.components, components.count >= 3 else {
            return "#FFFFFF"
        }
        let r = Int(components[0] * 255)
        let g = Int(components[1] * 255)
        let b = Int(components[2] * 255)
        return String(format: "#%02X%02X%02X", r, g, b)
    }
}

// MARK: - Duo Lines Overlay View (SwiftUI)

/// SwiftUI overlay view for displaying compatible location markers
public struct DuoLinesOverlayView: View {

    public let configuration: DuoLinesConfiguration
    public var onLocationTap: ((CompatibleLocation) -> Void)?

    @State private var hoveredLocation: CompatibleLocation?

    public init(
        configuration: DuoLinesConfiguration,
        onLocationTap: ((CompatibleLocation) -> Void)? = nil
    ) {
        self.configuration = configuration
        self.onLocationTap = onLocationTap
    }

    public var body: some View {
        GeometryReader { geometry in
            ZStack {
                // This would be populated by actual globe coordinate projection
                // For now, showing a placeholder for the intersection markers
                ForEach(configuration.compatibleLocations.prefix(5)) { location in
                    intersectionMarker(for: location)
                }
            }
        }
    }

    @ViewBuilder
    private func intersectionMarker(for location: CompatibleLocation) -> some View {
        Button {
            Haptics.tap()
            onLocationTap?(location)
        } label: {
            VStack(spacing: 2) {
                ZStack {
                    Circle()
                        .fill(Color.pink.opacity(0.3))
                        .frame(width: 32, height: 32)
                        .blur(radius: 4)

                    Circle()
                        .fill(Color.pink)
                        .frame(width: 16, height: 16)

                    Image(systemName: "heart.fill")
                        .font(.system(size: 8))
                        .foregroundStyle(.white)
                }

                if let cityName = location.cityName {
                    Text(cityName)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 6)
                        .padding(.vertical, 2)
                        .background(Color.black.opacity(0.6))
                        .clipShape(Capsule())
                }
            }
        }
    }
}

// MARK: - Duo Toggle Button

/// Floating button to toggle duo mode
public struct DuoToggleButton: View {

    @Binding public var isEnabled: Bool
    public var hasPartner: Bool
    public var partnerName: String?
    public var onAddPartner: () -> Void

    public init(
        isEnabled: Binding<Bool>,
        hasPartner: Bool,
        partnerName: String? = nil,
        onAddPartner: @escaping () -> Void
    ) {
        self._isEnabled = isEnabled
        self.hasPartner = hasPartner
        self.partnerName = partnerName
        self.onAddPartner = onAddPartner
    }

    public var body: some View {
        Button {
            Haptics.tap()
            if hasPartner {
                isEnabled.toggle()
            } else {
                onAddPartner()
            }
        } label: {
            HStack(spacing: DSSpacing.sm) {
                Image(systemName: isEnabled ? "person.2.fill" : "person.2")
                    .font(.system(size: 16, weight: .medium))

                if isEnabled, let name = partnerName {
                    Text("+ \(name)")
                        .font(DSTypography.caption)
                        .lineLimit(1)
                }
            }
            .foregroundStyle(isEnabled ? .white : .pink)
            .padding(.horizontal, DSSpacing.md)
            .padding(.vertical, DSSpacing.sm)
            .background(isEnabled ? Color.pink : Color.pink.opacity(0.15))
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .strokeBorder(Color.pink, lineWidth: isEnabled ? 0 : 1)
            )
        }
        .animation(SAIMotion.smooth, value: isEnabled)
    }
}

// MARK: - Preview

#Preview("Duo Toggle Button - Off") {
    VStack(spacing: 20) {
        DuoToggleButton(
            isEnabled: .constant(false),
            hasPartner: false,
            onAddPartner: {}
        )

        DuoToggleButton(
            isEnabled: .constant(false),
            hasPartner: true,
            partnerName: "Alex",
            onAddPartner: {}
        )

        DuoToggleButton(
            isEnabled: .constant(true),
            hasPartner: true,
            partnerName: "Alex",
            onAddPartner: {}
        )
    }
    .padding()
    .background(DSColors.background)
    .preferredColorScheme(.dark)
}
