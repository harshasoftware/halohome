import Foundation
import FeatureScout
import CartoStarCore

/// Bridges AstroCore's Rust FFI → FeatureScout's ScoutScoringProvider protocol.
/// Always uses scoreCitiesJson() to respect population filtering from the caller.
struct LiveScoutScoringProvider: ScoutScoringProvider {

    func scoreCities(
        citiesJson: String,
        linesJson: String,
        ratingsJson: String,
        configJson: String,
        paranLinesJson: String,
        zenithJson: String
    ) async throws -> String {
        // Run Rust computation off-main-thread
        await Task.detached(priority: .userInitiated) {
            // Always use the explicit cities JSON path so population filtering works.
            // The cached path (scoreCachedCitiesJson) ignores citiesJson and scores
            // ALL ~33K cached cities, bypassing the population tier filter.
            return scoreCitiesJson(
                citiesJson: citiesJson,
                linesJson: linesJson,
                ratingsJson: ratingsJson,
                configJson: configJson,
                paranLinesJson: paranLinesJson,
                zenithJson: zenithJson
            )
        }.value
    }

    func scoreCitiesWithNatal(
        citiesJson: String,
        linesJson: String,
        ratingsJson: String,
        configJson: String,
        natalChartJson: String,
        paranLinesJson: String,
        zenithJson: String
    ) async throws -> String {
        await Task.detached(priority: .userInitiated) {
            return scoreCitiesWithNatalJson(
                citiesJson: citiesJson,
                linesJson: linesJson,
                ratingsJson: ratingsJson,
                configJson: configJson,
                natalChartJson: natalChartJson,
                paranLinesJson: paranLinesJson,
                zenithJson: zenithJson
            )
        }.value
    }
}
