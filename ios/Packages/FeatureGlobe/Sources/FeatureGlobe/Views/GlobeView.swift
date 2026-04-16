import SwiftUI
import DesignSystem
import Core

// MARK: - Globe View

/// Main SwiftUI view for the astrocartography globe
///
/// Features:
/// - Full-screen globe visualization
/// - Astrocartography line overlay
/// - Location selection
/// - Context menus
/// - Info cards for lines and locations
@MainActor
public struct GlobeView: View {
    // MARK: - Properties

    @Environment(\.colorScheme) private var colorScheme
    @State private var viewModel: GlobeViewModel
    @State private var interactionHandler: GlobeInteractionHandler

    @AppStorage(MapStyleTheme.storageKey) private var mapStyleRaw: String = MapStyleTheme.streets.rawValue

    @State private var showLineInfo: Bool = false
    @State private var showLocationInfo: Bool = false

    /// Callback when user requests to add a location to favorites
    public var onAddToFavorites: ((GlobeCoordinate, String?, String?) -> Void)?

    /// Callback when user taps the ⓘ button on a line card (iPhone — no right panel available).
    /// Receives (planet rawValue, lineType rawValue). If nil, falls back to the internal sheet.
    public var onLineInfoTap: ((String, String) -> Void)?

    /// When true, the built-in bottom info card overlay is suppressed.
    /// Use this on iPad where info cards are rendered externally (e.g. below the search bar).
    public var suppressInfoCardsOverlay: Bool = false

    /// When true, the nakshatra info card is excluded from this view's overlay.
    /// Use this on iPhone where the compact NakshatraMiniCard is rendered externally in MainAppView.
    public var suppressNakshatraCard: Bool = false

    /// Extra trailing padding added to the zoom controls so they slide left
    /// when an external panel is shown on the trailing edge (e.g. iPad right panel).
    public var zoomControlsTrailingPadding: CGFloat = 0

    /// When true, the built-in right-edge zoom controls are hidden.
    /// Use this on iPhone where zoom controls are rendered in the external right-edge VStack.
    public var suppressZoomControls: Bool = false

    // MARK: - Initialization

    public init(
        viewModel: GlobeViewModel? = nil,
        suppressInfoCardsOverlay: Bool = false,
        zoomControlsTrailingPadding: CGFloat = 0,
        suppressZoomControls: Bool = false,
        suppressNakshatraCard: Bool = false,
        onAddToFavorites: ((GlobeCoordinate, String?, String?) -> Void)? = nil,
        onLineInfoTap: ((String, String) -> Void)? = nil
    ) {
        self._viewModel = State(initialValue: viewModel ?? GlobeViewModel())
        self._interactionHandler = State(initialValue: GlobeInteractionHandler())
        self.suppressInfoCardsOverlay = suppressInfoCardsOverlay
        self.zoomControlsTrailingPadding = zoomControlsTrailingPadding
        self.suppressZoomControls = suppressZoomControls
        self.suppressNakshatraCard = suppressNakshatraCard
        self.onAddToFavorites = onAddToFavorites
        self.onLineInfoTap = onLineInfoTap
    }

    // MARK: - Body

    public var body: some View {
        ZStack {
            // Globe map (Mapbox with globe projection)
            MapboxGlobeView(
                cameraState: $viewModel.cameraState,
                markers: viewModel.markers,
                astroLines: viewModel.astroLines,
                localSpaceLines: viewModel.localSpaceLines,
                localSpaceCenter: viewModel.localSpaceCenter,
                localSpaceRadiusKm: viewModel.localSpaceRadiusKm,
                aspectLines: viewModel.aspectLines,
                paranLines: viewModel.paranLines,
                zenithPoints: viewModel.zenithPoints,
                selectedZenithPlanet: viewModel.selectedZenithPoint?.zenithPoint.planet.rawValue,
                transitLines: viewModel.filteredTransitLines,
                transitAspectLines: viewModel.filteredTransitAspectLines,
                transitParanLines: viewModel.isTransitMode ? viewModel.transitParanLines : [],
                selectedParanPoint: viewModel.selectedParanPoint?.paranLine,
                nakshatraData: viewModel.lineVisibility.showNakshatraBands ? viewModel.nakshatraData : [],
                lineVisibility: viewModel.lineVisibility,
                mapStyleTheme: currentMapStyle
            ) { event in
                viewModel.handleInteraction(event)
                handleInteractionEvent(event)
            }
            .ignoresSafeArea()

            // Overlay UI - line info card only (location card handled by MainAppView)
            // Suppressed on iPad where cards render externally below the search bar.
            if !suppressInfoCardsOverlay {
                VStack(spacing: 0) {
                    Spacer()

                    if let lineData = viewModel.selectedLine {
                        lineInfoCard(lineData)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    } else if let aspectData = viewModel.selectedAspectLine {
                        aspectLineInfoCard(aspectData)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    } else if let paranData = viewModel.selectedParanPoint {
                        paranPointInfoCard(paranData)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    } else if let zenithData = viewModel.selectedZenithPoint {
                        zenithPointInfoCard(zenithData)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    } else if let nakshatraData = viewModel.selectedNakshatra, !suppressNakshatraCard {
                        nakshatraInfoCard(nakshatraData)
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }
                }
                .animation(.easeInOut(duration: 0.25), value: viewModel.selectedLine?.id)
                .animation(.easeInOut(duration: 0.25), value: viewModel.selectedAspectLine?.id)
                .animation(.easeInOut(duration: 0.25), value: viewModel.selectedParanPoint?.id)
                .animation(.easeInOut(duration: 0.25), value: viewModel.selectedZenithPoint?.id)
                .animation(.easeInOut(duration: 0.25), value: viewModel.selectedNakshatra?.id)
            }

            // Zoom controls — right edge, shifted below center to sit under panel toggle button
            if !suppressZoomControls {
                HStack {
                    Spacer()
                    zoomControls
                        .padding(.trailing, 12 + zoomControlsTrailingPadding)
                }
                .padding(.top, 120)
                .animation(.spring(response: 0.3, dampingFraction: 0.85), value: zoomControlsTrailingPadding)
            }

            // Note: Natal chart widget is now rendered in MainAppView (top-left, below weather)

            // Loading overlay
            if viewModel.isLoading {
                loadingOverlay
            }

            // Context menu
            if interactionHandler.showContextMenu {
                contextMenuOverlay
            }
        }
        .sheet(isPresented: $viewModel.showLineFilters) {
            lineFiltersSheet
        }
    }

