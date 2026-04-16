import SwiftUI
import DesignSystem
import MapKit

// MARK: - Location Search View

/// Search view for selecting birth location using MapKit
@MainActor
public struct LocationSearchView: View {

    // MARK: - Environment

    @Environment(\.dismiss) private var dismiss

    // MARK: - State

    @State private var viewModel = LocationSearchViewModel()
    @Bindable private var store: BirthDataStore
    @Binding private var selectedLocation: LocationSearchResult?
    @State private var isResolvingLocation: Bool = false

    // MARK: - Focus

    @FocusState private var isSearchFocused: Bool

    // MARK: - Initialization

    public init(
        store: BirthDataStore? = nil,
        selectedLocation: Binding<LocationSearchResult?>
    ) {
        self.store = store ?? .shared
        self._selectedLocation = selectedLocation
    }

    // MARK: - Body

    public var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                searchBarSection
                Divider()
                    .background(DSColors.borderHairline)
                contentSection
            }
            .background(DSColors.background)
            .navigationTitle("Search Location")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        dismiss()
                    }
                    .foregroundStyle(DSColors.textSecondary)
                }
            }
            .onAppear {
                isSearchFocused = true
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Search Bar Section

    private var searchBarSection: some View {
        HStack(spacing: DSSpacing.sm) {
            Image(systemName: "magnifyingglass")
                .foregroundStyle(DSColors.textSecondary)

            TextField("Search city or place", text: $viewModel.searchQuery)
                .font(DSTypography.body)
                .foregroundStyle(DSColors.textPrimary)
                .autocorrectionDisabled()
                .textInputAutocapitalization(.words)
                .focused($isSearchFocused)
                .submitLabel(.search)

            if !viewModel.searchQuery.isEmpty {
                Button {
                    viewModel.clearSearch()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                        .foregroundStyle(DSColors.textSecondary)
                }
                .accessibilityLabel("Clear search")
            }

            if viewModel.isSearching || isResolvingLocation {
                ProgressView()
                    .tint(DSColors.accentPrimary)
            }
        }
        .padding(DSSpacing.md)
        .background(DSColors.surface)
    }

    // MARK: - Content Section

    private var contentSection: some View {
        ScrollView {
            LazyVStack(spacing: 0) {
                if viewModel.searchQuery.isEmpty {
                    recentLocationsSection
                } else if !viewModel.searchResults.isEmpty {
                    searchResultsSection
                } else if !viewModel.isSearching {
                    emptySearchState
                }
            }
        }
    }

    // MARK: - Search Results Section

    private var searchResultsSection: some View {
        ForEach(Array(viewModel.searchResults.enumerated()), id: \.offset) { index, result in
            Button {
                selectResult(at: index)
            } label: {
                locationRow(
                    title: result.title,
                    subtitle: result.subtitle,
                    icon: "mappin.circle.fill"
                )
            }
            .buttonStyle(.plain)
            .disabled(isResolvingLocation)

            if index < viewModel.searchResults.count - 1 {
                Divider()
                    .background(DSColors.borderHairline)
                    .padding(.leading, 56)
            }
        }
    }

    // MARK: - Recent Locations Section

    @ViewBuilder
    private var recentLocationsSection: some View {
        if !store.recentLocations.isEmpty {
            VStack(alignment: .leading, spacing: 0) {
                HStack {
                    Text("Recent Locations")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                        .textCase(.uppercase)

                    Spacer()

                    Button("Clear") {
                        store.clearRecentLocations()
                    }
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.accentPrimary)
                }
                .padding(.horizontal, DSSpacing.lg)
                .padding(.vertical, DSSpacing.md)

                ForEach(store.recentLocations) { location in
                    Button {
                        selectRecentLocation(location)
                    } label: {
                        locationRow(
                            title: location.title,
                            subtitle: location.subtitle,
                            icon: "clock.fill"
                        )
                    }
                    .buttonStyle(.plain)

                    if location.id != store.recentLocations.last?.id {
                        Divider()
                            .background(DSColors.borderHairline)
                            .padding(.leading, 56)
                    }
                }
            }
        } else {
            VStack(spacing: DSSpacing.md) {
                Image(systemName: "location.magnifyingglass")
                    .font(.system(size: 48))
                    .foregroundStyle(DSColors.textSecondary)

                Text("Search for your birth location")
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textSecondary)

                Text("Enter a city name, address, or landmark")
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.textSecondary)
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, DSSpacing.xl * 2)
        }
    }

    // MARK: - Empty Search State

    private var emptySearchState: some View {
        VStack(spacing: DSSpacing.md) {
            Image(systemName: "location.slash")
                .font(.system(size: 48))
                .foregroundStyle(DSColors.textSecondary)

            Text("No locations found")
                .font(DSTypography.body)
                .foregroundStyle(DSColors.textSecondary)

            Text("Try a different search term")
                .font(DSTypography.caption)
                .foregroundStyle(DSColors.textSecondary)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, DSSpacing.xl * 2)
    }

    // MARK: - Location Row

    private func locationRow(title: String, subtitle: String, icon: String) -> some View {
        HStack(spacing: DSSpacing.md) {
            Image(systemName: icon)
                .font(.system(size: 24))
                .foregroundStyle(DSColors.accentPrimary)
                .frame(width: 40)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textPrimary)
                    .lineLimit(1)

                if !subtitle.isEmpty {
                    Text(subtitle)
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                        .lineLimit(1)
                }
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(DSColors.textSecondary)
        }
        .padding(.horizontal, DSSpacing.lg)
        .padding(.vertical, DSSpacing.md)
        .contentShape(Rectangle())
    }

    // MARK: - Actions

    private func selectResult(at index: Int) {
        guard let completion = viewModel.completion(at: index) else { return }

        isResolvingLocation = true

        Task {
            if let result = await viewModel.selectCompletion(completion) {
                selectedLocation = result
                store.addRecentLocation(result)
                Haptics.tap()
                dismiss()
            }
            isResolvingLocation = false
        }
    }

    private func selectRecentLocation(_ location: RecentLocation) {
        selectedLocation = LocationSearchResult(
            title: location.title,
            subtitle: location.subtitle,
            latitude: location.latitude,
            longitude: location.longitude,
            timezone: location.timezone
        )
        Haptics.tap()
        dismiss()
    }
}

// MARK: - Previews

#Preview("Location Search") {
    LocationSearchView(selectedLocation: .constant(nil))
}

#Preview("With Recent Locations") {
    let store = BirthDataStore()
    // Add some sample recent locations
    store.addRecentLocation(LocationSearchResult(
        title: "New York",
        subtitle: "NY, United States",
        latitude: 40.7128,
        longitude: -74.0060,
        timezone: TimeZone(identifier: "America/New_York")!
    ))
    store.addRecentLocation(LocationSearchResult(
        title: "London",
        subtitle: "United Kingdom",
        latitude: 51.5074,
        longitude: -0.1278,
        timezone: TimeZone(identifier: "Europe/London")!
    ))

    return LocationSearchView(
        store: store,
        selectedLocation: .constant(nil)
    )
}
