import SwiftUI
import DesignSystem

// MARK: - Saved Charts List View

/// View for displaying and managing all saved birth charts
@MainActor
public struct SavedChartsListView: View {

    // MARK: - Environment

    @Environment(\.dismiss) private var dismiss

    // MARK: - State

    @Bindable private var store: BirthDataStore
    @State private var showingNewChart: Bool = false
    @State private var chartToEdit: BirthData?
    @State private var chartToDelete: BirthData?
    @State private var showingDeleteConfirmation: Bool = false

    // MARK: - Configuration

    private let onSelectChart: ((BirthData) -> Void)?

    // MARK: - Initialization

    public init(
        store: BirthDataStore? = nil,
        onSelectChart: ((BirthData) -> Void)? = nil
    ) {
        self.store = store ?? .shared
        self.onSelectChart = onSelectChart
    }

    // MARK: - Body

    public var body: some View {
        NavigationStack {
            Group {
                if store.savedCharts.isEmpty {
                    emptyState
                } else {
                    chartsList
                }
            }
            .navigationTitle("My Charts")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .primaryAction) {
                    Button {
                        showingNewChart = true
                    } label: {
                        Image(systemName: "plus.circle.fill")
                            .font(.system(size: 24))
                            .foregroundStyle(.tint)
                    }
                }
            }
            .sheet(isPresented: $showingNewChart) {
                BirthDataInputView(store: store)
            }
            .sheet(item: $chartToEdit) { chart in
                BirthDataInputView(
                    store: store,
                    existingData: chart
                )
            }
            .alert(
                "Delete Chart",
                isPresented: $showingDeleteConfirmation,
                presenting: chartToDelete
            ) { chart in
                Button("Cancel", role: .cancel) {}
                Button("Delete", role: .destructive) {
                    withAnimation(SAIMotion.standard) {
                        store.deleteChart(chart)
                    }
                    Haptics.success()
                }
            } message: { chart in
                Text("Are you sure you want to delete \"\(chart.name)\"? This action cannot be undone.")
            }
        }
    }

    // MARK: - Empty State

    private var emptyState: some View {
        VStack(spacing: DSSpacing.xl) {
            Spacer()

            AstrologyLottieView()

            VStack(spacing: DSSpacing.sm) {
                Text("No Charts Yet")
                    .font(DSTypography.titleL)
                    .foregroundStyle(DSColors.textPrimary)

                Text("Create your first birth chart to begin exploring your astrological profile")
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, DSSpacing.xl)
            }

            Button {
                showingNewChart = true
            } label: {
                Label("Create First Chart", systemImage: "plus")
            }
            .buttonStyle(.borderedProminent)
            .controlSize(.large)

            Spacer()
        }
        .padding(DSSpacing.lg)
    }

    // MARK: - Charts List

    private var chartsList: some View {
        ScrollView {
            LazyVStack(spacing: DSSpacing.md) {
                ForEach(store.savedCharts) { chart in
                    BirthDataCard(
                        birthData: chart,
                        isDefault: chart.id == store.defaultChartId,
                        onTap: {
                            store.loadChart(chart)
                            onSelectChart?(chart)
                        },
                        onEdit: {
                            chartToEdit = chart
                        },
                        onDelete: {
                            chartToDelete = chart
                            showingDeleteConfirmation = true
                        },
                        onSetDefault: {
                            store.setDefaultChart(chart)
                            Haptics.success()
                        }
                    )
                }
            }
            .padding(DSSpacing.lg)
        }
    }
}

// MARK: - Previews

#Preview("Saved Charts List - Empty") {
    SavedChartsListView(store: BirthDataStore())
}

#Preview("Saved Charts List - With Data") {
    let store = BirthDataStore()
    store.saveChart(.sample)
    store.saveChart(.sampleUnknownTime)

    return SavedChartsListView(store: store)
}
