import Foundation

// MARK: - Pipeline Module

/// A toggleable scoring pipeline module
public struct PipelineModule: Identifiable, Sendable {
    public let id: String
    public let name: String
    public let description: String
    public let technicalNote: String
    public let category: Category
    public let status: Status
    public let impact: Impact
    public var isEnabled: Bool
    public let requiresNatalChart: Bool

    /// Module categories for organization
    public enum Category: String, CaseIterable, Sendable {
        case personalization = "Personalization"
        case natalIntegration = "Natal Integration"
        case timing = "Timing"

        public var description: String {
            switch self {
            case .personalization:
                return "Personalize your results based on your birth chart"
            case .natalIntegration:
                return "Deeper integration with your natal chart aspects"
            case .timing:
                return "Time-sensitive recommendations"
            }
        }
    }

    public enum Status: String, Sendable {
        case stable = "Ready"
        case experimental = "New"
        case comingSoon = "Coming Soon"

        public var color: String {
            switch self {
            case .stable: return "green"
            case .experimental: return "orange"
            case .comingSoon: return "gray"
            }
        }
    }

    public enum Impact: String, Sendable {
        case low = "Low"
        case medium = "Medium"
        case high = "High"
    }

    // Legacy alias for backwards compatibility
    public var phase: Category { category }
}

// MARK: - Node Drishti Scheme

/// Controls how Rahu/Ketu (lunar nodes) participate in Vedic Graha Drishti.
/// Different Jyotish lineages disagree on whether nodes cast aspects.
public enum NodeDrishtiScheme: String, CaseIterable, Identifiable, Sendable {
    case none = "None"
    case parasari = "Parasari"
    case extended = "Extended"

    public var id: String { rawValue }

    public var description: String {
        switch self {
        case .none: return "Nodes cast no special aspects"
        case .parasari: return "Traditional: 4th, 6th, 8th houses"
        case .extended: return "Parasari + 11th house aspect"
        }
    }

    /// JSON key for Rust deserialization (lowercase)
    public var jsonKey: String {
        switch self {
        case .none: return "none"
        case .parasari: return "parasari"
        case .extended: return "extended"
        }
    }
}

// MARK: - Ayanamsa System

/// Ayanamsa system for Vedic sidereal calculations.
/// Determines the offset between tropical and sidereal zodiacs.
public enum AyanamsaSystem: String, CaseIterable, Identifiable, Sendable {
    case lahiri = "Lahiri"
    case raman = "Raman"
    case kp = "KP"

    public var id: String { rawValue }

    public var description: String {
        switch self {
        case .lahiri: return "Standard BPHS (~24.1°)"
        case .raman: return "B.V. Raman (~22.4°)"
        case .kp: return "Krishnamurti (~23.9°)"
        }
    }

    /// JSON key for Rust deserialization (lowercase)
    public var jsonKey: String {
        switch self {
        case .lahiri: return "lahiri"
        case .raman: return "raman"
        case .kp: return "kp"
        }
    }
}

// MARK: - Planet System

/// Which planet set to use for scoring
public enum PlanetSystem: String, CaseIterable, Identifiable, Sendable {
    case western = "Western"
    case vedic = "Vedic"
    case custom = "Custom"

    public var id: String { rawValue }

    public var description: String {
        switch self {
        case .western: return "Modern planets, excludes nodes"
        case .vedic: return "Traditional planets + Rahu/Ketu"
        case .custom: return "Choose which planets to include"
        }
    }

    /// Default excluded planets for this system
    public var defaultExcluded: Set<String> {
        switch self {
        case .western: return ["NorthNode", "SouthNode"]
        case .vedic: return ["Uranus", "Neptune", "Pluto", "Chiron"]
        case .custom: return []
        }
    }
}

/// All planets available for scoring
public enum ScoutPlanet: String, CaseIterable, Identifiable, Sendable {
    case sun = "Sun"
    case moon = "Moon"
    case mercury = "Mercury"
    case venus = "Venus"
    case mars = "Mars"
    case jupiter = "Jupiter"
    case saturn = "Saturn"
    case uranus = "Uranus"
    case neptune = "Neptune"
    case pluto = "Pluto"
    case northNode = "NorthNode"
    case southNode = "SouthNode"
    case chiron = "Chiron"

    public var id: String { rawValue }

    public var displayName: String {
        switch self {
        case .northNode: return "North Node (Rahu)"
        case .southNode: return "South Node (Ketu)"
        default: return rawValue
        }
    }

