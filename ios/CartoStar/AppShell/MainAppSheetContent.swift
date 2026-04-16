import SwiftUI
import DesignSystem
import Core
import FeatureSettings
import Payments
import FeatureGlobe
import FeatureBirthData
import FeatureScout
import FeatureJournaling

// MARK: - Sheet Content Builder

/// Extracted from MainAppView — builds the content for each sheet presentation.
/// Keeps MainAppView focused on layout and coordination.
@available(iOS 17.0, *)
struct MainAppSheetContent: View {
    let sheet: AppNavigationState.Sheet
    let environment: AppEnvironment
    @Binding var navigationState: AppNavigationState
    @Binding var globeViewModel: GlobeViewModel
    @Binding var scoutViewModel: ScoutViewModel
    @Binding var duoViewModel: DuoViewModel
    @Binding var currentAnalysis: LocationAnalysis?
    @Binding var astroChatViewModel: AstroChatViewModel?
    var favoritesViewModel: FavoritesViewModel?
    var isSubscribed: Bool = true
    var onShowPaywall: (() -> Void)?
    let onApplyBirthData: (BirthData) -> Void
    let onAnalyzeLocation: (GlobeCoordinate, String?, String?) -> Void
    var onActivateLocalSpace: (Double, Double) -> Void = { _, _ in }

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    var body: some View {
        switch sheet {
        case .birthData:
            BirthDataInputView(onSave: { birthData in
                onApplyBirthData(birthData)
                UserDefaults.standard.set(true, forKey: "hasBirthData")
            })
            .presentationDetents([.large])
            .presentationDragIndicator(.visible)

        case .chartPicker:
            chartPickerSheet

        case .locationDetail(let cityId):
            LocationDetailSheet(cityId: cityId) {
                navigationState.dismissSheet()
            }

        case .cityAnalysis:
            cityAnalysisSheet

        case .scout:
            scoutSheet

        case .duo:
            duoSheet

        case .duoPaywall:
            // "afterduotapped" Adapty no-code placement paywall for duo access
            AdaptyNoCodePaywallView(
                placementID: "afterduotapped",
                onPurchaseComplete: {
                    navigationState.dismissSheet()
                    // After purchase, enable duo mode and show duo view
                    duoViewModel.isEnabled = true
                    // On iPad the duo content lives in the right panel (already visible);
                    // only re-present as a sheet on iPhone where the panel isn't used.
                    if navigationState.sidePanel != .right(content: .duo) {
                        navigationState.showSheet(.duo)
                    }
                },
                onDismiss: {
                    // Return to duo view without enabling.
                    // NOTE: Don't use horizontalSizeClass here — sheets present with
                    // .compact on iPad, so the value is unreliable inside this callback.
                    navigationState.dismissSheet()
                    if navigationState.sidePanel != .right(content: .duo) {
                        navigationState.showSheet(.duo)
                    }
                }
            )
            .presentationDetents([.large])

        case .consultation:
            consultationSheet

        case .exportReport:
            exportReportSheet

        case .favorites:
            favoritesSheet

        case .paywall:
            // Free → Pro upgrade (triggered when free 5-question limit is hit)
            AdaptyNoCodePaywallView(
                placementID: "afteraiquestion",
                onPurchaseComplete: {
                    navigationState.dismissSheet()
                },
                onDismiss: {
                    navigationState.dismissSheet()
                }
            )
            .presentationDetents([.large])
            .preferredColorScheme(.dark)

        case .upgradePaywall:
            // Pro → Duo/Lifetime upgrade (triggered when 50-question pro limit is hit)
            AdaptyNoCodePaywallView(
                placementID: "after50questions",
                onPurchaseComplete: {
                    navigationState.dismissSheet()
                },
                onDismiss: {
                    navigationState.dismissSheet()
                }
            )
            .presentationDetents([.large])
            .preferredColorScheme(.dark)

        case .settings:
            settingsSheet

        case .journal:
            JournalListView(viewModel: environment.makeJournalViewModel())
                .presentationDetents([.large])
                .presentationDragIndicator(.visible)
        }
    }

    // MARK: - Settings

    @State private var showConsultFromSettings = false
    @State private var showPipelineFromSettings = false

