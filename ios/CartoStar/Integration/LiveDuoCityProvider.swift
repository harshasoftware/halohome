import Foundation
import FeatureGlobe
import FeatureScout

/// Bridges CityDataLoader to FeatureGlobe's DuoCityProvider protocol.
/// Converts City from FeatureScout to DuoCity for duo mode compatibility scoring.
struct LiveDuoCityProvider: DuoCityProvider {

    func loadCities() async throws -> [DuoCity] {
        let scoutCities = try await CityDataLoader.loadCities()
        return scoutCities.map { city in
            DuoCity(
                name: city.name,
                country: city.country,
                countryCode: city.countryCode,
                latitude: city.latitude,
                longitude: city.longitude,
                population: city.population
            )
        }
    }
}
