import Foundation

// MARK: - Nakshatra Data Model

/// A single Vedic lunar mansion (nakshatra) definition
public struct Nakshatra: Identifiable, Sendable, Equatable {
    public let id: Int         // 1–27
    public let name: String    // Sanskrit name
    public let englishName: String
    public let iauStar: String
    public let starName: String
    public let rulingPlanet: String
    public let deity: String
    public let symbol: String
    public let startLon: Double // Sidereal ecliptic start longitude (degrees)
    public let color: String   // Hex color keyed to ruling planet
}

/// Projected nakshatra band on the globe at birth moment
public struct NakshatraGlobeData: Identifiable, Sendable {
    public let id: Int
    public let nakshatra: Nakshatra
    public let startLng: Double   // Globe longitude of band start
    public let endLng: Double     // Globe longitude of band end
    public let padaLngs: [Double] // [3] internal pada boundary longitudes
    public let centerLng: Double  // Globe longitude of band center
}

// MARK: - Ruling Planet Colors (matches web NAKSHATRA_PLANET_COLORS)

/// Color palette for nakshatra bands keyed to ruling planet
public enum NakshatraPlanetColors {
    public static let ketu    = "#8B6B4A"
    public static let venus   = "#D4A0B5"
    public static let sun     = "#E8A020"
    public static let moon    = "#90A8C0"
    public static let mars    = "#B84040"
    public static let rahu    = "#6A5B8C"
    public static let jupiter = "#C8A830"
    public static let saturn  = "#4A5880"
    public static let mercury = "#4A9060"

    public static func color(for planet: String) -> String {
        switch planet {
        case "Ketu": return ketu
        case "Venus": return venus
        case "Sun": return sun
        case "Moon": return moon
        case "Mars": return mars
        case "Rahu": return rahu
        case "Jupiter": return jupiter
        case "Saturn": return saturn
        case "Mercury": return mercury
        default: return "#888888"
        }
    }
}

// MARK: - Constants

/// Width of each nakshatra in degrees — exact 13°20' = 800'/60
public let NAKSHATRA_WIDTH = 800.0 / 60.0 // 13.3333...°

/// Width of each pada in degrees — exact 3°20' = 200'/60
public let PADA_WIDTH = 200.0 / 60.0 // 3.3333...°

// MARK: - 27 Nakshatra Definitions

