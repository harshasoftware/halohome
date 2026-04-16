import SwiftUI
import DesignSystem
import Core

/// View for displaying and managing favorite locations
@MainActor
@available(iOS 17.0, *)
public struct FavoritesView: View {

    // MARK: - Properties

    @Bindable private var viewModel: FavoritesViewModel
    @Environment(\.dismiss) private var dismiss

    @State private var isEditing = false
    @State private var showDeleteConfirmation = false
    @State private var editingNotes: String = ""
    @State private var editingFavoriteId: String?

    /// Callback when user wants to navigate to a favorite location
    public var onNavigateToLocation: ((Double, Double, String) -> Void)?

    // MARK: - Initialization

    public init(
        viewModel: FavoritesViewModel,
        onNavigateToLocation: ((Double, Double, String) -> Void)? = nil
    ) {
        self.viewModel = viewModel
        self.onNavigateToLocation = onNavigateToLocation
    }

    // MARK: - Body

    public var body: some View {
        NavigationStack {
            ZStack {
                DSColors.background.ignoresSafeArea()

                if viewModel.isLoading {
                    loadingView
                } else if viewModel.favorites.isEmpty {
                    emptyStateView
                } else {
                    favoritesListView
                }
            }
            .navigationTitle("Favorites")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    if !viewModel.favorites.isEmpty {
                        Button(isEditing ? "Done" : "Edit") {
                            withAnimation {
                                isEditing.toggle()
                                if !isEditing {
                                    viewModel.clearSelection()
                                }
                            }
                        }
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") {
                        dismiss()
                    }
                }
            }
            .searchable(text: $viewModel.searchQuery, prompt: "Search favorites")
            .task {
                await viewModel.loadFavorites()
            }
            .alert("Delete Favorites?", isPresented: $showDeleteConfirmation) {
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) {
                    Task {
                        await viewModel.removeSelectedFavorites()
                        isEditing = false
                    }
                }
            } message: {
                Text("Are you sure you want to delete \(viewModel.selectedCount) favorite\(viewModel.selectedCount == 1 ? "" : "s")?")
            }
        }
    }

    // MARK: - Subviews

    private var loadingView: some View {
        VStack(spacing: DSSpacing.lg) {
            ProgressView()
                .scaleEffect(1.2)
                .tint(DSColors.accentPrimary)

            Text("Loading favorites...")
                .font(DSTypography.body)
                .foregroundStyle(DSColors.textSecondary)
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: DSSpacing.xl) {
            Image(systemName: "star.slash")
                .font(.system(size: 60, weight: .thin))
                .foregroundStyle(DSColors.textSecondary)

            VStack(spacing: DSSpacing.sm) {
                Text("No Favorites Yet")
                    .font(DSTypography.titleM)
                    .foregroundStyle(DSColors.textPrimary)

                Text("Long-press on any location on the globe to save it as a favorite.")
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, DSSpacing.xl)
            }
        }
    }

    private var favoritesListView: some View {
        VStack(spacing: 0) {
            // Edit mode toolbar
            if isEditing && viewModel.selectedCount > 0 {
                editToolbar
            }

            List {
                ForEach(viewModel.filteredFavorites) { favorite in
                    favoriteRow(favorite)
                }
            }
            .listStyle(.plain)
        }
    }

    private var editToolbar: some View {
        HStack(spacing: DSSpacing.lg) {
            Button {
                if viewModel.isAllSelected {
                    viewModel.clearSelection()
                } else {
                    viewModel.selectAll()
                }
            } label: {
                Text(viewModel.isAllSelected ? "Deselect All" : "Select All")
                    .font(DSTypography.caption)
            }

            Spacer()

            Text("\(viewModel.selectedCount) selected")
                .font(DSTypography.caption)
                .foregroundStyle(DSColors.textSecondary)

            Spacer()

            Button {
                showDeleteConfirmation = true
            } label: {
                Image(systemName: "trash")
                    .foregroundStyle(Color.red)
            }
        }
        .padding(.horizontal, DSSpacing.lg)
        .padding(.vertical, DSSpacing.md)
        .background(DSColors.surface)
    }

    @ViewBuilder
    private func favoriteRow(_ favorite: FavoriteCityData) -> some View {
        HStack(spacing: DSSpacing.md) {
            // Selection checkbox (edit mode)
            if isEditing {
                Button {
                    viewModel.toggleSelection(favorite.id)
                } label: {
                    Image(systemName: viewModel.isSelected(favorite.id) ? "checkmark.circle.fill" : "circle")
                        .font(.title3)
                        .foregroundStyle(viewModel.isSelected(favorite.id) ? DSColors.accentPrimary : DSColors.textSecondary)
                }
                .buttonStyle(.plain)
            }

            // Content
            VStack(alignment: .leading, spacing: DSSpacing.xs) {
                Text(favorite.cityName)
                    .font(DSTypography.body)
                    .fontWeight(.medium)
                    .foregroundStyle(DSColors.textPrimary)

                if let country = favorite.country {
                    Text(country)
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                }

                if let notes = favorite.notes, !notes.isEmpty {
                    Text(notes)
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textSecondary)
                        .lineLimit(2)
                }

                Text(formattedDate(favorite.createdAt))
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.textSecondary.opacity(0.7))
            }

            Spacer()

            // Navigate button (non-edit mode)
            if !isEditing {
                Button {
                    onNavigateToLocation?(favorite.latitude, favorite.longitude, favorite.cityName)
                    // Sheet dismissal is handled by the callback — don't call dismiss() here
                    // as it destroys the closure before the delayed globe navigation executes.
                } label: {
                    Image(systemName: "location.circle.fill")
                        .font(.title2)
                        .foregroundStyle(DSColors.accentPrimary)
                }
                .buttonStyle(.plain)
            }
        }
        .padding(.vertical, DSSpacing.xs)
        .contentShape(Rectangle())
        .onTapGesture {
            if !isEditing {
                onNavigateToLocation?(favorite.latitude, favorite.longitude, favorite.cityName)
            }
        }
        .swipeActions(edge: .trailing, allowsFullSwipe: true) {
            Button(role: .destructive) {
                Task {
                    await viewModel.removeFavorite(id: favorite.id)
                }
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
        .swipeActions(edge: .leading) {
            Button {
                editingFavoriteId = favorite.id
                editingNotes = favorite.notes ?? ""
            } label: {
                Label("Notes", systemImage: "note.text")
            }
            .tint(.blue)
        }
        .sheet(isPresented: Binding(
            get: { editingFavoriteId == favorite.id },
            set: { if !$0 { editingFavoriteId = nil } }
        )) {
            notesEditorSheet(for: favorite)
        }
    }

    private func notesEditorSheet(for favorite: FavoriteCityData) -> some View {
        NavigationStack {
            VStack(spacing: DSSpacing.lg) {
                Text(favorite.cityName)
                    .font(DSTypography.titleM)
                    .foregroundStyle(DSColors.textPrimary)

                TextEditor(text: $editingNotes)
                    .frame(minHeight: 150)
                    .padding(DSSpacing.sm)
                    .background(DSColors.surface)
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(DSColors.borderHairline, lineWidth: 1)
                    )

                Spacer()
            }
            .padding()
            .background(DSColors.background)
            .navigationTitle("Edit Notes")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") {
                        editingFavoriteId = nil
                    }
                }

                ToolbarItem(placement: .confirmationAction) {
                    Button("Save") {
                        Task {
                            await viewModel.updateNotes(id: favorite.id, notes: editingNotes)
                            editingFavoriteId = nil
                        }
                    }
                }
            }
        }
        .presentationDetents([.medium])
    }

    // MARK: - Helpers

    private func formattedDate(_ date: Date) -> String {
        let formatter = RelativeDateTimeFormatter()
        formatter.unitsStyle = .abbreviated
        return formatter.localizedString(for: date, relativeTo: Date())
    }
}

