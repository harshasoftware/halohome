import Foundation
import Core

// MARK: - Deep Link Handler

/// Parses and routes deep link URLs for the HaloHome app.
///
/// Supported formats:
/// - `halohome://share/{id}` - Open shared chart
/// - `halohome://location/{lat},{lng}` - Navigate to location
/// - `halohome://scout` - Open Scout view
/// - `halohome://duo` - Enable Duo mode
enum DeepLinkHandler {

    /// Parsed deep link action
    enum Action {
        case openSharedChart(id: String)
        case navigateToLocation(latitude: Double, longitude: Double)
        case openScout
        case openDuo
        case openJournal
    }

    /// Parse a URL into a deep link action, or nil if unrecognized.
    static func parse(_ url: URL) -> Action? {
        guard let host = url.host else {
            AppLogger.info("Deep link has no host", category: AppLogger.ui)
            return nil
        }

        switch host {
        case "share":
            return parseShareLink(url)

        case "location":
            return parseLocationLink(url)

        case "scout":
            return .openScout

        case "duo":
            return .openDuo

        case "journal":
            return .openJournal

        default:
            AppLogger.info("Unknown deep link host: \(host)", category: AppLogger.ui)
            return nil
        }
    }

    // MARK: - Private Parsers

    private static func parseShareLink(_ url: URL) -> Action? {
        let pathComponents = url.pathComponents.filter { $0 != "/" }
        guard let shareId = pathComponents.first else {
            AppLogger.info("Share deep link missing ID", category: AppLogger.ui)
            return nil
        }
        return .openSharedChart(id: shareId)
    }

    private static func parseLocationLink(_ url: URL) -> Action? {
        let pathComponents = url.pathComponents.filter { $0 != "/" }
        guard let coordinates = pathComponents.first else {
            AppLogger.info("Location deep link missing coordinates", category: AppLogger.ui)
            return nil
        }

        let parts = coordinates.split(separator: ",")
        guard parts.count == 2,
              let lat = Double(parts[0]),
              let lng = Double(parts[1]) else {
            AppLogger.info("Location deep link has invalid coordinates", category: AppLogger.ui)
            return nil
        }

        return .navigateToLocation(latitude: lat, longitude: lng)
    }
}
