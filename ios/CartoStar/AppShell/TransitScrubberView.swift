import SwiftUI
import DesignSystem
import FeatureGlobe

/// Timeline scrubber for transit line visualization.
/// Theme-aware: uses acGlassText colors for proper contrast in light/dark modes.
struct TransitScrubberView: View {

    @Binding var transitDate: Date
    @Binding var isPlaying: Bool
    let onClose: () -> Void
    var onDateChanged: (() async -> Void)?

    // Filter bindings
    var filterPlanets: Binding<Set<Planet>>
    var filterLineTypes: Binding<Set<AstroLineType>>
    var filterShowAspects: Binding<Bool>
    var filterShowParans: Binding<Bool>
    var hasActiveFilters: Bool = false
    var onSelectAll: (() -> Void)?
    var onClearAll: (() -> Void)?

    @Environment(\.colorScheme) private var colorScheme
    @Environment(\.horizontalSizeClass) private var horizontalSizeClass

    @State private var stepSize: StepSize = .day
    @State private var showFilters: Bool = false
    @State private var playbackTask: Task<Void, Never>?

    private var isIPad: Bool { horizontalSizeClass == .regular }

    // iPad-scaled sizing
    private var btnSize: CGFloat       { isIPad ? 36 : 28 }
    private var iconSize: CGFloat      { isIPad ? 14 : 11 }
    private var chipH: CGFloat         { isIPad ? 30 : 24 }
    private var symbolChipW: CGFloat   { isIPad ? 36 : 28 }  // iPhone symbol-only planet chip
    private var stepChipW: CGFloat     { isIPad ? 32 : 26 }
    private var stepChipH: CGFloat     { isIPad ? 28 : 22 }
    private var lineTypeChipW: CGFloat { isIPad ? 40 : 32 }
    private var symbolFontSize: CGFloat{ isIPad ? 15 : 12 }
    private var nameFontSize: CGFloat  { isIPad ? 11 : 9 }
    private var chipFontSize: CGFloat  { isIPad ? 12 : 10 }
    private var dateFontSize: CGFloat  { isIPad ? 15 : 12 }
    private var yearFontSize: CGFloat  { isIPad ? 11 : 9 }
    private var hSpacing: CGFloat      { isIPad ? 10 : 6 }
    private var vSpacing: CGFloat      { isIPad ? 12 : 8 }
    private var hPad: CGFloat          { isIPad ? 18 : 14 }
    private var vPad: CGFloat          { isIPad ? 14 : 10 }
    private var filterSpacing: CGFloat { isIPad ? 14 : 10 }
    private var filterTitleSize: CGFloat { isIPad ? 14 : 12 }

    enum StepSize: String, CaseIterable {
        case hour = "1h"
        case day = "1d"
        case week = "1w"
        case month = "1m"
        case year = "1y"

        var days: Double {
            switch self {
            case .hour: return 1.0 / 24.0
            case .day: return 1
            case .week: return 7
            case .month: return 30
            case .year: return 365
            }
        }
    }

    // Ephemeris range: 1860–2050
    private static let rangeStart = Calendar.current.date(from: DateComponents(year: 1860, month: 1, day: 1))!
    private static let rangeEnd = Calendar.current.date(from: DateComponents(year: 2050, month: 12, day: 31))!
    private static let totalDays: Double = {
        Calendar.current.dateComponents([.day], from: rangeStart, to: rangeEnd).day.map(Double.init) ?? 69613
    }()

    private var currentOffset: Double {
        let days = Calendar.current.dateComponents([.day], from: Self.rangeStart, to: transitDate).day ?? 0
        return Double(max(0, min(days, Int(Self.totalDays))))
    }

