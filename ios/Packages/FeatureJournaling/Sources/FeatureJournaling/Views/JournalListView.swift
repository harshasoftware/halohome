import SwiftUI
import DesignSystem

/// List of all journal entries with planetary influence tags and mood indicators
@available(iOS 17.0, *)
public struct JournalListView: View {
    @Bindable var viewModel: JournalViewModel
    @Environment(\.dismiss) private var dismiss

    public init(viewModel: JournalViewModel) {
        self.viewModel = viewModel
    }

    public var body: some View {
        NavigationStack {
            Group {
                if viewModel.isLoading && viewModel.entries.isEmpty {
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if viewModel.entries.isEmpty {
                    emptyState
                } else {
                    entryList
                }
            }
            .navigationTitle("Journal")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Button("Close") { dismiss() }
                        .foregroundStyle(DSColors.textTertiary)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        viewModel.startNewEntry(
                            latitude: 0,
                            longitude: 0,
                            placeName: "Current Location"
                        )
                    } label: {
                        Image(systemName: "plus")
                    }
                    .foregroundStyle(DSColors.brandPrimary)
                }
            }
            .sheet(isPresented: $viewModel.isShowingEntryEditor) {
                JournalEntryView(viewModel: viewModel)
            }
            .task {
                await viewModel.loadEntries()
            }
            .refreshable {
                await viewModel.loadEntries()
            }
        }
    }

    @ViewBuilder
    private var emptyState: some View {
        VStack(spacing: DSSpacing.lg) {
            Image(systemName: "book.closed")
                .font(.system(size: 48))
                .foregroundStyle(DSColors.textTertiary)
            Text("No Journal Entries")
                .font(DSTypography.titleS)
                .foregroundStyle(DSColors.textPrimary)
            Text("Start journaling your planetary experiences at different locations.")
                .font(DSTypography.body)
                .foregroundStyle(DSColors.textTertiary)
                .multilineTextAlignment(.center)
                .padding(.horizontal, DSSpacing.xl)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    @ViewBuilder
    private var entryList: some View {
        List {
            ForEach(viewModel.entries) { entry in
                JournalEntryRow(entry: entry)
                    .onTapGesture {
                        viewModel.editEntry(entry)
                    }
                    .swipeActions(edge: .trailing, allowsFullSwipe: true) {
                        Button(role: .destructive) {
                            Task { await viewModel.deleteEntry(entry) }
                        } label: {
                            Label("Delete", systemImage: "trash")
                        }
                    }
                    .listRowBackground(DSColors.surfaceElevated)
            }
        }
        .listStyle(.plain)
    }
}

// MARK: - Entry Row

@available(iOS 17.0, *)
private struct JournalEntryRow: View {
    let entry: JournalEntry

    var body: some View {
        VStack(alignment: .leading, spacing: DSSpacing.sm) {
            // Header: place name + date
            HStack {
                Text(entry.placeName)
                    .font(DSTypography.titleS)
                    .foregroundStyle(DSColors.textPrimary)
                Spacer()
                Text(entry.createdAt, style: .date)
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.textTertiary)
            }

            // Days stayed
            if entry.daysStayed > 0 {
                Text("\(entry.daysStayed) days")
                    .font(DSTypography.caption)
                    .foregroundStyle(DSColors.textTertiary)
            }

            // Journal text preview
            if !entry.userText.isEmpty {
                Text(entry.userText)
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textTertiary)
                    .lineLimit(2)
            }

            // Mood + planetary influences
            HStack(spacing: DSSpacing.sm) {
                if let mood = entry.mood {
                    moodIndicator(mood)
                }
                ForEach(entry.planetaryInfluences.prefix(3)) { influence in
                    Text("\(influence.planet) \(influence.lineType)")
                        .font(DSTypography.caption)
                        .padding(.horizontal, DSSpacing.sm)
                        .padding(.vertical, 2)
                        .background(DSColors.surfaceTinted)
                        .clipShape(Capsule())
                        .foregroundStyle(DSColors.textTertiary)
                }
                if entry.planetaryInfluences.count > 3 {
                    Text("+\(entry.planetaryInfluences.count - 3)")
                        .font(DSTypography.caption)
                        .foregroundStyle(DSColors.textTertiary)
                }
            }
        }
        .padding(.vertical, DSSpacing.xs)
    }

    @ViewBuilder
    private func moodIndicator(_ mood: Int) -> some View {
        HStack(spacing: 1) {
            ForEach(1...5, id: \.self) { star in
                Image(systemName: star <= mood ? "star.fill" : "star")
                    .font(.system(size: 10))
                    .foregroundStyle(star <= mood ? Color.yellow : DSColors.textTertiary)
            }
        }
    }
}
