import SwiftUI

// MARK: - Score Badge

/// A badge component that displays a score with appropriate color coding
///
/// Example:
/// ```swift
/// ACScoreBadge(score: 85, label: "Compatibility")
/// ACScoreBadge(score: 42, size: .large)
/// ```
public struct ACScoreBadge: View {
    let score: Int
    let label: String?
    let size: Size

    public enum Size {
        case small
        case medium
        case large

        var fontSize: Font {
            switch self {
            case .small: return .acCaptionSmall
            case .medium: return .acLabel
            case .large: return ACTypography.statNumber
            }
        }

        var labelFont: Font {
            switch self {
            case .small: return ACTypography.captionMicro
            case .medium: return .acCaptionSmall
            case .large: return .acCaption
            }
        }

        var padding: EdgeInsets {
            switch self {
            case .small:
                return EdgeInsets(top: 4, leading: 8, bottom: 4, trailing: 8)
            case .medium:
                return EdgeInsets(top: 6, leading: 12, bottom: 6, trailing: 12)
            case .large:
                return EdgeInsets(top: 8, leading: 16, bottom: 8, trailing: 16)
            }
        }

        var cornerRadius: CGFloat {
            switch self {
            case .small: return ACRadius.sm
            case .medium: return ACRadius.md
            case .large: return ACRadius.lg
            }
        }
    }

    public init(score: Int, label: String? = nil, size: Size = .medium) {
        self.score = max(0, min(100, score))
        self.label = label
        self.size = size
    }

    public var body: some View {
        VStack(spacing: 2) {
            Text("\(score)")
                .font(size.fontSize)
                .fontWeight(.bold)
                .foregroundStyle(scoreColor)

            if let label = label {
                Text(label)
                    .font(size.labelFont)
                    .foregroundStyle(Color.acMutedForeground)
            }
        }
        .padding(size.padding)
        .background(scoreColor.opacity(0.15))
        .clipShape(RoundedRectangle(cornerRadius: size.cornerRadius))
        .overlay(
            RoundedRectangle(cornerRadius: size.cornerRadius)
                .stroke(scoreColor.opacity(0.3), lineWidth: 1)
        )
    }

    private var scoreColor: Color {
        switch score {
        case 90...100:
            return .acScoreExcellent
        case 70..<90:
            return .acScoreGood
        case 50..<70:
            return .acScoreAverage
        case 30..<50:
            return .acScoreBelowAverage
        default:
            return .acScorePoor
        }
    }
}

// MARK: - Influence Pill

/// A pill-shaped component for displaying planetary influences
///
/// Example:
/// ```swift
/// ACInfluencePill(planet: "Sun", influence: "MC", color: .acPlanetSun)
/// ACInfluencePill(planet: "Venus", influence: "DSC", color: .acPlanetVenus, isActive: true)
/// ```
public struct ACInfluencePill: View {
    let planet: String
    let influence: String
    let color: Color
    let isActive: Bool

    public init(
        planet: String,
        influence: String,
        color: Color,
        isActive: Bool = false
    ) {
        self.planet = planet
        self.influence = influence
        self.color = color
        self.isActive = isActive
    }

    public var body: some View {
        HStack(spacing: ACSpacing.xs) {
            Circle()
                .fill(color)
                .frame(width: 8, height: 8)

            Text(planet)
                .font(.acLabel)
                .foregroundStyle(Color.acForeground)

            Text(influence)
                .font(.acCaptionSmall)
                .foregroundStyle(Color.acMutedForeground)
        }
        .padding(.horizontal, ACSpacing.sm)
        .padding(.vertical, ACSpacing.xs)
        .background(isActive ? color.opacity(0.2) : Color.acMuted)
        .clipShape(Capsule())
        .overlay(
            Capsule()
                .stroke(isActive ? color.opacity(0.5) : Color.acBorder, lineWidth: 1)
        )
    }
}

// MARK: - Bottom Sheet