/// All 27 nakshatras with static data (matches web NAKSHATRA_DEFS exactly)
public let ALL_NAKSHATRAS: [Nakshatra] = [
    Nakshatra(id: 1,  name: "Ashwini",           englishName: "The Horse Heads",             iauStar: "β Arietis",    starName: "Sheratan",          rulingPlanet: "Ketu",    deity: "Ashwini Kumaras",       symbol: "Horse head",                            startLon: 0 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.ketu),
    Nakshatra(id: 2,  name: "Bharani",           englishName: "The Bearer",                  iauStar: "41 Arietis",   starName: "Bharani",           rulingPlanet: "Venus",   deity: "Yama",                  symbol: "Yoni (womb)",                           startLon: 1 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.venus),
    Nakshatra(id: 3,  name: "Krittika",          englishName: "The Pleiades",                iauStar: "η Tauri",      starName: "Alcyone",           rulingPlanet: "Sun",     deity: "Agni",                  symbol: "Razor / flame",                         startLon: 2 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.sun),
    Nakshatra(id: 4,  name: "Rohini",            englishName: "The Red One",                 iauStar: "α Tauri",      starName: "Aldebaran",         rulingPlanet: "Moon",    deity: "Brahma / Prajapati",    symbol: "Chariot / ox cart",                     startLon: 3 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.moon),
    Nakshatra(id: 5,  name: "Mrigashira",        englishName: "The Deer Head",               iauStar: "λ Orionis",    starName: "Meissa",            rulingPlanet: "Mars",    deity: "Chandra",               symbol: "Deer head",                             startLon: 4 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.mars),
    Nakshatra(id: 6,  name: "Ardra",             englishName: "The Moist One",               iauStar: "α Orionis",    starName: "Betelgeuse",        rulingPlanet: "Rahu",    deity: "Rudra",                 symbol: "Teardrop / diamond",                    startLon: 5 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.rahu),
    Nakshatra(id: 7,  name: "Punarvasu",         englishName: "The Return of Light",         iauStar: "β Geminorum",  starName: "Pollux",            rulingPlanet: "Jupiter", deity: "Aditi",                 symbol: "Bow and quiver",                        startLon: 6 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.jupiter),
    Nakshatra(id: 8,  name: "Pushya",            englishName: "The Nourisher",               iauStar: "δ Cancri",     starName: "Asellus Australis", rulingPlanet: "Saturn",  deity: "Brihaspati",            symbol: "Flower / cow udder",                    startLon: 7 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.saturn),
    Nakshatra(id: 9,  name: "Ashlesha",          englishName: "The Embrace",                 iauStar: "ε Hydrae",     starName: "Ashlesha",          rulingPlanet: "Mercury", deity: "Naga",                  symbol: "Coiled serpent",                        startLon: 8 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.mercury),
    Nakshatra(id: 10, name: "Magha",             englishName: "The Great One",               iauStar: "α Leonis",     starName: "Regulus",           rulingPlanet: "Ketu",    deity: "Pitrs",                 symbol: "Throne / palanquin",                    startLon: 9 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.ketu),
    Nakshatra(id: 11, name: "Purva Phalguni",    englishName: "The Former Reddish One",      iauStar: "δ Leonis",     starName: "Zosma",             rulingPlanet: "Venus",   deity: "Bhaga",                 symbol: "Hammock / front legs of bed",           startLon: 10 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.venus),
    Nakshatra(id: 12, name: "Uttara Phalguni",   englishName: "The Latter Reddish One",      iauStar: "β Leonis",     starName: "Denebola",          rulingPlanet: "Sun",     deity: "Aryaman",               symbol: "Back legs of bed / fig tree",           startLon: 11 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.sun),
    Nakshatra(id: 13, name: "Hasta",             englishName: "The Hand",                    iauStar: "δ Corvi",      starName: "Algorab",           rulingPlanet: "Moon",    deity: "Savitar",               symbol: "Hand / fist",                           startLon: 12 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.moon),
    Nakshatra(id: 14, name: "Chitra",            englishName: "The Bright One",              iauStar: "α Virginis",   starName: "Spica",             rulingPlanet: "Mars",    deity: "Vishvakarma",           symbol: "Bright jewel / pearl",                  startLon: 13 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.mars),
    Nakshatra(id: 15, name: "Swati",             englishName: "The Independent One",         iauStar: "α Bootis",     starName: "Arcturus",          rulingPlanet: "Rahu",    deity: "Vayu",                  symbol: "Sword / coral",                         startLon: 14 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.rahu),
    Nakshatra(id: 16, name: "Vishakha",          englishName: "The Forked Branches",         iauStar: "α Librae",     starName: "Zubenelgenubi",     rulingPlanet: "Jupiter", deity: "Indra-Agni",            symbol: "Triumphal archway",                     startLon: 15 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.jupiter),
    Nakshatra(id: 17, name: "Anuradha",          englishName: "Following Radha",             iauStar: "δ Scorpii",    starName: "Dschubba",          rulingPlanet: "Saturn",  deity: "Mitra",                 symbol: "Lotus flower",                          startLon: 16 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.saturn),
    Nakshatra(id: 18, name: "Jyeshtha",          englishName: "The Eldest",                  iauStar: "α Scorpii",    starName: "Antares",           rulingPlanet: "Mercury", deity: "Indra",                 symbol: "Circular talisman / umbrella",          startLon: 17 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.mercury),
    Nakshatra(id: 19, name: "Mula",              englishName: "The Root",                    iauStar: "ε Scorpii",    starName: "Wei",               rulingPlanet: "Ketu",    deity: "Nirriti",               symbol: "Bunch of roots",                        startLon: 18 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.ketu),
    Nakshatra(id: 20, name: "Purva Ashadha",     englishName: "The Former Invincible One",   iauStar: "δ Sagittarii", starName: "Kaus Media",        rulingPlanet: "Venus",   deity: "Apas",                  symbol: "Elephant tusk / fan",                   startLon: 19 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.venus),
    Nakshatra(id: 21, name: "Uttara Ashadha",    englishName: "The Latter Invincible One",   iauStar: "σ Sagittarii", starName: "Nunki",             rulingPlanet: "Sun",     deity: "Vishvadevas",           symbol: "Elephant tusk / small bed",             startLon: 20 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.sun),
    Nakshatra(id: 22, name: "Shravana",          englishName: "The Ear / Hearing",           iauStar: "α Aquilae",    starName: "Altair",            rulingPlanet: "Moon",    deity: "Vishnu",                symbol: "Three footsteps / ear",                 startLon: 21 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.moon),
    Nakshatra(id: 23, name: "Dhanishtha",        englishName: "The Wealthiest",              iauStar: "β Delphini",   starName: "Rotanev",           rulingPlanet: "Mars",    deity: "Eight Vasus",           symbol: "Flute / drum",                          startLon: 22 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.mars),
    Nakshatra(id: 24, name: "Shatabhisha",       englishName: "The Hundred Physicians",      iauStar: "λ Aquarii",    starName: "Skat",              rulingPlanet: "Rahu",    deity: "Varuna",                symbol: "Empty circle / 1000 stars",             startLon: 23 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.rahu),
    Nakshatra(id: 25, name: "Purva Bhadrapada",  englishName: "The Former Auspicious Steps", iauStar: "α Pegasi",     starName: "Markab",            rulingPlanet: "Jupiter", deity: "Aja Ekapad",            symbol: "Sword / two front legs of funeral cot", startLon: 24 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.jupiter),
    Nakshatra(id: 26, name: "Uttara Bhadrapada", englishName: "The Latter Auspicious Steps", iauStar: "γ Pegasi",     starName: "Algenib",           rulingPlanet: "Saturn",  deity: "Ahir Budhnya",          symbol: "Two back legs of funeral cot",          startLon: 25 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.saturn),
    Nakshatra(id: 27, name: "Revati",            englishName: "The Wealthy / Prosperous",    iauStar: "ζ Piscium",    starName: "Revati",            rulingPlanet: "Mercury", deity: "Pushan",                symbol: "Fish / drum",                           startLon: 26 * NAKSHATRA_WIDTH, color: NakshatraPlanetColors.mercury),
]

