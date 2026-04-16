import SwiftUI
import MapKit
import DesignSystem

// MARK: - City Analysis View

/// Shows detailed astrocartography analysis for a selected city/location.
/// iOS equivalent of web's CityInfoPanel AstrologyTab.
@available(iOS 17.0, *)
public struct CityAnalysisView: View {

    let analysis: LocationAnalysis
    let onDismiss: () -> Void
    let onLineHighlight: ((AstroLine?) -> Void)?
    let onLocalSpace: ((Double, Double) -> Void)?
    let onResetLocalSpace: (() -> Void)?
    let isLocalSpaceActive: Bool
    private let favoritesViewModel: FavoritesViewModel?

    @State private var lookAroundScene: MKLookAroundScene?
    @State private var isLoadingLookAround = false

    public init(
        analysis: LocationAnalysis,
        onDismiss: @escaping () -> Void,
        onLineHighlight: ((AstroLine?) -> Void)? = nil,
        onLocalSpace: ((Double, Double) -> Void)? = nil,
        onResetLocalSpace: (() -> Void)? = nil,
        isLocalSpaceActive: Bool = false,
        favoritesViewModel: FavoritesViewModel? = nil
    ) {
        self.analysis = analysis
        self.onDismiss = onDismiss
        self.onLineHighlight = onLineHighlight
        self.onLocalSpace = onLocalSpace
        self.onResetLocalSpace = onResetLocalSpace
        self.isLocalSpaceActive = isLocalSpaceActive
        self.favoritesViewModel = favoritesViewModel
    }

    public var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Header card
                    headerCard

                    // Score card (Influence Score first)
                    scoreCard

                    // Dominant planets
                    if !analysis.dominantPlanets.isEmpty {
                        dominantPlanetsSection
                    }

                    // Overall interpretation
                    interpretationCard

                    // Nearby lines
                    if !analysis.lines.isEmpty {
                        nearbyLinesSection
                    } else {
                        noLinesCard
                    }

                    // Local Space toggle
                    if onLocalSpace != nil || onResetLocalSpace != nil {
                        localSpaceButton
                    }

                    // Look Around preview (Apple's free Street View)
                    lookAroundSection

                    // Open in Maps buttons
                    openInMapsSection

