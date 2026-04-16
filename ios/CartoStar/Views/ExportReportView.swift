import SwiftUI
import DesignSystem
import FeatureGlobe
import Core

// MARK: - Export Report View

/// Line selection and PDF export view matching the web app's LineReportPanel
@available(iOS 17.0, *)
struct ExportReportView: View {

    // MARK: - Properties

    let astroLines: [AstroLine]
    let birthDate: String
    let birthTime: String
    let birthLocation: String
    let onDismiss: () -> Void

    @State private var selectedLines: Set<String> = [] // AstroLine.id set
    @State private var isGenerating = false
    @State private var generatedPDF: Data?
    @State private var showShareSheet = false

    private let lineTypes: [AstroLineType] = [.midheaven, .imumCoeli, .ascendant, .descendant]

    // MARK: - Computed

    private var linesByPlanet: [(Planet, [AstroLine])] {
        var grouped: [Planet: [AstroLine]] = [:]
        for line in astroLines {
            grouped[line.planet, default: []].append(line)
        }
        return Planet.allCases.compactMap { planet in
            guard let lines = grouped[planet], !lines.isEmpty else { return nil }
            return (planet, lines)
        }
    }

    private var selectedCount: Int { selectedLines.count }

    // MARK: - Body

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: DSSpacing.lg) {
                    headerSection
                    quickActions
                    lineSelectionGrid
                }
                .padding(DSSpacing.lg)
            }
            .background(DSColors.background)
            .navigationTitle("Export Report")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    generateButton
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") { onDismiss() }
                }
            }
            .sheet(isPresented: $showShareSheet) {
                if let pdf = generatedPDF {
                    ShareSheet(items: [pdf], filename: AstroReportGenerator.suggestedFilename())
                }
            }
        }
    }

    // MARK: - Header

    private var headerSection: some View {
        VStack(alignment: .leading, spacing: DSSpacing.sm) {
            HStack(spacing: DSSpacing.md) {
                Image(systemName: "doc.richtext")
                    .font(.system(size: 24))
                    .foregroundStyle(DSColors.accentPrimary)
                    .frame(width: 44, height: 44)
                    .background(DSColors.surfaceTinted)
                    .clipShape(Circle())

                VStack(alignment: .leading, spacing: 2) {
                    Text("PDF Report")
                        .font(.system(size: 17, weight: .semibold))
                        .foregroundStyle(DSColors.textPrimary)

                    Text("Select planetary lines to include")
                        .font(.system(size: 13))
                        .foregroundStyle(DSColors.textSecondary)
                }

                Spacer()

                Text("\(selectedCount)")
                    .font(.system(size: 20, weight: .bold))
                    .foregroundStyle(DSColors.accentPrimary)
                + Text(" lines")
                    .font(.system(size: 13))
                    .foregroundStyle(DSColors.textSecondary)
            }

            Divider()
                .background(DSColors.borderSubtle)

            VStack(alignment: .leading, spacing: 2) {
                Text("Report for")
                    .font(.system(size: 11))
                    .foregroundStyle(DSColors.textSecondary)
                Text("\(birthDate) at \(birthTime)")
                    .font(.system(size: 13, weight: .medium))
                    .foregroundStyle(DSColors.textPrimary)
                Text(birthLocation)
                    .font(.system(size: 12))
                    .foregroundStyle(DSColors.textSecondary)
            }
        }
        .padding(DSSpacing.md)
        .background(DSColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    // MARK: - Generate Button (toolbar)

    private var generateButton: some View {
        Button {
            generateReport()
        } label: {
            HStack(spacing: 5) {
                if isGenerating {
                    ProgressView()
                        .tint(DSColors.accentPrimary)
                } else {
                    Image(systemName: "arrow.down.doc.fill")
                }
                Text(isGenerating ? "Generating..." : "Generate (\(selectedCount))")
                    .font(.system(size: 14, weight: .semibold))
            }
        }
        .disabled(selectedLines.isEmpty || isGenerating)
    }

    // MARK: - Quick Actions

    private var quickActions: some View {
        HStack(spacing: DSSpacing.sm) {
            Button {
                withAnimation(SAIMotion.quick) {
                    selectedLines = Set(astroLines.map(\.id))
                }
            } label: {
                Text("Select All")
                    .font(.system(size: 14, weight: .medium))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, DSSpacing.sm)
                    .background(DSColors.surfaceElevated)
                    .foregroundStyle(DSColors.textPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }

            Button {
                withAnimation(SAIMotion.quick) {
                    selectedLines.removeAll()
                }
            } label: {
                Text("Clear")
                    .font(.system(size: 14, weight: .medium))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, DSSpacing.sm)
                    .background(DSColors.surfaceElevated)
                    .foregroundStyle(DSColors.textPrimary)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            }
        }
    }

    // MARK: - Line Selection Grid

    private var lineSelectionGrid: some View {
        VStack(spacing: 0) {
            // Column headers
            HStack(spacing: 0) {
                Text("Planet")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(DSColors.textSecondary)
                    .textCase(.uppercase)
                    .frame(width: 90, alignment: .leading)

                ForEach(lineTypes, id: \.self) { type in
                    Text(type.shortName)
                        .font(.system(size: 10, weight: .semibold))
                        .foregroundStyle(DSColors.textSecondary)
                        .textCase(.uppercase)
                        .frame(maxWidth: .infinity)
                }
            }
            .padding(.horizontal, DSSpacing.md)
            .padding(.vertical, DSSpacing.sm)

            Divider()
                .background(DSColors.borderSubtle)

            // Planet rows
            ForEach(linesByPlanet, id: \.0) { planet, lines in
                HStack(spacing: 0) {
                    // Planet name with color dot
                    HStack(spacing: 6) {
                        Circle()
                            .fill(planetColor(planet))
                            .frame(width: 10, height: 10)

                        Text(planet.rawValue)
                            .font(.system(size: 13, weight: .medium))
                            .foregroundStyle(planetColor(planet))
                    }
                    .frame(width: 90, alignment: .leading)

                    // Line type toggle buttons
                    ForEach(lineTypes, id: \.self) { lineType in
                        let line = lines.first(where: { $0.lineType == lineType })
                        if let line = line {
                            let isSelected = selectedLines.contains(line.id)
                            Button {
                                withAnimation(SAIMotion.quick) {
                                    if isSelected {
                                        selectedLines.remove(line.id)
                                    } else {
                                        selectedLines.insert(line.id)
                                    }
                                }
                            } label: {
                                HStack(spacing: 3) {
                                    if isSelected {
                                        Image(systemName: "checkmark")
                                            .font(.system(size: 10, weight: .bold))
                                    }
                                    Text(lineType.shortName)
                                        .font(.system(size: 12, weight: .medium))
                                }
                                .frame(maxWidth: .infinity)
                                .frame(height: 34)
                                .background(
                                    isSelected
                                        ? planetColor(planet)
                                        : DSColors.surfaceElevated
                                )
                                .foregroundStyle(isSelected ? Color.white : DSColors.textSecondary)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                            }
                            .padding(.horizontal, 2)
                        } else {
                            // No line available for this combo
                            RoundedRectangle(cornerRadius: 8)
                                .fill(DSColors.surfaceElevated.opacity(0.45))
                                .frame(height: 34)
                                .frame(maxWidth: .infinity)
                                .padding(.horizontal, 2)
                        }
                    }
                }
                .padding(.horizontal, DSSpacing.md)
                .padding(.vertical, 6)
            }
        }
        .background(DSColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 12))
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(DSColors.borderSubtle, lineWidth: 1)
        )
    }

    // MARK: - Actions

    private func generateReport() {
        isGenerating = true
        Haptics.impact(.medium)

        let linesToExport = astroLines.filter { selectedLines.contains($0.id) }

        Task.detached(priority: .userInitiated) {
            let config = ReportConfig(
                birthDate: birthDate,
                birthTime: birthTime,
                birthLocation: birthLocation,
                selectedLines: linesToExport,
                citiesPerLine: 5
            )
            let pdfData = await AstroReportGenerator.generateReport(config: config)

            await MainActor.run {
                generatedPDF = pdfData
                isGenerating = false
                showShareSheet = true
                Haptics.success()
            }
        }
    }

    // MARK: - Helpers

    private func planetColor(_ planet: Planet) -> Color {
        switch planet {
        case .sun: return Color.acPlanetSun
        case .moon: return Color.acPlanetMoon
        case .mercury: return Color.acPlanetMercury
        case .venus: return Color.acPlanetVenus
        case .mars: return Color.acPlanetMars
        case .jupiter: return Color.acPlanetJupiter
        case .saturn: return Color.acPlanetSaturn
        case .uranus: return Color.acPlanetUranus
        case .neptune: return Color.acPlanetNeptune
        case .pluto: return Color.acPlanetPluto
        case .chiron: return Color.acPlanetChiron
        case .northNode: return Color.acPlanetNorthNode
        case .southNode: return Color.acPlanetSouthNode
        }
    }
}

// MARK: - Share Sheet (UIActivityViewController wrapper)

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]
    let filename: String

    func makeUIViewController(context: Context) -> UIActivityViewController {
        // Write PDF data to a temp file so it has a proper filename
        var activityItems: [Any] = []
        if let pdfData = items.first as? Data {
            let tempURL = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
            try? pdfData.write(to: tempURL)
            activityItems = [tempURL]
        } else {
            activityItems = items
        }

        let controller = UIActivityViewController(
            activityItems: activityItems,
            applicationActivities: nil
        )
        // Clean up temp file after sharing completes
        controller.completionWithItemsHandler = { _, _, _, _ in
            if let tempURL = activityItems.first as? URL {
                try? FileManager.default.removeItem(at: tempURL)
            }
        }
        return controller
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
