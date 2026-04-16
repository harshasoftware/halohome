import SwiftUI
import DesignSystem

/// View presented when user taps a journal prompt notification
/// Pre-fills location data from the notification payload
@available(iOS 17.0, *)
public struct JournalPromptNotificationView: View {
    @Bindable var viewModel: JournalViewModel
    @Environment(\.dismiss) private var dismiss

    let latitude: Double
    let longitude: Double
    let placeName: String
    let daysStayed: Int

    public init(
        viewModel: JournalViewModel,
        latitude: Double,
        longitude: Double,
        placeName: String,
        daysStayed: Int
    ) {
        self.viewModel = viewModel
        self.latitude = latitude
        self.longitude = longitude
        self.placeName = placeName
        self.daysStayed = daysStayed
    }

    public var body: some View {
        NavigationStack {
            VStack(spacing: DSSpacing.lg) {
                // Header illustration
                VStack(spacing: DSSpacing.md) {
                    Image(systemName: "sparkles")
                        .font(.system(size: 44))
                        .foregroundStyle(DSColors.brandPrimary)

                    Text("Journal Your Experience")
                        .font(DSTypography.titleL)
                        .foregroundStyle(DSColors.textPrimary)

                    Text("You've been in \(placeName) for \(daysStayed) days. How has this planetary zone influenced your life?")
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.textTertiary)
                        .multilineTextAlignment(.center)
                        .padding(.horizontal, DSSpacing.xl)
                }

                // Detected influences
                if !viewModel.detectedInfluences.isEmpty {
                    VStack(alignment: .leading, spacing: DSSpacing.sm) {
                        Text("Active Influences")
                            .font(DSTypography.titleS)
                            .foregroundStyle(DSColors.textPrimary)

                        ForEach(viewModel.detectedInfluences) { influence in
                            HStack {
                                Circle()
                                    .fill(DSColors.brandPrimary)
                                    .frame(width: 8, height: 8)
                                Text("\(influence.planet) \(influence.lineType)")
                                    .font(DSTypography.body)
                                    .foregroundStyle(DSColors.textPrimary)
                                Spacer()
                                Text(String(format: "%.0f km", influence.distanceKm))
                                    .font(DSTypography.caption)
                                    .foregroundStyle(DSColors.textTertiary)
                            }
                        }
                    }
                    .padding(DSSpacing.lg)
                    .background(DSColors.surfaceElevated)
                    .clipShape(.rect(cornerRadius: DSRadius.card))
                    .padding(.horizontal, DSSpacing.lg)
                }

                Spacer()

                // CTA button
                Button {
                    viewModel.startNewEntry(
                        latitude: latitude,
                        longitude: longitude,
                        placeName: placeName,
                        daysStayed: daysStayed
                    )
                } label: {
                    Text("Start Writing")
                        .font(DSTypography.titleS)
                        .fontWeight(.semibold)
                        .foregroundStyle(.white)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, DSSpacing.md)
                        .background(DSColors.brandPrimary)
                        .clipShape(.rect(cornerRadius: DSRadius.card))
                }
                .padding(.horizontal, DSSpacing.lg)

                Button("Maybe Later") { dismiss() }
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textTertiary)
                    .padding(.bottom, DSSpacing.lg)
            }
            .padding(.top, DSSpacing.xl)
            .background(DSColors.background)
            .sheet(isPresented: $viewModel.isShowingEntryEditor) {
                JournalEntryView(viewModel: viewModel)
            }
            .task {
                await viewModel.detectInfluences(latitude: latitude, longitude: longitude)
            }
        }
    }
}
