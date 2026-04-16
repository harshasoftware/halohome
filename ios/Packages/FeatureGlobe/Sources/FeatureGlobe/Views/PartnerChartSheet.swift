import SwiftUI
import DesignSystem

/// Sheet for adding or editing partner birth data
public struct PartnerChartSheet: View {

    // MARK: - Properties

    @Bindable public var viewModel: DuoViewModel
    @Environment(\.dismiss) private var dismiss

    // MARK: - State

    @State private var currentStep: Step = .name
    @State private var name: String = ""
    @State private var birthDate: Date = Calendar.current.date(byAdding: .year, value: -30, to: Date()) ?? Date()
    @State private var birthTime: Date = Date()
    @State private var cityName: String = ""
    @State private var citySearchQuery: String = ""
    @State private var selectedCoordinate: GlobeCoordinate?

    // City search
    @State private var citySearchService = CitySearchService()
    @State private var isResolvingCity = false

    // Step definitions
    private enum Step: Int, CaseIterable {
        case name
        case date
        case time
        case location
        case confirm

        var title: String {
            switch self {
            case .name: return "Partner's Name"
            case .date: return "Birth Date"
            case .time: return "Birth Time"
            case .location: return "Birth Location"
            case .confirm: return "Ready to Explore!"
            }
        }

        var subtitle: String {
            switch self {
            case .name: return "Who are you exploring with?"
            case .date: return "When were they born?"
            case .time: return "Exact time matters for accuracy"
            case .location: return "Search for their birth city"
            case .confirm: return "Find your perfect destinations"
            }
        }

        var icon: String {
            switch self {
            case .name: return "person.fill"
            case .date: return "calendar"
            case .time: return "clock.fill"
            case .location: return "mappin.and.ellipse"
            case .confirm: return "heart.fill"
            }
        }
    }

    // MARK: - Initialization

    public init(viewModel: DuoViewModel) {
        self.viewModel = viewModel
    }

    // MARK: - Body

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Progress indicator
                progressIndicator
                    .padding(.horizontal, DSSpacing.xl)
                    .padding(.top, DSSpacing.md)

                // Step content
                stepContent
                    .padding(.top, DSSpacing.xl)

                Spacer()

