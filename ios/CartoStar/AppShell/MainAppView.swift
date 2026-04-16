import SwiftUI
import DesignSystem
import Core
import FeatureGlobe
import FeatureBirthData
import FeatureScout
import HaloHomeCore
import Payments
import struct HaloHomeCore.BirthData

/// Typealias to disambiguate AstroCore.BirthData from FeatureBirthData.BirthData
private typealias AstroBirthData = BirthData

// MARK: - Main App View

/// Main navigation container for the HaloHome app
/// Contains the Globe view as the primary screen with floating toolbar
@available(iOS 17.0, *)
struct MainAppView: View {

    // MARK: - Properties

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    @State private var navigationState = AppNavigationState()
    @State private var globeViewModel: GlobeViewModel
    @State private var scoutViewModel = AstroScoutAdapter.makeScoutViewModel()
    @State private var duoViewModel: DuoViewModel

    // Bottom bar height — measured from the pills+search content, used to bound the right-edge VStack
    @State private var phoneBottomBarHeight: CGFloat = 0

    // Line detail sheet (iPhone — tapping ⓘ on a line card)
    @State private var phoneLineInfoPlanet: String? = nil
    @State private var phoneLineInfoLineType: String? = nil

    // City search + analysis
    @State private var citySearchService = CitySearchService()
    @State private var showSearchResults = false
    @State private var isSearchExpanded = false
    @State private var astroChatViewModel: AstroChatViewModel?
    @State private var birthDataTask: Task<Void, Never>?
    @State private var pendingAnalysis: (coordinate: GlobeCoordinate, cityName: String?, country: String?)?
    private let analysisService = LocationAnalysisService()
    private let networkMonitor = NetworkMonitor.shared

    // Weather widget state
    @State private var weatherData: WeatherData?
    @State private var airQualityData: AirQualityData?
    @State private var isLoadingWeather = false
    private let weatherService = WeatherAQIService()

    // UI animation namespace
    @Namespace private var uiNamespace

    // Favorites
    @State private var favoritesViewModel: FavoritesViewModel?


    // iPad right panel sizing
    @State private var iPadPanelWidth: CGFloat = 400
    @State private var iPadPanelCollapsed: Bool = false
    /// Tracks whether the user manually collapsed the panel — prevents auto-expand on location tap
    @State private var iPadPanelManuallyCollapsed: Bool = false
    @GestureState private var panelDragOffset: CGFloat = 0

    /// Clamped panel width: min 340, max 60% of screen
    private func clampedPanelWidth(in totalWidth: CGFloat) -> CGFloat {
        let maxWidth = totalWidth * 0.6
        let minWidth: CGFloat = 340
        return min(max(iPadPanelWidth - panelDragOffset, minWidth), maxWidth)
    }

    private let environment: AppEnvironment

    /// Whether the user has an active subscription (checked on appear)
    @State private var isSubscribed: Bool = false

    /// Paywall presentation state — uses item-based sheet to avoid double-sheet SwiftUI bug
    private enum PaywallPresentation: String, Identifiable {
        case premium, cancelled
        var id: String { rawValue }
    }
    @State private var paywallPresentation: PaywallPresentation? = nil

    // MARK: - Init

    init(environment: AppEnvironment) {
        self.environment = environment
        self._globeViewModel = State(initialValue: GlobeViewModel(
            astroLineProvider: LiveAstroLineProvider(),
            geocodingProvider: LiveGeocodingProvider(),
            natalChartProvider: LiveNatalChartProvider()
        ))
        self._duoViewModel = State(initialValue: DuoViewModel(
            astroLineProvider: LiveAstroLineProvider(),
            cityProvider: LiveDuoCityProvider()
        ))
        // Initialize favoritesViewModel from environment
        self._favoritesViewModel = State(initialValue: environment.makeFavoritesViewModel())
    }

    // MARK: - Body

