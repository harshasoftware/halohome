import SwiftUI
import MapKit
import DesignSystem
import FeatureGlobe
import FeatureBirthData
import Core

// MARK: - Apple Maps-Style Bottom Search Card

/// A floating search card at the bottom of the screen, similar to Apple Maps
@available(iOS 17.0, *)
struct BottomSearchCard: View {
    @Binding var searchQuery: String
    @Binding var isExpanded: Bool
    let currentBirthData: BirthData?
    let onProfileTap: () -> Void
    let onSearchFocus: () -> Void

    @FocusState private var isSearchFocused: Bool
    @Namespace private var searchNamespace
    @State private var hasAppeared = false
    @State private var showTooltip = false

    var body: some View {
        ZStack(alignment: .topTrailing) {
            // Main search card
            ACGlassContainer(spacing: 16) {
                VStack(spacing: 0) {
                    // Drag indicator
                    if isExpanded {
                        Capsule()
                            .fill(.secondary.opacity(0.3))
                            .frame(width: 36, height: 5)
                            .padding(.top, 8)
                            .padding(.bottom, 4)
                    }

                    HStack(spacing: 12) {
                        // Search field
                        HStack(spacing: 10) {
                            Image(systemName: "magnifyingglass")
                                .font(.system(size: 17, weight: .medium))
                                .foregroundStyle(.secondary)

                            TextField("Search cities...", text: $searchQuery)
                                .font(.system(size: 17))
                                .foregroundStyle(.primary)
                                .focused($isSearchFocused)
                                .onChange(of: isSearchFocused) { _, focused in
                                    if focused {
                                        withAnimation(ACSpring.smooth) {
                                            isExpanded = true
                                        }
                                        onSearchFocus()
                                    }
                                }

                            if !searchQuery.isEmpty {
                                Button {
                                    searchQuery = ""
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .font(.system(size: 17))
                                        .foregroundStyle(.secondary)
                                }
                                .transition(.scale.combined(with: .opacity))
                            }
                        }
                        .frame(maxWidth: .infinity)
                        .padding(.horizontal, 12)
                        .padding(.vertical, 10)
                        .background(Color.white.opacity(0.1))
                        .clipShape(RoundedRectangle(cornerRadius: ACRadius.glassSmall, style: .continuous))
                        .acGlassEffectID("searchField", in: searchNamespace)

                        // Profile/Avatar button
                        Button {
                            onProfileTap()
                        } label: {
                            ProfileAvatarButton(birthData: currentBirthData)
                        }
                        .acPressable()
                        .accessibilityLabel(currentBirthData != nil ? "\(currentBirthData!.name)'s chart" : "Select or create a chart")
                    }
                    .padding(.horizontal, 16)
                    .padding(.vertical, isExpanded ? 8 : 12)
                }
                .frame(maxWidth: .infinity)
                .acDarkGlass(cornerRadius: isExpanded ? ACRadius.glassLarge : ACRadius.glassDefault)
                .acGlassEffectID("searchCard", in: searchNamespace)
            }

            // Tooltip positioned outside the glass container (not clipped)
            // On iPad the search bar is at the top, so show tooltip below; on iPhone show above.
            if showTooltip && currentBirthData == nil {
                let isIPad = UIDevice.current.userInterfaceIdiom == .pad
                ProfileTooltip(arrowUp: isIPad)
                    .fixedSize()
                    .offset(x: -10, y: isIPad ? 66 : -60)
                    .transition(.scale(scale: 0.8, anchor: isIPad ? .top : .bottom).combined(with: .opacity))
                    .allowsHitTesting(false)
            }
        }
        .animation(ACSpring.smooth, value: isExpanded)
        .animation(ACSpring.quick, value: searchQuery.isEmpty)
        .animation(ACSpring.bouncy, value: showTooltip)
        .offset(y: hasAppeared ? 0 : 80)
        .opacity(hasAppeared ? 1 : 0)
        .onAppear {
            withAnimation(ACSpring.smooth.delay(0.4)) {
                hasAppeared = true
            }
            // Show tooltip after a delay if no chart is selected
            if currentBirthData == nil {
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.5) {
                    withAnimation(ACSpring.bouncy) {
                        showTooltip = true
                    }
                }
            }
        }
        .onChange(of: currentBirthData) { _, newValue in
            if newValue != nil {
                withAnimation(ACSpring.quick) {
                    showTooltip = false
                }
            }
        }
    }
}