    /// Whether this planet is a traditional planet (used in both systems)
    public var isTraditional: Bool {
        switch self {
        case .sun, .moon, .mercury, .venus, .mars, .jupiter, .saturn: return true
        default: return false
        }
    }
}

// MARK: - Tarabala Filter Mode

/// Vedic Tarabala filter mode for post-processing scout results
public enum TarabalaFilterMode: String, CaseIterable, Identifiable, Sendable {
    case penalty = "Penalty"
    case eliminate = "Eliminate"

    public var id: String { rawValue }

    public var description: String {
        switch self {
        case .penalty: return "Reduce scores for unfavorable nakshatras"
        case .eliminate: return "Remove cities in unfavorable nakshatras"
        }
    }

    /// JSON key for serialization (lowercase)
    public var jsonKey: String {
        switch self {
        case .penalty: return "penalty"
        case .eliminate: return "eliminate"
        }
    }
}

// MARK: - Pipeline Settings

/// Observable settings for scoring pipeline modules.
/// Persists to UserDefaults and generates JSON config for Rust.
@MainActor
@Observable
public final class PipelineSettings {

    // MARK: - Module Toggles

    public var essentialDignity: Bool {
        didSet { save(); invalidateCache() }
    }
    public var houseRulership: Bool {
        didSet { save(); invalidateCache() }
    }
    public var eastWestAsymmetry: Bool {
        didSet { save(); invalidateCache() }
    }
    public var retrogradeModifier: Bool {
        didSet { save(); invalidateCache() }
    }
    public var natalAspects: Bool {
        didSet { save(); invalidateCache() }
    }
    public var paranSynergy: Bool {
        didSet { save(); invalidateCache() }
    }
    public var timingFactor: Bool {
        didSet { save(); invalidateCache() }
    }
    public var vedicMode: Bool {
        didSet {
            // When switching vedic mode, update planet system accordingly
            if vedicMode && planetSystem == .western {
                planetSystem = .vedic
            } else if !vedicMode && planetSystem == .vedic {
                planetSystem = .western
            }
            save(); invalidateCache()
        }
    }

    // MARK: - Aspect Lines & Node Drishti

    /// When false, influences from aspect lines (conjunction, trine, etc.) are zeroed out.
    /// Lewis purists may prefer planetary lines only.
    public var aspectLinesEnabled: Bool {
        didSet { save(); invalidateCache() }
    }

    /// Controls Rahu/Ketu participation in Vedic Graha Drishti.
    public var nodeDrishtiScheme: NodeDrishtiScheme {
        didSet { save(); invalidateCache() }
    }

    // MARK: - Ayanamsa System

    /// Ayanamsa system for Vedic sidereal calculations (Lahiri/Raman/KP)
    public var ayanamsaSystem: AyanamsaSystem {
        didSet { save(); invalidateCache() }
    }

    // MARK: - Preference Sliders

    /// Stability vs adventure preference. Default 1.0, range [0.7, 1.3].
    /// > 1.0 = embrace change (amplifies Uranus/Neptune/Pluto)
    /// < 1.0 = prefer stability (dampens Uranus/Neptune/Pluto)
    public var adventureFactor: Double {
        didSet { save(); invalidateCache() }
    }

    /// Material vs spiritual preference. Default 1.0, range [0.7, 1.3].
    /// > 1.0 = material focus (amplifies Jupiter/Venus, dampens Neptune/Ketu)
    /// < 1.0 = spiritual focus (amplifies Neptune/Ketu, dampens Jupiter/Venus)
    public var materialFactor: Double {
        didSet { save(); invalidateCache() }
    }

    /// Stability preference. Default 1.0, range [0.7, 1.3].
    /// Higher values reduce the volatility penalty (prefer stable locations).
    /// Formula: volatility_penalty = 0.3 × (2.0 - stabilityPreference)
    public var stabilityPreference: Double {
        didSet { save(); invalidateCache() }
    }

    // MARK: - Tarabala Post-Processing

    /// Whether Vedic Tarabala post-processing filter is enabled
    public var tarabalaFilterEnabled: Bool {
        didSet { save(); invalidateCache() }
    }

    /// Tarabala filter mode: penalty reduces scores, eliminate removes them
    public var tarabalaFilterMode: TarabalaFilterMode {
        didSet { save(); invalidateCache() }
    }

    // MARK: - Planet System

    /// Which planet system to use (Western/Vedic/Custom)
    public var planetSystem: PlanetSystem {
        didSet {
            if oldValue != planetSystem {
                switch planetSystem {
                case .western, .vedic:
                    excludedPlanets = planetSystem.defaultExcluded
                case .custom:
                    break // Keep current selection
                }
                // Sync vedic mode with planet system
                if planetSystem == .vedic && !vedicMode {
                    vedicMode = true
                } else if planetSystem == .western && vedicMode {
                    vedicMode = false
                }
                save(); invalidateCache()
            }
        }
    }

