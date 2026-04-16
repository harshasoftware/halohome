import Foundation

/// Service for calculating compatibility between two birth charts
/// Uses city database scoring for real location recommendations
public actor CompatibilityService {

    // MARK: - Constants

    /// Earth's radius in kilometers
    private static let earthRadiusKm: Double = 6371

    /// Distance threshold for "nearby" lines (in km)
    private static let nearbyThresholdKm: Double = 300

    /// Distance for close influence (in km)
    private static let closeThresholdKm: Double = 100

    /// Minimum population for included cities (100k+)
    private static let minPopulation: Int = 100_000

    /// Planets whose overlap is discounted when generationally shared
    private static let nodalPlanets: Set<Planet> = [.northNode, .southNode]

    /// Longitude band width (degrees) for collinear NN/SN deduplication
    private static let nodalBandDegrees: Double = 15.0

    // MARK: - Mode Weights

    /// Planet weights by mode
    private static let modeWeights: [CompatibilityMode: [Planet: Double]] = [
        .honeymoon: [
            .sun: 1.0, .moon: 1.5, .mercury: 0.8, .venus: 2.0, .mars: 0.7,
            .jupiter: 1.2, .saturn: 0.5, .uranus: 0.6, .neptune: 1.3, .pluto: 0.6,
            // Nodes: NN = fated partnership (meaningful but not as high as Venus);
            // SN = karmic past (low — not forward-looking for romance)
            .northNode: 1.4, .southNode: 0.5,
            // Chiron: healing through love — deep but bittersweet
            .chiron: 0.8
        ],
        .relocation: [
            .sun: 1.3, .moon: 1.2, .mercury: 1.0, .venus: 1.0, .mars: 0.8,
            .jupiter: 1.5, .saturn: 1.0, .uranus: 0.7, .neptune: 0.8, .pluto: 0.9,
            // NN = soul-purpose building (highest of any mode); SN = familiar comfort
            .northNode: 1.5, .southNode: 0.7,
            // Chiron: healing through home environment — significant for long-term
            .chiron: 1.1
        ],
        .travel: [
            .sun: 1.2, .moon: 1.0, .mercury: 1.3, .venus: 1.2, .mars: 1.0,
            .jupiter: 1.5, .saturn: 0.6, .uranus: 1.2, .neptune: 1.1, .pluto: 0.7,
            // NN = growth-oriented adventure; SN = comfortable/familiar destinations
            .northNode: 1.1, .southNode: 0.8,
            // Chiron: healing through exploration
            .chiron: 0.9
        ],
        .business: [
            .sun: 1.5, .moon: 0.7, .mercury: 1.3, .venus: 0.8, .mars: 1.2,
            .jupiter: 1.5, .saturn: 1.3, .uranus: 1.0, .neptune: 0.5, .pluto: 1.2,
            // NN = career destiny; SN = past patterns (low for new ventures)
            .northNode: 1.2, .southNode: 0.5,
            // Chiron: wounds in professional context — low
            .chiron: 0.6
        ]
    ]

    /// Line type weights by mode
    private static let lineTypeWeights: [CompatibilityMode: [AstroLineType: Double]] = [
        .honeymoon: [.midheaven: 0.8, .imumCoeli: 1.0, .ascendant: 1.2, .descendant: 1.5],
        .relocation: [.midheaven: 1.2, .imumCoeli: 1.3, .ascendant: 1.0, .descendant: 1.0],
        .travel: [.midheaven: 0.9, .imumCoeli: 0.8, .ascendant: 1.2, .descendant: 1.1],
        .business: [.midheaven: 1.5, .imumCoeli: 0.7, .ascendant: 1.2, .descendant: 1.0]
    ]

    // MARK: - Initialization

    public init() {}

    // MARK: - Public Methods

    /// Find compatible locations using city database scoring
    public func findCompatibleLocations(
        person1Lines: [AstroLine],
        person2Lines: [AstroLine],
        mode: CompatibilityMode,
        cities: [DuoCity] = [],
        limit: Int = 20
    ) async throws -> CompatibilityAnalysis {
        let startTime = Date()

        // Filter cities by population
        let filteredCities = cities.filter { $0.population >= Self.minPopulation }

        // If no cities provided, fall back to line intersection method
        guard !filteredCities.isEmpty else {
            return try await findCompatibleLocationsFromIntersections(
                person1Lines: person1Lines,
                person2Lines: person2Lines,
                mode: mode,
                limit: limit
            )
        }

        // Fix 1: Detect generational NN sharing once — avoids per-city re-computation
        let generationalNN = isGenerationallySharedNN(person1Lines: person1Lines, person2Lines: person2Lines)

        // Score each city for both people
        var locations: [CompatibleLocation] = []

        for city in filteredCities {
            let cityCoord = GlobeCoordinate(latitude: city.latitude, longitude: city.longitude)

            // Find nearby lines for each person
            let person1Nearby = findNearbyLines(at: cityCoord, lines: person1Lines)
            let person2Nearby = findNearbyLines(at: cityCoord, lines: person2Lines)

            // Skip cities with no influence from either person
            guard !person1Nearby.isEmpty || !person2Nearby.isEmpty else { continue }

            // Calculate scores
            let person1Score = calculateCityScore(influences: person1Nearby, mode: mode)
            let person2Score = calculateCityScore(influences: person2Nearby, mode: mode)

            // Calculate overlap bonus (both people have lines nearby).
            // Fix 1: Exclude NN/SN from the overlap bonus when they are generationally
            // shared (same nodal era) — that convergence is coincidental, not meaningful.
            let overlapBonus: Double
            if !person1Nearby.isEmpty && !person2Nearby.isEmpty {
                let closeLines1 = person1Nearby.filter {
                    $0.distance < Self.closeThresholdKm &&
                    !(generationalNN && Self.nodalPlanets.contains($0.planet))
                }
                let closeLines2 = person2Nearby.filter {
                    $0.distance < Self.closeThresholdKm &&
                    !(generationalNN && Self.nodalPlanets.contains($0.planet))
                }
                overlapBonus = min(25, Double(closeLines1.count + closeLines2.count) * 5)
            } else {
                overlapBonus = 0
            }

            // Combined score with overlap bonus
            let combinedScore = Int(round((person1Score + person2Score) / 2 + overlapBonus))

            // Generate interpretation
            let (interpretation, themes) = generateInterpretation(
                person1Lines: person1Nearby,
                person2Lines: person2Nearby,
                mode: mode
            )

            let location = CompatibleLocation(
                coordinate: cityCoord,
                cityName: city.name,
                country: city.country,
                person1Score: Int(round(person1Score)),
                person2Score: Int(round(person2Score)),
                combinedScore: combinedScore,
                overlapBonus: Int(round(overlapBonus)),
                person1Lines: person1Nearby,
                person2Lines: person2Nearby,
                interpretation: interpretation,
                themes: themes
            )
            locations.append(location)
        }

        // Sort by combined score
        locations.sort { $0.combinedScore > $1.combinedScore }

        // Fix 2: Deduplicate collinear NN/SN cities — NN/SN lines run N-S and pass through
        // many cities along the same meridian. Keep only the top scorer per longitude band.
        let deduped = deduplicateCollinear(locations)

        // Find best for specific purposes
        let bestForRomance = deduped.first { $0.themes.contains("Romance") }
        let bestForGrowth = deduped.first { $0.themes.contains("Growth") }
        let bestForSuccess = deduped.first { $0.themes.contains("Success") }

        let calculationTime = Date().timeIntervalSince(startTime)

        return CompatibilityAnalysis(
            mode: mode,
            topLocations: Array(deduped.prefix(limit)),
            totalIntersections: locations.count,
            bestForRomance: bestForRomance,
            bestForGrowth: bestForGrowth,
            bestForSuccess: bestForSuccess,
            calculationTime: calculationTime
        )
    }

    // MARK: - Private Methods

    /// Find lines near a given coordinate
    private func findNearbyLines(at coordinate: GlobeCoordinate, lines: [AstroLine]) -> [CompatibleLocation.LineInfo] {
        var nearbyLines: [CompatibleLocation.LineInfo] = []

        for line in lines {
            let distance = distanceToLine(from: coordinate, line: line)
            if distance <= Self.nearbyThresholdKm {
                nearbyLines.append(CompatibleLocation.LineInfo(
                    planet: line.planet,
                    lineType: line.lineType,
                    distance: distance
                ))
            }
        }

        // Sort by distance (closest first)
        return nearbyLines.sorted { $0.distance < $1.distance }
    }

    /// Calculate distance from a point to a polyline
    private func distanceToLine(from point: GlobeCoordinate, line: AstroLine) -> Double {
        guard line.coordinates.count >= 2 else { return Double.infinity }

        var minDistance = Double.infinity

        for i in 0..<(line.coordinates.count - 1) {
            let segStart = line.coordinates[i]
            let segEnd = line.coordinates[i + 1]

            // Skip wrap-around segments
            if abs(segEnd.longitude - segStart.longitude) > 180 { continue }

            let closest = closestPointOnSegment(
                point: point,
                segStart: segStart,
                segEnd: segEnd
            )

            if closest.distance < minDistance {
                minDistance = closest.distance
            }
        }

        return minDistance
    }

    /// Find closest point on a segment to a given point
    private func closestPointOnSegment(
        point: GlobeCoordinate,
        segStart: GlobeCoordinate,
        segEnd: GlobeCoordinate
    ) -> (point: GlobeCoordinate, distance: Double) {
        let segmentLength = haversineDistance(from: segStart, to: segEnd)

        if segmentLength < 0.1 {
            return (segStart, haversineDistance(from: point, to: segStart))
        }

        let t = max(0, min(1,
            ((point.latitude - segStart.latitude) * (segEnd.latitude - segStart.latitude) +
             (point.longitude - segStart.longitude) * (segEnd.longitude - segStart.longitude)) /
            (pow(segEnd.latitude - segStart.latitude, 2) + pow(segEnd.longitude - segStart.longitude, 2))
        ))

        let nearestLat = segStart.latitude + t * (segEnd.latitude - segStart.latitude)
        let nearestLng = segStart.longitude + t * (segEnd.longitude - segStart.longitude)
        let nearest = GlobeCoordinate(latitude: nearestLat, longitude: nearestLng)
        let distance = haversineDistance(from: point, to: nearest)

        return (nearest, distance)
    }

    /// Calculate Haversine distance between two points
    private func haversineDistance(from: GlobeCoordinate, to: GlobeCoordinate) -> Double {
        let lat1 = from.latitude * .pi / 180
        let lat2 = to.latitude * .pi / 180
        let dLat = (to.latitude - from.latitude) * .pi / 180
        let dLng = (to.longitude - from.longitude) * .pi / 180

        let a = sin(dLat / 2) * sin(dLat / 2) +
                cos(lat1) * cos(lat2) *
                sin(dLng / 2) * sin(dLng / 2)

        let c = 2 * atan2(sqrt(a), sqrt(1 - a))

        return Self.earthRadiusKm * c
    }

    /// Calculate score for a city based on nearby lines
    private func calculateCityScore(influences: [CompatibleLocation.LineInfo], mode: CompatibilityMode) -> Double {
        guard !influences.isEmpty else { return 0 }

        var totalScore: Double = 0

        for influence in influences {
            totalScore += calculateLineScore(
                planet: influence.planet,
                lineType: influence.lineType,
                distance: influence.distance,
                mode: mode
            )
        }

        // Normalize by number of influences, cap at 100
        return min(100, totalScore / Double(max(1, influences.count)))
    }

    /// Calculate score for a single line influence
    private func calculateLineScore(
        planet: Planet,
        lineType: AstroLineType,
        distance: Double,
        mode: CompatibilityMode
    ) -> Double {
        let planetWeight = Self.modeWeights[mode]?[planet] ?? 1.0
        let lineWeight = Self.lineTypeWeights[mode]?[lineType] ?? 1.0

        // Distance score: closer = higher (Gaussian decay)
        let sigma: Double = 100 // km
        let distanceScore = 100 * exp(-pow(distance, 2) / (2 * pow(sigma, 2)))

        return distanceScore * planetWeight * lineWeight
    }

    /// Generate interpretation and themes for a location
    private func generateInterpretation(
        person1Lines: [CompatibleLocation.LineInfo],
        person2Lines: [CompatibleLocation.LineInfo],
        mode: CompatibilityMode
    ) -> (interpretation: String, themes: [String]) {
        var themes: [String] = []
        var parts: [String] = []

        let allLines = person1Lines + person2Lines

        // Classic planet themes
        if allLines.contains(where: { $0.planet == .venus }) { themes.append("Romance") }
        if allLines.contains(where: { $0.planet == .jupiter }) { themes.append("Growth") }
        if allLines.contains(where: { $0.planet == .sun }) { themes.append("Success") }
        if allLines.contains(where: { $0.planet == .moon }) { themes.append("Comfort") }
        if allLines.contains(where: { $0.planet == .saturn }) { themes.append("Stability") }
        // Node & Chiron themes — surfaced in all modes
        if allLines.contains(where: { $0.planet == .northNode }) { themes.append("Destiny") }
        if allLines.contains(where: { $0.planet == .chiron }) { themes.append("Healing") }
        // SN intentionally excluded from themes — karmic past, not a label to surface

        // Build interpretation
        let modeDescriptions: [CompatibilityMode: String] = [
            .honeymoon: "romantic connection",
            .relocation: "building a life together",
            .travel: "shared adventures",
            .business: "professional partnership"
        ]

        if !person1Lines.isEmpty && !person2Lines.isEmpty {
            let p1Planets = Array(Set(person1Lines.map { $0.planet.rawValue })).prefix(2).joined(separator: " & ")
            let p2Planets = Array(Set(person2Lines.map { $0.planet.rawValue })).prefix(2).joined(separator: " & ")

            parts.append("Your \(p1Planets) lines meet their \(p2Planets) lines here.")

            let hasVenus    = allLines.contains { $0.planet == .venus }
            let hasMoon     = allLines.contains { $0.planet == .moon }
            let hasJupiter  = allLines.contains { $0.planet == .jupiter }
            let hasSun      = allLines.contains { $0.planet == .sun }
            let hasNN       = allLines.contains { $0.planet == .northNode }
            let hasChiron   = allLines.contains { $0.planet == .chiron }

            if hasVenus && hasMoon {
                parts.append("Strong emotional and romantic resonance for \(modeDescriptions[mode] ?? "connection").")
            } else if hasJupiter && hasSun {
                parts.append("Excellent for growth and shared success.")
            } else if hasNN && hasChiron {
                parts.append("A place of fated healing — soul-purpose aligned with deep transformation.")
            } else if hasNN {
                switch mode {
                case .honeymoon:   parts.append("Fated romantic energy — this place pulls you both toward shared destiny.")
                case .relocation:  parts.append("Soul-purpose convergence — a place to grow into who you're meant to become together.")
                case .travel:      parts.append("A growth-oriented adventure aligned with both your life paths.")
                case .business:    parts.append("Career destiny zone — professional goals align with deeper purpose here.")
                }
            } else if hasChiron {
                switch mode {
                case .honeymoon:   parts.append("Deep healing through love — emotional wounds find resolution together here.")
                case .relocation:  parts.append("A place of profound mutual healing and long-term wellbeing.")
                case .travel:      parts.append("A healing journey — this destination brings restoration and renewal.")
                case .business:    parts.append("Transformative professional energy — past wounds become strengths here.")
                }
            } else if !themes.isEmpty {
                parts.append("Themes: \(themes.joined(separator: ", ")).")
            }
        } else if !person1Lines.isEmpty {
            parts.append("This location activates your planetary energies.")
        } else if !person2Lines.isEmpty {
            parts.append("This location activates their planetary energies.")
        }

        let interpretation = parts.isEmpty ? "A place where your energies can align." : parts.joined(separator: " ")

        return (interpretation, themes)
    }

    // MARK: - Generational Node Detection (Fix 1)

    /// Returns true when both people's North Node lines cross the equator within 5° of
    /// each other — i.e. same nodal generation. Their NN/SN convergence at any city is
    /// coincidental astrology, not meaningful compatibility.
    private func isGenerationallySharedNN(person1Lines: [AstroLine], person2Lines: [AstroLine]) -> Bool {
        func equatorialLongitude(_ lines: [AstroLine]) -> Double? {
            guard let nnLine = lines.first(where: { $0.planet == .northNode }),
                  nnLine.coordinates.count >= 2 else { return nil }
            for i in 0..<(nnLine.coordinates.count - 1) {
                let c1 = nnLine.coordinates[i]
                let c2 = nnLine.coordinates[i + 1]
                guard abs(c2.longitude - c1.longitude) <= 180 else { continue }
                if (c1.latitude <= 0 && c2.latitude >= 0) || (c1.latitude >= 0 && c2.latitude <= 0) {
                    let t = abs(c1.latitude) / (abs(c1.latitude) + abs(c2.latitude) + 1e-9)
                    return c1.longitude + t * (c2.longitude - c1.longitude)
                }
            }
            return nnLine.coordinates[nnLine.coordinates.count / 2].longitude
        }

        guard let lng1 = equatorialLongitude(person1Lines),
              let lng2 = equatorialLongitude(person2Lines) else { return false }
        var diff = abs(lng1 - lng2)
        if diff > 180 { diff = 360 - diff }
        return diff < 5.0
    }

    // MARK: - Collinear Deduplication (Fix 2)

    /// Removes cities that are dominated by NN/SN lines AND fall within the same
    /// longitude band as a higher-scoring city already in the list. Prevents multiple
    /// cities along the same NN/SN meridian from flooding the top results.
    private func deduplicateCollinear(_ locations: [CompatibleLocation]) -> [CompatibleLocation] {
        var result: [CompatibleLocation] = []
        var usedNodalBands = Set<Int>()

        for location in locations {
            let allLines = location.person1Lines + location.person2Lines
            let nodalCount = allLines.filter { Self.nodalPlanets.contains($0.planet) }.count
            let isNodalDominated = nodalCount >= 2 // both people have NN/SN nearby

            if isNodalDominated {
                let band = Int(floor((location.coordinate.longitude + 180) / Self.nodalBandDegrees))
                if usedNodalBands.contains(band) { continue }
                usedNodalBands.insert(band)
            }
            result.append(location)
        }
        return result
    }

    // MARK: - Fallback: Line Intersection Method

    /// Fallback method when cities are not available
    private func findCompatibleLocationsFromIntersections(
        person1Lines: [AstroLine],
        person2Lines: [AstroLine],
        mode: CompatibilityMode,
        limit: Int
    ) async throws -> CompatibilityAnalysis {
        let startTime = Date()

        // Find all intersections
        let intersections = findAllIntersections(person1Lines: person1Lines, person2Lines: person2Lines)

        // Cluster nearby intersections
        let clusters = clusterIntersections(intersections)

        // Score each cluster
        var locations: [CompatibleLocation] = []

        for (centroid, clusterIntersections) in clusters {
            let location = scoreCluster(
                centroid: centroid,
                intersections: clusterIntersections,
                mode: mode
            )
            locations.append(location)
        }

        // Sort by combined score
        locations.sort { $0.combinedScore > $1.combinedScore }

        // Find best for specific purposes
        let bestForRomance = locations.first { $0.themes.contains("Romance") }
        let bestForGrowth = locations.first { $0.themes.contains("Growth") }
        let bestForSuccess = locations.first { $0.themes.contains("Success") }

        let calculationTime = Date().timeIntervalSince(startTime)

        return CompatibilityAnalysis(
            mode: mode,
            topLocations: Array(locations.prefix(limit)),
            totalIntersections: intersections.count,
            bestForRomance: bestForRomance,
            bestForGrowth: bestForGrowth,
            bestForSuccess: bestForSuccess,
            calculationTime: calculationTime
        )
    }

    /// Find all intersections between two line sets
    private func findAllIntersections(
        person1Lines: [AstroLine],
        person2Lines: [AstroLine]
    ) -> [LineIntersection] {
        var intersections: [LineIntersection] = []

        for line1 in person1Lines {
            guard line1.coordinates.count >= 2 else { continue }

            for line2 in person2Lines {
                guard line2.coordinates.count >= 2 else { continue }

                if let intersection = findLineIntersection(line1: line1, line2: line2) {
                    intersections.append(intersection)
                }
            }
        }

        return intersections
    }

    /// Find intersection or closest approach between two lines
    private func findLineIntersection(line1: AstroLine, line2: AstroLine) -> LineIntersection? {
        var minDistance = Double.infinity
        var closestPoint: GlobeCoordinate?

        for i in 0..<(line1.coordinates.count - 1) {
            let lat1 = line1.coordinates[i].latitude
            let lng1 = line1.coordinates[i].longitude
            let lat2 = line1.coordinates[i + 1].latitude
            let lng2 = line1.coordinates[i + 1].longitude

            if abs(lng2 - lng1) > 180 { continue }

            let midLat = (lat1 + lat2) / 2
            let midLng = (lng1 + lng2) / 2

            for j in 0..<(line2.coordinates.count - 1) {
                let lat3 = line2.coordinates[j].latitude
                let lng3 = line2.coordinates[j].longitude
                let lat4 = line2.coordinates[j + 1].latitude
                let lng4 = line2.coordinates[j + 1].longitude

                if abs(lng4 - lng3) > 180 { continue }

                let closest = closestPointOnSegment(
                    point: GlobeCoordinate(latitude: midLat, longitude: midLng),
                    segStart: GlobeCoordinate(latitude: lat3, longitude: lng3),
                    segEnd: GlobeCoordinate(latitude: lat4, longitude: lng4)
                )

                if closest.distance < minDistance {
                    minDistance = closest.distance
                    closestPoint = GlobeCoordinate(
                        latitude: (midLat + closest.point.latitude) / 2,
                        longitude: (midLng + closest.point.longitude) / 2
                    )
                }
            }
        }

        guard let point = closestPoint, minDistance <= Self.nearbyThresholdKm else {
            return nil
        }

        return LineIntersection(
            coordinate: point,
            person1Line: (line1.planet, line1.lineType),
            person2Line: (line2.planet, line2.lineType),
            distance: minDistance,
            isExact: minDistance < 50
        )
    }

    /// Cluster nearby intersections
    private func clusterIntersections(_ intersections: [LineIntersection]) -> [GlobeCoordinate: [LineIntersection]] {
        var clusters: [GlobeCoordinate: [LineIntersection]] = [:]
        var assigned = Set<Int>()

        for i in 0..<intersections.count {
            if assigned.contains(i) { continue }

            var cluster: [LineIntersection] = [intersections[i]]
            assigned.insert(i)

            for j in (i + 1)..<intersections.count {
                if assigned.contains(j) { continue }

                let dist = haversineDistance(
                    from: intersections[i].coordinate,
                    to: intersections[j].coordinate
                )

                if dist <= 200 {
                    cluster.append(intersections[j])
                    assigned.insert(j)
                }
            }

            let avgLat = cluster.reduce(0.0) { $0 + $1.coordinate.latitude } / Double(cluster.count)
            let avgLng = cluster.reduce(0.0) { $0 + $1.coordinate.longitude } / Double(cluster.count)
            let centroid = GlobeCoordinate(latitude: avgLat, longitude: avgLng)

            clusters[centroid] = cluster
        }

        return clusters
    }

    /// Score a cluster of intersections
    private func scoreCluster(
        centroid: GlobeCoordinate,
        intersections: [LineIntersection],
        mode: CompatibilityMode
    ) -> CompatibleLocation {
        var person1LinesMap: [String: CompatibleLocation.LineInfo] = [:]
        var person2LinesMap: [String: CompatibleLocation.LineInfo] = [:]

        for intersection in intersections {
            let key1 = "\(intersection.person1Line.0)-\(intersection.person1Line.1)"
            let key2 = "\(intersection.person2Line.0)-\(intersection.person2Line.1)"

            if person1LinesMap[key1] == nil || person1LinesMap[key1]!.distance > intersection.distance {
                person1LinesMap[key1] = CompatibleLocation.LineInfo(
                    planet: intersection.person1Line.0,
                    lineType: intersection.person1Line.1,
                    distance: intersection.distance
                )
            }

            if person2LinesMap[key2] == nil || person2LinesMap[key2]!.distance > intersection.distance {
                person2LinesMap[key2] = CompatibleLocation.LineInfo(
                    planet: intersection.person2Line.0,
                    lineType: intersection.person2Line.1,
                    distance: intersection.distance
                )
            }
        }

        let person1Lines = Array(person1LinesMap.values)
        let person2Lines = Array(person2LinesMap.values)

        let person1Score = calculateCityScore(influences: person1Lines, mode: mode)
        let person2Score = calculateCityScore(influences: person2Lines, mode: mode)

        let exactCrossings = intersections.filter { $0.isExact }.count
        let overlapBonus = min(20, Double(exactCrossings * 5 + intersections.count * 2))

        let combinedScore = Int(round(person1Score * 0.4 + person2Score * 0.4 + overlapBonus))

        let (interpretation, themes) = generateInterpretation(
            person1Lines: person1Lines,
            person2Lines: person2Lines,
            mode: mode
        )

        return CompatibleLocation(
            coordinate: centroid,
            person1Score: Int(round(person1Score)),
            person2Score: Int(round(person2Score)),
            combinedScore: combinedScore,
            overlapBonus: Int(round(overlapBonus)),
            person1Lines: person1Lines,
            person2Lines: person2Lines,
            interpretation: interpretation,
            themes: themes
        )
    }
}

// MARK: - Internal Types

/// Represents an intersection between two astro lines
private struct LineIntersection {
    let coordinate: GlobeCoordinate
    let person1Line: (Planet, AstroLineType)
    let person2Line: (Planet, AstroLineType)
    let distance: Double
    let isExact: Bool
}