// MARK: - Profile Avatar Button

/// Shows Tapback avatar when chart is selected, or prompt icon when not
@available(iOS 17.0, *)
struct ProfileAvatarButton: View {
    let birthData: BirthData?

    @State private var avatarImage: UIImage?

    var body: some View {
        ZStack {
            if let image = avatarImage {
                // Show Tapback avatar
                Image(uiImage: image)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 36, height: 36)
                    .clipShape(Circle())
                    .overlay(
                        Circle()
                            .strokeBorder(Color.acAccent, lineWidth: 2)
                    )
            } else if birthData != nil {
                // Loading state
                Circle()
                    .fill(Color.acAccent.opacity(0.3))
                    .frame(width: 36, height: 36)
                    .overlay {
                        ProgressView()
                            .scaleEffect(0.6)
                            .tint(.white)
                    }
            } else {
                // No chart selected - show prompt icon
                ZStack {
                    Circle()
                        .fill(Color.acAccent)
                        .frame(width: 36, height: 36)

                    Image(systemName: "plus")
                        .font(.system(size: 18, weight: .bold))
                        .foregroundStyle(.white)
                }
                .overlay(
                    Circle()
                        .strokeBorder(Color.white.opacity(0.3), lineWidth: 2)
                )
            }
        }
        .task(id: birthData?.id) {
            guard let data = birthData else {
                avatarImage = nil
                return
            }
            await loadAvatar(for: data)
        }
    }

    private func loadAvatar(for data: BirthData) async {
        let identifier = avatarIdentifier(for: data)
        let image = await AvatarLoader.shared.loadAvatar(for: identifier)
        await MainActor.run {
            self.avatarImage = image
        }
    }

    private func avatarIdentifier(for data: BirthData) -> String {
        let dateString = data.date.formatted(.iso8601)
        let locationString = "\(data.latitude),\(data.longitude)"
        return "\(data.name)-\(dateString)-\(locationString)"
    }
}

// MARK: - Profile Tooltip

/// Tooltip pointing user to create or select a chart
@available(iOS 17.0, *)
struct ProfileTooltip: View {
    var arrowUp: Bool = false

    var body: some View {
        VStack(alignment: .trailing, spacing: 0) {
            // Arrow pointing up (iPad: tooltip is below the button)
            if arrowUp {
                Triangle()
                    .fill(Color.acAccent)
                    .frame(width: 14, height: 8)
                    .rotationEffect(.degrees(180))
                    .padding(.trailing, 16)
            }

            Text("Tap to create or\nselect a birth chart")
                .font(.system(size: 13, weight: .medium))
                .foregroundStyle(.white)
                .multilineTextAlignment(.center)
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(Color.acAccent)
                .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

            // Arrow pointing down (iPhone: tooltip is above the button)
            if !arrowUp {
                Triangle()
                    .fill(Color.acAccent)
                    .frame(width: 14, height: 8)
                    .padding(.trailing, 16)
            }
        }
        .shadow(color: .black.opacity(0.2), radius: 8, y: 4)
    }
}

// MARK: - Triangle Shape

struct Triangle: Shape {
    func path(in rect: CGRect) -> Path {
        var path = Path()
        path.move(to: CGPoint(x: rect.midX, y: rect.maxY))
        path.addLine(to: CGPoint(x: rect.minX, y: rect.minY))
        path.addLine(to: CGPoint(x: rect.maxX, y: rect.minY))
        path.closeSubpath()
        return path
    }
}

// MARK: - Top Right Action Buttons (Settings, Chart, Export)

/// Top right action buttons for Settings, Chart, Export, and Transit
/// Chart, Export, and Transit buttons are only shown when a chart is selected
@available(iOS 17.0, *)
struct TopRightActionButtons: View {
    let hasChart: Bool
    var isTransitMode: Bool = false
    var isLocalSpaceActive: Bool = false
    var hasSelectedLocation: Bool = false
    let onSettingsTap: () -> Void
    let onChartTap: () -> Void
    let onExportTap: () -> Void
    var onTransitTap: (() -> Void)?
    var onLocalSpaceTap: (() -> Void)?