    /// Planets excluded from scoring
    public var excludedPlanets: Set<String> {
        didSet { save(); invalidateCache() }
    }

    /// Whether a specific planet is included in scoring
    public func isPlanetIncluded(_ planet: ScoutPlanet) -> Bool {
        !excludedPlanets.contains(planet.rawValue)
    }

    /// Toggle a planet's inclusion (only works in custom mode)
    public func togglePlanet(_ planet: ScoutPlanet) {
        if planetSystem != .custom {
            planetSystem = .custom
        }
        if excludedPlanets.contains(planet.rawValue) {
            excludedPlanets.remove(planet.rawValue)
        } else {
            excludedPlanets.insert(planet.rawValue)
        }
    }

    /// Callback when settings change (triggers recomputation)
    public var onSettingsChanged: (() -> Void)?

    // MARK: - Presets

    public enum Preset: String, CaseIterable, Identifiable, Sendable {
        case personalized = "Personalized"
        case full = "Full Power"
        case custom = "Custom"

        public var id: String { rawValue }

        public var displayName: String {
            switch self {
            case .personalized: return "Personalized"
            case .full: return "Full Power"
            case .custom: return "Custom"
            }
        }

        public var description: String {
            switch self {
            case .personalized: return "Tailored to your birth chart placement"
            case .full: return "All personalization features enabled"
            case .custom: return "Fine-tune individual options"
            }
        }

        public var iconName: String {
            switch self {
            case .personalized: return "person.fill.checkmark"
            case .full: return "sparkles"
            case .custom: return "slider.horizontal.3"
            }
        }
    }

    /// Current preset (computed from module state — matches web getActivePreset())
    public var currentPreset: Preset {
        // Web requires planetSystem === 'western' for preset match
        guard planetSystem == .western else { return .custom }

        // Personalized: core personalization modules enabled, aspect lines on
        if essentialDignity && houseRulership && eastWestAsymmetry &&
           !retrogradeModifier && !natalAspects && !paranSynergy &&
           !timingFactor && aspectLinesEnabled && !vedicMode {
            return .personalized
        }
        // Full Power: all available modules enabled (matches web FULL_POWER_MODULES)
        if essentialDignity && houseRulership && eastWestAsymmetry &&
           retrogradeModifier && natalAspects && paranSynergy &&
           !timingFactor && aspectLinesEnabled && !vedicMode {
            return .full
        }
        return .custom
    }

    /// Apply a preset (matches web applyPreset())
    public func applyPreset(_ preset: Preset) {
        switch preset {
        case .personalized:
            essentialDignity = true
            houseRulership = true
            eastWestAsymmetry = true
            retrogradeModifier = false
            natalAspects = false
            paranSynergy = false
            timingFactor = false
            aspectLinesEnabled = true
            vedicMode = false
            planetSystem = .western
        case .full:
            essentialDignity = true
            houseRulership = true
            eastWestAsymmetry = true
            retrogradeModifier = true
            natalAspects = true
            paranSynergy = true
            timingFactor = false  // Not yet implemented
            aspectLinesEnabled = true
            vedicMode = false
            planetSystem = .western
        case .custom:
            break // No changes
        }
    }

    /// Whether any module requiring natal chart data is enabled
    public var requiresNatalChart: Bool {
        essentialDignity || houseRulership || retrogradeModifier || natalAspects || vedicMode
    }

    /// Whether any experimental module is enabled
    public var hasExperimentalModules: Bool {
        eastWestAsymmetry || retrogradeModifier || natalAspects
    }

    /// Count of enabled modules
    public var enabledCount: Int {
        [essentialDignity, houseRulership, eastWestAsymmetry,
         retrogradeModifier, natalAspects, paranSynergy,
         timingFactor, vedicMode].filter { $0 }.count
    }

    /// Number of active (included) planets
    public var activePlanetCount: Int {
        ScoutPlanet.allCases.count - excludedPlanets.count
    }

    // MARK: - Module Definitions