// MARK: - Tarabala

/// The 9 Tara categories and their qualities (matches web TARA_DATA exactly)
private let taraData: [(taraName: String, verdict: TarabalaVerdict, verdictLabel: String)] = [
    (taraName: "",            verdict: .neutral, verdictLabel: ""),           // index 0 unused
    (taraName: "Janma",       verdict: .neutral, verdictLabel: "Neutral"),
    (taraName: "Sampat",      verdict: .good,    verdictLabel: "Very Good"),
    (taraName: "Vipat",       verdict: .bad,     verdictLabel: "Bad"),
    (taraName: "Kshema",      verdict: .good,    verdictLabel: "Good"),
    (taraName: "Pratyak",     verdict: .bad,     verdictLabel: "Not Good"),
    (taraName: "Sadhana",     verdict: .good,    verdictLabel: "Very Good"),
    (taraName: "Naidhana",    verdict: .bad,     verdictLabel: "Totally Bad"),
    (taraName: "Mitra",       verdict: .good,    verdictLabel: "Good"),
    (taraName: "Parama Mitra",verdict: .good,    verdictLabel: "Very Good"),
]

public enum TarabalaVerdict: String, Equatable, Sendable {
    case good, bad, neutral
}

public struct TarabalaResult: Equatable, Sendable {
    public let tara: Int              // 1–9
    public let taraName: String       // Sanskrit name
    public let verdict: TarabalaVerdict
    public let verdictLabel: String