    var body: some View {
        VStack(spacing: 10) {
            // Settings button - always visible
            FloatingIconButton(
                icon: "gearshape.fill",
                action: onSettingsTap,
                accessibilityLabel: "Settings"
            )

            // Chart and Export buttons - only shown when a chart is selected
            if hasChart {
                // Chart button
                FloatingIconButton(
                    icon: "chart.pie.fill",
                    action: onChartTap,
                    accessibilityLabel: "Natal Chart"
                )

                // Export button
                FloatingIconButton(
                    icon: "doc.text.fill",
                    action: onExportTap,
                    accessibilityLabel: "Export Report"
                )

                // Transit mode toggle — below Export
                FloatingIconButton(
                    icon: "clock.arrow.2.circlepath",
                    action: { onTransitTap?() },
                    accessibilityLabel: isTransitMode ? "Close Transit" : "Transit Lines",
                    isActive: isTransitMode
                )

                // Local Space toggle — visible when a location is selected or local space is active
                if isLocalSpaceActive || hasSelectedLocation {
                    FloatingIconButton(
                        icon: "location.viewfinder",
                        action: { onLocalSpaceTap?() },
                        accessibilityLabel: isLocalSpaceActive ? "Exit Local Space" : "Local Space",
                        isActive: isLocalSpaceActive
                    )
                }
            }
        }
        .animation(ACSpring.smooth, value: hasChart)
        .animation(ACSpring.smooth, value: isTransitMode)
        .animation(ACSpring.smooth, value: isLocalSpaceActive)
    }
}

// MARK: - Floating Action Buttons (Right Edge)

/// Unified right-edge control stack: Transit + Zoom + Location, centered vertically
@available(iOS 17.0, *)
struct FloatingActionButtons: View {
    let onLocationTap: () -> Void
    let onLayersTap: () -> Void

    @Namespace private var buttonNamespace

    var body: some View {
        ACGlassContainer(spacing: 8) {
            VStack(spacing: 8) {
                // Location/recenter button
                FloatingIconButton(
                    icon: "location.fill",
                    action: onLocationTap,
                    accessibilityLabel: "Recenter map"
                )
                .acGlassEffectID("location", in: buttonNamespace)

                // Layers/filters button
                FloatingIconButton(
                    icon: "square.3.layers.3d",
                    action: onLayersTap,
                    accessibilityLabel: "Map layers and filters"
                )
                .acGlassEffectID("layers", in: buttonNamespace)
            }
        }
    }
}

/// Squared zoom in/out widget matching the GlobeView built-in style.
/// Use in the right-edge VStack on iPhone (centered between top buttons and bottom FABs).
@available(iOS 17.0, *)
struct ZoomControlsWidget: View {
    let onZoomIn: () -> Void
    let onZoomOut: () -> Void

    var body: some View {
        VStack(spacing: 8) {
            Button(action: onZoomIn) {
                Image(systemName: "plus")
                    .font(.title3)
                    .foregroundStyle(Color.acGlassTextPrimary)
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Zoom in")

            Divider()
                .frame(width: 20)
                .accessibilityHidden(true)

            Button(action: onZoomOut) {
                Image(systemName: "minus")
                    .font(.title3)
                    .foregroundStyle(Color.acGlassTextPrimary)
                    .frame(width: 44, height: 44)
                    .contentShape(Rectangle())
            }
            .buttonStyle(.plain)
            .accessibilityLabel("Zoom out")
        }
        .acDarkGlass(cornerRadius: ACRadius.glassSmall)
    }
}

/// Individual floating icon button (circular, icon-only)
/// Uses acDarkGlass to maintain consistent visibility over varying map backgrounds
@available(iOS 17.0, *)
struct FloatingIconButton: View {
    let icon: String
    let action: () -> Void
    let accessibilityLabel: String
    var tint: Color? = nil
    var isActive: Bool = false

    var body: some View {
        Button(action: action) {
            Image(systemName: icon)
                .font(.system(size: 17, weight: .medium))
                .foregroundStyle(isActive ? Color(hex: "#22C55E") : (tint ?? Color.acGlassTextPrimary))
                .frame(width: 44, height: 44)
                .contentShape(Circle())
        }
        .acDarkGlass(in: Circle())
        .acPressable(scale: 0.92)
        .accessibilityLabel(accessibilityLabel)
    }
}

// MARK: - Scouting Toast

/// Top-center toast shown while scouting cities
/// Uses acDarkGlass to maintain consistent visibility over varying map backgrounds
@available(iOS 17.0, *)
struct ScoutingToast: View {
    var body: some View {
        HStack(spacing: 10) {
            ProgressView()
                .scaleEffect(0.8)
                .tint(Color.acGlassTextPrimary)

            Text("Scouting cities...")
                .font(.system(size: 14, weight: .medium))
                .foregroundStyle(Color.acGlassTextPrimary)
        }
        .padding(.horizontal, 18)
        .padding(.vertical, 12)
        .acDarkGlass(cornerRadius: ACRadius.glassLarge)
        .shadow(color: .black.opacity(0.25), radius: 12, y: 4)
    }
}

// MARK: - Feature Pills Bar

/// Horizontal scrollable feature pills, like Apple Maps categories
/// Note: Chart, Export, and Settings are now in TopRightActionButtons
@available(iOS 17.0, *)
struct FeaturePillsBar: View {
    let onScoutTap: () -> Void
    let onDuoTap: () -> Void
    let onAskAITap: () -> Void
    let onFavoritesTap: () -> Void
    var hasChart: Bool = false
    var isScoutDisabled: Bool = false
    var isScoutLoading: Bool = false