    var body: some View {
        Group {
            if horizontalSizeClass == .regular {
                iPadLayout
            } else {
                iPhoneLayout
            }
        }
        .navigationState(navigationState)
        .sheet(item: $navigationState.activeSheet) { sheet in
            MainAppSheetContent(
                sheet: sheet,
                environment: environment,
                navigationState: $navigationState,
                globeViewModel: $globeViewModel,
                scoutViewModel: $scoutViewModel,
                duoViewModel: $duoViewModel,
                currentAnalysis: $navigationState.currentAnalysis,
                astroChatViewModel: $astroChatViewModel,
                favoritesViewModel: favoritesViewModel,
                isSubscribed: isSubscribed,
                onShowPaywall: { paywallPresentation = .premium },
                onApplyBirthData: { applyBirthData($0) },
                onAnalyzeLocation: { coord, name, country in
                    analyzeLocation(coordinate: coord, cityName: name, country: country)
                },
                onActivateLocalSpace: { lat, lng in
                    activateLocalSpace(latitude: lat, longitude: lng)
                }
            )
        }
        .onOpenURL { url in
            navigationState.handleDeepLink(url)
        }
        .onAppear {
            checkBirthDataSetup()
            // Default to Scout panel on iPad
            if horizontalSizeClass == .regular, navigationState.sidePanel == .none {
                navigationState.showRightPanel(.scoutResults)
            }
        }
        .sheet(item: $paywallPresentation) { presentation in
            switch presentation {
            case .premium:
                AdaptyNoCodePaywallView(
                    placementID: "afterauth",
                    onPurchaseComplete: {
                        paywallPresentation = nil
                        isSubscribed = true
                    },
                    onDismiss: {
                        paywallPresentation = nil
                        DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                            paywallPresentation = .cancelled
                        }
                    }
                )
                .background(Color.black.ignoresSafeArea())
                .preferredColorScheme(.dark)
            case .cancelled:
                AdaptyNoCodePaywallView(
                    placementID: "propaywallgotcancelled",
                    onPurchaseComplete: {
                        paywallPresentation = nil
                        isSubscribed = true
                    },
                    onDismiss: {
                        paywallPresentation = nil
                    }
                )
                .background(Color.black.ignoresSafeArea())
                .preferredColorScheme(.dark)
            }
        }
        .task {
            // Merge any guest favorites to Supabase if user just signed in, then load
            await favoritesViewModel?.syncGuestFavorites()
            // Check subscription status
            let state = await environment.paymentsClient.currentState()
            isSubscribed = state.hasScoutAccess
        }
        .onChange(of: navigationState.searchQuery) { _, newValue in
            citySearchService.search(query: newValue)
            showSearchResults = !newValue.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        }
        .onChange(of: globeViewModel.astroLines.isEmpty) { _, isEmpty in
            if !isEmpty {
                let hasChart = BirthDataStore.shared.currentBirthData != nil
                ReviewManager.shared.triggerIfEligible(hasChart: hasChart)
            }
        }
        .onChange(of: globeViewModel.selectedLocation) { _, newLocation in
            guard let location = newLocation else { return }
            if horizontalSizeClass == .regular {
                // iPad: auto-analyze and show in right panel immediately
                analyzeLocation(
                    coordinate: location.coordinate,
                    cityName: location.name,
                    country: location.country
                )
            } else {
                // iPhone: just show the mini location card — user taps it for deep analysis
                fetchWeather(lat: location.coordinate.latitude, lng: location.coordinate.longitude)
            }
        }
        .onChange(of: navigationState.sidePanel) { _, newPanel in
            // Auto-expand the right panel when content is set on iPad
            // BUT only if the user didn't manually collapse it
            if case .right = newPanel, iPadPanelCollapsed, horizontalSizeClass == .regular, !iPadPanelManuallyCollapsed {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) {
                    iPadPanelCollapsed = false
                }
            }
        }
        .onChange(of: BirthDataStore.shared.currentBirthData?.id) { _, newId in
            // Chart switched (or set for first time): clear stale scout markers and re-run scout.
            globeViewModel.clearScoutMarkers()
            checkBirthDataSetup()
        }
        .onChange(of: scoutViewModel.totalCitiesScored) { _, _ in
            // Push updated scout results to AI chat context whenever computation finishes
            guard scoutViewModel.hasResults else { return }
            updateScoutContextToChat()
        }
        .onChange(of: globeViewModel.astroLines) { _, newLines in
            // Sync user lines to duo mode for compatibility calculations
            Task {
                await duoViewModel.updateUserLines(newLines)
            }

            // Execute any pending location analysis now that lines are ready
            if !newLines.isEmpty, let pending = pendingAnalysis {
                pendingAnalysis = nil
                analyzeLocation(
                    coordinate: pending.coordinate,
                    cityName: pending.cityName,
                    country: pending.country
                )
            }
        }
        .alert(
            "Error",
            isPresented: Binding(
                get: { globeViewModel.error != nil },
                set: { if !$0 { globeViewModel.clearError() } }
            ),
            presenting: globeViewModel.error
        ) { _ in
            Button("Retry") {
                Task { await globeViewModel.calculateAstroLines() }
            }
            Button("Dismiss", role: .cancel) { }
        } message: { error in
            Text(error.errorDescription ?? "An unexpected error occurred.")
        }
    }

    // MARK: - iPhone Layout (Apple Maps Style)

    private var iPhoneLayout: some View {
        ZStack {
            // Main content — Mapbox Globe
            GlobeView(
                viewModel: globeViewModel,
                suppressZoomControls: true,
                suppressNakshatraCard: true,
                onAddToFavorites: { coordinate, cityName, country in
                    addLocationToFavorites(coordinate: coordinate, cityName: cityName, country: country)
                },
                onLineInfoTap: { planet, lineType in
                    phoneLineInfoPlanet = planet
                    phoneLineInfoLineType = lineType
                }
            )
            .ignoresSafeArea()
            .accessibilityIdentifier("ph-no-capture")
            .sheet(isPresented: Binding(
                get: { phoneLineInfoPlanet != nil },
                set: { if !$0 { phoneLineInfoPlanet = nil; phoneLineInfoLineType = nil } }
            )) {
                if let planet = phoneLineInfoPlanet, let lineType = phoneLineInfoLineType {
                    NavigationStack {
                        LineInfoContent(planet: planet, lineType: lineType)
                            .padding()
                            .toolbar {
                                ToolbarItem(placement: .topBarTrailing) {
                                    Button("Done") {
                                        phoneLineInfoPlanet = nil
                                        phoneLineInfoLineType = nil
                                    }
                                }
                            }
                            .navigationTitle("\(planet) \(lineType.uppercased())")
                            .navigationBarTitleDisplayMode(.inline)
                    }
                    .presentationDetents([.medium, .large])
                    .presentationDragIndicator(.visible)
                }
            }

            // Offline banner
            if !networkMonitor.isConnected {
                VStack {
                    offlineBanner
                    Spacer()
                }
                .transition(.move(edge: .top).combined(with: .opacity))
                .animation(ACSpring.smooth, value: networkMonitor.isConnected)
                .zIndex(100)
            }

            // Scouting toast (top center, aligned with weather widget and settings buttons)
            if scoutViewModel.isComputing {
                VStack {
                    HStack {
                        Spacer()
                        ScoutingToast()
                        Spacer()
                    }
                    .padding(.top, 8)
                    .safeAreaPadding(.top)
                    Spacer()
                }
                .transition(.move(edge: .top).combined(with: .opacity))
                .animation(ACSpring.smooth, value: scoutViewModel.isComputing)
                .zIndex(99)
            }

            // Top left area: Weather widget + Natal chart
            if navigationState.isToolbarVisible {
                VStack {
                    HStack {
                        VStack(alignment: .leading, spacing: 12) {
                            // Weather widget
                            if weatherData != nil || isLoadingWeather {
                                CompactWeatherWidget(
                                    weatherData: weatherData,
                                    airQualityData: airQualityData,
                                    isLoading: isLoadingWeather,
                                    onTap: nil
                                )
                                .transition(.opacity)
                            }

                            // Natal chart widget (below weather)
                            if globeViewModel.showNatalChart, let chartData = globeViewModel.natalChartData {
                                NatalChartWidget(
                                    chartData: chartData,
                                    houseSystem: Binding(
                                        get: { globeViewModel.natalHouseSystem },
                                        set: { globeViewModel.natalHouseSystem = $0 }
                                    ),
                                    useSidereal: Binding(
                                        get: { globeViewModel.natalUseSidereal },
                                        set: { globeViewModel.natalUseSidereal = $0 }
                                    ),
                                    ayanamsaSystem: Binding(
                                        get: { globeViewModel.natalAyanamsaSystem },
                                        set: { globeViewModel.natalAyanamsaSystem = $0 }
                                    ),
                                    onSettingsChanged: {
                                        globeViewModel.recalculateNatalChart()
                                    }
                                )
                                .transition(.scale(scale: 0.9).combined(with: .opacity))
                            }
                        }
                        .padding(.leading, DSSpacing.md)

                        Spacer()
                    }
                    .padding(.top, 8)
                    .safeAreaPadding(.top)

                    Spacer()
                }
                .animation(ACSpring.smooth, value: globeViewModel.showNatalChart)
                .animation(ACSpring.gentle, value: weatherData != nil)
            }

            // Right edge controls: unified vertical stack
            // Top: Settings/Chart/Export — Center: Zoom widget — Bottom: Transit/Location/Layers
            if navigationState.isToolbarVisible && !isSearchExpanded {
                VStack {
                    // Top right action buttons (Settings, Chart, Export)
                    HStack {
                        Spacer()
                        TopRightActionButtons(
                            hasChart: BirthDataStore.shared.currentBirthData != nil,
                            isTransitMode: globeViewModel.isTransitMode,
                            isLocalSpaceActive: globeViewModel.isLocalSpaceActive,
                            hasSelectedLocation: globeViewModel.selectedLocation != nil,
                            onSettingsTap: { navigationState.showSheet(.settings) },
                            onChartTap: { globeViewModel.showNatalChart.toggle() },
                            onExportTap: { navigationState.showSheet(.exportReport) },
                            onTransitTap: {
                                withAnimation(ACSpring.smooth) {
                                    globeViewModel.toggleTransitMode()
                                }
                            },
                            onLocalSpaceTap: {
                                withAnimation(ACSpring.smooth) {
                                    if globeViewModel.isLocalSpaceActive {
                                        globeViewModel.resetLocalSpace()
                                    } else if let loc = globeViewModel.selectedLocation {
                                        activateLocalSpace(latitude: loc.coordinate.latitude, longitude: loc.coordinate.longitude)
                                    }
                                }
                            }
                        )
                        .padding(.trailing, DSSpacing.md)
                        .padding(.top, 8)
                        .safeAreaPadding(.top)
                    }

                    Spacer()

                    // Zoom controls — centered
                    HStack {
                        Spacer()
                        ZoomControlsWidget(
                            onZoomIn: {
                                withAnimation(ACSpring.quick) {
                                    globeViewModel.cameraState.zoom = min(globeViewModel.cameraState.zoom + 1, 20)
                                }
                            },
                            onZoomOut: {
                                withAnimation(ACSpring.quick) {
                                    globeViewModel.cameraState.zoom = max(globeViewModel.cameraState.zoom - 1, 0)
                                }
                            }
                        )
                        .padding(.trailing, DSSpacing.md)
                    }

                    Spacer()

                    // Bottom FABs: Transit + Location + Layers
                    HStack {
                        Spacer()
                        FloatingActionButtons(
                            onLocationTap: {
                                if let birthData = BirthDataStore.shared.currentBirthData {
                                    let coord = GlobeCoordinate(
                                        latitude: birthData.latitude,
                                        longitude: birthData.longitude
                                    )
                                    withAnimation(ACSpring.smooth) {
                                        globeViewModel.navigateTo(coordinate: coord, zoom: 3.0)
                                    }
                                }
                            },
                            onLayersTap: {
                                globeViewModel.showLineFilters = true
                            }
                        )
                        .padding(.trailing, DSSpacing.md)
                    }
                }
                .padding(.bottom, phoneBottomBarHeight)
                .transition(.move(edge: .trailing).combined(with: .opacity))
                .animation(ACSpring.smooth, value: isSearchExpanded)
            }

            // Bottom UI (search + feature pills + location card)
            if navigationState.isToolbarVisible {
                VStack(spacing: 12) {
                    Spacer()

                    // Search results (when expanded)
                    if isSearchExpanded && (showSearchResults || !navigationState.searchQuery.isEmpty) {
                        searchResultsOverlay
                            .transition(.move(edge: .bottom).combined(with: .opacity))
                    }

                    // Nakshatra mini card (shown above feature pills when a band is tapped)
                    if let nakshatraData = globeViewModel.selectedNakshatra,
                       !isSearchExpanded {
                        NakshatraMiniCard(
                            data: nakshatraData,
                            onDismiss: {
                                withAnimation(ACSpring.smooth) {
                                    globeViewModel.selectedNakshatra = nil
                                }
                            }
                        )
                        .padding(.horizontal, DSSpacing.md)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                    }

                    // Selected location card (shown above feature pills when active, hidden if globe info card is showing)
                    if let location = globeViewModel.selectedLocation,
                       !isSearchExpanded,
                       !globeViewModel.hasActiveInfoCard {
                        SelectedLocationCard(
                            location: location,
                            hasChart: BirthDataStore.shared.currentBirthData != nil,
                            onDismiss: {
                                withAnimation(ACSpring.smooth) {
                                    globeViewModel.clearSelection()
                                }
                            },
                            onInfoTap: {
                                analyzeLocation(
                                    coordinate: location.coordinate,
                                    cityName: location.name,
                                    country: location.country
                                )
                            }
                        )
                        .padding(.horizontal, DSSpacing.md)
                        .transition(.move(edge: .bottom).combined(with: .opacity))
                    }

                    // Feature pills + search card — wrapped to measure height for right-edge VStack
                    VStack(spacing: 12) {
                        // Feature pills OR transit scrubber (mutually exclusive on iPhone)
                        if !isSearchExpanded {
                            if globeViewModel.isTransitMode {
                                // Transit scrubber replaces feature pills on iPhone
                                TransitScrubberView(
                                    transitDate: $globeViewModel.transitDate,
                                    isPlaying: $globeViewModel.isTransitPlaying,
                                    onClose: {
                                        withAnimation(ACSpring.smooth) {
                                            globeViewModel.toggleTransitMode()
                                        }
                                    },
                                    onDateChanged: {
                                        await globeViewModel.calculateTransitLinesAsync()
                                    },
                                    filterPlanets: $globeViewModel.transitFilterPlanets,
                                    filterLineTypes: $globeViewModel.transitFilterLineTypes,
                                    filterShowAspects: $globeViewModel.transitFilterShowAspects,
                                    filterShowParans: $globeViewModel.transitFilterShowParans,
                                    hasActiveFilters: globeViewModel.hasActiveTransitFilters,
                                    onSelectAll: { globeViewModel.transitFilterSelectAll() },
                                    onClearAll: { globeViewModel.transitFilterClearAll() }
                                )
                                .padding(.horizontal, DSSpacing.sm)
                                .transition(.move(edge: .bottom).combined(with: .opacity))
                            } else {
                                FeaturePillsBar(
                                    onScoutTap: { navigationState.showSheet(.scout) },
                                    onDuoTap: {
                                        handleDuoTap()
                                    },
                                    onAskAITap: { navigationState.showSheet(.consultation) },
                                    onFavoritesTap: { navigationState.showSheet(.favorites) },
                                    hasChart: BirthDataStore.shared.currentBirthData != nil,
                                    isScoutLoading: scoutViewModel.isComputing
                                )
                                .transition(.move(edge: .bottom).combined(with: .opacity))
                            }
                        }

                        // Bottom search card
                        BottomSearchCard(
                            searchQuery: $navigationState.searchQuery,
                            isExpanded: $isSearchExpanded,
                            currentBirthData: BirthDataStore.shared.currentBirthData,
                            onProfileTap: { navigationState.showSheet(.chartPicker) },
                            onSearchFocus: {
                                withAnimation(ACSpring.smooth) {
                                    isSearchExpanded = true
                                }
                            }
                        )
                        .padding(.horizontal, DSSpacing.md)
                        .padding(.bottom, 8)
                        .safeAreaPadding(.bottom)
                    }
                    .background(
                        GeometryReader { geo in
                            Color.clear.onAppear {
                                phoneBottomBarHeight = geo.size.height
                            }
                        }
                    )
                }
                .animation(ACSpring.smooth, value: isSearchExpanded)
                .animation(ACSpring.smooth, value: globeViewModel.selectedLocation?.id)
                .animation(ACSpring.smooth, value: globeViewModel.hasActiveInfoCard)
            }

            // Side panel overlay
            if case .right(let content) = navigationState.sidePanel {
                RightPanelView(content: content, mode: .overlay) {
                    navigationState.hideSidePanel()
                }
                .transition(.move(edge: .trailing))
                .zIndex(100)
            }
        }
        .onTapGesture {
            // Collapse search when tapping outside
            if isSearchExpanded && navigationState.searchQuery.isEmpty {
                withAnimation(ACSpring.smooth) {
                    isSearchExpanded = false
                }
            }
        }
    }

    // MARK: - Offline Banner

    private var offlineBanner: some View {
        HStack(spacing: 8) {
            Image(systemName: "wifi.slash")
                .font(.caption)
            Text("No Internet Connection")
                .font(.caption)
                .fontWeight(.medium)
        }
        .foregroundStyle(.white)
        .frame(maxWidth: .infinity)
        .padding(.vertical, 6)
        .background(Color.red.opacity(0.85))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("No internet connection")
    }

    // MARK: - Search Results Overlay

    private var searchResultsOverlay: some View {
        VStack(spacing: 0) {
            SearchResultsList(
                completions: citySearchService.completions,
                isSearching: citySearchService.isSearching,
                onSelect: { completion in
                    handleCompletionSelected(completion)
                }
            )
        }
        .frame(maxHeight: 300)
        .acLiquidGlass(cornerRadius: 16)
        .padding(.horizontal, DSSpacing.md)
    }

    // MARK: - iPad Layout

    private var iPadLayout: some View {
        GeometryReader { geometry in
            let showPanel = !iPadPanelCollapsed
            let panelWidth = clampedPanelWidth(in: geometry.size.width)

            ZStack(alignment: .trailing) {
                // Globe fills full screen
                ZStack {
                    GlobeView(
                        viewModel: globeViewModel,
                        suppressInfoCardsOverlay: true,
                        zoomControlsTrailingPadding: showPanel ? panelWidth + 8 : 0,
                        onAddToFavorites: { coordinate, cityName, country in
                            addLocationToFavorites(coordinate: coordinate, cityName: cityName, country: country)
                        }
                    )
                    .ignoresSafeArea()
                    .accessibilityIdentifier("ph-no-capture")

                    if navigationState.isToolbarVisible {
                        // Top left: search bar + results dropdown + natal chart
                        VStack(alignment: .leading, spacing: 8) {
                            HStack(spacing: DSSpacing.md) {
                                BottomSearchCard(
                                    searchQuery: $navigationState.searchQuery,
                                    isExpanded: $isSearchExpanded,
                                    currentBirthData: BirthDataStore.shared.currentBirthData,
                                    onProfileTap: { navigationState.showSheet(.chartPicker) },
                                    onSearchFocus: {
                                        withAnimation(ACSpring.smooth) {
                                            isSearchExpanded = true
                                        }
                                    }
                                )
                                .frame(maxWidth: 360)

                                Spacer()
                            }

                            // Search results dropdown (below search bar)
                            if isSearchExpanded && (showSearchResults || !navigationState.searchQuery.isEmpty) {
                                searchResultsOverlay
                                    .frame(maxWidth: 360)
                                    .transition(.move(edge: .top).combined(with: .opacity))
                            }

                            // Info cards — shown below search bar, hidden while suggestions visible
                            let hideCards = isSearchExpanded && (showSearchResults || !navigationState.searchQuery.isEmpty)
                            if !hideCards {
                                if let lineData = globeViewModel.selectedLine {
                                    iPadLineInfoCard(lineData)
                                        .frame(maxWidth: 360)
                                        .transition(.opacity.combined(with: .scale(scale: 0.97, anchor: .top)))
                                } else if let aspectData = globeViewModel.selectedAspectLine {
                                    iPadAspectLineInfoCard(aspectData)
                                        .frame(maxWidth: 360)
                                        .transition(.opacity.combined(with: .scale(scale: 0.97, anchor: .top)))
                                } else if let paranData = globeViewModel.selectedParanPoint {
                                    iPadParanPointInfoCard(paranData)
                                        .frame(maxWidth: 360)
                                        .transition(.opacity.combined(with: .scale(scale: 0.97, anchor: .top)))
                                } else if let zenithData = globeViewModel.selectedZenithPoint {
                                    iPadZenithPointInfoCard(zenithData)
                                        .frame(maxWidth: 360)
                                        .transition(.opacity.combined(with: .scale(scale: 0.97, anchor: .top)))
                                } else if let nakshatraData = globeViewModel.selectedNakshatra {
                                    iPadNakshatraInfoCard(nakshatraData)
                                        .frame(maxWidth: 360)
                                        .transition(.opacity.combined(with: .scale(scale: 0.97, anchor: .top)))
                                } else if let location = globeViewModel.selectedLocation, !showPanel {
                                    SelectedLocationCard(
                                        location: location,
                                        hasChart: BirthDataStore.shared.currentBirthData != nil,
                                        onDismiss: {
                                            withAnimation(ACSpring.smooth) {
                                                globeViewModel.clearSelection()
                                            }
                                        },
                                        onInfoTap: {
                                            analyzeLocation(
                                                coordinate: location.coordinate,
                                                cityName: location.name,
                                                country: location.country
                                            )
                                        }
                                    )
                                    .frame(maxWidth: 360)
                                    .transition(.opacity.combined(with: .scale(scale: 0.97, anchor: .top)))
                                }
                            }

                            // Natal chart widget (below search)
                            if globeViewModel.showNatalChart, let chartData = globeViewModel.natalChartData {
                                NatalChartWidget(
                                    chartData: chartData,
                                    houseSystem: Binding(
                                        get: { globeViewModel.natalHouseSystem },
                                        set: { globeViewModel.natalHouseSystem = $0 }
                                    ),
                                    useSidereal: Binding(
                                        get: { globeViewModel.natalUseSidereal },
                                        set: { globeViewModel.natalUseSidereal = $0 }
                                    ),
                                    ayanamsaSystem: Binding(
                                        get: { globeViewModel.natalAyanamsaSystem },
                                        set: { globeViewModel.natalAyanamsaSystem = $0 }
                                    ),
                                    onSettingsChanged: {
                                        globeViewModel.recalculateNatalChart()
                                    }
                                )
                                .transition(.scale(scale: 0.9).combined(with: .opacity))
                            }

                            Spacer()
                        }
                        .padding(.leading, DSSpacing.md)
                        .padding(.top, 8)
                        .safeAreaPadding(.top)
                        .animation(ACSpring.smooth, value: isSearchExpanded)
                        .animation(ACSpring.smooth, value: globeViewModel.showNatalChart)
                        .animation(ACSpring.smooth, value: globeViewModel.selectedLine?.id)
                        .animation(ACSpring.smooth, value: globeViewModel.selectedAspectLine?.id)
                        .animation(ACSpring.smooth, value: globeViewModel.selectedParanPoint?.id)
                        .animation(ACSpring.smooth, value: globeViewModel.selectedZenithPoint?.id)
                        .animation(ACSpring.smooth, value: globeViewModel.selectedLocation?.id)

                        // Top right: weather + settings at top, action buttons below panel toggle
                        VStack(alignment: .trailing, spacing: 12) {
                            // Weather widget
                            if weatherData != nil || isLoadingWeather {
                                CompactWeatherWidget(
                                    weatherData: weatherData,
                                    airQualityData: airQualityData,
                                    isLoading: isLoadingWeather,
                                    onTap: nil
                                )
                                .transition(.opacity)
                            }

                            // Settings button (just below weather, like iPhone)
                            FloatingIconButton(
                                icon: "gearshape.fill",
                                action: { navigationState.showSheet(.settings) },
                                accessibilityLabel: "Settings"
                            )

                            // Natal chart toggle badge (below settings)
                            FloatingIconButton(
                                icon: globeViewModel.showNatalChart ? "circle.grid.cross.fill" : "circle.grid.cross",
                                action: { globeViewModel.showNatalChart.toggle() },
                                accessibilityLabel: "Toggle natal chart",
                                tint: globeViewModel.showNatalChart ? Color.acPlanetSun : nil
                            )
                            .acDarkGlass(cornerRadius: ACRadius.glassLarge)

                            // Export report badge (below natal)
                            FloatingIconButton(
                                icon: "doc.richtext",
                                action: { navigationState.showSheet(.exportReport) },
                                accessibilityLabel: "Export report"
                            )
                            .acDarkGlass(cornerRadius: ACRadius.glassLarge)

                            // Transit mode toggle
                            FloatingIconButton(
                                icon: "clock.arrow.2.circlepath",
                                action: {
                                    withAnimation(ACSpring.smooth) {
                                        globeViewModel.toggleTransitMode()
                                    }
                                },
                                accessibilityLabel: globeViewModel.isTransitMode ? "Close Transit" : "Transit Lines",
                                isActive: globeViewModel.isTransitMode
                            )

                            // Local Space toggle (shown when location selected or active)
                            if globeViewModel.isLocalSpaceActive || globeViewModel.selectedLocation != nil {
                                FloatingIconButton(
                                    icon: "location.viewfinder",
                                    action: {
                                        withAnimation(ACSpring.smooth) {
                                            if globeViewModel.isLocalSpaceActive {
                                                globeViewModel.resetLocalSpace()
                                            } else if let loc = globeViewModel.selectedLocation {
                                                activateLocalSpace(latitude: loc.coordinate.latitude, longitude: loc.coordinate.longitude)
                                            }
                                        }
                                    },
                                    accessibilityLabel: globeViewModel.isLocalSpaceActive ? "Exit Local Space" : "Local Space",
                                    isActive: globeViewModel.isLocalSpaceActive
                                )
                            }

                            // Panel toggle
                            iPadPanelToggleButton
                        }
                        .padding(.trailing, showPanel ? panelWidth + 20 : DSSpacing.md)
                        .padding(.top, 8)
                        .safeAreaPadding(.top)
                        .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topTrailing)
                        .animation(ACSpring.gentle, value: weatherData != nil)
                        .animation(ACSpring.smooth, value: showPanel)


                    }

                    // Scouting toast
                    if scoutViewModel.isComputing {
                        VStack {
                            HStack {
                                Spacer()
                                ScoutingToast()
                                Spacer()
                            }
                            .padding(.top, 8)
                            .safeAreaPadding(.top)
                            Spacer()
                        }
                        .transition(.move(edge: .top).combined(with: .opacity))
                        .animation(ACSpring.smooth, value: scoutViewModel.isComputing)
                        .zIndex(99)
                    }

                }
                .onTapGesture {
                    if isSearchExpanded && navigationState.searchQuery.isEmpty {
                        withAnimation(ACSpring.smooth) {
                            isSearchExpanded = false
                        }
                    }
                }

                // Floating overlay panel — liquid glass card over the globe
                if showPanel {
                    VStack(spacing: 0) {
                        // Feature pills: pure glass header
                        iPadFeaturePills

                        // Content area: backed with adaptive opaque layer so text is always readable
                        rightPanelForIPad
                            .background(Color(.systemBackground).opacity(0.82))
                            .frame(maxHeight: .infinity, alignment: .top)
                    }
                    .contentShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .frame(width: panelWidth)
                    .frame(maxHeight: .infinity)
                    .clipShape(RoundedRectangle(cornerRadius: 20, style: .continuous))
                    .acLiquidGlass(cornerRadius: 20)
                    .shadow(color: .black.opacity(0.18), radius: 30, x: -8, y: 0)
                    .overlay(alignment: .leading) {
                        iPadPanelResizeHandle(totalWidth: geometry.size.width)
                    }
                    .padding(.vertical, 12)
                    .padding(.trailing, 8)
                    .transition(.move(edge: .trailing).combined(with: .opacity))
                }

                // Floating action buttons — direct child of outer ZStack so they are
                // always above the glass panel in z-order and never occluded by it.
                if navigationState.isToolbarVisible {
                    VStack {
                        Spacer()
                        FloatingActionButtons(
                            onLocationTap: {
                                if let birthData = BirthDataStore.shared.currentBirthData {
                                    let coord = GlobeCoordinate(
                                        latitude: birthData.latitude,
                                        longitude: birthData.longitude
                                    )
                                    withAnimation(ACSpring.smooth) {
                                        globeViewModel.navigateTo(coordinate: coord, zoom: 3.0)
                                    }
                                }
                            },
                            onLayersTap: {
                                // Force-open the panel on iPad even if manually collapsed
                                if iPadPanelCollapsed {
                                    withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) {
                                        iPadPanelCollapsed = false
                                        iPadPanelManuallyCollapsed = false
                                    }
                                }
                                navigationState.presentContent(.lineFilters, sizeClass: horizontalSizeClass)
                            }
                        )
                    }
                    .padding(.trailing, showPanel ? panelWidth + 20 : DSSpacing.md)
                    .safeAreaPadding(.bottom)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .bottomTrailing)
                    .animation(.spring(response: 0.3, dampingFraction: 0.85), value: showPanel)
                }
                // iPad: Transit scrubber at bottom center of globe
                if globeViewModel.isTransitMode {
                    VStack {
                        Spacer()
                        TransitScrubberView(
                            transitDate: $globeViewModel.transitDate,
                            isPlaying: $globeViewModel.isTransitPlaying,
                            onClose: {
                                withAnimation(ACSpring.smooth) {
                                    globeViewModel.toggleTransitMode()
                                }
                            },
                            onDateChanged: {
                                await globeViewModel.calculateTransitLinesAsync()
                            },
                            filterPlanets: $globeViewModel.transitFilterPlanets,
                            filterLineTypes: $globeViewModel.transitFilterLineTypes,
                            filterShowAspects: $globeViewModel.transitFilterShowAspects,
                            filterShowParans: $globeViewModel.transitFilterShowParans,
                            hasActiveFilters: globeViewModel.hasActiveTransitFilters,
                            onSelectAll: { globeViewModel.transitFilterSelectAll() },
                            onClearAll: { globeViewModel.transitFilterClearAll() }
                        )
                        .frame(maxWidth: 420)
                        .padding(.horizontal, DSSpacing.lg)
                        .padding(.bottom, DSSpacing.lg)
                    }
                    .frame(maxWidth: .infinity, alignment: .center)
                    .transition(.move(edge: .bottom).combined(with: .opacity))
                }
            }
            .animation(.spring(response: 0.3, dampingFraction: 0.85), value: iPadPanelCollapsed)
            .animation(.spring(response: 0.3, dampingFraction: 0.85), value: navigationState.sidePanel)
            .animation(ACSpring.smooth, value: globeViewModel.isTransitMode)
        }
    }

    // MARK: - iPad Panel Toggle Button

    private var iPadPanelToggleButton: some View {
        Button {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) {
                iPadPanelCollapsed.toggle()
                iPadPanelManuallyCollapsed = iPadPanelCollapsed
            }
        } label: {
            Image(systemName: iPadPanelCollapsed ? "sidebar.right" : "sidebar.right")
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(iPadPanelCollapsed ? Color.acAmber500 : Color.acMutedForeground)
                .frame(width: 32, height: 32)
                .background(
                    Circle()
                        .fill(.ultraThinMaterial)
                        .shadow(color: .black.opacity(0.15), radius: 4, y: 2)
                )
        }
        .accessibilityLabel(iPadPanelCollapsed ? "Show side panel" : "Hide side panel")
    }

    // MARK: - iPad Feature Pills (right panel top)

    private var iPadFeaturePills: some View {
        VStack(spacing: 0) {
            HStack(spacing: 8) {
                FeaturePill(
                    icon: "binoculars.fill",
                    label: "Scout",
                    color: .acPlanetJupiter,
                    action: { navigationState.showRightPanel(.scoutResults) },
                    isLoading: scoutViewModel.isComputing,
                    fillsWidth: true
                )

                FeaturePill(
                    icon: "person.2.fill",
                    label: "Duo",
                    color: .acPlanetVenus,
                    action: { handleDuoTap() },
                    fillsWidth: true
                )

                FeaturePill(
                    icon: "sparkles",
                    label: "AI Chat",
                    color: .white,
                    action: { navigationState.showRightPanel(.aiChat) },
                    fillsWidth: true
                )

                FeaturePill(
                    icon: "heart.fill",
                    label: "Favorites",
                    color: .red,
                    action: { navigationState.showRightPanel(.favorites) },
                    isDisabled: BirthDataStore.shared.currentBirthData == nil,
                    fillsWidth: true
                )
            }
            .padding(.horizontal, DSSpacing.md)
            .padding(.vertical, DSSpacing.md)

            Divider()
                .opacity(0.4)
        }
        .background(Color.clear)
    }

    // MARK: - iPad Inline Info Cards (below search bar)

    private func iPadLineInfoCard(_ lineData: AstroLineCardData) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(lineData.line.planet.symbol)
                    .font(.title2)
                    .foregroundStyle(lineData.line.planet.cardColor)

                VStack(alignment: .leading, spacing: 2) {
                    Text(lineData.line.displayName)
                        .font(.headline)
                        .foregroundStyle(Color.acGlassTextPrimary)
                    Text(lineData.line.lineType.displayName)
                        .font(.caption)
                        .foregroundStyle(Color.acMutedForeground)
                }

                Spacer()

                HStack(spacing: 8) {
                    Button {
                        Analytics.capture(.globeLineTapped, properties: [
                            "planet": lineData.line.planet.rawValue,
                            "line_type": lineData.line.lineType.rawValue
                        ])
                        navigationState.showRightPanel(.lineInfo(planet: lineData.line.planet.rawValue, lineType: lineData.line.lineType.rawValue))
                    } label: {
                        Image(systemName: "info.circle")
                            .font(.title3)
                            .foregroundStyle(Color.acAccent)
                    }
                    .accessibilityLabel("View detailed interpretation")

                    Button {
                        globeViewModel.selectedLine = nil
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title3)
                            .foregroundStyle(Color.acMutedForeground)
                    }
                    .accessibilityLabel("Dismiss line info")
                }
            }

            if let distance = lineData.distanceString {
                HStack(spacing: 4) {
                    Image(systemName: "ruler")
                        .font(.caption)
                        .foregroundStyle(Color.acMutedForeground)
                    Text("Distance: \(distance)")
                        .font(.caption)
                        .foregroundStyle(Color.acMutedForeground)
                }
            }

            Text(lineData.briefInterpretation)
                .font(.caption)
                .foregroundStyle(Color.acMutedForeground)
                .lineLimit(3)
        }
        .padding()
        .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
        .contentShape(Rectangle())
        .onTapGesture { }
        .gesture(DragGesture().onChanged { _ in })
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(lineData.line.displayName), \(lineData.line.lineType.displayName)")
    }

    private func iPadAspectLineInfoCard(_ aspectData: AspectLineCardData) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text(aspectData.aspectLine.planet.symbol)
                    .font(.title2)
                    .foregroundStyle(aspectData.aspectLine.planet.cardColor)

                VStack(alignment: .leading, spacing: 2) {
                    Text(aspectData.displayName)
                        .font(.headline)
                        .foregroundStyle(Color.acGlassTextPrimary)
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

                Spacer()

                Button {
                    globeViewModel.selectedAspectLine = nil
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title3)
                        .foregroundStyle(Color.acMutedForeground)
                }
                .accessibilityLabel("Dismiss aspect line info")
            }

            if let distance = aspectData.distanceString {
                HStack(spacing: 4) {
                    Image(systemName: "ruler")
                        .font(.caption)
                        .foregroundStyle(Color.acMutedForeground)
                    Text("Distance: \(distance)")
                        .font(.caption)
                        .foregroundStyle(Color.acMutedForeground)
                }
            }

            Text(aspectData.briefDescription)
                .font(.caption)
                .foregroundStyle(Color.acMutedForeground)
                .lineLimit(2)
        }
        .padding()
        .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
        .contentShape(Rectangle())
        .onTapGesture { }
        .gesture(DragGesture().onChanged { _ in })
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(aspectData.displayName), \(aspectData.natureDescription)")
    }

    private func iPadParanPointInfoCard(_ paranData: ParanPointCardData) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                HStack(spacing: 2) {
                    if let p1 = Planet(rawValue: paranData.paranLine.planet1) {
                        Text(p1.symbol)
                            .font(.title3)
                            .foregroundStyle(p1.cardColor)
                    }
                    Text("×")
                        .font(.caption)
                        .foregroundStyle(Color.acMutedForeground)
                    if let p2 = Planet(rawValue: paranData.paranLine.planet2) {
                        Text(p2.symbol)
                            .font(.title3)
                            .foregroundStyle(p2.cardColor)
                    }
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(paranData.displayName)
                        .font(.headline)
                        .foregroundStyle(Color.acGlassTextPrimary)
                    Text("Paran Point")
                        .font(.caption)
                        .foregroundStyle(Color.acMutedForeground)
                }

                Spacer()

                Button {
                    globeViewModel.selectedParanPoint = nil
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title3)
                        .foregroundStyle(Color.acMutedForeground)
                }
                .accessibilityLabel("Dismiss paran point info")
            }

            HStack(spacing: 4) {
                Image(systemName: "location")
                    .font(.caption)
                    .foregroundStyle(Color.acMutedForeground)
                Text("Latitude: \(paranData.latitudeString)")
                    .font(.caption)
                    .foregroundStyle(Color.acMutedForeground)
            }

            Text(paranData.description)
                .font(.caption)
                .foregroundStyle(Color.acMutedForeground)
                .lineLimit(2)
        }
        .padding()
        .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
        .contentShape(Rectangle())
        .onTapGesture { }
        .gesture(DragGesture().onChanged { _ in })
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(paranData.displayName), paran point")
    }

    private func iPadZenithPointInfoCard(_ zenithData: ZenithPointCardData) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                ZStack {
                    Image(systemName: "sun.max.fill")
                        .font(.caption)
                        .foregroundStyle(Color.acAccent.opacity(0.5))
                    Text(zenithData.zenithPoint.planet.symbol)
                        .font(.title2)
                        .foregroundStyle(zenithData.zenithPoint.planet.cardColor)
                }

                VStack(alignment: .leading, spacing: 2) {
                    Text(zenithData.displayName)
                        .font(.headline)
                        .foregroundStyle(Color.acGlassTextPrimary)
                    Text("Zenith Point")
                        .font(.caption)
                        .foregroundStyle(Color.acAccent)
                }

                Spacer()

                Button {
                    globeViewModel.selectedZenithPoint = nil
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title3)
                        .foregroundStyle(Color.acMutedForeground)
                }
                .accessibilityLabel("Dismiss zenith point info")
            }

            HStack(spacing: 4) {
                Image(systemName: "mappin.and.ellipse")
                    .font(.caption)
                    .foregroundStyle(Color.acMutedForeground)
                Text(zenithData.coordinateString)
                    .font(.caption)
                    .foregroundStyle(Color.acMutedForeground)
            }

            Text(zenithData.description)
                .font(.caption)
                .foregroundStyle(Color.acMutedForeground)
                .lineLimit(2)
        }
        .padding()
        .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
        .contentShape(Rectangle())
        .onTapGesture { }
        .gesture(DragGesture().onChanged { _ in })
        .accessibilityElement(children: .contain)
        .accessibilityLabel("\(zenithData.displayName) at \(zenithData.coordinateString)")
    }

    private func iPadNakshatraInfoCard(_ data: NakshatraCardData) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                ZStack {
                    Circle()
                        .fill(Color(hex: data.colorHex))
                        .frame(width: 32, height: 32)
                    Image(systemName: "star.fill")
                        .font(.system(size: 14))
                        .foregroundStyle(.white)
                }

                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: 6) {
                        Text(data.displayName)
                            .font(.headline)
                            .foregroundStyle(Color.acGlassTextPrimary)
                        Text(data.indexLabel)
                            .font(.system(size: 10, weight: .medium))
                            .foregroundStyle(.white.opacity(0.7))
                            .padding(.horizontal, 5)
                            .padding(.vertical, 1)
                            .background(Color(hex: data.colorHex).opacity(0.6))
                            .clipShape(Capsule())
                    }
                    Text(data.englishName)
                        .font(.caption)
                        .foregroundStyle(Color.acMutedForeground)
                }

                Spacer()

                Button {
                    globeViewModel.selectedNakshatra = nil
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.title3)
                        .foregroundStyle(Color.acMutedForeground)
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

            HStack(spacing: 6) {
                Image(systemName: "moon.stars")
                    .font(.caption)
                    .foregroundStyle(Color(hex: data.colorHex))
                Text("Ruled by \(data.rulingPlanet)")
                    .font(.caption)
                    .foregroundStyle(Color.acGlassTextPrimary)
                Text("•")
                    .foregroundStyle(Color.acMutedForeground)
                Text(data.padaLabel)
                    .font(.caption)
                    .foregroundStyle(Color.acMutedForeground)
            }

            // Detail rows
            HStack(spacing: 6) {
                Image(systemName: "person.fill")
                    .font(.caption)
                    .foregroundStyle(Color.acMutedForeground)
                    .frame(width: 16)
                Text(data.deity)
                    .font(.caption)
                    .foregroundStyle(Color.acGlassTextPrimary)
                Spacer()
                Image(systemName: "star.circle")
                    .font(.caption)
                    .foregroundStyle(Color.acMutedForeground)
                    .frame(width: 16)
                Text(data.starName)
                    .font(.caption)
                    .foregroundStyle(Color.acGlassTextPrimary)
            }
        }
        .padding()
        .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
        .contentShape(Rectangle())
        .onTapGesture { }
        .gesture(DragGesture().onChanged { _ in })
    }

    // MARK: - iPad Panel Resize Handle (overlay on leading edge of floating panel)

    private func iPadPanelResizeHandle(totalWidth: CGFloat) -> some View {
        ZStack {
            // Visual pill indicator
            RoundedRectangle(cornerRadius: 3, style: .continuous)
                .fill(Color.acMutedForeground.opacity(0.35))
                .frame(width: 4, height: 44)

            // Wide invisible hit area
            Color.clear
                .frame(width: 24)
                .contentShape(Rectangle())
        }
        .gesture(
            DragGesture()
                .updating($panelDragOffset) { value, state, _ in
                    // Drag left = expand panel, drag right = shrink panel
                    state = value.translation.width
                }
                .onEnded { value in
                    let maxWidth = totalWidth * 0.6
                    let minWidth: CGFloat = 340
                    let newWidth = iPadPanelWidth - value.translation.width
                    iPadPanelWidth = min(max(newWidth, minWidth), maxWidth)
                }
        )
        .padding(.leading, -8) // Extend slightly outside the card edge for easier grabbing
    }

    // MARK: - iPad Right Panel

    @ViewBuilder
    private var rightPanelForIPad: some View {
        if case .right(let content) = navigationState.sidePanel {
            switch content {
            case .cityAnalysis:
                if let analysis = navigationState.currentAnalysis {
                    // CityAnalysisView owns its own NavigationStack + ScrollView.
                    // Do NOT wrap in another ScrollView — nested scroll causes height
                    // collapse, making the panel appear blank on iPad.
                    CityAnalysisView(
                        analysis: analysis,
                        onDismiss: {
                            // On iPad, fall back to Scout instead of closing panel
                            navigationState.showRightPanel(.scoutResults)
                        },
                        onLineHighlight: { line in
                            if let line = line {
                                globeViewModel.showOnlyPlanets([line.planet])
                            } else {
                                globeViewModel.showAllLineTypes()
                            }
                        },
                        onLocalSpace: { lat, lng in
                            activateLocalSpace(latitude: lat, longitude: lng)
                        },
                        onResetLocalSpace: {
                            globeViewModel.resetLocalSpace()
                        },
                        isLocalSpaceActive: globeViewModel.isLocalSpaceActive,
                        favoritesViewModel: favoritesViewModel
                    )
                    // Key by coordinate so SwiftUI replaces the view instead of
                    // diffing it when the city changes, preventing grow artifacts.
                    .id("\(analysis.coordinate.latitude),\(analysis.coordinate.longitude)")
                    // Kill any inherited spring animation from the panel scope.
                    .transaction { $0.animation = nil }
                    .iPadPanelBackground()
                } else if navigationState.isAnalyzing {
                    VStack {
                        Spacer()
                        ProgressView("Analyzing location...")
                            .foregroundStyle(Color.acMutedForeground)
                        Spacer()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .iPadPanelBackground()
                } else {
                    // Analysis unavailable — show placeholder
                    VStack {
                        Spacer()
                        VStack(spacing: 12) {
                            Image(systemName: "mappin.and.ellipse")
                                .font(.largeTitle)
                                .foregroundStyle(Color.acMutedForeground)
                            Text("Tap a location on the map to view its astrocartography analysis")
                                .font(.subheadline)
                                .foregroundStyle(Color.acMutedForeground)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, DSSpacing.xl)
                        }
                        Spacer()
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .iPadPanelBackground()
                }

            case .scoutResults:
                iPadScoutPanel

            case .duo:
                iPadDuoPanel

            case .favorites:
                iPadFavoritesPanel

            case .lineFilters:
                iPadLineFiltersPanel

            case .aiChat:
                iPadAIChatPanel

            default:
                RightPanelView(content: content, mode: .inline) {
                    // On iPad, fall back to Scout instead of closing panel
                    navigationState.showRightPanel(.scoutResults)
                }
            }
        } else {
            // Fallback: if panel has no content on iPad, default to Scout
            iPadScoutPanel
                .onAppear {
                    navigationState.showRightPanel(.scoutResults)
                }
        }
    }

    // MARK: - iPad Panel Views

    private var iPadScoutPanel: some View {
        NavigationStack {
            ScoutView(
                viewModel: scoutViewModel,
                isSubscribed: isSubscribed,
                onLocationTap: { location in
                    let marker = GlobeMarker(
                        id: "scout-\(location.id.uuidString)",
                        coordinate: GlobeCoordinate(
                            latitude: location.latitude,
                            longitude: location.longitude
                        ),
                        title: location.cityName,
                        subtitle: location.country,
                        type: .scoutResult
                    )
                    globeViewModel.addMarker(marker)
                    globeViewModel.navigateTo(
                        coordinate: GlobeCoordinate(
                            latitude: location.latitude,
                            longitude: location.longitude
                        ),
                        zoom: 5.0
                    )
                },
                onResultsReady: { locations in
                    let markers = locations.map { location in
                        GlobeMarker(
                            id: "scout-\(location.id.uuidString)",
                            coordinate: GlobeCoordinate(
                                latitude: location.latitude,
                                longitude: location.longitude
                            ),
                            title: location.cityName,
                            subtitle: location.country,
                            type: .scoutResult
                        )
                    }
                    globeViewModel.setScoutMarkers(markers)
                },
                onUpgradeTap: {
                    paywallPresentation = .premium
                }
            )
            .navigationTitle("Scout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        scoutViewModel.showPipelineSettings = true
                    } label: {
                        Image(systemName: "slider.horizontal.3")
                            .font(.system(size: 16))
                            .foregroundStyle(DSColors.accentPrimary)
                    }
                    .accessibilityLabel("Scoring Settings")
                }
            }
        }
        .iPadPanelBackground()
    }

    @State private var iPadShowBirthDataForDuo = false
    @State private var iPadShowPipelineFromDuo = false

    private var iPadDuoPanel: some View {
        let birthData = BirthDataStore.shared.currentBirthData
        let userName = birthData?.name ?? "You"
        let userAvatarId = birthData.map { createAvatarIdentifier(for: $0) }

        // Reuse savedChartsForDuo helper
        let savedCharts: [SavedChartInfo] = {
            let currentId = BirthDataStore.shared.currentBirthData?.id
            return BirthDataStore.shared.savedCharts
                .filter { $0.id != currentId }
                .map { chart in
                    SavedChartInfo(
                        id: chart.id.uuidString,
                        name: chart.name,
                        birthDate: chart.date,
                        birthTime: chart.time ?? chart.date,
                        birthLocation: GlobeCoordinate(latitude: chart.latitude, longitude: chart.longitude),
                        cityName: chart.placeName
                    )
                }
        }()

        return NavigationStack {
            DuoModeView(
                viewModel: duoViewModel,
                savedCharts: savedCharts,
                onLocationTap: { location in
                    globeViewModel.navigateTo(
                        coordinate: GlobeCoordinate(
                            latitude: location.coordinate.latitude,
                            longitude: location.coordinate.longitude
                        ),
                        zoom: 5.0
                    )
                },
                onAddUserChart: {
                    iPadShowBirthDataForDuo = true
                },
                onEnableAttempt: { grantAccess in
                    Task { @MainActor in
                        let state = await environment.paymentsClient.currentState()
                        AppLogger.debug("[Duo][iPad] onEnableAttempt fired — hasDuoAccess=\(state.hasDuoAccess) activeEntitlements=\(state.activeEntitlementIDs)", category: AppLogger.payments)
                        if state.hasDuoAccess {
                            AppLogger.debug("[Duo][iPad] Access granted, enabling duo mode", category: AppLogger.payments)
                            grantAccess()
                        } else {
                            AppLogger.debug("[Duo][iPad] No duo access — presenting duoPaywall sheet", category: AppLogger.payments)
                            navigationState.showSheet(.duoPaywall)
                        }
                    }
                }
            )
            .onAppear {
                duoViewModel.userName = userName
                duoViewModel.userAvatarIdentifier = userAvatarId
            }
            .navigationTitle("Duo Mode")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        iPadShowPipelineFromDuo = true
                    } label: {
                        Image(systemName: "slider.horizontal.3")
                            .font(.system(size: 16))
                            .foregroundStyle(DSColors.accentPrimary)
                    }
                    .accessibilityLabel("Scoring Settings")
                }
            }
            .sheet(isPresented: $iPadShowBirthDataForDuo) {
                BirthDataInputView(onSave: { birthData in
                    applyBirthData(birthData)
                    UserDefaults.standard.set(true, forKey: "hasBirthData")
                    iPadShowBirthDataForDuo = false
                })
                .presentationDetents([.large])
            }
            .sheet(isPresented: $iPadShowPipelineFromDuo) {
                ScoutPipelineSettingsView(
                    settings: scoutViewModel.pipelineSettings,
                    onRecompute: {
                        Task {
                            await scoutViewModel.startComputing()
                            await duoViewModel.calculateCompatibility()
                        }
                    }
                )
                .presentationDetents([.large])
            }
        }
        .iPadPanelBackground()
    }

    private var iPadFavoritesPanel: some View {
        NavigationStack {
            if let viewModel = favoritesViewModel {
                FavoritesView(
                    viewModel: viewModel,
                    onNavigateToLocation: { lat, lng, cityName in
                        let coordinate = GlobeCoordinate(latitude: lat, longitude: lng)
                        globeViewModel.navigateTo(coordinate: coordinate, zoom: 5.0)
                        globeViewModel.selectLocation(SelectedLocation(
                            coordinate: coordinate,
                            name: cityName
                        ))
                    }
                )
            } else {
                VStack(spacing: DSSpacing.lg) {
                    Image(systemName: "star.slash")
                        .font(.system(size: 40))
                        .foregroundStyle(DSColors.textSecondary)
                    Text("Favorites not available")
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
        }
        .iPadPanelBackground()
    }

    private var iPadLineFiltersPanel: some View {
        NavigationStack {
            LineFiltersPanelView(viewModel: globeViewModel)
                .navigationTitle("Lines")
                .navigationBarTitleDisplayMode(.inline)
        }
        .iPadPanelBackground()
    }

    @State private var iPadShowConsultBooking = false

    private var iPadAIChatPanel: some View {
        NavigationStack {
            if let chatVM = astroChatViewModel {
                AstroChatView(
                    viewModel: chatVM,
                    isSubscribed: isSubscribed,
                    onRequireSubscription: {
                        navigationState.showSheet(.paywall)
                    },
                    onRequireUpgrade: {
                        navigationState.showSheet(.upgradePaywall)
                    }
                )
                .navigationTitle("Astro AI")
                .navigationBarTitleDisplayMode(.inline)
                .toolbar {
                    ToolbarItem(placement: .topBarLeading) {
                        Button {
                            chatVM.clearConversation()
                        } label: {
                            Image(systemName: "arrow.counterclockwise")
                                .foregroundStyle(Color.acMutedForeground)
                        }
                        .accessibilityLabel("Clear conversation")
                    }
                    ToolbarItem(placement: .topBarTrailing) {
                        Button {
                            iPadShowConsultBooking = true
                        } label: {
                            HStack(spacing: 4) {
                                Image(systemName: "person.fill")
                                    .font(.caption)
                                Text("Consult")
                                    .font(.subheadline)
                                    .fontWeight(.medium)
                            }
                            .foregroundStyle(Color.acAmber500)
                        }
                        .accessibilityLabel("Book consultation with a real astrologer")
                    }
                }
            } else {
                ProgressView("Initializing AI...")
                    .task {
                        await setupAstroChat()
                    }
            }
        }
        .sheet(isPresented: $iPadShowConsultBooking) {
            ConsultationView(onDismiss: { iPadShowConsultBooking = false })
        }
        .iPadPanelBackground()
    }

    // MARK: - Top Bar with Search

    private var topBarWithSearch: some View {
        VStack(spacing: DSSpacing.sm) {
            HStack(spacing: DSSpacing.md) {
                // Search bar
                SearchBarView(
                    query: $navigationState.searchQuery,
                    placeholder: "Search cities..."
                )

                // Profile/Menu button
                Button {
                    navigationState.showSheet(.chartPicker)
                } label: {
                    Image(systemName: "person.badge.plus")
                        .font(.system(size: 18, weight: .medium))
                        .foregroundStyle(Color.acForeground)
                        .frame(width: 44, height: 44)
                        .acLiquidGlass(in: Circle())
                }
                .accessibilityLabel("Open chart picker")
            }

            // Search results overlay
            if showSearchResults && (!citySearchService.completions.isEmpty || citySearchService.isSearching) {
                CitySearchOverlay(
                    completions: citySearchService.completions,
                    isSearching: citySearchService.isSearching,
                    onSelect: { completion in
                        handleCompletionSelected(completion)
                    }
                )
                .transition(.opacity.combined(with: .move(edge: .top)))
            }
        }
        .padding(.horizontal, DSSpacing.md)
        .padding(.top, 8) // Tight top margin below safe area
        .safeAreaPadding(.top) // Respect notch/Dynamic Island
        .contentShape(Rectangle()) // Block touch passthrough to globe
        .animation(SAIMotion.quick, value: showSearchResults)
    }

    // MARK: - Toolbar Section

    private var toolbarSection: some View {
        MainToolbar(
            isDuoModeEnabled: $navigationState.isDuoModeEnabled,
            isNatalChartVisible: $globeViewModel.showNatalChart,
            isScoutComputing: scoutViewModel.isComputing,
            onScoutTap: {
                navigationState.presentContent(.scoutResults, sizeClass: horizontalSizeClass)
            },
            onDuoTap: {
                handleDuoTap()
            },
            onChartTap: {
                navigationState.showSheet(.chartPicker)
            },
            onNatalChartTap: {
                globeViewModel.showNatalChart.toggle()
            },
            onLineFiltersTap: {
                navigationState.presentContent(.lineFilters, sizeClass: horizontalSizeClass)
            },
            onFavoritesTap: {
                navigationState.presentContent(.favorites, sizeClass: horizontalSizeClass)
            },
            onExportTap: {
                navigationState.showSheet(.exportReport)
            },
            onJournalTap: {
                navigationState.showSheet(.journal)
            },
            onConsultTap: {
                navigationState.showSheet(.consultation)
            },
            onSettingsTap: {
                navigationState.showSheet(.settings)
            }
        )
        .padding(.horizontal, DSSpacing.md)
        .padding(.bottom, 8) // Minimal padding, safe area handles home indicator
        .safeAreaPadding(.bottom) // iOS 17+ respects home indicator
    }

    // MARK: - Helpers

    /// Track if we've shown the initial sheet to avoid re-showing on every appear
    @State private var hasShownInitialSheet = false

    /// Track the last birth data ID we've applied to avoid redundant calculations
    @State private var lastAppliedBirthDataId: UUID?

    /// Handle Duo button tap — always show the duo view
    private func handleDuoTap() {
        navigationState.toggleDuoMode()
        if navigationState.isDuoModeEnabled {
            navigationState.presentContent(.duo, sizeClass: horizontalSizeClass)
        }
    }

    private func checkBirthDataSetup() {
        // Apply existing birth data to globe + scout if available (but avoid re-triggering)
        if let birthData = BirthDataStore.shared.currentBirthData {
            // Only apply if it's different from what we've already applied
            // or if we don't have any lines yet
            if lastAppliedBirthDataId != birthData.id || globeViewModel.astroLines.isEmpty {
                lastAppliedBirthDataId = birthData.id
                applyBirthData(birthData)
            }
        }

        // Show appropriate sheet on first launch
        guard !hasShownInitialSheet else { return }
        hasShownInitialSheet = true

        // Small delay to let the map load first
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
            let savedCharts = BirthDataStore.shared.savedCharts
            if savedCharts.isEmpty {
                // No charts - show birth data input
                navigationState.showSheet(.birthData)
            } else if BirthDataStore.shared.currentBirthData == nil {
                // Has charts but none selected - show chart picker
                navigationState.showSheet(.chartPicker)
            }
        }
    }

    /// Handle completion selected from search results (resolves coordinates first)
    private func handleCompletionSelected(_ completion: SearchCompletion) {
        // Clear search UI immediately
        withAnimation(ACSpring.smooth) {
            navigationState.searchQuery = ""
            showSearchResults = false
            isSearchExpanded = false
        }

        // Resolve coordinates async
        Task {
            guard let result = await citySearchService.resolve(completion) else {
                // Show error toast or fallback
                AppLogger.error("Failed to resolve location: \(completion.title)", category: AppLogger.feature)
                return
            }
            handleCitySelected(result)
        }
    }

    /// Handle resolved city result
    private func handleCitySelected(_ result: CitySearchResult) {
        citySearchService.clear()

        Analytics.capture(.globeCityTapped, properties: [
            "city": result.name,
            "country": result.subtitle,
            "latitude": result.coordinate.latitude,
            "longitude": result.coordinate.longitude
        ])

        let coordinate = GlobeCoordinate(
            latitude: result.coordinate.latitude,
            longitude: result.coordinate.longitude
        )

        // Set selected location (triggers SelectedLocationCard in UI)
        let selectedLocation = SelectedLocation(
            id: "search-\(result.id)",
            coordinate: coordinate,
            name: result.name,
            country: result.subtitle,
            timezone: nil
        )
        globeViewModel.selectedLocation = selectedLocation

        // Add marker and zoom globe (use "selected-location" id for cleanup via clearSelection)
        let marker = GlobeMarker(
            id: "selected-location",
            coordinate: coordinate,
            title: result.name,
            subtitle: result.subtitle,
            type: .selectedLocation
        )
        globeViewModel.addMarker(marker)
        globeViewModel.navigateTo(coordinate: coordinate, zoom: 5.0)

        // Always fetch weather for the selected city
        fetchWeather(lat: coordinate.latitude, lng: coordinate.longitude)

        // Auto-analyze on iPad — show results in right panel immediately
        if horizontalSizeClass == .regular {
            analyzeLocation(
                coordinate: coordinate,
                cityName: result.name,
                country: result.subtitle
            )
        }
    }

    /// Analyze a location's astro line influences and show results.
    /// On iPad, shows in the side panel. On iPhone, shows as a sheet.
    private func analyzeLocation(
        coordinate: GlobeCoordinate,
        cityName: String?,
        country: String?
    ) {
        // If lines are still loading, queue the analysis for when they're ready
        if globeViewModel.isLoading || globeViewModel.astroLines.isEmpty {
            pendingAnalysis = (coordinate, cityName, country)
            return
        }
        guard !navigationState.isAnalyzing else { return }

        // Clear previous analysis so loading state shows
        navigationState.currentAnalysis = nil
        navigationState.isAnalyzing = true

        // Fetch weather for the widget
        fetchWeather(lat: coordinate.latitude, lng: coordinate.longitude)

        // Show right panel / sheet immediately with loading state
        navigationState.presentContent(.cityAnalysis, sizeClass: horizontalSizeClass)

        // Only auto-expand iPad panel if user hasn't manually collapsed it
        if horizontalSizeClass == .regular && !iPadPanelManuallyCollapsed {
            withAnimation(.spring(response: 0.3, dampingFraction: 0.85)) {
                iPadPanelCollapsed = false
            }
        }

        Task {
            let analysis = await analysisService.analyze(
                coordinate: coordinate,
                astroLines: globeViewModel.astroLines,
                cityName: cityName,
                country: country
            )
            navigationState.currentAnalysis = analysis
            navigationState.isAnalyzing = false
        }
    }

    /// Activate local space mode for a given location
    private func activateLocalSpace(latitude: Double, longitude: Double) {
        guard let birthData = BirthDataStore.shared.currentBirthData else { return }
        let calculator = LiveAstroLineProvider()

        Task {
            do {
                // Local space uses birth date/time but radiates from the selected city,
                // not the birth location — planetary azimuths are observer-relative.
                let lines = try await calculator.calculateLocalSpaceLines(
                    birthDate: birthData.date,
                    birthTime: birthData.time ?? birthData.date,
                    birthLocation: GlobeCoordinate(
                        latitude: latitude,
                        longitude: longitude
                    ),
                    maxDistanceKm: 250,
                    stepKm: 5
                )
                globeViewModel.activateLocalSpace(
                    lines: lines,
                    center: GlobeCoordinate(latitude: latitude, longitude: longitude),
                    radiusKm: 250
                )
                globeViewModel.navigateTo(
                    coordinate: GlobeCoordinate(latitude: latitude, longitude: longitude),
                    zoom: 8.0
                )
            } catch {
                AppLogger.error("Local space calculation failed: \(error)", category: AppLogger.feature)
            }
        }
    }

    /// Fetch weather and air quality for the weather widget
    private func fetchWeather(lat: Double, lng: Double) {
        isLoadingWeather = true
        Task {
            async let weather = weatherService.fetchWeather(lat: lat, lng: lng)
            async let aqi = weatherService.fetchAirQuality(lat: lat, lng: lng)
            weatherData = await weather
            airQualityData = await aqi
            isLoadingWeather = false
        }
    }

    /// Add a location to favorites from globe context menu
    private func addLocationToFavorites(
        coordinate: GlobeCoordinate,
        cityName: String?,
        country: String?
    ) {
        guard let vm = favoritesViewModel else { return }

        Analytics.capture(.locationAddedToFavorites, properties: [
            "city": cityName ?? "unknown",
            "country": country ?? "unknown",
            "latitude": coordinate.latitude,
            "longitude": coordinate.longitude
        ])

        Task {
            _ = await vm.addFavorite(
                latitude: coordinate.latitude,
                longitude: coordinate.longitude,
                cityName: cityName ?? "Unknown Location",
                country: country
            )
        }
    }

    /// Shared helper: update globe lines AND configure scout with AstroCore results.
    /// Uses a single AstroCore calculation for both globe and scout to avoid redundant work.
    private func applyBirthData(_ birthData: FeatureBirthData.BirthData) {
        // Track which birth data we're applying to avoid redundant calculations
        lastAppliedBirthDataId = birthData.id

        // Cancel any previous birth data task
        birthDataTask?.cancel()

        let date = birthData.date
        let time = birthData.time ?? birthData.date
        let location = GlobeCoordinate(
            latitude: birthData.latitude,
            longitude: birthData.longitude
        )

        // Pan globe to birth location
        withAnimation(ACSpring.smooth) {
            globeViewModel.navigateTo(coordinate: location, zoom: 3.0)
        }

        // Create avatar identifier from birth data (matches ChartAvatarView pattern)
        let avatarIdentifier = createAvatarIdentifier(for: birthData)

        // Create cache key for scout results
        let scoutCacheKey = createScoutCacheKey(for: birthData)

        // Check if scout results are cached
        let hasCached = scoutViewModel.hasCachedResults(for: scoutCacheKey)
        if hasCached {
            // Load from cache - no scouting needed
            _ = scoutViewModel.loadCachedResults(for: scoutCacheKey)
        }

        // Capture MainActor properties before going to background
        let houseSystem = globeViewModel.natalHouseSystem
        let useSidereal = globeViewModel.natalUseSidereal

        birthDataTask = Task {
            await performBirthDataCalculation(
                date: date,
                time: time,
                location: location,
                latitude: birthData.latitude,
                longitude: birthData.longitude,
                avatarIdentifier: avatarIdentifier,
                houseSystem: houseSystem,
                useSidereal: useSidereal,
                scoutCacheKey: scoutCacheKey,
                skipScoutCompute: hasCached
            )
        }
    }

    /// Creates a unique cache key for scout results based on birth data
    private func createScoutCacheKey(for birthData: FeatureBirthData.BirthData) -> String {
        let calendar = Calendar(identifier: .gregorian)
        let dc = calendar.dateComponents([.year, .month, .day], from: birthData.date)
        let tc = calendar.dateComponents([.hour, .minute], from: birthData.time ?? birthData.date)
        return "scout-\(dc.year ?? 0)-\(dc.month ?? 0)-\(dc.day ?? 0)-\(tc.hour ?? 0)-\(tc.minute ?? 0)-\(Int(birthData.latitude * 1000))-\(Int(birthData.longitude * 1000))"
    }

    /// Creates a unique avatar identifier from birth data (matches ChartAvatarView pattern)
    private func createAvatarIdentifier(for birthData: FeatureBirthData.BirthData) -> String {
        let dateString = birthData.date.formatted(.iso8601)
        let locationString = "\(birthData.latitude),\(birthData.longitude)"
        return "\(birthData.name)-\(dateString)-\(locationString)"
    }

    /// Performs the actual birth data calculation and updates view models.
    private func performBirthDataCalculation(
        date: Date,
        time: Date,
        location: GlobeCoordinate,
        latitude: Double,
        longitude: Double,
        avatarIdentifier: String,
        houseSystem: String,
        useSidereal: Bool,
        scoutCacheKey: String,
        skipScoutCompute: Bool
    ) async {
        // 1. Update globe (triggers line calculation via LiveAstroLineProvider)
        await globeViewModel.setBirthData(date: date, time: time, location: location, avatarIdentifier: avatarIdentifier)

        guard !Task.isCancelled else { return }

        // 2. Run AstroCore line calculation on background thread for scout
        let astroBirthData = buildAstroBirthData(date: date, time: time, latitude: latitude, longitude: longitude)

        do {
            let lineResult: AstroResult = try await Task.detached(priority: .userInitiated) {
                let calc = AstroCore()
                return try calc.calculateLines(birthData: astroBirthData)
            }.value

            guard !Task.isCancelled else { return }

            let scoutPlanetaryLines = AstroScoutAdapter.convertPlanetaryLines(lineResult.planetaryLines)
            let scoutAspectLines = AstroScoutAdapter.convertAspectLines(lineResult.aspectLines)
            let paranLinesJson = AstroScoutAdapter.serializeParanLines(lineResult.paranLines)
            let zenithJson = AstroScoutAdapter.serializeZenithPoints(lineResult.zenithPoints)
            let cities = try await CityDataLoader.loadCities()

            guard !Task.isCancelled else { return }

            // Configure scout with cache key
            scoutViewModel.configure(
                cities: cities,
                planetaryLines: scoutPlanetaryLines,
                aspectLines: scoutAspectLines,
                paranLinesJson: paranLinesJson,
                zenithJson: zenithJson,
                cacheKey: scoutCacheKey
            )

            // 3. Proactively compute scout rankings if not cached
            if !skipScoutCompute {
                await scoutViewModel.startComputing()
            }
        } catch {
            guard !Task.isCancelled else { return }
            AppLogger.error("Failed to configure scout: \(error)", category: AppLogger.feature)
            Haptics.error()
        }

        // 3. Natal chart calculation (separate — may not be available in FFI yet)
        do {
            let capturedHouseSystem = houseSystem
            let capturedUseSidereal = useSidereal

            let natalResult: NatalChartResult = try await Task.detached(priority: .userInitiated) {
                let calc = AstroCore()
                return try calc.calculateNatalChart(
                    birthData: astroBirthData,
                    houseSystem: capturedHouseSystem,
                    useSidereal: capturedUseSidereal
                )
            }.value

            guard !Task.isCancelled else { return }

            let natalChartData = buildNatalChartData(from: natalResult)
            globeViewModel.setNatalChartData(natalChartData)

            // Build natal chart JSON for Scout pipeline modules
            scoutViewModel.natalChartJson = buildNatalChartJson(from: natalResult)
        } catch {
            guard !Task.isCancelled else { return }
            AppLogger.info("Natal chart not available: \(error.localizedDescription)", category: AppLogger.feature)
        }
    }

    /// Builds AstroCore.BirthData from date components.
    private func buildAstroBirthData(date: Date, time: Date, latitude: Double, longitude: Double) -> AstroBirthData {
        let calendar = Calendar(identifier: .gregorian)
        let dc = calendar.dateComponents([.year, .month, .day], from: date)
        let tc = calendar.dateComponents([.hour, .minute, .second], from: time)
        return AstroBirthData(
            year: Int32(dc.year ?? 2000),
            month: UInt32(dc.month ?? 1),
            day: UInt32(dc.day ?? 1),
            hour: UInt32(tc.hour ?? 12),
            minute: UInt32(tc.minute ?? 0),
            second: UInt32(tc.second ?? 0),
            latitude: latitude,
            longitude: longitude
        )
    }

    /// Builds natal chart JSON for Scout pipeline modules (Rust NatalChartData format).
    /// NatalChartResult's CodingKeys already use snake_case matching Rust's struct.
    private func buildNatalChartJson(from result: NatalChartResult) -> String {
        guard let jsonData = try? JSONEncoder().encode(result) else { return "{}" }
        return String(data: jsonData, encoding: .utf8) ?? "{}"
    }

    /// Converts AstroCore natal result to FeatureGlobe NatalChartData.
    private func buildNatalChartData(from result: NatalChartResult) -> NatalChartData {
        NatalChartData(
            ascendant: result.ascendant,
            midheaven: result.midheaven,
            descendant: result.descendant,
            imumCoeli: result.imumCoeli,
            houseCusps: result.houseCusps,
            houseSystem: result.houseSystem,
            planets: result.planets.map { p in
                NatalChartPlanet(
                    planet: p.planet,
                    longitude: p.longitude,
                    signName: p.signName,
                    degreeInSign: p.degreeInSign,
                    retrograde: p.retrograde,
                    house: p.house
                )
            },
            zodiacType: result.zodiacType
        )
    }

    // MARK: - AI Chat Setup (iPad panel)

    nonisolated(unsafe) private static var isInitializingChat = false

    private static let chatDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        return f
    }()

    private static let chatTimeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .none
        f.timeStyle = .short
        return f
    }()

    private func setupAstroChat() async {
        guard astroChatViewModel == nil, !Self.isInitializingChat else { return }
        Self.isInitializingChat = true
        defer { Self.isInitializingChat = false }

        let keychainStore = environment.compositionRoot.keychainStore
        let vm = AstroChatViewModel(
            baseUrl: AppConfiguration.PROXY_BASE_URL,
            authTokenProvider: {
                do {
                    return try keychainStore.getString("auth_access_token")
                } catch {
                    AppLogger.error("Failed to read auth token from keychain: \(error)", category: AppLogger.auth)
                    return nil
                }
            },
            refreshTokenProvider: {
                try? keychainStore.getString("auth_refresh_token")
            }
        )

        await vm.initialize()

        vm.onHighlightLine = { [weak globeViewModel] (planet: String, lineType: String) in
            guard let globe = globeViewModel else { return }
            if let p = Planet(rawValue: planet) {
                globe.showOnlyPlanets([p])
            }
        }

        vm.onZoomToLocation = { [weak globeViewModel] (lat: Double, lng: Double, zoom: Double) in
            globeViewModel?.navigateTo(
                coordinate: GlobeCoordinate(latitude: lat, longitude: lng),
                zoom: zoom
            )
        }

        vm.onAnalyzeLocation = { (lat: Double, lng: Double, name: String?) in
            let coord = GlobeCoordinate(latitude: lat, longitude: lng)
            self.analyzeLocation(coordinate: coord, cityName: name, country: nil)
        }

        vm.onTogglePlanetVisibility = { [weak globeViewModel] (planet: String) in
            if let p = Planet(rawValue: planet) {
                globeViewModel?.togglePlanet(p)
            }
        }

        if let birthData = BirthDataStore.shared.currentBirthData {
            let dateStr = Self.chatDateFormatter.string(from: birthData.date)
            let timeStr = birthData.time.map { Self.chatTimeFormatter.string(from: $0) } ?? "Unknown"
            vm.updateBirthData(
                date: dateStr,
                time: timeStr,
                location: birthData.placeName,
                latitude: birthData.latitude,
                longitude: birthData.longitude
            )
        }

        astroChatViewModel = vm

        // Push any already-computed scout results into the chat context
        if scoutViewModel.hasResults {
            updateScoutContextToChat()
        }
    }

    /// Build and push scout results + pipeline settings into the AI chat context.
    private func updateScoutContextToChat() {
        guard let chatVM = astroChatViewModel else { return }
        chatVM.updateScoutContext(buildScoutContextData(from: scoutViewModel))
    }

    /// Serialize scout results and pipeline settings into a JSON-serializable dictionary.
    private func buildScoutContextData(from scout: ScoutViewModel) -> [String: Any] {
        var data: [String: Any] = [
            "selectedCategory": scout.selectedCategory.rawValue,
        ]

        // Pipeline settings
        let p = scout.pipelineSettings
        data["pipeline"] = [
            "preset": p.currentPreset.rawValue,
            "essentialDignity": p.essentialDignity,
            "houseRulership": p.houseRulership,
            "eastWestAsymmetry": p.eastWestAsymmetry,
            "retrogradeModifier": p.retrogradeModifier,
            "natalAspects": p.natalAspects,
            "paranSynergy": p.paranSynergy,
            "vedicMode": p.vedicMode,
            "aspectLinesEnabled": p.aspectLinesEnabled,
            "adventureFactor": p.adventureFactor,
            "materialFactor": p.materialFactor,
            "planetSystem": p.planetSystem.rawValue,
            "excludedPlanets": Array(p.excludedPlanets).sorted(),
        ] as [String: Any]

        // Results per category: more detail for selected category, summary for others
        var categoryData: [String: [String: Any]] = [:]
        for (category, result) in scout.categoryResults {
            let isSelected = category == scout.selectedCategory
            let benefitLimit = isSelected ? 50 : 10
            let challengeLimit = isSelected ? 30 : 5

            let beneficial = result.locations(with: .beneficial)
                .prefix(benefitLimit)
                .map { formatScoutLocation($0) }

            let challenging = result.locations(with: .challenging)
                .prefix(challengeLimit)
                .map { formatScoutLocation($0) }

            categoryData[category.rawValue] = [
                "topBeneficial": Array(beneficial),
                "topChallenging": Array(challenging),
            ]
        }
        data["categories"] = categoryData

        return data
    }

    /// Compact location dict for AI context (city, country, score, top influences).
    private func formatScoutLocation(_ loc: ScoutLocation) -> [String: Any] {
        let influences = loc.influences.prefix(3)
            .map { "\($0.planet) \($0.angle) (\(Int($0.distanceKm))km)" }
            .joined(separator: ", ")
        return [
            "city": loc.cityName,
            "country": loc.country,
            "score": (loc.benefitScore * 10).rounded() / 10,
            "influences": influences,
        ] as [String: Any]
    }
}