    /// All available modules with metadata
    public var modules: [PipelineModule] {
        [
            PipelineModule(
                id: "essential_dignity", name: "Planetary Strength",
                description: "Uses your planets' zodiac positions to enhance locations where your strongest planets shine.",
                technicalNote: "Essential Dignity: Boosts planets in domicile/exaltation, reduces in detriment/fall. Based on traditional rulership tables.",
                category: .personalization, status: .stable, impact: .medium,
                isEnabled: essentialDignity, requiresNatalChart: true
            ),
            PipelineModule(
                id: "house_rulership", name: "Life Area Focus",
                description: "Emphasizes locations that align with your birth chart's strongest life areas.",
                technicalNote: "House Rulership: Boosts planets ruling angular houses (1/4/7/10), reduces for dusthana houses (6/8/12).",
                category: .personalization, status: .stable, impact: .medium,
                isEnabled: houseRulership, requiresNatalChart: true
            ),
            PipelineModule(
                id: "east_west_asymmetry", name: "Hemisphere Balance",
                description: "Subtle refinement based on global hemisphere energies.",
                technicalNote: "East/West Asymmetry: ASC lines +3% in Eastern hemisphere, DSC lines +3% in Western hemisphere.",
                category: .personalization, status: .stable, impact: .low,
                isEnabled: eastWestAsymmetry, requiresNatalChart: false
            ),
            PipelineModule(
                id: "retrograde_modifier", name: "Retrograde Awareness",
                description: "Accounts for retrograde planets in your chart with system-appropriate interpretation.",
                technicalNote: "Retrograde Modifier: Western mode reduces public lines (MC/ASC). Vedic mode boosts via chesta bala strength calculation.",
                category: .personalization, status: .experimental, impact: .medium,
                isEnabled: retrogradeModifier, requiresNatalChart: true
            ),
            PipelineModule(
                id: "paran_synergy", name: "Power Spots",
                description: "Highlights locations where multiple planetary lines cross, creating concentrated energy.",
                technicalNote: "Paran Synergy: Additive bonus near angular line crossings. Uses planetary synergy tables with Gaussian decay (σ=75km, max 150km).",
                category: .personalization, status: .experimental, impact: .medium,
                isEnabled: paranSynergy, requiresNatalChart: false
            ),
            PipelineModule(
                id: "natal_aspects", name: "Aspect Integration",
                description: "Considers how planets in your chart relate to each other - hard aspects reduce line strength, soft aspects enhance.",
                technicalNote: "Natal Aspects: Western uses Ptolemaic orbs (conj/opp 8°, trine/square 6°, sextile 4°). Vedic uses Graha Drishti sign-based aspects.",
                category: .personalization, status: .experimental, impact: .high,
                isEnabled: natalAspects, requiresNatalChart: true
            ),
            PipelineModule(
                id: "timing_factor", name: "Right Now",
                description: "Time-sensitive recommendations based on current planetary transits.",
                technicalNote: "Timing Factor: Transit-aware scoring using current planetary positions. Not yet implemented.",
                category: .timing, status: .comingSoon, impact: .high,
                isEnabled: timingFactor, requiresNatalChart: true
            ),
        ]
    }

    // MARK: - JSON Generation

    /// Generate the excluded planets JSON array
    private func excludedPlanetsJson() -> String {
        if excludedPlanets.isEmpty { return "null" }
        let quoted = excludedPlanets.sorted().map { "\"\($0)\"" }
        return "[\(quoted.joined(separator: ","))]"
    }

    /// Generate the modules portion of the Rust config JSON (boolean toggles only)
    public func toModulesJson() -> String {
        """
        {"essential_dignity":\(essentialDignity),"house_rulership":\(houseRulership),"east_west_asymmetry":\(eastWestAsymmetry),"retrograde_modifier":\(retrogradeModifier),"natal_aspects":\(natalAspects),"paran_synergy":\(paranSynergy),"timing_factor":\(timingFactor),"aspect_lines_enabled":\(aspectLinesEnabled),"vedic_mode":\(vedicMode)}
        """
    }

    /// Computed volatility penalty matching web formula:
    /// volatility_penalty = 0.3 × (2.0 - stabilityPreference)
    /// At default (1.0) = 0.3; ranges [0.21, 0.39]
    public var volatilityPenalty: Double {
        0.3 * (2.0 - stabilityPreference)
    }

    /// Generate full ScoringConfig JSON matching web toConfigJson() structure.
    /// Top-level fields: kernel config, preference factors, excluded planets, ayanamsa, drishti.
    /// Nested modules: boolean toggles only.
    public func toConfigJson(kernelParameter: Double = 150.0) -> String {
        """
        {"kernel_type":"Gaussian","kernel_parameter":\(kernelParameter),"max_distance_km":500.0,"volatility_penalty":\(volatilityPenalty),"adventure_factor":\(adventureFactor),"material_factor":\(materialFactor),"modules":\(toModulesJson()),"excluded_planets":\(excludedPlanetsJson()),"ayanamsa_system":"\(ayanamsaSystem.jsonKey)","node_drishti_scheme":"\(nodeDrishtiScheme.jsonKey)"}
        """
    }