    @State private var hasAppeared = false

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 12) {
                FeaturePill(
                    icon: "binoculars.fill",
                    label: "Scout",
                    color: .acPlanetJupiter,
                    action: onScoutTap,
                    isLoading: isScoutLoading
                )
                .acStaggeredFadeIn(index: 0)

                FeaturePill(
                    icon: "person.2.fill",
                    label: "Duo",
                    color: .acPlanetVenus,
                    action: onDuoTap
                )
                .acStaggeredFadeIn(index: 1)

                FeaturePill(
                    icon: "sparkles",
                    label: "Ask AI",
                    color: .white,
                    action: onAskAITap
                )
                .acStaggeredFadeIn(index: 2)

                FeaturePill(
                    icon: "heart.fill",
                    label: "Favorites",
                    color: .red,
                    action: onFavoritesTap,
                    isDisabled: !hasChart
                )
                .acStaggeredFadeIn(index: 3)
            }
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
        }
        .scrollIndicators(.hidden)
        .offset(y: hasAppeared ? 0 : 60)
        .opacity(hasAppeared ? 1 : 0)
        .onAppear {
            withAnimation(ACSpring.smooth.delay(0.3)) {
                hasAppeared = true
            }
        }
    }
}

/// Individual feature pill button
/// Uses WCAG-compliant text colors that adapt to theme for readability
/// Uses acDarkGlass to maintain consistent visibility over varying map backgrounds
@available(iOS 17.0, *)
struct FeaturePill: View {
    let icon: String
    let label: String
    let color: Color
    let action: () -> Void
    var isDisabled: Bool = false
    var isLoading: Bool = false
    var fillsWidth: Bool = false

    var body: some View {
        Button(action: action) {
            HStack(spacing: 6) {
                if isLoading {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: iconColor))
                        .scaleEffect(0.7)
                        .frame(width: 14, height: 14)
                } else {
                    Image(systemName: icon)
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(iconColor)
                }

                Text(label)
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(textColor)
                    .lineLimit(1)
            }
            .frame(maxWidth: fillsWidth ? .infinity : nil)
            .padding(.horizontal, fillsWidth ? 8 : 14)
            .padding(.vertical, 10)
            .acDarkGlassCapsule()
            .opacity(isDisabled ? 0.5 : 1.0)
        }
        .disabled(isDisabled)
        .acPressable(scale: 0.95)
        .accessibilityLabel(label)
        .accessibilityHint(isLoading ? "Scouting in progress" : (isDisabled ? "Disabled" : ""))
    }

    /// Icon color - uses the provided planet color
    private var iconColor: Color {
        // Planet colors are vibrant enough to work on most backgrounds
        color
    }

    /// Text color that ensures WCAG AA contrast (4.5:1) on glass backgrounds
    private var textColor: Color {
        Color.acGlassTextPrimary
    }
}

// MARK: - Weather Widget (Compact)

/// Compact weather widget for top-left corner
/// Uses acDarkGlass to maintain consistent visibility over varying map backgrounds
/// Height matches FloatingIconButton (44pt) for visual symmetry
@available(iOS 17.0, *)
struct CompactWeatherWidget: View {
    let weatherData: WeatherData?
    let airQualityData: AirQualityData?
    let isLoading: Bool
    let onTap: (() -> Void)?

