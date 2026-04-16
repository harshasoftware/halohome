import SwiftUI
import DesignSystem
import Core

// MARK: - Main Toolbar

/// Bottom floating action bar for the main app view
/// Uses iOS 26+ Liquid Glass API with fallback for earlier versions
@available(iOS 17.0, *)
struct MainToolbar: View {

    // MARK: - Properties

    @Binding var isDuoModeEnabled: Bool
    @Binding var isNatalChartVisible: Bool
    var isScoutComputing: Bool = false
    let onScoutTap: () -> Void
    let onDuoTap: () -> Void
    let onChartTap: () -> Void
    let onNatalChartTap: () -> Void
    let onLineFiltersTap: () -> Void
    let onFavoritesTap: () -> Void
    let onExportTap: () -> Void
    let onJournalTap: () -> Void
    let onConsultTap: () -> Void
    let onSettingsTap: () -> Void

    @State private var isExpanded = false

    // MARK: - Body

    var body: some View {
        toolbarContent
    }

    @ViewBuilder
    private var toolbarContent: some View {
        if #available(iOS 26, *) {
            // iOS 26+: Use native Liquid Glass
            GlassEffectContainer(spacing: 8) {
                HStack(spacing: 0) {
                    toolbarButtons
                }
                .padding(.horizontal, DSSpacing.lg)
                .padding(.vertical, DSSpacing.md)
                .glassEffect(.regular, in: .capsule)
            }
        } else {
            // Fallback for iOS 17-25
            HStack(spacing: 0) {
                toolbarButtons
            }
            .padding(.horizontal, DSSpacing.lg)
            .padding(.vertical, DSSpacing.md)
            .background(toolbarBackground)
            .clipShape(Capsule())
            .shadow(color: .black.opacity(0.3), radius: 20, x: 0, y: 10)
            .overlay(
                Capsule()
                    .stroke(LinearGradient.acGlassBorderGradient, lineWidth: 1)
            )
        }
    }

    @ViewBuilder
    private var toolbarButtons: some View {
        // Scout button - shows spinner when computing
        Button(action: {
            Haptics.tap()
            onScoutTap()
        }) {
            VStack(spacing: DSSpacing.xs) {
                if isScoutComputing {
                    ProgressView()
                        .progressViewStyle(CircularProgressViewStyle(tint: Color.acAmber500))
                        .scaleEffect(0.8)
                        .frame(width: 24, height: 24)
                } else {
                    Image(systemName: "binoculars")
                        .font(.system(size: 20, weight: .regular))
                        .foregroundStyle(Color.acMutedForeground)
                        .frame(width: 24, height: 24)
                }

                Text("Scout")
                    .saiScaledFont(size: 10, weight: .medium, relativeTo: .caption2)
                    .foregroundStyle(isScoutComputing ? Color.acAmber500 : Color.acMutedForeground.opacity(0.8))
            }
            .frame(width: 48, height: 48)
            .contentShape(Rectangle())
        }
        .buttonStyle(ToolbarButtonStyle(isActive: isScoutComputing))
        .accessibilityLabel("Scout")
        .accessibilityHint(isScoutComputing ? "Scout is computing" : "Double tap to open Scout")

        toolbarDivider

        // Duo mode toggle
        ToolbarButton(
            icon: isDuoModeEnabled ? "person.2.fill" : "person.2",
            label: "Duo",
            isActive: isDuoModeEnabled,
            action: onDuoTap
        )

        toolbarDivider

        // Chart picker button (My Charts)
        ToolbarButton(
            icon: "chart.pie",
            label: "Charts",
            isActive: false,
            action: onChartTap
        )

        toolbarDivider

        // Natal Chart toggle
        ToolbarButton(
            icon: isNatalChartVisible ? "circle.grid.cross.fill" : "circle.grid.cross",
            label: "Natal",
            isActive: isNatalChartVisible,
            action: onNatalChartTap
        )

        toolbarDivider

        // Line filters button
        ToolbarButton(
            icon: "line.3.horizontal.decrease",
            label: "Lines",
            isActive: false,
            action: onLineFiltersTap
        )

        toolbarDivider

        // Favorites button
        ToolbarButton(
            icon: "heart",
            label: "Favorites",
            isActive: false,
            action: onFavoritesTap
        )

        toolbarDivider

        // Export report button
        ToolbarButton(
            icon: "doc.richtext",
            label: "Export",
            isActive: false,
            action: onExportTap
        )

        toolbarDivider

        // Journal button
        ToolbarButton(
            icon: "book",
            label: "Journal",
            isActive: false,
            action: onJournalTap
        )

        toolbarDivider

        // Consult button
        ToolbarButton(
            icon: "calendar.badge.clock",
            label: "Consult",
            isActive: false,
            action: onConsultTap
        )

        toolbarDivider

        // Settings button
        ToolbarButton(
            icon: "gearshape",
            label: "Settings",
            isActive: false,
            action: onSettingsTap
        )
    }

    private var toolbarDivider: some View {
        Divider()
            .frame(height: 24)
            .background(Color.acGlassBorder)
            .accessibilityHidden(true)
    }

    // MARK: - Fallback Background

    private var toolbarBackground: some View {
        ZStack {
            // Base glass effect
            Capsule()
                .fill(.ultraThinMaterial)

            // Dark overlay for cosmic feel
            Capsule()
                .fill(Color.acBackground.opacity(0.7))
        }
    }
}

