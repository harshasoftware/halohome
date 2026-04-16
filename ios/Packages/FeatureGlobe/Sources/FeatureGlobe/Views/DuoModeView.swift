import SwiftUI
import DesignSystem
import Core

/// Main view for Duo (compatibility) mode
/// Shows two-person card UI and compatibility controls
public struct DuoModeView: View {

    // MARK: - Properties

    @Bindable public var viewModel: DuoViewModel

    /// Saved charts available for quick selection as partner
    public var savedCharts: [SavedChartInfo]

    /// Callback when user taps on a location
    public var onLocationTap: ((CompatibleLocation) -> Void)?

    /// Callback when user wants to see city info
    public var onLocationInfoTap: ((CompatibleLocation) -> Void)?

    /// Callback when user needs to add their birth chart
    public var onAddUserChart: (() -> Void)?

    /// Callback when user tries to enable duo mode — return true to allow, false to block (e.g. show paywall)
    public var onEnableAttempt: ((@escaping () -> Void) -> Void)?

    // MARK: - Private State

    @State private var showModeSelector = false
    @State private var userAvatarImage: UIImage?
    @State private var partnerAvatarImage: UIImage?
    @State private var chartAvatars: [String: UIImage] = [:]  // chartId -> avatar

    // MARK: - Initialization

    public init(
        viewModel: DuoViewModel,
        savedCharts: [SavedChartInfo] = [],
        onLocationTap: ((CompatibleLocation) -> Void)? = nil,
        onLocationInfoTap: ((CompatibleLocation) -> Void)? = nil,
        onAddUserChart: (() -> Void)? = nil,
        onEnableAttempt: ((@escaping () -> Void) -> Void)? = nil
    ) {
        self.viewModel = viewModel
        self.savedCharts = savedCharts
        self.onLocationTap = onLocationTap
        self.onLocationInfoTap = onLocationInfoTap
        self.onAddUserChart = onAddUserChart
        self.onEnableAttempt = onEnableAttempt
    }

    // MARK: - Body

    public var body: some View {
        VStack(spacing: 0) {
            // Two-person card header (includes mode selector)
            duoHeaderCard
                .padding(.horizontal, DSSpacing.lg)
                .padding(.top, DSSpacing.sm)

            // Results or empty state
            resultsContent
        }
        .sheet(isPresented: $viewModel.showPartnerSheet) {
            PartnerChartSheet(viewModel: viewModel)
        }
        .task(id: viewModel.userAvatarIdentifier) {
            await loadUserAvatar()
        }
        .task(id: viewModel.partnerChart?.id) {
            await loadPartnerAvatar()
        }
        .task(id: savedCharts.map(\.id).joined()) {
            await loadChartAvatars()
        }
    }

    // MARK: - Avatar Loading

    private func loadUserAvatar() async {
        guard let identifier = viewModel.userAvatarIdentifier else {
            userAvatarImage = nil
            return
        }
        userAvatarImage = await AvatarLoader.shared.loadAvatar(for: identifier)
    }

    private func loadPartnerAvatar() async {
        guard let partner = viewModel.partnerChart else {
            partnerAvatarImage = nil
            return
        }
        let identifier = partnerAvatarIdentifier(for: partner)
        partnerAvatarImage = await AvatarLoader.shared.loadAvatar(for: identifier)
    }

    private func partnerAvatarIdentifier(for partner: PartnerChartData) -> String {
        let dateString = partner.birthDate.formatted(.iso8601)
        let locationString = "\(partner.birthLocation.latitude),\(partner.birthLocation.longitude)"
        return "\(partner.name)-\(dateString)-\(locationString)"
    }

    private func chartAvatarIdentifier(for chart: SavedChartInfo) -> String {
        let dateString = chart.birthDate.formatted(.iso8601)
        let locationString = "\(chart.birthLocation.latitude),\(chart.birthLocation.longitude)"
        return "\(chart.name)-\(dateString)-\(locationString)"
    }

    private func loadChartAvatars() async {
        for chart in savedCharts {
            let identifier = chartAvatarIdentifier(for: chart)
            if chartAvatars[chart.id] == nil {
                let avatar = await AvatarLoader.shared.loadAvatar(for: identifier)
                chartAvatars[chart.id] = avatar
            }
        }
    }