    // MARK: - Subviews

    private var zoomControls: some View {
        VStack(spacing: 8) {
            Button {
                viewModel.cameraState.zoom = min(viewModel.cameraState.zoom + 1, 20)
            } label: {
                Image(systemName: "plus")
                    .font(.title3)
                    .foregroundStyle(Color.acGlassTextPrimary)
                    .frame(width: 44, height: 44) // Minimum tap target
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Zoom in")

            Divider()
                .frame(width: 20)
                .accessibilityHidden(true)

            Button {
                viewModel.cameraState.zoom = max(viewModel.cameraState.zoom - 1, 0)
            } label: {
                Image(systemName: "minus")
                    .font(.title3)
                    .foregroundStyle(Color.acGlassTextPrimary)
                    .frame(width: 44, height: 44) // Minimum tap target
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Zoom out")
        }
        .acDarkGlass(cornerRadius: ACRadius.glassSmall)
    }

    private func locationInfoCard(_ location: SelectedLocation) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Image(systemName: "mappin.circle.fill")
                    .foregroundStyle(Color.acAccent)

                Text(location.displayName)
                    .font(.headline)
                    .foregroundStyle(Color.acGlassTextPrimary)

                Spacer()

                Button {
                    viewModel.clearSelection()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title3)
                        .foregroundStyle(Color.acGlassTextSecondary)
                }
                .accessibilityLabel("Dismiss location info")

                // Info button to open detailed analysis
                Button {
                    showLocationInfo = true
                } label: {
                    Image(systemName: "info.circle")
                        .font(.title3)
                        .foregroundStyle(Color.acAccent)
                }
                .accessibilityLabel("View detailed analysis")
            }

            Text("Lat: \(location.coordinate.latitude, specifier: "%.4f"), Lon: \(location.coordinate.longitude, specifier: "%.4f")")
                .font(.caption)
                .foregroundStyle(Color.acGlassTextSecondary)

            Text("Tap for detailed interpretation")
                .font(.caption)
                .foregroundStyle(Color.acAccent)

