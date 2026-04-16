import SwiftUI
import DesignSystem

/// Main Scout view for location ranking
public struct ScoutView: View {

    @Bindable private var viewModel: ScoutViewModel
    private let onLocationTap: ((ScoutLocation) -> Void)?
    private let onResultsReady: (([ScoutLocation]) -> Void)?
    private let isSubscribed: Bool
    private let onUpgradeTap: (() -> Void)?

    /// Tracks whether we've already auto-started computing to prevent redundant .task executions
    @State private var hasAutoStarted = false

    public init(
        viewModel: ScoutViewModel,
        isSubscribed: Bool = true,
        onLocationTap: ((ScoutLocation) -> Void)? = nil,
        onResultsReady: (([ScoutLocation]) -> Void)? = nil,
        onUpgradeTap: (() -> Void)? = nil
    ) {
        self.viewModel = viewModel
        self.isSubscribed = isSubscribed
        self.onLocationTap = onLocationTap
        self.onResultsReady = onResultsReady
        self.onUpgradeTap = onUpgradeTap
    }

    public var body: some View {
        VStack(spacing: 0) {
            // Category selector
            ScoutCategoryPicker(
                selectedCategory: $viewModel.selectedCategory,
                onCategorySelected: { category in
                    viewModel.selectCategory(category)
                }
            )
            .padding(.horizontal, DSSpacing.md)
            .padding(.top, DSSpacing.sm)

            // Filter and view mode controls
            filterControls
                .padding(.horizontal, DSSpacing.md)
                .padding(.vertical, DSSpacing.sm)

            Divider()
                .foregroundStyle(DSColors.borderHairline)

            // Content
            if !viewModel.isChartConfigured {
                noChartState
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .transition(.opacity)
            } else if viewModel.isComputing {
                ScoutProgressView(progress: viewModel.progress) {
                    viewModel.cancelComputing()
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .transition(.acScaleFade)
            } else if let error = viewModel.errorMessage {
                errorView(error)
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .transition(.acScaleFade)
            } else if viewModel.hasResults && !isSubscribed {
                // Show locked state — results computed but need Pro to view
                lockedResultsView
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .transition(.acScaleFade)
            } else if viewModel.hasResults {
                resultsList
                    .transition(.acSlideFromBottom)
            } else {
                emptyState
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                    .transition(.opacity)
            }
        }
        .animation(.acSmooth, value: viewModel.isComputing)
        .background(DSColors.background)
        .task {
            // Auto-start computing if no results yet and haven't already auto-started.
            // Skip if no birth chart is configured — UI already shows the no-chart state.
            guard !hasAutoStarted, viewModel.isChartConfigured else { return }
            if !viewModel.hasResults && !viewModel.isComputing {
                hasAutoStarted = true
                await viewModel.startComputing()
            }
        }
        .onChange(of: viewModel.isChartConfigured) { _, isConfigured in
            // When a birth chart is configured for the first time (or after reset),
            // auto-trigger computation so results appear without user intervention.
            if isConfigured && !viewModel.hasResults && !viewModel.isComputing {
                hasAutoStarted = true
                Task { await viewModel.startComputing() }
            }
        }
        .onChange(of: viewModel.results) { oldResults, newResults in
            // Only update markers if results actually changed (not just view refresh)
            // Compare by count and first/last IDs to detect meaningful changes
            let oldIds = oldResults.prefix(5).map(\.id)
            let newIds = newResults.prefix(5).map(\.id)
            let meaningfulChange = oldResults.count != newResults.count || oldIds != newIds

            if !newResults.isEmpty && meaningfulChange {
                onResultsReady?(Array(newResults.prefix(200)))
            }
        }
        .sheet(isPresented: $viewModel.showPipelineSettings) {
            ScoutPipelineSettingsView(
                settings: viewModel.pipelineSettings,
                onRecompute: {
                    Task {
                        await viewModel.startComputing()
                    }
                }
            )
            .presentationDetents([.large])
        }
    }

    // MARK: - Filter Controls

    private var filterControls: some View {
        VStack(spacing: DSSpacing.sm) {
            HStack(spacing: DSSpacing.md) {
                // Filter mode picker
                Picker("Filter", selection: $viewModel.filterMode) {
                    ForEach(ScoutViewModel.FilterMode.allCases) { mode in
                        Label(mode.label, systemImage: mode.iconName)
                            .tag(mode)
                    }
                }
                .pickerStyle(.segmented)
                .accessibilityHint("Select how to filter scout results")
                .onChange(of: viewModel.filterMode) { _, newValue in
                    viewModel.setFilter(newValue)
                }

                // Population tier menu
                Menu {
                    ForEach(PopulationTier.allCases) { tier in
                        Button {
                            viewModel.populationTier = tier
                            Task {
                                await viewModel.startComputing()
                            }
                        } label: {
                            HStack {
                                Text(tier.label)
                                Spacer()
                                Text(tier.approximateCities)
                                    .foregroundStyle(.secondary)
                            }
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        Image(systemName: "person.3.fill")
                            .font(.system(size: 12))
                        Text(viewModel.populationTier.label)
                            .font(.system(size: 12, weight: .medium))
                    }
                    .foregroundStyle(DSColors.accentPrimary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(DSColors.surfaceTinted)
                    .clipShape(.rect(cornerRadius: DSRadius.sm))
                }
                .accessibilityLabel("Population filter: \(viewModel.populationTier.label)")
                .accessibilityHint("Filter cities by population size")

                // Country filter menu
                Menu {
                    Button {
                        viewModel.selectedCountryCode = nil
                        Task {
                            await viewModel.startComputing()
                        }
                    } label: {
                        Label("All Countries", systemImage: viewModel.selectedCountryCode == nil ? "checkmark.circle.fill" : "globe")
                    }

                    Divider()

                    ForEach(viewModel.availableCountries, id: \.code) { country in
                        Button {
                            viewModel.selectedCountryCode = country.code
                            Task {
                                await viewModel.startComputing()
                            }
                        } label: {
                            Text("\(countryFlag(for: country.code)) \(country.name) (\(country.count))")
                        }
                    }
                } label: {
                    HStack(spacing: 4) {
                        if let code = viewModel.selectedCountryCode {
                            Text(countryFlag(for: code))
                                .font(.system(size: 14))
                            Text(Locale.current.localizedString(forRegionCode: code) ?? code)
                                .font(.system(size: 12, weight: .medium))
                                .lineLimit(1)
                        } else {
                            Image(systemName: "globe")
                                .font(.system(size: 12))
                            Text("All")
                                .font(.system(size: 12, weight: .medium))
                        }
                    }
                    .foregroundStyle(viewModel.selectedCountryCode != nil ? .white : DSColors.accentPrimary)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(viewModel.selectedCountryCode != nil ? DSColors.accentPrimary : DSColors.surfaceTinted)
                    .clipShape(.rect(cornerRadius: DSRadius.sm))
                }
                .accessibilityLabel("Country filter: \(viewModel.selectedCountryCode ?? "All")")
                .accessibilityHint("Filter cities by country")

                // View mode toggle
                Menu {
                    ForEach(ScoutViewModel.ViewMode.allCases) { mode in
                        Button {
                            viewModel.viewMode = mode
                        } label: {
                            Label(mode.label, systemImage: mode.iconName)
                        }
                    }
                } label: {
                    Image(systemName: viewModel.viewMode.iconName)
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(DSColors.accentPrimary)
                        .frame(width: 32, height: 32)
                        .background(DSColors.surfaceTinted)
                        .clipShape(.rect(cornerRadius: DSRadius.sm))
                }
                .accessibilityLabel("View mode")
                .accessibilityHint("Change how results are displayed")
            }
        }
    }

    /// Convert ISO country code to flag emoji
    private func countryFlag(for code: String) -> String {
        let upper = code.uppercased()
        guard upper.count == 2,
              upper.unicodeScalars.allSatisfy({ $0.value >= 65 && $0.value <= 90 }) else { return "" }
        var flag = ""
        upper.unicodeScalars.forEach { scalar in
            if let s = Unicode.Scalar(127397 + scalar.value) {
                flag.unicodeScalars.append(s)
            }
        }
        return flag
    }

    // MARK: - Results List

    private var resultsList: some View {
        ScrollView {
            LazyVStack(spacing: DSSpacing.md) {
                // Results summary
                resultsSummary
                    .padding(.bottom, DSSpacing.sm)

                if viewModel.viewMode == .byCountry {
                    byCountryList
                } else {
                    rankedList
                }
            }
            .padding(.horizontal, DSSpacing.md)
            .padding(.vertical, DSSpacing.md)
        }
    }

    private var rankedList: some View {
        ForEach(Array(viewModel.results.enumerated()), id: \.element.id) { index, location in
            ScoutResultCard(
                location: location,
                rank: index + 1,
                category: viewModel.selectedCategory
            )
            .acStaggeredReveal(index: min(index, 10))
            .onTapGesture {
                onLocationTap?(location)
            }
        }
    }

    private var byCountryList: some View {
        ForEach(viewModel.groupedByCountry, id: \.countryCode) { group in
            ScoutCountrySection(
                group: group,
                category: viewModel.selectedCategory,
                onLocationTap: onLocationTap
            )
        }
    }

    private var resultsSummary: some View {
        HStack(spacing: DSSpacing.md) {
            // Show total cities scored
            if viewModel.totalCitiesScored > 0 {
                if let code = viewModel.selectedCountryCode {
                    Text("Top \(viewModel.results.count) of \(viewModel.totalCitiesScored.formatted()) in \(Locale.current.localizedString(forRegionCode: code) ?? code)")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                } else {
                    Text("Top \(viewModel.results.count) of \(viewModel.totalCitiesScored.formatted()) cities")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                }
            }

            // For specific categories, show beneficial/challenging counts
            if viewModel.selectedCategory != .overall,
               let result = viewModel.categoryResults[viewModel.selectedCategory] {
                if result.totalBeneficial > 0 {
                    Label("\(result.totalBeneficial)", systemImage: "arrow.up.right")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.success)
                }

                if result.totalChallenging > 0 {
                    Label("\(result.totalChallenging)", systemImage: "arrow.down.right")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.danger)
                }
            }

            Spacer()
        }
    }

    // MARK: - No Chart State

    private var noChartState: some View {
        VStack(spacing: DSSpacing.lg) {
            Image(systemName: "person.crop.circle.badge.plus")
                .font(.system(size: 48))
                .foregroundStyle(DSColors.textSecondary.opacity(0.5))
                .accessibilityHidden(true)

            Text("No Birth Chart Selected")
                .font(DSTypography.titleM)
                .foregroundStyle(DSColors.textPrimary)

            Text("Add or select a birth chart to find your ideal locations worldwide.")
                .font(DSTypography.body)
                .foregroundStyle(DSColors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DSSpacing.xl)
        }
        .padding(DSSpacing.xl)
        .accessibilityElement(children: .contain)
        .accessibilityLabel("No birth chart selected. Add or select a birth chart to find your ideal locations worldwide.")
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: DSSpacing.lg) {
            Image(systemName: "sparkles")
                .font(.system(size: 48))
                .foregroundStyle(DSColors.accentPrimary)
                .accessibilityHidden(true)

            Text("Preparing Scout")
                .font(DSTypography.titleM)
                .foregroundStyle(DSColors.textPrimary)

            Text("Analyzing locations for \(viewModel.selectedCategory.label.lowercased())...")
                .font(DSTypography.body)
                .foregroundStyle(DSColors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DSSpacing.xl)

            ProgressView()
                .scaleEffect(1.2)
                .padding(.top, DSSpacing.md)
        }
        .padding(DSSpacing.xl)
        .accessibilityElement(children: .contain)
    }

