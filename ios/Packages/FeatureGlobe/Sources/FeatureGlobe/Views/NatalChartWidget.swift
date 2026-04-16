import SwiftUI
import DesignSystem

// MARK: - Natal Chart Widget

/// Overlay widget that displays the natal chart on the globe view.
/// Two modes: compact (draggable/resizable widget) and expanded (full-screen sheet).
/// - Drag the title bar to move the widget around the screen
/// - Use the bottom-left resize handle to toggle between large and small sizes
@available(iOS 17.0, *)
public struct NatalChartWidget: View {

    let chartData: NatalChartData
    @Binding var houseSystem: String
    @Binding var useSidereal: Bool
    @Binding var ayanamsaSystem: String
    let onSettingsChanged: () -> Void

    @State private var showExpanded = false
    @State private var isLargeSize = true  // Toggle between large (240) and small (160)
    @State private var offset: CGSize = .zero  // Current drag offset
    @State private var lastOffset: CGSize = .zero  // Accumulated offset
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    // Chart sizes
    private var chartSize: CGFloat { isLargeSize ? 240 : 160 }
    private var containerWidth: CGFloat { chartSize + 40 }

    public init(
        chartData: NatalChartData,
        houseSystem: Binding<String>,
        useSidereal: Binding<Bool>,
        ayanamsaSystem: Binding<String>,
        onSettingsChanged: @escaping () -> Void
    ) {
        self.chartData = chartData
        self._houseSystem = houseSystem
        self._useSidereal = useSidereal
        self._ayanamsaSystem = ayanamsaSystem
        self.onSettingsChanged = onSettingsChanged
    }

    public var body: some View {
        compactView
            .offset(x: offset.width + lastOffset.width, y: offset.height + lastOffset.height)
            .animation(.spring(response: 0.3, dampingFraction: 0.8), value: isLargeSize)
            .sheet(isPresented: $showExpanded) {
                expandedSheet
            }
    }

    // MARK: - Compact View

    private var compactView: some View {
        VStack(spacing: 4) {
            // Draggable title bar
            titleBar
                .gesture(dragGesture)

            // Chart (tap to expand to sheet)
            NatalChartView(chartData: chartData, size: chartSize)
                .onTapGesture {
                    showExpanded = true
                }

            // Bottom bar with resize handle
            bottomBar
        }
        .frame(width: containerWidth)
        .padding(.bottom, 8)
        .acLiquidGlass(cornerRadius: ACRadius.glassDefault)
        .contentShape(Rectangle())
    }

    // MARK: - Title Bar (Draggable)

    private var titleBar: some View {
        HStack {
            Spacer()

            Text("Natal Chart")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(Color.acGlassTextSecondary)

            Spacer()
        }
        .padding(.horizontal, 12)
        .padding(.vertical, 8)
        .contentShape(Rectangle())
        .accessibilityLabel("Natal Chart. Drag to move.")
        .accessibilityHint("Drag to reposition the chart widget on the screen")
    }

    // MARK: - Bottom Bar with Resize Handle

