import SwiftUI
import DesignSystem

/// Progress view shown during scout computation
public struct ScoutProgressView: View {

    let progress: ScoutProgress
    let onCancel: (() -> Void)?

    @State private var rotation: Double = 0

    public init(
        progress: ScoutProgress,
        onCancel: (() -> Void)? = nil
    ) {
        self.progress = progress
        self.onCancel = onCancel
    }

    public var body: some View {
        VStack(spacing: DSSpacing.xl) {
            // Animated progress ring
            ZStack {
                // Background circle
                Circle()
                    .stroke(
                        DSColors.borderHairline,
                        lineWidth: 8
                    )
                    .frame(width: 120, height: 120)

                // Progress arc
                Circle()
                    .trim(from: 0, to: progress.percentage / 100)
                    .stroke(
                        progressGradient,
                        style: StrokeStyle(
                            lineWidth: 8,
                            lineCap: .round
                        )
                    )
                    .frame(width: 120, height: 120)
                    .rotationEffect(.degrees(-90))
                    .animation(.easeInOut(duration: 0.3), value: progress.percentage)

                // Spinning indicator for indeterminate state
                if progress.percentage == 0 && progress.phase != .idle {
                    Circle()
                        .trim(from: 0, to: 0.3)
                        .stroke(
                            DSColors.accentPrimary,
                            style: StrokeStyle(
                                lineWidth: 8,
                                lineCap: .round
                            )
                        )
                        .frame(width: 120, height: 120)
                        .rotationEffect(.degrees(rotation))
                        .onAppear {
                            withAnimation(.linear(duration: 1).repeatForever(autoreverses: false)) {
                                rotation = 360
                            }
                        }
                }

                // Percentage text
                VStack(spacing: DSSpacing.xs) {
                    Text("\(Int(progress.percentage))%")
                        .font(.system(size: 28, weight: .bold, design: .rounded))
                        .foregroundStyle(DSColors.textPrimary)

                    if let category = progress.currentCategory {
                        Image(systemName: category.iconName)
                            .font(.system(size: 16))
                            .foregroundStyle(DSColors.accentPrimary)
                    }
                }
            }

            // Phase text
            Text(phaseTitle)
                .font(DSTypography.titleM)
                .foregroundStyle(DSColors.textPrimary)

            // Message
            if !progress.message.isEmpty {
                Text(progress.message)
                    .font(DSTypography.body)
                    .foregroundStyle(DSColors.textSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, DSSpacing.xl)
            }

            // Category being processed
            if let category = progress.currentCategory {
                HStack(spacing: DSSpacing.sm) {
                    Image(systemName: category.iconName)
                        .font(.system(size: 14))

                    Text(category.label)
                        .font(DSTypography.body)
                }
                .foregroundStyle(DSColors.accentPrimary)
                .padding(.horizontal, DSSpacing.md)
                .padding(.vertical, DSSpacing.sm)
                .background(DSColors.surfaceTinted)
                .clipShape(.rect(cornerRadius: DSRadius.sm))
            }

            // Cancel button
            if let onCancel = onCancel {
                Button {
                    onCancel()
                    Haptics.tap()
                } label: {
                    Text("Cancel")
                        .font(DSTypography.body)
                        .foregroundStyle(DSColors.danger)
                }
                .padding(.top, DSSpacing.md)
            }
        }
        .padding(DSSpacing.xl)
        .accessibilityElement(children: .combine)
        .accessibilityLabel("\(phaseTitle), \(Int(progress.percentage)) percent\(progress.currentCategory.map { ", processing \($0.label)" } ?? "")")
        .accessibilityAddTraits(.updatesFrequently)
    }

    // MARK: - Helpers

    private var phaseTitle: String {
        switch progress.phase {
        case .idle: return "Ready"
        case .initializing: return "Initializing..."
        case .loadingCities: return "Loading Cities..."
        case .computing: return "Computing Rankings"
        case .complete: return "Complete"
        case .error: return "Error"
        }
    }

    private var progressGradient: LinearGradient {
        LinearGradient(
            colors: [DSColors.accentPrimary, DSColors.accentSecondary],
            startPoint: .leading,
            endPoint: .trailing
        )
    }
}

// MARK: - Preview

#Preview("Progress - Initializing") {
    ScoutProgressView(
        progress: ScoutProgress(
            phase: .initializing,
            percentage: 0,
            message: "Preparing scout analysis..."
        )
    ) {
        print("Cancel tapped")
    }
    .background(DSColors.background)
}

#Preview("Progress - Computing") {
    ScoutProgressView(
        progress: ScoutProgress(
            phase: .computing,
            percentage: 45,
            currentCategory: .career,
            message: "Processing San Francisco..."
        )
    ) {
        print("Cancel tapped")
    }
    .background(DSColors.background)
}

#Preview("Progress - Complete") {
    ScoutProgressView(
        progress: ScoutProgress.complete
    )
    .background(DSColors.background)
}

#Preview("Progress - Dark Mode") {
    ScoutProgressView(
        progress: ScoutProgress(
            phase: .computing,
            percentage: 72,
            currentCategory: .love,
            message: "Computing love rankings..."
        )
    ) {
        print("Cancel tapped")
    }
    .background(DSColors.background)
    .preferredColorScheme(.dark)
}