/// A customizable bottom sheet component
///
/// Example:
/// ```swift
/// ACBottomSheet(isPresented: $showSheet) {
///     VStack {
///         Text("Sheet Content")
///     }
/// }
/// ```
public struct ACBottomSheet<Content: View>: View {
    @Binding var isPresented: Bool
    let detents: Set<PresentationDetent>
    let showDragIndicator: Bool
    let content: Content

    public init(
        isPresented: Binding<Bool>,
        detents: Set<PresentationDetent> = [.medium, .large],
        showDragIndicator: Bool = true,
        @ViewBuilder content: () -> Content
    ) {
        self._isPresented = isPresented
        self.detents = detents
        self.showDragIndicator = showDragIndicator
        self.content = content()
    }

    public var body: some View {
        Color.clear
            .sheet(isPresented: $isPresented) {
                content
                    .presentationDetents(detents)
                    .presentationDragIndicator(showDragIndicator ? .visible : .hidden)
                    .presentationBackground(Color.acSecondary)
                    .presentationCornerRadius(ACRadius.sheet)
            }
    }
}

// MARK: - Bottom Sheet Modifier

public extension View {

    /// Present a bottom sheet
    func acBottomSheet<Content: View>(
        isPresented: Binding<Bool>,
        detents: Set<PresentationDetent> = [.medium, .large],
        showDragIndicator: Bool = true,
        @ViewBuilder content: @escaping () -> Content
    ) -> some View {
        self.sheet(isPresented: isPresented) {
            content()
                .presentationDetents(detents)
                .presentationDragIndicator(showDragIndicator ? .visible : .hidden)
                .presentationBackground(Color.acSecondary)
                .presentationCornerRadius(ACRadius.sheet)
        }
    }
}

// MARK: - Skeleton Loading Components

/// Skeleton loading components for CartoStar
///
/// Example:
/// ```swift
/// ACSkeleton.avatar(size: .medium)
/// ACSkeleton.line(width: 200)
/// ACSkeleton.card()
/// ```
public enum ACSkeleton {

    // MARK: - Avatar Skeleton

    public enum AvatarSize {
        case small
        case medium
        case large
        case extraLarge

        var diameter: CGFloat {
            switch self {
            case .small: return 32
            case .medium: return 44
            case .large: return 64
            case .extraLarge: return 96
            }
        }
    }

    public static func avatar(size: AvatarSize = .medium) -> some View {
        Circle()
            .fill(Color.acMuted)
            .frame(width: size.diameter, height: size.diameter)
            .acShimmer()
    }

    // MARK: - Line Skeleton

    public static func line(width: CGFloat? = nil, height: CGFloat = 16) -> some View {
        RoundedRectangle(cornerRadius: ACRadius.xs)
            .fill(Color.acMuted)
            .frame(width: width, height: height)
            .frame(maxWidth: width == nil ? .infinity : nil, alignment: .leading)
            .acShimmer()
    }

    // MARK: - Lines Skeleton

    public static func lines(count: Int, spacing: CGFloat = ACSpacing.xs) -> some View {
        VStack(alignment: .leading, spacing: spacing) {
            ForEach(0..<count, id: \.self) { index in
                line(width: lineWidth(for: index, total: count))
            }
        }
    }

    // MARK: - Paragraph Skeleton

    public static func paragraph(lineCount: Int = 3) -> some View {
        VStack(alignment: .leading, spacing: ACSpacing.xs) {
            // Title line
            line(width: 200, height: 20)

            // Body lines
            ForEach(0..<lineCount, id: \.self) { index in
                line(width: lineWidth(for: index, total: lineCount), height: 14)
            }
        }
    }

    // MARK: - Card Skeleton

    public static func card() -> some View {
        VStack(alignment: .leading, spacing: ACSpacing.md) {
            HStack(spacing: ACSpacing.md) {
                avatar(size: .medium)

                VStack(alignment: .leading, spacing: ACSpacing.xs) {
                    line(width: 120, height: 16)
                    line(width: 80, height: 12)
                }
            }

            lines(count: 2)
        }
        .padding(ACSpacing.cardPadding)
        .acCard()
    }