// MARK: - Toolbar Button

@available(iOS 17.0, *)
struct ToolbarButton: View {

    let icon: String
    let label: String
    let isActive: Bool
    let action: () -> Void

    @State private var isPressed = false

    var body: some View {
        Button(action: {
            Haptics.tap()
            action()
        }) {
            VStack(spacing: DSSpacing.xs) {
                Image(systemName: icon)
                    .font(.system(size: 20, weight: isActive ? .semibold : .regular))
                    .foregroundStyle(iconColor)
                    .frame(width: 24, height: 24)
                    .dynamicTypeSize(...DynamicTypeSize.accessibility1)

                Text(label)
                    .saiScaledFont(size: 10, weight: .medium, relativeTo: .caption2)
                    .foregroundStyle(labelColor)
            }
            .frame(width: 48, height: 48)
            .contentShape(Rectangle())
        }
        .buttonStyle(ToolbarButtonStyle(isActive: isActive))
        .accessibilityLabel(label)
        .accessibilityHint("Double tap to open \(label)")
        .accessibilityAddTraits(isActive ? .isSelected : [])
    }

    private var iconColor: Color {
        isActive ? Color.acAmber500 : Color.acMutedForeground
    }

    private var labelColor: Color {
        isActive ? Color.acAmber500 : Color.acMutedForeground.opacity(0.8)
    }
}

// MARK: - Button Style

struct ToolbarButtonStyle: ButtonStyle {
    let isActive: Bool

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.92 : 1.0)
            .animation(SAIMotion.quick, value: configuration.isPressed)
    }
}

// MARK: - Floating Action Button

/// Primary floating action button for key actions
@available(iOS 17.0, *)
struct FloatingActionButton: View {

    let icon: String
    let label: String
    let action: () -> Void

    @State private var isPressed = false

    var body: some View {
        Button(action: {
            Haptics.impact(.medium)
            action()
        }) {
            HStack(spacing: DSSpacing.sm) {
                Image(systemName: icon)
                    .font(.system(size: 18, weight: .semibold))

                Text(label)
                    .font(.system(size: 15, weight: .semibold))
            }
            .foregroundStyle(Color.acBackground)
            .padding(.horizontal, DSSpacing.xl)
            .padding(.vertical, DSSpacing.lg)
            .background(
                Capsule()
                    .fill(LinearGradient.acAmberGradient)
            )
            .shadow(color: Color.acAmber500.opacity(0.4), radius: 12, x: 0, y: 6)
        }
        .buttonStyle(FABButtonStyle())
        .accessibilityLabel(label)
    }
}

struct FABButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .scaleEffect(configuration.isPressed ? 0.95 : 1.0)
            .animation(SAIMotion.spring, value: configuration.isPressed)
    }
}

// MARK: - Compact Toolbar (Minimal Mode)

