import SwiftUI
import DesignSystem

// MARK: - Birth Data Input View

/// Multi-step wizard for entering or editing birth data
/// Cosmic dark mode aesthetic matching the web app
@MainActor
public struct BirthDataInputView: View {

    // MARK: - Environment

    @Environment(\.dismiss) private var dismiss

    // MARK: - State

    @Bindable private var store: BirthDataStore
    @State private var currentStep: Step = .name
    @State private var name: String = ""
    @State private var birthDate: Date = Calendar.current.date(byAdding: .year, value: -30, to: Date()) ?? Date()
    @State private var birthTime: Date = Date()
    @State private var selectedLocation: LocationSearchResult?
    @State private var showingLocationSearch: Bool = false
    @State private var validationErrors: [BirthData.ValidationError] = []
    @State private var showingErrors: Bool = false

    // Location search
    @State private var locationSearchQuery: String = ""
    @State private var locationSearchService = LocationSearchService()
    @State private var isResolvingLocation = false

    // Focus management
    private enum FormField { case name, locationSearch }
    @FocusState private var focusedField: FormField?

    // Step definitions
    private enum Step: Int, CaseIterable {
        case name
        case date
        case time
        case location
        case confirm

        var title: String {
            switch self {
            case .name: return "Your Name"
            case .date: return "Birth Date"
            case .time: return "Birth Time"
            case .location: return "Birth Location"
            case .confirm: return "Ready to Explore!"
            }
        }

        var subtitle: String {
            switch self {
            case .name: return "What should we call you?"
            case .date: return "When were you born?"
            case .time: return "Exact time matters for accuracy"
            case .location: return "Search for your birth city"
            case .confirm: return "Review your birth details"
            }
        }

        var icon: String {
            switch self {
            case .name: return "person.fill"
            case .date: return "calendar"
            case .time: return "clock.fill"
            case .location: return "mappin.and.ellipse"
            case .confirm: return "sparkles"
            }
        }
    }

    // MARK: - Configuration

    private let isEditing: Bool
    private let editingChartId: UUID?
    private let editingCreatedAt: Date?
    private let isMandatory: Bool
    private let onSave: ((BirthData) -> Void)?

    // MARK: - Initialization

    public init(
        store: BirthDataStore? = nil,
        existingData: BirthData? = nil,
        isMandatory: Bool = false,
        onSave: ((BirthData) -> Void)? = nil
    ) {
        self.store = store ?? .shared
        self.isEditing = existingData != nil
        self.editingChartId = existingData?.id
        self.editingCreatedAt = existingData?.createdAt
        self.isMandatory = isMandatory
        self.onSave = onSave

        if let data = existingData {
            _name = State(initialValue: data.name)
            _birthDate = State(initialValue: data.date)
            _birthTime = State(initialValue: data.time ?? Date())
            _selectedLocation = State(initialValue: LocationSearchResult(
                title: data.placeName,
                subtitle: "",
                latitude: data.latitude,
                longitude: data.longitude,
                timezone: data.timezone
            ))
        } else if store?.savedCharts.isEmpty ?? BirthDataStore.shared.savedCharts.isEmpty {
            // First chart only: pre-fill name from auth display name
            if let fullName = UserDefaults.standard.string(forKey: "authUserDisplayName"), !fullName.isEmpty {
                let firstName = fullName.components(separatedBy: " ").first ?? fullName
                _name = State(initialValue: firstName)
            }
        }
    }

    // MARK: - Body

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Progress indicator
                progressIndicator
                    .padding(.horizontal, 24)
                    .padding(.top, 16)

                // Step content
                stepContent
                    .padding(.top, 32)

                Spacer()