    // MARK: - Locked Results (Pro required)

    private var lockedResultsView: some View {
        VStack(spacing: DSSpacing.lg) {
            // Show a teaser of what was found
            VStack(spacing: DSSpacing.sm) {
                Image(systemName: "lock.circle.fill")
                    .font(.system(size: 52))
                    .foregroundStyle(DSColors.accentPrimary)

                Text("Best Cities Found!")
                    .font(DSTypography.titleM)
                    .foregroundStyle(DSColors.textPrimary)

                let total = viewModel.categoryResults.values.first?.locations.count ?? 0

                Text("We scored \(total) cities and found your top 200 locations.")
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, DSSpacing.xl)
            }

            // Blurred preview hint
            VStack(spacing: DSSpacing.sm) {
                ForEach(0..<3, id: \.self) { i in
                    HStack {
                        Text("\(i + 1).")
                            .font(.system(size: 14, weight: .bold, design: .monospaced))
                            .foregroundStyle(DSColors.accentPrimary)
                            .frame(width: 24)
                        RoundedRectangle(cornerRadius: 4)
                            .fill(DSColors.textSecondary.opacity(0.15))
                            .frame(height: 16)
                            .frame(maxWidth: .infinity)
                    }
                    .padding(.horizontal, DSSpacing.xl)
                }
            }
            .blur(radius: 4)
            .padding(.vertical, DSSpacing.sm)

            // Upgrade CTA
            Button {
                onUpgradeTap?()
            } label: {
                HStack(spacing: 8) {
                    Image(systemName: "star.fill")
                        .font(.system(size: 14))
                    Text("Unlock with Pro")
                        .font(.system(size: 16, weight: .semibold))
                }
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .frame(height: 48)
                .background(DSColors.accentPrimary)
                .clipShape(RoundedRectangle(cornerRadius: 14))
            }
            .padding(.horizontal, DSSpacing.xl)

            Text("Subscribe to see your personalized city rankings")
                .font(DSTypography.caption)
                .foregroundStyle(DSColors.textSecondary)
        }
        .padding(DSSpacing.xl)
    }

    // MARK: - Error View

    private func errorView(_ message: String) -> some View {
        VStack(spacing: DSSpacing.lg) {
            Image(systemName: "exclamationmark.triangle")
                .font(.system(size: 48))
                .foregroundStyle(DSColors.danger)
                .accessibilityHidden(true)

            Text("Something Went Wrong")
                .font(DSTypography.titleM)
                .foregroundStyle(DSColors.textPrimary)

            Text(message)
                .font(DSTypography.body)
                .foregroundStyle(DSColors.textSecondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DSSpacing.xl)

            SAIButton(
                "Try Again",
                style: .primary,
                icon: Image(systemName: "arrow.clockwise")
            ) {
                Task {
                    await viewModel.startComputing()
                }
            }
            .padding(.top, DSSpacing.md)
        }
        .padding(DSSpacing.xl)
        .accessibilityElement(children: .contain)
    }
}