    // MARK: - Score Badge Skeleton

    public static func scoreBadge() -> some View {
        VStack(spacing: 4) {
            RoundedRectangle(cornerRadius: ACRadius.xs)
                .fill(Color.acMuted)
                .frame(width: 40, height: 24)

            RoundedRectangle(cornerRadius: ACRadius.xs)
                .fill(Color.acMuted)
                .frame(width: 60, height: 12)
        }
        .padding(ACSpacing.sm)
        .acCard()
        .acShimmer()
    }

    // MARK: - Helpers

    private static func lineWidth(for index: Int, total: Int) -> CGFloat? {
        if index == total - 1 {
            return CGFloat.random(in: 100...180)
        }
        return nil
    }
}

// MARK: - Progress Indicator

/// A circular progress indicator with cosmic styling
///
/// Example:
/// ```swift
/// ACProgress(progress: 0.75, size: 100)
/// ACProgress(progress: 0.5, color: .acPlanetVenus)
/// ```
public struct ACProgress: View {
    let progress: Double
    let size: CGFloat
    let lineWidth: CGFloat
    let color: Color
    let showPercentage: Bool

    public init(
        progress: Double,
        size: CGFloat = 60,
        lineWidth: CGFloat = 6,
        color: Color = .acAccent,
        showPercentage: Bool = true
    ) {
        self.progress = max(0, min(1, progress))
        self.size = size
        self.lineWidth = lineWidth
        self.color = color
        self.showPercentage = showPercentage
    }

    public var body: some View {
        ZStack {
            // Background circle
            Circle()
                .stroke(Color.acMuted, lineWidth: lineWidth)

            // Progress arc
            Circle()
                .trim(from: 0, to: progress)
                .stroke(
                    color,
                    style: StrokeStyle(lineWidth: lineWidth, lineCap: .round)
                )
                .rotationEffect(.degrees(-90))
                .animation(.easeOut(duration: ACAnimation.medium), value: progress)

            // Percentage text
            if showPercentage {
                Text("\(Int(progress * 100))%")
                    .font(size > 80 ? .acHeadingSmall : .acCaptionSmall)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.acForeground)
            }
        }
        .frame(width: size, height: size)
    }
}

// MARK: - Linear Progress Bar

/// A linear progress bar with cosmic styling
///
/// Example:
/// ```swift
/// ACLinearProgress(progress: 0.6)
/// ACLinearProgress(progress: 0.8, color: .acSuccess, height: 8)
/// ```
public struct ACLinearProgress: View {
    let progress: Double
    let height: CGFloat
    let color: Color
    let backgroundColor: Color

    public init(
        progress: Double,
        height: CGFloat = 4,
        color: Color = .acAccent,
        backgroundColor: Color = .acMuted
    ) {
        self.progress = max(0, min(1, progress))
        self.height = height
        self.color = color
        self.backgroundColor = backgroundColor
    }

    public var body: some View {
        GeometryReader { geometry in
            ZStack(alignment: .leading) {
                // Background
                RoundedRectangle(cornerRadius: ACRadius.progressBar)
                    .fill(backgroundColor)

                // Progress fill
                RoundedRectangle(cornerRadius: ACRadius.progressBar)
                    .fill(color)
                    .frame(width: geometry.size.width * progress)
                    .animation(.easeOut(duration: ACAnimation.medium), value: progress)
            }
        }
        .frame(height: height)
    }
}

// MARK: - Custom Switch

/// A custom toggle switch with cosmic styling
///
/// Example:
/// ```swift
/// ACSwitch(isOn: $isEnabled, label: "Enable Feature")
/// ACSwitch(isOn: $isDarkMode)
/// ```
public struct ACSwitch: View {
    @Binding var isOn: Bool
    let label: String?
    let onColor: Color
    let offColor: Color