    var body: some View {
        Button {
            onTap?()
        } label: {
            HStack(spacing: 6) {
                if isLoading {
                    ProgressView()
                        .scaleEffect(0.7)
                        .frame(width: 20, height: 20)
                } else if let weather = weatherData {
                    Text(weather.icon)
                        .font(.system(size: 16))

                    Text("\(Int(weather.temperature.rounded()))°")
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(Color.acGlassTextPrimary)

                    // AQI with number and colored indicator
                    if let aqi = airQualityData {
                        HStack(spacing: 3) {
                            Circle()
                                .fill(aqiColor(aqi.aqi))
                                .frame(width: 6, height: 6)
                            Text("\(aqi.aqi)")
                                .font(.system(size: 11, weight: .medium, design: .rounded))
                                .foregroundStyle(aqiColor(aqi.aqi))
                        }
                    }
                } else {
                    Image(systemName: "cloud.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(Color.acGlassTextSecondary)

                    Text("--°")
                        .font(.system(size: 14, weight: .semibold, design: .rounded))
                        .foregroundStyle(Color.acGlassTextSecondary)
                }
            }
            .padding(.horizontal, 12)
            .frame(height: 44) // Match FloatingIconButton height
            .acDarkGlassCapsule()
        }
        .buttonStyle(.plain)
        .acPressable(scale: 0.96, haptic: false)
        .accessibilityLabel(accessibilityLabel)
    }

    private func aqiColor(_ aqi: Int) -> Color {
        switch aqi {
        case 0...50: return .green
        case 51...100: return .yellow
        case 101...150: return .orange
        case 151...200: return .red
        case 201...300: return .purple
        default: return Color(red: 0.5, green: 0.1, blue: 0.1)
        }
    }

    private var accessibilityLabel: String {
        guard let weather = weatherData else { return "Weather data unavailable" }
        var label = "\(Int(weather.temperature.rounded())) degrees, \(weather.description)"
        if let aqi = airQualityData {
            label += ", air quality \(aqi.category)"
        }
        return label
    }
}

// MARK: - Selected Location Card

/// Compact location card shown when a location is selected on the map
/// Includes Look Around preview and nearby points of interest
@available(iOS 17.0, *)
struct SelectedLocationCard: View {
    let location: SelectedLocation
    let hasChart: Bool
    let onDismiss: () -> Void
    let onInfoTap: () -> Void

    @State private var lookAroundScene: MKLookAroundScene?
    @State private var isLoadingPreview = true
    @State private var nearbyPlaces: [NearbyPlace] = []