                    // Search Flights deep links
                    searchFlightsSection
                }
                .padding(16)
            }
            .background(DSColors.background)
            .navigationTitle("Location Analysis")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { onDismiss() }
                }
            }
            .task {
                async let lookAround: Void = fetchLookAround()
                async let airport: Void = loadAirportForFlights()
                _ = await (lookAround, airport)
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Look Around (Apple's Free Street View)

    private func fetchLookAround() async {
        isLoadingLookAround = true
        let coordinate = CLLocationCoordinate2D(
            latitude: analysis.coordinate.latitude,
            longitude: analysis.coordinate.longitude
        )
        let request = MKLookAroundSceneRequest(coordinate: coordinate)
        do {
            lookAroundScene = try await request.scene
        } catch {
            lookAroundScene = nil
        }
        isLoadingLookAround = false
    }

    // MARK: - Local Space

    @ViewBuilder
    private var localSpaceButton: some View {
        if isLocalSpaceActive {
            Button {
                onResetLocalSpace?()
            } label: {
                HStack {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 16))
                    Text("Reset Local Space")
                        .font(.system(size: 15, weight: .medium))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(Color.gray.opacity(0.12))
                )
                .foregroundStyle(.secondary)
            }
        } else {
            Button {
                onLocalSpace?(analysis.coordinate.latitude, analysis.coordinate.longitude)
            } label: {
                HStack {
                    Image(systemName: "location.viewfinder")
                        .font(.system(size: 16))
                    Text("Local Space")
                        .font(.system(size: 15, weight: .medium))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .strokeBorder(Color.orange.opacity(0.3), lineWidth: 1)
                )
                .foregroundStyle(.primary)
            }
        }
    }

    @ViewBuilder
    private var lookAroundSection: some View {
        if isLoadingLookAround {
            HStack(spacing: 8) {
                ProgressView()
                    .scaleEffect(0.8)
                Text("Loading street view...")
                    .font(.caption)
                    .foregroundStyle(DSColors.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .frame(height: 180)
            .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
        } else if let scene = lookAroundScene {
            VStack(alignment: .leading, spacing: 0) {
                LookAroundPreview(initialScene: scene)
                    .frame(height: 200)
                    .clipShape(RoundedRectangle(cornerRadius: 16))
                    .overlay(
                        VStack {
                            HStack {
                                Spacer()
                                Label("Look Around", systemImage: "binoculars.fill")
                                    .font(.caption2)
                                    .fontWeight(.medium)
                                    .foregroundStyle(.white)
                                    .padding(.horizontal, 8)
                                    .padding(.vertical, 4)
                                    .background(.ultraThinMaterial)
                                    .clipShape(Capsule())
                                    .padding(8)
                            }
                            Spacer()
                        }
                    )
            }
            .overlay(
                RoundedRectangle(cornerRadius: 16)
                    .stroke(DSColors.borderHairline, lineWidth: 1)
            )
            .accessibilityLabel("Look Around preview of \(analysis.cityName ?? "this location")")
        }
        // If no scene available, show nothing (graceful fallback)
    }

    // MARK: - Open in Maps

    private var openInMapsSection: some View {
        HStack(spacing: 12) {
            // Apple Maps button
            Button {
                openInAppleMaps()
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "map.fill")
                        .font(.system(size: 14))
                    Text("Apple Maps")
                        .font(.system(size: 13, weight: .medium))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .foregroundStyle(DSColors.textPrimary)
                .acLiquidGlass(cornerRadius: ACRadius.glassSmall)
            }
            .accessibilityLabel("Open in Apple Maps")

            // Google Maps button
            Button {
                openInGoogleMaps()
            } label: {
                HStack(spacing: 6) {
                    Image(systemName: "globe")
                        .font(.system(size: 14))
                    Text("Google Maps")
                        .font(.system(size: 13, weight: .medium))
                }
                .frame(maxWidth: .infinity)
                .padding(.vertical, 12)
                .foregroundStyle(DSColors.textPrimary)
                .acLiquidGlass(cornerRadius: ACRadius.glassSmall)
            }
            .accessibilityLabel("Open in Google Maps")
        }
    }

    private func openInAppleMaps() {
        let coordinate = CLLocationCoordinate2D(
            latitude: analysis.coordinate.latitude,
            longitude: analysis.coordinate.longitude
        )
        let placemark = MKPlacemark(coordinate: coordinate)
        let mapItem = MKMapItem(placemark: placemark)
        mapItem.name = analysis.cityName ?? "Selected Location"
        mapItem.openInMaps(launchOptions: [
            MKLaunchOptionsMapCenterKey: NSValue(mkCoordinate: coordinate),
            MKLaunchOptionsMapSpanKey: NSValue(mkCoordinateSpan: MKCoordinateSpan(latitudeDelta: 0.05, longitudeDelta: 0.05)),
        ])
    }

    private func openInGoogleMaps() {
        let lat = analysis.coordinate.latitude
        let lng = analysis.coordinate.longitude
        let query = analysis.cityName?.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? ""

        // Try Google Maps app first, fall back to web
        if let gmapsURL = URL(string: "comgooglemaps://?center=\(lat),\(lng)&zoom=14&q=\(query)"),
           UIApplication.shared.canOpenURL(gmapsURL) {
            UIApplication.shared.open(gmapsURL)
        } else if let webURL = URL(string: "https://www.google.com/maps/search/?api=1&query=\(lat),\(lng)") {
            UIApplication.shared.open(webURL)
        }
    }

    // MARK: - Search Flights

    private var searchFlightsSection: some View {
        VStack(alignment: .leading, spacing: 10) {
            Label("Search Flights", systemImage: "airplane")
                .font(.subheadline)
                .fontWeight(.medium)
                .foregroundStyle(DSColors.textPrimary)

            // 2x2 grid of flight booking options
            VStack(spacing: 8) {
                HStack(spacing: 8) {
                    flightButton(
                        title: "Google Flights",
                        icon: "globe",
                        action: openGoogleFlights
                    )
                    flightButton(
                        title: "Skyscanner",
                        icon: "magnifyingglass",
                        action: openSkyscanner
                    )
                }
                HStack(spacing: 8) {
                    flightButton(
                        title: "Kayak",
                        icon: "sailboat",
                        action: openKayak
                    )
                    flightButton(
                        title: "Expedia",
                        icon: "suitcase",
                        action: openExpedia
                    )
                }
            }
        }
        .padding(12)
        .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
    }

    private func flightButton(title: String, icon: String, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            HStack(spacing: 6) {
                Image(systemName: icon)
                    .font(.system(size: 14))
                Text(title)
                    .font(.system(size: 13, weight: .medium))
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .foregroundStyle(DSColors.textPrimary)
            .acLiquidGlass(cornerRadius: ACRadius.button)
        }
        .accessibilityLabel("Search flights on \(title)")
    }

    // MARK: - Flight Deep Links (IATA-aware)

    /// Destination IATA code (nearest airport to the city coordinates)
    @State private var destinationIATA: String?
    @State private var airportLoaded = false

    private var flightDestinationName: String {
        let city = analysis.cityName ?? ""
        let country = analysis.country ?? ""
        return country.isEmpty ? city : "\(city), \(country)"
    }

    /// URL-encoded destination name suitable for query parameters (spaces as +)
    private var flightDestinationQuery: String {
        flightDestinationName
            .replacingOccurrences(of: " ", with: "+")
            .addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed)?
            .replacingOccurrences(of: "%2C", with: ",") ?? flightDestinationName
    }

    /// Load nearest airport IATA code for the city — called from main .task in parallel with LookAround
    private func loadAirportForFlights() async {
        guard !airportLoaded else { return }
        airportLoaded = true
        if let airport = await AirportService.shared.findNearestAirport(
            latitude: analysis.coordinate.latitude,
            longitude: analysis.coordinate.longitude
        ) {
            destinationIATA = airport.iataCode
        }
    }

    /// Smart open: tries app scheme first (if installed), falls back to web
    private func openFlight(appScheme: String, webURL: String) {
        if let appURL = URL(string: appScheme),
           UIApplication.shared.canOpenURL(appURL) {
            UIApplication.shared.open(appURL)
        } else if let fallback = URL(string: webURL) {
            UIApplication.shared.open(fallback)
        }
    }

    private func openGoogleFlights() {
        // Prefer IATA-based URL for precision, fall back to name-based search
        let query: String
        if let iata = destinationIATA {
            query = "Flights+to+\(iata)"
        } else {
            query = "Flights+to+\(flightDestinationQuery)"
        }
        if let url = URL(string: "https://www.google.com/travel/flights?q=\(query)") {
            UIApplication.shared.open(url)
        }
    }

    private func openSkyscanner() {
        if let iata = destinationIATA {
            // IATA-based: FROM anywhere TO destination airport
            openFlight(
                appScheme: "skyscanner://www.skyscanner.net/transport/flights/anywhere/\(iata.lowercased())/",
                webURL: "https://www.skyscanner.com/transport/flights/anywhere/\(iata.lowercased())/"
            )
        } else {
            // Fallback: city name search query (skyscanner home search)
            let query = flightDestinationQuery
            openFlight(
                appScheme: "skyscanner://www.skyscanner.net/transport/flights?destination=\(query)",
                webURL: "https://www.skyscanner.com/flights?destination=\(query)"
            )
        }
    }

    private func openKayak() {
        if let iata = destinationIATA {
            // FROM anywhere TO destination airport
            openFlight(
                appScheme: "kayak://flights/anywhere-\(iata)",
                webURL: "https://www.kayak.com/flights/anywhere-\(iata)"
            )
        } else {
            // Fallback: Google Flights-style city search (Kayak city query isn't reliable)
            let query = flightDestinationQuery
            openFlight(
                appScheme: "kayak://flights?destination=\(query)",
                webURL: "https://www.google.com/travel/flights?q=Flights+to+\(query)"
            )
        }
    }

    private func openExpedia() {
        if let iata = destinationIATA {
            openFlight(
                appScheme: "expedia://flightSearch?destination=\(iata)",
                webURL: "https://www.expedia.com/Flights-Search?leg1=to:\(iata)&passengers=adults:1&trip=oneway&mode=search"
            )
        } else {
            let query = flightDestinationQuery
            openFlight(
                appScheme: "expedia://flightSearch?destination=\(query)",
                webURL: "https://www.expedia.com/Flights-Search?leg1=to:\(query)&passengers=adults:1&trip=oneway&mode=search"
            )
        }
    }

    // MARK: - Header

    private var headerCard: some View {
        HStack(spacing: 12) {
            Image(systemName: "mappin.circle.fill")
                .font(.title)
                .foregroundStyle(Color.blue)
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 2) {
                Text(analysis.cityName ?? "Selected Location")
                    .font(.headline)
                    .foregroundStyle(DSColors.textPrimary)

                if let country = analysis.country {
                    Text(country)
                        .font(.subheadline)
                        .foregroundStyle(DSColors.textSecondary)
                }

                Text("\(analysis.coordinate.latitude, specifier: "%.4f"), \(analysis.coordinate.longitude, specifier: "%.4f")")
                    .font(.caption)
                    .foregroundStyle(DSColors.textSecondary)
            }

            Spacer()

            // Favorite button
            if let vm = favoritesViewModel {
                FavoriteButton(
                    viewModel: vm,
                    latitude: analysis.coordinate.latitude,
                    longitude: analysis.coordinate.longitude,
                    cityName: analysis.cityName ?? "Unknown Location",
                    country: analysis.country
                )
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
        .accessibilityElement(children: .combine)
    }

    // MARK: - Score Card

    private var scoreCard: some View {
        VStack(spacing: 12) {
            HStack {
                Text("Influence Score")
                    .font(.subheadline)
                    .foregroundStyle(DSColors.textSecondary)

                Spacer()

                Text(analysis.quality.displayName)
                    .font(.caption)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 4)
                    .background(qualityColor.opacity(0.2))
                    .foregroundStyle(qualityColor)
                    .clipShape(Capsule())
            }

            // Score bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(DSColors.borderHairline.opacity(0.3))

                    Capsule()
                        .fill(LinearGradient(
                            colors: [qualityColor.opacity(0.6), qualityColor],
                            startPoint: .leading,
                            endPoint: .trailing
                        ))
                        .frame(width: max(0, geo.size.width * CGFloat(analysis.aggregateScore) / 100))
                }
            }
            .frame(height: 8)

            HStack {
                Text("\(analysis.aggregateScore)")
                    .font(.system(size: 36, weight: .bold, design: .rounded))
                    .foregroundStyle(qualityColor)
                    .dynamicTypeSize(...DynamicTypeSize.accessibility3)

                Text("/ 100")
                    .font(.title3)
                    .foregroundStyle(DSColors.textSecondary)

                Spacer()

                Text("\(analysis.lines.count) line\(analysis.lines.count == 1 ? "" : "s") nearby")
                    .font(.subheadline)
                    .foregroundStyle(DSColors.textSecondary)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity)
        .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Influence score \(analysis.aggregateScore) out of 100, \(analysis.quality.displayName), \(analysis.lines.count) lines nearby")
    }

    // MARK: - Dominant Planets

    private var dominantPlanetsSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Dominant Energies")
                .font(.subheadline)
                .foregroundStyle(DSColors.textSecondary)

            HStack(spacing: 8) {
                ForEach(analysis.dominantPlanets, id: \.rawValue) { planet in
                    HStack(spacing: 4) {
                        Text(planet.symbol)
                            .font(.title3)
                        Text(planet.rawValue)
                            .font(.caption)
                            .fontWeight(.medium)
                    }
                    .padding(.horizontal, 12)
                    .padding(.vertical, 8)
                    .background(planetColor(planet).opacity(0.15))
                    .foregroundStyle(planetColor(planet))
                    .clipShape(Capsule())
                }
                Spacer()
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("Dominant energies: \(analysis.dominantPlanets.map(\.rawValue).joined(separator: ", "))")
    }

    // MARK: - Interpretation

    private var interpretationCard: some View {
        VStack(alignment: .leading, spacing: 8) {
            Label("Interpretation", systemImage: "sparkles")
                .font(.subheadline)
                .foregroundStyle(Color.blue)

            Text(analysis.overallInterpretation)
                .font(.body)
                .foregroundStyle(DSColors.textPrimary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
    }

    // MARK: - Nearby Lines

    private var nearbyLinesSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Nearby Lines")
                .font(.subheadline)
                .foregroundStyle(DSColors.textSecondary)

            ForEach(analysis.lines) { influence in
                lineInfluenceRow(influence)
            }
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
    }

    private func lineInfluenceRow(_ influence: LineInfluence) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack {
                // Planet symbol + name
                Text(influence.planet.symbol)
                    .font(.title3)
                    .foregroundStyle(planetColor(influence.planet))

                VStack(alignment: .leading, spacing: 1) {
                    Text("\(influence.planet.rawValue) \(influence.lineType?.displayName ?? "")")
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(DSColors.textPrimary)

                    Text("\(influence.distance) km away")
                        .font(.caption)
                        .foregroundStyle(DSColors.textSecondary)
                }

                Spacer()

                // Influence badge
                Text(influence.influenceLevel.displayName)
                    .font(.caption2)
                    .fontWeight(.semibold)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(influenceLevelColor(influence.influenceLevel).opacity(0.2))
                    .foregroundStyle(influenceLevelColor(influence.influenceLevel))
                    .clipShape(Capsule())
            }

            // Score bar
            GeometryReader { geo in
                ZStack(alignment: .leading) {
                    Capsule()
                        .fill(DSColors.borderHairline.opacity(0.2))

                    Capsule()
                        .fill(planetColor(influence.planet).opacity(0.7))
                        .frame(width: max(0, geo.size.width * CGFloat(influence.influenceScore) / 100))
                }
            }
            .frame(height: 4)

            // Interpretation
            Text(influence.interpretation)
                .font(.caption)
                .foregroundStyle(DSColors.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            if influence != analysis.lines.last {
                Divider()
                    .background(DSColors.borderHairline.opacity(0.3))
                    .padding(.top, 4)
            }
        }
        .contentShape(Rectangle())
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(influence.planet.rawValue) \(influence.lineType?.displayName ?? "") line, \(influence.distance) kilometers away, \(influence.influenceLevel.displayName) influence")
    }

    private var noLinesCard: some View {
        VStack(spacing: 12) {
            Image(systemName: "globe.americas")
                .font(.system(size: 40))
                .foregroundStyle(DSColors.textSecondary.opacity(0.5))

            Text("No significant astro lines nearby")
                .font(.subheadline)
                .foregroundStyle(DSColors.textSecondary)

            Text("This location is a neutral zone without strong planetary influences from your birth chart.")
                .font(.caption)
                .foregroundStyle(DSColors.textSecondary.opacity(0.7))
                .multilineTextAlignment(.center)
        }
        .padding(24)
        .frame(maxWidth: .infinity)
        .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
    }

    // MARK: - Color Helpers

    private var qualityColor: Color {
        switch analysis.quality {
        case .exceptional: return Color.acPlanetSun
        case .strong: return Color.acPlanetJupiter
        case .notable: return Color.acPlanetVenus
        case .moderate: return Color.acPlanetNeptune
        case .minimal: return DSColors.textSecondary
        }
    }

    private func planetColor(_ planet: Planet) -> Color {
        switch planet {
        case .sun: return Color.acPlanetSun
        case .moon: return Color.acPlanetMoon
        case .mercury: return Color.acPlanetMercury
        case .venus: return Color.acPlanetVenus
        case .mars: return Color.acPlanetMars
        case .jupiter: return Color.acPlanetJupiter
        case .saturn: return Color.acPlanetSaturn
        case .uranus: return Color.acPlanetUranus
        case .neptune: return Color.acPlanetNeptune
        case .pluto: return Color.acPlanetPluto
        case .chiron: return Color.acPlanetChiron
        case .northNode: return Color.acPlanetNorthNode
        case .southNode: return Color.acPlanetSouthNode
        }
    }

    private func influenceLevelColor(_ level: InfluenceLevel) -> Color {
        switch level {
        case .zenith: return .pink
        case .gold: return .yellow
        case .strong: return .green
        case .moderate: return .blue
        case .weak: return .gray
        }
    }
}