    // Theme-aware colors
    private var primaryText: Color { Color.acGlassTextPrimary }
    private var secondaryText: Color { Color.acGlassTextSecondary }
    private var mutedText: Color { colorScheme == .dark ? .white.opacity(0.35) : .black.opacity(0.35) }
    private var chipBg: Color { colorScheme == .dark ? Color.white.opacity(0.08) : Color.black.opacity(0.06) }
    private var closeBg: Color { colorScheme == .dark ? Color.white.opacity(0.1) : Color.black.opacity(0.08) }
    private var borderColor: Color { colorScheme == .dark ? Color.white.opacity(0.1) : Color.black.opacity(0.08) }

    private static let dateFormatter: DateFormatter = {
        let f = DateFormatter(); f.dateStyle = .medium; f.timeStyle = .none; return f
    }()

    private static let dateTimeFormatter: DateFormatter = {
        let f = DateFormatter(); f.dateStyle = .medium; f.timeStyle = .short; return f
    }()

    var body: some View {
        VStack(spacing: vSpacing) {
            // Row 1: Playback controls + step size
            HStack(spacing: hSpacing) {
                // Close
                Button { onClose() } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: iconSize, weight: .semibold))
                        .foregroundStyle(secondaryText)
                        .frame(width: btnSize, height: btnSize)
                        .background(closeBg)
                        .clipShape(Circle())
                }

                // Play/Pause
                Button { isPlaying.toggle() } label: {
                    Image(systemName: isPlaying ? "pause.fill" : "play.fill")
                        .font(.system(size: iconSize))
                        .foregroundStyle(.white)
                        .frame(width: btnSize, height: btnSize)
                        .background(Color(hex: "#22C55E"))
                        .clipShape(Circle())
                }

                // Step back
                Button { step(-1) } label: {
                    Image(systemName: "chevron.left")
                        .font(.system(size: iconSize, weight: .semibold))
                        .foregroundStyle(secondaryText)
                        .frame(width: btnSize - 4, height: btnSize)
                }

                // Step forward
                Button { step(1) } label: {
                    Image(systemName: "chevron.right")
                        .font(.system(size: iconSize, weight: .semibold))
                        .foregroundStyle(secondaryText)
                        .frame(width: btnSize - 4, height: btnSize)
                }

                // Step size chips
                HStack(spacing: 2) {
                    ForEach(StepSize.allCases, id: \.rawValue) { size in
                        Button { stepSize = size } label: {
                            Text(size.rawValue)
                                .font(.system(size: chipFontSize, weight: .bold))
                                .foregroundStyle(stepSize == size ? .white : secondaryText)
                                .frame(width: stepChipW, height: stepChipH)
                                .background(stepSize == size ? Color(hex: "#22C55E") : chipBg)
                                .clipShape(RoundedRectangle(cornerRadius: 5))
                        }
                    }
                }

                Spacer()