// MARK: - Favorite Button Component

/// Heart button for toggling favorite status on a location
@available(iOS 17.0, *)
public struct FavoriteButton: View {

    @Bindable private var viewModel: FavoritesViewModel
    private let latitude: Double
    private let longitude: Double
    private let cityName: String
    private let country: String?

    @State private var isFavorite: Bool = false
    @State private var isAnimating: Bool = false

    public init(
        viewModel: FavoritesViewModel,
        latitude: Double,
        longitude: Double,
        cityName: String,
        country: String? = nil
    ) {
        self.viewModel = viewModel
        self.latitude = latitude
        self.longitude = longitude
        self.cityName = cityName
        self.country = country
    }

    public var body: some View {
        Button {
            toggleFavorite()
        } label: {
            Image(systemName: isFavorite ? "heart.fill" : "heart")
                .font(.title2)
                .foregroundStyle(isFavorite ? Color.red : DSColors.textSecondary)
                .scaleEffect(isAnimating ? 1.3 : 1.0)
                .animation(.spring(response: 0.3, dampingFraction: 0.5), value: isAnimating)
                .padding(12)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .task {
            // Ensure favorites are loaded before checking status
            if viewModel.favorites.isEmpty {
                await viewModel.loadFavorites()
            }
            isFavorite = viewModel.isFavorite(latitude: latitude, longitude: longitude)
        }
        .onChange(of: viewModel.favorites) { _, _ in
            // Update when favorites list changes
            isFavorite = viewModel.isFavorite(latitude: latitude, longitude: longitude)
        }
        .accessibilityLabel(isFavorite ? "Remove from favorites" : "Add to favorites")
    }

    private func toggleFavorite() {
        // Optimistic: flip the heart immediately
        let willBeFavorite = !isFavorite
        isFavorite = willBeFavorite
        isAnimating = true

        Task {
            let result = await viewModel.toggleFavorite(
                latitude: latitude,
                longitude: longitude,
                cityName: cityName,
                country: country
            )
            // Reconcile if the server disagreed
            if result != willBeFavorite {
                isFavorite = result
            }

            try? await Task.sleep(nanoseconds: 200_000_000)
            isAnimating = false
        }
    }
}

// MARK: - Preview

#if DEBUG
@available(iOS 17.0, *)
#Preview("Favorites View") {
    FavoritesView(
        viewModel: FavoritesViewModel(
            repository: StubFavoritesRepository(favorites: [
                FavoriteCityData(
                    id: "1",
                    userId: "user-1",
                    latitude: 40.7128,
                    longitude: -74.006,
                    cityName: "New York",
                    country: "United States",
                    notes: "Great energy for career",
                    createdAt: Date().addingTimeInterval(-86400),
                    updatedAt: Date().addingTimeInterval(-86400)
                ),
                FavoriteCityData(
                    id: "2",
                    userId: "user-1",
                    latitude: 35.6762,
                    longitude: 139.6503,
                    cityName: "Tokyo",
                    country: "Japan",
                    createdAt: Date().addingTimeInterval(-172800),
                    updatedAt: Date().addingTimeInterval(-172800)
                ),
                FavoriteCityData(
                    id: "3",
                    userId: "user-1",
                    latitude: 51.5074,
                    longitude: -0.1278,
                    cityName: "London",
                    country: "United Kingdom",
                    createdAt: Date().addingTimeInterval(-259200),
                    updatedAt: Date().addingTimeInterval(-259200)
                )
            ])
        )
    )
    .preferredColorScheme(.dark)
}

@available(iOS 17.0, *)
#Preview("Empty Favorites") {
    FavoritesView(
        viewModel: FavoritesViewModel(
            repository: StubFavoritesRepository(favorites: [])
        )
    )
    .preferredColorScheme(.dark)
}
#endif