    var body: some View {
        Button(action: onInfoTap) {
            HStack(spacing: 12) {
                // Look Around preview or fallback icon
                locationPreview
                    .frame(width: 60, height: 60)
                    .clipShape(RoundedRectangle(cornerRadius: 10, style: .continuous))

                // Location details
                VStack(alignment: .leading, spacing: 4) {
                    Text(location.displayName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.acGlassTextPrimary)
                        .lineLimit(2)
                        .fixedSize(horizontal: false, vertical: true)

                    // Nearby places chips or astro analysis hint
                    if !nearbyPlaces.isEmpty {
                        ScrollView(.horizontal, showsIndicators: false) {
                            HStack(spacing: 6) {
                                ForEach(nearbyPlaces.prefix(3)) { place in
                                    NearbyPlaceChip(place: place)
                                }
                            }
                        }
                        .scrollClipDisabled()
                    } else if hasChart {
                        Text("Tap to view astro analysis")
                            .font(.system(size: 12))
                            .foregroundStyle(Color.acGlassTextAccent)
                    }
                }

                Spacer()

                // Chevron to indicate tappable
                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .semibold))
                    .foregroundStyle(Color.acGlassTextSecondary)

                // Dismiss button
                Button(action: onDismiss) {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 24))
                        .foregroundStyle(Color.acGlassTextSecondary)
                }
                .accessibilityLabel("Dismiss")
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .frame(maxWidth: .infinity)
            .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
            .padding(.trailing, 76)  // Clearance for right-side FAB stack
        }
        .buttonStyle(.plain)
        .contentShape(RoundedRectangle(cornerRadius: ACRadius.glassDefault))
        .accessibilityLabel("\(location.displayName). Tap to view astro analysis.")
        .accessibilityHint("Double tap to open detailed location analysis")
        .task(id: location.id) {
            await loadLocationData()
        }
    }

    @ViewBuilder
    private var locationPreview: some View {
        if let scene = lookAroundScene {
            // Show Look Around preview
            LookAroundPreview(initialScene: scene)
                .overlay(
                    // Binoculars badge to indicate Look Around available
                    Image(systemName: "binoculars.fill")
                        .font(.system(size: 10))
                        .foregroundStyle(.white)
                        .padding(4)
                        .background(Color.black.opacity(0.5))
                        .clipShape(Circle())
                        .padding(4),
                    alignment: .bottomTrailing
                )
        } else if isLoadingPreview {
            // Loading state
            ZStack {
                Color.acAccent.opacity(0.2)
                ProgressView()
                    .scaleEffect(0.7)
            }
        } else {
            // Fallback - map snapshot or icon
            ZStack {
                Color.acAccent.opacity(0.15)
                Image(systemName: "mappin.circle.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(Color.acAccent)
            }
        }
    }

    private func loadLocationData() async {
        isLoadingPreview = true

        let coordinate = CLLocationCoordinate2D(
            latitude: location.coordinate.latitude,
            longitude: location.coordinate.longitude
        )

        // Load Look Around and nearby places in parallel
        async let lookAroundTask: Void = loadLookAroundPreview(coordinate: coordinate)
        async let nearbyTask: Void = loadNearbyPlaces(coordinate: coordinate)

        await lookAroundTask
        await nearbyTask

        isLoadingPreview = false
    }

    private func loadLookAroundPreview(coordinate: CLLocationCoordinate2D) async {
        let request = MKLookAroundSceneRequest(coordinate: coordinate)
        do {
            lookAroundScene = try await request.scene
        } catch {
            lookAroundScene = nil
        }
    }

    private func loadNearbyPlaces(coordinate: CLLocationCoordinate2D) async {
        // Search for points of interest near the location
        let request = MKLocalSearch.Request()
        request.naturalLanguageQuery = "points of interest"
        request.region = MKCoordinateRegion(
            center: coordinate,
            latitudinalMeters: 1000,
            longitudinalMeters: 1000
        )
        request.resultTypes = .pointOfInterest

        let search = MKLocalSearch(request: request)
        do {
            let response = try await search.start()
            // Extract unique categories from results
            var seenCategories = Set<MKPointOfInterestCategory>()
            var places: [NearbyPlace] = []

            for item in response.mapItems.prefix(10) {
                if let category = item.pointOfInterestCategory,
                   !seenCategories.contains(category) {
                    seenCategories.insert(category)
                    places.append(NearbyPlace(
                        name: item.name ?? "Unknown",
                        category: category
                    ))
                }
                if places.count >= 3 { break }
            }
            await MainActor.run {
                nearbyPlaces = places
            }
        } catch {
            // Search failed, no nearby places to show
        }
    }
}

// MARK: - Nakshatra Mini Card

/// Compact mini card shown at the bottom of the iPhone screen when a nakshatra band is tapped.
/// Mirrors the visual style of SelectedLocationCard.
@available(iOS 17.0, *)
struct NakshatraMiniCard: View {
    let data: NakshatraCardData
    let onDismiss: () -> Void

    var body: some View {
        HStack(spacing: 12) {
            // Nakshatra icon — colored circle with star + pada indicator dots
            VStack(spacing: 4) {
                ZStack {
                    RoundedRectangle(cornerRadius: 10, style: .continuous)
                        .fill(Color(hex: data.colorHex).opacity(0.15))
                        .frame(width: 60, height: 60)
                    VStack(spacing: 5) {
                        ZStack {
                            Circle()
                                .fill(Color(hex: data.colorHex))
                                .frame(width: 32, height: 32)
                            Image(systemName: "star.fill")
                                .font(.system(size: 14))
                                .foregroundStyle(.white)
                        }
                        // Pada progress dots
                        HStack(spacing: 3) {
                            ForEach(1...4, id: \.self) { p in
                                Circle()
                                    .fill(p <= data.pada
                                          ? Color(hex: data.colorHex)
                                          : Color(hex: data.colorHex).opacity(0.2))
                                    .frame(width: 5, height: 5)
                            }
                        }
                    }
                }
            }
            .frame(width: 60, height: 60)

            // Details
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 6) {
                    Text(data.displayName)
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(Color.acGlassTextPrimary)
                        .lineLimit(1)

                    Text(data.indexLabel)
                        .font(.system(size: 10, weight: .medium))
                        .foregroundStyle(.white)
                        .padding(.horizontal, 5)
                        .padding(.vertical, 2)
                        .background(Color(hex: data.colorHex).opacity(0.7))
                        .clipShape(Capsule())

                    if let t = data.tarabala {
                        Text("T\(t.tara)")
                            .font(.system(size: 10, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(tarabalaColor(t))
                            .clipShape(Capsule())
                    }
                }

                Text("\(data.englishName) · \(data.rulingPlanet)")
                    .font(.system(size: 12))
                    .foregroundStyle(Color.acGlassTextSecondary)
                    .lineLimit(1)

                if let t = data.tarabala {
                    Text("\(t.taraName) · \(t.verdictLabel)")
                        .font(.system(size: 11, weight: .medium))
                        .foregroundStyle(tarabalaColor(t))
                } else {
                    Text(data.padaLabel)
                        .font(.system(size: 11))
                        .foregroundStyle(Color.acGlassTextAccent)
                }
            }

            Spacer()

            // Dismiss
            Button(action: onDismiss) {
                Image(systemName: "xmark.circle.fill")
                    .font(.system(size: 24))
                    .foregroundStyle(Color.acGlassTextSecondary)
            }
            .accessibilityLabel("Dismiss nakshatra card")
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 10)
        .frame(maxWidth: .infinity)
        .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
        .padding(.trailing, 76)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(data.displayName), \(data.englishName), \(data.padaLabel), ruled by \(data.rulingPlanet)")
    }

