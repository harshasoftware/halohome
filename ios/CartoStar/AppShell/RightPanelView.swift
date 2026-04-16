import SwiftUI
import DesignSystem
import Core

// MARK: - Right Panel View

/// Slide-in panel for displaying location details, line info, and Scout results.
/// Supports two modes: `.overlay` (iPhone slide-in) and `.inline` (iPad fixed side panel).
@available(iOS 17.0, *)
struct RightPanelView: View {

    // MARK: - Types

    /// Display mode for the panel
    enum PanelMode {
        /// Slide-in overlay with dimmed backdrop and drag-to-dismiss (iPhone)
        case overlay
        /// Fixed inline panel without backdrop or drag-to-dismiss (iPad)
        case inline
    }

    // MARK: - Properties

    let content: AppNavigationState.RightPanelContent
    let mode: PanelMode
    let onDismiss: () -> Void

    @State private var dragOffset: CGFloat = 0
    @State private var isAppearing = false

    init(content: AppNavigationState.RightPanelContent, mode: PanelMode = .overlay, onDismiss: @escaping () -> Void) {
        self.content = content
        self.mode = mode
        self.onDismiss = onDismiss
    }

    // MARK: - Body

    var body: some View {
        switch mode {
        case .overlay:
            overlayBody
        case .inline:
            inlineBody
        }
    }

    // MARK: - Overlay Mode (iPhone)

    private var overlayBody: some View {
        GeometryReader { geometry in
            let panelWidth = min(geometry.size.width * 0.85, 400)
            ZStack(alignment: .trailing) {
                // Dimmed background
                Color.black
                    .opacity(isAppearing ? 0.5 : 0)
                    .ignoresSafeArea()
                    .onTapGesture {
                        dismissPanel()
                    }

                // Panel content
                panelContent
                    .frame(width: panelWidth)
                    .frame(maxHeight: .infinity)
                    .background(panelBackground)
                    .offset(x: isAppearing ? dragOffset : panelWidth)
                    .gesture(dragGesture)
            }
        }
        .onAppear {
            withAnimation(SAIMotion.smooth) {
                isAppearing = true
            }
        }
    }

    // MARK: - Inline Mode (iPad)

    private var inlineBody: some View {
        VStack(spacing: 0) {
            panelHeader
            ScrollView {
                VStack(spacing: DSSpacing.xl) {
                    switch content {
                    case .locationInfo(let cityId):
                        LocationInfoContent(cityId: cityId)
                    case .lineInfo(let planet, let lineType):
                        LineInfoContent(planet: planet, lineType: lineType)
                    case .scoutResults:
                        ScoutResultsContent()
                    case .cityAnalysis, .duo, .lineFilters, .favorites, .aiChat:
                        // Rendered directly by MainAppView's rightPanelForIPad
                        EmptyView()
                    }
                }
                .padding(DSSpacing.xl)
                .transition(.acScaleFade)
            }
            .animation(.acPageTransition, value: content)
        }
        .frame(maxHeight: .infinity)
        .background(Color.clear)
    }

    // MARK: - Panel Content

    @ViewBuilder
    private var panelContent: some View {
        VStack(spacing: 0) {
            // Header
            panelHeader

            // Scrollable content
            ScrollView {
                VStack(spacing: DSSpacing.xl) {
                    switch content {
                    case .locationInfo(let cityId):
                        LocationInfoContent(cityId: cityId)

                    case .lineInfo(let planet, let lineType):
                        LineInfoContent(planet: planet, lineType: lineType)

                    case .scoutResults:
                        ScoutResultsContent()

                    case .cityAnalysis, .duo, .lineFilters, .favorites, .aiChat:
                        // Rendered directly by MainAppView's rightPanelForIPad
                        EmptyView()
                    }
                }
                .padding(DSSpacing.xl)
            }
            .acFadeIn()
        }
    }

    private var panelHeader: some View {
        HStack {
            Text(headerTitle)
                .saiScaledFont(size: 18, weight: .semibold, relativeTo: .headline)
                .foregroundStyle(DSColors.textPrimary)
                .accessibilityAddTraits(.isHeader)

            Spacer()

            Button(action: dismissPanel) {
                Image(systemName: "xmark")
                    .font(.system(size: 16, weight: .semibold))
                    .foregroundStyle(DSColors.textSecondary)
                    .frame(width: 32, height: 32)
                    .background(
                        Circle()
                            .fill(DSColors.surface)
                    )
            }
            .accessibilityLabel("Close panel")
        }
        .padding(.horizontal, DSSpacing.xl)
        .padding(.vertical, DSSpacing.lg)
        .background(Color.clear)
        .overlay(alignment: .bottom) {
            Divider()
                .opacity(0.4)
        }
    }

    private var panelBackground: some View {
        ZStack {
            DSColors.background
            DSColors.surface.opacity(0.5)
        }
        .overlay(alignment: .leading) {
            Rectangle()
                .fill(Color.acGlassBorder)
                .frame(width: 1)
        }
    }

    // MARK: - Helpers

    private var headerTitle: String {
        switch content {
        case .locationInfo:
            return "Location Details"
        case .lineInfo:
            return "Line Information"
        case .scoutResults:
            return "Scout"
        case .cityAnalysis:
            return "City Analysis"
        case .duo:
            return "Duo Mode"
        case .lineFilters:
            return "Lines"
        case .favorites:
            return "Favorites"
        case .aiChat:
            return "Astro AI"
        }
    }

    private var dragGesture: some Gesture {
        DragGesture()
            .onChanged { value in
                if value.translation.width > 0 {
                    dragOffset = value.translation.width
                }
            }
            .onEnded { value in
                if value.translation.width > 100 || value.predictedEndTranslation.width > 200 {
                    dismissPanel()
                } else {
                    withAnimation(SAIMotion.spring) {
                        dragOffset = 0
                    }
                }
            }
    }

    private func dismissPanel() {
        withAnimation(SAIMotion.smooth) {
            isAppearing = false
        }
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) {
            onDismiss()
        }
    }
}

// MARK: - Preview

#if DEBUG
@available(iOS 17.0, *)
#Preview("Location Info") {
    RightPanelView(
        content: .locationInfo(cityId: "test"),
        onDismiss: {}
    )
    .preferredColorScheme(.dark)
}

@available(iOS 17.0, *)
#Preview("Line Info") {
    RightPanelView(
        content: .lineInfo(planet: "Sun", lineType: "MC"),
        onDismiss: {}
    )
    .preferredColorScheme(.dark)
}

@available(iOS 17.0, *)
#Preview("Scout Results") {
    RightPanelView(
        content: .scoutResults,
        onDismiss: {}
    )
    .preferredColorScheme(.dark)
}
#endif