                // Navigation buttons
                navigationButtons
                    .padding(.horizontal, DSSpacing.xl)
                    .padding(.bottom, DSSpacing.xl)
            }
            .background(DSColors.background)
            .navigationTitle("Duo Mode")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundStyle(DSColors.textSecondary)
                }
            }
            .onAppear {
                loadExistingPartner()
            }
        }
        .presentationDragIndicator(.visible)
        .presentationDetents([.large])
    }

    // MARK: - Progress Indicator

    private var progressIndicator: some View {
        HStack(spacing: DSSpacing.sm) {
            ForEach(Step.allCases, id: \.rawValue) { step in
                RoundedRectangle(cornerRadius: 2)
                    .fill(step.rawValue <= currentStep.rawValue ? Color.pink : DSColors.borderSubtle)
                    .frame(height: 4)
            }
        }
    }

    // MARK: - Step Content

    @ViewBuilder
    private var stepContent: some View {
        VStack(spacing: DSSpacing.xl) {
            // Icon
            ZStack {
                Circle()
                    .fill(Color.pink.opacity(0.1))
                    .frame(width: 56, height: 56)

                Image(systemName: currentStep.icon)
                    .font(.system(size: 24, weight: .medium))
                    .foregroundStyle(.pink)
            }

            // Title and subtitle
            VStack(spacing: DSSpacing.sm) {
                Text(stepTitle)
                    .font(DSTypography.titleL)
                    .foregroundStyle(DSColors.textPrimary)

                Text(currentStep.subtitle)
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textSecondary)
            }

            // Step-specific input
            Group {
                switch currentStep {
                case .name:
                    nameInput
                case .date:
                    dateInput
                case .time:
                    timeInput
                case .location:
                    locationInput
                case .confirm:
                    confirmSummary
                }
            }
            .padding(.horizontal, DSSpacing.xl)
        }
    }

    private var stepTitle: String {
        switch currentStep {
        case .name: return currentStep.title
        case .date, .time, .location: return name.isEmpty ? currentStep.title : "\(name)'s \(currentStep.title)"
        case .confirm: return currentStep.title
        }
    }

    // MARK: - Name Input

    private var nameInput: some View {
        TextField("Enter their name...", text: $name)
            .font(DSTypography.body)
            .multilineTextAlignment(.center)
            .padding(DSSpacing.lg)
            .background(DSColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: DSRadius.md))
    }

    // MARK: - Date Input

    private var dateInput: some View {
        DatePicker(
            "",
            selection: $birthDate,
            in: ...Date(),
            displayedComponents: .date
        )
        .datePickerStyle(.wheel)
        .labelsHidden()
    }

    // MARK: - Time Input

    private var timeInput: some View {
        DatePicker(
            "",
            selection: $birthTime,
            displayedComponents: .hourAndMinute
        )
        .datePickerStyle(.wheel)
        .labelsHidden()
    }

    // MARK: - Location Input

    private var locationInput: some View {
        VStack(spacing: DSSpacing.md) {
            // Search field
            HStack(spacing: DSSpacing.sm) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(DSColors.textSecondary)

                TextField("Search for a city...", text: $citySearchQuery)
                    .font(DSTypography.body)
                    .autocorrectionDisabled()
                    .onChange(of: citySearchQuery) { _, newValue in
                        citySearchService.search(query: newValue)
                    }

                if citySearchService.isSearching {
                    ProgressView()
                        .scaleEffect(0.8)
                } else if !citySearchQuery.isEmpty {
                    Button {
                        citySearchQuery = ""
                        citySearchService.clear()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(DSColors.textSecondary)
                    }
                }
            }
            .padding(DSSpacing.md)
            .background(DSColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: DSRadius.md))

            // Search results
            if !citySearchService.completions.isEmpty {
                VStack(spacing: DSSpacing.xs) {
                    ForEach(citySearchService.completions) { completion in
                        Button {
                            selectCompletion(completion)
                        } label: {
                            HStack(spacing: DSSpacing.sm) {
                                Image(systemName: "mappin")
                                    .font(.system(size: 12))
                                    .foregroundStyle(.pink)

                                VStack(alignment: .leading, spacing: 2) {
                                    Text(completion.title)
                                        .font(DSTypography.body)
                                        .foregroundStyle(DSColors.textPrimary)
                                        .lineLimit(1)

                                    if !completion.subtitle.isEmpty {
                                        Text(completion.subtitle)
                                            .font(DSTypography.caption)
                                            .foregroundStyle(DSColors.textSecondary)
                                            .lineLimit(1)
                                    }
                                }

                                Spacer()
                            }
                            .padding(.horizontal, DSSpacing.md)
                            .padding(.vertical, DSSpacing.sm)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .background(DSColors.surface)
                            .clipShape(RoundedRectangle(cornerRadius: DSRadius.sm))
                        }
                    }
                }
            }
            // Quick select cities when no search query
            else if citySearchQuery.isEmpty && selectedCoordinate == nil {
                VStack(spacing: DSSpacing.sm) {
                    Text("Popular Cities")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: DSSpacing.sm) {
                        ForEach(popularCities, id: \.name) { city in
                            Button {
                                selectCity(city)
                            } label: {
                                HStack(spacing: DSSpacing.sm) {
                                    Image(systemName: "mappin")
                                        .font(.system(size: 12))

                                    Text(city.name)
                                        .font(DSTypography.caption)
                                        .lineLimit(1)
                                }
                                .padding(.horizontal, DSSpacing.md)
                                .padding(.vertical, DSSpacing.sm)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(DSColors.surface)
                                .clipShape(RoundedRectangle(cornerRadius: DSRadius.sm))
                            }
                            .foregroundStyle(DSColors.textPrimary)
                        }
                    }
                }
            }

            // Resolving indicator
            if isResolvingCity {
                HStack(spacing: DSSpacing.sm) {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text("Getting coordinates...")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                }
                .padding(DSSpacing.md)
            }

            // Selected city display
            if !cityName.isEmpty, selectedCoordinate != nil {
                selectedCityCard
            }
        }
    }

    private func selectCompletion(_ completion: SearchCompletion) {
        isResolvingCity = true
        Task {
            if let result = await citySearchService.resolve(completion) {
                cityName = result.name + (result.subtitle.isEmpty ? "" : ", \(result.subtitle)")
                selectedCoordinate = result.coordinate
                citySearchQuery = ""
                citySearchService.clear()
            }
            isResolvingCity = false
        }
    }

    private var selectedCityCard: some View {
        HStack(spacing: DSSpacing.md) {
            ZStack {
                Circle()
                    .fill(Color.pink.opacity(0.1))
                    .frame(width: 36, height: 36)

                Image(systemName: "mappin.and.ellipse")
                    .font(.system(size: 14))
                    .foregroundStyle(.pink)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("Selected City")
                    .font(.system(size: 11))
                    .foregroundStyle(.pink)

                Text(cityName)
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textPrimary)
            }

            Spacer()

            Button {
                cityName = ""
                selectedCoordinate = nil
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(DSColors.textSecondary)
            }
            .accessibilityLabel("Clear city")
        }
        .padding(DSSpacing.md)
        .background(Color.pink.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: DSRadius.md))
        .overlay(
            RoundedRectangle(cornerRadius: DSRadius.md)
                .strokeBorder(Color.pink.opacity(0.2), lineWidth: 1)
        )
    }

    // MARK: - Confirm Summary

    private var confirmSummary: some View {
        VStack(spacing: DSSpacing.md) {
            summaryRow(icon: "person.fill", label: "Partner", value: name)
            summaryRow(icon: "calendar", label: "Birth Date", value: birthDate.formatted(date: .long, time: .omitted))
            summaryRow(icon: "clock.fill", label: "Birth Time", value: birthTime.formatted(date: .omitted, time: .shortened))
            summaryRow(icon: "mappin.and.ellipse", label: "Location", value: cityName.isEmpty ? "Not set" : cityName)
        }
        .padding(DSSpacing.lg)
        .background(DSColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: DSRadius.lg))
    }

    private func summaryRow(icon: String, label: String, value: String) -> some View {
        HStack(spacing: DSSpacing.md) {
            ZStack {
                Circle()
                    .fill(DSColors.surfaceTinted)
                    .frame(width: 36, height: 36)

                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundStyle(DSColors.accentPrimary)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.system(size: 11))
                    .foregroundStyle(DSColors.textSecondary)

                Text(value)
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textPrimary)
            }

            Spacer()
        }
    }

    // MARK: - Navigation Buttons

    private var navigationButtons: some View {
        HStack(spacing: DSSpacing.md) {
            if currentStep != .name {
                SAIButton("Back", style: .secondary) {
                    goBack()
                }
            }

            if currentStep == .confirm {
                SAIButton("Find Spots", style: .primary, icon: Image(systemName: "heart.fill"), layout: .block) {
                    confirmPartner()
                }
            } else {
                SAIButton("Continue", style: .primary, layout: .block) {
                    goNext()
                }
                .disabled(!canContinue)
            }
        }
    }

    // MARK: - Navigation Logic

    private var canContinue: Bool {
        switch currentStep {
        case .name: return !name.trimmingCharacters(in: .whitespaces).isEmpty
        case .date: return true
        case .time: return true
        case .location: return selectedCoordinate != nil
        case .confirm: return true
        }
    }

    private func goBack() {
        guard let currentIndex = Step.allCases.firstIndex(of: currentStep),
              currentIndex > 0 else { return }

        Haptics.tap()
        withAnimation(SAIMotion.smooth) {
            currentStep = Step.allCases[currentIndex - 1]
        }
    }

    private func goNext() {
        guard canContinue,
              let currentIndex = Step.allCases.firstIndex(of: currentStep),
              currentIndex < Step.allCases.count - 1 else { return }

        Haptics.tap()
        withAnimation(SAIMotion.smooth) {
            currentStep = Step.allCases[currentIndex + 1]
        }
    }

    private func confirmPartner() {
        guard let coordinate = selectedCoordinate else { return }

        Haptics.success()

        let partner = PartnerChartData(
            name: name.trimmingCharacters(in: .whitespaces),
            birthDate: birthDate,
            birthTime: birthTime,
            birthLocation: coordinate,
            cityName: cityName.isEmpty ? nil : cityName,
            isSaved: false
        )

        viewModel.setPartnerChart(partner)
        viewModel.enable()
        dismiss()
    }

    // MARK: - Helpers

    private func loadExistingPartner() {
        guard let partner = viewModel.partnerChart else { return }

        name = partner.name
        birthDate = partner.birthDate
        birthTime = partner.birthTime
        cityName = partner.cityName ?? ""
        selectedCoordinate = partner.birthLocation
    }

    private func selectCity(_ city: CityInfo) {
        cityName = city.name
        selectedCoordinate = GlobeCoordinate(latitude: city.lat, longitude: city.lng)
        citySearchQuery = ""
    }

    // MARK: - Sample Data

    private struct CityInfo {
        let name: String
        let lat: Double
        let lng: Double
    }

    private var popularCities: [CityInfo] {
        [
            CityInfo(name: "New York", lat: 40.7128, lng: -74.0060),
            CityInfo(name: "Los Angeles", lat: 34.0522, lng: -118.2437),
            CityInfo(name: "London", lat: 51.5074, lng: -0.1278),
            CityInfo(name: "Paris", lat: 48.8566, lng: 2.3522),
            CityInfo(name: "Tokyo", lat: 35.6762, lng: 139.6503),
            CityInfo(name: "Sydney", lat: -33.8688, lng: 151.2093)
        ]
    }
}

// MARK: - Preview

#Preview("Partner Chart Sheet") {
    PartnerChartSheet(viewModel: DuoViewModel())
        .preferredColorScheme(.dark)
}

#Preview("Partner Chart Sheet - Editing") {
    PartnerChartSheet(viewModel: .preview)
        .preferredColorScheme(.dark)
}