    // MARK: - Persistence

    private static let storageKey = "scout_pipeline_settings"
    private static let planetsStorageKey = "scout_pipeline_planets"

    private func save() {
        let data: [String: Any] = [
            "essential_dignity": essentialDignity,
            "house_rulership": houseRulership,
            "east_west_asymmetry": eastWestAsymmetry,
            "retrograde_modifier": retrogradeModifier,
            "natal_aspects": natalAspects,
            "paran_synergy": paranSynergy,
            "timing_factor": timingFactor,
            "vedic_mode": vedicMode,
            "aspect_lines_enabled": aspectLinesEnabled,
            "node_drishti_scheme": nodeDrishtiScheme.rawValue,
            "adventure_factor": adventureFactor,
            "material_factor": materialFactor,
            "stability_preference": stabilityPreference,
            "tarabala_filter_enabled": tarabalaFilterEnabled,
            "tarabala_filter_mode": tarabalaFilterMode.rawValue,
        ]
        UserDefaults.standard.set(data, forKey: Self.storageKey)

        // Save planet settings + ayanamsa
        let planetData: [String: Any] = [
            "system": planetSystem.rawValue,
            "excluded": Array(excludedPlanets),
            "ayanamsa": ayanamsaSystem.rawValue,
        ]
        UserDefaults.standard.set(planetData, forKey: Self.planetsStorageKey)
    }

    private func invalidateCache() {
        onSettingsChanged?()
    }

    // MARK: - Init

    public init() {
        let saved = UserDefaults.standard.dictionary(forKey: Self.storageKey)
        let bools = saved as? [String: Bool] ?? [:]
        // Default to Personalized preset (true) for new users
        let hasExistingSettings = saved != nil
        self.essentialDignity = bools["essential_dignity"] ?? !hasExistingSettings
        self.houseRulership = bools["house_rulership"] ?? !hasExistingSettings
        self.eastWestAsymmetry = bools["east_west_asymmetry"] ?? !hasExistingSettings
        self.retrogradeModifier = bools["retrograde_modifier"] ?? false
        self.natalAspects = bools["natal_aspects"] ?? false
        self.paranSynergy = bools["paran_synergy"] ?? false
        self.timingFactor = bools["timing_factor"] ?? false
        self.vedicMode = bools["vedic_mode"] ?? false
        // aspect_lines_enabled defaults to true (Lewis-purist off by default)
        self.aspectLinesEnabled = (saved?["aspect_lines_enabled"] as? Bool) ?? true
        // Preference sliders default to 1.0 (neutral)
        self.adventureFactor = (saved?["adventure_factor"] as? Double) ?? 1.0
        self.materialFactor = (saved?["material_factor"] as? Double) ?? 1.0
        self.stabilityPreference = (saved?["stability_preference"] as? Double) ?? 1.0
        // Tarabala filter defaults to off
        self.tarabalaFilterEnabled = (saved?["tarabala_filter_enabled"] as? Bool) ?? false
        if let modeRaw = saved?["tarabala_filter_mode"] as? String,
           let mode = TarabalaFilterMode(rawValue: modeRaw) {
            self.tarabalaFilterMode = mode
        } else {
            self.tarabalaFilterMode = .penalty
        }
        // node_drishti_scheme defaults to Parasari
        if let schemeRaw = saved?["node_drishti_scheme"] as? String,
           let scheme = NodeDrishtiScheme(rawValue: schemeRaw) {
            self.nodeDrishtiScheme = scheme
        } else {
            self.nodeDrishtiScheme = .parasari
        }

        // Load planet settings + ayanamsa
        let planetSaved = UserDefaults.standard.dictionary(forKey: Self.planetsStorageKey)
        if let systemRaw = planetSaved?["system"] as? String,
           let system = PlanetSystem(rawValue: systemRaw) {
            self.planetSystem = system
        } else {
            self.planetSystem = .western
        }
        if let excluded = planetSaved?["excluded"] as? [String] {
            self.excludedPlanets = Set(excluded)
        } else {
            // Default: Western excludes NorthNode/SouthNode
            self.excludedPlanets = PlanetSystem.western.defaultExcluded
        }
        if let ayanamsaRaw = planetSaved?["ayanamsa"] as? String,
           let ayanamsa = AyanamsaSystem(rawValue: ayanamsaRaw) {
            self.ayanamsaSystem = ayanamsa
        } else {
            self.ayanamsaSystem = .lahiri
        }
    }
}