    private var bottomBar: some View {
        HStack {
            // Resize handle (bottom-left)
            Button {
                withAnimation(.spring(response: 0.3, dampingFraction: 0.8)) {
                    isLargeSize.toggle()
                }
            } label: {
                Image(systemName: isLargeSize ? "arrow.down.right.and.arrow.up.left" : "arrow.up.left.and.arrow.down.right")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.acGlassTextSecondary)
                    .frame(width: 28, height: 28)
                    .contentShape(Rectangle())
            }
            .accessibilityLabel(isLargeSize ? "Compress chart" : "Expand chart")

            Spacer()

            // Expand to sheet button (bottom-right)
            Button {
                showExpanded = true
            } label: {
                Image(systemName: "arrow.up.forward.square")
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(Color.acGlassTextSecondary)
                    .frame(width: 28, height: 28)
                    .contentShape(Rectangle())
            }
            .accessibilityLabel("Open full chart details")
        }
        .padding(.horizontal, 8)
    }

    // MARK: - Drag Gesture

    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                offset = value.translation
            }
            .onEnded { value in
                lastOffset = CGSize(
                    width: lastOffset.width + value.translation.width,
                    height: lastOffset.height + value.translation.height
                )
                offset = .zero
            }
    }

    // MARK: - Expanded Sheet

    private var expandedSheet: some View {
        NavigationStack {
            Group {
                if horizontalSizeClass == .regular {
                    // iPad: tabbed layout — avoids width constraint issues in floating sheet
                    TabView {
                        GeometryReader { geo in
                            let chartSize = min(geo.size.width - 32, geo.size.height - 32)
                            ScrollView {
                                NatalChartView(chartData: chartData, size: chartSize)
                                    .padding(16)
                            }
                            .frame(maxWidth: .infinity, maxHeight: .infinity)
                        }
                        .tabItem { Label("Chart", systemImage: "circle.grid.cross") }

                        ScrollView {
                            VStack(spacing: 16) {
                                planetListSection
                                chartSettingsSection
                            }
                            .padding(16)
                        }
                        .tabItem { Label("Planets", systemImage: "star.circle") }
                    }
                } else {
                    // iPhone: vertical scroll layout
                    ScrollView {
                        VStack(spacing: 20) {
                            NatalChartView(chartData: chartData, size: 320)
                                .padding(.top, 8)
                            planetListSection
                            chartSettingsSection
                        }
                        .padding(16)
                    }
                }
            }
            .background(DSColors.background)
            .navigationTitle("Natal Chart")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarTrailing) {
                    Button("Done") {
                        showExpanded = false
                    }
                }
            }
        }
        .presentationDetents([.large])
        .presentationDragIndicator(.visible)
    }

    // MARK: - Planet List

    private var planetListSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Planet Positions")
                .font(.subheadline)
                .foregroundStyle(DSColors.textSecondary)

            LazyVGrid(columns: [
                GridItem(.flexible()),
                GridItem(.flexible()),
            ], spacing: 8) {
                ForEach(chartData.planets, id: \.planet) { planet in
                    planetRow(planet)
                }
            }
        }
        .padding(16)
        .background(DSColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(DSColors.borderSubtle, lineWidth: 1)
        )
    }

    private func planetRow(_ planet: NatalChartPlanet) -> some View {
        HStack(spacing: 6) {
            PlanetIconView(
                planetName: planet.planet,
                tint: planetColor(planet.planet),
                fallbackFontSize: 22
            )
                .frame(width: 28, height: 28)

            VStack(alignment: .leading, spacing: 1) {
                HStack(spacing: 2) {
                    Text(planet.planet)
                        .font(.caption)
                        .fontWeight(.medium)
                        .foregroundStyle(DSColors.textPrimary)

                    if planet.retrograde {
                        Text("℞")
                            .font(.caption2)
                            .foregroundStyle(.red)
                    }
                }

                HStack(spacing: 4) {
                    if let sign = ZodiacSign(signName: planet.signName) {
                        ZodiacIconView(
                            sign: sign,
                            tint: DSColors.textSecondary,
                            fallbackFontSize: 12
                        )
                        .frame(width: 14, height: 14)
                    }

                    Text("\(planet.signName) \(Int(planet.degreeInSign))° · H\(planet.house)")
                        .font(.caption2)
                        .foregroundStyle(DSColors.textSecondary)
                }
            }

            Spacer()
        }
        .padding(.horizontal, 8)
        .padding(.vertical, 6)
        .background(DSColors.surfaceElevated)
        .clipShape(RoundedRectangle(cornerRadius: 8))
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(planet.planet) in \(planet.signName) at \(Int(planet.degreeInSign)) degrees, house \(planet.house)\(planet.retrograde ? ", retrograde" : "")")
    }

    // MARK: - Settings

    private var chartSettingsSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Settings")
                .font(.subheadline)
                .foregroundStyle(DSColors.textSecondary)

            // House system picker
            HStack {
                Text("House System")
                    .font(.subheadline)
                    .foregroundStyle(DSColors.textPrimary)

                Spacer()

                Picker("House System", selection: $houseSystem) {
                    Text("Placidus").tag("placidus")
                    Text("Whole Sign").tag("whole_sign")
                    Text("Equal").tag("equal")
                    Text("Koch").tag("koch")
                    Text("Campanus").tag("campanus")
                    Text("Regiomontanus").tag("regiomontanus")
                    Text("Porphyry").tag("porphyry")
                    Text("Morinus").tag("morinus")
                }
                .pickerStyle(.menu)
                .onChange(of: houseSystem) { _, _ in
                    onSettingsChanged()
                }
            }

            // Zodiac type toggle
            Toggle(isOn: $useSidereal) {
                Text(useSidereal ? "Sidereal (Vedic)" : "Tropical (Western)")
                    .font(.subheadline)
                    .foregroundStyle(DSColors.textPrimary)
            }
            .onChange(of: useSidereal) { _, _ in
                onSettingsChanged()
            }

            // Ayanamsa picker (only visible in sidereal mode)
            if useSidereal {
                HStack {
                    Text("Ayanamsa")
                        .font(.subheadline)
                        .foregroundStyle(DSColors.textPrimary)

                    Spacer()

                    Picker("Ayanamsa", selection: $ayanamsaSystem) {
                        Text("Lahiri").tag("lahiri")
                        Text("Fagan-Bradley").tag("fagan_bradley")
                        Text("Raman").tag("raman")
                        Text("Krishnamurti").tag("krishnamurti")
                        Text("Yukteswar").tag("yukteswar")
                    }
                    .pickerStyle(.menu)
                    .onChange(of: ayanamsaSystem) { _, _ in
                        onSettingsChanged()
                    }
                }
            }
        }
        .padding(16)
        .background(DSColors.surface)
        .clipShape(RoundedRectangle(cornerRadius: 16))
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(DSColors.borderSubtle, lineWidth: 1)
        )
    }

    // MARK: - Helpers

    private func planetColor(_ name: String) -> Color {
        switch name {
        case "Sun": return Color.acPlanetSun
        case "Moon": return Color.acPlanetMoon
        case "Mercury": return Color.acPlanetMercury
        case "Venus": return Color.acPlanetVenus
        case "Mars": return Color.acPlanetMars
        case "Jupiter": return Color.acPlanetJupiter
        case "Saturn": return Color.acPlanetSaturn
        case "Uranus": return Color.acPlanetUranus
        case "Neptune": return Color.acPlanetNeptune
        case "Pluto": return Color.acPlanetPluto
        case "Chiron": return Color.acPlanetChiron
        case "NorthNode": return Color.acPlanetNorthNode
        case "SouthNode": return Color.acPlanetSouthNode
        default: return Color.white
        }
    }
}
