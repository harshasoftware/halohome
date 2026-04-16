import Foundation
import CoreLocation
import FeatureGlobe
import Core

/// Live implementation of GeocodingProvider using Apple's CLGeocoder.
/// Converts coordinates to location names with country and timezone.
struct LiveGeocodingProvider: GeocodingProvider {

    func reverseGeocode(coordinate: GlobeCoordinate) async throws -> SelectedLocation {
        let clLocation = CLLocation(
            latitude: coordinate.latitude,
            longitude: coordinate.longitude
        )

        let geocoder = CLGeocoder()
        let placemarks = try await geocoder.reverseGeocodeLocation(clLocation)

        guard let placemark = placemarks.first else {
            AppLogger.debug("Reverse geocode returned no placemarks for requested coordinate", category: AppLogger.feature)
            return SelectedLocation(coordinate: coordinate)
        }

        let name = placemark.locality ?? placemark.name ?? placemark.administrativeArea
        let country = placemark.country
        let timezone = placemark.timeZone?.identifier

        return SelectedLocation(
            coordinate: coordinate,
            name: name,
            country: country,
            timezone: timezone
        )
    }
}
