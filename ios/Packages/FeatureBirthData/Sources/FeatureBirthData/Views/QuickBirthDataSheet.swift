import SwiftUI
import DesignSystem

// MARK: - Quick Birth Data Sheet

/// Half-sheet for quick birth data entry with minimal fields
/// Matches web QuickBirthDataModal for fast input
@MainActor
public struct QuickBirthDataSheet: View {

    // MARK: - Environment

    @Environment(\.dismiss) private var dismiss

    // MARK: - State

    @Bindable private var store: BirthDataStore
    @State private var name: String = ""
    @State private var birthDate: Date = Date()
    @State private var birthTime: Date = Date()
    @State private var isTimeUnknown: Bool = false
    @State private var selectedLocation: LocationSearchResult?
    @State private var showingLocationSearch: Bool = false
    @State private var showingFullForm: Bool = false
    @State private var validationErrors: [BirthData.ValidationError] = []

    // MARK: - Focus

    @FocusState private var isNameFocused: Bool

    // MARK: - Configuration

    private let onSave: ((BirthData) -> Void)?

    // MARK: - Initialization

    public init(
        store: BirthDataStore? = nil,
        onSave: ((BirthData) -> Void)? = nil
    ) {
        self.store = store ?? .shared
        self.onSave = onSave
    }

    // MARK: - Body