    private func tarabalaColor(_ t: TarabalaResult) -> Color {
        switch t.verdict {
        case .good:    return Color(hex: "#22C55E") // green
        case .bad:     return Color(hex: "#EF4444") // red
        case .neutral: return Color.acGlassTextSecondary
        }
    }
}

// MARK: - Nearby Place Model

struct NearbyPlace: Identifiable {
    let id = UUID()
    let name: String
    let category: MKPointOfInterestCategory

    var icon: String {
        switch category {
        case .restaurant: return "fork.knife"
        case .cafe: return "cup.and.saucer.fill"
        case .hotel: return "bed.double.fill"
        case .nightlife: return "moon.stars.fill"
        case .museum: return "building.columns.fill"
        case .park: return "leaf.fill"
        case .beach: return "beach.umbrella.fill"
        case .airport: return "airplane"
        case .publicTransport: return "bus.fill"
        case .hospital: return "cross.fill"
        case .pharmacy: return "pills.fill"
        case .store: return "bag.fill"
        case .theater: return "theatermasks.fill"
        case .stadium: return "sportscourt.fill"
        case .zoo: return "pawprint.fill"
        case .university: return "graduationcap.fill"
        case .library: return "books.vertical.fill"
        case .marina: return "sailboat.fill"
        case .winery: return "wineglass.fill"
        case .brewery: return "mug.fill"
        case .gasStation: return "fuelpump.fill"
        case .evCharger: return "bolt.car.fill"
        case .parking: return "p.square.fill"
        case .atm, .bank: return "banknote.fill"
        case .laundry: return "washer.fill"
        case .postOffice: return "envelope.fill"
        case .fireStation: return "flame.fill"
        case .police: return "shield.fill"
        default: return "mappin.circle.fill"
        }
    }

    var displayName: String {
        switch category {
        case .restaurant: return "Dining"
        case .cafe: return "Cafe"
        case .hotel: return "Hotel"
        case .nightlife: return "Nightlife"
        case .museum: return "Museum"
        case .park: return "Park"
        case .beach: return "Beach"
        case .airport: return "Airport"
        case .publicTransport: return "Transit"
        case .hospital: return "Hospital"
        case .pharmacy: return "Pharmacy"
        case .store: return "Shopping"
        case .theater: return "Theater"
        case .stadium: return "Sports"
        case .zoo: return "Zoo"
        case .university: return "University"
        case .library: return "Library"
        case .marina: return "Marina"
        case .winery: return "Winery"
        case .brewery: return "Brewery"
        case .gasStation: return "Gas"
        case .evCharger: return "EV Charging"
        case .parking: return "Parking"
        case .atm, .bank: return "Bank"
        case .laundry: return "Laundry"
        case .postOffice: return "Post"
        case .fireStation: return "Fire Dept"
        case .police: return "Police"
        default: return name
        }
    }
}

// MARK: - Nearby Place Chip

@available(iOS 17.0, *)
struct NearbyPlaceChip: View {
    let place: NearbyPlace

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: place.icon)
                .font(.system(size: 9))
            Text(place.displayName)
                .font(.system(size: 10, weight: .medium))
        }
        .foregroundStyle(Color.acGlassTextSecondary)
        .padding(.horizontal, 8)
        .padding(.vertical, 4)
        .background(Color.white.opacity(0.15))
        .clipShape(Capsule())
    }
}