    /// Menu label with tapback avatar for saved chart
    @ViewBuilder
    private func chartMenuLabel(for chart: SavedChartInfo) -> some View {
        if let avatar = chartAvatars[chart.id] {
            Label {
                Text(chart.name)
            } icon: {
                Image(uiImage: avatar)
                    .resizable()
                    .aspectRatio(contentMode: .fill)
                    .frame(width: 24, height: 24)
                    .clipShape(Circle())
            }
        } else {
            Label(chart.name, systemImage: "person.circle.fill")
        }
    }

    // MARK: - Duo Header Card

    private var duoHeaderCard: some View {
        SAICard(style: .elevated) {
            VStack(spacing: DSSpacing.md) {
                // Two person cards side by side
                HStack(spacing: DSSpacing.lg) {
                    // User card - show add button if no chart selected
                    if viewModel.hasUserChart {
                        personCard(
                            name: viewModel.userName,
                            color: DSColors.accentPrimary,
                            isUser: true,
                            avatarImage: userAvatarImage
                        )
                    } else {
                        addUserButton
                    }

                    // Mode connector icon (changes based on selected mode)
                    ZStack {
                        Circle()
                            .fill(viewModel.mode.accentColor.opacity(0.1))
                            .frame(width: 40, height: 40)

                        Image(systemName: viewModel.mode.icon)
                            .font(.system(size: 16, weight: .medium))
                            .foregroundStyle(viewModel.mode.accentColor)
                    }

                    // Partner card with dropdown menu
                    if let partner = viewModel.partnerChart {
                        Menu {
                            // Saved charts section
                            if !savedCharts.isEmpty {
                                Section("My Charts") {
                                    ForEach(savedCharts) { chart in
                                        Button {
                                            selectSavedChart(chart)
                                        } label: {
                                            chartMenuLabel(for: chart)
                                        }
                                    }
                                }
                            }

                            Section {
                                Button {
                                    viewModel.openPartnerSheet()
                                } label: {
                                    Label("Add New Partner", systemImage: "person.badge.plus")
                                }
                            }
                        } label: {
                            personCard(
                                name: partner.name,
                                color: .pink,
                                isUser: false,
                                avatarImage: partnerAvatarImage
                            )
                        }
                    } else {
                        // No partner - show menu to select from saved charts or add new
                        if savedCharts.isEmpty {
                            addPartnerButton
                        } else {
                            Menu {
                                Section("My Charts") {
                                    ForEach(savedCharts) { chart in
                                        Button {
                                            selectSavedChart(chart)
                                        } label: {
                                            chartMenuLabel(for: chart)
                                        }
                                    }
                                }

                                Section {
                                    Button {
                                        viewModel.openPartnerSheet()
                                    } label: {
                                        Label("Add New Partner", systemImage: "person.badge.plus")
                                    }
                                }
                            } label: {
                                addPartnerButtonLabel
                            }
                        }
                    }
                }
                .padding(.horizontal, DSSpacing.md)
                .padding(.vertical, DSSpacing.sm)

                // Toggle, mode selector, and actions row
                HStack {
                    // Duo mode toggle — gated by onEnableAttempt when turning on
                    Toggle(isOn: Binding(
                        get: { viewModel.isEnabled },
                        set: { newValue in
                            if newValue {
                                if let onEnableAttempt {
                                    // Let the caller check access (e.g. paywall) before enabling
                                    onEnableAttempt {
                                        viewModel.isEnabled = true
                                    }
                                } else {
                                    viewModel.isEnabled = true
                                }
                            } else {
                                viewModel.isEnabled = false
                            }
                        }
                    )) {
                        HStack(spacing: DSSpacing.sm) {
                            Image(systemName: "person.2.fill")
                                .font(.system(size: 14, weight: .medium))
                                .foregroundStyle(.pink)

                            Text("Duo Mode")
                                .font(DSTypography.body)
                                .foregroundStyle(DSColors.textPrimary)
                        }
                    }
                    .toggleStyle(.switch)
                    .tint(.pink)

                    Spacer()

                    // Mode selector (compact)
                    Menu {
                        ForEach(CompatibilityMode.allCases) { mode in
                            Button {
                                Haptics.tap()
                                viewModel.setMode(mode)
                            } label: {
                                Label(mode.displayName, systemImage: mode.icon)
                            }
                        }
                    } label: {
                        HStack(spacing: 4) {
                            Image(systemName: viewModel.mode.icon)
                                .font(.system(size: 12))
                                .foregroundStyle(viewModel.mode.accentColor)

                            Text(viewModel.mode.displayName)
                                .font(.system(size: 13, weight: .medium))
                                .foregroundStyle(DSColors.textPrimary)

                            Image(systemName: "chevron.down")
                                .font(.system(size: 10))
                                .foregroundStyle(DSColors.textSecondary)
                        }
                        .padding(.horizontal, DSSpacing.sm)
                        .padding(.vertical, 6)
                        .background(DSColors.surface)
                        .clipShape(Capsule())
                    }

                    // Clear partner button
                    if viewModel.hasPartner {
                        Button {
                            Haptics.tap()
                            viewModel.clearPartner()
                        } label: {
                            Image(systemName: "xmark.circle.fill")
                                .font(.system(size: 20))
                                .foregroundStyle(DSColors.textSecondary)
                        }
                        .accessibilityLabel("Clear partner")
                    }
                }
                .padding(.horizontal, DSSpacing.md)
                .padding(.bottom, DSSpacing.sm)
            }
            .padding(DSSpacing.md)
        }
    }