// MARK: - iPad Panel Background

private extension View {
    func iPadPanelBackground() -> some View {
        self.background(Color.clear)
    }
}

// MARK: - Line Filters Panel View (iPad right panel)

@available(iOS 17.0, *)
struct LineFiltersPanelView: View {
    @Bindable var viewModel: GlobeViewModel

    /// Use FeatureGlobe's AstroLineType to avoid ambiguity with AstroCore
    private typealias GlobeLineType = FeatureGlobe.AstroLineType

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: DSSpacing.xl) {
                // Line types section
                VStack(alignment: .leading, spacing: DSSpacing.md) {
                    Text("Line Types")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color.acMutedForeground)

                    LazyVGrid(columns: [
                        GridItem(.flexible()),
                        GridItem(.flexible())
                    ], spacing: DSSpacing.sm) {
                        ForEach(GlobeLineType.allCases, id: \.self) { lineType in
                            lineTypeChip(lineType)
                        }
                    }
                }

                // Planets section — adaptive grid: 1 column when narrow, 2+ when wide
                VStack(alignment: .leading, spacing: DSSpacing.md) {
                    Text("Planets")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color.acMutedForeground)

                    LazyVGrid(columns: [GridItem(.adaptive(minimum: 180), spacing: DSSpacing.sm)], spacing: DSSpacing.sm) {
                        ForEach(Planet.allCases, id: \.self) { planet in
                            planetFilterCell(planet)
                        }
                    }
                }

                // Advanced section
                Divider()

                VStack(alignment: .leading, spacing: DSSpacing.md) {
                    Text("Advanced")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(Color.acMutedForeground)

                    advancedToggleRow(
                        title: "Harmonious Aspects",
                        icon: "arrow.triangle.branch",
                        isOn: viewModel.lineVisibility.showHarmoniousAspects,
                        action: { viewModel.toggleHarmoniousAspects() }
                    )

                    advancedToggleRow(
                        title: "Disharmonious Aspects",
                        icon: "arrow.triangle.swap",
                        isOn: viewModel.lineVisibility.showDisharmoniousAspects,
                        action: { viewModel.toggleDisharmoniousAspects() }
                    )

                    advancedToggleRow(
                        title: "Parans",
                        icon: "circle.dotted",
                        isOn: viewModel.lineVisibility.showParans,
                        action: { viewModel.toggleParans() }
                    )

                    advancedToggleRow(
                        title: "Zeniths",
                        icon: "sun.max.trianglebadge.exclamationmark",
                        isOn: viewModel.lineVisibility.showZeniths,
                        action: { viewModel.toggleZeniths() }
                    )

                    advancedToggleRow(
                        title: "Line Labels",
                        icon: "tag.fill",
                        isOn: viewModel.lineVisibility.showLineLabels,
                        action: { viewModel.toggleLineLabels() }
                    )

                    advancedToggleRow(
                        title: "Nakshatra Bands",
                        icon: "moon.stars",
                        isOn: viewModel.lineVisibility.showNakshatraBands,
                        action: { viewModel.toggleNakshatraBands() }
                    )

                    advancedToggleRow(
                        title: "Transit Lines",
                        icon: "clock.arrow.2.circlepath",
                        isOn: viewModel.isTransitMode,
                        action: { viewModel.toggleTransitMode() }
                    )
                }

                // Show all / Hide all buttons
                HStack(spacing: DSSpacing.sm) {
                    Button {
                        viewModel.showAllLineTypes()
                    } label: {
                        Text("Show All")
                            .font(.system(size: 15, weight: .semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .foregroundStyle(Color.acForeground)
                            .background(Color.acSecondary)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(Color.acCardBorder, lineWidth: 1)
                            )
                    }

                    Button {
                        viewModel.hideAllLines()
                    } label: {
                        Text("Hide All")
                            .font(.system(size: 15, weight: .semibold))
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 12)
                            .foregroundStyle(Color.acForeground)
                            .background(Color.acSecondary)
                            .clipShape(RoundedRectangle(cornerRadius: 10))
                            .overlay(
                                RoundedRectangle(cornerRadius: 10)
                                    .stroke(Color.acCardBorder, lineWidth: 1)
                            )
                    }
                }
            }
            .padding(DSSpacing.lg)
        }
    }

    @Environment(\.colorScheme) private var filterColorScheme

    private func planetColor(_ planet: Planet) -> Color {
        switch planet {
        case .sun: return Color.acPlanetSun
        // Moon pearl white is invisible on light backgrounds — use slate gray in light mode
        case .moon: return filterColorScheme == .dark ? Color.acPlanetMoon : Color(hex: "#8E99A4")
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

    private func planetFilterCell(_ planet: Planet) -> some View {
        let isVisible = viewModel.lineVisibility.visiblePlanets.contains(planet)
        let color = planetColor(planet)

        return Button {
            viewModel.togglePlanet(planet)
        } label: {
            HStack(spacing: 10) {
                Text(planet.symbol)
                    .font(.title2)
                    .foregroundStyle(color)

                Text(planet.rawValue)
                    .font(.subheadline)
                    .fontWeight(.medium)
                    .foregroundStyle(isVisible ? color : Color.acMutedForeground)

                Spacer()

                Circle()
                    .fill(isVisible ? color : Color.acMutedForeground.opacity(0.3))
                    .frame(width: 10, height: 10)
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 10)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(isVisible ? color.opacity(0.12) : Color.acSecondary)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isVisible ? color.opacity(0.4) : Color.acCardBorder, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }

    private func advancedToggleRow(
        title: String,
        icon: String,
        isOn: Bool,
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

    private func lineTypeChip(_ lineType: GlobeLineType) -> some View {
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
            .foregroundStyle(isVisible ? Color.blue : Color.acMutedForeground)
            .background(
                RoundedRectangle(cornerRadius: 10)
                    .fill(isVisible ? Color.blue.opacity(0.15) : Color.acSecondary)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 10)
                    .stroke(isVisible ? Color.blue.opacity(0.4) : Color.acCardBorder, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

// MARK: - Search Bar View

@available(iOS 17.0, *)
struct SearchBarView: View {
    @Binding var query: String
    let placeholder: String

    @State private var isFocused = false

    var body: some View {
        HStack(spacing: DSSpacing.sm) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 16))
                .foregroundStyle(Color.acMutedForeground)
                .accessibilityHidden(true)

            TextField(placeholder, text: $query)
                .font(.system(size: 15))
                .foregroundStyle(Color.acForeground)
                .autocorrectionDisabled()

            if !query.isEmpty {
                Button {
                    query = ""
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .font(.system(size: 16))
                        .foregroundStyle(Color.acMutedForeground)
                }
                .accessibilityLabel("Clear search")
            }
        }
        .padding(.horizontal, DSSpacing.lg)
        .padding(.vertical, DSSpacing.md)
        .acLiquidGlassCapsule()
        .shadow(color: .black.opacity(0.2), radius: 8, y: 2)
        .contentShape(Capsule()) // Block touch passthrough
    }
}

// MARK: - Location Detail Sheet (kept — uses cityId lookup)

@available(iOS 17.0, *)
struct LocationDetailSheet: View {
    let cityId: String
    let onDismiss: () -> Void

    var body: some View {
        NavigationStack {
            ScrollView {
                LocationInfoContent(cityId: cityId)
                    .padding(DSSpacing.xl)
            }
            .background(Color.acBackground)
            .navigationTitle("Location Details")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        onDismiss()
                    }
                }
            }
        }
    }
}

// MARK: - Button Styles

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 16, weight: .semibold))
            .foregroundStyle(Color.acBackground)
            .frame(maxWidth: .infinity)
            .padding(.vertical, DSSpacing.lg)
            .background(
                Capsule()
                    .fill(LinearGradient.acAmberGradient)
            )
            .scaleEffect(configuration.isPressed ? 0.97 : 1.0)
            .animation(SAIMotion.quick, value: configuration.isPressed)
    }
}

// MARK: - Preview

#if DEBUG
@available(iOS 17.0, *)
#Preview("Main App View") {
    Text("MainAppView requires a live AppEnvironment.\nRun the app to see it.")
        .multilineTextAlignment(.center)
        .foregroundStyle(.secondary)
        .preferredColorScheme(.dark)
}
#endif