    public init(tara: Int, taraName: String, verdict: TarabalaVerdict, verdictLabel: String) {
        self.tara = tara
        self.taraName = taraName
        self.verdict = verdict
        self.verdictLabel = verdictLabel
    }
}

/// Calculate Tarabala (stellar compatibility) for a nakshatra relative to the birth Moon nakshatra.
/// - Parameters:
///   - dayNakshatraIndex: 1-27 index of the nakshatra to evaluate
///   - janmaNakshatraIndex: 1-27 index of the birth Moon's nakshatra
/// - Returns: TarabalaResult with tara number, name, and verdict
public func calculateTarabala(dayNakshatraIndex: Int, janmaNakshatraIndex: Int) -> TarabalaResult {
    let position = ((dayNakshatraIndex - janmaNakshatraIndex) % 27 + 27) % 27 + 1
    let tara = position % 9 == 0 ? 9 : position % 9
    let data = taraData[tara]
    return TarabalaResult(tara: tara, taraName: data.taraName, verdict: data.verdict, verdictLabel: data.verdictLabel)
}

/// Compute the Janma Nakshatra index (1–27) from the Moon's tropical ecliptic longitude.
/// - Parameters:
///   - moonTropicalLongitude: Moon's tropical ecliptic longitude in degrees
///   - julianDate: Julian Date of birth (used to compute Lahiri ayanamsa)
public func computeJanmaNakshatraIndex(moonTropicalLongitude: Double, julianDate: Double) -> Int {
    let ayanamsa = calculateAyanamsaDeg(julianDate: julianDate)
    let siderealLon = ((moonTropicalLongitude - ayanamsa).truncatingRemainder(dividingBy: 360) + 360).truncatingRemainder(dividingBy: 360)
    return Int(siderealLon / NAKSHATRA_WIDTH) % 27 + 1
}

// MARK: - Ayanamsa Calculation

/// Ayanamsa offsets from Lahiri (in degrees), matching web AYANAMSA_OFFSET_FROM_LAHIRI
private let ayanamsaOffsets: [String: Double] = [
    "lahiri": 0,
    "kp": -0.096852,    // SE2 SE_SIDM_KRISHNAMURTI
    "raman": -1.446301, // SE2 SE_SIDM_RAMAN
]

/// Calculate Lahiri ayanamsa in degrees for a Julian Date.
/// Uses IAU 2006 precession polynomial anchored to SE2 Lahiri base.
public func calculateAyanamsa(julianDate: Double) -> Double {
    let T = (julianDate - 2451545.0) / 36525.0
    return 23.857092 + 1.396610 * T + 0.000433 * T * T
}

/// Calculate ayanamsa for a given system and Julian Date.
public func calculateAyanamsaDeg(julianDate: Double, system: String = "lahiri") -> Double {
    calculateAyanamsa(julianDate: julianDate) + (ayanamsaOffsets[system] ?? 0)
}

// MARK: - Mean Obliquity (Meeus / IAU 2006)

/// Mean obliquity of the ecliptic in degrees (Meeus polynomial).
/// Matches aa-js Earth.getMeanObliquityOfEcliptic.
private func meanObliquity(julianDate: Double) -> Double {
    let T = (julianDate - 2451545.0) / 36525.0
    // Meeus formula (matches IAU 2006 for practical purposes)
    let seconds = 84381.448 - 46.8150 * T - 0.00059 * T * T + 0.001813 * T * T * T
    return seconds / 3600.0
}

// MARK: - Ecliptic → RA Conversion

