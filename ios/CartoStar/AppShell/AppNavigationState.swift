import SwiftUI
import Observation
import Core
import FeatureGlobe

// MARK: - App Navigation State

/// Observable class for app-wide navigation state
/// Manages tabs, sheet presentations, and deep link handling
@MainActor
@available(iOS 17.0, *)
@Observable
public final class AppNavigationState {

    // MARK: - Types

    /// Main navigation tabs
    public enum Tab: String, CaseIterable, Sendable {
        case globe
        case scout
        case settings

        public var title: String {
            switch self {
            case .globe: return "Globe"
            case .scout: return "Scout"
            case .settings: return "Settings"
            }
        }

        public var icon: String {
            switch self {
            case .globe: return "globe.americas.fill"
            case .scout: return "magnifyingglass"
            case .settings: return "gearshape.fill"
            }
        }
    }

    /// Sheet presentation types
    public enum Sheet: Identifiable, Equatable {
        case birthData
        case chartPicker
        case locationDetail(cityId: String)
        case cityAnalysis
        case scout
        case duo
        case duoPaywall  // "afterduotapped" placement paywall for duo access
        case consultation
        case exportReport
        case favorites
        case paywall           // "afteraiquestion" — free → pro upgrade
        case upgradePaywall    // "after50questions" — pro → duo/lifetime upgrade
        case settings
        case journal

        public var id: String {
            switch self {
            case .birthData: return "birthData"
            case .chartPicker: return "chartPicker"
            case .locationDetail(let cityId): return "locationDetail-\(cityId)"
            case .cityAnalysis: return "cityAnalysis"
            case .scout: return "scout"
            case .duo: return "duo"
            case .duoPaywall: return "duoPaywall"
            case .consultation: return "consultation"
            case .exportReport: return "exportReport"
            case .favorites: return "favorites"
            case .paywall: return "paywall"
            case .upgradePaywall: return "upgradePaywall"
            case .settings: return "settings"
            case .journal: return "journal"
            }
        }
    }

    /// Side panel types
    public enum SidePanel: Equatable {
        case none
        case right(content: RightPanelContent)
    }

    /// Right panel content types
    public enum RightPanelContent: Equatable {
        case locationInfo(cityId: String)
        case lineInfo(planet: String, lineType: String)
        case scoutResults
        case cityAnalysis
        case duo
        case lineFilters
        case favorites
        case aiChat
    }

    // MARK: - Properties

    /// Currently selected tab
    public var selectedTab: Tab = .globe

    /// Active sheet presentation
    public var activeSheet: Sheet?

    /// Side panel state
    public var sidePanel: SidePanel = .none

    /// Whether Duo mode is enabled
    public var isDuoModeEnabled: Bool = false

    /// Search query for location search
    public var searchQuery: String = ""

    /// Whether the toolbar is visible
    public var isToolbarVisible: Bool = true

    /// Current city analysis result (single source of truth)
    public var currentAnalysis: LocationAnalysis?

    /// Whether analysis is in progress
    public var isAnalyzing: Bool = false

    /// Deep link URL being processed
    private(set) var pendingDeepLink: URL?

    // MARK: - Initialization

    public init() {
        AppLogger.debug("AppNavigationState initialized", category: AppLogger.ui)
    }

    // MARK: - Navigation Actions

    /// Show a sheet
    public func showSheet(_ sheet: Sheet) {
        activeSheet = sheet
        AppLogger.debug("Showing sheet: \(sheet.id)", category: AppLogger.ui)
    }

    /// Dismiss current sheet
    public func dismissSheet() {
        activeSheet = nil
        AppLogger.debug("Dismissed active sheet", category: AppLogger.ui)
    }

    /// Show right panel with content
    public func showRightPanel(_ content: RightPanelContent) {
        sidePanel = .right(content: content)
        AppLogger.debug("Showing right panel", category: AppLogger.ui)
    }

    /// Hide side panel
    public func hideSidePanel() {
        sidePanel = .none
        AppLogger.debug("Hidden side panel", category: AppLogger.ui)
    }

    /// Present content using the appropriate surface based on size class.
    /// On iPad (.regular), spatial content goes to the side panel.
    /// On iPhone (.compact), everything uses sheets.
    public func presentContent(_ content: RightPanelContent, sizeClass: UserInterfaceSizeClass?) {
        if sizeClass == .regular {
            showRightPanel(content)
        } else {
            // Map panel content to the appropriate sheet
            switch content {
            case .cityAnalysis:
                showSheet(.cityAnalysis)
            case .locationInfo(let cityId):
                showSheet(.locationDetail(cityId: cityId))
            case .scoutResults:
                showSheet(.scout)
            case .duo:
                showSheet(.duo)
            case .favorites:
                showSheet(.favorites)
            case .aiChat:
                showSheet(.consultation)
            case .lineInfo, .lineFilters:
                showRightPanel(content)
            }
        }
    }

    /// Toggle Duo mode
    public func toggleDuoMode() {
        isDuoModeEnabled.toggle()
        AppLogger.info("Duo mode toggled: \(self.isDuoModeEnabled)", category: AppLogger.ui)
    }

    /// Navigate to tab
    public func navigateToTab(_ tab: Tab) {
        selectedTab = tab
        AppLogger.debug("Navigated to tab: \(tab.rawValue)", category: AppLogger.ui)
    }

    // MARK: - Deep Link Handling

    /// Process a deep link URL using DeepLinkHandler for parsing
    public func handleDeepLink(_ url: URL) {
        AppLogger.info("Handling deep link: \(url.absoluteString)", category: AppLogger.ui)

        guard let action = DeepLinkHandler.parse(url) else { return }

        switch action {
        case .openSharedChart:
            pendingDeepLink = url

        case .navigateToLocation:
            selectedTab = .globe

        case .openScout:
            selectedTab = .globe
            showSheet(.scout)

        case .openDuo:
            isDuoModeEnabled = true
            showSheet(.duo)

        case .openJournal:
            showSheet(.journal)
        }
    }

    /// Clear pending deep link after processing
    public func clearPendingDeepLink() {
        pendingDeepLink = nil
    }
}

// MARK: - Environment Key

private struct AppNavigationStateKey: EnvironmentKey {
    static let defaultValue: AppNavigationState? = nil
}

@available(iOS 17.0, *)
extension EnvironmentValues {
    /// Access app navigation state from SwiftUI views
    public var navigationState: AppNavigationState? {
        get { self[AppNavigationStateKey.self] }
        set { self[AppNavigationStateKey.self] = newValue }
    }
}

@available(iOS 17.0, *)
extension View {
    /// Inject navigation state into view hierarchy
    public func navigationState(_ state: AppNavigationState) -> some View {
        self.environment(\.navigationState, state)
    }
}