    private var settingsSheet: some View {
        SettingsView(
            viewModel: SettingsViewModel(
                settingsRepository: environment.compositionRoot.settingsRepository,
                authClient: environment.compositionRoot.sessionManager,
                paymentsClient: environment.paymentsClient
            ),
            onConsult: {
                showConsultFromSettings = true
            },
            onShowScoutPipeline: {
                showPipelineFromSettings = true
            },
            onShowProPaywall: {
                onShowPaywall?()
            },
            onSignIn: {
                // Sign out anonymous → LaunchRouter redirects to sign-in
                Task {
                    try? await environment.authClient.signOut()
                }
            }
        )
        .presentationDetents([.large])
        .sheet(isPresented: $showConsultFromSettings) {
            ConsultationView(onDismiss: { showConsultFromSettings = false })
        }
        .sheet(isPresented: $showPipelineFromSettings) {
            ScoutPipelineSettingsView(
                settings: scoutViewModel.pipelineSettings,
                onRecompute: {
                    Task {
                        await scoutViewModel.startComputing()
                    }
                }
            )
            .presentationDetents([.large])
        }
    }

    // MARK: - Chart Picker

    private var chartPickerSheet: some View {
        NavigationStack {
            SavedChartsListView(
                store: .shared,
                onSelectChart: { birthData in
                    onApplyBirthData(birthData)
                    navigationState.dismissSheet()
                }
            )
            .acFadeIn(delay: 0.15)
            .navigationTitle("Charts")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        navigationState.dismissSheet()
                    }
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - City Analysis

    @ViewBuilder
    private var cityAnalysisSheet: some View {
        if let analysis = currentAnalysis {
            CityAnalysisView(
                analysis: analysis,
                onDismiss: {
                    navigationState.dismissSheet()
                },
                onLineHighlight: { line in
                    if let line = line {
                        globeViewModel.showOnlyPlanets([line.planet])
                    } else {
                        globeViewModel.showAllLineTypes()
                    }
                },
                onLocalSpace: { lat, lng in
                    navigationState.dismissSheet()
                    onActivateLocalSpace(lat, lng)
                },
                onResetLocalSpace: {
                    globeViewModel.resetLocalSpace()
                },
                isLocalSpaceActive: globeViewModel.isLocalSpaceActive,
                favoritesViewModel: favoritesViewModel
            )
            .acFadeIn(delay: 0.15)
        }
    }

    // MARK: - Scout

    /// Local paywall state for the scout sheet.
    /// Using item-based presentation avoids the SwiftUI double-sheet bug (two .sheet(isPresented:)
    /// on the same view means only the last one is honoured).
    private enum ScoutPaywall: String, Identifiable {
        case premium, cancelled
        var id: String { rawValue }
    }
    @State private var scoutPaywall: ScoutPaywall? = nil

    private var scoutSheet: some View {
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
                    navigationState.dismissSheet()
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
                    scoutPaywall = .premium
                }
            )
            .acFadeIn(delay: 0.15)
            .navigationTitle("Scout")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        scoutViewModel.showPipelineSettings = true
                    } label: {
                        Image(systemName: "gearshape.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(DSColors.accentPrimary)
                    }
                    .accessibilityLabel("Scoring Settings")

                    Button("Done") {
                        navigationState.dismissSheet()
                    }
                    .fontWeight(.semibold)
                }
            }
            .sheet(item: $scoutPaywall) { paywall in
                switch paywall {
                case .premium:
                    AdaptyNoCodePaywallView(
                        placementID: "afterauth",
                        onPurchaseComplete: {
                            scoutPaywall = nil
                        },
                        onDismiss: {
                            scoutPaywall = nil
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.4) {
                                scoutPaywall = .cancelled
                            }
                        }
                    )
                    .background(Color.black.ignoresSafeArea())
                    .preferredColorScheme(.dark)
                case .cancelled:
                    AdaptyNoCodePaywallView(
                        placementID: "propaywallgotcancelled",
                        onPurchaseComplete: {
                            scoutPaywall = nil
                        },
                        onDismiss: {
                            scoutPaywall = nil
                        }
                    )
                    .background(Color.black.ignoresSafeArea())
                    .preferredColorScheme(.dark)
                }
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - Duo Mode

    /// Convert saved birth data to SavedChartInfo for duo mode
    private var savedChartsForDuo: [SavedChartInfo] {
        // Filter out current user's chart (they can't be their own partner)
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
    }

    /// Generate avatar identifier for birth data (matches ChartAvatarView pattern)
    private func userAvatarIdentifier(for birthData: BirthData) -> String {
        let dateString = birthData.date.formatted(.iso8601)
        let locationString = "\(birthData.latitude),\(birthData.longitude)"
        return "\(birthData.name)-\(dateString)-\(locationString)"
    }

    @State private var showBirthDataForDuo = false
    @State private var showPipelineFromDuo = false

    private var duoSheet: some View {
        let birthData = BirthDataStore.shared.currentBirthData
        let userName = birthData?.name ?? "You"
        let userAvatarId = birthData.map { userAvatarIdentifier(for: $0) }

        return NavigationStack {
            DuoModeView(
                viewModel: duoViewModel,
                savedCharts: savedChartsForDuo,
                onLocationTap: { location in
                    globeViewModel.navigateTo(
                        coordinate: GlobeCoordinate(
                            latitude: location.coordinate.latitude,
                            longitude: location.coordinate.longitude
                        ),
                        zoom: 5.0
                    )
                    navigationState.dismissSheet()
                },
                onAddUserChart: {
                    showBirthDataForDuo = true
                },
                onEnableAttempt: { grantAccess in
                    Task { @MainActor in
                        let state = await environment.paymentsClient.currentState()
                        AppLogger.debug("[Duo] onEnableAttempt fired — hasDuoAccess=\(state.hasDuoAccess) activeEntitlements=\(state.activeEntitlementIDs)", category: AppLogger.payments)
                        if state.hasDuoAccess {
                            AppLogger.debug("[Duo] Access granted, enabling duo mode", category: AppLogger.payments)
                            grantAccess()
                        } else {
                            AppLogger.debug("[Duo] No duo access — dismissing duo sheet, will show paywall", category: AppLogger.payments)
                            navigationState.dismissSheet()
                            try? await Task.sleep(for: .milliseconds(500))
                            AppLogger.debug("[Duo] Presenting duoPaywall sheet", category: AppLogger.payments)
                            navigationState.showSheet(.duoPaywall)
                        }
                    }
                }
            )
            .onAppear {
                // Update user name and avatar identifier from birth data
                duoViewModel.userName = userName
                duoViewModel.userAvatarIdentifier = userAvatarId
            }
            .navigationTitle("Duo Mode")
            .navigationBarTitleDisplayMode(.inline)
            .toolbarBackground(.visible, for: .navigationBar)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    Button {
                        showPipelineFromDuo = true
                    } label: {
                        Image(systemName: "gearshape.fill")
                            .font(.system(size: 16))
                            .foregroundStyle(DSColors.accentPrimary)
                    }
                    .accessibilityLabel("Scoring Settings")

                    Button("Done") {
                        navigationState.dismissSheet()
                    }
                }
            }
            .sheet(isPresented: $showBirthDataForDuo) {
                BirthDataInputView(onSave: { birthData in
                    onApplyBirthData(birthData)
                    UserDefaults.standard.set(true, forKey: "hasBirthData")
                    showBirthDataForDuo = false
                })
                .presentationDetents([.large])
            }
            .sheet(isPresented: $showPipelineFromDuo) {
                ScoutPipelineSettingsView(
                    settings: scoutViewModel.pipelineSettings,
                    onRecompute: {
                        Task {
                            // Recompute both Scout and Duo with updated settings
                            await scoutViewModel.startComputing()
                            await duoViewModel.calculateCompatibility()
                        }
                    }
                )
                .presentationDetents([.large])
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - Consultation (AI Chat)

    @State private var showConsultBooking = false

    private var consultationSheet: some View {
        NavigationStack {
            if let chatVM = astroChatViewModel {
                AstroChatView(
                    viewModel: chatVM,
                    isSubscribed: isSubscribed,
                    onRequireSubscription: {
                        Task { @MainActor in
                            navigationState.dismissSheet()
                            try? await Task.sleep(for: .milliseconds(500))
                            navigationState.showSheet(.paywall)
                        }
                    },
                    onRequireUpgrade: {
                        Task { @MainActor in
                            navigationState.dismissSheet()
                            try? await Task.sleep(for: .milliseconds(500))
                            navigationState.showSheet(.upgradePaywall)
                        }
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
                        HStack(spacing: 12) {
                            // Book a real consultation button
                            Button {
                                showConsultBooking = true
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

                            Button("Done") {
                                navigationState.dismissSheet()
                            }
                        }
                    }
                }
            } else {
                ProgressView("Initializing AI...")
                    .task {
                        await setupAstroChat()
                    }
            }
        }
        .presentationDetents([.medium, .large])
        .acFadeIn(delay: 0.15)
        .onDisappear {
            astroChatViewModel?.cleanup()
        }
        .sheet(isPresented: $showConsultBooking) {
            ConsultationView(onDismiss: { showConsultBooking = false })
        }
    }

    // MARK: - Favorites

    private var favoritesSheet: some View {
        Group {
            if let viewModel = favoritesViewModel {
                FavoritesView(
                    viewModel: viewModel,
                    onNavigateToLocation: { lat, lng, cityName in
                        // Dismiss sheet first so the globe is visible for the camera animation
                        navigationState.dismissSheet()
                        let coordinate = GlobeCoordinate(latitude: lat, longitude: lng)
                        Task { @MainActor in
                            // Wait for sheet dismiss animation to start
                            try? await Task.sleep(nanoseconds: 350_000_000)
                            globeViewModel.navigateTo(coordinate: coordinate, zoom: 5.0)
                            globeViewModel.selectLocation(SelectedLocation(
                                coordinate: coordinate,
                                name: cityName
                            ))
                        }
                    }
                )
            } else {
                // Fallback if favoritesViewModel not provided
                VStack(spacing: DSSpacing.lg) {
                    Image(systemName: "star.slash")
                        .font(.system(size: 40))
                        .foregroundStyle(DSColors.textSecondary)
                    Text("Favorites not available")
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textSecondary)
                    Text("Please sign in to save favorites.")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .background(DSColors.background)
            }
        }
        .presentationDetents([.medium, .large])
    }

    // MARK: - Export Report

    // MARK: - Cached Formatters

    private static let mediumDateFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .medium
        return f
    }()

    private static let shortTimeFormatter: DateFormatter = {
        let f = DateFormatter()
        f.dateStyle = .none
        f.timeStyle = .short
        return f
    }()

    @ViewBuilder
    private var exportReportSheet: some View {
        let birthData = BirthDataStore.shared.currentBirthData

        let dateStr = Self.mediumDateFormatter.string(from: birthData?.date ?? Date())
        let timeStr = Self.shortTimeFormatter.string(from: birthData?.time ?? birthData?.date ?? Date())

        ExportReportView(
            astroLines: globeViewModel.astroLines,
            birthDate: dateStr,
            birthTime: timeStr,
            birthLocation: birthData?.placeName ?? "Unknown",
            onDismiss: {
                navigationState.dismissSheet()
            }
        )
        .presentationDetents([.large])
    }

    // MARK: - AI Chat Setup

    /// Track whether initialization is in flight to prevent double-init on rapid open/close
    nonisolated(unsafe) private static var isInitializingChat = false

    private func setupAstroChat() async {
        // Guard against both an existing VM and a concurrent initialization
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

        // Initialize the CopilotKit client before wiring callbacks
        await vm.initialize()

        // Wire globe action callbacks
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
            onAnalyzeLocation(coord, name, nil)
        }

        vm.onTogglePlanetVisibility = { [weak globeViewModel] (planet: String) in
            if let p = Planet(rawValue: planet) {
                globeViewModel?.togglePlanet(p)
            }
        }

        // Update birth data context if available
        if let birthData = BirthDataStore.shared.currentBirthData {
            let dateStr = Self.mediumDateFormatter.string(from: birthData.date)
            let timeStr = birthData.time.map { Self.shortTimeFormatter.string(from: $0) } ?? "Unknown"

            vm.updateBirthData(
                date: dateStr,
                time: timeStr,
                location: birthData.placeName,
                latitude: birthData.latitude,
                longitude: birthData.longitude
            )
        }

        astroChatViewModel = vm
    }
}
