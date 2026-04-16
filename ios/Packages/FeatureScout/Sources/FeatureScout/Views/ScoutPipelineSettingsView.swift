import SwiftUI
import DesignSystem

/// Settings view for customizing scoring personalization.
/// Presented as a sheet from the Scout toolbar or from App Settings.
public struct ScoutPipelineSettingsView: View {

    @Environment(\.dismiss) private var dismiss
    @Bindable private var settings: PipelineSettings
    private let onRecompute: (() -> Void)?

    /// Currently selected module for showing technical info
    @State private var selectedModuleInfo: PipelineModule?

    public init(settings: PipelineSettings, onRecompute: (() -> Void)? = nil) {
        self.settings = settings
        self.onRecompute = onRecompute
    }

    public var body: some View {
        NavigationStack {
            Form {
                // Quick presets at the top
                presetSection

                // Planet system selector
                planetSystemSection

                // Ayanamsa picker (Vedic mode only)
                if settings.planetSystem == .vedic || settings.vedicMode {
                    ayanamsaSection
                }

                // Personalization modules
                personalizationSection

                // Coming soon section
                comingSoonSection

                // Preference sliders
                preferenceSlidersSection

                // Tarabala filter (Vedic mode only)
                if settings.vedicMode {
                    tarabalaSection
                }

                // Advanced options (collapsed by default)
                advancedSection

                // Info section
                infoSection
            }
            .scrollContentBackground(.hidden)
            .background(DSColors.background)
            .navigationTitle("Personalization")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                    .fontWeight(.semibold)
                }
            }
            .alert(
                selectedModuleInfo?.name ?? "Technical Details",
                isPresented: Binding(
                    get: { selectedModuleInfo != nil },
                    set: { if !$0 { selectedModuleInfo = nil } }
                )
            ) {
                Button("OK", role: .cancel) {
                    selectedModuleInfo = nil
                }
            } message: {
                Text(selectedModuleInfo?.technicalNote ?? "")
            }
        }
    }

    // MARK: - Preset Section

    private var presetSection: some View {
        Section {
            ForEach(PipelineSettings.Preset.allCases.filter { $0 != .custom }) { preset in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        settings.applyPreset(preset)
                    }
                    onRecompute?()
                } label: {
                    HStack(spacing: DSSpacing.md) {
                        Image(systemName: preset.iconName)
                            .font(.system(size: 18))
                            .foregroundStyle(settings.currentPreset == preset ? DSColors.accentPrimary : DSColors.textSecondary)
                            .frame(width: 24)

                        VStack(alignment: .leading, spacing: 2) {
                            Text(preset.displayName)
                                .font(DSTypography.body)
                                .foregroundStyle(DSColors.textPrimary)
                            Text(preset.description)
                                .font(DSTypography.caption)
                                .foregroundStyle(DSColors.textSecondary)
                        }
                        Spacer()
                        if settings.currentPreset == preset {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(DSColors.accentPrimary)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        } header: {
            Text("Quick Setup")
        } footer: {
            Text("Choose how much your birth chart personalizes your results.")
                .font(DSTypography.caption)
                .foregroundStyle(DSColors.textSecondary)
        }
    }

    // MARK: - Personalization Section

    private var personalizationSection: some View {
        let availableModules: [PipelineModule] = settings.modules.filter {
            $0.category == .personalization && $0.status != .comingSoon
        }

        return Section {
            ForEach(availableModules, id: \.id) { (module: PipelineModule) in
                moduleRow(module)
            }
        } header: {
            HStack {
                Text("Personalization Options")
                Spacer()
                Text("\(settings.enabledCount) active")
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.textSecondary)
            }
        } footer: {
            Text("These features use your birth chart to tailor results specifically to you.")
                .font(DSTypography.caption)
                .foregroundStyle(DSColors.textSecondary)
        }
    }

    // MARK: - Coming Soon Section

    private var comingSoonSection: some View {
        let comingSoonModules: [PipelineModule] = settings.modules.filter { $0.status == .comingSoon }

        return Group {
            if !comingSoonModules.isEmpty {
                Section {
                    ForEach(comingSoonModules, id: \.id) { (module: PipelineModule) in
                        HStack(spacing: DSSpacing.md) {
                            VStack(alignment: .leading, spacing: 2) {
                                HStack(spacing: DSSpacing.sm) {
                                    Text(module.name)
                                        .font(DSTypography.body)
                                        .foregroundStyle(DSColors.textSecondary)

                                    Text("Coming Soon")
                                        .font(.system(size: 9, weight: .bold))
                                        .foregroundStyle(.white)
                                        .padding(.horizontal, 5)
                                        .padding(.vertical, 2)
                                        .background(.gray)
                                        .clipShape(Capsule())
                                }

                                Text(module.description)
                                    .font(DSTypography.caption)
                                    .foregroundStyle(DSColors.textSecondary.opacity(0.7))
                                    .lineLimit(2)
                            }
                            Spacer()
                        }
                        .opacity(0.6)
                    }
                } header: {
                    Text("Coming Soon")
                }
            }
        }
    }

    private func moduleRow(_ module: PipelineModule) -> some View {
        HStack(spacing: DSSpacing.md) {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: DSSpacing.sm) {
                    Text(module.name)
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textPrimary)

                    if module.status == .experimental {
                        Text("New")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(.orange)
                            .clipShape(Capsule())
                    }

                    // Info button for technical details
                    Button {
                        selectedModuleInfo = module
                    } label: {
                        Image(systemName: "info.circle")
                            .font(.system(size: 14))
                            .foregroundStyle(DSColors.textSecondary)
                    }
                    .buttonStyle(.plain)
                }

                Text(module.description)
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.textSecondary)
                    .lineLimit(2)

                if module.requiresNatalChart {
                    Label("Uses your birth chart", systemImage: "person.circle")
                        .font(.system(size: 10))
                        .foregroundStyle(DSColors.accentSecondary)
                        .padding(.top, 1)
                }
            }

            Spacer()

            Toggle("", isOn: binding(for: module))
                .labelsHidden()
                .tint(DSColors.primary)
                .disabled(module.status == .comingSoon)
                .onChange(of: binding(for: module).wrappedValue) { _, _ in
                    onRecompute?()
                }
        }
    }

    private func binding(for module: PipelineModule) -> Binding<Bool> {
        switch module.id {
        case "essential_dignity": return $settings.essentialDignity
        case "house_rulership": return $settings.houseRulership
        case "east_west_asymmetry": return $settings.eastWestAsymmetry
        case "retrograde_modifier": return $settings.retrogradeModifier
        case "natal_aspects": return $settings.natalAspects
        case "paran_synergy": return $settings.paranSynergy
        case "timing_factor": return $settings.timingFactor
        case "vedic_mode": return $settings.vedicMode
        default: return .constant(false)
        }
    }

    // MARK: - Planet System Section

    private var planetSystemSection: some View {
        Section {
            ForEach(PlanetSystem.allCases) { system in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        settings.planetSystem = system
                    }
                    onRecompute?()
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(system.rawValue)
                                .font(DSTypography.body)
                                .foregroundStyle(DSColors.textPrimary)
                            Text(system.description)
                                .font(DSTypography.caption)
                                .foregroundStyle(DSColors.textSecondary)
                        }
                        Spacer()
                        if settings.planetSystem == system {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(DSColors.accentPrimary)
                        }
                    }
                }
                .buttonStyle(.plain)
            }

            // Planet toggles (shown for custom, collapsed for presets)
            if settings.planetSystem == .custom {
                ForEach(ScoutPlanet.allCases) { planet in
                    HStack {
                        Text(planet.displayName)
                            .font(DSTypography.body)
                            .foregroundStyle(DSColors.textPrimary)
                        if planet.isTraditional {
                            Text("Traditional")
                                .font(.system(size: 9, weight: .medium))
                                .foregroundStyle(DSColors.textSecondary)
                                .padding(.horizontal, 4)
                                .padding(.vertical, 1)
                                .background(DSColors.surfaceTinted)
                                .clipShape(Capsule())
                        }
                        Spacer()
                        Toggle("", isOn: Binding(
                            get: { settings.isPlanetIncluded(planet) },
                            set: { _ in
                                settings.togglePlanet(planet)
                                onRecompute?()
                            }
                        ))
                        .labelsHidden()
                        .tint(DSColors.primary)
                    }
                }
            }
        } header: {
            Text("Astrological Tradition")
        } footer: {
            Text("\(settings.activePlanetCount) of \(ScoutPlanet.allCases.count) planets active")
                .font(DSTypography.caption)
                .foregroundStyle(DSColors.textSecondary)
        }
    }

    // MARK: - Ayanamsa Section

    private var ayanamsaSection: some View {
        Section {
            ForEach(AyanamsaSystem.allCases) { system in
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        settings.ayanamsaSystem = system
                    }
                    onRecompute?()
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(system.rawValue)
                                .font(DSTypography.body)
                                .foregroundStyle(DSColors.textPrimary)
                            Text(system.description)
                                .font(DSTypography.caption)
                                .foregroundStyle(DSColors.textSecondary)
                        }
                        Spacer()
                        if settings.ayanamsaSystem == system {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundStyle(DSColors.accentPrimary)
                        }
                    }
                }
                .buttonStyle(.plain)
            }
        } header: {
            Text("Vedic Calculation")
        } footer: {
            Text("The sidereal offset used for Vedic calculations.")
                .font(DSTypography.caption)
                .foregroundStyle(DSColors.textSecondary)
        }
    }

    // MARK: - Preference Sliders Section

    private var preferenceSlidersSection: some View {
        Section {
            // Adventure Factor
            VStack(alignment: .leading, spacing: DSSpacing.sm) {
                HStack {
                    Text("Stability vs Adventure")
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textPrimary)
                    Spacer()
                    Text(adventureLabel)
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                }
                Slider(
                    value: $settings.adventureFactor,
                    in: 0.7...1.3,
                    step: 0.05
                )
                .tint(DSColors.primary)
                .onChange(of: settings.adventureFactor) { _, _ in
                    onRecompute?()
                }
                Text("Move toward Adventure to favor locations with transformative energies (Uranus, Neptune, Pluto).")
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.textSecondary)
            }

            // Material Factor
            VStack(alignment: .leading, spacing: DSSpacing.sm) {
                HStack {
                    Text("Material vs Spiritual")
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textPrimary)
                    Spacer()
                    Text(materialLabel)
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                }
                Slider(
                    value: $settings.materialFactor,
                    in: 0.7...1.3,
                    step: 0.05
                )
                .tint(DSColors.primary)
                .onChange(of: settings.materialFactor) { _, _ in
                    onRecompute?()
                }
                Text("Move toward Material to emphasize success and luxury (Venus, Sun). Move toward Spiritual to emphasize wisdom and growth (Jupiter, Neptune).")
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.textSecondary)
            }

            // Stability Preference
            VStack(alignment: .leading, spacing: DSSpacing.sm) {
                HStack {
                    Text("Volatility Tolerance")
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textPrimary)
                    Spacer()
                    Text(stabilityLabel)
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                }
                Slider(
                    value: $settings.stabilityPreference,
                    in: 0.7...1.3,
                    step: 0.05
                )
                .tint(DSColors.primary)
                .onChange(of: settings.stabilityPreference) { _, _ in
                    onRecompute?()
                }
                Text("Higher tolerance accepts locations with mixed energies. Lower tolerance penalizes conflicting influences more heavily.")
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.textSecondary)
            }
        } header: {
            Text("Your Preferences")
        } footer: {
            Text("Adjust these sliders to reflect what matters most to you. Center position is neutral.")
                .font(DSTypography.caption)
                .foregroundStyle(DSColors.textSecondary)
        }
    }

    private var adventureLabel: String {
        let v = settings.adventureFactor
        if v < 0.85 { return "Stability" }
        if v > 1.15 { return "Adventure" }
        return "Balanced"
    }

    private var materialLabel: String {
        let v = settings.materialFactor
        if v < 0.85 { return "Spiritual" }
        if v > 1.15 { return "Material" }
        return "Balanced"
    }

    private var stabilityLabel: String {
        let v = settings.stabilityPreference
        if v < 0.85 { return "Strict" }
        if v > 1.15 { return "Tolerant" }
        return "Balanced"
    }

    // MARK: - Tarabala Section

    private var tarabalaSection: some View {
        Section {
            // Toggle
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    HStack(spacing: DSSpacing.sm) {
                        Text("Tarabala Filter")
                            .font(DSTypography.body)
                            .foregroundStyle(DSColors.textPrimary)
                        Text("Vedic")
                            .font(.system(size: 9, weight: .bold))
                            .foregroundStyle(.white)
                            .padding(.horizontal, 5)
                            .padding(.vertical, 2)
                            .background(.purple)
                            .clipShape(Capsule())
                    }
                    Text("Post-process results using Vedic Tarabala (star compatibility) analysis.")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                }
                Spacer()
                Toggle("", isOn: $settings.tarabalaFilterEnabled)
                    .labelsHidden()
                    .tint(DSColors.primary)
                    .onChange(of: settings.tarabalaFilterEnabled) { _, _ in
                        onRecompute?()
                    }
            }

            // Mode picker (only shown when enabled)
            if settings.tarabalaFilterEnabled {
                ForEach(TarabalaFilterMode.allCases) { mode in
                    Button {
                        withAnimation(.easeInOut(duration: 0.2)) {
                            settings.tarabalaFilterMode = mode
                        }
                        onRecompute?()
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(mode.rawValue)
                                    .font(DSTypography.body)
                                    .foregroundStyle(DSColors.textPrimary)
                                Text(mode.description)
                                    .font(DSTypography.caption)
                                    .foregroundStyle(DSColors.textSecondary)
                            }
                            Spacer()
                            if settings.tarabalaFilterMode == mode {
                                Image(systemName: "checkmark.circle.fill")
                                    .foregroundStyle(DSColors.accentPrimary)
                            }
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        } header: {
            Text("Vedic Post-Processing")
        } footer: {
            Text("Tarabala filters results based on the compatibility between your birth nakshatra and each location's stellar influence.")
                .font(DSTypography.caption)
                .foregroundStyle(DSColors.textSecondary)
        }
    }

    // MARK: - Advanced Section

    private var advancedSection: some View {
        Section {
            // Aspect lines toggle
            HStack {
                VStack(alignment: .leading, spacing: 2) {
                    Text("Include Aspect Lines")
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textPrimary)
                    Text("Consider conjunctions, trines, and other aspects in scoring.")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                }
                Spacer()
                Toggle("", isOn: $settings.aspectLinesEnabled)
                    .labelsHidden()
                    .tint(DSColors.primary)
                    .onChange(of: settings.aspectLinesEnabled) { _, _ in
                        onRecompute?()
                    }
            }

            // Node drishti scheme (shown when Vedic + natal aspects active)
            if settings.vedicMode && settings.natalAspects {
                VStack(alignment: .leading, spacing: DSSpacing.sm) {
                    Text("Node Aspects (Rahu/Ketu)")
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textPrimary)
                    ForEach(NodeDrishtiScheme.allCases) { scheme in
                        Button {
                            withAnimation(.easeInOut(duration: 0.2)) {
                                settings.nodeDrishtiScheme = scheme
                            }
                            onRecompute?()
                        } label: {
                            HStack {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(scheme.rawValue)
                                        .font(DSTypography.body)
                                        .foregroundStyle(DSColors.textPrimary)
                                    Text(scheme.description)
                                        .font(DSTypography.caption)
                                        .foregroundStyle(DSColors.textSecondary)
                                }
                                Spacer()
                                if settings.nodeDrishtiScheme == scheme {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundStyle(DSColors.accentPrimary)
                                }
                            }
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        } header: {
            Text("Advanced")
        }
    }

    // MARK: - Info Section

    private var infoSection: some View {
        Section {
            VStack(alignment: .leading, spacing: DSSpacing.sm) {
                Label("How It Works", systemImage: "info.circle")
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textPrimary)

                Text("Each option adds personalization based on your unique birth chart. Enable more options for deeper personalization, or keep it simple with the defaults.")
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.textSecondary)
            }
        } header: {
            Text("About")
        }
    }
}