// MARK: - Expandable Bottom Sheet

/// Apple Maps-style expandable bottom sheet with detents
@available(iOS 17.0, *)
struct ExpandableBottomSheet<Content: View>: View {
    @Binding var detent: PresentationDetent
    let availableDetents: Set<PresentationDetent>
    @ViewBuilder let content: () -> Content

    var body: some View {
        content()
            .presentationDetents(availableDetents, selection: $detent)
            .presentationDragIndicator(.visible)
            .presentationBackgroundInteraction(.enabled(upThrough: .medium))
            .presentationCornerRadius(20)
            .interactiveDismissDisabled(detent == .large)
    }
}

// MARK: - Search Results Overlay (Expandable)

/// Search results that appear in the expanded search card
@available(iOS 17.0, *)
struct SearchResultsList: View {
    let completions: [SearchCompletion]
    let isSearching: Bool
    let onSelect: (SearchCompletion) -> Void

    var body: some View {
        if isSearching {
            HStack {
                ProgressView()
                    .scaleEffect(0.8)
                Text("Searching...")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 20)
        } else if completions.isEmpty {
            Text("No results found")
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 20)
        } else {
            ScrollView {
                LazyVStack(spacing: 0) {
                    ForEach(completions) { completion in
                        Button {
                            onSelect(completion)
                        } label: {
                            HStack(spacing: 12) {
                                Image(systemName: "mappin.circle.fill")
                                    .font(.system(size: 24))
                                    .foregroundStyle(Color.acAccent)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(completion.title)
                                        .font(.system(size: 16, weight: .medium))
                                        .foregroundStyle(.primary)
                                        .lineLimit(1)

                                    if !completion.subtitle.isEmpty {
                                        Text(completion.subtitle)
                                            .font(.system(size: 13))
                                            .foregroundStyle(.secondary)
                                            .lineLimit(1)
                                    }
                                }

                                Spacer()

                                Image(systemName: "chevron.right")
                                    .font(.system(size: 14, weight: .medium))
                                    .foregroundStyle(.secondary)
                            }
                            .padding(.horizontal, 16)
                            .padding(.vertical, 12)
                            .contentShape(Rectangle())
                        }
                        .buttonStyle(.plain)

                        if completion.id != completions.last?.id {
                            Divider()
                                .padding(.leading, 52)
                        }
                    }
                }
            }
            .scrollIndicators(.hidden)
        }
    }
}

// MARK: - Preview

#if DEBUG
@available(iOS 17.0, *)
#Preview("Apple Maps Style UI") {
    ZStack {
        Color.acBackground.ignoresSafeArea()

        VStack {
            Spacer()

            FeaturePillsBar(
                onScoutTap: {},
                onDuoTap: {},
                onAskAITap: {},
                onFavoritesTap: {},
                hasChart: true
            )

            BottomSearchCard(
                searchQuery: .constant(""),
                isExpanded: .constant(false),
                currentBirthData: nil,
                onProfileTap: {},
                onSearchFocus: {}
            )
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
        }

        // Weather widget top-left
        VStack {
            HStack {
                CompactWeatherWidget(
                    weatherData: WeatherData(
                        temperature: 22,
                        humidity: 65,
                        windSpeed: 12,
                        description: "Partly cloudy",
                        icon: "⛅️"
                    ),
                    airQualityData: nil,
                    isLoading: false,
                    onTap: nil
                )
                .padding(.leading, 16)
                .padding(.top, 60)

                Spacer()
            }
            Spacer()
        }

        // Right edge: unified vertical stack (Top / Zoom center / Bottom FABs)
        VStack {
            HStack {
                Spacer()
                TopRightActionButtons(
                    hasChart: true,
                    onSettingsTap: {},
                    onChartTap: {},
                    onExportTap: {}
                )
                .padding(.trailing, 16)
                .padding(.top, 60)
            }

            Spacer()

            // Zoom controls — centered
            HStack {
                Spacer()
                ZoomControlsWidget(onZoomIn: {}, onZoomOut: {})
                    .padding(.trailing, 16)
            }

            Spacer()

            // Bottom FABs: Transit + Location + Layers
            HStack {
                Spacer()
                FloatingActionButtons(
                    onLocationTap: {},
                    onLayersTap: {}
                )
                .padding(.trailing, 16)
            }
            .padding(.bottom, 120)
        }
    }
    .preferredColorScheme(.dark)
}
#endif