    public init(
        isOn: Binding<Bool>,
        label: String? = nil,
        onColor: Color = .acAccent,
        offColor: Color = .acMuted
    ) {
        self._isOn = isOn
        self.label = label
        self.onColor = onColor
        self.offColor = offColor
    }

    public var body: some View {
        HStack {
            if let label = label {
                Text(label)
                    .font(.acBody)
                    .foregroundStyle(Color.acForeground)

                Spacer()
            }

            Toggle("", isOn: $isOn)
                .toggleStyle(ACSwitchToggleStyle(onColor: onColor, offColor: offColor))
                .labelsHidden()
        }
    }
}

// MARK: - Switch Toggle Style

public struct ACSwitchToggleStyle: ToggleStyle {
    let onColor: Color
    let offColor: Color

    public init(
        onColor: Color = .acAccent,
        offColor: Color = .acMuted
    ) {
        self.onColor = onColor
        self.offColor = offColor
    }

    public func makeBody(configuration: Configuration) -> some View {
        HStack {
            configuration.label

            ZStack {
                Capsule()
                    .fill(configuration.isOn ? onColor : offColor)
                    .frame(width: 51, height: 31)

                Circle()
                    .fill(Color.white)
                    .frame(width: 27, height: 27)
                    .offset(x: configuration.isOn ? 10 : -10)
                    .shadow(color: Color.black.opacity(0.2), radius: 2, x: 0, y: 1)
            }
            .onTapGesture {
                withAnimation(.spring(response: ACAnimation.springSnappy, dampingFraction: ACAnimation.dampingDefault)) {
                    configuration.isOn.toggle()
                }
            }
        }
    }
}

// MARK: - Tag/Chip Component

/// A tag/chip component for labels and categories
///
/// Example:
/// ```swift
/// ACTag(text: "Career", color: .acPlanetSun)
/// ACTag(text: "Love", color: .acPlanetVenus, isSelected: true)
/// ```
public struct ACTag: View {
    let text: String
    let color: Color
    let isSelected: Bool
    let onTap: (() -> Void)?

    public init(
        text: String,
        color: Color = .acAccent,
        isSelected: Bool = false,
        onTap: (() -> Void)? = nil
    ) {
        self.text = text
        self.color = color
        self.isSelected = isSelected
        self.onTap = onTap
    }

    public var body: some View {
        Text(text)
            .font(.acLabel)
            .foregroundStyle(isSelected ? Color.white : color)
            .padding(.horizontal, ACSpacing.sm)
            .padding(.vertical, ACSpacing.xs)
            .background(isSelected ? color : color.opacity(0.15))
            .clipShape(Capsule())
            .overlay(
                Capsule()
                    .stroke(color.opacity(isSelected ? 0 : 0.3), lineWidth: 1)
            )
            .onTapGesture {
                onTap?()
            }
    }
}

// MARK: - Empty State View

/// An empty state placeholder view
///
/// Example:
/// ```swift
/// ACEmptyState(
///     icon: "globe",
///     title: "No Locations",
///     message: "Add your first location to see your astrocartography map."
/// )
/// ```
public struct ACEmptyState: View {
    let icon: String
    let title: String
    let message: String
    let actionTitle: String?
    let action: (() -> Void)?

    public init(
        icon: String,
        title: String,
        message: String,
        actionTitle: String? = nil,
        action: (() -> Void)? = nil
    ) {
        self.icon = icon
        self.title = title
        self.message = message
        self.actionTitle = actionTitle
        self.action = action
    }

    public var body: some View {
        VStack(spacing: ACSpacing.lg) {
            Image(systemName: icon)
                .font(.system(size: 48))
                .foregroundStyle(Color.acMutedForeground)

            VStack(spacing: ACSpacing.xs) {
                Text(title)
                    .font(.acHeadingMedium)
                    .foregroundStyle(Color.acForeground)

                Text(message)
                    .font(.acBody)
                    .foregroundStyle(Color.acMutedForeground)
                    .multilineTextAlignment(.center)
            }

            if let actionTitle = actionTitle, let action = action {
                Button(actionTitle, action: action)
                    .acPrimaryStyle(isFullWidth: false)
            }
        }
        .padding(ACSpacing.xl)
    }
}

