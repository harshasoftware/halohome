import Foundation
import CoreLocation
import UIKit
import Core

/// Manages the location permission request flow
@MainActor
@Observable
public final class LocationPermissionViewModel {

    // MARK: - State

    /// Current authorization status
    public private(set) var authorizationStatus: CLAuthorizationStatus = .notDetermined

    /// Whether the pre-prompt screen should be shown
    public var showPrePrompt: Bool = false

    /// Whether the upgrade prompt (WhenInUse → Always) should be shown
    public var showUpgradePrompt: Bool = false

    /// Whether location permissions are fully granted (Always)
    public var isFullyAuthorized: Bool {
        authorizationStatus == .authorizedAlways
    }

    /// Whether at least WhenInUse is granted
    public var hasBasicAuthorization: Bool {
        authorizationStatus == .authorizedWhenInUse || authorizationStatus == .authorizedAlways
    }

    /// Whether the user has denied location access
    public var isDenied: Bool {
        authorizationStatus == .denied || authorizationStatus == .restricted
    }

    // MARK: - Dependencies

    private let locationMonitor: LocationMonitorProtocol

    // MARK: - Init

    public init(locationMonitor: LocationMonitorProtocol) {
        self.locationMonitor = locationMonitor
        self.authorizationStatus = locationMonitor.authorizationStatus
    }

    // MARK: - Permission Flow

    /// Begin the permission flow — shows pre-prompt if not yet determined
    public func beginPermissionFlow() {
        authorizationStatus = locationMonitor.authorizationStatus

        switch authorizationStatus {
        case .notDetermined:
            showPrePrompt = true
        case .authorizedWhenInUse:
            showUpgradePrompt = true
        case .denied, .restricted:
            // Direct to Settings
            openAppSettings()
        case .authorizedAlways:
            // Already fully authorized
            break
        @unknown default:
            showPrePrompt = true
        }
    }

    /// Request WhenInUse authorization (called from pre-prompt)
    public func requestWhenInUse() {
        showPrePrompt = false
        locationMonitor.requestWhenInUseAuthorization()

        // Poll for status change
        Task {
            try? await Task.sleep(for: .seconds(1))
            authorizationStatus = locationMonitor.authorizationStatus

            if authorizationStatus == .authorizedWhenInUse {
                showUpgradePrompt = true
            }
        }
    }

    /// Request Always authorization (called from upgrade prompt)
    public func requestAlways() {
        showUpgradePrompt = false
        locationMonitor.requestAlwaysAuthorization()

        Task {
            try? await Task.sleep(for: .seconds(1))
            authorizationStatus = locationMonitor.authorizationStatus

            if isFullyAuthorized {
                locationMonitor.startMonitoring()
                AppLogger.info("Location monitoring started after Always authorization", category: AppLogger.notifications)
            }
        }
    }

    /// Skip the upgrade prompt (stay with WhenInUse)
    public func skipUpgrade() {
        showUpgradePrompt = false
    }

    /// Open iOS Settings app for this app
    public func openAppSettings() {
        if let settingsURL = URL(string: UIApplication.openSettingsURLString) {
            UIApplication.shared.open(settingsURL)
        }
    }

    /// Refresh authorization status (call when app returns from Settings)
    public func refreshStatus() {
        authorizationStatus = locationMonitor.authorizationStatus
    }
}