/// Minimal toolbar with just essential actions
@available(iOS 17.0, *)
struct CompactToolbar: View {

    let onMenuTap: () -> Void
    let onSearchTap: () -> Void

    var body: some View {
        HStack(spacing: DSSpacing.lg) {
            // Menu button
            Button(action: {
                Haptics.tap()
                onMenuTap()
            }) {
                Image(systemName: "line.3.horizontal")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(Color.acForeground)
                    .frame(width: 44, height: 44)
                    .acDarkGlass(in: Circle())
            }
            .accessibilityLabel("Open menu")

            Spacer()

            // Search button
            Button(action: {
                Haptics.tap()
                onSearchTap()
            }) {
                Image(systemName: "magnifyingglass")
                    .font(.system(size: 20, weight: .medium))
                    .foregroundStyle(Color.acForeground)
                    .frame(width: 44, height: 44)
                    .acDarkGlass(in: Circle())
            }
            .accessibilityLabel("Search")
        }
        .padding(.horizontal, DSSpacing.lg)
    }
}

// MARK: - Haptics Helper

enum Haptics {
    static func tap() {
        let generator = UIImpactFeedbackGenerator(style: .light)
        generator.impactOccurred()
    }

    static func impact(_ style: UIImpactFeedbackGenerator.FeedbackStyle) {
        let generator = UIImpactFeedbackGenerator(style: style)
        generator.impactOccurred()
    }

    static func success() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.success)
    }

    static func error() {
        let generator = UINotificationFeedbackGenerator()
        generator.notificationOccurred(.error)
    }
}

// MARK: - Preview

#if DEBUG
@available(iOS 17.0, *)
#Preview("Main Toolbar") {
    ZStack {
        Color.acBackground
            .ignoresSafeArea()

        VStack {
            Spacer()

            MainToolbar(
                isDuoModeEnabled: .constant(false),
                isNatalChartVisible: .constant(false),
                isScoutComputing: false,
                onScoutTap: {},
                onDuoTap: {},
                onChartTap: {},
                onNatalChartTap: {},
                onLineFiltersTap: {},
                onFavoritesTap: {},
                onExportTap: {},
                onJournalTap: {},
                onConsultTap: {},
                onSettingsTap: {}
            )
            .padding(.bottom, 32)
        }
    }
    .preferredColorScheme(.dark)
}

@available(iOS 17.0, *)
#Preview("Toolbar with Scout Computing") {
    ZStack {
        Color.acBackground
            .ignoresSafeArea()

        VStack {
            Spacer()

            MainToolbar(
                isDuoModeEnabled: .constant(false),
                isNatalChartVisible: .constant(false),
                isScoutComputing: true,
                onScoutTap: {},
                onDuoTap: {},
                onChartTap: {},
                onNatalChartTap: {},
                onLineFiltersTap: {},
                onFavoritesTap: {},
                onExportTap: {},
                onJournalTap: {},
                onConsultTap: {},
                onSettingsTap: {}
            )
            .padding(.bottom, 32)
        }
    }
    .preferredColorScheme(.dark)
}

@available(iOS 17.0, *)
#Preview("Toolbar with Duo Active") {
    ZStack {
        Color.acBackground
            .ignoresSafeArea()

        VStack {
            Spacer()

            MainToolbar(
                isDuoModeEnabled: .constant(true),
                isNatalChartVisible: .constant(false),
                isScoutComputing: false,
                onScoutTap: {},
                onDuoTap: {},
                onChartTap: {},
                onNatalChartTap: {},
                onLineFiltersTap: {},
                onFavoritesTap: {},
                onExportTap: {},
                onJournalTap: {},
                onConsultTap: {},
                onSettingsTap: {}
            )
            .padding(.bottom, 32)
        }
    }
    .preferredColorScheme(.dark)
}

@available(iOS 17.0, *)
#Preview("Floating Action Button") {
    ZStack {
        Color.acBackground
            .ignoresSafeArea()

        FloatingActionButton(
            icon: "plus",
            label: "Add Chart",
            action: {}
        )
    }
    .preferredColorScheme(.dark)
}
#endif