// MARK: - Divider with Label

/// A divider with an optional centered label
///
/// Example:
/// ```swift
/// ACDivider()
/// ACDivider(label: "OR")
/// ```
public struct ACDivider: View {
    let label: String?
    let color: Color

    public init(label: String? = nil, color: Color = .acBorder) {
        self.label = label
        self.color = color
    }

    public var body: some View {
        HStack(spacing: ACSpacing.md) {
            Rectangle()
                .fill(color)
                .frame(height: 1)

            if let label = label {
                Text(label)
                    .font(.acCaptionSmall)
                    .foregroundStyle(Color.acMutedForeground)

                Rectangle()
                    .fill(color)
                    .frame(height: 1)
            }
        }
    }
}

// MARK: - Previews

#Preview("Score Badges") {
    VStack(spacing: ACSpacing.lg) {
        HStack(spacing: ACSpacing.md) {
            ACScoreBadge(score: 95, label: "Excellent", size: .small)
            ACScoreBadge(score: 75, label: "Good", size: .medium)
            ACScoreBadge(score: 45, label: "Average", size: .large)
        }

        HStack(spacing: ACSpacing.md) {
            ACScoreBadge(score: 88)
            ACScoreBadge(score: 62)
            ACScoreBadge(score: 25)
        }
    }
    .padding()
    .background(Color.acBackground)
}

#Preview("Influence Pills") {
    VStack(spacing: ACSpacing.md) {
        ACInfluencePill(planet: "Sun", influence: "MC", color: .acPlanetSun, isActive: true)
        ACInfluencePill(planet: "Venus", influence: "DSC", color: .acPlanetVenus)
        ACInfluencePill(planet: "Mars", influence: "IC", color: .acPlanetMars)
        ACInfluencePill(planet: "Jupiter", influence: "ASC", color: .acPlanetJupiter)
    }
    .padding()
    .background(Color.acBackground)
}

#Preview("Progress Indicators") {
    VStack(spacing: ACSpacing.xl) {
        HStack(spacing: ACSpacing.lg) {
            ACProgress(progress: 0.85, size: 80, color: .acScoreExcellent)
            ACProgress(progress: 0.65, size: 60, color: .acAccent)
            ACProgress(progress: 0.35, size: 40, color: .acScoreBelowAverage, showPercentage: false)
        }

        VStack(spacing: ACSpacing.md) {
            ACLinearProgress(progress: 0.75, color: .acAccent)
            ACLinearProgress(progress: 0.5, height: 8, color: .acSuccess)
            ACLinearProgress(progress: 0.25, color: .acDestructive)
        }
    }
    .padding()
    .background(Color.acBackground)
}

#Preview("Skeleton Loading") {
    VStack(spacing: ACSpacing.xl) {
        HStack(spacing: ACSpacing.md) {
            ACSkeleton.avatar(size: .small)
            ACSkeleton.avatar(size: .medium)
            ACSkeleton.avatar(size: .large)
        }

        ACSkeleton.lines(count: 3)

        ACSkeleton.card()
    }
    .padding()
    .background(Color.acBackground)
}

#Preview("Tags") {
    VStack(spacing: ACSpacing.md) {
        HStack(spacing: ACSpacing.sm) {
            ACTag(text: "Career", color: .acPlanetSun)
            ACTag(text: "Love", color: .acPlanetVenus, isSelected: true)
            ACTag(text: "Travel", color: .acPlanetJupiter)
        }
    }
    .padding()
    .background(Color.acBackground)
}

#Preview("Empty State") {
    ACEmptyState(
        icon: "globe.americas",
        title: "No Locations Yet",
        message: "Add your first location to explore your astrocartography map and discover powerful planetary influences.",
        actionTitle: "Add Location"
    ) {
        print("Add location tapped")
    }
    .background(Color.acBackground)
}