            // Show nearby lines
            let nearbyLines = viewModel.linesNear(location.coordinate, radius: 100)
            if !nearbyLines.isEmpty {
                Divider()
                    .background(Color.acBorder)
                    .accessibilityHidden(true)

                Text("Nearby Lines")
                    .font(.caption)
                    .foregroundStyle(Color.acGlassTextSecondary)

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(nearbyLines, id: \.id) { line in
                            lineChip(line)
                        }
                    }
                }
            }
        }
        .padding()
        .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
        // Block touch passthrough to globe
        .contentShape(Rectangle())
        .onTapGesture { } // Consume taps
        .gesture(DragGesture().onChanged { _ in }) // Consume drags
        .padding(.horizontal)
        .padding(.bottom, 220) // Clear toolbar + feature pills + search bar
        .accessibilityElement(children: .contain)
        .accessibilityLabel("Selected location: \(location.displayName)")
    }

    private func lineInfoCard(_ lineData: AstroLineCardData) -> some View {
        HStack {
            ZStack(alignment: .topTrailing) {
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        // Planet icon
                        Text(lineData.line.planet.symbol)
                            .font(.title2)
                            .foregroundStyle(planetColor(lineData.line.planet))

                        VStack(alignment: .leading) {
                            HStack(spacing: 6) {
                                Text(lineData.line.displayName)
                                    .font(.headline)
                                    .foregroundStyle(Color.acGlassTextPrimary)

                                // Transit badge (green, matching web LineInfoCard)
                                if lineData.line.id.hasPrefix("transit-") {
                                    Text("Transit")
                                        .font(.system(size: 10, weight: .medium))
                                        .foregroundStyle(Color(hex: "#22C55E"))
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color(hex: "#22C55E").opacity(0.15))
                                        .clipShape(RoundedRectangle(cornerRadius: 4))
                                }
                            }

                            Text(lineData.line.lineType.displayName)
                                .font(.caption)
                                .foregroundStyle(Color.acMutedForeground)
                        }

                        Spacer()
                    }

                    if let distance = lineData.distanceString {
                        HStack {
                            Image(systemName: "ruler")
                                .foregroundStyle(Color.acMutedForeground)
                            Text("Distance: \(distance)")
                                .font(.caption)
                                .foregroundStyle(Color.acMutedForeground)
                        }
                    }

                    // Line interpretation
                    Text(lineData.briefInterpretation)
                        .font(.caption)
                        .foregroundStyle(Color.acMutedForeground)
                        .lineLimit(3)
                }

                // Top-right action buttons
                HStack(spacing: 8) {
                    Button {
                        viewModel.selectedLine = nil
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title3)
                            .foregroundStyle(Color.acMutedForeground)
                    }
                    .accessibilityLabel("Dismiss line info")

                    Button {
                        if let handler = onLineInfoTap {
                            handler(lineData.line.planet.rawValue, lineData.line.lineType.rawValue)
                        } else {
                            showLineInfo = true
                        }
                    } label: {
                        Image(systemName: "info.circle")
                            .font(.title3)
                            .foregroundStyle(Color.acAccent)
                    }
                    .accessibilityLabel("View detailed interpretation")
                }
            }
            .padding()
            .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
            // Block touch passthrough to globe
            .contentShape(Rectangle())
            .onTapGesture { } // Consume taps
            .gesture(DragGesture().onChanged { _ in }) // Consume drags

            Spacer()  // Push card to left, away from right-side controls
        }
        .padding(.leading)
        .padding(.trailing, 70) // Extra trailing to clear right-side zoom controls
        .padding(.bottom, 200) // Clear bottom UI
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(lineData.line.displayName), \(lineData.line.lineType.displayName)\(lineData.distanceString.map { ", distance \($0)" } ?? "")")
    }

    private func aspectLineInfoCard(_ aspectData: AspectLineCardData) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    // Planet icon
                    Text(aspectData.aspectLine.planet.symbol)
                        .font(.title2)
                        .foregroundStyle(planetColor(aspectData.aspectLine.planet))

                    VStack(alignment: .leading) {
                        Text(aspectData.displayName)
                            .font(.headline)
                            .foregroundStyle(Color.acGlassTextPrimary)

                        HStack(spacing: 4) {
                            // Transit badge for transit aspect lines
                            if aspectData.aspectLine.id.hasPrefix("transit-") {
                                Text("Transit")
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundStyle(Color(hex: "#22C55E"))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color(hex: "#22C55E").opacity(0.2))
                                    .clipShape(Capsule())
                            }

                            // Aspect line type badge
                            Text("Aspect")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundStyle(Color.acMutedForeground)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.acMutedForeground.opacity(0.15))
                                .clipShape(Capsule())

                            // Harmonious/Challenging badge
                            Text(aspectData.natureDescription)
                                .font(.caption)
                                .foregroundStyle(aspectData.aspectLine.isHarmonious ? Color.green : Color.orange)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(
                                    (aspectData.aspectLine.isHarmonious ? Color.green : Color.orange)
                                        .opacity(0.2)
                                )
                                .clipShape(Capsule())
                        }
                    }

                    Spacer()

                    Button {
                        viewModel.selectedAspectLine = nil
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title3)
                            .foregroundStyle(Color.acMutedForeground)
                    }
                    .accessibilityLabel("Dismiss aspect line info")
                }

                if let distance = aspectData.distanceString {
                    HStack {
                        Image(systemName: "ruler")
                            .foregroundStyle(Color.acMutedForeground)
                        Text("Distance: \(distance)")
                            .font(.caption)
                            .foregroundStyle(Color.acMutedForeground)
                    }
                }

                // Aspect description
                Text(aspectDescription(for: aspectData))
                    .font(.caption)
                    .foregroundStyle(Color.acMutedForeground)
                    .lineLimit(2)
            }
            .padding()
            .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
            // Block touch passthrough to globe
            .contentShape(Rectangle())
            .onTapGesture { } // Consume taps
            .gesture(DragGesture().onChanged { _ in }) // Consume drags

            Spacer()  // Push card to left, away from right-side controls
        }
        .padding(.leading)
        .padding(.trailing, 70) // Extra trailing to clear right-side zoom controls
        .padding(.bottom, 200) // Clear bottom UI
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(aspectData.displayName), \(aspectData.natureDescription)\(aspectData.distanceString.map { ", distance \($0)" } ?? "")")
    }

    private func aspectDescription(for aspectData: AspectLineCardData) -> String {
        aspectData.briefDescription
    }

    private func paranPointInfoCard(_ paranData: ParanPointCardData) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    // Split planet symbols
                    HStack(spacing: 2) {
                        Text(planetSymbol(for: paranData.paranLine.planet1))
                            .font(.title3)
                            .foregroundStyle(planetColorFromString(paranData.paranLine.planet1))
                        Text("×")
                            .font(.caption)
                            .foregroundStyle(Color.acMutedForeground)
                        Text(planetSymbol(for: paranData.paranLine.planet2))
                            .font(.title3)
                            .foregroundStyle(planetColorFromString(paranData.paranLine.planet2))
                    }

                    VStack(alignment: .leading) {
                        Text(paranData.displayName)
                            .font(.headline)
                            .foregroundStyle(Color.acGlassTextPrimary)

                        HStack(spacing: 4) {
                            if paranData.paranLine.isTransit {
                                Text("Transit")
                                    .font(.system(size: 10, weight: .medium))
                                    .foregroundStyle(Color(hex: "#22C55E"))
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(Color(hex: "#22C55E").opacity(0.2))
                                    .clipShape(Capsule())
                            }
                            Text("Paran")
                                .font(.system(size: 10, weight: .medium))
                                .foregroundStyle(Color.acMutedForeground)
                                .padding(.horizontal, 6)
                                .padding(.vertical, 2)
                                .background(Color.acMutedForeground.opacity(0.15))
                                .clipShape(Capsule())
                        }
                    }

                    Spacer()

                    Button {
                        viewModel.selectedParanPoint = nil
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title3)
                            .foregroundStyle(Color.acMutedForeground)
                    }
                    .accessibilityLabel("Dismiss paran point info")
                }

                // Location info
                HStack {
                    Image(systemName: "location")
                        .foregroundStyle(Color.acMutedForeground)
                    Text("Latitude: \(paranData.latitudeString)")
                        .font(.caption)
                        .foregroundStyle(Color.acMutedForeground)
                }

                // Description
                Text(paranData.description)
                    .font(.caption)
                    .foregroundStyle(Color.acMutedForeground)
                    .lineLimit(2)
            }
            .padding()
            .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
            // Block touch passthrough to globe
            .contentShape(Rectangle())
            .onTapGesture { } // Consume taps
            .gesture(DragGesture().onChanged { _ in }) // Consume drags

            Spacer()  // Push card to left, away from right-side controls
        }
        .padding(.leading)
        .padding(.trailing, 70) // Extra trailing to clear right-side zoom controls
        .padding(.bottom, 200) // Clear bottom UI
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(paranData.displayName), paran point at latitude \(paranData.latitudeString)")
    }

    private func zenithPointInfoCard(_ zenithData: ZenithPointCardData) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    // Planet icon with sun burst
                    ZStack {
                        Image(systemName: "sun.max.fill")
                            .font(.caption)
                            .foregroundStyle(Color.acAccent.opacity(0.5))
                        Text(zenithData.zenithPoint.planet.symbol)
                            .font(.title2)
                            .foregroundStyle(planetColor(zenithData.zenithPoint.planet))
                    }

                    VStack(alignment: .leading) {
                        Text(zenithData.displayName)
                            .font(.headline)
                            .foregroundStyle(Color.acGlassTextPrimary)

                        Text("Zenith Point")
                            .font(.caption)
                            .foregroundStyle(Color.acAccent)
                    }

                    Spacer()

                    Button {
                        viewModel.selectedZenithPoint = nil
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title3)
                            .foregroundStyle(Color.acMutedForeground)
                    }
                    .accessibilityLabel("Dismiss zenith point info")
                }

                // Location info
                HStack {
                    Image(systemName: "mappin.and.ellipse")
                        .foregroundStyle(Color.acMutedForeground)
                    Text(zenithData.coordinateString)
                        .font(.caption)
                        .foregroundStyle(Color.acMutedForeground)
                }

                // Description
                Text(zenithData.description)
                    .font(.caption)
                    .foregroundStyle(Color.acMutedForeground)
                    .lineLimit(2)
            }
            .padding()
            .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
            // Block touch passthrough to globe
            .contentShape(Rectangle())
            .onTapGesture { } // Consume taps
            .gesture(DragGesture().onChanged { _ in }) // Consume drags

            Spacer()  // Push card to left, away from right-side controls
        }
        .padding(.leading)
        .padding(.trailing, 70) // Extra trailing to clear right-side zoom controls
        .padding(.bottom, 200) // Clear bottom UI
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(zenithData.displayName) at \(zenithData.coordinateString)")
    }

    // MARK: - Nakshatra Info Card

    @State private var isNakshatraExpanded = false

    private func nakshatraInfoCard(_ data: NakshatraCardData) -> some View {
        HStack {
            VStack(alignment: .leading, spacing: 8) {
                // Header row
                HStack {
                    // Colored circle with star icon
                    ZStack {
                        Circle()
                            .fill(Color(hex: data.colorHex))
                            .frame(width: 32, height: 32)
                        Image(systemName: "star.fill")
                            .font(.system(size: 14))
                            .foregroundStyle(.white)
                    }

                    VStack(alignment: .leading, spacing: 2) {
                        Text(data.displayName)
                            .font(.headline)
                            .foregroundStyle(Color.acGlassTextPrimary)

                        HStack(spacing: 6) {
                            Text(data.englishName)
                                .font(.caption)
                                .foregroundStyle(Color.acGlassTextSecondary)

                            Text(data.indexLabel)
                                .font(.system(size: 10, weight: .medium))
                                .foregroundStyle(.white.opacity(0.7))
                                .padding(.horizontal, 5)
                                .padding(.vertical, 1)
                                .background(Color(hex: data.colorHex).opacity(0.6))
                                .clipShape(Capsule())
                        }
                    }

                    Spacer()

                    // Expand/collapse + close
                    HStack(spacing: 8) {
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                isNakshatraExpanded.toggle()
                            }
                        } label: {
                            Image(systemName: isNakshatraExpanded ? "chevron.down.circle.fill" : "chevron.right.circle.fill")
                                .font(.title3)
                                .foregroundStyle(Color.acMutedForeground)
                        }

                        Button {
                            viewModel.selectedNakshatra = nil
                            isNakshatraExpanded = false
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.title3)
                                .foregroundStyle(Color.acMutedForeground)
                        }
                    }
                }

                // Pada indicator
                HStack(spacing: 4) {
                    ForEach(1...4, id: \.self) { p in
                        RoundedRectangle(cornerRadius: 3)
                            .fill(p == data.pada ? Color(hex: data.colorHex) : Color(hex: data.colorHex).opacity(0.2))
                            .frame(height: 4)
                    }
                }
                .padding(.vertical, 2)

                HStack {
                    Image(systemName: "moon.stars")
                        .foregroundStyle(Color(hex: data.colorHex))
                    Text("Ruled by \(data.rulingPlanet)")
                        .font(.subheadline)
                        .foregroundStyle(Color.acGlassTextPrimary)
                    Text("•")
                        .foregroundStyle(Color.acGlassTextSecondary)
                    Text(data.padaLabel)
                        .font(.caption)
                        .foregroundStyle(Color.acGlassTextSecondary)
                }

                // Expanded detail section
                if isNakshatraExpanded {
                    VStack(alignment: .leading, spacing: 8) {
                        Divider()
                            .background(Color.acGlassBorder)

                        // Detail grid
                        nakshatraDetailRow(icon: "person.fill", label: "Deity", value: data.deity)
                        nakshatraDetailRow(icon: "sparkle", label: "Symbol", value: data.symbol)
                        nakshatraDetailRow(icon: "star.circle", label: "Star", value: "\(data.starName) (\(data.iauStar))")

                        // Ruling planet description
                        Text(rulingPlanetDescription(data.rulingPlanet))
                            .font(.caption)
                            .foregroundStyle(Color.acGlassTextSecondary)
                            .lineLimit(3)
                    }
                    .transition(.opacity.combined(with: .move(edge: .top)))
                }
            }
            .padding()
            .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
            .contentShape(Rectangle())
            .onTapGesture { }
            .gesture(DragGesture().onChanged { _ in })

            Spacer()
        }
        .padding(.leading)
        .padding(.trailing, 70)
        .padding(.bottom, 200)
    }

    private func nakshatraDetailRow(icon: String, label: String, value: String) -> some View {
        HStack(spacing: 8) {
            Image(systemName: icon)
                .font(.caption)
                .foregroundStyle(Color.acGlassTextSecondary)
                .frame(width: 16)
            Text(label)
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(Color.acGlassTextSecondary)
            Text(value)
                .font(.caption)
                .foregroundStyle(Color.acGlassTextPrimary)
        }
    }

    private func rulingPlanetDescription(_ planet: String) -> String {
        switch planet {
        case "Sun": return "Solar energy brings leadership, authority, and vitality to this mansion."
        case "Moon": return "Lunar influence brings emotional depth, nurturing, and intuition."
        case "Mars": return "Martian energy brings courage, determination, and dynamic action."
        case "Mercury": return "Mercurial influence brings intelligence, communication, and adaptability."
        case "Jupiter": return "Jupiterian energy brings wisdom, expansion, and spiritual growth."
        case "Venus": return "Venusian influence brings love, beauty, creativity, and harmony."
        case "Saturn": return "Saturnine energy brings discipline, endurance, and karmic lessons."
        case "Rahu": return "Rahu's influence brings transformation, ambition, and unconventional paths."
        case "Ketu": return "Ketu's energy brings spiritual insight, liberation, and past-life wisdom."
        default: return "This mansion carries the influence of \(planet)."
        }
    }

    private func planetSymbol(for planetName: String) -> String {
        guard let planet = Planet(rawValue: planetName) else { return "?" }
        return planet.symbol
    }

    private func planetColorFromString(_ planetName: String) -> Color {
        guard let planet = Planet(rawValue: planetName) else { return Color.acMutedForeground }
        return planetColor(planet)
    }

    private func lineChip(_ line: AstroLine) -> some View {
        HStack(spacing: 4) {
            Text(line.planet.symbol)
                .font(.caption)

            Text(line.lineType.shortName)
                .font(.caption2)
                .fontWeight(.medium)
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(planetColor(line.planet).opacity(0.2))
        .foregroundStyle(planetColor(line.planet))
        .clipShape(Capsule())
    }

    private var loadingOverlay: some View {
        ZStack {
            Color.black.opacity(0.3)
                .ignoresSafeArea()

            VStack(spacing: 16) {
                ProgressView()
                    .scaleEffect(1.5)
                    .tint(Color.blue)

                Text("Calculating astro lines...")
                    .font(.subheadline)
                    .foregroundStyle(DSColors.textPrimary)
            }
            .padding(32)
            .background(DSColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 16))
        }
    }

    private var contextMenuOverlay: some View {
        ZStack {
            Color.black.opacity(0.01)
                .ignoresSafeArea()
                .onTapGesture {
                    interactionHandler.dismissContextMenu()
                }

            VStack(spacing: 4) {
                ForEach(GlobeContextMenuAction.allCases, id: \.rawValue) { action in
                    Button {
                        handleContextMenuAction(action)
                    } label: {
                        HStack {
                            Image(systemName: action.systemImage)
                            Text(action.rawValue)
                            Spacer()
                        }
                        .padding(.horizontal, 16)
                        .padding(.vertical, 12)
                    }
                    .foregroundStyle(DSColors.textPrimary)
                }
            }
            .background(DSColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(DSColors.borderHairline, lineWidth: 1)
            )
            .frame(width: 220)
            .position(interactionHandler.contextMenuPosition)
        }
    }

    private var lineFiltersSheet: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // MARK: - Planets Grid
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Planets")
                            .font(.headline)
                            .foregroundStyle(DSColors.textPrimary)

                        LazyVGrid(columns: [
                            GridItem(.flexible(), spacing: 12),
                            GridItem(.flexible(), spacing: 12)
                        ], spacing: 12) {
                            ForEach(Planet.allCases, id: \.rawValue) { planet in
                                planetFilterCell(planet)
                            }
                        }
                    }

                    Divider()
                        .background(DSColors.borderHairline)

                    // MARK: - Line Types
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Line Types")
                            .font(.headline)
                            .foregroundStyle(DSColors.textPrimary)

                        HStack(spacing: 10) {
                            ForEach(AstroLineType.allCases, id: \.rawValue) { lineType in
                                lineTypeChip(lineType)
                            }
                        }
                    }

                    Divider()
                        .background(DSColors.borderHairline)

                    // MARK: - Advanced Toggles
                    VStack(alignment: .leading, spacing: 12) {
                        Text("Advanced")
                            .font(.headline)
                            .foregroundStyle(DSColors.textPrimary)

                        advancedToggleRow(
                            title: "Harmonious Aspects",
                            icon: "arrow.triangle.branch",
                            isOn: viewModel.lineVisibility.showHarmoniousAspects,
                            comingSoon: false,
                            action: { viewModel.toggleHarmoniousAspects() }
                        )

                        advancedToggleRow(
                            title: "Disharmonious Aspects",
                            icon: "arrow.triangle.swap",
                            isOn: viewModel.lineVisibility.showDisharmoniousAspects,
                            comingSoon: false,
                            action: { viewModel.toggleDisharmoniousAspects() }
                        )

                        advancedToggleRow(
                            title: "Parans",
                            icon: "circle.dotted",
                            isOn: viewModel.lineVisibility.showParans,
                            comingSoon: false,
                            action: { viewModel.toggleParans() }
                        )

                        advancedToggleRow(
                            title: "Zeniths",
                            icon: "sun.max.trianglebadge.exclamationmark",
                            isOn: viewModel.lineVisibility.showZeniths,
                            comingSoon: false,
                            action: { viewModel.toggleZeniths() }
                        )

                        advancedToggleRow(
                            title: "Line Labels",
                            icon: "tag.fill",
                            isOn: viewModel.lineVisibility.showLineLabels,
                            comingSoon: false,
                            action: { viewModel.toggleLineLabels() }
                        )

                        advancedToggleRow(
                            title: "Nakshatra Bands",
                            icon: "moon.stars",
                            isOn: viewModel.lineVisibility.showNakshatraBands,
                            comingSoon: false,
                            action: { viewModel.toggleNakshatraBands() }
                        )

                        advancedToggleRow(
                            title: "Transit Lines",
                            icon: "clock.arrow.2.circlepath",
                            isOn: viewModel.isTransitMode,
                            comingSoon: false,
                            action: { viewModel.toggleTransitMode() }
                        )
                    }

                    Divider()
                        .background(DSColors.borderHairline)

                    // MARK: - Quick Actions
                    HStack(spacing: 12) {
                        Button {
                            viewModel.showAllLineTypes()
                        } label: {
                            Text("Show All")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .foregroundStyle(.white)
                                .background(Color.blue)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                        }

                        Button {
                            viewModel.hideAllLines()
                        } label: {
                            Text("Hide All")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .frame(maxWidth: .infinity)
                                .padding(.vertical, 12)
                                .foregroundStyle(DSColors.textPrimary)
                                .background(DSColors.surface)
                                .clipShape(RoundedRectangle(cornerRadius: 10))
                                .overlay(
                                    RoundedRectangle(cornerRadius: 10)
                                        .stroke(DSColors.borderHairline, lineWidth: 1)
                                )
                        }
                    }
                }
                .padding()
            }
            .background(DSColors.background)
            .navigationTitle("Line Filters")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        viewModel.showLineFilters = false
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - Filter Sheet Components

    private func planetFilterCell(_ planet: Planet) -> some View {
        let isVisible = viewModel.lineVisibility.visiblePlanets.contains(planet)

        return Button {
            viewModel.togglePlanet(planet)
        } label: {
            HStack(spacing: 10) {
                Text(planet.symbol)
                    .font(.title2)
                    .foregroundStyle(planetColor(planet))

                VStack(alignment: .leading, spacing: 2) {
                    Text(planet.rawValue)
                        .font(.subheadline)
                        .fontWeight(.medium)
                        .foregroundStyle(isVisible ? planetColor(planet) : DSColors.textSecondary)
                }

                Spacer()

                Circle()
                    .fill(isVisible ? planetColor(planet) : DSColors.textSecondary.opacity(0.3))
                    .frame(width: 10, height: 10)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(isVisible ? planetColor(planet).opacity(0.12) : DSColors.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isVisible ? planetColor(planet).opacity(0.4) : DSColors.borderHairline, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(planet.rawValue), \(isVisible ? "visible" : "hidden")")
        .accessibilityHint("Double tap to toggle visibility")
    }

    private func lineTypeChip(_ lineType: AstroLineType) -> some View {
        let isVisible = viewModel.lineVisibility.visibleLineTypes.contains(lineType)

        return Button {
            viewModel.toggleLineType(lineType)
        } label: {
            VStack(spacing: 4) {
                Text(lineType.shortName)
                    .font(.caption)
                    .fontWeight(.bold)

                Text(lineType.displayName)
                    .font(.caption2)
                    .lineLimit(1)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 10)
            .foregroundStyle(isVisible ? Color.blue : DSColors.textSecondary)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(isVisible ? Color.blue.opacity(0.15) : DSColors.surface)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isVisible ? Color.blue.opacity(0.4) : DSColors.borderHairline, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(lineType.displayName), \(isVisible ? "visible" : "hidden")")
        .accessibilityHint("Double tap to toggle visibility")
    }

    private func advancedToggleRow(
        title: String,
        icon: String,
        isOn: Bool,
        comingSoon: Bool,
        action: @escaping () -> Void
    ) -> some View {
        HStack(spacing: 12) {
            Image(systemName: icon)
                .font(.body)
                .foregroundStyle(isOn ? Color.blue : DSColors.textSecondary)
                .frame(width: 24)

            Text(title)
                .font(.subheadline)
                .foregroundStyle(DSColors.textPrimary)

            if comingSoon {
                Text("Coming Soon")
                    .font(.caption2)
                    .fontWeight(.medium)
                    .foregroundStyle(DSColors.textSecondary)
                    .padding(.horizontal, 8)
                    .padding(.vertical, 3)
                    .background(DSColors.surface)
                    .clipShape(Capsule())
            }

            Spacer()

            Toggle("", isOn: Binding(
                get: { isOn },
                set: { _ in action() }
            ))
            .labelsHidden()
            .tint(Color.blue)
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .background(
            RoundedRectangle(cornerRadius: 10)
                .fill(DSColors.surface)
        )
    }

    // MARK: - Map Style Helpers

    private var currentMapStyle: MapStyleTheme {
        MapStyleTheme(rawValue: mapStyleRaw) ?? .streets
    }

    private func cycleMapStyle() {
        let allCases = MapStyleTheme.allCases
        guard let currentIndex = allCases.firstIndex(of: currentMapStyle) else { return }
        let nextIndex = allCases.index(after: currentIndex)
        mapStyleRaw = (nextIndex < allCases.endIndex ? allCases[nextIndex] : allCases[allCases.startIndex]).rawValue
    }

    // MARK: - Helpers

    private func planetColor(_ planet: Planet) -> Color {
        switch planet {
        case .sun: return Color.acPlanetSun
        case .moon: return colorScheme == .dark ? Color.acPlanetMoon : Color(hex: "#8E99A4")
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



    private func handleInteractionEvent(_ event: GlobeInteractionEvent) {
        switch event {
        case .locationTapped:
            interactionHandler.dismissContextMenu()

        case .locationLongPressed:
            // Context menu handled by interactionHandler
            break

        case .markerTapped:
            interactionHandler.dismissContextMenu()

        case .lineTapped:
            interactionHandler.dismissContextMenu()

        case .aspectLineTapped:
            interactionHandler.dismissContextMenu()

        case .paranPointTapped:
            interactionHandler.dismissContextMenu()

        case .zenithPointTapped:
            interactionHandler.dismissContextMenu()

        case .nakshatraTapped:
            interactionHandler.dismissContextMenu()

        case .cameraChanged, .zoomChanged:
            break
        }
    }

    private func handleContextMenuAction(_ action: GlobeContextMenuAction) {
        interactionHandler.dismissContextMenu()

        switch action {
        case .getInfo:
            showLocationInfo = true
        case .addToFavorites:
            if let location = interactionHandler.selectedLocation {
                onAddToFavorites?(location.coordinate, location.name, location.country)
            }
        case .calculateLines:
            // TODO: Calculate lines for this location
            break
        case .setAsBirthPlace:
            // TODO: Set as birth place
            break
        case .share:
            // TODO: Share location
            break
        }
    }
}

// MARK: - Public Card Helpers

/// Short display name for transit filter chips (iPad only).
public extension Planet {
    var transitFilterShortName: String {
        switch self {
        case .sun: return "Sun"
        case .moon: return "Moon"
        case .mercury: return "Mer"
        case .venus: return "Ven"
        case .mars: return "Mars"
        case .jupiter: return "Jup"
        case .saturn: return "Sat"
        case .uranus: return "Ura"
        case .neptune: return "Nep"
        case .pluto: return "Plu"
        case .chiron: return "Chi"
        case .northNode: return "N.Node"
        case .southNode: return "S.Node"
        }
    }
}

/// Planet color for info cards — matches the globe line color for each planet.
public extension Planet {
    var cardColor: Color {
        switch self {
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
}

/// Brief astrological interpretation for an astro line card — used by both GlobeView and
/// the iPad inline card rendered in MainAppView.
public extension AstroLineCardData {
    var briefInterpretation: String {
        let interpretations: [Planet: [AstroLineType: String]] = [
            .sun: [
                .midheaven: "Career recognition and public visibility flourish. Leadership opportunities abound.",
                .imumCoeli: "Deep sense of belonging and family connection. A place to establish strong roots.",
                .ascendant: "Enhanced vitality and self-expression. Your authentic identity radiates powerfully.",
                .descendant: "Attracts significant partnerships. People see and appreciate your inner light.",
            ],
            .moon: [
                .midheaven: "Emotional fulfillment through career. Recognition for caring and intuitive work.",
                .imumCoeli: "Profound emotional security and comfort. Ideal for home and putting down roots.",
                .ascendant: "Heightened intuition and emotional sensitivity. Deep connection to your inner self.",
                .descendant: "Attracts nurturing relationships. Emotional bonds form easily here.",
            ],
            .mercury: [
                .midheaven: "Success in communication, writing, teaching. Intellectual recognition in career.",
                .imumCoeli: "Mental stimulation at home. Great for learning, writing, or commerce.",
                .ascendant: "Quick thinking and articulate expression. Excellent for networking.",
                .descendant: "Attracts intellectual partners. Stimulating conversations flourish.",
            ],
            .venus: [
                .midheaven: "Artistic success and social popularity. Beauty and harmony in career.",
                .imumCoeli: "Aesthetic home environment. Love, beauty, and comfort in domestic life.",
                .ascendant: "Enhanced charm and attractiveness. Social grace comes naturally.",
                .descendant: "Magnetic attraction for romantic relationships. Love and harmony in partnerships.",
            ],
            .mars: [
                .midheaven: "Drive for career achievement. Competitive success and entrepreneurial energy.",
                .imumCoeli: "Active home life. Energy for domestic projects and family protection.",
                .ascendant: "Increased courage and initiative. Physical vitality enhanced.",
                .descendant: "Attracts passionate, dynamic relationships. Partnerships with energy and drive.",
            ],
            .jupiter: [
                .midheaven: "Expansion and luck in career. Recognition, international opportunities.",
                .imumCoeli: "Abundance in home life. Generous family connections and prosperity.",
                .ascendant: "Optimism and personal growth. Opportunities seem to find you.",
                .descendant: "Attracts beneficial partnerships. Luck through relationships.",
            ],
            .saturn: [
                .midheaven: "Serious career achievements through discipline. Authority and lasting success.",
                .imumCoeli: "Building solid foundations. Responsibility toward family and structure.",
                .ascendant: "Discipline and maturity enhanced. Taking your goals seriously.",
                .descendant: "Committed, long-lasting relationships. Important lessons through partnerships.",
            ],
            .uranus: [
                .midheaven: "Unconventional career path. Innovation, technology, sudden changes.",
                .imumCoeli: "Unusual home life. Freedom and progressive ideas in domestic matters.",
                .ascendant: "Unique self-expression. Embracing your individuality and originality.",
                .descendant: "Attracts unusual, exciting relationships. Freedom in partnerships.",
            ],
            .neptune: [
                .midheaven: "Creative and spiritual career pursuits. Artistic recognition.",
                .imumCoeli: "Spiritual home environment. Idealistic and artistic domestic life.",
                .ascendant: "Enhanced intuition and creativity. Spiritual sensitivity heightened.",
                .descendant: "Soulmate connections possible. Idealistic and spiritual relationships.",
            ],
            .pluto: [
                .midheaven: "Transformative career experiences. Power and profound impact.",
                .imumCoeli: "Deep psychological roots. Transformation through ancestral healing.",
                .ascendant: "Personal transformation and empowerment. Intense self-discovery.",
                .descendant: "Intense, transformative relationships. Deep psychological bonds.",
            ],
            .chiron: [
                .midheaven: "Healing through career. Teaching and guiding others from experience.",
                .imumCoeli: "Healing family wounds. Finding wholeness through understanding roots.",
                .ascendant: "Embracing your wounds as gifts. Becoming a wise guide for others.",
                .descendant: "Healing through relationships. Attracting those who benefit from your wisdom.",
            ],
            .northNode: [
                .midheaven: "Career aligned with life purpose. Destiny calling in the public sphere.",
                .imumCoeli: "Soul growth through family and home. Karmic connections to your roots.",
                .ascendant: "Stepping into your destined self. Life path activation.",
                .descendant: "Karmic relationships. Meeting destined partners for soul growth.",
            ],
            .southNode: [
                .midheaven: "Karmic lessons over achievement. Release old career patterns.",
                .imumCoeli: "Revisiting roots. Time to release old definitions of home.",
                .ascendant: "Shed outdated identities for evolution and growth.",
                .descendant: "Familiar relationships that keep you stuck. Time to break cycles.",
            ],
        ]
        return interpretations[line.planet]?[line.lineType]
            ?? "\(line.planet.rawValue) energy expressed through the \(line.lineType.displayName)."
    }
}

/// Brief description for an aspect line card.
public extension AspectLineCardData {
    var briefDescription: String {
        let planet = aspectLine.planet.rawValue
        let angle = aspectLine.angle
        let aspectType = aspectLine.aspectType
        // For transit aspect lines the angle equals the aspectType — use simpler wording
        if aspectType.lowercased() == angle.lowercased() {
            if aspectLine.isHarmonious {
                return "\(planet) is transiting this location, bringing supportive energy."
            } else {
                return "\(planet) is transiting this location, presenting growth challenges."
            }
        }
        if aspectLine.isHarmonious {
            return "\(planet) forms a \(aspectType) to the \(angle), bringing supportive energy to this location."
        } else {
            return "\(planet) forms a \(aspectType) to the \(angle), presenting growth challenges at this location."
        }
    }
}

// MARK: - Preview

#if DEBUG
struct GlobeView_Previews: PreviewProvider {
    static var previews: some View {
        GlobeView()
            .preferredColorScheme(.dark)
    }
}
#endif
