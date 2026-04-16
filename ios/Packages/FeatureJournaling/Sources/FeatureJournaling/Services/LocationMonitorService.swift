@preconcurrency import CoreLocation
import Foundation
import UserNotifications
import Core

// MARK: - Location Event

public enum LocationEvent: Sendable {
    case visitDetected(LocationVisit)
    case significantLocationChange(latitude: Double, longitude: Double)
}

// MARK: - Location Monitor Protocol

public protocol LocationMonitorProtocol: AnyObject, Sendable {
    var authorizationStatus: CLAuthorizationStatus { get }
    func startMonitoring()
    func stopMonitoring()
    func requestWhenInUseAuthorization()
    func requestAlwaysAuthorization()
    var events: AsyncStream<LocationEvent> { get }
}

// MARK: - Live Location Monitor Service

public final class LiveLocationMonitorService: NSObject, LocationMonitorProtocol, CLLocationManagerDelegate, @unchecked Sendable {

    private let locationManager: CLLocationManager
    private let notificationCenter: UNUserNotificationCenter
    private let continuation: AsyncStream<LocationEvent>.Continuation
    public let events: AsyncStream<LocationEvent>

    public var authorizationStatus: CLAuthorizationStatus {
        locationManager.authorizationStatus
    }

    @MainActor
    public init(notificationCenter: UNUserNotificationCenter = .current()) {
        let manager = CLLocationManager()
        self.locationManager = manager
        self.notificationCenter = notificationCenter

        var continuation: AsyncStream<LocationEvent>.Continuation!
        self.events = AsyncStream { continuation = $0 }
        self.continuation = continuation

        super.init()

        manager.delegate = self
    }

    // MARK: - Monitoring Control

    public func startMonitoring() {
        AppLogger.info("Starting location monitoring (visits + significant changes)", category: AppLogger.notifications)
        locationManager.startMonitoringVisits()
        locationManager.startMonitoringSignificantLocationChanges()
    }

    public func stopMonitoring() {
        AppLogger.info("Stopping location monitoring", category: AppLogger.notifications)
        locationManager.stopMonitoringVisits()
        locationManager.stopMonitoringSignificantLocationChanges()
        continuation.finish()
    }

    public func requestWhenInUseAuthorization() {
        locationManager.requestWhenInUseAuthorization()
    }

    public func requestAlwaysAuthorization() {
        locationManager.requestAlwaysAuthorization()
    }

    // MARK: - CLLocationManagerDelegate

    public func locationManager(_ manager: CLLocationManager, didVisit visit: CLVisit) {
        let locationVisit = LocationVisit(visit: visit)

        AppLogger.info(
            "Visit detected at (\(visit.coordinate.latitude), \(visit.coordinate.longitude)), days: \(locationVisit.daysStayed)",
            category: AppLogger.notifications
        )

        continuation.yield(.visitDetected(locationVisit))

        if locationVisit.qualifiesForJournalPrompt {
            scheduleJournalPromptNotification(for: locationVisit)
        }
    }

    public func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.last else { return }
        let lat = location.coordinate.latitude
        let lng = location.coordinate.longitude

        AppLogger.debug(
            "Significant location change: (\(lat), \(lng))",
            category: AppLogger.notifications
        )

        continuation.yield(.significantLocationChange(latitude: lat, longitude: lng))
    }

    public func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        AppLogger.error("Location manager error: \(error.localizedDescription)", category: AppLogger.notifications)
    }

    public func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        AppLogger.info("Location authorization changed: \(manager.authorizationStatus.rawValue)", category: AppLogger.notifications)
    }

    // MARK: - Notifications

    private func scheduleJournalPromptNotification(for visit: LocationVisit) {
        let isLongTerm = visit.isLongTermStay
        let daysLabel = isLongTerm ? "30+" : "7+"
        let identifier = "journal_prompt_\(visit.latitude)_\(visit.longitude)_\(daysLabel)"

        let content = UNMutableNotificationContent()
        content.title = "Time to reflect"
        content.body = isLongTerm
            ? "You've been in this area for over 30 days. How has this place shaped your experience?"
            : "You've spent a week here. How are the local energies influencing you?"
        content.categoryIdentifier = "journal_prompt"
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 5, repeats: false)
        let request = UNNotificationRequest(identifier: identifier, content: content, trigger: trigger)

        notificationCenter.add(request) { error in
            if let error {
                AppLogger.error("Failed to schedule journal prompt: \(error.localizedDescription)", category: AppLogger.notifications)
            } else {
                AppLogger.info("Scheduled journal prompt notification (\(daysLabel) days) for (\(visit.latitude), \(visit.longitude))", category: AppLogger.notifications)
            }
        }
    }
}