    // MARK: - Person Card

    private func personCard(name: String, color: Color, isUser: Bool, avatarImage: UIImage?) -> some View {
        VStack(spacing: DSSpacing.sm) {
            // Avatar
            ZStack {
                if let image = avatarImage {
                    Image(uiImage: image)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(width: 48, height: 48)
                        .clipShape(Circle())
                } else {
                    Circle()
                        .fill(color.opacity(0.15))
                        .frame(width: 48, height: 48)

                    Text(String(name.prefix(1)).uppercased())
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(color)
                }
            }

            // Name
            Text(name)
                .font(DSTypography.caption)
                .foregroundStyle(DSColors.textPrimary)
                .lineLimit(1)

            // Role indicator
            Text(isUser ? "You" : "Partner")
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(DSColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }

    // MARK: - Add User Button

    private var addUserButton: some View {
        Button {
            Haptics.tap()
            onAddUserChart?()
        } label: {
            VStack(spacing: DSSpacing.sm) {
                ZStack {
                    Circle()
                        .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [5]))
                        .foregroundStyle(DSColors.accentPrimary.opacity(0.5))
                        .frame(width: 48, height: 48)

                    Image(systemName: "plus")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(DSColors.accentPrimary)
                }

                Text("Add You")
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.accentPrimary)

                Text("Tap to add")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(DSColors.textSecondary)
            }
            .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Add Partner Button

    private var addPartnerButton: some View {
        Button {
            Haptics.tap()
            viewModel.openPartnerSheet()
        } label: {
            VStack(spacing: DSSpacing.sm) {
                ZStack {
                    Circle()
                        .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [5]))
                        .foregroundStyle(.pink.opacity(0.5))
                        .frame(width: 48, height: 48)

                    Image(systemName: "plus")
                        .font(.system(size: 20, weight: .medium))
                        .foregroundStyle(.pink)
                }

                Text("Add Partner")
                    .font(DSTypography.caption)
                    .foregroundStyle(.pink)

                Text("Tap to add")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(DSColors.textSecondary)
            }
            .frame(maxWidth: .infinity)
        }
    }

    /// Label-only version for menu
    private var addPartnerButtonLabel: some View {
        VStack(spacing: DSSpacing.sm) {
            ZStack {
                Circle()
                    .strokeBorder(style: StrokeStyle(lineWidth: 2, dash: [5]))
                    .foregroundStyle(.pink.opacity(0.5))
                    .frame(width: 48, height: 48)

                Image(systemName: "plus")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(.pink)
            }

            Text("Add Partner")
                .font(DSTypography.caption)
                .foregroundStyle(.pink)

            Text("Tap to select")
                .font(.system(size: 10, weight: .medium))
                .foregroundStyle(DSColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
    }

    /// Select a saved chart as partner
    private func selectSavedChart(_ chart: SavedChartInfo) {
        Haptics.tap()
        let partner = PartnerChartData(
            name: chart.name,
            birthDate: chart.birthDate,
            birthTime: chart.birthTime,
            birthLocation: chart.birthLocation,
            cityName: chart.cityName,
            isSaved: true
        )
        viewModel.setPartnerChart(partner)
        // Gate enable on subscription check — same as the toggle
        if let onEnableAttempt {
            onEnableAttempt {
                viewModel.enable()
            }
        } else {
            viewModel.enable()
        }
    }

    // MARK: - Results Content

    @ViewBuilder
    private var resultsContent: some View {
        if viewModel.isCalculating {
            loadingView
        } else if let analysis = viewModel.analysis {
            CompatibilityResultsView(
                analysis: analysis,
                mode: viewModel.mode,
                person1Name: viewModel.userName,
                person2Name: viewModel.partnerName,
                onLocationTap: onLocationTap,
                onLocationInfoTap: onLocationInfoTap
            )
        } else if !viewModel.isEnabled {
            disabledStateView
        } else if !viewModel.hasUserChart {
            noUserChartView
        } else if !viewModel.hasPartner {
            noPartnerView
        } else {
            // Partner is set but still computing - show loading
            loadingView
        }
    }

    // MARK: - State Views

    private var loadingView: some View {
        VStack(spacing: DSSpacing.lg) {
            Spacer()

            ProgressView()
                .scaleEffect(1.5)

            Text("Finding compatible destinations...")
                .font(DSTypography.body)
                .foregroundStyle(DSColors.textSecondary)

            Spacer()
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DSSpacing.xl)
    }

    private var disabledStateView: some View {
        VStack(spacing: DSSpacing.lg) {
            Spacer()

            Image(systemName: "person.2")
                .font(.system(size: 48, weight: .light))
                .foregroundStyle(DSColors.textSecondary)

            VStack(spacing: DSSpacing.sm) {
                Text("Duo Mode Disabled")
                    .font(DSTypography.titleM)
                    .foregroundStyle(DSColors.textPrimary)

                Text("Enable Duo Mode to find destinations where both of you thrive")
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, DSSpacing.xl)
            }

            Spacer()
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DSSpacing.xl)
    }

    private var noUserChartView: some View {
        VStack(spacing: DSSpacing.lg) {
            Spacer()

            Image(systemName: "person.crop.circle.badge.plus")
                .font(.system(size: 48, weight: .light))
                .foregroundStyle(DSColors.accentPrimary)

            VStack(spacing: DSSpacing.sm) {
                Text("Add Your Birth Chart")
                    .font(DSTypography.titleM)
                    .foregroundStyle(DSColors.textPrimary)

                Text("Enter your birth data first to use Duo Mode and find compatible destinations")
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, DSSpacing.xl)
            }

            SAIButton("Add Birth Data", style: .primary) {
                onAddUserChart?()
            }
            .padding(.horizontal, DSSpacing.xl)

            Spacer()
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DSSpacing.xl)
    }

    private var noPartnerView: some View {
        VStack(spacing: DSSpacing.lg) {
            Spacer()

            Image(systemName: "person.badge.plus")
                .font(.system(size: 48, weight: .light))
                .foregroundStyle(.pink)

            VStack(spacing: DSSpacing.sm) {
                Text("Add a Partner")
                    .font(DSTypography.titleM)
                    .foregroundStyle(DSColors.textPrimary)

                Text("Add your partner's birth data to find your ideal destinations together")
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, DSSpacing.xl)
            }

            SAIButton("Add Partner", style: .primary) {
                viewModel.openPartnerSheet()
            }
            .padding(.horizontal, DSSpacing.xl)

            Spacer()
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DSSpacing.xl)
    }

}

// MARK: - Preview

#Preview("Duo Mode View") {
    DuoModeView(viewModel: .preview)
        .preferredColorScheme(.dark)
}

#Preview("Duo Mode - No Partner") {
    DuoModeView(viewModel: DuoViewModel())
        .preferredColorScheme(.dark)
}