                // Navigation buttons
                navigationButtons
                    .padding(.horizontal, 24)
                    .padding(.bottom, 24)
            }
            .background(DSColors.background)
            .navigationTitle(isMandatory ? "Birth Data" : (isEditing ? "Edit Chart" : "New Chart"))
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                if !isMandatory {
                    ToolbarItem(placement: .cancellationAction) {
                        Button("Cancel") {
                            dismiss()
                        }
                        .foregroundStyle(Color.blue)
                    }
                }
            }
            .toolbarBackground(DSColors.background.opacity(0.8), for: .navigationBar)
            .toolbarBackground(.visible, for: .navigationBar)
            .onAppear {
                // Auto-focus name field when form first opens
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    focusedField = .name
                }
            }
            .onChange(of: currentStep) { _, newStep in
                // Auto-focus the text input for each step
                switch newStep {
                case .name:
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        focusedField = .name
                    }
                case .location:
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
                        focusedField = .locationSearch
                    }
                default:
                    focusedField = nil
                }
            }
        }
    }

    // MARK: - Progress Indicator

    private var progressIndicator: some View {
        HStack(spacing: 8) {
            ForEach(Step.allCases, id: \.rawValue) { step in
                RoundedRectangle(cornerRadius: 2)
                    .fill(step.rawValue <= currentStep.rawValue ? Color.blue : DSColors.borderHairline)
                    .frame(height: 4)
            }
        }
    }

    // MARK: - Step Content

    @ViewBuilder
    private var stepContent: some View {
        // Collapse decorative header on location step when keyboard is open
        // to keep search field + results visible on small screens (e.g. iPhone 12 mini)
        let isCompact = currentStep == .location && focusedField == .locationSearch

        VStack(spacing: isCompact ? 12 : 24) {
            if !isCompact {
                // Icon
                ZStack {
                    Circle()
                        .fill(Color.blue.opacity(0.1))
                        .frame(width: 56, height: 56)

                    Image(systemName: currentStep.icon)
                        .font(.system(size: 24, weight: .medium))
                        .foregroundStyle(Color.blue)
                }

                // Title and subtitle
                VStack(spacing: 8) {
                    Text(stepTitle)
                        .font(.system(size: 22, weight: .semibold))
                        .foregroundStyle(DSColors.textPrimary)

                    Text(currentStep.subtitle)
                        .font(.system(size: 15))
                        .foregroundStyle(DSColors.textSecondary)
                }
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
            .padding(.horizontal, 24)
        }
        .animation(.easeInOut(duration: 0.2), value: isCompact)
    }

    private var stepTitle: String {
        switch currentStep {
        case .name: return currentStep.title
        case .date, .time, .location:
            return name.isEmpty ? currentStep.title : "\(name)'s \(currentStep.title)"
        case .confirm: return currentStep.title
        }
    }

    // MARK: - Name Input

    private var nameInput: some View {
        TextField("Enter your name...", text: $name)
            .font(.system(size: 17))
            .multilineTextAlignment(.center)
            .padding(16)
            .background(DSColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(DSColors.borderHairline, lineWidth: 1)
            )
            .tint(Color.blue)
            .focused($focusedField, equals: .name)
            .submitLabel(.next)
            .onSubmit { if canContinue { goNext() } }
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
        VStack(spacing: 16) {
            DatePicker(
                "",
                selection: $birthTime,
                displayedComponents: .hourAndMinute
            )
            .datePickerStyle(.wheel)
            .labelsHidden()

            Text("If unsure, noon is a reasonable default")
                .font(.system(size: 13))
                .foregroundStyle(DSColors.textSecondary)
        }
    }

    // MARK: - Location Input

    private var locationInput: some View {
        VStack(spacing: 16) {
            // Search field
            HStack(spacing: 8) {
                Image(systemName: "magnifyingglass")
                    .foregroundStyle(DSColors.textSecondary)

                TextField("Search your birth city...", text: $locationSearchQuery)
                    .font(.system(size: 15))
                    .autocorrectionDisabled()
                    .focused($focusedField, equals: .locationSearch)
                    .submitLabel(.search)
                    .onChange(of: locationSearchQuery) { _, newValue in
                        locationSearchService.search(query: newValue)
                    }

                if locationSearchService.isSearching {
                    ProgressView()
                        .scaleEffect(0.8)
                } else if !locationSearchQuery.isEmpty {
                    Button {
                        locationSearchQuery = ""
                        locationSearchService.clear()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .foregroundStyle(DSColors.textSecondary)
                    }
                }
            }
            .padding(12)
            .background(DSColors.surface)
            .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 12, style: .continuous)
                    .strokeBorder(DSColors.borderHairline, lineWidth: 1)
            )

            // Search results — taller when keyboard is open so results stay visible
            if !locationSearchService.completions.isEmpty {
                ScrollView {
                    VStack(spacing: 4) {
                        ForEach(locationSearchService.completions) { completion in
                            Button {
                                selectCompletion(completion)
                            } label: {
                                HStack(spacing: 8) {
                                    Image(systemName: "mappin")
                                        .font(.system(size: 12))
                                        .foregroundStyle(Color.blue)

                                    VStack(alignment: .leading, spacing: 2) {
                                        Text(completion.title)
                                            .font(.system(size: 15))
                                            .foregroundStyle(DSColors.textPrimary)
                                            .lineLimit(1)

                                        if !completion.subtitle.isEmpty {
                                            Text(completion.subtitle)
                                                .font(.system(size: 12))
                                                .foregroundStyle(DSColors.textSecondary)
                                                .lineLimit(1)
                                        }
                                    }

                                    Spacer()
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 10)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(DSColors.surface)
                                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                            }
                        }
                    }
                }
                // Expand results when keyboard is open (header is hidden, more space available)
                .frame(maxHeight: focusedField == .locationSearch ? 320 : 200)
            }
            // Popular cities when no search and keyboard is not open
            else if locationSearchQuery.isEmpty && selectedLocation == nil && focusedField != .locationSearch {
                VStack(spacing: 8) {
                    Text("Popular Cities")
                        .font(.system(size: 12, weight: .medium))
                        .foregroundStyle(DSColors.textSecondary)
                        .frame(maxWidth: .infinity, alignment: .leading)

                    LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                        ForEach(popularCities, id: \.name) { city in
                            Button {
                                selectPopularCity(city)
                            } label: {
                                HStack(spacing: 6) {
                                    Image(systemName: "mappin")
                                        .font(.system(size: 10))

                                    Text(city.name)
                                        .font(.system(size: 13))
                                        .lineLimit(1)
                                }
                                .padding(.horizontal, 12)
                                .padding(.vertical, 8)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .background(DSColors.surface)
                                .clipShape(RoundedRectangle(cornerRadius: 8, style: .continuous))
                            }
                            .foregroundStyle(DSColors.textPrimary)
                        }
                    }
                }
            }

            // Resolving indicator
            if isResolvingLocation {
                HStack(spacing: 8) {
                    ProgressView()
                        .scaleEffect(0.8)
                    Text("Getting coordinates...")
                        .font(.system(size: 13))
                        .foregroundStyle(DSColors.textSecondary)
                }
                .padding(12)
            }

            // Selected location display
            if let location = selectedLocation {
                selectedLocationCard(location)
            }
        }
    }

    private func selectedLocationCard(_ location: LocationSearchResult) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.1))
                    .frame(width: 36, height: 36)

                Image(systemName: "mappin.and.ellipse")
                    .font(.system(size: 14))
                    .foregroundStyle(Color.blue)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text("Selected City")
                    .font(.system(size: 11))
                    .foregroundStyle(Color.blue)

                Text(location.displayName)
                    .font(.system(size: 15))
                    .foregroundStyle(DSColors.textPrimary)
            }

            Spacer()

            Button {
                selectedLocation = nil
            } label: {
                Image(systemName: "xmark.circle.fill")
                    .foregroundStyle(DSColors.textSecondary)
            }
            .accessibilityLabel("Clear location")
        }
        .padding(12)
        .background(Color.blue.opacity(0.05))
        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 12, style: .continuous)
                .strokeBorder(Color.blue.opacity(0.2), lineWidth: 1)
        )
    }

    private func selectCompletion(_ completion: LocationSearchCompletion) {
        isResolvingLocation = true
        Task {
            if let result = await locationSearchService.resolve(completion) {
                selectedLocation = result
                locationSearchQuery = ""
                locationSearchService.clear()
            }
            isResolvingLocation = false
        }
    }

    private func selectPopularCity(_ city: PopularCity) {
        selectedLocation = LocationSearchResult(
            title: city.name,
            subtitle: city.country,
            latitude: city.lat,
            longitude: city.lng,
            timezone: TimeZone(identifier: city.timezone) ?? .current
        )
    }

    // MARK: - Confirm Summary

    private var confirmSummary: some View {
        VStack(spacing: 12) {
            summaryRow(icon: "person.fill", label: "Name", value: name)
            summaryRow(icon: "calendar", label: "Birth Date", value: birthDate.formatted(date: .long, time: .omitted))
            summaryRow(icon: "clock.fill", label: "Birth Time", value: birthTime.formatted(date: .omitted, time: .shortened))
            summaryRow(icon: "mappin.and.ellipse", label: "Location", value: selectedLocation?.displayName ?? "Not set")
        }
        .padding(16)
        .background(DSColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .strokeBorder(DSColors.borderHairline, lineWidth: 1)
        )
    }

    private func summaryRow(icon: String, label: String, value: String) -> some View {
        HStack(spacing: 12) {
            ZStack {
                Circle()
                    .fill(Color.blue.opacity(0.1))
                    .frame(width: 36, height: 36)

                Image(systemName: icon)
                    .font(.system(size: 14))
                    .foregroundStyle(Color.blue)
            }

            VStack(alignment: .leading, spacing: 2) {
                Text(label)
                    .font(.system(size: 11))
                    .foregroundStyle(DSColors.textSecondary)

                Text(value)
                    .font(.system(size: 15))
                    .foregroundStyle(DSColors.textPrimary)
            }

            Spacer()
        }
    }

    // MARK: - Navigation Buttons

    private var navigationButtons: some View {
        HStack(spacing: 12) {
            if currentStep != .name {
                Button {
                    goBack()
                } label: {
                    Text("Back")
                        .font(.system(size: 16, weight: .medium))
                        .foregroundStyle(DSColors.textPrimary)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(DSColors.surface)
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .strokeBorder(DSColors.borderHairline, lineWidth: 1)
                        )
                }
            }

            if currentStep == .confirm {
                Button {
                    saveChart()
                } label: {
                    HStack(spacing: 8) {
                        Image(systemName: "sparkles")
                        Text("Create Chart")
                    }
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 14)
                    .background(Color.blue)
                    .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
            } else {
                Button {
                    goNext()
                } label: {
                    Text("Continue")
                        .font(.system(size: 16, weight: .semibold))
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 14)
                        .background(canContinue ? Color.blue : Color.blue.opacity(0.4))
                        .clipShape(RoundedRectangle(cornerRadius: 12, style: .continuous))
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
        case .location: return selectedLocation != nil
        case .confirm: return true
        }
    }

    private func goBack() {
        guard let currentIndex = Step.allCases.firstIndex(of: currentStep),
              currentIndex > 0 else { return }

        Haptics.tap()
        withAnimation(.easeInOut(duration: 0.25)) {
            currentStep = Step.allCases[currentIndex - 1]
        }
    }

    private func goNext() {
        guard canContinue,
              let currentIndex = Step.allCases.firstIndex(of: currentStep),
              currentIndex < Step.allCases.count - 1 else { return }

        Haptics.tap()
        withAnimation(.easeInOut(duration: 0.25)) {
            currentStep = Step.allCases[currentIndex + 1]
        }
    }

    // MARK: - Validation & Save

    private func buildBirthData() -> BirthData {
        BirthData(
            id: editingChartId ?? UUID(),
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            date: birthDate,
            time: birthTime,
            isTimeUnknown: false,
            latitude: selectedLocation?.latitude ?? 0,
            longitude: selectedLocation?.longitude ?? 0,
            placeName: selectedLocation?.displayName ?? "",
            timezone: selectedLocation?.timezone ?? .current,
            createdAt: editingCreatedAt ?? Date(),
            updatedAt: Date()
        )
    }

    private func saveChart() {
        let birthData = buildBirthData()
        validationErrors = birthData.validate()

        if validationErrors.isEmpty {
            store.saveChart(birthData)
            onSave?(birthData)
            Haptics.success()
            if !isMandatory {
                dismiss()
            }
        } else {
            showingErrors = true
            Haptics.error()
        }
    }

    // MARK: - Sample Data

    private struct PopularCity {
        let name: String
        let country: String
        let lat: Double
        let lng: Double
        let timezone: String
    }

    private var popularCities: [PopularCity] {
        [
            PopularCity(name: "New York", country: "USA", lat: 40.7128, lng: -74.0060, timezone: "America/New_York"),
            PopularCity(name: "Los Angeles", country: "USA", lat: 34.0522, lng: -118.2437, timezone: "America/Los_Angeles"),
            PopularCity(name: "London", country: "UK", lat: 51.5074, lng: -0.1278, timezone: "Europe/London"),
            PopularCity(name: "Paris", country: "France", lat: 48.8566, lng: 2.3522, timezone: "Europe/Paris"),
            PopularCity(name: "Tokyo", country: "Japan", lat: 35.6762, lng: 139.6503, timezone: "Asia/Tokyo"),
            PopularCity(name: "Sydney", country: "Australia", lat: -33.8688, lng: 151.2093, timezone: "Australia/Sydney")
        ]
    }
}

// MARK: - Previews

#Preview("New Chart") {
    BirthDataInputView()
}

#Preview("Mandatory Entry") {
    BirthDataInputView(isMandatory: true)
}

#Preview("Edit Chart") {
    BirthDataInputView(existingData: .sample)
}