    public var body: some View {
        NavigationStack {
            VStack(spacing: DSSpacing.lg) {
                headerView
                formContent
                Spacer()
                actionButtons
            }
            .padding(DSSpacing.lg)
            .background(DSColors.background)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.system(size: 28))
                            .foregroundStyle(DSColors.textSecondary.opacity(0.5))
                    }
                    .accessibilityLabel("Dismiss")
                }

                ToolbarItem(placement: .primaryAction) {
                    Button("More Options") {
                        showingFullForm = true
                    }
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.accentPrimary)
                }
            }
            .sheet(isPresented: $showingLocationSearch) {
                LocationSearchView(
                    store: store,
                    selectedLocation: $selectedLocation
                )
            }
            .fullScreenCover(isPresented: $showingFullForm) {
                BirthDataInputView(
                    store: store,
                    existingData: buildPartialBirthData(),
                    onSave: { data in
                        onSave?(data)
                        dismiss()
                    }
                )
            }
        }
        .presentationDetents([.medium, .large])
        .presentationDragIndicator(.visible)
        .onAppear {
            isNameFocused = true
        }
    }

    // MARK: - Header View

    private var headerView: some View {
        VStack(spacing: DSSpacing.sm) {
            Image(systemName: "star.fill")
                .font(.system(size: 32))
                .foregroundStyle(DSGradient.primaryLinear)

            Text("Quick Chart Entry")
                .font(DSTypography.titleM)
                .foregroundStyle(DSColors.textPrimary)
        }
    }

    // MARK: - Form Content

    private var formContent: some View {
        VStack(spacing: DSSpacing.md) {
            // Name Field
            VStack(alignment: .leading, spacing: DSSpacing.xs) {
                TextField("Chart Name", text: $name)
                    .font(DSTypography.body)
                    .padding(DSSpacing.md)
                    .background(DSColors.surface)
                    .clipShape(.rect(cornerRadius: DSRadius.sm))
                    .overlay(
                        RoundedRectangle(cornerRadius: DSRadius.sm)
                            .strokeBorder(DSColors.borderHairline, lineWidth: 1)
                    )
                    .focused($isNameFocused)
                    .submitLabel(.next)
            }

            // Date and Time Row
            HStack(spacing: DSSpacing.md) {
                // Date Picker
                VStack(alignment: .leading, spacing: DSSpacing.xs) {
                    Text("Date")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)

                    DatePicker(
                        "",
                        selection: $birthDate,
                        in: ...Date(),
                        displayedComponents: .date
                    )
                    .datePickerStyle(.compact)
                    .labelsHidden()
                    .tint(DSColors.accentPrimary)
                }
                .frame(maxWidth: .infinity)

                // Time Picker / Unknown Toggle
                VStack(alignment: .leading, spacing: DSSpacing.xs) {
                    HStack {
                        Text("Time")
                            .font(DSTypography.caption)
                            .foregroundStyle(DSColors.textSecondary)

                        Spacer()

                        Text("Unknown")
                            .font(DSTypography.caption)
                            .foregroundStyle(DSColors.textSecondary)

                        Toggle("", isOn: $isTimeUnknown)
                            .toggleStyle(.switch)
                            .tint(DSColors.accentPrimary)
                            .labelsHidden()
                            .scaleEffect(0.8)
                    }

                    if !isTimeUnknown {
                        DatePicker(
                            "",
                            selection: $birthTime,
                            displayedComponents: .hourAndMinute
                        )
                        .datePickerStyle(.compact)
                        .labelsHidden()
                        .tint(DSColors.accentPrimary)
                    } else {
                        Text("Noon (12:00)")
                            .font(DSTypography.caption)
                            .foregroundStyle(DSColors.textSecondary)
                            .frame(height: 34)
                    }
                }
                .frame(maxWidth: .infinity)
            }
            .padding(DSSpacing.md)
            .background(DSColors.surface)
            .clipShape(.rect(cornerRadius: DSRadius.sm))

            // Location Button
            Button {
                showingLocationSearch = true
            } label: {
                HStack {
                    Image(systemName: "location.fill")
                        .foregroundStyle(DSColors.accentPrimary)

                    if let location = selectedLocation {
                        Text(location.displayName)
                            .font(DSTypography.body)
                            .foregroundStyle(DSColors.textPrimary)
                            .lineLimit(1)
                    } else {
                        Text("Select Birth Location")
                            .font(DSTypography.body)
                            .foregroundStyle(DSColors.textSecondary)
                    }

                    Spacer()

                    Image(systemName: "chevron.right")
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(DSColors.textSecondary)
                }
                .padding(DSSpacing.md)
                .background(DSColors.surface)
                .clipShape(.rect(cornerRadius: DSRadius.sm))
                .overlay(
                    RoundedRectangle(cornerRadius: DSRadius.sm)
                        .strokeBorder(DSColors.borderHairline, lineWidth: 1)
                )
            }
            .buttonStyle(.plain)

            // Validation Errors
            if !validationErrors.isEmpty {
                HStack(spacing: DSSpacing.xs) {
                    Image(systemName: "exclamationmark.triangle.fill")
                        .foregroundStyle(DSColors.warning)

                    Text(validationErrors.first?.errorDescription ?? "Please fill in all fields")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.warning)
                }
                .padding(DSSpacing.sm)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(DSColors.warning.opacity(0.1))
                .clipShape(.rect(cornerRadius: DSRadius.xs))
            }
        }
    }

    // MARK: - Action Buttons

    private var actionButtons: some View {
        SAIButton(
            "Create Chart",
            style: .primary,
            size: .lg,
            icon: Image(systemName: "sparkles"),
            layout: .block
        ) {
            saveChart()
        }
    }

    // MARK: - Actions

    private func buildPartialBirthData() -> BirthData? {
        guard !name.isEmpty || selectedLocation != nil else { return nil }

        return BirthData(
            name: name,
            date: birthDate,
            time: isTimeUnknown ? nil : birthTime,
            isTimeUnknown: isTimeUnknown,
            latitude: selectedLocation?.latitude ?? 0,
            longitude: selectedLocation?.longitude ?? 0,
            placeName: selectedLocation?.displayName ?? "",
            timezone: selectedLocation?.timezone ?? .current
        )
    }

    private func saveChart() {
        let birthData = BirthData(
            name: name.trimmingCharacters(in: .whitespacesAndNewlines),
            date: birthDate,
            time: isTimeUnknown ? nil : birthTime,
            isTimeUnknown: isTimeUnknown,
            latitude: selectedLocation?.latitude ?? 0,
            longitude: selectedLocation?.longitude ?? 0,
            placeName: selectedLocation?.displayName ?? "",
            timezone: selectedLocation?.timezone ?? .current
        )

        validationErrors = birthData.validate()

        if validationErrors.isEmpty {
            store.saveChart(birthData)
            onSave?(birthData)
            Haptics.success()
            dismiss()
        } else {
            Haptics.error()
        }
    }
}

// MARK: - Previews

#Preview("Quick Entry Sheet") {
    QuickBirthDataSheet()
}

#Preview("Quick Entry - Partial Data") {
    @Previewable @State var location: LocationSearchResult? = LocationSearchResult(
        title: "Los Angeles",
        subtitle: "CA, United States",
        latitude: 34.0522,
        longitude: -118.2437,
        timezone: TimeZone(identifier: "America/Los_Angeles")!
    )

    QuickBirthDataSheet()
}