                // Filter toggle
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) { showFilters.toggle() }
                } label: {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: iconSize, weight: .medium))
                        .foregroundStyle((showFilters || hasActiveFilters) ? .white : secondaryText)
                        .frame(width: btnSize, height: btnSize)
                        .background((showFilters || hasActiveFilters) ? Color(hex: "#22C55E") : closeBg)
                        .clipShape(Circle())
                }

                // Today reset
                Button {
                    withAnimation(.easeInOut(duration: 0.2)) {
                        transitDate = todayNoon()
                    }
                    Task { await onDateChanged?() }
                } label: {
                    Image(systemName: "arrow.counterclockwise")
                        .font(.system(size: iconSize, weight: .medium))
                        .foregroundStyle(secondaryText)
                        .frame(width: btnSize, height: btnSize)
                }
            }

            // Date display
            Text(stepSize == .hour
                 ? Self.dateTimeFormatter.string(from: transitDate)
                 : Self.dateFormatter.string(from: transitDate))
                .font(.system(size: dateFontSize, weight: .semibold, design: .monospaced))
                .foregroundStyle(primaryText)

            // Timeline slider
            HStack(spacing: 8) {
                Text(yearLabel(Self.rangeStart))
                    .font(.system(size: yearFontSize, weight: .medium))
                    .foregroundStyle(mutedText)

                Slider(
                    value: Binding(
                        get: { currentOffset },
                        set: { newOffset in
                            transitDate = dateFromOffset(newOffset)
                            Task { await onDateChanged?() }
                        }
                    ),
                    in: 0...Self.totalDays,
                    step: stepSize == .hour ? (1.0 / 24.0) : 1
                )
                .tint(Color(hex: "#22C55E"))

                Text(yearLabel(Self.rangeEnd))
                    .font(.system(size: yearFontSize, weight: .medium))
                    .foregroundStyle(mutedText)
            }

            // Filter pane (collapsible)
            if showFilters {
                transitFilterPane
            }
        }
        .padding(.horizontal, hPad)
        .padding(.vertical, vPad)
        .background(
            RoundedRectangle(cornerRadius: 16)
                .fill(Color.acDarkGlassBackground.opacity(0.95))
                .overlay(RoundedRectangle(cornerRadius: 16).stroke(borderColor, lineWidth: 1))
                .shadow(color: .black.opacity(0.15), radius: 12, y: 4)
        )
        .onChange(of: isPlaying) { _, playing in
            if playing {
                startPlayback()
            } else {
                playbackTask?.cancel()
                playbackTask = nil
            }
        }
    }

    // MARK: - Transit Filter Pane

    private var transitFilterPane: some View {
        VStack(spacing: filterSpacing) {
            Divider().background(borderColor)

            // Header: title + All/None
            HStack {
                Text("Transit Filters")
                    .font(.system(size: filterTitleSize, weight: .semibold))
                    .foregroundStyle(primaryText)
                Spacer()
                Button("All") { onSelectAll?() }
                    .font(.system(size: filterTitleSize - 1, weight: .medium))
                    .foregroundStyle(Color(hex: "#22C55E"))
                Button("None") { onClearAll?() }
                    .font(.system(size: filterTitleSize - 1, weight: .medium))
                    .foregroundStyle(secondaryText)
            }

            // Planet chips (2 rows)
            let planetRows: [[Planet]] = [
                [.sun, .moon, .mercury, .venus, .mars, .jupiter, .saturn],
                [.uranus, .neptune, .pluto, .chiron, .northNode, .southNode]
            ]

            ForEach(0..<planetRows.count, id: \.self) { row in
                HStack(spacing: 4) {
                    ForEach(planetRows[row], id: \.rawValue) { planet in
                        Button {
                            if filterPlanets.wrappedValue.contains(planet) {
                                filterPlanets.wrappedValue.remove(planet)
                            } else {
                                filterPlanets.wrappedValue.insert(planet)
                            }
                        } label: {
                            let isOn = filterPlanets.wrappedValue.contains(planet)
                            HStack(spacing: 3) {
                                Text(planet.symbol)
                                    .font(.system(size: symbolFontSize))
                                if isIPad {
                                    Text(planet.transitFilterShortName)
                                        .font(.system(size: nameFontSize, weight: .medium))
                                }
                            }
                            .padding(.horizontal, isIPad ? 6 : 0)
                            .frame(width: isIPad ? nil : symbolChipW, height: chipH)
                            .background(isOn ? planet.cardColor : chipBg)
                            .foregroundStyle(isOn ? .white : secondaryText)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                        }
                    }
                }
            }

            // Line types + aspect/paran toggles
            HStack(spacing: 4) {
                ForEach(AstroLineType.allCases, id: \.rawValue) { lt in
                    Button {
                        if filterLineTypes.wrappedValue.contains(lt) {
                            filterLineTypes.wrappedValue.remove(lt)
                        } else {
                            filterLineTypes.wrappedValue.insert(lt)
                        }
                    } label: {
                        Text(lt.shortName)
                            .font(.system(size: chipFontSize, weight: .bold))
                            .frame(width: lineTypeChipW, height: chipH)
                            .background(filterLineTypes.wrappedValue.contains(lt) ? Color(hex: "#22C55E") : chipBg)
                            .foregroundStyle(filterLineTypes.wrappedValue.contains(lt) ? .white : secondaryText)
                            .clipShape(RoundedRectangle(cornerRadius: 6))
                    }
                }

                Rectangle().fill(borderColor).frame(width: 1, height: chipH)

                Button {
                    filterShowAspects.wrappedValue.toggle()
                } label: {
                    Text("Aspects")
                        .font(.system(size: chipFontSize, weight: .medium))
                        .padding(.horizontal, isIPad ? 8 : 6)
                        .frame(height: chipH)
                        .background(filterShowAspects.wrappedValue ? Color(hex: "#22C55E") : chipBg)
                        .foregroundStyle(filterShowAspects.wrappedValue ? .white : secondaryText)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }

                Button {
                    filterShowParans.wrappedValue.toggle()
                } label: {
                    Text("Parans")
                        .font(.system(size: chipFontSize, weight: .medium))
                        .padding(.horizontal, isIPad ? 8 : 6)
                        .frame(height: chipH)
                        .background(filterShowParans.wrappedValue ? Color(hex: "#22C55E") : chipBg)
                        .foregroundStyle(filterShowParans.wrappedValue ? .white : secondaryText)
                        .clipShape(RoundedRectangle(cornerRadius: 6))
                }
            }
        }
        .transition(.opacity.combined(with: .move(edge: .top)))
    }

    // MARK: - Helpers

    private func step(_ direction: Int) {
        let interval = stepSize.days * 86400 * Double(direction)
        transitDate = clamp(transitDate.addingTimeInterval(interval))
        Task { await onDateChanged?() }
        UIImpactFeedbackGenerator(style: .light).impactOccurred()
    }

    private func dateFromOffset(_ offset: Double) -> Date {
        clamp(Self.rangeStart.addingTimeInterval(offset * 86400))
    }

    private func clamp(_ date: Date) -> Date {
        min(max(date, Self.rangeStart), Self.rangeEnd)
    }

    private func todayNoon() -> Date {
        var c = Calendar.current.dateComponents([.year, .month, .day], from: Date())
        c.hour = 12
        return Calendar.current.date(from: c) ?? Date()
    }

    private func yearLabel(_ date: Date) -> String {
        "\(Calendar.current.component(.year, from: date))"
    }

    private func startPlayback() {
        // Cancel any existing playback task to prevent duplicate loops
        playbackTask?.cancel()
        playbackTask = Task { @MainActor in
            while isPlaying, !Task.isCancelled {
                let newDate = transitDate.addingTimeInterval(stepSize.days * 86400)
                if newDate >= Self.rangeEnd { isPlaying = false; break }
                transitDate = newDate

                // Run calculation and minimum display delay concurrently.
                // The loop waits for BOTH: the calc result must arrive before advancing,
                // and at least 400 ms must pass so each frame is visible.
                if let onChange = onDateChanged {
                    async let calc: Void = onChange()
                    async let minDelay: Void = Task.sleep(for: .milliseconds(400))
                    await calc
                    try? await minDelay
                } else {
                    try? await Task.sleep(for: .milliseconds(400))
                }
            }
        }
    }
}

#if DEBUG
struct TransitScrubberPreview: View {
    @State private var date = Date()
    @State private var playing = false
    @State private var planets = Set(Planet.allCases)
    @State private var lineTypes = Set(AstroLineType.allCases)
    @State private var aspects = true
    @State private var parans = true
    var body: some View {
        ZStack {
            Color.acBackground.ignoresSafeArea()
            VStack {
                Spacer()
                TransitScrubberView(
                    transitDate: $date, isPlaying: $playing, onClose: {}, onDateChanged: {},
                    filterPlanets: $planets, filterLineTypes: $lineTypes,
                    filterShowAspects: $aspects, filterShowParans: $parans
                )
                    .padding(.horizontal, 16).padding(.bottom, 40)
            }
        }
    }
}
#Preview("Dark") { TransitScrubberPreview().preferredColorScheme(.dark) }
#Preview("Light") { TransitScrubberPreview().preferredColorScheme(.light) }
#endif