/// Convert ecliptic longitude (latitude=0) to Right Ascension in degrees.
/// Standard spherical trigonometry for ecliptic-to-equatorial conversion.
private func eclipticToRA(eclipticLonDeg: Double, obliquityDeg: Double) -> Double {
    let lonRad = eclipticLonDeg * .pi / 180
    let epsRad = obliquityDeg * .pi / 180

    // RA = atan2(sin(lon) * cos(eps), cos(lon))
    let y = sin(lonRad) * cos(epsRad)
    let x = cos(lonRad)
    var raDeg = atan2(y, x) * 180 / .pi
    if raDeg < 0 { raDeg += 360 }
    return raDeg
}

// MARK: - Sidereal → Globe Longitude

/// Convert sidereal ecliptic longitude to geographic MC longitude on Earth.
/// Pipeline: sidereal → tropical (+ayanamsa) → RA → MC longitude (RA - GMST)
private func siderealLonToGlobeLng(
    siderealLon: Double,
    ayanamsa: Double,
    epsilon: Double,
    gmstDeg: Double
) -> Double {
    // Step 1: sidereal → tropical
    let tropicalLon = siderealLon + ayanamsa

    // Step 2: ecliptic → RA
    let raDeg = eclipticToRA(eclipticLonDeg: tropicalLon, obliquityDeg: epsilon)

    // Step 3: RA → MC geographic longitude
    var mcLng = raDeg.truncatingRemainder(dividingBy: 360) + (raDeg < 0 ? 360 : 0) - gmstDeg
    mcLng = ((mcLng + 180).truncatingRemainder(dividingBy: 360)) - 180
    if mcLng < -180 { mcLng += 360 }

    return mcLng
}

// MARK: - Globe Projection

/// Project all 27 nakshatras onto the globe at birth moment.
///
/// - Parameters:
///   - gmstDeg: Greenwich Mean Sidereal Time in degrees at birth moment
///   - julianDate: Julian Date of birth
///   - ayanamsaSystem: Which ayanamsa system to use (default: "lahiri")
/// - Returns: Array of 27 NakshatraGlobeData with globe longitudes for each band
public func calculateNakshatraGlobe(
    gmstDeg: Double,
    julianDate: Double,
    ayanamsaSystem: String = "lahiri"
) -> [NakshatraGlobeData] {
    let ayanamsa = calculateAyanamsaDeg(julianDate: julianDate, system: ayanamsaSystem)
    let epsilon = meanObliquity(julianDate: julianDate)

    return ALL_NAKSHATRAS.map { n in
        let startLng = siderealLonToGlobeLng(
            siderealLon: n.startLon,
            ayanamsa: ayanamsa, epsilon: epsilon, gmstDeg: gmstDeg
        )
        let endLng = siderealLonToGlobeLng(
            siderealLon: (n.startLon + NAKSHATRA_WIDTH).truncatingRemainder(dividingBy: 360),
            ayanamsa: ayanamsa, epsilon: epsilon, gmstDeg: gmstDeg
        )

        // 3 internal pada boundaries (at 1/4, 2/4, 3/4 of the nakshatra)
        let padaLngs = [1, 2, 3].map { p in
            siderealLonToGlobeLng(
                siderealLon: (n.startLon + Double(p) * PADA_WIDTH).truncatingRemainder(dividingBy: 360),
                ayanamsa: ayanamsa, epsilon: epsilon, gmstDeg: gmstDeg
            )
        }

        let centerLng = siderealLonToGlobeLng(
            siderealLon: (n.startLon + NAKSHATRA_WIDTH / 2).truncatingRemainder(dividingBy: 360),
            ayanamsa: ayanamsa, epsilon: epsilon, gmstDeg: gmstDeg
        )

        return NakshatraGlobeData(
            id: n.id,
            nakshatra: n,
            startLng: startLng,
            endLng: endLng,
            padaLngs: padaLngs,
            centerLng: centerLng
        )
    }
}
